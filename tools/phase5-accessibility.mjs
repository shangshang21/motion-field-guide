import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(`${process.env.QA_NODE_MODULES||'/tmp/motion-phase5-qa/node_modules'}/package.json`);
const {chromium}=require('playwright'),AxeBuilder=require('@axe-core/playwright').default;
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'}),reports=[];
try {
 for (const mobile of [false,true]) {
  const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900}}),page=await context.newPage(),checks=[],scans=[];
  const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true});};
  async function scan(state) {
   const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).exclude('.code-layout iframe').analyze();
   scans.push({state,violations:result.violations});
   console.log(JSON.stringify({mobile,state,violations:result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))}));
  }
  await page.goto('http://localhost:3300/proto/c3-city.html');
  await scan('first-visit');await page.locator('.welcome-skip').click();
  await page.evaluate(async()=>{await (await import('./c3/bootstrap.js')).readyGallery();const {catalog}=await import('./c3/catalog.js'),{loadModule}=await import('./c3/lazy.js');await Promise.all([...new Set(catalog.map(e=>e.module))].map(loadModule));document.querySelectorAll('.hall,.collect').forEach(el=>el.style.contentVisibility='visible');await document.fonts.ready;});
  await page.waitForTimeout(1800);
  check('43 stages have a readable individual description',await page.evaluate(()=>{const cards=[...document.querySelectorAll('.card[data-k]')];return cards.length===43&&cards.every(r=>{const s=r.querySelector('.pad,.lab-stage,.type-stage,.demo-stage');return s.getAttribute('role')==='group'&&document.getElementById(s.getAttribute('aria-describedby'))?.textContent.length>8;});}));
  check('Every image declares alt text',await page.evaluate(()=>[...document.images].every(i=>i.hasAttribute('alt'))));
  check('Buttons remain in the keyboard tab order',await page.evaluate(()=>[...document.querySelectorAll('button')].every(b=>b.disabled||b.tabIndex>=0||(b.closest('.segs')&&b.getAttribute('role')==='radio'))));
  await scan('all-halls-idle');
  await page.evaluate(()=>{document.querySelectorAll('.card > .card-tools').forEach(p=>p.hidden=false);document.querySelector('#speed-toggle').click();});
  await page.waitForTimeout(200);await scan('expanded-tools-and-playback');
  const speed=page.locator('#speed-dock .segs [aria-checked=true]');const previous=await speed.getAttribute('data-speed');await speed.focus();await page.keyboard.press('ArrowRight');
  check('Arrow keys select and focus the next speed option',await page.locator('#speed-dock .segs [aria-checked=true]').evaluate((b,old)=>b===document.activeElement&&b.dataset.speed!==old,previous));
  await page.evaluate(()=>import('./c3/core.js').then(m=>m.setSpeed(1,true)));
  await page.evaluate(()=>{document.querySelectorAll('.card > .card-tools').forEach(p=>p.hidden=true);document.querySelector('#speed-toggle').click();});
  await page.evaluate(()=>import('./c3/phrase.js').then(m=>m.navigateExhibit('spring')));await page.waitForTimeout(700);
  const toggle=page.locator('[data-k=spring] .tools-toggle');await toggle.focus();await page.keyboard.press('Enter');
  check('Enter opens tools',await page.locator('[data-k=spring] > .card-tools').isVisible());
  check('Keyboard focus has a visible outline',await toggle.evaluate(b=>b.matches(':focus-visible')&&parseFloat(getComputedStyle(b).outlineWidth)>=3));
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.qaCopied=text}}));
  const copy=page.locator('[data-k=spring] .card-copy');await copy.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.qaCopied);
  check('Copied state retains its visible accessible name',await copy.evaluate(b=>b.getAttribute('aria-label').includes(b.textContent.trim())));
  await scan('copied-state-and-guide');await page.keyboard.press('Escape');
  await toggle.focus();await page.keyboard.press('Enter');await page.locator('[data-k=spring] .card-actions button').nth(1).focus();await page.keyboard.press('Enter');
  await page.locator('.code-modal').waitFor({state:'visible'});await scan('code-dialog');await page.keyboard.press('Escape');await page.locator('.code-modal').waitFor({state:'hidden'});
  check('Escape closes the code dialog',await page.locator('.code-modal').isHidden());
  if(mobile){await page.evaluate(()=>import('./c3/core.js').then(m=>m.say('spring')));await page.locator('#dRead').focus();await page.keyboard.press('Enter');await page.locator('.guide-note').waitFor({state:'visible'});await scan('guide-dialog');await page.keyboard.press('Escape');await page.locator('.guide-note').waitFor({state:'hidden'});check('Escape closes the mobile guide dialog',true);}
  await page.evaluate(()=>import('./c3/phrase.js').then(m=>m.navigateExhibit('easing')));await page.waitForTimeout(600);
  const handle=page.locator('[data-k=easing] .bezier-handle').first();const old=await handle.getAttribute('aria-valuenow');await handle.focus();await page.keyboard.press('ArrowRight');
  check('Curve handle updates its ARIA value from keyboard input',Number(await handle.getAttribute('aria-valuenow'))>Number(old));
  reports.push({mobile,checks,scans,violations:scans.flatMap(s=>s.violations)});await context.close();
 }
 fs.writeFileSync('docs/review/phase5/accessibility.json',JSON.stringify(reports,null,2));
 assert.ok(reports.every(r=>r.violations.length===0),'WCAG A/AA violations');
} finally {await browser.close();}
