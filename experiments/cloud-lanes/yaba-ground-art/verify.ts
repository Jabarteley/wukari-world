/** Decode the delivered GLBs, verify frozen inputs, and exercise the pinned geography adapter. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBytes } from 'gltf-validator';
import { createAdapter, modelPointToScene } from '../lagos-geography/adapter.ts';
import { CONFIG, point } from '../lagos-geography/fixture.ts';

const HERE=dirname(fileURLToPath(import.meta.url)), ROOT=resolve(HERE,'../../..');
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const hash=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
const write=(p:string,v:unknown)=>writeFileSync(resolve(HERE,p),JSON.stringify(v,null,2)+'\n');
const integration=resolve(ROOT,'experiments/cloud-lanes/integration-contract');
const lock=json(resolve(integration,'packet-lock.json'));
const bytes=readFileSync(resolve(integration,lock.path));
assert.equal(hash(bytes),lock.sha256);assert.equal(bytes.length,lock.bytes);
const packet=JSON.parse(bytes.toString());
const indexBytes=readFileSync(resolve(integration,'input-index.json'));
assert.equal(hash(indexBytes),packet.inputIndexSha256);
const index=JSON.parse(indexBytes.toString());
for(const f of index.files){const b=readFileSync(resolve(ROOT,f.path));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256,f.path);}
for(const [name,f] of Object.entries(packet.integrationSources) as [string,any][]){const b=readFileSync(resolve(integration,name));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);}

function glb(file:string){
 const bytes=readFileSync(resolve(HERE,'artifacts',file));
 assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(8),bytes.length);
 const length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString());
 const bin=bytes.subarray(28+length);return {bytes,doc,bin};
}
function positions(asset:any){
 const all:number[][]=[];
 for(const node of asset.doc.nodes){
  if(node.mesh===undefined)continue;
  assert.ok(!node.matrix&&!node.rotation&&!node.scale&&!node.translation,'Exporter baked mesh transforms');
  for(const p of asset.doc.meshes[node.mesh].primitives){
   const a=asset.doc.accessors[p.attributes.POSITION],v=asset.doc.bufferViews[a.bufferView];
   assert.equal(a.componentType,5126);assert.equal(a.type,'VEC3');
   for(let i=0;i<a.count;i++){const off=(v.byteOffset??0)+(a.byteOffset??0)+i*(v.byteStride??12);all.push([0,4,8].map(o=>asset.bin.readFloatLE(off+o)));}
  }
 }
 return all;
}
function anchors(asset:any){
 const out:Record<string,{x:number,y:number,z:number}>={};
 for(const n of asset.doc.nodes.filter((n:any)=>n.name?.startsWith('anchor_'))){
  assert.equal(n.extras.routeAuthorized,false);
  const key=n.name.replace(/^anchor_/,'').replace(/\.\d+$/,'');
  const [x,y,z]=n.translation??[0,0,0];out[key]={x,y,z};
 }
 return out;
}
const decoded={near:glb('street-near.glb'),far:glb('street-far.glb')};
const nearAnchors=anchors(decoded.near),farAnchors=anchors(decoded.far);
assert.deepEqual(nearAnchors,farAnchors,'LOD semantic anchors must match exactly');
const source=json(resolve(HERE,'anchors-source.json'));
let maxAnchorError=0;
for(const [name,[x,y,z]] of Object.entries(source.anchors) as [string,number[]][]){
 const a=nearAnchors[name];maxAnchorError=Math.max(maxAnchorError,Math.hypot(a.x-x,a.y-z,a.z+y));
}assert.ok(maxAnchorError<1e-6);
const metrics:Record<string,any>={};
const seamGeometry:Record<string,any>={};
for(const [lod,a] of Object.entries(decoded)){
 const points=positions(a);
 const min=[0,1,2].map(i=>Math.min(...points.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...points.map(p=>p[i])));
 const south=points.filter(p=>Math.abs(p[2]-12)<1e-5),north=points.filter(p=>Math.abs(p[2]+12)<1e-5);
 // Compare actual terminal cross-section vertices after the authored .144m grade rise.
 const residual=(aa:number[][],bb:number[][],dy:number)=>Math.max(...aa.map(a=>Math.min(...bb.map(b=>Math.hypot(a[0]-b[0],a[1]+dy-b[1])))));
 const error=Math.max(residual(south,north,.144),residual(north,south,-.144));
 assert.ok(error<2e-5,`${lod} actual terminal mesh seam mismatch ${error}`);
 seamGeometry[lod]={southVertexSamples:south.length,northVertexSamples:north.length,maxMismatchMetres:error};
 const result=await validateBytes(new Uint8Array(a.bytes),{uri:`street-${lod}.glb`,maxIssues:2000});
 assert.equal(result.issues.numErrors,0,JSON.stringify(result.issues.messages.filter((m:any)=>m.severity===0)));
 const triangles=a.doc.meshes.reduce((n:number,m:any)=>n+m.primitives.reduce((n:number,p:any)=>n+a.doc.accessors[p.indices].count/3,0),0);
 metrics[lod]={bytes:a.bytes.length,sha256:hash(a.bytes),boundsGltfMetres:{min,max,size:max.map((v,i)=>v-min[i])},triangles,meshes:a.doc.meshes.length,primitives:a.doc.meshes.reduce((n:number,m:any)=>n+m.primitives.length,0),materials:a.doc.materials.length,materialNames:a.doc.materials.map((m:any)=>m.name),textures:a.doc.images?.length??0,skins:a.doc.skins?.length??0,morphTargets:a.doc.meshes.reduce((n:number,m:any)=>n+m.primitives.reduce((n:number,p:any)=>n+(p.targets?.length??0),0),0),animations:a.doc.animations?.length??0,extensionsUsed:a.doc.extensionsUsed??[],validation:{errors:result.issues.numErrors,warnings:result.issues.numWarnings,infos:result.issues.numInfos,messages:result.issues.messages}};
 assert.equal(metrics[lod].skins+metrics[lod].morphTargets+metrics[lod].animations,0);
}
const adapter=createAdapter(CONFIG);
const spec={near:'artifacts/street-near.glb',far:'artifacts/street-far.glb',metresPerModelUnit:1,groundAnchorModel:nearAnchors.pivot,forward:'+z' as const};
// Authored glTF +Z faces SOUTH, so heading 180 produces zero model yaw in this frame.
const placement=adapter.place(spec,point(0,-12,0),180);
const next=adapter.place(spec,point(0,12,.144),180);
let maxAdapterResidual=0;
for(const [n,s] of [['north_crown','south_crown'],['north_east_kerb','south_east_kerb'],['north_west_kerb','south_west_kerb'],['drain_invert_north','drain_invert_south']]){
 const a=modelPointToScene(nearAnchors[n],placement),b=modelPointToScene(nearAnchors[s],next);
 maxAdapterResidual=Math.max(maxAdapterResidual,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));
}assert.ok(maxAdapterResidual<1e-6);
const placedAnchors=Object.fromEntries(Object.entries(nearAnchors).map(([name,value])=>{
 const scene=modelPointToScene(value,placement),local=adapter.sceneToLocal(scene),geo=adapter.localToGeographic(local),street=adapter.cityToStreet(adapter.geographicToCity(geo));
 const round=adapter.geographicToLocal(geo,local.up);assert.ok(Math.hypot(round.east-local.east,round.north-local.north)<1e-6);
 return [name,{model:value,scene,local,geographicPlanningOnly:geo,projectedStreet:street}];
}));
const provenance={classification:'authored-synthetic',surveyed:false,realWorldHorizontalErrorMetres:null,realWorldVerticalErrorMetres:null,sourceImages:[],routeAuthorized:false};
const frontage=(id:string,bounds:number[],heading:number)=>({id,version:'frontage-zones-v1',boundsLocalEastNorthMetres:bounds,buildingFrontHeadingDegrees:heading,provenance,authority:'reservation proposal only; building owner supplies their own threshold/pivot',setbackMetres:0});
write('placement.json',{
 schema:'allworld-yaba-ground-placement-v1',version:'yaba-ground-layout-v1',integrationCommit:'caaee5e1b91afc7f3cd3f2124df3547dc7f492ec',packetLockSha256:lock.sha256,pilot:packet.pilot,provenance,
 axes:{blender:'X east, Y north, Z up',gltf:'X east, Y up, Z south',units:'metres'},spec,placement,headingDegrees:180,
 dimensionsAuthored:{segmentLengthMetres:24,carriagewayWidthMetres:7,kerbWidthMetres:.2,drainOuterWidthMetres:.58,sidewalkWidthMetres:2.1,fullWidthMetres:13.2,longitudinalGrade:.006,crownRiseMetres:.065,crossfall:.065/3.5,normalKerbUpMetres:.175,drivewayKerbUpMetres:.035,drivewayNorthIntervalMetres:[3,7],drivewayTransitionsNorthIntervals:[[2,3],[7,8]],verticalDatum:'arbitrary authored zero at south road edge'},
 anchors:placedAnchors,
 adjacentSegmentProposal:{placement:next,note:'numerical seam witness only, not an additional detailed authored segment'},
 frontages:[frontage('E01',[6.6,26.6,-10,10],270),frontage('W01',[-26.6,-6.6,-10,10],90),frontage('E02',[6.6,28,14,38],270),frontage('W02',[-28,-6.6,14,38],90)],
 frontageThresholdProposals:[{id:'E01_driveway',local:point(6.6,5,.1718),note:'connects graded shoulder; building sill still owned by E',routeAuthorized:false}],
 planningRoadReservations:[{id:'north_south',bounds:[-6.6,6.6,-100,100]},{id:'east_west',bounds:[-100,100,42,55]}],
 lod:{switchDistanceMetresProposal:35,hysteresisMetresProposal:5,implementedInRuntime:false,omissions:['fine cracks and paint','individual flags and bevels','iron grille and lid','loose aggregate','drain walls','continuous kerb ramp profile'],farMaterials:'three average factors, no texture maps'},
 seamLimitations:'Named design anchors match; bevels intentionally recess surface corners by up to 5mm. Neither seam proof nor street art grants routing.'
});
write('collision-walkable-proposals.json',{
 schema:'allworld-yaba-ground-collision-proposals-v1',routeAuthorized:false,registered:false,provenance,
 collisionEnvelopes:[{id:'road',min:[-3.5,-.2,-12],max:[3.5,.37,12]},{id:'east_sidewalk',min:[4.28,-.2,-12],max:[6.38,.37,12]},{id:'west_sidewalk',min:[-6.38,-.2,-12],max:[-4.28,.37,12]}],
 envelopeAxes:'glTF X/Y/Z metres; conservative bounds only; not usable surface colliders',
 walkableAnnotations:[{id:'east_sidewalk',localEastInterval:[4.28,6.38],localNorthInterval:[-12,12],surface:'walk(x,n) in editable source',proposedOnly:true,routeAuthorized:false},{id:'west_sidewalk',localEastInterval:[-6.38,-4.28],localNorthInterval:[-12,12],surface:'walk(x,n) in editable source',proposedOnly:true,routeAuthorized:false}],
 exclusionAnnotations:[{id:'open_drains',localEastIntervals:[[-4.08,-3.5],[3.5,4.08]],localNorthInterval:[-12,12],note:'open hazard even where grilles/driveway bridge appear; WORLD must author actual collisions',routeAuthorized:false}],
 runtimeEdits:[]
});
write('receipts/geometry-placement.json',{status:'PASS',verifiedFrozenInputFiles:index.files.length,sealedIndexDigestVerified:true,packetHash:lock.sha256,metrics,anchorCount:Object.keys(nearAnchors).length,nearFarAnchorDeltaMetres:0,maxAuthoredToExportAnchorErrorMetres:maxAnchorError,maxAdjacentAdapterResidualMetres:maxAdapterResidual,actualMeshSeams:seamGeometry,mapEastScaleRelativeToLocal:adapter.mapEastScaleRelativeToLocal,routeAuthorized:false});
console.log(JSON.stringify({status:'PASS',nearTriangles:metrics.near.triangles,farTriangles:metrics.far.triangles,nearBytes:metrics.near.bytes,farBytes:metrics.far.bytes,anchors:10,maxAdapterResidual,actualMeshSeams:seamGeometry,validation:Object.fromEntries(Object.entries(metrics).map(([k,m])=>[k,{errors:m.validation.errors,warnings:m.validation.warnings,infos:m.validation.infos,codes:[...new Set(m.validation.messages.map((x:any)=>x.code))]}]))}));
