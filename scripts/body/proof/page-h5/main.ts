// The roster creator: twelve whole generated characters in the shipped park scene and light, driven by the shipped clips and the shipped life layer.
// A look is {character, skin, garment colours, print}; every choice is a swatch that recolours the one texture in the shader. Also exposes a frame API for the gallery.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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
import type { Rig } from '../page3/character.ts';
import { LOOKS, SKIN_TONES, SKIN_NAMES, rng } from './catalog.ts';
import type { Look } from './catalog.ts';
import { tintMaterial } from '../page-h2/tint.ts';
import type { Tinted } from '../page-h2/tint.ts';

type RGB = [number, number, number];
interface Meta { height: number; mask: string; eyes: { eyeL: [number, number]; eyeR: [number, number]; a: number; b: number; skin: RGB; iris: RGB }; refs: { skin: RGB; skin2?: RGB | null; top?: RGB | null; bottom?: RGB | null; shoes?: RGB | null } }
export interface Pick { id: string; outfit?: number; skin?: string; lod?: 'hero' | 'crowd' }
interface Fig { root: THREE.Group; rig: Rig; driver: LifeDriver; tint: Tinted; triangles: number; drawCalls: number; face: THREE.SkinnedMesh[]; pick: Pick; mesh: THREE.SkinnedMesh }
interface Slot { fig: Fig; holder: THREE.Group; pose: string }

const CLIPS = ['idle', 'walk', 'jog', 'sit', 'dance', 'interact'];
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

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder); await MeshoptDecoder.ready;
const pack = await loader.loadAsync('/body/clip-pack.glb');
const clips = new Map<string, THREE.AnimationClip>(); for (const n of CLIPS) { const c = pack.animations.find((a) => a.name === n); if (c) clips.set(n, c); const f = pack.animations.find((a) => a.name === `${n}-female`); if (f) clips.set(`${n}-female`, f); }
const cache = new Map<string, Promise<unknown>>();
const once = <T>(k: string, f: () => Promise<T>): Promise<T> => { let p = cache.get(k); if (!p) { p = f(); cache.set(k, p); } return p as Promise<T>; };
const loadMask = (url: string): Promise<THREE.Texture> => once(url, () => fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' })).then((bmp) => { const t = new THREE.Texture(bmp); t.flipY = false; t.colorSpace = THREE.NoColorSpace; t.format = THREE.RGBAFormat; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t; }));
const loadOutfit = (file: string): Promise<THREE.Texture> => once(`o:${file}`, () => new THREE.TextureLoader().loadAsync(`/m/${file}`).then((t) => { t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }));
const sizes = new Map<string, number>();
const sizeOf = async (url: string): Promise<number> => { if (!sizes.has(url)) { try { const r = await fetch(url, { method: 'HEAD' }); sizes.set(url, Number(r.headers.get('content-length') ?? 0)); } catch { sizes.set(url, 0); } } return sizes.get(url)!; };

try { const man = await (await fetch('/m/roster.json')).json() as { characters: { id: string; outfits: number; skinSteps: boolean; ok: boolean }[] }; const cfg: Record<string, { outfits: number; skinSteps: boolean }> = Object.fromEntries(man.characters.map((c) => [c.id, c])); for (const l of LOOKS) { const c = cfg[l.id]; if (c) { l.outfits = Array.from({ length: c.outfits }, (_, i) => `o${i + 1}`); l.skinSteps = c.skinSteps; } } } catch { /* the page still works with the as-made outfit only */ }
for (const l of LOOKS) if (l.outfits.length === 0 && !params.has('shoot')) l.skinSteps = l.skinSteps && true;
const lookOf = (id: string): Look => LOOKS.find((l) => l.id === id)!;
async function build(pick: Pick, seed = 31): Promise<Fig> {
  const lod = pick.lod ?? 'hero', look = lookOf(pick.id), key = `${pick.id}-${lod}`;
  const meta = await once(`${key}.json`, () => fetch(`/m/${key}.json`).then((r) => r.json())) as Meta;
  const [gltf, mask] = await Promise.all([once(`${key}.glb`, () => loader.loadAsync(`/m/${key}.glb`)), loadMask(`/m/${meta.mask}`)]);
  const scn = clone(gltf.scene) as THREE.Group, root = new THREE.Group(); root.add(scn);
  const bones: Record<string, THREE.Bone> = {}; let mesh!: THREE.SkinnedMesh;
  scn.traverse((o) => { if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone; if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh; });
  const eyes = lod === 'hero' && meta.eyes ? { ...meta.eyes } : undefined;
  const tint = tintMaterial(mesh.material as THREE.MeshStandardMaterial, { mask, refs: meta.refs, eyes });
  mesh.material = tint.material; mesh.frustumCulled = false;
  tint.setTargets({ skin: look.skinSteps ? pick.skin : undefined });
  if (pick.outfit && pick.outfit > 0) tint.setMap(await loadOutfit(`${pick.id}-${lod}-outfit-${pick.outfit}.jpg`));
  const mixer = new THREE.AnimationMixer(scn), actions = new Map<string, THREE.AnimationAction>([...clips].map(([n, c]) => [n, mixer.clipAction(c)]));
  const face = mesh.morphTargetDictionary ? [mesh] : [];
  const rig: Rig = { look: { body: look.sex } as unknown as Rig['look'], root, scene: scn, bones, mixer, actions, face, eyes: undefined, sway: { uSway: { value: new THREE.Vector3() }, uTime: { value: 0 } }, materials: [tint.material], meshes: [mesh], dispose() {} };
  const driver = new LifeDriver(rig, seed);
  const tris = (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  const bytes = (await Promise.all([`/m/${key}.glb`, `/m/${meta.mask}`].map(sizeOf))).reduce((a, b) => a + b, 0);
  root.userData['bytes'] = bytes;
  return { root, rig, driver, tint, triangles: Math.round(tris), drawCalls: 1, face, pick, mesh };
}
const targetHeight = (id: string): number => (lookOf(id).sex === 'male' ? 1.78 : 1.66);

function place(s: Slot, x: number, z: number, ry: number, seat = 0.5): void {
  const sc = s.fig.root.scale.x; s.holder.rotation.y = ry;
  if (s.pose === 'sit') s.holder.position.set(x + Math.sin(ry) * SIT.back * sc, seat - SIT.contact * sc, z + Math.cos(ry) * SIT.back * sc); else s.holder.position.set(x, 0.06 + LIFT * sc, z);
}
function setPose(s: Slot, pose: string, phase: number | null): void {
  s.pose = pose; const d = s.fig.driver, key = s.fig.rig.actions.has(`${pose}-female`) && lookOf(s.fig.pick.id).sex === 'female' ? `${pose}-female` : pose;
  const a = s.fig.rig.actions.get(key); if (!a) throw new Error(`clip ${pose}`);
  d.setClip(key.replace('-female', ''), phase === null ? 0 : a.getClip().duration * phase, phase === null); d.enabled = { blink: phase === null, breathe: true, shift: true, look: false }; d.target = null;
}
type Face = { blink?: number; gaze?: [number, number]; mood?: Mood; viseme?: { shape: string; amount: number }; say?: string };
function applyFace(s: Slot, f: Face | undefined, settle: boolean): void {
  const d = s.fig.driver; d.mood = f?.mood ?? 'neutral';
  if (f) { d.forceBlink = f.blink ?? null; d.forceGaze = f.gaze ?? null; d.forceViseme = f.viseme ?? null; if (f.say) d.say(f.say); }
  if (settle) for (let i = 0; i < 14; i++) d.update(1 / 30);
  const w = d.faceWeights; for (let i = 0; i < (settle ? 8 : 1); i++) s.fig.tint.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0);
}

let slots: Slot[] = []; const extras: THREE.Object3D[] = [];
const stoolMat = new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.8 });
function clearAll(): void { for (const s of slots) { scene.remove(s.holder); s.fig.tint.dispose(); } slots = []; for (const e of extras) scene.remove(e); extras.length = 0; }
function shadowOn(o: THREE.Object3D): void { o.traverse((p) => { const m = p as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }

export interface WallSpec {
  picks?: Pick[]; random?: { n: number; seed: number; sex?: 'male' | 'female'; lod?: 'hero' | 'crowd' }; pose: string; poses?: string[]; phase?: number; phases?: number[]; cols: number; spacingX: number; spacingZ?: number; width: number; height: number;
  cam: { target: [number, number, number]; dist: number; az: number; lift: number; fov: number }; rys?: number[]; ry?: number; face?: Face; seat?: number; today?: string[];
}
function randomPick(r: () => number, sex?: 'male' | 'female', lod?: 'hero' | 'crowd', used: Set<string> = new Set()): Pick {
  const pool = LOOKS.filter((l) => !sex || l.sex === sex); let look = pool[Math.floor(r() * pool.length)]!;
  for (let i = 0; i < 8 && used.has(look.id); i++) look = pool[Math.floor(r() * pool.length)]!;
  used.add(look.id);
  return { id: look.id, lod, outfit: Math.floor(r() * (look.outfits.length + 1)), skin: look.skinSteps && r() < 0.5 ? SKIN_TONES[Math.floor(r() * SKIN_TONES.length)] : undefined };
}
async function wall(spec: WallSpec): Promise<unknown> {
  clearAll(); running = false;
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false); camera.aspect = spec.width / spec.height; camera.fov = spec.cam.fov; camera.updateProjectionMatrix();
  let picks = spec.picks ?? []; if (spec.random) { const r = rng(spec.random.seed), used = new Set<string>(); picks = Array.from({ length: spec.random.n }, (_, i) => { if (i === 6 || (i % 6 === 0 && i > 0)) used.clear(); return randomPick(r, spec.random!.sex, spec.random!.lod, used); }); }
  const n = picks.length, rows = Math.ceil(n / spec.cols), gz = spec.spacingZ ?? 1.6;
  const todayH: Record<string, number> = {};
  const figs = await Promise.all(picks.map((p, i) => build(p, 11 + i * 7)));
  figs.forEach((fig, i) => {
    const pose = spec.poses?.[i] ?? spec.pose; const sc = targetHeight(fig.pick.id) / (lookOf(fig.pick.id).sex === 'male' ? 1.83 : 1.75); void sc; void todayH;
    const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose };
    setPose(slot, pose, spec.phases?.[i] ?? spec.phase ?? 0.28); applyFace(slot, spec.face, true);
    const col = i % spec.cols, row = Math.floor(i / spec.cols), x = (col - (spec.cols - 1) / 2) * spec.spacingX, z = -(row - (rows - 1) / 2) * gz, ry = spec.rys?.[i] ?? spec.ry ?? 0;
    place(slot, x, z, ry, spec.seat ?? 0.5);
    if (pose === 'sit') { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, spec.seat ?? 0.5, 0.36), stoolMat); st.position.set(x, (spec.seat ?? 0.5) / 2, z); st.rotation.y = ry; st.castShadow = st.receiveShadow = true; scene.add(st); extras.push(st); }
    shadowOn(fig.root); scene.add(holder); slots.push(slot);
  });
  const c = spec.cam; camera.position.set(c.target[0] + Math.sin(c.az) * c.dist, c.target[1] + c.lift, c.target[2] + Math.cos(c.az) * c.dist); camera.lookAt(...c.target);
  sun.target.position.set(c.target[0], 1, c.target[2]); sun.position.set(c.target[0] + light.sun[2][0] * 0.6, light.sun[2][1], c.target[2] + light.sun[2][2] * 0.6);
  return figs.map((f) => ({ id: f.pick.id, triangles: f.triangles, drawCalls: f.drawCalls, bytes: f.root.userData['bytes'] }));
}
/** Today's game figure next to chosen roster looks. */
async function withToday(spec: WallSpec, todayLook: Record<string, unknown>): Promise<unknown> {
  const r = await wall(spec);
  const a = buildAvatar(kit, todayLook, { detail: 'medium', pose: 'stand', appearanceFit: true }); const h = new THREE.Group(); h.add(a); h.position.set(-spec.spacingX * 1.5, 0.06, 0); scene.add(h); slots.push({ fig: null as unknown as Fig, holder: h, pose: 'idle' }); return r;
}
async function street(n: number, seed: number, width: number, height: number): Promise<unknown> {
  clearAll(); running = false; renderer.setPixelRatio(1); renderer.setSize(width, height, false); camera.aspect = width / height; camera.fov = 34; camera.updateProjectionMatrix();
  const r = rng(seed), used = new Set<string>(); const picks = Array.from({ length: n }, (_, i) => { if (i % 12 === 0) used.clear(); return randomPick(r, undefined, 'crowd', used); });
  const figs = await Promise.all(picks.map((p, i) => build(p, 5 + i)));
  figs.forEach((fig, i) => {
    const holder = new THREE.Group(); holder.add(fig.root); const lane = i % 4, along = Math.floor(i / 4), slot: Slot = { fig, holder, pose: 'walk' };
    const x = (lane - 1.5) * 1.35 + (r() - 0.5) * 0.4, z = -10 + along * 2.2 + (r() - 0.5) * 0.8; holder.position.set(x, 0.06 + LIFT, z); holder.rotation.y = lane % 2 ? 0 : Math.PI;
    const d = fig.driver; setPose(slot, 'walk', null); d.enabled = { blink: false, breathe: false, shift: false, look: false }; (fig.rig.actions.get(lookOf(fig.pick.id).sex === 'female' ? 'walk-female' : 'walk') ?? fig.rig.actions.get('walk'))!.time = r() * 1.1;
    shadowOn(fig.root); scene.add(holder); slots.push(slot);
  });
  camera.position.set(0.5, 3.2, 8.5); camera.lookAt(0, 0.9, -3.2); sun.target.position.set(0, 1, -3); sun.position.set(light.sun[2][0] * 0.8, light.sun[2][1], -3 + light.sun[2][2] * 0.6);
  for (let i = 0; i < 6; i++) { for (const s of slots) s.fig.driver.update(1 / 30); renderer.render(scene, camera); }
  const gl = renderer.getContext(), px = new Uint8Array(4), t0 = performance.now(), frames = 150;
  for (let i = 0; i < frames; i++) { for (const s of slots) s.fig.driver.update(1 / 30); renderer.render(scene, camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); }
  const ms = (performance.now() - t0) / frames;
  return { figures: n, triangles: figs.reduce((a, f) => a + f.triangles, 0), drawCalls: figs.length, msPerFrame: +ms.toFixed(1), fps: +(1000 / ms).toFixed(1), note: '150 frames with one pixel read back per frame; headless Chrome with software rendering (no GPU): a real device is much faster' };
}

// ------------------------------------------------------------------ the creator
let sex: 'male' | 'female' = 'female', pick: Pick = { id: 'w1' }, cur: Slot | null = null, seq = 0, pose = 'idle', yaw = 0, running = false, last = performance.now(), mood: Mood = 'neutral', happyUntil = 0;
const msg = document.getElementById('msg')!;
function fit(): void { const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); const need = Math.max(2.4 / (2 * tan), 1.6 / (2 * tan * camera.aspect)); camera.position.set(0, 1.3, Math.max(3.4, need)); camera.lookAt(0, 0.93, 0); }
async function rebuild(cheer = true): Promise<void> {
  const my = ++seq; (window as unknown as { __busy: boolean }).__busy = true;
  const fig = await build(pick, 31); if (my !== seq) return;
  (window as unknown as { __busy: boolean }).__busy = false; msg.classList.add('hide');
  if (cur) { scene.remove(cur.holder); cur.fig.tint.dispose(); } for (const e of extras) scene.remove(e); extras.length = 0;
  const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose }; setPose(slot, pose, null); applyFace(slot, undefined, false);
  place(slot, 0, 0, yaw); if (pose === 'sit') { const st = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.36), stoolMat); st.position.set(0, 0.25, 0); st.castShadow = st.receiveShadow = true; scene.add(st); extras.push(st); }
  shadowOn(fig.root); scene.add(holder); cur = slot; slots = [slot]; if (cheer) happyUntil = performance.now() + 1400;
  stats.textContent = `${fig.triangles.toLocaleString()} triangles · ${fig.drawCalls} draw call · ${(Number(fig.root.userData['bytes']) / 1000).toFixed(0)} kB`;
  const rec = panel.querySelector('.rec'); if (rec) rec.textContent = JSON.stringify(pick);
}
const el = (tag: string, cls = '', text = ''): HTMLElement => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
function head(title: string, value = ''): HTMLElement { const h = el('h2'); h.append(el('span', '', title), el('b', '', value)); return h; }
function choose(patch: Partial<Pick>): void { pick = { ...pick, ...patch }; for (const k of Object.keys(patch) as (keyof Pick)[]) if (patch[k] === undefined) delete pick[k]; void rebuild(); build_panel(); }
function chipRow(title: string, items: { id: string; label: string }[], current: string | undefined, onPick: (id: string) => void): HTMLElement {
  const wrap = el('div'); wrap.appendChild(head(title)); const row = el('div', 'row'); for (const it of items) { const b = el('button', 'chip' + (it.id === current ? ' on' : ''), it.label); b.onclick = () => onPick(it.id); row.appendChild(b); } wrap.appendChild(row); return wrap;
}
function build_panel(): void {
  const keep = panel.scrollTop; panel.innerHTML = ''; panel.appendChild(el('h1', '', 'Pick your look'));
  const seg = el('div', 'seg'); for (const [id, label] of [['male', 'Man'], ['female', 'Woman']] as const) { const b = el('button', id === sex ? 'on' : '', label); b.onclick = () => { sex = id; pick = { id: LOOKS.find((l) => l.sex === id)!.id }; void rebuild(); build_panel(); }; seg.appendChild(b); } panel.appendChild(seg);
  const cards = el('div', 'cards'); for (const l of LOOKS.filter((x) => x.sex === sex)) { const c = el('button', 'card' + (l.id === pick.id ? ' on' : '')); const im = document.createElement('img'); im.src = `/m/portraits/${l.id}-0-face.png`; im.alt = ''; im.style.cssText = 'width:56px;height:56px;border-radius:50%;background:#e4e1d8;object-fit:cover'; c.append(im, el('span', '', l.name), el('small', '', l.blurb)); c.onclick = () => { pick = { id: l.id }; void rebuild(); build_panel(); }; cards.appendChild(c); } panel.appendChild(cards);
  const look = lookOf(pick.id);
  const o = el('div'); o.appendChild(head('Outfit', pick.outfit ? `Outfit ${pick.outfit + 1}` : 'As made')); const orow = el('div', 'row');
  for (let k = 0; k <= look.outfits.length; k++) { const b = el('button', 'thumb' + ((pick.outfit ?? 0) === k ? ' on' : '')); const im = document.createElement('img'); im.src = `/m/portraits/${look.id}-${k}-full.png`; im.alt = `Outfit ${k + 1}`; b.appendChild(im); b.setAttribute('aria-label', `Outfit ${k + 1}`); b.onclick = () => choose({ outfit: k }); orow.appendChild(b); }
  o.appendChild(orow); panel.appendChild(o);
  if (look.skinSteps) { const w = el('div'); w.appendChild(head('Skin tone', pick.skin ? SKIN_NAMES[SKIN_TONES.indexOf(pick.skin)] ?? '' : 'As made')); const row = el('div', 'row'); const made = el('button', 'sw made' + (!pick.skin ? ' on' : ''), 'As made'); made.onclick = () => choose({ skin: undefined }); row.appendChild(made); SKIN_TONES.forEach((c, i) => { const b = el('button', 'sw' + (pick.skin === c ? ' on' : '')); b.style.background = c; b.title = SKIN_NAMES[i]!; b.setAttribute('aria-label', `Skin tone: ${SKIN_NAMES[i]}`); b.onclick = () => choose({ skin: c }); row.appendChild(b); }); w.appendChild(row); panel.appendChild(w); }
  panel.appendChild(chipRow('Move', [['idle', 'Stand'], ['walk', 'Walk'], ['jog', 'Jog'], ['sit', 'Sit'], ['dance', 'Dance']].map(([id, label]) => ({ id: id!, label: label! })), pose, (id) => { pose = id; void rebuild(false); build_panel(); }));
  panel.appendChild(chipRow('Face', [['neutral', 'Neutral'], ['happy', 'Happy'], ['uneasy', 'Uneasy'], ['talk', 'Talk'], ['blink', 'Blink']].map(([id, label]) => ({ id: id!, label: label! })), '', (id) => {
    if (!cur) return; const d = cur.fig.driver; if (id === 'talk') d.say('Good morning, how are you today? Welcome to Allworld.'); else if (id === 'blink') { d.forceBlink = 1; setTimeout(() => { d.forceBlink = null; }, 160); } else { mood = id as Mood; d.mood = mood; }
  }));
  panel.appendChild(chipRow('View', [{ id: 'l', label: 'Turn left' }, { id: 'r', label: 'Turn right' }, { id: 'f', label: 'Face front' }], '', (id) => { yaw = id === 'l' ? yaw - 0.6 : id === 'r' ? yaw + 0.6 : 0; if (cur) cur.holder.rotation.y = yaw; }));
  const rec = el('pre', '', JSON.stringify(pick)); rec.className = 'rec'; rec.style.cssText = 'font:11px ui-monospace,monospace;color:#6b7a72;white-space:pre-wrap;word-break:break-all'; panel.appendChild(head('Saved look')); panel.appendChild(rec);
  panel.scrollTop = keep;
}
document.getElementById('shuffle')!.onclick = () => { const r = rng((Math.random() * 1e9) | 0); pick = randomPick(r, sex, 'hero'); void rebuild(); build_panel(); };
function tick(): void {
  requestAnimationFrame(tick); const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!running) { if (!params.has('shoot')) renderer.render(scene, camera); return; }
  for (const s of slots) { const d = s.fig.driver; if (s === cur && now < happyUntil && mood === 'neutral') d.mood = 'happy'; else if (s === cur && now >= happyUntil && d.mood === 'happy' && mood === 'neutral') d.mood = 'neutral'; d.update(dt); const w = d.faceWeights; s.fig.tint.eyes(Math.max(w['blinkL'] ?? 0, w['blinkR'] ?? 0), w['gazeX'] ?? 0, w['gazeY'] ?? 0); }
  renderer.render(scene, camera);
}
let drag: number | null = null;
canvas.addEventListener('pointerdown', (e) => { drag = e.clientX; canvas.setPointerCapture(e.pointerId); }); canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointermove', (e) => { if (drag === null) return; yaw += (e.clientX - drag) * 0.01; drag = e.clientX; if (cur) cur.holder.rotation.y = yaw; });
addEventListener('resize', () => { if (!params.has('shoot')) fit(); }); if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (!params.has('shoot')) fit(); }).observe(canvas);
/** A transparent render of one look: a head-and-shoulders portrait or the whole figure, as a PNG data URL. */
async function portrait(p: Pick, kind: 'head' | 'figure', w: number, h: number): Promise<string> {
  clearAll(); running = false; const fig = await build(p, 31); const holder = new THREE.Group(); holder.add(fig.root); const slot: Slot = { fig, holder, pose: 'idle' };
  setPose(slot, 'idle', 0); applyFace(slot, { mood: 'happy' }, true); place(slot, 0, 0, 0); scene.add(holder); slots.push(slot);
  const vis = venue.group.visible, bg = scene.background; venue.group.visible = false; scene.background = null; renderer.setClearAlpha(0);
  renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = 26; camera.updateProjectionMatrix();
  const male = lookOf(p.id).sex === 'male', top = male ? 1.80 : 1.68;
  if (kind === 'head') { camera.position.set(0, top - 0.17, 1.15); camera.lookAt(0, top - 0.19, 0); } else { camera.position.set(0, 0.95, 4.6); camera.lookAt(0, 0.92, 0); }
  sun.position.set(2.5, 4, 4); sun.target.position.set(0, 1, 0);
  renderer.render(scene, camera); const url = renderer.domElement.toDataURL('image/png');
  venue.group.visible = vis; scene.background = bg; renderer.setClearAlpha(1); return url;
}
(window as unknown as { h5: unknown }).h5 = { wall, street, withToday, portrait, render() { renderer.render(scene, camera); }, ready: true, LOOKS };
if (!params.has('shoot')) { fit(); build_panel(); running = true; try { await rebuild(false); } catch (e) { msg.className = 'err'; msg.textContent = `The character could not be built: ${(e as Error).message}`; } }
tick();
