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
const { createStandIn } = await import('../../../src/scene/body/stand-in.ts');
const { buildNeighbourhoodScene } = await import('../../../src/scene/neighbourhood-scene.ts');
const { normalizeNativeRecipe } = await import('../../../src/character/native-recipe.ts');
const { preloadCanonicalBodies } = await import('../../../src/scene/body/skinned.ts');
const { totalRenderCost } = await import('../../../src/scene/body/render-cost.ts');
const { loadCityContent } = await import('../../../src/game/cities/registry.ts');
await loadCityContent('lagos');await preloadCanonicalBodies();
const kit=createKit(), scene=buildNeighbourhoodScene(kit), standIn=createStandIn(kit,()=>{});
const fullVisible=()=>{const found=[];scene.group.traverseVisible(o=>{if(o.userData.characterFoundation==='native53'&&o.userData.characterDetail==='full')found.push(o);});return found;};
const ready=async()=>{for(let i=0;i<100;i++){let loading=false;scene.group.traverse(o=>{if(o.userData.characterStatus==='loading')loading=true;assert.notEqual(o.userData.characterStatus,'error',o.userData.characterError);});if(!loading)return;await new Promise(r=>setTimeout(r,5));}throw Error('Native bodies did not become ready');};
const rebind=()=>standIn.attach({group:scene.group,avatar:scene.walk.avatar,scale:scene.walk.scale});
const look=body=>({native:normalizeNativeRecipe({schema:'allworld-character',version:2,appearance:{body,hair:'short01',garments:['female-casual-01']}})});
const rows=[];
try {
 for(const body of ['female','male','female']) {
  const before=scene.walk.avatar;
  const visibleBefore=before.visible;
  scene.setPlayer({look:look(body),seed:'same-local-player',name:'Test Player'});
  assert.equal(scene.walk.avatar.visible,visibleBefore,'scene replacement preserves hidden-avatar lease before host rebind');
  standIn.wear(look(body),'same-local-player');rebind();standIn.start(null);
  await ready();
  assert.equal(fullVisible().length,1,'exactly one rendered player after appearance update/readiness');
  for(let i=0;i<20;i++) {
   const x=2+i/20,z=-3;
   scene.walk.move(x,0,z,.5);standIn.move(x,0,z,.5);standIn.gait(i*.2,false);standIn.step(1/60);
   assert.equal(fullVisible().length,1,'exactly one rendered player during movement');
   assert.equal(fullVisible()[0],standIn.object,'the moving body is the sole visible player');
  }
  standIn.pose('stand',undefined,true);for(let i=0;i<40;i++)standIn.step(1/60);
  assert.equal(fullVisible().length,1,'exactly one after stopping');
  rows.push({body,visiblePlayers:fullVisible().length,ready:true,cost:totalRenderCost(scene.group)});
  standIn.attach(null);
  assert.equal(scene.walk.avatar.visible,true,'detaching restores the current replacement avatar');
  assert.equal(fullVisible().length,1,'one fallback body after detach');
  rebind();assert.equal(fullVisible().length,1,'one body after re-entry/reattach');
 }
} finally {standIn.dispose();scene.dispose();kit.dispose();}
await writeFile(new URL('./neighbourhood-player-ownership-probe.json',import.meta.url),JSON.stringify({scope:'Native scene/stand-in visibility across appearance updates, readiness, movement and detach/reattach; image stubs, no browser proof',rows},null,2));
console.log(JSON.stringify(rows,null,2));
