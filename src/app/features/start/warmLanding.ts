// A device that has never played opens on the entry page. Its code (one small sheet) is asked for at start-up, side by side
// with the city. The creator and its 3D preview (its stage, the preview and Three.js) are fetched only when the creator is going
// to be shown: for a short address at start-up, otherwise when the visitor goes towards it. A device with a saved life is not on the
// entry page and fetches none of it.
// Nothing here runs the preview; it only fetches the modules the landing will import anyway.
import { STORAGE_KEY } from '../../../storage-key.ts'
import { isPathAddress } from './pathAddress.ts'

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
  // The first screen is the entry page: no creator code, no preview module and no 3D engine are fetched for it. They are asked for when the
  // visitor goes towards the creator (EntryPage.vue), or here when a short address means the creator is shown straight away.
  if (!isPathAddress(globalThis.location?.pathname ?? '/')) { landing = sheet; return }
  // The preview's own module (and the look tables it reads) is part of the landing, not of the first download of a device that has a life.
  const preview = import('./lookPreview.ts').then((module) => module.warmLookPreview()).then(() => undefined, () => undefined)
  // ...and the 3D module is asked for at once too (the same request lookPreview.ts makes), not one hop after the preview's module.
  const scene = import('../../../scene/avatar-preview.ts').then(() => undefined, () => undefined)
  const creator = import('./CreatorApp.vue').then(() => undefined, () => undefined)
  landing = Promise.all([sheet, creator, preview, scene]).then(() => undefined)
}

/** Resolves when the landing's code has arrived (or failed to), at once on a device that is not asked for it. Never rejects. */
export const landingCodeSettled = (): Promise<void> => landing ?? Promise.resolve()
