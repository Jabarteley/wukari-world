// The live creator: a figure in the shipped park scene and light, built from independent parts, driven by the shipped clips and life layer.
// The same module exposes a small API used to take the gallery's frames.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createKit } from '../../../../src/scene/kit.ts';
import { loadCityContent } from '../../../../src/game/cities/registry.ts';
import { SIT, LIFT } from '../../../../src/scene/body/skinned.ts';
import { buildVenueScene } from '../../../../src/scene/venue-scenes.ts';
import type { SceneEntry } from '../../../../src/scene/types.ts';
import type { Mood } from '../page4/anim.ts';
import { Library, buildFigure } from './parts.ts';
import type { Figure, Look } from './parts.ts';
import { HEADS, OUTFITS, SKIN_TONES, SKIN_NAMES, HAIR_COLOURS, CLOTH_COLOURS, SHOE_COLOURS, rng, randomLook } from './catalog.ts';
import { HAIR_STYLES, WEAR_STYLES } from './hair.ts';

const CLIPS = ['idle', 'walk', 'jog', 'sit', 'dance'];
const params = new URLSearchParams(location.search);
if (params.has('shoot')) document.body.classList.add('shoot');
const canvas = document.getElementById('c') as HTMLCanvasElement, panel = document.getElementById('panel') as HTMLDivElement, stats = document.getElementById('stats') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100), kit = createKit();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
await loadCityContent('lagos');
const venue: SceneEntry = buildVenueScene(kit, { id: 'park', label: 'Freedom Park', scene: { kind: 'park', spots: [{ id: 'trees', label: 'Under the trees' }] } }, 'lagos');
venue.group.getObjectByName('avatar')!.visible = false; scene.add(venue.group); venue.group.position.set(0, 0, -10.5);
const light = venue.lighting(), hemi = new THREE.HemisphereLight(light.hemi[0], light.hemi[1], light.hemi[2]);
const sun = new THREE.DirectionalLight(light.sun[0], light.sun[1]); sun.position.set(...light.sun[2]); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
const rim = new THREE.DirectionalLight(light.rim[0], light.rim[1]); rim.position.set(-5, 4, -6); scene.add(hemi, sun, sun.target, rim); scene.background = new THREE.Color(venue.background);
const lib = new Library(); await lib.init(CLIPS);

interface Slot { fig: Figure; holder: THREE.Group; pose: string; seated: boolean }
let slots: Slot[] = []; const extras: THREE.Object3D[] = [];
let yaw = 0; let mood: Mood = 'neutral'; let last = performance.now(); let running = false;
const stoolMat = new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.8 });

function clearAll(): void { for (const s of slots) { scene.remove(s.holder); s.fig.dispose(); } slots = []; for (const e of extras) scene.remove(e); extras.length = 0; }

function placeSlot(s: Slot, x: number, z: number, ry: number, seat = 0.5): void {
  const sc = s.fig.root.scale.x;
  s.holder.rotation.y = ry;
  if (s.pose === 'sit') { s.holder.position.set(x + Math.sin(ry) * SIT.back * sc, seat - SIT.contact * sc, z + Math.cos(ry) * SIT.back * sc); }
  else s.holder.position.set(x, 0.06 + LIFT * sc, z);
}
function setPose(s: Slot, pose: string, phase: number | null): void {
  s.pose = pose; const d = s.fig.driver; const action = s.fig.rig.actions.get(pose) ?? s.fig.rig.actions.get(`${pose}-female`); if (!action) throw new Error(`clip ${pose}`);
  d.setClip(pose, phase === null ? 0 : action.getClip().duration * phase, phase === null);
  d.enabled = { blink: phase === null, breathe: true, shift: true, look: false }; d.target = null;
}
function applyFace(s: Slot, face: { blink?: number; gaze?: [number, number]; mood?: Mood; viseme?: { shape: string; amount: number }; say?: string } | undefined, settle: boolean): void {
  const d = s.fig.driver; d.mood = face?.mood ?? mood;
  if (face) { d.forceBlink = face.blink ?? null; d.forceGaze = face.gaze ?? null; d.forceViseme = face.viseme ?? null; if (face.say) d.say(face.say); }
  const jaw = s.fig.look.jaw ?? 0, idx = s.fig.head.morphTargetDictionary?.['jawWide']; void jaw; void idx;
  if (settle) for (let i = 0; i < 14; i++) d.update(1 / 30);
  const w = d.faceWeights; s.fig.headTint.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0);
  if (settle) for (let i = 0; i < 8; i++) s.fig.headTint.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0);
}
function applyJaw(f: Figure): void { const k = f.head.morphTargetDictionary?.['jawWide']; if (k !== undefined) f.head.morphTargetInfluences![k] = f.look.jaw ?? 0; }

export interface WallSpec {
  looks?: Look[]; random?: { sex?: 'male' | 'female'; n?: number; seed: number; mix?: ('male' | 'female')[] }; pose: string; phase?: number; cols: number; spacingX: number; spacingZ?: number; width: number; height: number;
  cam: { target: [number, number, number]; dist: number; az: number; lift: number; fov: number }; ry?: number; face?: Parameters<typeof applyFace>[1]; seat?: number; stools?: boolean;
  phases?: number[]; poses?: string[]; rys?: number[]; seats?: number[];
}
async function wall(spec0: WallSpec): Promise<{ triangles: number[]; drawCalls: number[]; bytes: number[] }> {
  const spec = { ...spec0 } as WallSpec & { looks: Look[] };
  if (spec0.random) { const r = rng(spec0.random.seed), rr = spec0.random; spec.looks = rr.mix ? rr.mix.map((s) => randomLook(s, r)) : Array.from({ length: rr.n ?? 12 }, () => randomLook(rr.sex ?? 'male', r)); }
  clearAll(); running = false;
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false); camera.aspect = spec.width / spec.height; camera.fov = spec.cam.fov; camera.updateProjectionMatrix();
  const n = spec.looks.length, rows = Math.ceil(n / spec.cols), gz = spec.spacingZ ?? 1.6;
  const figs = await Promise.all(spec.looks.map((look, i) => buildFigure({ lib, look, clipNames: CLIPS, seed: 11 + i * 7 })));
  figs.forEach((fig, i) => {
    const pose = spec.poses?.[i] ?? spec.pose; const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose, seated: pose === 'sit' };
    setPose(slot, pose, spec.phases?.[i] ?? spec.phase ?? 0.28); applyJaw(fig); applyFace(slot, spec.face, true);
    const col = i % spec.cols, row = Math.floor(i / spec.cols);
    const x = (col - (spec.cols - 1) / 2) * spec.spacingX, z = -(row - (rows - 1) / 2) * gz;
    const ry = spec.rys?.[i] ?? spec.ry ?? 0; placeSlot(slot, x, z, ry, spec.seat ?? 0.5);
    if (pose === 'sit' && spec.stools !== false) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.seat ?? 0.5, 0.36), stoolMat); st.position.set(x, (spec.seat ?? 0.5) / 2, z); st.rotation.y = ry; st.castShadow = st.receiveShadow = true; scene.add(st); extras.push(st); }
    fig.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(holder); slots.push(slot);
  });
  const c = spec.cam; camera.position.set(c.target[0] + Math.sin(c.az) * c.dist, c.target[1] + c.lift, c.target[2] + Math.cos(c.az) * c.dist); camera.lookAt(...c.target);
  sun.target.position.set(c.target[0], 1, c.target[2]); sun.position.set(c.target[0] + light.sun[2][0] * 0.6, light.sun[2][1], c.target[2] + light.sun[2][2] * 0.6);
  return { triangles: figs.map((f) => f.triangles), drawCalls: figs.map((f) => f.drawCalls), bytes: figs.map((f) => f.bytes) };
}

// ------------------------------------------------------------------ the creator
let look: Look = randomLook('male', rng(3));
let cur: Slot | null = null; let seq = 0; let currentPose = 'idle';
function fit(): void {
  const w = canvas.clientWidth, h = canvas.clientHeight; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  camera.position.set(0, 1.45, 5.6); camera.lookAt(0, 0.98, 0);
}
async function rebuild(): Promise<void> {
  const my = ++seq; const fig = await buildFigure({ lib, look, clipNames: CLIPS, seed: 31 });
  if (my !== seq) { fig.dispose(); return; }
  if (cur) { scene.remove(cur.holder); cur.fig.dispose(); }
  for (const e of extras) scene.remove(e); extras.length = 0;
  const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose: currentPose, seated: false };
  setPose(slot, currentPose, null); applyJaw(fig); applyFace(slot, undefined, false);
  placeSlot(slot, 0, 0, yaw); holder.rotation.y = yaw;
  if (currentPose === 'sit') { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.36), stoolMat); st.position.set(0, 0.25, 0); st.castShadow = st.receiveShadow = true; scene.add(st); extras.push(st); }
  fig.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  scene.add(holder); cur = slot; slots = [slot];
  stats.textContent = `${fig.triangles.toLocaleString()} triangles · ${fig.drawCalls} draw calls · parts ${(fig.bytes / 1000).toFixed(0)} kB`;
}
function setFromLook(patch: Partial<Look>, full = false): void { look = { ...look, ...patch }; void rebuild(); if (full) buildPanel(); }
function swatches(colours: string[], current: string | undefined, onPick: (c: string) => void, names?: string[]): HTMLElement {
  const row = document.createElement('div'); row.className = 'row';
  colours.forEach((c, i) => { const b = document.createElement('button'); b.className = 'sw' + (current?.toLowerCase() === c.toLowerCase() ? ' on' : ''); b.style.background = c; if (names) b.title = names[i]!; b.onclick = () => { onPick(c); }; row.appendChild(b); });
  return row;
}
function chips(items: { id: string; label: string }[], current: string | undefined, onPick: (id: string) => void): HTMLElement {
  const row = document.createElement('div'); row.className = 'row';
  for (const it of items) { const b = document.createElement('button'); b.textContent = it.label; if (it.id === current) b.className = 'on'; b.onclick = () => onPick(it.id); row.appendChild(b); }
  return row;
}
function slider(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void): HTMLElement {
  const d = document.createElement('div'); const l = document.createElement('label'); l.textContent = label; const i = document.createElement('input'); i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(value);
  i.oninput = () => onInput(Number(i.value)); d.append(l, i); return d;
}
function section(title: string, ...kids: HTMLElement[]): HTMLElement { const d = document.createElement('div'); const h = document.createElement('h2'); h.textContent = title; d.appendChild(h); for (const k of kids) d.appendChild(k); return d; }
function buildPanel(): void {
  panel.innerHTML = '';
  const h1 = document.createElement('h1'); h1.textContent = 'Character creator (proof)'; panel.appendChild(h1);
  const outfit = OUTFITS[look.sex].find((o) => o.id === look.body)!;
  const randomBtn = document.createElement('button'); randomBtn.textContent = 'Random'; randomBtn.onclick = () => { look = randomLook(Math.random() < 0.5 ? 'male' : 'female', rng((Math.random() * 1e9) | 0)); void rebuild(); buildPanel(); };
  panel.appendChild(randomBtn);
  panel.appendChild(section('Body', chips([{ id: 'male', label: 'Man' }, { id: 'female', label: 'Woman' }], look.sex, (id) => { const sex = id as 'male' | 'female'; if (sex === look.sex) return; look = { ...randomLook(sex, rng(7)), skin: look.skin, build: look.build, height: look.height }; void rebuild(); buildPanel(); }),
    slider('Height', 0.92, 1.08, 0.005, look.height ?? 1, (v) => { look.height = v; if (cur) { cur.fig.root.scale.setScalar(v); placeSlot(cur, 0, 0, yaw); } }),
    slider('Build (slim to heavy)', -1, 1, 0.05, look.build ?? 0, (v) => { look.build = v; void rebuild(); })));
  panel.appendChild(section('Face', chips(HEADS[look.sex], look.head, (id) => setFromLook({ head: id }, true)),
    slider('Jaw width', -0.5, 1, 0.05, look.jaw ?? 0, (v) => { look.jaw = v; if (cur) applyJaw(cur.fig); }),
    slider('Head size', 0.92, 1.1, 0.01, look.headSize ?? 1, (v) => { look.headSize = v; void rebuild(); })));
  panel.appendChild(section('Skin tone', swatches(SKIN_TONES, look.skin, (c) => setFromLook({ skin: c }, true), SKIN_NAMES)));
  panel.appendChild(section('Hair', chips(HAIR_STYLES.filter((s) => !s.sex || s.sex === look.sex), look.hair ?? 'none', (id) => setFromLook({ hair: id }, true)), swatches(HAIR_COLOURS, look.hairColor, (c) => setFromLook({ hairColor: c }, true))));
  panel.appendChild(section('Headwear', chips(WEAR_STYLES.filter((s) => !s.sex || s.sex === look.sex), look.headwear ?? 'none', (id) => setFromLook({ headwear: id }, true)), swatches(['#e9e2cf', '#1f2b44', '#9a2e2a', '#2f6e68', '#c88a1d', '#6a3f8f'], look.headwearColor, (c) => setFromLook({ headwearColor: c }, true))));
  const outfitKids: HTMLElement[] = [chips(OUTFITS[look.sex], look.body, (id) => { const o = OUTFITS[look.sex].find((x) => x.id === id)!; setFromLook({ body: id, print: o.prints ? 1 : 0 }, true); })];
  if (outfit.prints) outfitKids.push(chips(Array.from({ length: outfit.prints }, (_, i) => ({ id: String(i + 1), label: `Print ${i + 1}` })), String(look.print || 1), (id) => setFromLook({ print: Number(id) }, true)));
  panel.appendChild(section('Outfit', ...outfitKids));
  const colourKids: HTMLElement[] = [];
  if (outfit.tintTop) { const l = document.createElement('small'); l.textContent = 'Top'; colourKids.push(l, swatches(CLOTH_COLOURS, look.top, (c) => setFromLook({ top: c }, true))); }
  if (outfit.tintBottom) { const l = document.createElement('small'); l.textContent = 'Trousers / skirt'; colourKids.push(l, swatches(CLOTH_COLOURS, look.bottom, (c) => setFromLook({ bottom: c }, true))); }
  const sl = document.createElement('small'); sl.textContent = 'Shoes'; colourKids.push(sl, swatches(SHOE_COLOURS, look.shoes, (c) => setFromLook({ shoes: c }, true)));
  panel.appendChild(section('Outfit colours', ...colourKids));
  const poseRow = chips([{ id: 'idle', label: 'Stand' }, { id: 'walk', label: 'Walk' }, { id: 'jog', label: 'Jog' }, { id: 'sit', label: 'Sit' }, { id: 'dance', label: 'Dance' }], currentPose, (id) => { currentPose = id; void rebuild(); buildPanel(); });
  panel.appendChild(section('Move', poseRow));
  const moodRow = chips([{ id: 'neutral', label: 'Neutral' }, { id: 'happy', label: 'Happy' }, { id: 'uneasy', label: 'Uneasy' }, { id: 'talk', label: 'Talk' }, { id: 'blink', label: 'Blink' }], '', (id) => {
    if (!cur) return; const d = cur.fig.driver;
    if (id === 'talk') d.say('Good morning, how are you today? Welcome to Allworld.'); else if (id === 'blink') { d.forceBlink = 1; setTimeout(() => { d.forceBlink = null; }, 160); } else { mood = id as Mood; d.mood = mood; }
  });
  panel.appendChild(section('Face', moodRow));
  const turn = chips([{ id: 'l', label: 'Turn left' }, { id: 'r', label: 'Turn right' }, { id: 'f', label: 'Face front' }], '', (id) => { yaw = id === 'l' ? yaw - 0.6 : id === 'r' ? yaw + 0.6 : 0; if (cur) cur.holder.rotation.y = yaw; });
  panel.appendChild(section('View', turn));
}
function tick(): void {
  requestAnimationFrame(tick); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!running) { if (!params.has('shoot')) renderer.render(scene, camera); return; }
  for (const s of slots) { s.fig.driver.update(dt); const w = s.fig.driver.faceWeights; s.fig.headTint.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0); }
  renderer.render(scene, camera);
}
let drag: number | null = null;
canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', (e) => { if (drag === null) return; yaw += (e.clientX - drag) * 0.01; drag = e.clientX; if (cur) cur.holder.rotation.y = yaw; });
addEventListener('resize', () => { if (!params.has('shoot')) fit(); });

const api = {
  wall, render() { renderer.render(scene, camera); }, ready: true, randomLook, rng, HEADS, OUTFITS, SKIN_TONES,
  async fig(lookIn: Look): Promise<{ triangles: number; drawCalls: number; bytes: number }> { const f = await buildFigure({ lib, look: lookIn, clipNames: CLIPS }); const r = { triangles: f.triangles, drawCalls: f.drawCalls, bytes: f.bytes }; f.dispose(); return r; },
};
(window as unknown as { h2: typeof api }).h2 = api;
if (!params.has('shoot')) { fit(); buildPanel(); running = true; await rebuild(); }
tick();
