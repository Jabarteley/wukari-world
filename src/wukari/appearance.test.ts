import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { appearance, settings, defaultAppearance, defaultSettings } from './play/appearance.ts';
import { createAvatar } from './play/avatar.ts';
test('untrusted local appearance and settings have finite bounded defaults',()=>{
  assert.deepEqual(appearance(null),defaultAppearance);
  assert.deepEqual(settings(null),defaultSettings);
  assert.equal(appearance({hair:'external-url',skin:'red',body:'unknown'}).skin,defaultAppearance.skin);
  assert.equal(appearance({top:'#aa9933',hair:'bun',body:'broad'}).hair,'bun');
  assert.deepEqual(settings({sensitivity:Infinity,volume:-10,quality:'ultra'}),defaultSettings);
  assert.equal(settings({sensitivity:99,volume:999}).sensitivity,2.5);
  assert.equal(settings({sensitivity:99,volume:999}).volume,100);
});
test('avatar feet, proportions, finite animation, forward face and resource lifecycle',()=>{
  for(const hair of ['crop','curls','twists','bun'] as const)for(const body of ['regular','slender','broad'] as const){
    const person=createAvatar({...defaultAppearance,hair,body});
    const box=new THREE.Box3().setFromObject(person.root),size=box.getSize(new THREE.Vector3());
    assert(box.min.y>-.05&&box.min.y<.05,'feet at ground');assert(size.y>1.8&&size.y<2.1);assert(size.x<1,'human proportions');
    let draws=0,disposed=0;person.root.traverse(o=>{if(o instanceof THREE.Mesh){draws++;o.geometry.addEventListener('dispose',()=>disposed++);}});assert(draws<45);
    for(let i=0;i<120;i++){person.animate(i/60,i/20,i>20&&i<100,i>60,1/60);person.root.updateMatrixWorld();person.root.traverse(o=>assert(o.matrix.elements.every(Number.isFinite)));}
    const head=person.root.getObjectByName('head')!;const forward=head.localToWorld(new THREE.Vector3(0,0,-1));assert(forward.z>0,'face points along motion yaw zero');
    person.dispose();assert.equal(disposed,draws);
  }
});
test('sprinting after a long walk changes gait continuously rather than multiplying total distance',()=>{
  const person=createAvatar(defaultAppearance),leg=person.root.getObjectByName('leg-1')!;
  person.animate(100,500,true,false,1);
  const before=leg.rotation.x;
  person.animate(100+1/60,500.04,true,true,1/60);
  assert(Math.abs(leg.rotation.x-before)<.2,'no stride phase jump on run transition');
  person.dispose();
});
