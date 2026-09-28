import {rentalBalance} from './cosplay-domain.js';

const HISTORY_STATUSES = new Set(['completed','cancelled']);
const RENTED_STATUSES = new Set(['outbound_transit','renting','return_preparing','return_shipped']);
const ACTION_PRIORITY = {
  return_received: 0,
  inspection: 0,
  return_shipped: 1,
  cleaning: 2,
  paid: 3,
  preparing: 3,
  outbound_shipped: 3,
  pending: 4,
  confirmed: 4
};

export function lenderNextAction(booking,sellerId){
  if(!booking||booking.sellerId!==sellerId)return null;
  const actions={
    pending:{action:'rental.confirm',label:'ยืนยันข้อมูลเดิม',kind:'secondary'},
    confirmed:{action:'rental.complete',label:'ปิดข้อมูลเดิม',kind:'secondary'},
    paid:{action:'rental.prepare',label:'เริ่มเตรียมชุด',kind:'primary'},
    preparing:{action:'rental.shipOutbound',label:'ส่งชุดให้ผู้เช่า',kind:'primary',tracking:'outbound'},
    outbound_shipped:{action:'rental.transitOutbound',label:'จำลองกำลังจัดส่ง',kind:'secondary'},
    return_shipped:{action:'rental.receiveReturn',label:'ยืนยันได้รับชุดคืน',kind:'primary'},
    return_received:{action:'rental.inspect',label:'ตรวจสภาพชุดคืน',kind:'primary'},
    inspection:{action:'rental.inspect',label:'ตรวจสภาพอีกครั้ง',kind:'primary'},
    cleaning:{action:'rental.completeCleaning',label:'ทำความสะอาดเสร็จ',kind:'primary'}
  };
  return actions[booking.status]??null;
}

export function lenderBookingBuckets(state,sellerId){
  const rows=(state.rentals??[]).filter(row=>row.sellerId===sellerId);
  const action=rows.filter(row=>lenderNextAction(row,sellerId)).sort((a,b)=>(ACTION_PRIORITY[a.status]??9)-(ACTION_PRIORITY[b.status]??9)||(a.createdAt??0)-(b.createdAt??0));
  const actionIds=new Set(action.map(row=>row.id));
  return {
    action,
    progress:rows.filter(row=>!actionIds.has(row.id)&&!HISTORY_STATUSES.has(row.status)).sort((a,b)=>(b.createdAt??0)-(a.createdAt??0)),
    history:rows.filter(row=>HISTORY_STATUSES.has(row.status)).sort((a,b)=>(b.createdAt??0)-(a.createdAt??0))
  };
}

export function listingRentalSchedule(state,sellerId,listingId){
  const listing=(state.listings??[]).find(row=>row.id===listingId);
  if(!listing||listing.sellerId!==sellerId)return [];
  return (state.rentals??[]).flatMap(booking=>{
    if(booking.sellerId!==sellerId||['pending','cancelled'].includes(booking.status))return [];
    const items=Array.isArray(booking.items)?booking.items:[{listingId:booking.listingId,variantId:booking.variantId,size:booking.size}];
    return items.filter(item=>item.listingId===listingId).map(item=>({
      bookingId:booking.id,
      variantId:item.variantId,
      size:item.size,
      pickupDate:booking.pickupDate,
      returnDate:booking.returnDate,
      status:booking.status
    }));
  }).sort((a,b)=>String(a.pickupDate).localeCompare(String(b.pickupDate))||String(a.returnDate).localeCompare(String(b.returnDate)));
}

export function lenderLedgerRows(state,sellerId){
  const bookings=new Map((state.rentals??[]).map(row=>[row.id,row]));
  return (state.ledger??[]).filter(row=>row.sellerId===sellerId).map(row=>({...row,booking:bookings.get(row.bookingId)})).filter(row=>row.booking).sort((a,b)=>(b.at??0)-(a.at??0));
}

export function lenderSummary(state,sellerId){
  const owned=(state.listings??[]).filter(row=>row.sellerId===sellerId&&row.status!=='deleted');
  const buckets=lenderBookingBuckets(state,sellerId);
  return {
    listings:owned.length,
    activeListings:owned.filter(row=>row.status==='active').length,
    actionRequired:buckets.action.length,
    currentlyRented:(state.rentals??[]).filter(row=>row.sellerId===sellerId&&RENTED_STATUSES.has(row.status)).length,
    earnings:rentalBalance(state,sellerId)
  };
}
