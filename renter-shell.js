import {h} from './dom.js';

// Original exported SVG files. Keep their intrinsic geometry.
export const figmaIcon=(page,name)=>h('img',{class:'figma-asset',src:`assets/renter-figma/${page}-${name}.svg`,alt:'','aria-hidden':'true'});
export function renterHeader({profile,accounts,search,bag,bagCount}){
  const icon=(name)=>figmaIcon('studio',name);
  return h('header',{class:'renter-header'},
    h('a',{class:'renter-brand',href:'#home','aria-label':'TooSuePha หน้าแรก'},'Too',h('span',{},'SuePha')),
    h('nav',{class:'renter-mode','aria-label':'เลือกโหมด'},h('a',{href:'#shop',class:'active'},'เช่า'),h('a',{href:'#closet/overview'},'ปล่อยเช่า')),
    h('form',{class:'renter-search',role:'search',onsubmit:e=>{e.preventDefault();search(e.currentTarget.querySelector('input').value)}},icon('imgSvg'),h('input',{type:'search',placeholder:'ค้นหาชุดที่คุณกำลังมองหา...','aria-label':'ค้นหา Marketplace'})),
    h('nav',{class:'renter-actions','aria-label':'บัญชีและรายการเช่า'},h('a',{href:'#rentals',title:'My Rentals','aria-label':'My Rentals'},icon('imgContainer')),h('a',{href:'#saved',title:'Saved','aria-label':'Saved'},icon('imgContainer1')),h('button',{type:'button',onclick:bag,title:`รายการเช่า · ${bagCount}`,'aria-label':`รายการเช่า · ${bagCount}`},icon('imgContainer2')),h('button',{type:'button',class:'renter-account',onclick:accounts,'aria-label':'บัญชี '+(profile?.name||'เข้าสู่ระบบ')},h('span',{class:'renter-avatar'},profile?.name?.slice(0,2).toUpperCase()||'?'),icon('imgContainer3'))));
}
export function renterFooter(accounts){return h('footer',{class:'renter-footer'},h('div',{},h('a',{href:'#home',class:'renter-footer-mark','aria-label':'TooSuePha หน้าแรก'},h('b',{},'TOO'),h('span',{},'SUEA'),h('span',{},'PHA')),h('p',{},'© 2026 TooSuePha แพลตฟอร์มที่เปลี่ยนเสื้อผ้าในตู้ให้เช่าและแบ่งปันได้')),h('nav',{'aria-label':'ความช่วยเหลือ'},h('span',{},'นโยบายคุ้มครอง'),h('a',{href:'#studio'},'มาตรฐานการวัดไซส์'),h('span',{},'ความปลอดภัย'),h('span',{},'ช่วยเหลือ')))}
export function breadcrumb(parts){return h('nav',{class:'renter-breadcrumb','aria-label':'Breadcrumb'},...parts.flatMap(([title,href],i)=>[i?figmaIcon('studio','imgContainer4'):null,href?h('a',{href},title):h('strong',{},title)]))}
