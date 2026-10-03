import {renterNextAction,rentalUrgency} from './rental-presenter.js';
import {lenderNextAction} from './lender-presenter.js';

export function marketNotifications(state,accountId,now=Date.now()){
  if(!accountId)return [];
  return (state.rentals||[]).flatMap(booking=>{
    const renter=booking.renterId===accountId,seller=booking.sellerId===accountId;
    if(!renter&&!seller)return [];
    const action=renter?renterNextAction(booking,accountId):lenderNextAction(booking,accountId);
    const title=booking.items?.map(row=>row.listingSnapshot?.title).filter(Boolean).join(' + ')||booking.listingSnapshot?.title||'ชุดที่เช่า';
    const urgency=renter?rentalUrgency(booking,now).label:'';
    const active=!['completed','cancelled'].includes(booking.status);
    const urgent=action?.kind==='primary';
    return [{id:`${booking.id}:${renter?'renter':'lender'}:${booking.status}`,title,detail:urgent?action.label:renter?urgency||'ตรวจสอบสถานะการเช่า':active?'ตรวจสอบสถานะ Booking':booking.status==='completed'?'รายการเช่าเสร็จสิ้น':'รายการเช่าถูกยกเลิก',href:renter?`#rental/${booking.id}`:'#closet/requests',urgent,at:booking.createdAt||0,role:renter?'renter':'lender'}];
  }).sort((a,b)=>Number(b.urgent)-Number(a.urgent)||b.at-a.at);
}
