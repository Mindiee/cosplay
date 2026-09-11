import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCosplaySeed} from '../cosplay-seed.js';
import {
  normalizeCosplayState,
  rentalDays,
  rentalRangesOverlap,
  transitionCosplay,
} from '../cosplay-domain.js';

const NOW=Date.UTC(2026,8,11,12);
const act=(state,action,payload,actorId=state.settings.currentUserId)=>transitionCosplay(state,action,payload,NOW,actorId);
const rentable=state=>state.listings.find(item=>item.sellerId!==state.settings.currentUserId&&item.status==='active');

test('rental days are inclusive local calendar days',()=>{
  assert.equal(rentalDays('2026-09-11','2026-09-11'),1);
  assert.equal(rentalDays('2026-09-11','2026-09-13'),3);
  assert.throws(()=>rentalDays('2026-09-13','2026-09-11'),/วันคืน/);
  assert.throws(()=>rentalDays('2026-02-30','2026-03-01'),/วันที่/);
  assert.throws(()=>rentalDays('11/09/2026','2026-09-12'),/วันที่/);
});

test('inclusive rental ranges treat touching dates as overlap',()=>{
  assert.equal(rentalRangesOverlap('2026-09-11','2026-09-13','2026-09-13','2026-09-15'),true);
  assert.equal(rentalRangesOverlap('2026-09-11','2026-09-13','2026-09-14','2026-09-15'),false);
});

test('normalization adds rental storage without deleting legacy orders',()=>{
  const order={id:'legacy-order'};
  const state={orders:[order]};
  assert.equal(normalizeCosplayState(state),state);
  assert.deepEqual(state.rentals,[]);
  assert.deepEqual(state.orders,[order]);
});

test('rental creation snapshots rate and inclusive total without consuming stock',()=>{
  const state=makeCosplaySeed(NOW),item=rentable(state),variant=item.sizeVariants[0];
  const result=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-11',returnDate:'2026-09-13'});
  const booking=state.rentals.find(row=>row.id===result.id);
  assert.equal(booking.status,'pending');
  assert.equal(booking.renterId,'u1');
  assert.equal(booking.sellerId,item.sellerId);
  assert.equal(booking.size,variant.size);
  assert.equal(booking.dailyPrice,variant.price);
  assert.equal(booking.rentalDays,3);
  assert.equal(booking.totalPrice,variant.price*3);
  assert.equal(booking.confirmedAt,null);
  assert.equal(variant.stock,1);
  assert.deepEqual(Object.keys(booking.listingSnapshot).sort(),['character','image','sellerName','title']);
  item.title='edited later';
  assert.notEqual(booking.listingSnapshot.title,item.title);
});

test('pending requests coexist but confirmation rechecks a new conflict',()=>{
  const state=makeCosplaySeed(NOW),item=rentable(state),variant=item.sizeVariants[0];
  const first=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-20',returnDate:'2026-09-22'});
  act(state,'profile.switch',{id:'u3'});
  const second=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-21',returnDate:'2026-09-23'});
  act(state,'profile.switch',{id:item.sellerId});
  assert.equal(act(state,'rental.confirm',{id:first.id}).status,'confirmed');
  const before=structuredClone(state);
  assert.throws(()=>act(state,'rental.confirm',{id:second.id}),/วันเดียวกัน/);
  assert.deepEqual(state,before);
});

test('only seller confirms and repeated confirmation preserves its timestamp',()=>{
  const state=makeCosplaySeed(NOW),item=rentable(state),variant=item.sizeVariants[0];
  const result=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-11',returnDate:'2026-09-13'});
  assert.throws(()=>act(state,'rental.confirm',{id:result.id}),/ผู้ให้เช่า|ผู้ขาย/);
  act(state,'profile.switch',{id:item.sellerId});
  act(state,'rental.confirm',{id:result.id});
  const confirmedAt=state.rentals.find(row=>row.id===result.id).confirmedAt;
  assert.throws(()=>act(state,'rental.confirm',{id:result.id}),/ดำเนินการแล้ว/);
  assert.equal(state.rentals.find(row=>row.id===result.id).confirmedAt,confirmedAt);
});

test('only seller completes a confirmed rental and completion is final',()=>{
  const state=makeCosplaySeed(NOW),item=rentable(state),variant=item.sizeVariants[0];
  const result=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-11',returnDate:'2026-09-13'});
  assert.throws(()=>act(state,'rental.complete',{id:result.id}),/ผู้ให้เช่า|ผู้ขาย/);
  act(state,'profile.switch',{id:item.sellerId});
  assert.throws(()=>act(state,'rental.complete',{id:result.id}),/ยืนยันแล้ว/);
  act(state,'rental.confirm',{id:result.id});
  const completed=act(state,'rental.complete',{id:result.id});
  const booking=state.rentals.find(row=>row.id===result.id);
  assert.deepEqual(completed,{id:result.id,status:'completed'});
  assert.equal(booking.status,'completed');
  assert.equal(booking.completedAt,NOW);
  const completedAt=booking.completedAt;
  assert.throws(()=>act(state,'rental.complete',{id:result.id}),/เสร็จสิ้นแล้ว/);
  assert.equal(booking.completedAt,completedAt);
});

test('confirmed overlap blocks creation while next calendar day remains available',()=>{
  const state=makeCosplaySeed(NOW),item=rentable(state),variant=item.sizeVariants[0];
  const result=act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-11',returnDate:'2026-09-13'});
  act(state,'profile.switch',{id:item.sellerId});
  act(state,'rental.confirm',{id:result.id});
  act(state,'profile.switch',{id:'u3'});
  assert.throws(()=>act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-13',returnDate:'2026-09-15'}),/ไม่ว่าง/);
  assert.doesNotThrow(()=>act(state,'rental.create',{listingId:item.id,variantId:variant.id,pickupDate:'2026-09-14',returnDate:'2026-09-15'}));
});

test('invalid owner listing variant stock and dates do not mutate state',()=>{
  const arrangements=[
    state=>{const item=state.listings.find(row=>row.sellerId==='u1');return {listingId:item.id,variantId:item.sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state=>{const item=rentable(state);item.status='paused';return {listingId:item.id,variantId:item.sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state=>{const item=rentable(state);return {listingId:item.id,variantId:'missing',pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state=>{const item=rentable(state);item.sizeVariants[0].stock=0;return {listingId:item.id,variantId:item.sizeVariants[0].id,pickupDate:'2026-09-11',returnDate:'2026-09-11'};},
    state=>{const item=rentable(state);return {listingId:item.id,variantId:item.sizeVariants[0].id,pickupDate:'2026-09-10',returnDate:'2026-09-11'};},
    state=>{const item=rentable(state);return {listingId:item.id,variantId:item.sizeVariants[0].id,pickupDate:'2026-09-12',returnDate:'2026-09-11'};},
  ];
  for(const arrange of arrangements){
    const state=makeCosplaySeed(NOW),payload=arrange(state),before=structuredClone(state);
    assert.throws(()=>act(state,'rental.create',payload));
    assert.deepEqual(state,before);
  }
});
