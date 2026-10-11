// Street assets proof page: today's procedural street props and the reduced generated models in one scene, drawn with the game's own
// renderer settings (src/scene/look.ts), light presets (src/scene/lighting.ts), sky and ground, and its own prop and vehicle builders.
// The capture script drives it through window.proof: setup(spec) builds the scene, render() draws it, measure() times frames.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createKit } from '../../../src/scene/kit.ts';
import { createBatch, sceneMaterials } from '../../../src/scene/build.ts';
import { applyRendererLook, createGround, createSky } from '../../../src/scene/look.ts';
import { lightingFor } from '../../../src/scene/lighting.ts';
import { kiosk, leafTree, palm, tallTree } from '../../../src/scene/props.ts';
import { buildVehicle } from '../../../src/models/vehicles/index.ts';
import type { Batch } from '../../../src/scene/types.ts';

type Kind = 'danfo' | 'keke' | 'house' | 'kiosk' | 'mango-tree' | 'palm';
interface Item { src: 'old' | 'new'; kind: Kind; x: number; z: number; ry?: number; lod?: 'near' | 'far'; variant?: string; s?: number; wheels?: number }
interface Spec {
  width: number; height: number; time: 'day' | 'dusk'; base: 'street' | 'plain'; items: Item[];
  cam: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  labels?: { at: [number, number, number]; text: string; note?: string }[];
  instanced?: boolean; pr?: number; shadows?: boolean;
}
interface Model { root: THREE.Object3D; bytes: number; triangles: number; drawCalls: number; texture: number }

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
    triangles += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position!.count) / 3;
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
  const made: Model = { root: gltf.scene, bytes: buf.byteLength, ...geometryCount(gltf.scene) };
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

const nameOf = (it: Item): string => `${it.kind}${it.variant ? '-' + it.variant : ''}${it.lod === 'far' ? '-far' : ''}`;

async function setup(spec: Spec): Promise<{ items: number }> {
  current = spec;
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
    obj.position.set(it.x, 0, it.z); obj.rotation.y = it.ry ?? 0; if (it.s) obj.scale.setScalar(it.s);
    stage.add(obj);
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
  renderer.render(scene, camera);
  lastTriangles = renderer.info.render.triangles;
  return { calls: renderer.info.render.calls, triangles: lastTriangles };
}

/** Times n frames after a warm-up, waiting for the GPU (software here) to finish each one. Spins the wheels a little so nothing is cached. */
function measure(frames: number): { msPerFrame: number; fps: number; calls: number; triangles: number } {
  const gl = renderer.getContext();
  for (let i = 0; i < 2; i++) { renderer.render(scene, camera); }
  gl.finish();
  const t0 = performance.now();
  for (let i = 0; i < frames; i++) {
    camera.position.x += i % 2 ? -0.002 : 0.002; camera.updateMatrixWorld();
    renderer.render(scene, camera);
    gl.finish();
  }
  const ms = (performance.now() - t0) / frames;
  const info = renderer.info.render;
  return { msPerFrame: +ms.toFixed(2), fps: +(1000 / ms).toFixed(1), calls: info.calls, triangles: info.triangles };
}

async function modelInfo(): Promise<Record<string, { bytes: number; triangles: number; drawCalls: number; texture: number }>> {
  const out: Record<string, { bytes: number; triangles: number; drawCalls: number; texture: number }> = {};
  for (const [k, m] of models) out[k] = { bytes: m.bytes, triangles: m.triangles, drawCalls: m.drawCalls, texture: m.texture };
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

(window as unknown as { proof: unknown }).proof = { setup, render, measure, modelInfo, oldInfo, spinWheels, nodeNames, tallTree };
void tallTree;
