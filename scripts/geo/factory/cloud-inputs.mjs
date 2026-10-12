import { validateCountryScopePolicy } from './country-scope.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export function cloudInputs(path) {
  const table = JSON.parse(readFileSync(path, 'utf8'));
  assert.ok(Array.isArray(table.targets) && table.targets.length >= 1 && table.targets.length <= 5, 'workflow accepts one to five targets');
  assert.match(table.expectedSourceGitSHA, /^[0-9a-f]{40}$/);
  const receiptRoot = table.receiptRoot ?? 'world/playable-africa-rollout';
  assert.match(receiptRoot, /^world\/playable-[a-z-]+-rollout$/, 'receiptRoot must be a namespaced world rollout directory');
  const holds = [], groups = new Map(), boundaryGroups = new Map(), seen = new Set();
  for (const target of table.targets) {
    try {
      const policy = target.countryScope ?? table.countryScope;
      validateCountryScopePolicy(policy, target.country, target.sourceJob?.datasetSha256);
      assert.ok(policy.boundaryKey && policy.boundaryJob, 'country boundary artifact mapping required; HOLD');
      assert.match(target.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(!seen.has(target.id), 'duplicate target id'); seen.add(target.id);
      assert.equal(target.extractKey, target.id, 'artifact city directory must equal the validated city id');
      assert.equal(target.facts?.id, target.id, 'embedded facts required');
      const job = target.sourceJob;
      assert.equal(job.city, target.id);
      if (job.coastSupplement) throw Error('coast supplements are not supported by this bounded workflow');
      assert.match(job.sourceArtifact, /^[A-Za-z0-9._-]+$/);
      assert.match(job.sourceSha, /^[0-9a-f]{40}$/);
      assert.ok(Number.isSafeInteger(job.sourceRunId) && job.sourceRunId > 0);
      assert.deepEqual(job.extractSha256, target.extractSha256);
      assert.deepEqual(Object.keys(job.extractSha256).sort(), ['extras','landuse','places','roads','water']);
      for (const value of [job.datasetSha256, job.adapterSha256, ...Object.values(job.extractSha256)]) assert.match(value, /^[0-9a-f]{64}$/);
      const boundaryJob = policy.boundaryJob, boundaryKey = `${boundaryJob.sourceRunId}:${boundaryJob.sourceArtifact}`;
      if (boundaryGroups.has(boundaryKey)) assert.deepEqual(boundaryGroups.get(boundaryKey), boundaryJob, 'shared boundary artifact producer disagrees');
      else boundaryGroups.set(boundaryKey, boundaryJob);
      const key = `${job.sourceRunId}:${job.sourceArtifact}`;
      if (groups.has(key)) assert.equal(groups.get(key).sourceSha, job.sourceSha, 'shared artifact producer SHA disagrees');
      else groups.set(key, { sourceRunId: job.sourceRunId, sourceArtifact: job.sourceArtifact, sourceSha: job.sourceSha });
    } catch (error) { holds.push({ id: target.id, status: 'HOLD', reason: error.message }); }
  }
  return { table: { ...table, receiptRoot }, holds, groups: [...groups.values()], boundaryGroups: [...boundaryGroups.values()] };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const result = cloudInputs(process.argv[2]);
  const outputs = { app_sha: result.table.expectedSourceGitSHA, target_count: String(result.table.targets.length), source_group_count: String(result.groups.length), boundary_group_count: String(result.boundaryGroups.length) };
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(''), { flag: 'a' });
  console.log(JSON.stringify({ ...outputs, groups: result.groups, boundaryGroups: result.boundaryGroups, holds: result.holds }));
  process.exitCode = result.holds.length ? 1 : 0;
}
