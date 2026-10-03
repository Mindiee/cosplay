import {IDENTITY} from './studio-domain.js';

export function addPreviewPiece(outfit,item,variant){
  if(!item?.model?.url||!item.attachmentSlot)throw Error('ชิ้นนี้ยังไม่มีโมเดล 3D สำหรับลองบนหุ่น');
  if(!item.sizeVariants?.some(row=>row.id===variant?.id))throw Error('ไม่พบไซซ์ที่เลือก');
  return {...outfit,[item.attachmentSlot]:{listingId:item.id,variantId:variant.id,transform:{...IDENTITY}}};
}

export function removePreviewPiece(outfit,slot){
  const next={...outfit};delete next[slot];return next;
}
