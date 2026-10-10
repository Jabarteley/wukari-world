// Hair made in code on the base head: a rounded afro, shoulder-length braids (each strand a tapered tube) and a low cut
// with a clean hairline. Every style is found by casting rays from the middle of the skull onto the body's own head
// mesh, so it sits on the real head; the hairline is a curve in height around the head, not a mesh edge.
import * as THREE from 'three';
import type { BodyData } from './body-data.ts';
import { Builder, JOINT, partScene } from './geom.ts';
import type { V3 } from './geom.ts';
import { exportGlb } from './glb-export.ts';
import { rng } from './png.ts';

const smooth = (a: number, b: number, v: number): number => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export interface HeadModel {
  centre: V3;
  /** Distance from the centre to the head surface along a direction (the farthest hit). */
  reach(d: V3): number;
  /** Point on the head surface for azimuth theta (0 = front) and elevation phi. */
  surface(theta: number, phi: number): V3;
  /** The elevation at which the surface passes height y in direction theta. */
  elevationAt(theta: number, y: number): number;
}

export function headModel(body: BodyData): HeadModel {
  const tris: [number, number, number][] = [];
  const dom = (i: number): number => { let b = 0, bw = -1; for (let k = 0; k < 4; k++) if (body.weights[i * 4 + k]! > bw) { bw = body.weights[i * 4 + k]!; b = body.joints[i * 4 + k]!; } return b; };
  for (let t = 0; t < body.index.length; t += 3) {
    const a = body.index[t]!, b = body.index[t + 1]!, c = body.index[t + 2]!;
    if (dom(a) === 6 && dom(b) === 6 && dom(c) === 6) tris.push([a, b, c]);
  }
  const centre: V3 = body.key === 'female' ? [0, 1.665, -0.012] : [0, 1.705, -0.012];
  const P = body.pos;
  const reach = (d: V3): number => {
    let best = 0;
    for (const [a, b, c] of tris) {
      const ax = P[a * 3]!, ay = P[a * 3 + 1]!, az = P[a * 3 + 2]!;
      const e1: V3 = [P[b * 3]! - ax, P[b * 3 + 1]! - ay, P[b * 3 + 2]! - az], e2: V3 = [P[c * 3]! - ax, P[c * 3 + 1]! - ay, P[c * 3 + 2]! - az];
      const px = d[1] * e2[2] - d[2] * e2[1], py = d[2] * e2[0] - d[0] * e2[2], pz = d[0] * e2[1] - d[1] * e2[0];
      const det = e1[0] * px + e1[1] * py + e1[2] * pz;
      if (Math.abs(det) < 1e-14) continue;
      const tx = centre[0] - ax, ty = centre[1] - ay, tz = centre[2] - az;
      const u = (tx * px + ty * py + tz * pz) / det;
      if (u < 0 || u > 1) continue;
      const qx = ty * e1[2] - tz * e1[1], qy = tz * e1[0] - tx * e1[2], qz = tx * e1[1] - ty * e1[0];
      const v = (d[0] * qx + d[1] * qy + d[2] * qz) / det;
      if (v < 0 || u + v > 1) continue;
      const t = (e2[0] * qx + e2[1] * qy + e2[2] * qz) / det;
      if (t > best) best = t;
    }
    return best;
  };
  const dir = (theta: number, phi: number): V3 => [Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi)];
  const surface = (theta: number, phi: number): V3 => { const d = dir(theta, phi), r = reach(d) || 0.1; return [centre[0] + d[0] * r, centre[1] + d[1] * r, centre[2] + d[2] * r]; };
  const elevationAt = (theta: number, y: number): number => {
    let lo = -0.95, hi = Math.PI / 2 - 0.02;
    for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2; if (surface(theta, mid)[1] < y) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  };
  return { centre, reach, surface, elevationAt };
}

/** Hairline height (metres) around the head: theta 0 is the forehead; hairlines differ per style. */
export interface Hairline { (theta: number): number }
export function hairline(key: 'female' | 'male', style: 'afro' | 'braids' | 'lowcut'): Hairline {
  const f = key === 'female' ? 1.727 : 1.762;
  return (theta) => {
    const a = Math.abs(theta);
    if (style === 'lowcut') {
      // a crisp, slightly receding hairline with temple corners and a short sideburn
      const front = f - 0.004 + 0.004 * smooth(0.25, 0.7, a) - 0.016 * smooth(0.0, 0.25, a) * (1 - smooth(0.25, 0.6, a));
      const side = lerp(front, f - 0.058, smooth(0.9, 1.45, a));
      return lerp(side, f - 0.14, smooth(1.9, 2.6, a)) - 0.008 * Math.sin(a * 9) * smooth(1.0, 1.6, a);
    }
    const front = f + 0.004 - 0.012 * smooth(0.5, 1.0, a);
    const side = lerp(front, f - 0.125, smooth(0.9, 1.5, a));
    return lerp(side, f - 0.19, smooth(1.9, 2.8, a));
  };
}

const wave = (x: number, y: number, z: number): number => Math.sin(x * 91 + y * 17) * Math.sin(z * 83 + x * 23) * 0.5 + Math.sin(y * 131 + z * 47) * 0.5;

interface ShellOptions {
  rows: number; around: number;
  offset: (theta: number, t: number) => number;
  /** When set, the radius from the skull centre is blended from the skull to this target over t. */
  ball?: (d: V3) => number;
  bump?: number;
  fade?: number;           // metres above the hairline over which the shell fades in (alpha)
  uvScale?: number;
  sway?: number;
}

/** A shell over the skull from the hairline to the crown, offset along the radial direction. */
function skullShell(b: Builder, head: HeadModel, line: Hairline, o: ShellOptions): void {
  const first = b.count;
  const N = o.around, R = o.rows;
  for (let k = 0; k <= N; k++) {
    const theta = -Math.PI + (k / N) * Math.PI * 2;
    const phi0 = head.elevationAt(theta, line(theta));
    for (let r = 0; r <= R; r++) {
      const t = r / R;
      const phi = lerp(phi0, Math.PI / 2 - 0.0001, t ** 0.95);
      const d: V3 = [Math.sin(theta) * Math.cos(phi), Math.sin(phi), Math.cos(theta) * Math.cos(phi)];
      const rr = head.reach(d) || 0.09;
      let rad = rr + o.offset(theta, t);
      if (o.ball) rad = lerp(rr + 0.004, Math.max(o.ball(d), rr + 0.02), smooth(0, 0.22, t) ** 0.9);
      if (o.bump) rad += o.bump * wave(d[0] * rr, d[1] * rr, d[2] * rr) * smooth(0.05, 0.4, t);
      const p: V3 = [head.centre[0] + d[0] * rad, head.centre[1] + d[1] * rad, head.centre[2] + d[2] * rad];
      const y = p[1] - line(theta);
      const alpha = o.fade ? 0.2 + 0.8 * smooth(0, o.fade, y) : (o.sway ? o.sway * t * t : 0);
      b.vertex(p, [(k / N) * (o.uvScale ?? 6), t * (o.uvScale ?? 6) * 0.5], [JOINT.head, 0, 0, 0], [1, 0, 0, 0], [1, 1, 1, alpha]);
    }
  }
  for (let k = 0; k < N; k++) for (let r = 0; r < R; r++) {
    const a = first + k * (R + 1) + r, c = first + (k + 1) * (R + 1) + r;
    b.quad(a, a + 1, c + 1, c);
  }
}

function afro(body: BodyData, lod: boolean): Builder {
  const head = headModel(body), b = new Builder();
  const Rb = body.key === 'female' ? 0.168 : 0.155, cb: V3 = [head.centre[0], head.centre[1] + 0.012, head.centre[2] - 0.03];
  // distance from the skull centre to the ball along d (the centre is inside the ball)
  const ball = (d: V3): number => {
    const ox = head.centre[0] - cb[0], oy = head.centre[1] - cb[1], oz = head.centre[2] - cb[2];
    const bq = ox * d[0] + oy * d[1] + oz * d[2], cq = ox * ox + oy * oy + oz * oz - Rb * Rb;
    return -bq + Math.sqrt(Math.max(0, bq * bq - cq));
  };
  skullShell(b, head, hairline(body.key, 'afro'), {
    ball,
    rows: lod ? 8 : 20, around: lod ? 22 : 48, bump: 0.004, uvScale: 9, sway: 0.0,
    offset: () => 0.004,
  });
  return b;
}

function lowcut(body: BodyData, lod: boolean): Builder[] {
  const head = headModel(body);
  const b = new Builder();
  skullShell(b, head, hairline(body.key, 'lowcut'), {
    rows: lod ? 5 : 12, around: lod ? 24 : 56, bump: 0.0012, uvScale: 14, fade: 0.017,
    offset: (_th, t) => 0.0022 + 0.0055 * smooth(0.0, 0.7, t),
  });
  return [b];
}

/** One braid: a tapered tube from a skull point, falling down and outward, clear of the shoulders. */
function braids(body: BodyData, detail: 'full' | 'lod'): Builder[] {
  const head = headModel(body), line = hairline(body.key, 'braids');
  const cap = new Builder();
  skullShell(cap, head, line, { rows: detail === 'lod' ? 5 : 10, around: detail === 'lod' ? 22 : 44, bump: 0.0006, uvScale: 10, offset: () => 0.0042 });
  const b = new Builder();
  const rand = rng(body.key === 'female' ? 21 : 22);
  const shoulderY = 1.49;
  const strands: { theta: number; row: number; len: number }[] = [];
  const rowsDef = detail === 'full' ? [{ n: 38, up: 0.0 }, { n: 26, up: 0.11 }] : [{ n: 12, up: 0.0 }, { n: 6, up: 0.11 }];
  rowsDef.forEach((row, ri) => {
    for (let i = 0; i < row.n; i++) {
      const spread = ri === 0 ? Math.PI - 0.12 : Math.PI - 0.3, from = 0.95;
      const half = row.n / 2, side = i < half ? -1 : 1, j = i < half ? i : i - half;
      const theta = side * (from + (j + 0.5 * ri) * (spread - from) / (half - (ri === 0 ? 1 : 0.5)));
      strands.push({ theta: Math.max(-Math.PI + 0.05, Math.min(Math.PI - 0.05, theta)), row: ri, len: 0 });
    }
  });
  const seg = detail === 'full' ? 9 : 5, sides = detail === 'full' ? 5 : 4;
  for (const [si, s] of strands.entries()) {
    const phi0 = head.elevationAt(s.theta, line(s.theta));
    const phi = phi0 + (s.row ? 0.28 : 0.04) + rand() * 0.04;
    const start = head.surface(s.theta + (rand() - 0.5) * 0.05, phi);
    const outward = new THREE.Vector3(start[0] - head.centre[0], start[1] - head.centre[1], start[2] - head.centre[2]).normalize();
    const back = Math.cos(s.theta) < -0.15;                      // behind the ears the braids fall down the back
    const endY = back ? 1.36 + rand() * 0.06 : shoulderY - 0.005 + rand() * 0.03 - (s.row ? 0.03 : 0);
    const path: V3[] = [];
    const pos = new THREE.Vector3(...start);
    let dirv = outward.clone();
    const total = Math.max(0.05, pos.y - endY) * 1.18 + 0.03;
    const ds = total / seg;
    for (let i = 0; i <= seg; i++) {
      path.push([pos.x, pos.y, pos.z]);
      const g = Math.min(1, 0.5 + i * 0.12);
      dirv = dirv.clone().multiplyScalar(1 - g).add(new THREE.Vector3(0, -1, 0).multiplyScalar(g)).normalize();
      pos.addScaledVector(dirv, ds);
      // stay outside the skull and in front of / behind the neck and shoulders
      const rel = new THREE.Vector3(pos.x - head.centre[0], pos.y - head.centre[1], pos.z - head.centre[2]);
      if (pos.y > 1.52) { const d = rel.clone().normalize(); const r = head.reach([d.x, d.y, d.z]) + 0.012; if (rel.length() < r) pos.set(head.centre[0] + d.x * r, head.centre[1] + d.y * r, head.centre[2] + d.z * r); }
      else {
        const neckClear = 0.075 + 0.02 * smooth(1.5, 1.42, pos.y);
        const xz = Math.hypot(pos.x, pos.z + 0.04);
        const sideShoulder = smooth(1.5, 1.4, pos.y) * 0.1;
        const clear = neckClear + sideShoulder * (Math.abs(pos.x) > 0.03 ? 1 : 0.3);
        if (xz < clear) { const f = clear / Math.max(xz, 1e-4); pos.x *= f; pos.z = -0.04 + (pos.z + 0.04) * f; }
      }
    }
    const rings = path.length, vstart = b.count;
    const length = total;
    const r0 = detail === 'full' ? 0.0074 : 0.0115;
    for (let i = 0; i < rings; i++) {
      const p = path[i]!, q = path[Math.min(rings - 1, i + 1)]!, o = path[Math.max(0, i - 1)]!;
      const tan = new THREE.Vector3(q[0] - o[0], q[1] - o[1], q[2] - o[2]).normalize();
      const ref = Math.abs(tan.y) > 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
      const n1 = new THREE.Vector3().crossVectors(tan, ref).normalize(), n2 = new THREE.Vector3().crossVectors(tan, n1).normalize();
      const f = i / (rings - 1);
      const rad = r0 * (1 - 0.42 * f ** 1.3) * (i === rings - 1 ? 0.7 : 1);
      const w = f * f;
      const weights = back ? [JOINT.head, JOINT.spine3, JOINT.neck, 0] : [JOINT.head, JOINT.spine3, JOINT.neck, 0];
      const wv = [1 - 0.85 * smooth(0.45, 1, f), 0.7 * smooth(0.45, 1, f), 0.15 * smooth(0.45, 1, f), 0];
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const off = n1.clone().multiplyScalar(Math.cos(a) * rad).addScaledVector(n2, Math.sin(a) * rad);
        b.vertex([p[0] + off.x, p[1] + off.y, p[2] + off.z], [k / sides, (f * length) / 0.05 + si * 0.13], weights, wv, [1, 1, 1, w]);
      }
    }
    for (let i = 0; i < rings - 1; i++) for (let k = 0; k < sides; k++) {
      const a = vstart + i * (sides + 1) + k, c = vstart + (i + 1) * (sides + 1) + k;
      b.quad(a, a + 1, c + 1, c);
    }
    // closing the tip
    const tip = b.count; const last = path[rings - 1]!;
    b.vertex([last[0], last[1] - r0 * 0.5, last[2]], [0.5, 1], [JOINT.head, JOINT.spine3, JOINT.neck, 0], [0.15, 0.7, 0.15, 0], [1, 1, 1, 1]);
    for (let k = 0; k < sides; k++) b.tri(vstart + (rings - 1) * (sides + 1) + k, vstart + (rings - 1) * (sides + 1) + k + 1, tip);
  }
  return [cap, b];
}

export type HairStyle = 'afro' | 'braids' | 'lowcut';
export async function buildHair(body: BodyData, style: HairStyle, detail: 'full' | 'lod' = 'full'): Promise<{ glb: Buffer; triangles: number; vertices: number }> {
  const builders = style === 'afro' ? [afro(body, detail === 'lod')] : style === 'lowcut' ? lowcut(body, detail === 'lod') : braids(body, detail);
  const meshes = builders.map((b, i) => {
    const mat = new THREE.MeshStandardMaterial(); mat.name = style === 'lowcut' ? 'hairfade' : 'hair';
    return { name: style === 'braids' ? (i === 0 ? 'hair-cap' : 'hair-braid') : `hair-${style}`, geometry: b.geometry(), material: mat };
  });
  const scene = partScene(body, meshes);
  return { glb: await exportGlb(scene), triangles: builders.reduce((n, b) => n + b.idx.length / 3, 0), vertices: builders.reduce((n, b) => n + b.count, 0) };
}
