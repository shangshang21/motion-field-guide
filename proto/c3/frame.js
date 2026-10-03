// One visible-only clock for physics, timeouts and browser animations.
const jobs=new Set(),boxes=new Set(),visibleJobs=new Map(),animations=new Map(),timers=new Map();
let raf=0,previous=0,layoutDirty=true,lastScroll=scrollY,serial=0,stepping=false;
export const frameState={y:scrollY,x:scrollX,delta:0,active:0,ticks:0,time:0,paused:false,speed:1,steps:0};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function measure(){if(!layoutDirty)return;layoutDirty=false;for(const b of boxes){if(!b.visible&&!b.always)continue;const r=b.el.getBoundingClientRect();b.left=r.left+frameState.x;b.top=r.top+frameState.y;b.width=r.width;b.height=r.height;}}
function active(){return [...jobs].some(j=>j.awake&&j.visible)||timers.size||animations.size;}
function advance(dt){
 frameState.time+=dt*1000*frameState.speed;
 for(const [id,task] of timers)if(task.due<=frameState.time){timers.delete(id);task.fn();}
 for(const [a,state] of animations){
  if(a.playState==='idle'||!state.target.isConnected){animations.delete(a);continue;}
  if(state.box&&!state.box.visible)continue;
  const timing=a.effect.getComputedTiming(),end=timing.endTime;
  state.time+=dt*1000*frameState.speed/state.base;
  a.currentTime=state.time;
  if(state.time>=end){animations.delete(a);try{a.finish();}catch{}}
 }
}
function draw(dt,force=false){frameState.active=0;frameState.ticks++;for(const job of jobs){if(!job.awake||!job.visible||frameState.paused&&!force&&!job.ui)continue;frameState.active++;const keep=job.draw(frameState.time,dt);if(keep===false||!job.continuous||reduce.matches)job.awake=false;}}
function tick(t){raf=0;const dt=previous?Math.min((t-previous)/1000,.04):1/60;previous=t;frameState.delta=frameState.y-lastScroll;lastScroll=frameState.y;measure();if(!frameState.paused){advance(dt);draw(dt);}else{syncCSS();draw(0);}
 if(!frameState.paused&&active()||[...jobs].some(j=>j.ui&&j.awake))request();
}
const resize=new ResizeObserver(()=>{layoutDirty=true;for(const j of jobs)if(j.visible)j.awake=true;request();});
const intersection=new IntersectionObserver(entries=>{for(const e of entries){const set=visibleJobs.get(e.target);if(!set)continue;for(const j of set){j.visible=e.isIntersecting;j.awake=e.isIntersecting;}const b=[...boxes].find(b=>b.el===e.target);if(b){b.visible=e.isIntersecting;const r=e.boundingClientRect;b.left=r.left+frameState.x;b.top=r.top+frameState.y;b.width=r.width;b.height=r.height;}layoutDirty=true;}request();},{rootMargin:'40px'});
function observe(stage){if(!visibleJobs.has(stage)){visibleJobs.set(stage,new Set());intersection.observe(stage);resize.observe(stage);}}
export function schedule(draw,ui=false){const job={draw,ui,continuous:true,visible:true,awake:true};jobs.add(job);request();return {wake(){job.awake=true;request();},stop(){job.awake=false;},dispose(){jobs.delete(job);}};}
export function loop(stage,draw,continuous=true){const job={stage,draw,continuous,visible:false,awake:true};jobs.add(job);observe(stage);visibleJobs.get(stage).add(job);const wake=()=>{job.awake=true;request();};for(const type of ['pointermove','pointerleave','pointerdown','input','change','click','keydown'])stage.closest('.card')?.addEventListener(type,wake,{passive:true});return wake;}
export function geometry(el,always=false){const old=[...boxes].find(b=>b.el===el);if(old)return old;const b={el,always,visible:always,left:0,top:0,width:0,height:0,get x(){return this.left-frameState.x;},get y(){return this.top-frameState.y;}};boxes.add(b);observe(el);layoutDirty=true;request();return b;}
export function invalidateGeometry(){layoutDirty=true;request();}
export function transient(stage,draw){const job={stage,draw(t,dt){const keep=draw(t,dt);if(keep===false){jobs.delete(job);visibleJobs.get(stage)?.delete(job);}return keep;},continuous:true,visible:false,awake:true};jobs.add(job);observe(stage);visibleJobs.get(stage).add(job);intersection.unobserve(stage);intersection.observe(stage);request();}
export function motionTimeout(fn,duration=0){const id=++serial;timers.set(id,{fn,due:frameState.time+duration*frameState.speed});request();return id;}
export const clearMotionTimeout=id=>timers.delete(id);
export const isPlaying=a=>animations.has(a)||a.playState==='running';
const nativeAnimate=Element.prototype.animate;
Element.prototype.animate=function(frames,options){const a=nativeAnimate.call(this,frames,options);if(this.closest('#app')||this.dataset.motionGhost||this.id==='flash'){const stage=this.closest('.card,.hero')||this;const box=geometry(stage,!!this.dataset.motionGhost||this.id==='flash');animations.set(a,{target:this,box,time:0,base:frameState.speed});a.pause();a.currentTime=0;request();}return a;};
const frozenCSS=new Map();
function controllable(a){const target=a.effect?.target;return target&&(target.closest('#app')||target.closest('.bars')||target.closest('#dialog')||target.dataset.motionGhost||target.id==='flash'||a.effect.pseudoElement?.startsWith('::view-transition'));}
function syncCSS(){for(const a of document.getAnimations()){if(animations.has(a)||!controllable(a)||a.playState==='finished'||a.playState==='idle')continue;if(!frozenCSS.has(a)){frozenCSS.set(a,{resume:a.playState==='running'});const at=a.currentTime;a.pause();if(at!==null)a.currentTime=at;}}}
export function pauseMotion(paused=!frameState.paused){frameState.paused=paused;document.documentElement.classList.toggle('motion-paused',paused);if(paused)syncCSS();else{for(const [a,state] of frozenCSS){if(state.resume&&a.playState!=='idle')a.play();}frozenCSS.clear();previous=performance.now();request();}dispatchEvent(new CustomEvent('motion-playback',{detail:{...frameState}}));}
export function setClockSpeed(speed){frameState.speed=speed;dispatchEvent(new CustomEvent('motion-playback',{detail:{...frameState}}));}
export async function stepMotion(){if(stepping)return;stepping=true;if(!frameState.paused)pauseMotion(true);cancelAnimationFrame(raf);raf=0;measure();syncCSS();const dt=1/60;advance(dt);for(const [a] of frozenCSS){if(a.playState==='idle'){frozenCSS.delete(a);continue;}const end=a.effect.getComputedTiming().endTime,next=Number(a.currentTime||0)+dt*1000;a.currentTime=Math.min(next,end);if(next>=end&&Number.isFinite(end)){try{a.finish();}catch{}frozenCSS.delete(a);}}draw(dt,true);frameState.steps++;await Promise.resolve();syncCSS();stepping=false;dispatchEvent(new CustomEvent('motion-playback',{detail:{...frameState}}));}
for(const event of ['pointerdown','pointerover','pointerout','click','transitionrun','animationstart'])document.addEventListener(event,()=>{if(frameState.paused){syncCSS();request();}},{passive:true});
addEventListener('resize',invalidateGeometry,{passive:true});addEventListener('scroll',()=>{frameState.y=scrollY;frameState.x=scrollX;for(const j of jobs)if(j.visible)j.awake=true;request();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{previous=performance.now();lastScroll=scrollY;for(const j of jobs)if(j.visible)j.awake=true;request();}});reduce.addEventListener('change',()=>{for(const j of jobs)if(j.visible)j.awake=true;request();});document.fonts.ready.then(invalidateGeometry);
