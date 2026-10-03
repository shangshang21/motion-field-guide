import {mount,motion,loop,geometry,clamp,SFX} from './lab.js';
import {refreshPhrase} from './core.js';
export const gestureDefinitions={
 inertia:{no:'40',name:'惯性拖拽',en:'Inertia Drag',say:'松手时的速度会留下来，卡片继续滑行，再被摩擦慢慢拖住。质量越大，同样的摩擦越难让它停下；碰到墙会损失一部分速度。轻轻拖和用力甩，结果会很不一样。',controls:{friction:['摩擦',1,10,.25,3.5,''],mass:['质量',.5,3,.1,1,'']}},
 rubber:{no:'41',name:'边界回弹',en:'Rubber Band',say:'虚线框里可以自由拖动，越过边界后，同样的手指距离只能换来更少的位移。松手时弹簧把卡片带回最近的边界。阻力决定拉不拉得动，刚度决定回来有多干脆。',controls:{resistance:['阻力',.2,.8,.05,.5,''],stiffness:['刚度',80,480,20,240,'']}},
 swipe:{no:'42',name:'滑卡',en:'Swipe Cards',say:'拖动时卡片跟着手指倾斜，松手时再检查最后一小段的速度。够快就顺着方向飞走，慢慢拖再放手会弹回。这里判断的是甩出的速度，所以卡片不会被一次误触带走。',controls:{threshold:['甩出速度',250,1400,50,650,'px/s'],damping:['归位阻尼',8,30,1,18,'']}},
 pull:{no:'43',name:'下拉刷新',en:'Pull to Refresh',say:'往下拉，指示器逐渐拉长，超过刻度以后提示可以松手。松开才开始刷新，没到刻度就收回去；刷新时会固定住指示器，完成后再归位。这个展柜只模拟刷新，不会发出网络请求。',controls:{threshold:['触发距离',50,130,5,85,'px'],duration:['刷新时长',500,1800,100,1000,'ms']}},
};
export function createGesture(stage,key,state,{readout=()=>{},wake=()=>{}}={}){
 const box=geometry(stage),object=stage.querySelector('.gesture-object');
 let x=0,y=0,vx=0,vy=0,drag=null,running=false,elapsed=0,count=0,flight=false,phase='idle';
 const point=e=>({x:e.clientX-box.x,y:e.clientY-box.y});
 const bounds=()=>({x:Math.max(12,(box.width-object.offsetWidth)/2-20),y:Math.max(12,(box.height-object.offsetHeight)/2-48)});
 // Cache the moving object's size: no layout reads in the physics loop.
 let ow=key==='pull'?240:122,oh=key==='pull'?180:146;
 new ResizeObserver(es=>{ow=es[0].contentRect.width;oh=es[0].contentRect.height;}).observe(object);
 const limits=()=>({x:Math.max(12,(box.width-ow)/2-22),y:Math.max(12,(box.height-oh)/2-48)});
 const rubber=(value,limit)=>Math.abs(value)<=limit?value:Math.sign(value)*(limit+(1-Math.exp(-(Math.abs(value)-limit)/100))*100*(1-state.resistance));
 function draw(){
  object.style.transform=key==='pull'?`translateY(${y}px)`:`translate(-50%,-50%) translate(${x}px,${y}px) rotate(${key==='swipe'?x*.08:0}deg)`;
  if(key==='pull'){
   const progress=clamp(y/state.threshold);stage.style.setProperty('--pull',progress);stage.querySelector('.pull-indicator').style.transform=`translate(-50%,${Math.min(y,110)}px) rotate(${phase==='refresh'?elapsed*.32:progress*180}deg) scale(${.6+progress*.4})`;
   stage.querySelector('.pull-label').textContent=phase==='refresh'?'正在刷新…':phase==='done'?'更新完成 ✓':y>=state.threshold?'松手刷新 ↻':'往下拉 ↓';
  }
  stage.dataset.phase=phase;
 }
 function down(e){if(e.button!==0||phase==='refresh'||flight)return;e.preventDefault();const p=point(e);drag={...p,ox:x,oy:y,lastX:p.x,lastY:p.y,lastT:e.timeStamp};vx=vy=0;running=false;phase='drag';object.setPointerCapture(e.pointerId);object.classList.add('dragging');}
 function move(e){if(!drag)return;const p=point(e),dt=Math.max(8,e.timeStamp-drag.lastT)/1000;
  vx=clamp((p.x-drag.lastX)/dt,-2500,2500);vy=clamp((p.y-drag.lastY)/dt,-2500,2500);drag.lastX=p.x;drag.lastY=p.y;drag.lastT=e.timeStamp;
  const b=limits();x=drag.ox+p.x-drag.x;y=drag.oy+p.y-drag.y;
  if(key==='inertia'){x=clamp(x,-b.x,b.x);y=clamp(y,-b.y,b.y);}else if(key==='rubber'){x=rubber(x,b.x*.55);y=rubber(y,b.y*.55);}else if(key==='swipe')y*=.3;else {x=0;y=Math.max(0,y);if(y>state.threshold)y=state.threshold+(y-state.threshold)*.32;}
  if(!motion.paused)draw();readout(key==='swipe'?`RELEASE / ${Math.round(Math.abs(vx))}px/s`:`DRAG / ${Math.round(Math.hypot(x,y))}px`);
 }
 function release(e,cancel=false){if(!drag)return;const idle=e.timeStamp-drag.lastT;drag=null;object.classList.remove('dragging');if(idle>90||cancel)vx=vy=0;
  running=true;elapsed=0;phase='settle';
  if(key==='swipe'){flight=!cancel&&Math.abs(vx)>=state.threshold&&Math.abs(x)>12;if(flight){phase='fly';SFX.play('swipe');}else {vx=vy=0;}}
  if(key==='pull'){phase=!cancel&&y>=state.threshold?'refresh':'settle';vx=vy=0;if(phase==='refresh'){y=state.threshold;SFX.play('pull');}}
  wake();
 }
 object.addEventListener('pointerdown',down);object.addEventListener('pointermove',move);object.addEventListener('pointerup',e=>release(e));object.addEventListener('pointercancel',e=>release(e,true));object.addEventListener('lostpointercapture',e=>release(e,true));
 object.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' '].includes(e.key))return;e.preventDefault();if(e.key==='Enter'||e.key===' ')play();else{x+=e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0;y+=e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0;running=true;phase='settle';wake();}});
 function play(){drag=null;flight=false;elapsed=0;running=true;phase='settle';if(key==='inertia'){x=-limits().x*.6;y=20;vx=650;vy=-140;}else if(key==='rubber'){x=limits().x*.55+42;y=-30;vx=vy=0;}else if(key==='swipe'){x=24;vx=state.threshold+260;vy=-20;flight=true;phase='fly';}else {x=0;y=state.threshold;phase='refresh';}draw();wake();}
 function tick(t,dt){if(!running)return false;dt*=motion.speed;if(motion.reduced){x=y=vx=vy=0;phase='idle';running=false;draw();return false;}elapsed+=dt*1000;
  const b=limits();
  if(key==='inertia'){const drag=Math.exp(-state.friction/state.mass*dt);vx*=drag;vy*=drag;x+=vx*dt;y+=vy*dt;if(Math.abs(x)>b.x){x=clamp(x,-b.x,b.x);vx*=-.36;}if(Math.abs(y)>b.y){y=clamp(y,-b.y,b.y);vy*=-.36;}}
  else if(key==='swipe'&&flight){x+=vx*dt;y+=vy*dt;object.style.opacity=String(clamp(1-Math.abs(x)/(box.width*.85)));if(Math.abs(x)>box.width*.8){count++;object.querySelector('b').textContent=['NEXT.','KEEP.','MOVE.'][count%3];object.querySelector('.swipe-serial').textContent=String(count+1).padStart(2,'0');x=y=vx=vy=0;flight=false;running=false;phase='idle';object.style.opacity='1';}}
  else if(key==='pull'&&(phase==='refresh'||phase==='done')){if(phase==='refresh'&&elapsed>=state.duration){phase='done';SFX.play('done');}if(elapsed>=state.duration+350)phase='settle';}
  else {let tx=0,ty=0,k=240,d=key==='swipe'?state.damping:22;if(key==='rubber'){tx=clamp(x,-b.x*.55,b.x*.55);ty=clamp(y,-b.y*.55,b.y*.55);k=state.stiffness;}const steps=Math.max(1,Math.ceil(dt/.008));for(let i=0;i<steps;i++){const h=dt/steps;vx+=((tx-x)*k-vx*d)*h;vy+=((ty-y)*k-vy*d)*h;x+=vx*h;y+=vy*h;}}
  draw();if(key==='inertia')readout(`SPEED ${Math.round(Math.hypot(vx,vy))}px/s / MASS ${state.mass.toFixed(1)}`);else if(key==='rubber')readout(`RETURN / K ${state.stiffness}`);else if(key==='swipe')readout(`${flight?'FLY':'RETURN'} / ${count} DISMISSED`);else readout(`${phase.toUpperCase()} / ${Math.round(clamp(y/state.threshold)*100)}%`);
  if(phase==='settle'&&Math.hypot(vx,vy)<2){if(key==='inertia'||key==='rubber'||Math.hypot(x,y)<.2){running=false;phase='idle';if(key==='pull'||key==='swipe')x=y=0;draw();return false;}}
 }
 draw();return {play,tick,get state(){return {x,y,vx,vy,phase,count};}};
}
for(const [key,data] of Object.entries(gestureDefinitions)){
 const state=Object.fromEntries(Object.entries(data.controls).map(([key,p])=>[key,p[4]]));let controller,wake=()=>{};
 const lab=mount(key,data,()=>controller.play()),readout=lab.root.querySelector('.demo-readout');
 for(const [name,[label,min,max,step,value,unit]] of Object.entries(data.controls)){
  const item=document.createElement('label');item.className='lab-ctl';item.innerHTML=`<span>${label}</span><output>${value}${unit}</output><input data-param="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${data.name} ${label}">`;
  const input=item.querySelector('input');const update=()=>{state[name]=Number(input.value);item.querySelector('output').value=input.value+unit;input.style.setProperty('--fill',`${(state[name]-min)/(max-min)*100}%`);refreshPhrase();};input.addEventListener('input',update);lab.root.querySelector('.lab-controls').append(item);update();
 }
 data.params=()=>Object.entries(data.controls).map(([name,p])=>`${p[0]} ${state[name]}${p[5]}`).join(' · ');
 controller=createGesture(lab.stage,key,state,{readout:v=>{if(readout.textContent!==v)readout.textContent=v;},wake:()=>wake()});wake=loop(lab.stage,controller.tick);lab.root.gesture=controller;
}
