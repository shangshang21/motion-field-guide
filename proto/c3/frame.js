// One animation clock. Geometry reads happen together, before any drawing writes.
const jobs=new Set(),boxes=new Set(),visibleJobs=new Map();
let raf=0,previous=0,layoutDirty=true,lastScroll=scrollY;
export const frameState={y:scrollY,x:scrollX,delta:0,active:0,ticks:0};
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
function request(){if(!raf&&!document.hidden)raf=requestAnimationFrame(tick);}
function tick(t){
 raf=0;const dt=Math.min((t-previous)/1000,.04)||1/60;previous=t;
 frameState.delta=frameState.y-lastScroll;lastScroll=frameState.y;
 if(layoutDirty){layoutDirty=false;for(const b of boxes){if(!b.visible&&!b.always)continue;const r=b.el.getBoundingClientRect();b.left=r.left+frameState.x;b.top=r.top+frameState.y;b.width=r.width;b.height=r.height;}}
 frameState.active=0;frameState.ticks++;
 for(const job of jobs){if(!job.awake||!job.visible)continue;frameState.active++;const keep=job.draw(t,dt);if(keep===false||!job.continuous||reduce.matches)job.awake=false;}
 if([...jobs].some(j=>j.awake&&j.visible))request();
}
const resize=new ResizeObserver(()=>{layoutDirty=true;for(const j of jobs)if(j.visible)j.awake=true;request();});
const intersection=new IntersectionObserver(entries=>{for(const e of entries){
 const set=visibleJobs.get(e.target);if(!set)continue;
 for(const j of set){j.visible=e.isIntersecting;j.awake=e.isIntersecting;}
 const b=[...boxes].find(b=>b.el===e.target);if(b){b.visible=e.isIntersecting;const r=e.boundingClientRect;b.left=r.left+frameState.x;b.top=r.top+frameState.y;b.width=r.width;b.height=r.height;}
 layoutDirty=true;
}request();},{rootMargin:'40px'});
export function schedule(draw){
 const job={draw,continuous:true,visible:true,awake:true};jobs.add(job);request();
 return {wake(){job.awake=true;request();},stop(){job.awake=false;},dispose(){jobs.delete(job);}};
}
export function loop(stage,draw,continuous=true){
 const job={draw,continuous,visible:false,awake:true};jobs.add(job);
 if(!visibleJobs.has(stage)){visibleJobs.set(stage,new Set());intersection.observe(stage);resize.observe(stage);}visibleJobs.get(stage).add(job);
 const wake=()=>{job.awake=true;request();};
 for(const type of ['pointermove','pointerleave','pointerdown','input','click','keydown'])stage.closest('.card')?.addEventListener(type,wake,{passive:true});
 return wake;
}
export function geometry(el,always=false){
 const old=[...boxes].find(b=>b.el===el);if(old)return old;
 const b={el,always,visible:always,left:0,top:0,width:0,height:0,get x(){return this.left-frameState.x;},get y(){return this.top-frameState.y;}};boxes.add(b);resize.observe(el);
 if(!visibleJobs.has(el)){visibleJobs.set(el,new Set());intersection.observe(el);}layoutDirty=true;request();return b;
}
export function invalidateGeometry(){layoutDirty=true;request();}
addEventListener('resize',invalidateGeometry,{passive:true});
addEventListener('scroll',()=>{frameState.y=scrollY;frameState.x=scrollX;for(const j of jobs)if(j.visible)j.awake=true;request();},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{previous=performance.now();lastScroll=scrollY;for(const j of jobs)if(j.visible)j.awake=true;request();}});
reduce.addEventListener('change',()=>{for(const j of jobs)if(j.visible)j.awake=true;request();});
document.fonts.ready.then(invalidateGeometry);

export function transient(stage, draw){
 const job={draw(t,dt){const keep=draw(t,dt);if(keep===false){jobs.delete(job);visibleJobs.get(stage)?.delete(job);}return keep;},continuous:true,visible:false,awake:true};
 jobs.add(job);if(!visibleJobs.has(stage)){visibleJobs.set(stage,new Set());intersection.observe(stage);resize.observe(stage);}visibleJobs.get(stage).add(job);request();
 // Existing observed elements need a fresh visibility notification.
 intersection.unobserve(stage);intersection.observe(stage);
}
