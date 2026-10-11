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
  for (const flag of ['--download-root', '--extract-root', '--helper']) if (!args.includes(flag)) throw Error(`Missing ${flag}`);
  const downloadRoot = insideSandbox(get('--download-root'), get('--sandbox-root'));
  const extractRoot = insideSandbox(get('--extract-root'), get('--sandbox-root'));
  mkdirSync(downloadRoot, { recursive: true }); mkdirSync(extractRoot, { recursive: true });
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
  writeFileSync(join(out, 'source-holds.json'), JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ sourceGroups: input.groups.length, rows }));
  process.exitCode = rows.some(row => row.status !== 'PINNED_SOURCE_READY') ? 1 : 0;
}
