import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { checks } from '/Users/anthonyakpan/work/joinallworld-story/scripts/download-budget.ts';
const base='/private/tmp/story-phase3-bank-qa-419e3768-c1pzv8nl/prepared-dist';
const prep=JSON.parse(readFileSync(base+'/story-phase2-qa-preparation.json','utf8'));
const rows=[...prep.artifactFiles,...prep.supplementedGeneratedAssets.map(r=>({...r,path:r.path.replace(/^\//,'')}))];
const dist=new Map();let raw=0;
for(const row of rows){const b=readFileSync(base+'/'+row.path);if(b.length!==row.bytes||createHash('sha256').update(b).digest('hex')!==row.sha256)throw Error('Changed input '+row.path);dist.set(row.path,b);raw+=b.length;}
const result=checks(dist);const receipt={sourceSha:'419e3768cb337ce29b6317a094ce5eb4e57236b3',scope:'Existing download-budget checks on immutable hosted bundle plus 289 manifest-verified content supplements; no full native inventory or lazy-group scan',files:dist.size,rawInputBytes:raw,checks:result};
writeFileSync(new URL('./receipt.json',import.meta.url),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));process.exitCode=result.some(x=>x.status==='over')?1:0;
