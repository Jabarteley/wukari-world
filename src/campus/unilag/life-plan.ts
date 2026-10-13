/** Pure-data decorative plan for the campus life layer (no rendering imports, so walk navigation can read it). */
import { CAMPUS_MAP } from './map.generated.ts';
import { ANCHORS, BUILDINGS } from './layout.ts';
import { boundsOf, pointInRing } from './geo.ts';
import { CAMPUS_TREES } from './landscape.ts';

export type PropKind = 'palm' | 'flame' | 'almond' | 'lamp' | 'bench' | 'sign' | 'kiosk' | 'car' | 'keke' | 'bus' | 'goal' | 'hoop' | 'net'
  | 'student' | 'gen' | 'hedge' | 'bump' | 'zebra' | 'guard' | 'pier' | 'canoe' | 'board' | 'bin'
  | 'mango' | 'coconut' | 'frangi' | 'shrub' | 'bed' | 'paving' | 'fountain' | 'terrace' | 'wall' | 'booth' | 'stall';
export interface Prop { t: PropKind; x: number; z: number; ry: number; v: number; label?: string; w?: number; d?: number }

export const hash = (n: number) => Math.abs(Math.sin(n * 12.9898 + 4.1414) * 43758.5453) % 1;
const FOOT = new Set(['footway', 'path', 'pedestrian', 'steps']);
export const WATERFRONT_MIN_X = 450;

/* ---------- decorative plan (computed once) ---------- */
let planCache: Prop[] | null = null;
export const segs = CAMPUS_MAP.roads.flatMap(r => r.points.slice(1).map((b, i) => ({ a: r.points[i]!, b, w: r.width, hw: r.highway })));
const footprints = CAMPUS_MAP.buildings.map(b => boundsOf(b.ring));
const CELL = 48;
const grid = new Map<string, typeof segs>();
for (const sg of segs) {
  const x0 = Math.floor((Math.min(sg.a[0], sg.b[0]) - sg.w - 2) / CELL), x1 = Math.floor((Math.max(sg.a[0], sg.b[0]) + sg.w + 2) / CELL);
  const z0 = Math.floor((Math.min(sg.a[1], sg.b[1]) - sg.w - 2) / CELL), z1 = Math.floor((Math.max(sg.a[1], sg.b[1]) + sg.w + 2) / CELL);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) { const k = `${i}:${j}`; (grid.get(k) ?? grid.set(k, []).get(k)!).push(sg); }
}
const bgrid = new Map<string, number[][]>();
for (const f of footprints) {
  for (let i = Math.floor((f[0] - 8) / CELL); i <= Math.floor((f[2] + 8) / CELL); i++) for (let j = Math.floor((f[1] - 8) / CELL); j <= Math.floor((f[3] + 8) / CELL); j++) { const k = `${i}:${j}`; (bgrid.get(k) ?? bgrid.set(k, []).get(k)!).push(f as number[]); }
}
const surfaceBoxes = CAMPUS_MAP.surfaces.map(s => ({ ring: s.ring, b: boundsOf(s.ring) }));
const offRoadAndBuilding = (x: number, z: number, buildingMargin = 2.5): boolean => {
  for (const sg of grid.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`) ?? []) {
    const { a: [ax, az], b: [bx, bz], w } = sg, dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
    if (Math.hypot(x - ax - t * dx, z - az - t * dz) < w / 2 + 1.6) return false;
  }
  for (const [a, b, c, d] of bgrid.get(`${Math.floor(x / CELL)}:${Math.floor(z / CELL)}`) ?? []) if (x > a! - buildingMargin && x < c! + buildingMargin && z > b! - buildingMargin && z < d! + buildingMargin) return false;
  if (!pointInRing([x, z], CAMPUS_MAP.boundary)) return false;
  for (const { ring, b: [a, b, c, d] } of surfaceBoxes) if (x >= a && x <= c && z >= b && z <= d && pointInRing([x, z], ring)) return false;
  return true;
};

/** Outward unit normal (towards the lagoon) of boundary edge i, using the ring itself to decide the side. */
function outward(ax: number, az: number, bx: number, bz: number): [number, number] {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
  let nx = dz / l, nz = -dx / l;
  const mx = (ax + bx) / 2, mz = (az + bz) / 2;
  if (pointInRing([mx + nx * 1.5, mz + nz * 1.5], CAMPUS_MAP.boundary)) { nx = -nx; nz = -nz; }
  return [nx, nz];
}
const boundaryEdges = (shore: boolean) => {
  const b = CAMPUS_MAP.boundary, out: Array<{ ax: number; az: number; bx: number; bz: number; nx: number; nz: number; len: number }> = [];
  for (let i = 1; i < b.length; i++) {
    const [ax, az] = b[i - 1]!, [bx, bz] = b[i]!, len = Math.hypot(bx - ax, bz - az);
    if (len < 4 || ((ax + bx) / 2 >= WATERFRONT_MIN_X) !== shore) continue;
    const [nx, nz] = outward(ax, az, bx, bz);
    out.push({ ax, az, bx, bz, nx, nz, len });
  }
  return out;
};
export const shoreEdges = () => boundaryEdges(true);
/** Edges where the campus meets the Akoka/Yaba town side rather than the lagoon. */
export const landEdges = () => boundaryEdges(false);

export function campusPlan(): Prop[] {
  if (planCache) return planCache;
  const p: Prop[] = [];
  // Avenue trees and street lamps along the through roads.
  let n = 0;
  for (const r of CAMPUS_MAP.roads) {
    if (r.highway !== 'secondary' && r.highway !== 'tertiary') continue;
    let carry = 0, lampCarry = 0;
    for (let i = 1; i < r.points.length; i++) {
      const [ax, az] = r.points[i - 1]!, [bx, bz] = r.points[i]!, len = Math.hypot(bx - ax, bz - az);
      if (len < .5) continue;
      const ux = (bx - ax) / len, uz = (bz - az) / len, ry = Math.atan2(ux, uz);
      for (let d = carry; d < len; d += 24 + hash(n) * 8) {
        n++;
        const side = n % 2 ? 1 : -1, off = r.width / 2 + 3.4, x = ax + ux * d - uz * side * off, z = az + uz * d + ux * side * off;
        if (!offRoadAndBuilding(x, z, 3)) continue;
        const h = hash(n * 3.7);
        const kind = h < .2 ? 'palm' : h < .3 ? 'coconut' : h < .5 ? 'mango' : h < .66 ? 'almond' : h < .78 ? 'flame' : 'frangi';
        p.push({ t: kind, x, z, ry: h * 6.28, v: hash(n * 9.1) });
      }
      carry = (carry + Math.ceil(Math.max(0, len - carry) / 24) * 24) - len;
      for (let d = lampCarry; d < len; d += 46) {
        n++;
        const side = n % 2 ? -1 : 1, off = r.width / 2 + 1.9, x = ax + ux * d - uz * side * off, z = az + uz * d + ux * side * off;
        if (offRoadAndBuilding(x, z, 1.5)) p.push({ t: 'lamp', x, z, ry: ry + (side > 0 ? 0 : Math.PI), v: 0 });
      }
      lampCarry = Math.max(0, lampCarry + Math.ceil(Math.max(0, len - lampCarry) / 46) * 46 - len);
    }
  }
  // Lagoon promenade: palms, benches, lamps along the shore edge.
  let k = 0;
  for (const e of shoreEdges()) {
    const ux = (e.bx - e.ax) / e.len, uz = (e.bz - e.az) / e.len;
    for (let d = 3; d < e.len - 1; d += 9) {
      k++;
      const inset = 3.2, x = e.ax + ux * d - e.nx * inset, z = e.az + uz * d - e.nz * inset;
      if (!offRoadAndBuilding(x, z, 1.5)) continue;
      const ry = Math.atan2(e.nx, e.nz);
      if (k % 6 === 0) p.push({ t: 'lamp', x, z, ry, v: 0 });
      else if (k % 6 === 3) p.push({ t: 'bench', x: x - e.nx * .2, z: z - e.nz * .2, ry, v: 0 });
      else if (k % 2 === 0) p.push({ t: k % 4 === 0 ? 'coconut' : 'palm', x, z, ry: hash(k) * 6.28, v: hash(k * 2.3) });
    }
  }
  // Lagoon pier with fishing canoes at the Lagoon Front.
  const lf = ANCHORS['lagoon-front'];
  if (lf) {
    let best: ReturnType<typeof shoreEdges>[number] | null = null, bd = 1e9, bt = 0;
    for (const e of shoreEdges()) {
      const dx = e.bx - e.ax, dz = e.bz - e.az, t = Math.max(0, Math.min(1, ((lf.x - e.ax) * dx + (lf.z - e.az) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(lf.x - e.ax - t * dx, lf.z - e.az - t * dz);
      if (d < bd) { bd = d; best = e; bt = t; }
    }
    if (best) {
      const x = best.ax + (best.bx - best.ax) * bt, z = best.az + (best.bz - best.az) * bt, ry = Math.atan2(best.nx, best.nz);
      p.push({ t: 'pier', x, z, ry, v: 0 });
      for (let c = 0; c < 7; c++) {
        const along = (c - 3) * 11 + hash(c) * 5, dist = 7 + (c % 3) * 14 + hash(c * 5) * 9, ux = -best.nz, uz = best.nx;
        p.push({ t: 'canoe', x: x + best.nx * dist + ux * along, z: z + best.nz * dist + uz * along, ry: ry + Math.PI / 2 + (hash(c * 7) - .5) * .5, v: c });
      }
    }
  }
  // Landmark dressing from the anchors: each landmark gets its own composition (plaza, garden, shade, car park, palm court).
  const kindOf = new Map(BUILDINGS.map(b => [b.id, b.kind]));
  let a = 0;
  for (const [id, anchor] of Object.entries(ANCHORS)) {
    a++;
    const kind = kindOf.get(id), { x, z } = anchor, r = hash(a * 7.13), r2 = hash(a * 3.71), r3 = hash(a * 5.57);
    if (id === 'main-gate') continue;
    const built = kind === 'faculty' || kind === 'academic' || kind === 'administration' || kind === 'hall' || kind === 'services' || kind === 'worship';
    if (built) {
      const side = r2 < .5 ? -1 : 1, kinds: Array<'plaza' | 'garden' | 'shade' | 'carpark' | 'palms'> = ['plaza', 'garden', 'shade', 'carpark', 'palms'], style = kinds[Math.floor(r * 5)]!;
      if (r3 < .8) p.push({ t: 'sign', x: x + side * (5 + r2 * 4), z: z + 2.4 + r3, ry: 0, v: a, label: anchor.label });
      if (style === 'plaza') {
        p.push({ t: 'paving', x, z: z + 6, ry: 0, v: a, w: 18, d: 9 }, { t: 'bench', x: x - 5, z: z + 7, ry: Math.PI, v: 0 }, { t: 'bench', x: x + 5, z: z + 7, ry: Math.PI, v: 0 }, { t: 'lamp', x: x - 9, z: z + 4, ry: 0, v: 0 }, { t: 'mango', x: x + 12, z: z + 7, ry: r2 * 6, v: r });
        p.push({ t: 'student', x: x - 5, z: z + 8, ry: 0, v: a * 3 }, { t: 'student', x: x + 1, z: z + 5, ry: 2, v: a * 3 + 1 }, { t: 'bin', x: x + 8, z: z + 4, ry: 0, v: a });
      } else if (style === 'garden') {
        for (let i = 0; i < 3; i++) p.push({ t: 'bed', x: x - 7 + i * 7, z: z + 5.5 + (i % 2), ry: 0, v: a + i });
        p.push({ t: 'hedge', x: x + 2, z: z + 2.4, ry: 0, v: 1, w: 8 }, { t: 'frangi', x: x - 10, z: z + 6, ry: r * 6, v: r2 }, { t: 'frangi', x: x + 11, z: z + 8, ry: r2 * 6, v: r3 }, { t: 'shrub', x: x - 3, z: z + 9, ry: 0, v: a }, { t: 'shrub', x: x + 6, z: z + 10, ry: 0, v: a + 1 });
        p.push({ t: 'bench', x: x + 8, z: z + 6, ry: Math.PI, v: 0 }, { t: 'student', x: x + 8.3, z: z + 7.2, ry: 0, v: a * 3 + 2 });
      } else if (style === 'shade') {
        p.push({ t: 'mango', x: x + 6, z: z + 8, ry: r * 6, v: r2 }, { t: 'almond', x: x - 9, z: z + 9, ry: r2 * 6, v: r }, { t: 'bench', x: x + 4, z: z + 8, ry: 0.4, v: 0 }, { t: 'bench', x: x - 7, z: z + 8.5, ry: -0.5, v: 0 }, { t: 'board', x: x - 12, z: z + 3, ry: 0, v: a }, { t: 'bin', x: x + 2, z: z + 5, ry: 0, v: a });
        for (let i = 0; i < 3; i++) p.push({ t: 'student', x: x + 3 + i * 1.1, z: z + 9.3, ry: Math.PI, v: a * 3 + i });
      } else if (style === 'carpark') {
        p.push({ t: 'paving', x, z: z + 8, ry: 0, v: a + 3, w: 24, d: 10 });
        for (let i = 0; i < 3 + Math.floor(r2 * 3); i++) p.push({ t: i % 4 === 3 ? 'keke' : 'car', x: x - 9 + i * 4.2, z: z + 9, ry: Math.PI / 2 * (i % 2 ? 1 : -1) + Math.PI / 2, v: a + i });
        p.push({ t: 'lamp', x: x - 12, z: z + 5, ry: 0, v: 0 }, { t: 'lamp', x: x + 13, z: z + 5, ry: 0, v: 0 }, { t: 'hedge', x: x + 4, z: z + 3, ry: 0, v: 0, w: 6 }, { t: 'shrub', x: x - 4, z: z + 3, ry: 0, v: a });
      } else {
        for (const sx of [-1, 1]) p.push({ t: 'palm', x: x + sx * 7.5, z: z + 5, ry: sx, v: .8 + r2 * .2 }, { t: 'hedge', x: x + sx * 4, z: z + 3.2, ry: 0, v: 2, w: 4 });
        p.push({ t: 'paving', x, z: z + 5, ry: 0, v: a + 5, w: 10, d: 6 }, { t: 'bench', x: x - 3, z: z + 9, ry: Math.PI, v: 0 }, { t: 'bench', x: x + 3, z: z + 9, ry: Math.PI, v: 0 }, { t: 'student', x: x - 3, z: z + 10.2, ry: 0, v: a * 3 });
      }
    }
    if (kind === 'hall' || id === 'university-bookshop' || id === 'amphitheatre') p.push({ t: 'kiosk', x: x + 14 + r * 4, z: z + 5, ry: 0, v: a });
    if (id === 'engineering' || id === 'medical-centre' || id === 'library' || id === 'senate') p.push({ t: 'gen', x: x + 22, z: z + 3, ry: 0, v: a });
    if (kind === 'open-space') p.push({ t: 'bench', x: x + 4, z: z + 4, ry: Math.PI, v: 0 }, { t: 'student', x: x + 4.7, z: z + 2.9, ry: 0, v: a }, { t: 'student', x: x + 3.4, z: z + 2.9, ry: 0, v: a + 5 });
  }
  // Lagoon Front plaza: paved promenade, seating terraces, fountain, planters and lighting (a fountain is listed for the Lagoon Front; layout is interpreted).
  if (lf) {
    let best: ReturnType<typeof shoreEdges>[number] | null = null, bd = 1e9, bt = 0;
    for (const e of shoreEdges()) {
      const dx = e.bx - e.ax, dz = e.bz - e.az, t = Math.max(0, Math.min(1, ((lf.x - e.ax) * dx + (lf.z - e.az) * dz) / (dx * dx + dz * dz)));
      const d = Math.hypot(lf.x - e.ax - t * dx, lf.z - e.az - t * dz);
      if (d < bd) { bd = d; best = e; bt = t; }
    }
    if (best) {
      const bx = best.ax + (best.bx - best.ax) * bt, bz = best.az + (best.bz - best.az) * bt, fx = best.nx, fz = best.nz, ux = -fz, uz = fx, ry = Math.atan2(fx, fz);
      const cx = bx - fx * 17, cz = bz - fz * 17, at = (lx: number, lz: number): [number, number] => [cx + ux * lx + fx * lz, cz + uz * lx + fz * lz];
      p.push({ t: 'paving', x: cx, z: cz, ry, v: 7, w: 40, d: 26 });
      let [qx, qz] = at(0, 11); p.push({ t: 'terrace', x: qx, z: qz, ry, v: 0, w: 30 });
      [qx, qz] = at(0, 0); p.push({ t: 'fountain', x: qx, z: qz, ry, v: 0 });
      for (const lx of [-15, -9, 9, 15]) { [qx, qz] = at(lx, -7); p.push({ t: 'bench', x: qx, z: qz, ry, v: 0 }); }
      for (const lx of [-19, 19]) for (const lz of [-11, 8]) { [qx, qz] = at(lx, lz); p.push({ t: 'lamp', x: qx, z: qz, ry, v: 0 }); }
      for (let i = 0; i < 6; i++) { [qx, qz] = at(-20 + i * 8, -13.5); p.push({ t: i % 2 ? 'palm' : 'coconut', x: qx, z: qz, ry: i, v: hash(i * 3.1) }); }
      for (const lx of [-6, 6]) for (const lz of [-3, 4]) { [qx, qz] = at(lx * 1.9, lz); p.push({ t: 'bed', x: qx, z: qz, ry, v: lx + lz + 9 }); }
      [qx, qz] = at(-5, -9); p.push({ t: 'student', x: qx, z: qz, ry, v: 61 }); [qx, qz] = at(4, 6); p.push({ t: 'student', x: qx, z: qz, ry: ry + 2, v: 62 });
      [qx, qz] = at(16, 3); p.push({ t: 'kiosk', x: qx, z: qz, ry, v: 3 });
    }
  }
  // Open lawns: jittered planting (shrubs, frangipani, flowerbeds, spreading trees) so no lawn stays bare for more than ~30 m.
  {
    const [bx0, bz0, bx1, bz1] = CAMPUS_MAP.bounds, STEP = 27;
    let g = 0;
    for (let gx = bx0 + 10; gx < bx1; gx += STEP) for (let gz = bz0 + 10; gz < bz1; gz += STEP) {
      g++;
      const h = hash(g * 1.31 + gx * .013), x = gx + (hash(g * 2.7) - .5) * STEP * .8, z = gz + (hash(g * 4.1) - .5) * STEP * .8;
      if (h > .86 || !offRoadAndBuilding(x, z, 4)) continue;
      if (CAMPUS_TREES.some(t => Math.abs(t.x - x) < 7 && Math.abs(t.z - z) < 7)) continue;
      const kind = h < .4 ? 'shrub' : h < .55 ? 'frangi' : h < .65 ? 'bed' : h < .76 ? 'mango' : h < .81 ? 'coconut' : 'almond';
      p.push({ t: kind, x, z, ry: h * 40, v: hash(g * 6.7) });
      if (kind === 'shrub') p.push({ t: 'shrub', x: x + 1.8, z: z + .8, ry: 0, v: hash(g * 9.1) });
    }
  }
  // Main gate: palm-lined entrance, boundary wall, booths, hawker stalls, a queue of vehicles, zebra, speed bumps.
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) p.push({ t: i % 3 === 1 ? 'coconut' : 'palm', x: 14 + i * 13, z: s * (4.5 + 3.5), ry: i * 2 + s, v: .9 });
  p.push({ t: 'guard', x: 5.5, z: -10, ry: 0, v: 0 }, { t: 'zebra', x: 24, z: 0, ry: Math.PI / 2, v: 0, w: 9 }, { t: 'bump', x: 40, z: 0, ry: Math.PI / 2, v: 0, w: 9 }, { t: 'bump', x: 150, z: 0, ry: Math.PI / 2, v: 0, w: 9 });
  p.push({ t: 'booth', x: 7, z: 12, ry: 0, v: 0 }, { t: 'booth', x: 14, z: -12.5, ry: Math.PI, v: 1 });
  const stalls: Array<[number, number, number]> = [[20, 13, 0], [27, 14, 1], [38, -13, 2], [45, -14, 3], [58, 13, 4]];
  stalls.forEach(([sx, sz, v]) => { p.push({ t: 'stall', x: sx, z: sz, ry: sz > 0 ? 0 : Math.PI, v }, { t: 'student', x: sx + 2, z: sz + (sz > 0 ? 1.6 : -1.6), ry: sz > 0 ? Math.PI : 0, v: 40 + v }); });
  p.push({ t: 'kiosk', x: 34, z: 13.5, ry: 0, v: 2 });
  const queue: PropKind[] = ['car', 'keke', 'bus', 'car', 'keke', 'car', 'bus', 'keke'];
  queue.forEach((t, i) => p.push({ t, x: 52 + i * 7, z: 2.3, ry: -Math.PI / 2, v: i * 3 + 1 }));
  [['car', 60], ['keke', 70], ['car', 82]].forEach(([t, x], i) => p.push({ t: t as PropKind, x: x as number, z: -2.3, ry: Math.PI / 2, v: i * 5 + 2 }));
  p.push({ t: 'keke', x: 28, z: 6.5, ry: Math.PI / 2, v: 0 }, { t: 'keke', x: 32.5, z: 6.6, ry: Math.PI / 2, v: 1 }, { t: 'student', x: 25, z: 9, ry: 1, v: 30 }, { t: 'student', x: 26, z: 9.4, ry: 2, v: 31 });
  for (const e of landEdges()) {
    const ux = (e.bx - e.ax) / e.len, uz = (e.bz - e.az) / e.len;
    for (let d = 3; d < e.len - 3; d += 6) {
      const x = e.ax + ux * d - e.nx * .9, z = e.az + uz * d - e.nz * .9;
      if (Math.hypot(x, z) < 15 || Math.hypot(x, z) > 150 || !offRoadAndBuilding(x, z, 0)) continue;
      p.push({ t: 'wall', x, z, ry: Math.atan2(ux, uz), v: 0, w: 6 });
    }
  }
  // Speed bumps and parked vehicles on the roads.
  let q = 0;
  for (const r of CAMPUS_MAP.roads) {
    if (FOOT.has(r.highway) || r.highway === 'track' || r.highway === 'rest_area') continue;
    for (let i = 1; i < r.points.length; i++) {
      const [ax, az] = r.points[i - 1]!, [bx, bz] = r.points[i]!, len = Math.hypot(bx - ax, bz - az);
      if (len < 25) continue;
      q++;
      const ux = (bx - ax) / len, uz = (bz - az) / len, ry = Math.atan2(ux, uz);
      if (r.highway !== 'service' && len > 55 && q % 3 === 0) p.push({ t: 'bump', x: ax + ux * len * .5, z: az + uz * len * .5, ry: ry + Math.PI / 2, v: 0, w: r.width });
      if (q % 4 === 0) {
        const side = q % 8 === 0 ? 1 : -1, off = r.width / 2 + 1.2, d = len * (.3 + hash(q) * .4), x = ax + ux * d - uz * side * off, z = az + uz * d + ux * side * off;
        if (offRoadAndBuilding(x, z, 1) || true) {
          const h = hash(q * 1.9);
          p.push({ t: h < .55 ? 'car' : h < .8 ? 'keke' : 'bus', x, z, ry, v: Math.floor(hash(q * 4.4) * 8) });
        }
      }
    }
  }
  // Sports kit on the mapped pitches.
  for (const s of CAMPUS_MAP.surfaces) {
    if (s.kind !== 'pitch') continue;
    const [x0, z0, x1, z1] = boundsOf(s.ring), w = x1 - x0, h = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, long = Math.max(w, h), short = Math.min(w, h), alongX = w >= h;
    if (long >= 40 && short >= 25) for (const e of [-1, 1]) p.push({ t: 'goal', x: alongX ? cx + e * (long / 2 - .5) * .94 : cx, z: alongX ? cz : cz + e * (long / 2 - .5) * .94, ry: alongX ? (e > 0 ? -Math.PI / 2 : Math.PI / 2) : (e > 0 ? Math.PI : 0), v: 0 });
    else if (long >= 36 && short >= 15) p.push({ t: 'net', x: cx, z: cz, ry: alongX ? Math.PI / 2 : 0, v: 0, w: short });
    else if (long >= 20) for (const e of [-1, 1]) p.push({ t: 'hoop', x: alongX ? cx + e * (long / 2 - 1.2) : cx, z: alongX ? cz : cz + e * (long / 2 - 1.2), ry: alongX ? (e > 0 ? -Math.PI / 2 : Math.PI / 2) : (e > 0 ? Math.PI : 0), v: 0 });
  }
  return planCache = p;
}


const rot=(p:Prop,lx:number,lz:number):[number,number]=>{const c=Math.cos(p.ry),s=Math.sin(p.ry);return [p.x+lx*c+lz*s,p.z-lx*s+lz*c];};
export type PropBlock=[number,number,number]|[number,number,number,number];
let blockCache:PropBlock[]|null=null;
/** Walk obstacles for the solid props (circles [x,z,r] and rectangles [x0,z0,x1,z1]); anchors stay clear. */
export function propBlocks():PropBlock[]{
  if(blockCache)return blockCache;
  const out:PropBlock[]=[],anchors=Object.values(ANCHORS);
  const circle=(p:Prop,lx:number,lz:number,r:number)=>{const [x,z]=rot(p,lx,lz);out.push([x,z,r]);};
  for(const p of campusPlan()){
    if(anchors.some(a=>Math.hypot(a.x-p.x,a.z-p.z)<4.5))continue;
    switch(p.t){
      case 'palm':case 'flame':case 'almond':case 'mango':case 'coconut':case 'frangi':circle(p,0,0,.45);break;
      case 'fountain':circle(p,0,0,2.9);break;
      case 'booth':{const [x,z]=rot(p,0,0);out.push([x-1.3,z-1.3,x+1.3,z+1.3]);break;}
      case 'stall':{const [x,z]=rot(p,0,0);out.push([x-1.4,z-1,x+1.4,z+1]);break;}
      case 'lamp':circle(p,0,0,.25);break;
      case 'bench':circle(p,-.5,0,.5);circle(p,.5,0,.5);break;
      case 'kiosk':circle(p,0,0,1.5);circle(p,1.1,.1,1.1);circle(p,-1.1,.1,1.1);break;
      case 'car':circle(p,0,-1.2,1.1);circle(p,0,1.2,1.1);break;
      case 'keke':circle(p,0,0,1.0);break;
      case 'bus':circle(p,0,-2,1.3);circle(p,0,0,1.3);circle(p,0,2,1.3);break;
      case 'goal':circle(p,-3.6,0,.3);circle(p,3.6,0,.3);break;
      case 'hoop':circle(p,0,-.4,.3);break;
      case 'sign':circle(p,-1.9,0,.3);circle(p,1.9,0,.3);break;
      case 'board':circle(p,-.8,0,.3);circle(p,.8,0,.3);break;
      case 'gen':{const [x,z]=rot(p,0,0);out.push([x-1.8,z-1.3,x+1.8,z+1.3]);break;}
      case 'guard':{const [x,z]=rot(p,0,0);out.push([x-1.8,z-1.5,x+1.8,z+1.5]);break;}
      case 'hedge':{const [x,z]=rot(p,0,0),w=(p.w??4)/2;out.push([x-w,z-.5,x+w,z+.5]);break;}
      case 'bin':circle(p,0,0,.35);break;
      default:break;
    }
  }
  return blockCache=out;
}
