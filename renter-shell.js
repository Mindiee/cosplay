import {h} from './dom.js';

// Original exported SVG files. Keep their intrinsic geometry.
export const figmaIcon=(page,name)=>h('img',{class:'figma-asset',src:`assets/renter-figma/${page}-${name}.svg`,alt:'','aria-hidden':'true'});
export function renterHeader({profile,accounts,search,searchValue='',notifications=[],bag,bagCount}){
  const icon=(name)=>figmaIcon('studio',name);
  const urgent=notifications.filter(row=>row.urgent).length;
  return h('header',{class:'renter-header'},
    h('a',{class:'renter-brand',href:'#home','aria-label':'TooSuePha หน้าแรก'},'Too',h('span',{},'SuePha')),
    h('nav',{class:'renter-mode','aria-label':'เลือกโหมด'},h('a',{href:'#shop',class:'active'},'เช่า'),h('a',{href:'#closet/overview'},'ปล่อยเช่า')),
    h('form',{class:'renter-search',role:'search',onsubmit:e=>{e.preventDefault();search(e.currentTarget.querySelector('input').value)}},icon('imgSvg'),h('input',{type:'search',value:searchValue,placeholder:'ค้นหาชุดที่คุณกำลังมองหา...','aria-label':'ค้นหา Marketplace'})),
    h('nav',{class:'renter-actions','aria-label':'บัญชีและรายการเช่า'},
      h('details',{class:'renter-notifications',onkeydown:e=>{if(e.key==='Escape'){e.currentTarget.open=false;e.currentTarget.querySelector('summary')?.focus()}}},
        h('summary',{'aria-label':`การแจ้งเตือน${urgent?` มี ${urgent} รายการที่ต้องดำเนินการ`:''}`,title:'การแจ้งเตือน'},icon('imgContainer'),urgent?h('span',{class:'notification-indicator'},String(urgent)):null),
        h('div',{class:'renter-notification-menu'},h('div',{class:'notification-menu-head'},h('b',{},'การแจ้งเตือน'),h('small',{},urgent?`${urgent} รายการต้องดำเนินการ`:'อัปเดตการเช่า')),
          notifications.length?notifications.slice(0,5).map(row=>h('a',{class:`renter-notification-item${row.urgent?' urgent':''}`,href:row.href},h('span',{},row.urgent?'ต้องดำเนินการ':'สถานะการเช่า'),h('b',{},row.title),h('small',{},row.detail),row.urgent?h('strong',{class:'notification-item-cta'},'ไปดำเนินการ'):null)):h('p',{class:'notification-empty'},'ยังไม่มีการแจ้งเตือนจากการเช่า'),
          h('a',{class:'notification-menu-all',href:notifications.some(row=>row.role==='lender')&&!notifications.some(row=>row.role==='renter')?'#closet/requests':'#rentals'},'ดูรายการเช่าทั้งหมด'))),
      h('a',{href:'#saved',title:'Saved','aria-label':'Saved'},icon('imgContainer1')),h('a',{href:'#rentals',title:'My Rentals','aria-label':'กระเป๋า ไปหน้า My Rentals'},icon('imgContainer2')),h('button',{type:'button',class:'renter-account',onclick:accounts,'aria-label':'บัญชี '+(profile?.name||'เข้าสู่ระบบ')},h('span',{class:'renter-avatar'},profile?.name?.slice(0,2).toUpperCase()||'?'),icon('imgContainer3'))));
}
export function renterFooter(accounts){return h('footer',{class:'renter-footer'},h('div',{},h('a',{href:'#home',class:'renter-footer-mark','aria-label':'TooSuePha หน้าแรก'},h('b',{},'TOO'),h('span',{},'SUEA'),h('span',{},'PHA')),h('p',{},'© 2026 TooSuePha แพลตฟอร์มที่เปลี่ยนเสื้อผ้าในตู้ให้เช่าและแบ่งปันได้')),h('nav',{'aria-label':'ความช่วยเหลือ'},h('span',{},'นโยบายคุ้มครอง'),h('a',{href:'#studio'},'มาตรฐานการวัดไซส์'),h('span',{},'ความปลอดภัย'),h('span',{},'ช่วยเหลือ')))}
export function breadcrumb(parts){return h('nav',{class:'renter-breadcrumb','aria-label':'Breadcrumb'},...parts.flatMap(([title,href],i)=>[i?figmaIcon('studio','imgContainer4'):null,href?h('a',{href},title):h('strong',{},title)]))}
