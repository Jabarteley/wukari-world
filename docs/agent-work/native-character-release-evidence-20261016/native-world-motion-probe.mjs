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
 for(const body of ['female','male']) {
  const appearance=normalizeNativeRecipe({schema:'allworld-character',version:2,appearance:{body,hair:'short01',garments:['fitted-skirt'],height:1.15}}).appearance;
  const actor=await runtime.spawn({id:'motion-'+body,appearance,groundHeight:()=>3});
  const parent=new THREE.Group();parent.scale.setScalar(1.4);parent.position.set(8,3,5);scene.add(parent);parent.add(actor.root);
  let angularSpeed=0, maxCorrection=0, contacts=0, minPlanted=Infinity;
  for(let frame=0;frame<180;frame++) {
   const moving=frame<120, run=frame>=60&&moving;
   parent.position.z=5+Math.min(frame,120)/60*1.82;
   parent.rotation.y=frame>=90?Math.min(frame-90,30)/30*Math.PI/2:0;
   parent.updateMatrixWorld(true);
   actor.setMotion({speed:moving?(run?2.4:1.25):0,gait:run?'run':'walk',samplePhase:frame/60,sampleMoving:moving,sampleBlend:true,inPlace:false});
   actor.update(0); // The host samples a pose before the timed frame: this must not consume turn history.
   actor.update(1/60);
   const s=actor.snapshot();angularSpeed=Math.max(angularSpeed,s.planting.angularSpeed??0);
   for(const f of Object.values(s.planting.feet)) {
    if(f.weight>.5){contacts++;minPlanted=Math.min(minPlanted,f.minY);}
    maxCorrection=Math.max(maxCorrection,f.correctionM??0);
   }
   for(const bone of actor.bones.values())assert.ok([...bone.position.toArray(),...bone.quaternion.toArray()].every(Number.isFinite),body+' finite animated bones');
  }
  const stopped=actor.snapshot().locomotion.movingWeight;
  assert.ok(angularSpeed>1,body+' detects rotation of parent despite zero-dt sampling');
  assert.ok(contacts>10,body+' exercised planted-foot solver');
  assert.ok(minPlanted>=3-.04,body+' support uses raised world ground');
  assert.ok(stopped<.01,body+' locomotion settles after stopping');
  rows.push({body,parentScale:1.4,height:1.15,worldFloor:3,angularSpeed,maxCorrection,contacts,minPlanted,stopped});
  actor.dispose();parent.removeFromParent();
 }
} finally {runtime.dispose();}
await writeFile(new URL('./native-world-motion-probe.json',import.meta.url),JSON.stringify({scope:'Numerical world-transform and transition regression; no visual acceptance or phone proof',rows},null,2));
console.log(JSON.stringify(rows,null,2));
