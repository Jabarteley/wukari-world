import { mkdirSync, cpSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { expectedConfig, checkPackage, releaseIdentityFromEnvironment, releaseMarker } from './guard-joinallworld-package.mjs';
const [sourcePath, packagePath, sourceSha, publishing, toolingPath] = process.argv.slice(2);
if (!sourcePath || !packagePath || !sourceSha || !publishing || !toolingPath) throw Error('Missing package arguments');
if (!['true', 'false'].includes(publishing)) throw Error('Invalid publish mode');
const source = resolve(sourcePath), root = resolve(packagePath), publish = publishing === 'true';
const identity = releaseIdentityFromEnvironment(process.env);
if (publish && identity.kind !== 'github') throw Error('Publishing requires a GitHub release identity');
mkdirSync(root);
const require = createRequire(join(resolve(toolingPath), 'package.json'));
const workerPath = join(root, 'worker.js');
await require('esbuild').build({ entryPoints: [join(source, 'deploy/cloudflare-worker.js')], outfile: workerPath, bundle: true, minifyWhitespace: true, format: 'esm', platform: 'neutral', external: ['cloudflare:workers'] });
writeFileSync(workerPath, releaseMarker(sourceSha, identity) + readFileSync(workerPath, 'utf8'));
cpSync(join(source, 'dist'), join(root, 'assets'), { recursive: true, dereference: false });
writeFileSync(join(root, 'wrangler.json'), JSON.stringify(expectedConfig(sourceSha, publish), null, 2) + '\n');
/** @type {{path: string, bytes: number, sha256: string}[]} */
const files = [];
/** @param {string} path */
function walk(path) {
  for (const name of readdirSync(path).sort()) {
    const full = join(path, name), stat = statSync(full);
    if (stat.isDirectory()) walk(full);
    else files.push({ path: relative(root, full), bytes: stat.size, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') });
  }
}
walk(root);
writeFileSync(join(root, 'manifest.json'), JSON.stringify({ sourceSha, publish, identity, files }, null, 2) + '\n');
const packageDigest = checkPackage(root, sourceSha, publish);
const manifestBytes = statSync(join(root, 'manifest.json')).size;
console.log(JSON.stringify({
  packageDigest,
  manifest: 'manifest.json',
  files: files.length + 1,
  bytes: files.reduce((total, file) => total + file.bytes, manifestBytes),
  cityPayloads: files.filter(file => /^assets\/assets\/cities\/.+\.[a-f0-9]{64}\.json$/.test(file.path)).length,
  dictionaryPayloads: files.filter(file => /^assets\/assets\/words\/dictionary\.[a-f0-9]{64}\.txt$/.test(file.path)).length,
  largestFileBytes: Math.max(manifestBytes, ...files.map(file => file.bytes)),
}));
