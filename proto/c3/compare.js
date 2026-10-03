import {catalog,exhibitByKey} from './catalog.js';
import {loadModule} from './lazy.js';
import {registerPhraseExtension,refreshPhrase,say} from './core.js';
import {loop} from './frame.js';
const comparisons=new Map();
const controls=root=>[...root.querySelectorAll('[data-param]')].filter(e=>!e.closest('.ab-replica'));
export function snapshot(key){const root=document.querySelector(`[data-k="${key}"]`),values=Object.fromEntries(controls(root).map(i=>[i.dataset.param,i.tagName==='SELECT'?i.value:Number(i.value)]));const text=root.querySelector('.type-edit input');if(text)values.text=text.value;return values;}
export function validateSnapshot(key,values){
 if(!values||typeof values!=='object'||Array.isArray(values))throw Error('A/B 参数需要两组完整的数值。');
 const root=document.querySelector(`[data-k="${key}"]`),inputs=controls(root),expected=inputs.map(i=>i.dataset.param);if(root.querySelector('.type-edit input'))expected.push('text');
 if(Object.keys(values).length!==expected.length||expected.some(k=>!Object.hasOwn(values,k)))throw Error('A/B 参数与这件展品不匹配。');
 for(const input of inputs){const v=values[input.dataset.param];if(input.tagName==='SELECT'){if(![...input.options].some(o=>o.value===v))throw Error('A/B 的出发方向无效。');}else{const step=Number(input.step)||1,min=Number(input.min),max=Number(input.max);if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||Math.abs((v-min)/step-Math.round((v-min)/step))>1e-5)throw Error(`A/B 的 ${input.getAttribute('aria-label')} 超出范围。`);}}
 if(expected.includes('text')){const input=root.querySelector('.type-edit input');if(typeof values.text!=='string'||!values.text.trim()||values.text.length>input.maxLength||(key==='scramble'&&!/^[A-Z0-9 ./#&+_-]+$/.test(values.text)))throw Error('A/B 的文字无效。');}return values;
}
function apply(root,values){for(const [name,v] of Object.entries(values)){const input=name==='text'?root.querySelector('.type-edit input'):root.querySelector(`[data-param="${name}"]`);if(input){input.value=String(v);input.dispatchEvent(new Event(input.tagName==='SELECT'?'change':'input',{bubbles:true}));}}}
async function replica(root,key,values,side){
 const clone=root.cloneNode(true);clone.removeAttribute('data-k');clone.dataset.sourceKey=key;clone.classList.remove('card','active','phrase-arrival');clone.classList.add('ab-replica');
 clone.querySelectorAll('.ab-tools,.ab-panel,.card-actions,.exhibit-feelings').forEach(e=>e.remove());clone.querySelector('.lab-controls')?.replaceChildren();clone.querySelector('.bezier-values')?.replaceChildren();
 clone.querySelectorAll('[id]').forEach(e=>{const old=e.id;e.id=`ab-${key}-${side}-${old}`;clone.querySelectorAll(`[for="${old}"]`).forEach(label=>label.htmlFor=e.id);});
 if(key==='easing')clone.querySelector('pattern').id=`ab-grid-${side}`;
 return {clone,init:async()=>{
  if(['magnetic','trail','spotlight'].includes(key))(await import('./cursor.js')).createCursorComparison(key,clone);
  else if(['split','scramble'].includes(key))(await import('./type.js')).createTypeComparison(key,clone);
  else if(['easing','spring','duration','stagger'].includes(key))(await import('./timing.js')).createTimingComparison(key,clone);
  else {const {createGesture}=await import('./gesture.js');let wake=()=>{};const state={...values},controller=createGesture(clone.querySelector('.demo-stage'),key,state,{wake:()=>wake()});wake=loop(clone.querySelector('.demo-stage'),controller.tick);clone._replay=controller.play;clone._gestureState=state;}
  apply(clone,values);
 }};
}
const label=(values,key)=>Object.entries(values).map(([k,v])=>{const input=document.querySelector(`.card[data-k="${key}"] [data-param="${k}"]`),ctl=input?.closest('label'),name=k==='text'?'文字':ctl?.querySelector('span')?.textContent||k,unit=(ctl?.querySelector('output')?.value||'').match(/(?:px\/s|ms|px|×)$/)?.[0]||'';const value=input?.tagName==='SELECT'?[...input.options].find(o=>o.value===v)?.textContent:v;return `${name} ${typeof value==='number'?Number(value.toFixed(2)):value}${unit}`;}).join(' · ');
async function openComparison(key,A,B=snapshot(key)){
 await loadModule(exhibitByKey.get(key).module);const root=document.querySelector(`[data-k="${key}"]`);let c=comparisons.get(key);
 if(!c){c={A:{...A},B:{...B},root,replicas:[],ready:false};comparisons.set(key,c);
  const panel=document.createElement('section');panel.className='ab-panel';panel.setAttribute('aria-label',`${exhibitByKey.get(key).name}的 A/B 同屏对比`);panel.innerHTML='<div class="ab-heading mono"><b>A / B · 同时出发</b><button type="button" class="ab-close" aria-label="收起 A/B 对比">✕</button></div><p>已存为 A。继续调原来的参数，得到 B，再一起播放。</p><div class="ab-scenes"></div><div class="ab-bottom"><button class="ab-play mono">同时播放 A + B ↗</button><span class="ab-status mono" role="status">A 已保存 / B 跟随当前参数</span></div>';
  root.querySelector('footer').before(panel);c.panel=panel;panel.querySelector('.ab-close').onclick=()=>{panel.hidden=true;root.querySelector('.ab-toggle').setAttribute('aria-expanded','false');};panel.querySelector('.ab-play').onclick=()=>playComparison(key);
  for(const [side,values] of [['A',A],['B',B]]){const wrap=document.createElement('div');wrap.className='ab-side';wrap.innerHTML=`<div class="ab-side-label mono"><b>${side}</b><span>${side==='A'?'保存的手感':'当前的手感'}</span></div>`;const preview=await replica(root,key,values,side);wrap.append(preview.clone);const caption=document.createElement('p');caption.className='ab-caption mono';caption.textContent=label(values,key);wrap.append(caption);panel.querySelector('.ab-scenes').append(wrap);await preview.init();c.replicas.push(preview.clone);}
  c.ready=true;
 }else {c.A={...A};c.B={...B};apply(c.replicas[0],A);apply(c.replicas[1],B);}
 c.enabled=true;c.panel.hidden=false;root.querySelector('.ab-toggle').setAttribute('aria-expanded','true');update(key);refreshPhrase();return c;
}
function update(key){const c=comparisons.get(key);if(!c?.ready)return;c.B=snapshot(key);c.replicas.forEach((root,i)=>{const v=i?c.B:c.A;if(root._gestureState)Object.assign(root._gestureState,v);else apply(root,v);c.panel.querySelectorAll('.ab-caption')[i].textContent=label(v,key);});}
export function playComparison(key){const c=comparisons.get(key);if(!c?.ready)return;update(key);c.replicas.forEach(root=>root._replay?.());c.panel.querySelector('.ab-status').textContent='A + B 同步播放 / 继续调出你的手感';say(key);}
export function comparisonState(key){const c=comparisons.get(key);return c?.ready&&c.enabled?{A:{...c.A},B:snapshot(key)}:null;}
export async function restoreComparison(key,values){validateSnapshot(key,values.A);validateSnapshot(key,values.B);apply(document.querySelector(`[data-k="${key}"]`),values.B);await openComparison(key,values.A,values.B);playComparison(key);}
export function clearComparison(key){const c=comparisons.get(key);if(c){c.panel.hidden=true;c.enabled=false;c.root.querySelector('.ab-toggle').setAttribute('aria-expanded','false');}refreshPhrase();}
registerPhraseExtension(key=>{const state=comparisonState(key);return state?'｜A/B '+JSON.stringify(state):'';});
function enhance(key){const root=document.querySelector(`[data-k="${key}"]`);if(!root||root.querySelector('.ab-tools')||!controls(root).length)return;
 const tools=document.createElement('div');tools.className='ab-tools';tools.innerHTML='<button class="ab-toggle mono" type="button" aria-expanded="false">A/B 对比 ↔</button><span>存下 A，调出 B。</span><button class="ab-save mono" type="button" title="把当前参数重新存为 A">重存 A</button>';
 root.querySelector('footer').before(tools);tools.querySelector('.ab-toggle').onclick=async()=>{const c=comparisons.get(key);await openComparison(key,c?.A||snapshot(key));playComparison(key);};tools.querySelector('.ab-save').onclick=async()=>{await openComparison(key,snapshot(key));playComparison(key);};
 root.addEventListener('input',e=>{if(!e.target.closest('.ab-replica')){update(key);refreshPhrase();}});root.addEventListener('change',e=>{if(!e.target.closest('.ab-replica')){update(key);refreshPhrase();}});
}
const observer=new MutationObserver(records=>{for(const r of records){const root=r.target.closest?.('.card[data-k]');if(root)enhance(root.dataset.k);}});observer.observe(document.querySelector('#app'),{childList:true,subtree:true});catalog.forEach(e=>enhance(e.key));
