// One character built from the Blender-made files (third build): a skinned body, one face mesh (eyes, brows, lashes, mouth parts) with
// the face shape keys, and hair, garment and shoe files bound to the animation skeleton the shipped clips play on.
// The crowd version is one file of three meshes: skin, cloth (hair, garment and shoes) and a painted face decal.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeCrowdCloth, makeCrowdSkin, makeDecal, makeFabric, makeFace, makeGold, makeHair, makeShoe, makeSkin } from './materials.ts';
import type { SwayUniforms } from './materials.ts';

export type Key = 'female' | 'male';
export interface Look { id: string; label: string; body: Key; tone: string; hair: string; hairColor: string; garment: string; fabric: 'ankara' | 'plain'; color: string; shoes?: string }

export interface Assets {
  loader: GLTFLoader;
  chars: Map<string, GLTF>;
  clips: THREE.AnimationClip[];
  parts: Map<string, GLTF>;
  textures: Map<string, THREE.Texture>;
}

const tex = new THREE.TextureLoader();
async function texture(url: string, srgb = true, repeat = false, flip = false): Promise<THREE.Texture> {
  const t = await tex.loadAsync(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8; t.flipY = flip;
  return t;
}

export async function loadAssets(names: string[]): Promise<Assets> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const clipPack = await loader.loadAsync('/body/clip-pack.glb');
  const chars = new Map<string, GLTF>(), parts = new Map<string, GLTF>();
  await Promise.all(names.map(async (n) => { try { (n.startsWith('char') || n.startsWith('crowd') ? chars : parts).set(n, await loader.loadAsync(`/n/${n}.glb`)); } catch (e) { console.error('not loaded', n, String(e)); } }));
  const textures = new Map<string, THREE.Texture>();
  for (const [n, url, srgb, rep, flip] of [['atlas', '/n/face-atlas.png', true, false, false], ['crowd-face', '/n/crowd-face.png', true, false, false], ['ankara-a', '/a/ankara-a.png', true, true, true], ['ankara-b', '/a/ankara-b.png', true, true, true], ['hair-coil', '/a/hair-coil.png', true, true, true], ['hair-coil-normal', '/a/hair-coil-normal.png', false, true, true], ['hair-braid', '/a/hair-braid.png', true, true, true]] as [string, string, boolean, boolean, boolean][]) {
    try { textures.set(n, await texture(url, srgb, rep, flip)); } catch { /* optional */ }
  }
  return { loader, chars, clips: clipPack.animations, parts, textures };
}

export interface Rig {
  look: Look; root: THREE.Group; scene: THREE.Object3D; bones: Record<string, THREE.Bone>;
  mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>;
  face: THREE.SkinnedMesh[]; eyes?: THREE.SkinnedMesh; sway: SwayUniforms; materials: THREE.Material[]; meshes: THREE.SkinnedMesh[];
  dispose(): void;
}

export function partNames(look: Look, lod = false): string[] {
  if (lod) return [`crowd-${look.hair}-${look.body}`];
  const out = [`char-${look.body}`];
  if (look.hair !== 'none') out.push(`hair-${look.hair}-${look.body}`);
  if (look.garment !== 'none') out.push(`${look.garment}-${look.body}`);
  out.push(`shoes-${look.body}`);
  return out;
}

export function buildRig(assets: Assets, look: Look, lod = false): Rig {
  const key = lod ? `crowd-${look.hair}-${look.body}` : `char-${look.body}`;
  const src = assets.chars.get(key);
  if (!src) throw new Error(`${key} is not built`);
  const scene = clone(src.scene);
  const root = new THREE.Group(); root.add(scene);
  const bones: Record<string, THREE.Bone> = {};
  scene.traverse((n) => { if ((n as THREE.Bone).isBone) bones[n.name] = n as THREE.Bone; });
  const sway: SwayUniforms = { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } };
  const materials: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T): T => { materials.push(m); return m; };
  const face: THREE.SkinnedMesh[] = [];
  let eyes: THREE.SkinnedMesh | undefined;
  const meshes: THREE.SkinnedMesh[] = [];
  const t = assets.textures;
  const shoes = look.shoes ?? '#5a3a26';
  const skin = own(lod ? makeCrowdSkin(look.tone) : makeSkin(look.tone));
  scene.traverse((n) => {
    const m = n as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    m.frustumCulled = false; meshes.push(m);
    const matName = (Array.isArray(m.material) ? m.material[0]! : m.material).name;
    switch (matName) {
      case 'skin': m.name = 'body'; m.material = skin; break;
      case 'face': m.name = 'face'; m.material = own(makeFace(t.get('atlas')!, look.hairColor)); eyes = m; break;
      case 'cloth': m.name = 'cloth'; m.material = own(makeCrowdCloth(look.hairColor, look.fabric === 'ankara' ? '#d98a2a' : look.color, shoes)); break;
      case 'decal': m.name = 'decal'; m.material = own(makeDecal(t.get('crowd-face')!)); break;
      default: break;
    }
    if (m.morphTargetDictionary) face.push(m);
  });
  const attach = (part: GLTF, partName: string): void => {
    part.scene.traverse((n) => {
      const sm = n as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const used = sm.skeleton.bones.map((b) => bones[b.name]!);
      scene.updateMatrixWorld(true);
      const mesh = new THREE.SkinnedMesh(sm.geometry, sm.material);
      mesh.name = sm.name; mesh.frustumCulled = false;
      const braid = partName.includes('braid');
      const swap = (mat: THREE.Material): THREE.Material => {
        switch (mat.name) {
          case 'hair': case 'hairfade': return own(makeHair(look.hairColor, t.get(braid ? 'hair-braid' : 'hair-coil') ?? null, sway, braid ? null : t.get('hair-coil-normal') ?? null));
          case 'garment': return own(makeFabric(look.color, look.fabric === 'ankara' ? t.get(look.garment === 'kaftan' ? 'ankara-b' : 'ankara-a') ?? null : null, true));
          case 'shoe': return own(makeShoe(shoes));
          case 'gold': return own(makeGold());
          default: return mat;
        }
      };
      mesh.material = Array.isArray(sm.material) ? sm.material.map(swap) : swap(sm.material);
      mesh.bind(new THREE.Skeleton(used, sm.skeleton.boneInverses), new THREE.Matrix4());
      scene.add(mesh); meshes.push(mesh);
    });
  };
  if (!lod) for (const n of partNames(look).slice(1)) { const part = assets.parts.get(n); if (part) attach(part, n); }
  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map(assets.clips.map((c) => [c.name, mixer.clipAction(c)]));
  return { look, root, scene, bones, mixer, actions, face, eyes, sway, materials, meshes, dispose() { for (const m of materials) m.dispose(); } };
}
