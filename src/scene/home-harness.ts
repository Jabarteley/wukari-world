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
// Zoned default layouts by tier (single-room homes): kitchen kit at the back right, bed and wardrobe at the front right, the sitting area facing the TV,
// the entry (door at x 0, y grid - 2) and the window slot (x grid / 2, y 0) left clear. [itemId, x, y, rot] (rot 2 faces the back wall).
const LAYOUTS: Record<number, [string, number, number, number][]> = {
  6: [['gas-cooker', 4, 0, 0], ['fridge', 5, 0, 0], ['water-drum', 5, 1, 0], ['foam-bed', 4, 3, 0], ['wardrobe', 0, 0, 1], ['small-tv', 2, 0, 0], ['velvet-sofa', 1, 3, 2], ['centre-rug', 1, 1, 0],
    ['standing-lamp', 0, 2, 0], ['potted-plant', 3, 5, 0], ['wall-art', 1, 0, 0]],
  8: [['gas-cooker', 6, 0, 0], ['double-fridge', 7, 0, 0], ['cooler-box', 5, 0, 0], ['foam-bed', 6, 5, 0], ['wardrobe', 4, 7, 0], ['laptop-desk', 4, 4, 0], ['flat-tv', 1, 0, 0], ['leather-sofa', 1, 3, 2],
    ['lounge-armchair', 3, 2, 3], ['centre-rug', 1, 1, 0], ['standing-lamp', 0, 0, 0], ['bookshelf', 0, 4, 0], ['potted-plant', 3, 7, 0], ['wall-art', 1, 0, 0], ['wall-fan', 6, 0, 0]],
  10: [['chef-range', 7, 0, 0], ['double-fridge', 9, 1, 0], ['water-drum', 6, 0, 0], ['cooler-box', 6, 3, 0], ['king-bed', 8, 6, 0], ['wardrobe', 6, 9, 0], ['laptop-desk', 6, 6, 0], ['bookshelf', 9, 5, 0],
    ['flat-tv', 1, 0, 0], ['family-sofa', 1, 4, 2], ['leather-sofa', 0, 2, 3], ['lounge-armchair', 4, 2, 3], ['centre-rug', 1, 1, 0], ['standing-lamp', 0, 0, 0], ['aquarium', 4, 0, 0],
    ['potted-plant', 5, 8, 0], ['potted-plant', 4, 4, 0], ['wall-art', 2, 0, 0], ['wall-fan', 7, 0, 0]],
};
const owned = params.get('owned') === '1';
let items: { id: string; itemId: string; x: number; y: number; rot: number }[] = (LAYOUTS[grid] ?? LAYOUTS[6]!).map(([itemId, x, y, rot], i) => ({ id: `i${i}`, itemId, x, y, rot }));
// ?buy=a,b,c: a fresh home (the starter layout) where each listed piece is bought in turn and lands where the real default placement (suggestSpot) puts it.
const buy = params.get('buy');
if (buy) {
  const { FURNITURE } = await import('../game/content/furniture.ts');
  const { starterLayout } = await import('../game/home-layout.ts');
  const { suggestSpot } = await import('./home-zones.ts');
  items = starterLayout(grid) as typeof items;
  for (const itemId of buy.split(',')) { const def = FURNITURE[itemId]; const at = def && suggestSpot(grid, items as never, def, 0); if (at) items.push({ id: `b${items.length}`, itemId, ...at }); }
}
const kit = createKit(), { THREE } = kit;
const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
applyRendererLook(THREE, renderer, renderTier());
document.getElementById('stage')!.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 360);
const lights = createHostLights(THREE, scene);
const sky = createSky(THREE);
scene.background = sky.texture;
const home = buildHomeScene(kit, { visit: { grid, owned, style: { shape: 0, wall: 0, roof: 0, door: 0, windows: 0, fence: 0, yard: 0, sign: 0 }, items: items as never } });
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
