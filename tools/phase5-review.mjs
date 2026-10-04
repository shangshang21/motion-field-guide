import fs from 'node:fs';import {browser,sleep} from './cdp.mjs';
const b=await browser(19437),out='docs/review/phase5';
async function go(key){await b.evaluate(`import('./c3/phrase.js').then(m=>m.navigateExhibit('${key}'))`);await sleep(1000);}
async function align(selector,top=125){
 await b.evaluate(`document.querySelector('${selector}').closest('.hall').style.contentVisibility='visible'`);
 for(let n=0;n<3;n++){await b.evaluate(`(()=>{document.documentElement.style.scrollBehavior='auto';const r=document.querySelector('${selector}').getBoundingClientRect();scrollTo({top:scrollY+r.top-${top},behavior:'instant'});})()`);await sleep(250);}
}
async function cardShot(path){const r=await b.evaluate(`(()=>{const r=document.querySelector('[data-k=spring]').getBoundingClientRect();return {x:r.left+scrollX-3,y:r.top+scrollY-3,width:r.width+15,height:r.height+15,scale:1};})()`);await b.evaluate(`document.querySelector('.hud').style.visibility='hidden'`);try{await b.shot(path,r);}finally{await b.evaluate(`document.querySelector('.hud').style.visibility=''`);}}
try{
 if(process.env.QA_BEFORE_URL){
  for(const mobile of [false,true]){
   await b.viewport(mobile?390:1440,mobile?844:900,mobile,1);await b.call('Page.navigate',{url:process.env.QA_BEFORE_URL});await sleep(1500);await b.evaluate('document.fonts.ready.then(()=>true)');
   await go('spring');await b.evaluate(`document.querySelector('#dX').click()`);await align('[data-k=spring]');
   await b.shot(`${out}/card-before-${mobile?'mobile':'desktop'}.png`);await cardShot(`${out}/card-before-${mobile?'mobile':'desktop'}-detail.png`);
  }
 }else{
 await b.viewport(1440);await b.open();await b.evaluate(`import('./c3/bootstrap.js').then(m=>m.readyGallery())`);await sleep(500);await b.shot(`${out}/welcome-desktop.png`);await b.evaluate(`document.querySelector('.welcome-skip').click()`);await b.shot(`${out}/desktop-hero.png`);
 await go('spring');await b.evaluate(`document.querySelector('#dX').click();document.querySelector('[data-k=spring] > .card-tools').hidden=true;document.querySelector('[data-k=spring] .tools-toggle').setAttribute('aria-expanded','false')`);await align('[data-k=spring]',125);await b.shot(`${out}/card-after-desktop.png`);await cardShot(`${out}/card-after-detail.png`);
 await b.evaluate(`document.querySelector('[data-k=spring] .tools-toggle').click()`);await b.shot(`${out}/card-tools-desktop.png`);await b.evaluate(`document.querySelector('[data-k=spring] .tools-toggle').click()`);
 await align('#hall-timing',100);await b.shot(`${out}/desktop-timing.png`);await b.shot(`${out}/desktop-timing-full.png`,await b.evaluate(`(()=>{const r=document.querySelector('#hall-timing').getBoundingClientRect();return {x:0,y:r.top+scrollY,width:1440,height:r.height,scale:1};})()`));
 await go('inertia');await b.evaluate(`document.querySelector('#dX').click()`);await align('#hall-gesture',100);await b.shot(`${out}/desktop-gesture.png`);
 await b.viewport(390,844,true,1);await b.evaluate(`localStorage.removeItem('motion-field-guide.welcomed')`);await b.open();await b.evaluate(`import('./c3/bootstrap.js').then(m=>m.readyGallery())`);await sleep(200);await b.shot(`${out}/welcome-mobile.png`);await b.evaluate(`document.querySelector('.welcome-skip').click();scrollTo({top:0,behavior:'instant'})`);await b.shot(`${out}/mobile-hero.png`);
 await go('spring');await b.evaluate(`document.querySelector('#dX').click();document.querySelector('[data-k=spring] > .card-tools').hidden=true`);await align('[data-k=spring]');await b.shot(`${out}/card-after-mobile.png`);await cardShot(`${out}/card-after-mobile-detail.png`);
 await b.evaluate(`import('./c3/core.js').then(m=>m.say('spring'))`);await align('[data-k=spring]');await b.shot(`${out}/mobile-inline-guide.png`);
 await go('rubber');await align('[data-k=rubber]');await b.shot(`${out}/mobile-gesture.png`);
 }
 console.log('Screenshots saved; errors:',JSON.stringify(b.errors));
}finally{b.close();}
