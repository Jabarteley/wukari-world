import assert from 'node:assert/strict';
import { test } from 'node:test';
import { localToShared, nearbyTiles, REGION_COVERAGE, sharedGeography, sharedWorld, tileAt } from './regions.ts';
import { toWorld } from './geography.ts';

test('campus and town share geographic coordinates across local origins without sharing presence namespaces', () => {
  const p = [0.00123456789, 0.00456789123] as const; // synthetic mathematical test only
  const shared = sharedWorld(p), back = sharedGeography(shared);
  assert.ok(Math.abs(back[0] - p[0]) < 1e-12 && Math.abs(back[1] - p[1]) < 1e-12);
  for (const origin of [[0, 0], [0.002, 0.003]] as const) {
    const converted = localToShared(origin, toWorld(origin, p));
    assert.ok(Math.abs(converted.x - shared.x) < 1e-8 && Math.abs(converted.z - shared.z) < 1e-8);
    assert.equal(tileAt('fuw-campus', converted).key, tileAt('fuw-campus', shared).key);
  }
  assert.notEqual(tileAt('fuw-campus', shared).key, tileAt('wukari-town', shared).key);
  assert.equal(REGION_COVERAGE['fuw-campus'].playerSpawn, null);
});
test('tile boundaries handle negatives, bounded neighborhoods and invalid values', () => {
  const tile = tileAt('fuw-campus', { x: -0.1, z: 256 });
  assert.equal(tile.column, -1); assert.equal(tile.row, 1);
  const neighbors = nearbyTiles(tile); assert.equal(neighbors.length, 9); assert.equal(new Set(neighbors.map(t => t.key)).size, 9);
  assert.throws(() => tileAt('fuw-campus', { x: NaN, z: 0 })); assert.throws(() => nearbyTiles(tile, 4));
});
