// A device that has never played opens on the entry page. Its code (one small sheet) is asked for at start-up, side by side
// with the city. The creator and its 3D preview (its stage, the preview and Three.js) are fetched only when the creator is going
// to be shown: for a short address at start-up, otherwise when the visitor goes towards it. A device with a saved life is not on the
// entry page and fetches none of it.
// Nothing here runs the preview; it only fetches the modules the landing will import anyway.
import { STORAGE_KEY } from '../../../storage-key.ts'

/** True when this browser has no saved life, so the first screen is the landing. */
export function isNewDevice(storage: Pick<Storage, 'getItem'> | null): boolean {
  try { return !storage || storage.getItem(STORAGE_KEY) === null } catch { return false }
}

let landing: Promise<void> | null = null

/**
 * Ask for the landing's code. Failures are ignored: the landing asks again when it needs it, with its own retry.
 * The scene waits for `landingCodeSettled()`, so on a slow connection the preview's download is not sharing the
 * line with the scene's: the preview is the first thing the player is looking at, the scene is behind the sheet.
 */
export function warmLanding(storage: Pick<Storage, 'getItem'> | null = globalThis.localStorage ?? null): void {
  if (landing || !isNewDevice(storage)) return
  const sheet = import('./QuickStartApp.vue').then(() => undefined, () => undefined)
  // The first screen is the entry page: no creator code, no preview module and no 3D engine are fetched for it. The creator and its preview are
  // asked for when the visitor goes towards it (EntryPage.vue), or by QuickStartApp.vue when the creator is the first screen (a short address).
  landing = sheet
}

/** Resolves when the landing's code has arrived (or failed to), at once on a device that is not asked for it. Never rejects. */
export const landingCodeSettled = (): Promise<void> => landing ?? Promise.resolve()
