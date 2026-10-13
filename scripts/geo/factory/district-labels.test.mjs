import test from 'node:test';
import assert from 'node:assert/strict';
import { districtLabels, FALLBACK_DISTRICT_PLACES, PRIMARY_DISTRICT_PLACES, ISLAND_PLACES, SQUARE_PLACES } from './district-labels.mjs';

const ref = el => `${el.type}/${el.id}`, name = el => el.tags.name, normal = text => text.normalize('NFKC').toLowerCase();
const node = (id, place, extra = {}, lon = 100 + id / 1000, lat = 10) => ({ type: 'node', id, lon, lat, tags: { name: `P${id}`, place, ...extra } });
const centre = { lon: 100, lat: 10 };
const run = pool => districtLabels({ pool, name, ref, normal, centre });

test('five primary labels already exist: villages and other fallback tags are ignored and nothing changes', () => {
  const primary = ['suburb', 'neighbourhood', 'quarter', 'suburb', 'quarter'].map((place, i) => node(i + 1, place));
  const withVillages = [...primary, ...[100, 101, 102].map(id => node(id, 'village')), node(103, 'locality')];
  const before = run(primary), after = run(withVillages);
  assert.deepEqual(after.labels, before.labels);
  assert.equal(after.fallback, false);
  assert.equal(after.labels.length, 5);
});

test('fewer than five primary labels: villages, hamlets, localities and subdivisions are appended after them, in tag priority', () => {
  const pool = [node(1, 'suburb'), node(2, 'subdivision'), node(3, 'locality'), node(4, 'hamlet'), node(5, 'village'), node(6, 'village')];
  const { labels, placeTags, fallback } = run(pool);
  assert.equal(fallback, true);
  assert.deepEqual(labels.map(label => label.ref), ['node/1', 'node/5', 'node/6', 'node/4', 'node/3', 'node/2']);
  assert.deepEqual(Object.values(placeTags), ['suburb', 'village', 'village', 'hamlet', 'locality', 'subdivision']);
});

test('fallback ranks wikidata first, then nearest to the city; islets and duplicate names never qualify; an area is only a last top-up after every node', () => {
  const far = node(10, 'village', {}, 100.5), near = node(11, 'village', {}, 100.01), famous = node(12, 'village', { wikidata: 'Q1' }, 100.9);
  const duplicate = node(13, 'village', { name: 'P11' }, 100.02), islet = node(14, 'islet'), way = { type: 'way', id: 15, center: { lon: 100, lat: 10 }, tags: { name: 'W', place: 'village' } };
  const { labels } = run([far, near, famous, duplicate, islet, way]);
  assert.deepEqual(labels.map(label => label.ref), ['node/12', 'node/11', 'node/10', 'way/15']);
  assert.ok(!FALLBACK_DISTRICT_PLACES.includes('islet') && !FALLBACK_DISTRICT_PLACES.includes('island'));
});

test('the tag lists match the extractor', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(new URL('../offline-extract.py', import.meta.url), 'utf8');
  for (const [constant, values] of [['PLACE_DISTRICTS', PRIMARY_DISTRICT_PLACES], ['PLACE_DISTRICT_FALLBACKS', FALLBACK_DISTRICT_PLACES], ['PLACE_ISLANDS', ISLAND_PLACES]]) {
    const match = new RegExp(`^${constant} = \\{([^}]*)\\}`, 'm').exec(source);
    assert.ok(match, constant);
    assert.deepEqual([...match[1].matchAll(/"([a-z]+)"/g)].map(item => item[1]).sort(), [...values].sort());
  }
});

test('areas top the list up to five only when nodes are not enough: primary tags first, then fallback tags, nearest first, centre point of the area', () => {
  const area = (id, place, lon) => ({ type: 'way', id, center: { lon, lat: 10 }, tags: { name: `A${id}`, place } });
  const pool = [node(1, 'neighbourhood'), node(2, 'locality'), area(20, 'subdivision', 100.001), area(21, 'neighbourhood', 100.5), area(22, 'subdivision', 100.002), area(23, 'subdivision', 100.003), area(24, 'subdivision', 100.004)];
  const { labels, fallback, areaRefs } = run(pool);
  assert.equal(fallback, true);
  assert.deepEqual(labels.map(label => label.ref), ['node/1', 'node/2', 'way/21', 'way/20', 'way/22']);
  assert.deepEqual(areaRefs, ['way/21', 'way/20', 'way/22']);
  const enough = run([1, 2, 3, 4, 5].map(id => node(id, 'quarter')).concat(area(30, 'neighbourhood', 100)));
  assert.equal(enough.labels.length, 5);
  assert.ok(enough.labels.every(label => label.ref.startsWith('node/')));
  assert.deepEqual(enough.areaRefs, []);
});

test('islands (microstate profile only): after every node tier and still short, named islands nearest first; never for a standard city; the islet of a node-less atoll counts', () => {
  const island = (id, lon, extra = {}) => ({ type: 'node', id, lon, lat: 10, tags: { name: `I${id}`, place: 'island', ...extra } });
  const way = { type: 'way', id: 40, center: { lon: 100.002, lat: 10 }, tags: { name: 'W40', place: 'islet' } };
  const pool = [node(1, 'quarter'), island(2, 100.5), island(3, 100.01), island(4, 100.9, { wikidata: 'Q9' }), way, node(5, 'locality')];
  const micro = districtLabels({ pool, name, ref, normal, centre, minimumLabels: 3, islandPlaces: ISLAND_PLACES });
  assert.deepEqual(micro.labels.map(label => label.ref), ['node/1', 'node/5', 'node/4', 'way/40', 'node/3', 'node/2']);
  assert.deepEqual(micro.areaRefs, ['way/40']);
  assert.equal(micro.fallback, true);
  const standard = districtLabels({ pool, name, ref, normal, centre, minimumLabels: 3 });
  assert.deepEqual(standard.labels.map(label => label.ref), ['node/1', 'node/5'], 'no island is read without the profile list');
  const enough = districtLabels({ pool: [1, 2, 3].map(id => node(id, 'quarter')).concat(island(9, 100.001)), name, ref, normal, centre, minimumLabels: 3, islandPlaces: ISLAND_PLACES });
  assert.deepEqual(enough.labels.map(label => label.ref), ['node/1', 'node/2', 'node/3'], 'islands are not read when the ordinary tags already reach the minimum');
});

test('squares (microstate profile only): the Holy See shape, two labels and three named squares reach five; the last resort after islands and areas; never without the profile', () => {
  // Real names and tags of the Vatican (the node ids are the real ones; the square way ids are shaped, the real refs come from the source run).
  const vatican = [
    { type: 'node', id: 424311883, lon: 12.4534, lat: 41.9029, tags: { name: 'Vatican City', 'name:en': 'Vatican City', place: 'suburb', capital: 'yes' } },
    { type: 'node', id: 13020223521, lon: 12.4530, lat: 41.9033, tags: { name: 'Piazza dei Protomartiri Romani', place: 'locality' } },
    { type: 'way', id: 900001, center: { lon: 12.4573, lat: 41.9022 }, tags: { name: 'Piazza Retta', place: 'square' } },
    { type: 'way', id: 900002, center: { lon: 12.4540, lat: 41.9021 }, tags: { name: 'Sagrato della Basilica', place: 'square' } },
    { type: 'way', id: 900003, center: { lon: 12.4515, lat: 41.9040 }, tags: { name: 'Largo Madonna della Guardia', place: 'square' } },
    { type: 'node', id: 900004, lon: 12.4535, lat: 41.9030, tags: { name: 'Plot of land', place: 'plot' } },
  ];
  const middle = { lon: 12.4534, lat: 41.9029 };
  const micro = districtLabels({ pool: vatican, name, ref, normal, centre: middle, minimumLabels: 3, islandPlaces: ISLAND_PLACES, squarePlaces: SQUARE_PLACES });
  assert.deepEqual(micro.labels.map(label => label.ref), ['node/424311883', 'node/13020223521', 'way/900002', 'way/900003', 'way/900001']);
  assert.deepEqual(micro.squareRefs, ['way/900002', 'way/900003', 'way/900001'], 'nearest first');
  assert.deepEqual(micro.areaRefs, [], 'a square is not reported as an area label');
  assert.equal(micro.fallback, true);
  assert.deepEqual(micro.placeTags['way/900001'], 'square');
  const standard = districtLabels({ pool: vatican, name, ref, normal, centre: middle, minimumLabels: 3 });
  assert.deepEqual(standard.labels.map(label => label.ref), ['node/424311883', 'node/13020223521'], 'no square is read without the profile list');
  assert.deepEqual(standard.squareRefs, []);
  assert.ok(!PRIMARY_DISTRICT_PLACES.includes('square') && !FALLBACK_DISTRICT_PLACES.includes('square') && !ISLAND_PLACES.includes('square'));
});

test('squares are the very last tier: not read when nodes, islands or areas already reach the minimum; wikidata first; duplicate names and ways without a centre never qualify', () => {
  const square = (id, lon, extra = {}) => ({ type: 'node', id, lon, lat: 10, tags: { name: `S${id}`, place: 'square', ...extra } });
  const options = { name, ref, normal, centre, minimumLabels: 3, islandPlaces: ISLAND_PLACES, squarePlaces: SQUARE_PLACES };
  const nodes = [1, 2, 3].map(id => node(id, 'quarter'));
  assert.deepEqual(districtLabels({ ...options, pool: [...nodes, square(9, 100.001)] }).labels.map(label => label.ref), ['node/1', 'node/2', 'node/3']);
  const island = { type: 'node', id: 20, lon: 100.2, lat: 10, tags: { name: 'I20', place: 'island' } };
  assert.deepEqual(districtLabels({ ...options, pool: [node(1, 'quarter'), node(2, 'village'), island, square(9, 100.001)] }).labels.map(label => label.ref), ['node/1', 'node/2', 'node/20'], 'an island fills the third label first');
  const area = { type: 'way', id: 30, center: { lon: 100.3, lat: 10 }, tags: { name: 'A30', place: 'neighbourhood' } };
  const withArea = districtLabels({ ...options, pool: [node(1, 'quarter'), node(2, 'village'), area, square(9, 100.001)] });
  assert.deepEqual(withArea.labels.map(label => label.ref), ['node/1', 'node/2', 'way/30']);
  assert.deepEqual(withArea.squareRefs, []);
  const far = square(10, 100.5), near = square(11, 100.01), famous = square(12, 100.9, { wikidata: 'Q1' }), duplicate = square(13, 100.02, { name: 'S11' });
  const noCentre = { type: 'way', id: 14, tags: { name: 'W14', place: 'square' } };
  const { labels, squareRefs } = districtLabels({ ...options, pool: [node(1, 'quarter'), far, near, famous, duplicate, noCentre] });
  assert.deepEqual(labels.map(label => label.ref), ['node/1', 'node/12', 'node/11', 'node/10']);
  assert.deepEqual(squareRefs, ['node/12', 'node/11', 'node/10']);
});
