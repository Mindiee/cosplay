const activePriceRows=item=>(item.sizeVariants||[]).filter(variant=>variant.stock>0);

// Keep the original illustrated demo records for old bookings and direct links,
// but do not offer their SVG costume mockups as current rental inventory.
export const isIllustratedDemoCostume=item=>/^cos-(?:luna|ember|flora|celeste|raven|aurora|scarlet|mika|sol|iris|aqua|nova)$/.test(item?.id||'')
  && item.photos?.some(photo=>typeof photo.src==='string'&&photo.src.startsWith('cosplay-assets/'));

export function marketplaceType(item){
  if(['top','bottom','wig','accessory'].includes(item.category))return item.category;
  if(['top','bottom','wig'].includes(item.attachmentSlot))return item.attachmentSlot;
  if(item.attachmentSlot)return 'accessory';
  return '';
}

export function marketplaceThemes(listings){
  return [...new Set(listings.filter(item=>!isIllustratedDemoCostume(item)&&item.status==='active'&&activePriceRows(item).length&&item.theme).map(item=>item.theme))].sort((a,b)=>a.localeCompare(b));
}

export function filterMarketplaceListings(listings,filters={}){
  const query=String(filters.q||'').trim().toLocaleLowerCase();
  const ceiling=filters.maxPrice===''||filters.maxPrice==null?null:Number(filters.maxPrice);
  return listings.filter(item=>{
    const variants=activePriceRows(item);
    if(isIllustratedDemoCostume(item)||item.status!=='active'||!variants.length)return false;
    if(filters.occasion&&item.occasionCategory!==filters.occasion)return false;
    if(filters.theme&&item.theme!==filters.theme)return false;
    if(filters.type&&marketplaceType(item)!==filters.type)return false;
    if(filters.condition&&item.condition!==filters.condition)return false;
    if(query&&![item.character,item.title,item.series,item.description].join(' ').toLocaleLowerCase().includes(query))return false;
    return variants.some(variant=>(!filters.size||variant.size===filters.size)&&(!Number.isFinite(ceiling)||variant.price<=ceiling)&&(!(filters.availableVariantIds instanceof Set)||filters.availableVariantIds.has(`${item.id}:${variant.id}`)));
  }).sort((a,b)=>{
    if(filters.sort==='price')return Math.min(...activePriceRows(a).map(v=>v.price))-Math.min(...activePriceRows(b).map(v=>v.price));
    if(filters.sort==='fit'){
      const left=Number.isFinite(filters.fitScores?.[a.id])?filters.fitScores[a.id]:-1,right=Number.isFinite(filters.fitScores?.[b.id])?filters.fitScores[b.id]:-1;
      if(left!==right)return right-left;
    }
    return (b.publishedAt||0)-(a.publishedAt||0);
  });
}
