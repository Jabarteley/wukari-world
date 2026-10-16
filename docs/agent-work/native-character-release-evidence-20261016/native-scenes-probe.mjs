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

const { loadCityContent } = await import('../../../src/game/cities/registry.ts');
await loadCityContent('lagos');
const { loadCityScenes } = await import('../../../src/scene/city-scenes.ts');
await loadCityScenes('lagos');
const { buildVenueScene } = await import('../../../src/scene/venue-scenes.ts');
const { loadAmbient } = await import('../../../src/scene/ambient/hub.ts');
await loadAmbient();
const rows=[];
for (const kind of ['airport','club','park']) {
 const kit=createKit();let scene,notifications=0;
 kit.requestRender=()=>{notifications++;if(notifications>200)throw Error('Readiness notification loop');scene?.group.userData.refreshCharacterCosts?.();};
 scene=buildVenueScene(kit,{id:kind,label:kind,scene:{kind}});
 scene.setCrowd([{id:'staff1',kind:'npc',name:'One',x:-2,z:1},{id:'staff2',kind:'npc',name:'Two',x:2,z:1}]);
 scene.setAmbient({cityId:'lagos',venueId:kind,kind,tier:'full',hourAt:()=>12,rainingAt:()=>false});
 const seen=new Set();let cycles=0;
 while(cycles++<30){
  const tasks=[];scene.group.traverse(node=>{const p=node.userData.ready;if(p&&!seen.has(p)){seen.add(p);tasks.push(p);}});
  if(!tasks.length){await new Promise(resolve=>setTimeout(resolve,30));if(cycles>5)break;continue;}
  await Promise.all(tasks);scene.group.userData.refreshCharacterCosts?.();
 }
 await new Promise(resolve=>setTimeout(resolve,50));
 const avatar=scene.walk.avatar;let skinned=0;avatar.traverse(node=>{if(node.isSkinnedMesh)skinned++;});
 assert.ok(skinned>0,kind+': player retains live native skinned geometry');
 const thigh=avatar.getObjectByName('thigh_l');assert.ok(thigh,kind+': native leg bone');
 scene.walk.gait(true,.3,false);for(let frame=0;frame<30;frame++)scene.stepCharacter(1/60);const walkRotation=thigh.quaternion.toArray();
 scene.walk.gait(true,2.1,true);for(let frame=0;frame<30;frame++)scene.stepCharacter(1/60);assert.notDeepEqual(thigh.quaternion.toArray(),walkRotation,kind+': walk/run phases animate the native leg');
 scene.walk.pose('stand');
 assert.equal(typeof scene.stepCharacter,'function',kind+': native frame clock hook');
 assert.ok(scene.cycleDistance(false)>1.5 && scene.cycleDistance(false)<2.5,kind+': native walk cycle calibration');
 const head=avatar.getObjectByName('head');
 const beforeFrame=head.quaternion.toArray();
 for(let frame=0;frame<40;frame++)scene.stepCharacter(1/60);
 assert.notDeepEqual(head.quaternion.toArray(),beforeFrame,kind+': native idle/transition clock advances');
 const actors=[],errors=[];
 scene.group.traverse(node=>{if(node.userData.characterFoundation)actors.push({name:node.name,foundation:node.userData.characterFoundation,status:node.userData.characterStatus,visible:node.visible,admitted:node.userData.admitted,requested:node.userData.requested});if(node.userData.characterError)errors.push(node.userData.characterError);});
 const occupied=scene.group.getObjectByName('native-decorative-extras')?.userData.occupiedPositions??[];
 const sitters=scene.ambientPeople().filter(person=>person.sitting);
 for(const sitter of sitters)for(const fixed of occupied)assert.ok(Math.hypot(sitter.x-fixed.x,sitter.z-fixed.z)>=1.1-1e-6,kind+': ambient seat is not double-booked '+JSON.stringify({sitter,fixed,distance:Math.hypot(sitter.x-fixed.x,sitter.z-fixed.z)}));
 const seating={authoredReservations:occupied.length,ambientSitters:sitters.length};
 const stats=scene.stats();
 rows.push({kind,seating,stats,notifications,tags:scene.tags().map(t=>t.id),actors,errors,withinBudget:stats.characterTriangles<=72000&&stats.triangles<=87000&&stats.drawCalls<=60});
 scene.dispose();kit.dispose();
}
await writeFile(new URL('./native-scenes-probe.json',import.meta.url),JSON.stringify({warning:'Geometry and readiness only; image stubs, no rendered pixels or device performance',rows},null,2));
console.log(JSON.stringify(rows,null,2));
assert.ok(rows.every(row=>!row.errors.length),'No character load errors');
assert.ok(rows.every(row=>row.tags.includes('staff1')&&row.tags.includes('staff2')),'NPC tags survive asynchronous character load');
assert.ok(rows.every(row=>row.withinBudget),'Scene budget exceeded');
