import {photoUrl} from './dom.js';

export const PRESETS = Object.freeze({Slim:Object.freeze({height:165,chest:82,waist:64,hip:88,shoulder:37,preset:'Slim'}),Regular:Object.freeze({height:165,chest:90,waist:72,hip:96,shoulder:40,preset:'Regular'}),Curvy:Object.freeze({height:165,chest:102,waist:82,hip:110,shoulder:43,preset:'Curvy'})});
export const BODY_LIMITS = {height:[120,220],chest:[50,180],waist:[40,160],hip:[50,190],shoulder:[25,65]};
const labels={height:'ส่วนสูง',shoulder:'ไหล่',chest:'รอบอก',waist:'รอบเอว',hip:'รอบสะโพก',length:'ความยาว'};
export const LENGTH_RATIOS=Object.freeze({waist:.22,knee:.52,ankle:.76});
const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
export function validateBody(body){return Object.entries(BODY_LIMITS).flatMap(([key,[min,max]])=>typeof body?.[key]!=='number'||!Number.isFinite(body[key])||body[key]<min||body[key]>max?[`${labels[key]}ต้องอยู่ระหว่าง ${min}–${max} ซม.`]:[])}
export function calculateFit(body,measurements={},lengthTarget){return ['shoulder','chest','waist','hip','length'].map(key=>{
  const expected=key==='length'?positive(body?.height)&&LENGTH_RATIOS[lengthTarget]?body.height*LENGTH_RATIOS[lengthTarget]:null:body?.[key];
  const bodyKey=key==='length'?'height':key,[min,max]=BODY_LIMITS[bodyKey];
  if(!positive(expected)||!positive(measurements?.[key])||body[bodyKey]<min||body[bodyKey]>max)return {key,label:labels[key],status:'unknown',delta:null,explanation:'ข้อมูลขนาดไม่ครบหรือไม่ถูกต้อง จึงยังประเมินไม่ได้'};
  const delta=Math.round((measurements[key]-expected)*100)/100;
  const raw=measurements[key]-expected;
  let status=key==='length'?(raw< -5?'short':raw>5?'long':'good'):raw<0?'tight':raw<=(key==='shoulder'?2:6)?'good':raw<=(key==='shoulder'?4:12)?'slightly_loose':'loose';
  const text={tight:'เล็กกว่าสัดส่วนหุ่น',good:'อยู่ในช่วงพอดีโดยประมาณ',slightly_loose:'หลวมเล็กน้อย',loose:'มีพื้นที่เผื่อค่อนข้างมาก',short:'สั้นกว่าจุดความยาวที่เลือก',long:'ยาวกว่าจุดความยาวที่เลือก'};
  return {key,label:labels[key],status,delta,explanation:`${text[status]} (${delta>0?'+':''}${delta} ซม.)${key==='length'?' · วัดจากไหล่':''}`};
})}
export function calculateFitMatch(body,listing,variant){
  if(!body||validateBody(body).length)return null;
  const type=listing?.category||listing?.attachmentSlot||'';
  const required=type==='top'?['shoulder','chest','waist']:type==='bottom'?['waist','hip','length']:['wig','accessory','face','neck','hair'].includes(type)?[]:['shoulder','chest','waist','hip','length'];
  if(!required.length)return null;
  const rows=calculateFit(body,variant?.measurements,listing?.lengthTarget).filter(row=>required.includes(row.key));
  if(rows.length!==required.length||rows.some(row=>row.status==='unknown'))return null;
  const points={good:100,slightly_loose:75,loose:40,tight:20,short:40,long:40};
  let score=Math.round(rows.reduce((sum,row)=>sum+points[row.status],0)/rows.length);
  if(rows.some(row=>row.status==='tight'))score=Math.min(score,49);
  return {score,rows,required};
}

// Circumference is mapped to a front silhouette, not a physical 3D simulation.
export function bodyGeometry(body){
  const b=Object.fromEntries(Object.entries(BODY_LIMITS).map(([k,[min,max]])=>[k,positive(body?.[k])?Math.min(max,Math.max(min,body[k])):PRESETS.Regular[k]]));
  const y=v=>550+(v-550)*(1+(b.height-165)/800);
  return {height:b.height,head:y(65),shoulderY:y(130),chestY:y(185),waistY:y(260),hipY:y(305),kneeY:y(410),ankleY:550,shoulder:b.shoulder*4,chest:b.chest*150/90,waist:b.waist*120/72,hip:b.hip*160/96};
}
export function garmentGeometry(measurements={},lengthTarget='ankle'){
  const ratio=(key,base)=>positive(measurements?.[key])?measurements[key]/base:1;
  return {shoulder:ratio('shoulder',40),chest:ratio('chest',90),waist:ratio('waist',72),hip:ratio('hip',96),length:ratio('length',165*(LENGTH_RATIOS[lengthTarget]||LENGTH_RATIOS.ankle))};
}
const NS='http://www.w3.org/2000/svg';
function svg(tag,attrs={},...children){const el=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,String(value));for(const child of children)el.append(typeof child==='string'?document.createTextNode(child):child);return el}
let sequence=0;
export function renderMannequin(body,listing=null,variant=null,{guides=false}={}){
  const g=bodyGeometry(body),id=`dressform-${++sequence}`,s=g.shoulder/2,c=g.chest/2,w=g.waist/2,h=g.hip/2;
  const root=svg('svg',{viewBox:'0 0 400 600',class:'mannequin-svg',role:'img','aria-labelledby':`${id}-title`,width:'100%',preserveAspectRatio:'xMidYMid meet'},svg('title',{id:`${id}-title`},'หุ่นจำลองสัดส่วนและชุดคอสเพลย์แบบ 2 มิติ'));
  root.append(svg('defs',{},svg('linearGradient',{id:`${id}-linen`,x1:'0',y1:'0',x2:'1',y2:'0'},svg('stop',{offset:'0%','stop-color':'#c7b5a0'}),svg('stop',{offset:'38%','stop-color':'#f1e6d6'}),svg('stop',{offset:'67%','stop-color':'#e4d5c0'}),svg('stop',{offset:'100%','stop-color':'#b8a48d'}))));
  root.append(svg('ellipse',{cx:200,cy:582,rx:90,ry:10,fill:'#43372b',opacity:.08}),svg('path',{d:'M200 506V575M155 578H245',stroke:'#89745c','stroke-width':7,'stroke-linecap':'round'}));
  const fill=`url(#${id}-linen)`,line='#ab967f';
  root.append(svg('ellipse',{cx:200,cy:g.head,rx:23,ry:30,fill,stroke:line}),svg('path',{d:`M187 ${g.head+25} L187 ${g.shoulderY-8} L213 ${g.shoulderY-8} L213 ${g.head+25}`,fill,stroke:line}));
  const torso=`M187 ${g.shoulderY-10} Q${200-s} ${g.shoulderY-8} ${200-s} ${g.shoulderY} Q${200-c-8} ${g.chestY-15} ${200-c} ${g.chestY} C${200-c} ${g.chestY+30} ${200-w} ${g.waistY-22} ${200-w} ${g.waistY} C${200-w} ${g.waistY+18} ${200-h} ${g.hipY-18} ${200-h} ${g.hipY} Q${200-h} ${g.hipY+30} 200 ${g.hipY+42} Q${200+h} ${g.hipY+30} ${200+h} ${g.hipY} C${200+h} ${g.hipY-18} ${200+w} ${g.waistY+18} ${200+w} ${g.waistY} C${200+w} ${g.waistY-22} ${200+c} ${g.chestY+30} ${200+c} ${g.chestY} Q${200+c+8} ${g.chestY-15} ${200+s} ${g.shoulderY} Q${200+s} ${g.shoulderY-8} 213 ${g.shoulderY-10} Z`;
  for(const side of [-1,1])root.append(svg('path',{d:`M${200+side*h*.5} ${g.hipY+20} Q${200+side*35} ${g.kneeY} ${200+side*23} 543`,fill:'none',stroke:'#cfbea8','stroke-width':27,'stroke-linecap':'round'}),svg('path',{d:`M${200+side*(s-5)} ${g.shoulderY+10} Q${200+side*(s+22)} ${g.chestY+25} ${200+side*(h+18)} ${g.hipY+40}`,fill:'none',stroke:'#d4c2ac','stroke-width':18,'stroke-linecap':'round'}));
  root.append(svg('path',{d:torso,fill,stroke:line,'stroke-width':1.3}),svg('path',{d:`M200 ${g.shoulderY-9} V${g.hipY+40} M${200-w} ${g.waistY} Q200 ${g.waistY+8} ${200+w} ${g.waistY}`,fill:'none',stroke:'#9e866b',opacity:.5,'stroke-dasharray':'3 4'}));
  const sizing=garmentGeometry(variant?.measurements,listing?.lengthTarget);
  const ordered=[...(listing?.costumeLayers||[])].sort((a,b)=>['base','outer','shoes','wig','accessory'].indexOf(a.slot)-['base','outer','shoes','wig','accessory'].indexOf(b.slot));
  for(const layer of ordered){const src=photoUrl(layer);if(!src)continue;const x=Number.isFinite(layer.x)?layer.x:0,y=Number.isFinite(layer.y)?layer.y:0,scale=positive(layer.scale)?layer.scale:1;
    const group=svg('g',{'data-layer':layer.id||layer.slot,transform:`translate(${x} ${y}) translate(200 130) scale(${scale}) translate(-200 -130)`});
    // Horizontal slices preserve independently supplied shoulder, bust, waist and hip widths.
    const bands=layer.slot==='base'||layer.slot==='outer'?[[0,156,sizing.shoulder],[156,220,sizing.chest],[220,282,sizing.waist],[282,600,sizing.hip]]:[[0,600,1]];
    const vertical=layer.slot==='base'||layer.slot==='outer'?sizing.length:1;
    for(const [from,to,width]of bands){const band=svg('svg',{x:200-200*width,y:130+(from-130)*vertical,width:400*width,height:(to-from)*vertical,viewBox:`0 ${from} 400 ${to-from}`,preserveAspectRatio:'none',overflow:'hidden'});band.append(svg('image',{href:src,x:0,y:0,width:400,height:600,preserveAspectRatio:'none'}));group.append(band)}root.append(group);
  }
  if(guides)for(const [key,y,width]of [['shoulder',g.shoulderY,g.shoulder],['chest',g.chestY,g.chest],['waist',g.waistY,g.waist],['hip',g.hipY,g.hip]])root.append(svg('line',{x1:200-width/2-12,x2:200+width/2+12,y1:y,y2:y,stroke:'#806248','stroke-dasharray':'4 4',opacity:.8}),svg('text',{x:12,y:y-5,fill:'#66503b','font-size':11,'font-family':'sans-serif'},`${labels[key]} ${body?.[key]??'—'}`));
  root.append(svg('text',{x:200,y:598,'text-anchor':'middle',fill:'#9b8875','font-size':9,'font-family':'sans-serif','letter-spacing':2},'ATELIER / PERSONAL FORM'));
  return root;
}


