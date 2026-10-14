// The words for a browser that cannot show the 3D scene: what happened, what to do (open the same address in Chrome or the phone's own
// browser) and what still works. Lazy: fetched with SceneUnsupported.vue only when the scene cannot be shown.
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
