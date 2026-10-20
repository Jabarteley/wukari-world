/** Hash-gated offline extract import; source geometry never replaced with fixtures. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDataset, contains, parseOsm, wayPositions, indexNodes, parseArea, rings, type Area, type Position } from '../../src/wukari/geography.ts';
import { checkedBytes, SOURCE_CONFIG } from './sources.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const sha256 = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
export interface Receipt { sourceUrl: string; retrievedAt: string; license: 'ODbL-1.0'; attribution: string; sha256: string; mode: 'source-data' | 'synthetic'; scope: string }
export function validateReceipt(receipt: Receipt, bytes: Uint8Array): void {
  if (!receipt || !['source-data', 'synthetic'].includes(receipt.mode) || receipt.license !== 'ODbL-1.0' || !receipt.attribution?.includes('OpenStreetMap') || !receipt.scope?.trim()) throw new Error('OSM license, attribution, mode and extraction scope required');
  const url = new URL(receipt.sourceUrl);
  if (url.protocol !== 'https:' || url.username || url.password || !Number.isFinite(Date.parse(receipt.retrievedAt)) || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(receipt.retrievedAt)) throw new Error('Recorded public HTTPS source and ISO retrieval time with timezone required');
  if (!/^[a-f0-9]{64}$/.test(receipt.sha256) || sha256(bytes) !== receipt.sha256) throw new Error('Source SHA-256 mismatch');
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function deduplicate(raw: unknown): { raw: unknown; duplicates: number } {
  const r = raw as { version?: number; elements?: unknown[]; remark?: unknown };
  if (!r || !Array.isArray(r.elements)) throw new Error('Expected OSM elements');
  const seen = new Map<string, unknown>(); let duplicates = 0;
  for (const element of r.elements) {
    if (!element || typeof element !== 'object') throw new Error('Malformed element');
    const e = element as {type?: string;id?: number}; const key = `${e.type}/${e.id}`;
    if (seen.has(key)) { if (canonical(seen.get(key)) !== canonical(e)) throw new Error(`Conflicting duplicate ${key}`); duplicates++; }
    else seen.set(key, e);
  }
  const result = {...r,elements:[...seen.values()]}; parseOsm(result);
  return {raw:result,duplicates};
}
/** Check each segment interval split at boundary intersections, including holes. */
export function withinBoundary(area: Area, points: Position[]): boolean {
  if (!points.every(p => contains(area,p))) return false;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1]!,b=points[i]!, rx=b[0]-a[0],ry=b[1]-a[1], cuts=[0,1];
    for(const ring of rings(area)) for(let j=1;j<ring.length;j++) {
      const c=ring[j-1]!,d=ring[j]!,sx=d[0]-c[0],sy=d[1]-c[1],den=rx*sy-ry*sx;
      if(den===0) continue;
      const qx=c[0]-a[0],qy=c[1]-a[1],t=(qx*sy-qy*sx)/den,u=(qx*ry-qy*rx)/den;
      if(t>0 && t<1 && u>=0 && u<=1) cuts.push(t);
    }
    cuts.sort((x,y)=>x-y);
    for(let j=1;j<cuts.length;j++) {
      if(cuts[j]===cuts[j-1]) continue;
      const t=(cuts[j]!+cuts[j-1]!)/2;
      if(!contains(area,[a[0]+t*rx,a[1]+t*ry])) return false;
    }
  }
  return true;
}
export function validateWay(points: Position[], closed: boolean): void {
  if (points.length < 2) throw new Error('Way has fewer than two positions');
  for (let i=1;i<points.length;i++) if (points[i]![0]===points[i-1]![0] && points[i]![1]===points[i-1]![1]) throw new Error('Zero-length way segment');
  if (!closed) return;
  parseArea({type:'Polygon',coordinates:[points]});
  const cross = (a: Position,b: Position,c: Position): number => (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  for(let i=0;i<points.length-1;i++) for(let j=i+2;j<points.length-1;j++) {
    if(i===0 && j===points.length-2) continue;
    const a=points[i]!,b=points[i+1]!,c=points[j]!,d=points[j+1]!;
    const overlaps = Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0])) <= Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0])) && Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1])) <= Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]));
    if(overlaps && cross(a,b,c)*cross(a,b,d)<=0 && cross(c,d,a)*cross(c,d,b)<=0) throw new Error('Self-intersecting footprint');
  }
}
export function importOffline(input: string, receiptPath: string, format: string, output: string, campusWay?: number): void {
  const bytes=readFileSync(input); if(bytes.length>32*1024*1024) throw new Error('Extract exceeds 32 MiB; crop first');
  const receipt=JSON.parse(readFileSync(receiptPath,'utf8')) as Receipt; validateReceipt(receipt,bytes);
  if(receipt.mode!=='source-data') throw new Error('Synthetic inputs cannot enter the real-source import path; use --synthetic foundation import');
  let raw: unknown;
  if(format==='osm-json') raw=JSON.parse(bytes.toString());
  else if(format==='osm-xml') raw=JSON.parse(execFileSync(process.platform === 'win32' ? 'python' : 'python3',[resolve(root,'scripts/wukari/osm-xml.py')],{input:bytes,maxBuffer:128*1024*1024}).toString());
  else throw new Error('Supported formats: osm-json, osm-xml. Convert PBF with osmium first; arbitrary GeoJSON is not OSM reference-complete.');
  const dedup=deduplicate(raw);
  const boundaryBytes=readFileSync(resolve(root,'data/wukari/verified/wukari-adm2.geojson')); checkedBytes(boundaryBytes,SOURCE_CONFIG.wukariAdm2);
  const dataset=buildDataset(JSON.parse(boundaryBytes.toString()),dedup.raw,{campusWay});
  let roads=0,buildings=0,incomplete=0;
  const nodes = indexNodes(dataset.osm.elements);
  for(const e of dataset.osm.elements) {
    if(e.type==='node' && !contains(dataset.extents.lga.feature.geometry,[e.lon!,e.lat!])) throw new Error(`Outside Wukari LGA: node/${e.id}; supply a cropped extract`);
    if(e.type!=='way') continue;
    const points=wayPositions(e,dataset.osm.elements,nodes);
    if(!points) { incomplete++; continue; }
    if(!withinBoundary(dataset.extents.lga.feature.geometry,points)) throw new Error(`Outside Wukari LGA: way/${e.id}`);
    const building=!!e.tags?.building && e.tags.building!=='no'; validateWay(points,building);
    if(building) buildings++; if(e.tags?.highway) roads++;
  }
  const out=resolve(output), cache=resolve(root,'.cache/wukari');
  if(!out.startsWith(cache+sep) || [resolve(input),resolve(receiptPath)].some(p=>p.startsWith(out+sep))) throw new Error('Use a new output directory under .cache/wukari, separate from inputs');
  mkdirSync(out,{recursive:false});
  const provenance={...receipt,importedAt:new Date().toISOString(),format,fieldVerified:false,verification:'source-backed-not-field-verified',boundarySha256:sha256(boundaryBytes)};
  const coverage={status:'source-review-required',campus:dataset.extents.campus.status,imported:dataset.coverage,roads,buildings,duplicatesRemoved:dedup.duplicates,incompleteWays:incomplete,unassembledRelations:dataset.coverage.relations,fieldVerified:0,elevation:'unavailable',navigation:'not-generated',note:'Counts describe this extract, not geographic completeness. Campus candidate requires independent corroboration. No automatic player spawn.'};
  writeFileSync(resolve(out,'source.bin'),bytes,{flag:'wx'});
  for(const [name,value] of Object.entries({'receipt.json':receipt,'provenance.json':provenance,'coverage.json':coverage,'dataset.json':{...dataset,provenance}})) writeFileSync(resolve(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(coverage,null,2));
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
  const args=process.argv.slice(2), allowed=['--input','--receipt','--format','--out','--campus-way'];
  if(args.length%2 || args.some((a,i)=>i%2===0 && !allowed.includes(a))) throw new Error('Use --input FILE --receipt FILE --format osm-json|osm-xml --out NEW_CACHE_DIR [--campus-way ID]');
  const get=(key:string):string=>{const i=args.indexOf(key); if(i<0 || !args[i+1]) throw new Error(`Missing ${key}`); return args[i+1]!;};
  const campus=args.includes('--campus-way')?Number(get('--campus-way')):undefined;
  if(campus!==undefined && (!Number.isSafeInteger(campus)||campus<=0)) throw new Error('Invalid campus way ID');
  importOffline(get('--input'),get('--receipt'),get('--format'),get('--out'),campus);
  } catch (error) {
    console.error(JSON.stringify({status:'failed',stage:'offline-import',campusReady:false,error:error instanceof Error?error.message:String(error)}));
    process.exitCode=1;
  }
}
