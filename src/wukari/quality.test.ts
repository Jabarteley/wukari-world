import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { toWorld } from './geography.ts';
import { advance,canStand,type Study,type Feature } from './play/model.ts';
import { roadSurfaces,footprintClearance,segmentClearance } from './play/roads.ts';
const town=JSON.parse(readFileSync('data/wukari/phase81/town.json','utf8')) as Study;
test('selected network preserves every original position and exposes genuine shared-reference turns',()=>{
  assert.equal(town.roads.length,54);assert.equal(town.buildings.length,243);
  for(const f of [...town.roads,...town.buildings])f.coordinates.forEach((coordinate,i)=>{const p=toWorld(town.origin,coordinate);assert(Math.hypot(p.x-f.points[i]!.x,p.z-f.points[i]!.z)<1e-7);});
  const edges=new Map<number,Set<number>>();
  for(const r of town.roads)for(let i=1;i<r.nodes.length;i++){const a=r.nodes[i-1]!,b=r.nodes[i]!;if(!edges.has(a))edges.set(a,new Set());if(!edges.has(b))edges.set(b,new Set());edges.get(a)!.add(b);edges.get(b)!.add(a);}
  assert.equal(edges.get(town.spawn!.nodeId)!.size,4);assert([...edges.values()].filter(e=>e.size>2).length>=30);
  assert(town.roads.some(r=>r.points.length>5));assert(canStand(town.spawn!.point,town));
});
test('simulation can walk through three original arms of the junction without a fabricated connector',()=>{
  const start=town.spawn!.point;
  const branches=town.roads.flatMap(r=>{const i=r.nodes.indexOf(town.spawn!.nodeId);return i<0?[]:[r.points[i-1],r.points[i+1]].filter(Boolean);});
  let walked=0;
  for(const end of branches){if(!end)continue;const bearing=Math.atan2(end.x-start.x,end.z-start.z),distance=Math.min(8,Math.hypot(end.x-start.x,end.z-start.z));
    let state={...start,yaw:0,moving:false,sprinting:false,blocked:false,distance:0};
    for(let i=0;i<Math.ceil(distance/(2.4/60));i++)state=advance(state,{x:0,z:1},bearing,false,1/60,town);
    if(state.distance>distance-.2)walked++;
  }
  assert(walked>=3,`only ${walked} accessible virtual junction arms`);
});
test('real conflict diagnosis distinguishes source intersection from excessive display width',()=>{
  const old=JSON.parse(readFileSync('data/wukari/phase7/town.json','utf8')) as Study;
  const conflicts=roadSurfaces(old).conflicts;
  assert(conflicts.some(c=>c.roadId===558733005&&c.buildingId===1523015718&&c.kind==='source-centerline'));
  assert(conflicts.some(c=>c.roadId===185860473&&c.buildingId===1415422307&&c.kind==='illustrative-width'));
  assert.equal(segmentClearance({x:0,z:0},{x:5,z:5},{x:0,z:5},{x:5,z:0}),0);
});
test('every rendered road capsule clears every unchanged building and blocked intervals cannot be walked',()=>{
  for(const piece of town.roadSurface!)for(const building of town.buildings){
    assert(footprintClearance(piece.a,piece.b,building.points)>=piece.halfWidth+.049,`road ${piece.roadId}/building ${building.id}`);
  }
  for(const conflict of town.roadConflicts!.filter(c=>c.kind==='source-centerline')){
    const b=town.buildings.find(b=>b.id===conflict.buildingId)!;const center={x:b.points.reduce((s,p)=>s+p.x,0)/b.points.length,z:b.points.reduce((s,p)=>s+p.z,0)/b.points.length};assert(!canStand(center,town));
  }
});
test('synthetic crossing is suppressed, width-only conflicts narrow, and source geometry is never changed',()=>{
  const feature=(id:number,points:{x:number;z:number}[],tags:Record<string,string>):Feature=>({id,points,nodes:points.map((_,i)=>id*10+i),coordinates:[],tags,distanceM:0,association:'nearby-only; FUW ownership unverified'});
  const roads=[feature(1,[{x:-10,z:0},{x:10,z:0}],{highway:'residential'})],buildings=[feature(2,[{x:-1,z:-1},{x:1,z:-1},{x:1,z:1},{x:-1,z:1},{x:-1,z:-1}],{building:'yes'})];
  const before=JSON.stringify({roads,buildings}),result=roadSurfaces({roads,buildings});assert.equal(JSON.stringify({roads,buildings}),before);assert.equal(result.conflicts[0]!.kind,'source-centerline');assert(!result.pieces.some(p=>p.a.x<0&&p.b.x>0));
  buildings[0]!.points.forEach(p=>p.z+=2.5);const narrow=roadSurfaces({roads,buildings});assert.equal(narrow.conflicts[0]!.kind,'illustrative-width');assert(narrow.pieces.some(p=>p.halfWidth<2.5));
});
test('native GLBs match recorded hashes and CC0 rights, FUW data remains byte-identical',()=>{
  const receipt=JSON.parse(readFileSync('data/wukari/phase81/models/provenance.json','utf8'));assert.equal(receipt.license,'CC0-1.0');
  for(const f of receipt.files){const bytes=readFileSync(`data/wukari/phase81/models/${f.path}`);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256);assert.equal(bytes.readUInt32LE(4),2);}
  assert.deepEqual(readFileSync('data/wukari/phase81/fuw.json'),readFileSync('data/wukari/phase7/fuw.json'));
});
