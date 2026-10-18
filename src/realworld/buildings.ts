import * as THREE from 'three';
import type { Building, P } from './types.ts';
import { Mesher, open, signedArea } from './geometry.ts';

/**
 * Buildings from real footprints and measured heights. Walls carry their facade in a vec4 attribute read by the facade shader
 * (facade-material.ts): x style (0 plastered walls with barred windows, 1 concrete frame with floor bands, 2 glass curtain wall,
 * 3 shopfront ground floor + plaster above), y storey height (m), z a per-building random, w the roof line (m). uv is in metres
 * along the wall and up it. Low buildings get corrugated zinc roofs (hipped on rectangles, a single slope otherwise); the rest
 * flat concrete roofs behind a parapet.
 */
export interface BuiltBuildings { walls: THREE.BufferGeometry; metalRoofs: THREE.BufferGeometry; flatRoofs: THREE.BufferGeometry; count: number }

const hash = (text: string) => { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
const PLASTER = ['#efe6d2', '#e8dcc0', '#f1ece2', '#e2c98f', '#ead79a', '#dfb7a0', '#c9d6b2', '#bcd0d9', '#d7d0c4', '#e9e1cf', '#d9c3a1', '#f3efe6'];
const CONCRETE = ['#bdb8ae', '#c8c2b5', '#a9a49b', '#d2cdc2', '#b7b0a2'];
const GLASS = ['#5d7d8f', '#4f6a78', '#6b8796', '#46606c', '#7a8f8c'];
const PARAPET = 0.9, EAVE = 0.35;

function style(b: Building, seed: number): { style: number; storey: number; colour: string } {
  const tall = b.height > 38, mid = b.height > 13;
  if (tall) return seed < 0.65 ? { style: 2, storey: 3.8, colour: GLASS[Math.floor(seed * 97) % GLASS.length]! } : { style: 1, storey: 3.8, colour: CONCRETE[Math.floor(seed * 89) % CONCRETE.length]! };
  if (mid) return seed < 0.55 ? { style: 1, storey: 3.5, colour: seed < 0.3 ? CONCRETE[Math.floor(seed * 89) % CONCRETE.length]! : PLASTER[Math.floor(seed * 131) % PLASTER.length]! } : { style: 3, storey: 3.3, colour: PLASTER[Math.floor(seed * 131) % PLASTER.length]! };
  const shop = b.use === 'commercial' || b.use === 'retail' || seed < 0.45;
  return { style: shop ? 3 : 0, storey: 3.1, colour: PLASTER[Math.floor(seed * 131) % PLASTER.length]! };
}

export function buildBuildings(buildings: Building[]): BuiltBuildings {
  const walls = new Mesher(), metal = new Mesher(), flat = new Mesher();
  const colour = new THREE.Color(), roofColour = new THREE.Color();
  let count = 0;
  for (const b of buildings) {
    let ring = open(b.ring);
    if (ring.length < 3) continue;
    const area = signedArea(ring);
    if (Math.abs(area) < 4) continue;
    // Counter-clockwise in x/z (positive area): the inside is to the left of each edge, outward to the right.
    if (area < 0) ring = [...ring].reverse();
    const seed = hash(b.id), look = style(b, seed), height = Math.max(3, b.height);
    // Faded paint: every colour a third of the way to a warm grey, and a little darker or lighter per building.
    colour.set(look.colour).lerp(new THREE.Color('#b8b0a2'), look.style === 2 ? 0.1 : 0.32).multiplyScalar(0.9 + seed * 0.18).convertSRGBToLinear();
    roofColour.set(b.roof ?? '#8d7f6e').convertSRGBToLinear();
    const pitched = height <= 9.5 && look.style !== 2;
    const extra = (top: number): [number, number, number, number] => [look.style, look.storey, seed, top];
    const hipped = pitched && ring.length === 4 && rectangular(ring);
    const slope = pitched && !hipped ? skillion(ring, height, seed) : null;
    const tops = ring.map(([x, z]) => slope ? slope(x, z) : pitched ? height : height + PARAPET);
    // Walls: one quad per edge, outward, uv u = metres along the perimeter.
    let along = 0;
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i]!, [bx, bz] = ring[(i + 1) % ring.length]!;
      const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) continue;
      const nx = (bz - az) / len, nz = -(bx - ax) / len; // right of a->b: outward for a counter-clockwise ring
      const base = walls.count, ta = tops[i]!, tb = tops[(i + 1) % ring.length]!;
      walls.vertex(ax, 0, az, nx, 0, nz, along, 0, colour, extra(height));
      walls.vertex(bx, 0, bz, nx, 0, nz, along + len, 0, colour, extra(height));
      walls.vertex(bx, tb, bz, nx, 0, nz, along + len, tb, colour, extra(height));
      walls.vertex(ax, ta, az, nx, 0, nz, along, ta, colour, extra(height));
      // Seen from outside (along the outward normal) a0, b0, b1, a1 runs clockwise: list it the other way round.
      walls.quad(base, base + 3, base + 2, base + 1);
      along += len;
    }
    if (hipped) addHippedRoof(metal, ring, height, roofColour, seed);
    else if (slope) addSlopedRoof(metal, ring, slope, roofColour);
    else addFlatRoof(flat, walls, ring, height, roofColour, colour, extra(height));
    count++;
  }
  return { walls: walls.build(), metalRoofs: metal.build(), flatRoofs: flat.build(), count };
}

/** A flat roof at `height` with a parapet: inner walls and a cap between the footprint and a ring 0.25 m inside it. */
function addFlatRoof(roof: Mesher, walls: Mesher, ring: P[], height: number, roofColour: THREE.Color, wallColour: THREE.Color, extra: [number, number, number, number]) {
  const inner = inset(ring, 0.25);
  const top = height + PARAPET;
  // The roof deck (inside the parapet).
  const contour = (inner ?? ring).map(([x, z]) => new THREE.Vector2(x, z));
  let faces: number[][] = [];
  try { faces = THREE.ShapeUtils.triangulateShape(contour, []); } catch { faces = []; }
  const base = roof.count;
  for (const [x, z] of inner ?? ring) roof.vertex(x, height, z, 0, 1, 0, x, z, roofColour);
  for (const [a, b, c] of faces) roof.index.push(base + a!, base + c!, base + b!);
  if (!inner) return;
  // Inner faces of the parapet and its cap.
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length, [ax, az] = inner[i]!, [bx, bz] = inner[j]!, [ox, oz] = ring[i]!, [px, pz] = ring[j]!;
    const len = Math.hypot(bx - ax, bz - az); if (len < 0.05) continue;
    const nx = -(bz - az) / len, nz = (bx - ax) / len; // inward (left of the edge)
    const w = walls.count;
    walls.vertex(ax, height, az, nx, 0, nz, 0, height, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(bx, height, bz, nx, 0, nz, len, height, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(bx, top, bz, nx, 0, nz, len, top, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(ax, top, az, nx, 0, nz, 0, top, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.quad(w, w + 1, w + 2, w + 3);
    const c = walls.count;
    walls.vertex(ox, top, oz, 0, 1, 0, ox, oz, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(px, top, pz, 0, 1, 0, px, pz, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(bx, top, bz, 0, 1, 0, bx, bz, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.vertex(ax, top, az, 0, 1, 0, ax, az, wallColour, [extra[0], extra[1], extra[2], -1]);
    walls.quad(c, c + 3, c + 2, c + 1);
  }
}

/** The ring moved `d` metres inwards (mitred, clamped); null when it folds over (too thin or too concave). */
function inset(ring: P[], d: number): P[] | null {
  const out: P[] = [];
  for (let i = 0; i < ring.length; i++) {
    const p = ring[(i + ring.length - 1) % ring.length]!, c = ring[i]!, n = ring[(i + 1) % ring.length]!;
    const e1 = norm([c[0] - p[0], c[1] - p[1]]), e2 = norm([n[0] - c[0], n[1] - c[1]]);
    // Inward is left of each edge for a counter-clockwise ring: (-dz, dx).
    const l1: P = [-e1[1], e1[0]], l2: P = [-e2[1], e2[0]];
    const bis = norm([l1[0] + l2[0], l1[1] + l2[1]]);
    const cos = bis[0] * l1[0] + bis[1] * l1[1];
    if (cos < 0.35) return null;
    out.push([c[0] + bis[0] * d / cos, c[1] + bis[1] * d / cos]);
  }
  return signedArea(out) > 0.5 ? out : null;
}
const norm = ([x, z]: P): P => { const l = Math.hypot(x, z) || 1; return [x / l, z / l]; };

/** Corrugated zinc on a near-rectangle: a hipped roof with eaves. */
function addHippedRoof(m: Mesher, ring: P[], height: number, colour: THREE.Color, seed: number) {
  const pitch = THREE.MathUtils.degToRad(16 + seed * 10);
  const [p0, p1, p2, p3] = grow(ring, EAVE);
  const l01 = dist(p0!, p1!), l12 = dist(p1!, p2!);
  // Long axis along a->b.
  const [a, b, c, d] = l01 >= l12 ? [p0!, p1!, p2!, p3!] : [p1!, p2!, p3!, p0!];
  const L = Math.max(dist(a, b), 0.1), W = Math.max(dist(b, c), 0.1), rise = (W / 2) * Math.tan(pitch);
  const mid = (u: P, v: P): P => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
  const axis = norm([b[0] - a[0], b[1] - a[1]]), centre = mid(mid(a, b), mid(c, d)), half = Math.max(0, L / 2 - W / 2);
  const r1: P = [centre[0] - axis[0] * half, centre[1] - axis[1] * half];
  const r2: P = [centre[0] + axis[0] * half, centre[1] + axis[1] * half];
  const y0 = height - 0.15, y1 = y0 + rise;
  face(m, [[a, y0], [b, y0], [r2, y1], [r1, y1]], colour);
  face(m, [[b, y0], [c, y0], [r2, y1]], colour);
  face(m, [[c, y0], [d, y0], [r1, y1], [r2, y1]], colour);
  face(m, [[d, y0], [a, y0], [r1, y1]], colour);
}

/** A single gentle slope across the footprint's longest edge (the walls rise to meet it): the roof height at (x, z). */
function skillion(ring: P[], height: number, seed: number): (x: number, z: number) => number {
  let longest = 0, axis: P = [1, 0];
  for (let i = 0; i < ring.length; i++) { const p = ring[i]!, q = ring[(i + 1) % ring.length]!, l = dist(p, q); if (l > longest) { longest = l; axis = norm([q[0] - p[0], q[1] - p[1]]); } }
  const across: P = [-axis[1], axis[0]], lo = Math.min(...ring.map(([x, z]) => x * across[0] + z * across[1]));
  const slope = Math.tan(THREE.MathUtils.degToRad(6 + seed * 6));
  return (x, z) => height + (x * across[0] + z * across[1] - lo) * slope;
}
function addSlopedRoof(m: Mesher, ring: P[], y: (x: number, z: number) => number, colour: THREE.Color) {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  let faces: number[][] = [];
  try { faces = THREE.ShapeUtils.triangulateShape(contour, []); } catch { return; }
  const a = new THREE.Vector3(...xyz(ring[0]!, y)), base = m.count;
  // The plane's normal from three spread vertices.
  const b = new THREE.Vector3(...xyz(ring[Math.floor(ring.length / 3)]!, y)), c = new THREE.Vector3(...xyz(ring[Math.floor((2 * ring.length) / 3)]!, y));
  const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize(); if (n.y < 0) n.negate();
  const down = new THREE.Vector3(n.x, 0, n.z).normalize(), side = new THREE.Vector3(-down.z, 0, down.x);
  for (const p of ring) { const [x, yy, z] = xyz(p, y); m.vertex(x, yy + 0.02, z, n.x, n.y, n.z, x * side.x + z * side.z, x * down.x + z * down.z, colour); }
  for (const [i, j, k] of faces) m.index.push(base + i!, base + k!, base + j!);
}
const xyz = ([x, z]: P, y: (x: number, z: number) => number): [number, number, number] => [x, y(x, z), z];

function face(m: Mesher, pts: [P, number][], colour: THREE.Color) {
  const v = pts.map(([[x, z], y]) => new THREE.Vector3(x, y, z));
  const n = new THREE.Vector3().subVectors(v[1]!, v[0]!).cross(new THREE.Vector3().subVectors(v[2]!, v[0]!)).normalize();
  if (n.y < 0) { v.reverse(); n.negate(); }
  // uv: along the eave (u) and up the slope (v), so the corrugations run down the roof.
  const eave = new THREE.Vector3().subVectors(v[1]!, v[0]!).normalize(), up = new THREE.Vector3().crossVectors(n, eave).normalize();
  const base = m.count;
  for (const p of v) { const d = p.clone().sub(v[0]!); m.vertex(p.x, p.y, p.z, n.x, n.y, n.z, d.dot(eave), d.dot(up), colour); }
  for (let i = 1; i < v.length - 1; i++) m.index.push(base, base + i, base + i + 1);
}
const dist = (a: P, b: P) => Math.hypot(b[0] - a[0], b[1] - a[1]);
function rectangular(ring: P[]): boolean {
  for (let i = 0; i < 4; i++) {
    const p = ring[(i + 3) % 4]!, c = ring[i]!, n = ring[(i + 1) % 4]!;
    const a = norm([p[0] - c[0], p[1] - c[1]]), b = norm([n[0] - c[0], n[1] - c[1]]);
    if (Math.abs(a[0] * b[0] + a[1] * b[1]) > 0.17) return false;
  }
  return true;
}
/** The rectangle grown by `d` on every side (eaves). */
function grow(ring: P[], d: number): P[] {
  const cx = ring.reduce((s, p) => s + p[0], 0) / 4, cz = ring.reduce((s, p) => s + p[1], 0) / 4;
  return ring.map(([x, z]) => { const v = norm([x - cx, z - cz]); return [x + v[0] * d * 1.41, z + v[1] * d * 1.41] as P; });
}
