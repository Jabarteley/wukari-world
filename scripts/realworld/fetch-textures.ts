/**
 * Development: fetch the CC0 PBR texture sets the realworld prototype uses (ambientCG, https://ambientcg.com, CC0 1.0) into
 * public/realworld/textures/<id>/ as color.jpg, normal.jpg (OpenGL), roughness.jpg and ao.jpg (when the set has one).
 * The folder is not committed (.gitignore); run this once after a checkout:
 *   node --experimental-strip-types scripts/realworld/fetch-textures.ts [2K|1K|4K]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const TEXTURE_SETS = ['Asphalt031', 'PavingStones070', 'PaintedPlaster017', 'Concrete034', 'CorrugatedSteel007A', 'Ground037', 'Grass004', 'Foliage001', 'Foliage003', 'LeafSet024'] as const;
const size = process.argv[2] || '2K';
const root = join(import.meta.dirname, '../../public/realworld/textures');
const maps: Record<string, string> = { Color: 'color', NormalGL: 'normal', Roughness: 'roughness', AmbientOcclusion: 'ao', Metalness: 'metalness', Opacity: 'opacity' };

for (const id of TEXTURE_SETS) {
  const out = join(root, id);
  if (existsSync(join(out, 'color.jpg'))) { console.log('have', id); continue; }
  mkdirSync(out, { recursive: true });
  const response = await fetch(`https://ambientcg.com/get?file=${id}_${size}-JPG.zip`, { headers: { 'User-Agent': 'Allworld-dev/1.0' } });
  if (!response.ok) throw new Error(`${id}: ${response.status}`);
  const zip = join(out, 'set.zip');
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));
  execFileSync('unzip', ['-o', '-q', zip, '-d', out]);
  rmSync(zip);
  for (const file of readdirSync(out)) {
    const match = /_(Color|NormalGL|Roughness|AmbientOcclusion|Metalness|Opacity)\.jpg$/.exec(file);
    if (match) renameSync(join(out, file), join(out, `${maps[match[1]!]}.jpg`)); else rmSync(join(out, file), { recursive: true });
  }
  console.log('fetched', id, readdirSync(out).join(' '));
}
