import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { appearance,settings,defaultAppearance,defaultSettings,hairstyles } from './play/appearance.ts';
import { createAvatar } from './play/avatar.ts';
// Decode the exact committed geometry/rig in Node; image decoding is browser QA.
async function template(sex:string){
  const b=readFileSync(`data/wukari/phase81/models/${sex}.glb`),length=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+length).toString());
  g.images=[];g.textures=[];for(const m of g.materials){delete m.normalTexture;delete m.pbrMetallicRoughness?.baseColorTexture;}
  let js=Buffer.from(JSON.stringify(g));js=Buffer.concat([js,Buffer.alloc((4-js.length%4)%4,32)]);
  const bin=b.subarray(20+length),header=Buffer.alloc(20);header.write('glTF');header.writeUInt32LE(2,4);header.writeUInt32LE(20+js.length+bin.length,8);header.writeUInt32LE(js.length,12);header.write('JSON',16);
  const glb=Buffer.concat([header,js,bin]);return(await new GLTFLoader().parseAsync(glb.buffer.slice(glb.byteOffset,glb.byteOffset+glb.length),'')).scene;
}
const models={male:await template('male'),female:await template('female')};
test('saved appearance validates male/female, migrates legacy hair, and bounds settings',()=>{
  assert.deepEqual(appearance(null),defaultAppearance);assert.deepEqual(settings(null),defaultSettings);
  assert.equal(appearance({preset:'female',hair:'cornrows'}).preset,'female');assert.equal(appearance({preset:'unknown'}).preset,'male');
  assert.equal(appearance({hair:'curls'}).hair,'curly-afro');assert.equal(appearance({hair:'twists'}).hair,'locs');
  assert.equal(appearance({skin:'url(evil)'}).skin,defaultAppearance.skin);
  assert.deepEqual(settings({sensitivity:Infinity,volume:-10,quality:'ultra'}),defaultSettings);
});
test('both native presets have different facial topology/silhouettes, finite animation and owned disposal',()=>{
  const sizes:THREE.Vector3[]=[];
  for(const preset of ['male','female'] as const){
    const actor=createAvatar({...defaultAppearance,preset},models[preset]);sizes.push(new THREE.Box3().setFromObject(actor.root).getSize(new THREE.Vector3()));
    let draws=0,disposed=0;actor.root.traverse(o=>{if(o instanceof THREE.Mesh){draws++;o.geometry.addEventListener('dispose',()=>disposed++);}});assert(draws<12);
    for(let i=0;i<100;i++){actor.animate(i/60,i/30,i>10,i>60,1/60);actor.root.traverse(o=>assert(o.matrix.elements.every(Number.isFinite)));}
    actor.dispose();assert.equal(disposed,draws);
  }
  assert(Math.abs(sizes[0]!.y-sizes[1]!.y)>.025);assert(Math.abs(sizes[0]!.x-sizes[1]!.x)>.03);
});
test('all eight hairstyles leave both eye sightlines clear from front and three-quarter views on both presets',()=>{
  for(const preset of ['male','female'] as const)for(const hair of hairstyles){
    const actor=createAvatar({...defaultAppearance,preset,hair},models[preset]);actor.root.updateMatrixWorld(true);
    let eye:THREE.SkinnedMesh|undefined;actor.root.traverse(o=>{if(o instanceof THREE.SkinnedMesh&&!Array.isArray(o.material)&&o.material.name==='MI_Eyes')eye=o;});assert(eye);
    const boxes=[new THREE.Box3(),new THREE.Box3()],p=eye.geometry.getAttribute('position');
    for(let i=0;i<p.count;i++){const v=eye.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(eye.matrixWorld);boxes[p.getX(i)<0?0:1]!.expandByPoint(v);}
    for(const box of boxes)for(const angle of [0,-.62,.62]){
      const center=box.getCenter(new THREE.Vector3());center.z=box.max.z+.001;
      const direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle));
      assert.equal(new THREE.Raycaster(center,direction,.001,2).intersectObject(actor.hair,true).length,0,`${preset}/${hair}/${angle} eye occlusion`);
      center.y+=.02;assert.equal(new THREE.Raycaster(center,direction,.001,2).intersectObject(actor.hair,true).length,0,`${preset}/${hair} brow occlusion`);
    }
    actor.dispose();
  }
});
test('long-distance sprint transition retains continuous phase on the native rig',()=>{
  const actor=createAvatar(defaultAppearance,models.male),leg=actor.root.getObjectByName('thigh_l')!;
  actor.animate(100,500,true,false,1);const before=leg.quaternion.clone();actor.animate(100+1/60,500.04,true,true,1/60);assert(before.angleTo(leg.quaternion)<.2);actor.dispose();
});
test('actor texture handles are disposed without disposing the template or another actor',()=>{
  const template=new THREE.Group(),texture=new THREE.Texture();template.add(clone(models.male));let templateDisposed=false,ownedDisposed=0;
  texture.addEventListener('dispose',()=>templateDisposed=true);
  template.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){o.material=o.material.clone();if(o.material instanceof THREE.MeshStandardMaterial&&o.material.name!=='Brows'&&o.material.name!=='MI_Eyes')o.material.normalMap=texture;}});
  const first=createAvatar(defaultAppearance,template),second=createAvatar(defaultAppearance,template);
  first.root.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)&&o.material instanceof THREE.MeshStandardMaterial&&o.material.normalMap){assert.notEqual(o.material.normalMap,texture);assert.equal(o.material.normalMap.source,texture.source);o.material.normalMap.addEventListener('dispose',()=>ownedDisposed++);}});
  first.dispose();assert.equal(ownedDisposed,1);assert.equal(templateDisposed,false);second.animate(1,2,true,false,.02);second.dispose();assert.equal(templateDisposed,false);texture.dispose();
});
