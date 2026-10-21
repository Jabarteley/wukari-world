import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { advance, bearingOf, buildingCollision, canStand, inside, permittedForSimulation, segmentDistance, type Study, type Motion } from './play/model.ts';
import { toWorld, contains, selectBoundary } from './geography.ts';
const load = (id: string) => JSON.parse(readFileSync(new URL(`../../data/wukari/phase7/${id}.json`, import.meta.url), 'utf8')) as Study;
const initial = (): Motion => ({ x: 0, z: 0, yaw: 0, distance: 0, moving: false, sprinting: false, blocked: false });
const fixture = (): Study => ({ schemaVersion: 1, id: 'synthetic-test-only', title: 'SYNTHETIC UNIT TEST', origin: [0,0], halfSize: 100, buildings: [], candidates: [], sources: [], spawn: null, coverage: { roads: 1, buildings: 0, components: 1, sourceSha256: '', policy: 'UNIT TEST' }, roads: [{ id: 1, nodes: [1,2], tags: { highway: 'residential' }, coordinates: [[0,0],[0,0]], points: [{ x: 0, z: -90 },{ x: 0, z: 90 }], distanceM: 0, association: 'nearby-only; FUW ownership unverified' }] });

test('compass uses actual view direction in the east/south geographic frame', () => {
  assert.equal(bearingOf({x:0,z:-1}),0);assert.equal(bearingOf({x:1,z:0}),90);
  assert.equal(bearingOf({x:0,z:1}),180);assert.equal(bearingOf({x:-1,z:0}),270);
});

test('walking/sprint are time-scaled, diagonal-normalized, and camera-relative; invalid/frame-gap input is bounded', () => {
  const study = fixture();
  const walk = advance(initial(), {x:0,z:-1}, 0, false, .05, study), sprint = advance(initial(), {x:0,z:-1}, 0, true, .05, study);
  assert(Math.abs(walk.distance-.12)<1e-9); assert(Math.abs(sprint.distance-.3)<1e-9);
  assert(Math.abs(advance(initial(),{x:1,z:-1},0,false,.05,study).distance-.12)<1e-9);
  assert(advance(initial(),{x:0,z:-1},Math.PI/2,false,.05,study).x<0);
  assert(advance(initial(),{x:0,z:-1},0,true,10,study).distance<=.301);
  assert.deepEqual(advance(initial(),{x:NaN,z:0},0,true,.05,study),initial());
});
test('footprint interior/edge clearance and swept substeps prevent building tunnelling', () => {
  const study = fixture(); const ring=[{x:-3,z:-2},{x:3,z:-2},{x:3,z:-1.95},{x:-3,z:-1.95},{x:-3,z:-2}];
  study.buildings=[{...study.roads[0]!,points:ring}];
  assert(buildingCollision({x:0,z:-1.95},study.buildings)); assert(!inside({x:0,z:0},ring));
  const concave=[{x:0,z:0},{x:4,z:0},{x:4,z:1},{x:1,z:1},{x:1,z:4},{x:0,z:4},{x:0,z:0}];
  assert(inside({x:.5,z:3},concave));assert(!inside({x:3,z:3},concave));
  assert.equal(segmentDistance({x:1,z:1},{x:0,z:0},{x:0,z:0}),Math.sqrt(2));
  let s=initial(); for(let i=0;i<100;i++) s=advance(s,{x:0,z:-1},0,true,.05,study);
  assert(s.z>-1.6); assert(!buildingCollision(s,study.buildings));
});
test('restricted roads, bridge/fords, unmapped gaps and study edges do not become walkable ground', () => {
  const restricted: Record<string,string>[] = [{highway:'trunk'},{highway:'residential',access:'private'},{highway:'footway',foot:'no'},{highway:'path',bridge:'yes'},{highway:'path',ford:'yes'}];
  for(const tags of restricted) assert.equal(permittedForSimulation(tags),false);
  const study=fixture(); assert(!canStand({x:5,z:0},study)); assert(!canStand({x:0,z:99},study));
});
test('committed real studies preserve source-coordinate projection and stay inside LGA; FUW ownership remains unassigned', () => {
  const lga=selectBoundary(JSON.parse(readFileSync(new URL('../../data/wukari/verified/wukari-adm2.geojson',import.meta.url),'utf8')));
  for(const id of ['town','fuw']){const study=load(id);for(const f of [...study.roads,...study.buildings]){assert.equal(f.nodes.length,f.coordinates.length); f.coordinates.forEach((p,i)=>{assert(contains(lga.geometry,p));assert.deepEqual(toWorld(study.origin,p),f.points[i]);});assert.equal(f.association,'nearby-only; FUW ownership unverified');}assert(study.roads.length>0);assert(study.buildings.length>0);}
  assert.equal(load('fuw').spawn,null);
});
test('actual reviewed town spawn clears recorded buildings and moves on its original connected road', () => {
  const study=load('town'),spawn=study.spawn!; assert(spawn.eligible); assert(canStand(spawn.point,study)); assert(!buildingCollision(spawn.point,study.buildings));
  const road=study.roads.find(r=>r.id===spawn.roadId)!, index=road.nodes.indexOf(spawn.nodeId), next=road.points[index+1]??road.points[index-1]!;
  assert.deepEqual(road.points[index],spawn.point); const yaw=Math.atan2(spawn.point.x-next.x,spawn.point.z-next.z);
  let s={...initial(),...spawn.point};for(let i=0;i<20;i++)s=advance(s,{x:0,z:-1},yaw,false,.05,study);assert(s.distance>2);assert(!buildingCollision(s,study.buildings));
  const interior=study.buildings.map(b=>({b,p:{x:b.points.reduce((n,p)=>n+p.x,0)/b.points.length,z:b.points.reduce((n,p)=>n+p.z,0)/b.points.length}})).find(({b,p})=>inside(p,b.points));
  assert(interior);assert(buildingCollision(interior.p,study.buildings));assert(!canStand(interior.p,study));
});
