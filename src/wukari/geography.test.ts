import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { buildDataset, contains, fromWorld, parseArea, parseOsm, position, selectBoundary, toWorld, wayPositions } from './geography.ts';
import { checkedBytes, SOURCE_CONFIG } from '../../scripts/wukari/sources.ts';

const load = (name: string): any => JSON.parse(readFileSync(new URL(`../../data/wukari/fixtures/${name}.synthetic.json`, import.meta.url), 'utf8'));
test('synthetic fixture cannot masquerade as verified Wukari; extents stay distinct', () => {
  assert.throws(() => selectBoundary(load('boundary')), /exactly one/);
  const data = buildDataset(load('boundary'), load('osm'), { synthetic: true, campusWay: 101 });
  assert.equal(data.mode, 'synthetic'); assert.match(data.disclaimer, /NOT WUKARI/);
  assert.equal(data.extents.town.geometry, null); assert.equal(data.extents.campus.status, 'synthetic');
  assert.equal(data.extents.campus.osmId, 'way/101'); assert.equal(data.coverage.relations, 1);
  assert.deepEqual(data.osm.elements, load('osm').elements);
});
test('local metre projection preserves fractional source coordinates through roundtrip', () => {
  const origin = position([0.000000123456789, -0.000000987654321]); // synthetic, not Wukari
  for (const point of [[0, 0], [0.00123456789123, -0.00987654321987], [-0.001, 0.001]] as const) {
    const p = toWorld(origin, point), back = fromWorld(origin, p.x, p.z);
    assert.ok(Math.abs(back[0] - point[0]) < 1e-12); assert.ok(Math.abs(back[1] - point[1]) < 1e-12);
  }
  assert.deepEqual(toWorld(origin, origin), { x: 0, z: 0 });
  const east = toWorld([0, 0], [0.001, 0]), north = toWorld([0, 0], [0, 0.001]);
  assert.ok(east.x > 109 && east.x < 110); assert.ok(north.z < -111 && north.z > -112);
});
test('rejects invalid coordinates, open and degenerate rings; respects holes and multipolygons', () => {
  for (const value of [[NaN, 0], [0, Infinity], [181, 0], [0, 91], [1, 2, 3]]) assert.throws(() => position(value));
  assert.throws(() => parseArea({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }), /closed/);
  assert.throws(() => parseArea({ type: 'Polygon', coordinates: [[[0, 0], [1, 0], [2, 0], [0, 0]]] }), /Degenerate/);
  const area = parseArea({ type: 'MultiPolygon', coordinates: [[[[0,0],[4,0],[4,4],[0,4],[0,0]], [[1,1],[2,1],[2,2],[1,2],[1,1]]]] });
  assert.equal(contains(area, [3,3]), true); assert.equal(contains(area, [1.5,1.5]), false); assert.equal(contains(area, [5,5]), false);
  assert.equal(contains(area, [4,3]), true);
});
test('rejects ambiguous administrative names and wrong country/level', () => {
  const raw = load('boundary'); raw.features[0].properties.shapeName = 'Wukari';
  assert.throws(() => selectBoundary(raw), /identity/);
  raw.features[0].properties.shapeGroup = 'NGA'; assert.equal(selectBoundary(raw).properties.shapeName, 'Wukari');
  raw.features.push(raw.features[0]); assert.throws(() => selectBoundary(raw), /exactly one/);
});
test('OSM preserves references/precision and refuses duplicates, partial errors and missing geometry', () => {
  const raw = load('osm'); const osm = parseOsm(raw);
  assert.equal(wayPositions(osm.elements[1]!, osm.elements)![1]![1], 0.000000123456789);
  raw.elements.push(raw.elements[0]); assert.throws(() => parseOsm(raw), /Duplicate/);
  assert.throws(() => parseOsm({ version: 0.6, elements: [], remark: 'timeout' }), /complete/);
  const missing = { type: 'way' as const, id: 9, nodes: [999,1000] };
  assert.equal(wayPositions(missing, []), null);
  const raw2 = load('osm'); raw2.elements[0].nodes = []; assert.throws(() => parseOsm(raw2), /mismatch/);
  const raw3 = load('osm'); raw3.elements[0].geometry[4].lon += 0.00001;
  assert.throws(() => parseOsm(raw3), /Conflicting/);
});
test('campus candidate requires explicit university identity, closed geometry and containment', () => {
  assert.equal(buildDataset(load('boundary'), load('osm'), { synthetic: true }).extents.campus.status, 'unknown');
  assert.throws(() => buildDataset(load('boundary'), load('osm'), { synthetic: true, campusWay: 102 }), /university/);
  const osm = load('osm'); osm.elements[0].geometry[1].lon = 0.1;
  assert.throws(() => buildDataset(load('boundary'), osm, { synthetic: true, campusWay: 101 }), /inside/);
});
test('source integrity rejects a Git LFS pointer and verifies existing pinned ADM1 bytes', () => {
  assert.throws(() => checkedBytes(Buffer.from('version https://git-lfs.github.com/spec/v1'), SOURCE_CONFIG.adm2), /SHA-256/);
  const bytes = readFileSync(new URL('../../scripts/geo/sources/nigeria-adm1-9469f09.geojson', import.meta.url));
  checkedBytes(bytes, SOURCE_CONFIG.adm1);
  const changed = Buffer.from(bytes); changed[0] = 0; assert.throws(() => checkedBytes(changed, SOURCE_CONFIG.adm1), /SHA-256/);
});
