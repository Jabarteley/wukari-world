// Builds one proof character: the shipped skinned body, the added parts bound to its skeleton, and the materials.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { linear, makeFabric, makeHair, makeSkin } from './materials.ts';
import type { SwayUniforms } from './materials.ts';

export type Key = 'female' | 'male';
export type HairStyle = 'afro' | 'braids' | 'lowcut' | 'none';
export type Garment = 'dress' | 'kaftan' | 'none';
export interface Look {
  id: string; label: string; body: Key; tone: string; hair: HairStyle; hairColor: string;
  garment: Garment; fabric: 'ankara' | 'plain'; color: string; gele?: boolean;
}

export interface Assets {
  loader: GLTFLoader;
  bodies: Record<Key, GLTF>;
  clips: THREE.AnimationClip[];
  parts: Map<string, GLTF>;
  textures: Map<string, THREE.Texture>;
  eye: THREE.Texture;
}

const tex = new THREE.TextureLoader();
async function texture(url: string, srgb = true, repeat = false): Promise<THREE.Texture> {
  const t = await tex.loadAsync(url);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 8;
  return t;
}

export async function loadAssets(names: string[]): Promise<Assets> {
  await MeshoptDecoder.ready;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const [female, male, clipPack] = await Promise.all([loader.loadAsync('/body/base-body-female.glb'), loader.loadAsync('/body/base-body-male.glb'), loader.loadAsync('/body/clip-pack.glb')]);
  const parts = new Map<string, GLTF>();
  await Promise.all(names.map(async (n) => { try { parts.set(n, await loader.loadAsync(`/a/${n}.glb`)); } catch { /* a part that is not built yet */ } }));
  const textures = new Map<string, THREE.Texture>();
  for (const n of ['ankara-a', 'ankara-b', 'hair-coil', 'hair-braid', 'cloth-weave', 'hair-coil-normal']) textures.set(n, await texture(`/a/${n}.png`, n !== 'hair-coil-normal', true));
  return { loader, bodies: { female, male }, clips: clipPack.animations, parts, textures, eye: await texture('/a/eye.png') };
}

export interface Rig {
  look: Look; root: THREE.Group; scene: THREE.Object3D; bones: Record<string, THREE.Bone>;
  mixer: THREE.AnimationMixer; actions: Map<string, THREE.AnimationAction>;
  morphs: { lids?: THREE.SkinnedMesh; brows?: THREE.SkinnedMesh; mouth?: THREE.SkinnedMesh };
  sway: SwayUniforms; materials: THREE.Material[]; meshes: THREE.SkinnedMesh[];
  bodyMesh: THREE.SkinnedMesh; faceMeshes: THREE.SkinnedMesh[]; hairMeshes: THREE.SkinnedMesh[]; garmentMeshes: THREE.SkinnedMesh[];
  dispose(): void;
}

const mix = (a: string, b: string, t: number): string => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

export interface BuildOptions { face?: boolean; hair?: boolean; garment?: boolean; lod?: 'full' | 'crowd' }

/** Which part files a look wears (names without extension). */
export function partNames(look: Look, opts: BuildOptions = {}): string[] {
  const out: string[] = [];
  if (opts.lod === 'crowd') {
    out.push(`body-lod-${look.body}`);
    if (look.hair !== 'none') out.push(`hair-${look.hair}-lod-${look.body}`);
    if (look.garment !== 'none') out.push(`${look.garment}-lod-${look.body}`);
    return out;
  }
  if (opts.face !== false) out.push(`face-${look.body}`);
  if (look.hair !== 'none' && opts.hair !== false) out.push(`hair-${look.hair}-${look.body}`);
  if (look.gele && opts.hair !== false) out.push(`gele-${look.body}`);
  if (look.garment !== 'none' && opts.garment !== false) out.push(`${look.garment}-${look.body}`);
  return out;
}

export function buildRig(assets: Assets, look: Look, opts: BuildOptions = {}): Rig {
  const key = look.body;
  const src = assets.bodies[key];
  const scene = clone(src.scene);
  const root = new THREE.Group(); root.add(scene);
  const bones: Record<string, THREE.Bone> = {};
  let bodyMesh!: THREE.SkinnedMesh;  // replaced by the thinned body at crowd distance
  scene.traverse((n) => { if ((n as THREE.Bone).isBone) bones[n.name] = n as THREE.Bone; if ((n as THREE.SkinnedMesh).isSkinnedMesh) bodyMesh = n as THREE.SkinnedMesh; });
  const baseMap = (src.scene.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh).material as THREE.MeshStandardMaterial;
  const map = baseMap.map!;
  const sway: SwayUniforms = { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } };
  const skin = makeSkin({ key, tone: look.tone, hair: look.hairColor, map });
  bodyMesh.material = skin; bodyMesh.frustumCulled = false;
  const materials: THREE.Material[] = [skin];
  const faceMeshes: THREE.SkinnedMesh[] = [], hairMeshes: THREE.SkinnedMesh[] = [], garmentMeshes: THREE.SkinnedMesh[] = [];
  const morphs: Rig['morphs'] = {};
  const fabricTex = look.fabric === 'ankara' ? assets.textures.get(look.garment === 'kaftan' ? 'ankara-b' : 'ankara-a')! : assets.textures.get('cloth-weave')!;
  const lip = mix(look.tone, '#6d1f2e', 0.5);

  const eyeMat = new THREE.MeshStandardMaterial({ map: assets.eye, roughness: 0.16 });
  const browMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(mix(look.hairColor, '#000000', 0.15)), roughness: 0.85 });
  const lipMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(lip).convertSRGBToLinear().convertLinearToSRGB(), roughness: 0.42 });
  const mouthInMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
  materials.push(eyeMat, browMat, lipMat, mouthInMat);

  const attach = (part: GLTF, kind: 'face' | 'hair' | 'garment' | 'body'): void => {
    part.scene.traverse((n) => {
      const sm = n as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const names = sm.skeleton.bones.map((b) => b.name);
      const used = names.map((nm, i) => {
        let b = bones[nm];
        if (!b) { b = new THREE.Bone(); b.name = nm; b.position.copy(sm.skeleton.bones[i]!.position); bones['Head']!.add(b); bones[nm] = b; }
        return b;
      });
      scene.updateMatrixWorld(true);
      const mesh = new THREE.SkinnedMesh(sm.geometry, sm.material);
      mesh.name = sm.name; mesh.frustumCulled = false;
      if (sm.morphTargetDictionary) { mesh.morphTargetDictionary = { ...sm.morphTargetDictionary }; mesh.morphTargetInfluences = sm.morphTargetInfluences!.map(() => 0); }
      const swap = (m: THREE.Material): THREE.Material => {
        switch (m.name) {
          case 'skin': return skin; case 'eye': return eyeMat; case 'brow': return browMat; case 'lips': return lipMat; case 'mouth-in': return mouthInMat;
          case 'hair': { const h = makeHair(look.hairColor, assets.textures.get(sm.name.includes('braid') ? 'hair-braid' : 'hair-coil')!, sway, false, sm.name.includes('braid') ? null : assets.textures.get('hair-coil-normal')!); materials.push(h); return h; }
          case 'hairfade': { const h = makeHair(look.hairColor, assets.textures.get('hair-coil')!, sway, true, assets.textures.get('hair-coil-normal')!); materials.push(h); return h; }
          case 'gele': { const g = makeFabric(look.gele ? mix(look.color, '#ffffff', 0.0) : look.color, assets.textures.get('cloth-weave')!, true); materials.push(g); return g; }
          case 'garment': { const f = makeFabric(look.color, fabricTex, true); if (look.fabric === 'plain') { f.map = fabricTex; f.color = new THREE.Color(look.color); } materials.push(f); return f; }
          default: return m;
        }
      };
      mesh.material = Array.isArray(sm.material) ? sm.material.map(swap) : swap(sm.material);
      mesh.bind(new THREE.Skeleton(used, sm.skeleton.boneInverses), new THREE.Matrix4());
      scene.add(mesh);
      if (kind === 'body') { bodyMesh.parent?.remove(bodyMesh); bodyMesh = mesh; return; }
      (kind === 'face' ? faceMeshes : kind === 'hair' ? hairMeshes : garmentMeshes).push(mesh);
      if (kind === 'face') { if (sm.name === 'lids') morphs.lids = mesh; if (sm.name === 'brows') morphs.brows = mesh; if (sm.name === 'mouth') morphs.mouth = mesh; }
    });
  };
  for (const n of partNames(look, opts)) {
    const part = assets.parts.get(n);
    if (!part) continue;
    attach(part, n.startsWith('body') ? 'body' : n.startsWith('face') ? 'face' : n.startsWith('hair') || n.startsWith('gele') ? 'hair' : 'garment');
  }
  // The body under a garment: the garment parts record which body triangles they cover; the body index is cut accordingly.
  if (garmentMeshes.length) hideCovered(bodyMesh, look);

  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map(assets.clips.map((c) => [c.name, mixer.clipAction(c)]));
  return {
    look, root, scene, bones, mixer, actions, morphs, sway, materials, meshes: [bodyMesh, ...faceMeshes, ...hairMeshes, ...garmentMeshes], bodyMesh, faceMeshes, hairMeshes, garmentMeshes,
    dispose() { for (const m of materials) m.dispose(); },
  };
}

/** Removes the body triangles a garment covers (every vertex mostly in a covered region), so nothing can poke through and fewer triangles draw. */
function hideCovered(body: THREE.SkinnedMesh, look: Look): void {
  const g = body.geometry;
  if (g.userData['fullIndex']) return;
  const index = g.getIndex()!, color = g.getAttribute('color'), pos = g.getAttribute('position'), jnt = g.getAttribute('skinIndex'), wt = g.getAttribute('skinWeight');
  const covered = (v: number): boolean => {
    // region g (torso, clavicle, upper arm), region b (pelvis, legs) and the lower body are under a garment
    const z = pos.getY(v);
    void z;
    let best = 0, bw = 0;
    for (let k = 0; k < 4; k++) { const w = k === 0 ? wt.getX(v) : k === 1 ? wt.getY(v) : k === 2 ? wt.getZ(v) : wt.getW(v); if (w > bw) { bw = w; best = [jnt.getX(v), jnt.getY(v), jnt.getZ(v), jnt.getW(v)][k]!; } }
    if ([1, 2, 3, 4, 7, 11].includes(best)) return true;       // pelvis, spine 1..3, clavicles
    if (look.garment === 'kaftan') return [8, 12, 15, 19, 16, 20].includes(best);  // upper arms, thighs, calves
    return false;
  };
  void color;
  const keep: number[] = [];
  for (let t = 0; t < index.count; t += 3) {
    const a = index.getX(t), b = index.getX(t + 1), c = index.getX(t + 2);
    if (covered(a) && covered(b) && covered(c)) continue;
    keep.push(a, b, c);
  }
  g.userData['fullIndex'] = index.array;
  g.setIndex(keep);
}

export function setTone(rig: Rig, tone: string): void {
  const u = rig.materials[0]!.userData['uniforms'] as { uSkin: { value: THREE.Vector3 } };
  const ref = { female: [0.4009, 0.1848, 0.0851], male: [0.3865, 0.1759, 0.082] }[rig.look.body]!;
  const t = linear(tone); u.uSkin.value.set(t.r / ref[0]!, t.g / ref[1]!, t.b / ref[2]!);
}
