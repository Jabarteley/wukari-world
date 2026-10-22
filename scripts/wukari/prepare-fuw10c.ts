import {virtualBypass} from './virtual-bypass.ts';
/** Additive gameplay derivative. Never edits the 10B source review or GIS records. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {indexNodes,wayPositions,toWorld,fromWorld,type Dataset} from '../../src/wukari/geography.ts';
import {roadSurfaces,footprintClearance} from '../../src/wukari/play/roads.ts';
import {pedestrianNetwork} from '../../src/wukari/play/pedestrians.ts';
import {canStand,segmentDistance,gameplayRoads,type Study,type Point} from '../../src/wukari/play/model.ts';
const original=readFileSync('data/wukari/phase10b/fuw-osm.json'),s:Study=JSON.parse(original.toString());
s.title='Federal University Wukari — Entrance Area';s.trafficLanes=true;
const aggregate=readFileSync('.cache/wukari/local-pbf-import-20261020/dataset.json');
if(createHash('sha256').update(aggregate).digest('hex')!==s.coverage.sourceSha256)throw Error('Pinned aggregate changed');
const dataset=JSON.parse(aggregate.toString()) as Dataset,nodes=indexNodes(dataset.osm.elements);s.obstacles=[];s.groundCover=[];
for(const e of dataset.osm.elements){if(!e.tags||(!e.tags.barrier&&!e.tags.landuse&&!e.tags.natural&&!e.tags.leisure))continue;
 const coordinates=e.type==='node'&&e.lon!==undefined&&e.lat!==undefined?[[e.lon,e.lat] as [number,number]]:e.type==='way'?wayPositions(e,dataset.osm.elements,nodes):null;if(!coordinates)continue;
 const points=coordinates.map(p=>toWorld(s.origin,p));if(!points.some(p=>Math.abs(p.x)<s.halfSize&&Math.abs(p.z)<s.halfSize))continue;
 const f={id:e.id,nodes:e.nodes??[e.id],tags:e.tags,coordinates,points,distanceM:0,association:'nearby-only; FUW ownership unverified' as const};
 if(e.tags.barrier)s.obstacles.push(f);else if(e.type==='way'&&e.nodes?.[0]===e.nodes?.at(-1))s.groundCover.push(f);
}
// Owner authorized a clearly illustrative bypass after the OSM/Overture conflict was confirmed.
const sourceApproach=s.roads.find(r=>r.id===673416541)!;
const anchor={x:-9,z:4.01},inward=sourceApproach.points[1]!,outward=sourceApproach.points[0]!;
const bypass=virtualBypass(s,anchor,outward);
const points=[...bypass].reverse().concat(sourceApproach.points.slice(1));
s.virtualRoads=[{...sourceApproach,points,coordinates:points.map(p=>fromWorld(s.origin,p.x,p.z)),nodes:[sourceApproach.nodes[0]!,...bypass.slice(0,-1).reverse().map((_,i)=>-10000-i),...sourceApproach.nodes.slice(1)],tags:{...sourceApproach.tags,'wukari:geometry':'owner-authorized illustrative virtual bypass; not mapped geography'}}];
// Complete original ways and original polygons retained. Flat bounded scene, not a campus boundary.
const surface=roadSurfaces({...s,roads:gameplayRoads(s)},3.1);s.roadSurface=surface.pieces;s.roadConflicts=surface.conflicts.concat((JSON.parse(original.toString()) as Study).roadConflicts!.filter(c=>c.roadId===673416541));
s.pedestrians=pedestrianNetwork(s,4.25,true);
const net=s.pedestrians,approach=s.roads.find(r=>r.id===673416541)!;
// Closest point on the connected, non-crossing pedestrian network to the unverified report.
const options=net.pieces.filter(p=>p.component===net.component&&p.kind!=='crossing'&&p.roadId===approach.id).map(p=>{const dx=p.b.x-p.a.x,dz=p.b.z-p.a.z,t=Math.max(.75,Math.min(.92,-(p.a.x*dx+p.a.z*dz)/(dx*dx+dz*dz)));return {x:p.a.x+t*dx,z:p.a.z+t*dz};}).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
const point=options.filter(p=>p.x < -10).find(p=>canStand(p,s)&&s.roadSurface!.every(r=>segmentDistance(p,r.a,r.b)>r.halfWidth+.45));
if(!point||Math.hypot(point.x,point.z)>60||net.lengthM<80)throw Error('No eligible connected pedestrian spawn within60m; keep review non-spawning');
s.spawn={point,nodeId:6306383696,roadId:approach.id,eligible:true,facing:net.pieces.find(p=>p.component===net.component&&segmentDistance(point,p.a,p.b)<.01)!.b,review:'FUW candidate entrance — virtual gameplay position. Clearance-tested illustrative pedestrian corridor; not official gate coordinates or verified real-world access.'};
// Search along the independently mapped approach for a replaceable artistic portal.
const a=approach.points[0]!,b=approach.points[1]!,length=Math.hypot(b.x-a.x,b.z-a.z),dx=(b.x-a.x)/length,dz=(b.z-a.z)/length,halfSpan=5.8;
for(let d=length-4;d>length-65;d-=.5){const p={x:a.x+dx*d,z:a.z+dz*d},supports=[-1,1].map(sign=>({x:p.x-dz*halfSpan*sign,z:p.z+dx*halfSpan*sign}));
 if(supports.every(q=>s.buildings.every(f=>footprintClearance(q,q,f.points)>1)&&net.pieces.every(w=>segmentDistance(q,w.a,w.b)>w.halfWidth+.65)&&s.roadSurface!.every(r=>segmentDistance(q,r.a,r.b)>r.halfWidth+.65))){s.entrance={point:p,yaw:Math.atan2(dx,dz),halfSpan,supports,proposed:true,candidateOffsetM:Math.hypot(p.x,p.z)};break;}}
if(!s.entrance)throw Error('No clearance for proposed portal supports');
s.coverage.policy+=' Phase10C additive virtual play: illustrative maximum6.2m road surface, narrowed/suppressed at footprints; right-hand lanes only on fully clear segments. 1.7m pedestrian corridors at4.25m offsets, not surveyed sidewalks. Proposed gate art is not actual entrance geometry.';
const report={sourceSha256:createHash('sha256').update(original).digest('hex'),candidate:s.origin,spawn:s.spawn,spawnOffsetM:Math.hypot(point.x,point.z),entrance:s.entrance,pedestrians:{component:net.component,lengthM:net.lengthM,pieces:net.pieces.filter(p=>p.component===net.component).length,rejected:net.rejected},roads:s.roads.length,buildings:s.buildings.length,conflicts:surface.conflicts,originalSourceConflicts:(JSON.parse(original.toString()) as Study).roadConflicts!.filter(c=>c.roadId===673416541),virtualBypass:{sourceRoadId:673416541,sourceBuildingId:1523025373,points:bypass,policy:'Owner-authorized illustrative gameplay bypass, not a mapped road. Original OSM records unchanged.'},unknowns:['Official gate position/design, campus boundary and ownership','Actual pedestrian access, walls, surveyed widths, terrain heights','Identities of anonymous campus-vicinity footprints'],transformation:'Existing fixed9N spherical east/south metre frame; no source coordinate changes'};
mkdirSync('data/wukari/phase10c',{recursive:true});writeFileSync('data/wukari/phase10c/fuw-play.json',JSON.stringify(s)+'\n');writeFileSync('data/wukari/phase10c/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,conflicts:report.conflicts.length},null,2));
