// Size budget per game: the brotli (quality 11) size of every prepared file tagged with that game, summed, must stay
// under 1.5 MB (the cartridge budget in docs/agent-plans/viral/PLAN.md). Files are served as they are on disk; brotli is what
// the browser downloads. Untagged files (licence texts) and temporary files do not count.
//
//   node --experimental-strip-types scripts/assets/budget.ts [--json]
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants } from 'node:zlib';
import { GAMES, manifestProblems, type Game, type Manifest } from './pack-types.ts';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const GAME_BUDGET_BYTES = 1_500_000;

export const brotliSize = (b: Buffer): number => brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length;

export interface GameSize { game: Game; files: number; rawBytes: number; brotliBytes: number; budget: number; ok: boolean; unprepared: string[] }

export function readManifests(packsDir: string): { pack: string; dir: string; manifest: Manifest }[] {
  if (!existsSync(packsDir)) return [];
  return readdirSync(packsDir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(packsDir, d.name, 'manifest.json'))).map((d) => ({ pack: d.name, dir: join(packsDir, d.name), manifest: JSON.parse(readFileSync(join(packsDir, d.name, 'manifest.json'), 'utf8')) as Manifest }));
}

/** Brotli size per game across every pack under `packsDir`. A model file still unprepared is listed and fails the check. */
export function gameSizes(packsDir: string, budget = GAME_BUDGET_BYTES): GameSize[] {
  const packs = readManifests(packsDir);
  return GAMES.map((game) => {
    let files = 0, rawBytes = 0, brotliBytes = 0;
    const unprepared: string[] = [];
    for (const { pack, dir, manifest } of packs) {
      const problems = manifestProblems(manifest, pack);
      if (problems.length) throw new Error(`${pack}/manifest.json: ${problems.join('; ')}`);
      for (const a of manifest.assets) {
        if (a.game !== game || a.temporary) continue;
        const bytes = readFileSync(join(dir, a.path.slice(`assets/packs/${pack}/`.length)));
        if (bytes.length !== a.bytes) throw new Error(`${a.path}: manifest says ${a.bytes} bytes, file has ${bytes.length}`);
        if (/\.(glb|gltf)$/.test(a.path) && !a.prepared) unprepared.push(a.path);
        files++; rawBytes += bytes.length; brotliBytes += brotliSize(bytes);
      }
    }
    return { game, files, rawBytes, brotliBytes, budget, ok: brotliBytes <= budget && unprepared.length === 0, unprepared };
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const sizes = gameSizes(join(repo, 'public', 'assets', 'packs'));
  if (process.argv.includes('--json')) console.log(JSON.stringify(sizes, null, 2));
  else for (const s of sizes) console.log(`${s.ok ? 'ok  ' : 'OVER'} ${s.game.padEnd(9)} ${String(s.files).padStart(3)} files  raw ${String(s.rawBytes).padStart(8)}  brotli ${String(s.brotliBytes).padStart(8)} / ${s.budget}${s.unprepared.length ? `  unprepared: ${s.unprepared.join(', ')}` : ''}`);
  if (sizes.some((s) => !s.ok)) process.exit(1);
}
