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
const { createKit } = await import('../../../src/scene/kit.ts');
const { createBody,loadBody,preloadCanonicalBodies } = await import('../../../src/scene/body/skinned.ts');
const { normalizeNativeRecipe } = await import('../../../src/character/native-recipe.ts');
const { createCanonicalStaticAvatar } = await import('../../../src/scene/body/canonical-crowd.ts');
const { preloadNativeStaticLod } = await import('../../../src/scene/body/native-static-lod.ts');
const { totalRenderCost } = await import('../../../src/scene/body/render-cost.ts');
await Promise.all([preloadCanonicalBodies(),preloadNativeStaticLod()]);
const kit=createKit(), rows=[], failures=[];
try {
 for(const body of ['female','male']) {
  const recipe=normalizeNativeRecipe({schema:'allworld-character',version:2,appearance:{body,hair:'short01',garments:['female-casual-01']}});
  const look={native:recipe};
  const actor=await loadBody(kit,look,body,1);
  const bones=new Set();actor.object.traverse(node=>{if(node.isSkinnedMesh)for(const bone of node.skeleton.bones)bones.add(bone.name)});
  assert.equal(bones.size,53);
  assert.equal(actor.object.userData.characterStatus,'ready');
  const cost=totalRenderCost(actor.object), poses=[];
  for(const pose of ['idle','walk','jog','sit','lie','interact','dance']) {
   if(pose==='walk'||pose==='jog')actor.stride(Math.PI*.7,pose==='jog');else actor.show(pose);
   if(pose==='sit')actor.sitOn(0,.65,0,0);
   actor.settle();actor.object.updateMatrixWorld(true);
   const box=new THREE.Box3().setFromObject(actor.object);
   const size=box.getSize(new THREE.Vector3()).toArray();
   if(!size.every(n=>Number.isFinite(n)&&n>0&&n<5))failures.push({body,pose,size});
   poses.push({pose,min:box.min.toArray(),max:box.max.toArray(),size});
  }
  actor.dispose();
  const baked=createCanonicalStaticAvatar(kit,look,{seed:body,detail:'lod',pose:'sit',seat:.65});
  await baked.userData.ready;
  assert.equal(baked.userData.characterStatus,'ready',baked.userData.characterError);
  const staticCost=totalRenderCost(baked);
  rows.push({body,bones:bones.size,cost,staticCost,poses,staticFoundation:baked.userData.characterFoundation});
  baked.userData.dispose();
 }
} finally {kit.dispose()}
const report={scope:'Node native geometry and readiness, not visual or phone proof',rows,failures,resources:[...resources].map(([file,bytes])=>({file:path.relative(root,file),bytes}))};
await writeFile(new URL('./native-probe.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failures.length)process.exitCode=1;
