import test from 'node:test';
import assert from 'node:assert/strict';
import {lenderBookingBuckets,lenderLedgerRows,lenderNextAction,lenderSummary,listingRentalSchedule} from '../lender-presenter.js';

const listing=(id='l1',sellerId='u2',status='active')=>({id,sellerId,status,sizeVariants:[{id:`${id}-s`,size:'S',stock:1},{id:`${id}-m`,size:'M',stock:1}]});
const booking=(id,status='paid',extra={})=>({id,sellerId:'u2',renterId:'u1',status,pickupDate:'2026-10-01',returnDate:'2026-10-03',createdAt:1,totalPrice:900,items:[{listingId:'l1',variantId:'l1-s',size:'S'}],...extra});
const state=()=>({listings:[listing(),listing('l2','u2','paused'),listing('l3','u3')],rentals:[booking('prepare','paid'),booking('inspect','return_received',{createdAt:2}),booking('progress','renting',{createdAt:3}),booking('done','completed',{createdAt:4}),booking('refund','cancelled',{createdAt:5}),booking('other','paid',{sellerId:'u3'})],ledger:[{id:'e1',bookingId:'prepare',sellerId:'u2',type:'escrow_hold',amount:900,at:1},{id:'e2',bookingId:'done',sellerId:'u2',type:'escrow_hold',amount:700,at:2},{id:'e3',bookingId:'done',sellerId:'u2',type:'escrow_release',amount:700,at:3},{id:'e4',bookingId:'refund',sellerId:'u2',type:'escrow_hold',amount:500,at:4},{id:'e5',bookingId:'refund',sellerId:'u2',type:'refund',amount:500,at:5},{id:'x',bookingId:'other',sellerId:'u3',type:'escrow_hold',amount:999,at:6}]});

test('lender action is scoped and maps every operational status',()=>{
  const expected={pending:'rental.confirm',confirmed:'rental.complete',paid:'rental.prepare',preparing:'rental.shipOutbound',outbound_shipped:'rental.transitOutbound',return_shipped:'rental.receiveReturn',return_received:'rental.inspect',inspection:'rental.inspect',cleaning:'rental.completeCleaning'};
  for(const [status,action] of Object.entries(expected))assert.equal(lenderNextAction(booking('b',status),'u2').action,action);
  assert.equal(lenderNextAction(booking('b','paid'),'u9'),null);
  assert.equal(lenderNextAction(booking('b','renting'),'u2'),null);
});

test('booking buckets prioritize return intake before outbound work and retain history',()=>{
  const result=lenderBookingBuckets(state(),'u2');
  assert.deepEqual(result.action.map(row=>row.id),['inspect','prepare']);
  assert.deepEqual(result.progress.map(row=>row.id),['progress']);
  assert.deepEqual(new Set(result.history.map(row=>row.id)),new Set(['done','refund']));
  assert.ok(result.action.every(row=>row.sellerId==='u2'));
});

test('listing schedule is seller scoped variant specific and excludes cancelled or pending records',()=>{
  const source=state();source.rentals.push(booking('m','preparing',{pickupDate:'2026-10-08',returnDate:'2026-10-09',items:[{listingId:'l1',variantId:'l1-m',size:'M'}]}));source.rentals.push(booking('pending','pending',{pickupDate:'2026-10-10',returnDate:'2026-10-11'}));
  const rows=listingRentalSchedule(source,'u2','l1');
  assert.ok(rows.some(row=>row.variantId==='l1-s'));
  assert.ok(rows.some(row=>row.variantId==='l1-m'));
  assert.ok(!rows.some(row=>row.bookingId==='refund'||row.bookingId==='pending'));
  assert.deepEqual(listingRentalSchedule(source,'u3','l1'),[]);
});

test('summary and ledger derive only seller values including refund and one release',()=>{
  const source=state(),summary=lenderSummary(source,'u2',Date.UTC(2026,8,28));
  assert.equal(summary.listings,2);
  assert.equal(summary.activeListings,1);
  assert.equal(summary.actionRequired,2);
  assert.equal(summary.currentlyRented,1);
  assert.deepEqual(summary.earnings,{pending:900,available:700});
  const rows=lenderLedgerRows(source,'u2');
  assert.equal(rows.length,5);
  assert.equal(rows[0].id,'e5');
  assert.ok(rows.every(row=>row.sellerId==='u2'&&row.booking));
});

test('paused and deleted listings keep historical schedules',()=>{
  const source=state();source.listings[0].status='deleted';
  assert.ok(listingRentalSchedule(source,'u2','l1').length>0);
});
