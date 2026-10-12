// Validates a country queue and emits the GitHub matrix. No network, no downloads.
// Usage: node scripts/geo/factory/country-queue.mjs --kind source|factory --queue <file> [--github-output]
//   source queue  : scripts/geo/factory/country-queue.json          entries { id, table, appSha }
//   factory queue : scripts/geo/factory/country-factory-queue.json  entries { id, table }
// A missing file or an empty queue is a valid no-op (count 0), so deleting or emptying a queue never runs the lane.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MAX_QUEUE = 80;
const KINDS = {
  source: { dir: 'scripts/geo/factory/country-tables/', suffix: '.json', keys: ['appSha', 'id', 'table'] },
  factory: { dir: 'scripts/geo/factory/country-factory/', suffix: '-factory-targets.json', keys: ['id', 'table'] },
};

export function planQueue(kind, queuePath, root = resolve(HERE, '../../..')) {
  const policy = KINDS[kind];
  assert.ok(policy, 'kind must be source or factory');
  if (!existsSync(queuePath)) return { count: 0, include: [], note: 'queue file absent' };
  const queue = JSON.parse(readFileSync(queuePath, 'utf8'));
  assert.equal(queue.schemaVersion, 1, 'queue schemaVersion must be 1');
  assert.ok(Array.isArray(queue.queue), 'queue must be an array');
  assert.ok(queue.queue.length <= MAX_QUEUE, `queue holds at most ${MAX_QUEUE} entries`);
  const seen = new Set(), include = [];
  for (const entry of queue.queue) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'queue entry must be an object');
    assert.deepEqual(Object.keys(entry).sort(), policy.keys, `${kind} queue entry keys must be exactly ${policy.keys.join(', ')}`);
    assert.match(entry.id, /^[a-z]{2}$/, 'id must be a lowercase ISO 3166-1 alpha-2 country code');
    assert.ok(!seen.has(entry.id), `duplicate country ${entry.id}`);
    seen.add(entry.id);
    const expected = `${policy.dir}${entry.id}${policy.suffix}`;
    assert.equal(entry.table, expected, `table must be ${expected}`);
    assert.ok(existsSync(join(root, entry.table)), `table file missing: ${entry.table}`);
    if (kind === 'source') assert.match(entry.appSha, /^[0-9a-f]{40}$/, 'appSha must be the 40-hex app commit the factory generates into');
    include.push(kind === 'source' ? { id: entry.id, table: entry.table, appSha: entry.appSha } : { id: entry.id, table: entry.table });
  }
  return { count: include.length, include };
}

// Seed tables are validated by the source batch's own offline validator, so the lane never starts on a bad table.
export function validateSeedTable(entry, root = resolve(HERE, '../../..')) {
  const result = spawnSync('python3', ['-I', join(HERE, 'bootstrap/batch-run.py'), '--table', join(root, entry.table), '--validate-only'], { encoding: 'utf8' });
  let report;
  try { report = JSON.parse(result.stdout); } catch { report = { status: 'HOLD', reason: (result.stderr || result.stdout || 'validator produced no report').slice(0, 400) }; }
  assert.equal(report.status, 'VALID', `${entry.table}: ${report.reason ?? 'seed table HOLD'}`);
  assert.equal(report.countryISO.toLowerCase(), entry.id, `${entry.table}: table country ${report.countryISO} does not match queue id ${entry.id}`);
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
  const kind = get('--kind'), queue = get('--queue');
  if (!kind || !queue) throw Error('Usage: country-queue.mjs --kind source|factory --queue <file> [--github-output]');
  const plan = planQueue(kind, resolve(queue));
  if (kind === 'source') for (const entry of plan.include) validateSeedTable(entry);
  console.log(JSON.stringify(plan));
  if (args.includes('--github-output') && process.env.GITHUB_OUTPUT)
    writeFileSync(process.env.GITHUB_OUTPUT, `count=${plan.count}\nmatrix=${JSON.stringify({ include: plan.include })}\n`, { flag: 'a' });
}
