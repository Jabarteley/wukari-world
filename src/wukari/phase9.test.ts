import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toWorld} from './geography.ts';
import {canStand,type Study} from './play/model.ts';
import {footprintClearance} from './play/roads.ts';
const town=JSON.parse(readFileSync('data/wukari/phase9/town9.json','utf8')) as Study;
test('Phase9 geography preserves exact source projection and existing spawn; names retain OSM evidence',()=>{
 assert.equal(town.roads.length,196);assert.equal(town.buildings.length,1206);assert(canStand(town.spawn!.point,town));
 for(const f of [...town.roads,...town.buildings])f.coordinates.forEach((p,i)=>assert.deepEqual(f.points[i],toWorld(town.origin,p)));
 const places=JSON.parse(readFileSync('data/wukari/phase9/places9.json','utf8'));assert(places.places.some((p:any)=>p.name==='Takum - Bukuru Federal Road'));assert(places.places.find((p:any)=>p.id==='fuw-review').review);
 for(const p of places.places.filter((p:any)=>p.id.startsWith('way/')))assert.equal(town.roads.find(r=>r.id===Number(p.id.slice(4)))?.tags.name,p.name);
});
test('expanded road surfaces preserve building clearance for every displayed interval',()=>{for(const s of town.roadSurface!){for(const b of town.buildings){const xs=b.points.map(p=>p.x),zs=b.points.map(p=>p.z);if(Math.min(...xs)>Math.max(s.a.x,s.b.x)+s.halfWidth||Math.max(...xs)<Math.min(s.a.x,s.b.x)-s.halfWidth||Math.min(...zs)>Math.max(s.a.z,s.b.z)+s.halfWidth||Math.max(...zs)<Math.min(s.a.z,s.b.z)-s.halfWidth)continue;assert(footprintClearance(s.a,s.b,b.points)>=s.halfWidth+.049);}}});

import {trafficSimulation,vehicleKinds,vehicleSize} from './play/traffic.ts';
test('traffic follows original shared-node graph, turns, yields, and keeps every rotated vehicle clear of buildings',()=>{
 const sim=trafficSimulation(town);let turns=0,distance=0;const kinds=new Set<string>();
 for(let i=0;i<3600;i++){sim.step(.05,{x:0,z:0},20);for(const v of sim.vehicles){assert(sim.clear(v));assert(v.t>=0&&v.t<=1.000001);assert(Math.abs(v.x-(v.edge.a.x+(v.edge.b.x-v.edge.a.x)*v.t))<1e-6);assert(Math.abs(v.z-(v.edge.a.z+(v.edge.b.z-v.edge.a.z)*v.t))<1e-6);const road=town.roads.find(r=>r.id===v.edge.roadId)!;assert(road.nodes.includes(v.edge.from)&&road.nodes.includes(v.edge.to));kinds.add(v.kind);turns=Math.max(turns,v.turns);distance=Math.max(distance,v.distance);for(const other of sim.vehicles)if(other.id!==v.id)assert(Math.hypot(other.x-v.x,other.z-v.z)>(vehicleSize[other.kind][1]!+vehicleSize[v.kind][1]!)/2+.99);}}
 assert(turns>1);assert(distance>50);assert(vehicleKinds.every(k=>kinds.has(k)),JSON.stringify([...kinds]));assert(sim.vehicles.filter(v=>v.kind==='motorcycle').length>sim.vehicles.filter(v=>v.kind==='trailer').length);
 for(let i=0;i<100;i++)sim.step(.05,{x:0,z:0},0);assert.equal(sim.vehicles.length,0);
});
