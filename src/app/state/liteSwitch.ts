// Switching between Lite and the 3D world on this device (src/app/state/lite.ts). Imported only by the screens that offer it.
/** The same key as ./lite.ts (not imported, so that file stays inside the startup chunk; lite.test.ts checks they are equal). */
export const LITE_KEY = 'allworld-lite-v1'

/** Can this browser make a WebGL context? (The scene asks the same, src/app/scene/sceneSupport.ts.) */
export function canDraw3d(): boolean {
  try {
    const canvas = document.createElement('canvas'), gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return false
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return true
  } catch { return false }
}
/** Leave Lite for the 3D world on this device (only offered when the browser can draw it). */
export function stepInto3d(): void {
  try { localStorage.removeItem(LITE_KEY) } catch { /* private mode */ }
  location.assign('/?lite=0')
}
/** Choose Lite on this device from the 3D world. */
export function chooseLite(): void {
  try { localStorage.setItem(LITE_KEY, '1') } catch { /* private mode */ }
  location.assign('/app')
}
