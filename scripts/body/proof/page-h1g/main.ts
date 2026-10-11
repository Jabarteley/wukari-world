// Frames for the character gallery: today's figure beside the generated ones, in the shipped Freedom Park scene and light, driven by the shipped clip
// pack and the shipped life layer (blink, gaze, moods, talking).  Nothing here is part of the game build.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { loadCityContent } from '../../../../src/game/cities/registry.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { SIT, LIFT } from '../../../../src/scene/body/skinned.ts';
import { buildVenueScene } from '../../../../src/scene/venue-scenes.ts';
import type { SceneEntry } from '../../../../src/scene/types.ts';
import { LifeDriver } from '../page4/anim.ts';
import type { Mood } from '../page4/anim.ts';
import type { Look, Rig } from '../page3/character.ts';
import { LOOKS, oldLookOf } from '../page/looks.ts';
import { prepareFigure } from './figure.ts';
import type { EyeSpec, Figure, Tint } from './figure.ts';

type Who = 'man' | 'woman';
type Lod = 'hero' | 'crowd' | 'today';
interface Meta { height: number; skeleton: 'male' | 'female'; sourceRig: 'pro'; eyes?: { eyeL: [number, number]; eyeR: [number, number]; a: number; b: number; skin: [number, number, number]; iris: [number, number, number] }; skinRef?: [number, number, number]; mask?: string }
interface Item { who: Who; lod: Lod; tint?: Tint; x?: number; ry?: number; label?: string; hair?: string; hairTint?: string; face?: FaceSpec; pose?: string; phase?: number; seat?: number; z?: number }
interface FaceSpec { blink?: number; gaze?: [number, number]; mood?: Mood; viseme?: { shape: string; amount: number }; say?: string; sayAt?: number }
interface Spec {
  items: Item[]; pose: string; phase?: number; width: number; height: number;
  cam?: { target: [number, number, number]; dist: number; az: number; lift?: number; fov?: number };
  furniture?: 'bench' | 'boxes'; spacing?: number; caption?: string; labels?: boolean; place?: 'park-path' | 'plaza';
}
interface Source { gltf: GLTF; meta: Meta; mask?: THREE.Texture; hair: Map<string, GLTF> }
interface Slot { holder: THREE.Group; rig?: Rig; driver?: LifeDriver; figure?: Figure; label: string; dispose(): void; facts?: Facts }
interface Facts { triangles: number; joints: number; materials: number; textures: number; drawCalls: number; meshes: number }

const CLIPS = ['idle', 'walk', 'jog', 'sit', 'dance', 'interact', 'eat', 'drink'];
const LOOK: Record<Who, Look> = {
  man: { ...LOOKS['man-lowcut']!, id: 'gal-man', label: 'man' },
  woman: { ...LOOKS['woman-braids']!, id: 'gal-woman', label: 'woman' },
};
const canvas = document.getElementById('c') as HTMLCanvasElement;
const labels = document.getElementById('labels') as HTMLDivElement;
const caption = document.getElementById('caption') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100), kit = createKit();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
await loadCityContent('lagos');
const venue: SceneEntry = buildVenueScene(kit, { id: 'park', label: 'Freedom Park', scene: { kind: 'park', spots: [{ id: 'trees', label: 'Under the trees' }] } }, 'lagos');
venue.group.getObjectByName('avatar')!.visible = false; scene.add(venue.group);
const light = venue.lighting(), hemi = new THREE.HemisphereLight(light.hemi[0], light.hemi[1], light.hemi[2]);
const sun = new THREE.DirectionalLight(light.sun[0], light.sun[1]); sun.position.set(...light.sun[2]); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -4; sun.shadow.camera.right = 4; sun.shadow.camera.top = 4; sun.shadow.camera.bottom = -4;
const rim = new THREE.DirectionalLight(light.rim[0], light.rim[1]); rim.position.set(-5, 4, -6); scene.add(hemi, sun, sun.target, rim);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let clips: Map<string, THREE.AnimationClip> = new Map();
const sources = new Map<string, Source>();
let slots: Slot[] = [];
const treeAnchor = venue.anchors.trees, target = { x: treeAnchor.act?.x ?? treeAnchor.x, z: treeAnchor.act?.z ?? treeAnchor.z, ry: treeAnchor.act?.ry ?? treeAnchor.ry, seat: treeAnchor.act?.seat ?? 0.6 };
const extras: THREE.Object3D[] = [];

const heightOf = (o: THREE.Object3D): number => { const b = new THREE.Box3().setFromObject(o); return b.max.y - b.min.y; };
function factsOf(root: THREE.Object3D): Facts {
  const geoms = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>(), texs = new Set<THREE.Texture>(), joints = new Set<string>();
  let triangles = 0, drawCalls = 0, meshes = 0;
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) joints.add(o.name);
    const m = o as THREE.Mesh; if (!m.isMesh) return;
    meshes++; geoms.add(m.geometry); const p = m.geometry.getAttribute('position'); triangles += (m.geometry.index?.count ?? p.count) / 3;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) { drawCalls++; mats.add(mat); for (const v of Object.values(mat)) if (v instanceof THREE.Texture) texs.add(v); }
  });
  return { triangles: Math.round(triangles), joints: joints.size, materials: mats.size, textures: texs.size, drawCalls, meshes };
}

async function loadSource(who: Who, lod: 'hero' | 'crowd'): Promise<Source> {
  const key = `${who}-${lod}`, got = sources.get(key); if (got) return got;
  const [gltf, resp] = await Promise.all([loader.loadAsync(`/m/${key}.glb`), fetch(`/m/${key}.json`)]);
  const meta = await resp.json() as Meta;
  let mask: THREE.Texture | undefined;
  if (meta.mask) { mask = await new THREE.TextureLoader().loadAsync(`/m/${meta.mask}`); mask.flipY = false; mask.colorSpace = THREE.NoColorSpace; mask.magFilter = THREE.NearestFilter; mask.minFilter = THREE.NearestFilter; mask.generateMipmaps = false; }
  const s: Source = { gltf, meta, mask, hair: new Map() }; sources.set(key, s); return s;
}
async function hairGltf(src: Source, name: string): Promise<GLTF> {
  const got = src.hair.get(name); if (got) return got;
  const g = await loader.loadAsync(`/m/${name}.glb`); src.hair.set(name, g); return g;
}

function clear(): void { for (const s of slots) { scene.remove(s.holder); s.dispose(); } slots = []; for (const e of extras) scene.remove(e); extras.length = 0; }

async function addNew(item: Item, spec: Spec, index: number, count: number, targetHeight: number): Promise<void> {
  const src = await loadSource(item.who, item.lod as 'hero' | 'crowd');
  const body = clone(src.gltf.scene), root = new THREE.Group(); root.add(body);
  const bones: Record<string, THREE.Bone> = {}, meshes: THREE.SkinnedMesh[] = [], materials: THREE.Material[] = [];
  body.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone; });
  let figure: Figure | undefined; const face: THREE.SkinnedMesh[] = [];
  body.traverse((o) => {
    const m = o as THREE.SkinnedMesh; if (!m.isSkinnedMesh) return;
    m.frustumCulled = false; meshes.push(m);
    const mat = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mat; materials.push(mat);
    if (m.morphTargetDictionary) face.push(m);
    const meta = src.meta;
    const eyes: EyeSpec | undefined = meta.eyes ? { ...meta.eyes } : undefined;
    const skinRef = meta.skinRef ? (() => { const c = new THREE.Color().setRGB(meta.skinRef![0], meta.skinRef![1], meta.skinRef![2], THREE.SRGBColorSpace); return [c.r, c.g, c.b] as [number, number, number]; })() : undefined;
    figure = prepareFigure(mat as THREE.MeshStandardMaterial, { eyes, mask: src.mask, skinRef });
    figure.tint(item.tint ?? {});
  });
  const bindBox = new THREE.Box3().setFromObject(root), scale = targetHeight / (bindBox.max.y - bindBox.min.y);
  root.scale.setScalar(scale); root.position.y = -bindBox.min.y * scale;
  const mixer = new THREE.AnimationMixer(body);
  const actions = new Map<string, THREE.AnimationAction>([...clips].map(([n, c]) => [n, mixer.clipAction(c)]));
  const rig: Rig = { look: LOOK[item.who], root, scene: body, bones, mixer, actions, face, eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials, meshes, dispose() { for (const m of materials) m.dispose(); } };
  if (item.hair) {
    const hg = await hairGltf(src, item.hair);
    hg.scene.traverse((o) => {
      const hm = o as THREE.Mesh; if (!hm.isMesh) return;
      const skel = meshes[0]!.skeleton, headIdx = skel.bones.findIndex((b) => b.name === 'Head');
      const geo = hm.geometry.clone(); const n = geo.getAttribute('position').count;
      const idx = new Uint16Array(n * 4), wt = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { idx[i * 4] = headIdx; wt[i * 4] = 1; }
      geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(idx, 4)); geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(wt, 4));
      const mat = (hm.material as THREE.MeshStandardMaterial).clone();
      if (item.hairTint) mat.color.set(item.hairTint);
      const sm = new THREE.SkinnedMesh(geo, mat); sm.frustumCulled = false; sm.bind(skel, meshes[0]!.bindMatrix); sm.name = 'hair';
      body.add(sm); meshes.push(sm); materials.push(mat);
    });
  }
  const driver = new LifeDriver(rig, item.who === 'man' ? 31 : 47);
  const holder = new THREE.Group(); holder.add(root);
  const slot: Slot = { holder, rig, driver, figure, label: item.label ?? `${item.who} · ${item.lod}`, dispose: () => rig.dispose(), facts: factsOf(root) };
  place(slot, item, spec, index, count, scale);
  poseNew(slot, item, spec);
  slots.push(slot); scene.add(holder);
}

function place(slot: Slot, item: Item, spec: Spec, index: number, count: number, scale: number): void {
  const holder = slot.holder, furniture = spec.furniture, pose = item.pose ?? spec.pose;
  const gap = spec.spacing ?? 2.35;
  const x = item.x ?? (index - (count - 1) / 2) * gap;
  holder.rotation.y = item.ry ?? 0;
  if (furniture === 'bench') {
    holder.rotation.y = target.ry;
    if (slot.rig) holder.position.set(Math.sin(target.ry) * SIT.back * scale + 0, target.seat - SIT.contact * scale, Math.cos(target.ry) * SIT.back * scale);
    else holder.position.set(0, 0, 0);
  } else if (pose === 'sit' && slot.rig) {
    const seat = item.seat ?? 0.6, ry = item.ry ?? 0;
    holder.position.set(x + Math.sin(ry) * SIT.back * scale, seat - SIT.contact * scale, (item.z ?? 0) + Math.cos(ry) * SIT.back * scale);
  } else holder.position.set(x, slot.rig ? LIFT * scale + 0.06 : 0.06, item.z ?? 0);
}

function poseNew(slot: Slot, item: Item, spec: Spec): void {
  const driver = slot.driver!, rig = slot.rig!, pose = item.pose ?? spec.pose;
  const action = rig.actions.get(pose); if (!action) throw new Error(`clip ${pose} missing`);
  const phase = item.phase ?? spec.phase ?? 0.28;
  driver.setClip(pose, pose === 'idle' ? 0 : action.getClip().duration * phase, false);
  driver.enabled = { blink: false, breathe: true, shift: true, look: false }; driver.target = null;
  const f = item.face ?? {};
  driver.mood = f.mood ?? 'neutral';
  driver.forceBlink = f.blink ?? 0; driver.forceGaze = f.gaze ?? [0, 0];
  driver.forceViseme = f.viseme ?? null;
  if (f.say) { driver.say(f.say); }
  // settle the eased values, then take the frame
  const settle = f.say ? (f.sayAt ?? 0.3) : 0;
  for (let i = 0; i < 12; i++) driver.update(1 / 30);
  if (settle > 0) { for (let i = 0; i < Math.round(settle * 30); i++) driver.update(1 / 30); }
  const w = driver.faceWeights;
  slot.figure?.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0);
  slot.figure?.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0);
}

function addToday(item: Item, spec: Spec, index: number, count: number): void {
  const pose = item.pose ?? spec.pose, phase = item.phase ?? spec.phase ?? 0.28, look = LOOK[item.who];
  const holder = new THREE.Group();
  const avatar = buildAvatar(kit, oldLookOf(look), { detail: 'medium', pose: (pose === 'idle' ? 'stand' : pose) as 'stand', stride: phase, seat: spec.furniture === 'bench' ? target.seat : (item.seat ?? 0.47), appearanceFit: true });
  holder.add(avatar);
  const x = item.x ?? (index - (count - 1) / 2) * (spec.spacing ?? 2.35);
  holder.rotation.y = item.ry ?? 0;
  if (spec.furniture === 'bench') holder.position.set(0, 0, 0);
  else holder.position.set(x, pose === 'sit' ? (item.seat ?? 0.6) - 0.47 : 0.06, item.z ?? 0);
  slots.push({ holder, label: item.label ?? 'Today', dispose: avatar.userData.dispose, facts: factsOf(avatar) }); scene.add(holder);
}

let targetHeights: Record<Who, number> | null = null;
async function setup(spec: Spec): Promise<void> {
  clear();
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false); camera.aspect = spec.width / spec.height; camera.fov = spec.cam?.fov ?? 38; camera.updateProjectionMatrix();
  canvas.style.width = `${spec.width}px`; canvas.style.height = `${spec.height}px`;
  if (!targetHeights) {
    targetHeights = {} as Record<Who, number>;
    for (const who of ['man', 'woman'] as Who[]) { const a = buildAvatar(kit, oldLookOf(LOOK[who]), { detail: 'medium', pose: 'stand', appearanceFit: true }); targetHeights[who] = heightOf(a); a.userData.dispose(); }
  }
  const furniture = spec.furniture === 'bench';
  const focus = furniture ? { x: target.x, z: target.z } : { x: 0, z: spec.place === 'plaza' ? 14 : 10.5 };
  venue.group.position.set(-focus.x, 0, -focus.z);
  if (spec.furniture === 'boxes') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.8 });
    spec.items.forEach((item, i) => {
      if ((item.pose ?? spec.pose) !== 'sit') return;
      const seat = item.seat ?? 0.6, x = item.x ?? (i - (spec.items.length - 1) / 2) * (spec.spacing ?? 2.35), z = item.z ?? 0, ry = item.ry ?? 0;
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, 0.42), mat), leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, seat - 0.05, 0.36), new THREE.MeshStandardMaterial({ color: 0x8a6440 }));
      const g = new THREE.Group(); top.position.y = seat - 0.025; leg.position.y = (seat - 0.05) / 2; g.add(top, leg); g.position.set(x, 0, z); g.rotation.y = ry; g.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
      scene.add(g); extras.push(g);
    });
  }
  const n = spec.items.length;
  for (let i = 0; i < n; i++) {
    const item = spec.items[i]!;
    if (item.lod === 'today') addToday(item, spec, i, n); else await addNew(item, spec, i, n, targetHeights[item.who]);
  }
  for (const s of slots) s.holder.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  labels.innerHTML = ''; labels.style.display = spec.labels === false ? 'none' : '';
  for (const s of slots) { const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = s.label; labels.appendChild(tag); }
  labels.style.gridTemplateColumns = `repeat(${slots.length},1fr)`;
  caption.textContent = spec.caption ?? ''; caption.style.display = spec.caption ? '' : 'none';
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  if (spec.cam) {
    const c = spec.cam, t = c.target; camera.position.set(t[0] + Math.sin(c.az) * c.dist, t[1] + (c.lift ?? 0.4), t[2] + Math.cos(c.az) * c.dist); camera.lookAt(...t);
  } else if (furniture) {
    const angle = target.ry + 0.35, dist = Math.max(3.4 / 2 / tan, 1.25 / 2 / (tan * camera.aspect));
    camera.position.set(Math.sin(angle) * dist, 1.8, Math.cos(angle) * dist); camera.lookAt(0, 1.15, 0);
  } else {
    const gap = spec.spacing ?? 2.35, subject = n > 1 ? (n - 1) * gap + 1.25 : 1.4, dist = Math.max(3.4 / 2 / tan, subject / 2 / (tan * camera.aspect));
    camera.position.set(0, 2.8, dist); camera.lookAt(0, 1.15, 0);
  }
  sun.target.position.set(0, 1, 0); scene.background = new THREE.Color(venue.background);
  sun.position.set(...light.sun[2]);
}

const api = {
  async init(): Promise<boolean> {
    await MeshoptDecoder.ready;
    const pack = await loader.loadAsync('/body/clip-pack.glb');
    clips = new Map(CLIPS.map((n) => [n, pack.animations.find((c) => c.name === n)!]));
    for (const who of ['man', 'woman'] as Who[]) for (const lod of ['hero', 'crowd'] as const) await loadSource(who, lod);
    return true;
  },
  setup, render() { renderer.render(scene, camera); },
  diagnostics() {
    return Object.fromEntries([...sources].map(([k, s]) => [k, { meta: s.meta, ...factsOf(s.gltf.scene) }]));
  },
  slotFacts() { return slots.map((s) => ({ label: s.label, ...s.facts })); },
  ready: true,
};
(window as unknown as { gal: typeof api }).gal = api;
