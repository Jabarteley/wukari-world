import { validateCountryScopePolicy, loadCountryScope, assertCountryFacts } from '../country-scope.mjs';
import { validateSourceInputs, cityExtractInput } from '../source-inputs.mjs';
import { PROFILE_NAMES } from '../profile.mjs';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const KNOBS = JSON.parse(readFileSync(join(fileURLToPath(new URL('.', import.meta.url)), 'geometry-knobs.json'), 'utf8'));
// seed.geometry knobs (bootstrap/geometry-knobs.json) reach the factory target unchanged; the same ranges as batch-run.py, batch.mjs.
function assertGeometryKnobs(id, knobs) {
  assert.ok(knobs && typeof knobs === 'object' && !Array.isArray(knobs) && Object.keys(knobs).length, `${id}: geometry must be a non-empty object`);
  for (const [key, value] of Object.entries(knobs)) {
    const spec = KNOBS.geometry[key];
    assert.ok(spec, `${id}: unsupported geometry knob ${key}`);
    assert.ok(typeof value === 'number' && Number.isFinite(value) && value >= spec.min && value <= spec.max && (!spec.integer || Number.isInteger(value)), `${id}: geometry.${key} out of range`);
  }
}
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
    if (city.sceneWaterExtent !== undefined) assert.ok(['play', 'reach'].includes(city.sceneWaterExtent), `${city.id}: invalid sceneWaterExtent`);
    if (city.waterBudgetLadder !== undefined) assert.equal(typeof city.waterBudgetLadder, 'boolean', `${city.id}: waterBudgetLadder must be true or false`);
    if (city.profile !== undefined) assert.ok(PROFILE_NAMES.includes(city.profile), `${city.id}: invalid profile`);
    if (city.links !== undefined) {
      // Authored outpost links (batch-run.py authored_links): 2 to 4 {to, kind} entries; the scaffold adds km and names from the app catalogue.
      assert.ok(Array.isArray(city.links) && city.links.length >= 2 && city.links.length <= 4, `${city.id}: links needs 2 to 4 entries`);
      assert.ok(city.links.every(link => link && Object.keys(link).sort().join(',') === 'kind,to' && ['charter', 'ship', 'overland'].includes(link.kind) && cityId.test(link.to) && link.to !== 'lagos' && link.to !== city.id), `${city.id}: invalid authored link`);
    }
    if (city.namesUnit !== undefined) assert.ok(typeof city.namesUnit === 'string' && city.namesUnit.trim(), `${city.id}: namesUnit must be a non-empty string`);
    if (city.geometry !== undefined) assertGeometryKnobs(city.id, city.geometry);
    if (city.selectionExclusions !== undefined) {
      assert.ok(Array.isArray(city.selectionExclusions), `${city.id}: selectionExclusions must be an array`);
      const refs = new Set();
      for (const exclusion of city.selectionExclusions) {
        assert.ok(exclusion && typeof exclusion === 'object' && !Array.isArray(exclusion), `${city.id}: invalid selection exclusion`);
        assert.deepEqual(Object.keys(exclusion).sort(), ['reason', 'ref'], `${city.id}: selection exclusion must contain only ref and reason`);
        assert.ok(typeof exclusion.ref === 'string' && /^(node|way|relation)\/[1-9][0-9]*$/.test(exclusion.ref), `${city.id}: invalid selection exclusion ref`);
        assert.ok(!refs.has(exclusion.ref), `${city.id}: duplicate selection exclusion ref ${exclusion.ref}`);
        assert.ok(typeof exclusion.reason === 'string' && exclusion.reason.trim(), `${city.id}: selection exclusion ${exclusion.ref} requires a reason`);
        refs.add(exclusion.ref);
      }
    }
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
let countryScope, cityExtract = null;
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
  // City sub-extract: downloads.pbf is the city extract (what metadata and layers read); the boundary read the primary input.
  cityExtract = cityExtractInput(downloads.pbf.sourceInputs);
  const boundarySource = cityExtract ? downloads.pbf.sourceInputs[0] : downloads.pbf;
  if (cityExtract) for (const key of ['url', 'bytes', 'md5', 'sha256', 'snapshotDate']) assert.equal(downloads.pbf[key], cityExtract[key], `downloads.pbf ${key} must be the city extract's`);
  assert.equal(receipt.source.sha256, boundarySource.sha256);
  assert.equal(receipt.source.bytes, boundarySource.bytes);
  assert.equal(receipt.source.url, boundarySource.url);
  assert.equal(receipt.source.date, boundarySource.snapshotDate);
  // Neighbour merge: one dataset hash (the merged file) everywhere; the inputs must agree between downloads and boundary receipts.
  if (downloads.pbf.sourceInputs !== undefined) validateSourceInputs(downloads.pbf.sourceInputs, { url: boundarySource.url, date: downloads.pbf.snapshotDate, datasetUrl: downloads.pbf.url });
  assert.deepEqual(receipt.source.sourceInputs, downloads.pbf.sourceInputs, 'boundary and download source inputs differ');
  assert.equal(receipt.geometry.sha256, summary.sha256);
  const job = candidates[0].sourceJob;
  countryScope = {
    kind: 'osm-admin0-boundary-v1', countryISO: receipt.countryISO,
    datasetSha256: cityExtract ? cityExtract.sha256 : receipt.source.sha256, ...(cityExtract ? { boundaryDatasetSha256: receipt.source.sha256 } : {}),
    receiptSha256: hash(rawReceipt), receiptBytes: rawReceipt.length,
    geometrySha256: receipt.geometry.sha256, geometryBytes: receipt.geometry.bytes,
    // The AQ treaty scope (country-boundary.py treatyScope) has no relation; every other scope is pinned by its admin-0 relation id.
    scriptSha256: receipt.scriptSha256, ...(receipt.treatyScope ? { treatyScope: receipt.treatyScope.kind } : { relationId: receipt.relation.id }),
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
  // An outpost gateway (metadata-batch.py): the airport record is the mapped gateway node of the same PBF; no OurAirports row.
  const gateway = sources.gateway;
  if (gateway !== undefined) {
    assert.equal(sources.airport, undefined, 'a gateway city has no airport row');
    assert.deepEqual(facts.gateway, { mode: gateway.mode, osmRef: gateway.osmRef }, 'facts gateway differs from its source');
    assert.equal(gateway.sourceRecord.ref, gateway.osmRef);
    assert.equal(gateway.pbfSha256, job.datasetSha256);
    assert.equal(facts.airport.lon, gateway.sourceRecord.lon);
    assert.equal(facts.airport.lat, gateway.sourceRecord.lat);
    assert.equal(facts.airport.sourceUrl, `https://www.openstreetmap.org/${gateway.osmRef}`);
    assert.ok(!('military' in gateway.sourceRecord.tags) && gateway.sourceRecord.tags.landuse !== 'military', 'a military node is never a gateway');
  } else assert.equal(facts.gateway, undefined, 'facts gateway without a gateway source');
  if (gateway === undefined) assert.equal(facts.airport.lon, Number(sources.airport.row.longitude_deg));
  if (gateway === undefined) assert.equal(facts.airport.lat, Number(sources.airport.row.latitude_deg));
  // airport.countryOverride (reviewed, written reason): the territory's airport may be filed under another OurAirports country (Aland AX: EFMA under FI).
  const airportOverride = sources.airport?.selection?.countryOverride;
  if (gateway !== undefined) { /* no airport row */ }
  else if (airportOverride === undefined) assert.equal(facts.country.idISOlower.toUpperCase(), sources.airport.row.iso_country);
  else assert.ok(airportOverride.iso === sources.airport.row.iso_country && airportOverride.iso !== facts.country.idISOlower.toUpperCase() && typeof airportOverride.reason === 'string' && airportOverride.reason.trim().length >= 20, 'airport countryOverride must name the airport row country, differ from the seed country and carry a written reason');
  for (const point of [facts.centre, facts.airport]) assert.ok(Number.isFinite(point.lon) && Number.isFinite(point.lat) && Math.abs(point.lon) <= 180 && Math.abs(point.lat) <= 90);
  if (batch) {
    assert.equal(job.datasetSha256, downloads.pbf.sha256);
    assert.deepEqual(job.sourceInputs, downloads.pbf.sourceInputs, 'city source job and download source inputs differ');
    assert.equal(job.adapterSha256, downloads.extractorSha256);
    assert.equal(sources.adapterSha256, job.adapterSha256);
    assert.equal(sources.pbf.url, downloads.pbf.url);
    assert.equal(sources.pbf.bytes, downloads.pbf.bytes);
    if (gateway === undefined) assert.equal(sources.airport.csvSha256, downloads.airports.sha256);
    if (gateway === undefined) assert.equal(sources.airport.snapshotDate, downloads.airports.snapshotDate);
    assert.equal(sources.bounds.geometrySourceGitSHA, downloads.geometrySourceSha);
    if (cityExtract) {
      // Owner rule (13 Oct): each city read from the sub-extract carries its passed containment receipt (source-merge.py city_extract_scope).
      const scope = read(`receipts/${city.id}-city-extract-scope.json`);
      assert.equal(scope.city, city.id);
      assert.ok(scope.centreInsideAdmin0 === true && scope.centreInsideCityExtractPoly === true, `${city.id}: city extract scope not proved`);
      assert.deepEqual(scope.boxesInsideCityExtractHeaderBox, ['play', 'core', 'outline']);
      for (const key of ['url', 'sha256', 'polyUrl', 'polySha256', 'primaryPolyUrl', 'primaryPolySha256']) assert.equal(scope.cityExtract?.[key], cityExtract[key], `${city.id}: city extract scope ${key}`);
      assert.equal(scope.boundaryReceiptSha256, hash(readFileSync(join(root, 'country-boundary/receipt.json'))));
    }
    assert.deepEqual({ sourceRunId: job.sourceRunId, sourceSha: job.sourceSha, sourceArtifact: job.sourceArtifact }, { sourceRunId: countryScope.boundaryJob.sourceRunId, sourceSha: countryScope.boundaryJob.sourceSha, sourceArtifact: countryScope.boundaryJob.sourceArtifact }, 'shared source/boundary producer identity differs');
    if (gateway === undefined) {
      const canonicalRow = JSON.stringify(Object.fromEntries(Object.entries(sources.airport.row).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)));
      assert.equal(hash(canonicalRow.replace(/[\u0080-\uffff]/g, char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0'))), sources.airport.rowSha256);
      assert.ok(Number.isSafeInteger(sources.airport.rowNumber) && sources.airport.rowNumber > 1);
    }
    if (sources.timezone.override !== undefined) {
      // Reviewed timezoneOverride (metadata.py choose_seed_timezone): no country row; the override names the zone and its reason.
      assert.deepEqual(sources.timezone.rows, []);
      assert.equal(sources.timezone.override.id, facts.timezone);
      assert.ok(typeof sources.timezone.override.reason === 'string' && sources.timezone.override.reason.trim().length >= 20, 'timezoneOverride needs its written reason');
    } else {
      assert.ok(Array.isArray(sources.timezone.rows) && sources.timezone.rows.length === 1);
      assert.ok(sources.timezone.rows[0][0].split(',').includes(countryScope.countryISO));
      assert.equal(sources.timezone.rows[0][2], facts.timezone);
    }
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
    ...(batch && city.sceneWaterExtent !== undefined ? { sceneWaterExtent: city.sceneWaterExtent } : {}),
    ...(batch && city.waterBudgetLadder !== undefined ? { waterBudgetLadder: city.waterBudgetLadder } : {}),
    ...(batch && city.namesUnit !== undefined ? { namesUnit: city.namesUnit } : {}),
    ...(batch && city.profile !== undefined ? { profile: city.profile } : {}),
    ...(batch && city.selectionExclusions !== undefined ? { selectionExclusions: city.selectionExclusions } : {}),
    ...(batch && city.geometry !== undefined ? { geometry: city.geometry } : {}),
    ...(batch && city.links !== undefined ? { links: city.links } : {}),
    metadataSources: gateway !== undefined ? sources : { ...sources, airport: { ...sources.airport, sourceUrl: facts.airport.sourceUrl } },
    extractKey: metadata.id, extractSha256: job.extractSha256, sourceJob: job });
}
assert.match(boundsSourceGitSHA, /^[0-9a-f]{40}$/);
const table = { expectedSourceGitSHA: generationSourceSHA, geometryPreset: 'standard', countryScope, targets };
writeFileSync(resolve(output), JSON.stringify(table, null, 2) + '\n');
console.log(JSON.stringify({ cities: targets.map(target => target.id), excludedHeldIds: excluded,
  sourceRun: countryScope.boundaryJob?.sourceRunId ?? targets[0].sourceJob.sourceRunId,
  sourceSha: targets[0].sourceJob.sourceSha, boundsSource: boundsSourceGitSHA, generationSource: generationSourceSHA }));
