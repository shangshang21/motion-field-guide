// One quiet footer. Everything else stays available when it is useful.
import {catalog,exhibitByKey} from './catalog.js';
import {loadModule} from './lazy.js';
import {phrase,say} from './core.js';
let openCard=null;
function close(root,focus=false){if(!root)return;root.querySelector(':scope > .card-tools').hidden=true;const toggle=root.querySelector('.tools-toggle');toggle.setAttribute('aria-expanded','false');if(focus)toggle.focus();if(openCard===root)openCard=null;}
export function cardTools(root){
 if(root.querySelector(':scope > .card-tools'))return root.querySelector(':scope > .card-tools');
 const key=root.dataset.k,entry=exhibitByKey.get(key),footer=root.querySelector('footer');
 const name=document.createElement('div');name.className='card-name';name.append(footer.querySelector('b'),footer.querySelector('em'));
 const panel=document.createElement('div');panel.className='card-tools';panel.id=`tools-${key}`;panel.hidden=true;panel.setAttribute('role','group');panel.setAttribute('aria-label',`${entry.name}的工具`);
 const q=footer.querySelector('.q');q.textContent='听讲解 ↗';q.setAttribute('aria-label',`听讲解：${entry.name}`);q.onclick=async()=>{await loadModule(entry.module);say(key);};panel.append(q);
 const toolbar=document.createElement('div');toolbar.className='card-toolbar mono';
 toolbar.innerHTML=`<button class="card-copy" aria-label="复制${entry.name}的口令" title="复制当前手感的口令">口令 ↗</button><button class="tools-toggle" aria-expanded="false" aria-controls="tools-${key}" aria-label="展开${entry.name}的工具">工具 <span aria-hidden="true">···</span></button>`;
 footer.append(name,toolbar);footer.after(panel);
 toolbar.querySelector('.tools-toggle').onclick=()=>{if(!panel.hidden){close(root);return;}close(openCard);openCard=root;panel.hidden=false;toolbar.querySelector('.tools-toggle').setAttribute('aria-expanded','true');};
 toolbar.querySelector('.card-copy').onclick=async e=>{const button=e.currentTarget;const label=text=>{button.textContent=text;button.setAttribute('aria-label',`${text}，复制${entry.name}的口令`);};try{await loadModule(entry.module);const text=phrase(key);try{await navigator.clipboard.writeText(text);}catch{const input=document.createElement('textarea');input.value=text;input.style.cssText='position:fixed;opacity:0';document.body.append(input);input.select();document.execCommand('copy');input.remove();}label('已复制 ✓');setTimeout(()=>label('口令 ↗'),1600);}catch{label('再试一次');}};
 for(const selector of ['.demo-tools','.lab-tools','.type-actions','.exhibit-feelings','.card-actions','.ab-tools']){const node=root.querySelector(selector);if(node)panel.append(node);}
 return panel;
}
for(const entry of catalog){const root=document.querySelector(`.card[data-k="${entry.key}"]`);if(root)cardTools(root);}
document.addEventListener('pointerdown',e=>{if(openCard&&!openCard.contains(e.target))close(openCard);},{passive:true});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openCard&&!document.querySelector('dialog[open]')){e.preventDefault();close(openCard,true);}});
