import {browser,sleep} from './cdp.mjs';
const b=await browser(19439);
async function align(selector,offset=115){await b.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'start'})`);await sleep(650);await b.evaluate(`document.querySelector('#dX').click();scrollTo({top:document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect().top+scrollY-${offset},behavior:'instant'})`);await sleep(500);}
async function section(selector,path){await align(selector);const clip=await b.evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:0,y:r.top+scrollY,width:innerWidth,height:r.height,scale:1}})()`);await b.shot(path,clip);}
try{
 for(const [width,height,name] of [[1440,900,'desktop'],[390,844,'mobile']]){
  await b.viewport(width,height);await b.open();
  await section('#hall-timing',`docs/review/phase3/${name}-timing.png`);
  await align('[data-k=pinned]');await b.shot(`docs/review/phase3/${name}-scroll.png`);
  await align('[data-k=reveal]');await b.shot(`docs/review/phase3/${name}-scroll-reveal.png`);
  await align('#phrase-return',width===390?105:150);
  const value=name==='desktop'?'缓动曲线 Easing｜速度 0.75x｜曲线 cubic-bezier(0.34,1.35,0.64,1.00) · 时长 1200ms':'弹簧物理 Spring｜速度 0.75x｜刚度 250 · 阻尼 7 · 质量 1';
  await b.evaluate(`document.querySelector('#phrase-input').value=${JSON.stringify(value)}`);await b.shot(`docs/review/phase3/${name}-phrase-input.png`);
  await b.evaluate(`document.querySelector('#phrase-form').requestSubmit()`);await sleep(1700);await b.shot(`docs/review/phase3/${name}-phrase-restored.png`);
  if(await b.evaluate(`!!document.querySelector('#feeling-index')`)){
   await align('#feeling-index');await b.evaluate(`document.querySelector('[data-feeling="弹"]').click()`);await sleep(250);await b.shot(`docs/review/phase3/${name}-feeling-index.png`);
  }
 }
 console.log('screenshots',b.errors.length?'ERRORS '+JSON.stringify(b.errors):'no JS errors');
}finally{b.close();}
