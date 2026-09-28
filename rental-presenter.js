import {calculateFitMatch} from './mannequin.js';

const RECEIVE=['paid','preparing','outbound_shipped','outbound_transit','renting'];
const RETURN=['renting','return_preparing','return_shipped','return_received','inspection','cleaning','completed'];
const RECEIVE_LABELS={paid:'ชำระจำลองแล้ว',preparing:'ร้านเตรียมชุด',outbound_shipped:'ร้านส่งชุด',outbound_transit:'กำลังจัดส่ง',renting:'ได้รับชุด'};
const RETURN_LABELS={renting:'กำลังเช่า',return_preparing:'เตรียมคืน',return_shipped:'ส่งคืนแล้ว',return_received:'ร้านได้รับคืน',inspection:'ตรวจสภาพ',cleaning:'ทำความสะอาด',completed:'เสร็จสิ้น'};
const day=value=>{const [y,m,d]=String(value||'').split('-').map(Number);return Number.isFinite(y+m+d)?Date.UTC(y,m-1,d)/86400000:NaN};
const currentDay=now=>{const date=new Date(now);return Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate())/86400000};

export function rentalPhase(booking){
  if(booking?.status==='cancelled')return'cancelled';
  if(booking?.status==='completed')return'complete';
  if(['return_preparing','return_shipped','return_received','inspection','cleaning'].includes(booking?.status))return'return';
  if(booking?.status==='renting')return'rent';
  return'receive';
}

function steps(sequence,labels,status){
  let index=sequence.indexOf(status);
  if(sequence===RECEIVE&&RETURN.includes(status))index=sequence.length;
  if(sequence===RETURN&&!RETURN.includes(status))index=-1;
  return sequence.map((key,i)=>({key,label:labels[key],state:i<index?'done':i===index?'current':'upcoming'}));
}

export function rentalTimeline(booking){
  const status=booking?.status;
  if(status==='pending'||status==='confirmed')return{receive:RECEIVE.map((key,i)=>({key,label:RECEIVE_LABELS[key],state:i===0?'current':'upcoming'})),return:steps(RETURN,RETURN_LABELS,'')};
  if(status==='cancelled')return{receive:RECEIVE.map(key=>({key,label:RECEIVE_LABELS[key],state:'upcoming'})),return:RETURN.map(key=>({key,label:RETURN_LABELS[key],state:'upcoming'}))};
  return{receive:steps(RECEIVE,RECEIVE_LABELS,status),return:steps(RETURN,RETURN_LABELS,status)};
}

export function renterNextAction(booking,actorId){
  if(!booking||booking.renterId!==actorId)return null;
  const actions={
    paid:{action:'rental.cancel',label:'ยกเลิกและคืนเงินจำลอง',kind:'secondary'},
    outbound_transit:{action:'rental.receive',label:'ยืนยันว่าได้รับชุด',kind:'primary'},
    renting:{action:'rental.prepareReturn',label:'เริ่มเตรียมคืน',kind:'primary'},
    return_preparing:{action:'rental.shipReturn',label:'ส่งชุดคืน',kind:'primary',tracking:'return'},
  };
  return actions[booking.status]||null;
}

export function rentalUrgency(booking,now=Date.now()){
  if(['completed','cancelled'].includes(booking?.status))return{key:'done',label:booking.status==='completed'?'เสร็จสิ้น':'ยกเลิกแล้ว'};
  const today=currentDay(now),pickup=day(booking?.pickupDate),returned=day(booking?.returnDate);
  if(['renting','return_preparing'].includes(booking?.status)&&today>returned)return{key:'return_overdue',label:'เกินกำหนดคืน'};
  if(['renting','return_preparing'].includes(booking?.status)&&today===returned)return{key:'return_today',label:'คืนวันนี้'};
  if(today===pickup)return{key:'pickup_today',label:'เริ่มเช่าวันนี้'};
  if(today<pickup)return{key:'before_pickup',label:`อีก ${pickup-today} วันถึงวันรับ`};
  return{key:'in_progress',label:'อยู่ระหว่างการเช่า'};
}

export function rentalFitSummary(booking,body){
  if(!body)return null;
  const items=Array.isArray(booking?.items)?booking.items:[];
  if(!items.length)return null;
  const results=items.map(row=>{
    const snapshot=row.listingSnapshot||{},fit=calculateFitMatch(body,{category:snapshot.category,lengthTarget:snapshot.lengthTarget},{measurements:snapshot.measurements});
    return fit?{title:snapshot.title||'สินค้า',size:row.size,score:fit.score,rows:fit.rows}:null;
  });
  if(results.some(row=>!row))return null;
  return{score:Math.round(results.reduce((sum,row)=>sum+row.score,0)/results.length),items:results};
}
