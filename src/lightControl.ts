// Changing Light mode (src/lightMode.ts holds what every scene reads): the Settings switch, and a test. Lazy, with Settings.
import { LIGHT_KEY, holdLight, lightOn } from './lightMode.ts'

const listeners = new Set<() => void>()
const storeOf = (): Storage | null => { try { return globalThis.localStorage ?? null } catch { return null } }

/** Has the player made a choice on this device (as opposed to the default being in force)? */
export function lightChosen(storage: Pick<Storage, 'getItem'> | null | undefined = storeOf()): boolean {
  try { const saved = storage?.getItem(LIGHT_KEY); return saved === '1' || saved === '0' } catch { return false }
}
/** Turn it on or off and remember the choice. Returns false when the browser would not save it (it still holds for this tab). */
export function setLight(on: boolean): boolean {
  holdLight(on)
  let saved = true
  try { const store = storeOf(); if (!store) saved = false; else store.setItem(LIGHT_KEY, on ? '1' : '0') } catch { saved = false }
  for (const listener of [...listeners]) listener()
  return saved
}
/** Be told when it changes. Returns the unsubscribe. */
export function onLightChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
/** Forget what was read (a test, or another tab changed the saved choice). */
export const forgetLight = (): void => holdLight(null)
export { lightOn }
