import {h} from './dom.js';

const iconPaths={
  close:['M5 5l14 14','M19 5 5 19'],
  plus:['M12 4v16','M4 12h16'],
  minus:['M4 12h16'],
  arrow:['M5 19 19 5','M8 5h11v11'],
  bag:['M5 8h14v12H5z','M9 8V6a3 3 0 0 1 6 0v2'],
  person:['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z','M4 21a8 8 0 0 1 16 0'],
};
export function lineIcon(name){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','line-icon');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('aria-hidden','true');
  for(const shape of iconPaths[name]||[]){
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d',shape);
    svg.append(path);
  }
  return svg;
}

// A small, keyboard-friendly menu for the visual filters in Marketplace and Try-On.
// Keep its value in the caller's existing state; opening the menu does not change a filter.
export function menuSelect({label,options,value='',onChange,className=''}){
  let selected=String(value);
  const root=h('details',{class:`ui-dropdown ${className}`.trim(),onkeydown:event=>{
    if(event.key==='Escape'){
      root.open=false;
      root.querySelector('summary')?.focus();
      event.stopPropagation();
    }
  },onfocusout:()=>requestAnimationFrame(()=>{
    if(!root.contains(document.activeElement))root.open=false;
  })});
  const text=h('span',{class:'ui-dropdown-value'});
  const summary=h('summary',{'aria-label':label},text,h('span',{class:'ui-dropdown-chevron','aria-hidden':'true'}));
  const menu=h('div',{class:'ui-dropdown-menu',role:'group','aria-label':label});
  const rows=options.map(([key,name,count])=>{
    const button=h('button',{type:'button',class:'ui-dropdown-option',onclick:()=>{
      selected=String(key);
      refresh();
      root.open=false;
      summary.focus();
      onChange?.(selected);
    }},h('span',{},name),Number.isFinite(count)?h('small',{},String(count)):null,h('span',{class:'ui-dropdown-check','aria-hidden':'true'}));
    menu.append(button);
    return {key:String(key),name,button};
  });
  function refresh(){
    text.textContent=rows.find(row=>row.key===selected)?.name||rows[0]?.name||'';
    for(const row of rows)row.button.setAttribute('aria-current',String(row.key===selected));
  }
  root.setValue=next=>{selected=String(next);refresh()};
  root.append(summary,menu);
  refresh();
  return root;
}
