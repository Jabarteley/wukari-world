/**
 * Lagos Lagoon surface. Pure strip geometry (testable) plus a small three wrapper.
 *
 * The old build laid one overlapping rectangle per shore edge at several heights, so neighbouring edges
 * crossed each other in bays and the depth buffer streaked at distance. Here each shore chain is ONE mitered
 * strip sharing vertices (no overlap on convex corners, same-colour overlap only in tight concave bays) and the
 * shore-to-deep colour is a smooth vertex-colour gradient instead of stacked bands. The open lagoon is a single
 * base plane behind everything.
 */
import type { Group } from 'three';
import type { Kit } from '../../scene/kit.ts';
import { sceneMaterials } from '../../scene/build.ts';
import { CAMPUS_MAP } from './map.generated.ts';
import { pointInRing } from './geo.ts';
import { shoreEdges, landEdges } from './life-plan.ts';

export interface ShoreEdge { ax: number; az: number; bx: number; bz: number; nx: number; nz: number; len: number }
export interface Strip { pos: number[]; col: number[]; idx: number[] }

const hexToLinear = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16), f = (c: number) => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
  return [f(n >> 16 & 255), f(n >> 8 & 255), f(n & 255)];
};
/** Distance from the shore (m) -> water colour. Foam, shallows, mid water, deep. */
export const WATER_STOPS: ReadonlyArray<readonly [number, string]> = [[-.6, '#e3eee4'], [1.2, '#dcebe3'], [3.5, '#8cc4bc'], [22, '#6fa9a9'], [60, '#4f8896']];
const LAND = '#9aa585';
export const GAP = 5;

/** Strip along a set of shore edges: `stops` are [distance, colour] pairs; vertices share miter normals between touching edges. */
export function shoreStrip(edges: readonly ShoreEdge[], stops: ReadonlyArray<readonly [number, string]>, y: number, reachOf: (e: ShoreEdge) => number, out: Strip = { pos: [], col: [], idx: [] }): Strip {
  const link = (p: ShoreEdge, q: ShoreEdge) => Math.hypot(p.bx - q.ax, p.bz - q.az) < GAP;
  const colours = stops.map(([, c]) => hexToLinear(c));
  type V = { x: number; z: number; mx: number; mz: number; s: number; reach: number };
  const vertex = (e: ShoreEdge, atEnd: boolean, other: ShoreEdge | null): V => {
    let mx = e.nx, mz = e.nz;
    if (other) { mx += other.nx; mz += other.nz; const l = Math.hypot(mx, mz); if (l > 1e-4) { mx /= l; mz /= l; } else { mx = e.nx; mz = e.nz; } }
    const s = 1 / Math.max(.5, mx * e.nx + mz * e.nz);
    return { x: atEnd ? e.bx : e.ax, z: atEnd ? e.bz : e.az, mx, mz, s, reach: Math.min(reachOf(e), other ? reachOf(other) : Infinity) };
  };
  /** First boundary crossing along a vertex's own offset ray: the strip must stop before it so it never washes over land. */
  const ring = CAMPUS_MAP.boundary;
  const rayCap = (v: V) => {
    const dx = v.mx * v.s, dz = v.mz * v.s, ox = v.x + v.mx * .4, oz = v.z + v.mz * .4;
    let best = Infinity;
    for (let i = 1; i < ring.length; i++) {
      const [ax, az] = ring[i - 1]!, [bx, bz] = ring[i]!, ex = bx - ax, ez = bz - az, den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((ax - ox) * ez - (az - oz) * ex) / den, u = ((ax - ox) * dz - (az - oz) * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
    return best === Infinity ? Infinity : Math.max(.3, best - .4) * .9;
  };
  const edgeVerts = edges.map((e, i) => {
    const prev = i > 0 && link(edges[i - 1]!, e) ? edges[i - 1]! : null, next = i < edges.length - 1 && link(e, edges[i + 1]!) ? edges[i + 1]! : null;
    return { a: vertex(e, false, prev), b: vertex(e, true, next), linked: !!next };
  });
  /** Where the offset rays of a and b cross (a concave bay): strips must stop short of it or they fold over each other. */
  const foldCap = (a: V, b: V) => {
    const ex = b.x - a.x, ez = b.z - a.z, len = Math.hypot(ex, ez); if (len < 1e-3) return Infinity;
    const closing = ((b.mx * b.s - a.mx * a.s) * ex + (b.mz * b.s - a.mz * a.s) * ez) / len;
    return closing < -1e-4 ? .8 * len / -closing : Infinity;
  };
  for (const v of edgeVerts) { v.a.reach = Math.min(v.a.reach, rayCap(v.a)); v.b.reach = Math.min(v.b.reach, rayCap(v.b)); }
  edgeVerts.forEach((v, i) => {
    const cap = foldCap(v.a, v.b); v.a.reach = Math.min(v.a.reach, cap); v.b.reach = Math.min(v.b.reach, cap);
    const n = edgeVerts[i + 1];
    if (v.linked && n) { const c2 = foldCap(v.b, n.a), r = Math.min(v.b.reach, n.a.reach, c2); v.b.reach = n.a.reach = r; }
  });
  const deepColour = colours[colours.length - 1]!;
  const emit = (a: V, b: V) => {
    const at = (v: V, d: number) => [v.x + v.mx * d * v.s, v.z + v.mz * d * v.s] as const;
    const clampStop = (v: V, k: number) => Math.min(stops[k]![0], Math.max(stops[0]![0], v.reach));
    // a stop beyond a capped vertex's reach is drawn in the open-water colour, so the strip melts into the base plane
    const tone = (v: V, k: number) => k > 0 && stops[k]![0] >= v.reach && v.reach < stops[stops.length - 1]![0] ? deepColour : colours[k]!;
    for (let k = 1; k < stops.length; k++) {
      const d0a = clampStop(a, k - 1), d1a = clampStop(a, k), d0b = clampStop(b, k - 1), d1b = clampStop(b, k);
      if (d1a - d0a < .01 && d1b - d0b < .01) continue;
      const quad = [[at(a, d0a), tone(a, k - 1)], [at(b, d0b), tone(b, k - 1)], [at(b, d1b), tone(b, k)], [at(a, d1a), tone(a, k)]] as const;
      const base = out.pos.length / 3;
      for (const [p, c] of quad) { out.pos.push(p[0], y, p[1]); out.col.push(...c); }
      // winding is chosen so the strip faces up whichever way the shore runs
      const cross = (quad[1][0][0] - quad[0][0][0]) * (quad[2][0][1] - quad[0][0][1]) - (quad[1][0][1] - quad[0][0][1]) * (quad[2][0][0] - quad[0][0][0]);
      out.idx.push(...(cross < 0 ? [base, base + 1, base + 2, base, base + 2, base + 3] : [base, base + 2, base + 1, base, base + 3, base + 2]));
    }
  };
  edgeVerts.forEach((v, i) => { emit(v.a, v.b); const n = edgeVerts[i + 1]; if (v.linked && n) emit(v.b, n.a); });
  return out;
}

const seaward = (e: ShoreEdge, far: number, step: number) => {
  const mx = (e.ax + e.bx) / 2, mz = (e.az + e.bz) / 2;
  for (let d = step; d < far; d += step) if (pointInRing([mx + e.nx * d, mz + e.nz * d], CAMPUS_MAP.boundary)) return Math.max(14, d - step - 2);
  return far;
};

export function lagoonStrips() {
  const reachWater = new Map<ShoreEdge, number>(), reachLand = new Map<ShoreEdge, number>();
  const shore = shoreEdges() as ShoreEdge[], land = landEdges() as ShoreEdge[];
  for (const e of shore) reachWater.set(e, seaward(e, 60, 12));
  for (const e of land) reachLand.set(e, seaward(e, 1500, 24));
  return {
    water: shoreStrip(shore, WATER_STOPS, -.3, e => reachWater.get(e)!),
    land: shoreStrip(land, [[0, LAND], [1500, LAND]], -.45, e => reachLand.get(e)!),
  };
}

export function buildLagoon(kit: Kit): Group {
  const { THREE } = kit, materials = sceneMaterials(kit), group = new THREE.Group(); group.name = 'Lagos Lagoon';
  const offset = (factor: number) => { const m = materials.solid.clone(); m.polygonOffset = true; m.polygonOffsetFactor = factor; m.polygonOffsetUnits = factor; return m; };
  const [x0, z0, x1, z1] = CAMPUS_MAP.bounds;
  const baseGeometry = new THREE.PlaneGeometry(12000, 12000); baseGeometry.rotateX(-Math.PI / 2); baseGeometry.translate((x0 + x1) / 2, -.7, (z0 + z1) / 2);
  const base = baseGeometry.toNonIndexed(); baseGeometry.dispose(); base.deleteAttribute('uv');
  const deep = hexToLinear('#4f8896'); base.setAttribute('color', new THREE.Float32BufferAttribute(new Array(6).fill(0).flatMap(() => deep), 3));
  const materialsMade: import('three').Material[] = [];
  const add = (geometry: import('three').BufferGeometry, factor: number) => { const m = offset(factor); materialsMade.push(m); const mesh = new THREE.Mesh(geometry, m); mesh.receiveShadow = true; group.add(mesh); };
  add(base, 3);
  const { water, land } = lagoonStrips();
  for (const [strip, factor] of [[land, 2], [water, 0]] as const) {
    if (!strip.idx.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(strip.pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(strip.col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(strip.pos.map((_, i) => i % 3 === 1 ? 1 : 0), 3)); g.setIndex(strip.idx);
    add(g, factor);
  }
  group.userData.dispose = () => { group.traverse(o => (o as import('three').Mesh).geometry?.dispose()); materialsMade.forEach(m => m.dispose()); };
  return group;
}
