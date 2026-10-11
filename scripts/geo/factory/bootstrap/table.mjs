import { validateCountryScopePolicy } from '../country-scope.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const [input, output, boundaryPolicyFile] = process.argv.slice(2);
if (!input || !output || !boundaryPolicyFile) throw Error('Usage: table.mjs BOOTSTRAP_ARTIFACT TARGET_TABLE BOUNDARY_POLICY_JSON; missing country boundary HOLD');
const root = resolve(input), read = file => JSON.parse(readFileSync(join(root, file), 'utf8'));
const result = read('receipts/result.json'), metadata = read('metadata/candidate/metadata.json'), job = read('receipts/source-job.json');
assert.equal(result.status, 'SOURCE_CANDIDATE');
assert.equal(metadata.status, 'METADATA_CANDIDATE');
assert.deepEqual(result.sourceJob, job);
assert.equal(job.city, metadata.id);
const facts = metadata.facts, sources = metadata.metadataSources;
assert.equal(facts.id, metadata.id);
assert.equal(sources.pbf.sha256, job.datasetSha256);
assert.equal(sources.centre.pbfSha256, job.datasetSha256);
assert.equal(facts.centre.lon, sources.centre.sourceRecord.lon);
assert.equal(facts.centre.lat, sources.centre.sourceRecord.lat);
assert.equal(facts.airport.lon, Number(sources.airport.row.longitude_deg));
assert.equal(facts.airport.lat, Number(sources.airport.row.latitude_deg));
assert.equal(facts.country.idISOlower.toUpperCase(), sources.airport.row.iso_country);
for (const layer of ['places', 'extras', 'water', 'landuse', 'roads']) {
  const bytes = readFileSync(join(root, metadata.id, layer + '.json'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), job.extractSha256[layer]);
  const source = JSON.parse(bytes).source;
  assert.equal(source.cityId, metadata.id);
  assert.equal(source.datasetSha256, job.datasetSha256);
  assert.equal(source.adapterSha256, job.adapterSha256);
  assert.deepEqual(source.boxes.play, metadata.sourceInput.boxes.play);
}
const countryScope = JSON.parse(readFileSync(resolve(boundaryPolicyFile), 'utf8'));
validateCountryScopePolicy(countryScope, facts.country.idISOlower, job.datasetSha256);
const table = {
  expectedSourceGitSHA: sources.bounds.geometrySourceGitSHA,
  geometryPreset: 'standard',
  countryScope,
  targets: [{ id: metadata.id, name: metadata.name, country: metadata.country, facts,
    metadataSources: { ...sources, airport: { ...sources.airport, sourceUrl: facts.airport.sourceUrl } },
    extractKey: metadata.id, extractSha256: job.extractSha256, sourceJob: job }],
};
assert.match(table.expectedSourceGitSHA, /^[0-9a-f]{40}$/);
writeFileSync(resolve(output), JSON.stringify(table, null, 2) + '\n');
console.log(JSON.stringify({ city: metadata.id, sourceRun: job.sourceRunId, sourceSha: job.sourceSha, geometrySource: table.expectedSourceGitSHA }));
