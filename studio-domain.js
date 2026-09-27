export const BODY_DEFAULTS={female:{height:170,chest:90,waist:72,hip:96,shoulder:40},male:{height:178,chest:100,waist:84,hip:100,shoulder:46}};
export const BODY_LIMITS={height:[120,220],chest:[50,180],waist:[40,160],hip:[50,190],shoulder:[25,65]};
export const SLOTS={top:'เสื้อ',bottom:'กางเกง',wig:'วิก',neck:'คอ',waist:'เอว',face:'ใบหน้า',hair:'ผม'};
export const IDENTITY={x:0,y:0,z:0,rotation:0,scale:1};
export function validateStudioBody(body){return !!body&&Object.entries(BODY_LIMITS).every(([k,[min,max]])=>Number.isFinite(body[k])&&body[k]>=min&&body[k]<=max);}
export function profileStudio(state,id){return structuredClone(state.studioProfiles?.[id]||{style:'female',bodies:BODY_DEFAULTS,outfit:{}});}
export function cleanOutfit(state,outfit){
 if(!outfit||typeof outfit!=='object'||Array.isArray(outfit))throw Error('ชุดที่บันทึกไม่ถูกต้อง');
 const clean={};
 for(const [slot,ref] of Object.entries(outfit)){
  if(!Object.hasOwn(SLOTS,slot)||!ref||typeof ref!=='object')throw Error('ตำแหน่งชิ้นส่วนไม่ถูกต้อง');
  const item=state.listings.find(l=>l.id===ref.listingId),variant=item?.sizeVariants.find(v=>v.id===ref.variantId);
  if(!item||item.status==='deleted'||item.attachmentSlot!==slot||!item.model?.url||!variant)throw Error('ไม่พบชิ้นส่วนหรือไซซ์สำหรับตำแหน่งนี้');
  const t=ref.transform||IDENTITY;
  if(!['x','y','z'].every(k=>Number.isFinite(t[k])&&Math.abs(t[k])<=.3)||!Number.isFinite(t.rotation)||Math.abs(t.rotation)>180||!Number.isFinite(t.scale)||t.scale<.5||t.scale>1.5)throw Error('ปรับตำแหน่งไม่เกิน 30 ซม. หมุน ±180° และขนาด 50–150%');
  clean[slot]={listingId:item.id,variantId:variant.id,transform:Object.fromEntries(Object.keys(IDENTITY).map(k=>[k,t[k]]))};
 }
 return clean;
}
export function mergeStudioCatalog(state,catalog,now=Date.now()){
 state.studioProfiles??={};
 if(!catalog||catalog.version!==1||!Array.isArray(catalog.items))return state;
 for(const item of catalog.items){
  const existing=state.listings.find(l=>l.id===item.id);
  if(existing){
   if(existing.studioSeedVersion){
    existing.model=structuredClone(item.model);
    existing.photos=structuredClone(item.photos);
    existing.coverId=item.coverId;
    existing.photoCredit=structuredClone(item.photoCredit);
    existing.attachmentSlot=item.attachmentSlot;
    existing.category=item.category;
    existing.theme=item.theme;
    existing.occasionCategory='costume';
   }
   continue;
  }
  if(!Object.hasOwn(SLOTS,item.attachmentSlot)||!item.model?.url||!state.profiles.some(p=>p.id===item.sellerId))continue;
  state.listings.push({...structuredClone(item),occasionCategory:'costume',costumeLayers:[],status:'active',publishedAt:now,updatedAt:now,studioSeedVersion:catalog.version});
 }
 state.studioCatalogVersion=catalog.version;
 return state;
}
