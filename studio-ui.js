import {figmaIcon,breadcrumb} from './renter-shell.js';
import {h,money,photoUrl,cover} from './dom.js';
import {SLOTS,BODY_DEFAULTS,BODY_LIMITS,IDENTITY,profileStudio,validateStudioBody} from './studio-domain.js';
import {calculateFit,calculateFitMatch} from './mannequin.js';
import {lineIcon,menuSelect} from './menu-select.js';
import {OCCASION_CATEGORIES,OCCASION_LABELS} from './occasion-domain.js';

export function createStudioUI(ctx,catalog,catalogError='',{mode='studio'}={}){
 let state=ctx.state,actor=state.settings.currentUserId,profile=profileStudio(state,actor),selected=null,category='',occasion='',theme='',query='',look='custom',renderer=null,alive=true;
 const btn=(label,fn,cls='secondary',attrs={})=>h('button',{type:'button',class:cls,...attrs,onclick:()=>ctx.task(fn)},label);
 const muted=text=>h('p',{class:'muted'},text);
 const status=h('div',{class:'studio-status',role:'status','aria-live':'polite'},'กำลังเปิด WebGL…'),host=h('div',{class:'studio-canvas'}),grid=h('div',{class:'studio-grid'}),detail=h('section',{class:'studio-detail','aria-label':'รายละเอียดชิ้นส่วน'}),equipped=h('div',{class:'studio-equipped'}),count=h('span',{class:'studio-count'}),measurements=h('div',{class:'studio-body-fields'}),bodyError=h('p',{class:'form-error',role:'alert'}),waistChest=h('strong'),waistHip=h('strong'),ready=h('span',{class:'studio-ready'}),fitSummary=h('section',{class:'tryon-room-fit','aria-live':'polite'}),rentalSummary=h('section',{class:'tryon-room-rental','aria-live':'polite'}),lookChoices=h('div',{class:'tryon-look-cards'});
 const getItem=id=>state.listings.find(l=>l.id===id),body=()=>profile.bodies[profile.style],seller=id=>state.profiles.find(p=>p.id===id)?.name||'ผู้ให้เช่าเดโม';
 const firstSelected=()=>Object.values(profile.outfit).find(ref=>getItem(ref.listingId)?.status!=='deleted'&&getItem(ref.listingId)?.model?.url)?.listingId||state.listings.find(item=>item.model?.url&&item.attachmentSlot&&item.status!=='deleted')?.id||null;
 if(mode==='tryon')selected=firstSelected();
 const report=messages=>status.replaceChildren(...(messages.length?messages.map(text=>h('p',{},text)):[h('p',{},'3D พร้อม · ลากเพื่อหมุน 360° · เลื่อนเพื่อซูม')]));
 function draw(){renderer?.update({style:profile.style,body:body(),outfit:mode==='tryon'?profile.outfit:{},listings:state.listings,bodies:catalog?.bodies});}
 async function saveOutfit(){draw();renderEquipped();renderDetail();renderGrid();renderRental();renderLooks();if(actor)await ctx.run('studio.outfit.save',{outfit:structuredClone(profile.outfit)});else ctx.toast('เลือกบัญชีเพื่อบันทึกชุดนี้');}
 function wear(item,variant){profile.outfit[item.attachmentSlot]={listingId:item.id,variantId:variant.id,transform:structuredClone(IDENTITY)};selected=item.id;look='custom';return saveOutfit();}
 function renderEquipped(){equipped.replaceChildren(...Object.entries(SLOTS).map(([slot,label])=>{const ref=profile.outfit[slot],item=getItem(ref?.listingId);return h('div',{class:`equipped-slot ${item?'has-item':''}`},h('span',{},label),item?btn(item.title,()=>{selected=item.id;renderDetail()},'slot-name'):h('small',{},'ยังไม่ได้เลือก'),item?btn(lineIcon('close'),()=>{delete profile.outfit[slot];return saveOutfit()},'slot-remove',{'aria-label':`ถอด ${item.title}`}):null)}));}
 function renderFit(){
  if(mode!=='tryon')return;
  const item=getItem(selected),ref=item&&profile.outfit[item.attachmentSlot],variant=item?.sizeVariants.find(v=>v.id===(ref?.listingId===item.id?ref.variantId:null))||item?.sizeVariants.find(v=>v.stock)||item?.sizeVariants[0];
  const saved=actor&&state.studioProfiles?.[actor]?.bodies?.[profile.style],match=item&&variant&&saved?calculateFitMatch(saved,item,variant):null;
  fitSummary.replaceChildren(h('div',{class:'tryon-room-panel-head'},h('h2',{},'ผลประเมินขนาด'),h('a',{href:'#studio'},'แก้ไขหุ่น')),
    h('div',{class:'tryon-room-score'},h('strong',{},match?`${match.score}%`:'—'),h('span',{},item?`${item.title} · ไซซ์ ${variant.size}`:'เลือกเสื้อผ้าเพื่อดู Fit Match')),
    ...((match?.rows||[]).map(row=>h('div',{class:'tryon-room-fit-row'},h('span',{},row.label),h('b',{},({good:'พอดี',tight:'คับ',slightly_loose:'หลวมเล็กน้อย',loose:'หลวม',short:'สั้น',long:'ยาว'})[row.status]||'ยังประเมินไม่ได้')))),
    muted(saved?'คะแนนมาจากสัดส่วนที่บันทึกและขนาดชุดจริงเท่านั้น':'บันทึกสัดส่วนใน 3D Studio ก่อนแสดง Fit Match'));
 }
 function renderRental(){
  if(mode!=='tryon')return;
  const rows=Object.entries(profile.outfit).map(([slot,ref])=>{const item=getItem(ref.listingId),variant=item?.sizeVariants.find(v=>v.id===ref.variantId);return item&&variant?{slot,item,variant}:null}).filter(Boolean);
  const rentable=rows.filter(({item,variant})=>item.status==='active'&&variant.stock>0&&item.sellerId!==actor);
  const total=rentable.reduce((sum,{variant})=>sum+variant.price,0);
  rentalSummary.replaceChildren(h('div',{class:'tryon-room-panel-head'},h('h2',{},'เช่าชุด'),h('span',{},`${rows.length} ชิ้น`)),
    h('div',{class:'tryon-room-rental-items'},...(rows.length?rows.map(({slot,item,variant})=>h('article',{class:'tryon-room-rental-item'},h('img',{src:photoUrl(cover(item)),alt:''}),h('div',{},h('b',{},item.title),h('small',{},`${SLOTS[slot]} · ไซซ์ ${variant.size}`),h('strong',{},`${money(variant.price)} / วัน`)),btn(lineIcon('close'),()=>{delete profile.outfit[slot];return saveOutfit()},'slot-remove',{'aria-label':`ถอด ${item.title}`}))):[muted('เลือกเสื้อ กางเกง วิก หรือเครื่องประดับจากคลังด้านซ้าย')])),
    rows.length!==rentable.length?muted('ชิ้นที่เป็นของคุณหรือไม่พร้อมให้เช่ายังลองบนหุ่นได้ แต่จะไม่ถูกเพิ่มในรายการเช่า'):document.createDocumentFragment(),
    h('div',{class:'tryon-room-total'},h('span',{},'รวมค่าเช่าต่อวัน'),h('strong',{},money(total))),
    btn('เพิ่มชุดที่ลองแล้วเลือกวันเช่า',()=>ctx.checkoutOutfit(rentable.map(({item,variant})=>({listingId:item.id,variantId:variant.id}))),'dark full',{disabled:!rentable.length}),
    muted('Virtual preview is an estimation and does not guarantee actual fit.'));
 }
 function renderLooks(){
  if(mode!=='tryon')return;
  const choices=[['academy','Academy'],['fantasy','Fantasy'],['gothic','Gothic']].map(([key,label])=>{
    const items=state.listings.filter(item=>item.model&&item.theme===key&&item.attachmentSlot&&item.status!=='deleted');
    return {key,label,items,coverItem:items.find(item=>item.attachmentSlot==='top')||items[0]};
  });
  lookChoices.replaceChildren(...choices.map(({key,label,items,coverItem})=>h('button',{type:'button',class:`tryon-look-card${look===key?' selected':''}`,'aria-pressed':String(look===key),disabled:!items.length,onclick:()=>ctx.task(async()=>{
    const outfit={};for(const item of items)if(!outfit[item.attachmentSlot])outfit[item.attachmentSlot]={listingId:item.id,variantId:(item.sizeVariants.find(v=>v.stock)||item.sizeVariants[0]).id,transform:structuredClone(IDENTITY)};
    profile.outfit=outfit;selected=coverItem.id;look=key;await saveOutfit();
  })},coverItem?h('img',{src:photoUrl(cover(coverItem)),alt:''}):document.createDocumentFragment(),h('span',{},label))),
  h('button',{type:'button',class:`tryon-look-card custom${look==='custom'?' selected':''}`,'aria-pressed':String(look==='custom'),onclick:()=>{look='custom';renderLooks()}},h('span',{class:'tryon-look-custom-icon'},lineIcon('plus')),h('span',{},'ผสมเอง')));
 }
 function renderBody(){const ratio=value=>Number.isFinite(value)?value.toFixed(2):'—';waistChest.textContent=ratio(body().waist/body().chest);waistHip.textContent=ratio(body().waist/body().hip);measurements.replaceChildren(...Object.entries(BODY_LIMITS).map(([key,[min,max]])=>h('label',{'data-measurement':key},h('span',{class:'measurement-name'},figmaIcon('studio',({height:'imgContainer6',chest:'imgContainer7',waist:'imgContainer8',hip:'imgContainer9',shoulder:'imgContainer6'})[key]),({height:'ส่วนสูง',chest:'รอบอก',waist:'รอบเอว',hip:'สะโพก',shoulder:'ความกว้างไหล่'})[key]),h('input',{type:'number',min,max,step:1,value:body()[key],'aria-label':`${key} centimeters`,onchange:e=>{const value=Number(e.target.value),next={...body(),[key]:value};if(!validateStudioBody(next)){bodyError.textContent=`กรอกค่าระหว่าง ${min}–${max} ซม.`;return;}bodyError.textContent='';profile.bodies[profile.style]=next;renderBody();draw();renderDetail();}}),h('small',{class:'measurement-unit'},'ซม.'))));measurements.prepend(genderRow);}
 const updateReady=()=>ready.textContent=`● กำลังใช้งาน: ${profile.style==='female'?'หญิง':'ชาย'} (สัดส่วนปกติ)`;
 const stylePicker=h('div',{class:'studio-style-switch',role:'group','aria-label':'เพศหุ่น'},...['female','male'].map(style=>btn(style==='female'?'Female':'Male',async()=>{profile.style=style;stylePicker.querySelectorAll('button').forEach((el,i)=>el.setAttribute('aria-pressed',String(['female','male'][i]===style)));updateReady();renderBody();draw();renderDetail();if(actor)await ctx.run('studio.body.save',{style,body:body()});},'',{'aria-pressed':String(profile.style===style)})));
 function renderGrid(){const items=state.listings.filter(l=>l.model&&l.attachmentSlot&&l.status!=='deleted'&&(!category||l.attachmentSlot===category||category==='accessory'&&l.category==='accessory')&&(!occasion||(l.occasionCategory||'costume')===occasion)&&(!theme||l.theme===theme)&&`${l.title} ${l.character} ${l.series}`.toLowerCase().includes(query.toLowerCase()));count.textContent=`${items.length} ชิ้น`;
  grid.replaceChildren(...items.map(item=>{const active=item.status==='active'&&item.sizeVariants.some(v=>v.stock),worn=profile.outfit[item.attachmentSlot]?.listingId===item.id;return h('article',{class:`studio-item ${worn?'is-worn':''}`},btn('',()=>{selected=item.id;renderDetail()},'studio-photo',{'aria-label':`ดู ${item.title}`}),h('div',{class:'studio-item-copy'},h('small',{},`${SLOTS[item.attachmentSlot]} · ${seller(item.sellerId)}`),h('h3',{},item.title),h('div',{class:'studio-item-price'},h('strong',{},`${money(Math.min(...item.sizeVariants.map(v=>v.price)))} / วัน`),h('span',{},item.sizeVariants.map(v=>v.size).join(' / '))),btn(worn?'กำลังใส่ · ดูรายละเอียด':'ลองชิ้นนี้',()=>{selected=item.id;if(worn){renderDetail();return;}return wear(item,item.sizeVariants.find(v=>v.stock)||item.sizeVariants[0])},worn?'dark':'secondary'),!active?h('small',{class:'stock-note'},item.status==='paused'?'พักให้เช่า · ลองได้':'ยังไม่เปิดให้เช่า · ลองได้'):null));}));
  items.forEach((item,i)=>{const img=h('img',{src:photoUrl(cover(item)),alt:`ภาพถ่ายอ้างอิง ${item.title}`,loading:'lazy',onerror:e=>{e.target.replaceWith(h('span',{class:'photo-missing'},'โหลดภาพถ่ายไม่สำเร็จ'));}});grid.children[i].firstChild.append(img,h('span',{class:'photo-label'},'PHOTO REFERENCE'));});
  if(!items.length)grid.append(muted(catalogError||'ไม่พบชิ้นส่วน ลองเปลี่ยนตัวกรอง'));
 }
 function renderDetail(){const item=getItem(selected);if(!item){detail.replaceChildren(h('div',{class:'studio-detail-empty'},h('span',{},'YOUR NEXT CHARACTER'),h('p',{},'เลือกชิ้นส่วนเพื่อดูภาพจริง เลือกไซซ์ แล้วลองผสมข้ามร้าน')));renderFit();return;}
  const ref=profile.outfit[item.attachmentSlot],worn=ref?.listingId===item.id,variant=item.sizeVariants.find(v=>v.id===(worn?ref.variantId:null))||item.sizeVariants.find(v=>v.stock)||item.sizeVariants[0];
  if(mode==='tryon'){
   const m=variant.measurements||{};
   detail.replaceChildren(
    h('div',{class:'tryon-selected-head'},h('small',{},SLOTS[item.attachmentSlot]),btn(lineIcon('close'),()=>{selected=null;renderDetail()},'tryon-selected-close',{'aria-label':'ปิดรายละเอียดชิ้นที่เลือก'})),
    h('h3',{class:'tryon-selected-title'},item.title),
    h('strong',{class:'tryon-selected-price'},`${money(variant.price)} `,h('small',{},'/ วัน')),
    h('div',{class:'studio-sizes',role:'group','aria-label':'เลือกไซซ์'},...item.sizeVariants.map(size=>btn(size.size,()=>wear(item,size),size.id===variant.id?'dark':'secondary',{'aria-label':`ไซซ์ ${size.size}${size.stock?'':' หมด'}`,'aria-pressed':String(size.id===variant.id)}))),
    h('p',{class:'tryon-selected-measures'},`ไหล่ ${m.shoulder??'—'} · อก ${m.chest??'—'} · เอว ${m.waist??'—'} · สะโพก ${m.hip??'—'} · ยาว ${m.length??'—'} ซม.`),
    h('div',{class:'tryon-selected-actions'},btn(worn?'ถอดชิ้นนี้':'ลองชิ้นนี้',()=>{if(worn){delete profile.outfit[item.attachmentSlot];return saveOutfit();}return wear(item,variant)},'secondary'),btn('เช่าชิ้นนี้',()=>ctx.rental(item.id,variant.id),'dark',{disabled:item.status!=='active'||!variant.stock||item.sellerId===actor})),
    h('a',{class:'tryon-selected-product',href:`#product/${item.id}`},'รายละเอียดสินค้า',lineIcon('arrow'))
   );
   renderFit();
   return;
  }
  const sizes=h('div',{class:'studio-sizes'},...item.sizeVariants.map(v=>btn(`${v.size}${v.stock?'':' · หมด'}`,()=>wear(item,v),v.id===variant.id?'dark':'secondary',{'aria-pressed':String(v.id===variant.id)})));
  const photo=cover(item),credit=item.photoCredit;detail.replaceChildren(h('div',{class:'studio-detail-heading'},h('div',{},h('small',{},`${SLOTS[item.attachmentSlot]} / ${item.theme||''}`),h('h2',{},item.title)),btn('×',()=>{selected=null;renderDetail()},'icon',{'aria-label':'ปิดรายละเอียด'})),h('div',{class:'studio-detail-content'},h('div',{},h('img',{class:'studio-detail-photo',src:photoUrl(photo),alt:`ภาพถ่ายอ้างอิง ${item.title}`}),credit?h('small',{class:'studio-credit'},'Photo: ',credit.creator||'Source', ' · ',h('a',{href:credit.sourceUrl,target:'_blank',rel:'noopener noreferrer'},credit.license||'Source & license')):muted('ไม่มีข้อมูลเครดิตภาพ')),h('div',{},muted(`ร้าน ${seller(item.sellerId)} · ${item.description}`),h('strong',{class:'studio-detail-price'},`${money(variant.price)} / วัน`),sizes,muted(`ไหล่ ${variant.measurements.shoulder} · อก ${variant.measurements.chest} · เอว ${variant.measurements.waist} · สะโพก ${variant.measurements.hip} · ยาว ${variant.measurements.length} ซม.`),btn(worn?'ถอดชิ้นนี้':'ลองบนหุ่น',()=>{if(worn){delete profile.outfit[item.attachmentSlot];return saveOutfit();}return wear(item,variant)},'secondary'),btn('เช่าชิ้นนี้',()=>ctx.rental(item.id,variant.id),'dark',{disabled:item.status!=='active'||!variant.stock||item.sellerId===actor}),h('a',{class:'text-btn',href:`#product/${item.id}`},'รายละเอียดสินค้า ↗'))),
   ['top','bottom'].includes(item.attachmentSlot)?h('div',{class:'studio-fit'},h('h3',{},'ประมาณการจากขนาดที่วัด'),...calculateFit(body(),variant.measurements,item.lengthTarget).filter(r=>item.attachmentSlot==='top'?['shoulder','chest','waist'].includes(r.key):['waist','hip','length'].includes(r.key)).map(r=>h('p',{},`${r.label}: ${r.status.replace('_',' ')} — ${r.explanation}`))):document.createDocumentFragment(),
   muted('3D สร้างประมาณจากภาพถ่าย ไม่ใช่สแกนสินค้า สี ทรง และความพอดีอาจต่างจากของจริง'));renderFit();}
 const modeled=state.listings.filter(item=>item.model?.url&&item.attachmentSlot&&item.status!=='deleted');
 const occasionOptions=[['','ทั้งหมด (All Categories)'],...OCCASION_CATEGORIES.map(key=>[key,OCCASION_LABELS[key].title,modeled.filter(item=>(item.occasionCategory||'costume')===key).length])];
 const themeOptions=[['','ทุกธีม (All Themes)'],...['academy','fantasy','gothic'].map(key=>[key,({academy:'Academy',fantasy:'Fantasy',gothic:'Gothic'})[key],modeled.filter(item=>item.theme===key).length])];
 const themeMenu=menuSelect({label:'ธีม',options:themeOptions,value:theme,onChange:value=>{theme=value;renderGrid()},className:'studio-theme-select'});
 themeMenu.hidden=occasion!=='costume';
 const toolbar=h('div',{class:'studio-toolbar'},h('label',{class:'studio-search'},figmaIcon('studio','imgSvg'),h('input',{type:'search',placeholder:'ค้นหาชิ้นส่วน / ตัวละคร','aria-label':'ค้นหาชิ้นส่วน',oninput:e=>{query=e.target.value;renderGrid()}})),menuSelect({label:'หมวดหมู่',options:occasionOptions,value:occasion,onChange:value=>{occasion=value;if(value!=='costume'){theme='';themeMenu.setValue('')}themeMenu.hidden=value!=='costume';renderGrid()}}),themeMenu);
 const categories=h('div',{class:'studio-categories'},...Object.entries({'':'ทุกชิ้น',top:'เสื้อ',bottom:'กางเกง',wig:'วิก',accessory:'เครื่องประดับ'}).map(([key,label])=>btn(label,()=>{category=key;categories.querySelectorAll('button').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.category===key)));renderGrid()},'',{'data-category':key,'aria-pressed':String(key==='')})));
 const genderRow=h('div',{class:'studio-gender-row'},h('strong',{},'Gender'),stylePicker);
 const stagePanel=h('div',{class:'studio-left'},
    h('div',{class:'studio-view'},h('div',{class:'studio-stage-top'},h('strong',{},figmaIcon('studio','imgContainer18'),mode==='tryon'?'ชุดที่กำลังลอง':'สัดส่วนร่างกาย')),host,h('div',{class:'studio-camera'},btn('หน้า',()=>renderer?.view(0)),btn('ซ้าย',()=>renderer?.view(-Math.PI/2)),btn('หลัง',()=>renderer?.view(Math.PI)),btn('ขวา',()=>renderer?.view(Math.PI/2)),btn(lineIcon('plus'),()=>renderer?.zoom(.85),'secondary',{'aria-label':'ขยายหุ่น'}),btn(lineIcon('minus'),()=>renderer?.zoom(1.15),'secondary',{'aria-label':'ย่อหุ่น'})),status,btn('โหลด 3D ใหม่',()=>renderer?.retry(),'studio-retry text-btn')),
   mode==='studio'?h('div',{class:'studio-ratios'},h('div',{},h('small',{},'อัตราส่วน เอว-อก'),waistChest),h('div',{},h('small',{},'อัตราส่วน เอว-สะโพก'),waistHip),h('div',{},h('small',{},'ขนาดแนะนำ'),h('strong',{},'Asian M / US S'))):document.createDocumentFragment());
 const profilePanel=h('aside',{class:'studio-profile-panel'},
   h('div',{class:'studio-profile-heading'},h('div',{},h('h2',{},'ปรับสัดส่วนร่างกาย'),muted('แก้ไขค่าร่างกายของหุ่นจำลอง')),btn([figmaIcon('studio','imgContainer5'),'Reset'],()=>{profile.bodies[profile.style]=structuredClone(BODY_DEFAULTS[profile.style]);renderBody();draw();renderDetail()})),
   h('section',{class:'studio-measurements'},measurements,bodyError,h('div',{class:'row'},btn([figmaIcon('studio','imgContainer12'),'บันทึกหุ่น'],async()=>{if(!actor){ctx.accounts();return;}await ctx.run('studio.body.save',{style:profile.style,body:body()});ctx.toast('บันทึกสัดส่วนแล้ว')},'dark'),h('a',{class:'secondary',href:'#tryon'},figmaIcon('studio','imgContainer13'),'ไป Virtual Try-On')),muted('ปรับหุ่นที่หน้านี้ แล้วนำสัดส่วนไปใช้เปรียบเทียบในห้องลองชุด')));
 const libraryPanel=h('section',{class:'studio-right studio-catalog-panel'},h('div',{class:'studio-catalog-heading'},h('div',{},h('p',{class:'eyebrow'},'CLOTHING LIBRARY'),h('h2',{},'เลือกชิ้นที่อยากลอง')),count),detail,toolbar,categories,grid,h('p',{class:'studio-footnote'},'ภาพถ่ายอ้างอิงพร้อมเครดิต · ประกาศและราคาเป็นข้อมูลเดโม'));
 const root=h('section',{class:`mix-studio ${mode==='tryon'?'tryon-unified':'studio-body-only'}`},
   breadcrumb(mode==='tryon'?[['Marketplace','#shop'],['Virtual Try-On']]:[['Marketplace','#shop'],['3D Studio']]),
   h('div',{class:'studio-intro'},h('div',{},h('h1',{},mode==='tryon'?'Virtual Try-On ห้องลองชุดเสมือนจริง':'3D Studio หุ่นจำลองสัดส่วน'),muted(mode==='tryon'?'ลองผสมเสื้อผ้าหลายชิ้นจากหลายร้านบนหุ่น 3D ในหน้านี้':'ปรับสัดส่วนหุ่นเพื่อใช้ประเมินความพอดีของชุด')),mode==='tryon'?h('a',{class:'secondary',href:'#studio'},'ปรับหุ่นใน 3D Studio'):ready),
   mode==='tryon'?h('div',{class:'tryon-unified-layout'},h('aside',{class:'tryon-unified-controls'},fitSummary,libraryPanel),stagePanel,rentalSummary):h('div',{class:'studio-layout'},stagePanel,profilePanel));
 status.closest('.studio-view').after(muted('พรีวิวจัดทรงตามหุ่นอัตโนมัติ · โมเดลโดยประมาณ ไม่รับประกันความพอดีจริง'));
 updateReady();renderBody();renderEquipped();renderDetail();renderGrid();renderRental();renderLooks();
 import('./studio-renderer.js').then(module=>{if(!alive)return;renderer=module.createStudioRenderer(host,report);draw();}).catch(()=>report(['เปิด 3D ไม่สำเร็จ เบราว์เซอร์ต้องรองรับ WebGL และต้องมีไฟล์ Three.js ในเครื่อง']));
  return {element:root,async wearItem(id,variantId){const item=getItem(id);if(!item?.model||!item.attachmentSlot)throw Error('ชิ้นนี้ยังไม่มีโมเดลสำหรับลองบนหุ่น 3D');const variant=item.sizeVariants.find(v=>v.id===variantId)||item.sizeVariants.find(v=>v.stock)||item.sizeVariants[0];await wear(item,variant);},update(next){state=next;const nextActor=state.settings.currentUserId,actorChanged=actor!==nextActor;actor=nextActor;profile=profileStudio(state,actor);if(actorChanged){selected=mode==='tryon'?firstSelected():null;look='custom'}updateReady();renderBody();stylePicker.querySelectorAll('button').forEach((el,i)=>el.setAttribute('aria-pressed',String(['female','male'][i]===profile.style)));for(const [slot,ref]of Object.entries(profile.outfit))if(!getItem(ref.listingId)||getItem(ref.listingId).status==='deleted')delete profile.outfit[slot];draw();renderEquipped();renderGrid();renderDetail();renderRental();renderLooks();},dispose(){alive=false;renderer?.dispose();}};
}
