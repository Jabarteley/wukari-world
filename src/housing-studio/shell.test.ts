import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createKit } from '../scene/kit.ts';
import { FURNITURE } from '../game/content/furniture.ts';
import { checkPlacement, plotOf } from '../game/home-layout.ts';
import { RECIPES, type HousingRecipe } from './fixtures.ts';
import { buildHousingShell, edge, STOREY } from './shell.ts';

const recipe = (): HousingRecipe => ({
  ...RECIPES[0]!,
  items: [
    { id:'boundary-calendar',itemId:'wall-calendar',x:4,y:0,rot:0,floor:1 },
    { id:'boundary-art',itemId:'wall-art',x:0,y:4,rot:1 },
  ],
});

function firstHit(root: THREE.Object3D, origin: THREE.Vector3, direction: THREE.Vector3) {
  root.updateMatrixWorld(true);
  return new THREE.Raycaster(origin,direction,0,3).intersectObject(root,true)[0];
}

test('wall-item spans receive uninterrupted backing on both façades without an inward window frame', () => {
  const value=recipe(),kit=createKit(),shell=buildHousingShell(kit,value),tile=10/value.grid,scale=Math.max(tile,.8);
  try {
    const back=edge(4.5,value.grid),left=edge(4.5,value.grid);
    // These are the exact canonical calendar/art widths from home-scene, at its mounting scale.
    for(const x of [back-.4*scale/2+.01,back,back+.4*scale/2-.01]) {
      const hit=firstHit(shell.group,new THREE.Vector3(x,STOREY+1.75,-4),new THREE.Vector3(0,0,-1));
      assert.ok(hit,`back wall backing missing at x ${x}`);
      assert.ok(Math.abs(hit.point.z+5)<1e-5,`back façade protrudes through the wall-item plane at z ${hit.point.z}`);
    }
    for(const z of [left-.74*scale/2+.01,left,left+.74*scale/2-.01]) {
      const hit=firstHit(shell.group,new THREE.Vector3(-4,1.75,z),new THREE.Vector3(-1,0,0));
      assert.ok(hit,`left wall backing missing at z ${z}`);
      assert.ok(Math.abs(hit.point.x+5)<1e-5,`left façade protrudes through the wall-item plane at x ${hit.point.x}`);
    }
  } finally { shell.dispose(); }
});

test('a legal left-wall calendar beside the duplex entrance keeps the doorway open', () => {
  const value={...recipe(),items:[{id:'entry-calendar',itemId:'wall-calendar' as const,x:0,y:9,rot:1}]};
  assert.equal(checkPlacement(plotOf(value.grid,true),[],FURNITURE['wall-calendar']!,0,9,1),null);
  const shell=buildHousingShell(createKit(),value),tile=10/value.grid,doorZ=edge(10.5,value.grid),doorHalf=Math.min(tile*.86,1.5)/2,mountZ=edge(9.5,value.grid);
  try {
    for(const z of [doorZ-doorHalf+.02,doorZ,doorZ+doorHalf-.02])
      assert.equal(firstHit(shell.group,new THREE.Vector3(-4,1.2,z),new THREE.Vector3(-1,0,0)),undefined,`the backing must not seal the entrance aperture at z ${z}`);
    const mount=firstHit(shell.group,new THREE.Vector3(-4,1.75,mountZ),new THREE.Vector3(-1,0,0));
    assert.ok(mount&&Math.abs(mount.point.x+5)<1e-5,'the adjacent legal mount remains backed at the inner wall plane');
  } finally { shell.dispose(); }
});

test('a legal upper-floor left-wall calendar gets local backing through a balcony segment', () => {
  const value={...recipe(),items:[{id:'balcony-calendar',itemId:'wall-calendar' as const,x:0,y:14,rot:1,floor:1}]};
  assert.equal(checkPlacement(plotOf(value.grid,true),[],FURNITURE['wall-calendar']!,0,14,1,null,1),null);
  const shell=buildHousingShell(createKit(),value),z=edge(14.5,value.grid),half=.4*Math.max(10/value.grid,.8)/2;
  try {
    for(const at of [z-half+.01,z,z+half-.01]) {
      const hit=firstHit(shell.group,new THREE.Vector3(-4,STOREY+1.75,at),new THREE.Vector3(-1,0,0));
      assert.ok(hit&&Math.abs(hit.point.x+5)<1e-5,`the balcony mount span is not backed at z ${at}`);
    }
  } finally { shell.dispose(); }
});

test('the terrace parapet stays behind a legal floor-two mirror at its low edge', () => {
  const base=RECIPES.find(item=>item.grid===14)!;
  const value={...base,items:[{id:'terrace-mirror',itemId:'dance-mirror' as const,x:4,y:0,rot:0,floor:2}]};
  assert.equal(checkPlacement(plotOf(value.grid,true),[],FURNITURE['dance-mirror']!,4,0,0,null,2),null);
  const shell=buildHousingShell(createKit(),value),x=edge(4.5,value.grid);
  try {
    const hit=firstHit(shell.group,new THREE.Vector3(x,2*STOREY+.95,-4),new THREE.Vector3(0,0,-1));
    assert.ok(hit&&Math.abs(hit.point.z+5)<1e-5,`terrace parapet protrudes through the mirror plane at z ${hit?.point.z}`);
  } finally { shell.dispose(); }
});
