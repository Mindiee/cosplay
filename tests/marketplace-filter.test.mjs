import test from 'node:test';
import assert from 'node:assert/strict';
import {filterMarketplaceListings,marketplaceThemes,marketplaceType,isIllustratedDemoCostume} from '../marketplace-filter.js';
import {makeCosplaySeed} from '../cosplay-seed.js';

const variant=(size,price,stock=1)=>({id:`${size}-${price}`,size,price,stock});
const listings=[
  {id:'top',status:'active',title:'Navy blazer',character:'Academy Hero',series:'Original',description:'gold buttons',theme:'academy',category:'top',condition:'good',publishedAt:30,sizeVariants:[variant('M',120)]},
  {id:'wig',status:'active',title:'Silver wig',character:'Moon Mage',series:'Fantasy',description:'long hair',theme:'fantasy',attachmentSlot:'wig',condition:'like_new',publishedAt:20,sizeVariants:[variant('M',80)]},
  {id:'mask',status:'active',title:'Black mask',character:'Night Rogue',series:'Gothic',description:'face accessory',theme:'gothic',attachmentSlot:'face',condition:'defect',publishedAt:10,sizeVariants:[variant('L',50)]},
  {id:'set',status:'active',title:'Complete set',character:'Classic Hero',series:'Original',description:'full costume',condition:'good',publishedAt:40,sizeVariants:[variant('M',200)]},
  {id:'paused',status:'paused',title:'Hidden academy top',character:'Hidden',series:'Original',description:'',theme:'academy',category:'top',condition:'good',publishedAt:50,sizeVariants:[variant('M',10)]},
];

test('maps Studio categories and accessory attachment slots to Marketplace types',()=>{
  assert.equal(marketplaceType(listings[0]),'top');
  assert.equal(marketplaceType(listings[1]),'wig');
  assert.equal(marketplaceType(listings[2]),'accessory');
  assert.equal(marketplaceType(listings[3]),'');
});

test('filters live listings by theme, type, size, condition, price, and search',()=>{
  assert.deepEqual(filterMarketplaceListings(listings,{theme:'academy',type:'top',size:'M',condition:'good',maxPrice:'150',q:'gold',sort:'latest'}).map(x=>x.id),['top']);
  assert.deepEqual(filterMarketplaceListings(listings,{type:'accessory'}).map(x=>x.id),['mask']);
  assert.deepEqual(filterMarketplaceListings(listings,{type:'wig'}).map(x=>x.id),['wig']);
  assert.deepEqual(filterMarketplaceListings(listings,{maxPrice:'100',sort:'price'}).map(x=>x.id),['mask','wig']);
});

test('full costume listings without a piece type remain available under All',()=>{
  assert.equal(filterMarketplaceListings(listings,{}).some(x=>x.id==='set'),true);
  assert.equal(filterMarketplaceListings(listings,{type:'top'}).some(x=>x.id==='set'),false);
});

test('returns the unique available themes in label order',()=>{
  assert.deepEqual(marketplaceThemes(listings),['academy','fantasy','gothic']);
});

test('Fit Match sorting puts unknown scores last and date availability keeps only open variants',()=>{
  const fitScores={top:75,wig:null,mask:100,set:null};
  assert.deepEqual(filterMarketplaceListings(listings,{sort:'fit',fitScores}).map(x=>x.id),['mask','top','set','wig']);
  const availableVariantIds=new Set(['top:M-120','set:M-200']);
  assert.deepEqual(filterMarketplaceListings(listings,{availableVariantIds}).map(x=>x.id),['set','top']);
});

test('illustrated costume demos are absent from discovery while real items and historical records remain',()=>{
  const state=makeCosplaySeed(1_700_000_000_000);
  const illustrations=state.listings.filter(isIllustratedDemoCostume);
  assert.equal(illustrations.length,12);
  const visible=filterMarketplaceListings(state.listings,{});
  assert.equal(visible.some(isIllustratedDemoCostume),false);
  assert.equal(visible.length,8);
  assert.equal(state.listings.length,20);
  const real={...illustrations[0],id:'seller-costume',photos:[{src:'user-photo.jpg'}]};
  assert.equal(isIllustratedDemoCostume(real),false);
  assert.equal(filterMarketplaceListings([real],{}).length,1);
});
