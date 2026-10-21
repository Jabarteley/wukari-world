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
