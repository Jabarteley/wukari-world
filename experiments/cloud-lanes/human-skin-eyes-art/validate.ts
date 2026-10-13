import { readFileSync, writeFileSync } from 'node:fs';
import { validateBytes } from 'gltf-validator';
const root = new URL('./', import.meta.url);
const bytes = readFileSync(new URL('artifacts/skin-eyes-calibration-v1.glb', root));
const report = await validateBytes(new Uint8Array(bytes), { uri: 'skin-eyes-calibration-v1.glb', maxIssues: 100 });
writeFileSync(new URL('receipts/gltf-validator.json', root), JSON.stringify(report, null, 2)+'\n');
console.log(JSON.stringify(report.issues, null, 2));
if (report.issues.numErrors > 0) process.exitCode = 1;
