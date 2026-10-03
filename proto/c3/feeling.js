import {catalog,feelings} from './catalog.js';
import {navigateExhibit} from './phrase.js';
import {motion} from './core.js';
const index=document.querySelector('#feeling-index'),filters=index.querySelector('.feeling-filters'),results=index.querySelector('.feeling-results'),count=document.querySelector('#feeling-count'),more=index.querySelector('.feeling-more'),clear=document.querySelector('#feeling-clear');
const selected=new Set();let expanded=false;
const hallNames=[...new Set(catalog.map(e=>e.hall))],representatives=[];
for(let i=0;i<12;i++)for(const hall of hallNames){const exhibit=catalog.filter(e=>e.hall===hall)[i];if(exhibit)representatives.push(exhibit);}
export function matchingExhibits(tags){return catalog.filter(e=>tags.every(t=>e.tags.includes(t)));}
for(const feeling of ['全部',...feelings]){
 const button=document.createElement('button');button.type='button';button.dataset.feeling=feeling;button.setAttribute('aria-pressed',String(feeling==='全部'));
 const amount=feeling==='全部'?catalog.length:catalog.filter(e=>e.tags.includes(feeling)).length;
 const title=document.createElement('span');title.textContent=feeling;const total=document.createElement('small');total.textContent=String(amount).padStart(2,'0');button.append(title,total);
 button.addEventListener('click',()=>{if(feeling==='全部')selected.clear();else selected.has(feeling)?selected.delete(feeling):selected.add(feeling);expanded=false;render();});filters.append(button);
}
function render(){
 const matches=selected.size?matchingExhibits([...selected]):representatives,shown=expanded?matches:matches.slice(0,12);
 filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.feeling==='全部'?!selected.size:selected.has(b.dataset.feeling))));
 count.textContent=`找到 ${matches.length} 件${selected.size?' / '+[...selected].join(' + '):' / 八个展厅'}`;clear.disabled=!selected.size;
 results.replaceChildren();
 for(const exhibit of shown){
  const link=document.createElement('a');link.href=`#exhibit-${exhibit.key}`;link.className='feeling-result';link.dataset.exhibit=exhibit.key;link.dataset.tags=exhibit.tags.join(' ');
  const top=document.createElement('span');top.className='mono feeling-result-top';top.textContent=`Nº${exhibit.no} / ${exhibit.hallName}`;
  const title=document.createElement('b');title.textContent=exhibit.name;const en=document.createElement('em');en.textContent=exhibit.en;
  const tags=document.createElement('span');tags.className='feeling-result-tags';exhibit.tags.forEach(t=>{const label=document.createElement('small');label.textContent=t;label.classList.toggle('selected',selected.has(t));tags.append(label);});
  const arrow=document.createElement('i');arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');link.append(top,title,en,tags,arrow);
  link.addEventListener('click',async e=>{e.preventDefault();try{await navigateExhibit(exhibit.key,{replay:true});}catch(error){count.textContent=error.message;}});results.append(link);
 }
 index.querySelector('.feeling-empty').hidden=!!matches.length;more.hidden=matches.length<=12;more.textContent=expanded?'收起列表 ↙':`展开全部 ${matches.length} 件 ↗`;
}
clear.addEventListener('click',()=>{selected.clear();expanded=false;render();});more.addEventListener('click',()=>{expanded=!expanded;render();});
// Every display label is also a shortcut back to the directory.
for(const exhibit of catalog){
 const root=document.querySelector(`[data-k="${exhibit.key}"]`);root.id=`exhibit-${exhibit.key}`;root.dataset.feelings=exhibit.tags.join(' ');
 const labels=document.createElement('span');labels.className='exhibit-feelings';labels.setAttribute('aria-label','感觉标签');
 exhibit.tags.forEach(tag=>{const button=document.createElement('button');button.type='button';button.textContent=tag;button.setAttribute('aria-label',`查找“${tag}”的动效`);button.addEventListener('click',()=>{selected.clear();selected.add(tag);expanded=false;render();document.querySelector('#dX').click();index.scrollIntoView({behavior:motion.reduced?'instant':'smooth',block:'start'});});labels.append(button);});
 (root.querySelector('.card-tools')||root.querySelector('footer')).append(labels);
}
render();
