/**
 * OWNER: character
 * Head-and-shoulders portraits of the drawn figure as small cached images, so the person seen in the world is the person
 * seen on a card or in a list. Loaded with the rest of the figure code, only when a screen shows a person.
 *
 *   portraitOf(look, { seed, size })   → Promise<string | null>   a data URL (PNG, transparent), or null where one cannot be drawn
 *   portraitKey(look, options)         the cache key: the same look, seed and size are the same image
 *
 * Portraits are drawn one at a time, each on a context freed straight after. Without WebGL2 the answer is null and the
 * caller keeps its letter in a circle.
 */
import { createKit } from './kit.ts';
import { buildAvatar, normalizeLook } from './characters.ts';
import { frameCamera, lightStage } from './avatar-preview.ts';
import type * as THREE from 'three';

export interface PortraitOptions {
  /** What a look that is missing something is completed from (a player's id). */
  seed?: string;
  /** Pixels on a side of the image. */
  size?: number;
}

const CACHE_LIMIT = 96;
const cache = new Map<string, string>();

/** The same figure and size: the same key. */
export function portraitKey(look: unknown, { seed, size = 128 }: PortraitOptions = {}): string {
  return JSON.stringify([normalizeLook(look, seed), size]);
}

let queue: Promise<unknown> = Promise.resolve();

async function draw(look: unknown, options: PortraitOptions): Promise<string | null> {
  const size = options.size ?? 128, key = portraitKey(look, options);
  const hit = cache.get(key);
  if (hit) return hit;
  const kit = createKit(), { THREE } = kit;
  let renderer: THREE.WebGLRenderer | null = null;
  try {
    const canvas = document.createElement('canvas');
    const attributes: WebGLContextAttributes = { alpha: true, antialias: true, powerPreference: 'low-power' };
    const context = canvas.getContext('webgl2', attributes);
    if (!context) return null;
    renderer = new THREE.WebGLRenderer({ canvas, context, ...attributes });
    renderer.setPixelRatio(1); renderer.setSize(size, size, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(26, 1, 0.1, 60);
    lightStage(THREE, scene);
    const figure = buildAvatar(kit, look, { detail: 'medium', pose: 'stand', seed: options.seed });
    figure.rotation.y = -0.25;
    scene.add(figure);
    frameCamera(camera, { y: 2.06, height: 0.95, width: 0.95 }, 1);
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    cache.set(key, url);
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string);
    return url;
  } catch { return null; } finally {
    kit.dispose();
    renderer?.dispose();
    renderer?.forceContextLoss();
  }
}

/** A portrait of a look: from the cache, or drawn now (one at a time). Null where it cannot be drawn. */
export function portraitOf(look: unknown, options: PortraitOptions = {}): Promise<string | null> {
  const cached = cache.get(portraitKey(look, options));
  if (cached) return Promise.resolve(cached);
  const next = queue.then(() => draw(look, options));
  queue = next.catch(() => null);
  return next;
}
