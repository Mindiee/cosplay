import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCosplaySeed} from '../cosplay-seed.js';
import {transitionCosplay} from '../cosplay-domain.js';
import {mergeStudioCatalog} from '../studio-domain.js';

const ready=()=>{const s=makeCosplaySeed(1); s.listings[0].attachmentSlot='top';s.listings[0].model={url:'studio-assets/top.glb'};return s};
test('studio saves only actor outfit; slot, variant, and bounded transforms are enforced',()=>{
 const s=ready(),l=s.listings[0],v=l.sizeVariants[0],ref={listingId:l.id,variantId:v.id,transform:{x:0,y:0,z:0,rotation:0,scale:1}};
 transitionCosplay(s,'studio.outfit.save',{outfit:{top:ref}},2,'u1');
 assert.deepEqual(s.studioProfiles.u1.outfit.top,ref);
 const before=structuredClone(s.studioProfiles);
 for(const outfit of [{wig:ref},{top:{...ref,variantId:'missing'}},{top:{...ref,transform:{...ref.transform,scale:Infinity}}},{top:{...ref,transform:{...ref.transform,x:2}}}])assert.throws(()=>transitionCosplay(s,'studio.outfit.save',{outfit},3,'u1'));
 assert.deepEqual(s.studioProfiles,before);
 assert.throws(()=>transitionCosplay(s,'studio.outfit.save',{outfit:{}},3,'u2'));
 assert.deepEqual(v.measurements,l.sizeVariants[0].measurements);
});
test('catalog upgrade merges new stable IDs without replacing sold stock, edits, accounts or orders',()=>{
 const s=ready(),l=s.listings[0],old=structuredClone(s);l.sizeVariants[0].stock=0;l.title='My edited item';
 s.studioProfiles={u1:{style:'female',outfit:{top:{listingId:l.id}},bodies:{}}};
 const newItem={...structuredClone(l),id:'studio-new',photos:[{id:'front',src:'studio-assets/photos/new.jpg',tag:'front'}],coverId:'front'};
 const catalog={version:1,items:[old.listings[0],newItem]};mergeStudioCatalog(s,catalog,20);mergeStudioCatalog(s,catalog,30);
 assert.equal(s.listings.length,old.listings.length+1);assert.equal(l.title,'My edited item');assert.equal(l.sizeVariants[0].stock,0);assert.deepEqual(s.profiles,old.profiles);assert.deepEqual(s.orders,old.orders);assert.deepEqual(s.rentals,old.rentals);assert.equal(s.studioProfiles.u1.outfit.top.listingId,l.id);
});
test('catalog refreshes owned 3D asset metadata without replacing listing edits or stock',()=>{
 const s=ready(),l=s.listings[0];l.studioSeedVersion=1;l.title='Seller edit';l.sizeVariants[0].stock=0;l.model.url='studio-assets/models/broken.glb';
 mergeStudioCatalog(s,{version:1,items:[{...structuredClone(l),title:'Seed title',model:{...l.model,url:'studio-assets/models/top-academy.glb'}}]},2);
 assert.equal(l.title,'Seller edit');assert.equal(l.sizeVariants[0].stock,0);assert.equal(l.model.url,'studio-assets/models/top-academy.glb');
});
test('saved outfit references do not allow deleted items but permit sold items for preview; purchases reject unavailable',()=>{
 const s=ready(),l=s.listings[0],v=l.sizeVariants[0],outfit={top:{listingId:l.id,variantId:v.id,transform:{x:0,y:0,z:0,rotation:0,scale:1}}};
 for(const status of ['paused','active']){l.status=status;v.stock=0;transitionCosplay(s,'studio.outfit.save',{outfit},2,'u1');assert.throws(()=>transitionCosplay(s,'purchase.create',{listingId:l.id,variantId:v.id},3,'u1'));}
 l.status='deleted';assert.throws(()=>transitionCosplay(s,'studio.outfit.save',{outfit},4,'u1'));
});
test('male and female measurements persist separately and never resize garment data',()=>{
 const s=ready(),before=structuredClone(s.listings),female={height:170,chest:90,waist:72,hip:96,shoulder:40},male={height:185,chest:102,waist:86,hip:100,shoulder:46};
 transitionCosplay(s,'studio.body.save',{style:'female',body:female},2,'u1');
 transitionCosplay(s,'studio.body.save',{style:'male',body:male},3,'u1');
 assert.deepEqual(s.studioProfiles.u1.bodies,{female,male});assert.deepEqual(s.listings,before);
 assert.throws(()=>transitionCosplay(s,'studio.body.save',{style:'female',body:{...female,height:999}},4,'u1'));
});
test('studio listing can create a rental without consuming stock or changing outfit',()=>{
 const s=ready(),l=s.listings[0],v=l.sizeVariants[0],beforeOutfit=structuredClone(s.studioProfiles);
 transitionCosplay(s,'rental.create',{listingId:l.id,variantId:v.id,pickupDate:'2026-09-11',returnDate:'2026-09-12'},Date.UTC(2026,8,11,12),'u1');
 assert.equal(s.rentals.length,1);assert.equal(v.stock,1);assert.deepEqual(s.studioProfiles,beforeOutfit);
});
