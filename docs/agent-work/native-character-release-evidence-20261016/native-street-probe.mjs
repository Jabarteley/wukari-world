// Geometry/readiness probe only. Image/canvas stubs do not establish visual or texture-memory acceptance.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const root = process.cwd(), resources = new Map();
const originalFetch = globalThis.fetch;
globalThis.location = { href: 'http://character-integration.localhost:5173/' };
globalThis.self = globalThis;
globalThis.ProgressEvent = class extends Event { constructor(type, value={}) { super(type); Object.assign(this,value); } };
globalThis.fetch = async (input, init) => {
 const raw = String(input instanceof Request ? input.url : input);
 const url = new URL(raw, location.href);
 if (url.protocol === 'file:' || url.hostname === 'character-integration.localhost') {
  const filename = url.protocol === 'file:' ? fileURLToPath(url) : path.join(root,'public',url.pathname);
  try { const bytes=await readFile(filename); resources.set(filename,bytes.length); return new Response(bytes,{status:200,headers:{'Content-Type':filename.endsWith('.json')?'application/json':'application/octet-stream'}}); }
  catch { return new Response('Missing local asset',{status:404}); }
 }
 return originalFetch(input,init);
};
globalThis.createImageBitmap = async () => ({ width:1,height:1,close(){} });
class ProbeImage {
 width=1; height=1; listeners=new Map();
 addEventListener(key,fn){this.listeners.set(key,fn)} removeEventListener(key){this.listeners.delete(key)}
 set src(value){this.url=value;queueMicrotask(()=>this.listeners.get('load')?.call(this,{target:this}));}
}
globalThis.document = {
 createElementNS(_ns,tag) { return tag === 'img' ? new ProbeImage() : this.createElement(tag); },
 createElement(tag) {
  if(tag !== 'canvas') throw Error('Unexpected element ' + tag);
  return {
   width:1, height:1,
   getContext() {
    return {
     drawImage() {},
     getImageData() { return {data:new Uint8ClampedArray([128,128,128,255])}; },
     putImageData() {}
    };
   }
  };
 }
};
const {createKit}=await import('../../../src/scene/kit.ts');
const {preloadLooks}=await import('../../../src/scene/character-lab/native-body.ts');
const {preloadNativeStaticLod}=await import('../../../src/scene/body/native-static-lod.ts');
const {createNativeStreetPeople}=await import('../../../src/scene/street-life/native-people.ts');
const {nearDress}=await import('../../../src/scene/street-life/near.ts');
const {totalRenderCost}=await import('../../../src/scene/body/render-cost.ts');
const people=Array.from({length:8},(_,i)=>({height:2.6,width:1,skin:'#8a5234',shirt:'#ffffff',legs:'#ffffff',jacket:null,child:false}));
const kit=createKit(),scene=new THREE.Scene();let notifications=0;
await Promise.all([preloadNativeStaticLod(),preloadLooks(people.slice(0,4).map((p,i)=>nearDress(p,i,'regression')))]);
const crowd=createNativeStreetPeople(kit,people,'regression',()=>notifications++);scene.add(crowd.group);
const heights=people.map(()=>0),room={triangles:18000,drawCalls:40},rows=[];
const poses=people.map((_,i)=>({x:i*2,z:0,ry:0,mode:0,fade:1,travelled:0}));
async function ready(){const tasks=[];crowd.group.traverse(n=>{if(n.userData.ready)tasks.push(n.userData.ready)});await Promise.all(tasks);}
for(let phase=0;phase<8;phase++) {
 for(const p of poses)p.travelled=phase*.23;
 crowd.update(poses,heights,null,{x:0,z:0},room,()=>true);await ready();
 const visible=crowd.update(poses,heights,null,{x:0,z:0},room,()=>true),cost=totalRenderCost(crowd.group);
 assert.ok(visible.size>0&&visible.size<=4,'bounded visible native snapshots');
 assert.ok(cost.triangles<=room.triangles&&cost.drawCalls<=room.drawCalls,'exact remaining budget');
 rows.push({phase,visible:[...visible],cost});
}
const hidden=new Set([0]);const shown=crowd.update(poses,heights,hidden,{x:0,z:0},room,()=>true);assert.ok(!shown.has(0),'promoted full actor is not duplicated in far snapshots');
crowd.update(poses,heights,null,{x:0,z:0},{triangles:0,drawCalls:0},()=>true);assert.equal(totalRenderCost(crowd.group).triangles,0,'no room means no rendered people');
crowd.dispose();assert.equal(scene.children.length,0,'disposed crowd detached');kit.dispose();
await writeFile(new URL('./native-street-probe.json',import.meta.url),JSON.stringify({scope:'Real native assets with image stubs; geometry/budget/lifecycle only, not rendered browser acceptance',notifications,rows},null,2));
console.log(JSON.stringify({pass:true,notifications,rows},null,2));
