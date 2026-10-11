// Assembles one figure from independent parts that all hang on the game's 23 bones: a head, a body in an outfit, hair and headwear.
// The body carries the skeleton; the head (and the hair) are re-bound to it, the head is moved and its neck ring reshaped so that it meets the body's ring, and the skin tone
// is one value applied to both.  The clips and the life layer then drive the result exactly as they drive today's figure.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { tintMaterial } from './tint.ts';
import type { EyeSpec, RGB, Regions, Tinted, Targets } from './tint.ts';
import { buildHair } from './hair.ts';
import { PRINT_SETS } from './catalog.ts';
import type { HairPiece } from './hair.ts';
import type { Rig } from '../page3/character.ts';
import { LifeDriver } from '../page4/anim.ts';

export interface Ring { cx: number; cz: number; rx: number; rz: number }
export interface HeadMeta { id: string; sex: 'male' | 'female'; file: string; mask: string; cutY: number; ring: Ring; chinY: number; crownY: number; headDown: number; box: { xmin: number; xmax: number; zmin: number; zmax: number }; eyes: EyeSpec; browL: [number, number]; browR: [number, number]; mouth: [number, number]; refSkin: RGB }
export interface BodyMeta { id: string; sex: 'male' | 'female'; file: string; mask: string; cutY: number; ring: Ring; label: string; tintable: boolean; refs: Regions; height: number; bodyUp: number; prints?: string[] }
export interface Look {
  sex: 'male' | 'female'; head: string; body: string; print?: number; skin: string; top?: string; bottom?: string; shoes?: string;
  hair?: string; hairColor?: string; headwear?: string; headwearColor?: string; height?: number; build?: number; jaw?: number; headSize?: number;
}
export interface Figure {
  root: THREE.Group; rig: Rig; driver: LifeDriver; look: Look; meshes: THREE.SkinnedMesh[]; triangles: number; drawCalls: number; bytes: number;
  head: THREE.SkinnedMesh; tinted: Tinted[]; headTint: Tinted; bodyMeta: BodyMeta; headMeta: HeadMeta; dispose(): void;
}

const smooth = (t: number): number => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };

export class Library {
  loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  glbs = new Map<string, Promise<GLTF>>(); metas = new Map<string, Promise<unknown>>(); masks = new Map<string, Promise<THREE.Texture>>(); maps = new Map<string, Promise<THREE.Texture>>();
  sizes = new Map<string, number>();
  clips = new Map<string, THREE.AnimationClip>();
  async init(clipNames: string[]): Promise<void> {
    await MeshoptDecoder.ready;
    const pack = await this.glb('/body/clip-pack.glb');
    for (const n of clipNames) { const c = pack.animations.find((a) => a.name === n); if (c) this.clips.set(n, c); const f = pack.animations.find((a) => a.name === `${n}-female`); if (f) this.clips.set(`${n}-female`, f); }
  }
  glb(url: string): Promise<GLTF> { let p = this.glbs.get(url); if (!p) { p = this.loader.loadAsync(url); this.glbs.set(url, p); this.size(url); } return p; }
  sizeP = new Map<string, Promise<void>>();
  size(url: string): Promise<void> { let p = this.sizeP.get(url); if (!p) { p = fetch(url, { method: 'HEAD' }).then((r) => { this.sizes.set(url, Number(r.headers.get('content-length') ?? 0)); }).catch(() => {}); this.sizeP.set(url, p); } return p; }
  meta<T>(url: string): Promise<T> { let p = this.metas.get(url); if (!p) { p = fetch(url).then((r) => r.json()); this.metas.set(url, p); } return p as Promise<T>; }
  mask(url: string): Promise<THREE.Texture> {
    let p = this.masks.get(url);
    if (!p) {
      p = fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then((bmp) => {
        const t = new THREE.Texture(bmp); t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.format = THREE.RGBAFormat; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
      });
      this.masks.set(url, p); this.size(url);
    }
    return p;
  }
  print(url: string): Promise<THREE.Texture> {
    let p = this.maps.get('p:' + url);
    if (!p) { p = new THREE.TextureLoader().loadAsync(url).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping; t.anisotropy = 4; return t; }); this.maps.set('p:' + url, p); this.size(url); }
    return p;
  }
  map(url: string): Promise<THREE.Texture> {
    let p = this.maps.get(url);
    if (!p) { p = new THREE.TextureLoader().loadAsync(url).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }); this.maps.set(url, p); this.size(url); }
    return p;
  }
}

/** Moves a head onto a body: up or down to the body's neck height, and the lower neck reshaped to the body's ring. Returns a new geometry; the loaded one is untouched. */
export function fitHead(src: THREE.BufferGeometry, head: HeadMeta, body: BodyMeta): { geometry: THREE.BufferGeometry; dy: number } {
  const geometry = src.clone();
  const pos = geometry.getAttribute('position');
  const out = new Float32Array(pos.count * 3);
  const gap = head.chinY - head.cutY;
  const extra = Math.max(0, Math.min(0.03, 0.02 - gap));            // a chin that sits right on the cut is lifted so a little neck shows
  const dy = body.cutY - head.cutY + extra;
  const A = head.ring, B = body.ring;
  const sx = Math.max(0.8, Math.min(1.25, B.rx / A.rx * 1.012)), sz = Math.max(0.8, Math.min(1.25, B.rz / A.rz * 1.012));
  const lo = head.cutY - head.headDown, span = 0.11;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const w = 1 - smooth((y - lo) / span);                           // 1 at the head's lower edge, 0 a hand's width above the cut
    const fx = 1 + (sx - 1) * w, fz = 1 + (sz - 1) * w;
    const cx = A.cx + (B.cx - A.cx) * w, cz = A.cz + (B.cz - A.cz) * w;
    out[i * 3] = cx + (x - A.cx) * fx; out[i * 3 + 1] = y + dy; out[i * 3 + 2] = cz + (z - A.cz) * fz;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(out, 3));
  return { geometry, dy };
}

export interface BuildOptions { lib: Library; look: Look; clipNames: string[]; seed?: number }

export async function buildFigure(opts: BuildOptions): Promise<Figure> {
  const { lib, look } = opts;
  const prefix = '/m/';
  const [bodyMeta, headMeta] = await Promise.all([lib.meta<BodyMeta>(`${prefix}${look.body}.json`), lib.meta<HeadMeta>(`${prefix}${look.head}.json`)]);
  const [bodyGltf, headGltf, bodyMask, headMask] = await Promise.all([lib.glb(`${prefix}${bodyMeta.file}`), lib.glb(`${prefix}${headMeta.file}`), lib.mask(`${prefix}${bodyMeta.mask}`), lib.mask(`${prefix}${headMeta.mask}`)]);
  const root = new THREE.Group(), scene = clone(bodyGltf.scene) as THREE.Group; root.add(scene);
  const bones: Record<string, THREE.Bone> = {}; let bodyMesh!: THREE.SkinnedMesh;
  scene.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone; if ((o as THREE.SkinnedMesh).isSkinnedMesh) bodyMesh = o as THREE.SkinnedMesh; });
  const tinted: Tinted[] = [];
  const bodyTint = tintMaterial(bodyMesh.material as THREE.MeshStandardMaterial, { mask: bodyMask, refs: bodyMeta.refs, tintable: bodyMeta.tintable, neck: { cx: bodyMeta.ring.cx, cz: bodyMeta.ring.cz, rx: bodyMeta.ring.rx, rz: bodyMeta.ring.rz, cutY: bodyMeta.cutY } });
  bodyMesh.material = bodyTint.material; bodyMesh.frustumCulled = false; tinted.push(bodyTint);
  const printFile = look.print ? PRINT_SETS[look.body]?.[look.print - 1] : undefined;
  if (printFile) bodyTint.setPrint(await lib.print(`${prefix}print-${printFile}.jpg`));
  // the head
  let headSrc!: THREE.SkinnedMesh; headGltf.scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) headSrc = o as THREE.SkinnedMesh; });
  const { geometry, dy } = fitHead(headSrc.geometry, headMeta, bodyMeta);
  const headBones = headSrc.skeleton.bones.map((b) => b.name), bodyBones = bodyMesh.skeleton.bones.map((b) => b.name);
  if (headBones.join() !== bodyBones.join()) {
    const remap = headBones.map((n) => bodyBones.indexOf(n)); const si = geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
    for (let i = 0; i < si.count; i++) for (let c = 0; c < 4; c++) si.setComponent(i, c, remap[si.getComponent(i, c)]!);
  }
  const eyes: EyeSpec = { ...headMeta.eyes, eyeL: [headMeta.eyes.eyeL[0], headMeta.eyes.eyeL[1] + dy], eyeR: [headMeta.eyes.eyeR[0], headMeta.eyes.eyeR[1] + dy] };
  const headTint = tintMaterial(headSrc.material as THREE.MeshStandardMaterial, { mask: headMask, refs: { skin: headMeta.refSkin, top: null, bottom: null, shoes: null }, eyes }); tinted.push(headTint);
  const head = new THREE.SkinnedMesh(geometry, headTint.material); head.name = 'head'; head.frustumCulled = false;
  head.bind(bodyMesh.skeleton, bodyMesh.bindMatrix); bodyMesh.parent!.add(head);
  head.morphTargetDictionary = { ...(headSrc.morphTargetDictionary ?? {}) }; head.morphTargetInfluences = (headSrc.morphTargetInfluences ?? []).map(() => 0);
  const meshes: THREE.SkinnedMesh[] = [bodyMesh, head];
  // hair and headwear
  const pieces: HairPiece[] = await buildHair({ lib, look, head: headMeta, dy, geometry, skeleton: bodyMesh.skeleton, bindMatrix: bodyMesh.bindMatrix });
  for (const p of pieces) { bodyMesh.parent!.add(p.mesh); meshes.push(p.mesh); tinted.push(...(p.tinted ?? [])); }
  const fig: Partial<Figure> = { root, look, meshes, tinted, head, headTint, bodyMeta, headMeta };
  const targets = { skin: look.skin, top: bodyMeta.refs.top ? look.top : undefined, bottom: bodyMeta.refs.bottom ? look.bottom : undefined, shoes: look.shoes };
  headTint.setTargets({ skin: look.skin }); bodyTint.setTargets(bodyMeta.tintable ? targets : { skin: look.skin, shoes: look.shoes });
  // build and head size: bones are scaled, the clips never touch scale
  applyShape(bones, look);
  const mixer = new THREE.AnimationMixer(scene);
  const actions = new Map<string, THREE.AnimationAction>([...lib.clips].map(([n, c]) => [n, mixer.clipAction(c)]));
  const materials = tinted.map((t) => t.material);
  const rig: Rig = { look: { body: look.sex } as unknown as Rig['look'], root, scene, bones, mixer, actions, face: [head], eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials, meshes, dispose() {} };
  fig.rig = rig; fig.driver = new LifeDriver(rig, opts.seed ?? 31);
  let tris = 0; for (const m of meshes) tris += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3;
  fig.triangles = Math.round(tris); fig.drawCalls = meshes.length;
  await Promise.all([bodyMeta.file, headMeta.file, bodyMeta.mask, headMeta.mask].map((f) => lib.size(`${prefix}${f}`)));
  fig.bytes = [bodyMeta.file, headMeta.file, bodyMeta.mask, headMeta.mask].reduce((a, f) => a + (lib.sizes.get(`${prefix}${f}`) ?? 0), 0);
  fig.dispose = () => { for (const t of tinted) t.dispose(); head.geometry.dispose(); for (const p of pieces) p.mesh.geometry.dispose(); };
  root.userData.figure = fig;
  const height = look.height ?? 1; root.scale.setScalar(height);
  return fig as Figure;
}

/** Build (width of the torso and limbs) and head size, as bone scales. The head is kept out of the torso's scale so only the body gets wider. */
export function applyShape(bones: Record<string, THREE.Bone>, look: Look): void {
  const b = look.build ?? 0, w = 1 + 0.13 * b, wl = 1 + 0.10 * b;
  const sw = look.sex === 'male' ? 1.09 : 1.05, swz = 1 + (sw - 1) * 0.5;       // the default adult shoulder width, on top of the build
  bones['spine_01']?.scale.set(w, 1, w); bones['spine_03']?.scale.set(sw, 1, swz); bones['neck_01']?.scale.set(1 / (w * sw), 1, 1 / (w * swz));
  for (const s of ['l', 'r']) { bones[`thigh_${s}`]?.scale.set(wl, 1, wl); }
  // forearms and hands: the generated ones are chunkier than the game body's, so they are brought down (the clips never touch scale; the hand cancels the forearm's share)
  const fa = look.sex === 'male' ? 0.9 : 0.86, ha = look.sex === 'male' ? 0.84 : 0.80;
  for (const s of ['l', 'r']) { bones[`lowerarm_${s}`]?.scale.set(fa, 1, fa); bones[`hand_${s}`]?.scale.set(ha / fa, ha, ha / fa); }
  const hs = look.headSize ?? (look.sex === 'male' ? 0.92 : 0.95); bones['Head']?.scale.set(hs, hs, hs);
}
