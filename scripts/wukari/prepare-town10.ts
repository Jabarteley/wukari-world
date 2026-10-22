/** Additive review from the pinned local aggregate; no import or geographic edits. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {indexNodes,wayPositions,toWorld,type Dataset} from '../../src/wukari/geography.ts';
import type {Study,Feature} from '../../src/wukari/play/model.ts';
import {pedestrianNetwork} from '../../src/wukari/play/pedestrians.ts';
import {sceneryPositions} from '../../src/wukari/play/infrastructure.ts';
const bytes=readFileSync('.cache/wukari/local-pbf-import-20261020/dataset.json');
const sha=createHash('sha256').update(bytes).digest('hex');
if(sha!=='9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750')throw Error('Aggregate differs from pinned source');
const data=JSON.parse(bytes.toString()) as Dataset,nodes=indexNodes(data.osm.elements);
const study=JSON.parse(readFileSync('data/wukari/phase9/town9.json','utf8')) as Study;
const features:Feature[]=[],matches:unknown[]=[];
for(const e of data.osm.elements){
  if(e.tags&&/wukari|fuw|university/i.test([e.tags.name,e.tags['name:en'],e.tags.operator,e.tags.official_name].join(' ')))matches.push({type:e.type,id:e.id,tags:e.tags,position:e.lon!==undefined?[e.lon,e.lat]:null});
  if(e.type!=='way'||!e.tags||(!e.tags.barrier&&!e.tags.landuse&&!e.tags.natural&&!e.tags.leisure))continue;
  const coordinates=wayPositions(e,data.osm.elements,nodes);if(!coordinates)continue;
  const points=coordinates.map(p=>toWorld(study.origin,p));
  if(!points.some(p=>Math.abs(p.x)<=study.halfSize&&Math.abs(p.z)<=study.halfSize))continue;
  features.push({id:e.id,nodes:e.nodes!,tags:e.tags,coordinates,points,version:e.version,timestamp:e.timestamp,distanceM:0,association:'nearby-only; FUW ownership unverified'});
}
study.obstacles=features.filter(f=>f.tags.barrier);
// Point barriers also block virtual navigation; unknown gates are not assumed open.
for(const e of data.osm.elements)if(e.type==='node'&&e.tags?.barrier&&e.lon!==undefined&&e.lat!==undefined){const point=toWorld(study.origin,[e.lon,e.lat]);if(Math.abs(point.x)<=study.halfSize&&Math.abs(point.z)<=study.halfSize)study.obstacles.push({id:e.id,nodes:[e.id],coordinates:[[e.lon,e.lat]],points:[point],tags:e.tags,distanceM:0,association:'nearby-only; FUW ownership unverified'});}
study.groundCover=features.filter(f=>!f.tags.barrier&&f.nodes[0]===f.nodes.at(-1));
study.streetObstacles=sceneryPositions(study).props.map(p=>({x:p.x,z:p.z,radius:p.radius}));
study.pedestrians=pedestrianNetwork(study);
if(study.spawn&&study.pedestrians.spawn){study.spawn={...study.spawn,point:study.pedestrians.spawn,review:study.pedestrians.policy+' Spawn lies on the connected roadside simulation, not the source centerline.'};}else study.spawn=null;
const dir='data/wukari/phase10';mkdirSync(dir,{recursive:true});
writeFileSync(dir+'/town10.json',JSON.stringify(study)+'\n');
const conflicts=study.roadConflicts??[],net=study.pedestrians;
const report={sourceSha256:sha,originalRoads:study.roads.length,unchangedFootprints:study.buildings.length,conflicts:{source:conflicts.filter(c=>c.kind==='source-centerline'),illustrative:conflicts.filter(c=>c.kind==='illustrative-width')},mappedPaths:study.roads.filter(r=>['footway','path','pedestrian'].includes(r.tags.highway??'')).map(r=>({id:r.id,tags:r.tags})),barriers:study.obstacles.map(f=>({id:f.id,tags:f.tags})),groundCover:study.groundCover.map(f=>({id:f.id,tags:f.tags})),pedestrians:{pieces:net.pieces.length,crossings:net.pieces.filter(p=>p.kind==='crossing').length,activePieces:net.pieces.filter(p=>p.component===net.component).length,component:net.component,connectedLengthM:net.lengthM,rejectedIntervals:net.rejected,spawn:net.spawn},fuwNameSearch:{query:'name/name:en/operator/official_name contains wukari|fuw|university',matches,warning:'Names are evidence candidates, not university ownership or gate verification.'}};
writeFileSync(dir+'/coverage.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,pedestrians:report.pedestrians,conflicts:{source:report.conflicts.source.length,illustrative:report.conflicts.illustrative.length},fuwNameSearch:matches},null,2));
