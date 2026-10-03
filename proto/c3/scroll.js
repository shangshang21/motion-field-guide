import {mount,motion,animate,clamp,loop,SFX} from './lab.js';
const definitions={
 parallax:{no:'23',name:'视差',en:'Parallax',params:()=> '远层 0.15 · 中层 0.45 · 近层 0.90',say:'把画面拆成远、中、近三层，滚动同一段距离，每层走的路程不同。近处移动得多，远处移动得少，平面就有了纵深。这里的建筑、字和路牌分别是一层。'},
 pinned:{no:'24',name:'钉住滚动',en:'Pinned Scroll',params:()=> '钉住顶部 110px · 章节 3 · 行程 900px',say:'先把画面钉在屏幕里，让下面的滚动距离成为一条时间轴。往下滚，画面留在原地，章节依次变化；走完整段后，画面才继续离开。它适合把一个过程分几幕讲清楚。'},
 horizontal:{no:'25',name:'横向滚动',en:'Horizontal Scroll',params:()=> '画面 4 帧 · 驱动 纵向进度',say:'你仍然向下滚，但滚动进度被换算成横向位移。一条比展柜更长的画卷便从右向左经过。手机上也用纵向滚动推进，不必改变手势。'},
 reveal:{no:'26',name:'滚动进度揭示',en:'Scroll Reveal',params:()=> '遮罩 底部向上 · 行程 420px',say:'画面已经放好，只是被遮罩挡住。滚动越往前，遮罩就越小，内容逐渐露出；往回滚，它也会重新藏起来。进度直接控制可见面积。'},
 velocity:{no:'27',name:'滚动速度形变',en:'Scroll Velocity Skew',params:()=> '最大倾斜 14° · 回正阻尼 0.12',say:'比较前后两帧滚了多远，就能知道滚动有多快。速度越大，字越倾斜，像被惯性拽了一下；停止滚动后慢慢回正。这里还限制了最大角度，避免把内容拉坏。'},
};
const labs={};let velocity=0,lastY=scrollY,lastTime=performance.now(),fake=0;
addEventListener('scroll',()=>{const now=performance.now();velocity=clamp((scrollY-lastY)/Math.max(now-lastTime,8)*2,-14,14);lastY=scrollY;lastTime=now;},{passive:true});
for(const key of Object.keys(definitions)){
 let demo=0;
 const lab=mount(key,definitions[key],()=>{
  if(key==='velocity'){fake=14;return;}
  if(key==='pinned'){demo=(demo+1)%3;setChapter(lab,demo,true);return;}
  const target= key==='parallax'?lab.stage.querySelector('.city-type'):key==='horizontal'?lab.stage.querySelector('.horizontal-track'):lab.stage.querySelector('.reveal-poster');
  if(key==='parallax')animate(target,[{translate:'0 0'},{translate:'0 -75px'},{translate:'0 0'}],1400);
  else if(key==='horizontal'){demo=demo?0:1;animate(target,[{transform:getComputedStyle(target).transform},{transform:`translateX(${-demo*(target.scrollWidth-lab.stage.clientWidth)}px)`}],1000);}
  else animate(target,[{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)'}],1000);
 });labs[key]=lab;
 let progress=0,chapter=-1;
 loop(lab.stage,(t,dt)=>{
  const rect=lab.root.getBoundingClientRect();
  const raw=clamp((innerHeight*.82-rect.top)/(innerHeight*.6+lab.stage.clientHeight));
  progress+= (raw-progress)*(motion.reduced?1:1-Math.exp(-dt*8*motion.speed));
  lab.root.querySelector('.demo-readout').textContent=`Progress / ${Math.round(progress*100).toString().padStart(3,'0')}%`;
  if(key==='parallax'){
   lab.stage.querySelectorAll('.city-layer').forEach((el,i)=>{el.style.translate=`0 ${(progress-.5)*[-35,-110,-200][i]}px`;});
  }else if(key==='pinned'){
   const p=motion.reduced?1:clamp((110-rect.top)/Math.max(1,rect.height-lab.stage.clientHeight-220));
   const next=Math.min(2,Math.floor(p*3));
   if(next!==chapter){chapter=next;setChapter(lab,next);}
   lab.root.querySelector('.demo-readout').textContent=`Chapter / 0${chapter+1} · ${Math.round(p*100)}%`;
  }else if(key==='horizontal'){
   const track=lab.stage.querySelector('.horizontal-track');if(!track.getAnimations().some(a=>a.playState==='running')){track.getAnimations().forEach(a=>a.cancel());track.style.transform=`translateX(${-progress*Math.max(0,track.scrollWidth-lab.stage.clientWidth)}px)`;}
  }else if(key==='reveal'){
   const poster=lab.stage.querySelector('.reveal-poster');if(!poster.getAnimations().some(a=>a.playState==='running')){poster.getAnimations().forEach(a=>a.cancel());poster.style.clipPath=`inset(${(1-progress)*100}% 0 0 0)`;}
  }else{
   const target=motion.reduced?0:Math.abs(velocity)>.3?velocity:fake;
   fake*=Math.exp(-dt*5*motion.speed);velocity*=Math.exp(-dt*3);
   const poster=lab.stage.querySelector('.velocity-poster');const current=Number(poster.dataset.skew||0);const skew=current+(target-current)*(1-Math.exp(-dt*9*motion.speed));poster.dataset.skew=skew;
   poster.style.transform=`skewY(${-skew}deg) scaleX(${1+Math.abs(skew)*.006})`;
   lab.root.querySelector('.demo-readout').textContent=`Velocity / ${Math.abs(skew).toFixed(1)}°`;
  }
 });
}
function setChapter(lab,n,user=false){
 const chapters=[['Approach','走进<br>街区。','↘'],['Observe','停下<br>看一眼。','◎'],['Continue','带着<br>灵感走。','↗']];
 const [en,title,mark]=chapters[n],poster=lab.stage.querySelector('.pin-poster');
 lab.stage.querySelector('.pin-chapter').textContent=`0${n+1} / ${en}`;
 lab.stage.querySelector('.pin-title').innerHTML=title;lab.stage.querySelector('.pin-poster>i').textContent=mark;
 lab.stage.querySelectorAll('.pin-steps i').forEach((el,i)=>el.classList.toggle('on',i<=n));
 animate(poster,[{opacity:.2,translate:'0 24px'},{opacity:1,translate:'0 0'}],500);
 if(user)SFX.play('pinned');
}
