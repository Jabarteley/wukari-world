// The character proof page: today's figure, the first proof and the Blender-made character in one lit scene, driven by the
// capture script through window.proof.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { buildAvatar } from '../../../../src/scene/characters.ts';
import { buildRig as buildMid, loadAssets as loadMid, partNames as partNamesMid } from '../page/character.ts';
import type { Assets as MidAssets, Rig as MidRig } from '../page/character.ts';
import { LifeDriver as MidDriver } from '../page/anim.ts';
import { buildRig as buildP2, loadAssets as loadP2, partNames as partNamesP2, config as p2config } from '../page2/character.ts';
import type { Assets as P2Assets, Rig as P2Rig } from '../page2/character.ts';
import { LifeDriver as P2Driver } from '../page2/anim.ts';
import { buildRig, loadAssets, partNames } from './character.ts';
import type { Assets, Rig } from './character.ts';
import { LifeDriver } from './anim.ts';
import type { Mood } from './anim.ts';
import { LOOKS, NPC_LOOKS, oldLookOf } from '../page/looks.ts';

type Kind = 'old' | 'mid' | 'p2' | 'new';
type Pose = 'idle' | 'walk' | 'sit';
type View = 'front' | 'tq' | 'back' | 'face' | 'head' | 'far' | 'portrait' | 'side';
interface Spec {
  mode: 'compare' | 'single' | 'row';
  kinds?: Kind[]; look?: string; view?: View; pose?: Pose; phase?: number; mood?: Mood; width?: number; height?: number;
  count?: number; shadows?: boolean; lod?: boolean; pr?: number; noGround?: boolean; side?: 'old' | 'new'; tone?: string; rig?: 'flat' | 'scene'; oldDetail?: 'low' | 'medium' | 'high';
}
interface Slot {
  kind: Kind; holder: THREE.Group; x: number; label: string;
  rig?: Rig; driver?: LifeDriver; mid?: MidRig; midDriver?: MidDriver; old?: THREE.Object3D; p2?: P2Rig; p2Driver?: P2Driver;
  restFoot?: number; fit?: number;
}

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

// light rig: soft warm key from the front three-quarter (casts the shadow), warm hemisphere fill, a cool rim from behind, and a soft
// face fill from the front and a little below so the face is never the darkest thing on screen
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

let slots: Slot[] = [];
let props: THREE.Object3D[] = [];
function addProps(): void {
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.7), new THREE.MeshStandardMaterial({ color: 0x9a6a3c, roughness: 0.8 })); crate.position.set(-2.4, 0.275, -0.6);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 10), new THREE.MeshStandardMaterial({ color: 0x3b4a3f, roughness: 0.7 })); lamp.position.set(2.6, 1.6, -0.9);
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshStandardMaterial({ color: 0x2f6a3c, roughness: 0.9 })); bush.position.set(3.4, 0.4, -0.2);
  for (const o of [crate, lamp, bush]) { o.castShadow = o.receiveShadow = true; scene.add(o); props.push(o); }
}
let assets: Assets; let midAssets: MidAssets; let p2Assets: P2Assets;
const kit = createKit();
const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 80);
let yaw = 0, clock = 0, lookAtCamera = true;
let spec: Spec = { mode: 'single' };
const HEIGHT = { female: 1.77, male: 1.81 };
const heights: Record<string, number> = {};
const p2Heights: Record<string, number> = {};

function clearScene(): void {
  for (const s of slots) { scene.remove(s.holder); s.rig?.dispose(); s.mid?.dispose(); s.p2?.dispose(); }
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
  const rig = sl.rig ?? sl.mid ?? sl.p2; const driver = sl.driver ?? sl.midDriver ?? sl.p2Driver;
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
    const old = buildAvatar(kit, oldLookOf(look.hair === 'gele' ? { ...look, hair: 'braids' } : look), { detail: s.oldDetail ?? 'high', pose: pose === 'idle' ? 'stand' : pose === 'walk' ? 'walk' : 'sit', stride: (s.phase ?? 0.25) * Math.PI * 2, seat: 0.47, appearanceFit: true });
    fitOld(old, HEIGHT[look.body]); old.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    holder.add(old); sl.old = old;
  } else if (kind === 'mid') {
    const rig = buildMid(midAssets, look, s.lod ? { lod: 'crowd' } : { lod: 'full' });
    holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    const driver = new MidDriver(rig, seed); driver.mood = s.mood ?? 'neutral'; sl.mid = rig; sl.midDriver = driver; poseSlot(sl, pose, s.phase ?? 0.25);
  } else if (kind === 'p2') {
    const rig = buildP2(p2Assets, look, !!s.lod);
    const fit = HEIGHT[look.body] / (p2Heights[look.body] ?? 1.88);
    rig.root.scale.setScalar(fit);
    holder.add(rig.root); rig.root.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
    const driver = new P2Driver(rig, seed); driver.mood = s.mood ?? 'neutral'; sl.p2 = rig; sl.p2Driver = driver; sl.fit = fit; poseSlot(sl, pose, s.phase ?? 0.25);
    holder.updateMatrixWorld(true);
    sl.restFoot = footHeightOf(sl, rig.bones);
  } else {
    const rig = buildRig(assets, { ...look, tone: s.tone ?? look.tone }, !!s.lod);
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
LOOKS['woman-gele'] = { id: 'woman-gele', label: 'Woman, gele, brown skin, blue aso-ebi gown, gold jewellery', body: 'female', tone: '#7a4a2c', hair: 'gele', hairColor: '#1c1917', garment: 'dress', fabric: 'plain', color: '#1f4aa8' };
const SHOES: Record<string, string> = { 'woman-gele': '#d9b98a', 'woman-braids': '#b4793c', 'man-lowcut': '#5b3a24', 'woman-afro': '#3b2a52', 'man-afro': '#2c2a2a' };
const lookOf = (id: string) => ({ ...LOOKS[id]!, shoes: SHOES[id] ?? '#6a4630' });

/** The lowest of the foot and toe bones (world y), used to keep the soles on the floor whatever the clip does to the pelvis. */
function footHeight(sl: Slot): number { return footHeightOf(sl, sl.rig!.bones); }
function footHeightOf(sl: Slot, b: Record<string, THREE.Bone>): number {
  let low = 9; const v = new THREE.Vector3();
  for (const n of ['foot_l', 'foot_r', 'ball_l', 'ball_r']) { const bone = b[n]; if (bone) low = Math.min(low, bone.getWorldPosition(v).y - sl.holder.position.y + (n.startsWith('ball') ? -0.015 * (sl.fit ?? 1) : -0.07 * (sl.fit ?? 1))); }
  return low;
}

async function setup(s: Spec): Promise<void> {
  spec = s; clearScene();
  const flat = s.rig === 'flat';
  key.intensity = flat ? 0.5 : 2.3; faceFill.intensity = flat ? 0 : 0.85; rim.intensity = flat ? 0 : 1.5; kicker.intensity = flat ? 0 : 0.9; fill.intensity = flat ? 1.6 : 1.0;
  renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
  for (const p of props) scene.remove(p);
  props = [];
  renderer.shadowMap.enabled = s.shadows !== false; key.castShadow = s.shadows !== false; catcher.visible = s.shadows !== false;
  const w = s.width ?? innerWidth, h = s.height ?? innerHeight;
  renderer.setPixelRatio(s.pr ?? 2); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  yaw = s.view === 'tq' ? 0.62 : s.view === 'back' ? Math.PI : s.view === 'side' ? 1.45 : 0;
  document.body.style.background = s.view === 'portrait' ? 'transparent' : '';
  if (s.mode === 'compare' || s.mode === 'single') {
    const id = s.look ?? 'woman-braids'; const look = lookOf(id);
    const kinds: Kind[] = s.mode === 'single' ? ['new'] : (s.kinds ?? ['old', 'mid', 'p2', 'new']);
    const portrait = h > w, spread = (portrait ? 0.4 : 0.8) * (kinds.length >= 3 ? 1 : 0.8);
    kinds.forEach((k, i) => addSlot(k, kinds.length === 1 ? 0 : (i - (kinds.length - 1) / 2) * spread * (kinds.length >= 3 ? 1 : 1.5), { old: 'Today', mid: 'Proof 1', p2: 'Proof 2', new: 'New' }[k], look, s, 3 + Object.keys(LOOKS).indexOf(id)));
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
  if (s.view === 'far') addProps();
  frame(s);
  for (const sl of slots) for (let i = 0; i < 20; i++) stepSlot(sl, 1 / 30);
}

function stepSlot(sl: Slot, dt: number): void {
  const t = lookAtCamera ? camera.position.clone() : null;
  if (sl.driver) { sl.driver.target = t; sl.driver.update(dt); sl.holder.updateMatrixWorld(true); if (sl.restFoot !== undefined) { const f = footHeight(sl); sl.holder.position.y = -f; sl.holder.updateMatrixWorld(true); } }
  if (sl.midDriver) { sl.midDriver.target = t; sl.midDriver.update(dt); }
  if (sl.p2Driver) { sl.p2Driver.target = t; sl.p2Driver.update(dt); sl.holder.updateMatrixWorld(true); if (sl.restFoot !== undefined) { sl.holder.position.y = -footHeightOf(sl, sl.p2!.bones); sl.holder.updateMatrixWorld(true); } }
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
    const spread = (h > w ? 0.4 : 0.8) * (count >= 3 ? 1 : count === 1 ? 0 : 1.2);
    width = count === 1 ? 1.3 : (count - 1) * spread + 0.95; height = 2.05;
    if (view === 'face') { height = 0.62; width = count === 1 ? 0.5 : (count - 1) * spread + 0.6; cy = headY - 0.02; }
    if (view === 'far') { height = 11; width = 9; cy = 0.9; }
    if (view === 'portrait') { height = 0.44; width = 0.44; cy = headY; }
    if (view === 'head') { height = 0.9; width = count === 1 ? 0.7 : (count - 1) * spread + 0.9; cy = headY - 0.08; }
  }
  const hb = slots.find((sl) => sl.rig)?.rig?.bones['Head'] ?? slots.find((sl) => sl.mid)?.mid?.bones['Head'] ?? slots.find((sl) => sl.p2)?.p2?.bones['Head'];
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
  async init(names: string[], midNames: string[], p2Names: string[] = []): Promise<boolean> {
    assets = await loadAssets(names); midAssets = await loadMid(midNames);
    p2config.base = '/p2/'; p2Assets = await loadP2(p2Names);
    for (const k of ['female', 'male']) { heights[k] = await bodyHeight(k); try { p2Heights[k] = ((await (await fetch(`/p2/char-${k}.json`)).json()) as { height: number }).height; } catch { p2Heights[k] = 1.88; } }
    return true;
  },
  allParts(): { n: string[]; m: string[]; p: string[] } {
    const n = new Set<string>(), m = new Set<string>(), p = new Set<string>();
    for (const l of [...Object.values(LOOKS), ...NPC_LOOKS]) { for (const x of [...partNames(l), ...partNames(l, true)]) n.add(x); for (const x of [...partNamesMid(l), ...partNamesMid(l, { lod: 'crowd' })]) m.add(x); for (const x of [...partNamesP2(l), ...partNamesP2(l, true)]) p.add(x); }
    return { n: [...n], m: [...m], p: [...p] };
  },
  heights: (): Record<string, number> => heights,
  hide(names: string[]): void { for (const sl of slots) sl.rig?.meshes.forEach((m) => { m.visible = !names.includes(m.name); }); },
  textures(): string[] { return [...assets.textures.keys()]; },
  eyeInfo(): unknown { const r = slots[0]?.rig; const m = r?.eyes?.material as THREE.MeshPhysicalMaterial | undefined; const uv = r?.eyes?.geometry.getAttribute('uv'); return { map: !!m?.map, w: (m?.map?.image as { width?: number } | undefined)?.width, uvCount: uv?.count, uv0: uv ? [uv.getX(0), uv.getY(0), uv.getX(100), uv.getY(100)] : null }; },
  debug(): unknown { return slots.map((sl) => { const b = sl.rig ? new THREE.Box3().setFromObject(sl.rig.root) : null; return { kind: sl.kind, fit: sl.fit, y: sl.holder.position.y, restFoot: sl.restFoot, box: b ? [b.min.toArray(), b.max.toArray()] : null, head: sl.rig?.bones['Head']?.getWorldPosition(new THREE.Vector3()).toArray(), cam: camera.position.toArray() }; }); },
  async setup(s: Spec): Promise<void> { await setup(s); },
  render(): void { render(); },
  advance(seconds: number): void { advance(seconds); },
  setMood(m: Mood): void { for (const s of slots) { if (s.driver) s.driver.mood = m; if (s.midDriver) s.midDriver.mood = m; if (s.p2Driver) s.p2Driver.mood = m; } },
  setBlink(v: number | null): void { for (const s of slots) { if (s.driver) s.driver.forceBlink = v; if (s.midDriver) s.midDriver.forceBlink = v; if (s.p2Driver) s.p2Driver.forceBlink = v; } },
  setViseme(shape: string | null, amount = 0.8): void { for (const s of slots) { if (s.driver) s.driver.forceViseme = shape ? { shape: `viseme${shape.toUpperCase()}`, amount } : null; if (s.midDriver) s.midDriver.forceViseme = shape ? { shape, amount } : null; if (s.p2Driver) s.p2Driver.forceViseme = shape ? { shape: `viseme${shape.toUpperCase()}`, amount } : null; } },
  say(text: string): void { for (const s of slots) { s.driver?.say(text); s.midDriver?.say(text); s.p2Driver?.say(text); } },
  setLookAt(on: boolean): void { lookAtCamera = on; },
  setPose(pose: Pose, phase = 0, play = false): void { for (const s of slots) poseSlot(s, pose, phase, play); },
  enable(flags: Record<string, boolean>): void { for (const s of slots) { if (s.driver) Object.assign(s.driver.enabled, flags); if (s.midDriver) Object.assign(s.midDriver.enabled, flags); if (s.p2Driver) Object.assign(s.p2Driver.enabled, flags); } },
  info(): { triangles: number; calls: number; geometries: number } { return { triangles: renderer.info.render.triangles, calls: renderer.info.render.calls, geometries: renderer.info.memory.geometries }; },
  async bench(seconds: number): Promise<{ fps: number; frames: number; ms: number }> {
    let frames = 0; const t0 = performance.now(); let last = t0;
    await new Promise<void>((done) => { const tick = (now: number): void => { const dt = Math.min(0.05, (now - last) / 1000); last = now; for (const sl of slots) stepSlot(sl, dt); render(); frames++; if (now - t0 < seconds * 1000) requestAnimationFrame(tick); else done(); }; requestAnimationFrame(tick); });
    const ms = performance.now() - t0; return { fps: (frames * 1000) / ms, frames, ms };
  },
  ready: true, clock: (): number => clock,
};
(window as unknown as { proof: typeof api }).proof = api;
