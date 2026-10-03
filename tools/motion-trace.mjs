// Native CDP benchmark; no npm install or site build required.
// Usage: node tools/motion-trace.mjs before|after
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {spawn} from 'node:child_process';
const label=process.argv[2]||'after',port=19435;
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',[
 '--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/motion-lexicon-perf-${process.pid}`,
 '--window-size=1440,900','--use-angle=metal','--enable-gpu-rasterization','--ignore-gpu-blocklist','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-first-run','--no-default-browser-check','about:blank'
],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;const pending=new Map(),events=new Map();
async function call(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
try{
 let targets;
 for(let n=0;n<100;n++){try{targets=await fetch(`http://localhost:${port}/json/list`).then(r=>r.json());break;}catch{await sleep(100);}}
 ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
 ws.addEventListener('message',e=>{const data=JSON.parse(e.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(Error(JSON.stringify(data.error))):p.resolve(data.result);}else events.get(data.method)?.(data.params);});
 await call('Page.enable');await call('Runtime.enable');
 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await call('Page.navigate',{url:'http://localhost:3300/proto/c3-city.html'});await sleep(1800);await evaluate('document.fonts.ready.then(()=>true)');
 const metadata=await evaluate('({ua:navigator.userAgent,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],height:document.documentElement.scrollHeight})');
 const scenarios=[['scroll',null,30000],['hero-pointer','#top',6000],['cursor-pointer','#hall-cursor',6000],['shader-pointer','#hall-shader',6000],['impact-hold','[data-k="burst"]',8000]];
 const results=[];
 for(const [name,selector,duration] of scenarios){
  await evaluate(`document.querySelector('#dX').click();document.documentElement.style.scrollBehavior='auto';${selector?`document.querySelector('${selector}').scrollIntoView({block:'center',behavior:'instant'})`:'scrollTo(0,0)'}`);await sleep(1400);
  // Warm up lazy shader modules/textures before interactive measurements.
  if(name==='shader-pointer')await evaluate(`document.querySelector('[data-k="distortion"]').scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(300);
  const trace=[];events.set('Tracing.dataCollected',p=>trace.push(...p.value));
  await call('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.stack,benchmark,cc',transferMode:'ReportEvents'});
  const metrics=await evaluate(`(async()=>{
   const name=${JSON.stringify(name)},duration=${duration},frames=[],long=[];let last=0,start=0,trigger=-1;
   const obs=new PerformanceObserver(list=>list.getEntries().forEach(e=>long.push({start:e.startTime,duration:e.duration})));obs.observe({type:'longtask',buffered:false});
   const stage=document.querySelector(name==='cursor-pointer'?'.magnetic-stage':name==='shader-pointer'?'.distortion-stage':'.hero');
   const r=stage?.getBoundingClientRect(),max=document.documentElement.scrollHeight-innerHeight;
   await new Promise(resolve=>{function frame(t){if(!start)start=t;const elapsed=t-start;if(last)frames.push(t-last);last=t;
    if(name==='scroll')scrollTo(0,max*Math.min(1,elapsed/duration));
    else if(name.endsWith('pointer')){const angle=elapsed/330;const x=r.left+r.width*(.5+.38*Math.sin(angle)),y=r.top+r.height*(.5+.3*Math.cos(angle*1.3));stage.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',clientX:x,clientY:y}));}
    else {const index=Math.floor(elapsed/1800);if(index!==trigger){trigger=index;document.querySelector('[data-k="burst"] .b').click();const hold=document.querySelector('[data-k="hold"] .b');hold.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));setTimeout(()=>hold.dispatchEvent(new KeyboardEvent('keyup',{key:'Enter',bubbles:true})),1350);}}
    if(elapsed<duration)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
   obs.disconnect();const elapsed=frames.reduce((a,b)=>a+b,0),sorted=[...frames].sort((a,b)=>a-b);return {elapsedMs:elapsed,frames:frames.length,fps:frames.length/elapsed*1000,droppedFrames:frames.reduce((n,dt)=>n+Math.max(0,Math.round(dt/(1000/60))-1),0),p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:Math.max(...frames),longTasks:long.length,maxLongTaskMs:Math.max(0,...long.map(e=>e.duration)),over100ms:long.filter(e=>e.duration>100).length};})()`);
  const done=new Promise(r=>events.set('Tracing.tracingComplete',r));await call('Tracing.end');await done;
  const layouts=trace.filter(e=>e.name==='Layout'&&e.ph==='X'),forced=layouts.filter(e=>e.args?.beginData?.stackTrace?.length);
  const paints=trace.filter(e=>e.name==='Paint'&&e.ph==='X');let area=0;
  for(const e of paints){const c=e.args?.data?.clip;if(Array.isArray(c)&&c.length===8){let s=0;for(let i=0;i<4;i++){const j=(i+1)%4;s+=c[i*2]*c[j*2+1]-c[j*2]*c[i*2+1];}area+=Math.min(Math.abs(s)/2,1440*900);}}
  const row={scenario:name,...metrics,layoutEvents:layouts.length,forcedLayouts:forced.length,layoutMs:layouts.reduce((n,e)=>n+(e.dur||0)/1000,0),paintEvents:paints.length,paintViewportEquivalents:area/(1440*900)};results.push(row);
  fs.writeFileSync(`docs/review/phase3/performance/${label}-${name}.trace.json.gz`,gzipSync(JSON.stringify({traceEvents:trace.filter(e=>e.cat?.includes('devtools.timeline')||e.ph==='M')})));
  console.log(JSON.stringify(row));
 }
 fs.writeFileSync(`docs/review/phase3/performance/${label}.json`,JSON.stringify({label,date:new Date().toISOString(),metadata,results},null,2));
}finally{ws?.close();chrome.kill();}
