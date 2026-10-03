let pending,font;
export function readyGallery(){
 if(pending)return pending;
 if(!font){font=document.createElement('link');font.rel='stylesheet';font.href=new URL('./gallery-font.css',import.meta.url).href;document.head.append(font);}
 pending=import('./gallery.js').catch(error=>{pending=undefined;throw error;});return pending;
}
const start=()=>{readyGallery().catch(error=>{console.warn('展品工具加载稍慢，下一次操作会重试。',error);addEventListener('pointerdown',start,{once:true,passive:true});addEventListener('keydown',start,{once:true});});removeEventListener('pointerdown',start);removeEventListener('keydown',start);removeEventListener('scroll',scroll);observer.disconnect();};
const scroll=()=>{if(scrollY>30)start();};
const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))start();},{rootMargin:'100px'});
observer.observe(document.querySelector('#hall'));
addEventListener('pointerdown',start,{once:true,passive:true});addEventListener('keydown',start,{once:true});addEventListener('scroll',scroll,{passive:true});
if(location.search||location.hash)start();
