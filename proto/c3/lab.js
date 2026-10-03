import { motion, registerExhibit, say, SFX } from './core.js';
export { motion, say, SFX };
export const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
export function mount(key, data, replay) {
 const root=document.querySelector(`[data-k="${key}"]`),stage=root.querySelector('.demo-stage');
 registerExhibit(key,data,replay);
 root.querySelector('.q').addEventListener('click',()=>say(key));
 root.querySelector('[data-play]')?.addEventListener('click',()=>{SFX.play(key);say(key);replay();});
 stage.addEventListener('pointerdown',()=>{say(key);SFX.play(key);});
 return {root,stage};
}
export function animate(el,frames,duration=700,options={}) {
 return el.animate(frames,{duration:motion.reduced?1:motion.ms(duration),easing:'cubic-bezier(.22,1,.36,1)',fill:'both',...options});
}
// Render loops actually stop outside the viewport, in background tabs and on reduced motion.
export function loop(stage, draw, continuous=true) {
 let visible=false,id=0,previous=0;
 const frame=t=>{id=0;if(!visible||document.hidden)return;const dt=Math.min((t-previous)/1000,.04)||.016;previous=t;draw(t,dt);if(continuous&&!motion.reduced)id=requestAnimationFrame(frame);};
 const wake=()=>{if(visible&&!document.hidden&&!id){previous=performance.now();id=requestAnimationFrame(frame);}};
 const observer=new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(!visible){cancelAnimationFrame(id);id=0;}else wake();},{rootMargin:'40px'});observer.observe(stage);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(id);id=0;}else wake();});
 matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',wake);
 return wake;
}
