import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCosplaySeed} from '../cosplay-seed.js';
import {rentalBalance,transitionCosplay} from '../cosplay-domain.js';

const NOW=Date.UTC(2026,8,11,12);
const act=(state,action,payload={},actorId=state.settings.currentUserId,now=NOW)=>transitionCosplay(state,action,payload,now,actorId);
const availableFromDifferentSellers=state=>{
  const rows=state.listings.filter(item=>item.status==='active'&&item.sellerId!=='u1'&&item.sizeVariants.some(v=>v.stock===1));
  const first=rows[0],second=rows.find(item=>item.sellerId!==first.sellerId);
  return [first,second];
};
const add=(state,item)=>act(state,'rentalBag.add',{listingId:item.id,variantId:item.sizeVariants[0].id});

test('mock checkout creates one group, splits paid bookings by seller, and clears the renter bag',()=>{
  const state=makeCosplaySeed(NOW),[first,second]=availableFromDifferentSellers(state);
  add(state,first);add(state,second);
  act(state,'rentalBag.dates',{pickupDate:'2026-09-20',returnDate:'2026-09-22'});
  const result=act(state,'rental.checkout');
  assert.equal(result.bookingIds.length,2);
  assert.equal(state.checkoutGroups.length,1);
  assert.equal(state.payments.length,1);
  assert.equal(state.payments[0].status,'paid');
  assert.equal(state.rentals.filter(row=>row.checkoutGroupId===result.groupId).length,2);
  assert.deepEqual(new Set(state.rentals.map(row=>row.sellerId)),new Set([first.sellerId,second.sellerId]));
  assert.ok(state.rentals.every(row=>row.status==='paid'&&row.paymentStatus==='paid'&&row.escrowStatus==='held'));
  assert.ok(state.rentals.every(row=>row.items.length===1&&row.rentalDays===3));
  assert.equal(state.payments[0].amount,state.rentals.reduce((sum,row)=>sum+row.totalPrice,0));
  assert.deepEqual(state.rentalBags.u1.items,[]);
});

test('checkout is atomic when another booking already occupies any requested variant',()=>{
  const state=makeCosplaySeed(NOW),[item]=availableFromDifferentSellers(state);
  add(state,item);act(state,'rentalBag.dates',{pickupDate:'2026-09-20',returnDate:'2026-09-22'});act(state,'rental.checkout');
  act(state,'profile.switch',{id:'u3'});
  add(state,item);act(state,'rentalBag.dates',{pickupDate:'2026-09-22',returnDate:'2026-09-24'});
  const before=structuredClone(state);
  assert.throws(()=>act(state,'rental.checkout'),/ไม่ว่าง/);
  assert.deepEqual(state,before);
});

test('seller and renter advance the full outbound and return lifecycle with two tracking legs',()=>{
  const state=makeCosplaySeed(NOW),[item]=availableFromDifferentSellers(state);
  add(state,item);act(state,'rentalBag.dates',{pickupDate:'2026-09-20',returnDate:'2026-09-22'});
  const {bookingIds:[id]}=act(state,'rental.checkout'),sellerId=item.sellerId;
  assert.throws(()=>act(state,'rental.prepare',{id}),/ผู้ให้เช่า/);
  act(state,'profile.switch',{id:sellerId});
  assert.equal(act(state,'rental.prepare',{id}).status,'preparing');
  assert.equal(act(state,'rental.shipOutbound',{id,carrier:'Demo Express',trackingNumber:'OUT-100'}).status,'outbound_shipped');
  assert.equal(act(state,'rental.transitOutbound',{id}).status,'outbound_transit');
  act(state,'profile.switch',{id:'u1'});
  assert.equal(act(state,'rental.receive',{id}).status,'renting');
  assert.equal(act(state,'rental.prepareReturn',{id}).status,'return_preparing');
  assert.equal(act(state,'rental.shipReturn',{id,carrier:'Demo Express',trackingNumber:'RET-100'}).status,'return_shipped');
  act(state,'profile.switch',{id:sellerId});
  assert.equal(act(state,'rental.receiveReturn',{id}).status,'return_received');
  assert.equal(act(state,'rental.inspect',{id,passed:true,note:'สภาพครบ'}).status,'cleaning');
  const released=rentalBalance(state,sellerId);
  assert.equal(released.pending,0);
  assert.ok(released.available>0);
  assert.throws(()=>act(state,'rental.inspect',{id,passed:true}),/สถานะ/);
  assert.equal(act(state,'rental.completeCleaning',{id}).status,'completed');
  const booking=state.rentals.find(row=>row.id===id);
  assert.deepEqual(booking.tracking.outbound,{carrier:'Demo Express',trackingNumber:'OUT-100',shippedAt:NOW,inTransitAt:NOW});
  assert.deepEqual(booking.tracking.return,{carrier:'Demo Express',trackingNumber:'RET-100',shippedAt:NOW,receivedAt:NOW});
});

test('renter can cancel only before preparation and receives one mock refund',()=>{
  const state=makeCosplaySeed(NOW),[item]=availableFromDifferentSellers(state);
  add(state,item);act(state,'rentalBag.dates',{pickupDate:'2026-09-20',returnDate:'2026-09-20'});
  const {bookingIds:[id]}=act(state,'rental.checkout');
  assert.equal(act(state,'rental.cancel',{id}).status,'cancelled');
  assert.equal(state.ledger.filter(row=>row.bookingId===id&&row.type==='refund').length,1);
  assert.throws(()=>act(state,'rental.cancel',{id}),/ยกเลิก/);
});
