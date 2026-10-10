// Sizes of every proof asset: raw, gzip, and after gltfpack (meshopt geometry, quantised) with its gzip.
//   node --experimental-strip-types scripts/body/proof/sizes.ts <out.json>
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { REPO } from './body-data.ts';

const dir = join(REPO, 'scripts', 'body', 'proof', 'assets');
const work = mkdtempSync(join(tmpdir(), 'proof-pack-'));
const rows: Record<string, { raw: number; gzip: number; packed?: number; packedGzip?: number }> = {};
for (const name of readdirSync(dir).sort()) {
  const data = readFileSync(join(dir, name));
  const row: (typeof rows)[string] = { raw: data.length, gzip: gzipSync(data).length };
  if (name.endsWith('.glb')) {
    const out = join(work, name);
    execFileSync('npx', ['-y', 'gltfpack@1.3.0', '-i', join(dir, name), '-o', out, '-cc'], { stdio: 'ignore' });
    const packed = readFileSync(out); row.packed = packed.length; row.packedGzip = gzipSync(packed).length;
  }
  rows[name] = row;
}
rmSync(work, { recursive: true, force: true });
writeFileSync(process.argv[2] ?? '/dev/stdout', JSON.stringify(rows, null, 2));
