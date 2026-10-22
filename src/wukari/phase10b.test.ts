import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {toWorld,fromWorld} from './geography.ts';
import {gpsReport} from './play/gps.ts';
import {footprintClearance} from './play/roads.ts';
import type {Study} from './play/model.ts';
import {zebraCrossings} from './play/crossings.ts';
import {canStand,segmentDistance,buildingCollision} from './play/model.ts';
const study=JSON.parse(readFileSync('data/wukari/phase10b/fuw-osm.json','utf8')) as Study;
test('FUW candidate is explicitly unverified, with no spawn, boundary or named building inference',()=>{
 assert.deepEqual(study.origin,[9.777370,7.843357]);assert.equal(study.spawn,null);
 const report=JSON.parse(readFileSync('data/wukari/phase10b/osm-report.json','utf8'));
 assert.match(report.candidate.status,/Unverified/);assert.equal(report.secondGate.coordinates,null);assert(report.landmarks.every((l:any)=>l.buildingId===null&&l.coordinates===null));
 assert.equal(report.coverage.taggedEntranceNodes,2);assert(report.entrances.every((e:any)=>e.distanceM>300));
 assert.equal(report.nearestRoads[0].id,673416541);assert(report.nearestRoads[0].distanceM>6&&report.nearestRoads[0].distanceM<6.3);assert(report.nearestRoads[0].connectedRoadIds.includes(181916664));
});
test('independent vicinity geometry retains projection, node connectivity and exact original coordinates',()=>{
 assert(study.roads.length>100&&study.buildings.length>900);
 for(const f of [...study.roads,...study.buildings]){assert.equal(f.coordinates.length,f.points.length);f.coordinates.forEach((p,i)=>{assert.deepEqual(toWorld(study.origin,p),f.points[i]);const q=fromWorld(study.origin,f.points[i]!.x,f.points[i]!.z);assert(Math.abs(p[0]-q[0])<1e-12&&Math.abs(p[1]-q[1])<1e-12);});}
 const roads=new Map(study.roads.map(r=>[r.id,r]));for(const r of JSON.parse(readFileSync('data/wukari/phase10b/osm-report.json','utf8')).nearestRoads)for(const id of r.connectedRoadIds)assert(roads.get(id)!.nodes.some(n=>roads.get(r.id)!.nodes.includes(n)));
});
test('FUW review road envelopes do not penetrate source buildings; conflicts remain review-only',()=>{
 for(const s of study.roadSurface??[])for(const b of study.buildings){const xs=b.points.map(p=>p.x),zs=b.points.map(p=>p.z);if(Math.min(...xs)>Math.max(s.a.x,s.b.x)+s.halfWidth||Math.max(...xs)<Math.min(s.a.x,s.b.x)-s.halfWidth||Math.min(...zs)>Math.max(s.a.z,s.b.z)+s.halfWidth||Math.max(...zs)<Math.min(s.a.z,s.b.z)-s.halfWidth)continue;assert(footprintClearance(s.a,s.b,b.points)>=s.halfWidth+.049);}
});
test('comparison layers keep provenance and reject automatic duplication or institution ownership',()=>{
 const view=JSON.parse(readFileSync('data/wukari/phase10b/fuw-open.json','utf8')),coverage=JSON.parse(readFileSync('data/wukari/phase10b/open-coverage.json','utf8'));
 assert.equal(view.spawn,null);assert.equal(view.campusBoundary,null);assert.equal(coverage.landmarkAssociations,0);
 const ms=view.layers.find((l:any)=>l.id==='microsoft');assert(ms.features.length>2000);assert.match(ms.license,/CDLA/);
 for(const f of ms.features){assert.match(f.properties.sourceUrl,/bfppub/);assert.match(f.properties.geometrySha256,/^[a-f0-9]{64}$/);assert.equal(f.properties.review.gameplayUse,false);assert.equal(f.properties.review.institutionAssociation,null);}
 assert(coverage.microsoft.classification['probable-duplicate']>900);assert(coverage.microsoft.classification['additional-machine-candidate']>1000);
 for(const l of view.layers.filter((l:any)=>l.id.startsWith('overture-')))for(const f of l.features){assert(f.properties.sources?.length>0);assert.equal(f.properties.review.gameplayUse,false);}
});
test('GPS workflow rejects poor/invalid readings and never automatically verifies a gate',()=>{
 const samples=Array.from({length:12},(_,i)=>({longitude:9.77737+i*.000001,latitude:7.843357,accuracy:8,timestamp:1000+i*4000}));
 const report=gpsReport([...samples,{longitude:9,latitude:7,accuracy:90,timestamp:1}],'main',true);
 assert.equal(report.features[0]!.properties.usableSamples,12);assert.equal(report.features[0]!.properties.durationSeconds,44);assert.match(report.features[0]!.properties.status,/not automatic verification/);assert.equal(report.features[0]!.geometry.coordinates[1],7.843357);
 assert.equal(gpsReport([{longitude:NaN,latitude:1,accuracy:1,timestamp:1}],'second',true).features.length,0);
 assert.match(gpsReport(samples,'second',false).features[0]!.properties.status,/Insufficient/);
});
test('Overture connector references retain source connectivity and per-feature licensed provenance',()=>{
 const view=JSON.parse(readFileSync('data/wukari/phase10b/fuw-open.json','utf8'));
 const transport=view.layers.find((l:any)=>l.id==='overture-transportation').features,points=new Map<string,any>(transport.filter((f:any)=>f.geometry.type==='Point').map((f:any)=>[f.id,f]));
 const segments=transport.filter((f:any)=>f.geometry.type==='LineString');assert.equal(segments.length,222);assert.equal(points.size,174);
 let matched=0,boundaryReferences=0;for(const s of segments){assert.equal(s.properties.subtype,'road');for(const c of s.properties.connectors){assert(c.at>=0&&c.at<=1);const node=points.get(c.connector_id);if(!node){boundaryReferences++;continue;}matched++;if(c.at===0||c.at===1){const p=s.geometry.coordinates[c.at===0?0:s.geometry.coordinates.length-1],q=node.geometry.coordinates;assert(Math.hypot(p[0]-q[0],p[1]-q[1])<1e-5);}}}
 assert(matched>200);assert(boundaryReferences>=0);
 for(const l of view.layers.filter((l:any)=>l.id.startsWith('overture-')))for(const f of l.features)assert.equal(f.properties.licenseReview.resolved,true);
});
test('town checkpoint keeps pedestrian spawn outside vehicle lanes and every walking envelope outside buildings',()=>{
 const town=JSON.parse(readFileSync('data/wukari/phase10/town10.json','utf8')) as Study;assert(town.pedestrians?.spawn);const spawn=town.pedestrians.spawn;
 const distance=(p:any,a:any,b:any)=>{const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);};
 assert(town.roadSurface!.every(s=>distance(spawn,s.a,s.b)>s.halfWidth+.4));
 const boxes=town.buildings.map(b=>({b,x0:Math.min(...b.points.map(p=>p.x)),x1:Math.max(...b.points.map(p=>p.x)),z0:Math.min(...b.points.map(p=>p.z)),z1:Math.max(...b.points.map(p=>p.z))}));
 for(const s of town.pedestrians.pieces)for(const q of boxes){if(q.x0>Math.max(s.a.x,s.b.x)+s.halfWidth||q.x1<Math.min(s.a.x,s.b.x)-s.halfWidth||q.z0>Math.max(s.a.z,s.b.z)+s.halfWidth||q.z1<Math.min(s.a.z,s.b.z)-s.halfWidth)continue;assert(footprintClearance(s.a,s.b,q.b.points)>=s.halfWidth+.099);}
});
test('white crossing paint stays on road surfaces and follows usable pedestrian routes without editing source geography',()=>{
 const town=JSON.parse(readFileSync('data/wukari/phase10/town10.json','utf8')) as Study,before=JSON.stringify({roads:town.roads,buildings:town.buildings}),crossings=zebraCrossings(town);
 assert(crossings.length>100);for(const c of crossings){assert.equal(c.illustrative,true);assert(c.bars.length>=3);for(const bar of c.bars){const mid=bar.reduce((a,p)=>({x:a.x+p.x/4,z:a.z+p.z/4}),{x:0,z:0});assert(canStand(mid,town));assert(!buildingCollision(mid,town.buildings,.8));assert(Math.abs(Math.hypot(bar[0]!.x-bar[1]!.x,bar[0]!.z-bar[1]!.z)-1.44)<1e-9);for(const p of bar)assert(town.roadSurface!.some(s=>segmentDistance(p,s.a,s.b)<s.halfWidth));}}
 assert.equal(JSON.stringify({roads:town.roads,buildings:town.buildings}),before);
});
test('Find a Place uses current FUW review evidence and searchable campus aliases',()=>{
 const places=JSON.parse(readFileSync('data/wukari/phase10b/places10b.json','utf8')),fuw=places.places.find((p:any)=>p.review);assert.deepEqual(fuw.position,[9.777370,7.843357]);assert(fuw.aliases.includes('FUW'));assert.equal(fuw.url,'/fuw-data.md');assert.match(fuw.confidence,/unverified/);assert(!fuw.confidence.includes('historical'));
});
