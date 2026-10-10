// One character built from the Blender-made files: a skinned body with face morph targets, eyes, brows, lashes and mouth
// parts on the animation skeleton the shipped clips play on, plus optional hair, garment and shoe files bound to it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeBrow, makeCavity, makeEye, makeFabric, makeHair, makeSkin, makeTeeth, makeTongue } from './materials.ts';
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
async function texture(url: string, srgb = true, repeat = false, flip = true): Promise<THREE.Texture> {
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
  await Promise.all(names.map(async (n) => { try { (n.startsWith('char') ? chars : parts).set(n, await loader.loadAsync(`/n/${n}.glb`)); } catch { /* not built yet */ } }));
  const textures = new Map<string, THREE.Texture>();
  for (const [n, url, srgb, rep] of [['eye', '/n/eye-brown.jpg', true, false], ['brow', '/n/brow.png', true, false], ['lash', '/n/lash.png', true, false], ['ankara-a', '/a/ankara-a.png', true, true], ['ankara-b', '/a/ankara-b.png', true, true], ['cloth-weave', '/a/cloth-weave.png', true, true], ['hair-coil', '/a/hair-coil.png', true, true], ['hair-coil-normal', '/a/hair-coil-normal.png', false, true], ['hair-braid', '/a/hair-braid.png', true, true]] as [string, string, boolean, boolean][]) {
    try { textures.set(n, await texture(url, srgb, rep, !url.startsWith('/n/'))); } catch { /* optional */ }
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
  const l = lod ? '-lod' : '';
  const out = [`char${l}-${look.body}`];
  if (look.hair !== 'none') out.push(`hair-${look.hair}${l}-${look.body}`);
  if (look.garment !== 'none') out.push(`${look.garment}${l}-${look.body}`);
  out.push(`shoes${l}-${look.body}`);
  return out;
}

export function buildRig(assets: Assets, look: Look, lod = false): Rig {
  const src = assets.chars.get(`char${lod ? '-lod' : ''}-${look.body}`);
  if (!src) throw new Error(`char${lod ? '-lod' : ''}-${look.body} is not built`);
  const scene = clone(src.scene);
  const root = new THREE.Group(); root.add(scene);
  const bones: Record<string, THREE.Bone> = {};
  scene.traverse((n) => { if ((n as THREE.Bone).isBone) bones[n.name] = n as THREE.Bone; });
  const sway: SwayUniforms = { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } };
  const materials: THREE.Material[] = [];
  const own = <T extends THREE.Material>(m: T): T => { materials.push(m); return m; };
  const skin = own(makeSkin(look.tone));
  const face: THREE.SkinnedMesh[] = [];
  let eyes: THREE.SkinnedMesh | undefined;
  const meshes: THREE.SkinnedMesh[] = [];
  const t = assets.textures;
  scene.traverse((n) => {
    const m = n as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    m.frustumCulled = false; meshes.push(m);
    const matName = (Array.isArray(m.material) ? m.material[0]! : m.material).name;
    m.name = matName;
    switch (matName) {
      case 'skin': m.name = 'body'; m.material = skin; break;
      case 'eye': m.name = 'eyes'; m.material = own(makeEye(t.get('eye')!)); eyes = m; break;
      case 'brow': m.name = 'brows'; m.material = own(makeBrow(t.get('brow')!, look.hairColor)); break;
      case 'lash': m.name = 'lashes'; m.material = own(makeBrow(t.get('lash')!, '#050403')); break;
      case 'teeth': m.material = own(makeTeeth()); break;
      case 'tongue': m.material = own(makeTongue()); break;
      case 'cavity': m.material = own(makeCavity()); break;
      default: break;
    }
    if (m.morphTargetDictionary) face.push(m);
  });
  const attach = (part: GLTF, partName: string): void => {
    part.scene.traverse((n) => {
      const sm = n as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const used = sm.skeleton.bones.map((b) => bones[b.name]!);
      void (sm.material as THREE.Material);
      scene.updateMatrixWorld(true);
      const mesh = new THREE.SkinnedMesh(sm.geometry, sm.material);
      mesh.name = sm.name; mesh.frustumCulled = false;
      const swap = (mat: THREE.Material): THREE.Material => {
        switch (mat.name) {
          case 'hair': { const h = own(makeHair(look.hairColor, t.get(partName.includes('braid') ? 'hair-braid' : 'hair-coil') ?? null, sway, false, partName.includes('braid') ? null : t.get('hair-coil-normal') ?? null)); return h; }
          case 'hairfade': return own(makeHair(look.hairColor, t.get('hair-coil') ?? null, sway, true, t.get('hair-coil-normal') ?? null));
          case 'garment': return own(makeFabric(look.color, look.fabric === 'ankara' ? t.get(look.garment === 'kaftan' ? 'ankara-b' : 'ankara-a') ?? null : null, true));
          case 'shoe': return own(new THREE.MeshStandardMaterial({ color: look.shoes ?? '#a97b4f', roughness: 0.55 }));
          default: return mat;
        }
      };
      mesh.material = Array.isArray(sm.material) ? sm.material.map(swap) : swap(sm.material);
      mesh.bind(new THREE.Skeleton(used, sm.skeleton.boneInverses), new THREE.Matrix4());
      scene.add(mesh); meshes.push(mesh);
    });
  };
  for (const n of partNames(look, lod).slice(1)) {
    const part = assets.parts.get(n);
    if (part) attach(part, n);
  }
  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map(assets.clips.map((c) => [c.name, mixer.clipAction(c)]));
  return { look, root, scene, bones, mixer, actions, face, eyes, sway, materials, meshes, dispose() { for (const m of materials) m.dispose(); } };
}
