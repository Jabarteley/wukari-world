// Garments made from the body itself: cross-sections of the base mesh are measured with rays, offset and lofted into
// shells (bodice, skirt or tunic, sleeves, trousers), and each shell vertex takes its skin weights from the body
// (or, for skirts and tunics that hang free, from a blend of pelvis and thighs).
import * as THREE from 'three';
import type { BodyData } from './body-data.ts';
import { Builder, JOINT, partScene } from './geom.ts';
import type { V3 } from './geom.ts';
import { exportGlb } from './glb-export.ts';

const smooth = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function dominant(body: BodyData, i: number): number {
  let b = 0, bw = -1;
  for (let k = 0; k < 4; k++) if (body.weights[i * 4 + k]! > bw) { bw = body.weights[i * 4 + k]!; b = body.joints[i * 4 + k]!; }
  return b;
}

type Seg = [number, number, number, number];
/** The outline of the body at height y, from the triangles whose three corners all belong to the accepted joints. */
function section(body: BodyData, joints: ReadonlySet<number>, y: number, xRange?: [number, number]): Seg[] {
  const segs: Seg[] = [];
  const P = body.pos;
  for (let t = 0; t < body.index.length; t += 3) {
    const ids = [body.index[t]!, body.index[t + 1]!, body.index[t + 2]!];
    if (!ids.every((i) => joints.has(dominant(body, i)))) continue;
    const pts: [number, number][] = [];
    for (let e = 0; e < 3; e++) {
      const a = ids[e]!, b = ids[(e + 1) % 3]!;
      const ya = P[a * 3 + 1]!, yb = P[b * 3 + 1]!;
      if ((ya - y) * (yb - y) < 0) { const f = (y - ya) / (yb - ya); pts.push([lerp(P[a * 3]!, P[b * 3]!, f), lerp(P[a * 3 + 2]!, P[b * 3 + 2]!, f)]); }
    }
    if (pts.length === 2) {
      if (xRange && !(pts[0]![0] >= xRange[0] && pts[0]![0] <= xRange[1] && pts[1]![0] >= xRange[0] && pts[1]![0] <= xRange[1])) continue;
      segs.push([pts[0]![0], pts[0]![1], pts[1]![0], pts[1]![1]]);
    }
  }
  return segs;
}

/** Distance from (cx, cz) to the farthest outline crossing along direction theta (x = cos, z = sin); 0 when none. */
function reach(segs: Seg[], cx: number, cz: number, theta: number): number {
  const dx = Math.cos(theta), dz = Math.sin(theta);
  let best = 0;
  for (const [x0, z0, x1, z1] of segs) {
    const ex = x1 - x0, ez = z1 - z0, den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((x0 - cx) * ez - (z0 - cz) * ex) / den, u = ((x0 - cx) * dz - (z0 - cz) * dx) / den;
    if (t > 0 && u >= 0 && u <= 1 && t > best) best = t;
  }
  return best;
}

/** A closed outline as a function of angle, with gaps filled from neighbours. */
function polar(segs: Seg[], cx: number, cz: number, n: number): number[] {
  const r = Array.from({ length: n }, (_, k) => reach(segs, cx, cz, (k / n) * Math.PI * 2));
  const good = r.filter((v) => v > 0);
  const avg = good.length ? good.reduce((a, b) => a + b, 0) / good.length : 0.1;
  for (let k = 0; k < n; k++) if (r[k]! <= 0) {
    let a = k, b = k;
    for (let s = 1; s < n; s++) { if (r[(k - s + n) % n]! > 0) { a = (k - s + n) % n; break; } }
    for (let s = 1; s < n; s++) { if (r[(k + s) % n]! > 0) { b = (k + s) % n; break; } }
    r[k] = a === b ? avg : (r[a]! + r[b]!) / 2;
  }
  // a light smoothing pass removes the stair-steps of a coarse mesh
  return r.map((v, k) => 0.25 * r[(k + n - 1) % n]! + 0.5 * v + 0.25 * r[(k + 1) % n]!);
}

const set = (...j: number[]): ReadonlySet<number> => new Set(j);
const TORSO = set(JOINT.pelvis, JOINT.spine1, JOINT.spine2, JOINT.spine3, JOINT.neck, JOINT.claviL, JOINT.claviR);
const HIPS = set(JOINT.pelvis, JOINT.spine1, JOINT.thighL, JOINT.thighR);

interface Ring { y: number; cx: number; cz: number; pts: V3[] }

class Shell {
  b = new Builder();
  rings: Ring[] = [];
  tiles: number;
  constructor(tiles: number) { this.tiles = tiles; }
  /** Adds a ring of points; the first ring is the open edge. Returns its first vertex index. */
  addRing(pts: V3[], v: number, weights: (p: V3) => { joints: number[]; weights: number[] }): number {
    const n = pts.length, first = this.b.count;
    for (let k = 0; k <= n; k++) {
      const p = pts[k % n]!;
      const w = weights(p);
      this.b.vertex(p, [(k / n) * this.tiles, v], w.joints, w.weights);
    }
    return first;
  }
  /** Joins ring a to ring b (each n + 1 vertices); `inward` flips the winding. */
  join(a: number, b: number, n: number, flip = false): void {
    for (let k = 0; k < n; k++) {
      if (flip) this.b.quad(a + k, a + k + 1, b + k + 1, b + k); else this.b.quad(a + k, b + k, b + k + 1, a + k + 1);
    }
  }
}

function nearestIn(body: BodyData, joints: ReadonlySet<number>): (p: V3) => { joints: number[]; weights: number[] } {
  const ids: number[] = [];
  for (let i = 0; i < body.pos.length / 3; i++) if (joints.has(dominant(body, i))) ids.push(i);
  return (p) => {
    let best = ids[0]!, bd = Infinity;
    for (const i of ids) { const d = (body.pos[i * 3]! - p[0]) ** 2 + (body.pos[i * 3 + 1]! - p[1]) ** 2 + (body.pos[i * 3 + 2]! - p[2]) ** 2; if (d < bd) { bd = d; best = i; } }
    const j = [...body.joints.subarray(best * 4, best * 4 + 4)], w = [...body.weights.subarray(best * 4, best * 4 + 4)];
    return { joints: j, weights: w };
  };
}

/** Skinning for cloth that hangs below the hips: pelvis blended into the thigh of its side, more with distance below the hip. */
function hangingWeights(top: number, bottom: number, maxThigh: number): (p: V3) => { joints: number[]; weights: number[] } {
  return (p) => {
    const down = (0.3 + 0.7 * smooth(top, bottom, p[1])) * maxThigh;
    const left = Math.min(1, Math.max(0, p[0] / 0.14 * 0.5 + 0.5));
    return { joints: [JOINT.pelvis, JOINT.thighL, JOINT.thighR, 0], weights: [1 - down, down * left, down * (1 - left), 0] };
  };
}

const ellipse = (a: number, b: number, theta: number): number => (a * b) / Math.hypot(b * Math.cos(theta), a * Math.sin(theta));

interface GarmentSpec { kind: 'dress' | 'kaftan'; lod?: boolean }

function sleeve(sh: Shell, body: BodyData, side: 1 | -1, x0: number, x1: number, r0: number, r1: number, weights: (p: V3) => { joints: number[]; weights: number[] }, rows: number, droop = 0, n = 20): void {
  const ay = body.bonePos[side === 1 ? JOINT.armL : JOINT.armR]!.y - 0.008, az = body.bonePos[side === 1 ? JOINT.armL : JOINT.armR]!.z;
  let prev = -1;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows, x = side * lerp(x0, x1, t), r = lerp(r0, r1, t ** 0.9);
    const pts: V3[] = [];
    for (let k = 0; k < n; k++) {
      const th = (k / n) * Math.PI * 2;
      const fold = 1 + 0.03 * Math.sin(th * 5 + 1) * t;
      pts.push([x, ay - droop * t * t + Math.cos(th) * r * fold, az + Math.sin(th) * r * fold]);
    }
    const first = sh.addRing(pts, 0.5 + t * 0.9, weights);
    if (prev >= 0) sh.join(prev, first, n, side === -1);
    prev = first;
  }
}

export async function buildGarment(body: BodyData, spec: GarmentSpec): Promise<{ glb: Buffer; triangles: number; vertices: number }> {
  const dress = spec.kind === 'dress';
  const sh = new Shell(dress ? 8 : 8);
  const lod = !!spec.lod;
  const NT = lod ? 24 : 44;
  const torsoSkin = nearestIn(body, TORSO);
  const armSkin = (side: 1 | -1) => nearestIn(body, set(side === 1 ? JOINT.armL : JOINT.armR, side === 1 ? JOINT.foreL : JOINT.foreR, side === 1 ? JOINT.claviL : JOINT.claviR));
  // heights from this body's own joints (the shoulder line and the pelvis)
  const yTop = body.bonePos[JOINT.claviL]!.y + 0.025, yHip = body.bonePos[JOINT.pelvis]!.y + 0.003;
  const hipSegs = section(body, HIPS, yHip);
  const hipCz = ((): number => { let lo = 9, hi = -9; for (const s of hipSegs) for (const z of [s[1], s[3]]) { lo = Math.min(lo, z); hi = Math.max(hi, z); } return (lo + hi) / 2; })();
  const hipR = polar(hipSegs, 0, hipCz, NT);
  let prev = -1;
  // ---- bodice: levels from the neckline down to the hips, measured on the body
  const levels = lod ? 8 : dress ? 22 : 18;
  const yEnd = dress ? yHip : yHip + 0.0;
  for (let i = 0; i <= levels; i++) {
    const y = lerp(yTop, yEnd, i / levels);
    const segs = section(body, y > 1.0 ? TORSO : HIPS, y);
    let lo = 9, hi = -9; for (const s of segs) for (const z of [s[1], s[3]]) { lo = Math.min(lo, z); hi = Math.max(hi, z); }
    const cz = (lo + hi) / 2, R = polar(segs, 0, cz, NT);
    const chest = smooth(1.2, 1.32, y) * (1 - smooth(1.36, 1.46, y));
    const off = dress ? 0.006 + 0.004 * chest + 0.014 * smooth(1.0, 0.935, y) : 0.022 + 0.01 * chest;
    const pts: V3[] = R.map((r, k) => { const th = (k / NT) * Math.PI * 2; return [Math.cos(th) * (r + off), y, cz + Math.sin(th) * (r + off)]; });
    const first = sh.addRing(pts, y * 4.4, torsoSkin);
    if (prev >= 0) sh.join(prev, first, NT);
    prev = first;
  }
  // ---- skirt (dress) or tunic skirts (kaftan): loft from the hip outline to a flare
  const hem = dress ? 0.43 : 0.60, rows = lod ? 5 : dress ? 14 : 10;
  const a = dress ? 0.34 : 0.285, b = dress ? 0.285 : 0.205;
  for (let i = 1; i <= rows; i++) {
    const t = i / rows, y = lerp(yHip, hem, t);
    const s = smooth(0, 1, t) ** (dress ? 1.05 : 0.8);
    const pts: V3[] = hipR.map((r, k) => {
      const th = (k / NT) * Math.PI * 2;
      const flare = ellipse(a, b, th) * (0.72 + 0.28 * t);
      const pleat = 1 + (dress ? 0.035 : 0.02) * Math.sin(th * 7 + 0.5) * s + 0.012 * Math.sin(th * 13) * s;
      const rr = lerp(r + (dress ? (lod ? 0.085 : 0.055) : 0.04), flare, s) * pleat;
      return [Math.cos(th) * rr, y + 0.004 * Math.sin(th * 9) * s * t, hipCz + Math.sin(th) * rr];
    });
    const first = sh.addRing(pts, y * 4.4, hangingWeights(yHip, hem, dress ? 0.6 : 0.18));
    sh.join(prev, first, NT); prev = first;
  }
  // ---- sleeves
  for (const side of [1, -1] as const) {
    if (dress) sleeve(sh, body, side, 0.105, 0.255, 0.056, 0.082, armSkin(side), lod ? 3 : 6, 0.01, lod ? 12 : 20);
    else sleeve(sh, body, side, 0.105, 0.56, 0.058, 0.092, armSkin(side), lod ? 4 : 10, 0.02, lod ? 12 : 20);
  }
  // ---- trousers (kaftan only): one tube per leg from the hip to the ankle
  if (!dress) {
    for (const side of [1, -1] as const) {
      const legSet = set(side === 1 ? JOINT.thighL : JOINT.thighR, side === 1 ? JOINT.calfL : JOINT.calfR);
      const legSkin = nearestIn(body, legSet);
      const range: [number, number] = side === 1 ? [0.0, 0.5] : [-0.5, 0.0];
      let prevLeg = -1;
      const n = lod ? 12 : 22, ys = lod ? 6 : 16;
      for (let i = 0; i <= ys; i++) {
        const y = lerp(0.9, 0.12, i / ys);
        const segs = section(body, legSet, y, range);
        let cx = 0, cz = 0, cnt = 0; for (const s of segs) { cx += s[0] + s[2]; cz += s[1] + s[3]; cnt += 2; }
        cx = cnt ? cx / cnt : side * 0.11; cz = cnt ? cz / cnt : -0.04;
        const R = polar(segs, cx, cz, n);
        const loose = 0.016 + 0.024 * smooth(0.9, 0.6, y) * (1 - smooth(0.35, 0.12, y));
        const pts: V3[] = R.map((r, k) => { const th = (k / n) * Math.PI * 2; return [cx + Math.cos(th) * (r + loose), y, cz + Math.sin(th) * (r + loose * 0.9)]; });
        const first = sh.addRing(pts, 2 + y * 3, legSkin);
        if (prevLeg >= 0) sh.join(prevLeg, first, n, false);
        prevLeg = first;
      }
    }
  }
  const g = sh.b.geometry();
  const mat = new THREE.MeshStandardMaterial(); mat.name = 'garment';
  const scene = partScene(body, [{ name: spec.kind, geometry: g, material: mat }]);
  return { glb: await exportGlb(scene), triangles: g.index!.count / 3, vertices: g.getAttribute('position').count };
}
