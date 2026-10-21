/** Local Chromium/CDP acceptance. Own profile/process only; no game accounts or DB. */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { buildingCollision, canStand, type Study } from '../../src/wukari/play/model.ts';
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const output = resolve('docs/wukari/evidence'); mkdirSync(output, { recursive: true });
const profile = mkdtempSync(resolve('.cache/wukari/phase7-browser-'));
const chrome = process.env.CHROME ?? `${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`;
const child = spawn(chrome, ['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--use-angle=swiftshader','--enable-unsafe-swiftshader','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket: WebSocket | undefined;
let sequence = 0, session: string | undefined;
const pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> }>();
const errors: unknown[] = [], network: string[] = [], checks: Record<string, unknown> = {};
async function poll<T>(fn: () => T | Promise<T>, accept: (value: T) => boolean, label: string, maxMs = 20000): Promise<T> {
  const start=Date.now(); while(Date.now()-start<maxMs){const value=await fn();if(accept(value))return value;await delay(100);} throw new Error(`Timed out: ${label}`);
}
function call(method: string, params: Record<string, unknown> = {}, sid = session): Promise<any> {
  const id=++sequence;
  return new Promise((resolveReply,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve:resolveReply,reject,timer});socket!.send(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})}));});
}
async function evaluate(expression: string) { const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value; }
const state=()=>evaluate(`(()=>{const p=document.querySelector('.viewport');return p?{...p.dataset,overflow:document.documentElement.scrollWidth>innerWidth,text:document.body.innerText.slice(0,500)}:null})()`);
async function click(text: string) { const point=await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getBoundingClientRect().width);if(!b)throw Error('Missing button '+${JSON.stringify(text)});const r=b.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point}); }
async function key(key: string, down: boolean) {await call('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key,code:key==='Shift'?'ShiftLeft':`Key${key.toUpperCase()}`,windowsVirtualKeyCode:key==='Shift'?16:key.toUpperCase().charCodeAt(0),modifiers:key==='Shift'&&down?8:0});}
async function shot(name:string){const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(output,`phase7-${name}.png`),Buffer.from(r.data,'base64'));}
try {
  child.on('error',error=>errors.push(String(error)));
  const portFile=resolve(profile,'DevToolsActivePort');await poll(()=>existsSync(portFile),Boolean,'Chromium debugger');
  const [port,path]=readFileSync(portFile,'utf8').trim().split(/\r?\n/);
  socket=new WebSocket(`ws://127.0.0.1:${port}${path}`);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r(),{once:true});socket!.addEventListener('error',()=>j(new Error('CDP connect failed')),{once:true});});
  socket.addEventListener('message',event=>{const m=JSON.parse(String(event.data));if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);if(m.error)p.reject(new Error(JSON.stringify(m.error)));else p.resolve(m.result);}}else{if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args);if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);if(m.method==='Network.loadingFailed')errors.push(m.params);}});
  const target=await call('Target.createTarget',{url:'about:blank'},'');session=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},'')).sessionId;
  await call('Page.enable');await call('Runtime.enable');await call('Network.enable');await call('Page.bringToFront');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:'http://127.0.0.1:5196/'});
  const initial=await poll(state,s=>s?.study==='town'&&!!s.mode,'town render');await delay(400);assert.equal(initial.overflow,false);assert(Number(initial.draws)<30);
  assert(!network.some(url=>url.includes('/fuw.json')),'FUW data must be lazy loaded');checks.initial=initial;
  await key('w',true);const walk=await poll(state,s=>Number(s?.distance)>1.2&&s?.mode==='Walking','real-road walking');await key('w',false);await delay(200);checks.walk=walk;
  await click('Reset');await delay(200);await key('Shift',true);await key('w',true);const sprint=await poll(state,s=>s?.mode==='Sprinting'&&Number(s.distance)>1,'sprinting on original road');assert.equal(Number(sprint.distance)>1,true);await key('w',false);await key('Shift',false);await delay(200);checks.sprint=sprint;
  const before=Number(sprint.bearing);await key('e',true);await poll(state,s=>Math.abs(Number(s.bearing)-before)>10,'follow-camera rotation');await key('e',false);await delay(150);checks.cameraRotation=true;
  await click('Reset');await delay(100);await key('a',true);const blocked=await poll(state,s=>s?.blocked==='true','corridor collision');await key('a',false);assert.equal(blocked.blocked,'true');
  const town=JSON.parse(readFileSync('data/wukari/phase7/town.json','utf8')) as Study;assert(canStand({x:Number(blocked.x),z:Number(blocked.z)},town));assert(!buildingCollision({x:Number(blocked.x),z:Number(blocked.z)},town.buildings));checks.collisionAndCorridor=blocked;
  await click('Reset');await delay(250);await shot('desktop');
  await click('Map');const pauseBefore=Number((await state()).distance);await key('w',true);await delay(300);await key('w',false);assert.equal(Number((await state()).distance),pauseBefore);checks.mapPausesMovement=true;
  await click('FUW location review');await poll(state,s=>s?.study==='fuw'&&!!s.mode,'FUW source map');await delay(300);assert.equal(await evaluate(`document.querySelector('.view-tools button:last-child').disabled`),true);assert.equal(await evaluate(`document.querySelectorAll('.source-map circle').length`),5);await shot('fuw-review');checks.fuwNonSpawning=true;
  await click('Town demo');await poll(state,s=>s?.study==='town'&&!!s.mode,'return town');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});await delay(300);
  const button=await evaluate(`(()=>{const r=document.querySelector('[aria-label="Move forward"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height}})()`);assert(button.width>=44&&button.height>=44);
  await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x,y:button.y,id:1}]});await poll(state,s=>Number(s?.distance)>1.2,'real touch movement');await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(200);const touch=await state();assert(Number(touch.distance)>1);assert.equal(touch.overflow,false);checks.touchMovement=touch;
  const settled=Number(touch.distance);await delay(300);assert(Math.abs(Number((await state()).distance)-settled)<.05,'touch release must stop movement');
  await click('Sprint');await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:button.x,y:button.y,id:1}]});await poll(state,s=>s?.mode==='Sprinting'&&Number(s.distance)>settled+.5,'mobile sprint toggle');await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await click('Sprint ON');checks.touchSprint=true;
  const cameraBefore=Number((await state()).bearing);await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:260,y:400,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:310,y:400,id:2}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(200);assert(Math.abs(Number((await state()).bearing)-cameraBefore)>5);checks.touchLook=true;
  await click('Reset');await delay(300);await shot('mobile');
  await click('Explore');await delay(150);assert((await state()).mode.startsWith('Exploration'));checks.explorationToggle=true;
  assert.equal(errors.length,0,JSON.stringify(errors));
  writeFileSync(resolve(output,'phase7-browser.json'),JSON.stringify({status:'passed',checks,errors,requests:network.filter(u=>!u.includes('node_modules')&&!u.includes('/@'))},null,2)+'\n');
  console.log(JSON.stringify({status:'passed',checks:Object.keys(checks),errors:errors.length}));
} catch(error) {writeFileSync(resolve('.cache/wukari/phase7-browser-failure.json'),JSON.stringify({error:String(error),checks,errors},null,2)+'\n');throw error;}
finally {try{if(socket?.readyState===1)await call('Browser.close',{},'');}catch{}socket?.close();if(child.exitCode===null)child.kill();for(const p of pending.values())clearTimeout(p.timer);}
