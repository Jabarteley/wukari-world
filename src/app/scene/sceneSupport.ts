// CAN THIS BROWSER DRAW THE 3D SCENE? Asked before the scene's code (Three.js and the city's scenes: the biggest download in the game)
// is fetched, so a browser that cannot use it does not pay for it. Two kinds of "no":
//   - a proxy browser that renders pages on a server and sends back a picture (Opera Mini in its extreme mode): it runs no WebGL and
//     little script, whatever it reports;
//   - a browser or phone with WebGL switched off, blocked, or one that fails to give a context.
// The words to show (sceneWords.ts) and the Copy link button (SceneUnsupported.vue) are a lazy chunk, fetched only when this says no or the scene fails.
export type SceneSupport = { ok: true } | { ok: false; reason: 'proxy' | 'no-webgl' }

/** Browsers that send the page back as a picture. */
export const PROXY_BROWSER = /Opera Mini/i

/** A canvas-like thing that can give a context (a test passes a stub). */
export interface ProbeCanvas { getContext(kind: string): { getExtension?(name: string): { loseContext?(): void } | null } | null }

/** The decision, from what the browser says and one attempt to make a context. */
export function sceneSupport(userAgent: string | undefined, probe: () => ProbeCanvas | null): SceneSupport {
  if (userAgent && PROXY_BROWSER.test(userAgent)) return { ok: false, reason: 'proxy' }
  try {
    const canvas = probe()
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl') ?? null
    if (!gl) return { ok: false, reason: 'no-webgl' }
    // Give the probe's context back at once: a page may hold only about sixteen.
    try { gl.getExtension?.('WEBGL_lose_context')?.loseContext?.() } catch { /* it goes with the canvas */ }
    return { ok: true }
  } catch { return { ok: false, reason: 'no-webgl' } }
}

/**
 * Called once when the scene is about to start (ScenePane, from this lazy file): starts the data meter (Settings → Data and battery;
 * its own lazy chunk, counting what the page has downloaded so far too) and says whether this browser can draw the scene.
 */
export function sceneCanStart(): boolean {
  void import('../state/dataMeter.ts').then((meter) => meter.startMeter(), () => 0)
  return browserSceneSupport().ok
}

/** Ask this browser. */
export function browserSceneSupport(): SceneSupport {
  const doc = globalThis.document
  return sceneSupport(globalThis.navigator?.userAgent, () => (doc ? (doc.createElement('canvas') as unknown as ProbeCanvas) : null))
}
