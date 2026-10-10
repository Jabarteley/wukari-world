// Rebuilds a Blender-made character on the animation skeleton the clip pack plays on.
//   node --experimental-strip-types scripts/body/proof/assemble.ts <parts.glb> <joints.json> <female|male> <out.glb> [--lod]
// --lod drops the morph targets and the face parts (brows, lashes, teeth, tongue, mouth cavity, eyes) for the crowd version.
// The meshes come from Blender with the 23 bone names as vertex groups. The skeleton is the shipped body's: the same bone
// names, order, hierarchy and rest rotations (the clips are authored against those), with the rest positions of the
// spine, neck, head and arm bones moved to where this body's joints are. Pelvis and leg bones keep the shipped positions
// (the clips move the pelvis in absolute terms; the mesh was fitted to those heights in Blender).
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadBodyData } from './body-data.ts';
import type { BodyKey } from './body-data.ts';
import { exportGlb } from './glb-export.ts';

const lod = process.argv.includes('--lod');
const [partsPath, jointsPath, key, outPath] = process.argv.slice(2).filter((a) => a !== '--lod');
if (!partsPath || !jointsPath || (key !== 'female' && key !== 'male') || !outPath) throw new Error('usage: assemble.ts <parts.glb> <joints.json> <female|male> <out.glb>');

const KEEP = new Set(['root', 'pelvis', 'thigh_l', 'calf_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'foot_r', 'ball_r']);
const shipped = await loadBodyData(key as BodyKey);
const joints = JSON.parse(readFileSync(jointsPath, 'utf8')) as { heads: Record<string, [number, number, number]> };
const toGltf = (p: [number, number, number]): THREE.Vector3 => new THREE.Vector3(p[0], p[2], -p[1]);

// skeleton: same names, hierarchy and rest rotations; positions moved for the bones not in KEEP
const old = shipped.skeleton.bones;
const bones = old.map((b) => { const n = new THREE.Bone(); n.name = b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale); return n; });
const parentOf = old.map((b) => (b.parent ? old.indexOf(b.parent as THREE.Bone) : -1));
parentOf.forEach((p, i) => { if (p >= 0) bones[p]!.add(bones[i]!); });
const holder = new THREE.Group();
holder.add(bones[parentOf.indexOf(-1)]!);
const order = (i: number, seen: number[] = []): number[] => (parentOf[i]! >= 0 ? order(parentOf[i]!, seen) : seen).concat(i);
for (let i = 0; i < bones.length; i++) {
  const name = bones[i]!.name;
  if (KEEP.has(name) || !joints.heads[name]) continue;
  holder.updateMatrixWorld(true);
  const parent = bones[parentOf[i]!]!;
  const local = parent.worldToLocal(toGltf(joints.heads[name]!));
  bones[i]!.position.copy(local);
}
holder.updateMatrixWorld(true);
const skeletonBones = bones;

const gltf = await new GLTFLoader().parseAsync(readFileSync(partsPath).buffer.slice(0) as ArrayBuffer, '');
gltf.scene.updateMatrixWorld(true);
const root = new THREE.Group();
root.name = 'Scene';
root.add(holder);
const names = new Map(skeletonBones.map((b, i) => [b.name, i]));
const out: THREE.SkinnedMesh[] = [];
gltf.scene.traverse((n) => {
  const sm = n as THREE.SkinnedMesh;
  if (!sm.isSkinnedMesh) return;
  const matName = (Array.isArray(sm.material) ? sm.material[0]! : sm.material).name;
  if (lod && ['brow', 'lash', 'teeth', 'tongue', 'cavity', 'eye', 'face'].includes(matName)) return;
  const g = sm.geometry.clone();
  if (lod) { g.morphAttributes = {}; }
  g.applyMatrix4(sm.matrixWorld);
  const lin = new THREE.Matrix4().extractRotation(sm.matrixWorld);
  const morphs = g.morphAttributes as Record<string, (THREE.BufferAttribute | THREE.InterleavedBufferAttribute)[]>;
  for (const attr of Object.keys(morphs)) morphs[attr] = morphs[attr]!.map((a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => { const c = a.clone(); c.applyMatrix4(lin); return c; });
  g.morphTargetsRelative = sm.geometry.morphTargetsRelative;
  const idx = g.getAttribute('skinIndex'), wt = g.getAttribute('skinWeight');
  const remap = sm.skeleton.bones.map((b) => names.get(b.name) ?? 0);
  for (let i = 0; i < idx.count; i++) {
    const w = [wt.getX(i), wt.getY(i), wt.getZ(i), wt.getW(i)], j = [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)];
    const s = w.reduce((a, b) => a + b, 0) || 1;
    idx.setXYZW(i, remap[j[0]!]!, remap[j[1]!]!, remap[j[2]!]!, remap[j[3]!]!);
    wt.setXYZW(i, w[0]! / s, w[1]! / s, w[2]! / s, w[3]! / s);
  }
  const m = new THREE.MeshStandardMaterial({ name: (Array.isArray(sm.material) ? sm.material[0]! : sm.material).name });
  const mesh = new THREE.SkinnedMesh(g, m);
  mesh.name = sm.name;
  if (!lod && sm.morphTargetDictionary) { mesh.morphTargetDictionary = { ...sm.morphTargetDictionary }; mesh.morphTargetInfluences = sm.morphTargetInfluences!.map(() => 0); }
  out.push(mesh);
});
for (const m of out) { root.add(m); }
root.updateMatrixWorld(true);
for (const m of out) m.bind(new THREE.Skeleton(skeletonBones), new THREE.Matrix4());
writeFileSync(outPath, await exportGlb(root));
const skin = out.find((m) => (m.material as THREE.Material).name === 'skin');
if (skin) {
  // positions only: the geometry's own box also grows with the morph targets
  const bb = new THREE.Box3().setFromBufferAttribute(skin.geometry.getAttribute('position') as THREE.BufferAttribute);
  writeFileSync(outPath.replace(/\.glb$/, '.json'), JSON.stringify({ height: Math.round((bb.max.y - bb.min.y) * 1000) / 1000, triangles: out.reduce((n, m) => n + (m.geometry.index!.count / 3), 0) }));
}
console.log('written', outPath, out.map((m) => `${m.name}:${m.geometry.getAttribute('position').count}v/${Object.keys(m.morphTargetDictionary ?? {}).length}m`).join(' '));
