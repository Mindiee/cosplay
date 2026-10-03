import test from 'node:test';
import assert from 'node:assert/strict';
import {marketNotifications} from '../market-notifications.js';

const booking=(id,status,extra={})=>({id,status,renterId:'u1',sellerId:'u2',createdAt:100,items:[{listingSnapshot:{title:'ชุดคอสเพลย์'}}],pickupDate:'2026-10-03',returnDate:'2026-10-05',...extra});

test('notifications show only the active account bookings and route to the correct side',()=>{
  const state={rentals:[booking('received','outbound_transit'),booking('seller','paid'),booking('other','paid',{renterId:'u3',sellerId:'u4'})]};
  const renter=marketNotifications(state,'u1');
  assert.equal(renter.length,2);
  assert.equal(renter[0].href,'#rental/received');
  assert.equal(renter[0].urgent,true);
  const lender=marketNotifications(state,'u2');
  assert.equal(lender.length,2);
  assert.equal(lender[0].href,'#closet/requests');
  assert.equal(lender[0].urgent,true);
  assert.deepEqual(marketNotifications(state,'u9'),[]);
});

test('completed rentals remain visible as informational updates without an urgent badge',()=>{
  const notes=marketNotifications({rentals:[booking('done','completed')]},'u2');
  assert.equal(notes[0].urgent,false);
  assert.match(notes[0].detail,/เสร็จสิ้น/);
});
