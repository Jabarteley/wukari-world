// Rebuilds a generated character on the animation skeleton the clip pack plays on, keeping its texture.
//   node --experimental-strip-types scripts/body/proof/assemble_figure.ts <parts.glb> <joints.json> <out.glb> <colour.jpg> --skeleton <female|male> [--normal <normal.jpg>] [--rough <0..1>]
// The skeleton has the shipped bones, hierarchy and rest rotations (the clips are authored against those); only root and pelvis keep their
// shipped positions, every other joint is moved to where this body's joint is. The mesh must already be in the skeleton's rest pose
// (arms out sideways) with its weights on the 23 bone names; meshy_rig.py writes such a file.
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadBodyData } from './body-data.ts';
import type { BodyKey } from './body-data.ts';
import { exportGlb } from './glb-export.ts';

const argv = process.argv.slice(2);
const flag = (n: string): string | undefined => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const [partsPath, jointsPath, outPath, colourPath] = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1]!.startsWith('--')));
if (!partsPath || !jointsPath || !outPath || !colourPath) throw new Error('usage: assemble_figure.ts <parts.glb> <joints.json> <out.glb> <colour.jpg> --skeleton <female|male> [--normal n.jpg]');
const skeleton = flag('--skeleton');
if (skeleton !== 'female' && skeleton !== 'male') throw new Error('--skeleton female|male is required');
const key: BodyKey = skeleton;
const rough = Number(flag('--rough') ?? 0.78);

const KEEP = new Set(['root', 'pelvis']);
const shipped = await loadBodyData(key);
const joints = JSON.parse(readFileSync(jointsPath, 'utf8')) as { height: number; heads: Record<string, [number, number, number]> };
if (!Number.isFinite(joints.height) || joints.height <= 0) throw new Error('joint file has no finite positive height');
const toGltf = (p: [number, number, number]): THREE.Vector3 => new THREE.Vector3(p[0], p[2], -p[1]);
const old = shipped.skeleton.bones;
if (old.length !== 23) throw new Error(`game skeleton must have 23 bones, got ${old.length}`);
for (const bone of old) if (!KEEP.has(bone.name) && !joints.heads[bone.name]) throw new Error(`joint file is missing ${bone.name}`);
const bones = old.map((b) => { const n = new THREE.Bone(); n.name = b.name; n.position.copy(b.position); n.quaternion.copy(b.quaternion); n.scale.copy(b.scale); return n; });
const parentOf = old.map((b) => (b.parent ? old.indexOf(b.parent as THREE.Bone) : -1));
parentOf.forEach((p, i) => { if (p >= 0) bones[p]!.add(bones[i]!); });
const holder = new THREE.Group();
holder.add(bones[parentOf.indexOf(-1)]!);
for (let i = 0; i < bones.length; i++) {
  const name = bones[i]!.name;
  if (KEEP.has(name) || !joints.heads[name]) continue;
  holder.updateMatrixWorld(true);
  bones[i]!.position.copy(bones[parentOf[i]!]!.worldToLocal(toGltf(joints.heads[name]!)));
}
holder.updateMatrixWorld(true);

const file = readFileSync(partsPath);
const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer, '');
if (gltf.animations.length) throw new Error('parts file contains vendor animation');
gltf.scene.updateMatrixWorld(true);
const root = new THREE.Group(); root.name = 'Scene'; root.add(holder);
const names = new Map(bones.map((b, i) => [b.name, i]));
const out: THREE.SkinnedMesh[] = [];
let assembledUnitScale = NaN;
gltf.scene.traverse((n) => {
  const sm = n as THREE.SkinnedMesh;
  if (!sm.isSkinnedMesh) return;
  const g = sm.geometry.clone();
  g.applyMatrix4(sm.matrixWorld);
  // the height of the bind surface itself: the box three computes also covers the face shapes, which would shrink the figure
  const at = g.getAttribute('position'); let lowY = Infinity, highY = -Infinity;
  for (let i = 0; i < at.count; i++) { lowY = Math.min(lowY, at.getY(i)); highY = Math.max(highY, at.getY(i)); }
  const sourceHeight = highY - lowY;
  const unitScale = joints.height / sourceHeight;
  if (!Number.isFinite(sourceHeight) || sourceHeight <= 0 || !Number.isFinite(unitScale) || unitScale < 1e-4 || unitScale > 1e4) throw new Error(`parts mesh has invalid height ${sourceHeight}`);
  g.scale(unitScale, unitScale, unitScale);
  const idx = g.getAttribute('skinIndex'), wt = g.getAttribute('skinWeight');
  for (const bone of sm.skeleton.bones) if (!names.has(bone.name)) throw new Error(`parts file contains non-game bone ${bone.name}`);
  const remap = sm.skeleton.bones.map((b) => names.get(b.name)!);
  for (let i = 0; i < idx.count; i++) {
    const w = [wt.getX(i), wt.getY(i), wt.getZ(i), wt.getW(i)], j = [idx.getX(i), idx.getY(i), idx.getZ(i), idx.getW(i)];
    const s = w.reduce((a, b) => a + b, 0) || 1;
    idx.setXYZW(i, remap[j[0]!]!, remap[j[1]!]!, remap[j[2]!]!, remap[j[3]!]!);
    wt.setXYZW(i, w[0]! / s, w[1]! / s, w[2]! / s, w[3]! / s);
  }
  for (const a of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'skinIndex', 'skinWeight'].includes(a)) g.deleteAttribute(a);
  const lin = new THREE.Matrix4().extractRotation(sm.matrixWorld);
  const morphs = g.morphAttributes as Record<string, (THREE.BufferAttribute | THREE.InterleavedBufferAttribute)[]>;
  delete morphs['normal'];
  for (const attr of Object.keys(morphs)) morphs[attr] = morphs[attr]!.map((a) => { const c = a.clone(); c.applyMatrix4(lin); return c; });
  g.morphTargetsRelative = sm.geometry.morphTargetsRelative;
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial({ name: 'character' }));
  mesh.name = 'character';
  if (sm.morphTargetDictionary) { mesh.morphTargetDictionary = { ...sm.morphTargetDictionary }; mesh.morphTargetInfluences = sm.morphTargetInfluences!.map(() => 0); }
  assembledUnitScale = unitScale;
  out.push(mesh);
});
if (out.length !== 1) throw new Error(`expected one mesh, got ${out.length}`);
for (const m of out) root.add(m);
root.updateMatrixWorld(true);
for (const m of out) m.bind(new THREE.Skeleton(bones), new THREE.Matrix4());
const glb = await exportGlb(root);

// splice the textures in (the exporter cannot encode images without a browser): images go after the binary data, the material gets the maps
const jsonLen = glb.readUInt32LE(12);
const doc = JSON.parse(glb.subarray(20, 20 + jsonLen).toString('utf8')) as Record<string, any>;
const binStart = 20 + jsonLen + 8;
let bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLen));
const addImage = (path: string): number => {
  const data = readFileSync(path);
  while (bin.length % 4) bin = Buffer.concat([bin, Buffer.alloc(1)]);
  const view = (doc.bufferViews as unknown[]).push({ buffer: 0, byteOffset: bin.length, byteLength: data.length }) - 1;
  bin = Buffer.concat([bin, data]);
  const image = ((doc.images ??= []) as unknown[]).push({ bufferView: view, mimeType: 'image/jpeg' }) - 1;
  doc.samplers ??= [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }];
  return ((doc.textures ??= []) as unknown[]).push({ source: image, sampler: 0 }) - 1;
};
const mat = doc.materials[0] as Record<string, any>;
mat.pbrMetallicRoughness = { baseColorTexture: { index: addImage(colourPath) }, metallicFactor: 0, roughnessFactor: rough };
const normal = flag('--normal');
if (normal) mat.normalTexture = { index: addImage(normal) };
while (bin.length % 4) bin = Buffer.concat([bin, Buffer.alloc(1)]);
doc.buffers[0].byteLength = bin.length;
let text = JSON.stringify(doc); while (Buffer.byteLength(text) % 4) text += ' ';
const jb = Buffer.from(text);
const head = Buffer.alloc(12); head.write('glTF', 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + jb.length + 8 + bin.length, 8);
const ch = (len: number, type: string): Buffer => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.write(type, 4); return b; };
writeFileSync(outPath, Buffer.concat([head, ch(jb.length, 'JSON'), jb, ch(bin.length, 'BIN\0'), bin]));
const box = new THREE.Box3().setFromObject(root);
console.log(JSON.stringify({ out: outPath, bytes: Buffer.concat([head, jb, bin]).length, triangles: out[0]!.geometry.index!.count / 3, height: box.max.y - box.min.y, unitScale: assembledUnitScale }));
