// A greeting in the scene, with a real-time 24 second limit.
const greeting=document.querySelector('#first-visit');
const seenKey='motion-field-guide.welcomed';
let timer;
const desktop=matchMedia('(min-width:961px)'),home=document.querySelector('.hero .left');
function dock(){(desktop.matches?document.body:home).append(greeting);}
dock();desktop.addEventListener('change',dock);
function finish(){greeting.hidden=true;clearTimeout(timer);try{localStorage.setItem(seenKey,'yes');}catch{}document.documentElement.classList.remove('first-visit');}
greeting.hidden=!document.documentElement.classList.contains('first-visit');
if(!greeting.hidden){
 timer=setTimeout(finish,24000);
 greeting.querySelector('.welcome-skip').onclick=finish;
 greeting.querySelector('.welcome-play').onclick=()=>{finish();document.querySelector('#start').click();};
 document.querySelector('#start').addEventListener('click',finish);
 // Leave the introduction behind as soon as the visitor starts exploring.
 const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){finish();observer.disconnect();}});
 observer.observe(document.querySelector('#top'));
}
