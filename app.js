import {createCosplayRepository} from './repository.js';
import {h,money,photoUrl,cover,labels} from './dom.js';
import {openAccounts} from './panels.js';
import {PRESETS,validateBody,calculateFit,calculateFitMatch,renderMannequin} from './mannequin.js';
import {openCosplayListing} from './cosplay-seller.js';
import {createStudioUI} from './studio-ui.js';
import {rentalBalance,rentalDays,rentalRangesOverlap} from './cosplay-domain.js';
import {filterMarketplaceListings,marketplaceThemes} from './marketplace-filter.js';
import {OCCASION_CATEGORIES,OCCASION_LABELS} from './occasion-domain.js';
import {rentalFitSummary,rentalPhase,rentalTimeline,rentalUrgency,renterNextAction} from './rental-presenter.js';

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
  $('accountBtn').querySelector('span').textContent=user(me())?.name||'บัญชีเดโม';
  const bagCount=state.rentalBags?.[me()]?.items?.length||0;$('rentalBagBtn').querySelector('span').textContent=`รายการเช่า · ${bagCount}`;
  const [route,id,routeVariant]=location.hash.slice(1).split('/');
  const inStudio=route==='studio';document.body.classList.toggle('studio-active',inStudio);
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
    h('div',{class:'product-info'},h('small',{},l.character),h('h3',{},h('a',{href:`#product/${l.id}`},l.title)),h('div',{class:'product-bottom'},h('span',{},l.sizeVariants.filter(v=>v.stock).map(v=>v.size).join(' / ')),h('b',{},`${money(minPrice(l))} / วัน`)),h('div',{class:'card-actions'},h('a',{class:'secondary',href:`#tryon/${l.id}/${variant.id}`},'⚝ Preview'),button('เช่า',()=>openRental(l.id,variant.id),'dark',{disabled:l.sellerId===me()}))));
}

function homePage(){
  let active=2;
  const heroHost=h('div',{class:'hero-studio-viewport'}),heroStatus=h('small',{class:'hero-studio-status'},'กำลังเปิดหุ่น 3D…'),track=h('div',{class:'occasion-track'});
  const draw=()=>track.replaceChildren(...OCCASION_CATEGORIES.map((key,index)=>{const label=OCCASION_LABELS[key];return h('button',{type:'button',class:`occasion-card ${index===active?'active':''}`,style:`--distance:${Math.abs(index-active)}`,onclick:()=>{if(index===active){filters.occasion=key;go('#shop');return}active=index;draw()},'aria-pressed':String(index===active)},h('img',{src:`toosuepha-assets/${key}.jpg`,alt:''}),h('span',{},h('strong',{},label.title),h('small',{},label.subtitle),h('small',{},index===active?'เลือกหมวดนี้ →':'เลื่อนมาตรงกลาง')))}));
  draw();const root=h('div',{class:'home-page'},
    h('section',{class:'hero cosplay-hero home-hero'},h('div',{},h('p',{class:'eyebrow'},'TOOSUEPHA · RENTAL MARKETPLACE'),h('h1',{},'เสื้อผ้าสำหรับ',h('em',{},'ทุกโอกาสของคุณ')),note('เลือกชุดที่ใช่ ส่งต่อชุดที่มี'),h('div',{class:'row'},h('a',{class:'secondary',href:'#shop'},'ค้นหาชุด'),h('a',{class:'dark',href:'#studio'},'พร้อมสร้างหุ่นจำลอง')),h('p',{class:'hero-footnote'},'FIT MATCH · 3D TRY-ON · RENTAL ONLY')),
      h('div',{class:'cosplay-hero-art studio-hero'},heroHost,h('div',{class:'hero-studio-copy'},heroStatus,h('a',{class:'hero-caption',href:'#studio'},'3D STUDIO',h('small',{},'ลากเพื่อหมุน · เปิด Studio ↗'))))),
    h('section',{class:'occasion-section'},h('p',{class:'eyebrow'},'DRESS FOR THE MOMENT'),h('h2',{},'เสื้อผ้าสำหรับทุกโอกาสของคุณ'),note('เลือกการใช้งาน แล้วค้นหาชุดที่พร้อมให้เช่า'),h('div',{class:'occasion-carousel'},button('←',()=>{active=(active-1+OCCASION_CATEGORIES.length)%OCCASION_CATEGORIES.length;draw()},'carousel-arrow',{'aria-label':'หมวดก่อนหน้า'}),track,button('→',()=>{active=(active+1)%OCCASION_CATEGORIES.length;draw()},'carousel-arrow',{'aria-label':'หมวดถัดไป'}))),
    h('section',{class:'home-message'},h('p',{},'“ ชุดนี้พอดีกับเราไหม? ”'),note('ดูสัดส่วนและลองบนหุ่น 3D ก่อนตัดสินใจเช่า')),
    h('section',{class:'home-steps'},h('header',{},h('h2',{},'จากสัดส่วนสู่ชุดที่เหมาะกับคุณ ช่วยให้ตัดสินใจเช่าได้ง่ายขึ้น'),note('ค้นหา เทียบขนาด และลองสวมในเส้นทางเดียว')), ...['01 Discover','02 Match & Try','03 Decide'].map((title,index)=>h('article',{},h('small',{},`0${index+1}`),h('h3',{},title),note(['ค้นหาเสื้อผ้าจากหมวดและช่วงวันที่','เทียบขนาดและลองบนหุ่น 3D','เลือกวันและยืนยันการเช่า'][index])))),
    h('section',{class:'home-choice'},h('h2',{},'เลือกชุดที่ใช่ ส่งต่อชุดที่มี'),note('ให้ทุกชุดได้หมุนเวียนใช้งานในโอกาสใหม่'),h('div',{class:'mode-switch home-mode'},h('a',{href:'#shop'},'เช่า'),h('a',{href:'#closet/listings'},'ปล่อยเช่า')),h('div',{class:'choice-copy'},h('p',{},'Find what fits.',h('br'),'Rent what you need.'),h('p',{},'List what you own.',h('br'),"Earn from what you don't wear."))),
    h('section',{class:'home-studio-cta'},h('div',{},h('h2',{},'พร้อมสร้างหุ่นจำลอง 3D ของคุณแล้วหรือยัง?'),note('ตั้งสัดส่วน เลือกหุ่น และลองชิ้นส่วนจริงจาก Marketplace'),h('div',{class:'row'},h('a',{class:'dark',href:'#studio'},'สร้างหุ่นของฉันใน 3D Studio'),h('a',{class:'secondary',href:'#shop'},'ค้นหาชุด')))));
  mountHeroStudio(heroHost,heroStatus);return root;
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
    const rentalPanel=h('section',{class:'product-rental-panel'},h('div',{class:'rental-price-row'},h('span',{},'เช่าชุด'),h('p',{class:'detail-price'},`${money(variant.price)} / วัน`)),h('div',{class:'rental-subhead'},h('b',{},'เลือกไซซ์และขนาดที่วัดจริง'),h('a',{href:'#studio'},'เทียบกับหุ่นของฉัน')),sizePicker(l,variant.id,id=>{variant=l.sizeVariants.find(v=>v.id===id);update()}),dimensions(variant),fitPanel,h('div',{class:'inline-rental-dates'},field('วันรับ',h('input',{type:'date',min:localDateKey(),value:filters.pickupDate,onchange:e=>filters.pickupDate=e.target.value})),field('วันคืน',h('input',{type:'date',min:filters.pickupDate||localDateKey(),value:filters.returnDate,onchange:e=>filters.returnDate=e.target.value}))),h('div',{class:'product-cta'},button('⚝ Try-on',()=>{studio=null;go(`#tryon/${l.id}/${variant.id}`)},'dark'),button('ยืนยันการเช่า',()=>openRental(l.id,variant.id),'dark',{disabled:l.status!=='active'||!variant.stock||l.sellerId===me()})),h('p',{class:'disclaimer'},DISCLAIMER));
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
  function update(){const errors=validateBody(studio.body);error.textContent=errors.join(' · ');if(errors.length){rent.disabled=true;return}stage.replaceChildren(status);if(l.model)mountPreviewStudio(stage,status,l,variant,studio.body);else{stage.prepend(renderMannequin(studio.body,l,variant,{guides:true}));if(!l.costumeLayers.length)stage.append(h('div',{class:'no-overlay'},h('img',{src:photoUrl(cover(l)),alt:l.title}),note('ไม่มีโมเดล 3D — แสดงภาพจริงคู่หุ่น')))}const persisted=bodyForFit(),match=calculateFitMatch(persisted,l,variant);summary.replaceChildren(h('h3',{},match?`Fit Match ${match.score}%`:'Fit Match —'),...calculateFit(studio.body,variant.measurements,l.lengthTarget).map(r=>h('div',{class:'fit-row'},h('span',{},r.label),h('strong',{'data-fit':r.status},r.status.replace('_',' ')),h('small',{},r.explanation))),note(match?'คะแนนมาจากสัดส่วนที่บันทึกและขนาดชุดเท่านั้น':'บันทึกสัดส่วนก่อน จึงจะแสดงเปอร์เซ็นต์ Fit Match'));price.textContent=`${money(variant.price)} / วัน`;rent.disabled=l.status!=='active'||!variant.stock||l.sellerId===me();picker.replaceChildren(sizePicker(l,variant.id,id=>{studio.variantId=id;variant=l.sizeVariants.find(v=>v.id===id);update()}))}
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

function closetPage(tab){
  if(!me())return h('section',{class:'page-shell'},heading('MY CLOSET','พื้นที่ของคุณ'),button('เลือกบัญชีเดโม',()=>openAccounts(ctx),'dark'));
  const tabs={listings:'My Listings',requests:'Rental Requests'};
  const own=state.listings.filter(l=>l.sellerId===me()&&l.status!=='deleted');let content=[];
  if(tab==='requests')content=state.rentals.filter(row=>row.sellerId===me()).sort((a,b)=>b.createdAt-a.createdAt).map(row=>rentalLine(row,{sellerView:true}));
  else content=own.map(l=>h('article',{class:'my-listing'},h('img',{src:photoUrl(cover(l)),alt:l.title}),h('div',{},h('h3',{},`${l.character} — ${l.title}`),note(l.sizeVariants.map(v=>`${v.size}: ${v.stock?'พร้อมให้เช่า':'ปิดรับเช่า'}`).join(' · ')),note(l.status==='paused'?'พักการให้เช่า':'กำลังแสดงใน Marketplace')),h('div',{class:'row'},button('แก้ไข',()=>openCosplayListing(ctx,l.id)),button(l.status==='paused'?'เปิดให้เช่า':'พักให้เช่า',()=>run('listing.status',{id:l.id,status:l.status==='paused'?'active':'paused'}),'text-btn'),button('ลบ',()=>modal('นำประกาศออก',()=>h('div',{class:'stack'},note(`นำ ${l.title} ออกจาก Marketplace? ประวัติการเช่ายังอยู่`),button('ยืนยันนำออก',async()=>{await run('listing.status',{id:l.id,status:'deleted'});close()},'dark'))),'text-btn'))));
  const balance=rentalBalance(state,me());
  return h('section',{class:'page-shell'},heading('MY CLOSET',`ชุดที่ ${user(me()).name} ปล่อยให้เช่า`,'จัดการประกาศและ Booking ที่ชำระจำลองแล้ว'),h('div',{class:'earnings-strip'},h('span',{},'Pending Earnings',h('b',{},money(balance.pending))),h('span',{},'Available Earnings',h('b',{},money(balance.available)))),h('div',{class:'closet-nav'},...Object.entries(tabs).map(([k,t])=>h('a',{href:`#closet/${k}`,class:k===tab?'active':'','aria-current':k===tab?'page':null},t))),h('div',{class:'stack'},...(content.length?content:[empty('ยังไม่มีรายการในหมวดนี้','เริ่มลงชุดให้เช่าหรือรอรับ Booking')])));
}

$('modalClose').onclick=close;
$('modal').addEventListener('cancel',()=>modalRenderer=null);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))close()});
$('accountBtn').onclick=()=>openAccounts(ctx);
$('rentalBagBtn').onclick=()=>openRentalBag();
$('sellBtn').onclick=()=>requireUser()&&openCosplayListing(ctx);
$('globalSearch').onsubmit=event=>{event.preventDefault();filters.q=$('globalSearchInput').value.trim();go('#shop')};
window.addEventListener('hashchange',()=>{close();render();window.scrollTo({top:0,behavior:'instant'});$('page').focus({preventScroll:true})});
window.addEventListener('closet:changed',()=>task(async()=>{if(!repo)return;const prior=me();state=await repo.read();if(prior!==me()){studio=null;close();toast('บัญชีเปลี่ยนแล้ว อัปเดตข้อมูลในหน้านี้')}render()}));
try{try{const response=await fetch('./studio-catalog.json');if(!response.ok)throw Error('ยังไม่มีแค็ตตาล็อก 3D');studioCatalog=await response.json();}catch(error){studioCatalogError=error.message;}repo=await createCosplayRepository(studioCatalog);state=await repo.read();render()}catch(error){$('page').replaceChildren(empty('เปิดข้อมูลไม่สำเร็จ',error.message))}
window.addEventListener('pagehide',()=>{mixStudio?.dispose();mixStudio=null;});
