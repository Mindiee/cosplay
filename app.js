import {createCosplayRepository} from './repository.js';
import {h,money,photoUrl,cover,labels} from './dom.js';
import {openAccounts} from './panels.js';
import {PRESETS,validateBody,calculateFit,renderMannequin} from './mannequin.js';
import {openCosplayListing} from './cosplay-seller.js';
import {createStudioUI} from './studio-ui.js';
import {rentalDays} from './cosplay-domain.js';

const $=id=>document.getElementById(id);
const DISCLAIMER='Virtual preview is an estimation and does not guarantee actual fit.';
const CONDITIONS={like_new:'เหมือนใหม่',good:'สภาพดี',defect:'มีตำหนิ'};
let repo,state,modalRenderer=null,previousFocus,toastTimer,studio=null;
let mixStudio=null,studioCatalog=null,studioCatalogError='',studioRouteApplied='';
let filters={q:'',size:'',condition:'',maxPrice:'',sort:'latest'};
const me=()=>state?.settings.currentUserId;
const user=id=>state.profiles.find(p=>p.id===id);
const listing=id=>state.listings.find(l=>l.id===id);
const live=l=>l.status==='active'&&l.sizeVariants.some(v=>v.stock>0);
const firstVariant=l=>l.sizeVariants.find(v=>v.stock>0)||l.sizeVariants[0];
const minPrice=l=>Math.min(...(l.sizeVariants.some(v=>v.stock>0)?l.sizeVariants.filter(v=>v.stock>0):l.sizeVariants).map(v=>v.price));
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
const ctx={get state(){return state},run,modal,close,toast,task,openCloset:tab=>go(`#closet/${tab==='selling'?'listings':tab||'listings'}`)};
const heading=(eyebrow,title,copy)=>h('div',{class:'page-heading'},h('p',{class:'eyebrow'},eyebrow),h('h1',{},title),copy&&note(copy));
const empty=(title,copy)=>h('div',{class:'empty-state'},h('h2',{},title),note(copy),h('a',{class:'secondary',href:'#shop'},'กลับ Marketplace'));
const dt=n=>new Date(n).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});

function render(){
  if(!state)return;
  $('accountBtn').textContent=user(me())?.name||'บัญชีเดโม';
  const [route,id,routeVariant]=location.hash.slice(1).split('/');
  const inStudio=!route||route==='studio';document.body.classList.toggle('studio-active',inStudio);
  if(inStudio){if(!mixStudio)mixStudio=createStudioUI({...ctx,get state(){return state},rental:openRental,accounts:()=>openAccounts(ctx)},studioCatalog,studioCatalogError);else mixStudio.update(state);if($('page').firstChild!==mixStudio.element)$('page').replaceChildren(mixStudio.element);const routeKey=id?`${id}/${routeVariant||''}`:'';if(routeKey&&routeKey!==studioRouteApplied){studioRouteApplied=routeKey;task(()=>mixStudio.wearItem(id,routeVariant));}if(!routeKey)studioRouteApplied='';return;}
  studioRouteApplied='';
  const view=route==='product'?productPage(id):route==='tryon'?tryOnPage(id):route==='closet'?closetPage(id||'listings'):route==='rental'?confirmationPage(id):marketplace();
  $('page').replaceChildren(view);
}

function card(l){
  const saved=state.favorites[me()]?.includes(l.id);
  return h('article',{class:'product-card'},
    h('a',{class:'product-photo',href:`#product/${l.id}`},h('img',{src:photoUrl(cover(l)),alt:`${l.character} — ${l.title}`}),h('span',{class:'badge'},CONDITIONS[l.condition])),
    button(saved?'♥':'♡',()=>requireUser()&&run('favorite.toggle',{id:l.id}),'save-product',{'aria-label':`บันทึก ${l.title}`}),
    h('div',{class:'product-info'},h('small',{},l.character),h('h3',{},h('a',{href:`#product/${l.id}`},l.title)),h('div',{class:'product-bottom'},h('span',{},l.sizeVariants.filter(v=>v.stock).map(v=>v.size).join(' / ')),h('b',{},`${money(minPrice(l))} / วัน`))));
}

function marketplace(){
  const grid=h('div',{class:'product-grid'}),count=h('span',{class:'result-count'});
  const rows=()=>state.listings.filter(l=>live(l)&&(!filters.condition||l.condition===filters.condition)&&[l.character,l.title,l.series,l.description].join(' ').toLowerCase().includes(filters.q.trim().toLowerCase())&&l.sizeVariants.some(v=>v.stock&&(!filters.size||v.size===filters.size)&&(!filters.maxPrice||v.price<=Number(filters.maxPrice)))).sort((a,b)=>filters.sort==='price'?minPrice(a)-minPrice(b):b.publishedAt-a.publishedAt);
  function update(){const list=rows();count.textContent=`${list.length} ชุดที่พร้อมให้เช่า`;grid.replaceChildren(...(list.length?list.map(card):[empty('ยังไม่พบชุดที่ค้นหา','ลองเปลี่ยนคำค้น ไซซ์ หรือราคาเช่าต่อวัน')]))}
  const select=(key,label,options)=>h('select',{'aria-label':label,onchange:e=>{filters[key]=e.target.value;update()}},...options.map(([v,t])=>h('option',{value:v,selected:filters[key]===v},t)));
  update();const hero=state.listings.find(live)||state.listings.find(l=>l.status!=='deleted');
  return h('div',{},
    h('section',{class:'hero cosplay-hero'},h('div',{},h('p',{class:'eyebrow'},'A NEW CHARACTER. A NEW CHAPTER.'),h('h1',{},'สวมบทบาทใหม่',h('em',{},'ในแบบของคุณ')),note('ค้นพบชุดคอสเพลย์ให้เช่า เลือกช่วงวันที่ และลองภาพรวมบนหุ่นก่อนส่งคำขอ'),h('a',{class:'dark hero-cta',href:'#studio'},'เปิด 3D Studio ↗'),h('p',{class:'hero-footnote'},'VIRTUAL COSPLAY MANNEQUIN · PERSONAL FIT PREVIEW')),
      hero?h('a',{class:'cosplay-hero-art',href:`#tryon/${hero.id}`},h('img',{src:photoUrl(cover(hero)),alt:hero.title}),h('span',{class:'hero-caption'},'THE COSTUME EDIT',h('small',{},'ลองจินตนาการ ก่อนเช่าชุดจริง'))):h('div',{class:'cosplay-hero-art'},empty('ยังไม่มีชุดใน Marketplace','เริ่มลงชุดให้เช่าชุดแรกของคุณ'))),
    h('section',{class:'catalog-shell'},h('div',{class:'section-head'},h('div',{},h('p',{class:'eyebrow'},'THE MARKETPLACE'),h('h2',{},'ชุดใหม่ของเรื่องราวคุณ')),count),
      h('div',{class:'toolbar'},h('label',{class:'search'},'⌕',h('input',{value:filters.q,placeholder:'ค้นหาตัวละคร ชื่อชุด หรือเรื่องราว','aria-label':'ค้นหาชุดคอสเพลย์',oninput:e=>{filters.q=e.target.value;update()}})),
        select('size','ไซซ์',[['','ทุกไซซ์'],...['S','M','L','XL'].map(x=>[x,x])]),select('condition','สภาพ',[['','ทุกสภาพ'],...Object.entries(CONDITIONS)]),
        field('ราคาเช่า/วันไม่เกิน',h('input',{type:'number',min:0,value:filters.maxPrice,placeholder:'฿',oninput:e=>{filters.maxPrice=e.target.value;update()}})),select('sort','เรียงลำดับ',[['latest','ล่าสุด'],['price','ราคาต่ำก่อน']])),
      grid,h('p',{class:'asset-note'},'ภาพและตัวละครเป็นภาพประกอบสำหรับเดโม ประกาศให้เช่าและราคาเป็นข้อมูลสาธิต')));
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
  function update(){copy.replaceChildren(h('p',{class:'eyebrow'},l.series),h('h1',{},l.character),h('h2',{},l.title),h('p',{class:'detail-price'},`${money(variant.price)} / วัน`),note(`${CONDITIONS[l.condition]} · ผู้ให้เช่า ${user(l.sellerId)?.name||'บัญชีเดโม'}`),h('p',{},'เลือกไซซ์เพื่อดูขนาดที่วัดจริง'),sizePicker(l,variant.id,id=>{variant=l.sizeVariants.find(v=>v.id===id);update()}),!variant.stock?note('ไซซ์นี้ยังไม่เปิดให้เช่า แต่ยังลองภาพเพื่อเปรียบเทียบได้'):null,dimensions(variant),
    h('div',{class:'product-cta'},button('Try On — ลองบนหุ่นของฉัน',()=>{studio=null;go(l.model?`#studio/${l.id}/${variant.id}`:`#tryon/${l.id}/${variant.id}`)},'dark'),button('เช่าชุดนี้',()=>openRental(l.id,variant.id),'secondary',{disabled:l.status!=='active'||!variant.stock||l.sellerId===me()})),l.status!=='active'?note('ประกาศนี้พักการให้เช่าอยู่'):null,h('p',{class:'disclaimer'},DISCLAIMER),h('hr'),h('h3',{},'รายละเอียดชุด'),note(l.description),h('h3',{},'สิ่งที่รวมในชุด'),h('ul',{},...l.components.map(c=>h('li',{},c))),l.defects.length?h('div',{class:'defect-box'},h('b',{},'รายละเอียดตำหนิ'),...l.defects.map(d=>note(`${labels.severity[d.severity]||d.severity}: ${d.description}`))):null,button(state.favorites[me()]?.includes(l.id)?'♥ บันทึกแล้ว':'♡ บันทึกชุดนี้',()=>requireUser()&&run('favorite.toggle',{id:l.id}),'text-btn'))}
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
  const stage=h('div',{class:'mannequin-stage tryon-stage'}),summary=h('div',{class:'fit-summary','aria-live':'polite'}),picker=h('div'),price=h('b',{class:'tryon-price'}),error=h('p',{class:'form-error',role:'alert'}),rent=button('เช่าชุดนี้',()=>openRental(l.id,variant.id),'dark full');
  function update(){const errors=validateBody(studio.body);error.textContent=errors.join(' · ');if(errors.length){rent.disabled=true;return}stage.replaceChildren(renderMannequin(studio.body,l,variant,{guides:true}));if(!l.costumeLayers.length)stage.append(h('div',{class:'no-overlay'},h('img',{src:photoUrl(cover(l)),alt:l.title}),note('ยังไม่มีภาพโปร่งใส แสดงภาพต้นฉบับคู่หุ่น')));summary.replaceChildren(h('h3',{},'Fit Summary'),...calculateFit(studio.body,variant.measurements,l.lengthTarget).map(r=>h('div',{class:'fit-row'},h('span',{},r.label),h('strong',{'data-fit':r.status},r.status.replace('_',' ')),h('small',{},r.explanation))),note('เกณฑ์เดโมจากขนาดวัด ไม่ได้จำลองเนื้อผ้าหรือความยืด'));price.textContent=`${money(variant.price)} / วัน`;rent.disabled=l.status!=='active'||!variant.stock||l.sellerId===me();picker.replaceChildren(sizePicker(l,variant.id,id=>{studio.variantId=id;variant=l.sizeVariants.find(v=>v.id===id);update()}))}
  const mannequinSelect=h('select',{'aria-label':'เลือกหุ่น',onchange:e=>{studio.mode=e.target.value;studio.body=structuredClone(e.target.value==='personal'?state.mannequins[me()]:PRESETS.Regular);render()}},h('option',{value:'standard',selected:studio.mode==='standard'},'Standard Mannequin'),state.mannequins[me()]?h('option',{value:'personal',selected:studio.mode==='personal'},'สัดส่วนที่บันทึกไว้'):null);
  const edit=h('details',{class:'inline-measurements'},h('summary',{},'แก้ไขสัดส่วนเพื่อเปรียบเทียบ'),bodyEditor(studio.body,update),button('บันทึกสัดส่วนนี้',async()=>{if(!requireUser())return;const errors=validateBody(studio.body);if(errors.length){error.textContent=errors.join(' · ');return}await run('mannequin.save',{body:studio.body});studio.mode='personal';render();toast('บันทึกสัดส่วนแล้ว')},'secondary full'));
  update();
  return h('section',{class:'page-shell studio-shell'},h('a',{class:'back-link',href:`#product/${l.id}`},'← กลับรายละเอียดชุด'),heading('VIRTUAL COSPLAY MANNEQUIN','ลองมองตัวเองในบทบาทใหม่'),h('div',{class:'tryon-layout'},h('aside',{class:'studio-controls'},h('p',{class:'eyebrow'},'YOUR CHARACTER'),h('h2',{},l.character),note(l.title),price,h('h3',{},'1. เลือกหุ่น'),mannequinSelect,!state.mannequins[me()]?h('a',{class:'text-btn',href:'#studio'},'ปรับหุ่นใน 3D Studio →'):null,edit,error,h('h3',{},'2. เลือกไซซ์'),picker,h('h3',{},'3. เปลี่ยนชุด'),h('select',{'aria-label':'เปลี่ยนชุด',onchange:e=>{studio=null;go(`#tryon/${e.target.value}`)}},...state.listings.filter(live).map(x=>h('option',{value:x.id,selected:x.id===l.id},`${x.character} — ${x.title}`)))),stage,h('aside',{class:'studio-results'},summary,rent,h('p',{class:'disclaimer'},DISCLAIMER))));
}

function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function rentalDate(value){const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12).toLocaleDateString('th-TH',{dateStyle:'medium'})}
function openRental(listingId,variantId){
  if(!requireUser())return;
  const actor=me(),item=listing(listingId);
  if(!item||item.status!=='active'){toast('ชุดนี้ยังไม่พร้อมให้เช่า');return}
  let chosenVariantId=item.sizeVariants.some(row=>row.id===variantId&&row.stock>0)?variantId:item.sizeVariants.find(row=>row.stock>0)?.id;
  if(!chosenVariantId||item.sellerId===actor){toast('ไซซ์นี้ยังไม่พร้อมให้เช่า');return}
  let pickupDate=localDateKey(),returnDate=pickupDate,error='';
  const redraw=()=>{$('modalBody').replaceChildren(build())};
  const build=()=>{
    const variant=item.sizeVariants.find(row=>row.id===chosenVariantId);let days=0;
    try{days=rentalDays(pickupDate,returnDate)}catch(cause){error=cause.message}
    return h('div',{class:'rental-review stack'},h('img',{src:photoUrl(cover(item)),alt:item.title}),h('h2',{},item.character),note(item.title),h('p',{},`ไซซ์ ${variant.size} · ${CONDITIONS[item.condition]}`),sizePicker(item,chosenVariantId,id=>{chosenVariantId=id;error='';redraw()},true),h('div',{class:'rental-dates'},field('วันรับชุด',h('input',{type:'date',min:localDateKey(),value:pickupDate,onchange:event=>{pickupDate=event.target.value;error='';redraw()}})),field('วันคืนชุด',h('input',{type:'date',min:pickupDate,value:returnDate,onchange:event=>{returnDate=event.target.value;error='';redraw()}}))),h('div',{class:'rental-total'},note(`${money(variant.price)} / วัน × ${days||0} วัน`),h('strong',{},money(variant.price*days))),note('ส่งคำขอแล้วรอผู้ให้เช่ายืนยัน ไม่มีการชำระเงินจริง'),error&&h('p',{class:'form-error',role:'alert'},error),button('ส่งคำขอเช่าชุดนี้',async()=>{try{if(actor!==me())throw Error('บัญชีเปลี่ยนแล้ว กรุณาเริ่มเช่าใหม่');const result=await run('rental.create',{listingId,variantId:chosenVariantId,pickupDate,returnDate});go(`#rental/${result.id}`)}catch(cause){error=cause.message;redraw()}},'dark',{disabled:!days}));
  };
  modal('ตรวจทานคำขอเช่า',build);
}
const RENTAL_STATUS={pending:'รอยืนยัน',confirmed:'ยืนยันแล้ว',completed:'เสร็จสิ้น'};
function rentalLine(booking,{sellerView=false}={}){
  const actions=h('div',{class:'rental-actions'},h('span',{class:`rental-status ${booking.status}`},RENTAL_STATUS[booking.status]||booking.status));
  if(sellerView&&booking.status==='pending')actions.append(button('ยืนยันการเช่า',async()=>{await run('rental.confirm',{id:booking.id});toast('ยืนยันคำขอเช่าแล้ว')},'dark'));
  if(sellerView&&booking.status==='confirmed')actions.append(button('ปิดงานเช่า',async()=>{await run('rental.complete',{id:booking.id});toast('ปิดงานเช่าแล้ว')},'dark'));
  return h('article',{class:'cosplay-order rental-card'},h('img',{src:photoUrl(booking.listingSnapshot.image),alt:booking.listingSnapshot.title}),h('div',{},h('small',{},`#${booking.id.slice(-8)} · ${dt(booking.createdAt)}`),h('h3',{},`${booking.listingSnapshot.character} — ${booking.listingSnapshot.title}`),note(`ไซซ์ ${booking.size} · ${rentalDate(booking.pickupDate)} ถึง ${rentalDate(booking.returnDate)}`),note(`${money(booking.dailyPrice)} / วัน × ${booking.rentalDays} วัน · รวม ${money(booking.totalPrice)}`)),actions);
}
function confirmationPage(id){const booking=state.rentals.find(row=>row.id===id&&row.renterId===me());if(!booking)return empty('ไม่พบคำขอเช่า','เลือกบัญชีผู้เช่าเพื่อดูรายการ');return h('section',{class:'page-shell order-confirmation'},h('span',{class:'confirmation-icon rental-pending'},'…'),heading('RENTAL REQUEST CREATED','ส่งคำขอเช่าแล้ว','ผู้ให้เช่าจะตรวจสอบและยืนยันคำขอนี้'),rentalLine(booking),h('a',{class:'dark',href:'#closet/rentals'},'ดู My Rentals'),h('a',{class:'secondary',href:'#shop'},'เลือกชุดอื่นต่อ'))}

function closetPage(tab){
  if(!me())return h('section',{class:'page-shell'},heading('MY CLOSET','พื้นที่ของคุณ'),button('เลือกบัญชีเดโม',()=>openAccounts(ctx),'dark'));
  const tabs={listings:'My Listings',requests:'Rental Requests',rentals:'My Rentals',saved:'Saved'};
  const own=state.listings.filter(l=>l.sellerId===me()&&l.status!=='deleted');let content=[];
  if(tab==='rentals')content=state.rentals.filter(row=>row.renterId===me()).sort((a,b)=>b.createdAt-a.createdAt).map(row=>rentalLine(row));
  else if(tab==='requests')content=state.rentals.filter(row=>row.sellerId===me()).sort((a,b)=>b.createdAt-a.createdAt).map(row=>rentalLine(row,{sellerView:true}));
  else if(tab==='saved')content=state.listings.filter(l=>state.favorites[me()]?.includes(l.id)&&l.status!=='deleted').map(card);
  else content=own.map(l=>h('article',{class:'my-listing'},h('img',{src:photoUrl(cover(l)),alt:l.title}),h('div',{},h('h3',{},`${l.character} — ${l.title}`),note(l.sizeVariants.map(v=>`${v.size}: ${v.stock?'พร้อมให้เช่า':'ปิดรับเช่า'}`).join(' · ')),note(l.status==='paused'?'พักการให้เช่า':'กำลังแสดงใน Marketplace')),h('div',{class:'row'},button('แก้ไข',()=>openCosplayListing(ctx,l.id)),button(l.status==='paused'?'เปิดให้เช่า':'พักให้เช่า',()=>run('listing.status',{id:l.id,status:l.status==='paused'?'active':'paused'}),'text-btn'),button('ลบ',()=>modal('นำประกาศออก',()=>h('div',{class:'stack'},note(`นำ ${l.title} ออกจาก Marketplace? ประวัติการเช่ายังอยู่`),button('ยืนยันนำออก',async()=>{await run('listing.status',{id:l.id,status:'deleted'});close()},'dark'))),'text-btn'))));
  return h('section',{class:'page-shell'},heading('MY CLOSET',`ตู้คอสเพลย์ของ ${user(me()).name}`),h('div',{class:'closet-nav'},...Object.entries(tabs).map(([k,t])=>h('a',{href:`#closet/${k}`,class:k===tab?'active':'','aria-current':k===tab?'page':null},t))),h('div',{class:tab==='saved'?'product-grid':'stack'},...(content.length?content:[empty('ยังไม่มีรายการในหมวดนี้','เริ่มเลือกชุดหรือเปิดให้เช่าชุดแรกของคุณ')])));
}

$('modalClose').onclick=close;
$('modal').addEventListener('cancel',()=>modalRenderer=null);
$('modal').addEventListener('click',e=>{if(e.target===$('modal'))close()});
$('accountBtn').onclick=()=>openAccounts(ctx);
$('sellBtn').onclick=()=>requireUser()&&openCosplayListing(ctx);
window.addEventListener('hashchange',()=>{close();render();window.scrollTo({top:0,behavior:'instant'});$('page').focus({preventScroll:true})});
window.addEventListener('closet:changed',()=>task(async()=>{if(!repo)return;const prior=me();state=await repo.read();if(prior!==me()){studio=null;close();toast('บัญชีเปลี่ยนแล้ว อัปเดตข้อมูลในหน้านี้')}render()}));
try{try{const response=await fetch('./studio-catalog.json');if(!response.ok)throw Error('ยังไม่มีแค็ตตาล็อก 3D');studioCatalog=await response.json();}catch(error){studioCatalogError=error.message;}repo=await createCosplayRepository(studioCatalog);state=await repo.read();render()}catch(error){$('page').replaceChildren(empty('เปิดข้อมูลไม่สำเร็จ',error.message))}
window.addEventListener('pagehide',()=>{mixStudio?.dispose();mixStudio=null;});
