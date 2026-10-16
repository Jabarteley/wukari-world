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
const { createCharacterSystem } = await import('../../../src/scene/character-lab/runtime/characters.js');
const { profile } = await import('../../../src/scene/character-lab/runtime/selected-profile.mjs');
const { normalizeNativeRecipe } = await import('../../../src/character/native-recipe.ts');
const scene = new THREE.Scene();
const runtime = await createCharacterSystem({scene,...profile,footPlantingEnabled:profile.footPlanting,kneeAlignmentEnabled:profile.kneeAlignment,seatedContactEnabled:true});
const rows=[];
try {
 for (const body of ['female','male']) {
  const appearance=normalizeNativeRecipe({schema:'allworld-character',version:2,appearance:{body,hair:'short01',garments:['female-casual-01'],height:1}}).appearance;
  const actor=await runtime.spawn({id:'height-'+body,appearance});
  const rootId=actor.root.uuid, count=scene.children.length, samples=[];
  for(const height of [.85,1.15,.88,1.12,.9,1.1,.85,1.15]) {
   const result=actor.setAppearanceSync({...appearance,height});
   assert.equal(result.ok,true,'height edit must be synchronous');
   actor.update(0);actor.root.updateMatrixWorld(true);
   const bounds=new THREE.Box3().setFromObject(actor.root,true);
   assert.equal(actor.root.uuid,rootId,'height keeps existing actor');
   assert.equal(scene.children.length,count,'height does not add actors');
   samples.push({height,renderedHeight:bounds.max.y-bounds.min.y,minY:bounds.min.y});
  }
  const ratio=samples[1].renderedHeight/samples[0].renderedHeight;
  assert.ok(Math.abs(ratio-1.15/.85)<.015,'geometry follows height ratio');
  rows.push({body,sameActor:true,ratio,samples});actor.dispose();
 }
} finally {runtime.dispose();}
await writeFile(new URL('./native-height-probe.json',import.meta.url),JSON.stringify({scope:'Numerical real native asset height update with image stubs, not browser visual acceptance',rows},null,2));
console.log(JSON.stringify(rows,null,2));
