// Actual Chrome input pipeline at 390×844: touch events, pointer capture and cancellation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browser,sleep} from './cdp.mjs';
const b=await browser(19459),results=[];
const evaluate=b.evaluate;
async function navigate(key){await evaluate(`import('./c3/phrase.js').then(m=>m.navigateExhibit('${key}'))`);await sleep(850);}
async function point(selector){return evaluate(`(()=>{const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,top:r.top,bottom:r.bottom};})()`);}
async function tap(selector,hold=80){const p=await point(selector);assert.ok(p.y>195&&p.y<820,`${selector} is not in clear touch area: ${p.y}`);await b.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});await sleep(hold);await b.call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
async function drag(key,dx,dy,ms=180,cancel=false){await navigate(key);const p=await point(`[data-k=${key}] .gesture-object`);await b.call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:p.x,y:p.y}]});for(let i=1;i<=6;i++){await sleep(ms/6);await b.call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:p.x+dx*i/6,y:p.y+dy*i/6}]});}const moving=await evaluate(`document.querySelector('[data-k=${key}]').gesture.state`);await b.call('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});return moving;}
function pass(name,value){assert.ok(value,name);results.push({name,passed:true});console.log('PASS',name);}
try{
 await b.viewport(390,844,true,3);await b.call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await b.open();
 const catalog=await evaluate(`import('./c3/catalog.js').then(m=>m.catalog)`);
 for(const e of catalog.filter(e=>e.hall!=='gesture')){await navigate(e.key);const selector=e.hall==='button'?(e.key==='tilt'?'.tilt-object':e.key==='toggle'?'.toggle-object':e.key==='submit'?'.submit-object':'.b'):e.hall==='text'?'.type-stage,.demo-stage':'.lab-stage,.demo-stage';
  const target=`[data-k=${e.key}] ${selector}`;const actual=await evaluate(`(()=>{const root=document.querySelector('[data-k=${e.key}]');const stage=root.querySelector(${JSON.stringify(selector)});if(!stage)return '';stage.id='touch-target';return '#touch-target';})()`);assert.ok(actual,e.key);await tap(actual,e.key==='hold'?1300:70);
  if(['curtain','native','split','scramble','mask','typewriter'].includes(e.key)){const play=await evaluate(`(()=>{const el=document.querySelector('[data-k=${e.key}] [data-play], [data-k=${e.key}] .type-play');if(!el)return null;el.id='touch-play';const r=el.getBoundingClientRect();if(r.top<195||r.bottom>820)el.scrollIntoView({behavior:'instant',block:'center'});return '#touch-play';})()`);if(play){await sleep(180);await tap(play);await evaluate(`document.querySelector('#touch-play').removeAttribute('id')`);}}
  if(e.hall==='scroll'){await b.call('Input.synthesizeScrollGesture',{x:195,y:650,yDistance:-220,speed:450,gestureSourceType:'touch'});await sleep(130);}
  const info=await evaluate(`(()=>{const root=document.querySelector('[data-k=${e.key}]'),r=document.querySelector('#dialog').getBoundingClientRect(),s=root.querySelector('.pad,.lab-stage,.type-stage,.demo-stage').getBoundingClientRect();return {active:root.classList.contains('active'),width:document.documentElement.scrollWidth,dialogBottom:r.bottom,stageTop:s.top,gpu:root.dataset.gpu,touchHint:root.querySelector('.touch-hint')?.textContent};})()`);
  pass(`${e.no} ${e.en}: actual touch and no horizontal overflow`,info.active&&info.width===390);
  if(e.hall==='shader')pass(`${e.en}: live GPU stays enabled`,info.gpu==='ready');
  await evaluate(`document.querySelector('#touch-target').removeAttribute('id')`);
 }
 const inertial=await drag('inertia',75,-10,150);await sleep(150);const coast=await evaluate(`document.querySelector('[data-k=inertia]').gesture.state`);pass('Inertia continues after finger release',Math.abs(coast.x-inertial.x)>1&&Math.hypot(coast.vx,coast.vy)>1);
 const stretched=await drag('rubber',145,0,260);pass('Rubber compresses beyond its boundary',stretched.x>20&&stretched.x<145);await sleep(850);const spring=await evaluate(`document.querySelector('[data-k=rubber]').gesture.state`);pass('Rubber springs back towards nearest boundary',spring.x<stretched.x-10&&spring.phase==='idle');
 await drag('swipe',120,0,600);await sleep(700);pass('Slow swipe returns without dismissing',await evaluate(`document.querySelector('[data-k=swipe]').gesture.state.count===0`));
 await drag('swipe',120,0,50);await sleep(550);pass('Fast swipe dismisses one card',await evaluate(`document.querySelector('[data-k=swipe]').gesture.state.count===1`));
 await drag('swipe',120,0,50,true);await sleep(650);pass('Pointer cancellation never dismisses a card',await evaluate(`document.querySelector('[data-k=swipe]').gesture.state.count===1`));
 await drag('pull',0,145,400);await sleep(80);pass('Pull crosses threshold and refreshes on release',await evaluate(`document.querySelector('[data-k=pull]').gesture.state.phase==='refresh'`));await sleep(1850);pass('Pull refresh finishes and settles',await evaluate(`['settle','idle'].includes(document.querySelector('[data-k=pull]').gesture.state.phase)`));
 await navigate('inertia');pass('Guide rail leaves the full gesture stage unobstructed',await evaluate(`document.querySelector('#dialog').getBoundingClientRect().bottom<document.querySelector('[data-k=inertia] .demo-stage').getBoundingClientRect().top`));
 pass('All original hover effects have explicit tap guidance',await evaluate(`['wipe','roll','glitch','tilt','magnetic','trail','spotlight','custom','ink'].every(k=>document.querySelector('[data-k='+k+'] .touch-hint').textContent.includes('点一下'))`));
 assert.deepEqual(b.errors,[]);pass('No JavaScript errors in the actual touch pipeline',true);
 fs.writeFileSync('docs/review/phase4/touch-checks.json',JSON.stringify({date:new Date().toISOString(),viewport:[390,844],dpr:3,input:'CDP touchStart / touchMove / touchEnd / touchCancel',physicalDevice:false,results},null,2));console.log(results.length+' checks passed');
}finally{b.close();}
