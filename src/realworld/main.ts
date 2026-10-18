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
import { buildDressing } from './dressing.ts';
import { buildTraffic } from './vehicles.ts';

const params = new URLSearchParams(location.search);
const vec = (key: string, fallback: [number, number, number]) => (params.get(key)?.split(',').map(Number) ?? fallback) as [number, number, number];
const hud = document.getElementById('hud')!;
const say = (text: string) => { hud.textContent = text; };

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: params.has('shot') });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = ({ agx: THREE.AgXToneMapping, aces: THREE.ACESFilmicToneMapping, neutral: THREE.NeutralToneMapping } as const)[(params.get('tm') ?? 'neutral') as 'agx' | 'aces' | 'neutral'] ?? THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = Number(params.get('exposure') ?? 1.05);
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
// Zinc roofs: the sampled roof colour with the corrugated sheet's relief and roughness (its own paint is green), weathered in streaks of rust.
const zinc = new THREE.MeshStandardMaterial({ vertexColors: true, normalMap: metal.normalMap, roughnessMap: metal.roughnessMap, metalness: 0.35, roughness: 1, normalScale: new THREE.Vector2(1.3, 1.3) });
zinc.onBeforeCompile = (shader) => {
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRoofUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoofUv = uv;');
  shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec2 vRoofUv;
float rhash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float rnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(rhash(i), rhash(i + vec2(1, 0)), f.x), mix(rhash(i + vec2(0, 1)), rhash(i + vec2(1, 1)), f.x), f.y); }`)
    .replace('#include <color_fragment>', `#include <color_fragment>
{ float sheet = floor(vRoofUv.x / 0.9); float rust = rnoise(vec2(sheet * 3.1, vRoofUv.y * 0.35)) * rnoise(vRoofUv * 0.6);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.32, 0.17, 0.09), smoothstep(0.25, 0.7, rust) * 0.7);
  diffuseColor.rgb *= 0.88 + 0.24 * rhash(vec2(sheet, 7.0)); }`);
};
zinc.customProgramCacheKey = () => 'realworld-zinc-1';
const metalRoofs = new THREE.Mesh(built.metalRoofs, zinc);
const flatRoofs = new THREE.Mesh(built.flatRoofs, new THREE.MeshStandardMaterial({ vertexColors: true, map: concrete.map, normalMap: concrete.normalMap, roughnessMap: concrete.roughnessMap }));
for (const m of [walls, metalRoofs, flatRoofs]) { m.castShadow = m.receiveShadow = !params.has('noshadow'); scene.add(m); }
const orthoFit = await fetch('/realworld/lagos-island/ortho.json').then((r) => r.json() as Promise<{ u: [number, number, number]; v: [number, number, number] }>);
const orthoTexture = await new THREE.TextureLoader().loadAsync('/realworld/lagos-island/ortho.jpg');
orthoTexture.colorSpace = THREE.SRGBColorSpace; orthoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); orthoTexture.flipY = true;
const surfaces = buildSurfaces(world, { asphalt, paving, ground, grass, concrete }, params.get('ortho') === '0' ? undefined : { texture: orthoTexture, ...orthoFit });
scene.add(surfaces.group);
const canopy = await fetch('/realworld/lagos-island/canopy.json').then((r) => r.json() as Promise<{ trees: [number, number, number, number][] }>);
const onLand = (x: number, z: number) => world.land.some((ring) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, zi] = ring[i]!, [xj, zj] = ring[j]!; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; });
const trees = await buildTrees(canopy.trees.filter(([x, z]) => onLand(x, z)), () => 0);
scene.add(trees.group);
const dressing = buildDressing(world);
scene.add(dressing.group);
const traffic = buildTraffic(world.roads, () => false);
scene.add(traffic.group);
scene.traverse((o) => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && (o as THREE.Mesh).isMesh && o !== daylight.sky) daylight.setupMaterial(m); });
const buildMs = Math.round(performance.now() - t0);

const post = createPost(renderer, scene, camera);
let hour = Number(params.get('hour') ?? 15.5);
const setHour = (h: number) => { hour = h; daylight.setHour(h); if (params.has('env')) scene.environmentIntensity *= Number(params.get('env')); if (params.has('sun')) for (const l of daylight.csm.lights) l.intensity *= Number(params.get('sun')); facade.uniforms.night.value = daylight.night; dressing.setNight(daylight.night); post.bloom.strength = 0.12 + 0.5 * daylight.night; dirty = true; };
let dirty = true;
setHour(hour);
controls.addEventListener('change', () => { dirty = true; });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.setSize(innerWidth, innerHeight); daylight.csm.updateFrustums(); dirty = true; });
addEventListener('keydown', (e) => { if (e.key === '[') setHour((hour + 23.5) % 24); if (e.key === ']') setHour((hour + 0.5) % 24); });

let frames = 0, last = 0;
function frame(now: number) {
  requestAnimationFrame(frame);
  controls.update();
  surfaces.update(now / 1000);
  const dt = Math.min(0.1, (now - (last || now)) / 1000); last = now; if (!params.has('still')) { traffic.update(dt); dirty = true; }
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
  ready: true, renderer, scene, camera, controls, setHour, world,
  view(cam: [number, number, number], at: [number, number, number]) { camera.position.set(...cam); controls.target.set(...at); controls.update(); dirty = true; },
  frames: () => frames,
};
