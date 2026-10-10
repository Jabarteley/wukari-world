// Builds every proof asset into scripts/body/proof/assets/. Deterministic: the same inputs give the same bytes.
//   node --experimental-strip-types scripts/body/proof/build.ts [--only face|textures|hair|garments]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadBodyData, REPO } from './body-data.ts';
import type { BodyKey } from './body-data.ts';
import { buildFace } from './face.ts';
import * as tex from './textures.ts';
import { buildGarment } from './garments.ts';
import { buildHair } from './hair.ts';
import { buildBodyLod } from './lod.ts';

const OUT = join(REPO, 'scripts', 'body', 'proof', 'assets');
mkdirSync(OUT, { recursive: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const want = (n: string): boolean => !only || only === n;
const write = (name: string, data: Buffer): void => { writeFileSync(join(OUT, name), data); console.log(`${name}  ${data.length} bytes`); };

if (want('textures')) {
  write('ankara-a.png', tex.ankaraA()); write('ankara-b.png', tex.ankaraB()); write('cloth-weave.png', tex.clothWeave());
  write('hair-coil.png', tex.hairCoil()); write('hair-coil-normal.png', tex.hairCoilNormal()); write('hair-braid.png', tex.hairBraid());
}
for (const key of ['female', 'male'] as BodyKey[]) {
  const body = await loadBodyData(key);
  if (want('face')) { const f = await buildFace(body); write(`face-${key}.glb`, f.glb); if (key === 'female') write('eye.png', f.eye); }
  if (want('hair')) for (const style of ['afro', 'braids', 'lowcut'] as const) { const h = await buildHair(body, style); write(`hair-${style}-${key}.glb`, h.glb); console.log('  triangles', h.triangles); }
  if (want('lod')) {
    const l = await buildBodyLod(body); write(`body-lod-${key}.glb`, l.glb); console.log('  triangles', l.triangles);
    for (const style of ['afro', 'braids', 'lowcut'] as const) { const h = await buildHair(body, style, 'lod'); write(`hair-${style}-lod-${key}.glb`, h.glb); console.log('  triangles', h.triangles); }
    const gk = key === 'female' ? 'dress' : 'kaftan'; const g = await buildGarment(body, { kind: gk, lod: true }); write(`${gk}-lod-${key}.glb`, g.glb); console.log('  triangles', g.triangles);
  }
  if (want('garments')) { const g = await buildGarment(body, { kind: key === 'female' ? 'dress' : 'kaftan' }); write(`${key === 'female' ? 'dress' : 'kaftan'}-${key}.glb`, g.glb); console.log('  triangles', g.triangles); }
}
