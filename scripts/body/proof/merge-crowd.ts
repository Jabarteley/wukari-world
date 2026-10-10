// Merges the crowd character into three meshes (three draw calls): the skin body, one cloth mesh (hair, garment and shoes, told
// apart by a one-hot vertex colour) and the face decal.
//   node --experimental-strip-types scripts/body/proof/merge-crowd.ts <char-lod.glb> <hair.glb> <garment.glb> <shoes.glb> <out.glb>
// Inputs are the unpacked part files the assembler writes (all on the same skeleton).
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { exportGlb } from './glb-export.ts';

const [charPath, hairPath, garmentPath, shoesPath, outPath] = process.argv.slice(2);
if (!charPath || !hairPath || !garmentPath || !shoesPath || !outPath) throw new Error('usage: merge-crowd.ts <char-lod.glb> <hair.glb> <garment.glb> <shoes.glb> <out.glb>');
const load = async (p: string): Promise<THREE.Group> => (await new GLTFLoader().parseAsync(readFileSync(p).buffer.slice(0) as ArrayBuffer, '')).scene;
const skinned = (s: THREE.Object3D): THREE.SkinnedMesh[] => { const o: THREE.SkinnedMesh[] = []; s.traverse((n) => { if ((n as THREE.SkinnedMesh).isSkinnedMesh) o.push(n as THREE.SkinnedMesh); }); return o; };

const base = await load(charPath);
base.updateMatrixWorld(true);
const meshes = skinned(base);
const skin = meshes.find((m) => (Array.isArray(m.material) ? m.material[0]! : m.material).name === 'skin')!;
const decal = meshes.find((m) => m !== skin)!;
const geos: THREE.BufferGeometry[] = [];
for (const [path, region] of [[hairPath, [1, 0, 0]], [garmentPath, [0, 1, 0]], [shoesPath, [0, 0, 1]]] as [string, number[]][]) {
  const part = await load(path);
  part.updateMatrixWorld(true);
  for (const m of skinned(part)) {
    const g = new THREE.BufferGeometry();
    for (const [n, size] of [['position', 3], ['normal', 3], ['skinIndex', 4], ['skinWeight', 4]] as [string, number][]) {
      const a = m.geometry.getAttribute(n), arr = new Float32Array(a.count * size);   // one array type for every part so they merge
      for (let i = 0; i < a.count; i++) for (let k = 0; k < size; k++) arr[i * size + k] = a.getComponent(i, k);
      g.setAttribute(n, new THREE.BufferAttribute(arr, size));
    }
    g.setIndex(m.geometry.index!.clone());
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.set(region, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geos.push(g);
  }
}
const cloth = new THREE.SkinnedMesh(mergeGeometries(geos, false), new THREE.MeshStandardMaterial({ name: 'cloth' }));
cloth.name = 'cloth';
base.add(cloth);
cloth.bind(skin.skeleton, new THREE.Matrix4());
writeFileSync(outPath, await exportGlb(base));
console.log('written', outPath, 'triangles', [skin, cloth, decal].map((m) => m.geometry.index!.count / 3).join('+'));
