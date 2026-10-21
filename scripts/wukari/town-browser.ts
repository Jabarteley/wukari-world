/** Local Chromium/CDP acceptance. Own profile/process only; no game accounts or DB. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve,sep,basename } from 'node:path';
import assert from 'node:assert/strict';
import { buildingCollision, canStand, type Study } from '../../src/wukari/play/model.ts';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const output = resolve('docs/wukari/evidence'); mkdirSync(output, { recursive: true });
const profile = mkdtempSync(resolve('.cache/wukari/phase9-browser-'));
const chrome = process.env.CHROME ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`;
const child = spawn(chrome, ['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',...(process.env.WUKARI_SOFTWARE?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),'--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket: WebSocket | undefined;
let sequence = 0, session: string | undefined;
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const errors: unknown[] = [], network: string[] = [], checks: Record<string, unknown> = {};
async function poll<T>(fn: () => T | Promise<T>, accept: (value: T) => boolean, label: string, maxMs = 45000): Promise<T> {
  const start=Date.now(); while(Date.now()-start<maxMs){const value=await fn();if(accept(value))return value;await delay(100);} throw new Error(`Timed out: ${label}`);
}
function call(method: string, params: Record<string, unknown> = {}, sid = session): Promise<any> {
  const id=++sequence;
  return new Promise((resolveReply,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},45000);pending.set(id,{resolve:resolveReply,reject,timer});socket!.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});
}
async function evaluate(expression: string) { const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value; }
const state=()=>evaluate(`(()=>{const p=document.querySelector('.viewport');return p?{...p.dataset,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText.slice(0,500)}:null})()`);
async function click(text: string) { const point=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getBoundingClientRect().width);if(!b)throw Error('Missing button '+${JSON.stringify(text)});b.scrollIntoView({block:'nearest'});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point}); }
async function key(key: string, down: boolean) {await call('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key,code:key==='Shift'?'ShiftLeft':`Key${key.toUpperCase()}`,windowsVirtualKeyCode:key==='Shift'?16:key.toUpperCase().charCodeAt(0),modifiers:key==='Shift'&&down?8:0});}
async function shot(name:string){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(output,`phase9-${name}.png`),Buffer.from(r.data,'base64'));}
try {
  child.on('error',error=>errors.push(String(error)));
  const portFile=resolve(profile,'DevToolsActivePort');const debuggerInfo=await poll(()=>{try{return readFileSync(portFile,'utf8')}catch{return ''}},value=>/^\d+\r?\n/.test(value),'Chromium debugger ready');
  const [port,path]=debuggerInfo.trim().split(/\r?\n/);
  socket=new WebSocket(`ws://127.0.0.1:${port}${path}`);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r(),{once:true});socket!.addEventListener('error',()=>j(new Error('CDP connect failed')),{once:true});});
  socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result);}}else{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args);if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);if(m.method==='Network.loadingFailed')errors.push(m.params);}});
  const target=await call('Target.createTarget',{url:'about:blank'},'');session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},'')).sessionId;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:5196/'});
  const gpu=await call('SystemInfo.getInfo',{},'');writeFileSync(resolve(output,'phase9-gpu.json'),JSON.stringify(gpu.gpu,null,2));
  const initial=await poll(state,s=>s?.study==='town'&&!!s.mode,'town ready');
  await click('Play');await poll(state,s=>s?.mode==='Standing','play');await delay(700);
  if(process.env.WUKARI_STAGE==='9b'||process.env.WUKARI_STAGE==='9c'){
    await delay(9000);await shot(process.env.WUKARI_STAGE==='9c'?'9c-scenery':'9b-traffic');const before=await state();assert(Number(before.motorcycles)>0);const frames=[];for(let i=0;i<12;i++){await delay(180);frames.push((await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})).data);}const after=await state();assert(Number(after.vehicleDistance)>Number(before.vehicleDistance));writeFileSync(resolve(output,'phase9-traffic-capture.html'),`<!doctype html><meta charset="utf-8"><title>Wukari simulated traffic capture</title><style>body{margin:0;background:#1b332b}img{width:100%;max-height:95vh;object-fit:contain}</style><img id="f"><script>const frames=${JSON.stringify(frames)};let n=0;setInterval(()=>document.getElementById('f').src='data:image/png;base64,'+frames[n++%frames.length],180)</script>`);writeFileSync(resolve(output,'phase9-traffic-browser.json'),JSON.stringify({before,after,errors},null,2));
  }else{
    await shot('9a-town');await click('Explore Map');await delay(300);await shot('9a-overview');await evaluate(`document.querySelector('[aria-label="Close network overview"]').click()`);await click('Places');await delay(300);await shot('9a-places');
  }
  assert.equal(errors.length,0,JSON.stringify(errors));console.log('Phase9 visual capture passed');
} finally {try{if(socket?.readyState===1){socket.send(JSON.stringify({id:++sequence,method:'Browser.close'}));await delay(300);}}catch{}socket?.close();if(child.exitCode===null)child.kill();for(const p of pending.values())clearTimeout(p.timer);}
