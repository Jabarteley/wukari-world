// Reads one shipped base body in Node (no browser, no textures) for the proof generators: the skinned mesh in its rest
// pose, the skeleton, and the face landmarks found through the texture layout.
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export type BodyKey = 'female' | 'male';
export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const BODY_DIR = join(REPO, 'src', 'scene', 'body', 'assets');

export interface BodyData {
  key: BodyKey;
  mesh: THREE.SkinnedMesh;
  skeleton: THREE.Skeleton;
  /** Rest-pose vertex positions (body space, metres, feet near 0) and normals. */
  pos: Float32Array;
  nrm: Float32Array;
  uv: Float32Array;
  index: Uint32Array;
  joints: Uint16Array;
  weights: Float32Array;
  region: Float32Array;
  boneNames: string[];
  /** World-space rest position of each bone. */
  bonePos: THREE.Vector3[];
  uvTransform: { offset: [number, number]; scale: [number, number] };
}

/** The glb with its image and texture references removed so that three can parse it without a browser. */
function withoutTextures(file: Buffer): ArrayBuffer {
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8')) as Record<string, unknown>;
  const mats = json['materials'] as { pbrMetallicRoughness?: Record<string, unknown> }[];
  for (const m of mats) delete m.pbrMetallicRoughness?.['baseColorTexture'];
  delete json['textures']; delete json['images'];
  let text = JSON.stringify(json);
  while (Buffer.byteLength(text) % 4) text += ' ';
  const jsonBuf = Buffer.from(text);
  const rest = file.subarray(20 + jsonLength);
  const head = Buffer.alloc(20);
  head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + jsonBuf.length + rest.length, 8);
  head.writeUInt32LE(jsonBuf.length, 12); head.writeUInt32LE(0x4e4f534a, 16);
  const all = Buffer.concat([head, jsonBuf, rest]);
  return all.buffer.slice(all.byteOffset, all.byteOffset + all.byteLength) as ArrayBuffer;
}

export async function loadBodyData(key: BodyKey): Promise<BodyData> {
  const file = readFileSync(join(BODY_DIR, `base-body-${key}.glb`));
  const raw = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8')) as { materials: { pbrMetallicRoughness: { baseColorTexture: { extensions: { KHR_texture_transform: { offset: [number, number]; scale: [number, number] } } } } }[] };
  const tt = raw.materials[0]!.pbrMetallicRoughness.baseColorTexture.extensions.KHR_texture_transform;
  await MeshoptDecoder.ready;
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(withoutTextures(file), '');
  let mesh: THREE.SkinnedMesh | undefined;
  gltf.scene.traverse((n) => { if ((n as THREE.SkinnedMesh).isSkinnedMesh) mesh = n as THREE.SkinnedMesh; });
  if (!mesh) throw new Error('no skinned mesh');
  gltf.scene.updateMatrixWorld(true);
  const g = mesh.geometry;
  const copy = (name: string, n: number): Float32Array => {
    const a = g.getAttribute(name);
    const out = new Float32Array(a.count * n);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < n; c++) out[i * n + c] = [a.getX(i), a.getY(i), a.getZ(i), a.getW(i)][c]!;
    return out;
  };
  // Positions are in the mesh's local space; bring them to the scene (body) space.
  const pos = copy('position', 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.length; i += 3) { v.set(pos[i]!, pos[i + 1]!, pos[i + 2]!).applyMatrix4(mesh.matrixWorld); pos[i] = v.x; pos[i + 1] = v.y; pos[i + 2] = v.z; }
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const nrm = copy('normal', 3);
  for (let i = 0; i < nrm.length; i += 3) { v.set(nrm[i]!, nrm[i + 1]!, nrm[i + 2]!).applyMatrix3(nm).normalize(); nrm[i] = v.x; nrm[i + 1] = v.y; nrm[i + 2] = v.z; }
  const uvN = copy('uv', 2);
  const uv = new Float32Array(uvN.length);
  for (let i = 0; i < uv.length; i += 2) { uv[i] = uvN[i]! * tt.scale[0] + tt.offset[0]; uv[i + 1] = uvN[i + 1]! * tt.scale[1] + tt.offset[1]; }
  const idx = g.getIndex()!;
  const index = new Uint32Array(idx.count); for (let i = 0; i < idx.count; i++) index[i] = idx.getX(i);
  const jointsF = copy('skinIndex', 4), joints = new Uint16Array(jointsF.length); jointsF.forEach((x, i) => { joints[i] = x; });
  const bones = mesh.skeleton.bones;
  const bonePos = bones.map((b) => b.getWorldPosition(new THREE.Vector3()));
  return { key, mesh, skeleton: mesh.skeleton, pos, nrm, uv, index, joints, weights: copy('skinWeight', 4), region: copy('color', 4), boneNames: bones.map((b) => b.name), bonePos, uvTransform: tt };
}
