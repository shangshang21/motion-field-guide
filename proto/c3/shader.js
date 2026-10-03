import {mount,motion,clamp,loop,geometry} from './lab.js';
const defs={
 distortion:{no:'32',name:'图片扭曲',en:'Hover Distortion',params:()=> '水波半径 0.42 · 扭曲强度 0.045 · 衰减 2.8',say:'图片被贴在一张由像素组成的平面上，鼠标附近的纹理坐标会沿波纹轻轻偏移。坐标一动，照片就像液体一样起伏。离开后波纹衰减，原来的画面会重新平静。'},
 dissolve:{no:'33',name:'位移溶解',en:'Displacement Transition',params:()=> '噪声尺度 5.5 · 位移 0.16 · 切换 1500ms',say:'两张照片共用一张连续的噪声场。切换时，噪声先把纹理坐标推开，再决定哪些像素先交给下一张图。边缘会不规则地流动，所以像溶解，而不是简单淡入淡出。'},
 gradient:{no:'34',name:'流动渐变',en:'Noise Gradient',params:()=> '米白 / 安全橙 / 黑 · 噪声层数 4 · 流速 0.18',say:'连续噪声像一张缓慢起伏的地形图，决定三种颜色在哪里相遇。再用另一层噪声推着坐标走，边界就会自然地流动。这里一直只混合米白、安全橙和黑。'},
 particles:{no:'35',name:'粒子成形',en:'Particles to Shape',params:()=> '采样间距 5px · 粒子约 1800 · 排斥半径 85px · 弹簧 8',say:'先把文字画成一张隐藏的图片，沿亮的地方采样，让每个粒子认领一个目标点。粒子用弹簧追向目标，慢慢聚成文字；鼠标靠近时施加排斥力，离开后又能归位。'},
};
const mobile=matchMedia('(max-width: 760px), (pointer: coarse)'),reduce=matchMedia('(prefers-reduced-motion: reduce)');
const vertex=`attribute vec2 a_position;varying vec2 v_uv;void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
const fragment=`precision mediump float;
varying vec2 v_uv;uniform vec2 u_resolution,u_pointer,u_aspect;uniform float u_time,u_energy,u_progress,u_mode,u_direction;uniform sampler2D u_image0,u_image1;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float f=0.;f+=.5*noise(p);p=p*2.03+11.7;f+=.25*noise(p);p=p*2.01+5.2;f+=.125*noise(p);f+=.0625*noise(p*2.);return f;}
vec2 cover(vec2 uv,float aspect){float screen=u_resolution.x/u_resolution.y;if(screen>aspect)uv.y=(uv.y-.5)*aspect/screen+.5;else uv.x=(uv.x-.5)*screen/aspect+.5;return clamp(uv,.001,.999);}
vec3 photo(sampler2D image,vec2 uv,float aspect){vec3 c=texture2D(image,cover(uv,aspect)).rgb;float l=dot(c,vec3(.299,.587,.114));return mix(vec3(l),c,.38);}
void main(){
 vec2 uv=v_uv;vec2 p=uv; p.x*=u_resolution.x/u_resolution.y;vec3 ink=vec3(.067,.067,.063),paper=vec3(.949,.941,.922),orange=vec3(1.,.357,0.);vec3 color;
 if(u_mode<.5){
  vec2 delta=uv-u_pointer;delta.x*=u_resolution.x/u_resolution.y;float d=length(delta);float env=exp(-d*6.)*u_energy;
  float ripple=sin(d*48.-u_time*6.)*env*.022;vec2 flow=vec2(fbm(p*4.+u_time*.18)-.5,fbm(p*4.-u_time*.15+6.)-.5)*env*.045;
  vec2 shifted=uv+normalize(delta+vec2(.001)) * ripple+flow;
  color=photo(u_image0,shifted,u_aspect.x);color+=orange*env*(.025+.035*cos(d*48.-u_time*6.));
 }else if(u_mode<1.5){
  float n=fbm(p*5.5+vec2(u_time*.025));float pr=u_progress;float blend=smoothstep(n-.12,n+.12,pr*1.24-.12);float wave=sin(pr*3.14159);vec2 displacement=vec2(n-.45,fbm(p*5.5+12.)-.45)*.16*wave;
  vec3 a=photo(u_image0,uv+displacement,u_aspect.x),b=photo(u_image1,uv-displacement,u_aspect.y);color=mix(a,b,blend);float edge=1.-smoothstep(.0,.045,abs(n-(pr*1.24-.12)));color+=orange*edge*wave*.42;
 }else{
  float t=u_time*.18*u_direction;vec2 q=vec2(fbm(p*2.+vec2(t,.2)),fbm(p*2.+vec2(-t,4.3)));vec2 r=vec2(fbm(p*2.+q*3.+vec2(t*.7,1.7)),fbm(p*2.+q*3.+vec2(-t*.5,8.3)));float n=fbm(p*1.8+r*3.);color=mix(ink,orange,smoothstep(.22,.62,n));color=mix(color,paper,smoothstep(.55,.76,n));float contour=1.-smoothstep(.0,.006,abs(fract(n*8.)-.5));color=mix(color,ink,contour*.12);
 }
 float grain=(hash(gl_FragCoord.xy+fract(u_time)*100.)-.5)*.026;color+=grain;
 if(u_mode<1.5)color*=.72+.28*smoothstep(0.,.7,uv.y);
 gl_FragColor=vec4(color,1.);
}`;
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(error);}return shader;}
function program(gl,vs,fs){const p=gl.createProgram(),v=compile(gl,gl.VERTEX_SHADER,vs),f=compile(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p);return p;}
function ready(lab){lab.root.classList.add('shader-ready');const button=lab.root.querySelector('[data-play]');button.textContent=button.dataset.label;}
function fallback(lab,label){lab.root.classList.remove('shader-ready');lab.stage.querySelector('.shader-hint').textContent=label;lab.root.querySelector('.demo-readout').textContent='Static preview';lab.root.querySelector('[data-play]').textContent='了解原理 ↗';}
for(const key of Object.keys(defs)){
 let trigger=()=>{};
 const lab=mount(key,defs[key],()=>trigger());
 function init(){
  if(mobile.matches){fallback(lab,'手机静态预览 · 桌面可体验实时着色器');return;}
  if(reduce.matches){fallback(lab,'已减少动态效果 · 当前显示静态预览');return;}
  if(lab.root.dataset.gpu)return;
  try{
   const canvas=lab.stage.querySelector('canvas'),gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
   if(!gl){fallback(lab,'当前浏览器不支持 WebGL · 已显示静态预览');return;}
   lab.root.dataset.gpu='ready';lab.root.dataset.generation=String(Number(lab.root.dataset.generation||0)+1);
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lab.root.dataset.gpu='lost';fallback(lab,'图形环境已暂停 · 已显示静态预览');});
   canvas.addEventListener('webglcontextrestored',()=>{delete lab.root.dataset.gpu;init();});
   trigger=key==='particles'?particles(lab,gl,canvas):surface(key,lab,gl,canvas);
  }catch(e){console.warn('着色器已降级',key,e.message);fallback(lab,'实时画面暂不可用 · 已显示静态预览');}
 }
 mobile.addEventListener('change',()=>{if(mobile.matches)fallback(lab,'手机静态预览 · 桌面可体验实时着色器');else{if(lab.root.dataset.gpu==='ready')ready(lab);else preload.observe(lab.stage);}});
 reduce.addEventListener('change',()=>{if(reduce.matches)fallback(lab,'已减少动态效果 · 当前显示静态预览');else{if(lab.root.dataset.gpu==='ready')ready(lab);else preload.observe(lab.stage);}});
 const preload=new IntersectionObserver(entries=>{if(entries[0].isIntersecting){preload.disconnect();setTimeout(init,0);}},{rootMargin:'240px'});if(mobile.matches||reduce.matches)init();else preload.observe(lab.stage);
}
function resize(lab,gl,canvas){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(lab.stage.clientWidth*dpr);canvas.height=Math.round(lab.stage.clientHeight*dpr);gl.viewport(0,0,canvas.width,canvas.height);}
function surface(key,lab,gl,canvas){
 const generation=lab.root.dataset.generation,box=geometry(lab.stage),readout=lab.root.querySelector('.demo-readout');
 const text=value=>{if(readout.textContent!==value)readout.textContent=value;};
 const p=program(gl,vertex,fragment),buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(p,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const u=Object.fromEntries(['resolution','pointer','aspect','time','energy','progress','mode','direction','image0','image1'].map(n=>[n,gl.getUniformLocation(p,'u_'+n)]));
 let time=0,energy=0,target=0,progress=0,direction=1,loaded=key==='gradient',pulse=0;const pointer={x:.5,y:.5},aim={x:.5,y:.5},aspects=[1,1];
 const mode={distortion:0,dissolve:1,gradient:2}[key];gl.uniform1f(u.mode,mode);gl.uniform1i(u.image0,0);gl.uniform1i(u.image1,1);
 async function texture(index,number){
  const image=new Image();image.src=new URL(`../../assets/web/motion-0${number}.jpg`,import.meta.url).href;await image.decode();
  const tex=gl.createTexture();gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);aspects[index]=image.width/image.height;
 }
 // Complete both texture units even for the gradient: WebGL validates every sampler.
 const textures=key==='gradient'?Promise.all([0,1].map(i=>{gl.activeTexture(gl.TEXTURE0+i);const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([17,17,16,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);})):Promise.all([texture(0,key==='distortion'?1:3),texture(1,key==='distortion'?1:5)]);
 textures.then(()=>{loaded=true;if(lab.root.dataset.generation===generation&&!mobile.matches&&!reduce.matches)ready(lab);}).catch(()=>fallback(lab,'图片加载失败 · 已显示静态预览'));
 const overlay=document.createElement('b');overlay.className='shader-overlay';overlay.innerHTML=key==='distortion'?'LIQUID<br>SIGNAL':key==='dissolve'?'BETWEEN<br>FRAMES':'FLOW<br>STATE';lab.stage.append(overlay);
 const hint=lab.stage.querySelector('.shader-hint');hint.textContent=key==='distortion'?'移动鼠标，让照片泛起波纹':key==='dissolve'?'点击切换 · 噪声把前后两帧接起来':'缓慢流动 · 点击改变流向';
 lab.stage.addEventListener('pointermove',e=>{aim.x=clamp((e.clientX-box.x)/box.width);aim.y=1-clamp((e.clientY-box.y)/box.height);if(key==='distortion')target=1;});
 lab.stage.addEventListener('pointerleave',()=>{target=0;});
 const observer=new ResizeObserver(()=>resize(lab,gl,canvas));observer.observe(lab.stage);resize(lab,gl,canvas);
 loop(lab.stage,(t,dt)=>{
  if(mobile.matches||reduce.matches||lab.root.dataset.gpu!=='ready'||lab.root.dataset.generation!==generation)return false;
  if(!loaded)return;
  time+=dt*motion.speed;pointer.x+=(aim.x-pointer.x)*(1-Math.exp(-dt*9*motion.speed));pointer.y+=(aim.y-pointer.y)*(1-Math.exp(-dt*9*motion.speed));
  if(pulse>0){pulse-=dt*motion.speed;if(pulse<=0)target=0;}
  energy+=(target-energy)*(1-Math.exp(-dt*2.8*motion.speed));
  if(key==='dissolve'){const step=dt*motion.speed/1.5;progress=target>progress?Math.min(target,progress+step):Math.max(target,progress-step);}
  gl.uniform2f(u.resolution,canvas.width,canvas.height);gl.uniform2f(u.pointer,pointer.x,pointer.y);gl.uniform2f(u.aspect,aspects[0],aspects[1]);gl.uniform1f(u.time,time);gl.uniform1f(u.energy,energy);gl.uniform1f(u.progress,progress);gl.uniform1f(u.direction,direction);gl.drawArrays(gl.TRIANGLES,0,6);
  text(key==='dissolve'?`Mix / ${Math.round(progress*100)}%`:key==='distortion'?`Ripple / ${energy.toFixed(2)}`:`Flow / ${direction===1?'→':'←'}`);
 });
 return()=>{if(key==='dissolve')target=target?0:1;else if(key==='gradient')direction*=-1;else{aim.x=.5;aim.y=.5;target=1.5;pulse=1.5;}};
}
function particles(lab,gl,canvas){
 const vs=`attribute vec2 a_position;attribute float a_seed;uniform vec2 u_resolution;uniform float u_dpr;varying float v_seed;void main(){vec2 pos=a_position/u_resolution*2.-1.;gl_Position=vec4(pos.x,-pos.y,0.,1.);gl_PointSize=(1.5+a_seed*2.)*u_dpr;v_seed=a_seed;}`;
 const fs=`precision mediump float;varying float v_seed;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(1.,.357,0.),vec3(.949,.941,.922),step(.75,v_seed));gl_FragColor=vec4(c,1.-smoothstep(.2,.5,d));}`;
 const generation=lab.root.dataset.generation,box=geometry(lab.stage),readout=lab.root.querySelector('.demo-readout');
 const text=value=>{if(readout.textContent!==value)readout.textContent=value;};
 const p=program(gl,vs,fs),mask=document.createElement('canvas');mask.width=600;mask.height=420;
 const ctx=mask.getContext('2d');ctx.fillStyle='#fff';ctx.font='900 155px Anton, sans-serif';ctx.textAlign='center';ctx.fillText('FORM',300,205);ctx.font='900 95px Anton, sans-serif';ctx.fillText('06',300,315);
 const pixels=ctx.getImageData(0,0,600,420).data,points=[];
 for(let y=45;y<350;y+=5)for(let x=25;x<575;x+=5)if(pixels[(y*600+x)*4+3]>128){const seed=Math.random();points.push({tx:x/600,ty:y/420,x:Math.random()*600,y:Math.random()*420,vx:0,vy:0,seed});}
 defs.particles.params=()=>`采样间距 5px · 粒子 ${points.length} · 排斥半径 85px · 弹簧 8`;
 const positionBuffer=gl.createBuffer(),seedBuffer=gl.createBuffer(),data=new Float32Array(points.length*2);
 const loc=gl.getAttribLocation(p,'a_position'),seedLoc=gl.getAttribLocation(p,'a_seed');
 gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 gl.bindBuffer(gl.ARRAY_BUFFER,seedBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(points.map(p=>p.seed)),gl.STATIC_DRAW);gl.enableVertexAttribArray(seedLoc);gl.vertexAttribPointer(seedLoc,1,gl.FLOAT,false,0,0);
 const res=gl.getUniformLocation(p,'u_resolution'),dpr=gl.getUniformLocation(p,'u_dpr');let pointer=null,burst=0;
 lab.stage.querySelector('.shader-hint').textContent='鼠标靠近，粒子散开 · 移开，文字重新聚合';
 const move=e=>{pointer={x:e.clientX-box.x,y:e.clientY-box.y};};
 lab.stage.addEventListener('pointermove',move);lab.stage.addEventListener('pointerleave',()=>pointer=null);
 new ResizeObserver(()=>resize(lab,gl,canvas)).observe(lab.stage);resize(lab,gl,canvas);ready(lab);
 const scatter=()=>{burst=.7;points.forEach(p=>{const angle=Math.random()*Math.PI*2,speed=120+Math.random()*260;p.vx+=Math.cos(angle)*speed;p.vy+=Math.sin(angle)*speed;});};
 loop(lab.stage,(t,dt)=>{
  if(mobile.matches||reduce.matches||lab.root.dataset.gpu!=='ready'||lab.root.dataset.generation!==generation)return false;
  dt*=motion.speed;burst=Math.max(0,burst-dt);const w=box.width,h=box.height;
  points.forEach((p,i)=>{const tx=p.tx*w,ty=p.ty*h;let ax=(tx-p.x)*(burst?3:22),ay=(ty-p.y)*(burst?3:22);
   if(pointer){const dx=p.x-pointer.x,dy=p.y-pointer.y,d=Math.hypot(dx,dy);if(d<85){const force=(1-d/85)*1900;ax+=dx/Math.max(d,1)*force;ay+=dy/Math.max(d,1)*force;}}
   const drag=Math.exp(-dt*8);p.vx=(p.vx+ax*dt)*drag;p.vy=(p.vy+ay*dt)*drag;p.x+=p.vx*dt;p.y+=p.vy*dt;data[i*2]=p.x;data[i*2+1]=p.y;
  });
  gl.clearColor(.067,.067,.063,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(res,w,h);gl.uniform1f(dpr,canvas.width/w);gl.bindBuffer(gl.ARRAY_BUFFER,positionBuffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.drawArrays(gl.POINTS,0,points.length);
  text(`${points.length} particles / ${burst?'Scatter':'Gather'}`);
 });
 return scatter;
}
