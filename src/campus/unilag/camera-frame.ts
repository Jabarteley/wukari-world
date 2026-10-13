/**
 * Preview camera framing per landmark, pure and testable. The first guess faces the entrance from the +z side
 * (anchors sit 2 m in front of the footprint). If a building or a tree is in the way (a narrow slot between
 * wings, a trunk in front of the lens) the framing is searched for the nearest angle, tilt and distance that
 * leaves the lens and its sight line clear. A camera never sits within CAMERA_CLEARANCE metres of a building or tree.
 */
import { CAMPUS_MAP } from './map.generated.ts';
import { boundsOf, pointInRing } from './geo.ts';
import type { MetreRing } from './geo.ts';
import { standalones } from './standalone.ts';
import { ANCHORS, BUILDINGS } from './layout.ts';
import { CAMPUS_TREES } from './landscape.ts';
import { campusPlan } from './life-plan.ts';

export const CAMERA_CLEARANCE = 3;
export interface Frame { yaw: number; tilt: number; distance: number; lookHeight: number; dx: number; dz: number }
interface Box { ring: MetreRing; x0: number; z0: number; x1: number; z1: number; h: number }

let cache: Box[] | null = null;
export function blockers(): Box[] {
  if (cache) return cache;
  const all = [...CAMPUS_MAP.buildings.map(b => ({ ring: b.ring, h: b.osm.id === 653186158 ? 43 : b.height })), ...standalones().map(s => ({ ring: s.building.ring, h: s.building.height }))];
  return cache = all.map(({ ring, h }) => { const [x0, z0, x1, z1] = boundsOf(ring); return { ring, x0, z0, x1, z1, h }; });
}
const edgeDistance = (ring: MetreRing, x: number, z: number) => {
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const [ax, az] = ring[i - 1]!, [bx, bz] = ring[i]!, dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
};
const TREE_RADIUS: Record<string, number> = { mango: 4.8, flame: 5, almond: 5, palm: 3.2, coconut: 3, frangi: 2.4 };
let planted: Array<{ x: number; z: number; r: number }> | null = null;
const plantedTrees = () => planted ??= campusPlan().filter(p => p.t in TREE_RADIUS).map(p => ({ x: p.x, z: p.z, r: TREE_RADIUS[p.t]! }));
/** Is the point inside, or within `margin` metres of, a building (up to its roof + 2 m) or a tree? */
export function occluded(x: number, y: number, z: number, margin = 0): string | null {
  for (const b of blockers()) {
    if (x < b.x0 - margin || x > b.x1 + margin || z < b.z0 - margin || z > b.z1 + margin || y > b.h + 7) continue; // roof plus rooftop plant, crowns and projecting beams
    if (pointInRing([x, z], b.ring) || edgeDistance(b.ring, x, z) <= margin) return 'building';
  }
  for (const t of plantedTrees()) if (Math.abs(t.x - x) <= t.r + margin && Math.abs(t.z - z) <= t.r + margin && y < 13 && Math.hypot(t.x - x, t.z - z) <= t.r + margin) return 'tree';
  for (const t of CAMPUS_TREES) {
    if (Math.abs(t.x - x) > 4 + margin || Math.abs(t.z - z) > 4 + margin) continue;
    // trunk .3 m, canopy about 4.4 x t.size wide between 4 and 10 m
    if (y < 10 * t.size && Math.hypot(t.x - x, t.z - z) < (y > 3 * t.size ? 4.4 * t.size : .6) + margin) return 'tree';
  }
  return null;
}

export const cameraPosition = (anchor: { x: number; z: number }, f: Frame) => ({
  x: anchor.x + f.dx + Math.sin(f.yaw) * Math.cos(f.tilt) * f.distance,
  y: Math.max(1.4, Math.sin(f.tilt) * f.distance + f.lookHeight),
  z: anchor.z + f.dz + Math.cos(f.yaw) * Math.cos(f.tilt) * f.distance,
});

/** True when the lens has CAMERA_CLEARANCE all round and the line to the focus passes through nothing. */
export function frameIsClear(anchor: { x: number; z: number }, f: Frame): boolean {
  const c = cameraPosition(anchor, f), fx = anchor.x + f.dx, fz = anchor.z + f.dz;
  if (occluded(c.x, c.y, c.z, CAMERA_CLEARANCE)) return false;
  for (let t = Math.max(.12, 6 / f.distance); t < .96; t += .06) if (occluded(fx + (c.x - fx) * t, f.lookHeight + (c.y - f.lookHeight) * t, fz + (c.z - fz) * t, 0)) return false;
  return true;
}

function firstGuess(id: string): Frame {
  const anchor = ANCHORS[id], base: Frame = { yaw: .55, tilt: .62, distance: 48, lookHeight: 2, dx: 0, dz: 0 };
  if (!anchor) return base;
  if (id === 'lagoon-front') return { ...base, yaw: -Math.PI / 2, tilt: .38, distance: 75 };
  if (id === 'senate') return { ...base, distance: 125 };
  if (id === 'main-gate') return base;
  let best: { h: number; size: number; face: number } | null = null, bestScore = Infinity;
  for (const b of blockers()) {
    const d = Math.hypot(Math.max(b.x0 - anchor.x, 0, anchor.x - b.x1), Math.max(b.z0 - anchor.z, 0, anchor.z - b.z1)), score = d - Math.min(b.h, 30) * .2;
    if (d < 14 && b.h > 3 && score < bestScore) { bestScore = score; best = { h: b.h, size: Math.max(b.x1 - b.x0, b.z1 - b.z0), face: d === 0 ? b.z1 + 2.5 - anchor.z : 0 }; }
  }
  const meta = BUILDINGS.find(item => item.id === id);
  if (meta?.kind === 'open-space') return { ...base, tilt: .42, distance: 62 };
  const h = best?.h ?? meta?.h ?? 0, size = best?.size ?? Math.max(meta?.w ?? 0, meta?.d ?? 0), face = best?.face ?? 0;
  if (!(h > 0)) return base;
  return { yaw: .3, tilt: .3, distance: Math.round(Math.min(95, Math.max(30, h * 1.7 + 14, size * .5 + 18))), lookHeight: Math.min(10, Math.max(2, h * .3)), dx: face ? Math.min(14, size * .22) : 0, dz: face };
}

const YAW_OFFSETS = [0, .35, -.35, .7, -.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI];
export function framePreset(id: string): Frame {
  const anchor = ANCHORS[id], first = firstGuess(id);
  if (!anchor || frameIsClear(anchor, first)) return first;
  for (const scale of [1, .8, .62, .48]) for (const lift of [0, .12, .26]) for (const turn of YAW_OFFSETS) {
    const f: Frame = { ...first, yaw: first.yaw + turn, tilt: Math.min(1.2, first.tilt + lift), distance: Math.max(16, first.distance * scale) };
    if (frameIsClear(anchor, f)) return f;
  }
  // Nothing fully clear (a courtyard ringed by tall wings): take the candidate whose arm runs furthest before it meets a wall,
  // pulling the camera in to that point so it never sits behind or inside one.
  let best: Frame | null = null, bestReach = 0;
  for (const scale of [1, .7, .5]) for (const lift of [0, .25, .5, .75]) for (const turn of YAW_OFFSETS) {
    const f: Frame = { ...first, yaw: first.yaw + turn, tilt: Math.min(1.25, first.tilt + lift), distance: Math.max(16, first.distance * scale) };
    const c = cameraPosition(anchor, f), fx = anchor.x + f.dx, fz = anchor.z + f.dz;
    let t = Math.max(.12, 6 / f.distance);
    for (; t < 1; t += .04) if (occluded(fx + (c.x - fx) * t, f.lookHeight + (c.y - f.lookHeight) * t, fz + (c.z - fz) * t, t > .8 ? CAMERA_CLEARANCE : 0)) break;
    const reach = (t - .08) * f.distance;
    if (reach > bestReach && t > .3) { bestReach = reach; best = { ...f, distance: Math.max(8, reach) }; }
  }
  return best ?? { ...first, tilt: 1.1, distance: Math.max(40, first.distance) };
}
