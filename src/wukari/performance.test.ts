import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as T from 'three';
import {navigation} from './play/navigation.ts';
import {canStand,type Study} from './play/model.ts';
import {FrameSamples,graphics} from './play/performance.ts';
const town=JSON.parse(readFileSync('data/wukari/phase81/town.json','utf8')) as Study;

test('indexed navigation exactly matches original clearance predicates near roads, buildings and cell edges',()=>{
  const fast=navigation(town);let checked=0;
  for(const r of town.roads)for(const p of r.points)for(const dx of [-2.01,0,1.99])for(const dz of [-.41,0,.41]){const q={x:p.x+dx,z:p.z+dz};assert.equal(fast.canStand(q),canStand(q,town));checked++;}
  for(let x=-512;x<=512;x+=16)for(let z=-512;z<=512;z+=16)assert.equal(fast.canStand({x,z}),canStand({x,z},town));
  assert(checked>1000);
});

test('indexed camera boom matches rendered extrusion ray intersections including roofs and narrow edges',()=>{
  const nav=navigation(town),meshes=town.buildings.map(b=>{const shape=new T.Shape(b.points.map(p=>new T.Vector2(p.x,-p.z))),raw=Number(b.tags.height?.replace(/\s*m$/,'')),height=Number.isFinite(raw)&&raw>=2&&raw<=60?raw:3.6;const g=new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});g.rotateX(-Math.PI/2);return new T.Mesh(g,new T.MeshBasicMaterial({side:T.DoubleSide}));});meshes.forEach(m=>m.updateMatrixWorld());
  const ray=new T.Raycaster(),v=new T.Vector3();let hits=0;
  for(const b of town.buildings.slice(0,60)){const p={x:b.points.reduce((s,p)=>s+p.x,0)/b.points.length,z:b.points.reduce((s,p)=>s+p.z,0)/b.points.length};for(const dx of [-12,12])for(const dz of [-12,12])for(const dy of [2,8]){const origin={x:p.x+dx,y:1.1,z:p.z+dz},offset={x:-dx*1.5,y:dy,z:-dz*1.5};v.set(offset.x,offset.y,offset.z);ray.set(new T.Vector3(origin.x,origin.y,origin.z),v.clone().normalize());ray.far=v.length();const hit=ray.intersectObjects(meshes,false)[0],distance=hit?.distance??v.length();if(hit)hits++;assert(Math.abs(nav.cameraDistance(origin,offset)-distance)<.001,JSON.stringify({origin,offset,fast:nav.cameraDistance(origin,offset),distance}));}}
  assert(hits>100);for(const m of meshes){m.geometry.dispose();m.material.dispose();}
});

test('graphics presets differ at DPR1 and frame statistics retain slow frames without unbounded storage',()=>{
  assert(graphics.low.scale<graphics.balanced.scale);assert(graphics.high.far>graphics.balanced.far);assert.equal(graphics.low.lines,false);assert(graphics.high.pixelCap>graphics.balanced.pixelCap);
  const samples=new FrameSamples();samples.push(0,0,0);samples.push(NaN,0,0);for(let i=0;i<100;i++)samples.push(i<90?16:50,2,3);
  const result=samples.result();assert.equal(result.frames,100);assert.equal(result.p95Ms,50);assert.equal(result.over33ms,10);assert.equal(result.updateCpuMs,2);assert.equal(result.renderSubmitCpuMs,3);
  for(let i=0;i<10000;i++)samples.push(16,2,3);assert.equal(samples.count,7200);
});
