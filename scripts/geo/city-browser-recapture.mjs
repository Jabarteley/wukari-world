import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
const queue = JSON.parse(readFileSync(args.includes('--queue') ? get('--queue') : 'scripts/geo/city-browser-recapture.json', 'utf8'));
assert.equal(queue.schemaVersion, 1);
assert.match(queue.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
for (const sha of [queue.appSha, queue.driverSha, queue.buildProducerSha]) assert.match(sha, /^[0-9a-f]{40}$/);
for (const id of [queue.buildRunId, queue.artifactId]) assert.ok(Number.isSafeInteger(id) && id > 0);
assert.equal(queue.buildWorkflow, '.github/workflows/city-fast-acceptance.yml');
assert.ok(Array.isArray(queue.cities) && queue.cities.length > 0 && queue.cities.length <= 10);
assert.equal(new Set(queue.cities).size, queue.cities.length);
for (const city of queue.cities) assert.match(city, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const artifactName = `city-dist-${queue.appSha}`;
const api = async path => {
  const response = await fetch(`https://api.github.com/repos/${queue.repository}/${path}`, {
    signal: AbortSignal.timeout(30000),
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
  });
  assert.ok(response.ok, `source lookup HTTP ${response.status}`);
  return response.json();
};
const run = await api(`actions/runs/${queue.buildRunId}`);
assert.equal(run.head_sha, queue.buildProducerSha);
assert.equal(run.repository.full_name, queue.repository);
assert.equal(run.path, queue.buildWorkflow);
const jobs = await api(`actions/runs/${queue.buildRunId}/jobs?per_page=100`);
const build = jobs.jobs.find(job => job.name === 'build' && job.status === 'completed' && job.conclusion === 'success');
assert.ok(build, 'pinned producer build job has not succeeded');
const artifacts = await api(`actions/runs/${queue.buildRunId}/artifacts?per_page=100`);
const artifact = artifacts.artifacts.find(item => item.id === queue.artifactId && item.name === artifactName && !item.expired);
assert.ok(artifact, 'exact expected dist artifact is missing or expired');
const receipt = { scope: 'browser recapture only; full Node/edge acceptance remains separate', buildRunId: queue.buildRunId, buildProducerSha: queue.buildProducerSha, appSha: queue.appSha, driverSha: queue.driverSha, repository: queue.repository, buildWorkflow: queue.buildWorkflow, producerRunStatus: run.status, producerRunUrl: run.html_url, buildJobId: build.id, buildConclusion: build.conclusion, artifact: { id: artifact.id, name: artifact.name, digest: artifact.digest, createdAt: artifact.created_at }, cities: queue.cities };
if (args.includes('--evidence')) {
  const out = resolve(get('--evidence')); mkdirSync(out, { recursive: true });
  const app = resolve(get('--app')), driver = resolve(get('--driver'));
  const gitSha = path => execFileSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  assert.equal(gitSha(app), queue.appSha); assert.equal(gitSha(driver), queue.driverSha);
  receipt.distChecksumManifestSha256 = createHash('sha256').update(readFileSync(join(app, 'dist-sha256.txt'))).digest('hex');
  receipt.recaptureQaSha = process.env.GITHUB_SHA;
  receipt.diagnosticFiles = Object.fromEntries(['map-shots.ts', 'serve-maps.ts', 'cdp-map-qa.ts'].map(file => [file, createHash('sha256').update(readFileSync(join(driver, 'scripts/journeys', file))).digest('hex')]));
  writeFileSync(join(out, 'source-driver-provenance.json'), JSON.stringify(receipt, null, 2));
} else {
  writeFileSync('browser-recapture-plan.json', JSON.stringify(receipt, null, 2));
}
if (process.env.GITHUB_OUTPUT) {
  const outputs = { app: queue.appSha, driver: queue.driverSha, build_run: String(queue.buildRunId), repository: queue.repository, artifact: artifactName, cities: JSON.stringify(queue.cities) };
  writeFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''), { flag: 'a' });
}
console.log(JSON.stringify(receipt));
