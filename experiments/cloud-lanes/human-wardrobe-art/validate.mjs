import {readFileSync,writeFileSync} from 'node:fs';
import validator from 'gltf-validator';
const file=new URL('./artifacts/everyday-01-on-form.glb',import.meta.url);
const report=await validator.validateBytes(new Uint8Array(readFileSync(file)),{uri:'everyday-01-on-form.glb',maxIssues:1000});
writeFileSync(new URL('./receipts/gltf-validator.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report.issues,messages:undefined}));
if(report.issues.numErrors)process.exitCode=1;
