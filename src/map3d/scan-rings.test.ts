import test from 'node:test';
import assert from 'node:assert/strict';
import { scanRings } from './lga.ts';
import type { Point2 } from './types.ts';

/** The plain pass over every edge of every ring for every row, which scanRings must agree with. */
function plain(rings: readonly (readonly Point2[])[], x0: number, z0: number, cell: number, width: number, height: number, fill: (row: number, from: number, to: number) => void) {
  let minZ = Infinity, maxZ = -Infinity;
  for (const point of rings[0]!) { if (point[1] < minZ) minZ = point[1]; if (point[1] > maxZ) maxZ = point[1]; }
  const first = Math.max(0, Math.floor((minZ - z0) / cell)), last = Math.min(height - 1, Math.ceil((maxZ - z0) / cell));
  const hits: number[] = [];
  for (let row = first; row <= last; row++) {
    const z = z0 + (row + 0.5) * cell;
    hits.length = 0;
    for (const polygon of rings) for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [ax, az] = polygon[i]!, [bx, bz] = polygon[j]!;
      if ((az > z) !== (bz > z)) hits.push(((bx - ax) * (z - az)) / (bz - az) + ax);
    }
    hits.sort((a, b) => a - b);
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const from = Math.max(0, Math.ceil((hits[k]! - x0) / cell - 0.5)), to = Math.min(width - 1, Math.floor((hits[k + 1]! - x0) / cell - 0.5));
      if (to >= from) fill(row, from, to);
    }
  }
}
function random(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const ring = (cx: number, cz: number, r: number, count: number, rnd: () => number): Point2[] => Array.from({ length: count }, (_, i) => { const a = (i / count) * Math.PI * 2, d = r * (0.7 + rnd() * 0.3); return [Math.round((cx + Math.cos(a) * d) * 8) / 8, Math.round((cz + Math.sin(a) * d) * 8) / 8] as Point2; });

test('scanRings fills the same runs, in the same order, as a pass over every edge', () => {
  const rnd = random(11);
  for (let n = 0; n < 40; n++) {
    const rings = [ring(0, 0, 30, 20 + Math.floor(rnd() * 300), rnd), ...(n % 2 ? [ring(5, -4, 8, 12, rnd), ring(-12, 9, 5, 30, rnd)] : [])];
    for (const [cell, x0, z0] of [[0.25, -40, -40], [0.5, -35.3, -33.1], [1, -31, -31]] as const) {
      const size = Math.ceil(80 / cell), a: string[] = [], b: string[] = [];
      scanRings(rings, x0, z0, cell, size, size, (row, from, to) => a.push(`${row}:${from}:${to}`));
      plain(rings, x0, z0, cell, size, size, (row, from, to) => b.push(`${row}:${from}:${to}`));
      assert.deepEqual(a, b);
    }
  }
  const tiny: string[] = [];
  scanRings([[[0, 0], [1, 0], [1, 1]]], 0, 0, 0.1, 10, 3, (row, from, to) => tiny.push(`${row}:${from}:${to}`));
  const ref: string[] = [];
  plain([[[0, 0], [1, 0], [1, 1]]], 0, 0, 0.1, 10, 3, (row, from, to) => ref.push(`${row}:${from}:${to}`));
  assert.deepEqual(tiny, ref);
});
