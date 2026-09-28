import test from 'node:test';
import assert from 'node:assert/strict';
import {rentalFitSummary,rentalPhase,rentalTimeline,rentalUrgency,renterNextAction} from '../rental-presenter.js';

const body={height:165,chest:90,waist:72,hip:96,shoulder:40};
const item=(category='top')=>({size:'M',dailyPrice:500,lineTotal:1500,listingSnapshot:{title:'Demo',character:'Look',category,lengthTarget:category==='bottom'?'ankle':'waist',measurements:{shoulder:42,chest:96,waist:78,hip:102,length:category==='bottom'?125:36}}});
const booking=(status='paid',extra={})=>({id:'b1',renterId:'u1',sellerId:'u2',status,pickupDate:'2026-09-20',returnDate:'2026-09-22',rentalDays:3,totalPrice:1500,items:[item()],tracking:{outbound:null,return:null},...extra});

test('maps every booking status into receive, rent, return, complete, or cancelled phases',()=>{
  for(const status of ['pending','confirmed','paid','preparing','outbound_shipped','outbound_transit'])assert.equal(rentalPhase(booking(status)),'receive');
  assert.equal(rentalPhase(booking('renting')),'rent');
  for(const status of ['return_preparing','return_shipped','return_received','inspection','cleaning'])assert.equal(rentalPhase(booking(status)),'return');
  assert.equal(rentalPhase(booking('completed')),'complete');
  assert.equal(rentalPhase(booking('cancelled')),'cancelled');
});

test('timeline marks completed and current steps for both receive and return',()=>{
  const timeline=rentalTimeline(booking('return_shipped'));
  assert.equal(timeline.receive.at(-1).state,'done');
  assert.equal(timeline.return.find(row=>row.key==='return_shipped').state,'current');
  assert.equal(timeline.return.find(row=>row.key==='inspection').state,'upcoming');
});

test('renter action is scoped to the owner and current status',()=>{
  assert.deepEqual(renterNextAction(booking('paid'),'u1'),{action:'rental.cancel',label:'ยกเลิกและคืนเงินจำลอง',kind:'secondary'});
  assert.deepEqual(renterNextAction(booking('outbound_transit'),'u1'),{action:'rental.receive',label:'ยืนยันว่าได้รับชุด',kind:'primary'});
  assert.deepEqual(renterNextAction(booking('renting'),'u1'),{action:'rental.prepareReturn',label:'เริ่มเตรียมคืน',kind:'primary'});
  assert.deepEqual(renterNextAction(booking('return_preparing'),'u1'),{action:'rental.shipReturn',label:'ส่งชุดคืน',kind:'primary',tracking:'return'});
  assert.equal(renterNextAction(booking('renting'),'u9'),null);
  assert.equal(renterNextAction(booking('completed'),'u1'),null);
});

test('urgency handles pickup, return, overdue, and completed boundaries',()=>{
  assert.equal(rentalUrgency(booking('paid'),Date.UTC(2026,8,19,12)).key,'before_pickup');
  assert.equal(rentalUrgency(booking('paid'),Date.UTC(2026,8,20,12)).key,'pickup_today');
  assert.equal(rentalUrgency(booking('renting'),Date.UTC(2026,8,22,12)).key,'return_today');
  assert.equal(rentalUrgency(booking('renting'),Date.UTC(2026,8,23,12)).key,'return_overdue');
  assert.equal(rentalUrgency(booking('completed'),Date.UTC(2026,8,23,12)).key,'done');
});

test('fit summary evaluates all snapshot items and refuses incomplete inputs',()=>{
  const result=rentalFitSummary(booking('paid',{items:[item('top'),item('bottom')]}),body);
  assert.equal(result.items.length,2);
  assert.ok(result.items.every(row=>Number.isFinite(row.score)));
  assert.equal(rentalFitSummary(booking(),null),null);
  assert.equal(rentalFitSummary(booking('paid',{items:[{...item(),listingSnapshot:{title:'Missing',category:'top',measurements:{chest:96}}}]}),body),null);
});

test('legacy booking shape remains presentable without modern fields',()=>{
  const legacy=booking('confirmed',{items:undefined,listingSnapshot:{title:'Legacy',character:'Old',image:{src:'x.jpg'}},size:'M',dailyPrice:300});
  assert.equal(rentalPhase(legacy),'receive');
  assert.equal(rentalFitSummary(legacy,body),null);
  assert.doesNotThrow(()=>rentalTimeline(legacy));
});
