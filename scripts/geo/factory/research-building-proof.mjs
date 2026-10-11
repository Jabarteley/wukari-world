import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {createStationFrame} from '../../../src/game/cities/stations/frame.ts';
import {createStationBuildings} from '../../../src/game/cities/stations/buildings.ts';
/** @typedef {{ref:string, complete:boolean, closedByNodeIdentity:boolean, tags:Record<string,unknown>, points:unknown[]}} Feature */
/** @typedef {{ref:string,name:string,membership:string,sourceDispute:unknown}} ReviewedBuilding */
/** @param {unknown} value @returns {Record<string,unknown>} */
function record(value) {
 if(typeof value!=='object'||value===null||Array.isArray(value))throw Error('Expected JSON object');
 return Object.fromEntries(Object.entries(value));
}
/** @param {unknown} value @returns {unknown[]} */
function array(value) {if(!Array.isArray(value))throw Error('Expected JSON array');return value;}
/** @param {unknown} value @returns {string} */
function text(value) {if(typeof value!=='string'||!value.trim())throw Error('Expected nonempty JSON string');return value;}
/** @param {unknown} value @returns {boolean} */
function boolean(value) {if(typeof value!=='boolean')throw Error('Expected JSON boolean');return value;}
/** @param {unknown} value @returns {string} */
function hash(value) {const result=text(value);if(!/^[a-f0-9]{64}$/.test(result))throw Error('Expected SHA256');return result;}
/** @param {unknown} value @returns {Feature} */
function feature(value) {
 const row=record(value);
 return {ref:text(row.ref),complete:boolean(row.complete),closedByNodeIdentity:boolean(row.closedByNodeIdentity),tags:record(row.tags),points:array(row.points)};
}
/** @param {unknown} value @returns {ReviewedBuilding} */
function reviewedBuilding(value) {
 const row=record(value);
 if(!('sourceDispute' in row))throw Error('Missing explicit source-dispute review');
 if(row.sourceDispute!==null)record(row.sourceDispute);
 return {ref:text(row.ref),name:text(row.name),membership:text(row.membership),sourceDispute:row.sourceDispute};
}
/** @param {unknown} value @returns {import('../../../src/game/cities/stations/frame.ts').StationCoordinate} */
function coordinate(value) {
 const pair=array(value),lon=pair[0],lat=pair[1];
 if(pair.length!==2||typeof lon!=='number'||typeof lat!=='number'||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)throw Error('Invalid WGS84 footprint coordinate');
 return {lon,lat};
}
const [artifact,reviewFile,out]=process.argv.slice(2);
if(!artifact||!reviewFile||!out)throw Error('Expected geometry artifact, station review and output directory');
const file=join(artifact,'station-geometry.json'),raw=readFileSync(file);
/** @type {unknown} */
const sourceJson=JSON.parse(raw.toString('utf8'));
/** @type {unknown} */
const reviewJson=JSON.parse(readFileSync(reviewFile,'utf8'));
const source=record(sourceJson),review=record(reviewJson);
const geometryArtifactSha256=hash(review.geometryArtifactSha256),sourceSha256=hash(source.sourceSha256);
assert.equal(createHash('sha256').update(raw).digest('hex'),geometryArtifactSha256);
assert.equal(sourceSha256,hash(review.sourceSha256));
const stations=array(review.candidates).map(value=>{const row=record(value);return {id:text(row.id),buildings:array(row.buildings).map(reviewedBuilding)};});
const matches=stations.filter(candidate=>candidate.id==='rothera');
assert.equal(matches.length,1,'Rothera review is missing or ambiguous');
const station=matches[0];assert.ok(station,'Rothera review is missing');
const eligible=station.buildings.filter(building=>building.membership==='inside'&&building.sourceDispute===null);
assert.equal(eligible.length,6);
const sourceFeatures=array(source.features).map(feature);
const features=new Map(sourceFeatures.map(row=>[row.ref,row]));
assert.equal(features.size,sourceFeatures.length,'Duplicate source feature refs');
assert.equal(new Set(eligible.map(building=>building.ref)).size,6,'Duplicate reviewed building refs');
/** @param {ReviewedBuilding} b @returns {import('../../../src/game/cities/stations/buildings.ts').StationBuilding & {name:string}} */
function building(b) {
 const f=features.get(b.ref);assert.ok(f,`Missing source feature ${b.ref}`);assert.ok(f.complete&&f.closedByNodeIdentity);
 const levelTag=f.tags['building:levels'],levels=typeof levelTag==='string'?Number(levelTag):NaN;
 const metres=Number.isFinite(levels)&&levels>0&&levels<=10?levels*3:4;
 const colour=f.tags['building:colour'];
 return {id:f.ref,name:b.name,ring:f.points.map(coordinate),height:{metres,kind:'estimated'},colour:typeof colour==='string'&&/^#[0-9a-f]{6}$/i.test(colour)?colour:'#aab9c5'};
}
const buildings=eligible.map(building);
const frame=createStationFrame({lon:-68.1248,lat:-67.568889});
const built=createStationBuildings(frame,buildings);
built.geometry.computeBoundingBox();
const pos=built.geometry.getAttribute('position');
assert.ok(pos&&Array.from(pos.array).every(Number.isFinite));
assert.ok(built.triangles>0&&built.triangles<10000);
const box=built.geometry.boundingBox;assert.ok(box,'Building mesh has no bounding box');
assert.ok(box.max.y<=.061&&box.min.y>=-1e-7);
const first=buildings[0];assert.ok(first,'Missing first screened building');
assert.throws(()=>createStationBuildings(frame,[{...first,height:{metres:0,kind:'estimated'}}]));
assert.throws(()=>createStationBuildings(frame,[{...first,ring:first.ring.slice(0,-1)}]));
mkdirSync(out,{recursive:true});
writeFileSync(join(out,'station-buildings.geometry.json'),JSON.stringify(built.geometry.toJSON()));
writeFileSync(join(out,'station-building-proof.json'),JSON.stringify({sourceGitSHA:process.env.GITHUB_SHA,sourceSha256,geometryArtifactSha256,station:'rothera',buildings:buildings.map(({ring,...b})=>b),triangles:built.triangles,vertices:pos.count,meshCount:1,heightPolicy:'3m per mapped level; otherwise4m. All heights estimated, not surveyed.',invalidHeightRejected:true,openRingRejected:true,status:'GEOMETRY_CANDIDATE',limitations:['No current-operation or gameplay-service claims.','No registration/nativebrowser/release acceptance.']},null,2));
built.geometry.dispose();
console.log(JSON.stringify({buildings:buildings.length,triangles:built.triangles,status:'GEOMETRY_CANDIDATE'}));
