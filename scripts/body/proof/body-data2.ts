// Reads a character assembled by assemble.ts (plain float .glb) as the BodyData the garment generators measure.
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BodyData, BodyKey } from './body-data.ts';

export async function loadCharacterData(key: BodyKey, path: string): Promise<BodyData> {
  const file = readFileSync(path);
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, '');
  gltf.scene.updateMatrixWorld(true);
  let mesh: THREE.SkinnedMesh | undefined;
  gltf.scene.traverse((n) => { const m = n as THREE.SkinnedMesh; if (m.isSkinnedMesh && (m.material as THREE.Material).name === 'skin') mesh = m; });
  if (!mesh) throw new Error('no skin mesh');
  const g = mesh.geometry;
  const copy = (name: string, n: number): Float32Array => {
    const a = g.getAttribute(name);
    const out = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)][c]!;
    return out;
  };
  const idx = g.getIndex()!;
  const index = new Uint32Array(idx.count);
  for (let i = 0; i < idx.count; i++) index[i] = idx.getX(i);
  const joints = new Uint16Array(copy('skinIndex', 4));
  const bones = mesh.skeleton.bones;
  return {
    key, mesh, skeleton: mesh.skeleton, pos: copy('position', 3), nrm: copy('normal', 3), uv: copy('uv', 2), index, joints, weights: copy('skinWeight', 4),
    region: g.getAttribute('color') ? copy('color', 4) : new Float32Array(g.getAttribute('position').count * 4), boneNames: bones.map((b) => b.name),
    bonePos: bones.map((b) => b.getWorldPosition(new THREE.Vector3())), uvTransform: { offset: [0, 0], scale: [1, 1] },
  };
}
