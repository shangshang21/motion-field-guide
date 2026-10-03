import {validateSnapshot,restoreComparison,clearComparison} from './compare.js';
import {catalog,exhibitByKey} from './catalog.js';
import {loadModule} from './lazy.js';
import {getExhibit,motion,setSpeed,say,replayExhibit,phrase} from './core.js';
const normalize=s=>s.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
const equivalent=(a,b)=>normalize(a).replace(/\s/g,'')===normalize(b).replace(/\s/g,'');
export function parseParams(source=''){
 const atoms=[];let start=0,quote=0;
 for(let i=0;i<source.length;i++){if(source[i]==='\\'){i++;continue;}if(source[i]==='「')quote++;if(source[i]==='」')quote--;if(quote<0)throw Error('文字引号没有配对。');if(source[i]==='·'&&!quote){atoms.push(source.slice(start,i).trim());start=i+1;}}
 if(quote)throw Error('文字引号没有配对。');if(source.trim())atoms.push(source.slice(start).trim());
 const result=new Map();
 for(const atom of atoms){let key,value;const text=atom.match(/^文字\s*「([\s\S]*)」$/);if(text){key='文字';value=text[1].replace(/\\([\\「」])/g,'$1');}else{const m=atom.match(/^(\S+)\s+([\s\S]+)$/);if(!m)throw Error(`参数“${atom}”缺少数值。`);[,key,value]=m;}if(result.has(key))throw Error(`参数“${key}”重复了。`);result.set(key,value.trim());}
 return result;
}
export function parsePhrase(value){
 let comparison=null;const marker=value.lastIndexOf('｜A/B {');if(marker>=0){try{comparison=JSON.parse(value.slice(marker+5));}catch{throw Error('A/B 参数格式不完整。');}value=value.slice(0,marker);}
 const m=value.trim().match(/^([^｜|]+)[｜|]\s*速度\s*(\d+(?:\.\d+)?)\s*[x×](?:\s*[｜|]\s*([\s\S]*))?$/i);
 if(!m)throw Error('请使用“名字 English｜速度 1.00x｜参数”的口令格式。');
 const head=normalize(m[1]),entry=catalog.find(e=>[`${e.name} ${e.en}`,e.name,e.en,`Nº${e.no} ${e.name} ${e.en}`].some(n=>normalize(n)===head));
 if(!entry)throw Error(`没有找到“${m[1].trim()}”，请检查展品名字。`);
 const speed=Number(m[2]);if(speed<.1||speed>2)throw Error('速度需要在 0.10x 到 2.00x 之间。');
 if(Math.abs(speed*100-Math.round(speed*100))>1e-6)throw Error('速度最多保留两位小数。');
 return {entry,speed,comparison,params:parseParams(m[3]||'')};
}
const bindings={
 inertia:{摩擦:'friction',质量:'mass'},rubber:{阻力:'resistance',刚度:'stiffness'},swipe:{甩出速度:'threshold',归位阻尼:'damping'},pull:{触发距离:'threshold',刷新时长:'duration'},
 magnetic:{强度:'strength',范围:'radius',跟手速度:'ease'},trail:{间距:'gap',停留:'life',尺寸:'size'},spotlight:{光圈:'radius',跟手速度:'ease'},
 split:{逐字间隔:'stagger',升起时长:'duration'},scramble:{解码时长:'duration',刷新间隔:'interval'},
 easing:{时长:'duration'},spring:{刚度:'stiffness',阻尼:'damping'},stagger:{间隔:'gap',单张:'duration',种子:'seed'},
};
function numeric(value,label,unit=''){
 const pattern=new RegExp(`^([-+]?(?:\\d+(?:\\.\\d*)?|\\.\\d+))\\s*${unit}$`),m=value.match(pattern);if(!m)throw Error(`“${label}”需要有效数字${unit?'和 '+unit+' 单位':''}。`);return Number(m[1]);
}
function controlPlan(root,param,value,label){
 const input=root.querySelector(`[data-param="${param}"]`);if(!input)throw Error(`“${label}”暂时无法恢复，请重新加载展厅。`);
 const n=typeof value==='number'?value:numeric(value,label),min=Number(input.min),max=Number(input.max),step=Number(input.step)||1;
 if(!Number.isFinite(n)||n<min||n>max)throw Error(`“${label}”需要在 ${min} 到 ${max} 之间。`);
 if(Math.abs((n-min)/step-Math.round((n-min)/step))>1e-6)throw Error(`“${label}”的调整间隔是 ${step}。`);
 return ()=>{input.value=String(n);input.dispatchEvent(new Event('input',{bubbles:true}));};
}
function restorationPlan({entry,params}){
 const root=document.querySelector(`[data-k="${entry.key}"]`),data=getExhibit(entry.key),current=parseParams(data.params?.()||''),plan=[];
 for(const [label,value] of params){
  const param=bindings[entry.key]?.[label];
  if(param){const input=root.querySelector(`[data-param="${param}"]`),unit=input?.type==='range'&&/ms\s*$/.test(current.get(label)||'')?'ms':/px\s*$/.test(current.get(label)||'')?'px':/px\/s\s*$/.test(current.get(label)||'')?'px/s':'';plan.push(controlPlan(root,param,numeric(value,label,unit),label));continue;}
  if(label==='文字'&&['split','scramble'].includes(entry.key)){
   const input=root.querySelector('.type-edit input');if(!value.trim()||[...value].length>input.maxLength)throw Error(`文字需要有内容，最多 ${input.maxLength} 个字符。`);
   if(entry.key==='scramble'&&!/^[A-Z0-9 ./#&+_-]+$/.test(value))throw Error('乱码解码的文字请使用 A–Z、数字、空格或 ./#&+_-。');
   plan.push(()=>{input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));});continue;
  }
  if(entry.key==='easing'&&label==='曲线'){
   const match=value.match(/^cubic-bezier\(\s*([^)]*)\s*\)$/i),values=match?.[1].split(/[,，]/).map(v=>numeric(v.trim(),'曲线'));
   if(!values||values.length!==4)throw Error('曲线需要四个数：cubic-bezier(x1,y1,x2,y2)。');
   values.forEach((n,i)=>plan.push(controlPlan(root,['x1','y1','x2','y2'][i],n,['X1','Y1','X2','Y2'][i])));continue;
  }
  if(entry.key==='duration'&&label==='对比'){
   const values=value.split('/').map(v=>numeric(v.trim(),'对比','ms')),factor=values[0]/100;
   if(values.length!==3||Math.abs(values[1]-300*factor)>.01||Math.abs(values[2]-800*factor)>.01)throw Error('时长对比保持 1 : 3 : 8 的比例，例如 100ms / 300ms / 800ms。');
   plan.push(controlPlan(root,'factor',factor,'时长倍率'));continue;
  }
  if(entry.key==='stagger'&&label==='方向'){
   const direction={从左:'left',从中间:'center',随机:'random'}[value];if(!direction)throw Error('方向可以是“从左”“从中间”或“随机”。');
   plan.push(()=>{const input=root.querySelector('[data-param="direction"]');input.value=direction;input.dispatchEvent(new Event('change',{bubbles:true}));});continue;
  }
  // These values are derived from the viewport or sampled font rather than controls.
  if(entry.key==='pinned'&&['行程','钉住顶部'].includes(label)){const n=numeric(value,label,'px');if(n<0||n>10000)throw Error(`“${label}”超出了有效范围。`);continue;}
  if(entry.key==='particles'&&label==='采样间距'&&/^[58]px$/.test(value))continue;
  if(entry.key==='particles'&&label==='粒子'&&/^(约\s*)?\d+$/.test(value))continue;
  if(!current.has(label))throw Error(`这件展品没有“${label}”参数。`);
  if(!equivalent(value,current.get(label)))throw Error(`“${label}”在这件展品中固定为 ${current.get(label)}。`);
 }
 return {root,plan};
}
const frames=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
let settleTask=0,openedHall=null;
const stopSettle=()=>{clearTimeout(settleTask);if(openedHall)openedHall.style.contentVisibility='';openedHall=null;};
addEventListener('wheel',stopSettle,{passive:true});addEventListener('touchstart',stopSettle,{passive:true});
export async function navigateExhibit(key,{replay=false}={}){
 stopSettle();
 const entry=exhibitByKey.get(key);if(!entry)throw Error('没有找到这件展品。');await loadModule(entry.module);
 const root=document.querySelector(`[data-k="${key}"]`),hall=root.closest('.hall');
 openedHall=hall;hall.style.contentVisibility='visible';
 // Reveal the containing hall before positioning a child in content-visibility.
 hall.scrollIntoView({behavior:'instant',block:'start'});await frames();
 // Give the newly visible neighboring lazy modules one short turn to settle their controls.
 await new Promise(resolve=>setTimeout(resolve,120));await frames();
 const target=root.querySelector('.lab-stage,.type-stage,.demo-stage,.pad')||root;
 const position=behavior=>{const r=target.getBoundingClientRect(),mobile=innerWidth<=760;const top=Math.max(mobile?212:120,(innerHeight-r.height)/2+(mobile?65:0));scrollTo({top:scrollY+r.top-top,behavior});};
 position(motion.reduced?'instant':'smooth');
 // content-visibility changes upstream heights while scrolling across several halls.
 settleTask=setTimeout(()=>{position('instant');hall.style.contentVisibility='';openedHall=null;},650);
 root.tabIndex=-1;root.focus({preventScroll:true});root.classList.add('phrase-arrival');setTimeout(()=>root.classList.remove('phrase-arrival'),2200);
 say(key);if(replay)replayExhibit(key);return entry;
}
export async function restorePhrase(value){
 const parsed=parsePhrase(value);await loadModule(parsed.entry.module);
 if(parsed.comparison){validateSnapshot(parsed.entry.key,parsed.comparison.A);validateSnapshot(parsed.entry.key,parsed.comparison.B);}
 const {plan}=restorationPlan(parsed); // Validate everything before changing any state.
 plan.forEach(apply=>apply());setSpeed(parsed.speed,true);if(parsed.comparison)await restoreComparison(parsed.entry.key,parsed.comparison);else clearComparison(parsed.entry.key);
 await navigateExhibit(parsed.entry.key,{replay:true});return {entry:parsed.entry,phrase:phrase(parsed.entry.key),speed:parsed.speed};
}
const form=document.querySelector('#phrase-form'),input=document.querySelector('#phrase-input'),panel=document.querySelector('#phrase-return'),status=document.querySelector('#phrase-status'),submit=form.querySelector('[type=submit]');
form.addEventListener('submit',async e=>{
 e.preventDefault();if(submit.disabled)return;submit.disabled=true;panel.dataset.state='loading';status.textContent='正在准备展品…';input.removeAttribute('aria-invalid');
 try{const result=await restorePhrase(input.value);panel.dataset.state='success';status.textContent=`已恢复 Nº${result.entry.no} ${result.entry.name} · ${result.speed.toFixed(2)}x`;input.value=result.phrase;}
 catch(error){panel.dataset.state='error';status.textContent=error.message;input.setAttribute('aria-invalid','true');input.focus({preventScroll:true});}
 finally{submit.disabled=false;}
});
input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();form.requestSubmit();}});
form.querySelector('.phrase-example').addEventListener('click',()=>{input.value='缓动曲线 Easing｜速度 0.75x｜曲线 cubic-bezier(0.34,1.35,0.64,1.00) · 时长 1000ms';panel.dataset.state='';input.removeAttribute('aria-invalid');status.textContent='这条口令有一点回弹。读回后，可以继续拖动控制点。';input.focus();});
