import {catalog,exhibitByKey} from './catalog.js';
import {loadModule} from './lazy.js';
import {phrase,say} from './core.js';
import {parsePhrase,restorePhrase} from './phrase.js';
import {createSnippet} from './snippets.js';
export function shareURL(key){const url=new URL(location.href);url.hash='';url.search='';url.searchParams.set('exhibit',key);url.searchParams.set('motion',phrase(key));return url.href;}
async function copy(text){try{await navigator.clipboard.writeText(text);}catch{const input=document.createElement('textarea');input.value=text;document.body.append(input);input.select();document.execCommand('copy');input.remove();}}
let selected=null;
addEventListener('exhibit-say',e=>selected=e.detail.key);
const dialog=document.querySelector('#dialog'),act=dialog.querySelector('.act');
const share=document.createElement('button');share.id='dShare';share.textContent='分享链接 ↗';
const take=document.createElement('button');take.id='dTake';take.textContent='拿走代码 </>';
act.querySelector('.code').before(share,take);
function update(){const key=document.querySelector('.card.active')?.dataset.k;selected=key||selected;const available=!!exhibitByKey.get(selected);share.hidden=take.hidden=!available;}
new MutationObserver(update).observe(document.querySelector('#dTtl'),{childList:true,subtree:true});
const modal=document.createElement('dialog');modal.className='code-modal';modal.innerHTML='<header><div><span class="mono">TAKE THE MOTION / 纯 HTML · CSS · JS</span><h2 id="code-title"></h2></div><button class="code-close" aria-label="关闭代码窗口">✕</button></header><p>按当前参数生成。存为 .html 即可运行；预览和代码都无需依赖或联网。</p><div class="code-layout"><iframe title="代码的独立运行预览" sandbox="allow-scripts"></iframe><textarea readonly spellcheck="false" aria-label="可直接运行的 HTML 代码"></textarea></div><div class="code-actions"><span class="mono" role="status">当前手感 / 复制即用</span><button class="code-copy">复制完整代码 ↗</button><button class="code-download">下载 .html ↓</button></div>';document.body.append(modal);modal.setAttribute('aria-labelledby','code-title');
const close=()=>{modal.close();modal.querySelector('iframe').srcdoc='';};modal.querySelector('.code-close').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close();});modal.addEventListener('click',e=>{if(e.target===modal)close();});
let exported='';
export async function showCode(key){await loadModule(exhibitByKey.get(key).module);selected=key;say(key);exported=createSnippet(key);modal.querySelector('#code-title').textContent=`Nº${exhibitByKey.get(key).no} ${exhibitByKey.get(key).name}`;modal.querySelector('textarea').value=exported;modal.querySelector('iframe').srcdoc=exported;modal.querySelector('[role=status]').textContent='当前手感 / 复制即用';modal.showModal();}
modal.querySelector('.code-copy').onclick=async()=>{await copy(exported);modal.querySelector('[role=status]').textContent='完整代码已复制 ✓';};
modal.querySelector('.code-download').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([exported],{type:'text/html'}));a.href=url;a.download=`motion-${selected}.html`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export async function copyShare(key,button){await loadModule(exhibitByKey.get(key).module);say(key);await copy(shareURL(key));const old=button.textContent;button.textContent='已复制 ✓';setTimeout(()=>button.textContent=old,1800);}
share.onclick=()=>selected&&copyShare(selected,share);take.onclick=()=>selected&&showCode(selected);
function enhance(){for(const e of catalog){const root=document.querySelector(`.card[data-k="${e.key}"]`);if(!root||root.querySelector('.card-actions'))continue;const tools=document.createElement('div');tools.className='card-actions mono';tools.innerHTML='<button title="复制当前参数的分享链接">分享 ↗</button><button title="拿走当前参数的独立代码">代码 &lt;/&gt;</button>';root.querySelector('footer').before(tools);tools.children[0].onclick=()=>copyShare(e.key,tools.children[0]);tools.children[1].onclick=()=>showCode(e.key);}}
enhance();new MutationObserver(enhance).observe(document.querySelector('#app'),{childList:true,subtree:true});
const query=new URLSearchParams(location.search);
if(query.has('motion')){
 const banner=document.createElement('div');banner.className='share-arrival mono';banner.setAttribute('role','status');banner.textContent='正在恢复分享的手感…';document.body.append(banner);
 try{const parsed=parsePhrase(query.get('motion'));if(query.get('exhibit')&&query.get('exhibit')!==parsed.entry.key)throw Error('链接里的展品与口令不一致。');const result=await restorePhrase(query.get('motion'));banner.textContent=`已恢复 Nº${result.entry.no} ${result.entry.name} / ${result.speed.toFixed(2)}x ✓`;}catch(error){banner.dataset.error='true';banner.textContent=`无法恢复：${error.message}`;}
 const x=document.createElement('button');x.textContent='✕';x.setAttribute('aria-label','关闭分享恢复提示');x.onclick=()=>banner.remove();banner.append(x);setTimeout(()=>banner.remove(),8000);
}
