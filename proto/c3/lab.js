import { motion, registerExhibit, say, SFX } from './core.js';
export { motion, say, SFX };
export const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));
export function mount(key, data, replay, override) {
 const root=override||document.querySelector(`[data-k="${key}"]`),stage=root.querySelector('.demo-stage');
 root._replay=replay; if(!override)registerExhibit(key,data,replay);
 root.querySelector('.q').addEventListener('click',()=>say(key));
 root.querySelector('[data-play]')?.addEventListener('click',()=>{SFX.play(key);say(key);replay();});
 if(!override)stage.addEventListener('pointerdown',()=>say(key));
 stage.addEventListener('click',()=>{say(key);SFX.play(key);});
 const playButton=root.querySelector('[data-play]');if(playButton)playButton.dataset.label=playButton.textContent;
 return {root,stage};
}
export function animate(el,frames,duration=700,options={}) {
 return el.animate(frames,{duration:motion.reduced?1:motion.ms(duration),easing:'cubic-bezier(.22,1,.36,1)',fill:'both',...options});
}
export { loop, geometry, frameState } from './frame.js';
