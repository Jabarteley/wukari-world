/** Actual production venue-host browser acceptance; run against supported local npm run dev.
 * CHROME_BIN=/usr/bin/chromium node --experimental-strip-types scripts/nigeria-runtime-host-check.ts
 * The temporary development page is removed in finally. Does not claim application UI or production acceptance.
 */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { Browser, sleep } from './journeys/cdp.ts';
const root = resolve(import.meta.dirname, '..');
const evidence = resolve(root, 'docs/research/nigeria-runtime-20261015/host'+(process.env.NIGERIA_HOST_REENTRY?'/reentry':process.env.NIGERIA_HOST_WEATHER?'/weather':''));
const fixture = resolve(root, '.nigeria-host-review');
const origin = process.env.NIGERIA_HOST_ORIGIN || 'http://127.0.0.1:5189';
mkdirSync(evidence, { recursive: true }); mkdirSync(fixture, { recursive: true });
const crowdCount=Number(process.env.NIGERIA_HOST_CROWD??8);
const harness = `import * as THREE from '/node_modules/three/build/three.module.js';
import { createVenueHost } from '/src/venue-world.ts';
import { loadCityScenes } from '/src/scene/city-scenes.ts';
import {loadCityRules,CITY_RULES} from '/src/game/cities/registry.ts';
import {lookAt} from '/src/game/conditions/look.ts';
await Promise.all(['lagos','abuja'].flatMap(id=>[loadCityScenes(id),loadCityRules(id)]));
const renderer = new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
let scene, camera; const original = renderer.render.bind(renderer);
renderer.render = (s,c) => { if(s.isScene) {scene=s;camera=c;} original(s,c); };
const world=createVenueHost(document.querySelector('#stage'),{renderer,cityId:'lagos',location:'market'});
let city='lagos', location='market', t=Date.UTC(2026,3,5,11);
const state=()=>world.setState({location,estate:{city},t});
world.setPlayer({name:'Acceptance Player',seed:'nigeria-host-acceptance',look:{body:'woman',hair:'afro'}});
world.setCrowd(Array.from({length:${crowdCount}},(_,i)=>({id:'npc:acceptance'+i,kind:'npc',name:'Local '+i,seed:'local'+i})));
state(); world.resize(); world.update();
const snapshot=()=>{let modules=[], statuses=[], meshes=0,triangles=0,lights=[],gpuTextures=new Map(),meshCosts=[];scene?.traverseVisible(o=>{if(o.userData.runtimeStatus)statuses.push({...o.userData});if(o.name.startsWith('runtime:'))modules.push({name:o.name,scale:o.scale.toArray(),bounds:new THREE.Box3().setFromObject(o).min.toArray().concat(new THREE.Box3().setFromObject(o).max.toArray())});if(o.isMesh&&o.visible){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3;meshCosts.push({name:o.name,parent:o.parent?.name,triangles:(o.geometry.index?.count??o.geometry.attributes.position?.count??0)/3});for(const m of Array.isArray(o.material)?o.material:[o.material])for(const t of Object.values(m)){if(t?.isTexture){const allocation=renderer.properties.get(t).__webglTexture;if(allocation&&!gpuTextures.has(allocation))gpuTextures.set(allocation,{width:t.source.data?.width,height:t.source.data?.height,colorSpace:t.colorSpace});}}}if(o.isLight)lights.push({type:o.type,intensity:o.intensity});});return {conditions:lookAt(city,{id:location},CITY_RULES[city]?.climate,t),diagnostics:world.diagnostics(),modules,statuses,sceneInventory:{meshes,triangles,lights,meshCosts},gpuAllocations:[...gpuTextures.values()],gpu:{...renderer.info.memory},render:{...renderer.info.render}};};
window.check={world,renderer,snapshot,enter:(c,l)=>{city=c;location=l;world.setLocation(l);state();world.update();},time:(value)=>{t=value;state();world.update();},rotate:(yaw)=>{const m=world.motion();m.orbit.rotate(yaw,0);m.wake();},far:()=>{const m=world.motion();m.orbit.zoomBy(.05);m.wake();},dispose:()=>{world.dispose();return {...renderer.info.memory};}};
window.ready=true;`;
writeFileSync(resolve(fixture,'index.html'), '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;height:100%;background:#111}#stage{position:fixed;inset:0}</style></head><body><div id="stage"></div><script type="module" src="./harness.ts"></script></body></html>');
writeFileSync(resolve(fixture,'harness.ts'),harness);
writeFileSync(resolve(evidence,'harness.ts.txt'),harness);
const receipt:any={scope:'Actual createVenueHost with production city definitions, player and crowd; development harness, not full application UI or production', crowdInput:crowdCount,started:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),checks:[],screenshots:[]};
receipt.sourceHashes=Object.fromEntries(['src/venue-world.ts','src/scene/venue-scenes.ts','src/scene/nigeria-runtime-scenes.ts','src/scene/models/runtime-module.ts','src/scene/models/nigeria-navigation.ts','src/scene/city-scenes.ts'].map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));
let browser:Browser|undefined;
const snap=async(label:string)=>{const value=await browser!.eval('check.snapshot()');receipt.checks.push({label,...value});return value;};
const screenshot=async(name:string)=>{const path=resolve(evidence,name+'.png');const shot=await browser!.send('Page.captureScreenshot',{format:'png',fromSurface:false});writeFileSync(path,Buffer.from(shot.data,'base64'));receipt.screenshots.push({name,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')});};
const ready=async(id:string)=>browser!.waitFor(`window.check?.snapshot().modules.some(m=>m.name.includes(${JSON.stringify(id)}))`,30000,'loaded runtime '+id);
try {
 browser=await Browser.launch(9398,['--no-sandbox','--disable-dev-shm-usage']);
 await browser.setViewport({width:1100,height:800,scale:1,mobile:false});
 await browser.goto(origin+'/.nigeria-host-review/index.html');await browser.waitFor('window.ready',60000,'actual host');
 for(const [city,venue,id,target] of [['lagos','market','lagos-broad-street-01',[6,2.8]],['abuja','national-mosque','abuja-mosque-boulevard-01',[8,39.2]]] as const){
  if(process.env.NIGERIA_HOST_CITY && process.env.NIGERIA_HOST_CITY!==city)continue;
  await browser.eval(`check.enter(${JSON.stringify(city)},${JSON.stringify(venue)})`);await ready(id);await sleep(700);
  await browser.eval('(()=>{const m=check.world.motion();m.orbit.zoomBy(2);m.wake()})()');await browser.waitFor('check.snapshot().modules.some(m=>m.name.endsWith(":near"))',15000,'near view');await sleep(700);
  const first=await snap(city+'-entry');assert.equal(first.modules.length,1);assert.ok(first.modules[0].scale.every((v:number)=>Math.abs(v-1.4)<1e-10),'metre scale');
  if(!process.env.NIGERIA_HOST_REENTRY){
  for(const [label,time] of [['day',Date.UTC(2026,3,5,11)],['night',Date.UTC(2026,3,5,22)],['wet-season',Date.UTC(2026,7,5,11)],['harmattan',Date.UTC(2026,0,5,11)]] as const){await browser.eval(`check.time(${time})`);await sleep(300);await snap(city+'-'+label);await screenshot(city+'-'+label);}
  if(!process.env.NIGERIA_HOST_WEATHER){
  await browser.eval(`check.world.walkTo(${target[0]},${target[1]})`);await browser.waitFor('!check.world.diagnostics().avatar.moving',60000,'walk completion');const walked=await snap(city+'-walk');assert.ok(Math.hypot(walked.diagnostics.avatar.x-first.diagnostics.avatar.x,walked.diagnostics.avatar.z-first.diagnostics.avatar.z)>1,'player moved');await screenshot(city+'-walk');
  await browser.eval('check.rotate(Math.PI)');await sleep(1500);await snap(city+'-camera-collision');await screenshot(city+'-camera');
  if(city==='abuja'){await browser.eval('check.world.walkTo(8,21)');await browser.waitFor('!check.world.diagnostics().avatar.moving',60000,'median walk completion');const median=await snap(city+'-median');assert.ok(Math.abs(median.diagnostics.avatar.y-.252)<.08,'median support height');await screenshot(city+'-median');}
  await browser.eval('check.far()');await browser.waitFor('check.snapshot().modules.some(m=>m.name.endsWith(":far"))',15000,'distance-only far tier');await sleep(500);await snap(city+'-far');await screenshot(city+'-far');
  await browser.eval('check.world.recentre()');await sleep(700);
  }}
  if(!process.env.NIGERIA_HOST_WEATHER)for(let i=0;i<3;i++){await browser.eval(`check.enter(${JSON.stringify(city)},'park')`);await sleep(150);const left=await snap(city+'-exit-'+i);assert.equal(left.modules.length,0);await browser.eval(`check.enter(${JSON.stringify(city)},${JSON.stringify(venue)})`);await ready(id);await browser.eval('check.world.update()');await sleep(300);await snap(city+'-reentry-'+i);await screenshot(city+'-reentry-'+i);}
 }
 receipt.disposed=await browser.eval('check.dispose()');await sleep(150);receipt.consoleErrors=browser.consoleErrors;receipt.httpErrors=browser.requests.filter(r=>(r.status??200)>=400);assert.deepEqual(receipt.consoleErrors,[]);assert.deepEqual(receipt.httpErrors,[]);receipt.passed=true;
} catch(error){receipt.passed=false;receipt.error=String(error);if(browser){receipt.consoleErrors=browser.consoleErrors;receipt.httpErrors=browser.requests.filter(r=>(r.status??200)>=400);try{await snap('failure');await screenshot('failure');}catch{}}process.exitCode=1;}
finally{browser?.close();rmSync(fixture,{recursive:true,force:true});receipt.sourceHashesAfter=Object.fromEntries(Object.keys(receipt.sourceHashes).map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex')]));receipt.sourceStable=JSON.stringify(receipt.sourceHashes)===JSON.stringify(receipt.sourceHashesAfter);if(!receipt.sourceStable)receipt.passed=false;receipt.finished=new Date().toISOString();writeFileSync(resolve(evidence,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({passed:receipt.passed,error:receipt.error,evidence,checks:receipt.checks.length}));}
