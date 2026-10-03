import {mount,motion,animate,SFX} from './lab.js';
const defs={
 flip:{no:'28',name:'布局动画',en:'FLIP Layout',params:()=> '位移 650ms · 曲线 cubic-bezier(.22,1,.36,1)',say:'先记下每张卡片原来的位置，再完成重新排序，测量新的位置。把卡片暂时移回旧位置，然后播放到新位置，就把一次突然的布局变化连起来了。点卡片还能试试展开。'},
 shared:{no:'29',name:'共享元素转场',en:'Shared Element',params:()=> '展开 750ms · 图片 同一元素 · 圆角 0',say:'缩略图和详情里的图片是同一张。先测量两个位置，再让一张临时图片从小图飞到大图的位置，最后接上详情。关闭时走相反的路，位置关系就不会丢。'},
 curtain:{no:'30',name:'幕布转场',en:'Curtain / Wipe',params:()=> '斜切 -12° · 三层错落 65ms · 总时长 1050ms',say:'三片斜切幕布先盖满展柜，内容在被遮住的时候切换，再把幕布揭开。这样前后两幅画面不用直接碰在一起。错开一点出发时间，切场景就有了节奏。'},
 native:{no:'31',name:'原生视图转场',en:'View Transitions API',params:()=> '浏览器 '+(document.startViewTransition?'原生快照':'淡出淡入降级')+' · 转场 650ms',say:'浏览器先保存变化前的画面，再拍下变化后的画面，替你把两个状态接起来。这里让整个展柜用原生快照过渡。不支持的浏览器会自动改用淡出、更新、淡入。'},
};
{
 let busy=false;
 const lab=mount('flip',defs.flip,()=>change(()=>{const list=lab.stage.querySelector('.flip-list');list.classList.remove('expanded');list.append(list.firstElementChild);}));
 const list=lab.stage.querySelector('.flip-list');
 async function change(update){
  if(busy)return;busy=true;
  const items=[...list.children];items.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
  const first=new Map(items.map(el=>[el,el.getBoundingClientRect()]));update();
  const animations=items.map(el=>{const a=first.get(el),b=el.getBoundingClientRect();return animate(el,[{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(${a.width/b.width},${a.height/b.height})`,transformOrigin:'0 0'},{transform:'none',transformOrigin:'0 0'}],650);});
  await Promise.all(animations.map(a=>a.finished.catch(()=>{})));animations.forEach(a=>a.cancel());busy=false;
 }
 list.addEventListener('click',e=>{const item=e.target.closest('.flip-item');if(!item)return;change(()=>{if(list.firstElementChild!==item)list.prepend(item);list.classList.toggle('expanded');});});
}
{
 let open=false,busy=false;
 const lab=mount('shared',defs.shared,()=>toggle()),thumb=lab.stage.querySelector('.shared-thumb'),detail=lab.stage.querySelector('.shared-detail');
 const small=thumb.querySelector('img'),large=detail.querySelector('img');
 async function toggle(){
  if(busy)return;busy=true;
  const from=(open?large:small).getBoundingClientRect();
  detail.hidden=false;const to=(open?small:large).getBoundingClientRect();
  const ghost=small.cloneNode();ghost.alt='';ghost.dataset.motionGhost='true';ghost.setAttribute('aria-hidden','true');
  ghost.style.cssText=`position:fixed;z-index:110;pointer-events:none;object-fit:cover;left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px;`;
  document.body.append(ghost);large.style.visibility='hidden';small.style.visibility='hidden';
  if(open)detail.hidden=true;
  const a=animate(ghost,[{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',filter:open?'brightness(.7)':'brightness(1)',transform:open?'rotate(0deg)':'rotate(-8deg)'},{left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',filter:open?'brightness(1)':'brightness(.7)',transform:open?'rotate(-8deg)':'rotate(0deg)'}],750);
  await a.finished.catch(()=>{});ghost.remove();large.style.visibility='';small.style.visibility='';open=!open;detail.hidden=!open;busy=false;
  lab.root.querySelector('[data-play]').textContent=open?'收起详情 ↙':'展开详情 ↗';
  if(open)detail.querySelector('button').focus({preventScroll:true});else thumb.focus({preventScroll:true});
 }
 thumb.addEventListener('click',toggle);detail.querySelector('button').addEventListener('click',toggle);
 lab.stage.addEventListener('keydown',e=>{if(e.key==='Escape'&&open){e.stopPropagation();toggle();}});
}
{
 let night=false,busy=false;
 const lab=mount('curtain',defs.curtain,async()=>{
  if(busy)return;busy=true;
  const panels=[...lab.stage.querySelectorAll('.curtain-panels i')];
  const cover=panels.map((p,i)=>animate(p,[{transform:'translateY(-110%)'},{transform:'translateY(0)'}],400,{delay:motion.reduced?0:motion.ms(i*65)}));
  await Promise.all(cover.map(a=>a.finished.catch(()=>{})));night=!night;
  const scene=lab.stage.querySelector('.curtain-scene');scene.classList.toggle('night',night);scene.querySelector('.mono').textContent=night?'Scene / 02':'Scene / 01';scene.querySelector('b').innerHTML=night?'NIGHT<br>SHIFT.':'DAY<br>SHIFT.';scene.querySelector('i').textContent=night?'☾':'☀';
  const reveal=panels.map((p,i)=>animate(p,[{transform:'translateY(0)'},{transform:'translateY(110%)'}],460,{delay:motion.reduced?0:motion.ms(i*65)}));
  await Promise.all(reveal.map(a=>a.finished.catch(()=>{})));cover.forEach(a=>a.cancel());reveal.forEach(a=>a.cancel());busy=false;
 });
}
{
 let other=false,busy=false;
 const lab=mount('native',defs.native,async()=>{
  if(busy)return;busy=true;
  const scene=lab.stage.querySelector('.native-scene');
  const update=()=>{other=!other;scene.classList.toggle('other',other);scene.querySelector('b').innerHTML=other?'OFF<br>THE GRID.':'ON<br>THE AIR.';scene.querySelector('.mono').textContent=other?'Station / 02':'Station / 01';};
  if(document.startViewTransition&&!motion.reduced){
   lab.stage.style.viewTransitionName='native-demo';document.documentElement.style.setProperty('--vt-duration',motion.ms(650)+'ms');
   try{const transition=document.startViewTransition(update);await transition.finished;}catch{if(!other)update();}
   lab.stage.style.viewTransitionName='';
  }else{const out=animate(scene,[{opacity:1,translate:'0 0'},{opacity:0,translate:'0 -15px'}],250);await out.finished.catch(()=>{});update();out.cancel();const into=animate(scene,[{opacity:0,translate:'0 15px'},{opacity:1,translate:'0 0'}],400);await into.finished.catch(()=>{});into.cancel();}
  busy=false;
 });
 lab.stage.querySelector('.native-support').textContent=document.startViewTransition?'Native API / 浏览器原生':'Fallback / 淡出淡入';
}
