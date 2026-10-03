const modules={timing:()=>import('./timing.js'),cursor:()=>import('./cursor.js'),type:()=>import('./type.js'),extras:()=>import('./extras.js'),scroll:()=>import('./scroll.js'),transition:()=>import('./transition.js'),shader:()=>import('./shader.js')};
const pending=new Map();
const observer=new IntersectionObserver(entries=>entries.forEach(({isIntersecting,target})=>{
 if(!isIntersecting)return;const key=target.dataset.module;
 if(!pending.has(key))pending.set(key,modules[key]().catch(e=>{console.error('展厅加载失败',key,e);pending.delete(key);}));
 observer.unobserve(target);
}),{rootMargin:'700px'});
document.querySelector('#hall-cursor').dataset.module='cursor';
document.querySelector('#hall-text').dataset.module='type';
document.querySelectorAll('[data-module]').forEach(el=>observer.observe(el));

// Decode photos one viewport ahead, so entering a hall doesn't wait for decode.
const images=new IntersectionObserver(entries=>entries.forEach(({target,isIntersecting})=>{if(!isIntersecting)return;images.unobserve(target);target.loading='eager';target.decode().catch(()=>{});}),{rootMargin:'800px'});
document.querySelectorAll('img[loading="lazy"]').forEach(img=>images.observe(img));
