// Inputs of a merged country source (bootstrap/source-merge.py): the dated Geofabrik primary and its same-snapshot neighbours.
// The dataset hash everywhere downstream (datasetSha256) is the MERGED file's; sourceInputs names what it was merged from.
import assert from 'node:assert/strict';

const DATED = /^https:\/\/download\.geofabrik\.de\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-([0-9]{6})\.osm\.pbf$/;
const KEYS = { primary: ['bytes', 'md5', 'role', 'sha256', 'snapshotDate', 'url'], neighbour: ['bytes', 'md5', 'reason', 'role', 'sha256', 'snapshotDate', 'url'] };

/** expected: { url, date } of the dataset when known (boundary receipt source, extract datasetUrl). */
export function validateSourceInputs(inputs, expected = {}) {
  assert.ok(Array.isArray(inputs) && inputs.length >= 2 && inputs.length <= 4, 'sourceInputs must list the primary and one to three neighbours');
  const date = inputs[0]?.snapshotDate, urls = new Set(), hashes = new Set();
  assert.match(date ?? '', /^\d{4}-\d{2}-\d{2}$/, 'sourceInputs snapshotDate required');
  if (expected.date !== undefined) assert.equal(date, expected.date, 'sourceInputs snapshot differs from the dataset date');
  inputs.forEach((input, index) => {
    const role = index === 0 ? 'primary' : 'neighbour';
    assert.ok(input && typeof input === 'object' && !Array.isArray(input), 'invalid source input');
    assert.equal(input.role, role, `source input ${index} must be the ${role}`);
    assert.deepEqual(Object.keys(input).sort(), KEYS[role], `source input ${index} keys`);
    const match = DATED.exec(input.url ?? '');
    assert.ok(match, `source input ${index} must be a dated official Geofabrik .osm.pbf`);
    assert.equal(input.snapshotDate, date, 'mixed snapshots in sourceInputs');
    assert.equal(match[1], date.slice(2).replaceAll('-', ''), 'source input URL date differs from its snapshotDate');
    assert.ok(Number.isSafeInteger(input.bytes) && input.bytes > 0, 'source input byte pin required');
    assert.match(input.md5, /^[0-9a-f]{32}$/);
    assert.match(input.sha256, /^[0-9a-f]{64}$/);
    if (role === 'neighbour') assert.ok(typeof input.reason === 'string' && input.reason.trim() === input.reason && input.reason, 'neighbour reason required');
    assert.ok(!urls.has(input.url) && !hashes.has(input.sha256), 'duplicate source input');
    urls.add(input.url); hashes.add(input.sha256);
  });
  if (expected.url !== undefined) assert.equal(inputs[0].url, expected.url, 'primary source input differs from the dataset URL');
  return inputs;
}
