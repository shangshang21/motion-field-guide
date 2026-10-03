import {mount,motion,loop,geometry,clamp} from './lab.js';
import {refreshPhrase} from './core.js';
const defs={
 easing:{no:'36',name:'缓动曲线',en:'Easing',say:'同样的路程和时长，速度分配不同，手感就不同。先快后慢像轻轻停住，回弹会多走一点，弹跳像碰到了地面。拖动两个橙色控制点，就能把“顺一点”变成准确的曲线数值。'},
 spring:{no:'37',name:'弹簧物理',en:'Spring',say:'弹簧不预先规定几百毫秒结束，而是一直计算拉力与阻力。刚度越高，回去越快；阻尼越大，越容易停住。试试软糯、干脆和果冻，它们只是同一张卡片用了不同的数值。'},
 duration:{no:'38',name:'时长',en:'Duration',say:'这三个方块一起出发，路程和曲线完全一样，只改时长。一百毫秒像立即回应，三百毫秒能看清变化，八百毫秒让过程变成主角。全局速度会同时影响它们，所以比例始终不变。'},
 stagger:{no:'39',name:'错落节奏',en:'Stagger',say:'一组卡片的动画相同，只让出发时间错开一点。间隔短会连成一股劲，间隔长就能逐个看清；从中间出发会往两边展开。随机顺序也会保存种子，读回口令时能重现同一轮节奏。'},
};
function readout(lab,text){const el=lab.root.querySelector('.demo-readout');if(el.textContent!==text)el.textContent=text;}
function range(lab,key,label,min,max,step,value,unit,change){
 const item=document.createElement('label');item.className='lab-ctl';item.innerHTML=`<span>${label}</span><output></output><input data-param="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${defs[lab.root.dataset.k].name} ${label}">`;
 const input=item.querySelector('input'),out=item.querySelector('output');
 const update=()=>{out.value=`${input.value}${unit}`;input.style.setProperty('--fill',`${(input.value-min)/(max-min)*100}%`);input.setAttribute('aria-valuetext',out.value);change(Number(input.value));refreshPhrase();};
 input.addEventListener('input',update);lab.root.querySelector('.timing-controls').append(item);update();return input;
}
function enter(lab,replay){const observer=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){observer.disconnect();if(!motion.reduced)replay();}},{threshold:.25});observer.observe(lab.stage);}
const svgPoint=(x,y)=>`${(30+x*220).toFixed(2)},${(200-y*130).toFixed(2)}`;
function cubic(t,a,b){return 3*(1-t)*(1-t)*t*a+3*(1-t)*t*t*b+t*t*t;}
export function bezierAt(t,points){let lo=0,hi=1,u=t;for(let i=0;i<16;i++){u=(lo+hi)/2;if(cubic(u,points[0],points[2])<t)lo=u;else hi=u;}return cubic(u,points[1],points[3]);}
{
 let values=[.22,1,.36,1],duration=1000,elapsed=1000,running=false,wake=()=>{};
 const lab=mount('easing',defs.easing,()=>play()),graph=lab.stage.querySelector('.bezier-graph'),box=geometry(graph),traveler=graph.querySelector('.bezier-traveler'),handles=[...graph.querySelectorAll('.bezier-handle')];
 const curves={linear:t=>t,out:t=>1-(1-t)**3,inout:t=>t<.5?4*t*t*t:1-(-2*t+2)**3/2,back:t=>1+2.70158*(t-1)**3+1.70158*(t-1)**2,bounce:t=>{const n=7.5625,d=2.75;if(t<1/d)return n*t*t;if(t<2/d){t-=1.5/d;return n*t*t+.75;}if(t<2.5/d){t-=2.25/d;return n*t*t+.9375;}t-=2.625/d;return n*t*t+.984375;},custom:t=>bezierAt(t,values)};
 const lanes=[...lab.stage.querySelectorAll('.ease-lane')].map(el=>({el,key:el.dataset.curve,runner:el.querySelector('.ease-track>i'),box:geometry(el.querySelector('.ease-track')),circle:el.querySelector('.mini-curve>circle')}));
 const inputs=[];values.forEach((v,i)=>{const label=document.createElement('label');label.textContent=['X1','Y1','X2','Y2'][i];const input=document.createElement('input');Object.assign(input,{type:'number',min:i%2?-.35:0,max:i%2?1.35:1,step:.01,value:v});input.dataset.param=['x1','y1','x2','y2'][i];input.setAttribute('aria-label',`贝塞尔控制点 ${label.textContent}`);input.addEventListener('input',()=>{if(!input.value||!Number.isFinite(input.valueAsNumber))return;values[i]=clamp(input.valueAsNumber,Number(input.min),Number(input.max));update();play();});label.append(input);lab.stage.querySelector('.bezier-values').append(label);inputs.push(input);});
 function update(){
  values=values.map((v,i)=>Math.round(clamp(v,i%2?-.35:0,i%2?1.35:1)*100)/100);
  values.forEach((v,i)=>inputs[i].value=v.toFixed(2));
  graph.querySelector('.bezier-line').setAttribute('d',`M${svgPoint(0,0)} C${svgPoint(values[0],values[1])} ${svgPoint(values[2],values[3])} ${svgPoint(1,1)}`);
  graph.querySelector('.bezier-guides').setAttribute('d',`M${svgPoint(0,0)}L${svgPoint(values[0],values[1])} M${svgPoint(1,1)}L${svgPoint(values[2],values[3])}`);
  handles.forEach((h,i)=>{h.setAttribute('cx',30+values[i*2]*220);h.setAttribute('cy',200-values[i*2+1]*130);h.setAttribute('aria-valuetext',`x ${values[i*2].toFixed(2)}，y ${values[i*2+1].toFixed(2)}`);h.setAttribute('aria-valuemin','0');h.setAttribute('aria-valuemax','1');h.setAttribute('aria-valuenow',values[i*2].toFixed(2));});
  lanes.forEach(lane=>{const fn=curves[lane.key];lane.el.querySelector('.curve-path').setAttribute('d',Array.from({length:81},(_,i)=>`${i?'L':'M'}${5+i/80*110},${95-fn(i/80)*70}`).join(' '));});
  lab.root.querySelectorAll('[data-bezier]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.bezier.split(',').every((v,i)=>Number(v)===values[i]))));refreshPhrase();
 }
 function draw(progress){lanes.forEach(lane=>{const y=curves[lane.key](progress),distance=Math.max(0,lane.box.width-26);lane.runner.style.transform=`translateX(${y*distance}px)`;lane.circle.setAttribute('cx',5+progress*110);lane.circle.setAttribute('cy',95-y*70);});traveler.setAttribute('cx',30+progress*220);traveler.setAttribute('cy',200-curves.custom(progress)*130);readout(lab,`CUBIC / ${values.map(v=>v.toFixed(2)).join(', ')} · ${Math.round(progress*100)}%`);}
 function play(){elapsed=0;running=true;wake();if(motion.reduced){draw(1);running=false;}}
 wake=loop(lab.stage,(t,dt)=>{if(motion.reduced){draw(1);running=false;return false;}if(!running){draw(clamp(elapsed/duration));return false;}elapsed+=dt*1000*motion.speed;const p=clamp(elapsed/duration);draw(p);if(p>=1){running=false;return false;}});
 range(lab,'duration','统一时长',300,2000,50,1000,'ms',v=>{duration=v;});
 handles.forEach((handle,i)=>{
  let dragging=false;handle.addEventListener('pointerdown',e=>{e.preventDefault();handle.focus();dragging=true;handle.setPointerCapture(e.pointerId);});
  handle.addEventListener('pointermove',e=>{if(!dragging)return;const scale=Math.min(box.width/280,box.height/270),ox=(box.width-280*scale)/2,oy=(box.height-270*scale)/2;const x=(e.clientX-box.x-ox)/scale,y=(e.clientY-box.y-oy)/scale;values[i*2]=clamp((x-30)/220);values[i*2+1]=clamp((200-y)/130,-.35,1.35);update();play();});
  const end=()=>dragging=false;handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);
  handle.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const delta=e.shiftKey?.05:.01,index=i*2+(['ArrowUp','ArrowDown'].includes(e.key)?1:0);values[index]=clamp(values[index]+(['ArrowRight','ArrowUp'].includes(e.key)?delta:-delta),index%2?-.35:0,index%2?1.35:1);update();play();});
 });
 lab.root.querySelectorAll('[data-bezier]').forEach(b=>b.addEventListener('click',()=>{values=b.dataset.bezier.split(',').map(Number);update();play();}));
 defs.easing.params=()=>`曲线 cubic-bezier(${values.map(v=>v.toFixed(2)).join(',')}) · 时长 ${duration}ms`;
 update();draw(1);enter(lab,play);
}
{
 let stiffness=180,damping=18,x=0,v=0,running=false,kReady=false,wake=()=>{};
 const lab=mount('spring',defs.spring,()=>play()),object=lab.stage.querySelector('.spring-object'),box=geometry(lab.stage);
 const k=range(lab,'stiffness','刚度',40,500,10,180,'',n=>{stiffness=n;if(kReady)play();}),c=range(lab,'damping','阻尼',2,45,1,18,'',n=>{damping=n;if(kReady)play();});
 // Range constructors notify once; only replay after both controls exist.
 function render(){object.style.transform=`translate(-50%,-50%) translateX(${x*Math.min(180,box.width*.27)}px) rotate(${x*12}deg) skewX(-8deg)`;readout(lab,`K ${stiffness} / C ${damping} · ${Math.abs(v).toFixed(2)}`);lab.root.querySelectorAll('[data-spring]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.spring===`${stiffness},${damping}`)));}
 function play(){x=-1;v=0;running=true;wake();if(motion.reduced){x=0;v=0;running=false;render();}}
 kReady=true;
 wake=loop(lab.stage,(t,dt)=>{if(motion.reduced){x=0;v=0;running=false;render();return false;}if(!running){render();return false;}let remaining=Math.min(dt*motion.speed,.08);while(remaining>0){const step=Math.min(1/120,remaining);v+=(-stiffness*x-damping*v)*step;x+=v*step;remaining-=step;}if(Math.abs(x)<.001&&Math.abs(v)<.015){x=0;v=0;running=false;}render();if(!running)return false;});
 object.addEventListener('click',play);lab.root.querySelectorAll('[data-spring]').forEach(b=>b.addEventListener('click',()=>{const [kv,cv]=b.dataset.spring.split(',');k.value=kv;c.value=cv;k.dispatchEvent(new Event('input',{bubbles:true}));c.dispatchEvent(new Event('input',{bubbles:true}));play();}));
 defs.spring.params=()=>`刚度 ${stiffness} · 阻尼 ${damping} · 质量 1`;render();enter(lab,play);
}
{
 let factor=1,elapsed=800,running=false,wake=()=>{};
 const lab=mount('duration',defs.duration,()=>play()),lanes=[...lab.stage.querySelectorAll('.duration-lane')].map(el=>({el,ms:Number(el.dataset.duration),runner:el.querySelector('i'),box:geometry(el.querySelector('.duration-track'))}));
 function draw(t){lanes.forEach(lane=>{const p=clamp(t/(lane.ms*factor)),ease=1-(1-p)**3;lane.runner.style.transform=`translateX(${ease*Math.max(0,lane.box.width-34)}px)`;lane.el.querySelector('.mono').textContent=`${Math.round(lane.ms*factor)}ms`;});readout(lab,`${lanes.map(l=>Math.round(l.ms*factor)).join(' / ')}ms · ${Math.min(100,Math.round(t/(800*factor)*100))}%`);}
 function play(){elapsed=0;running=true;wake();if(motion.reduced){draw(800*factor);running=false;}}
 wake=loop(lab.stage,(t,dt)=>{if(motion.reduced){draw(800*factor);running=false;return false;}if(!running){draw(elapsed);return false;}elapsed+=dt*1000*motion.speed;draw(elapsed);if(elapsed>=800*factor){running=false;return false;}});
 range(lab,'factor','时长倍率',.5,2,.1,1,'×',n=>{factor=n;draw(elapsed);});lanes.forEach(l=>l.el.addEventListener('click',play));
 defs.duration.params=()=>`对比 ${Math.round(100*factor)}ms / ${Math.round(300*factor)}ms / ${Math.round(800*factor)}ms · 曲线 ease-out`;draw(800);enter(lab,play);
}
{
 let gap=75,duration=500,direction='left',seed=7,elapsed=1500,running=false,wake=()=>{},order=[];
 const lab=mount('stagger',defs.stagger,()=>play()),items=[...lab.stage.querySelectorAll('.stagger-item')];
 function sequence(){order=items.map((_,i)=>i);if(direction==='center')order.sort((a,b)=>Math.abs(a-3.5)-Math.abs(b-3.5));if(direction==='random'){let n=seed>>>0;for(let i=order.length-1;i>0;i--){n=(Math.imul(n,1664525)+1013904223)>>>0;const j=n%(i+1);[order[i],order[j]]=[order[j],order[i]];}}}
 function draw(t){order.forEach((index,rank)=>{const p=clamp((t-rank*gap)/duration),ease=1-(1-p)**3;items[index].style.transform=`translateY(${(1-ease)*55}px) rotate(${(1-ease)*(rank%2?5:-5)}deg)`;items[index].style.opacity=String(clamp(p*4));items[index].querySelector('.mono').textContent=`0${rank+1}`;});readout(lab,`${{left:'LEFT',center:'CENTER',random:'RANDOM'}[direction]} / ${gap}ms · SEED ${seed}`);}
 function play(){sequence();elapsed=0;running=true;wake();if(motion.reduced){draw(duration+gap*7);running=false;}}
 wake=loop(lab.stage,(t,dt)=>{if(motion.reduced){draw(duration+gap*7);running=false;return false;}if(!running){draw(elapsed);return false;}elapsed+=dt*1000*motion.speed;draw(elapsed);if(elapsed>=duration+gap*7){running=false;return false;}});
 range(lab,'gap','出发间隔',0,240,5,75,'ms',n=>{gap=n;});range(lab,'duration','单张时长',200,1000,25,500,'ms',n=>{duration=n;});
 const item=document.createElement('label');item.className='lab-ctl';item.innerHTML='<span>出发方向</span><output>↗</output><select class="timing-select" data-param="direction" aria-label="错落出发方向"><option value="left">从左 →</option><option value="center">从中间 ↔</option><option value="random">随机 ↗</option></select>';const select=item.querySelector('select');select.addEventListener('change',()=>{direction=select.value;play();refreshPhrase();});lab.root.querySelector('.timing-controls').append(item);
 const seedLabel=document.createElement('label');seedLabel.className='lab-ctl';seedLabel.innerHTML='<span>随机种子</span><output>固定顺序</output><input class="timing-select" data-param="seed" type="number" min="1" max="9999" step="1" value="7" aria-label="错落随机种子">';seedLabel.querySelector('input').addEventListener('input',e=>{seed=Math.round(clamp(Number(e.target.value)||7,1,9999));e.target.value=String(seed);play();refreshPhrase();});lab.root.querySelector('.timing-controls').append(seedLabel);
 defs.stagger.params=()=>`间隔 ${gap}ms · 单张 ${duration}ms · 方向 ${{left:'从左',center:'从中间',random:'随机'}[direction]} · 种子 ${seed}`;sequence();draw(1500);enter(lab,play);
}
