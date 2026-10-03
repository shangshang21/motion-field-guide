import {mount,motion,animate,loop,clamp,SFX,geometry} from './lab.js';
const defs={
 tilt:{no:'15',name:'三维倾斜',en:'3D Tilt',params:()=> '透视 800px · 最大角度 14° · 文字深度 35px',say:'把鼠标离中心的距离换算成卡片的旋转角度，就像拿着它轻轻倾斜。文字再向前抬一点，比卡片更靠近你。透视让近处变大、远处变小，平面就有了厚度。'},
 toggle:{no:'16',name:'开关切换',en:'Toggle',params:()=> '滑块行程 66px · 弹簧时长 450ms',say:'一次点击，同时改变开关的值、底色和滑块位置。滑块先多走一点，再回到终点，就有了拨动的手感。文字也跟着更新，不只靠颜色表示开或关。'},
 submit:{no:'17',name:'提交状态',en:'Submit State',params:()=> '加载 1400ms · 成功反馈 300ms · 复位 1600ms',say:'一个按钮在原地经历待提交、加载、成功三个状态。加载时锁住按钮，避免重复提交，完成后给出明确结果。这个展柜只是状态演示，不会发送任何数据。'},
 custom:{no:'18',name:'自定义光标',en:'Custom Cursor',params:()=> '光标直径 84px · 混合模式 difference · 跟随 0.16',say:'隐藏展柜内的系统箭头，让一个圆跟着鼠标走。圆用差值混合与下面的颜色运算，经过黑、白、橙时都会变出反色。范围只限于展柜，离开后正常使用鼠标。'},
 ink:{no:'19',name:'光标跟随墨迹',en:'Cursor Trail',params:()=> '追赶 0.22 · 点数 36 · 消散 850ms',say:'连续记录光标的位置，把它们连成一条带宽度的线。后面的点稍慢一点追赶前面的点，尾端逐渐变细、变淡。停下来以后，墨迹慢慢消散。'},
 wave:{no:'20',name:'字重波浪',en:'Variable Font Wave',params:()=> 'Roboto Flex · 字重 100—900 · 周期 2200ms',say:'可变字体可以在细体和粗体之间连续变化，而不只是换一个字形。让每个字母的字重按同一条波浪变化，再错开一点相位。波就会从一头传到另一头。'},
 mask:{no:'21',name:'文字遮罩填充',en:'Text Mask Reveal',params:()=> '遮罩方向 下→上 · 填充 1200ms',say:'两层一样的文字叠在一起，下层只有轮廓，上层是实心橙色。播放时逐渐擦开上层的遮罩，看起来像颜色灌进了字里。字本身的位置一直没变。'},
 typewriter:{no:'22',name:'打字机',en:'Typewriter',params:()=> '文字「每个瞬间，都有名字。」 · 字符间隔 65ms',say:'每隔一小段时间，多显示一个字符，就像有人正在输入。句末和标点可以停一下，让节奏更像说话。这里的光标也一直指着下一个字的位置。'},
};
{
 let aim={x:0,y:0},current={x:0,y:0},timer;
 const lab=mount('tilt',defs.tilt,()=>{aim={x:12,y:-12};clearTimeout(timer);timer=setTimeout(()=>aim={x:0,y:0},motion.ms(1200));});
 const object=lab.stage.querySelector('.tilt-object'),box=geometry(lab.stage);
 lab.stage.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;aim={x:clamp((e.clientY-box.y)/box.height-.5,-.5,.5)*-28,y:clamp((e.clientX-box.x)/box.width-.5,-.5,.5)*28};});
 lab.stage.addEventListener('pointerleave',()=>aim={x:0,y:0});
 object.addEventListener('click',()=>{aim={x:10,y:12};clearTimeout(timer);timer=setTimeout(()=>aim={x:0,y:0},motion.ms(1300));});
 loop(lab.stage,(t,dt)=>{const ease=1-Math.exp(-dt*10*motion.speed);current.x+=(aim.x-current.x)*ease;current.y+=(aim.y-current.y)*ease;object.style.transform=motion.reduced?'none':`rotateX(${current.x}deg) rotateY(${current.y}deg)`;});
}
{
 const lab=mount('toggle',defs.toggle,()=>toggle()),button=lab.stage.querySelector('.toggle-object');
 function toggle(){const on=button.getAttribute('aria-checked')!=='true';button.setAttribute('aria-checked',on);lab.stage.querySelector('.toggle-label').textContent=on?'ONLINE':'OFFLINE';lab.root.querySelector('.demo-readout').textContent=on?'Signal / ON':'Signal / OFF';}
 button.addEventListener('click',toggle);
}
{
 let running=false,elapsed=0,previous=0,phase='idle',id=0;
 const lab=mount('submit',defs.submit,()=>submit()),button=lab.stage.querySelector('.submit-object');
 function submit(){if(running)return;running=true;elapsed=0;previous=performance.now();phase='loading';button.className='submit-object loading';button.disabled=true;button.querySelector('span').textContent='正在提交';lab.root.querySelector('.demo-readout').textContent='Loading / 01';wakeSubmit();}
 function frame(t,dt){if(!running)return false;elapsed+=dt*1000*motion.speed;previous=t;
  if(phase==='loading'&&(elapsed>=1400||motion.reduced)){phase='success';elapsed=0;button.className='submit-object success';button.querySelector('span').textContent='已保存 ✓';lab.root.querySelector('.demo-readout').textContent='Success / 02';SFX.play('done');animate(button,[{scale:'.9'},{scale:'1.05'},{scale:'1'}],300);}
  else if(phase==='success'&&elapsed>=1600){running=false;phase='idle';button.className='submit-object';button.disabled=false;button.querySelector('span').textContent='提交存档 ↗';lab.root.querySelector('.demo-readout').textContent='Ready / 00';return;}
 }
 const wakeSubmit=loop(lab.stage,frame);
 button.addEventListener('click',submit);
}
{
 let aim={x:.6,y:.45},current={...aim};
 const lab=mount('custom',defs.custom,()=>{aim=aim.x>.5?{x:.25,y:.5}:{x:.72,y:.5};});const cursor=lab.stage.querySelector('.custom-pointer'),box=geometry(lab.stage);
 lab.stage.addEventListener('pointermove',e=>{aim={x:clamp((e.clientX-box.x)/box.width),y:clamp((e.clientY-box.y)/box.height)};});
 lab.stage.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'){aim={x:(e.clientX-box.x)/box.width,y:(e.clientY-box.y)/box.height};}});
 loop(lab.stage,(t,dt)=>{const ease=motion.reduced?1:1-Math.exp(-dt*10*motion.speed);current.x+=(aim.x-current.x)*ease;current.y+=(aim.y-current.y)*ease;cursor.style.left='0';cursor.style.top='0';cursor.style.transform=`translate(${current.x*box.width}px,${current.y*box.height}px) translate(-50%,-50%)`;if(Math.hypot(aim.x-current.x,aim.y-current.y)<.0001)return false;});
}
{
 let points=[],aim=null,current=null,age=0,demo=0;
 const lab=mount('ink',defs.ink,()=>{demo=1.7;age=0;});const canvas=lab.stage.querySelector('canvas'),ctx=canvas.getContext('2d'),box=geometry(lab.stage);
 new ResizeObserver(()=>{const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=lab.stage.clientWidth*dpr;canvas.height=lab.stage.clientHeight*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}).observe(lab.stage);
 const move=e=>{aim={x:e.clientX-box.x,y:e.clientY-box.y};age=0;};
 lab.stage.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')move(e);});lab.stage.addEventListener('pointerleave',()=>aim=null);lab.stage.addEventListener('pointerdown',()=>{demo=1.7;age=0;});
 loop(lab.stage,(t,dt)=>{
  const w=box.width,h=box.height;ctx.clearRect(0,0,w,h);dt*=motion.speed;age+=dt;
  if(demo>0){demo-=dt;const p=1-demo/1.7;aim={x:w*(.15+p*.7),y:h*(.5+Math.sin(p*Math.PI*3)*.18)};age=0;if(demo<=0)aim=null;}
  if(aim&&age<.85){current||={...aim};const ease=motion.reduced?1:1-Math.exp(-dt*14);current.x+=(aim.x-current.x)*ease;current.y+=(aim.y-current.y)*ease;points.push({...current,age:0});}
  points.forEach(p=>p.age+=dt);points=points.filter(p=>p.age<.85).slice(-36);
  for(let i=1;i<points.length;i++){ctx.beginPath();ctx.lineCap='round';ctx.lineWidth=2+12*i/points.length;ctx.strokeStyle=`rgba(255,91,0,${(1-points[i].age/.85)*i/points.length})`;ctx.moveTo(points[i-1].x,points[i-1].y);ctx.lineTo(points[i].x,points[i].y);ctx.stroke();}if(!points.length&&!demo)return false;
 });
}
{
 let time=0;
 const lab=mount('wave',defs.wave,()=>{time=0;}),chars=[...lab.stage.querySelectorAll('.wave-word span')];
 loop(lab.stage,(t,dt)=>{time+=dt*motion.speed;chars.forEach((ch,i)=>{const weight=motion.reduced?900:500+400*Math.sin(time*Math.PI*2/2.2-i*.7);ch.style.fontVariationSettings=`"wght" ${weight.toFixed(0)}`;ch.style.color=weight>760?'var(--or)':'var(--paper)';});});
}
{
 const lab=mount('mask',defs.mask,()=>play()),text=lab.stage.querySelector('.mask-word b+b');
 function play(){text.getAnimations().forEach(a=>a.cancel());animate(text,[{clipPath:'inset(100% 0 0 0)'},{clipPath:'inset(0% 0 0 0)'}],1200);}
 new IntersectionObserver(es=>{if(es[0].isIntersecting)play();},{threshold:.3}).observe(lab.stage);
}
{
 let elapsed=0,count=0,running=false;const wording='每个瞬间，\n都有名字。';
 const lab=mount('typewriter',defs.typewriter,()=>play()),text=lab.stage.querySelector('.writer-word span');
 function play(){elapsed=0;count=0;running=true;text.textContent='';if(motion.reduced){text.textContent=wording;running=false;}}
 loop(lab.stage,(t,dt)=>{if(!running)return false;elapsed+=dt*1000*motion.speed;const next=Math.min(wording.length,Math.floor(elapsed/65));if(next!==count){count=next;text.textContent=wording.slice(0,count);SFX.play('tick');}if(count===wording.length)running=false;});
 new IntersectionObserver(es=>{if(es[0].isIntersecting&&!running&&!count)play();},{threshold:.4}).observe(lab.stage);
}
