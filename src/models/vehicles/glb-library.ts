/**
 * Loads each vehicle model once and hands out the parsed template: a shared promise per file, a synchronous peek for what has arrived,
 * and null (never a rejection) for what could not be fetched or parsed, so a caller keeps its procedural vehicle. A failed file is not
 * asked for again for a while, so a missing network does not become a request on every frame.
 *
 * The parser is injected (glb.ts supplies the real one: GLTFLoader and the meshopt decoder, fetching hashed build assets).
 */
import type * as THREE from 'three';
import { createTemplate, glbKey } from './glb-parts.ts';
import type { GlbRequest, GlbTemplate } from './glb-parts.ts';

export type GlbParse = (key: string) => Promise<THREE.Object3D>;
export interface GlbLibrary {
  /** The template, or null if the file could not be had. Concurrent calls for one file share one fetch. */
  load(request: GlbRequest): Promise<GlbTemplate | null>;
  /** The template if it has already arrived; never starts a fetch. */
  peek(request: GlbRequest): GlbTemplate | null;
  /** True while a file that failed is waiting out its pause. */
  failed(request: GlbRequest): boolean;
  /** Forget everything (tests, and a lost WebGL context). */
  clear(): void;
}

export const RETRY_AFTER_MS = 30_000;

export function createGlbLibrary(parse: GlbParse, now: () => number = Date.now): GlbLibrary {
  const ready = new Map<string, GlbTemplate>();
  const pending = new Map<string, Promise<GlbTemplate | null>>();
  const failedAt = new Map<string, number>();
  const paused = (key: string): boolean => { const at = failedAt.get(key); return at !== undefined && now() - at < RETRY_AFTER_MS; };
  return {
    peek: (request) => ready.get(glbKey(request)) ?? null,
    failed: (request) => paused(glbKey(request)),
    load(request) {
      const key = glbKey(request);
      const have = ready.get(key);
      if (have) return Promise.resolve(have);
      const going = pending.get(key);
      if (going) return going;
      if (paused(key)) return Promise.resolve(null);
      const task = (async (): Promise<GlbTemplate | null> => {
        try {
          const template = createTemplate(request, await parse(key));
          ready.set(key, template); failedAt.delete(key);
          return template;
        } catch {
          failedAt.set(key, now());
          return null;
        } finally {
          pending.delete(key);
        }
      })();
      pending.set(key, task);
      return task;
    },
    clear() { ready.clear(); pending.clear(); failedAt.clear(); },
  };
}
