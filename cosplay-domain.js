import {BODY_LIMITS,profileStudio,validateStudioBody,cleanOutfit} from './studio-domain.js';
const fail = message => { throw new Error(message); };
const uid = (prefix,now) => `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const text = value => typeof value === 'string' && value.trim().length > 0;
const source = value => (typeof Blob !== 'undefined' && value instanceof Blob && ['image/png','image/jpeg','image/webp'].includes(value.type) && value.size > 0 && value.size <= 10*1024*1024) || (typeof value === 'string' && (/^\.?\/?cosplay-assets\/[a-z0-9-]+\.svg$/.test(value)||/^(?:studio-assets|toosuepha-assets)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp)$/.test(value)));
const layerSource = value => (typeof Blob !== 'undefined' && value instanceof Blob && value.type === 'image/png' && value.size > 0 && value.size <= 10*1024*1024) || (typeof value === 'string' && /^\.?\/?cosplay-assets\/[a-z0-9-]+\.svg$/.test(value));
const unique = rows => rows.every(row=>text(row.id)) && new Set(rows.map(row=>row.id)).size === rows.length;
const DATE_PATTERN=/^(\d{4})-(\d{2})-(\d{2})$/;
function calendarDay(value){
  const match=DATE_PATTERN.exec(value??'');if(!match)fail('กรอกวันที่ให้ถูกต้อง');
  const [year,month,day]=match.slice(1).map(Number),utc=Date.UTC(year,month-1,day),check=new Date(utc);
  if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day)fail('กรอกวันที่ให้ถูกต้อง');
  return utc/86400000;
}
function localDateKey(now){const date=new Date(now);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function rentalDays(pickupDate,returnDate){const pickup=calendarDay(pickupDate),returned=calendarDay(returnDate);if(returned<pickup)fail('วันคืนต้องไม่ก่อนวันรับชุด');return returned-pickup+1;}
export function rentalRangesOverlap(aPickup,aReturn,bPickup,bReturn){return calendarDay(aPickup)<=calendarDay(bReturn)&&calendarDay(bPickup)<=calendarDay(aReturn);}
export function normalizeCosplayState(state){
  if(!state||typeof state!=='object')fail('ข้อมูลระบบไม่ถูกต้อง');
  if(!Array.isArray(state.rentals))state.rentals=[];
  if(!Array.isArray(state.orders))state.orders=[];
  if(!state.rentalBags||typeof state.rentalBags!=='object'||Array.isArray(state.rentalBags))state.rentalBags={};
  if(!Array.isArray(state.checkoutGroups))state.checkoutGroups=[];
  if(!Array.isArray(state.payments))state.payments=[];
  if(!Array.isArray(state.ledger))state.ledger=[];
  if(!Array.isArray(state.events))state.events=[];
  return state;
}
export function rentalBalance(state,sellerId){
  normalizeCosplayState(state);let pending=0,available=0;
  for(const row of state.ledger.filter(entry=>entry.sellerId===sellerId)){
    if(row.type==='escrow_hold')pending+=row.amount;
    else if(row.type==='escrow_release'){pending-=row.amount;available+=row.amount;}
    else if(row.type==='refund')pending-=row.amount;
  }
  return {pending:Math.max(0,pending),available:Math.max(0,available)};
}
const bookingItems=booking=>Array.isArray(booking.items)?booking.items:[{listingId:booking.listingId,variantId:booking.variantId}];
const blocksDates=booking=>!['pending','cancelled'].includes(booking.status);
const conflicts=(state,listingId,variantId,pickupDate,returnDate,ignoreId=null)=>state.rentals.some(row=>row.id!==ignoreId&&blocksDates(row)&&bookingItems(row).some(item=>item.listingId===listingId&&item.variantId===variantId)&&rentalRangesOverlap(pickupDate,returnDate,row.pickupDate,row.returnDate));
export function validateCosplayListing(item) {
  const errors=[]; if(!item || typeof item !== 'object') return ['ข้อมูลสินค้าไม่ถูกต้อง'];
  for(const key of ['character','title','series','description']) if(!text(item[key]) || item[key].length>5000) errors.push(`กรอก ${key} ให้ถูกต้อง`);
  if(!Array.isArray(item.components)||!item.components.length||item.components.some(v=>!text(v))) errors.push('ระบุชิ้นส่วนชุด');
  if(!['good','like_new','defect'].includes(item.condition)) errors.push('สภาพชุดไม่ถูกต้อง');
  if(!['waist','knee','ankle'].includes(item.lengthTarget)) errors.push('เลือกความยาวชุด');
  const photos=Array.isArray(item.photos)?item.photos:[];
  if(!photos.length||!unique(photos)||photos.some(p=>!source(p.src)||!['front','back','label','defect'].includes(p.tag))||!photos.some(p=>p.tag==='front')) errors.push('ต้องมีรูปด้านหน้าและไฟล์รูปที่ถูกต้อง');
  if(!photos.some(p=>p.id===item.coverId)) errors.push('เลือกรูปปก');
  const defects=Array.isArray(item.defects)?item.defects:[];
  if(item.condition==='defect'&&!defects.length) errors.push('ระบุรายละเอียดตำหนิ');
  if(defects.some(d=>!photos.some(p=>p.id===d.photoId&&p.tag==='defect')||!text(d.type)||!text(d.severity)||!text(d.description))) errors.push('ตำหนิต้องเชื่อมกับรูปตำหนิและมีรายละเอียด');
  const variants=Array.isArray(item.sizeVariants)?item.sizeVariants:[];
  if(!variants.length||!unique(variants)||new Set(variants.map(v=>v.size)).size!==variants.length) errors.push('ระบุไซซ์ที่ไม่ซ้ำกัน');
  for(const v of variants){
    if(!['S','M','L','XL'].includes(v.size)||!Number.isFinite(v.price)||v.price<=0||v.price>1000000||![0,1].includes(v.stock)) errors.push('ไซซ์ ราคา หรือสต็อกไม่ถูกต้อง');
    if(['shoulder','chest','waist','hip','length'].some(k=>!Number.isFinite(v.measurements?.[k])||v.measurements[k]<10||v.measurements[k]>250)) errors.push('กรอกขนาดชุดเป็นเซนติเมตรให้ครบ');
  }
  const layers=Array.isArray(item.costumeLayers)?item.costumeLayers:[];
  if(!unique(layers)||layers.some(l=>!['wig','base','outer','shoes','accessory'].includes(l.slot)||!layerSource(l.src)||!Number.isFinite(l.x)||Math.abs(l.x)>400||!Number.isFinite(l.y)||Math.abs(l.y)>600||!Number.isFinite(l.scale)||l.scale<0.1||l.scale>3)) errors.push('เลเยอร์ชุดไม่ถูกต้อง');
  return [...new Set(errors)];
}
export const validateListing=validateCosplayListing;
export function transitionCosplay(state,action,payload={},now=Date.now(),actorId=payload.actorId){
  normalizeCosplayState(state);
  if(actorId!==undefined&&actorId!==state.settings.currentUserId) fail('บัญชีเปลี่ยนในแท็บอื่น กรุณาโหลดหน้าใหม่ก่อนทำรายการ');
  const find=id=>state.listings.find(l=>l.id===id)??fail('ไม่พบสินค้า');
  const user=()=>state.profiles.find(p=>p.id===state.settings.currentUserId)??fail('กรุณาเลือกบัญชี');
  const event=(type,fields={})=>state.events.push({id:uid('event',now),type,at:now,...fields});
  if(action==='profile.switch'){if(payload.id!==null&&!state.profiles.some(p=>p.id===payload.id))fail('ไม่พบบัญชี');state.settings.currentUserId=payload.id;return {id:payload.id};}
  if(action==='profile.create'){
    const name=String(payload.name??'').trim(),email=String(payload.email??'').trim();
    if(!name||name.length>100||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('กรอกชื่อและอีเมลให้ถูกต้อง');
    if(state.profiles.some(p=>p.email.toLowerCase()===email.toLowerCase()))fail('อีเมลนี้มีบัญชีแล้ว');
    const id=uid('user',now);state.profiles.push({id,name,email});state.settings.currentUserId=id;state.favorites[id]=[];event(action,{userId:id});return {id};
  }
  const actor=user();
  if(action==='studio.body.save'){
    if(!['female','male'].includes(payload.style)||!validateStudioBody(payload.body))fail('สัดส่วนหุ่นไม่ถูกต้อง');
    const profile=profileStudio(state,actor.id);profile.style=payload.style;profile.bodies[payload.style]=Object.fromEntries(Object.keys(BODY_LIMITS).map(k=>[k,payload.body[k]]));
    (state.studioProfiles??={})[actor.id]=profile;return {id:actor.id};
  }
  if(action==='studio.outfit.save'){
    const outfit=cleanOutfit(state,payload.outfit),profile=profileStudio(state,actor.id);profile.outfit=outfit;
    (state.studioProfiles??={})[actor.id]=profile;return {id:actor.id};
  }
  if(action==='favorite.toggle'){const listing=find(payload.id);if(listing.status==='deleted')fail('ไม่พบสินค้า');const favorites=state.favorites[actor.id]??=[];const index=favorites.indexOf(listing.id);if(index<0)favorites.push(listing.id);else favorites.splice(index,1);return {id:listing.id,favorite:index<0};}
  if(action==='mannequin.save'){
    const body=payload.body,ranges={height:[120,220],chest:[50,180],waist:[40,160],hip:[50,190],shoulder:[25,65]};
    if(!body||!['Slim','Regular','Curvy'].includes(body.preset)||Object.entries(ranges).some(([k,[min,max]])=>!Number.isFinite(body[k])||body[k]<min||body[k]>max))fail('สัดส่วนหุ่นไม่ถูกต้อง');
    state.mannequins[actor.id]=Object.fromEntries([...Object.keys(ranges),'preset'].map(k=>[k,body[k]]));return {id:actor.id};
  }
  if(action==='rentalBag.add'){
    const item=find(payload.listingId),variant=item.sizeVariants.find(v=>v.id===payload.variantId);
    if(item.sellerId===actor.id)fail('เช่าชุดของตัวเองไม่ได้');
    if(item.status!=='active'||!variant||variant.stock<1)fail('ไซซ์นี้ไม่พร้อมให้เช่า');
    if(validateCosplayListing(item).length)fail('ข้อมูลสินค้าไม่ถูกต้อง');
    const bag=state.rentalBags[actor.id]??={items:[],pickupDate:'',returnDate:''};
    if(!bag.items.some(row=>row.listingId===item.id&&row.variantId===variant.id))bag.items.push({listingId:item.id,variantId:variant.id,addedAt:now});
    event(action,{userId:actor.id,listingId:item.id,variantId:variant.id});return {count:bag.items.length};
  }
  if(action==='rentalBag.remove'){
    const bag=state.rentalBags[actor.id]??={items:[],pickupDate:'',returnDate:''},index=bag.items.findIndex(row=>row.listingId===payload.listingId&&row.variantId===payload.variantId);
    if(index<0)fail('ไม่พบชุดนี้ในรายการเช่า');bag.items.splice(index,1);return {count:bag.items.length};
  }
  if(action==='rentalBag.dates'){
    rentalDays(payload.pickupDate,payload.returnDate);
    if(calendarDay(payload.pickupDate)<calendarDay(localDateKey(now)))fail('วันรับชุดต้องเป็นวันนี้หรือวันถัดไป');
    const bag=state.rentalBags[actor.id]??={items:[],pickupDate:'',returnDate:''};bag.pickupDate=payload.pickupDate;bag.returnDate=payload.returnDate;return {pickupDate:bag.pickupDate,returnDate:bag.returnDate};
  }
  if(action==='rental.checkout'){
    const bag=state.rentalBags[actor.id];if(!bag?.items?.length)fail('ยังไม่มีชุดในรายการเช่า');
    const days=rentalDays(bag.pickupDate,bag.returnDate);if(calendarDay(bag.pickupDate)<calendarDay(localDateKey(now)))fail('วันรับชุดต้องเป็นวันนี้หรือวันถัดไป');
    const prepared=bag.items.map(row=>{
      const item=find(row.listingId),variant=item.sizeVariants.find(v=>v.id===row.variantId);
      if(item.sellerId===actor.id)fail('รายการเช่ามีชุดของบัญชีนี้');
      if(item.status!=='active'||!variant||variant.stock<1)fail(`${item.title} ไซซ์นี้ไม่พร้อมให้เช่า`);
      if(validateCosplayListing(item).length||!state.profiles.some(p=>p.id===item.sellerId))fail('ข้อมูลสินค้าไม่ถูกต้อง');
      if(conflicts(state,item.id,variant.id,bag.pickupDate,bag.returnDate))fail(`${item.title} ไซซ์ ${variant.size} ไม่ว่างในวันที่เลือก`);
      const seller=state.profiles.find(p=>p.id===item.sellerId),dailyPrice=variant.price;
      return {listingId:item.id,variantId:variant.id,size:variant.size,dailyPrice,lineTotal:dailyPrice*days,listingSnapshot:{title:item.title,character:item.character,image:structuredClone(item.photos.find(p=>p.id===item.coverId)),sellerName:seller.name,condition:item.condition,measurements:structuredClone(variant.measurements)}};
    });
    const groupId=uid('checkout',now),groups=new Map();
    for(const row of prepared){const item=find(row.listingId);if(!groups.has(item.sellerId))groups.set(item.sellerId,[]);groups.get(item.sellerId).push(row);}
    const bookingIds=[];let amount=0;
    for(const [sellerId,items] of groups){
      const id=uid('booking',now),totalPrice=items.reduce((sum,row)=>sum+row.lineTotal,0);amount+=totalPrice;bookingIds.push(id);
      state.rentals.push({id,checkoutGroupId:groupId,renterId:actor.id,sellerId,items:structuredClone(items),pickupDate:bag.pickupDate,returnDate:bag.returnDate,rentalDays:days,totalPrice,status:'paid',paymentStatus:'paid',escrowStatus:'held',createdAt:now,statusHistory:[{status:'paid',at:now,by:actor.id}],tracking:{outbound:null,return:null}});
      state.ledger.push({id:uid('ledger',now),bookingId:id,checkoutGroupId:groupId,sellerId,type:'escrow_hold',amount:totalPrice,at:now});
    }
    state.checkoutGroups.push({id:groupId,renterId:actor.id,bookingIds:[...bookingIds],pickupDate:bag.pickupDate,returnDate:bag.returnDate,rentalDays:days,totalPrice:amount,createdAt:now});
    state.payments.push({id:uid('payment',now),checkoutGroupId:groupId,renterId:actor.id,amount,status:'paid',paidAt:now,refundedAmount:0});
    bag.items=[];event(action,{checkoutGroupId:groupId,userId:actor.id,bookingIds:[...bookingIds]});return {groupId,bookingIds,totalPrice:amount};
  }
  if(action.startsWith('rental.')&&!['rental.create','rental.confirm','rental.complete'].includes(action)){
    const booking=state.rentals.find(row=>row.id===payload.id)??fail('ไม่พบ Booking');
    const seller=()=>{if(booking.sellerId!==actor.id)fail('เฉพาะผู้ให้เช่าเท่านั้นที่ทำรายการนี้ได้');};
    const renter=()=>{if(booking.renterId!==actor.id)fail('เฉพาะผู้เช่าเท่านั้นที่ทำรายการนี้ได้');};
    const requireStatus=status=>{if(booking.status!==status)fail(`Booking ไม่อยู่ในสถานะ ${status}`);};
    const move=status=>{booking.status=status;(booking.statusHistory??=[]).push({status,at:now,by:actor.id});event(action,{rentalId:booking.id,userId:actor.id,status});return {id:booking.id,status};};
    const tracking=()=>{const carrier=String(payload.carrier??'').trim(),trackingNumber=String(payload.trackingNumber??'').trim();if(!carrier||!trackingNumber||carrier.length>100||trackingNumber.length>100)fail('กรอกผู้ขนส่งและเลข Tracking ให้ครบ');return {carrier,trackingNumber};};
    if(action==='rental.cancel'){
      renter();if(booking.status!=='paid')fail('ยกเลิกได้ก่อนร้านเริ่มเตรียมชุดเท่านั้น');
      booking.paymentStatus='refunded';booking.escrowStatus='refunded';const payment=state.payments.find(row=>row.checkoutGroupId===booking.checkoutGroupId);if(payment){payment.refundedAmount=(payment.refundedAmount||0)+booking.totalPrice;payment.status=payment.refundedAmount===payment.amount?'refunded':'partially_refunded';}
      state.ledger.push({id:uid('ledger',now),bookingId:booking.id,checkoutGroupId:booking.checkoutGroupId,sellerId:booking.sellerId,type:'refund',amount:booking.totalPrice,at:now});return move('cancelled');
    }
    if(action==='rental.prepare'){seller();requireStatus('paid');return move('preparing');}
    if(action==='rental.shipOutbound'){seller();requireStatus('preparing');booking.tracking.outbound={...tracking(),shippedAt:now,inTransitAt:null};return move('outbound_shipped');}
    if(action==='rental.transitOutbound'){seller();requireStatus('outbound_shipped');booking.tracking.outbound.inTransitAt=now;return move('outbound_transit');}
    if(action==='rental.receive'){renter();requireStatus('outbound_transit');booking.receivedAt=now;return move('renting');}
    if(action==='rental.prepareReturn'){renter();requireStatus('renting');return move('return_preparing');}
    if(action==='rental.shipReturn'){renter();requireStatus('return_preparing');booking.tracking.return={...tracking(),shippedAt:now,receivedAt:null};return move('return_shipped');}
    if(action==='rental.receiveReturn'){seller();requireStatus('return_shipped');booking.tracking.return.receivedAt=now;return move('return_received');}
    if(action==='rental.inspect'){
      seller();if(!['return_received','inspection'].includes(booking.status))fail('Booking ไม่อยู่ในสถานะตรวจสภาพ');booking.inspection={passed:payload.passed===true,note:String(payload.note??'').trim(),at:now};
      if(!booking.inspection.passed)return move('inspection');
      booking.escrowStatus='released';state.ledger.push({id:uid('ledger',now),bookingId:booking.id,checkoutGroupId:booking.checkoutGroupId,sellerId:booking.sellerId,type:'escrow_release',amount:booking.totalPrice,at:now});return move('cleaning');
    }
    if(action==='rental.completeCleaning'){seller();requireStatus('cleaning');booking.completedAt=now;return move('completed');}
  }
  if(action==='listing.save'){
    const input=payload.listing;if(!input||typeof input!=='object')fail('ข้อมูลสินค้าไม่ถูกต้อง');const existing=input.id?find(input.id):null;
    if(existing&&(existing.sellerId!==actor.id||existing.status==='deleted'))fail('แก้ไขได้เฉพาะสินค้าของคุณที่ยังไม่ลบ');
    const candidate=structuredClone(Object.fromEntries(['character','title','series','description','components','condition','photos','coverId','defects','costumeLayers','lengthTarget','sizeVariants'].map(k=>[k,input[k]])));
    const errors=validateCosplayListing(candidate);if(errors.length)fail(errors.join('\n'));
    if(existing)for(const sold of existing.sizeVariants.filter(v=>v.stock===0)){
      const variant=candidate.sizeVariants.find(v=>v.id===sold.id);if(!variant||variant.size!==sold.size||variant.price!==sold.price||Object.keys(sold.measurements).some(k=>variant.measurements[k]!==sold.measurements[k]))fail('เปลี่ยนหรือลบไซซ์ที่ขายแล้วไม่ได้');variant.stock=0;
    }
    if(existing){Object.assign(existing,candidate,{updatedAt:now});event(action,{listingId:existing.id,userId:actor.id});return {id:existing.id};}
    if(candidate.sizeVariants.some(v=>v.stock!==1))fail('สินค้าใหม่ต้องมีสต็อกพร้อมขาย');
    const id=uid('cosplay',now);state.listings.push({...candidate,id,sellerId:actor.id,status:'active',publishedAt:now,updatedAt:now});event(action,{listingId:id,userId:actor.id});return {id};
  }
  if(action==='listing.status'){const item=find(payload.id);if(item.sellerId!==actor.id||item.status==='deleted')fail('จัดการสินค้านี้ไม่ได้');if(!['active','paused','deleted'].includes(payload.status))fail('สถานะไม่ถูกต้อง');item.status=payload.status;item.updatedAt=now;event(action,{listingId:item.id});return {id:item.id};}
  if(action==='rental.create'){
    const item=find(payload.listingId),variant=item.sizeVariants.find(v=>v.id===payload.variantId);
    if(item.sellerId===actor.id)fail('เช่าชุดของตัวเองไม่ได้');
    if(item.status!=='active'||!variant||variant.stock<1)fail('ไซซ์นี้ไม่พร้อมให้เช่า');
    if(validateCosplayListing(item).length||!state.profiles.some(p=>p.id===item.sellerId))fail('ข้อมูลสินค้าไม่ถูกต้อง');
    const days=rentalDays(payload.pickupDate,payload.returnDate);
    if(calendarDay(payload.pickupDate)<calendarDay(localDateKey(now)))fail('วันรับชุดต้องเป็นวันนี้หรือวันถัดไป');
    const conflict=conflicts(state,item.id,variant.id,payload.pickupDate,payload.returnDate);
    if(conflict)fail('ไซซ์นี้ไม่ว่างในวันที่เลือก');
    const seller=state.profiles.find(p=>p.id===item.sellerId),id=uid('rental',now);
    state.rentals.push({id,listingId:item.id,variantId:variant.id,renterId:actor.id,sellerId:item.sellerId,size:variant.size,pickupDate:payload.pickupDate,returnDate:payload.returnDate,dailyPrice:variant.price,rentalDays:days,totalPrice:variant.price*days,status:'pending',createdAt:now,confirmedAt:null,completedAt:null,listingSnapshot:{title:item.title,character:item.character,image:structuredClone(item.photos.find(p=>p.id===item.coverId)),sellerName:seller.name}});
    event(action,{rentalId:id,userId:actor.id});return {id};
  }
  if(action==='rental.confirm'){
    const booking=state.rentals.find(row=>row.id===payload.id)??fail('ไม่พบคำขอเช่า');
    if(booking.sellerId!==actor.id)fail('เฉพาะผู้ให้เช่าเท่านั้นที่ยืนยันคำขอเช่าได้');
    if(booking.status!=='pending')fail('คำขอเช่านี้ถูกดำเนินการแล้ว');
    const item=find(booking.listingId);if(item.sellerId!==actor.id)fail('เจ้าของประกาศไม่ตรงกับคำขอเช่า');
    const conflict=conflicts(state,booking.listingId,booking.variantId,booking.pickupDate,booking.returnDate,booking.id);
    if(conflict)fail('มีการยืนยันการเช่าที่ใช้วันเดียวกันแล้ว');
    booking.status='confirmed';booking.confirmedAt=now;event(action,{rentalId:booking.id,userId:actor.id});return {id:booking.id,status:booking.status};
  }
  if(action==='rental.complete'){
    const booking=state.rentals.find(row=>row.id===payload.id)??fail('ไม่พบคำขอเช่า');
    if(booking.sellerId!==actor.id)fail('เฉพาะผู้ให้เช่าเท่านั้นที่ปิดงานเช่าได้');
    if(booking.status==='completed')fail('งานเช่านี้เสร็จสิ้นแล้ว');
    if(booking.status!=='confirmed')fail('คำขอเช่าต้องอยู่ในสถานะยืนยันแล้วจึงปิดงานได้');
    booking.status='completed';booking.completedAt=now;event(action,{rentalId:booking.id,userId:actor.id});return {id:booking.id,status:booking.status};
  }
  if(action==='purchase.create'){
    const item=find(payload.listingId),variant=item.sizeVariants.find(v=>v.id===payload.variantId);
    if(item.sellerId===actor.id)fail('ซื้อชุดของตัวเองไม่ได้');if(item.status!=='active'||!variant||variant.stock!==1)fail('ไซซ์นี้ไม่พร้อมขาย');
    if(validateCosplayListing(item).length||!state.profiles.some(p=>p.id===item.sellerId))fail('ข้อมูลสินค้าไม่ถูกต้อง');
    const id=uid('order',now),order={id,buyerId:actor.id,sellerId:item.sellerId,listingId:item.id,variantId:variant.id,size:variant.size,price:variant.price,snapshot:structuredClone(item),createdAt:now,status:'confirmed'};
    variant.stock=0;item.updatedAt=now;state.orders.push(order);event(action,{orderId:id,userId:actor.id});return {id};
  }
  fail('ไม่รู้จักรายการที่ต้องการทำ');
}
export const transition=transitionCosplay;

