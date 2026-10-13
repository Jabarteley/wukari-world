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
/** Props a camera must not sit beside: security booths, kiosks, stalls, generator houses and lamp posts (radius, height), plus the gate arch. */
const PROP_SOLID: Record<string, [number, number]> = { booth: [1.8, 3.2], guard: [2.2, 3.2], kiosk: [1.8, 3.5], stall: [2.2, 3.6], gen: [2.2, 3], lamp: [.4, 6.6], mast: [.5, 12.5], mapboard: [1.6, 3] };
const TREE_RADIUS: Record<string, number> = { mango: 4.8, flame: 5, almond: 5, palm: 3.2, coconut: 3, frangi: 2.4 };
interface Round { x: number; z: number; r: number; h: number }

// ---- 24 m buckets so a probe only looks at its neighbours ----
const CELL = 24;
const cellKey = (i: number, j: number) => i * 100003 + j;
let index: { buildings: Map<number, Box[]>; rounds: Map<number, Round[]>; roads: Map<number, Array<{ ax: number; az: number; bx: number; bz: number; half: number }>> } | null = null;
function buckets() {
  if (index) return index;
  const buildings = new Map<number, Box[]>(), rounds = new Map<number, Round[]>(), roads = new Map<number, Array<{ ax: number; az: number; bx: number; bz: number; half: number }>>();
  const add = <T>(map: Map<number, T[]>, item: T, x0: number, z0: number, x1: number, z1: number) => {
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) { const k = cellKey(i, j); (map.get(k) ?? map.set(k, []).get(k)!).push(item); }
  };
  for (const b of blockers()) add(buildings, b, b.x0 - 8, b.z0 - 8, b.x1 + 8, b.z1 + 8);
  const rs: Round[] = [
    ...campusPlan().filter(p => p.t in PROP_SOLID).map(p => ({ x: p.x, z: p.z, r: PROP_SOLID[p.t]![0], h: PROP_SOLID[p.t]![1], kind: 'prop' })),
    // the gate pylons and truss (world z = the arch's local x; they stand on x = 0)
    ...[-16, -12, -6, 0, 6, 12, 16].map(z => ({ x: 0, z, r: Math.abs(z) % 16 === 0 ? 2.6 : 3, h: 13.5, kind: 'prop' })),
    ...campusPlan().filter(p => p.t in TREE_RADIUS).map(p => ({ x: p.x, z: p.z, r: TREE_RADIUS[p.t]!, h: 13, kind: 'tree' })),
    ...CAMPUS_TREES.map(t => ({ x: t.x, z: t.z, r: 4.4 * t.size, h: 10 * t.size, kind: 'tree' })),
  ] as Array<Round & { kind: string }>;
  for (const r of rs) add(rounds, r, r.x - r.r - 8, r.z - r.r - 8, r.x + r.r + 8, r.z + r.r + 8);
  for (const road of CAMPUS_MAP.roads) for (let i = 1; i < road.points.length; i++) {
    const [ax, az] = road.points[i - 1]!, [bx, bz] = road.points[i]!, half = Math.min(road.width, 8) / 2 + 1.8;
    add(roads, { ax, az, bx, bz, half }, Math.min(ax, bx) - half, Math.min(az, bz) - half, Math.max(ax, bx) + half, Math.max(az, bz) + half);
  }
  return index = { buildings, rounds, roads };
}
/** Is the ground point on a road or its pavement? */
export function onRoad(x: number, z: number): boolean {
  for (const r of buckets().roads.get(cellKey(Math.floor(x / CELL), Math.floor(z / CELL))) ?? []) {
    const dx = r.bx - r.ax, dz = r.bz - r.az, t = Math.max(0, Math.min(1, ((x - r.ax) * dx + (z - r.az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - r.ax - dx * t, z - r.az - dz * t) <= r.half) return true;
  }
  return false;
}
/**
 * Is the point inside, or within `margin` metres of, a building (up to its roof + `roof` metres), a gate/booth/lamp prop or a tree?
 * A camera uses roof = 7 (rooftop plant, crowns, projecting beams); a sight ray uses roof = 0.
 */
export function occluded(x: number, y: number, z: number, margin = 0, roof = 7): string | null {
  const k = cellKey(Math.floor(x / CELL), Math.floor(z / CELL)), { buildings, rounds } = buckets();
  for (const b of buildings.get(k) ?? []) {
    if (x < b.x0 - margin || x > b.x1 + margin || z < b.z0 - margin || z > b.z1 + margin || y > b.h + roof) continue;
    if (pointInRing([x, z], b.ring) || (margin > 0 && edgeDistance(b.ring, x, z) <= margin)) return 'building';
  }
  for (const r of (rounds.get(k) ?? []) as Array<Round & { kind: string }>) if (y < r.h && Math.hypot(r.x - x, r.z - z) <= r.r + margin) return r.kind;
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
  for (let t = Math.max(.12, 6 / f.distance); t < .96; t += .06) { const hit = occluded(fx + (c.x - fx) * t, f.lookHeight + (c.y - f.lookHeight) * t, fz + (c.z - fz) * t, 0, 0); if (hit && hit !== 'tree') return false; }
  return true;
}

function firstGuess(id: string): Frame {
  const anchor = ANCHORS[id], base: Frame = { yaw: .55, tilt: .62, distance: 48, lookHeight: 2, dx: 0, dz: 0 };
  if (!anchor) return base;
  if (id === 'lagoon-front') return { ...base, yaw: -Math.PI / 2, tilt: .38, distance: 75 };
  if (id === 'senate') return { ...base, distance: 125 };
  if (id === 'main-gate') return base;
  // The stadium (pitch, track, stands, floodlights) lies east of the anchor: look east at it, not back at the blocks behind the camera.
  if (id === 'sports-centre') return { yaw: -Math.PI / 2, tilt: .3, distance: 75, lookHeight: 5, dx: 55, dz: 30 };
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


// ---- what the frame actually shows: a coarse grid of view rays against the same solids ----
export interface ViewScore { near: number; blocked: number; lawn: number; water: number; signVisible: boolean | null; penalty: number }
const FOV = 48 * Math.PI / 180;
const GRID: Array<[number, number]> = (() => { const g: Array<[number, number]> = []; for (let i = 0; i < 7; i++) for (let j = 0; j < 9; j++) g.push([(i + .5) / 7 * 2 - 1, (j + .5) / 9 * 2 - 1]); return g; })();

function signOf(id: string) {
  const a = ANCHORS[id]; if (!a) return null;
  // a ground sign planted inside a footprint is hidden by its own building: the facade sign is then framed by the entrance focus instead
  const p = campusPlan().find(q => q.t === 'sign' && q.label === a.label && Math.hypot(q.x - a.x, q.z - a.z) < 20);
  return p && !occluded(p.x, 1.6, p.z, 0, 0) ? p : null;
}

/** Share of the frame filled by solids within 14 m, by bare lawn, and by lagoon, for a phone and a desktop aspect (the worse of the two). */
export function scoreFrame(id: string, f: Frame): ViewScore {
  const anchor = ANCHORS[id]!, c = cameraPosition(anchor, f), fx = anchor.x + f.dx, fz = anchor.z + f.dz, fy = f.lookHeight;
  let fwd: [number, number, number] = [fx - c.x, fy - c.y, fz - c.z]; const fl = Math.hypot(...fwd); fwd = [fwd[0] / fl, fwd[1] / fl, fwd[2] / fl];
  let rx = fwd[2], rz = -fwd[0]; const rl = Math.hypot(rx, rz) || 1; rx /= rl; rz /= rl;           // screen right (horizontal)
  const r3: [number, number, number] = [rx, 0, rz];
  const u3: [number, number, number] = [r3[1] * fwd[2] - r3[2] * fwd[1], r3[2] * fwd[0] - r3[0] * fwd[2], r3[0] * fwd[1] - r3[1] * fwd[0]];
  const tanV = Math.tan(FOV / 2);
  let worst = { near: 0, blocked: 0, lawn: 0, water: 0 };
  for (const aspect of [390 / 844, 1280 / 800]) {
    let near = 0, blocked = 0, lawn = 0, water = 0;
    for (const [gx, gy] of GRID) {
      const dx = fwd[0] + r3[0] * gx * tanV * aspect + u3[0] * gy * tanV, dy = fwd[1] + r3[1] * gx * tanV * aspect + u3[1] * gy * tanV, dz = fwd[2] + r3[2] * gx * tanV * aspect + u3[2] * gy * tanV;
      const dl = Math.hypot(dx, dy, dz);
      for (let t = 1.5; t < 220; t += t < 24 ? 1.5 : 5) {
        const x = c.x + dx / dl * t, y = c.y + dy / dl * t, z = c.z + dz / dl * t;
        if (y <= 0) { if (!pointInRing([x, z], CAMPUS_MAP.boundary)) water++; else if (!onRoad(x, z)) lawn++; break; }
        const hit = occluded(x, y, z, 0, 0);
        if (hit) { if (t < 14) near++; if (hit === 'building' && t < 45) blocked++; break; }
      }
    }
    const n = GRID.length;
    worst = { near: Math.max(worst.near, near / n), blocked: Math.max(worst.blocked, blocked / n), lawn: Math.max(worst.lawn, lawn / n), water: Math.max(worst.water, water / n) };
  }
  // a ground sign (or the entrance) must be in the frame, unobstructed, and not at its edge
  const sign = signOf(id);
  let signVisible: boolean | null = null;
  if (sign) {
    const px = sign.x - c.x, py = 1.6 - c.y, pz = sign.z - c.z, d = px * fwd[0] + py * fwd[1] + pz * fwd[2];
    const sx = (px * r3[0] + pz * r3[2]) / (d * tanV * (390 / 844)), sy = (px * u3[0] + py * u3[1] + pz * u3[2]) / (d * tanV);
    signVisible = d > 3 && Math.abs(sx) < .95 && Math.abs(sy) < .8;
    if (signVisible) for (let t = .08; t < .95; t += .06) if (occluded(c.x + px * t, c.y + py * t, c.z + pz * t, 0, 0)) { signVisible = false; break; }
  }
  const needSign = ['library', 'arts', 'law', 'auditorium', 'central-mosque', 'senate'].includes(id);
  const penalty = Math.max(0, worst.near - .15) * 12 + Math.max(0, worst.blocked - .4) * 8 + Math.max(0, worst.lawn - .35) * 6 + (needSign && signVisible === false ? 3 : 0) + (id === 'lagoon-front' ? Math.max(0, .15 - worst.water) * 30 : 0);
  return { ...worst, signVisible, penalty };
}

const YAW_OFFSETS = [0, .35, -.35, .7, -.7, 1.1, -1.1, 1.6, -1.6, 2.2, -2.2, Math.PI];
export function framePreset(id: string): Frame {
  const anchor = ANCHORS[id], first = firstGuess(id);
  if (!anchor) return first;
  // Gather clear candidates in preference order, then keep the best-scoring one (frame fill, lawn share, sign, lagoon).
  let best: Frame | null = null, bestPenalty = Infinity, seen = 0;
  const consider = (f: Frame) => {
    if (!frameIsClear(anchor, f)) return;
    const { penalty } = scoreFrame(id, f);
    if (penalty < bestPenalty - 1e-9) { bestPenalty = penalty; best = f; }
    seen++;
  };
  consider(first);
  outer: for (const scale of [1, .8, .62, .48, .36]) for (const lift of [0, -.1, .12, .26]) for (const turn of YAW_OFFSETS) {
    if (bestPenalty <= 0 || seen >= 140) break outer;
    consider({ ...first, yaw: first.yaw + turn, tilt: Math.min(1.2, first.tilt + lift), distance: Math.max(16, first.distance * scale) });
  }
  if (best) return best;
  // Nothing fully clear (a courtyard ringed by tall wings): take the candidate whose arm runs furthest before it meets a wall,
  // pulling the camera in to that point so it never sits behind or inside one.
  let reachFrame: Frame | null = null, bestReach = 0;
  for (const scale of [1, .7, .5]) for (const lift of [0, .25, .5, .75]) for (const turn of YAW_OFFSETS) {
    const f: Frame = { ...first, yaw: first.yaw + turn, tilt: Math.min(1.25, first.tilt + lift), distance: Math.max(16, first.distance * scale) };
    const c = cameraPosition(anchor, f), fx = anchor.x + f.dx, fz = anchor.z + f.dz;
    let t = Math.max(.12, 6 / f.distance);
    for (; t < 1; t += .04) if (occluded(fx + (c.x - fx) * t, f.lookHeight + (c.y - f.lookHeight) * t, fz + (c.z - fz) * t, t > .8 ? CAMERA_CLEARANCE : 0)) break;
    const reach = (t - .08) * f.distance;
    if (reach > bestReach && t > .3) { bestReach = reach; reachFrame = { ...f, distance: Math.max(8, reach) }; }
  }
  return reachFrame ?? { ...first, tilt: 1.1, distance: Math.max(40, first.distance) };
}
