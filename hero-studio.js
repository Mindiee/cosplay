import {createStudioRenderer} from './studio-renderer.js';
import {IDENTITY,profileStudio} from './studio-domain.js';

export function createPreviewStudio(host,state,catalog,{listingId,variantId,style,body,outfit}={},onStatus=()=>{}){
  const renderer=createStudioRenderer(host,onStatus);
  const update=next=>{
    const profile=profileStudio(next,next.settings.currentUserId);
    const item=next.listings.find(row=>row.id===listingId);
    const selectedOutfit=outfit??(item?.attachmentSlot?{[item.attachmentSlot]:{listingId:item.id,variantId:variantId||item.sizeVariants[0]?.id,transform:{...IDENTITY}}}:profile.outfit);
    renderer.update({style:style||profile.style,body:body||profile.bodies[style||profile.style],outfit:selectedOutfit,listings:next.listings,bodies:catalog?.bodies});
  };
  update(state);renderer.view(0);
  return {update,dispose:()=>renderer.dispose()};
}

export function createHeroStudio(host,state,catalog,onStatus=()=>{}){
  const renderer=createStudioRenderer(host,onStatus);
  const update=next=>{
    const profile=profileStudio(next,next.settings.currentUserId);
    renderer.update({style:profile.style,body:profile.bodies[profile.style],outfit:profile.outfit,listings:next.listings,bodies:catalog?.bodies});
  };
  update(state);
  renderer.view(0);
  return {update,dispose:()=>renderer.dispose()};
}
