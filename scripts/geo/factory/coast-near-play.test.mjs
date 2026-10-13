import test from 'node:test';
import assert from 'node:assert/strict';
import { nearCoastlineMetres, NEAR_COAST_DEGREES } from './coast-near-play.mjs';

const play = [50.8, 4.2, 51.03, 4.6];
const way = pts => ({ geometry: pts.map(([lat, lon]) => ({ lat, lon })) });

test('a shore 39 km north of the play box (Brussels, Scheldt estuary) does not count', () => {
  assert.equal(nearCoastlineMetres(way([[51.36, 4.0], [51.40, 4.3], [51.38, 4.6]]), play), 0);
});
test('a shore inside the widened play box counts in full', () => {
  const metres = nearCoastlineMetres(way([[50.9, 4.0], [50.9, 4.1]]), play);
  assert.ok(Math.abs(metres - 0.1 * 111320 * Math.cos(50.9 * Math.PI / 180)) < 1);
});
test('a segment that has one end near counts; the distance window is 0.15 degrees', () => {
  assert.equal(NEAR_COAST_DEGREES, 0.15);
  assert.ok(nearCoastlineMetres(way([[51.1, 4.4], [51.5, 4.4]]), play) > 40000);
  assert.equal(nearCoastlineMetres(way([[51.19, 4.4], [51.5, 4.4]]), play), 0);
});
test('no geometry is zero', () => assert.equal(nearCoastlineMetres({}, play), 0));
