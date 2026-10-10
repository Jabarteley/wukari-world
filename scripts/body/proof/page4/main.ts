// Character proof 4: today's figure, the best hand-built character, and two generated characters (reduced and bound to the game
// skeleton) in one lit scene, driven by the capture script through window.proof. Same light rig and tone mapping as page 3.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { buildRig, loadAssets, partNames } from '../page3/character.ts';
import type { Assets, Look, Rig } from '../page3/character.ts';
import { LifeDriver } from './anim.ts';
import type { Mood } from './anim.ts';
import { oldLookOf } from '../page/looks.ts';
import { addFaceLife, renderFront } from './aiface.ts';
import type { FaceLife, FaceSpec } from './aiface.ts';

type Kind = 'old' | 'p3' | 'ais' | 'air';
type Pose = 'idle' | 'walk' | 'sit' | 'dance' | 'lie' | 'jog';
type View = 'front' | 'tq' | 'side' | 'back' | 'face' | 'hands' | 'far' | 'portrait' | 'legs';
interface Spec {
  mode: 'compare' | 'single' | 'row'; kinds?: Kind[]; view?: View; pose?: Pose; phase?: number; mood?: Mood; width?: number; height?: number;
  count?: number; shadows?: boolean; lod?: boolean; pr?: number; noGround?: boolean; ingame?: boolean; spread?: number; px?: number; face?: boolean;
}
interface AiMeta { height: number; face?: FaceSpec }
interface Slot { kind: Kind; holder: THREE.Group; x: number; label: string; rig?: Rig; driver?: LifeDriver; old?: THREE.Object3D; face?: FaceLife; restFoot?: number; fit?: number }

const canvas = document.getElementById('c') as HTMLCanvasElement;
const labels = document.getElementById('labels') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;
const key = new THREE.DirectionalLight(0xfff1e0, 2.3); key.position.set(-2.0, 3.2, 3.6); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2.8; key.shadow.camera.right = 2.8; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
const fill = new THREE.HemisphereLight(0xffe6d0, 0x7a5c48, 1.0);
const rim = new THREE.DirectionalLight(0xbcd8ff, 1.5); rim.position.set(2.6, 2.4, -3.2);
const kicker = new THREE.DirectionalLight(0xffe9d6, 0.9); kicker.position.set(2.6, 0.9, 3.4);
const faceFill = new THREE.DirectionalLight(0xfff3ea, 0.85); faceFill.position.set(0.4, 0.5, 4.0);
scene.add(key, key.target, fill, rim, kicker, faceFill);
const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.28 }));
catcher.rotation.x = -Math.PI / 2; catcher.receiveShadow = true; scene.add(catcher);
const blobTexture = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62); grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.22)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();
const blobGeo = new THREE.PlaneGeometry(1, 1);
const blobMat = new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, depthWrite: false });
const stoolMat = new THREE.MeshStandardMaterial({ color: 0x8b5a34, roughness: 0.75 });
const bedMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.9 });

const LOOK: Look = { id: 'woman-gele', label: 'Woman, gele, brown skin, blue aso-ebi gown', body: 'female', tone: '#7a4a2c', hair: 'gele', hairColor: '#1c1917', garment: 'dress', fabric: 'plain', color: '#1f4aa8', shoes: '#d9b98a' };

let slots: Slot[] = []; let props: THREE.Object3D[] = [];
let assets: Assets; let p3Height = 1.88;
const ai = new Map<string, { gltf: GLTF; meta: AiMeta; tex: Record<string, THREE.Texture> }>();
const kit = createKit();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
let yaw = 0, clock = 0, lookAtCamera = true;
let spec: Spec = { mode: 'single' };
const HEIGHT = 1.77;

function clearScene(): void { for (const s of slots) { scene.remove(s.holder); s.rig?.dispose(); } slots = []; labels.innerHTML = ''; }
const addBlob = (holder: THREE.Group, r = 0.42): void => { const b = new THREE.Mesh(blobGeo, blobMat); b.rotation.x = -Math.PI / 2; b.position.y = 0.004; b.scale.set(r * 2.6, r * 2.6, 1); holder.add(b); };
function addStool(holder: THREE.Group): void {
  const top = 0.47, s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 20), stoolMat); s.position.set(0, top - 0.025, -0.332);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, top - 0.05, 12), stoolMat); legs.position.set(0, (top - 0.05) / 2, -0.332);
  s.castShadow = legs.castShadow = true; s.receiveShadow = true; holder.add(s, legs);
}
function addBed(holder: THREE.Group): void { const b = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 2.1), bedMat); b.position.set(0, 0.1, 0); b.receiveShadow = true; holder.add(b); }
function fitOld(obj: THREE.Object3D, height: number): void { obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj), h = box.max.y - box.min.y; const s = height / h; obj.scale.multiplyScalar(s); obj.position.y -= box.min.y * s; }

/** A generated character as a Rig the life layer can drive (no morph targets: the face is a texture). */
function buildAi(name: string, lod: boolean, withFace: boolean): { rig: Rig; face?: FaceLife; height: number } {
  const src = ai.get(`${name}-${lod ? 'crowd' : 'hero'}`);
  if (!src) throw new Error(`${name} not loaded`);
  const sc = clone(src.gltf.scene);
  const root = new THREE.Group(); root.add(sc);
  const bones: Record<string, THREE.Bone> = {}; const meshes: THREE.SkinnedMesh[] = [];
  sc.traverse((n) => { if ((n as THREE.Bone).isBone) bones[n.name] = n as THREE.Bone; if ((n as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(n as THREE.SkinnedMesh); });
  let face: FaceLife | undefined;
  for (const m of meshes) {
    m.frustumCulled = false;
    const mat = (m.material as THREE.MeshStandardMaterial).clone(); m.material = mat; mat.envMapIntensity = 1.0;
    if (withFace && src.meta.face && !lod) {
      const base = renderFront(renderer, m, src.meta.face, 1024);
      face = addFaceLife(mat, base, src.meta.face);
    }
  }
  const mixer = new THREE.AnimationMixer(sc);
  const actions = new Map(assets.clips.map((c) => [c.name, mixer.clipAction(c)]));
  const rig: Rig = { look: { ...LOOK }, root, scene: sc, bones, mixer, actions, face: [], eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials: [], meshes, dispose() { /* shared */ } };
  return { rig, face, height: src.meta.height };
}

const clipFor = (pose: Pose, has: (n: string) => boolean): string => { const c = ({ idle: 'idle', walk: 'walk', sit: 'sit', dance: 'dance', lie: 'sleep', jog: 'jog' })[pose]; return has(`${c}-female`) ? `${c}-female` : c; };
function poseSlot(sl: Slot, pose: Pose, phase: number, play = false): void {
  if (!sl.rig || !sl.driver) return;
  const name = clipFor(pose, (n) => sl.rig!.actions.has(n));
  const dur = sl.rig.actions.get(name)!.getClip().duration;
  const base = name.replace(/-female$/, '');
  sl.driver.setClip(base, pose === 'sit' || pose === 'idle' ? (pose === 'sit' ? 0.5 : 0) : pose === 'lie' ? dur * 0.5 : dur * phase, play);
}

function addSlot(kind: Kind, x: number, label: string, s: Spec, seed: number): void {
  const holder = new THREE.Group(); holder.position.x = x; holder.rotation.y = yaw; scene.add(holder);
  const pose = s.pose ?? 'idle';
  const sl: Slot = { kind, holder, x, label };
  if (kind === 'old') {
    const old = buildAvatar(kit, oldLookOf({ ...LOOK, hair: 'braids' } as unknown as Parameters<typeof oldLookOf>[0]), { detail: 'high', pose: pose === 'idle' ? 'stand' : pose === 'walk' ? 'walk' : pose === 'sit' ? 'sit' : 'stand', stride: (s.phase ?? 0.25) * Math.PI * 2, seat: 0.47, appearanceFit: true });
    fitOld(old, HEIGHT); old.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    holder.add(old); sl.old = old;
  } else if (kind === 'p3') {
    const rig = buildRig(assets, LOOK, !!s.lod);
    const fit = HEIGHT / p3Height; rig.root.scale.setScalar(fit); sl.fit = fit;
    holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    sl.rig = rig; sl.driver = new LifeDriver(rig, seed);
  } else {
    const built = buildAi(kind === 'ais' ? 'stylised' : 'realistic', !!s.lod, s.face !== false);
    const fit = HEIGHT / built.height; built.rig.root.scale.setScalar(fit); sl.fit = fit;
    holder.add(built.rig.root); built.rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    sl.rig = built.rig; sl.driver = new LifeDriver(built.rig, seed); sl.face = built.face;
  }
  if (sl.driver) { sl.driver.mood = s.mood ?? 'neutral'; poseSlot(sl, pose, s.phase ?? 0.25); holder.updateMatrixWorld(true); sl.restFoot = footHeight(sl); }
  if (pose === 'sit') addStool(holder);
  if (pose === 'lie') addBed(holder);
  if (!s.noGround) addBlob(holder);
  slots.push(sl);
}
function footHeight(sl: Slot): number {
  let low = 9; const v = new THREE.Vector3(); const b = sl.rig!.bones;
  for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const bone = b[n]; if (bone) low = Math.min(low, bone.getWorldPosition(v).y - sl.holder.position.y + (n.startsWith('ball') ? -0.015 * (sl.fit ?? 1) : -0.07 * (sl.fit ?? 1))); }
  return low;
}
function stepSlot(sl: Slot, dt: number): void {
  if (!sl.driver) return;
  sl.driver.target = lookAtCamera ? camera.position.clone() : null; sl.driver.update(dt); sl.holder.updateMatrixWorld(true);
  if (sl.face) sl.face.update(sl.driver.faceWeights);
  if (sl.restFoot !== undefined && spec.pose !== 'lie') { sl.holder.position.y = -footHeight(sl); sl.holder.updateMatrixWorld(true); }
}
const NAMES: Record<Kind, string> = { old: 'Today', p3: 'Hand-built', ais: 'AI stylised', air: 'AI realistic' };

async function setup(s: Spec): Promise<void> {
  spec = s; clearScene();
  for (const p of props) scene.remove(p); props = [];
  renderer.shadowMap.enabled = s.shadows !== false; key.castShadow = s.shadows !== false; catcher.visible = s.shadows !== false;
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight;
  renderer.setPixelRatio(s.pr ?? 2); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  yaw = s.view === 'tq' ? 0.62 : s.view === 'back' ? Math.PI : s.view === 'side' ? 1.45 : 0;
  document.body.style.background = s.view === 'portrait' ? 'transparent' : '';
  if (s.mode === 'row') {
    const n = s.count ?? 12, cols = Math.min(n, n > 12 ? 10 : 12), step = 0.78;
    const kind = (s.kinds ?? ['ais'])[0]!;
    for (let i = 0; i < n; i++) {
      const rowIx = Math.floor(i / cols), colIx = i % cols, inRow = Math.min(cols, n - rowIx * cols);
      addSlot(kind, (colIx - (inRow - 1) / 2) * step, '', { ...s, pose: 'idle', phase: 0, face: false }, i + 7);
      const sl = slots[slots.length - 1]!; sl.holder.rotation.y = (i % 3 - 1) * 0.12; sl.holder.position.z = -rowIx * 0.9;
    }
  } else {
    const kinds = s.kinds ?? ['ais'];
    const portrait = h > w, spread = s.spread ?? (portrait ? 0.46 : 0.8);
    kinds.forEach((k, i) => addSlot(k, (i - (kinds.length - 1) / 2) * spread, NAMES[k], s, 5));
  }
  if (s.view === 'far') addProps();
  frame(s);
  for (const sl of slots) for (let i = 0; i < 20; i++) stepSlot(sl, 1 / 30);
}
function addProps(): void {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.8 })); crate.position.set(-2.4, 0.275, -0.6);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 10), new THREE.MeshStandardMaterial({ color: 0x3b4a3f, roughness: 0.7 })); lamp.position.set(2.6, 1.6, -0.9);
  for (const o of [crate, lamp]) { o.castShadow = o.receiveShadow = true; scene.add(o); props.push(o); }
}

function frame(s: Spec): void {
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight, aspect = w / h;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  let cy = 0.92, height = 2.1, width = 2.4;
  const view = s.view ?? 'front', headY = 1.64;
  const count = slots.length;
  if (s.mode === 'row') { const n = s.count ?? 12, cols = Math.min(n, n > 12 ? 10 : 12), rows = Math.ceil(n / cols); width = cols * 0.78 + 0.5; height = 2.0 + (rows - 1) * 0.5; cy = 0.93 - (rows - 1) * 0.1; }
  else {
    const spread = s.spread ?? (h > w ? 0.46 : 0.8);
    width = count === 1 ? 1.3 : (count - 1) * spread + 0.95; height = 2.05;
    if (view === 'face') { height = 0.5; width = count === 1 ? 0.45 : (count - 1) * spread + 0.5; cy = headY; }
    if (view === 'hands') { height = 0.8; width = 1.9; cy = 0.82; }
    if (view === 'legs') { height = 1.0; width = 1.4; cy = 0.5; }
    if (view === 'far') { height = 11; width = 9; cy = 0.9; }
    if (view === 'portrait') { height = 0.42; width = 0.42; cy = headY; }
  }
  const hb = slots.find((sl) => sl.rig)?.rig?.bones['Head'];
  if (hb && (view === 'face' || view === 'portrait')) { scene.updateMatrixWorld(true); cy = hb.getWorldPosition(new THREE.Vector3()).y + (view === 'face' ? 0.04 : 0.03); }
  if (s.ingame) { height = (1.77 / 120) * h; cy = height / 2 - 0.12; width = height * aspect; }   // the character stands 120 px tall in the frame
  const dist = Math.max(height / 2 / tan, width / 2 / (tan * aspect));
  camera.position.set(0, cy + (view === 'face' || view === 'portrait' || view === 'hands' ? 0 : view === 'far' ? 0.6 : 0.25), dist);
  camera.lookAt(new THREE.Vector3(0, cy, 0));
  key.target.position.set(0, 0.9, 0);
}
function render(): void {
  renderer.setClearColor(0x000000, 0); renderer.render(scene, camera); labels.innerHTML = '';
  if (spec.mode === 'compare') for (const sl of slots) {
    const p = new THREE.Vector3(sl.x, 0, 0).project(camera);
    const div = document.createElement('div'); div.className = 'tag'; div.textContent = sl.label; div.style.left = `${(p.x * 0.5 + 0.5) * 100}%`; labels.appendChild(div);
  }
}
function advance(seconds: number, dt = 1 / 30): void { let t = seconds; while (t > 1e-6) { const d = Math.min(dt, t); for (const sl of slots) stepSlot(sl, d); clock += d; t -= d; } }

const api = {
  async init(): Promise<boolean> {
    await MeshoptDecoder.ready;
    const names = ['char-female', 'hair-gele-female', 'dress-female', 'shoes-female', 'hair-gele-lod-female', 'crowd-gele-female'];
    assets = await loadAssets(['char-female', ...partNames(LOOK).slice(1), ...partNames(LOOK, true)]);
    void names;
    try { p3Height = ((await (await fetch('/n/char-female.json')).json()) as { height: number }).height; } catch { p3Height = 1.88; }
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const texLoader = new THREE.TextureLoader();
    void texLoader;
    for (const name of ['stylised', 'realistic']) for (const lod of ['hero', 'crowd']) {
      const base = `${name}-${lod}`;
      try {
        const gltf = await loader.loadAsync(`/m/${base}.glb`);
        const meta = (await (await fetch(`/m/${base}.json`)).json()) as AiMeta;
        ai.set(base, { gltf, meta, tex: {} });
      } catch (e) { console.error('not loaded', base, String(e)); }
    }
    return true;
  },
  loaded: (): string[] => [...ai.keys()],
  /** The flat front of a generated character's head over a rectangle (rest pose), as a data URL: used to find the eyes, brows and mouth. */
  flatFace(name: string, rect: [number, number, number, number], px = 1024): string {
    const src = ai.get(`${name}-hero`)!; const built = buildAi(name, false, false);
    const mesh = built.rig.meshes[0]!;
    const c = renderFront(renderer, mesh, { rect } as FaceSpec, px);
    return c.toDataURL('image/png');
  },
  joints(name: string): Record<string, number[]> { const built = buildAi(name, false, false); built.rig.root.updateMatrixWorld(true); const o: Record<string, number[]> = {}; for (const [k, b] of Object.entries(built.rig.bones)) o[k] = b.getWorldPosition(new THREE.Vector3()).toArray(); void ai; return o; },
  async setup(s: Spec): Promise<void> { await setup(s); },
  render(): void { render(); },
  advance(seconds: number): void { advance(seconds); },
  setMood(m: Mood): void { for (const s of slots) if (s.driver) s.driver.mood = m; },
  setBlink(v: number | null): void { for (const s of slots) if (s.driver) s.driver.forceBlink = v; },
  setViseme(shape: string | null, amount = 0.8): void { for (const s of slots) if (s.driver) s.driver.forceViseme = shape ? { shape: `viseme${shape.toUpperCase()}`, amount } : null; },
  say(text: string): void { for (const s of slots) s.driver?.say(text); },
  setLookAt(on: boolean): void { lookAtCamera = on; },
  setPose(pose: Pose, phase = 0, play = false): void { for (const s of slots) poseSlot(s, pose, phase, play); },
  enable(flags: Record<string, boolean>): void { for (const s of slots) if (s.driver) Object.assign(s.driver.enabled, flags); },
  info(): { triangles: number; calls: number; geometries: number } { return { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries }; },
  /** The painted face patches of the first generated character as data URLs (for checking the paint). */
  patches(): Record<string, string> | null { const f = slots.find((x) => x.face)?.face; return f ? { base: f.patches.base.toDataURL(), eyes: f.patches.eyes.toDataURL(), mouth: f.patches.mouth.toDataURL() } : null; },
  async bench(seconds: number): Promise<{ fps: number; frames: number; ms: number }> {
    let frames = 0; const t0 = performance.now(); let last = t0;
    await new Promise<void>((done) => { const tick = (now: number): void => { const dt = Math.min(0.05, (now - last) / 1000); last = now; for (const sl of slots) stepSlot(sl, dt); render(); frames++; if (now - t0 < seconds * 1000) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
    const ms = performance.now() - t0; return { fps: (frames * 1000) / ms, frames, ms };
  },
  ready: true, clock: (): number => clock,
};
(window as unknown as { proof: typeof api }).proof = api;
