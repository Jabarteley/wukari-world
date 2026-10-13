// Dated Geofabrik inputs of a country source (README-batch.md), in role order: primary, neighbours, optional city-extract.
// Neighbour merge (bootstrap/source-merge.py): the dataset hash downstream (datasetSha256) is the MERGED file's.
// City sub-extract (countrySource.cityExtract): the boundary is built from the primary (+ neighbour closures) and its receipt's
// source.sha256 is the primary's; the city metadata and layers are read from the city-extract entry, so datasetSha256 is its sha256.
import assert from 'node:assert/strict';

const DATED = /^https:\/\/download\.geofabrik\.de\/(?:[a-z0-9-]+\/)*[a-z0-9-]+-([0-9]{6})\.osm\.pbf$/;
const KEYS = {
  primary: ['bytes', 'md5', 'role', 'sha256', 'snapshotDate', 'url'],
  neighbour: ['bytes', 'md5', 'reason', 'role', 'sha256', 'snapshotDate', 'url'],
  'city-extract': ['bytes', 'md5', 'polySha256', 'polyUrl', 'primaryPolySha256', 'primaryPolyUrl', 'reason', 'role', 'sha256', 'snapshotDate', 'url'],
};
const polyOf = url => url.replace(/-[0-9]{6}\.osm\.pbf$/, '.poly');

/** The city-extract entry (last, role city-extract) or null. */
export function cityExtractInput(inputs) {
  return Array.isArray(inputs) && inputs.at(-1)?.role === 'city-extract' ? inputs.at(-1) : null;
}

/**
 * expected (each optional): url = the primary / boundary dataset URL; date = snapshot date;
 * datasetUrl = the URL the city layers were read from (the city extract when present, else the primary).
 */
export function validateSourceInputs(inputs, expected = {}) {
  assert.ok(Array.isArray(inputs) && inputs.length >= 2, 'sourceInputs must list the primary and at least one neighbour or city extract');
  const city = cityExtractInput(inputs), neighbours = inputs.length - 1 - (city ? 1 : 0);
  assert.ok(neighbours >= (city ? 0 : 1) && neighbours <= 3, 'sourceInputs must list one to three neighbours (zero to three with a city extract)');
  const date = inputs[0]?.snapshotDate, urls = new Set(), hashes = new Set();
  assert.match(date ?? '', /^\d{4}-\d{2}-\d{2}$/, 'sourceInputs snapshotDate required');
  if (expected.date !== undefined) assert.equal(date, expected.date, 'sourceInputs snapshot differs from the dataset date');
  inputs.forEach((input, index) => {
    const role = index === 0 ? 'primary' : city && index === inputs.length - 1 ? 'city-extract' : 'neighbour';
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
    if (role !== 'primary') assert.ok(typeof input.reason === 'string' && input.reason.trim() === input.reason && input.reason, `${role} reason required`);
    if (role === 'city-extract') {
      assert.equal(input.polyUrl, polyOf(input.url), 'city extract polyUrl must be the .poly beside it');
      assert.equal(input.primaryPolyUrl, polyOf(inputs[0].url), 'city extract primaryPolyUrl must be the .poly beside the primary');
      for (const key of ['polySha256', 'primaryPolySha256']) assert.match(input[key], /^[0-9a-f]{64}$/);
      assert.ok(input.bytes < inputs[0].bytes, 'city extract must be smaller than the full country file');
    }
    assert.ok(!urls.has(input.url) && !hashes.has(input.sha256), 'duplicate source input');
    urls.add(input.url); hashes.add(input.sha256);
  });
  if (expected.url !== undefined) assert.equal(inputs[0].url, expected.url, 'primary source input differs from the dataset URL');
  if (expected.datasetUrl !== undefined) assert.equal((city ?? inputs[0]).url, expected.datasetUrl, 'source input read by the city layers differs from their datasetUrl');
  return inputs;
}
