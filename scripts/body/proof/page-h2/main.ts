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
import { HEADS, OUTFITS, SKIN_TONES, SKIN_NAMES, HAIR_COLOURS, CLOTH_COLOURS, SHOE_COLOURS, COMBOS, PROPORTIONS, PRINT_NAMES, rng, randomLook } from './catalog.ts';
import { buildCrowd, crowdRenderer } from './crowd.ts';
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
function applyJaw(f: Figure): void { if (!f.head) return; const k = f.head.morphTargetDictionary?.['jawWide']; if (k !== undefined) f.head.morphTargetInfluences![k] = f.look.jaw ?? 0; }

export interface WallSpec {
  looks?: Look[]; random?: { sex?: 'male' | 'female'; n?: number; seed: number; mix?: ('male' | 'female')[] }; pose: string; phase?: number; cols: number; spacingX: number; spacingZ?: number; width: number; height: number;
  cam: { target: [number, number, number]; dist: number; az: number; lift: number; fov: number }; ry?: number; face?: Parameters<typeof applyFace>[1]; seat?: number; stools?: boolean;
  phases?: number[]; poses?: string[]; rys?: number[]; seats?: number[]; crowd?: boolean; crowdMask?: boolean[];
}
async function wall(spec0: WallSpec): Promise<{ triangles: number[]; drawCalls: number[]; bytes: number[] }> {
  const spec = { ...spec0 } as WallSpec & { looks: Look[] };
  if (spec0.random) { const r = rng(spec0.random.seed), rr = spec0.random; spec.looks = rr.mix ? rr.mix.map((s, i) => randomLook(s, r, { slot: i })) : Array.from({ length: rr.n ?? 12 }, (_, i) => randomLook(rr.sex ?? 'male', r, { slot: i })); }
  clearAll(); running = false;
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false); camera.aspect = spec.width / spec.height; camera.fov = spec.cam.fov; camera.updateProjectionMatrix();
  const n = spec.looks.length, rows = Math.ceil(n / spec.cols), gz = spec.spacingZ ?? 1.6;
  const figs = await Promise.all(spec.looks.map((look, i) => (spec.crowd || spec.crowdMask?.[i]) ? buildCrowd(lib, look, 11 + i * 7).then((c) => ({ ...c, head: null, headTint: { eyes() {} } }) as unknown as Figure) : buildFigure({ lib, look, clipNames: CLIPS, seed: 11 + i * 7 })));
  figs.forEach((fig, i) => {
    const pose = spec.poses?.[i] ?? spec.pose; const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose, seated: pose === 'sit' };
    setPose(slot, pose, spec.phases?.[i] ?? spec.phase ?? 0.28); if (!spec.crowd && !spec.crowdMask?.[i]) { applyJaw(fig); applyFace(slot, spec.face, true); }
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
crowdRenderer(renderer);
let look: Look = randomLook('male', rng(3));
let cur: Slot | null = null; let seq = 0; let currentPose = 'idle';
function fit(): void {
  const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  const need = Math.max(2.35 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))), 1.5 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
  camera.position.set(0, 1.35, Math.max(3.4, need)); camera.lookAt(0, 0.95, 0);
}
async function rebuild(): Promise<void> {
  const my = ++seq; (window as unknown as { __busy: boolean }).__busy = true; const fig = await buildFigure({ lib, look, clipNames: CLIPS, seed: 31 });
  if (my !== seq) { fig.dispose(); return; }
  (window as unknown as { __busy: boolean }).__busy = false;
  if (cur) { scene.remove(cur.holder); cur.fig.dispose(); }
  for (const e of extras) scene.remove(e); extras.length = 0;
  const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose: currentPose, seated: false };
  setPose(slot, currentPose, null); applyJaw(fig); applyFace(slot, undefined, false);
  placeSlot(slot, 0, 0, yaw); holder.rotation.y = yaw;
  if (currentPose === 'sit') { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.36), stoolMat); st.position.set(0, 0.25, 0); st.castShadow = st.receiveShadow = true; scene.add(st); extras.push(st); }
  fig.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  scene.add(holder); cur = slot; slots = [slot];
  document.getElementById('msg')?.classList.add('hide');
  const recEl = panel.querySelector('.rec'); if (recEl) recEl.textContent = JSON.stringify(look);
  stats.textContent = `${fig.triangles.toLocaleString()} triangles · ${fig.drawCalls} draw calls · parts ${(fig.bytes / 1000).toFixed(0)} kB`;
}
function setFromLook(patch: Partial<Look>, full = false): void { look = { ...look, ...patch }; void rebuild(); if (full) buildPanel(); }
const CLOTH_NAMES: Record<string, string> = { '#f1efe8': 'White', '#e6dcc4': 'Cream', '#1f2b44': 'Indigo', '#2f3f5f': 'Navy', '#6e2a35': 'Wine', '#5a6a3a': 'Olive', '#7a5a3c': 'Earth brown', '#2b2b2f': 'Charcoal', '#2f6e68': 'Teal', '#c88a1d': 'Mustard', '#9a2e2a': 'Brick red', '#6a3f8f': 'Purple', '#9a4a2e': 'Terracotta', '#3a3a40': 'Grey' };
const HAIR_NAMES: Record<string, string> = { '#14100e': 'Black', '#1d1612': 'Soft black', '#2b1d14': 'Dark brown', '#3b2a1e': 'Brown', '#8e8a84': 'Grey', '#b4b0a8': 'Silver', '#8c3b22': 'Auburn', '#c9b27a': 'Blonde', '#7a2f4f': 'Plum', '#2f5f8a': 'Blue' };
const SHOE_NAMES: Record<string, string> = { '#f4f4f0': 'White', '#2b2b2f': 'Black', '#6b3d1f': 'Brown', '#9a2e2a': 'Red', '#1f2b44': 'Navy' };
const WEAR_NAMES: Record<string, string> = { '#e9e2cf': 'Cream', '#1f2b44': 'Indigo', '#6e2a35': 'Wine', '#2f6e68': 'Teal', '#c88a1d': 'Mustard', '#6a3f8f': 'Purple' };
function swatches(label: string, colours: string[], current: string | undefined, onPick: (c: string) => void, names: Record<string, string> | string[]): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'field';
  const lab = document.createElement('div'); lab.className = 'lab';
  const nameOf = (c: string): string => Array.isArray(names) ? (names[colours.indexOf(c)] ?? c) : (names[c.toLowerCase()] ?? c);
  lab.innerHTML = `<span>${label}</span><b>${current ? nameOf(current) : ''}</b>`; wrap.appendChild(lab);
  const row = document.createElement('div'); row.className = 'row';
  colours.forEach((c) => { const b = document.createElement('button'); b.className = 'sw' + (current?.toLowerCase() === c.toLowerCase() ? ' on' : ''); b.style.background = c; b.title = nameOf(c); b.setAttribute('aria-label', `${label}: ${nameOf(c)}`); b.onclick = () => { onPick(c); }; row.appendChild(b); });
  wrap.appendChild(row); return wrap;
}
function chips(label: string, items: { id: string; label: string }[], current: string | undefined, onPick: (id: string) => void): HTMLElement {
  const wrap = document.createElement('div'); wrap.className = 'field'; if (label) { const lab = document.createElement('div'); lab.className = 'lab'; lab.innerHTML = `<span>${label}</span>`; wrap.appendChild(lab); }
  const row = document.createElement('div'); row.className = 'row';
  for (const it of items) { const b = document.createElement('button'); b.textContent = it.label; if (it.id === current) b.className = 'on'; b.onclick = () => onPick(it.id); row.appendChild(b); }
  wrap.appendChild(row); return wrap;
}
function slider(label: string, min: number, max: number, step: number, value: number, onInput: (v: number) => void, fmt: (v: number) => string = (v) => v.toFixed(2)): HTMLElement {
  const d = document.createElement('div'); d.className = 'field'; const l = document.createElement('div'); l.className = 'lab'; const out = document.createElement('b'); out.textContent = fmt(value); l.innerHTML = `<span>${label}</span>`; l.appendChild(out);
  const i = document.createElement('input'); i.type = 'range'; i.min = String(min); i.max = String(max); i.step = String(step); i.value = String(value); i.setAttribute('aria-label', label);
  i.oninput = () => { out.textContent = fmt(Number(i.value)); onInput(Number(i.value)); }; d.append(l, i); return d;
}
function group(title: string, ...kids: HTMLElement[]): HTMLElement { const d = document.createElement('section'); d.className = 'group'; const h = document.createElement('h2'); h.textContent = title; d.appendChild(h); for (const k of kids) d.appendChild(k); return d; }
function buildPanel(): void {
  const keepScroll = panel.scrollTop; panel.innerHTML = '';
  const head = document.createElement('div'); head.className = 'top'; const h1 = document.createElement('h1'); h1.textContent = 'Character creator'; head.appendChild(h1);
  const randomBtn = document.createElement('button'); randomBtn.className = 'primary'; randomBtn.id = 'random'; randomBtn.textContent = 'Random'; randomBtn.onclick = () => { look = randomLook(Math.random() < 0.5 ? 'male' : 'female', rng((Math.random() * 1e9) | 0)); void rebuild(); buildPanel(); };
  head.appendChild(randomBtn); panel.appendChild(head);
  const outfit = OUTFITS[look.sex].find((o) => o.id === look.body)!;
  const pr = PROPORTIONS[look.sex];
  panel.appendChild(group('Body', chips('', [{ id: 'male', label: 'Man' }, { id: 'female', label: 'Woman' }], look.sex, (id) => { const sex = id as 'male' | 'female'; if (sex === look.sex) return; look = { ...randomLook(sex, rng(7)), skin: look.skin, build: look.build, height: look.height }; void rebuild(); buildPanel(); }),
    slider('Height', 0.92, 1.08, 0.005, look.height ?? 1, (v) => { look.height = v; if (cur) { cur.fig.root.scale.setScalar(v); placeSlot(cur, 0, 0, yaw); } }, (v) => `${Math.round(v * 178)} cm`),
    slider('Build', -1, 1, 0.05, look.build ?? 0, (v) => { look.build = v; void rebuild(); }, (v) => v < -0.3 ? 'Slim' : v > 0.3 ? 'Heavy' : 'Average')));
  panel.appendChild(group('Face', chips('Face', HEADS[look.sex], look.head, (id) => setFromLook({ head: id }, true)),
    slider('Jaw width', -0.5, 1, 0.05, look.jaw ?? 0, (v) => { look.jaw = v; if (cur) applyJaw(cur.fig); }),
    slider('Head size', pr.headSize - 0.05, pr.headSize + 0.07, 0.01, look.headSize ?? pr.headSize, (v) => { look.headSize = v; if (cur) { cur.fig.rig.bones['Head']?.scale.set(v, v, v); } }),
    swatches('Skin tone', SKIN_TONES, look.skin, (c) => setFromLook({ skin: c }, true), SKIN_NAMES)));
  panel.appendChild(group('Hair', chips('Style', HAIR_STYLES.filter((s) => !s.sex || s.sex === look.sex), look.hair ?? 'none', (id) => setFromLook({ hair: id }, true)), swatches('Hair colour', HAIR_COLOURS, look.hairColor, (c) => setFromLook({ hairColor: c }, true), HAIR_NAMES),
    chips('Headwear', WEAR_STYLES.filter((s) => !s.sex || s.sex === look.sex), look.headwear ?? 'none', (id) => setFromLook({ headwear: id }, true)), swatches('Headwear colour', Object.keys(WEAR_NAMES), look.headwearColor, (c) => setFromLook({ headwearColor: c }, true), WEAR_NAMES)));
  const outfitKids: HTMLElement[] = [chips('Outfit', OUTFITS[look.sex], look.body, (id) => { const o = OUTFITS[look.sex].find((x) => x.id === id)!; const combo = COMBOS[id]![0]!; setFromLook({ body: id, print: o.prints ? 1 : 0, top: combo.top, bottom: combo.bottom, shoes: combo.shoes }, true); })];
  if (outfit.prints) outfitKids.push(chips('Print', Array.from({ length: outfit.prints }, (_, i) => ({ id: String(i + 1), label: PRINT_NAMES[look.body]?.[i] ?? `Print ${i + 1}` })), String(look.print || 1), (id) => setFromLook({ print: Number(id) }, true)));
  if (outfit.tintTop) outfitKids.push(swatches('Top colour', CLOTH_COLOURS, look.top, (c) => setFromLook({ top: c }, true), CLOTH_NAMES));
  if (outfit.tintBottom) outfitKids.push(swatches('Trousers or skirt', CLOTH_COLOURS, look.bottom, (c) => setFromLook({ bottom: c }, true), CLOTH_NAMES));
  outfitKids.push(swatches('Shoes', SHOE_COLOURS, look.shoes, (c) => setFromLook({ shoes: c }, true), SHOE_NAMES));
  panel.appendChild(group('Outfit', ...outfitKids));
  panel.appendChild(group('Move and mood', chips('Move', [{ id: 'idle', label: 'Stand' }, { id: 'walk', label: 'Walk' }, { id: 'jog', label: 'Jog' }, { id: 'sit', label: 'Sit' }, { id: 'dance', label: 'Dance' }], currentPose, (id) => { currentPose = id; void rebuild(); buildPanel(); }),
    chips('Face', [{ id: 'neutral', label: 'Neutral' }, { id: 'happy', label: 'Happy' }, { id: 'uneasy', label: 'Uneasy' }, { id: 'talk', label: 'Talk' }, { id: 'blink', label: 'Blink' }], '', (id) => {
      if (!cur) return; const d = cur.fig.driver;
      if (id === 'talk') d.say('Good morning, how are you today? Welcome to Allworld.'); else if (id === 'blink') { d.forceBlink = 1; setTimeout(() => { d.forceBlink = null; }, 160); } else { mood = id as Mood; d.mood = mood; }
    }),
    chips('View', [{ id: 'l', label: 'Turn left' }, { id: 'r', label: 'Turn right' }, { id: 'f', label: 'Face front' }], '', (id) => { yaw = id === 'l' ? yaw - 0.6 : id === 'r' ? yaw + 0.6 : 0; if (cur) cur.holder.rotation.y = yaw; })));
  const rec = document.createElement('pre'); rec.className = 'rec'; rec.textContent = JSON.stringify(look); panel.appendChild(group('Saved look', rec));
  panel.scrollTop = keepScroll;
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
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (!params.has('shoot')) fit(); }).observe(canvas);

interface StreetStats { figures: number; triangles: number; drawCalls: number; msPerFrame: number; fps: number; note: string }
/** Forty (or n) mixed crowd figures walking along a street, then a timed run of frames: the frame rate is that of this headless, software-rendered browser. */
async function street(n: number, seed: number, width: number, height: number): Promise<StreetStats> {
  clearAll(); running = false; renderer.setPixelRatio(1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = 34; camera.updateProjectionMatrix();
  const r = rng(seed), looks: Look[] = Array.from({ length: n }, (_, i) => randomLook(i % 2 ? 'female' : 'male', r, { slot: Math.floor(i / 2) }));
  const figs = await Promise.all(looks.map((l, i) => buildCrowd(lib, l, 5 + i)));
  figs.forEach((fig, i) => {
    const holder = new THREE.Group(); holder.add(fig.root); const lane = i % 4, along = Math.floor(i / 4);
    const x = (lane - 1.5) * 1.35 + (r() - 0.5) * 0.4, z = -10 + along * 2.2 + (r() - 0.5) * 0.8; holder.position.set(x, 0.06 + LIFT, z); holder.rotation.y = lane % 2 ? 0 : Math.PI;
    const d = fig.driver; d.setClip('walk', 0, true); d.enabled = { blink: false, breathe: false, shift: false, look: false }; fig.rig.actions.get('walk')!.time = r() * 1.1;
    fig.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    scene.add(holder); slots.push({ fig: fig as unknown as Figure, holder, pose: 'walk', seated: false });
  });
  camera.position.set(0.5, 3.2, 8.5); camera.lookAt(0, 0.9, -3.2); sun.target.position.set(0, 1, -3); sun.position.set(light.sun[2][0] * 0.8, light.sun[2][1], -3 + light.sun[2][2] * 0.6);
  for (let i = 0; i < 6; i++) { for (const s of slots) s.fig.driver.update(1 / 30); renderer.render(scene, camera); }
  const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(), frames = 300; for (let i = 0; i < frames; i++) { for (const s of slots) s.fig.driver.update(1 / 30); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }   // a read-back each frame forces the frame to finish
  const ms = (performance.now() - t0) / frames;
  return { figures: n, triangles: figs.reduce((a, f) => a + f.triangles, 0), drawCalls: figs.reduce((a, f) => a + f.drawCalls, 0), msPerFrame: +ms.toFixed(1), fps: +(1000 / ms).toFixed(1), note: '300 frames, 1 pixel read back per frame, headless Chrome with software rendering (no GPU); a real device is much faster' };
}

const api = {
  wall, street, render() { renderer.render(scene, camera); }, ready: true, randomLook, rng, HEADS, OUTFITS, SKIN_TONES,
  async fig(lookIn: Look): Promise<{ triangles: number; drawCalls: number; bytes: number }> { const f = await buildFigure({ lib, look: lookIn, clipNames: CLIPS }); const r = { triangles: f.triangles, drawCalls: f.drawCalls, bytes: f.bytes }; f.dispose(); return r; },
};
(window as unknown as { h2: typeof api }).h2 = api;
if (!params.has('shoot')) {
  fit(); buildPanel(); running = true;
  try { await rebuild(); } catch (e) { const el = document.getElementById('msg'); if (el) { el.className = 'err'; el.textContent = `The character could not be built: ${(e as Error).message}`; } }
}
tick();
