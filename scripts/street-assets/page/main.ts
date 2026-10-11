// Street assets proof page: today's procedural street props and the reduced generated models in one scene, drawn with the game's own
// renderer settings (src/scene/look.ts), light presets (src/scene/lighting.ts), sky and ground, and its own prop and vehicle builders.
// The capture script drives it through window.proof: setup(spec) builds the scene, render() draws it, measure() times frames.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createKit } from '../../../src/scene/kit.ts';
import { createBatch, sceneMaterials } from '../../../src/scene/build.ts';
import { applyRendererLook, createGround, createSky } from '../../../src/scene/look.ts';
import { lightingFor } from '../../../src/scene/lighting.ts';
import { kiosk, leafTree, palm, tallTree } from '../../../src/scene/props.ts';
import { buildVehicle } from '../../../src/models/vehicles/index.ts';
import type { Batch } from '../../../src/scene/types.ts';

type Kind = 'danfo' | 'keke' | 'house' | 'kiosk' | 'mango-tree' | 'palm';
interface Item { src: 'old' | 'new'; kind: Kind; file?: string; home?: boolean; label?: string; y?: number; x: number; z: number; ry?: number; lod?: 'near' | 'far'; variant?: string; s?: number; wheels?: number }
interface Spec {
  width: number; height: number; time: 'day' | 'dusk' | 'night'; base: 'street' | 'plain'; items: Item[];
  cam: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  labels?: { at: [number, number, number]; text: string; note?: string }[];
  instanced?: boolean; pr?: number; shadows?: boolean; lightsOn?: boolean; slotItems?: boolean; quad?: { pos: [number, number, number]; look: [number, number, number] }[];
}
interface Model { root: THREE.Object3D; bytes: number; triangles: number; drawCalls: number; texture: number; size: [number, number, number] }

const canvas = document.getElementById('c') as HTMLCanvasElement;
const labelBox = document.getElementById('labels') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
applyRendererLook(THREE as never, renderer as never);
renderer.setPixelRatio(1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 360);
const kit = createKit();
const sky = createSky(THREE as never), ground = createGround(THREE as never);
scene.background = sky.texture;
ground.place(0, 0, 150, -0.46); ground.tint('#7f9a71');
scene.add(ground.mesh);

// The host's three lights (src/venue-world.ts createHostLights, copied: that module pulls in the whole game).
const hemi = new THREE.HemisphereLight('#ffffff', '#cccccc', 1);
const sun = new THREE.DirectionalLight('#ffffff', 1);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
sun.shadow.normalBias = 0.04;
const rim = new THREE.DirectionalLight('#ffffff', 0.5); rim.position.set(-14, 12, -18);
scene.add(hemi, sun, sun.target, rim);

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const models = new Map<string, Model>();
const geometryCount = (root: THREE.Object3D): { triangles: number; drawCalls: number; texture: number } => {
  let triangles = 0, drawCalls = 0, texture = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    drawCalls += 1;
    triangles += ((m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position!.count) / 3) * ((m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1);
    const map = (m.material as THREE.MeshStandardMaterial).map;
    if (map?.image) texture = Math.max(texture, (map.image as { width: number }).width);
  });
  return { triangles, drawCalls, texture };
};
async function load(name: string): Promise<Model> {
  const have = models.get(name);
  if (have) return have;
  const buf = await (await fetch(`/g/${name}.glb`)).arrayBuffer();
  const gltf = await loader.parseAsync(buf, '');
  gltf.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  const box = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  const made: Model = { root: gltf.scene, bytes: buf.byteLength, ...geometryCount(gltf.scene), size: [box.x, box.y, box.z] };
  models.set(name, made);
  return made;
}

/** Today's procedural thing, built the way the game builds it. Faces +z, stands on y = 0. */
function oldThing(kind: Kind, it: Item): THREE.Object3D {
  const holder = new THREE.Group();
  if (kind === 'danfo' || kind === 'keke') {
    const model = buildVehicle(kind, { detail: 'street' });
    model.object3D.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    holder.add(model.object3D);
    return holder;
  }
  const b: Batch = createBatch(THREE as never);
  if (kind === 'house') drawOldHouse(b);
  else if (kind === 'kiosk') kiosk(b, 0, 0);
  else if (kind === 'mango-tree') leafTree(b, 0, 0, { s: it.s ?? 1.25 });
  else palm(b, 0, 0, { s: it.s ?? 1.3 });
  const built = b.build(sceneMaterials(kit) as never);
  for (const mesh of built.meshes) holder.add(mesh);
  return holder;
}

/** The neighbourhood scene's own house (src/scene/neighbourhood-scene.ts drawHouse, main house, two floors) and its compound fence, copied: that module is not exported. */
function drawOldHouse(b: Batch): void {
  const x = 0, front = -7.15, width = 8.8, depth = 6.1, floors = 2;
  const wall = '#e6cf9f', roof = '#a85c40', door = '#6b4a2b';
  const back = front - depth, half = width / 2, wallHeight = floors * 3.4, leftDoor = 0.78, doorWidth = 1.56, wallDepth = 0.24;
  b.box(x - (half + leftDoor) / 2, wallHeight / 2, front, half - leftDoor, wallHeight, wallDepth, wall);
  b.box(x + (half + leftDoor) / 2, wallHeight / 2, front, half - leftDoor, wallHeight, wallDepth, wall);
  b.box(x, (wallHeight + 2.45) / 2, front, doorWidth, wallHeight - 2.45, wallDepth, wall);
  b.box(x - half, wallHeight / 2, back + depth / 2, wallDepth, wallHeight, depth, wall);
  b.box(x + half, wallHeight / 2, back + depth / 2, wallDepth, wallHeight, depth, wall);
  b.box(x, wallHeight / 2, back, width, wallHeight, wallDepth, wall);
  for (let floor = 1; floor < floors; floor++) {
    const y = floor * 3.4;
    b.box(x, y, front, width, 0.16, 0.3, '#e2d6bf');
    for (const side of [-1, 1]) {
      b.box(x + side * 2.2, y + 1.75, front - 0.14, 1.6, 1.2, 0.08, '#805a37');
      b.box(x + side * 2.2, y + 1.75, front - 0.085, 1.4, 1.02, 0.04, '#b8d8e7');
    }
  }
  b.box(x, wallHeight + 0.28, back + depth / 2, width + 0.5, 0.56, depth + 0.5, roof);
  b.box(x, wallHeight + 0.58, back + depth / 2, width + 0.5, 0.12, depth + 0.5, '#e2d6bf');
  b.box(x, 1.12, front - 0.14, 1.28, 2.18, 0.1, door);
  b.box(x + 0.38, 1.1, front - 0.075, 0.07, 0.12, 0.08, '#dfbd64');
  b.box(x - 2.55, 2.35, front - 0.14, 1.6, 1.15, 0.08, '#805a37');
  b.box(x - 2.55, 2.35, front - 0.085, 1.42, 0.94, 0.04, '#b8d8e7');
  b.box(x + 2.55, 2.35, front - 0.14, 1.6, 1.15, 0.08, '#805a37');
  b.box(x + 2.55, 2.35, front - 0.085, 1.42, 0.94, 0.04, '#b8d8e7');
  b.box(x, 3.25, front - 0.18, 1.8, 0.14, 0.12, '#f0d99a');
  // the compound: the walking-grid fences of the same file (left, right, back, and the front either side of a 2.9 wide gate)
  const left = -6, right = 6, gate = 0;
  const fences: [number, number, number, number][] = [[left + 0.15, -14, left + 0.42, -1.65], [right - 0.42, -14, right - 0.15, -1.65], [left + 0.15, -14.15, right - 0.15, -13.88], [left + 0.15, -1.9, gate - 1.45, -1.62], [gate + 1.45, -1.9, right - 0.15, -1.62]];
  for (const [x0, z0, x1, z1] of fences) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    b.box(cx, 0.46, cz, x1 - x0, 0.92, z1 - z0, '#c8b592');
    b.box(cx, 0.96, cz, x1 - x0 + 0.05, 0.12, z1 - z0 + 0.05, '#73553b');
  }
}

/** The street the neighbourhood scene draws (its grass, pavement, kerbs, road and dashes), as one batch. */
function streetBase(): THREE.Object3D {
  const b = createBatch(THREE as never), width = 96;
  b.box(0, -0.2, -3.5, width, 0.24, 29, '#7f9a71');
  b.box(0, 0.015, -0.45, width, 0.08, 2.4, '#d7c7a4');
  b.box(0, 0.02, 1.4, width, 0.1, 1.2, '#c3b48f');
  b.box(0, -0.03, 2.22, width, 0.1, 0.24, '#736f61');
  b.box(0, -0.04, 6.7, width, 0.08, 7.9, '#5e625e');
  for (let x = -width / 2 + 3; x <= width / 2 - 3; x += 6) b.box(x, 0.01, 6.7, 2.8, 0.015, 0.12, '#c5b889');
  b.box(0, 0.06, 2.6, width, 0.1, 0.28, '#b6a786');
  b.box(0, 0.06, 10.72, width, 0.1, 0.28, '#b6a786');
  const built = b.build(sceneMaterials(kit) as never);
  const g = new THREE.Group(); for (const m of built.meshes) g.add(m);
  return g;
}
function plainBase(): THREE.Object3D {
  const b = createBatch(THREE as never);
  b.box(0, -0.2, 0, 60, 0.24, 60, '#7f9a71');
  const built = b.build(sceneMaterials(kit) as never);
  const g = new THREE.Group(); for (const m of built.meshes) g.add(m);
  return g;
}

let stage = new THREE.Group();
scene.add(stage);
let current: Spec | null = null;
let lastTriangles = 0;
const resolved: { it: Item; model?: Model; object?: THREE.Object3D }[] = [];

const nameOf = (it: Item): string => it.file ?? `${it.kind}${it.variant ? '-' + it.variant : ''}${it.lod === 'far' ? '-far' : ''}`;

async function setup(spec: Spec): Promise<{ items: number }> {
  current = spec;
  for (const g of (stage.userData['glow'] ?? []) as THREE.Object3D[]) scene.remove(g);
  scene.remove(stage);
  stage.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh) { /* geometries of old things are rebuilt each time */ m.geometry?.dispose?.(); } if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose(); });
  stage = new THREE.Group(); scene.add(stage);
  labelBox.innerHTML = '';
  canvas.width = spec.width; canvas.height = spec.height;
  renderer.setPixelRatio(spec.pr ?? 1); renderer.setSize(spec.width, spec.height, false);
  camera.aspect = spec.width / spec.height; camera.fov = spec.cam.fov ?? 43; camera.position.set(...spec.cam.pos); camera.lookAt(...spec.cam.look); camera.updateProjectionMatrix();
  const light = lightingFor('outdoor', spec.time);
  sky.set(light.sky[0], light.sky[1]);
  hemi.color.set(light.hemi[0]); hemi.groundColor.set(light.hemi[1]); hemi.intensity = light.hemi[2];
  sun.color.set(light.sun[0]); sun.intensity = light.sun[1]; sun.position.set(...light.sun[2]);
  sun.target.position.set(0, 0, 0);
  rim.color.set(light.rim[0]); rim.intensity = light.rim[1];
  renderer.shadowMap.enabled = spec.shadows !== false;
  stage.add(spec.base === 'street' ? streetBase() : plainBase());
  resolved.length = 0;
  const instanceGroups = new Map<string, { model: Model; list: { x: number; z: number; ry: number; s: number }[] }>();
  for (const it of spec.items) {
    if (it.src === 'old') {
      const obj = oldThing(it.kind, it);
      obj.position.set(it.x, 0, it.z); obj.rotation.y = it.ry ?? 0; stage.add(obj);
      resolved.push({ it, object: obj });
      continue;
    }
    if (it.home) {
      const hm = await loadHome(it.file!);
      const o = hm.root.clone(true);
      o.traverse((n) => { if (n.name === 'sign_number' && it.label) { const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d')!; g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128); g.fillStyle = '#12306a'; g.font = 'bold 84px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(it.label, 128, 70); const tx = new THREE.CanvasTexture(cv); tx.flipY = false; tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1024 / 128, 1024 / 64); tx.offset.set(-256 / 128, -768 / 64); (n as THREE.Mesh).material = new THREE.MeshBasicMaterial({ map: tx }); } });
      o.position.set(it.x, it.y ?? 0, it.z); o.rotation.y = it.ry ?? 0; if (it.s) o.scale.setScalar(it.s);
      stage.add(o); resolved.push({ it, object: o });
      continue;
    }
    const model = await load(nameOf(it));
    if (spec.instanced) {
      const key = nameOf(it);
      let entry = instanceGroups.get(key);
      if (!entry) { entry = { model, list: [] }; instanceGroups.set(key, entry); }
      entry.list.push({ x: it.x, z: it.z, ry: it.ry ?? 0, s: it.s ?? 1 });
      resolved.push({ it, model });
      continue;
    }
    const obj = model.root.clone(true);
    if (/^(bungalow|house2|flats)-/.test(nameOf(it))) obj.userData['r2'] = true;
    obj.position.set(it.x, 0, it.z); obj.rotation.y = it.ry ?? 0; if (it.s) obj.scale.setScalar(it.s);
    stage.add(obj);
    if (spec.slotItems) {
      const colours = ['#e0524a', '#3b82c4', '#e8b23a', '#4caf6a', '#8e63c7', '#e07b39'];
      let k = 0;
      obj.traverse((n) => {
        if (!/^slot_/.test(n.name)) return;
        const ex = n.userData as { width?: number; height?: number; facing?: number[]; anchor?: string };
        const w = ex.width ?? 0.4, h = ex.height ?? 0.4, f = ex.facing ?? [0, 0, 1];
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), new THREE.MeshStandardMaterial({ color: colours[k++ % colours.length]! }));
        box.position.y = ex.anchor === 'top' ? -h / 2 : h / 2; box.rotation.y = Math.atan2(f[0] ?? 0, f[2] ?? 1); box.castShadow = true;
        n.add(box);
      });
    }
    resolved.push({ it, model, object: obj });
  }
  for (const { model, list } of instanceGroups.values()) {
    let mesh: THREE.Mesh | null = null;
    model.root.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
    if (!mesh) continue;
    const src = mesh as THREE.Mesh;
    const inst = new THREE.InstancedMesh(src.geometry, src.material as THREE.Material, list.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    list.forEach((p, i) => { e.set(0, p.ry, 0); m4.compose(new THREE.Vector3(p.x, 0, p.z), q.setFromEuler(e), new THREE.Vector3(p.s, p.s, p.s)); inst.setMatrixAt(i, m4); });
    inst.castShadow = true; inst.receiveShadow = true; inst.frustumCulled = false;
    stage.add(inst);
  }
  if (spec.lightsOn && spec.time !== 'day') {
    // lit windows: an emissive mask that is white only over the window, church and mosque tiles of the street atlas
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64); g.fillRect(64, 0, 64, 64);
    const mask = new THREE.CanvasTexture(cv); mask.flipY = false;
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 256; const g2 = cv2.getContext('2d')!; g2.fillStyle = '#000'; g2.fillRect(0, 0, 256, 256); g2.fillStyle = '#fff'; g2.fillRect(128, 192, 64, 64);
    const mask2 = new THREE.CanvasTexture(cv2); mask2.flipY = false;
    stage.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mt = m.material as THREE.MeshStandardMaterial; if (mt && mt.map && mt.name === 'atlas' && !mt.emissiveMap) { m.material = mt.clone(); const nm = m.material as THREE.MeshStandardMaterial; let isR2 = false; m.traverseAncestors((a) => { if (a.userData['r2']) isR2 = true; }); const mk = (isR2 ? mask2 : mask).clone(); mk.flipY = false; mk.offset.copy(mt.map.offset); mk.repeat.copy(mt.map.repeat); mk.rotation = mt.map.rotation; mk.center.copy(mt.map.center); mk.needsUpdate = true; nm.emissiveMap = mk; nm.emissive.set(spec.time === 'night' ? '#ffd9a0' : '#ffbf80'); nm.emissiveIntensity = spec.time === 'night' ? 1.0 : 0.55; } });
  }
  if (spec.lightsOn) {
    stage.updateMatrixWorld(true);
    const glow = { head: new THREE.MeshBasicMaterial({ color: '#fff3c0' }), tail: new THREE.MeshBasicMaterial({ color: '#ff2a1a' }), lamp: new THREE.MeshBasicMaterial({ color: '#ffe9a8' }), traffic: new THREE.MeshBasicMaterial({ color: '#ffffff' }) };
    const geo = new THREE.SphereGeometry(0.16, 8, 6);
    const spots: THREE.Object3D[] = [];
    stage.traverse((o) => { if (/^light_/.test(o.name)) spots.push(o); });
    let nLights = 0;
    for (const o of spots) {
      const kind = o.name.startsWith('light_head') ? 'head' : o.name.startsWith('light_tail') ? 'tail' : o.name.startsWith('light_lamp') ? 'lamp' : 'traffic';
      const wp = o.getWorldPosition(new THREE.Vector3());
      const m = new THREE.Mesh(geo, glow[kind]); m.position.copy(wp); m.scale.setScalar(kind === 'lamp' ? 1.4 : kind === 'traffic' ? 0.7 : 1);
      if (kind === 'traffic') { const c = o.name.endsWith('red') ? '#ff3020' : o.name.endsWith('amber') ? '#ffb020' : '#30ff60'; m.material = new THREE.MeshBasicMaterial({ color: c }); }
      scene.add(m); stage.userData['glow'] = (stage.userData['glow'] ?? []).concat(m);
      if ((kind === 'lamp') && nLights < 6) { const pl = new THREE.PointLight('#ffd890', 40, 16, 1.5); pl.position.copy(wp); scene.add(pl); stage.userData['glow'].push(pl); nLights++; }
    }
  }
  camera.updateMatrixWorld();
  for (const l of spec.labels ?? []) {
    const v = new THREE.Vector3(...l.at).project(camera);
    const d = document.createElement('div'); d.className = 'tag';
    d.innerHTML = l.text + (l.note ? `<small>${l.note}</small>` : '');
    d.style.left = `${(v.x * 0.5 + 0.5) * spec.width}px`; d.style.top = `${(-v.y * 0.5 + 0.5) * spec.height}px`;
    labelBox.appendChild(d);
  }
  return { items: resolved.length };
}

function render(): { calls: number; triangles: number } {
  const q = current?.quad;
  if (q && q.length) {
    // four views of the same scene in one picture (2 x 2): shows every side of an asset at once
    const w = current!.width, h = current!.height;
    renderer.setScissorTest(true);
    q.forEach((view, i) => {
      const x = (i % 2) * (w / 2), y = (1 - Math.floor(i / 2)) * (h / 2);
      renderer.setViewport(x, y, w / 2, h / 2); renderer.setScissor(x, y, w / 2, h / 2);
      camera.aspect = w / h; camera.position.set(...view.pos); camera.lookAt(...view.look); camera.updateProjectionMatrix();
      renderer.render(scene, camera);
    });
    renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h);
    return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  }
  renderer.render(scene, camera);
  lastTriangles = renderer.info.render.triangles;
  return { calls: renderer.info.render.calls, triangles: lastTriangles };
}

/** Times n frames after a warm-up. A one-pixel read-back after every frame makes the (software) GPU finish it, so the time is real. Calls and triangles are those of one
 * scene pass with the shadow map off (the shadow pass draws the casters a second time). */
function measure(frames: number): { msPerFrame: number; fps: number; callsScene: number; trianglesScene: number; callsWithShadowPass: number; trianglesWithShadowPass: number } {
  const gl = renderer.getContext();
  const px = new Uint8Array(4);
  const sync = (): void => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  for (let i = 0; i < 2; i++) { renderer.render(scene, camera); sync(); }
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    camera.position.x += i % 2 ? -0.002 : 0.002; camera.updateMatrixWorld();
    renderer.render(scene, camera);
    sync();
  }
  const ms = (performance.now() - t0) / frames;
  const withShadow = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  const was = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = false; renderer.render(scene, camera);
  const scenePass = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
  renderer.shadowMap.enabled = was;
  return { msPerFrame: +ms.toFixed(2), fps: +(1000 / ms).toFixed(1), callsScene: scenePass.calls, trianglesScene: scenePass.triangles, callsWithShadowPass: withShadow.calls, trianglesWithShadowPass: withShadow.triangles };
}

async function modelInfo(): Promise<Record<string, { bytes: number; triangles: number; drawCalls: number; texture: number; size: number[] }>> {
  const out: Record<string, { bytes: number; triangles: number; drawCalls: number; texture: number; size: number[] }> = {};
  for (const [k, m] of models) out[k] = { bytes: m.bytes, triangles: m.triangles, drawCalls: m.drawCalls, texture: m.texture, size: m.size };
  return out;
}

function oldInfo(): Record<string, { triangles: number; drawCalls: number }> {
  const out: Record<string, { triangles: number; drawCalls: number }> = {};
  for (const r of resolved) if (r.object && r.it.src === 'old') { const c = geometryCount(r.object); out[r.it.kind] = { triangles: c.triangles, drawCalls: c.drawCalls }; }
  return out;
}

/** Spins the wheels of the new vehicles (nodes named wheel*) by an angle, to prove they turn about their own axles. */
function spinWheels(angle: number): number {
  let n = 0;
  for (const r of resolved) r.object?.traverse((o) => { if (/^wheel/i.test(o.name)) { o.rotation.x = angle; n++; } });
  return n;
}
function nodeNames(name: string): string[] {
  const m = models.get(name); const out: string[] = [];
  m?.root.traverse((o) => { out.push(o.name + (o.parent && o.parent !== m.root ? '<' + o.parent.name : '')); });
  return out;
}

// ---------------------------------------------------------------- the home set: rooms, furniture and detail pieces share one atlas and one material
interface HomeItem { piece: string; x: number; y: number; rot?: number; variant?: string; mountZ?: number; floorZ?: number; wall?: 'back' | 'left' }
interface HomeSpec {
  width: number; height: number; time: 'day' | 'dusk' | 'night'; room: string; items: HomeItem[]; hide?: string[]; cam: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  lightsOn?: boolean; merge?: boolean; shadows?: boolean; extra?: { file: string; x: number; y: number; z: number; ry?: number; s?: number }[];
}
let homeMat: THREE.MeshStandardMaterial | null = null, homeGlow: THREE.MeshBasicMaterial | null = null;
const homeCache = new Map<string, { root: THREE.Object3D; info: any; bytes: number }>();
async function homeAssets(): Promise<void> {
  if (homeMat) return;
  const tex = await new THREE.TextureLoader().loadAsync('/g/home-atlas.jpg');
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.anisotropy = 4;
  homeMat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.85, metalness: 0 });
  homeGlow = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true });
}
async function loadHome(name: string): Promise<{ root: THREE.Object3D; info: any; bytes: number }> {
  const have = homeCache.get(name);
  if (have) return have;
  await homeAssets();
  const buf = await (await fetch(`/g/${name}.glb`)).arrayBuffer();
  const gltf = await loader.parseAsync(buf, '');
  gltf.scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.material = /glow/.test(m.name) || /glow/.test(m.parent?.name ?? '') ? homeGlow! : homeMat!;
    m.castShadow = !/glass|glow/.test(m.name); m.receiveShadow = true;
  });
  const base = name.replace(/-(slate|terracotta|grey|green|cream|blue|red|ankara-a|ankara-b)$/, '');
  let info: any = null;
  try { info = await (await fetch(`/g/info/${base}.json`)).json(); } catch { /* wall/room pieces may have none */ }
  const made = { root: gltf.scene, info, bytes: buf.byteLength };
  homeCache.set(name, made);
  return made;
}
const CELLM = 1.2;
async function setupHome(spec: HomeSpec): Promise<{ meshes: number; triangles: number; drawCalls: number; unmergedDrawCalls: number; unmergedTriangles: number; pieces: number }> {
  for (const g of (stage.userData['glow'] ?? []) as THREE.Object3D[]) scene.remove(g);
  scene.remove(stage);
  stage = new THREE.Group(); scene.add(stage);
  labelBox.innerHTML = '';
  current = null;
  canvas.width = spec.width; canvas.height = spec.height;
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false);
  camera.aspect = spec.width / spec.height; camera.fov = spec.cam.fov ?? 40; camera.position.set(...spec.cam.pos); camera.lookAt(...spec.cam.look); camera.updateProjectionMatrix();
  // one warm key, a soft fill, dark surroundings: the room glows against the dark (renders only; the game has its own lighting)
  const night = spec.time === 'night';
  sky.set('#15110f', '#0c0a09');
  hemi.color.set(night ? '#6b6a8a' : '#d9e1ee'); hemi.groundColor.set('#3a2a1e'); hemi.intensity = night ? 0.55 : 0.75;
  sun.color.set(night ? '#ffc98a' : '#ffe3b8'); sun.intensity = night ? 0.55 : 2.1; sun.position.set(-9, 16, 12);
  sun.shadow.radius = 7; sun.shadow.blurSamples = 12; sun.shadow.bias = -0.0006;
  sun.target.position.set(6, 0, 5); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20; sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20; sun.shadow.camera.updateProjectionMatrix();
  rim.color.set('#ffd9b0'); rim.intensity = night ? 0.1 : 0.25;
  renderer.shadowMap.enabled = spec.shadows !== false;
  ground.place(6, 5, 60, -0.3); ground.tint('#1a1512');
  const room = await loadHome(spec.room);
  const root = new THREE.Group(); root.name = 'home';
  const rr = room.root.clone(true);
  rr.traverse((o) => { if (spec.hide?.includes(o.name)) o.visible = false; });
  root.add(rr);
  const lamps: THREE.Vector3[] = []; const lampCol: string[] = [];
  stage.add(root);
  let pieces = 0;
  for (const it of spec.items) {
    const name = it.variant && it.variant !== 'default' ? `${it.piece}-${it.variant}` : it.piece;
    const m = await loadHome(name);
    const info = m.info ?? (await loadHome(it.piece)).info;
    const w = info?.w ?? 1, h = info?.h ?? 1, rot = it.rot ?? 0;
    const obj = m.root.clone(true);
    const holder = new THREE.Group();
    holder.add(obj);
    if (info?.wall || info?.ceiling) {
      const slot = (it.wall === 'left' || rot === 1) ? it.y : it.x;
      if (it.wall === 'left' || rot === 1) { holder.position.set(0.0, it.mountZ ?? info.mountZ ?? 1.4, (slot + 0.5) * CELLM); holder.rotation.y = Math.PI / 2; }
      else if (info?.ceiling) { holder.position.set((it.x + 0.5) * CELLM, 0, (it.y + 0.5) * CELLM); }
      else { holder.position.set((slot + 0.5) * CELLM, it.mountZ ?? info.mountZ ?? 1.4, 0.0); }
    } else {
      const ew = rot % 2 ? h : w, eh = rot % 2 ? w : h;
      holder.position.set((it.x + ew / 2) * CELLM, it.floorZ ?? 0, (it.y + eh / 2) * CELLM);
      holder.rotation.y = rot * Math.PI / 2;
    }
    if (it.piece === 'uplight') holder.userData['lamp'] = ({ magenta: '#ff3fb0', blue: '#4f7bff', amber: '#ffb02e' } as Record<string, string>)[it.variant ?? ''] ?? '#ffd27a';
    stage.add(holder); pieces++;
  }
  for (const e of spec.extra ?? []) {
    const m = await loadHome(e.file); const o = m.root.clone(true); const hd = new THREE.Group(); hd.add(o); hd.position.set(e.x, e.y, e.z); hd.rotation.y = e.ry ?? 0; if (e.s) hd.scale.setScalar(e.s); stage.add(hd); pieces++;
  }
  stage.updateMatrixWorld(true);
  const count = (obj: THREE.Object3D): { t: number; c: number } => { let t = 0, c = 0; obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible) { c++; t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position!.count) / 3; } }); return { t, c }; };
  const before = count(stage);
  stage.traverse((o) => { if (/^light_/.test(o.name) && o.visible) { lamps.push(o.getWorldPosition(new THREE.Vector3())); let col = '#ffc27a'; o.traverseAncestors((a) => { if (a.userData['lamp']) col = a.userData['lamp']; }); lampCol.push(col); } });
  if (spec.merge) {
    const groups = new Map<string, THREE.BufferGeometry[]>();
    const kill: THREE.Object3D[] = [];
    stage.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.visible) return;
      let hidden = false; m.traverseAncestors((a) => { if (!a.visible) hidden = true; }); if (hidden) return;
      const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes['color']) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position!.count * 3).fill(1), 3));
      else if ((g.attributes['color'] as THREE.BufferAttribute).itemSize === 4) { const c = g.attributes['color'] as THREE.BufferAttribute; const a = new Float32Array(c.count * 3); for (let i = 0; i < c.count; i++) { a[i * 3] = c.getX(i); a[i * 3 + 1] = c.getY(i); a[i * 3 + 2] = c.getZ(i); } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); }
      const key = m.material === homeGlow ? 'glow' : 'solid';
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(g.index ? g.toNonIndexed() : g);
      kill.push(m);
    });
    for (const m of kill) (m as THREE.Mesh).visible = false;
    for (const [k, list] of groups) {
      const merged = mergeGeometries(list, false)!;
      const mesh = new THREE.Mesh(merged, k === 'glow' ? homeGlow! : homeMat!);
      mesh.castShadow = k === 'solid'; mesh.receiveShadow = true; mesh.name = 'merged-' + k; mesh.frustumCulled = false;
      stage.add(mesh);
    }
  }
  const after = (() => { let t = 0, c = 0; stage.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.visible) { let hidden = false; m.traverseAncestors((a) => { if (!a.visible) hidden = true; }); if (!hidden) { c++; t += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position!.count) / 3; } } }); return { t, c }; })();
  if (spec.lightsOn) {
    const warm = spec.time === 'day' ? 0.35 : 1;
    const use = lamps.slice(0, 16);
    for (const [li, p] of use.entries()) { const pl = new THREE.PointLight(lampCol[li] ?? '#ffc27a', (lampCol[li] && lampCol[li] !== '#ffc27a' ? 5 : 7) * warm, 8, 1.8); pl.castShadow = false; pl.position.copy(p); scene.add(pl); stage.userData['glow'] = (stage.userData['glow'] ?? []).concat(pl); }
  }
  return { meshes: after.c, triangles: after.t, drawCalls: after.c, unmergedDrawCalls: before.c, unmergedTriangles: before.t, pieces };
}
async function homeInfo(names: string[]): Promise<Record<string, { bytes: number; triangles: number }>> {
  const out: Record<string, { bytes: number; triangles: number }> = {};
  for (const n of names) { const m = await loadHome(n); let t = 0; m.root.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) t += (mm.geometry.index ? mm.geometry.index.count : mm.geometry.attributes.position!.count) / 3; }); out[n] = { bytes: m.bytes, triangles: t }; }
  return out;
}

(window as unknown as { proof: unknown }).proof = { setup, setupHome, homeInfo, render, measure, modelInfo, oldInfo, spinWheels, nodeNames, tallTree };
void tallTree;
