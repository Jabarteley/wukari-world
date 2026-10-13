import {readFileSync,writeFileSync} from 'node:fs';
import validator from 'gltf-validator';
const report=await validator.validateBytes(new Uint8Array(readFileSync(new URL('./artifacts/everyday-01-game-v1.glb',import.meta.url))),{uri:'everyday-01-game-v1.glb',maxIssues:1000});
writeFileSync(new URL('./receipts/gltf-validator.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report.issues,messages:undefined}));
if(report.issues.numErrors||report.issues.numWarnings||report.issues.truncated)process.exitCode=1;
