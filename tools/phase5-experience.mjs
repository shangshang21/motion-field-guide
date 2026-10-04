import assert from 'node:assert/strict';import fs from 'node:fs';import {browser,sleep} from './cdp.mjs';
const b=await browser(19462),checks=[];
async function check(name,expression,test=v=>assert.equal(v,true)){const value=await b.evaluate(expression);test(value);checks.push({name,passed:true});console.log('PASS',name);}
try{
 await b.viewport(390,844,true,3);await b.open();
 await check('First greeting is visible, in the hero flow and has four short sentences',`(()=>{const el=document.querySelector('#first-visit');return !el.hidden&&el.parentElement.matches('.hero .left')&&el.querySelector('p').textContent.match(/。/g).length===4;})()`);
 await sleep(24200);
 await check('Greeting disappears within 30 seconds and is remembered',`document.querySelector('#first-visit').hidden&&localStorage.getItem('motion-field-guide.welcomed')==='yes'`);
 await b.open();await check('Returning visitors are not greeted again',`document.querySelector('#first-visit').hidden`);
 await b.evaluate(`import('./c3/bootstrap.js').then(m=>m.readyGallery())`);
 await check('All 43 cards expose two footer buttons and keep other tools closed',`[...document.querySelectorAll('.card[data-k]')].length===43&&[...document.querySelectorAll('.card[data-k]')].every(r=>r.querySelector(':scope > .card-tools').hidden&&r.querySelector('footer .card-toolbar').children.length===2&&!r.querySelector('footer .exhibit-feelings'))`);
 await b.evaluate(`import('./c3/phrase.js').then(m=>m.navigateExhibit('spring'))`);await sleep(900);
 await b.evaluate(`document.querySelector('[data-k=spring] .tools-toggle').focus()`);await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await check('Enter opens the card tools',`!document.querySelector('[data-k=spring] > .card-tools').hidden`);
 await b.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await b.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await check('Escape closes the tools and returns focus',`document.querySelector('[data-k=spring] > .card-tools').hidden&&document.activeElement.matches('[data-k=spring] .tools-toggle')`);
 await b.evaluate(`import('./c3/core.js').then(m=>m.say('spring'))`);
 await check('Inline guide follows the card and never overlays its demonstration',`(()=>{const d=document.querySelector('#dialog'),s=document.querySelector('[data-k=spring] .demo-stage');return d.closest('.card').dataset.k==='spring'&&d.getBoundingClientRect().top>=s.getBoundingClientRect().bottom;})()`);
 await b.evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.qaCopied=text}});document.querySelector('[data-k=spring] .card-copy').click()`);await sleep(200);
 await check('The default copy button carries the actual current parameters',`import('./c3/core.js').then(m=>window.qaCopied===m.phrase('spring'))`);
 await check('All 43 stages have individual screen-reader instructions',`[...document.querySelectorAll('.card[data-k]')].every(r=>{const s=r.querySelector('.pad,.lab-stage,.type-stage,.demo-stage');return s.getAttribute('role')==='group'&&s.getAttribute('aria-describedby')&&document.getElementById(s.getAttribute('aria-describedby'))?.textContent.length>8})`);
 await b.evaluate(`document.querySelector('[data-k=spring] .tools-toggle').focus()`);await b.shot('docs/review/phase5/keyboard-focus.png');
 await b.call('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(window,'localStorage',{get(){throw Error('Storage disabled for QA')}})`});await b.open();await check('Storage-disabled browser can still read and skip the greeting',`(()=>{const g=document.querySelector('#first-visit');if(g.hidden)return false;g.querySelector('.welcome-skip').click();return g.hidden})()`);
 assert.deepEqual(b.errors,[]);checks.push({name:'No uncaught errors in the first-visit and keyboard flows',passed:true});fs.writeFileSync('docs/review/phase5/experience-checks.json',JSON.stringify({date:new Date().toISOString(),checks},null,2));
}finally{b.close();}
