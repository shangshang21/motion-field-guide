import {getExhibit} from './core.js';
const mobile=matchMedia('(max-width:760px), (pointer:coarse)'),dialog=document.querySelector('#dialog');let key=null;
const note=document.createElement('dialog');note.className='guide-note';note.innerHTML='<header><b>导览员讲解</b><button aria-label="关闭讲解">✕</button></header><p></p><button class="note-done">继续体验 ↗</button>';document.body.append(note);note.querySelectorAll('button').forEach(b=>b.onclick=()=>note.close());
const read=document.createElement('button');read.id='dRead';read.textContent='讲解 ↗';read.className='dialog-read';dialog.querySelector('.who .x').before(read);
read.onclick=()=>{note.querySelector('header b').textContent=getExhibit(key)?.name||'欢迎来到动效图鉴';note.querySelector('p').textContent=getExhibit(key)?.say||document.querySelector('#dTxt').textContent;note.showModal();};
addEventListener('exhibit-say',e=>key=e.detail.key);
const hints={wipe:'点一下，色块擦过按钮',roll:'点一下，字母依次翻滚',glitch:'点一下，体验信号错位',tilt:'点一下，卡片朝你倾斜',magnetic:'点一下，按钮被手指吸过去',trail:'点一下，图片沿轨迹留下来',spotlight:'点一下，照亮藏起来的海报',custom:'点一下，反色光标跟过来',ink:'点一下，墨迹沿着轨迹游走'};
function annotate(){for(const [key,label] of Object.entries(hints)){const root=document.querySelector(`.card[data-k="${key}"]`);if(!root)continue;const stage=root.querySelector('.pad,.lab-stage,.demo-stage');if(!stage||stage.querySelector('.touch-hint'))continue;const hint=document.createElement('span');hint.className='touch-hint';hint.textContent=label;stage.append(hint);const how=root.querySelector('.how');if(how)how.dataset.mouseLabel=how.textContent;}
 document.querySelectorAll('.how[data-mouse-label]').forEach(h=>{const label=mobile.matches?'Tap · 点一下':h.dataset.mouseLabel;if(h.textContent!==label)h.textContent=label;});
}
annotate();mobile.addEventListener('change',annotate);
