/**
 * OWNER: scenes
 * The shared LOOK of every 3D view: how a renderer is set up, what a phone is allowed to cost, the
 * graded sky behind a scene and the soft ground it stands on. One place, so the venue host, the
 * character preview, the scene harness (and the city map, when it adopts it) show the same colours.
 *
 * TONE MAPPING. The art is hand-picked sRGB colour, so the tone mapper is Khronos PBR Neutral: it
 * leaves a colour as it was chosen up to a threshold and only rolls off what would otherwise clip
 * to white (sunlit sand, cream walls). Exposure stays at 1.
 *
 * TIERS. A phone (coarse pointer, short side up to 720 CSS px) draws at a pixel ratio of at most
 * 1.5 with a 1024 shadow map and plain PCF; everything else at up to 2 with a 2048 map and soft
 * PCF. The tier is chosen from the device, never from a frame-rate measurement: nothing shifts
 * resolution while the player is looking.
 *
 * LIGHT MODE (src/lightMode.ts) picks LIGHT_TIER on any device: the phone tier at a pixel ratio of 1 with a 512 shadow map, the
 * cheapest picture the scenes can draw. ?quality= still wins (testing).
 *
 * Nothing here keeps time, draws, or needs a DOM: the sky is a small data texture.
 *
 * FOR THE CITY MAP (src/map3d, another owner): call applyRendererLook(THREE, renderer, renderTier())
 * in place of its own outputColorSpace / setPixelRatio lines to match the scenes' tone mapping.
 */
import type * as THREE from 'three';
import type { Colour, ThreeModule } from './types.ts';
import { gate } from './frame-gate.ts';

/** What a device is allowed to cost. */
export interface RenderTier { readonly name: 'phone' | 'wide' | 'high'; readonly pixelRatio: number; readonly shadowMap: number; readonly softShadows: boolean; readonly env?: boolean; readonly shadowReach?: number }
/** The window-like object the helpers read (a real window, or a test stub). */
export type LookWindow = Partial<Pick<Window, 'location' | 'localStorage' | 'matchMedia' | 'innerWidth' | 'innerHeight' | 'devicePixelRatio'>>
/** The parts of a renderer applyRendererLook touches (a test stub may lack the optional ones). */
export interface LookRenderer {
  outputColorSpace: THREE.WebGLRenderer['outputColorSpace']
  toneMapping: THREE.WebGLRenderer['toneMapping']
  toneMappingExposure: number
  setPixelRatio?: (ratio: number) => void
  shadowMap?: { enabled: boolean; type: THREE.ShadowMapType }
}

export const PHONE_TIER: RenderTier = Object.freeze({ name: 'phone', pixelRatio: 1.5, shadowMap: 1024, softShadows: false });
export const WIDE_TIER: RenderTier = Object.freeze({ name: 'wide', pixelRatio: 2, shadowMap: 2048, softShadows: true });
/** Desktops and high-end devices: a higher pixel ratio, a generated environment map, tighter sun shadows, night bloom (src/scene/quality.ts). */
export const HIGH_TIER: RenderTier = Object.freeze({ name: 'high', pixelRatio: 2.5, shadowMap: 2048, softShadows: true, env: true, shadowReach: 17 });

/**
 * FOR REVIEW, DEFAULT OFF: cheaper scenery. With the flag on, the kit's per-colour materials and the
 * merged scene material are MeshLambertMaterial instead of MeshStandardMaterial — the same matte look
 * without the per-pixel roughness/specular work. Turn it on with ?matte in the address, or
 * localStorage['joinallworld-matte'] = '1'; ?matte=0 turns it off again for that page.
 */
export function matteScenery(win: LookWindow = globalThis): boolean {
  try {
    const query = new URLSearchParams(win.location?.search || '');
    if (query.has('matte')) return query.get('matte') !== '0';
    return win.localStorage?.getItem('joinallworld-matte') === '1';
  } catch { return false; }
}

/** ?quality=phone|high|wide forces a tier (testing); null when absent. */
function forcedTier(win: LookWindow): RenderTier | null {
  try {
    const q = new URLSearchParams(win.location?.search || '').get('quality');
    return q === 'phone' ? PHONE_TIER : q === 'high' ? HIGH_TIER : q === 'wide' ? WIDE_TIER : null;
  } catch { return null; }
}

/**
 * The render tier for this device. Phone: coarse pointer and a short side up to 720 CSS px (unchanged).
 * High: a fine pointer (desktop), or a device with deviceMemory >= 6 and hardwareConcurrency >= 8; every
 * renderer three r180 makes is WebGL2. Anything else keeps the wide tier.
 */
export function renderTier(win: LookWindow = globalThis): RenderTier {
  const forced = forcedTier(win);
  if (forced) return forced;
  const light = gate.tier(win);
  if (light) return light;
  const coarse = win.matchMedia?.('(pointer: coarse)').matches === true;
  const short = Math.min(Number(win.innerWidth) || Infinity, Number(win.innerHeight) || Infinity);
  if (coarse && short <= 720) return PHONE_TIER;
  const nav = (win as { navigator?: { deviceMemory?: number; hardwareConcurrency?: number } }).navigator ?? (globalThis as { navigator?: { deviceMemory?: number; hardwareConcurrency?: number } }).navigator;
  const strong = (nav?.deviceMemory ?? 0) >= 6 && (nav?.hardwareConcurrency ?? 0) >= 8;
  return !coarse || strong ? HIGH_TIER : WIDE_TIER;
}

/** ?tm=aces|agx|neutral picks the tone mapper on the high tier (evaluation); Neutral by default. */
function highToneMapping(THREE: ThreeModule, win: LookWindow): THREE.ToneMapping {
  try {
    const tm = new URLSearchParams(win.location?.search || '').get('tm');
    if (tm === 'aces') return THREE.ACESFilmicToneMapping;
    if (tm === 'agx') return THREE.AgXToneMapping;
  } catch { /* default */ }
  return THREE.NeutralToneMapping;
}

/** Colour space, tone mapping, pixel ratio and shadow filter for a renderer. Safe on a test stub. */
export function applyRendererLook(THREE: ThreeModule, renderer: LookRenderer, tier: RenderTier = WIDE_TIER, { shadows = true, win = globalThis }: { shadows?: boolean; win?: LookWindow } = {}): RenderTier {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = tier.name === 'high' ? highToneMapping(THREE, win) : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.setPixelRatio?.(Math.min(win.devicePixelRatio || 1, tier.pixelRatio));
  if (shadows && renderer.shadowMap) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = tier.softShadows ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  }
  return tier;
}

const channels = (hex: Colour): [number, number, number] => { const n = parseInt(String(hex).slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
/** '#rrggbb' between two colours. */
export function mixHex(a: Colour, b: Colour, t: number): Colour {
  const x = channels(a), y = channels(b);
  return `#${x.map((v, i) => Math.round(v * (1 - t) + y[i]! * t).toString(16).padStart(2, '0')).join('')}`;
}

const SKY_ROWS = 32;
/**
 * A graded sky for scene.background: the horizon colour at the bottom of the screen rising to the
 * zenith colour at the top. One 1×32 texture, re-used and re-filled when the colours change.
 * → { texture, set(horizon, zenith) → boolean (changed), dispose() }
 */
export function createSky(THREE: ThreeModule, high: boolean = renderTier().name === 'high') {
  const highTier = high, data = new Uint8Array(SKY_ROWS * 4);
  const texture = new THREE.DataTexture(data, 1, SKY_ROWS, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  let key = '';
  return {
    texture,
    set(horizon: Colour, zenith: Colour = horizon): boolean {
      const next = `${horizon}:${zenith}`;
      if (next === key) return false;
      key = next;
      const low = channels(horizon), top = channels(zenith);
      for (let row = 0; row < SKY_ROWS; row += 1) {
        // The lower third stays near the horizon colour (that is where the ground meets it), then it rises.
        const t = Math.max(0, (row / (SKY_ROWS - 1) - 0.3) / 0.7), ease = t * t * (3 - 2 * t);
        // High tier: a soft lighter band just above the horizon (the haze the far corners melt into), and a deeper zenith.
        const band = highTier ? 0.1 * Math.exp(-(((row / (SKY_ROWS - 1)) - 0.34) ** 2) / 0.012) : 0;
        const deep = highTier ? ease * ease * 0.1 : 0;
        for (let c = 0; c < 3; c += 1) {
          const base = low[c]! * (1 - ease) + top[c]! * ease;
          data[row * 4 + c] = Math.round(Math.max(0, Math.min(255, base * (1 - deep) + (255 - base) * band)));
        }
        data[row * 4 + 3] = 255;
      }
      texture.needsUpdate = true;
      return true;
    },
    dispose() { texture.dispose(); },
  };
}

const GROUND_SEGMENTS = 48;
/**
 * The soft ground a scene stands on: a wide disc just under the floor slab that takes the scene's
 * shadows and fades out into the sky at its rim, so no room floats in a flat void. One mesh, one
 * draw call, 96 triangles; it never casts a shadow.
 * → { mesh, place(x, z, radius, y), tint(colour), dispose() }
 */
export function createGround(THREE: ThreeModule) {
  const positions = [0, 0, 0], colours = [1, 1, 1, 1], index: number[] = [];
  const rings: [number, number][] = [[0.72, 1], [1, 0]];
  for (const [reach, alpha] of rings) {
    for (let i = 0; i < GROUND_SEGMENTS; i += 1) {
      const a = (i / GROUND_SEGMENTS) * Math.PI * 2;
      positions.push(Math.cos(a) * reach, 0, Math.sin(a) * reach);
      colours.push(1, 1, 1, alpha);
    }
  }
  for (let i = 0; i < GROUND_SEGMENTS; i += 1) {
    const next = (i + 1) % GROUND_SEGMENTS, a = 1 + i, b = 1 + next, c = 1 + GROUND_SEGMENTS + i, d = 1 + GROUND_SEGMENTS + next;
    index.push(0, b, a, a, b, d, a, d, c);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(positions.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geometry.setIndex(index);
  const material = new THREE.MeshLambertMaterial({ color: '#ffffff', vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ground';
  mesh.castShadow = false; mesh.receiveShadow = true;
  mesh.renderOrder = -1;
  return {
    mesh,
    place(x: number, z: number, radius: number, y = -0.5) { mesh.position.set(x, y, z); mesh.scale.set(radius, 1, radius); },
    tint(colour: Colour) { material.color.set(colour); },
    dispose() { geometry.dispose(); material.dispose(); },
  };
}

/** Baked vertex AO (src/scene/ao-bake.ts) is on unless ?ao=0 (for before/after comparison). */
export function bakedAO(win: LookWindow = globalThis): boolean {
  try { return new URLSearchParams(win.location?.search || '').get('ao') !== '0'; } catch { return true; }
}

/**
 * High tier only (the caller checks tier.env): on the scene's first draw, fetch quality.ts (lazy, so a phone never loads it)
 * and give the scene the generated environment map, then call `redraw` once (a demand-driven host has no next frame coming).
 */
export function lazyEnvironment(THREE: ThreeModule, scene: THREE.Scene, redraw: (renderer: THREE.WebGLRenderer, camera: THREE.Camera) => void, intensity = 0.1): void {
  scene.onBeforeRender = (renderer, _scene, camera) => {
    scene.onBeforeRender = () => {};
    void import('./quality.ts').then((q) => q.ensureEnvironment(THREE, renderer, scene, () => redraw(renderer, camera), intensity));
  };
}

/** Per-tier strength of the baked ambient occlusion: the phone is as it was, high is deeper. */
export const aoStrength = (tier: RenderTier = renderTier()): number => (tier.name === 'high' ? 1.55 : 1);
