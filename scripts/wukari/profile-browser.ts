/** Local Chromium/CDP acceptance. Own profile/process only; no game accounts or DB. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve,sep,basename } from 'node:path';
import assert from 'node:assert/strict';
import { buildingCollision, canStand, type Study } from '../../src/wukari/play/model.ts';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const output = resolve('docs/wukari/evidence'); mkdirSync(output, { recursive: true });
const profile = mkdtempSync(resolve('.cache/wukari/phase82-profile-'));
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
async function shot(name:string){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(output,`phase81-${name}.png`),Buffer.from(r.data,'base64'));}
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
  const gpu=await call('SystemInfo.getInfo',{},'');writeFileSync(resolve(output,'phase82-gpu.json'),JSON.stringify(gpu.gpu,null,2));
  const initial=await poll(state,s=>s?.study==='town'&&!!s.mode,'town ready');
  await click('Play');await poll(state,s=>s?.mode==='Standing','play');await delay(2000);
  await call('Performance.enable');await call('Profiler.enable');await call('Profiler.setSamplingInterval',{interval:1000});await call('Profiler.start');
  const start=await call('Performance.getMetrics');await evaluate(`(()=>{const times=[];let prior=performance.now();window.phase82Frames=times;function tick(t){times.push(t-prior);prior=t;if(times.length<5000)window.phase82Raf=requestAnimationFrame(tick)}window.phase82Raf=requestAnimationFrame(tick)})()`);await key('w',true);await delay(6000);await key('w',false);const end=await call('Performance.getMetrics');
  const {profile:cpu}=await call('Profiler.stop');
  const weights=new Map<number,number>();cpu.samples?.forEach((id:number,i:number)=>weights.set(id,(weights.get(id)??0)+(cpu.timeDeltas?.[i]??1000)));
  const hotspots=cpu.nodes.map((n:any)=>({name:n.callFrame.functionName,url:n.callFrame.url.replace('http://127.0.0.1:5196/',''),line:n.callFrame.lineNumber,ms:(weights.get(n.id)??0)/1000})).sort((a:any,b:any)=>b.ms-a.ms).slice(0,24);
  const identity=await evaluate(`(()=>{const c=document.createElement('canvas'),g=c.getContext('webgl2');if(!g)return{};const e=g.getExtension('WEBGL_debug_renderer_info');const r={renderer:e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):g.getParameter(g.RENDERER),vendor:e?g.getParameter(e.UNMASKED_VENDOR_WEBGL):g.getParameter(g.VENDOR),dpr:devicePixelRatio,cores:navigator.hardwareConcurrency};g.getExtension('WEBGL_lose_context')?.loseContext();return r})()`);
  const frameTimes=await evaluate(`(()=>{cancelAnimationFrame(window.phase82Raf);return window.phase82Frames.slice(1)})()`);const sorted=[...frameTimes].sort((a:number,b:number)=>a-b);
  const result={frames:{count:frameTimes.length,fps:1000/(frameTimes.reduce((a:number,b:number)=>a+b,0)/frameTimes.length),p50:sorted[Math.floor(sorted.length*.5)],p95:sorted[Math.floor(sorted.length*.95)],over33:frameTimes.filter((v:number)=>v>33.34).length},label:process.env.WUKARI_PROFILE_LABEL??'baseline',identity,gpu:gpu.gpu,hotspots,start:start.metrics,end:end.metrics,state:await state(),errors};
  writeFileSync(resolve(output,`phase82-profile-${result.label}.json`),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({label:result.label,identity,frames:result.frames,hotspots:hotspots.slice(0,8),errors:errors.length},null,2));
} catch(error){writeFileSync(resolve(output,'phase82-profile-failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;} finally {try{if(socket?.readyState===1){socket.send(JSON.stringify({id:++sequence,method:'Browser.close'}));await delay(300);}}catch{}socket?.close();if(child.exitCode===null)child.kill();for(const p of pending.values())clearTimeout(p.timer);await delay(300);if(profile.startsWith(resolve('.cache/wukari')+sep)&&/^phase82-profile-[A-Za-z0-9]+$/.test(basename(profile))){try{rmSync(profile,{recursive:true,force:true,maxRetries:4,retryDelay:200});}catch{console.warn('Owned QA profile remains locked: '+basename(profile));}}}
