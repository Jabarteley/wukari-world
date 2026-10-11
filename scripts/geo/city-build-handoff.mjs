import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const MANIFESTS = ['src/game/cities/content-assets.generated.ts', 'src/words/dictionary-asset.generated.ts'];
const RECEIPT = 'build-handoff.json', STAGED = 'build-handoff';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const pin = bytes => ({ bytes: bytes.length, sha256: hash(bytes) });
const gitSha = root => execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function distPins(root) {
  const files = {};
  const visit = relative => {
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = `${relative}/${entry.name}`;
      assert.ok(!lstatSync(join(root, path)).isSymbolicLink(), 'Build handoff rejects symlinks');
      if (entry.isDirectory()) visit(path);
      else { assert.ok(entry.isFile(), 'Build handoff requires regular files'); files[path] = pin(readFileSync(join(root, path))); }
    }
  };
  visit('dist');
  assert.ok(Object.keys(files).length, 'Build handoff requires dist files');
  return files;
}

function manifestValue(bytes) {
  const match = bytes.toString('utf8').match(/Object\.freeze\((.+) satisfies [^\n]+\)/);
  assert.ok(match, 'Unsupported generated manifest representation');
  return JSON.parse(match[1]);
}

function checkManifestAssets(root, buffers) {
  const cities = manifestValue(buffers[MANIFESTS[0]]), dictionary = manifestValue(buffers[MANIFESTS[1]]);
  assert.ok(Array.isArray(cities) && cities.length > 0);
  assert.equal(new Set(cities.map(row => row.id)).size, cities.length);
  for (const row of [...cities, dictionary]) {
    assert.match(row.sha256, /^[a-f0-9]{64}$/);
    assert.ok(typeof row.path === 'string' && /^\/assets\/(cities|words)\/[a-z0-9.-]+$/.test(row.path), 'Unsupported asset path');
    assert.deepEqual(pin(readFileSync(join(root, 'dist', row.path.slice(1)))), { bytes: row.bytes, sha256: row.sha256 }, 'Generated manifest does not match built asset');
  }
  const actualCities = readdirSync(join(root, 'dist/assets/cities')).filter(file => file.endsWith('.json'));
  assert.deepEqual(actualCities.sort(), cities.map(row => row.path.split('/').at(-1)).sort(), 'Manifest/dist city set differs');
}

export function packBuildHandoff(rootArg, provenance) {
  const root = resolve(rootArg);
  assert.match(provenance.appSha, /^[a-f0-9]{40}$/);
  assert.equal(gitSha(root), provenance.appSha, 'Build source SHA mismatch');
  assert.match(provenance.producerSha, /^[a-f0-9]{40}$/);
  assert.ok(Number.isSafeInteger(provenance.runId) && provenance.runId > 0);
  assert.match(provenance.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const buffers = Object.fromEntries(MANIFESTS.map(path => [path, readFileSync(join(root, path))]));
  checkManifestAssets(root, buffers);
  const receipt = { schemaVersion: 1, ...provenance, manifests: Object.fromEntries(MANIFESTS.map(path => [path, pin(buffers[path])])), dist: distPins(root), distChecksumManifest: pin(readFileSync(join(root, 'dist-sha256.txt'))) };
  for (const path of MANIFESTS) { const staged = join(root, STAGED, path); mkdirSync(dirname(staged), { recursive: true }); writeFileSync(staged, buffers[path]); }
  writeFileSync(join(root, RECEIPT), JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}

export function restoreBuildHandoff(rootArg, expected) {
  const root = resolve(rootArg), bytes = readFileSync(join(root, RECEIPT)); // Legacy artifacts deliberately fail here.
  const receipt = JSON.parse(bytes);
  assert.equal(receipt.schemaVersion, 1);
  for (const key of ['appSha', 'runId', 'repository']) assert.equal(receipt[key], expected[key], `Build handoff ${key} mismatch`);
  if (expected.producerSha) assert.equal(receipt.producerSha, expected.producerSha, 'Build producer SHA mismatch');
  assert.match(receipt.producerSha, /^[a-f0-9]{40}$/);
  assert.equal(gitSha(root), expected.appSha, 'Consumer source SHA mismatch');
  assert.deepEqual(Object.keys(receipt.manifests).sort(), [...MANIFESTS].sort(), 'Required generated manifests missing');
  assert.deepEqual(distPins(root), receipt.dist, 'Exact dist bytes changed');
  assert.deepEqual(pin(readFileSync(join(root, 'dist-sha256.txt'))), receipt.distChecksumManifest, 'Dist checksum manifest changed');
  const buffers = Object.fromEntries(MANIFESTS.map(path => {
    const staged = join(root, STAGED, path); assert.ok(lstatSync(staged).isFile() && !lstatSync(staged).isSymbolicLink());
    const raw = readFileSync(staged); assert.deepEqual(pin(raw), receipt.manifests[path], `Generated manifest bytes changed: ${path}`); return [path, raw];
  }));
  checkManifestAssets(root, buffers);
  for (const path of MANIFESTS) writeFileSync(join(root, path), buffers[path]);
  return { ...receipt, handoffSha256: hash(bytes), restored: MANIFESTS };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const [mode, root, appSha, runId, repository, producerSha] = process.argv.slice(2);
  assert.ok(['pack', 'restore'].includes(mode), 'Usage: city-build-handoff.mjs pack|restore ROOT APP_SHA RUN_ID REPOSITORY PRODUCER_SHA');
  const expected = { appSha, runId: Number(runId), repository, ...(producerSha ? { producerSha } : {}) };
  const receipt = mode === 'pack' ? packBuildHandoff(root, expected) : restoreBuildHandoff(root, expected);
  console.log(JSON.stringify(receipt));
}
