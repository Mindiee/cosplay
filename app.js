import {createCosplayRepository} from './repository.js';
import {h,money,photoUrl,cover,labels} from './dom.js';
import {openAccounts} from './panels.js';
import {PRESETS,validateBody,calculateFit,calculateFitMatch} from './mannequin.js';
import {openCosplayListing} from './cosplay-seller.js';
import {createStudioUI} from './studio-ui.js';
import {rentalDays,rentalRangesOverlap} from './cosplay-domain.js';
import {filterMarketplaceListings,marketplaceThemes} from './marketplace-filter.js';
import {OCCASION_CATEGORIES,OCCASION_LABELS} from './occasion-domain.js';
import {rentalFitSummary,rentalPhase,rentalTimeline,rentalUrgency,renterNextAction} from './rental-presenter.js';
import {lenderBookingBuckets,lenderLedgerRows,lenderNextAction,lenderSummary,listingRentalSchedule} from './lender-presenter.js';

const $=id=>document.getElementById(id);
const DISCLAIMER='Virtual preview is an estimation and does not guarantee actual fit.';
const CONDITIONS={like_new:'เหมือนใหม่',good:'สภาพดี',defect:'มีตำหนิ'};
let repo,state,modalRenderer=null,previousFocus,toastTimer,studio=null,heroStudio=null,heroMount=0;
let mixStudio=null,studioCatalog=null,studioCatalogError='',studioRouteApplied='';
let filters={q:'',occasion:'',theme:'',type:'',size:'',condition:'',maxPrice:'',pickupDate:'',returnDate:'',sort:'fit'};
const me=()=>state?.settings.currentUserId;
const user=id=>state.profiles.find(p=>p.id===id);
const listing=id=>state.listings.find(l=>l.id===id);
const live=l=>l.status==='active'&&l.sizeVariants.some(v=>v.stock>0);
const firstVariant=l=>l.sizeVariants.find(v=>v.stock>0)||l.sizeVariants[0];
const minPrice=l=>Math.min(...(l.sizeVariants.some(v=>v.stock>0)?l.sizeVariants.filter(v=>v.stock>0):l.sizeVariants).map(v=>v.price));
const bodyForFit=()=>{const profile=state?.studioProfiles?.[me()];return state?.mannequins?.[me()]||profile?.bodies?.[profile.style]||null};
const fitFor=(item,variant)=>calculateFitMatch(bodyForFit(),item,variant);
const bookingParts=row=>row.items||[{listingId:row.listingId,variantId:row.variantId}];
const blocksDate=row=>!['pending','cancelled'].includes(row.status);
function availableVariantIds(){
  if(!filters.pickupDate||!filters.returnDate)return null;
  try{rentalDays(filters.pickupDate,filters.returnDate)}catch{return new Set()}
  const set=new Set();for(const item of state.listings)for(const variant of item.sizeVariants||[]){const busy=state.rentals.some(row=>blocksDate(row)&&bookingParts(row).some(part=>part.listingId===item.id&&part.variantId===variant.id)&&rentalRangesOverlap(filters.pickupDate,filters.returnDate,row.pickupDate,row.returnDate));if(!busy)set.add(`${item.id}:${variant.id}`)}return set;
}
const note=text=>h('p',{class:'muted'},text);
const field=(text,input)=>h('label',{class:'field'},h('span',{},text),input);
const button=(text,fn,className='secondary',attrs={})=>h('button',{type:'button',class:className,...attrs,onclick:()=>task(fn)},text);
const ICON_PATHS={
  search:['M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z','m15 15 5 5'],
  mannequin:['M12 3.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z','M12 7.2v13.3M5.8 10.7 12 8.3l6.2 2.4M8.8 21 12 15l3.2 6'],
  scanCube:['M7 3H5a2 2 0 0 0-2 2v2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2','m12 7 5 3-5 3-5-3 5-3Z','m7 10 5 3 5-3M7 10v5l5 3 5-3v-5M12 13v5'],
  ruler:['M3 7h18v10H3z','M7 7v4M11 7v2M15 7v4M19 7v2'],
  bag:['M5 8h14v12H5z','M9 8V6a3 3 0 0 1 6 0v2'],
  userPlus:['M15 20.5a6 6 0 0 0-12 0','M9 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z','M18 7v6M15 10h6'],
  arrowRight:['M5 12h14','m14 6 6 6-6 6'],
  arrowLeft:['M19 12H5','m10 18-6-6 6-6'],
  chevronRight:['m9 18 6-6-6-6'],
  chevronLeft:['m15 18-6-6 6-6'],
  dashboard:['M4 4h6v6H4z','M14 4h6v10h-6z','M4 14h6v6H4z','M14 18h6v2h-6z'],
  wardrobe:['M5 3h14v18H5z','M12 3v18','M9 12h.01M15 12h.01'],
  receipt:['M6 3h12v18l-3-2-3 2-3-2-3 2V3Z','M9 8h6M9 12h6'],
  bell:['M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9','M10 21h4'],
  wallet:['M4 6h16v13H4z','M4 9h16','M15 13h3'],
  truck:['M3 6h11v10H3z','M14 10h4l3 3v3h-7z','M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'],
  returnBox:['M4 7h16v13H4z','m4 7 4-4h8l4 4','M9 13h6','m11 10-3 3 3 3'],
  more:['M5 12h.01M12 12h.01M19 12h.01'],
  edit:['M4 20h4L19 9l-4-4L4 16v4Z','m13-13 4 4'],
  filter:['M4 6h16M7 12h10M10 18h4']
};
function uiIcon(name,className='ui-icon'){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class',className);svg.setAttribute('aria-hidden','true');for(const d of ICON_PATHS[name]||[]){const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);svg.append(path)}return svg}

function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3500)}
function task(fn){return Promise.resolve().then(fn).catch(error=>{toast(error?.message||'ทำรายการไม่สำเร็จ');return null})}
function close(){modalRenderer=null;if($('modal').open)$('modal').close();previousFocus?.isConnected&&previousFocus.focus()}
function modal(title,renderer,{wide=false}={}){if(!$('modal').open)previousFocus=document.activeElement;modalRenderer=renderer;$('modalTitle').textContent=title;$('modal').classList.toggle('wide',wide);$('modalBody').replaceChildren(renderer());if(!$('modal').open)$('modal').showModal()}
async function run(action,payload={}){const actorId=me(),result=await repo.dispatch(action,payload,actorId);state=await repo.read();render();if(modalRenderer&&$('modal').open)$('modalBody').replaceChildren(modalRenderer());return result}
function go(hash){close();if(location.hash===hash)render();else location.hash=hash}
function requireUser(){if(me())return true;openAccounts(ctx);return false}
function clearHeroStudio(){heroMount++;heroStudio?.dispose?.();heroStudio=null}
function mountHeroStudio(host,status){
  const mount=++heroMount;
  import('./hero-studio.js').then(({createHeroStudio})=>{
    if(mount!==heroMount||!host.isConnected)return;
    heroStudio=createHeroStudio(host,state,studioCatalog,messages=>{status.textContent=messages.length?messages.join(' · '):'ลากเพื่อหมุนหุ่น 360°'});
  }).catch(error=>{console.error(error);if(mount===heroMount)status.textContent='ไม่สามารถเปิดตัวอย่าง 3D ได้ · เปิด 3D Studio เพื่อโหลดใหม่'});
}
function mountPreviewStudio(host,status,item,variant,body){
  heroStudio?.dispose?.();heroStudio=null;const mount=++heroMount;
  import('./hero-studio.js').then(({createPreviewStudio})=>{
    if(mount!==heroMount||!host.isConnected)return;
    heroStudio=createPreviewStudio(host,state,studioCatalog,{listingId:item.id,variantId:variant.id,body},messages=>{status.textContent=messages.length?messages.join(' · '):'ลากเพื่อหมุน · เลื่อนเพื่อซูม'});
  }).catch(error=>{console.error(error);if(mount===heroMount)status.textContent='ไม่สามารถเปิดพรีวิว 3D ได้'});
}
const ctx={get state(){return state},run,modal,close,toast,task,openCloset:tab=>go(`#closet/${tab==='selling'?'listings':tab||'listings'}`)};
const heading=(eyebrow,title,copy)=>h('div',{class:'page-heading'},h('p',{class:'eyebrow'},eyebrow),h('h1',{},title),copy&&note(copy));
const empty=(title,copy)=>h('div',{class:'empty-state'},h('h2',{},title),note(copy),h('a',{class:'secondary',href:'#shop'},'กลับ Marketplace'));
const dt=n=>new Date(n).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});

function render(){
  if(!state)return;
  const accountName=user(me())?.name||'บัญชีเดโม';$('accountBtn').title=accountName;$('accountBtn').setAttribute('aria-label',`บัญชี ${accountName}`);
  const bagCount=state.rentalBags?.[me()]?.items?.length||0;$('rentalBagBtn').querySelector('span').textContent=`รายการเช่า · ${bagCount}`;
  const [route,id,routeVariant]=location.hash.slice(1).split('/');
  const inStudio=route==='studio';document.body.classList.toggle('studio-active',inStudio);
  document.body.classList.toggle('lender-active',route==='closet');
  clearHeroStudio();
  if(inStudio){if(!mixStudio)mixStudio=createStudioUI({...ctx,get state(){return state},rental:openRental,accounts:()=>openAccounts(ctx)},studioCatalog,studioCatalogError);else mixStudio.update(state);if($('page').firstChild!==mixStudio.element)$('page').replaceChildren(mixStudio.element);const routeKey=id?`${id}/${routeVariant||''}`:'';if(routeKey&&routeKey!==studioRouteApplied){studioRouteApplied=routeKey;task(()=>mixStudio.wearItem(id,routeVariant));}if(!routeKey)studioRouteApplied='';return;}
  studioRouteApplied='';
  const view=route==='shop'?marketplace():route==='product'?productPage(id):route==='tryon'?tryOnPage(id):route==='rentals'?rentalsPage():route==='saved'?savedPage():route==='closet'?closetPage(id||'listings'):route==='rental'?rentalDetailPage(id):homePage();
  $('page').replaceChildren(view);
}

function card(l){
  const saved=state.favorites[me()]?.includes(l.id),variant=l.sizeVariants.find(v=>v.stock&&(!filters.size||v.size===filters.size))||firstVariant(l),fit=fitFor(l,variant);
  return h('article',{class:'product-card'},
    h('a',{class:'product-photo',href:`#product/${l.id}`},h('img',{src:photoUrl(cover(l)),alt:`${l.character} — ${l.title}`}),h('span',{class:'badge'},CONDITIONS[l.condition]),h('span',{class:`fit-chip ${fit?'has-score':'unknown'}`},fit?`${fit.score}% Fit`:'Fit —')),
    button(saved?'♥':'♡',()=>requireUser()&&run('favorite.toggle',{id:l.id}),'save-product',{'aria-label':`บันทึก ${l.title}`}),
    h('div',{class:'product-info'},h('small',{},l.character),h('h3',{},h('a',{href:`#product/${l.id}`},l.title)),h('div',{class:'product-bottom'},h('span',{},l.sizeVariants.filter(v=>v.stock).map(v=>v.size).join(' / ')),h('b',{},`${money(minPrice(l))} / วัน`)),h('div',{class:'card-actions'},l.model?h('a',{class:'secondary',href:`#tryon/${l.id}/${variant.id}`},'⚝ 3D Preview'):h('span',{class:'secondary disabled'},'ไม่มี 3D'),button('เช่า',()=>openRental(l.id,variant.id),'dark',{disabled:l.sellerId===me()}))));
}

function homePage(){
  let active=0;
  const track=h('div',{class:'occasion-track'});
  const draw=()=>{track.style.setProperty('--active',active);track.replaceChildren(...OCCASION_CATEGORIES.map((key,index)=>{const label=OCCASION_LABELS[key];return h('button',{type:'button',class:`occasion-card ${index===active?'active':''}`,style:`--distance:${Math.abs(index-active)}`,onclick:()=>{if(index===active){filters.occasion=key;go('#shop');return}active=index;draw()},'aria-pressed':String(index===active)},h('img',{src:`toosuepha-assets/${key}.jpg`,alt:''}),h('span',{},h('strong',{},label.title),h('small',{},label.subtitle)))}))};
  const heroHost=h('div',{class:'hero-studio-viewport','aria-label':'หุ่นจำลอง 3D หมุนได้'}),heroStatus=h('span',{class:'hero-studio-status'},'กำลังเตรียมหุ่น 3D…');
  const hero=h('section',{class:'home-hero'},
    h('div',{class:'home-hero-copy'},h('h1',{class:'home-hero-title'},h('span',{},'Find what fits.'),h('strong',{},'Rent what you need.')),h('p',{class:'home-hero-description'},h('strong',{},'ตู้เสื้อผ้า'),'สำหรับทุกโอกาส เช็กความพอดีและลองก่อนเช่า'),h('div',{class:'home-hero-actions'},h('a',{class:'hero-button hero-button-light',href:'#shop'},uiIcon('search'),'ค้นหาชุด'),h('a',{class:'hero-button hero-button-dark',href:'#studio'},uiIcon('mannequin'),'ลองชุดของฉัน'))),
    h('div',{class:'studio-hero'},heroHost,h('div',{class:'hero-studio-copy'},heroStatus,h('a',{class:'hero-caption',href:'#studio'},h('b',{},'3D STUDIO'),h('small',{},'เปิดห้องลองชุด',uiIcon('arrowRight','ui-icon inline-arrow')))))
  );
  const previous=h('button',{type:'button',class:'carousel-arrow','aria-label':'หมวดก่อนหน้า',onclick:()=>{active=(active-1+OCCASION_CATEGORIES.length)%OCCASION_CATEGORIES.length;draw()}},uiIcon('chevronLeft'));
  const next=h('button',{type:'button',class:'carousel-arrow','aria-label':'หมวดถัดไป',onclick:()=>{active=(active+1)%OCCASION_CATEGORIES.length;draw()}},uiIcon('chevronRight'));
  const occasion=h('section',{class:'occasion-section'},h('h2',{},'เสื้อผ้าสำหรับทุกโอกาสของคุณ'),note('เลือกดูชุดตามโอกาส พร้อมระบบเทียบสัดส่วนและลองชุดบนหุ่น 3D ก่อนเช่า'),h('div',{class:'occasion-carousel'},previous,track,next));
  const message=h('section',{class:'home-message'},h('p',{},'“ ชุดนี้จะพอดีกับเราไหม? ”'),h('em',{},'รูปสินค้าจริงอย่างเดียวบอกไม่ได้ว่าชุดจะพอดีกับเรา ผู้ใช้จึงต้องคาดเดาจาก Size Chart ก่อนเช่า'),h('span',{class:'home-message-mark'},'TOO',h('br'),'SUEA',h('br'),'PHA'),h('h3',{},'Too Suea Pha ช่วยให้คุณตัดสินใจได้ก่อนเช่า'));
  const stepData=[
    ['01 Discover','บันทึกขนาดรอบอก เอว สะโพกและส่วนสูงของคุณเพียงครั้งเดียว ระบบสร้างโมเดลสัดส่วนอัตโนมัติ','บันทึกขนาดสำหรับทุกชุด','scanCube'],
    ['02 Match & Try','ระบบเทียบสัดส่วนและลองชุดบนหุ่น 3D แบบเรียลไทม์ ตรวจสอบความตึงผ้าและการเคลื่อนไหวรอบ 360°','ตรวจความพอดีรอบตัว 360°','ruler'],
    ['03 Decide','มั่นใจในความพอดีสั่งเช่าพร้อมคุ้มครองเงินมัดจำด้วยระบบ Escrow ได้รับชุดตรงปกตามที่ตรวจสอบ','คุ้มครองตลอดระยะเวลาเช่า','bag']
  ];
  const steps=h('section',{class:'home-steps'},h('header',{},h('h2',{},'จากสัดส่วนสู่ชุดที่เหมาะกับคุณ ช่วยให้ตัดสินใจเช่าได้ง่ายขึ้น'),note('ขั้นตอนเรียบง่ายที่เชื่อมโยงระบบลองชุดเสมือนจริงเข้ากับการเลือกเช่าใน Marketplace')),...stepData.map(([title,copy,link,icon],index)=>h('article',{},uiIcon(icon,'ui-icon step-icon'),h('h3',{},title),note(copy),h('a',{href:index===1?'#studio':'#shop'},link,uiIcon('arrowRight','ui-icon inline-arrow')))));
  const choice=h('section',{class:'home-choice'},h('h2',{},'เลือกชุดที่ใช่ ส่งต่อชุดที่มี'),note('ให้ทุกชุดได้หมุนเวียนใช้งานในโอกาสใหม่'),h('div',{class:'mode-switch home-mode'},h('a',{href:'#shop'},'เช่า'),h('a',{href:'#closet/listings'},'ปล่อยเช่า')),h('div',{class:'choice-copy'},h('p',{},'Find what fits.',h('br'),'Rent what you need.'),h('p',{},'List what you own.',h('br'),"Earn from what you don't wear.")));
  const cta=h('section',{class:'home-studio-cta'},h('div',{},h('h2',{},'พร้อมสร้างหุ่นจำลอง 3D ของคุณแล้วหรือยัง?'),note('สัมผัสประสบการณ์เช่าชุดคอสเพลย์ยุคใหม่ เลิกกังวลเรื่องไซส์ มั่นใจทุกครั้ง'),h('div',{class:'row'},h('a',{class:'dark',href:'#studio'},uiIcon('userPlus'),'สร้างหุ่นของฉันใน 1 นาที (ฟรี)'),h('a',{class:'secondary',href:'#shop'},uiIcon('search'),'ค้นหาชุด'))));
  draw();const root=h('div',{class:'home-page'},hero,occasion,message,steps,choice,cta);
  mountHeroStudio(heroHost,heroStatus);
  return root;
}

function marketplace(){
  const grid=h('div',{class:'product-grid'}),count=h('span',{class:'result-count'});
  const rows=()=>{const fitScores={};for(const item of state.listings){const result=fitFor(item,item.sizeVariants.find(v=>v.stock&&(!filters.size||v.size===filters.size))||firstVariant(item));if(result)fitScores[item.id]=result.score}return filterMarketplaceListings(state.listings,{...filters,fitScores,availableVariantIds:availableVariantIds()})};
  function update(){const list=rows();count.textContent=`${list.length} ชุดที่พร้อมให้เช่า`;grid.replaceChildren(...(list.length?list.map(card):[empty('ยังไม่พบชุดที่ค้นหา','ลองเปลี่ยนคำค้น ไซซ์ ราคา หรือช่วงวันเช่า')]))}
  const select=(key,label,options)=>h('select',{'aria-label':label,onchange:e=>{filters[key]=e.target.value;update()}},...options.map(([v,t])=>h('option',{value:v,selected:filters[key]===v},t)));
  const themeNames={academy:'Academy',fantasy:'Fantasy',gothic:'Gothic'};
  const chips=h('div',{class:'occasion-chips'},...[['','ทั้งหมด'],...OCCASION_CATEGORIES.map(key=>[key,OCCASION_LABELS[key].title])].map(([key,label])=>button(label,()=>{filters.occasion=key;chips.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.key===key)));update()},'',{'data-key':key,'aria-pressed':String(filters.occasion===key)})));
  const filtersPanel=h('aside',{class:'marketplace-filters'},h('h3',{},'ตัวกรอง'),
    h('label',{class:'filter-block'},h('span',{},'01 · ธีม'),select('theme','ธีม',[['','ทุกธีม'],...marketplaceThemes(state.listings).map(x=>[x,themeNames[x]||x])])),
    h('label',{class:'filter-block'},h('span',{},'02 · ชนิด'),select('type','ชนิด',[['','ทั้งหมด'],['top','เสื้อ'],['bottom','กางเกง'],['wig','วิก'],['accessory','เครื่องประดับ']])),
    h('label',{class:'filter-block'},h('span',{},'03 · ไซซ์'),select('size','ไซซ์',[['','ทุกไซซ์'],...['S','M','L','XL'].map(x=>[x,x])])),
    h('label',{class:'filter-block'},h('span',{},'04 · สภาพ'),select('condition','สภาพ',[['','ทุกสภาพ'],...Object.entries(CONDITIONS)])),
    h('label',{class:'filter-block'},h('span',{},'05 · ราคาเช่า/วัน'),h('input',{type:'number',min:0,value:filters.maxPrice,placeholder:'ไม่เกิน ฿',oninput:e=>{filters.maxPrice=e.target.value;update()}})),
    h('label',{class:'filter-block'},h('span',{},'06 · วันรับ'),h('input',{type:'date',min:localDateKey(),value:filters.pickupDate,onchange:e=>{filters.pickupDate=e.target.value;if(filters.returnDate&&filters.returnDate<filters.pickupDate)filters.returnDate=filters.pickupDate;update()}})),
    h('label',{class:'filter-block'},h('span',{},'07 · วันคืน'),h('input',{type:'date',min:filters.pickupDate||localDateKey(),value:filters.returnDate,onchange:e=>{filters.returnDate=e.target.value;update()}})));
  const typeChips=h('div',{class:'type-chips'},h('small',{},'ประเภทเสื้อผ้า:'),...[['','ทั้งหมด'],['top','เสื้อ'],['bottom','กางเกง'],['wig','วิก'],['accessory','เครื่องประดับ']].map(([key,label])=>button(label,()=>{filters.type=key;typeChips.querySelectorAll('button').forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.key===key)));update()},'',{'data-key':key,'aria-pressed':String(filters.type===key)})));
  const fitPreview=h('section',{class:'market-fit-preview'},h('div',{},h('strong',{},'⚝ Preview Try-on'),h('a',{href:'#studio'},'แก้ไข')),h('div',{class:'preview-score'},bodyForFit()?'Fit พร้อม':'—'),note(bodyForFit()?'จัดอันดับด้วยสัดส่วนที่บันทึกไว้':'บันทึกสัดส่วนใน 3D Studio'),h('a',{class:'dark',href:'#studio'},'Virtual Try-on'));
  const root=h('section',{class:'catalog-shell'},h('div',{class:'category-panel'},h('div',{},h('p',{class:'eyebrow'},'หมวดหมู่หลัก (PRIMARY CATEGORIES)'),h('a',{href:'#studio'},'เลือกหมวดจากชุดที่ต้องการ ↗')),chips,typeChips),
    h('div',{class:'marketplace-layout'},h('aside',{class:'marketplace-sidebar'},filtersPanel,fitPreview),h('div',{class:'catalog-main'},h('div',{class:'catalog-topbar'},h('div',{},h('b',{},'ชุดพร้อมเช่า'),count),select('sort','เรียงลำดับ',[['fit','ความพอดีตัวสูงสุด'],['latest','ล่าสุด'],['price','ราคาต่ำก่อน']])),grid,h('p',{class:'asset-note'},'ภาพ ประกาศ ราคา และคะแนน Fit Match เป็นข้อมูลสาธิตสำหรับต้นแบบการเช่า'))));
  update();return root;
}

function gallery(l){
  let chosen=cover(l),zoom=1,x=0,y=0,drag=null;
  const image=h('img',{src:photoUrl(chosen),alt:l.title,draggable:false}),caption=h('div',{class:'gallery-description'});
  const apply=()=>image.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;
  const viewport=h('div',{class:'gallery-main',tabIndex:0,'aria-label':'ภาพสินค้า ใช้บวก ลบ และลูกศรเพื่อซูมและเลื่อน',onkeydown:e=>{if(e.key==='+'||e.key==='=')zoom=Math.min(4,zoom+.25);else if(e.key==='-')zoom=Math.max(1,zoom-.25);else if(e.key==='ArrowLeft')x-=12;else if(e.key==='ArrowRight')x+=12;else if(e.key==='ArrowUp')y-=12;else if(e.key==='ArrowDown')y+=12;else return;e.preventDefault();apply()},onpointerdown:e=>{if(e.target.tagName!=='BUTTON'){drag={x:e.clientX-x,y:e.clientY-y};e.currentTarget.setPointerCapture(e.pointerId)}},onpointermove:e=>{if(drag&&zoom>1){x=e.clientX-drag.x;y=e.clientY-drag.y;apply()}},onpointerup:()=>drag=null},image);
  viewport.append(h('div',{class:'zoom-controls'},button('＋',()=>{zoom=Math.min(4,zoom+.25);apply()},'',{'aria-label':'ขยาย'}),button('−',()=>{zoom=Math.max(1,zoom-.25);apply()},'',{'aria-label':'ย่อ'}),button('1:1',()=>{zoom=1;x=y=0;apply()},'',{'aria-label':'คืนขนาดเดิม'})));
  const thumbs=h('div',{class:'thumbs'});
  const choose=p=>{chosen=p;image.src=photoUrl(p);image.alt=`${l.title} ${labels.photo[p.tag]||p.tag}`;zoom=1;x=y=0;apply();caption.replaceChildren(...l.defects.filter(d=>d.photoId===p.id).map(d=>h('div',{class:'defect-box'},h('b',{},`${labels.defect[d.type]||d.type} · ${labels.severity[d.severity]||d.severity}`),note(d.description))));[...thumbs.children].forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.photo===p.id)))};
  thumbs.append(...l.photos.map(p=>h('button',{class:'thumb','data-photo':p.id,'aria-label':labels.photo[p.tag]||p.tag,onclick:()=>choose(p)},h('img',{src:photoUrl(p),alt:''}),h('span',{class:'badge'},labels.photo[p.tag]||p.tag))));
  choose(chosen);return h('div',{class:'gallery'},viewport,thumbs,caption);
}

function sizePicker(l,chosen,onChange,disableUnavailable=false){return h('div',{class:'size-picker',role:'group','aria-label':'เลือกไซซ์'},...l.sizeVariants.map(v=>button(v.size,()=>onChange(v.id),v.id===chosen?'dark':'secondary',{'aria-pressed':String(v.id===chosen),title:v.stock?'พร้อมให้เช่า':'ไซซ์นี้ยังไม่เปิดให้เช่า',disabled:disableUnavailable&&!v.stock})))}
function dimensions(v){const names={shoulder:'ไหล่',chest:'อก',waist:'เอว',hip:'สะโพก',length:'ยาว'};return h('dl',{class:'measurements'},...Object.entries(names).map(([k,t])=>h('div',{},h('dt',{},t),h('dd',{},v.measurements[k]?`${v.measurements[k]} ซม.`:'ไม่ระบุ'))))}

function productPage(id){
  const l=listing(id);if(!l||l.status==='deleted')return empty('ไม่พบชุดนี้','ประกาศอาจถูกนำออกแล้ว');
  let variant=firstVariant(l);const copy=h('div',{class:'detail-copy'});
  function update(){const fit=fitFor(l,variant),previewHost=h('div',{class:'product-preview-3d'}),previewStatus=h('small',{class:'studio-status'},l.model?'กำลังเปิดพรีวิว 3D…':'สินค้านี้ยังไม่มีโมเดล 3D');
    const fitPanel=h('div',{class:'fit-panel'},fit?h('div',{class:'fit-score'},h('strong',{},`${fit.score}%`),h('div',{},h('h3',{},'Fit Match'),note('คำนวณจากสัดส่วนที่บันทึกและขนาดเสื้อผ้า'))):h('div',{},h('h3',{},'Fit Match —'),note('บันทึกสัดส่วนใน 3D Studio เพื่อคำนวณคะแนนเทียบขนาด')));
    const titleCard=h('section',{class:'product-title-card'},h('div',{class:'product-tags'},h('span',{},String(l.series||'TooSuePha').replace(/CLOSET/gi,'TooSuePha')),h('span',{},l.character)),h('h1',{},l.title),note(`${CONDITIONS[l.condition]} · ผู้ให้เช่า ${user(l.sellerId)?.name||'บัญชีเดโม'}`));
    const rentalPanel=h('section',{class:'product-rental-panel'},h('div',{class:'rental-price-row'},h('span',{},'เช่าชุด'),h('p',{class:'detail-price'},`${money(variant.price)} / วัน`)),h('div',{class:'rental-subhead'},h('b',{},'เลือกไซซ์และขนาดที่วัดจริง'),h('a',{href:'#studio'},'เทียบกับหุ่นของฉัน')),sizePicker(l,variant.id,id=>{variant=l.sizeVariants.find(v=>v.id===id);update()}),dimensions(variant),fitPanel,h('div',{class:'inline-rental-dates'},field('วันรับ',h('input',{type:'date',min:localDateKey(),value:filters.pickupDate,onchange:e=>filters.pickupDate=e.target.value})),field('วันคืน',h('input',{type:'date',min:filters.pickupDate||localDateKey(),value:filters.returnDate,onchange:e=>filters.returnDate=e.target.value}))),h('div',{class:'product-cta'},button('⚝ Try-on 3D',()=>{studio=null;go(`#tryon/${l.id}/${variant.id}`)},'dark',{disabled:!l.model}),button('ยืนยันการเช่า',()=>openRental(l.id,variant.id),'dark',{disabled:l.status!=='active'||!variant.stock||l.sellerId===me()})),!l.model?note('พรีวิว 3D ไม่พร้อมสำหรับสินค้านี้ แต่ยังเลือกไซซ์และเช่าได้'):h('p',{class:'disclaimer'},DISCLAIMER));
    const details=h('section',{class:'product-facts'},h('h3',{},'ของในเซ็ตที่ได้รับ'),h('ul',{},...l.components.map(c=>h('li',{},`✓ ${c}`))),h('h3',{},'รายละเอียดสินค้า'),note(l.description),l.defects.length?h('div',{class:'defect-box'},h('b',{},'รายละเอียดตำหนิ'),...l.defects.map(d=>note(`${labels.severity[d.severity]||d.severity}: ${d.description}`))):null,button(state.favorites[me()]?.includes(l.id)?'♥ บันทึกแล้ว':'♡ บันทึกชุดนี้',()=>requireUser()&&run('favorite.toggle',{id:l.id}),'text-btn'));
    copy.replaceChildren(titleCard,rentalPanel,l.model?h('div',{class:'product-preview-card'},previewHost,previewStatus):document.createDocumentFragment(),details);
    if(l.model)mountPreviewStudio(previewHost,previewStatus,l,variant,bodyForFit()||undefined)}
  update();return h('section',{class:'page-shell'},h('a',{class:'back-link',href:'#shop'},'← Marketplace'),h('div',{class:'detail product-detail'},gallery(l),copy));
}

function bodyEditor(body,onChange){
  const limits={height:[120,220],chest:[50,180],waist:[40,160],hip:[50,190],shoulder:[25,65]},inputs={};
  const root=h('div',{class:'body-editor'},h('div',{class:'preset-buttons'},...Object.keys(PRESETS).map(name=>button(name,()=>{Object.assign(body,structuredClone(PRESETS[name]));for(const [k,v] of Object.entries(inputs))v.value=body[k];onChange()},body.preset===name?'dark':'secondary'))),h('div',{class:'body-grid'}));
  const names={height:'ส่วนสูง',chest:'รอบอก / Bust',waist:'รอบเอว',hip:'รอบสะโพก',shoulder:'ความกว้างไหล่'};
  for(const [key,label] of Object.entries(names)){const input=h('input',{type:'number',min:limits[key][0],max:limits[key][1],value:body[key],oninput:e=>{body[key]=e.target.value===''?null:Number(e.target.value);onChange()}});inputs[key]=input;root.lastChild.append(field(`${label} (ซม.)`,input))}
  return root;
}

function tryOnPage(id){
  const l=listing(id);if(!l||l.status==='deleted')return empty('ไม่พบชุดสำหรับลอง','กลับไปเลือกชุดจาก Marketplace');
  const routeVariant=location.hash.split('/')[2];
  if(!studio||studio.listingId!==id||studio.userId!==me())studio={listingId:id,userId:me(),variantId:l.sizeVariants.some(v=>v.id===routeVariant)?routeVariant:firstVariant(l).id,body:structuredClone(state.mannequins[me()]||PRESETS.Regular),mode:state.mannequins[me()]?'personal':'standard'};
  let variant=l.sizeVariants.find(v=>v.id===studio.variantId)||firstVariant(l);
  const stage=h('div',{class:'mannequin-stage tryon-stage'}),status=h('small',{class:'studio-status'},'กำลังเปิดพรีวิว…'),summary=h('div',{class:'fit-summary','aria-live':'polite'}),picker=h('div'),price=h('b',{class:'tryon-price'}),error=h('p',{class:'form-error',role:'alert'}),rent=button('เพิ่มชิ้นนี้ในรายการเช่า',async()=>{if(!requireUser())return;await run('rentalBag.add',{listingId:l.id,variantId:variant.id});toast('เพิ่มในรายการเช่าแล้ว')},'dark full');
  function update(){const errors=validateBody(studio.body);error.textContent=errors.join(' · ');if(errors.length){rent.disabled=true;return}stage.replaceChildren(status);if(l.model)mountPreviewStudio(stage,status,l,variant,studio.body);else stage.replaceChildren(h('div',{class:'three-d-unavailable'},h('strong',{},'พรีวิว 3D ไม่พร้อมสำหรับสินค้านี้'),note('ไม่มีการแสดงหุ่นหรือเสื้อผ้า 2D แทน คุณยังเลือกไซซ์และเช่าสินค้านี้ได้'),h('a',{class:'secondary',href:'#studio'},'เปิด 3D Studio')));const persisted=bodyForFit(),match=calculateFitMatch(persisted,l,variant);summary.replaceChildren(h('h3',{},match?`Fit Match ${match.score}%`:'Fit Match —'),...calculateFit(studio.body,variant.measurements,l.lengthTarget).map(r=>h('div',{class:'fit-row'},h('span',{},r.label),h('strong',{'data-fit':r.status},r.status.replace('_',' ')),h('small',{},r.explanation))),note(match?'คะแนนมาจากสัดส่วนที่บันทึกและขนาดชุดเท่านั้น':'บันทึกสัดส่วนก่อน จึงจะแสดงเปอร์เซ็นต์ Fit Match'));price.textContent=`${money(variant.price)} / วัน`;rent.disabled=l.status!=='active'||!variant.stock||l.sellerId===me();picker.replaceChildren(sizePicker(l,variant.id,id=>{studio.variantId=id;variant=l.sizeVariants.find(v=>v.id===id);update()}))}
  const mannequinSelect=h('select',{'aria-label':'เลือกหุ่น',onchange:e=>{studio.mode=e.target.value;studio.body=structuredClone(e.target.value==='personal'?state.mannequins[me()]:PRESETS.Regular);render()}},h('option',{value:'standard',selected:studio.mode==='standard'},'Standard Mannequin'),state.mannequins[me()]?h('option',{value:'personal',selected:studio.mode==='personal'},'สัดส่วนที่บันทึกไว้'):null);
  const edit=h('details',{class:'inline-measurements'},h('summary',{},'แก้ไขสัดส่วนเพื่อเปรียบเทียบ'),bodyEditor(studio.body,update),button('บันทึกสัดส่วนนี้',async()=>{if(!requireUser())return;const errors=validateBody(studio.body);if(errors.length){error.textContent=errors.join(' · ');return}await run('mannequin.save',{body:studio.body});studio.mode='personal';render();toast('บันทึกสัดส่วนแล้ว')},'secondary full'));
  update();
  const bagRows=(state.rentalBags?.[me()]?.items||[]).map(row=>{const item=listing(row.listingId),size=item?.sizeVariants.find(v=>v.id===row.variantId);return item&&size?{item,size}:null}).filter(Boolean),bagTotal=bagRows.reduce((sum,row)=>sum+row.size.price,0);
  const bag=h('div',{class:'tryon-bag'},h('h3',{},`รายการเช่า · ${bagRows.length}`),h('div',{class:'tryon-bag-list'},...(bagRows.length?bagRows.map(({item,size})=>h('div',{class:'tryon-bag-item'},h('img',{src:photoUrl(cover(item)),alt:''}),h('span',{},h('b',{},item.title),h('small',{},`ไซซ์ ${size.size} · ${money(size.price)} / วัน`)))):[note('ยังไม่มีชิ้นในรายการ')])),h('div',{class:'tryon-total'},h('span',{},'รวมต่อวัน'),h('b',{},money(bagTotal))),bagRows.length?button('เลือกวันและเช่า',()=>openRentalBag(),'secondary full'):null);
  return h('section',{class:'page-shell studio-shell'},h('a',{class:'back-link',href:`#product/${l.id}`},'Main page › Virtual Try-On'),h('div',{class:'tryon-heading'},heading('VIRTUAL TRY-ON','Virtual Try-On ห้องลองชุดเสมือนจริง','ลองชุดบนหุ่น 3D เพื่อช่วยตัดสินใจก่อนเช่า'),h('a',{class:'secondary',href:'#studio'},'หุ่นปัจจุบัน · แก้ไข')),h('div',{class:'tryon-layout'},h('aside',{class:'studio-controls'},summary,h('h3',{},'เลือกขนาดไซซ์'),picker,h('h3',{},'เลือกหุ่น'),mannequinSelect,!state.mannequins[me()]?h('a',{class:'text-btn',href:'#studio'},'ตั้งสัดส่วนใน 3D Studio →'):null,edit,error,h('h3',{},'เลือกชุดที่ลอง'),h('select',{'aria-label':'เปลี่ยนชุด',onchange:e=>{studio=null;go(`#tryon/${e.target.value}`)}},...state.listings.filter(live).map(x=>h('option',{value:x.id,selected:x.id===l.id},`${x.character} — ${x.title}`)))),stage,h('aside',{class:'studio-results'},h('h2',{},'เช่าชุด'),h('article',{class:'tryon-current-item'},h('img',{src:photoUrl(cover(l)),alt:''}),h('div',{},h('b',{},l.title),note(`ไซซ์ ${variant.size}`),price)),rent,bag,h('p',{class:'disclaimer'},DISCLAIMER))));
}

function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function rentalDate(value){const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12).toLocaleDateString('th-TH',{dateStyle:'medium'})}
function openRental(listingId,variantId){
  if(!requireUser())return;
  task(async()=>{await run('rentalBag.add',{listingId,variantId});if(filters.pickupDate&&filters.returnDate)await run('rentalBag.dates',{pickupDate:filters.pickupDate,returnDate:filters.returnDate});toast('เพิ่มในรายการเช่าแล้ว');openRentalBag()});
}
function openRentalBag(){
  if(!requireUser())return;const actor=me(),bag=state.rentalBags?.[actor]||{items:[],pickupDate:'',returnDate:''};
  let pickupDate=bag.pickupDate||localDateKey(),returnDate=bag.returnDate||pickupDate,error='';
  const build=()=>{
    const rows=(state.rentalBags?.[actor]?.items||[]).map(row=>{const item=listing(row.listingId),variant=item?.sizeVariants.find(v=>v.id===row.variantId);return item&&variant?{item,variant}:null}).filter(Boolean);
    let days=0;try{days=rentalDays(pickupDate,returnDate)}catch(cause){error=cause.message}
    const total=rows.reduce((sum,row)=>sum+row.variant.price*days,0);
    return h('div',{class:'rental-bag stack'},rows.length?h('div',{class:'rental-bag-items'},...rows.map(({item,variant})=>h('article',{class:'rental-bag-item'},h('img',{src:photoUrl(cover(item)),alt:item.title}),h('div',{},h('b',{},item.title),note(`ไซซ์ ${variant.size} · ${money(variant.price)} / วัน · ${user(item.sellerId)?.name||'ผู้ให้เช่า'}`)),button('นำออก',()=>run('rentalBag.remove',{listingId:item.id,variantId:variant.id}),'text-btn')))):empty('รายการเช่ายังว่าง','เลือกชุดและไซซ์จาก Marketplace หรือ 3D Studio'),
      rows.length?h('div',{class:'rental-dates'},field('วันรับชุด',h('input',{type:'date',min:localDateKey(),value:pickupDate,onchange:e=>{pickupDate=e.target.value;if(returnDate<pickupDate)returnDate=pickupDate;error='';$('modalBody').replaceChildren(build())}})),field('วันคืนชุด',h('input',{type:'date',min:pickupDate,value:returnDate,onchange:e=>{returnDate=e.target.value;error='';$('modalBody').replaceChildren(build())}}))):null,
      rows.length?h('div',{class:'rental-total'},h('div',{},note(`${rows.length} ชิ้น · ${days} วัน · แยก Booking ตามผู้ให้เช่า`),h('strong',{},money(total))),h('span',{class:'payment-pill'},'Mock Payment')):null,
      rows.length?note('ระบบตรวจทุกชิ้นพร้อมกันและจองทันทีเมื่อว่าง ค่าเช่าถูกพักไว้ใน Escrow จำลอง'):null,error&&h('p',{class:'form-error',role:'alert'},error),
      rows.length?button('ชำระจำลองและยืนยันเช่า',async()=>{try{if(actor!==me())throw Error('บัญชีเปลี่ยนแล้ว กรุณาเปิดรายการเช่าใหม่');await run('rentalBag.dates',{pickupDate,returnDate});const result=await run('rental.checkout');close();go('#rentals');toast(`สร้าง ${result.bookingIds.length} Booking แล้ว`)}catch(cause){error=cause.message;$('modalBody').replaceChildren(build())}},'dark full',{disabled:!days}):null);
  };
  modal('รายการเช่าและวันใช้งาน',build,{wide:true});
}
const RENTAL_STATUS={pending:'รอยืนยัน (ข้อมูลเดิม)',confirmed:'ยืนยันแล้ว (ข้อมูลเดิม)',paid:'ชำระจำลองแล้ว',preparing:'ร้านกำลังเตรียมชุด',outbound_shipped:'ร้านส่งชุดแล้ว',outbound_transit:'กำลังจัดส่งถึงคุณ',renting:'กำลังเช่า',return_preparing:'เตรียมคืน',return_shipped:'กำลังส่งคืน',return_received:'ร้านได้รับคืน',inspection:'รอตรวจสภาพอีกครั้ง',cleaning:'กำลังทำความสะอาด',completed:'เสร็จสิ้น',cancelled:'ยกเลิกแล้ว'};
function trackingDialog(booking,direction){
  let carrier='Demo Express',trackingNumber=`${direction==='outbound'?'OUT':'RET'}-${booking.id.slice(-6).toUpperCase()}`,error='';const action=direction==='outbound'?'rental.shipOutbound':'rental.shipReturn';
  const build=()=>h('div',{class:'stack'},note(direction==='outbound'?'บันทึกเลขติดตามขาไป':'บันทึกเลขติดตามขากลับ'),field('ผู้ขนส่ง',h('input',{value:carrier,oninput:e=>carrier=e.target.value})),field('Tracking number',h('input',{value:trackingNumber,oninput:e=>trackingNumber=e.target.value})),error&&h('p',{class:'form-error'},error),button('บันทึกและส่งชุด',async()=>{try{await run(action,{id:booking.id,carrier,trackingNumber});close();toast('บันทึก Tracking แล้ว')}catch(cause){error=cause.message;$('modalBody').replaceChildren(build())}},'dark'));
  modal('ข้อมูลการจัดส่ง',build);
}
function inspectionDialog(booking){let noteText='',passed=true,error='';const build=()=>h('div',{class:'stack'},field('ผลตรวจสภาพ',h('select',{onchange:e=>passed=e.target.value==='pass'},h('option',{value:'pass'},'ผ่าน — ปล่อยรายได้'),h('option',{value:'review'},'ต้องตรวจซ้ำ'))),field('หมายเหตุ',h('textarea',{value:noteText,oninput:e=>noteText=e.target.value})),error&&h('p',{class:'form-error'},error),button('บันทึกผลตรวจ',async()=>{try{await run('rental.inspect',{id:booking.id,passed,note:noteText});close();toast(passed?'ปล่อยรายได้เข้า Available Earnings แล้ว':'บันทึกให้ตรวจสภาพซ้ำแล้ว')}catch(cause){error=cause.message;$('modalBody').replaceChildren(build())}},'dark'));modal('ตรวจสภาพชุดคืน',build)}
function rentalLine(booking,{sellerView=false}={}){
  const actions=h('div',{class:'rental-actions'},h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status));
  if(sellerView&&booking.status==='pending')actions.append(button('ยืนยันข้อมูลเดิม',()=>run('rental.confirm',{id:booking.id}),'dark'));
  if(sellerView&&booking.status==='confirmed')actions.append(button('ปิดข้อมูลเดิม',()=>run('rental.complete',{id:booking.id}),'dark'));
  if(sellerView&&booking.status==='paid')actions.append(button('เริ่มเตรียมชุด',()=>run('rental.prepare',{id:booking.id}),'dark'));
  if(sellerView&&booking.status==='preparing')actions.append(button('ส่งชุด',()=>trackingDialog(booking,'outbound'),'dark'));
  if(sellerView&&booking.status==='outbound_shipped')actions.append(button('จำลองกำลังจัดส่ง',()=>run('rental.transitOutbound',{id:booking.id}),'secondary'));
  if(sellerView&&booking.status==='return_shipped')actions.append(button('ยืนยันได้รับชุดคืน',()=>run('rental.receiveReturn',{id:booking.id}),'dark'));
  if(sellerView&&['return_received','inspection'].includes(booking.status))actions.append(button('ตรวจสภาพ',()=>inspectionDialog(booking),'dark'));
  if(sellerView&&booking.status==='cleaning')actions.append(button('ทำความสะอาดเสร็จ',()=>run('rental.completeCleaning',{id:booking.id}),'dark'));
  if(!sellerView&&booking.status==='paid')actions.append(button('ยกเลิกและคืนเงินจำลอง',()=>run('rental.cancel',{id:booking.id}),'text-btn'));
  if(!sellerView&&booking.status==='outbound_transit')actions.append(button('ยืนยันว่าได้รับชุด',()=>run('rental.receive',{id:booking.id}),'dark'));
  if(!sellerView&&booking.status==='renting')actions.append(button('เริ่มเตรียมคืน',()=>run('rental.prepareReturn',{id:booking.id}),'dark'));
  if(!sellerView&&booking.status==='return_preparing')actions.append(button('ส่งชุดคืน',()=>trackingDialog(booking,'return'),'dark'));
  const items=booking.items||[{size:booking.size,dailyPrice:booking.dailyPrice,lineTotal:booking.totalPrice,listingSnapshot:booking.listingSnapshot}],first=items[0],snapshot=first.listingSnapshot;
  return h('article',{class:'cosplay-order rental-card'},h('img',{src:photoUrl(snapshot.image),alt:snapshot.title}),h('div',{class:'rental-card-copy'},h('small',{},`#${booking.id.slice(-8)} · ${dt(booking.createdAt)}`),h('h3',{},items.map(row=>`${row.listingSnapshot.character} — ${row.listingSnapshot.title}`).join(' + ')),note(items.map(row=>`ไซซ์ ${row.size} · ${money(row.dailyPrice)} / วัน`).join(' · ')),note(`${rentalDate(booking.pickupDate)} ถึง ${rentalDate(booking.returnDate)} · ${booking.rentalDays} วัน · รวม ${money(booking.totalPrice)}`),booking.tracking?.outbound?note(`ขาไป ${booking.tracking.outbound.carrier} · ${booking.tracking.outbound.trackingNumber}`):null,booking.tracking?.return?note(`ขากลับ ${booking.tracking.return.carrier} · ${booking.tracking.return.trackingNumber}`):null),actions);
}
const rentalItems=booking=>booking.items||[{size:booking.size,dailyPrice:booking.dailyPrice,lineTotal:booking.totalPrice,listingSnapshot:booking.listingSnapshot}];
function runRenterAction(booking,descriptor){if(!descriptor)return;if(descriptor.tracking)return trackingDialog(booking,descriptor.tracking);return run(descriptor.action,{id:booking.id})}
function rentalOverviewCard(booking){
  const items=rentalItems(booking),first=items[0],snapshot=first.listingSnapshot||{},action=renterNextAction(booking,me()),urgency=rentalUrgency(booking);
  return h('article',{class:`rental-overview-card phase-${rentalPhase(booking)}`},
    h('img',{src:photoUrl(snapshot.image),alt:snapshot.title||'ชุดเช่า'}),
    h('div',{class:'rental-overview-copy'},h('div',{class:'rental-card-top'},h('small',{},`BOOKING #${booking.id.slice(-8)}`),h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status)),h('h3',{},items.map(row=>row.listingSnapshot?.title||'ชุดเช่า').join(' + ')),h('div',{class:'rental-date-band'},h('span',{},'วันรับ',h('b',{},rentalDate(booking.pickupDate))),h('span',{},'วันคืน',h('b',{},rentalDate(booking.returnDate))),h('span',{},`${booking.rentalDays} วัน`,h('b',{},money(booking.totalPrice)))),h('p',{class:`rental-urgency ${urgency.key}`},urgency.label)),
    h('div',{class:'rental-overview-actions'},action?button(action.label,()=>runRenterAction(booking,action),action.kind==='primary'?'dark':'secondary'):note('ยังไม่มีสิ่งที่ต้องทำ'),h('a',{class:'secondary',href:`#rental/${booking.id}`},'ดูรายละเอียด')));
}
function timelineBlock(title,rows){return h('section',{class:'rental-timeline'},h('h3',{},title),h('ol',{},...rows.map(row=>h('li',{class:row.state,'aria-current':row.state==='current'?'step':null},h('span',{},row.state==='done'?'✓':row.state==='current'?'●':'○'),h('b',{},row.label)))))}
function rentalDetailPage(id){
  const booking=state.rentals.find(row=>row.id===id&&row.renterId===me());if(!booking)return h('section',{class:'page-shell'},empty('ไม่พบ Booking','เลือกบัญชีผู้เช่าที่สร้างรายการนี้'));
  const items=rentalItems(booking),timeline=rentalTimeline(booking),action=renterNextAction(booking,me()),fit=rentalFitSummary(booking,bodyForFit());
  const itemCard=h('section',{class:'rental-detail-card'},h('div',{class:'rental-card-top'},h('h2',{},'รายการที่เช่า'),h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status)),...items.map(row=>h('article',{class:'rental-detail-item'},h('img',{src:photoUrl(row.listingSnapshot?.image),alt:row.listingSnapshot?.title||''}),h('div',{},h('b',{},row.listingSnapshot?.title||'ชุดเช่า'),note(`ไซซ์ ${row.size} · ${money(row.dailyPrice)} / วัน`)),h('strong',{},money(row.lineTotal||booking.totalPrice)))));
  const trackingCard=h('section',{class:'rental-detail-card'},h('h2',{},'Tracking'),h('div',{class:'tracking-grid'},h('div',{},h('small',{},'ขาไป'),h('b',{},booking.tracking?.outbound?.trackingNumber||'ยังไม่มีเลขติดตาม'),note(booking.tracking?.outbound?.carrier||'รอร้านส่งชุด')),h('div',{},h('small',{},'ขากลับ'),h('b',{},booking.tracking?.return?.trackingNumber||'ยังไม่มีเลขติดตาม'),note(booking.tracking?.return?.carrier||'ยังไม่เริ่มส่งคืน'))));
  const summaryCard=h('section',{class:'rental-detail-card'},h('h2',{},'สรุปการเช่า'),h('dl',{class:'rental-summary-list'},h('div',{},h('dt',{},'วันรับ'),h('dd',{},rentalDate(booking.pickupDate))),h('div',{},h('dt',{},'วันคืน'),h('dd',{},rentalDate(booking.returnDate))),h('div',{},h('dt',{},'ระยะเวลา'),h('dd',{},`${booking.rentalDays} วัน`)),h('div',{},h('dt',{},'ยอดรวม'),h('dd',{},money(booking.totalPrice)))),h('div',{class:'mock-state-row'},h('span',{class:'payment-pill'},`Mock Payment · ${booking.paymentStatus||'ข้อมูลเดิม'}`),h('span',{class:'payment-pill'},`Mock Escrow · ${booking.escrowStatus||'ข้อมูลเดิม'}`)),action?button(action.label,()=>runRenterAction(booking,action),action.kind==='primary'?'dark full':'secondary full'):note('ยังไม่มีสิ่งที่ต้องทำตอนนี้'));
  const fitCard=h('section',{class:'rental-detail-card'},h('h2',{},'Fit Match'),fit?h('div',{class:'rental-fit-detail'},h('strong',{},`${fit.score}%`),h('div',{},...fit.items.map(row=>note(`${row.title} · ไซซ์ ${row.size} · ${row.score}%`)))):note('ยังประเมินไม่ได้ — ต้องมีสัดส่วนหุ่นและขนาดชุดครบ'),h('p',{class:'disclaimer'},'Fit Match เป็นคะแนนเทียบขนาดเดโม ไม่รับประกันความพอดีจริง'));
  return h('section',{class:'page-shell rental-detail-page'},h('a',{class:'back-link',href:'#rentals'},'← My Rentals'),heading('RENTAL DETAIL',`Booking #${booking.id.slice(-8)}`,'ข้อมูลรับชุด ใช้งาน และคืนชุดอยู่ในหน้าเดียว'),h('div',{class:'rental-detail-grid'},h('div',{class:'rental-detail-main'},itemCard,h('div',{class:'rental-timeline-grid'},timelineBlock('ขั้นตอนรับชุด',timeline.receive),timelineBlock('ขั้นตอนคืนชุด',timeline.return)),trackingCard),h('aside',{class:'rental-detail-side'},summaryCard,fitCard)));
}

function rentalsPage(){
  if(!me())return h('section',{class:'page-shell'},heading('MY RENTALS','รายการเช่าของคุณ','ติดตามวันเช่า ราคา และสถานะคำขอ'),button('เลือกบัญชีเดโม',()=>openAccounts(ctx),'dark'));
  const rows=state.rentals.filter(row=>row.renterId===me()).sort((a,b)=>b.createdAt-a.createdAt),active=rows.filter(row=>!['completed','cancelled'].includes(row.status)),history=rows.filter(row=>['completed','cancelled'].includes(row.status));
  return h('section',{class:'page-shell rentals-page'},heading('MY RENTALS','รายการเช่าของคุณ','ดูสถานะ วันรับ–คืน และสิ่งที่ต้องทำต่อในทันที'),rows.length?h('div',{class:'rental-sections'},active.length?h('section',{},h('div',{class:'rental-section-head'},h('h2',{},'กำลังเช่าและต้องดำเนินการ'),h('span',{},`${active.length} Booking`)),h('div',{class:'rental-overview-list'},...active.map(rentalOverviewCard))):null,history.length?h('section',{},h('div',{class:'rental-section-head'},h('h2',{},'ประวัติการเช่า'),h('span',{},`${history.length} Booking`)),h('div',{class:'rental-overview-list history'},...history.map(rentalOverviewCard))):null):empty('ยังไม่มีรายการเช่า','เลือกหลายชุดจาก Marketplace แล้วชำระจำลองพร้อมกัน'));
}

function savedPage(){
  if(!me())return h('section',{class:'page-shell'},heading('SAVED','ชุดที่คุณบันทึกไว้'),button('เลือกบัญชีเดโม',()=>openAccounts(ctx),'dark'));
  const rows=state.listings.filter(l=>state.favorites[me()]?.includes(l.id)&&l.status!=='deleted');
  return h('section',{class:'page-shell'},heading('SAVED','ชุดที่คุณบันทึกไว้','กลับมาดูชุดที่สนใจและเช่าเมื่อพร้อม'),h('div',{class:'product-grid'},...(rows.length?rows.map(card):[empty('ยังไม่มีชุดที่บันทึก','กดหัวใจที่ชุดใน Marketplace เพื่อเก็บไว้ที่นี่')])));
}

function runLenderAction(booking,descriptor){if(!descriptor)return;if(descriptor.tracking)return trackingDialog(booking,descriptor.tracking);if(descriptor.action==='rental.inspect')return inspectionDialog(booking);return run(descriptor.action,{id:booking.id})}
function lenderBookingCard(booking){
  const items=rentalItems(booking),first=items[0],snapshot=first.listingSnapshot||{},action=lenderNextAction(booking,me()),renter=user(booking.renterId);
  return h('article',{class:'lender-booking-card'},h('img',{src:photoUrl(snapshot.image),alt:snapshot.title||'ชุดเช่า'}),h('div',{class:'lender-booking-copy'},h('div',{class:'rental-card-top'},h('small',{},`BOOKING #${booking.id.slice(-8)}`),h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status)),h('h3',{},items.map(row=>row.listingSnapshot?.title||'ชุดเช่า').join(' + ')),note(`${renter?.name||'ผู้เช่า'} · ${rentalDate(booking.pickupDate)}–${rentalDate(booking.returnDate)}`),h('div',{class:'lender-booking-meta'},h('span',{},'ค่าเช่า',h('b',{},money(booking.totalPrice))),h('span',{},'Payment',h('b',{},booking.paymentStatus||'ข้อมูลเดิม')),h('span',{},'Escrow',h('b',{},booking.escrowStatus||'ข้อมูลเดิม'))),booking.tracking?.outbound?note(`ขาไป · ${booking.tracking.outbound.carrier} ${booking.tracking.outbound.trackingNumber}`):null,booking.tracking?.return?note(`ขากลับ · ${booking.tracking.return.carrier} ${booking.tracking.return.trackingNumber}`):null),h('div',{class:'lender-booking-action'},action?button(action.label,()=>runLenderAction(booking,action),action.kind==='primary'?'dark':'secondary'):h('span',{class:'lender-action-done'},'ไม่มีสิ่งที่ต้องทำตอนนี้')));
}
function lenderListingCard(item){
  const schedule=listingRentalSchedule(state,me(),item.id),next=schedule.find(row=>row.status!=='completed');
  return h('article',{class:'lender-listing-card'},h('img',{src:photoUrl(cover(item)),alt:item.title}),h('div',{class:'lender-listing-copy'},h('div',{class:'rental-card-top'},h('small',{},item.character),h('span',{class:`listing-state ${item.status}`},item.status==='paused'?'พักการให้เช่า':'กำลังแสดง')),h('h3',{},item.title),h('div',{class:'variant-pills'},...item.sizeVariants.map(variant=>h('span',{class:variant.stock?'available':'unavailable'},`${variant.size} · ${variant.stock?'พร้อม':'ไม่ว่าง'}`))),next?h('p',{class:'listing-next-rental'},`คิวถัดไป · ไซซ์ ${next.size||'—'} · ${rentalDate(next.pickupDate)}–${rentalDate(next.returnDate)}`):note('ยังไม่มีคิวเช่าที่กำลังดำเนินการ')),h('div',{class:'lender-listing-actions'},button('แก้ไข',()=>openCosplayListing(ctx,item.id),'secondary'),button(item.status==='paused'?'เปิดให้เช่า':'พักให้เช่า',()=>run('listing.status',{id:item.id,status:item.status==='paused'?'active':'paused'}),'text-btn'),button('ลบ',()=>modal('นำประกาศออก',()=>h('div',{class:'stack'},note(`นำ ${item.title} ออกจาก Marketplace? ประวัติการเช่ายังอยู่`),button('ยืนยันนำออก',async()=>{await run('listing.status',{id:item.id,status:'deleted'});close()},'dark'))),'text-btn')));
}
const LEDGER_LABELS={escrow_hold:'พักค่าเช่าใน Escrow',escrow_release:'รายได้พร้อมถอน (จำลอง)',refund:'คืนเงินให้ผู้เช่า'};
function lenderLedger(){const rows=lenderLedgerRows(state,me());return h('section',{class:'lender-ledger'},h('div',{class:'lender-section-head'},h('div',{},h('p',{class:'eyebrow'},'MOCK BALANCE'),h('h2',{},'รายการรายได้')),h('span',{},`${rows.length} รายการ`)),rows.length?h('div',{class:'lender-ledger-list'},...rows.slice(0,8).map(row=>h('div',{},h('span',{},h('b',{},LEDGER_LABELS[row.type]||row.type),h('small',{},`Booking #${row.bookingId.slice(-8)} · ${dt(row.at)}`)),h('strong',{class:row.type==='refund'?'negative':''},`${row.type==='refund'?'-':'+'}${money(row.amount)}`)))):note('ยังไม่มีรายการรายได้'))}

function closetPage(tab){
  if(!me())return h('section',{class:'page-shell'},heading('MY CLOSET','พื้นที่ของคุณ'),button('เลือกบัญชีเดโม',()=>openAccounts(ctx),'dark'));
  const active=['overview','listings','requests','returns'].includes(tab)?tab:'listings';
  const own=state.listings.filter(item=>item.sellerId===me()&&item.status!=='deleted');
  const bookings=state.rentals.filter(row=>row.sellerId===me()).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const summary=lenderSummary(state,me());
  const shellHeader=h('header',{class:'partner-header'},
    h('a',{class:'partner-brand',href:'#home'},h('strong',{},'TooSuePha'),h('span',{},'PARTNER')),
    h('div',{class:'partner-mode'},h('a',{href:'#shop'},'เช่า'),h('a',{href:'#closet/overview',class:'active'},'ปล่อยเช่า')),
    h('form',{class:'partner-search',onsubmit:event=>{event.preventDefault();filters.q=event.currentTarget.querySelector('input').value.trim();go('#shop')}},uiIcon('search'),h('input',{type:'search',placeholder:'ค้นหาชุด คำสั่งเช่า หรือรหัสสินค้า','aria-label':'ค้นหา'})),
    h('div',{class:'partner-actions'},h('button',{type:'button',class:'partner-icon','aria-label':'การแจ้งเตือน'},uiIcon('bell')),h('button',{type:'button',class:'partner-profile',onclick:()=>openAccounts(ctx)},h('span',{},(user(me()).name||'T').slice(0,1)),h('b',{},user(me()).name),h('small',{},'Partner')))
  );
  const navItem=(key,label,icon,count)=>h('a',{href:`#closet/${key}`,class:(active===key||(key==='requests'&&active==='returns'))?'active':'','aria-current':active===key?'page':null},uiIcon(icon),h('span',{},label),count!=null?h('b',{},count):null);
  const sidebar=h('aside',{class:'partner-sidebar'},h('p',{},'เมนูหลักผู้ปล่อยเช่า'),navItem('overview','ภาพรวม','dashboard'),navItem('listings','คลังชุด','wardrobe',own.length),navItem('requests','การเช่า','receipt',bookings.length),h('div',{class:'partner-sidebar-help'},h('strong',{},'ต้องการความช่วยเหลือ?'),h('span',{},'คู่มือสำหรับผู้ปล่อยเช่า'),h('a',{href:'#home'},'ศูนย์ช่วยเหลือ →')));
  const content=active==='overview'?lenderOverviewView(own,bookings,summary):active==='listings'?lenderClosetView(own):lenderOrdersView(bookings,active==='returns');
  return h('section',{class:'lender-portal'},shellHeader,h('div',{class:'partner-body'},sidebar,h('main',{class:'partner-main'},content)));
}

function partnerPageHead(title,copy,action=true){
  return h('div',{class:'partner-page-head'},h('div',{},h('div',{class:'partner-title-row'},h('h1',{},title),h('span',{class:'partner-status'},'สถานะบัญชี · ปกติ')),copy&&h('p',{},copy)),action?button('+ ลงชุดให้เช่า',()=>openCosplayListing(ctx),'partner-primary'):null);
}

function lenderOverviewView(own,bookings,summary){
  const popular=[...own].sort((a,b)=>listingRentalSchedule(state,me(),b.id).length-listingRentalSchedule(state,me(),a.id).length).slice(0,3);
  const taskCount=bookings.filter(row=>lenderNextAction(row,me())).length;
  return h('div',{class:'partner-view overview-view'},
    partnerPageHead('ภาพรวม',`ยินดีต้อนรับกลับ ${user(me()).name}`,false),
    h('div',{class:'partner-overview-grid'},
      h('div',{class:'partner-overview-left'},
        h('article',{class:'consignment-card'},h('div',{},h('span',{class:'partner-kicker'},'CONSIGNMENT CARE'),h('h2',{},'ส่งชุดเข้าคลังกลาง'),h('p',{},'ให้ทีม TooSuePha ดูแลตั้งแต่ตรวจสภาพ จัดเก็บ ไปจนถึงจัดส่ง')),h('ol',{},h('li',{},h('b',{},'01'),'ส่งชุดเข้าคลัง'),h('li',{},h('b',{},'02'),'ตรวจและดูแล'),h('li',{},h('b',{},'03'),'พร้อมให้เช่า')),button('ส่งชุดเข้าคลัง',()=>openCosplayListing(ctx),'partner-light')),
        h('section',{class:'popular-list'},h('div',{class:'partner-section-title'},h('div',{},h('h2',{},'ชุดยอดนิยมที่มีความต้องการเช่าสูง'),h('p',{},'ดูความเคลื่อนไหวของชุดในคลังคุณ')),h('a',{href:'#closet/listings'},'ดูทั้งหมด →')),...(popular.length?popular.map((item,index)=>h('article',{},h('span',{class:'popular-rank'},String(index+1).padStart(2,'0')),h('img',{src:photoUrl(cover(item)),alt:''}),h('div',{},h('b',{},item.title),h('small',{},`${item.character} · ${item.sizeVariants.map(v=>v.size).join(', ')}`)),h('strong',{},`${listingRentalSchedule(state,me(),item.id).length} การจอง`))):[note('ยังไม่มีชุดในคลัง')]))
      ),
      h('aside',{class:'partner-overview-right'},
        h('article',{class:'seller-center-card'},h('span',{class:'partner-kicker'},'SELLER CENTER'),h('h2',{},'จัดการร้านของคุณ'),h('p',{},taskCount?`มี ${taskCount} รายการที่รอดำเนินการ`:'วันนี้ไม่มีรายการที่ต้องดำเนินการ'),h('div',{class:'seller-center-stats'},h('span',{},h('small',{},'ชุดที่เปิดให้เช่า'),h('b',{},summary.activeListings)),h('span',{},h('small',{},'กำลังถูกเช่า'),h('b',{},summary.currentlyRented))),button('+ ลงชุดให้เช่า',()=>openCosplayListing(ctx),'partner-primary'),h('a',{href:'#closet/requests'},'ดูคำสั่งเช่าทั้งหมด →')),
        h('article',{class:'partner-tier-card'},h('div',{class:'tier-label'},h('span',{},'TIER 1'),h('b',{},'Master Wardrobe Partner')),h('h3',{},'ยอดเงินของคุณ'),h('div',{class:'tier-balance'},h('span',{},'พร้อมถอน (จำลอง)'),h('strong',{},money(summary.earnings.available))),h('dl',{},h('div',{},h('dt',{},'พักใน Escrow'),h('dd',{},money(summary.earnings.pending))),h('div',{},h('dt',{},'งานที่ต้องทำ'),h('dd',{},summary.actionRequired)),h('div',{},h('dt',{},'ค่าธรรมเนียมแพลตฟอร์ม'),h('dd',{},'15%'))),h('p',{},'Damage Shield · คุ้มครองข้อมูลการคืนและตรวจสภาพ'))
      )
    )
  );
}

function lenderClosetView(own){
  const body=own.length?own.map(item=>{const variants=item.sizeVariants||[],available=variants.filter(v=>v.stock>0),daily=minPrice(item),receive=Math.round(daily*.85);return h('tr',{},h('td',{},h('div',{class:'partner-product-cell'},h('img',{src:photoUrl(cover(item)),alt:''}),h('span',{},h('b',{},item.title),h('small',{},`${item.character} · SKU ${item.id.slice(-8).toUpperCase()}`)))),h('td',{},h('b',{},variants.map(v=>v.size).join(' / ')),h('small',{},CONDITIONS[item.condition]||item.condition)),h('td',{},h('b',{},`${money(daily)} / วัน`),h('small',{},`${available.length}/${variants.length} ไซซ์พร้อมเช่า`)),h('td',{},h('b',{},money(receive)),h('small',{},'หลังหักค่าธรรมเนียม 15%')),h('td',{},h('span',{class:`partner-pill ${item.status}`},item.status==='paused'?'พักให้เช่า':'พร้อมให้เช่า')),h('td',{},h('div',{class:'partner-table-actions'},button('จัดการ',()=>openCosplayListing(ctx,item.id),'partner-outline'),h('button',{type:'button',class:'partner-square','aria-label':`แก้ไข ${item.title}`,onclick:()=>openCosplayListing(ctx,item.id)},uiIcon('edit')))))}):[h('tr',{},h('td',{colspan:'6',class:'partner-empty'},'ยังไม่มีชุดในคลัง กด “+ ลงชุดให้เช่า” เพื่อเริ่มต้น'))];
  return h('div',{class:'partner-view closet-table-view'},partnerPageHead('ตู้เสื้อผ้า (My Closet)','จัดการชุด ราคา ไซซ์ และสถานะที่เปิดให้เช่า'),h('div',{class:'partner-table-tools'},h('div',{},h('button',{type:'button',class:'active'},`ชุดทั้งหมด ${own.length}`),h('button',{type:'button'},`พร้อมให้เช่า ${own.filter(x=>x.status==='active').length}`),h('button',{type:'button'},`พักให้เช่า ${own.filter(x=>x.status==='paused').length}`)),h('label',{},uiIcon('search'),h('input',{type:'search',placeholder:'ค้นหาชุดหรือ SKU','aria-label':'ค้นหาชุดในคลัง'}))),h('div',{class:'partner-table-card'},h('table',{class:'partner-table'},h('thead',{},h('tr',{},...['สินค้า / SKU','ไซซ์และสภาพ','ราคาเช่า','รายรับโดยประมาณ','สถานะ','จัดการ'].map(label=>h('th',{},label)))),h('tbody',{},...body)),h('footer',{},h('span',{},`แสดง 1–${own.length} จาก ${own.length} รายการ`),h('div',{},h('button',{type:'button',disabled:true},'‹'),h('b',{},'1'),h('button',{type:'button',disabled:true},'›')))));
}

function lenderOrdersView(bookings,showReturns=false){
  const returnStatuses=new Set(['renting','return_preparing','return_shipped','return_received','inspection','cleaning','completed']);
  const rows=bookings.filter(row=>showReturns?returnStatuses.has(row.status):!returnStatuses.has(row.status));
  const statusTabs=showReturns?[['ทั้งหมด',rows.length],['กำลังเช่า',rows.filter(x=>x.status==='renting').length],['เตรียมคืน',rows.filter(x=>x.status==='return_preparing').length],['กำลังส่งคืน',rows.filter(x=>x.status==='return_shipped').length],['ตรวจสภาพ/ทำความสะอาด',rows.filter(x=>['return_received','inspection','cleaning'].includes(x.status)).length],['เสร็จสิ้น',rows.filter(x=>x.status==='completed').length]]:[['ทั้งหมด',rows.length],['รอเตรียมชุด',rows.filter(x=>x.status==='paid').length],['กำลังเตรียม',rows.filter(x=>x.status==='preparing').length],['จัดส่งแล้ว',rows.filter(x=>['outbound_shipped','outbound_transit'].includes(x.status)).length],['ยกเลิก',rows.filter(x=>x.status==='cancelled').length]];
  const tableRows=rows.length?rows.map(booking=>{const item=rentalItems(booking)[0],snap=item?.listingSnapshot||{},action=lenderNextAction(booking,me());return h('tr',{},h('td',{},h('div',{class:'partner-product-cell'},h('img',{src:photoUrl(snap.image),alt:''}),h('span',{},h('b',{},snap.title||'ชุดเช่า'),h('small',{},`Booking #${booking.id.slice(-8).toUpperCase()}`)))),h('td',{},h('b',{},user(booking.renterId)?.name||'ผู้เช่า'),h('small',{},`ไซซ์ ${item?.size||booking.size||'—'}`)),h('td',{},h('b',{},`${rentalDate(booking.pickupDate)}–${rentalDate(booking.returnDate)}`),h('small',{},`${booking.rentalDays||'—'} วัน`)),h('td',{},h('b',{},money(booking.totalPrice)),h('small',{},booking.paymentStatus||'ข้อมูลเดิม')),h('td',{},h('span',{class:`partner-pill ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status)),h('td',{},action?button(action.label,()=>runLenderAction(booking,action),action.kind==='primary'?'partner-primary':'partner-outline'):h('span',{class:'partner-done'},'ดำเนินการแล้ว')))}):[h('tr',{},h('td',{colspan:'6',class:'partner-empty'},showReturns?'ยังไม่มีชุดอยู่ในขั้นตอนรับคืน':'ยังไม่มีคำสั่งเช่าในขั้นตอนส่งชุด'))];
  return h('div',{class:'partner-view orders-view'},h('div',{class:'order-mode-tabs'},h('a',{href:'#closet/requests',class:showReturns?'':'active'},uiIcon('truck'),h('span',{},h('b',{},'คำสั่งเช่า'),h('small',{},'เตรียมและส่งชุดให้ผู้เช่า'))),h('a',{href:'#closet/returns',class:showReturns?'active':''},uiIcon('returnBox'),h('span',{},h('b',{},'รับชุดคืน'),h('small',{},'รับคืน ตรวจสภาพ และทำความสะอาด')))),partnerPageHead(showReturns?'รับชุดคืน':'คำสั่งเช่า',showReturns?'ติดตามชุดที่กำลังเช่าและจัดการขั้นตอนรับคืน':'จัดการ Booking ที่ชำระแล้วและเตรียมส่งให้ผู้เช่า'),h('section',{class:'partner-order-filter'},h('div',{class:'partner-status-tabs'},...statusTabs.map(([label,count],index)=>h('button',{type:'button',class:index===0?'active':''},label,h('span',{},count)))),h('div',{class:'partner-filter-row'},h('label',{},uiIcon('search'),h('input',{type:'search',placeholder:'ค้นหา Booking, ชุด หรือผู้เช่า','aria-label':'ค้นหาคำสั่งเช่า'})),h('button',{type:'button',class:'partner-outline'},uiIcon('filter'),'ตัวกรอง'),h('select',{'aria-label':'สถานะ'},h('option',{},'สถานะทั้งหมด')),h('select',{'aria-label':'เรียงลำดับ'},h('option',{},'ล่าสุดก่อน')))),h('div',{class:'partner-table-card'},h('table',{class:'partner-table'},h('thead',{},h('tr',{},...['รายการเช่า','ผู้เช่า / ไซซ์','วันรับ–คืน','ยอดค่าเช่า','สถานะ','ดำเนินการ'].map(label=>h('th',{},label)))),h('tbody',{},...tableRows))));
}

$('modalClose').onclick=close;
$('modal').addEventListener('cancel',()=>modalRenderer=null);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))close()});
$('accountBtn').onclick=()=>openAccounts(ctx);
$('footerAccountBtn').onclick=()=>openAccounts(ctx);
$('rentalBagBtn').onclick=()=>openRentalBag();
$('sellBtn').onclick=()=>requireUser()&&openCosplayListing(ctx);
$('globalSearch').onsubmit=event=>{event.preventDefault();filters.q=$('globalSearchInput').value.trim();go('#shop')};
window.addEventListener('hashchange',()=>{close();render();window.scrollTo({top:0,behavior:'instant'});$('page').focus({preventScroll:true})});
window.addEventListener('closet:changed',()=>task(async()=>{if(!repo)return;const prior=me();state=await repo.read();if(prior!==me()){studio=null;close();toast('บัญชีเปลี่ยนแล้ว อัปเดตข้อมูลในหน้านี้')}render()}));
try{try{const response=await fetch('./studio-catalog.json');if(!response.ok)throw Error('ยังไม่มีแค็ตตาล็อก 3D');studioCatalog=await response.json();}catch(error){studioCatalogError=error.message;}repo=await createCosplayRepository(studioCatalog);state=await repo.read();render()}catch(error){$('page').replaceChildren(empty('เปิดข้อมูลไม่สำเร็จ',error.message))}
window.addEventListener('pagehide',()=>{mixStudio?.dispose();mixStudio=null;});
