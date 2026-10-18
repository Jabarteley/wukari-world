import * as THREE from 'three';
import type { P, Polygon } from './types.ts';

/** Signed area in the x/z plane (positive: counter-clockwise when looking down from +y, with z south). */
export function signedArea(ring: P[]): number {
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [x1, z1] = ring[i]!, [x2, z2] = ring[(i + 1) % ring.length]!; a += x1 * z2 - x2 * z1; }
  return a / 2;
}
/** Drop a repeated closing point. */
export function open(ring: P[]): P[] {
  const first = ring[0]!, last = ring[ring.length - 1]!;
  return ring.length > 1 && first[0] === last[0] && first[1] === last[1] ? ring.slice(0, -1) : ring;
}

/** A flat polygon (with holes) at height y facing up, uv in metres (x, z). Indices appended to `out`. */
export function addFlat(out: Mesher, polygon: Polygon, y: number, colour?: THREE.Color): void {
  const outer = open(polygon.outer), holes = polygon.holes.map(open).filter((h) => h.length >= 3);
  if (outer.length < 3) return;
  const contour = outer.map(([x, z]) => new THREE.Vector2(x, z)), holeVs = holes.map((h) => h.map(([x, z]) => new THREE.Vector2(x, z)));
  let faces: number[][];
  try { faces = THREE.ShapeUtils.triangulateShape(contour, holeVs); } catch { return; }
  const all = [...outer, ...holes.flat()], base = out.count;
  for (const [x, z] of all) out.vertex(x, y, z, 0, 1, 0, x, z, colour);
  for (const [a, b, c] of faces) {
    // Triangles facing up (+y): with z south, a counter-clockwise turn in x/z is clockwise seen from above.
    const [ax, az] = all[a!]!, [bx, bz] = all[b!]!, [cx, cz] = all[c!]!;
    const up = (bx - ax) * (cz - az) - (bz - az) * (cx - ax) < 0;
    if (up) out.index.push(base + a!, base + b!, base + c!); else out.index.push(base + a!, base + c!, base + b!);
  }
}

/** Collects vertices for one BufferGeometry: position, normal, uv (metres), optional colour and extra vec4. */
export class Mesher {
  position: number[] = []; normal: number[] = []; uv: number[] = []; color: number[] = []; extra: number[] = []; index: number[] = [];
  get count(): number { return this.position.length / 3; }
  vertex(x: number, y: number, z: number, nx: number, ny: number, nz: number, u: number, v: number, colour?: THREE.Color, extra?: [number, number, number, number]): void {
    this.position.push(x, y, z); this.normal.push(nx, ny, nz); this.uv.push(u, v);
    this.color.push(colour?.r ?? 1, colour?.g ?? 1, colour?.b ?? 1);
    this.extra.push(...(extra ?? [-1, 0, 0, 0]));
  }
  /** A quad a-b-c-d (counter-clockwise seen from the side it faces). */
  quad(a: number, b: number, c: number, d: number): void { this.index.push(a, b, c, a, c, d); }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.position, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normal, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.color, 3));
    g.setAttribute('facade', new THREE.Float32BufferAttribute(this.extra, 4));
    g.setIndex(this.count > 65535 ? new THREE.Uint32BufferAttribute(this.index, 1) : new THREE.Uint16BufferAttribute(this.index, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
