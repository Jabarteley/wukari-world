// Isolated Meshy Pro trial: today's procedural body beside the Pro hero/crowd files, all against the shipped Freedom Park scene.
// Pro GLBs must contain only the game skeleton and no animation; poses come solely from the shipped game clip pack.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { loadCityContent } from '../../../../src/game/cities/registry.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { BODY_MANIFEST } from '../../../../src/scene/body/manifest.ts';
import { buildVenueScene } from '../../../../src/scene/venue-scenes.ts';
import type { SceneEntry } from '../../../../src/scene/types.ts';
import { LifeDriver } from '../page4/anim.ts';
import type { Look, Rig } from '../page3/character.ts';
import { LOOKS, oldLookOf } from '../page/looks.ts';

type Skeleton = 'male' | 'female';
type Kind = 'today' | 'hero' | 'crowd';
type Pose = 'idle' | 'walk' | 'sit' | 'dance';
type View = 'front' | 'tq' | 'side';
interface ProMeta { height: number; skeleton: Skeleton; sourceRig: 'pro' }
interface InitOptions { prefix: string; skeleton: Skeleton }
interface Spec { kinds: Kind[]; pose: Pose; view?: View; phase?: number; width?: number; height?: number; furniture?: boolean }
interface Facts { meshes: number; skinnedMeshes: number; geometries: number; triangles: number; joints: number; jointNames: string[]; materials: number; textures: number; sourceAnimations: number }
interface Source { gltf: GLTF; meta: ProMeta; facts: Facts }
interface Slot { kind: Kind; holder: THREE.Group; rig?: Rig; driver?: LifeDriver; label: string; dispose(): void }

const ALLOWED_CLIPS = ['idle', 'walk', 'sit', 'dance'] as const;
const PREFIX = /^[a-z0-9][a-z0-9-]*$/;
const GAME_JOINTS = [...BODY_MANIFEST.bones].sort();
const SELECTED_LOOK: Record<Skeleton, Look> = {
  male: { ...LOOKS['man-lowcut']!, id: 'pro-man', label: 'Man, low-cut, kaftan' },
  female: { ...LOOKS['woman-braids']!, id: 'pro-woman', label: 'Woman, braids, dress' },
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
const sun = new THREE.DirectionalLight(light.sun[0], light.sun[1]); sun.position.set(...light.sun[2]); sun.castShadow = true; sun.shadow.mapSize.set(1536, 1536);
const rim = new THREE.DirectionalLight(light.rim[0], light.rim[1]); rim.position.set(-5, 4, -6); scene.add(hemi, sun, sun.target, rim);

let prefix = '', skeleton: Skeleton = 'male', clips: THREE.AnimationClip[] = [], sources: Record<'hero' | 'crowd', Source> | null = null, todayFacts: Facts | null = null;
let slots: Slot[] = [], currentSpec: Spec = { kinds: ['today', 'hero', 'crowd'], pose: 'idle' };
const look = (): Look => SELECTED_LOOK[skeleton];
const treeAnchor = venue.anchors.trees, target = {
  x: treeAnchor.act?.x ?? treeAnchor.x, z: treeAnchor.act?.z ?? treeAnchor.z,
  ry: treeAnchor.act?.ry ?? treeAnchor.ry, seat: treeAnchor.act?.seat ?? 0.6,
};

function factsOfObject(root: THREE.Object3D, sourceAnimations: number): Facts {
  const geometries = new Set<THREE.BufferGeometry>(), joints = new Set<string>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>();
  let meshes = 0, skinnedMeshes = 0, triangles = 0;
  root.traverse((object) => {
    if ((object as THREE.Bone).isBone) joints.add(object.name);
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes += 1; if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skinnedMeshes += 1;
    geometries.add(mesh.geometry); const position = mesh.geometry.getAttribute('position'); triangles += (mesh.geometry.index?.count ?? position?.count ?? 0) / 3;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  return { meshes, skinnedMeshes, geometries: geometries.size, triangles: Math.round(triangles), joints: joints.size, jointNames: [...joints].sort(), materials: materials.size, textures: textures.size, sourceAnimations };
}
const factsOf = (gltf: GLTF): Facts => factsOfObject(gltf.scene, gltf.animations.length);

function clearSlots(): void { for (const slot of slots) { scene.remove(slot.holder); slot.dispose(); } slots = []; }
function heightOf(object: THREE.Object3D): number { const box = new THREE.Box3().setFromObject(object); return box.max.y - box.min.y; }
function buildPro(kind: 'hero' | 'crowd', targetHeight: number): { root: THREE.Group; rig: Rig; driver: LifeDriver; scale: number } {
  const source = sources![kind], body = clone(source.gltf.scene), root = new THREE.Group(); root.add(body);
  const bones: Record<string, THREE.Bone> = {}, meshes: THREE.SkinnedMesh[] = [], materials: THREE.Material[] = [];
  body.traverse((object) => {
    if ((object as THREE.Bone).isBone) bones[object.name] = object as THREE.Bone;
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.frustumCulled = false; meshes.push(mesh);
    const owned = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((material) => { const made = material.clone(); materials.push(made); return made; });
    mesh.material = Array.isArray(mesh.material) ? owned : owned[0]!;
  });
  const bindBox = new THREE.Box3().setFromObject(root), scale = targetHeight / (bindBox.max.y - bindBox.min.y);
  root.scale.setScalar(scale); root.position.y = -bindBox.min.y * scale;
  const mixer = new THREE.AnimationMixer(body), actions = new Map<string, THREE.AnimationAction>(clips.map((clip, index) => [ALLOWED_CLIPS[index]!, mixer.clipAction(clip)]));
  const rig: Rig = { look: look(), root, scene: body, bones, mixer, actions, face: [], eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials, meshes, dispose() { for (const material of materials) material.dispose(); } };
  return { root, rig, driver: new LifeDriver(rig, kind === 'hero' ? 31 : 47), scale: targetHeight / source.meta.height };
}

function poseRig(slot: Slot, pose: Pose, phase: number): void {
  if (!slot.rig || !slot.driver) return;
  const action = slot.rig.actions.get(pose); if (!action) throw new Error(`Game clip ${pose} is unavailable`);
  slot.driver.setClip(pose, pose === 'idle' ? 0 : action.getClip().duration * phase, false);
  slot.driver.enabled = { blink: false, breathe: true, shift: true, look: false }; slot.driver.target = null; slot.driver.update(1 / 30);
}

function addSlot(kind: Kind, index: number, count: number, spec: Spec, targetHeight: number): void {
  const holder = new THREE.Group(), phase = spec.phase ?? 0.28, furniture = spec.furniture === true;
  holder.position.x = furniture ? 0 : (index - (count - 1) / 2) * 2.35;
  holder.rotation.y = furniture ? target.ry : spec.view === 'side' ? Math.PI / 2 : spec.view === 'tq' ? 0.55 : 0;
  const label = kind === 'today' ? 'Today · game body' : kind === 'hero' ? 'Pro · hero' : 'Pro · crowd';
  let dispose = (): void => {};
  const slot: Slot = { kind, holder, label, dispose: () => dispose() };
  if (kind === 'today') {
    const pose = spec.pose === 'idle' ? 'stand' : spec.pose;
    const avatar = buildAvatar(kit, oldLookOf(look()), { detail: 'medium', pose, stride: phase, seat: furniture ? target.seat : 0.47, appearanceFit: true });
    holder.add(avatar); dispose = avatar.userData.dispose;
  } else {
    const built = buildPro(kind, targetHeight); holder.add(built.root); slot.rig = built.rig; slot.driver = built.driver; dispose = built.rig.dispose; poseRig(slot, spec.pose, phase);
    holder.position.y = furniture ? target.seat - 0.47 * built.scale : 0;
  }
  for (const object of holder.children) object.traverse((part) => { const mesh = part as THREE.Mesh; if (mesh.isMesh) { mesh.castShadow = true; mesh.receiveShadow = true; } });
  scene.add(holder); slots.push(slot);
}

function labelsFor(spec: Spec): void {
  labels.innerHTML = '';
  for (const slot of slots) { const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = slot.label; labels.appendChild(tag); }
  labels.style.gridTemplateColumns = `repeat(${slots.length},1fr)`;
  caption.textContent = `Freedom Park · ${spec.pose}${spec.furniture ? ' · shipped bench' : ''} · ${prefix} · ${skeleton} game skeleton`;
}

async function setup(spec: Spec): Promise<void> {
  currentSpec = spec; clearSlots();
  const width = spec.width ?? innerWidth, height = spec.height ?? innerHeight;
  renderer.setPixelRatio(1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const current = buildAvatar(kit, oldLookOf(look()), { detail: 'medium', pose: 'stand', appearanceFit: true });
  const targetHeight = heightOf(current); todayFacts ??= factsOfObject(current, 0); current.userData.dispose();
  const focus = spec.furniture ? { x: target.x, z: target.z } : { x: 0, z: 3 };
  venue.group.position.set(-focus.x, 0, -focus.z);
  spec.kinds.forEach((kind, index) => addSlot(kind, index, spec.kinds.length, spec, targetHeight));
  if (spec.furniture) for (const slot of slots) slot.holder.position.set(0, slot.holder.position.y, 0);
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), subjectWidth = spec.kinds.length > 1 ? (spec.kinds.length - 1) * 2.35 + 1.25 : 1.4;
  const distance = Math.max(3.4 / 2 / tan, subjectWidth / 2 / (tan * camera.aspect));
  camera.position.set(spec.view === 'side' ? distance : spec.view === 'tq' ? distance * 0.45 : 0, 2.8, spec.view === 'side' ? 0.4 : distance);
  camera.lookAt(0, 1.15, 0); sun.target.position.set(0, 1, 0); scene.background = new THREE.Color(venue.background); labelsFor(spec);
}

function render(): void { renderer.render(scene, camera); }

const api = {
  async init(options: InitOptions): Promise<boolean> {
    if (!PREFIX.test(options.prefix) || (options.skeleton !== 'male' && options.skeleton !== 'female')) throw new Error('Invalid Pro model selection');
    prefix = options.prefix; skeleton = options.skeleton; todayFacts = null; await MeshoptDecoder.ready;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), clipPack = await loader.loadAsync('/body/clip-pack.glb');
    clips = ALLOWED_CLIPS.map((name) => { const chosen = skeleton === 'female' && clipPack.animations.some((candidate) => candidate.name === `${name}-female`) ? `${name}-female` : name; const clip = clipPack.animations.find((candidate) => candidate.name === chosen); if (!clip) throw new Error(`Missing game clip ${name}`); return clip; });
    const loaded = {} as Record<'hero' | 'crowd', Source>;
    for (const kind of ['hero', 'crowd'] as const) {
      const [gltf, response] = await Promise.all([loader.loadAsync(`/m/${prefix}-${kind}.glb`), fetch(`/m/${prefix}-${kind}.json`)]);
      if (!response.ok) throw new Error(`${prefix}-${kind}.json answered ${response.status}`);
      const meta = await response.json() as ProMeta;
      if (meta.sourceRig !== 'pro' || meta.skeleton !== skeleton || !Number.isFinite(meta.height) || meta.height <= 0) throw new Error(`${prefix}-${kind} metadata does not match ${skeleton} Pro selection`);
      const facts = factsOf(gltf);
      if (facts.sourceAnimations !== 0) throw new Error(`${prefix}-${kind} contains vendor animation`);
      if (JSON.stringify(facts.jointNames) !== JSON.stringify(GAME_JOINTS)) throw new Error(`${prefix}-${kind} does not contain exactly the 23 game joints`);
      loaded[kind] = { gltf, meta, facts };
    }
    sources = loaded; return true;
  },
  async setup(spec: Spec): Promise<void> { await setup(spec); },
  render,
  diagnostics() {
    if (!sources) throw new Error('Not initialised');
    return { prefix, skeleton, clips: clips.map((clip) => clip.name), today: todayFacts, hero: { meta: sources.hero.meta, ...sources.hero.facts }, crowd: { meta: sources.crowd.meta, ...sources.crowd.facts }, scene: { name: 'Freedom Park', kind: venue.kind, ...venue.stats() }, shown: { pose: currentSpec.pose, kinds: currentSpec.kinds } };
  },
  ready: true,
};
(window as unknown as { proof: typeof api }).proof = api;
const params = new URLSearchParams(location.search), selectedPrefix = params.get('prefix'), selectedSkeleton = params.get('skeleton');
if (selectedPrefix && (selectedSkeleton === 'male' || selectedSkeleton === 'female')) {
  await api.init({ prefix: selectedPrefix, skeleton: selectedSkeleton });
  await api.setup({ kinds: ['today', 'hero', 'crowd'], pose: 'idle', view: 'tq' }); api.render();
}
