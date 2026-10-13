/**
 * OWNER: neighbourhood
 * Development-only street viewer (see street-harness.html): the neighbourhood street drawn once with the host's lights.
 * ?x=<along the street> ?z=<camera z> ?up=<height> ?lx= ?lz= (look-at)  ?time=day|dusk|night. Nothing here runs in the game.
 */
import { createKit } from './kit.ts';
import { buildNeighbourhoodScene } from './neighbourhood-scene.ts';
import { createHostLights } from '../venue-world.ts';
import { applyRendererLook, renderTier, createSky } from './look.ts';
import { lightingFor } from './lighting.ts';

const params = new URLSearchParams(location.search), num = (key: string, fallback: number) => Number(params.get(key) ?? fallback);
const time = (params.get('time') || 'day') as 'day' | 'dusk' | 'night';
await (await import('../game/cities/registry.ts')).loadCityContent('lagos');
const kit = createKit(), { THREE } = kit;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
applyRendererLook(THREE, renderer, renderTier());
document.getElementById('stage')!.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 360);
const lights = createHostLights(THREE, scene);
const sky = createSky(THREE);
scene.background = sky.texture;
const street = buildNeighbourhoodScene(kit);
const { createLife } = await import('../life.ts');
street.update?.(createLife({ location: 'home' }, { cityId: 'lagos', now: Date.UTC(2026, 0, 5, time === 'day' ? 12 : time === 'dusk' ? 17 : 21) }));
scene.add(street.group);
const stage = document.getElementById('stage')!, { clientWidth: width, clientHeight: height } = stage;
const x = num('x', 74);
camera.aspect = width / height;
camera.position.set(x + num('dx', -6), num('up', 7), num('z', 22));
camera.lookAt(num('lx', x), 0.3, num('lz', 6));
camera.updateProjectionMatrix();
renderer.setSize(width, height, false);
lights.apply(lightingFor('outdoor', time));
lights.aim(camera);
sky.set(...street.sky!);
renderer.setClearColor(street.background!);
renderer.render(scene, camera);
document.getElementById('info')!.textContent = `street · ${time} · ${renderer.info.render.calls} calls · ${renderer.info.render.triangles} tris`;
(window as unknown as { __diag: unknown }).__diag = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles };
