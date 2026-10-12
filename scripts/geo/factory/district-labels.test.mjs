import test from 'node:test';
import assert from 'node:assert/strict';
import { districtLabels, FALLBACK_DISTRICT_PLACES, PRIMARY_DISTRICT_PLACES } from './district-labels.mjs';

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
  for (const [constant, values] of [['PLACE_DISTRICTS', PRIMARY_DISTRICT_PLACES], ['PLACE_DISTRICT_FALLBACKS', FALLBACK_DISTRICT_PLACES]]) {
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
