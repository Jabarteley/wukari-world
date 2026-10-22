/** Isolated hardware-Chrome acceptance; mock GPS only, no real location/account access. */
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {zebraCrossings} from '../../src/wukari/play/crossings.ts';
import {canStand,type Study} from '../../src/wukari/play/model.ts';
const dir=resolve('docs/wukari/evidence');mkdirSync(dir,{recursive:true});
const profile=mkdtempSync(resolve('.cache/wukari/fuw10c-browser-'));
const child=spawn(`${process.env.ProgramFiles}/Google/Chrome/Application/chrome.exe`,['--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling','--disable-renderer-backgrounding','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));let socket:WebSocket|undefined,sequence=0,sid:string|undefined;let recording=false;const movie:{data:string;timestamp:number}[]=[];
const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void;timer:ReturnType<typeof setTimeout>}>(),errors:any[]=[];const checks:Record<string,any>={};
async function poll(fn:()=>any,predicate:(v:any)=>boolean,label:string,timeout=60000):Promise<any>{const start=Date.now();while(Date.now()-start<timeout){const v=await fn();if(predicate(v))return v;await delay(150);}throw Error('Timed out: '+label);}
function call(method:string,params:any={},session=sid):Promise<any>{const id=++sequence;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},60000);pending.set(id,{resolve,reject,timer});socket!.send(JSON.stringify({id,method,params,...(session?{sessionId:session}:{})}));});}
async function evaluate(expression:string){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
const state=()=>evaluate(`(()=>{const p=document.querySelector('.viewport');return p?{...p.dataset,overflow:document.documentElement.scrollWidth>innerWidth}:null})()`);
async function click(text:string){await evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}&&b.getBoundingClientRect().width);if(!b)throw Error('Missing '+${JSON.stringify(text)});b.scrollIntoView({block:'nearest'});b.click()})()`);}
async function shot(name:string){const s=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(dir,'phase10c-'+name+'.png'),Buffer.from(s.data,'base64'));}
async function key(key:string,on:boolean){await call('Input.dispatchKeyEvent',{type:on?'keyDown':'keyUp',key,code:'Key'+key.toUpperCase(),windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});}
try{
 const port=await poll(()=>{try{return readFileSync(resolve(profile,'DevToolsActivePort'),'utf8');}catch{return'';}},v=>/^\d+\r?\n/.test(v),'debugger');
 socket=new WebSocket(`ws://127.0.0.1:${port.split(/\r?\n/)[0]}${port.split(/\r?\n/)[1]}`);await new Promise<void>((r,j)=>{socket!.addEventListener('open',()=>r(),{once:true});socket!.addEventListener('error',()=>j(Error('CDP socket')),{once:true});});
 socket.addEventListener('message',e=>{const m=JSON.parse(String(e.data));if(m.id){const p=pending.get(m.id);if(p){clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}else if(m.method==='Page.screencastFrame'){if(recording&&movie.length<180)movie.push({data:m.params.data,timestamp:m.params.metadata.timestamp});void call('Page.screencastFrameAck',{sessionId:m.params.sessionId}).catch(()=>{});}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args);});
 const target=await call('Target.createTarget',{url:'about:blank'},'');sid=(await call('Target.attachToTarget',{targetId:target.targetId,flatten:true},'')).sessionId;
 await call('Page.enable');await call('Runtime.enable');await call('Page.bringToFront');await call('Emulation.setDeviceMetricsOverride',{width:1440,height:960,deviceScaleFactor:1,mobile:false});await call('Page.navigate',{url:'http://127.0.0.1:5196/'});

 await poll(state,s=>s?.study==='fuw'&&!!s.mode,'FUW');await click('Play');await delay(1000);const samples=[];
 for(const direction of ['e','q','e','q']){const before=await state(),start=Date.now();await key(direction,true);await delay(200);await key(direction,false);const elapsed=Date.now()-start;await delay(800);const after=await state();samples.push({direction,elapsed,before,after});}
 writeFileSync(resolve(dir,'phase10c-camera-audit.json'),JSON.stringify(samples,null,2));console.log(JSON.stringify(samples,null,2));
}catch(e){console.log(String(e));throw e;}
finally{try{if(socket?.readyState===1){socket.send(JSON.stringify({id:++sequence,method:'Browser.close'}));await delay(300);}}catch{}socket?.close();if(child.exitCode===null)child.kill();for(const p of pending.values())clearTimeout(p.timer);}
