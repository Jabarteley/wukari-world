/**
 * Development prototype: Lagos Island core from real data (OpenStreetMap footprints and roads, Overture fill, Google Open
 * Buildings 2.5D measured heights, sampled roof colours) drawn as realistically as the browser allows. Not part of the game build.
 * URL: /realworld.html?cam=x,y,z&at=x,y,z&hour=15.5  (street metres; x east, z south). window.__rw drives it from scripts.
 */
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import type { World } from './types.ts';
import { loadSet } from './textures.ts';
import { buildBuildings } from './buildings.ts';
import { createFacadeMaterial } from './facade-material.ts';
import { buildSurfaces } from './surfaces.ts';
import { createDaylight } from './sky.ts';
import { createPost } from './post.ts';
import { buildTrees } from './trees.ts';

const params = new URLSearchParams(location.search);
const vec = (key: string, fallback: [number, number, number]) => (params.get(key)?.split(',').map(Number) ?? fallback) as [number, number, number];
const hud = document.getElementById('hud')!;
const say = (text: string) => { hud.textContent = text; };

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = Number(params.get('exposure') ?? 1.05);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('stage')!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 30000);
camera.position.set(...vec('cam', [-650, 260, 520]));
const controls = new MapControls(camera, renderer.domElement);
controls.target.set(...vec('at', [-450, 0, 150])); controls.maxPolarAngle = Math.PI * 0.495; controls.enableDamping = true; controls.update();

say('Loading Lagos Island…');
const [world, asphalt, paving, plaster, concrete, metal, ground, grass] = await Promise.all([
  fetch('/realworld/lagos-island/world.json').then((r) => r.json() as Promise<World>),
  loadSet(renderer, 'Asphalt031', 6, ['ao']), loadSet(renderer, 'PavingStones070', 1.6, ['ao']), loadSet(renderer, 'PaintedPlaster017', 2.4),
  loadSet(renderer, 'Concrete034', 3), loadSet(renderer, 'CorrugatedSteel007A', 1.2, ['ao', 'metalness']), loadSet(renderer, 'Ground037', 5, ['ao']), loadSet(renderer, 'Grass004', 3, ['ao']),
]);

const daylight = createDaylight(renderer, scene, camera, params.get('csm') !== '0');
const t0 = performance.now();
const built = buildBuildings(world.buildings);
const facade = createFacadeMaterial(plaster);
const walls = new THREE.Mesh(built.walls, facade.material);
const metalRoofs = new THREE.Mesh(built.metalRoofs, new THREE.MeshStandardMaterial({ vertexColors: true, map: metal.map, normalMap: metal.normalMap, roughnessMap: metal.roughnessMap, metalnessMap: metal.metalnessMap, metalness: 0.6, normalScale: new THREE.Vector2(1.2, 1.2) }));
const flatRoofs = new THREE.Mesh(built.flatRoofs, new THREE.MeshStandardMaterial({ vertexColors: true, map: concrete.map, normalMap: concrete.normalMap, roughnessMap: concrete.roughnessMap }));
for (const m of [walls, metalRoofs, flatRoofs]) { m.castShadow = m.receiveShadow = !params.has('noshadow'); scene.add(m); }
const surfaces = buildSurfaces(world, { asphalt, paving, ground, grass, concrete });
scene.add(surfaces.group);
const canopy = await fetch('/realworld/lagos-island/canopy.json').then((r) => r.json() as Promise<{ trees: [number, number, number, number][] }>);
const trees = await buildTrees(canopy.trees, () => 0);
scene.add(trees.group);
scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && (o as THREE.Mesh).isMesh && o !== daylight.sky) daylight.setupMaterial(m); });
const buildMs = Math.round(performance.now() - t0);

const post = createPost(renderer, scene, camera);
let hour = Number(params.get('hour') ?? 15.5);
const setHour = (h: number) => { hour = h; daylight.setHour(h); if (params.has('env')) scene.environmentIntensity *= Number(params.get('env')); if (params.has('sun')) for (const l of daylight.csm.lights) l.intensity *= Number(params.get('sun')); facade.uniforms.night.value = daylight.night; post.bloom.strength = 0.12 + 0.5 * daylight.night; dirty = true; };
let dirty = true;
setHour(hour);
controls.addEventListener('change', () => { dirty = true; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.setSize(innerWidth, innerHeight); daylight.csm.updateFrustums(); dirty = true; });
addEventListener('keydown', (e) => { if (e.key === '[') setHour((hour + 23.5) % 24); if (e.key === ']') setHour((hour + 0.5) % 24); });

let frames = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  controls.update();
  surfaces.update(now / 1000);
  if (!dirty && !params.has('live')) return;
  dirty = false;
  camera.userData.target = controls.target;
  daylight.update();
  post.render();
  frames++;
  const info = renderer.info.render;
  say(`Lagos Island core · ${built.count} buildings (real footprints, measured heights) · built in ${buildMs} ms\n${info.triangles.toLocaleString()} triangles · ${info.calls} draws · hour ${hour.toFixed(1)} ([ ] to change) · © OpenStreetMap, Overture, Google Open Buildings`);
}
requestAnimationFrame(frame);

/** Script hooks for screenshots: set a view and wait until it has been drawn. */
(window as unknown as { __rw: unknown }).__rw = {
  ready: true, renderer, scene, camera, controls, setHour,
  view(cam: [number, number, number], at: [number, number, number]) { camera.position.set(...cam); controls.target.set(...at); controls.update(); dirty = true; },
  frames: () => frames,
};
