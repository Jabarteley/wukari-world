import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
for (const flag of ['--facts', '--geometry-source', '--out']) if (!args.includes(flag)) throw Error(`Missing ${flag}`);
const root = resolve(get('--geometry-source')), file = 'scripts/geo/destination-detail/geometry-tools.ts';
const sha = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const committed = execFileSync('git', ['-C', root, 'show', `${sha}:${file}`]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
if (hash(committed) !== hash(readFileSync(join(root, file)))) throw Error('Geometry policy differs from committed baseline');
const { proposeBounds } = await import('./bounds-policy.mjs');
const geometry = await import(pathToFileURL(join(root, file)).href);
// Optional per-seed play box size (seed.playBox, km half-widths): both flags or neither; proposeBounds validates them.
const overrides = {};
for (const [flag, key] of [['--play-km', 'playKm'], ['--core-km', 'coreKm']]) if (args.includes(flag)) overrides[key] = Number(get(flag));
const proposal = proposeBounds(JSON.parse(readFileSync(get('--facts'))), overrides, geometry);
writeFileSync(get('--out'), JSON.stringify({ ...proposal, geometrySourceGitSHA: sha, geometryToolsSha256: hash(committed) }, null, 2));
