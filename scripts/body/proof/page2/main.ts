// The character proof page: today's figure, the first proof and the Blender-made character in one lit scene, driven by the
// capture script through window.proof.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { buildRig as buildMid, loadAssets as loadMid, partNames as partNamesMid } from '../page/character.ts';
import type { Assets as MidAssets, Rig as MidRig } from '../page/character.ts';
import { LifeDriver as MidDriver } from '../page/anim.ts';
import { buildRig, loadAssets, partNames } from './character.ts';
import type { Assets, Rig } from './character.ts';
import { LifeDriver } from './anim.ts';
import type { Mood } from './anim.ts';
import { LOOKS, NPC_LOOKS, oldLookOf } from '../page/looks.ts';

type Kind = 'old' | 'mid' | 'new';
type Pose = 'idle' | 'walk' | 'sit';
type View = 'front' | 'tq' | 'back' | 'face' | 'head' | 'far' | 'portrait' | 'side';
interface Spec {
  mode: 'compare' | 'single' | 'row';
  kinds?: Kind[]; look?: string; view?: View; pose?: Pose; phase?: number; mood?: Mood; width?: number; height?: number;
  count?: number; shadows?: boolean; lod?: boolean; pr?: number; noGround?: boolean; side?: 'old' | 'new'; tone?: string; oldDetail?: 'low' | 'medium' | 'high';
}
interface Slot {
  kind: Kind; holder: THREE.Group; x: number; label: string;
  rig?: Rig; driver?: LifeDriver; mid?: MidRig; midDriver?: MidDriver; old?: THREE.Object3D;
  restFoot?: number; fit?: number;
}

const canvas = document.getElementById('c') as HTMLCanvasElement;
const labels = document.getElementById('labels') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.5;

// light rig: key (warm, casts the shadow), fill (cool hemisphere), rim from behind and a soft front-right kicker
const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(-2.2, 3.4, 3.2); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -2.8; key.shadow.camera.right = 2.8; key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1; key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 5;
const fill = new THREE.HemisphereLight(0xc4d6ff, 0x6a5848, 0.85);
const rim = new THREE.DirectionalLight(0xbfdcff, 1.7); rim.position.set(2.6, 2.4, -3.2);
const kicker = new THREE.DirectionalLight(0xfff0e0, 0.6); kicker.position.set(3, 1.5, 2.5);
scene.add(key, key.target, fill, rim, kicker);

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

let slots: Slot[] = [];
let assets: Assets; let midAssets: MidAssets;
const kit = createKit();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
let yaw = 0, clock = 0, lookAtCamera = true;
let spec: Spec = { mode: 'single' };
const HEIGHT = { female: 1.77, male: 1.81 };
const heights: Record<string, number> = {};

function clearScene(): void {
  for (const s of slots) { scene.remove(s.holder); s.rig?.dispose(); s.mid?.dispose(); }
  slots = []; labels.innerHTML = '';
}
const addBlob = (holder: THREE.Group, r = 0.42): void => { const b = new THREE.Mesh(blobGeo, blobMat); b.rotation.x = -Math.PI / 2; b.position.y = 0.004; b.scale.set(r * 2.6, r * 2.6, 1); holder.add(b); };
function addStool(holder: THREE.Group): void {
  const top = 0.47, s = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.05, 20), stoolMat); s.position.set(0, top - 0.025, -0.332);
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, top - 0.05, 12), stoolMat); legs.position.set(0, (top - 0.05) / 2, -0.332);
  s.castShadow = legs.castShadow = true; s.receiveShadow = true; holder.add(s, legs);
}
function fitOld(obj: THREE.Object3D, height: number): void {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj), h = box.max.y - box.min.y;
  const s = height / h; obj.scale.multiplyScalar(s); obj.position.y -= box.min.y * s;
}
const clipFor = (body: string, pose: Pose, has: (n: string) => boolean): string => { const c = pose === 'sit' ? 'sit' : pose === 'walk' ? 'walk' : 'idle'; return body === 'female' && has(`${c}-female`) ? `${c}-female` : c; };
function poseSlot(sl: Slot, pose: Pose, phase: number, play = false): void {
  const rig = sl.rig ?? sl.mid; const driver = sl.driver ?? sl.midDriver;
  if (!rig || !driver) return;
  const base = pose === 'sit' ? 'sit' : pose === 'walk' ? 'walk' : 'idle';
  const name = clipFor(rig.look.body, pose, (n) => rig.actions.has(n));
  const dur = rig.actions.get(name)!.getClip().duration;
  driver.setClip(base, pose === 'walk' ? dur * phase : 0, play);
}
const buildHolder = (x: number): THREE.Group => { const g = new THREE.Group(); g.position.x = x; scene.add(g); return g; };

function addSlot(kind: Kind, x: number, label: string, look: ReturnType<typeof lookOf>, s: Spec, seed: number): void {
  const holder = buildHolder(x); holder.rotation.y = yaw;
  const pose = s.pose ?? 'idle';
  const sl: Slot = { kind, holder, x, label };
  if (kind === 'old') {
    const old = buildAvatar(kit, oldLookOf(look), { detail: s.oldDetail ?? 'high', pose: pose === 'idle' ? 'stand' : pose === 'walk' ? 'walk' : 'sit', stride: (s.phase ?? 0.25) * Math.PI * 2, seat: 0.47, appearanceFit: true });
    fitOld(old, HEIGHT[look.body]); old.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    holder.add(old); sl.old = old;
  } else if (kind === 'mid') {
    const rig = buildMid(midAssets, look, s.lod ? { lod: 'crowd' } : { lod: 'full' });
    holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    const driver = new MidDriver(rig, seed); driver.mood = s.mood ?? 'neutral'; sl.mid = rig; sl.midDriver = driver; poseSlot(sl, pose, s.phase ?? 0.25);
  } else {
    const rig = buildRig(assets, { ...look, tone: s.tone ?? look.tone });
    const fit = HEIGHT[look.body] / (heights[look.body] ?? 1.88);
    rig.root.scale.setScalar(fit); sl.fit = fit;
    holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    const driver = new LifeDriver(rig, seed); driver.mood = s.mood ?? 'neutral'; sl.rig = rig; sl.driver = driver; poseSlot(sl, pose, s.phase ?? 0.25);
    holder.updateMatrixWorld(true);
    sl.restFoot = footHeight(sl);
  }
  if (pose === 'sit') addStool(holder);
  if (!s.noGround) addBlob(holder);
  slots.push(sl);
}
const lookOf = (id: string) => LOOKS[id]!;

/** The lowest of the foot and toe bones (world y), used to keep the soles on the floor whatever the clip does to the pelvis. */
function footHeight(sl: Slot): number {
  const b = sl.rig!.bones; let low = 9; const v = new THREE.Vector3();
  for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const bone = b[n]; if (bone) low = Math.min(low, bone.getWorldPosition(v).y - sl.holder.position.y + (n.startsWith('ball') ? -0.015 * (sl.fit ?? 1) : -0.07 * (sl.fit ?? 1))); }
  return low;
}

async function setup(s: Spec): Promise<void> {
  spec = s; clearScene();
  renderer.shadowMap.enabled = s.shadows !== false; key.castShadow = s.shadows !== false; catcher.visible = s.shadows !== false;
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight;
  renderer.setPixelRatio(s.pr ?? 2); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  yaw = s.view === 'tq' ? 0.62 : s.view === 'back' ? Math.PI : s.view === 'side' ? 1.45 : 0;
  document.body.style.background = s.view === 'portrait' ? 'transparent' : '';
  if (s.mode === 'compare' || s.mode === 'single') {
    const id = s.look ?? 'woman-braids'; const look = lookOf(id);
    const kinds: Kind[] = s.mode === 'single' ? ['new'] : (s.kinds ?? ['old', 'mid', 'new']);
    const portrait = h > w, spread = (portrait ? 0.4 : 0.8) * (kinds.length === 3 ? 1 : 0.8);
    kinds.forEach((k, i) => addSlot(k, kinds.length === 1 ? 0 : (i - (kinds.length - 1) / 2) * spread * (kinds.length === 3 ? 1 : 1.5), { old: 'Today', mid: 'First proof', new: 'New' }[k], look, s, 3 + Object.keys(LOOKS).indexOf(id)));
  } else {
    const n = s.count ?? 12, cols = Math.min(n, n > 12 ? 10 : 12), step = 0.78;
    for (let i = 0; i < n; i++) {
      const look = NPC_LOOKS[i % NPC_LOOKS.length]!;
      const rowIx = Math.floor(i / cols), colIx = i % cols, inRow = Math.min(cols, n - rowIx * cols);
      const x = (colIx - (inRow - 1) / 2) * step;
      const before = scene.children.length; void before;
      addSlot(s.side === 'old' ? 'old' : 'new', x, '', { ...look } as ReturnType<typeof lookOf>, { ...s, pose: 'idle', mood: (['neutral', 'happy', 'neutral', 'happy', 'uneasy'] as Mood[])[i % 5], oldDetail: s.oldDetail ?? 'medium', phase: 0 }, i + 7);
      const sl = slots[slots.length - 1]!; sl.holder.rotation.y = (i % 3 - 1) * 0.12; sl.holder.position.z = -rowIx * 0.9;
      if (sl.driver) sl.driver.mood = (['neutral', 'happy', 'neutral', 'happy', 'uneasy'] as Mood[])[i % 5]!;
    }
  }
  frame(s);
  for (const sl of slots) for (let i = 0; i < 20; i++) stepSlot(sl, 1 / 30);
}

function stepSlot(sl: Slot, dt: number): void {
  const t = lookAtCamera ? camera.position.clone() : null;
  if (sl.driver) { sl.driver.target = t; sl.driver.update(dt); sl.holder.updateMatrixWorld(true); if (sl.restFoot !== undefined) { const f = footHeight(sl); sl.holder.position.y = -f; sl.holder.updateMatrixWorld(true); } }
  if (sl.midDriver) { sl.midDriver.target = t; sl.midDriver.update(dt); }
}

function frame(s: Spec): void {
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight, aspect = w / h;
  const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  let cy = 0.92, height = 2.1, width = 2.4;
  const view = s.view ?? 'front';
  const body = LOOKS[s.look ?? 'woman-braids']?.body ?? 'female';
  const headY = body === 'female' ? 1.64 : 1.69;
  const count = slots.length;
  if (s.mode === 'row') { const n = s.count ?? 12, cols = Math.min(n, n > 12 ? 10 : 12), rows = Math.ceil(n / cols); width = cols * 0.78 + 0.5; height = 2.0 + (rows - 1) * 0.5; cy = 0.93 - (rows - 1) * 0.1; }
  else {
    const spread = (h > w ? 0.4 : 0.8) * (count === 3 ? 1 : count === 1 ? 0 : 1.2);
    width = count === 1 ? 1.3 : (count - 1) * spread + 0.95; height = 2.05;
    if (view === 'face') { height = 0.62; width = count === 1 ? 0.5 : (count - 1) * spread + 0.6; cy = headY - 0.02; }
    if (view === 'far') { height = 11; width = 9; cy = 0.9; }
    if (view === 'portrait') { height = 0.44; width = 0.44; cy = headY; }
    if (view === 'head') { height = 0.9; width = count === 1 ? 0.7 : (count - 1) * spread + 0.9; cy = headY - 0.08; }
  }
  const hb = slots.find((sl) => sl.rig)?.rig?.bones['Head'] ?? slots.find((sl) => sl.mid)?.mid?.bones['Head'];
  if (hb && (view === 'face' || view === 'head' || view === 'portrait')) {
    scene.updateMatrixWorld(true);
    cy = hb.getWorldPosition(new THREE.Vector3()).y + (view === 'face' ? 0.045 : view === 'portrait' ? 0.015 : 0.0);
  }
  const dist = Math.max(height / 2 / tan, width / 2 / (tan * aspect));
  camera.position.set(0, cy + (view === 'face' || view === 'portrait' ? 0.0 : view === 'far' ? 0.6 : 0.25), dist);
  camera.lookAt(new THREE.Vector3(0, cy, 0));
  key.target.position.set(0, 0.9, 0);
}

function render(): void {
  renderer.setClearColor(0x000000, 0);
  renderer.render(scene, camera);
  labels.innerHTML = '';
  if (spec.mode === 'compare') for (const sl of slots) {
    const p = new THREE.Vector3(sl.x, 0, 0).project(camera);
    const div = document.createElement('div'); div.className = 'tag'; div.textContent = sl.label; div.style.left = `${(p.x * 0.5 + 0.5) * 100}%`; labels.appendChild(div);
  }
}
function advance(seconds: number, dt = 1 / 30): void { let t = seconds; while (t > 1e-6) { const d = Math.min(dt, t); for (const sl of slots) stepSlot(sl, d); clock += d; t -= d; } }

const bodyHeight = async (key: string): Promise<number> => { try { return ((await (await fetch(`/n/char-${key}.json`)).json()) as { height: number }).height; } catch { return 1.88; } };

const api = {
  async init(names: string[], midNames: string[]): Promise<boolean> {
    assets = await loadAssets(names); midAssets = await loadMid(midNames);
    for (const k of ['female', 'male']) heights[k] = await bodyHeight(k);
    return true;
  },
  allParts(): { n: string[]; m: string[] } {
    const n = new Set<string>(), m = new Set<string>();
    for (const l of [...Object.values(LOOKS), ...NPC_LOOKS]) { for (const x of partNames(l)) n.add(x); for (const x of [...partNamesMid(l), ...partNamesMid(l, { lod: 'crowd' })]) m.add(x); }
    return { n: [...n], m: [...m] };
  },
  heights: (): Record<string, number> => heights,
  hide(names: string[]): void { for (const sl of slots) sl.rig?.meshes.forEach((m) => { m.visible = !names.includes(m.name); }); },
  textures(): string[] { return [...assets.textures.keys()]; },
  eyeInfo(): unknown { const r = slots[0]?.rig; const m = r?.eyes?.material as THREE.MeshPhysicalMaterial | undefined; const uv = r?.eyes?.geometry.getAttribute('uv'); return { map: !!m?.map, w: (m?.map?.image as { width?: number } | undefined)?.width, uvCount: uv?.count, uv0: uv ? [uv.getX(0), uv.getY(0), uv.getX(100), uv.getY(100)] : null }; },
  debug(): unknown { return slots.map((sl) => { const b = sl.rig ? new THREE.Box3().setFromObject(sl.rig.root) : null; return { kind: sl.kind, fit: sl.fit, y: sl.holder.position.y, restFoot: sl.restFoot, box: b ? [b.min.toArray(), b.max.toArray()] : null, head: sl.rig?.bones['Head']?.getWorldPosition(new THREE.Vector3()).toArray(), cam: camera.position.toArray() }; }); },
  async setup(s: Spec): Promise<void> { await setup(s); },
  render(): void { render(); },
  advance(seconds: number): void { advance(seconds); },
  setMood(m: Mood): void { for (const s of slots) { if (s.driver) s.driver.mood = m; if (s.midDriver) s.midDriver.mood = m; } },
  setBlink(v: number | null): void { for (const s of slots) { if (s.driver) s.driver.forceBlink = v; if (s.midDriver) s.midDriver.forceBlink = v; } },
  setViseme(shape: string | null, amount = 0.8): void { for (const s of slots) { if (s.driver) s.driver.forceViseme = shape ? { shape: `viseme${shape.toUpperCase()}`, amount } : null; if (s.midDriver) s.midDriver.forceViseme = shape ? { shape, amount } : null; } },
  say(text: string): void { for (const s of slots) { s.driver?.say(text); s.midDriver?.say(text); } },
  setLookAt(on: boolean): void { lookAtCamera = on; },
  setPose(pose: Pose, phase = 0, play = false): void { for (const s of slots) poseSlot(s, pose, phase, play); },
  enable(flags: Record<string, boolean>): void { for (const s of slots) { if (s.driver) Object.assign(s.driver.enabled, flags); if (s.midDriver) Object.assign(s.midDriver.enabled, flags); } },
  info(): { triangles: number; calls: number; geometries: number } { return { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries }; },
  async bench(seconds: number): Promise<{ fps: number; frames: number; ms: number }> {
    let frames = 0; const t0 = performance.now(); let last = t0;
    await new Promise<void>((done) => { const tick = (now: number): void => { const dt = Math.min(0.05, (now - last) / 1000); last = now; for (const sl of slots) stepSlot(sl, dt); render(); frames++; if (now - t0 < seconds * 1000) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
    const ms = performance.now() - t0; return { fps: (frames * 1000) / ms, frames, ms };
  },
  ready: true, clock: (): number => clock,
};
(window as unknown as { proof: typeof api }).proof = api;
