// Original illustrated demo costumes, not photographs of physical stock.
const catalog=[['luna','Luna Astralis','Moonlit Archive','gown'],['ember','Ember Vale','Crimson Guild','coat'],['flora','Flora Sylven','Verdant Court','gown'],['celeste','Celeste Aria','Starfall Academy','uniform'],['raven','Raven Noctis','Midnight Masquerade','gown'],['aurora','Aurora Frost','Crystal Dominion','gown'],['scarlet','Scarlet Finch','Skybound Corsairs','coat'],['mika','Mika Hanami','Sakura Reverie','robe'],['sol','Sol Aurelius','Sunforge Order','armor'],['iris','Iris Spellweaver','Violet Atelier','robe'],['aqua','Aqua Marina','Pearl Odyssey','uniform'],['nova','Nova Flux','Neon Horizon','coat']];
export function makeCosplaySeed(now=Date.now(),legacy=null){
 const defaults=[{id:'u1',name:'Minnie',email:'minnie@example.com'},{id:'u2',name:'June',email:'june@example.com'},{id:'u3',name:'Ploy',email:'ploy@example.com'}];
 const profiles=Array.isArray(legacy?.profiles)&&legacy.profiles.length?structuredClone(legacy.profiles):defaults;
 for(const profile of defaults)if(!profiles.some(p=>p.id===profile.id))profiles.push(profile);
 const currentUserId=legacy?.settings?.currentUserId===null?null:(profiles.some(p=>p.id===legacy?.settings?.currentUserId)?legacy.settings.currentUserId:'u1');
 const listings=catalog.map(([id,character,series,kind],i)=>{
  const defect=i===2||i===7,condition=defect?'defect':i%3===0?'like_new':'good',lengthTarget=['gown','coat','robe'].includes(kind)?'ankle':'knee';
  const photos=['front','back',...(defect?['defect']:[])].map(tag=>({id:`${id}-${tag}`,src:`cosplay-assets/${id}-${tag}.svg`,tag,hash:`original-${id}-${tag}-v1`}));
  const sizes=i%3===0?['S','M','L']:i%3===1?['M','L']:['S','M','L','XL'];
  return {id:`cos-${id}`,sellerId:['u2','u3','u1'][i%3],character,title:`${character} · ${kind==='gown'?'ชุดเดรสแฟนตาซี':kind==='coat'?'ชุดนักผจญภัย':kind==='robe'?'ชุดคลุมแฟนตาซี':kind==='armor'?'ชุดเกราะอัศวิน':'ชุดยูนิฟอร์ม'}`,series,description:`ชุดคอสเพลย์ตัวละครออริจินัล ${character} จาก ${series} พร้อมวิก ชุดหลัก เสื้อคลุม และเครื่องประดับ โทนสีเข้าชุดกัน เหมาะกับงานคอสเพลย์และถ่ายภาพ ภาพประกอบต้นฉบับสำหรับสาธิตระบบ ไม่ใช่ภาพสินค้าจริง`,components:['วิก','ชุดหลัก','เสื้อคลุม','เครื่องประดับ','รองเท้า'],condition,photos,coverId:photos[0].id,defects:defect?[{photoId:`${id}-defect`,type:'ด้ายหลุด',severity:'เล็กน้อย',description:'มีด้ายหลุดบริเวณชายชุดประมาณ 2 ซม. แสดงในภาพรายละเอียด'}]:[],costumeLayers:['shoes','base','outer','wig','accessory'].map(slot=>({id:`${id}-${slot}`,slot,src:`cosplay-assets/${id}-${slot}.svg`,x:0,y:0,scale:1})),lengthTarget,sizeVariants:sizes.map(size=>{const offset={S:-6,M:0,L:6,XL:12}[size];return {id:`${id}-${size}`,size,price:1290+i*140+(size==='XL'?100:0),stock:1,measurements:{shoulder:42+offset/3,chest:96+offset,waist:78+offset,hip:102+offset,length:(lengthTarget==='ankle'?125:82)+offset/3}};}),status:'active',publishedAt:now-(i+1)*86400000,updatedAt:now-(i+1)*86400000};
 });
 return {version:3,profiles,settings:{currentUserId},listings,orders:[],rentals:[],favorites:Object.fromEntries(profiles.map(p=>[p.id,[]])),mannequins:{},events:[]};
}
export const makeSeed=makeCosplaySeed;
