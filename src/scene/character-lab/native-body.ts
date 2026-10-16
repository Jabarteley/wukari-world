/** The lab's native53 actor is the sole visual body, including every fitted garment. */
import * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { BodyDetail, BodyPose, SkinnedBody } from '../body/skinned.ts';
import type { BodyKey } from '../body/manifest.ts';
import type { CharacterStyle } from '../body/style.ts';
import type { FootContact } from '../body/foot-contact.ts';
import { nativeRecipeForLook } from '../../character/native-migration.ts';
import { createCharacterSystem } from './runtime/characters.js';
import { profile } from './runtime/selected-profile.mjs';
import { NATIVE_FULL_BODY_TRIANGLES } from '../../budgets.ts';

// No hidden canonical actor or dimensions. This converts source metres into existing world units.
const WORLD_UNITS_PER_METRE = 1.4;
const MAX_NATIVE_TRIANGLES = NATIVE_FULL_BODY_TRIANGLES.value;
const MAX_NATIVE_DRAWS = 10;
type NativeSystem = Awaited<ReturnType<typeof createCharacterSystem>>;
type NativeActor = ReturnType<NativeSystem['spawnSync']>;
let system: NativeSystem | undefined, systemTask: Promise<NativeSystem> | undefined, serial = 0;
const staging = new THREE.Group();
const pendingRenders = new WeakSet<Kit>();
export function requestNativeRender(kit: Kit): void {
  if(pendingRenders.has(kit))return;
  pendingRenders.add(kit);
  queueMicrotask(()=>{pendingRenders.delete(kit);kit.requestRender?.();});
}
const leases = new Map<string, Promise<() => void>>();
const nativeStrideScales=new Map<string,number>();
export function nativeWalkCycleDistance(look:unknown,seed:unknown):number {
  const recipe=nativeRecipeForLook(look,seed),clip=system?.motionMetadata.clips?.Walk_InPlace;
  return Number(clip?.nominal_speed_mps??1.3190851956605911)*Number(clip?.duration_seconds??1.0666666666666667)*WORLD_UNITS_PER_METRE*recipe.appearance.height*(nativeStrideScales.get(recipe.appearance.body)??1);
}
function getSystem(): Promise<NativeSystem> {
  return systemTask ??= createCharacterSystem({ scene: staging, ...profile,
    footPlantingEnabled: profile.footPlanting, kneeAlignmentEnabled: profile.kneeAlignment,
    seatedContactEnabled: true, groundHeight: () => 0,
  }).then(value => system = value).catch(error => { systemTask = undefined; throw error; });
}
/** The recipe the world dresses a look in (the Fight screen reaches it here, so the modules shared with the first download keep their chunk grouping). */
export function recipeForLook(look: unknown, seed: unknown) { return nativeRecipeForLook(look, seed); }
/** The shared native system (catalogue, motion, asset store): the Fight screen spawns its own fighters from it, so the world's cached files are reused. */
export function nativeSystem(): Promise<NativeSystem> { return getSystem(); }
export async function preloadLooks(items: readonly { look?: unknown; seed?: unknown }[]): Promise<void> {
  const runtime = await getSystem();
  await Promise.all(items.map(async item => {
    const appearance = nativeRecipeForLook(item.look, item.seed).appearance;
    // Asset leases depend only on catalogue selectors, not the many independent morph/swatch values.
    const signature = JSON.stringify([appearance.body, appearance.hair, appearance.garments, appearance.shoes, appearance.eyeColor, appearance.complexion]);
    let lease = leases.get(signature);
    if (!lease) { lease = runtime.preload([appearance]); leases.set(signature, lease); }
    try {
      await lease;
      if(leases.get(signature)===lease){leases.delete(signature);leases.set(signature,lease);}
      while(leases.size>6){const oldest=leases.entries().next().value;if(!oldest)break;leases.delete(oldest[0]);void oldest[1].then(release=>release(),()=>{});}
    } catch (error) { if(leases.get(signature)===lease)leases.delete(signature); throw error; }
  }));
}
/** Initialize shared catalog/motion; only explicit keys warm body assets. Actors preload their exact recipe. */
export async function preloadNativeBodies(keys: readonly BodyKey[] = [], _detail: BodyDetail = 'full'): Promise<void> {
  await preloadLooks(keys.map(body => ({look: {native: {schema:'allworld-character',version:2,appearance:{version:2,body,hair:'short01',garments:['female-casual-01'],shoes:'shoes01',eyeColor:'brown',complexion:'deep',height:1,features:{},colors:{},handPose:'relaxed'},emotion:'neutral',emotionStrength:.7}}})));
}
const actionFor: Partial<Record<BodyPose, string>> = {
  sit:'sit', lie:'sleep', soak:'sit', interact:'talk', dance:'play', wash:'play', bucket:'play', cook:'play', cookLow:'sit', eat:'talk', drink:'talk', homeDoor:'wave',
};
type Options = { characterStyle?: CharacterStyle; detail?: BodyDetail; wardrobeDetail?: 'full' | 'ambient' };
export function createNativeBody(kit: Kit, look: unknown, seed: unknown, sceneScale: number, options: Options = {}): SkinnedBody {
  let recipe = nativeRecipeForLook(look, seed), disposed = false, actor: NativeActor | undefined;
  let scale = WORLD_UNITS_PER_METRE * sceneScale, pose: BodyPose = 'idle', phase = 0, transitioning = 0, useTime: number | null = null;
  let floor = {x:0,y:0,z:0,ry:0}, seat: {x:number;top:number;z:number;ry:number}|null = null;
  let externallyPlaced = false;
  let terrain: ((contact: FootContact) => number) | null = null;
  const object = new THREE.Group(); object.name = 'native-character';
  Object.assign(object.userData, {canonicalCharacter:true,characterFoundation:'native53',characterDetail:'full',requestedDetail:options.detail??'full',characterStatus:'loading',characterReservedTriangles:MAX_NATIVE_TRIANGLES,characterReservedDrawCalls:MAX_NATIVE_DRAWS,triangles:MAX_NATIVE_TRIANGLES,nativeRecipe:recipe});
  object.scale.setScalar(scale);
  const seated = () => ['sit','lie','soak','cookLow'].includes(pose);
  function metadata(): void {
    if (!actor) return;
    let triangles=0,draws=0;
    object.traverseVisible(node => { const mesh=node as THREE.Mesh; if(!mesh.isMesh)return; const n=mesh.geometry.index?.count??mesh.geometry.getAttribute('position')?.count??0; triangles+=Math.min(n,mesh.geometry.drawRange.count)/3;draws+=Math.max(1,mesh.geometry.groups.length); });
    Object.assign(object.userData,{characterStatus:'ready',characterReservedTriangles:0,characterReservedDrawCalls:0,triangles,drawCalls:draws,top:(actor.getEyeHeight()+.15)*scale*recipe.appearance.height,nativeRecipe:recipe});
  }
  function locate(): void {
    object.scale.setScalar(scale);
    if(seated()&&seat&&actor) {
      // Native clip chair offset comes from the lab motion metadata; no canonical bone anchor.
      const back=(pose==='lie'?0:-actor.getChairOffset())*scale*recipe.appearance.height;
      const clip=system?.motionMetadata.clips?.[pose==='lie'?'Sleep':'Sit'];
      const support=Number(clip?.placement_height_m??(pose==='lie'?.1:.45));
      object.position.set(seat.x+Math.sin(seat.ry)*back,seat.top-support*scale*recipe.appearance.height,seat.z+Math.cos(seat.ry)*back);
      object.rotation.y=seat.ry;
    } else { object.position.set(floor.x,floor.y,floor.z);object.rotation.y=floor.ry; }
    object.updateMatrixWorld(true);
  }
  function sample(seconds=0): void {
    if(!actor)return;
    actor.setMotion({speed:pose==='walk'?1.25:pose==='jog'?2.4:0,gait:pose==='jog'?'run':'walk',samplePhase:phase/(Math.PI*2),sampleMoving:pose==='walk'||pose==='jog',sampleBlend:externallyPlaced,inPlace:!externallyPlaced});
    actor.update(seconds);object.updateMatrixWorld(true);
  }
  function applyPose(animate=false): void {
    if(!actor)return;
    actor.cancelAction({immediate:true});
    const action=actionFor[pose];
    if(action)actor.setAction(action);
    locate();
    if(action&&!animate) { const clip=system?.motionMetadata.clips?.[pose==='lie'?'Sleep':'Sit'];const duration=useTime??(seated()?Number(clip?.hold_time_seconds??(pose==='lie'?1.8:2.8)):.65);actor.sampleAction(action,duration);sample(0); }
    else sample(0);
    transitioning=animate?(seated()?Number(system?.motionMetadata.clips?.[pose==='lie'?'Sleep':'Sit']?.hold_time_seconds??2.8):.8):0;
  }
  function attach(value: NativeActor): void {
    if(disposed){value.dispose();return;}
    actor=value;object.add(value.root);value.root.position.set(0,0,0);
    nativeStrideScales.set(recipe.appearance.body,actor.getStrideScale());
    actor.setEmotion(recipe.emotion,recipe.emotionStrength);
    object.traverse(node=>{const mesh=node as THREE.Mesh;if(mesh.isMesh){mesh.castShadow=false;for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])kit.adopt(mat);}});
    applyPose();metadata();requestNativeRender(kit);
  }
  const spawnOptions = () => ({id:`game-native-${++serial}`,appearance:recipe.appearance,groundHeight:(x:number,z:number)=>terrain?terrain({side:'left',x,y:floor.y,z}):(object.parent?.localToWorld(new THREE.Vector3(floor.x,floor.y,floor.z)).y??floor.y)});
  let ready: Promise<void>;
  try {
    if(!system)throw new Error('Native system pending');
    attach(system.spawnSync(spawnOptions()));ready=Promise.resolve();
  } catch {
    ready=(async()=>{await preloadLooks([{look,seed}]);if(disposed)return;attach(await (await getSystem()).spawn(spawnOptions()));})();
  }
  ready.catch(error=>{if(!disposed){Object.assign(object.userData,{characterStatus:'error',characterError:String(error?.message??error)});requestNativeRender(kit);}});
  const removeCleanup=kit.onDispose(()=>body.dispose());
  const body: SkinnedBody = {
    object, ready,
    get key(){return recipe.appearance.body==='male'?'male':'female';},
    get scale(){return scale*recipe.appearance.height;},get scaleX(){return body.scale;},get scaleZ(){return body.scale;},
    get strideScale(){return actor?.getStrideScale()??1;},
    cycleDistance(jog){const clip=system?.motionMetadata.clips?.[jog?'Run_InPlace':'Walk_InPlace'];return Number(clip?.nominal_speed_mps??(jog?3.26374:1.3190851956605911))*Number(clip?.duration_seconds??(jog?.7333333333333333:1.0666666666666667))*body.scale*body.strideScale;},
    get wardrobe(){return {triangles:object.userData.triangles??0,hiddenTriangles:0,addedDrawCalls:0 as const,bytes:0,itemTriangles:{}};},
    get wardrobeError(){return object.userData.characterError??null;},
    get easing(){return transitioning>0;},get contactSolvable(){return !seated();},get pose(){return pose;},get seated(){return seated();},
    setPresentation(presentation){if(presentation==='sleeping')body.show('lie');return true;},
    sampleFootContacts(){if(!actor)return [];object.updateMatrixWorld(true);return (['l','r'] as const).flatMap((side,i)=>{const bone=actor?.bones.get(`foot_${side}`);if(!bone)return [];const point=bone.getWorldPosition(new THREE.Vector3());return [{side:i===0?'left' as const:'right' as const,x:point.x,y:point.y,z:point.z}];});},
    solveFeet(heightAt){terrain=heightAt;sample(0);return {corrected:0,maxError:0,limited:false};},
    show(next,animate=false){if(pose===next&&useTime===null)return;const wasMoving=pose==='walk'||pose==='jog';pose=next;useTime=null;applyPose(animate);if(externallyPlaced&&wasMoving)transitioning=Math.max(transitioning,.6);},
    sampleUse(next,seconds){pose=next;useTime=Math.max(0,seconds);applyPose();},
    enter(animate){pose=animate?'homeDoor':'idle';applyPose(animate);},
    stride(next,jog){const changed=pose!==(jog?'jog':'walk');pose=jog?'jog':'walk';phase=next;useTime=null;if(changed)actor?.cancelAction({immediate:true});locate();sample(0);},
    step(dt){sample(Math.min(.1,Math.max(0,dt)));transitioning=Math.max(0,transitioning-dt);return transitioning>0;},
    settle(){transitioning=0;applyPose();},
    place(x,y,z,ry){externallyPlaced=true;floor={x,y,z,ry};locate();},
    sitOn(x,top,z,ry){seat={x,top,z,ry};locate();sample(0);},
    workOn(x,y,z,ry){floor={x,y,z,ry};locate();sample(0);},
    fit(value){scale=WORLD_UNITS_PER_METRE*value;locate();},
    wear(value,nextSeed){if(!actor)return false;const next=nativeRecipeForLook(value,nextSeed??seed);const result=actor.setAppearanceSync(next.appearance);if(!result.ok)return false;recipe=next;actor.setEmotion(recipe.emotion,recipe.emotionStrength);applyPose();metadata();return true;},
    setAmbientFace(){/* Native emotion, blinking and speech are sampled by the lab action system. */},
    staticMaterials(){
      const copies=new Map<THREE.Material,THREE.Material>();const release=actor?.retainAssets();
      return {forMesh(mesh){const clone=(material:THREE.Material)=>{let value=copies.get(material);if(!value){value=material.clone();copies.set(material,value);}return value;};return Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);},dispose(){copies.forEach(material=>material.dispose());release?.();}};
    },
    dispose(){if(disposed)return;disposed=true;removeCleanup();actor?.dispose();object.removeFromParent();},
  };
  return body;
}
export async function loadNativeBody(kit: Kit, look: unknown, seed: unknown, scale: number, options: Options = {}): Promise<SkinnedBody> {
  await preloadLooks([{look,seed}]);const body=createNativeBody(kit,look,seed,scale,options);try{await body.ready;return body;}catch(error){body.dispose();throw error;}
}
