import { validateCountryScopePolicy, loadCountryScope, assertCountryFacts } from '../country-scope.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const [input, output, boundaryPolicyFile, generationSourceSHA] = process.argv.slice(2);
if (!input || !output || !generationSourceSHA) throw Error('Usage: table.mjs BOOTSTRAP_ARTIFACT TARGET_TABLE BOUNDARY_POLICY_JSON_OR_DASH GENERATION_SOURCE_SHA');
assert.match(generationSourceSHA, /^[0-9a-f]{40}$/, 'explicit generation baseline required');
const root = resolve(input), read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hex = /^[0-9a-f]{64}$/, cityId = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const layers = ['places', 'extras', 'water', 'landuse', 'roads'];
const result = read('receipts/result.json');
const batch = Array.isArray(result.cityResults) && result.id === undefined;
let candidates, excluded;
if (batch) {
  assert.ok(['SOURCE_CANDIDATE', 'HOLD'].includes(result.status));
  assert.ok(result.cityResults.length >= 1 && result.cityResults.length <= 6);
  assert.ok(Array.isArray(result.ids));
  assert.deepEqual(result.ids, result.cityResults.map(city => city.id));
  assert.equal(new Set(result.ids).size, result.ids.length);
  for (const city of result.cityResults) {
    assert.match(city.id, cityId);
    assert.ok(['SOURCE_CANDIDATE', 'HOLD'].includes(city.status));
    if (city.status === 'HOLD') {
      const held = read(`receipts/${city.id}-result.json`);
      assert.deepEqual(held, city, 'held city receipt mismatch');
      assert.ok(typeof city.reason === 'string' && city.reason);
    }
  }
  candidates = result.cityResults.filter(city => city.status === 'SOURCE_CANDIDATE').sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  excluded = result.cityResults.filter(city => city.status === 'HOLD').map(city => city.id).sort();
  assert.equal(result.status, excluded.length ? 'HOLD' : 'SOURCE_CANDIDATE', 'root HOLD must be solely individual city holds');
  assert.ok(candidates.length, 'no successful city candidates');
  assert.deepEqual(result.sourceJobs, result.cityResults.filter(city => city.status === 'SOURCE_CANDIDATE').map(city => city.sourceJob));
} else {
  assert.equal(result.status, 'SOURCE_CANDIDATE');
  assert.ok(boundaryPolicyFile, 'single-city compatibility requires pinned country policy');
  candidates = [{ id: result.id, sourceJob: result.sourceJob }];
  excluded = [];
}

const downloads = batch ? read('receipts/downloads.json') : null;
let countryScope;
if (batch) {
  assert.equal(read('country-boundary/result.json').status, 'OSM_COUNTRY_BOUNDARY_CANDIDATE', 'country boundary result missing/held');
  const summary = result.countryBoundary;
  assert.ok(summary && summary.status !== 'HOLD', 'missing/held country boundary rejects every city');
  assert.equal(summary.path, 'country-boundary/boundary.geojson');
  assert.equal(summary.receiptPath, 'country-boundary/receipt.json');
  const rawReceipt = readFileSync(join(root, summary.receiptPath));
  const receipt = JSON.parse(rawReceipt);
  assert.equal(hash(rawReceipt), summary.receiptSha256);
  assert.equal(receipt.countryISO, summary.countryISO);
  assert.equal(receipt.source.sha256, downloads.pbf.sha256);
  assert.equal(receipt.source.bytes, downloads.pbf.bytes);
  assert.equal(receipt.source.url, downloads.pbf.url);
  assert.equal(receipt.source.date, downloads.pbf.snapshotDate);
  assert.equal(receipt.geometry.sha256, summary.sha256);
  const job = candidates[0].sourceJob;
  countryScope = {
    kind: 'osm-admin0-boundary-v1', countryISO: receipt.countryISO,
    datasetSha256: receipt.source.sha256, receiptSha256: hash(rawReceipt), receiptBytes: rawReceipt.length,
    geometrySha256: receipt.geometry.sha256, geometryBytes: receipt.geometry.bytes,
    scriptSha256: receipt.scriptSha256, relationId: receipt.relation.id,
    boundaryKey: receipt.countryISO.toLowerCase(), directory: 'country-boundary',
    boundaryJob: { sourceRunId: job.sourceRunId, sourceSha: job.sourceSha, sourceArtifact: job.sourceArtifact, artifactSubdirectory: 'country-boundary' },
  };
} else {
  countryScope = JSON.parse(readFileSync(resolve(boundaryPolicyFile), 'utf8'));
}

const targets = [];
let boundsSourceGitSHA;
for (const city of candidates) {
  assert.match(city.id, cityId);
  const metadata = read(batch ? `metadata/${city.id}/candidate/metadata.json` : 'metadata/candidate/metadata.json');
  const job = read(batch ? `receipts/${city.id}-source-job.json` : 'receipts/source-job.json');
  assert.equal(metadata.status, 'METADATA_CANDIDATE');
  assert.deepEqual(city.sourceJob, job);
  assert.equal(job.city, city.id);
  assert.equal(metadata.id, city.id);
  assert.ok(Number.isSafeInteger(job.sourceRunId) && job.sourceRunId > 0);
  assert.match(job.sourceSha, /^[0-9a-f]{40}$/);
  assert.match(job.sourceArtifact, /^[A-Za-z0-9._-]+$/);
  assert.deepEqual(Object.keys(job.extractSha256).sort(), [...layers].sort());
  for (const pin of [job.datasetSha256, job.adapterSha256, ...Object.values(job.extractSha256)]) assert.match(pin, hex);
  const facts = metadata.facts, sources = metadata.metadataSources;
  assert.equal(facts.id, metadata.id);
  assert.equal(metadata.name, facts.name);
  assert.match(metadata.country, /^[a-z]{2}$/);
  assert.equal(metadata.country, facts.country.idISOlower);
  assert.equal(sources.pbf.sha256, job.datasetSha256);
  assert.equal(sources.centre.pbfSha256, job.datasetSha256);
  assert.equal(facts.centre.lon, sources.centre.sourceRecord.lon);
  assert.equal(facts.centre.lat, sources.centre.sourceRecord.lat);
  assert.equal(facts.airport.lon, Number(sources.airport.row.longitude_deg));
  assert.equal(facts.airport.lat, Number(sources.airport.row.latitude_deg));
  assert.equal(facts.country.idISOlower.toUpperCase(), sources.airport.row.iso_country);
  for (const point of [facts.centre, facts.airport]) assert.ok(Number.isFinite(point.lon) && Number.isFinite(point.lat) && Math.abs(point.lon) <= 180 && Math.abs(point.lat) <= 90);
  if (batch) {
    assert.equal(job.datasetSha256, downloads.pbf.sha256);
    assert.equal(job.adapterSha256, downloads.extractorSha256);
    assert.equal(sources.adapterSha256, job.adapterSha256);
    assert.equal(sources.pbf.url, downloads.pbf.url);
    assert.equal(sources.pbf.bytes, downloads.pbf.bytes);
    assert.equal(sources.airport.csvSha256, downloads.airports.sha256);
    assert.equal(sources.airport.snapshotDate, downloads.airports.snapshotDate);
    assert.equal(sources.bounds.geometrySourceGitSHA, downloads.geometrySourceSha);
    assert.deepEqual({ sourceRunId: job.sourceRunId, sourceSha: job.sourceSha, sourceArtifact: job.sourceArtifact }, { sourceRunId: countryScope.boundaryJob.sourceRunId, sourceSha: countryScope.boundaryJob.sourceSha, sourceArtifact: countryScope.boundaryJob.sourceArtifact }, 'shared source/boundary producer identity differs');
    const canonicalRow = JSON.stringify(Object.fromEntries(Object.entries(sources.airport.row).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
    assert.equal(hash(canonicalRow.replace(/[\u0080-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))), sources.airport.rowSha256);
    assert.ok(Number.isSafeInteger(sources.airport.rowNumber) && sources.airport.rowNumber > 1);
    assert.ok(Array.isArray(sources.timezone.rows) && sources.timezone.rows.length === 1);
    assert.ok(sources.timezone.rows[0][0].split(',').includes(countryScope.countryISO));
    assert.equal(sources.timezone.rows[0][2], facts.timezone);
  }
  for (const layer of layers) {
    const bytes = readFileSync(join(root, metadata.id, layer + '.json'));
    assert.equal(hash(bytes), job.extractSha256[layer]);
    const source = JSON.parse(bytes).source;
    assert.equal(source.cityId, metadata.id);
    assert.equal(source.datasetSha256, job.datasetSha256);
    assert.equal(source.adapterSha256, job.adapterSha256);
    assert.deepEqual(source.boxes.play, metadata.sourceInput.boxes.play);
    if (batch) {
      assert.equal(source.datasetUrl, downloads.pbf.url);
      assert.equal(source.pbfHeaderTimestamp, sources.pbf.headerTimestamp);
    }
  }
  validateCountryScopePolicy(countryScope, facts.country.idISOlower, job.datasetSha256);
  if (batch) assertCountryFacts(loadCountryScope(root, countryScope, metadata.country, job.datasetSha256), facts);
  if (boundsSourceGitSHA === undefined) boundsSourceGitSHA = sources.bounds.geometrySourceGitSHA;
  assert.equal(sources.bounds.geometrySourceGitSHA, boundsSourceGitSHA);
  targets.push({ id: metadata.id, name: metadata.name, country: metadata.country, facts,
    metadataSources: { ...sources, airport: { ...sources.airport, sourceUrl: facts.airport.sourceUrl } },
    extractKey: metadata.id, extractSha256: job.extractSha256, sourceJob: job });
}
assert.match(boundsSourceGitSHA, /^[0-9a-f]{40}$/);
const table = { expectedSourceGitSHA: generationSourceSHA, geometryPreset: 'standard', countryScope, targets };
writeFileSync(resolve(output), JSON.stringify(table, null, 2) + '\n');
console.log(JSON.stringify({ cities: targets.map(target => target.id), excludedHeldIds: excluded,
  sourceRun: countryScope.boundaryJob?.sourceRunId ?? targets[0].sourceJob.sourceRunId,
  sourceSha: targets[0].sourceJob.sourceSha, boundsSource: boundsSourceGitSHA, generationSource: generationSourceSHA }));
