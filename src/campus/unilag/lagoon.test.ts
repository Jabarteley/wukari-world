import test from 'node:test';
import assert from 'node:assert/strict';
import { lagoonStrips } from './lagoon.ts';
import type { Strip } from './lagoon.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import { isOffshoreMarsh, pointInRing } from './geo.ts';

const tris = (s: Strip) => { const out: number[][] = []; for (let i = 0; i < s.idx.length; i += 3) out.push([0, 1, 2].flatMap(k => [s.pos[s.idx[i + k]! * 3]!, s.pos[s.idx[i + k]! * 3 + 2]!])); return out; };
const inside = (p: number[], t: number[]) => {
  const side = (ax: number, az: number, bx: number, bz: number) => (bx - ax) * (p[1]! - az) - (bz - az) * (p[0]! - ax);
  const a = side(t[0]!, t[1]!, t[2]!, t[3]!), b = side(t[2]!, t[3]!, t[4]!, t[5]!), c = side(t[4]!, t[5]!, t[0]!, t[1]!);
  return (a > 1e-6 && b > 1e-6 && c > 1e-6) || (a < -1e-6 && b < -1e-6 && c < -1e-6);
};

test('the offshore marsh is not painted as campus lawn; the inland wetland is', () => {
  const marsh = CAMPUS_MAP.surfaces.filter(s => s.kind === 'wetland');
  assert.ok(marsh.length >= 2);
  const byId = new Map(marsh.map(s => [s.osm.id, isOffshoreMarsh(s, CAMPUS_MAP.boundary)]));
  assert.equal(byId.get(595880631), true, 'the 469,000 m2 lagoon marsh sits at water level');
  assert.equal(byId.get(745747977), false, 'the wetland inside the campus stays on the ground');
});

test('lagoon strips face up, stay finite and lie seaward of the campus boundary', () => {
  const { water } = lagoonStrips();
  assert.ok(water.idx.length > 600);
  assert.ok(water.pos.every(Number.isFinite));
  const list = tris(water);
  const down = list.filter(t => (t[2]! - t[0]!) * (t[5]! - t[1]!) - (t[3]! - t[1]!) * (t[4]! - t[0]!) > 1e-6).length;
  assert.ok(down / list.length < .02, `back-facing (folded) triangles ${down}/${list.length}`);
  // water must not flood the campus: a triangle centre (not its rim) inside the boundary means the strip crossed the shore
  const ringDistance = (x: number, z: number) => { let best = Infinity; for (let i = 1; i < CAMPUS_MAP.boundary.length; i++) { const [ax, az] = CAMPUS_MAP.boundary[i - 1]!, [bx, bz] = CAMPUS_MAP.boundary[i]!, dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return best; };
  const flooded = list.filter(t => { const x = (t[0]! + t[2]! + t[4]!) / 3, z = (t[1]! + t[3]! + t[5]!) / 3; return pointInRing([x, z], CAMPUS_MAP.boundary) && ringDistance(x, z) > 3; }).length;
  assert.ok(flooded / list.length < .03, `flooded ${flooded}/${list.length}`);
});

test('water strips do not fold over each other (the cause of the streaked shoreline)', () => {
  const { water } = lagoonStrips();
  const list = tris(water), cx = list.map(t => [(t[0]! + t[2]! + t[4]!) / 3, (t[1]! + t[3]! + t[5]!) / 3]);
  const box = list.map(t => [Math.min(t[0]!, t[2]!, t[4]!), Math.min(t[1]!, t[3]!, t[5]!), Math.max(t[0]!, t[2]!, t[4]!), Math.max(t[1]!, t[3]!, t[5]!)]);
  let overlapped = 0;
  for (let i = 0; i < list.length; i++) for (let j = 0; j < list.length; j++) {
    if (i === j) continue;
    const c = cx[i]!, b = box[j]!;
    if (c[0]! < b[0]! || c[0]! > b[2]! || c[1]! < b[1]! || c[1]! > b[3]!) continue;
    if (inside(c, list[j]!)) { overlapped++; break; }
  }
  assert.ok(overlapped / list.length < .03, `folded triangles ${overlapped}/${list.length}`);
});
