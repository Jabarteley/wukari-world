/** Additive visual derivative. Original OSM and working vehicle surfaces are immutable. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gateLocal,gateWorld,gateFootprints} from '../../src/wukari/play/entrance-layout.ts';
import {footprintClearance,segmentClearance} from '../../src/wukari/play/roads.ts';
import {canStand,type Study,type Point} from '../../src/wukari/play/model.ts';
const bytes=readFileSync('data/wukari/phase10c/fuw-play.json'),s:Study=JSON.parse(bytes.toString()),before=JSON.stringify({roads:s.roads,buildings:s.buildings,surface:s.roadSurface,virtual:s.virtualRoads});
const old=structuredClone(s),oldGate=structuredClone(s.entrance!);
// Two metres outward leaves room for the photo-guided side piers ahead of the mapped junction.
s.entrance={...oldGate,point:{x:oldGate.point.x-Math.sin(oldGate.yaw)*2,z:oldGate.point.z-Math.cos(oldGate.yaw)*2},design:'photo-guided'};
function align(p:Point){const q=gateLocal(s,p),abs=Math.abs(q.x);if(abs<3.3||abs>5.2||Math.abs(q.z)>=6)return {...p};const shift=1.1*Math.min(1,(6-Math.abs(q.z))/3);return gateWorld(s,{x:q.x+(Math.sign(q.x)*5.3-q.x)*Math.min(1,(6-Math.abs(q.z))/3),z:q.z});}
const pieces=s.pedestrians!.pieces.flatMap(p=>{const a=gateLocal(s,p.a),b=gateLocal(s,p.b),ts=[0,1];for(const z of [-6,-3,3,6]){const t=(z-a.z)/(b.z-a.z);if(t>1e-6&&t<1-1e-6)ts.push(t);}ts.sort((a,b)=>a-b);const at=(t:number)=>({x:p.a.x+(p.b.x-p.a.x)*t,z:p.a.z+(p.b.z-p.a.z)*t});return ts.slice(1).map((t,i)=>({...p,a:align(at(ts[i]!)),b:align(at(t))}));});
s.pedestrians!.pieces=pieces;s.spawn={...s.spawn!,point:align(s.spawn!.point),facing:align(s.spawn!.facing!),review:'FUW entrance — virtual gameplay position. Photo-guided appearance, approximate dimensions and placement; not GPS-surveyed gate or verified access.'};s.pedestrians!.spawn=s.spawn.point;
const rings=gateFootprints(s),nearBuildings=s.buildings.filter(b=>b.distanceM<100);
for(const ring of rings){for(let i=1;i<ring.length;i++){for(const b of nearBuildings)if(footprintClearance(ring[i-1]!,ring[i]!,b.points)<.1)throw Error('Gate pier intersects source building'+b.id);for(const p of s.roadSurface!)if(footprintClearance(p.a,p.b,ring)<p.halfWidth+.1)throw Error('Gate pier intersects road '+p.roadId);for(const p of pieces)if(footprintClearance(p.a,p.b,ring)<p.halfWidth+.05)throw Error('Gate pier intersects footway '+JSON.stringify({road:p.roadId,kind:p.kind,a:gateLocal(s,p.a),b:gateLocal(s,p.b),ring:ring.map(q=>gateLocal(s,q)),distance:footprintClearance(p.a,p.b,ring)}));}}
// Validate only changed segments against ALL original buildings and road envelopes.
const changed=pieces.filter(p=>Math.hypot(p.a.x-s.entrance!.point.x,p.a.z-s.entrance!.point.z)<20||Math.hypot(p.b.x-s.entrance!.point.x,p.b.z-s.entrance!.point.z)<20);
for(const p of changed){for(const b of s.buildings)if(footprintClearance(p.a,p.b,b.points)<p.halfWidth+.099)throw Error('Adjusted footway/building '+b.id);if(p.kind!=='crossing')for(const r of s.roadSurface!)if(segmentClearance(p.a,p.b,r.a,r.b)<p.halfWidth+r.halfWidth+.199)throw Error('Adjusted footway/road '+r.roadId);}
if(!canStand(s.spawn.point,s))throw Error('Invalid gate spawn');
const candidates=s.buildings.map(b=>{const center={x:b.points.reduce((v,p)=>v+p.x,0)/b.points.length,z:b.points.reduce((v,p)=>v+p.z,0)/b.points.length},q=gateLocal(s,center);let area=0;for(let i=1;i<b.points.length;i++)area+=b.points[i-1]!.x*b.points[i]!.z-b.points[i]!.x*b.points[i-1]!.z;return{b,q,area:Math.abs(area/2)};}).filter(f=>f.q.z>20&&f.q.z<95&&Math.abs(f.q.x)<35&&f.area>90&&f.area<1500).sort((a,b)=>Math.hypot(a.q.x,a.q.z)-Math.hypot(b.q.x,b.q.z));
if(candidates[0])s.entrance.contextBuilding={id:candidates[0].b.id,height:6.2};
s.entrance.supports=rings.map(r=>({x:r.slice(0,4).reduce((v,p)=>v+p.x,0)/4,z:r.slice(0,4).reduce((v,p)=>v+p.z,0)/4}));s.entrance.candidateOffsetM=Math.hypot(s.entrance.point.x,s.entrance.point.z);
if(before!==JSON.stringify({roads:s.roads,buildings:s.buildings,surface:s.roadSurface,virtual:s.virtualRoads}))throw Error('Source or traffic geometry changed');
mkdirSync('data/wukari/phase10d',{recursive:true});writeFileSync('data/wukari/phase10d/fuw-play.json',JSON.stringify(s)+'\n');writeFileSync('data/wukari/phase10d/report.json',JSON.stringify({baseSha256:createHash('sha256').update(bytes).digest('hex'),sourceRecordsUnchanged:true,vehicleSurfacesUnchanged:true,oldGate,newGate:s.entrance,spawn:s.spawn,changedWalkSegments:changed.length,gateFootprints:rings,context:'Existing anonymous OSM footprint only; photo building identity unverified, display height and finishes illustrative.'},null,2)+'\n');console.log(JSON.stringify({gate:s.entrance,spawn:s.spawn,changedWalkSegments:changed.length},null,2));
