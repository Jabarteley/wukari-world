/**
 * OWNER: scenes
 * The HIGH quality tier's extras, all lazy: nothing here is in the startup bundle, and a phone never
 * imports it. A procedurally generated environment map (three's RoomEnvironment through PMREM, no
 * download) at low intensity gives standard materials a believable specular response, and a subtle
 * bloom for emissive night lights (EffectComposer + UnrealBloomPass, fetched only at night).
 */
import type * as THREE from 'three';
import type { ThreeModule } from './types.ts';

/** Environment intensity as a share of the scene's brightest hemisphere light (night gets less). */
/** The bloom pipeline draws at up to this pixel ratio (the canvas itself stays at the tier's): a retina screen costs ~half the pixels, and a glow is soft anyway. */
export const BLOOM_RATIO = 1.5;
export const ENV_INTENSITY = 0.1;

type Renderer = THREE.WebGLRenderer;
const started = new WeakSet<THREE.Scene>();
const generated = new WeakMap<Renderer, THREE.Texture>();

/**
 * Give `scene` the generated environment, once per scene, then redraw the view that asked (the caller
 * may be demand-driven). Returns a promise that resolves when it is in place (or never needed).
 */
export async function ensureEnvironment(THREE: ThreeModule, renderer: Renderer, scene: THREE.Scene, redraw?: THREE.Camera | (() => void), intensity = ENV_INTENSITY): Promise<void> {
  if (started.has(scene) || typeof renderer.compile !== 'function') return;
  started.add(scene);
  try {
    let texture = generated.get(renderer);
    if (!texture) {
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js');
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      texture = pmrem.fromScene(room, 0.04).texture;
      room.dispose?.(); pmrem.dispose();
      generated.set(renderer, texture);
    }
    scene.environment = texture;
    scene.environmentIntensity = intensity;
    if (typeof redraw === 'function') redraw(); else if (redraw) renderer.render(scene, redraw);
  } catch { /* no environment: the scene simply keeps its direct lights */ }
}

export interface Bloom { render(scene: THREE.Scene, camera: THREE.Camera): void; setSize(width: number, height: number, pixelRatio: number): void; dispose(): void }
/**
 * A subtle bloom for the night's lamps and signs: threshold high so only emissive surfaces glow.
 * The composer draws into a 2x MSAA half-float target and OutputPass applies the same tone mapping.
 */
export async function createBloom(THREE: ThreeModule, renderer: Renderer, width: number, height: number, threshold = 0.85): Promise<Bloom> {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'),
    import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
    import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);
  const target = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 2 });
  const composer = new EffectComposer(renderer, target);
  const render = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.4, 0.55, threshold);
  composer.addPass(render); composer.addPass(bloom); composer.addPass(new OutputPass());
  return {
    render(scene, camera) { render.scene = scene; render.camera = camera; composer.render(); },
    setSize(w, h, ratio) { composer.setPixelRatio(Math.min(ratio, BLOOM_RATIO)); composer.setSize(w, h); },
    dispose() { composer.dispose(); target.dispose(); },
  };
}

