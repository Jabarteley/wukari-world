// Plain diagnostic viewer: figures on a flat floor under a neutral light, driven by the shipped clip pack (or left in the rest pose).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

interface Item { src: string; clip?: string; t?: number; label?: string; x?: number; ry?: number; skin?: boolean }
interface Spec { items: Item[]; width: number; height: number; view?: 'front' | 'side' | 'tq' | 'back'; lift?: number; fov?: number; target?: [number, number, number]; dist?: number; bones?: boolean; bg?: string }

const canvas = document.getElementById('c') as HTMLCanvasElement, labels = document.getElementById('labels') as HTMLDivElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa07a, 1.0));
const sun = new THREE.DirectionalLight(0xfff2dd, 1.6); sun.position.set(3, 5, 4); scene.add(sun);
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshStandardMaterial({ color: 0xcfd8cf, roughness: 1 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
let clipPack: THREE.AnimationClip[] = [];
const cache = new Map<string, Promise<any>>();
const gl = (url: string): Promise<any> => { if (!cache.has(url)) cache.set(url, loader.loadAsync(url)); return cache.get(url)!; };
let shown: THREE.Object3D[] = [];

async function show(spec: Spec): Promise<void> {
  await MeshoptDecoder.ready;
  if (!clipPack.length) clipPack = (await gl('/body/clip-pack.glb')).animations;
  for (const o of shown) scene.remove(o); shown = [];
  renderer.setPixelRatio(1); renderer.setSize(spec.width, spec.height, false); camera.aspect = spec.width / spec.height; camera.fov = spec.fov ?? 30; camera.updateProjectionMatrix();
  scene.background = new THREE.Color(spec.bg ?? '#72a5bf'); labels.innerHTML = '';
  const n = spec.items.length;
  const ang0 = { front: 0, side: Math.PI / 2, tq: 0.6, back: Math.PI }[spec.view ?? 'front'], right = new THREE.Vector3(Math.cos(ang0), 0, -Math.sin(ang0));
  for (let i = 0; i < n; i++) {
    const it = spec.items[i]!, g = await gl(it.src), obj = clone(g.scene) as THREE.Object3D;
    const holder = new THREE.Group(); holder.add(obj);
    obj.traverse((o) => { const m = o as THREE.SkinnedMesh; if (m.isSkinnedMesh) { m.frustumCulled = false; m.castShadow = true; } });
    if (it.clip) {
      const mixer = new THREE.AnimationMixer(obj);
      const clip = clipPack.find((c) => c.name === it.clip); if (!clip) throw new Error('no clip ' + it.clip);
      const a = mixer.clipAction(clip); a.play(); a.paused = true; a.time = (it.t ?? 0) * clip.duration; mixer.update(0);
    }
    obj.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(obj);
    holder.position.copy(right.clone().multiplyScalar(it.x ?? (i - (n - 1) / 2) * 1.5)); holder.rotation.y = it.ry ?? 0;
    // feet on the floor for stand poses
    if (!it.clip || !/sit|lie|sleep/.test(it.clip)) holder.position.y = -box.min.y;
    scene.add(holder); shown.push(holder); (holder as any).userData.obj = obj;
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = it.label ?? it.src.split('/').pop()!; labels.appendChild(tag);
  }
  const span = Math.max(1.8, n * 1.5), dist = spec.dist ?? span / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / Math.min(1, camera.aspect) * 1.0;
  const t = spec.target ?? [0, 0.95, 0], v = spec.view ?? 'front';
  const ang = { front: 0, side: Math.PI / 2, tq: 0.6, back: Math.PI }[v];
  camera.position.set(t[0] + Math.sin(ang) * dist, t[1] + (spec.lift ?? 0.25), t[2] + Math.cos(ang) * dist); camera.lookAt(t[0], t[1], t[2]);
  sun.position.set(Math.sin(ang) * 3 + 2, 5, Math.cos(ang) * 4);
}
const api = {
  show, render: () => renderer.render(scene, camera), ready: true,
  /** World positions (relative to each figure's own feet) of the named bones, for checking two skeletons against each other. */
  bones(names: string[]): Record<string, number[]>[] {
    return shown.map((h) => { const out: Record<string, number[]> = {}; const o = h.userData.obj as THREE.Object3D; o.updateMatrixWorld(true); o.traverse((b) => { if ((b as THREE.Bone).isBone && names.includes(b.name)) { const p = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld); out[b.name] = [p.x - h.position.x, p.y - h.position.y, p.z - h.position.z].map((v) => +v.toFixed(3)); } }); return out; });
  },
};
(window as unknown as { h1: typeof api }).h1 = api;
