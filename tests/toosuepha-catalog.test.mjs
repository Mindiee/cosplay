import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCosplaySeed} from '../cosplay-seed.js';
import {normalizeOccasionCategories,OCCASION_CATEGORIES} from '../occasion-domain.js';
import {filterMarketplaceListings} from '../marketplace-filter.js';

test('seed provides two rental demos for each new occasion without replacing costume records',()=>{
  const state=makeCosplaySeed(1_700_000_000_000);
  normalizeOccasionCategories(state);
  const counts=Object.fromEntries(OCCASION_CATEGORIES.map(key=>[key,state.listings.filter(row=>row.occasionCategory===key).length]));
  assert.deepEqual(counts,{costume:12,travel:2,outdoor:2,formal:2,event:2});
  assert.equal(new Set(state.listings.map(row=>row.id)).size,state.listings.length);
  assert.equal(state.listings.filter(row=>row.occasionCategory!=='costume').every(row=>row.demoAsset===true),true);
});

test('migration categorizes legacy listings without altering stable identifiers or Studio slots',()=>{
  const state={listings:[{id:'legacy',category:'top',attachmentSlot:'top'},{id:'known',occasionCategory:'formal',category:'top',attachmentSlot:'top'}]};
  normalizeOccasionCategories(state);
  assert.deepEqual(state.listings.map(({id,occasionCategory,category,attachmentSlot})=>({id,occasionCategory,category,attachmentSlot})),[
    {id:'legacy',occasionCategory:'costume',category:'top',attachmentSlot:'top'},
    {id:'known',occasionCategory:'formal',category:'top',attachmentSlot:'top'},
  ]);
});

test('Marketplace occasion filtering stays independent from garment piece type',()=>{
  const variant={id:'m',size:'M',price:500,stock:1};
  const listings=[
    {id:'travel-top',status:'active',occasionCategory:'travel',category:'top',condition:'good',publishedAt:3,sizeVariants:[variant]},
    {id:'costume-top',status:'active',occasionCategory:'costume',category:'top',condition:'good',publishedAt:2,sizeVariants:[variant]},
    {id:'travel-accessory',status:'active',occasionCategory:'travel',category:'accessory',condition:'good',publishedAt:1,sizeVariants:[variant]},
  ];
  assert.deepEqual(filterMarketplaceListings(listings,{occasion:'travel',type:'top'}).map(row=>row.id),['travel-top']);
  assert.deepEqual(filterMarketplaceListings(listings,{occasion:'travel'}).map(row=>row.id),['travel-top','travel-accessory']);
});
