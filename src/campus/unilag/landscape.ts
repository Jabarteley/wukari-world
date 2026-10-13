import { CAMPUS_MAP } from './map.generated.ts';
import { boundsOf, pointInRing } from './geo.ts';

/** Decorative planting, not a surveyed tree inventory. Shared with collision. */
// Buildings and road segments are bucketed on a 48 m grid so each candidate only tests its neighbours (this module runs on campus entry).
const BUCKET = 48;
const key = (i: number, j: number) => `${i}:${j}`;
const footprints = CAMPUS_MAP.buildings.map(b => boundsOf(b.ring));
const segments = CAMPUS_MAP.roads.flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i]!, b, width: r.width })));
const buildingBuckets = new Map<string, Array<readonly [number, number, number, number]>>(), roadBuckets = new Map<string, typeof segments>();
const bucketed = <T>(map: Map<string, T[]>, item: T, x0: number, z0: number, x1: number, z1: number) => {
  for (let i = Math.floor(x0 / BUCKET); i <= Math.floor(x1 / BUCKET); i++) for (let j = Math.floor(z0 / BUCKET); j <= Math.floor(z1 / BUCKET); j++) { const k = key(i, j); (map.get(k) ?? map.set(k, []).get(k)!).push(item); }
};
for (const f of footprints) bucketed(buildingBuckets, f, f[0] - 7, f[1] - 7, f[2] + 7, f[3] + 7);
for (const s of segments) { const m = s.width / 2 + 7; bucketed(roadBuckets, s, Math.min(s.a[0], s.b[0]) - m, Math.min(s.a[1], s.b[1]) - m, Math.max(s.a[0], s.b[0]) + m, Math.max(s.a[1], s.b[1]) + m); }
const surfaceBoxes = CAMPUS_MAP.surfaces.map(s => ({ ring: s.ring, b: boundsOf(s.ring) }));

const trees: Array<{ x: number; z: number; size: number }> = [];
const [x0, z0, x1, z1] = CAMPUS_MAP.bounds;
for (let x = x0 + 12; x < x1; x += 27) for (let z = z0 + 12; z < z1; z += 27) {
  const seed = Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
  if (seed > .64) continue;
  const px = x + (seed - .5) * 14, pz = z + Math.sin(seed * 120) * 8;
  const cell = key(Math.floor(px / BUCKET), Math.floor(pz / BUCKET));
  if (buildingBuckets.get(cell)?.some(([a, b, c, d]) => px > a - 7 && px < c + 7 && pz > b - 7 && pz < d + 7)) continue;
  if (roadBuckets.get(cell)?.some(({ a: [ax, az], b: [bx, bz], width }) => {
    const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(px - ax - t * dx, pz - az - t * dz) < width / 2 + 7;
  })) continue;
  if (!pointInRing([px, pz], CAMPUS_MAP.boundary)) continue;
  if (surfaceBoxes.some(({ ring, b: [a, b, c, d] }) => px >= a && px <= c && pz >= b && pz <= d && pointInRing([px, pz], ring))) continue;
  trees.push({ x: px, z: pz, size: .75 + seed * .65 });
}
export const CAMPUS_TREES = trees;
