import {BODY_LIMITS,profileStudio,validateStudioBody,cleanOutfit} from './studio-domain.js';
const fail = message => { throw new Error(message); };
const uid = (prefix,now) => `${prefix}-${now.toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const text = value => typeof value === 'string' && value.trim().length > 0;
const source = value => (typeof Blob !== 'undefined' && value instanceof Blob && ['image/png','image/jpeg','image/webp'].includes(value.type) && value.size > 0 && value.size <= 10*1024*1024) || (typeof value === 'string' && (/^\.?\/?cosplay-assets\/[a-z0-9-]+\.svg$/.test(value)||/^studio-assets\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.(?:jpg|jpeg|png|webp)$/.test(value)));
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
export function normalizeCosplayState(state){if(!state||typeof state!=='object')fail('ข้อมูลระบบไม่ถูกต้อง');if(!Array.isArray(state.rentals))state.rentals=[];if(!Array.isArray(state.orders))state.orders=[];return state;}
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
    const conflict=state.rentals.some(row=>row.status==='confirmed'&&row.listingId===item.id&&row.variantId===variant.id&&rentalRangesOverlap(payload.pickupDate,payload.returnDate,row.pickupDate,row.returnDate));
    if(conflict)fail('ไซซ์นี้ไม่ว่างในวันที่เลือก');
    const seller=state.profiles.find(p=>p.id===item.sellerId),id=uid('rental',now);
    state.rentals.push({id,listingId:item.id,variantId:variant.id,renterId:actor.id,sellerId:item.sellerId,size:variant.size,pickupDate:payload.pickupDate,returnDate:payload.returnDate,dailyPrice:variant.price,rentalDays:days,totalPrice:variant.price*days,status:'pending',createdAt:now,confirmedAt:null,listingSnapshot:{title:item.title,character:item.character,image:structuredClone(item.photos.find(p=>p.id===item.coverId)),sellerName:seller.name}});
    event(action,{rentalId:id,userId:actor.id});return {id};
  }
  if(action==='rental.confirm'){
    const booking=state.rentals.find(row=>row.id===payload.id)??fail('ไม่พบคำขอเช่า');
    if(booking.sellerId!==actor.id)fail('เฉพาะผู้ให้เช่าเท่านั้นที่ยืนยันคำขอเช่าได้');
    if(booking.status!=='pending')fail('คำขอเช่านี้ถูกดำเนินการแล้ว');
    const item=find(booking.listingId);if(item.sellerId!==actor.id)fail('เจ้าของประกาศไม่ตรงกับคำขอเช่า');
    const conflict=state.rentals.some(row=>row.id!==booking.id&&row.status==='confirmed'&&row.listingId===booking.listingId&&row.variantId===booking.variantId&&rentalRangesOverlap(booking.pickupDate,booking.returnDate,row.pickupDate,row.returnDate));
    if(conflict)fail('มีการยืนยันการเช่าที่ใช้วันเดียวกันแล้ว');
    booking.status='confirmed';booking.confirmedAt=now;event(action,{rentalId:booking.id,userId:actor.id});return {id:booking.id,status:booking.status};
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

