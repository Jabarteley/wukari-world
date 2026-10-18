/**
 * Caches that outlive a 3D host (the native character store: body files, their textures, eye corrections) hold three objects
 * every renderer has drawn. Each renderer adds a 'dispose' listener to each of them, and that listener keeps the renderer, its
 * programs and its state alive: a renderer per home visit was never freed. A host that owns its renderer calls releaseSharedGpu()
 * as it closes; disposing a cached object detaches every renderer's listener, and the object is uploaded again when next drawn.
 */
const releasers = new Set<() => void>();

/** A cache registers how to release its three objects. */
export function onReleaseSharedGpu(release: () => void): void { releasers.add(release); }

/** Call when a host disposes the renderer it made. */
export function releaseSharedGpu(): void {
  for (const release of releasers) { try { release(); } catch { /* a cache that cannot release keeps its objects, as before */ } }
}
