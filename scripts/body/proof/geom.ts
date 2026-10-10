// Shared helpers for the proof generators: a vertex builder, the body's head surface as a height field, skinning
// from the nearest body vertex, and the scene that is exported as one part file.
import * as THREE from 'three';
import type { BodyData } from './body-data.ts';

export type V3 = [number, number, number];

export class Builder {
  pos: number[] = []; uv: number[] = []; col: number[] = []; idx: number[] = []; jnt: number[] = []; wgt: number[] = [];
  groups: { start: number; count: number; material: number }[] = [];
  morphs = new Map<string, number[]>();
  get count(): number { return this.pos.length / 3; }
  vertex(p: V3, uv: [number, number] = [0, 0], joints: number[] = [0, 0, 0, 0], weights: number[] = [1, 0, 0, 0], color: [number, number, number, number] = [1, 1, 1, 1]): number {
    this.pos.push(...p); this.uv.push(...uv); this.jnt.push(...joints); this.wgt.push(...weights); this.col.push(...color);
    return this.count - 1;
  }
  tri(a: number, b: number, c: number): void { this.idx.push(a, b, c); }
  quad(a: number, b: number, c: number, d: number): void { this.idx.push(a, b, c, a, c, d); }
  group(material: number, from: number): void { this.groups.push({ start: from, count: this.idx.length - from, material }); }
  geometry(normals: 'compute' | V3[] = 'compute'): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 4));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.jnt, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.wgt, 4));
    g.setIndex(this.idx);
    if (normals === 'compute') g.computeVertexNormals(); else g.setAttribute('normal', new THREE.Float32BufferAttribute(normals.flat(), 3));
    for (const gr of this.groups) g.addGroup(gr.start, gr.count, gr.material);
    return g;
  }
}

/** The face as a height field seen from the front: for (x, y) the z of the head surface and its outward normal. */
export function headSurface(body: BodyData): (x: number, y: number) => { z: number; n: V3 } {
  const tris: number[][] = [];
  const dom = (i: number): number => { let b = 0, bw = 0; for (let k = 0; k < 4; k++) if (body.weights[i * 4 + k]! > bw) { bw = body.weights[i * 4 + k]!; b = body.joints[i * 4 + k]!; } return b; };
  for (let t = 0; t < body.index.length; t += 3) {
    const a = body.index[t]!, b = body.index[t + 1]!, c = body.index[t + 2]!;
    if (dom(a) === 6 && dom(b) === 6 && dom(c) === 6) tris.push([a, b, c]);
  }
  const p = (i: number, k: number): number => body.pos[i * 3 + k]!;
  return (x, y) => {
    let best = -Infinity, bn: V3 = [0, 0, 1];
    for (const [a, b, c] of tris as [number, number, number][]) {
      const den = (p(b, 1) - p(c, 1)) * (p(a, 0) - p(c, 0)) + (p(c, 0) - p(b, 0)) * (p(a, 1) - p(c, 1));
      if (Math.abs(den) < 1e-12) continue;
      const l1 = ((p(b, 1) - p(c, 1)) * (x - p(c, 0)) + (p(c, 0) - p(b, 0)) * (y - p(c, 1))) / den;
      const l2 = ((p(c, 1) - p(a, 1)) * (x - p(c, 0)) + (p(a, 0) - p(c, 0)) * (y - p(c, 1))) / den;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-6 || l2 < -1e-6 || l3 < -1e-6) continue;
      const z = l1 * p(a, 2) + l2 * p(b, 2) + l3 * p(c, 2);
      if (z > best) {
        best = z;
        bn = [0, 1, 2].map((k) => l1 * body.nrm[a * 3 + k]! + l2 * body.nrm[b * 3 + k]! + l3 * body.nrm[c * 3 + k]!) as V3;
        const len = Math.hypot(...bn) || 1; bn = [bn[0] / len, bn[1] / len, bn[2] / len];
      }
    }
    return { z: best === -Infinity ? 0 : best, n: bn };
  };
}

/** Skinning copied from the nearest vertex of the body among those the filter accepts. */
export function nearestSkin(body: BodyData, accept: (i: number) => boolean = () => true): (p: V3) => { joints: number[]; weights: number[] } {
  const ids: number[] = [];
  for (let i = 0; i < body.pos.length / 3; i++) if (accept(i)) ids.push(i);
  return (p) => {
    let best = 0, bd = Infinity;
    for (const i of ids) {
      const d = (body.pos[i * 3]! - p[0]) ** 2 + (body.pos[i * 3 + 1]! - p[1]) ** 2 + (body.pos[i * 3 + 2]! - p[2]) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return { joints: [...body.joints.subarray(best * 4, best * 4 + 4)], weights: [...body.weights.subarray(best * 4, best * 4 + 4)] };
  };
}

export const JOINT = { root: 0, pelvis: 1, spine1: 2, spine2: 3, spine3: 4, neck: 5, head: 6, claviL: 7, armL: 8, foreL: 9, handL: 10, claviR: 11, armR: 12, foreR: 13, handR: 14, thighL: 15, calfL: 16, footL: 17, ballL: 18, thighR: 19, calfR: 20, footR: 21, ballR: 22 } as const;

/** One exported part: the body's skeleton (plus any extra bones) and the skinned meshes of the part. */
export interface PartMesh { name: string; geometry: THREE.BufferGeometry; material: THREE.Material | THREE.Material[]; morphNames?: string[] }

export function partScene(body: BodyData, meshes: PartMesh[], extraBones: { name: string; at: V3 }[] = []): THREE.Scene {
  const scene = new THREE.Scene();
  const bones = body.skeleton.bones;
  scene.add(bones[0]!);
  bones[0]!.updateMatrixWorld(true);
  const all = [...bones];
  // The shipped inverse bind matrices include the mesh's quantisation scale, so they are rebuilt from the rest pose.
  const inverses = bones.map((b) => new THREE.Matrix4().copy(b.matrixWorld).invert());
  const head = bones[JOINT.head]!;
  for (const e of extraBones) {
    const b = new THREE.Bone(); b.name = e.name;
    const world = new THREE.Vector3(...e.at);
    b.position.copy(head.worldToLocal(world.clone()));
    head.add(b); b.updateMatrixWorld(true);
    all.push(b); inverses.push(new THREE.Matrix4().copy(b.matrixWorld).invert());
  }
  const skeleton = new THREE.Skeleton(all, inverses);
  for (const m of meshes) {
    const mesh = new THREE.SkinnedMesh(m.geometry, m.material);
    mesh.name = m.name;
    mesh.bind(skeleton, new THREE.Matrix4());
    if (m.morphNames) {
      mesh.morphTargetDictionary = Object.fromEntries(m.morphNames.map((n, i) => [n, i]));
      mesh.morphTargetInfluences = m.morphNames.map(() => 0);
    }
    scene.add(mesh);
  }
  return scene;
}

export function morphAttrs(g: THREE.BufferGeometry, base: number[], targets: Map<string, number[]>): string[] {
  const names = [...targets.keys()];
  g.morphTargetsRelative = true;
  g.morphAttributes['position'] = names.map((n) => {
    const t = targets.get(n)!;
    return new THREE.Float32BufferAttribute(t.map((v, i) => v - base[i]!), 3);
  });
  return names;
}
