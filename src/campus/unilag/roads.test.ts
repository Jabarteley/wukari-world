import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRoadLayers, cleanPieces, roadWidth, ROAD_MAX_WIDTH } from './roads.ts';
import type { FlatLayer } from './roads.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import type { CampusMapRoad, MetrePoint } from './geo.ts';

const road = (points: MetrePoint[], width = 6, highway = 'residential'): CampusMapRoad => ({ id: 'r' + Math.random(), osm: { type: 'way', id: 1, version: 1, timestamp: '' }, highway, points, width, widthSource: 'estimated' });
const distToPolyline = (p: MetrePoint, pts: readonly MetrePoint[]) => {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1]!, [bx, bz] = pts[i]!, dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / l2));
    best = Math.min(best, Math.hypot(p[0] - ax - dx * t, p[1] - az - dz * t));
  }
  return best;
};
const trianglesFaceUp = (layer: FlatLayer) => {
  for (let i = 0; i < layer.idx.length; i += 3) {
    const [a, b, c] = [layer.idx[i]!, layer.idx[i + 1]!, layer.idx[i + 2]!].map(k => [layer.pos[k * 3]!, layer.pos[k * 3 + 2]!]) as MetrePoint[];
    // three.js front face is counter-clockwise seen from +y: (b-a)x(c-a) along y is negative in x/z coordinates
    const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (!(cross < 0)) return false;
  }
  return true;
};
const maxReach = (layer: FlatLayer, pts: readonly MetrePoint[]) => { let m = 0; for (let i = 0; i < layer.pos.length; i += 3) m = Math.max(m, distToPolyline([layer.pos[i]!, layer.pos[i + 2]!], pts)); return m; };

test('road ribbons face up and never spike past the clamped miter at bends, hairpins and loops', () => {
  const shapes: MetrePoint[][] = [
    [[0, 0], [30, 0], [30, 30]],                              // right-angle bend
    [[0, 0], [40, 0], [2, 3]],                                // near hairpin
    [[0, 0], [30, 0], [60, 4], [90, 0]],                      // gentle zig-zag
    [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]],             // loop
  ];
  for (const points of shapes) {
    const layers = buildRoadLayers([road(points, 6)]);
    for (const l of [layers.verge, layers.surface]) {
      assert.ok(l.idx.length > 0);
      assert.ok(trianglesFaceUp(l), 'all triangles face up');
      assert.ok(maxReach(l, points) <= (3 + .9) / .55 + 1e-6, `spike: ${maxReach(l, points)}`);
    }
  }
});

test('sharp turns split the way instead of folding it', () => {
  assert.equal(cleanPieces([[0, 0], [40, 0], [2, 3]]).length, 2);
  assert.equal(cleanPieces([[0, 0], [30, 0], [30, 30]]).length, 1);
  assert.equal(cleanPieces([[0, 0], [0.1, 0], [10, 0]]).length, 1);
});

test('every mapped road is cleanly ribboned, narrow and cheap', () => {
  for (const r of CAMPUS_MAP.roads) assert.ok(roadWidth(r) <= ROAD_MAX_WIDTH);
  const layers = buildRoadLayers(CAMPUS_MAP.roads);
  const triangles = Object.values(layers).reduce((n, l) => n + l.idx.length / 3, 0);
  for (const l of Object.values(layers)) { assert.ok(trianglesFaceUp(l)); assert.ok(l.pos.every(Number.isFinite)); }
  assert.ok(triangles < 14000, `road triangles ${triangles}`);
  assert.ok(layers.marks.idx.length > 0, 'centre lines and crossings exist');
});

test('main junctions get zebra crossings and ends meeting another road stay square', () => {
  const t = [road([[-50, 0], [0, 0], [50, 0]], 7), road([[0, 0], [0, 50]], 7)];
  const withJunction = buildRoadLayers(t).marks.idx.length;
  const without = buildRoadLayers([t[0]!]).marks.idx.length;
  assert.ok(withJunction > without + 12, 'junction adds crossing bars');
  const lone = buildRoadLayers([road([[0, 0], [0, 50]], 7)]).surface.idx.length;
  const joined = buildRoadLayers([road([[0, 0], [0, 50]], 7), road([[-50, 0], [0, 0], [50, 0]], 7)]).surface.idx.length;
  assert.ok(joined < lone + 3 * 12, 'no rounded caps at the junction');
});
