import {spawn} from 'node:child_process';
import fs from 'node:fs';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function browser(port=19432){
 const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new',`--remote-debugging-port=${port}`,`--user-data-dir=/tmp/motion-qa-${process.pid}`,'--no-first-run','--no-default-browser-check','--use-angle=metal','--disable-backgrounding-occluded-windows','about:blank'],{stdio:'ignore'});
 let targets;for(let i=0;i<100;i++){try{targets=await fetch(`http://localhost:${port}/json/list`).then(r=>r.json());break;}catch{await sleep(100);}}
 const ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),listeners=new Map();
 ws.addEventListener('message',e=>{const d=JSON.parse(e.data);if(d.id){const p=pending.get(d.id);pending.delete(d.id);d.error?p.reject(Error(JSON.stringify(d.error))):p.resolve(d.result);}else listeners.get(d.method)?.(d.params);});
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 const errors=[];listeners.set('Runtime.exceptionThrown',e=>errors.push(e.exceptionDetails));await call('Page.enable');await call('Runtime.enable');
 return {call,evaluate,errors,on:(name,fn)=>listeners.set(name,fn),async viewport(width,height=900,mobile=false,dpr=1){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:dpr,mobile});},async open(){await call('Page.navigate',{url:'http://localhost:3300/proto/c3-city.html'});await sleep(1200);await evaluate('document.fonts.ready.then(()=>true)');},async shot(path,clip){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:!!clip,...(clip?{clip}:{} )});fs.writeFileSync(path,Buffer.from(r.data,'base64'));},close(){ws.close();chrome.kill();}};
}
