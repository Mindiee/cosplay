const activePriceRows=item=>(item.sizeVariants||[]).filter(variant=>variant.stock>0);

export function marketplaceType(item){
  if(['top','bottom','wig','accessory'].includes(item.category))return item.category;
  if(['top','bottom','wig'].includes(item.attachmentSlot))return item.attachmentSlot;
  if(item.attachmentSlot)return 'accessory';
  return '';
}

export function marketplaceThemes(listings){
  return [...new Set(listings.filter(item=>item.status==='active'&&activePriceRows(item).length&&item.theme).map(item=>item.theme))].sort((a,b)=>a.localeCompare(b));
}

export function filterMarketplaceListings(listings,filters={}){
  const query=String(filters.q||'').trim().toLocaleLowerCase();
  const ceiling=filters.maxPrice===''||filters.maxPrice==null?null:Number(filters.maxPrice);
  return listings.filter(item=>{
    const variants=activePriceRows(item);
    if(item.status!=='active'||!variants.length)return false;
    if(filters.theme&&item.theme!==filters.theme)return false;
    if(filters.type&&marketplaceType(item)!==filters.type)return false;
    if(filters.condition&&item.condition!==filters.condition)return false;
    if(query&&![item.character,item.title,item.series,item.description].join(' ').toLocaleLowerCase().includes(query))return false;
    return variants.some(variant=>(!filters.size||variant.size===filters.size)&&(!Number.isFinite(ceiling)||variant.price<=ceiling));
  }).sort((a,b)=>filters.sort==='price'
    ?Math.min(...activePriceRows(a).map(v=>v.price))-Math.min(...activePriceRows(b).map(v=>v.price))
    :(b.publishedAt||0)-(a.publishedAt||0));
}
