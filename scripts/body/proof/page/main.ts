// The proof page: today's figure beside the proposed one, driven by the capture script through window.proof.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { buildRig, loadAssets, partNames } from './character.ts';
import type { Assets, Look, Rig } from './character.ts';
import { LifeDriver } from './anim.ts';
import type { Mood } from './anim.ts';
import { LOOKS, NPC_LOOKS, oldLookOf } from './looks.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const labels = document.getElementById('labels') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

// light rig: key (warm, shadow), fill (cool hemisphere) and rim (from behind)
const key = new THREE.DirectionalLight(0xfff0dc, 2.6); key.position.set(-2.2, 3.4, 3.2); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2.6; key.shadow.camera.right = 2.6; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
const fill = new THREE.HemisphereLight(0xc4d6ff, 0x6a5848, 0.85);
const rim = new THREE.DirectionalLight(0xbfdcff, 1.5); rim.position.set(2.6, 2.4, -3.2);
const rim2 = new THREE.DirectionalLight(0xfff0e0, 0.5); rim2.position.set(3, 1.5, 2.5);
scene.add(key, key.target, fill, rim, rim2);

// ground: shadow catcher plus a soft contact blob under every figure
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

interface Slot { rig?: Rig; driver?: LifeDriver; old?: THREE.Object3D; holder: THREE.Group; x: number; label: string }
let slots: Slot[] = [];
let assets: Assets;
const kit = createKit();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
let walkPhase = 0, yaw = 0, clock = 0;
let lookAtCamera = true;
let pixelRatio = 2;

function clearScene(): void {
  for (const s of slots) { scene.remove(s.holder); s.rig?.dispose(); }
  slots = []; labels.innerHTML = '';
}

function addBlob(holder: THREE.Group, r = 0.5): void {
  const b = new THREE.Mesh(blobGeo, blobMat); b.rotation.x = -Math.PI / 2; b.position.y = 0.004; b.scale.set(r * 2.6, r * 2.6, 1); holder.add(b);
}
function addStool(holder: THREE.Group, key: 'female' | 'male'): void {
  const top = 0.47, s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 20), stoolMat); s.position.set(0, top - 0.025, -0.332);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, top - 0.05, 12), stoolMat); legs.position.set(0, (top - 0.05) / 2, -0.332);
  s.castShadow = legs.castShadow = true; s.receiveShadow = true; holder.add(s, legs); void key;
}

function fitOld(obj: THREE.Object3D, height: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), h = box.max.y - box.min.y;
  const s = height / h; obj.scale.multiplyScalar(s); obj.position.y -= box.min.y * s;
}

type Pose = 'idle' | 'walk' | 'sit';
function poseDriver(driver: LifeDriver, pose: Pose, phase: number, play = false): void {
  const clip = pose === 'sit' ? 'sit' : pose === 'walk' ? 'walk' : 'idle';
  const name = driver.rig.look.body === 'female' && driver.rig.actions.has(`${clip}-female`) ? `${clip}-female` : clip;
  const dur = driver.rig.actions.get(name)!.getClip().duration;
  driver.setClip(clip, pose === 'walk' ? dur * phase : 0, play);
}

function buildHolder(x: number): THREE.Group { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; }

interface Spec {
  oldDetail?: 'low' | 'medium' | 'high'; noGround?: boolean;
  mode: 'compare' | 'row' | 'crowd' | 'single';
  look?: string; view?: 'front' | 'tq' | 'back' | 'face' | 'body' | 'head' | 'eyes' | 'far' | 'portrait' | 'side'; pose?: Pose; phase?: number; mood?: Mood; width?: number; height?: number;
  count?: number; shadows?: boolean; lod?: boolean; transparent?: boolean; lookAt?: boolean; pr?: number; side?: 'old' | 'new';
}
let spec: Spec = { mode: 'compare' };

async function setup(s: Spec): Promise<void> {
  spec = s; clearScene();
  renderer.shadowMap.enabled = s.shadows !== false;
  key.castShadow = s.shadows !== false;
  catcher.visible = s.shadows !== false;
  pixelRatio = s.pr ?? 2;
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight;
  renderer.setPixelRatio(pixelRatio); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  yaw = s.view === 'tq' ? 0.62 : s.view === 'back' ? Math.PI : s.view === 'side' ? 1.45 : 0;
  document.body.style.background = s.view === 'portrait' ? 'transparent' : '';
  const pose = s.pose ?? 'idle';
  if (s.mode === 'compare' || s.mode === 'single') {
    const look = LOOKS[s.look ?? 'woman-braids']!;
    const portrait = h > w;
    const spread = portrait ? 0.46 : 0.62;
    const pairs: [string, number][] = s.mode === 'single' ? [['new', 0]] : [['old', -spread], ['new', spread]];
    for (const [kind, x] of pairs) {
      const holder = buildHolder(x);
      holder.rotation.y = yaw;
      if (kind === 'old') {
        const old = buildAvatar(kit, oldLookOf(look), { detail: s.oldDetail ?? 'high', pose: pose === 'idle' ? 'stand' : pose === 'walk' ? 'walk' : 'sit', stride: (s.phase ?? 0.25) * Math.PI * 2, seat: 0.47, appearanceFit: true });
        fitOld(old, look.body === 'female' ? 1.77 : 1.81);
        old.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
        holder.add(old); if (pose === 'sit') addStool(holder, look.body);
        slots.push({ holder, x, old, label: 'Today' });
      } else {
        const rig = buildRig(assets, look, s.lod ? { lod: 'crowd' } : { lod: 'full' });
        holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
        const driver = new LifeDriver(rig, 3 + Object.keys(LOOKS).indexOf(look.id));
        driver.mood = s.mood ?? 'neutral';
        poseDriver(driver, pose, s.phase ?? 0.25);
        if (pose === 'sit') addStool(holder, look.body);
        slots.push({ holder, x, rig, driver, label: 'Proposed' });
      }
      if (!s.noGround) addBlob(holder, 0.42);
    }
  } else if (s.mode === 'row') {
    const n = s.count ?? 12, cols = Math.min(n, s.count && s.count > 12 ? 10 : 12), step = 0.74;
    const pose0: Pose = 'idle';
    for (let i = 0; i < n; i++) {
      const look = NPC_LOOKS[i % NPC_LOOKS.length]!;
      const rowIx = Math.floor(i / cols), colIx = i % cols, inRow = Math.min(cols, n - rowIx * cols);
      const holder = buildHolder((colIx - (inRow - 1) / 2) * step); holder.rotation.y = 0.0 + (i % 3 - 1) * 0.12; holder.position.z = -rowIx * 0.9;
      if (s.side === 'old') {
        const old = buildAvatar(kit, oldLookOf(look), { detail: s.oldDetail ?? 'medium', pose: 'stand', appearanceFit: true });
        fitOld(old, look.body === 'female' ? 1.77 : 1.81); old.traverse((o) => { o.castShadow = true; }); holder.add(old);
        slots.push({ holder, x: holder.position.x, old, label: '' });
      } else {
        const rig = buildRig(assets, look, s.lod ? { face: false, lod: 'crowd' } : {});
        if (!s.lod && (s.count ?? 12) > 12) rig.faceMeshes.forEach((fm) => { fm.visible = true; });
        holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; });
        const driver = new LifeDriver(rig, i + 7); driver.mood = (['neutral', 'happy', 'neutral', 'happy', 'uneasy'] as Mood[])[i % 5]!;
        poseDriver(driver, pose0, 0, true); slots.push({ holder, x: holder.position.x, rig, driver, label: '' });
      }
      if (!s.noGround) addBlob(holder, 0.4);
    }
  }
  // camera
  frame(s);
  for (const sl of slots) if (sl.rig) for (let i = 0; i < 20; i++) stepRig(sl, 1 / 30);
}

function stepRig(sl: Slot, dt: number): void {
  if (!sl.rig || !sl.driver) return;
  const d = sl.driver;
  d.target = lookAtCamera ? camera.position.clone().add(new THREE.Vector3(0, 0, 0)) : null;
  d.update(dt);
}

function frame(s: Spec): void {
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight, aspect = w / h;
  const fov = THREE.MathUtils.degToRad(camera.fov), tan = Math.tan(fov / 2);
  let cy = 0.92, target = new THREE.Vector3(0, cy, 0), height = 2.1, width = 2.4;
  const view = s.view ?? 'front';
  const key0 = LOOKS[s.look ?? 'woman-braids']?.body ?? 'female';
  const headY = key0 === 'female' ? 1.64 : 1.69;
  if (s.mode === 'row') { const n = s.count ?? 12, cols = Math.min(n, n > 12 ? 10 : 12), rows = Math.ceil(n / cols); width = cols * 0.74 + 0.5; height = 2.0 + (rows - 1) * 0.5; cy = 0.93 - (rows - 1) * 0.1; }
  if (s.mode === 'compare' || s.mode === 'single') {
    const spread = h > w ? 0.46 : 0.62;
    width = s.mode === 'single' ? 1.3 : spread * 2 + 0.95; height = 2.05;
    if (view === 'face') { height = 0.62; width = s.mode === 'single' ? 0.5 : spread * 2 + 0.7; cy = headY - 0.02; }
    if (view === 'far') { height = 11; width = spread * 2 + 9; cy = 0.9; }
    if (view === 'portrait') { height = 0.44; width = 0.44; cy = headY; }
    if (view === 'eyes') { height = 0.12; width = 0.2; cy = headY - 0.0; }
    if (view === 'head') { height = 0.9; width = s.mode === 'single' ? 0.7 : spread * 2 + 0.9; cy = headY - 0.08; }
  }
  if (s.mode === 'crowd') { width = 6; height = 2.4; cy = 1.0; }
  const hb = slots.find((sl) => sl.rig)?.rig?.bones['Head'];
  if (hb && (view === 'face' || view === 'head' || view === 'eyes' || view === 'portrait')) {
    scene.updateMatrixWorld(true);
    const hy = hb.getWorldPosition(new THREE.Vector3()).y;
    cy = hy + (view === 'eyes' ? 0.1 : view === 'face' ? 0.045 : view === 'portrait' ? 0.015 : 0.0);
  }
  target.set(0, cy, 0);
  const dist = Math.max(height / 2 / tan, width / 2 / (tan * aspect));
  camera.position.set(0, cy + (view === 'face' || view === 'eyes' || view === 'portrait' ? 0.0 : view === 'far' ? 0.6 : 0.25), dist);
  camera.lookAt(target);
  key.target.position.set(0, 0.9, 0);
  catcher.position.y = 0;
}

function render(): void {
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  // labels
  if (spec.mode === 'compare' && !spec.transparent) {
    labels.innerHTML = '';
    for (const sl of slots) {
      const p = new THREE.Vector3(sl.x, 0, 0).project(camera);
      const div = document.createElement('div'); div.className = 'tag'; div.textContent = sl.label;
      div.style.left = `${(p.x * 0.5 + 0.5) * 100}%`; labels.appendChild(div);
    }
  }
}

function advance(seconds: number, dt = 1 / 30): void {
  let t = seconds;
  while (t > 1e-6) { const d = Math.min(dt, t); for (const sl of slots) stepRig(sl, d); clock += d; t -= d; }
}

const api = {
  async init(names: string[]): Promise<boolean> { assets = await loadAssets(names); return true; },
  allParts(): string[] { const set = new Set<string>(); for (const l of [...Object.values(LOOKS), ...NPC_LOOKS]) for (const n of [...partNames(l), ...partNames(l, { lod: 'crowd' })]) set.add(n); return [...set]; },
  async setup(s: Spec): Promise<void> { await setup(s); },
  render(): void { render(); },
  advance(seconds: number): void { advance(seconds); },
  setMood(m: Mood): void { for (const s of slots) if (s.driver) s.driver.mood = m; },
  setBlink(v: number | null): void { for (const s of slots) if (s.driver) s.driver.forceBlink = v; },
  setViseme(shape: string | null, amount = 0.8): void { for (const s of slots) if (s.driver) s.driver.forceViseme = shape ? { shape, amount } : null; },
  say(text: string): void { for (const s of slots) s.driver?.say(text); },
  setLookAt(on: boolean): void { lookAtCamera = on; },
  setTarget(x: number, y: number, z: number): void { for (const s of slots) if (s.driver) s.driver.target = new THREE.Vector3(x, y, z); lookAtCamera = false; },
  setPose(pose: Pose, phase = 0, play = false): void { for (const s of slots) if (s.driver) poseDriver(s.driver, pose, phase, play); },
  info(): { triangles: number; calls: number; geometries: number } { return { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries }; },
  debugRot(name: string, x: number, y: number, z: number): void { for (const s of slots) { const b = s.rig?.bones[name]; if (b) b.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z))); } },
  enable(flags: Record<string, boolean>): void { for (const s of slots) if (s.driver) Object.assign(s.driver.enabled, flags); },
  async bench(seconds: number): Promise<{ fps: number; frames: number; ms: number }> {
    let frames = 0; const t0 = performance.now(); let last = t0;
    await new Promise<void>((done) => {
      const tick = (now: number): void => {
        const dt = Math.min(0.05, (now - last) / 1000); last = now;
        for (const sl of slots) stepRig(sl, dt);
        render(); frames++;
        if (now - t0 < seconds * 1000) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    const ms = performance.now() - t0; return { fps: (frames * 1000) / ms, frames, ms };
  },
  ready: true,
  clock: (): number => clock,
  walkPhase: (): number => walkPhase,
};
(window as unknown as { proof: typeof api }).proof = api;
void walkPhase;
