import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { datasetUrlSnapshot, isMirrorDatasetUrl } from './dataset-url.mjs';
import { loadCountryScope, TREATY_RING } from './country-scope.mjs';

const MIRROR = 'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf';
const REFUSED = [
  'https://download.openstreetmap.fr/extracts/europe/jersey.osm.pbf',
  'https://github.com/kromate/joinallworld/releases/download/extracts-20261014/osmfr-jersey.osm.pbf',
  'https://github.com/kromate/joinallworld/releases/download/v1.0/osmfr-jersey-261013.osm.pbf',
  'https://github.com/someone/joinallworld/releases/download/extracts-20261014/osmfr-jersey-261013.osm.pbf',
  'https://github.com/kromate/joinallworld/releases/latest/download/osmfr-jersey-261013.osm.pbf',
  `${MIRROR}?raw=1`, `${MIRROR}.md5`, MIRROR.replace('https:', 'http:'),
  'https://download.geofabrik.de/europe/guernsey-jersey-latest.osm.pbf',
];

test('dataset URLs: dated Geofabrik files and pinned extracts-YYYYMMDD release assets of kromate/joinallworld, nothing else', () => {
  assert.equal(datasetUrlSnapshot('https://download.geofabrik.de/europe/guernsey-jersey-261011.osm.pbf'), '261011');
  assert.equal(datasetUrlSnapshot('https://download.geofabrik.de/russia-261011.osm.pbf'), '261011');
  assert.equal(datasetUrlSnapshot(MIRROR), '261013');
  assert.ok(isMirrorDatasetUrl(MIRROR) && !isMirrorDatasetUrl('https://download.geofabrik.de/russia-261011.osm.pbf'));
  for (const url of [...REFUSED, undefined, 42]) assert.equal(datasetUrlSnapshot(url), null, String(url));
});

test('a boundary receipt built from a pinned mirror asset loads; one built from the undated upstream file is refused', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mirror-scope-'));
  try {
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    const write = url => {
      const geometry = Buffer.from(JSON.stringify({ coordinates: [TREATY_RING], type: 'Polygon' }) + '\n');
      const receipt = { schemaVersion: 1, status: 'OSM_COUNTRY_BOUNDARY_CANDIDATE', countryISO: 'AQ', source: { url, date: '2026-10-13', headerTimestamp: '2026-10-13T01:40:32Z', bytes: 1, sha256: 'a'.repeat(64) },
        relation: null, treatyScope: { kind: 'antarctic-treaty-area', southOfLatitude: -60, countryISO: 'AQ', reason: 'Owner decision: Antarctica is playable (test).', evidenceSha256: 'e'.repeat(64) },
        memberWays: [], assembly: { method: 'antarctic-treaty-area', completeMemberSegments: TREATY_RING.length - 1, polygonCount: 1, holeCount: 0, sourceMemberEdgesSha256: 'f'.repeat(64) },
        geometry: { path: 'boundary.geojson', bytes: geometry.length, sha256: hash(geometry) }, scriptSha256: 'd'.repeat(64), fixtureResults: [] };
      const raw = Buffer.from(JSON.stringify(receipt));
      writeFileSync(join(dir, 'boundary.geojson'), geometry); writeFileSync(join(dir, 'receipt.json'), raw);
      return { kind: 'osm-admin0-boundary-v1', countryISO: 'AQ', datasetSha256: 'a'.repeat(64), receiptSha256: hash(raw), receiptBytes: raw.length, geometrySha256: hash(geometry), geometryBytes: geometry.length, scriptSha256: 'd'.repeat(64), treatyScope: 'antarctic-treaty-area', directory: dir };
    };
    assert.equal(loadCountryScope('/', write(MIRROR), 'aq', 'a'.repeat(64)).classify([-58.98, -62.19]), 'inside');
    for (const url of REFUSED.slice(0, 6)) assert.throws(() => loadCountryScope('/', write(url), 'aq', 'a'.repeat(64)), /official Geofabrik PBF or a pinned extract mirror asset/, url);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
