import { loadCountryScope } from './country-scope.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { cloudInputs } from './cloud-inputs.mjs';
import { insideSandbox } from './paths.mjs';

const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
for (const flag of ['--table', '--outdir', '--sandbox-root']) if (!args.includes(flag)) throw Error(`Missing ${flag}`);
const out = insideSandbox(get('--outdir'), get('--sandbox-root'));
mkdirSync(out, { recursive: true });
const input = cloudInputs(get('--table'));
writeFileSync(join(out, 'source-holds.json'), JSON.stringify(input.holds, null, 2));
if (input.holds.length) throw Error('Invalid/unsupported rows; inspect source-holds.json');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const groupKey = group => hash(`${group.sourceRunId}:${group.sourceArtifact}`);
const run = (command, argumentsList, env, logfile) => {
  const result = spawnSync(command, argumentsList, { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 900000, maxBuffer: 16 * 1024 * 1024 });
  const log = (result.stdout ?? '') + (result.stderr ?? '') + (result.error?.message ?? '');
  writeFileSync(logfile, log.replace(/https?:\/\/[^\s"'<>]+/g, url => url.includes('?') ? url.slice(0, url.indexOf('?')) + '?[redacted]' : url));
  return result.status === 0 && !result.error;
};

if (args.includes('--collect')) {
  assert.ok(args.includes('--workspace'), '--workspace required for collection');
  const app = resolve(get('--workspace'));
  if (existsSync(join(app, '.git'))) {
    run('git', ['-C', app, 'status', '--short'], {}, join(out, 'git-status.txt'));
    run('git', ['-C', app, 'diff', '--binary', 'HEAD'], {}, join(out, 'generated.patch'));
    for (const target of input.table.targets) {
      const directory = join(app, 'src/game/cities', target.id), recipe = join(app, 'scripts/geo/destination-detail', target.id + '.ts');
      if (existsSync(directory)) cpSync(directory, join(out, 'cities', target.id), { recursive: true });
      if (existsSync(recipe)) { mkdirSync(join(out, 'recipes'), { recursive: true }); cpSync(recipe, join(out, 'recipes', target.id + '.ts')); }
    }
    const receipts = join(app, 'world/playable-africa-rollout');
    if (existsSync(receipts)) cpSync(receipts, join(out, 'playable-africa-rollout'), { recursive: true });
  }
} else {
  for (const flag of ['--download-root', '--extract-root', '--boundary-root', '--helper']) if (!args.includes(flag)) throw Error(`Missing ${flag}`);
  const downloadRoot = insideSandbox(get('--download-root'), get('--sandbox-root'));
  const extractRoot = insideSandbox(get('--extract-root'), get('--sandbox-root'));
  const boundaryRoot = insideSandbox(get('--boundary-root'), get('--sandbox-root'));
  mkdirSync(downloadRoot, { recursive: true }); mkdirSync(extractRoot, { recursive: true }); mkdirSync(boundaryRoot, { recursive: true });
  const repository = process.env.GITHUB_REPOSITORY;
  assert.match(repository ?? '', /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  const rows = [], verified = new Set();
  for (const target of input.table.targets) {
    const receiptDir = join(out, target.id); mkdirSync(receiptDir, { recursive: true });
    const ok = run(process.execPath, [resolve(get('--helper')), '--source-run'], { JOB_JSON: JSON.stringify(target.sourceJob), OUT_DIR: receiptDir }, join(receiptDir, 'source-run.log'));
    rows.push({ id: target.id, status: ok ? 'PRODUCER_VERIFIED' : 'HOLD', reasons: ok ? [] : ['source producer validation failed'] });
    if (ok) verified.add(target.id);
  }
  for (const group of input.groups) {
    const directory = join(downloadRoot, groupKey(group));
    mkdirSync(directory, { recursive: true });
    const ok = run('gh', ['run', 'download', String(group.sourceRunId), '--repo', repository, '--name', group.sourceArtifact, '--dir', directory], {}, join(out, groupKey(group) + '-download.log'));
    for (const target of input.table.targets.filter(target => target.sourceJob.sourceRunId === group.sourceRunId && target.sourceJob.sourceArtifact === group.sourceArtifact)) {
      const row = rows.find(row => row.id === target.id);
      try {
        assert.ok(ok && verified.has(target.id), 'artifact download or producer verification failed');
        const destination = join(extractRoot, target.extractKey); mkdirSync(destination, { recursive: true });
        for (const layer of ['places','extras','water','landuse','roads']) {
          const bytes = readFileSync(join(directory, target.id, layer + '.json'));
          assert.equal(hash(bytes), target.extractSha256[layer], `${layer} SHA-256 mismatch`);
          const source = JSON.parse(bytes).source;
          assert.equal(source.cityId, target.id);
          assert.equal(source.datasetSha256, target.sourceJob.datasetSha256);
          assert.equal(source.adapterSha256, target.sourceJob.adapterSha256);
          assert.ok(!source.coastSupplement, 'downloaded coast supplement is unsupported');
          writeFileSync(join(destination, layer + '.json'), bytes, { flag: 'wx' });
        }
        row.status = 'PINNED_SOURCE_READY'; row.extractKey = target.extractKey;
      } catch (error) { row.status = 'HOLD'; row.reasons.push(error.message); }
    }
  }
  const copied = new Set();
  for (const group of input.boundaryGroups) {
    const key = 'boundary-' + groupKey(group);
    const sharedSource = input.groups.some(source => groupKey(source) === groupKey(group));
    const artifactDirectory = join(downloadRoot, sharedSource ? groupKey(group) : key);
    const directory = group.artifactSubdirectory ? join(artifactDirectory, group.artifactSubdirectory) : artifactDirectory;
    mkdirSync(artifactDirectory, { recursive: true });
    const producerLog = join(out, key + '-producer.json');
    const producerOk = run('gh', ['api', `repos/${repository}/actions/runs/${group.sourceRunId}`], {}, producerLog);
    let producer;
    try {
      assert.ok(producerOk, 'boundary producer lookup failed');
      producer = JSON.parse(readFileSync(producerLog));
      assert.equal(producer.repository?.full_name, repository);
      assert.equal(producer.id, group.sourceRunId);
      assert.equal(producer.head_sha, group.sourceSha);
      assert.equal(producer.status, 'completed');
      // Batch failure may belong to another city. The exact boundary receipt is verified below.
      if (!group.artifactSubdirectory) assert.equal(producer.conclusion, 'success', 'country boundary proof producer failed');
    } catch (error) {
      for (const target of input.table.targets.filter(target => {
        const job = (target.countryScope ?? input.table.countryScope).boundaryJob;
        return job.sourceRunId === group.sourceRunId && job.sourceArtifact === group.sourceArtifact;
      })) { const row = rows.find(row => row.id === target.id); row.status = 'HOLD'; row.reasons.push(error.message); }
      continue;
    }
    const ok = sharedSource || run('gh', ['run', 'download', String(group.sourceRunId), '--repo', repository, '--name', group.sourceArtifact, '--dir', artifactDirectory], {}, join(out, key + '-download.log'));
    for (const target of input.table.targets.filter(target => {
      const job = (target.countryScope ?? input.table.countryScope).boundaryJob;
      return job.sourceRunId === group.sourceRunId && job.sourceArtifact === group.sourceArtifact;
    })) {
      const row = rows.find(row => row.id === target.id);
      try {
        assert.ok(ok && row.status === 'PINNED_SOURCE_READY', 'boundary artifact or city source not ready');
        const policy = target.countryScope ?? input.table.countryScope;
        const scope = loadCountryScope(directory, { ...policy, directory }, target.country, target.sourceJob.datasetSha256);
        const destination = join(boundaryRoot, policy.boundaryKey);
        if (!copied.has(destination)) {
          mkdirSync(destination, { recursive: true });
          for (const file of ['receipt.json', 'boundary.geojson']) writeFileSync(join(destination, file), readFileSync(join(directory, file)), { flag: 'wx' });
          writeFileSync(join(destination, 'producer.json'), JSON.stringify({ repository, runId: producer.id, sourceSha: producer.head_sha, artifact: group.sourceArtifact, status: producer.status, conclusion: producer.conclusion }, null, 2));
          copied.add(destination);
        }
        loadCountryScope(destination, { ...policy, directory: destination }, target.country, target.sourceJob.datasetSha256);
        row.status = 'PINNED_SOURCE_AND_BOUNDARY_READY'; row.boundaryKey = policy.boundaryKey; row.countryScopeReceipt = scope.receipt;
      } catch (error) { row.status = 'HOLD'; row.reasons.push(error.message); }
    }
  }
  writeFileSync(join(out, 'source-holds.json'), JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ sourceGroups: input.groups.length, boundaryGroups: input.boundaryGroups.length, rows }));
  process.exitCode = rows.some(row => row.status !== 'PINNED_SOURCE_AND_BOUNDARY_READY') ? 1 : 0;
}
