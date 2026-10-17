import test from 'node:test';
import assert from 'node:assert/strict';
import { pointInPolygon } from './roads.ts';
import type { Point2 } from './types.ts';

/** The plain even-odd loop the banded version must agree with. */
function plain(x: number, z: number, polygon: readonly Point2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i]!, [bx, bz] = polygon[j]!;
    if ((az > z) !== (bz > z) && x < ((bx - ax) * (z - az)) / (bz - az) + ax) inside = !inside;
  }
  return inside;
}
function random(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('a long ring answers exactly as the plain loop does, for every point', () => {
  const rnd = random(7);
  for (const count of [48, 49, 200, 1500]) {
    // a wobbly ring with repeated heights (horizontal edges) and a spike, so the edges straddle the bands unevenly
    const ring: Point2[] = [];
    for (let i = 0; i < count; i++) { const angle = (i / count) * Math.PI * 2, r = 20 + Math.sin(angle * 7) * 6 + (i % 5 === 0 ? 4 : 0); ring.push([Math.round(Math.cos(angle) * r * 4) / 4, Math.round(Math.sin(angle) * r * 4) / 4]); }
    ring.push([ring[0]![0], ring[0]![1]]);
    for (let n = 0; n < 4000; n++) {
      const x = (rnd() - 0.5) * 70, z = (rnd() - 0.5) * 70;
      assert.equal(pointInPolygon(x, z, ring), plain(x, z, ring));
    }
    // points on the vertices' rows and exactly on vertices
    for (const [vx, vz] of ring) for (const dx of [-0.25, 0, 0.25]) assert.equal(pointInPolygon(vx + dx, vz, ring), plain(vx + dx, vz, ring));
    for (const z of [NaN, Infinity, -Infinity, 1e9, -1e9]) assert.equal(pointInPolygon(0, z, ring), plain(0, z, ring));
  }
});
test('a short ring and an empty one are unchanged', () => {
  assert.equal(pointInPolygon(1, 1, [[0, 0], [4, 0], [4, 4], [0, 4]]), true);
  assert.equal(pointInPolygon(5, 1, [[0, 0], [4, 0], [4, 4], [0, 4]]), false);
  assert.equal(pointInPolygon(0, 0, []), false);
});
