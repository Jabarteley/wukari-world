/** Bounded selection from the already validated local dataset, not a new import. */
import { readFileSync,writeFileSync,mkdirSync,copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contains,indexNodes,toWorld,wayPositions,type Dataset,type Position } from '../../src/wukari/geography.ts';
import { canStand,lineDistance,type Feature,type Study } from '../../src/wukari/play/model.ts';
import { roadSurfaces } from '../../src/wukari/play/roads.ts';
const source=readFileSync('.cache/wukari/local-pbf-import-20261020/dataset.json');
const sha=createHash('sha256').update(source).digest('hex');
if(sha!=='9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750')throw Error('Local dataset differs from pinned validated aggregate');
const data=JSON.parse(source.toString()) as Dataset,nodes=indexNodes(data.osm.elements);
const nodeId=1965491008,node=nodes.get(nodeId)!;
if(!node?.lon||!node.lat)throw Error('Original junction missing');
const origin:Position=[node.lon,node.lat],halfSize=500;
if(!contains(data.extents.lga.feature.geometry,origin))throw Error('Outside Wukari LGA');
const features:Feature[]=[],omittedRoads:number[]=[];
for(const e of data.osm.elements){
  if(e.type!=='way'||(!e.tags?.highway&&(!e.tags?.building||e.tags.building==='no')))continue;
  const coordinates=wayPositions(e,data.osm.elements,nodes);if(!coordinates)continue;
  const points=coordinates.map(p=>toWorld(origin,p));
  if(!points.every(p=>Math.abs(p.x)<=halfSize&&Math.abs(p.z)<=halfSize)){if(e.tags?.highway&&points.some(p=>Math.abs(p.x)<=halfSize&&Math.abs(p.z)<=halfSize))omittedRoads.push(e.id);continue;}
  features.push({id:e.id,nodes:e.nodes!,tags:e.tags??{},coordinates,points,version:e.version,timestamp:e.timestamp,distanceM:lineDistance({x:0,z:0},points),association:'nearby-only; FUW ownership unverified'});
}
const roads=features.filter(f=>f.tags.highway),buildings=features.filter(f=>f.tags.building&&f.tags.building!=='no');
const adjacency=new Map<number,Set<number>>();
for(const r of roads)for(let i=1;i<r.nodes.length;i++){const a=r.nodes[i-1]!,b=r.nodes[i]!;if(!adjacency.has(a))adjacency.set(a,new Set());if(!adjacency.has(b))adjacency.set(b,new Set());adjacency.get(a)!.add(b);adjacency.get(b)!.add(a);}
const components=new Map<number,number>();let count=0;
for(const n of adjacency.keys()){if(components.has(n))continue;const queue=[n];components.set(n,++count);while(queue.length)for(const next of adjacency.get(queue.pop()!)??[])if(!components.has(next)){components.set(next,count);queue.push(next);}}
roads.forEach(r=>r.component=components.get(r.nodes[0]!));
const evidence=JSON.parse(readFileSync('data/wukari/phase7/sources.json','utf8'));
const surfaces=roadSurfaces({roads,buildings});
const study:Study={schemaVersion:1,id:'town',title:'Wukari town / connected road network',origin,halfSize,roads,buildings,sources:evidence.sources,candidates:[],roadSurface:surfaces.pieces,roadConflicts:surfaces.conflicts,
 spawn:{point:toWorld(origin,origin),nodeId,roadId:185860473,eligible:true,review:'Owner-authorized simulation-only spawn reviewed at an original shared-reference junction; no mapped restrictive tags, bridge/tunnel/ford; building clearance and surface clearance checked. Physical/legal/public access, traffic and safety unverified.'},
 coverage:{roads:roads.length,buildings:buildings.length,components:count,sourceSha256:sha,policy:'Complete original ways inside a 1 km square around original junction node 1965491008. Source records unchanged; crossing ways still omitted and inventoried. Display window, not a legal boundary.'}};
if((adjacency.get(nodeId)?.size??0)<3||!canStand(study.spawn!.point,study))throw Error('Junction spawn failed simulation review');
const previous=JSON.parse(readFileSync('data/wukari/phase7/town.json','utf8')) as Study,old=roadSurfaces(previous);
const junctions=[...adjacency].filter(([,a])=>a.size>2).map(([id,edges])=>({nodeId:id,position:[nodes.get(id)!.lon,nodes.get(id)!.lat],degree:edges.size,roads:roads.filter(r=>r.nodes.includes(id)).map(r=>r.id)}));
const seen=new Map<string,number>(),duplicateFootprints:number[][]=[],openRings:number[]=[],properSelfCrossings:number[]=[];
const cross=(a:{x:number;z:number},b:{x:number;z:number},c:{x:number;z:number})=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
for(const building of buildings){
  const p=building.points,key=JSON.stringify(p.slice(0,-1).map(q=>[q.x,q.z]).sort());
  if(seen.has(key))duplicateFootprints.push([seen.get(key)!,building.id]);seen.set(key,building.id);
  if(p[0]!.x!==p.at(-1)!.x||p[0]!.z!==p.at(-1)!.z)openRings.push(building.id);
  for(let i=0;i<p.length-1;i++)for(let j=i+2;j<p.length-1;j++){
    if(i===0&&j===p.length-2)continue;
    const a=p[i]!,b=p[i+1]!,c=p[j]!,d=p[j+1]!;
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)properSelfCrossings.push(building.id);
  }
}
const report={sourceSha256:sha,origin,halfSize,coverage:study.coverage,spawn:study.spawn,junctions,omittedCrossingRoadIds:omittedRoads,oldCoverage:previous.coverage,oldSpawn:previous.spawn,oldConflicts:old.conflicts,newConflicts:surfaces.conflicts,
 buildingDiagnostics:{duplicateFootprints,openRings,properSelfCrossings,axisCheck:'All source vertices round-trip through the same east/south metre projection; Three.js x,-z shape followed by -pi/2 X rotation returns original world x,z. No footprint displacement or rotation applied.'},
 diagnosis:'Old 760 m whole-way selection omitted connecting crossing ways at the spawn (including way185860487). Old data already had bends/junctions elsewhere, but a low follow camera at a short straight segment hid them. New 1 km selection centers a genuine four-neighbor junction. No polyline vertices were discarded by the renderer.',
 policy:'Exact edge/segment clearance detects centerline and illustrative-width conflicts. Four-metre linear surface intervals retain the original centerline, narrow within building clearance and suppress intersecting intervals. Original buildings and road records stay available in Map Information; surface-based movement uses the same clear intervals.'};
mkdirSync('data/wukari/phase81',{recursive:true});writeFileSync('data/wukari/phase81/town.json',JSON.stringify(study)+'\n');copyFileSync('data/wukari/phase7/fuw.json','data/wukari/phase81/fuw.json');copyFileSync('data/wukari/phase7/sources.json','data/wukari/phase81/sources.json');
writeFileSync('docs/wukari/evidence/phase81-geography.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({roads:roads.length,buildings:buildings.length,junctions:junctions.length,surfacePieces:surfaces.pieces.length,oldConflicts:old.conflicts.slice(0,8),newConflictCount:surfaces.conflicts.length,spawn:study.spawn},null,2));
