// Builds a garment part for a Blender-made character: node --experimental-strip-types scripts/body/proof/build-garment.ts <character.glb (unpacked)> <female|male> <dress|kaftan> <out.glb> [--lod]
import { writeFileSync } from 'node:fs';
import { buildGarment } from './garments.ts';
import { loadCharacterData } from './body-data2.ts';
import type { BodyKey } from './body-data.ts';

const [path, key, kind, out] = process.argv.slice(2);
if (!path || !key || !kind || !out) throw new Error('usage: build-garment.ts <character.glb> <female|male> <dress|kaftan> <out.glb> [--lod]');
const body = await loadCharacterData(key as BodyKey, path);
const g = await buildGarment(body, { kind: kind as 'dress' | 'kaftan', lod: process.argv.includes('--lod') });
writeFileSync(out, g.glb);
console.log('written', out, g.triangles, 'triangles');
