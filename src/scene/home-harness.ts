/**
 * OWNER: home
 * Development-only home interior viewer (see home-harness.html): a furnished visit-style home drawn once with the host's lights.
 * ?grid=6|8|10  ?time=day|dusk|night  ?az=<radians> orbit  ?up=<height>. Nothing here runs in the game.
 */
import { createKit } from './kit.ts';
import { buildHomeScene } from './home-scene.ts';
import { createHostLights } from '../venue-world.ts';
import { applyRendererLook, renderTier, createSky } from './look.ts';
import { lightingFor } from './lighting.ts';

const params = new URLSearchParams(location.search);
const grid = Number(params.get('grid') ?? 8), time = (params.get('time') || 'day') as 'day' | 'dusk' | 'night';
await (await import('../game/cities/registry.ts')).loadCityContent('lagos');
const items = [
  { id: 'a', itemId: 'wardrobe', x: 0, y: 0, rot: 0 }, { id: 'b', itemId: 'bookshelf', x: 2, y: 0, rot: 0 }, { id: 'c', itemId: 'laptop-desk', x: 4, y: 0, rot: 0 },
  { id: 'd', itemId: 'foam-bed', x: 4, y: 2, rot: 0 }, { id: 'e', itemId: 'centre-rug', x: 1, y: 2, rot: 0 }, { id: 'f', itemId: 'family-sofa', x: 1, y: 4, rot: 0 },
  { id: 'g', itemId: 'potted-plant', x: 5, y: 5, rot: 0 }, { id: 'h', itemId: 'wall-art', x: 5, y: 0, rot: 0 }, { id: 'i', itemId: 'standing-lamp', x: 0, y: 3, rot: 0 },
  { id: 'j', itemId: 'small-tv', x: 0, y: 5, rot: 0 }, { id: 'k', itemId: 'wall-calendar', x: 2, y: 0, rot: 1 }, { id: 'l', itemId: 'fridge', x: 3, y: 5, rot: 0 },
  { id: 'm', itemId: 'leather-sofa', x: 7, y: 4, rot: 0 }, { id: 'n', itemId: 'flat-tv', x: 6, y: 0, rot: 0 }, { id: 'o', itemId: 'gas-cooker', x: 8, y: 0, rot: 0 }, { id: 'p', itemId: 'wall-fan', x: 7, y: 0, rot: 0 },
  { id: 'q', itemId: 'bookshelf', x: 9, y: 4, rot: 0 }, { id: 'r', itemId: 'centre-rug', x: 7, y: 2, rot: 0 }, { id: 's', itemId: 'potted-plant', x: 9, y: 9, rot: 0 }, { id: 't', itemId: 'wardrobe', x: 8, y: 7, rot: 0 },
].filter((item) => item.x < grid * (grid > 6 ? 1.5 : 1) && item.y < grid);
const kit = createKit(), { THREE } = kit;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
applyRendererLook(THREE, renderer, renderTier());
document.getElementById('stage')!.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 360);
const lights = createHostLights(THREE, scene);
const sky = createSky(THREE);
scene.background = sky.texture;
const home = buildHomeScene(kit, { visit: { grid, owned: grid > 6, style: { shape: 0, wall: 0, roof: 0, door: 0, windows: 0, fence: 0, yard: 0, sign: 0 }, items } });
home.update({ t: Date.UTC(2026, 0, 5, time === 'day' ? 12 : time === 'dusk' ? 17 : 21) } as never);
scene.add(home.group);
const az = Number(params.get('az') ?? 0.7), up = Number(params.get('up') ?? 21), reach = Number(params.get('reach') ?? 21);
const stage = document.getElementById('stage')!;
const { clientWidth: width, clientHeight: height } = stage;
camera.aspect = width / height;
const c = home.walk.centre;
camera.position.set(c[0] - 2.5 + Math.sin(az) * reach, up, c[2] - 2.5 + Math.cos(az) * reach);
camera.lookAt(c[0] - 2.5, 0.7, c[2] - 2.5);
camera.updateProjectionMatrix();
home.look(camera.position.x + 2.5, camera.position.z + 2.5);
renderer.setSize(width, height, false);
lights.apply(lightingFor('indoor', time));
lights.aim(camera);
sky.set(...home.sky);
renderer.setClearColor(home.background);
renderer.render(scene, camera);
document.getElementById('info')!.textContent = `home grid ${grid} · ${time} · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles} tris`;
(window as unknown as { __diag: unknown }).__diag = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
