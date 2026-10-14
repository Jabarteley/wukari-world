// LIGHT MODE (the data saver): one switch that asks the whole game to cost less to download, draw and run.
//
// It is ON by default when the browser says the player asked for less data (navigator.connection.saveData) and OFF otherwise; the
// player's own choice, made in Settings, is kept in localStorage and wins over that default either way. What it asks of the rest:
//   - the lowest render tier (src/scene/look.ts LIGHT_TIER: pixel ratio 1, small shadow map, no extras);
//   - a frame cap of 30 a second wherever the game runs its own frame loops (src/scene/frame-gate.ts, motion-loop.ts, the maps);
//   - no fetching of what nobody asked for yet (src/app/state/idlePreload.ts, the map's code in ScenePane, the dive and the aerial city);
//   - music off until the player turns it on (src/audio/settings.ts); the sounds themselves are made on the phone, not downloaded.
// Pure data and small functions with no imports: the first download carries this file, and a test or a lazy module can read it.

export const LIGHT_KEY = 'joinallworld-light-v1'
/** The frame rate light mode allows a scene or map to draw at. */
export const LIGHT_FPS = 30

export interface SaveDataConnection { saveData?: boolean }
type Reader = Pick<Storage, 'getItem'> | null | undefined

/** The default when the player has not chosen: on for a browser that asks to save data. */
export const lightDefault = (connection: SaveDataConnection | null | undefined): boolean => connection?.saveData === true

/** The saved choice ('1' on, '0' off) or, when there is none, the default. */
export function readLight(storage: Reader, connection?: SaveDataConnection | null): boolean {
  try {
    const saved = storage?.getItem(LIGHT_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
  } catch { /* storage is blocked: the default */ }
  return lightDefault(connection)
}

/** Has the player made a choice on this device (as opposed to the default being in force)? */
export function lightChosen(storage: Reader): boolean {
  try { const saved = storage?.getItem(LIGHT_KEY); return saved === '1' || saved === '0' } catch { return false }
}

/** The frame cap in force: 30 with light mode on, 0 (none) otherwise. */
export const capFor = (light: boolean): number => (light ? LIGHT_FPS : 0)

const storeOf = (): Storage | null => { try { return globalThis.localStorage ?? null } catch { return null } }
const connectionOf = (): SaveDataConnection | null => (globalThis.navigator as { connection?: SaveDataConnection } | undefined)?.connection ?? null

let current: boolean | null = null
const listeners = new Set<() => void>()

/** Is light mode on in this tab? Read from the browser once, then kept. */
export const lightOn = (): boolean => current ??= readLight(storeOf(), connectionOf())
/** The frame cap now (0 = none). */
export const lightFps = (): number => capFor(lightOn())
/** Turn it on or off and remember the choice. Returns false when the browser would not save it (it still holds for this tab). */
export function setLight(on: boolean): boolean {
  current = on
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
export function forgetLight(): void { current = null }
