// CAN THIS BROWSER DRAW THE 3D SCENE? Asked before the scene's code (Three.js and the city's scenes: the biggest download in the game)
// is fetched, so a browser that cannot use it does not pay for it. Two kinds of "no":
//   - a proxy browser that renders pages on a server and sends back a picture (Opera Mini in its extreme mode): it runs no WebGL and
//     little script, whatever it reports;
//   - a browser or phone with WebGL switched off, blocked, or one that fails to give a context.
// The answer carries the words to show: what happened, what to do (open the same address in Chrome or the phone's own browser) and what
// still works. A scene that was supported but failed later (the renderer threw) is shown the same words.
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

/** Ask this browser. */
export function browserSceneSupport(): SceneSupport {
  const doc = globalThis.document
  return sceneSupport(globalThis.navigator?.userAgent, () => (doc ? (doc.createElement('canvas') as unknown as ProbeCanvas) : null))
}

export const NO_SCENE_TITLE = "This phone's browser can't show the 3D world."
export const NO_SCENE_HELP = "Open Allworld in Chrome or your phone's own browser to see it. Everything else works here: your phone, messages, jobs, money, the map list and the table games."
export const NO_SCENE_PROXY = "This looks like a browser that sends pages as pictures (Opera Mini's extreme mode). Open Allworld in Chrome or your phone's own browser, or switch that mode off in its settings."
export const COPY_LABEL = 'Copy link'
export const COPIED_LABEL = 'Link copied'

/** The sentences for a reason. */
export const sceneHelp = (reason: 'proxy' | 'no-webgl' | 'failed'): { title: string; help: string } => ({ title: NO_SCENE_TITLE, help: reason === 'proxy' ? NO_SCENE_PROXY : NO_SCENE_HELP })

/** Copy the game's address. Resolves true when it is on the clipboard; false when the browser would not (the address is on screen to copy by hand). */
export async function copyGameLink(address: string, clipboard: { writeText?(text: string): Promise<void> } | undefined = globalThis.navigator?.clipboard): Promise<boolean> {
  try { if (!clipboard?.writeText) return false; await clipboard.writeText(address); return true } catch { return false }
}
