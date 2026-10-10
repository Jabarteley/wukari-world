/**
 * OWNER: character
 * Head-and-shoulders portraits of the drawn figure, as small cached images: the person you see in the world is the person
 * you see in the contact list and on a card. Lazily loaded with the rest of the figure code (a screen asks for it only when
 * it shows a person).
 *
 *   portraitOf(look, { seed, mood, size })   → Promise<string | null>   a data URL (PNG, transparent), or null where a portrait cannot be drawn
 *   portraitKey(look, options)               the cache key: the same look, seed, mood and size are the same image
 *
 * Portraits are drawn one at a time, each on a context that is freed straight after. A look the figure code would draw
 * the same way gives the same key and is drawn once. Without WebGL2 (or if it fails) the answer is null and the caller keeps
 * its letter in a circle.
 */
import { createKit } from './kit.ts';
import { buildAvatar, normalizeLook, moodExpression } from './characters.ts';
import { frameCamera, lightStage } from './avatar-preview.ts';
import type * as THREE from 'three';

export interface PortraitOptions {
  /** What a look that is missing something is completed from (a player's or a regular's id). */
  seed?: string;
  /** The HUD's mood word: the face shows it. */
  mood?: string;
  /** Pixels on a side of the image. */
  size?: number;
  /** Tests give a stand-in renderer. */
  renderer?: PortraitRenderer;
}
/** What drawing a portrait asks of a renderer. */
export interface PortraitRenderer {
  domElement: { toDataURL(type?: string): string };
  setSize(width: number, height: number, update?: boolean): void;
  setPixelRatio(ratio: number): void;
  setClearColor(colour: number, alpha?: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera): void;
  dispose(): void;
  outputColorSpace: string;
  toneMapping: number;
  toneMappingExposure: number;
}

const CACHE_LIMIT = 96;
const cache = new Map<string, string>();
export const portraitStats = { drawn: 0, hits: 0, contexts: 0 };

/** The same figure, mood and size: the same key. */
export function portraitKey(look: unknown, { seed, mood, size = 128 }: Pick<PortraitOptions, 'seed' | 'mood' | 'size'> = {}): string {
  const normal = normalizeLook(look, seed);
  return JSON.stringify([normal, moodExpression(mood, normal.expression), size]);
}

let queue: Promise<unknown> = Promise.resolve();

async function draw(look: unknown, options: PortraitOptions): Promise<string | null> {
  const size = options.size ?? 128, key = portraitKey(look, options);
  const hit = cache.get(key);
  if (hit) { portraitStats.hits += 1; cache.delete(key); cache.set(key, hit); return hit; }
  const kit = createKit(), { THREE } = kit;
  let renderer: PortraitRenderer | null = options.renderer ?? null, own = false;
  try {
    if (!renderer) {
      const canvas = document.createElement('canvas');
      const attributes: WebGLContextAttributes = { alpha: true, antialias: true, powerPreference: 'low-power' };
      const context = canvas.getContext('webgl2', attributes);
      if (!context) return null;
      renderer = new THREE.WebGLRenderer({ canvas, context, ...attributes }) as unknown as PortraitRenderer;
      own = true; portraitStats.contexts += 1;
    }
    renderer.setPixelRatio(1); renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
    lightStage(THREE, scene);
    const figure = buildAvatar(kit, look, { detail: 'medium', pose: 'stand', seed: options.seed, ...(options.mood ? { mood: options.mood } : {}) });
    figure.rotation.y = -0.3;
    scene.add(figure);
    frameCamera(camera, { y: 2.2, height: 1.5, width: 1.5 }, 1);
    renderer.render(scene, camera);
    const url = renderer.domElement.toDataURL('image/png');
    portraitStats.drawn += 1;
    cache.set(key, url);
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return url;
  } catch { return null; } finally {
    kit.dispose();
    if (own) { renderer?.dispose(); (renderer as unknown as { forceContextLoss?: () => void } | null)?.forceContextLoss?.(); }
  }
}

/** A portrait of a look: from the cache, or drawn now (one at a time). Null where it cannot be drawn. */
export function portraitOf(look: unknown, options: PortraitOptions = {}): Promise<string | null> {
  const cached = cache.get(portraitKey(look, options));
  if (cached) { portraitStats.hits += 1; return Promise.resolve(cached); }
  const next = queue.then(() => draw(look, options));
  queue = next.catch(() => null);
  return next;
}
/** Forget every picture (tests; a look edit changes the key anyway). */
export function clearPortraits(): void { cache.clear(); }
