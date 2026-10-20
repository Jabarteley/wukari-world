import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deduplicate, importOffline, sha256, validateReceipt, validateWay, withinBoundary, type Receipt } from '../../scripts/wukari/offline.ts';
const xml = '<osm version="0.6"><node id="1" lon="0.000000123456789" lat="0"><tag k="name" v="SYNTHETIC &amp; TEST"/></node><way id="2"><nd ref="1"/><nd ref="3"/></way></osm>';
const receipt = (b: Buffer): Receipt => ({sourceUrl:'https://www.openstreetmap.org/api/0.6/map',retrievedAt:'2026-10-20T12:00:00Z',license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',sha256:sha256(b),mode:'source-data',scope:'UNIT TEST EMPTY EXTRACT — no campus geography'});
test('XML adapter retains precision, tags, IDs and missing references without inventing nodes', () => {
 const r=JSON.parse(execFileSync(process.platform === 'win32' ? 'python' : 'python3',['scripts/wukari/osm-xml.py'],{input:xml}).toString());
 assert.equal(r.elements[0].lon,0.000000123456789); assert.equal(r.elements[0].tags.name,'SYNTHETIC & TEST');assert.deepEqual(r.elements[1].nodes,[1,3]);
});
test('XML adapter rejects entities, history/delete and malformed XML',()=>{
 for(const input of ['<!DOCTYPE osm [<!ENTITY x SYSTEM "file:///etc/passwd">]><osm version="0.6"/>','<osm version="0.6"><node id="1" visible="false"/></osm>','<osm version="0.6">']) assert.throws(()=>execFileSync(process.platform === 'win32' ? 'python' : 'python3',['scripts/wukari/osm-xml.py'],{input,stdio:['pipe','pipe','pipe']}));
});
test('identical repeated IDs deduplicate; conflicts and malformed source fail',()=>{
 const node={type:'node',id:1,lon:0,lat:0,tags:{name:'SYNTHETIC'}};
 assert.equal(deduplicate({version:0.6,elements:[node,{...node}]}).duplicates,1);
 assert.throws(()=>deduplicate({version:0.6,elements:[node,{...node,lon:1}]}),/Conflicting/);
 assert.throws(()=>deduplicate({version:0.6,elements:[{...node,lat:91}]}),/latitude/);
 assert.throws(()=>deduplicate({version:0.6,remark:'timeout',elements:[]}),/complete/);
});
test('provenance requires recorded source, attribution, timestamp, license and matching hash',()=>{
 const bytes=Buffer.from('{}'),r=receipt(bytes);validateReceipt(r,bytes);
 for(const change of [{sha256:'0'.repeat(64)},{license:'unknown'},{attribution:''},{retrievedAt:'unknown'},{sourceUrl:'file:///tmp/data'},{sourceUrl:'https://user:secret@example.org/'},{retrievedAt:'2026-10-20T12:00:00'},{mode:'unverified'}]) assert.throws(()=>validateReceipt({...r,...change} as Receipt,bytes));
});
test('footprint validation rejects open, crossing, touching and zero-length geometry',()=>{
 validateWay([[0,0],[1,0],[1,1],[0,1],[0,0]],true);
 for(const ring of [[[0,0],[1,0],[1,1],[0,1]],[[0,0],[2,2],[0,2],[2,0],[3,0],[0,0]],[[0,0],[1,0],[1,0],[0,1],[0,0]]]) assert.throws(()=>validateWay(ring as [number,number][],true));
});
test('empty offline XML end-to-end preserves bytes/provenance and reports unknown campus; no overwrite',()=>{
 mkdirSync('.cache/wukari',{recursive:true}); const dir=mkdtempSync(resolve('.cache/wukari/offline-test-'));
 try {
  const bytes=Buffer.from('<osm version="0.6"/>'),input=resolve(dir,'empty.osm'),meta=resolve(dir,'receipt.json'),out=resolve(dir,'output');
  writeFileSync(input,bytes);writeFileSync(meta,JSON.stringify(receipt(bytes)));
  importOffline(input,meta,'osm-xml',out);
  assert.deepEqual(readFileSync(resolve(out,'source.bin')),bytes);
  const coverage=JSON.parse(readFileSync(resolve(out,'coverage.json'),'utf8'));assert.equal(coverage.campus,'unknown');assert.equal(coverage.buildings,0);assert.equal(coverage.fieldVerified,0);
  assert.throws(()=>importOffline(input,meta,'osm-xml',out),/EEXIST/);
  writeFileSync(meta,JSON.stringify({...receipt(bytes),mode:'synthetic'}));assert.throws(()=>importOffline(input,meta,'osm-xml',resolve(dir,'synthetic')),/Synthetic/);
 } finally {rmSync(dir,{recursive:true,force:true});}
});

test('boundary validation catches segments crossing holes even when endpoints are inside',()=>{
 const area={type:'Polygon' as const,coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]],[[4,4],[6,4],[6,6],[4,6],[4,4]]] as [number,number][][]};
 assert.equal(withinBoundary(area,[[1,5],[9,5]]),false);
 assert.equal(withinBoundary(area,[[1,1],[9,1]]),true);
 assert.equal(withinBoundary(area,[[1,1],[11,1]]),false);
});
