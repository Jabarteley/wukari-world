// The crowd-distance body: the same skinned mesh, thinned to about a quarter of its triangles with meshoptimizer's
// simplifier (UV seams and the clothing-region colours steer which edges collapse). Same skeleton and weights, so it
// plays the same clips; it carries no face parts.
import * as THREE from 'three';
import { MeshoptSimplifier } from 'meshoptimizer';
import type { BodyData } from './body-data.ts';
import { partScene } from './geom.ts';
import { exportGlb } from './glb-export.ts';

export async function buildBodyLod(body: BodyData, targetTriangles = 2300): Promise<{ glb: Buffer; triangles: number; vertices: number }> {
  await MeshoptSimplifier.ready;
  MeshoptSimplifier.useExperimentalFeatures = true;
  const vertexCount = body.pos.length / 3;
  const attrs = new Float32Array(vertexCount * 6);
  for (let i = 0; i < vertexCount; i++) {
    attrs.set([body.uv[i * 2]!, body.uv[i * 2 + 1]!], i * 6);
    attrs.set([body.region[i * 4]!, body.region[i * 4 + 1]!, body.region[i * 4 + 2]!, body.region[i * 4 + 3]!], i * 6 + 2);
  }
  const [indices] = MeshoptSimplifier.simplifyWithAttributes(body.index, body.pos, 3, attrs, 6, [1.5, 1.5, 0.6, 0.6, 0.6, 0.6], null, targetTriangles * 3, 0.05, []);
  // keep only the vertices the thinned mesh uses
  const remap = new Map<number, number>();
  const keep: number[] = [];
  for (const i of indices) if (!remap.has(i)) { remap.set(i, keep.length); keep.push(i); }
  const g = new THREE.BufferGeometry();
  const pick = (src: ArrayLike<number>, n: number): number[] => { const out: number[] = []; for (const i of keep) for (let c = 0; c < n; c++) out.push(src[i * n + c]!); return out; };
  g.setAttribute('position', new THREE.Float32BufferAttribute(pick(body.pos, 3), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pick(body.nrm, 3), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(pick(body.uv, 2), 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(pick(body.region, 4), 4));
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(pick(body.joints, 4), 4));
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(pick(body.weights, 4), 4));
  g.setIndex(Array.from(indices, (i) => remap.get(i)!));
  const mat = new THREE.MeshStandardMaterial(); mat.name = 'skin';
  const scene = partScene(body, [{ name: 'body-lod', geometry: g, material: mat }]);
  return { glb: await exportGlb(scene), triangles: indices.length / 3, vertices: keep.length };
}
