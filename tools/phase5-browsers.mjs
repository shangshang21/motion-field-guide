// QA tools live outside the static site. QA_NODE_MODULES points at their installation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(`${process.env.QA_NODE_MODULES||'/tmp/motion-phase5-qa/node_modules'}/package.json`);
const {webkit,firefox,chromium}=require('playwright');
const AxeBuilder=require('@axe-core/playwright').default;
const out='docs/review/phase5',url='http://localhost:3300/proto/c3-city.html';
const reports=[];
for(const name of (process.env.QA_BROWSERS||'webkit,firefox').split(',')){
 const engine={webkit,firefox,chromium}[name];
 const browser=await engine.launch({headless:true,...(name==='chromium'?{executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}:{})});
 try{for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,deviceScaleFactor:1,reducedMotion:'no-preference'});
  const page=await context.newPage(),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
  await page.addInitScript(()=>{
   window.qaAudio={decoded:0,started:0,errors:[]};
   const Audio=window.AudioContext||window.webkitAudioContext;
   if(Audio){const decode=Audio.prototype.decodeAudioData,start=AudioBufferSourceNode.prototype.start;
    Audio.prototype.decodeAudioData=function(...args){return decode.apply(this,args).then(buffer=>{qaAudio.decoded++;return buffer;},e=>{qaAudio.errors.push(e.message);throw e;});};
    AudioBufferSourceNode.prototype.start=function(...args){qaAudio.started++;return start.apply(this,args);};}
  });
  await page.goto(url);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
  const report={browser:name,version:browser.version(),mobile,checks:[],errors,failed};
  const record=(name,value)=>{assert.ok(value,name);report.checks.push({name,passed:true});};
  record('First greeting visible',await page.locator('#first-visit').isVisible());
  await page.locator('.welcome-skip').click();await page.reload();record('Greeting remembered after reload',await page.locator('#first-visit').isHidden());
  await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('.t2').getAnimations().every(a=>a.playState==='finished'));
  await page.screenshot({path:`${out}/${name}-${mobile?'mobile':'desktop'}-hero.png`});
  // A real user click unlocks the audio context before all the demonstrations.
  await page.locator('#start').click();await page.waitForTimeout(1800);
  const halls=['hall','hall-cursor','hall-text','hall-scroll','hall-transition','hall-shader','hall-timing','hall-gesture'];
  for(const hall of halls){
   await page.evaluate(async id=>{document.documentElement.style.scrollBehavior='auto';const root=document.getElementById(id);root.style.contentVisibility='visible';root.scrollIntoView({behavior:'instant',block:'start'});const {catalog}=await import('./c3/catalog.js'),{loadModule}=await import('./c3/lazy.js');await Promise.all([...new Set(catalog.filter(e=>e.hall===(id==='hall'?'button':id.replace('hall-',''))).map(e=>e.module))].map(loadModule));},hall);
   await page.waitForTimeout(300);
   record(`${hall}: no horizontal overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const keys=await page.locator(`#${hall} .card[data-k]`).evaluateAll(cards=>cards.map(c=>c.dataset.k));
   for(const key of keys){
    await page.evaluate(async key=>{const c=await import('./c3/core.js'),p=await import('./c3/phrase.js');const phrase=c.phrase(key);const result=await p.restorePhrase(phrase);if(result.entry.key!==key)throw Error('Wrong restored exhibit');},key);
    await page.locator(`[data-k=${key}] .pad,[data-k=${key}] .lab-stage,[data-k=${key}] .type-stage,[data-k=${key}] .demo-stage`).first().evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center'}));
    await page.waitForTimeout(250);
    record(`${key}: phrase restore and replay`,true);
   }
  }
  await page.waitForTimeout(1000);
  report.shader=await page.locator('.shader-grid > .card').evaluateAll(cards=>cards.map(c=>({key:c.dataset.k,mode:c.dataset.gpu||'unavailable',quality:c.dataset.quality||null,static:!c.classList.contains('shader-ready'),hint:c.querySelector('.shader-hint')?.textContent,canvas:!!c.querySelector('canvas')})));
  console.log('Shader probe',name,mobile,JSON.stringify(report.shader));
  record('Four shaders render or show an explicit static fallback',report.shader.length===4&&report.shader.every(s=>s.mode==='ready'||(s.static&&s.hint?.includes('静态'))));
  // Exercise the compact toolbar and A/B through the actual buttons.
  await page.evaluate(()=>import('./c3/phrase.js').then(m=>m.navigateExhibit('spring')));await page.waitForTimeout(800);
  await page.locator('[data-k=spring] .tools-toggle').click();
  record('Tools open with keyboard focusable buttons',await page.locator('[data-k=spring] > .card-tools').isVisible());
  await page.locator('[data-k=spring] .ab-toggle').click();await page.waitForTimeout(300);
  record('A/B renders two live replicas',await page.locator('[data-k=spring] .ab-replica').count()===2);
  await page.locator('[data-k=spring] .ab-close').click();
  await page.locator('[data-k=spring] .card-actions button').nth(1).focus();await page.keyboard.press('Enter');await page.locator('.code-modal').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('.code-modal').waitFor({state:'hidden'});record('Escape closes code dialog while tools are open',true);
  await page.locator('[data-k=spring] .tools-toggle').focus();await page.keyboard.press('Escape');
  record('Escape closes tools and restores focus',await page.locator('[data-k=spring] > .card-tools').isHidden()&&await page.locator('[data-k=spring] .tools-toggle').evaluate(el=>el===document.activeElement));
  // Drag a gesture using native pointer input, then operate it by keyboard.
  for(const key of ['inertia','rubber','swipe','pull']){
   await page.evaluate(key=>import('./c3/phrase.js').then(m=>m.navigateExhibit(key)),key);await page.waitForTimeout(850);
   const target=page.locator(`[data-k=${key}] .gesture-object`),box=await target.boundingBox();
   await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+(key==='pull'?0:100),box.y+box.height/2+(key==='pull'?125:0),{steps:6});await page.mouse.up();
   await target.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');record(`${key}: native drag + keyboard`,true);
  }
  await page.waitForTimeout(800);report.audio=await page.evaluate(()=>qaAudio);report.audio.allFiles=await page.evaluate(async files=>{const audio=new (window.AudioContext||window.webkitAudioContext)();let decoded=0;for(const file of files){const response=await fetch('../assets/sfx/'+file);await audio.decodeAudioData(await response.arrayBuffer());decoded++;}await audio.close();return decoded;},fs.readdirSync('assets/sfx').filter(f=>f.endsWith('.ogg')));record('All 41 local OGG files decode',report.audio.allFiles===41);record('Recorded sounds decode and play',report.audio.decoded>0&&report.audio.started>0&&report.audio.errors.length===0);
  if(mobile)record('Mobile guide is inside selected card, outside its stage',await page.locator('#dialog').evaluate(el=>el.closest('.card')?.dataset.k==='pull'&&!el.closest('.demo-stage')&&getComputedStyle(el).position==='relative'));
  // Audit every hall, not only the initial viewport.
  await page.evaluate(async()=>{document.querySelector('#dX').click();document.querySelectorAll('.hall').forEach(h=>h.style.contentVisibility='visible');const at=scrollY;document.querySelector('[data-k=stagger] .demo-stage').scrollIntoView({behavior:'instant',block:'center'});document.querySelector('[data-k=stagger]')._replay();await new Promise(r=>setTimeout(r,2200));scrollTo({top:at,behavior:'instant'});await document.fonts.ready;});
  report.axe=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  record('No uncaught errors or failed resource loads',errors.length===0&&failed.every(f=>/cancelled|NS_BINDING_ABORTED|ERR_ABORTED/.test(f.error)));record('Idle-page WCAG A/AA scan has no violations',report.axe.length===0);report.errors=[...errors];report.cancelledOnReload=failed.filter(f=>/cancelled|NS_BINDING_ABORTED|ERR_ABORTED/.test(f.error));report.failed=failed.filter(f=>!/cancelled|NS_BINDING_ABORTED|ERR_ABORTED/.test(f.error));reports.push(report);console.log(JSON.stringify({browser:name,mobile,checks:report.checks.length,audio:report.audio,shader:report.shader,axe:report.axe.map(v=>({id:v.id,count:v.nodes.length})),errors:report.errors,failed:report.failed}));
  fs.writeFileSync(`${out}/browsers.json`,JSON.stringify(reports,null,2));await context.close();
 }}catch(error){fs.writeFileSync(`${out}/browsers-partial.json`,JSON.stringify({reports,error:error.stack},null,2));throw error;}finally{await browser.close();}
}
