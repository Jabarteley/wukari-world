import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceInputs, cityExtractInput } from './source-inputs.mjs';

const primary = { role: 'primary', url: 'https://download.geofabrik.de/south-america/suriname-261011.osm.pbf', snapshotDate: '2026-10-11', bytes: 21402790, md5: '3751335c967af8cb914986acd0b85782', sha256: 'd'.repeat(64) };
const neighbour = { role: 'neighbour', url: 'https://download.geofabrik.de/south-america/guyana-261011.osm.pbf', snapshotDate: '2026-10-11', bytes: 15554318, md5: '73aca8d8e775563d49a971ed9dd79c20', sha256: 'e'.repeat(64), reason: 'way/143451568 of relation/287082' };

test('a same-snapshot primary and neighbour list is accepted against its dataset URL and date', () => {
  assert.equal(validateSourceInputs([primary, neighbour], { url: primary.url, date: '2026-10-11' }).length, 2);
});

test('mixed snapshots, wrong order, missing reason, extra keys and another primary are refused', () => {
  const cases = [
    [primary],
    [neighbour, primary],
    [primary, { ...neighbour, url: neighbour.url.replace('261011', '261012') }],
    [primary, { ...neighbour, snapshotDate: '2026-10-12' }],
    [primary, { ...neighbour, url: 'https://download.geofabrik.de/south-america/guyana-latest.osm.pbf' }],
    [primary, { ...neighbour, reason: '' }],
    [primary, { ...neighbour, extra: true }],
    [primary, { ...neighbour, sha256: primary.sha256 }],
  ];
  for (const inputs of cases) assert.throws(() => validateSourceInputs(inputs));
  assert.throws(() => validateSourceInputs([primary, neighbour], { url: neighbour.url }));
  assert.throws(() => validateSourceInputs([primary, neighbour], { date: '2026-10-12' }));
});

const city = { role: 'city-extract', url: 'https://download.geofabrik.de/south-america/suriname/paramaribo-261011.osm.pbf', snapshotDate: '2026-10-11', bytes: 1000, md5: 'a'.repeat(32), sha256: 'f'.repeat(64), reason: 'city sub-extract',
  polyUrl: 'https://download.geofabrik.de/south-america/suriname/paramaribo.poly', polySha256: 'b'.repeat(64), primaryPolyUrl: 'https://download.geofabrik.de/south-america/suriname.poly', primaryPolySha256: 'c'.repeat(64) };

test('a city sub-extract list (primary, optional neighbours, city-extract last) pairs the primary with the city dataset', () => {
  assert.equal(cityExtractInput([primary, city]), city);
  assert.equal(cityExtractInput([primary, neighbour]), null);
  for (const inputs of [[primary, city], [primary, neighbour, city]]) {
    assert.equal(validateSourceInputs(inputs, { url: primary.url, date: '2026-10-11', datasetUrl: city.url }).length, inputs.length);
    assert.throws(() => validateSourceInputs(inputs, { datasetUrl: primary.url }));
  }
  assert.equal(validateSourceInputs([primary, neighbour], { datasetUrl: primary.url }).length, 2);
  const cases = [
    [primary, city, neighbour],
    [city, primary],
    [primary, { ...city, polyUrl: 'https://download.geofabrik.de/south-america/suriname/other.poly' }],
    [primary, { ...city, primaryPolyUrl: 'https://download.geofabrik.de/south-america/guyana.poly' }],
    [primary, { ...city, bytes: primary.bytes }],
    [primary, { ...city, url: city.url.replace('261011', '261012'), polyUrl: city.polyUrl }],
    [primary, { ...city, polySha256: 'x' }],
    [primary, { ...city, reason: ' ' }],
  ];
  for (const inputs of cases) assert.throws(() => validateSourceInputs(inputs));
});
