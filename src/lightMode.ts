// LIGHT MODE (the data saver): one switch that asks the whole game to cost less to download, draw and run.
//
// It is ON by default when the browser says the player asked for less data (navigator.connection.saveData) and OFF otherwise; the
// player's own choice, made in Settings, is kept in localStorage and wins over that default either way. What it asks of the rest:
//   - the lowest render tier (src/scene/look.ts LIGHT_TIER: pixel ratio 1, small shadow map, no extras);
//   - a frame cap of 30 a second wherever the game runs its own frame loops (src/scene/frame-gate.ts, motion-loop.ts, the maps);
//   - no fetching of what nobody asked for yet (src/app/state/idlePreload.ts, the map's code in ScenePane, the dive and the aerial city);
//   - music off until the player turns it on (src/audio/settings.ts); the sounds themselves are made on the phone, not downloaded.
// No imports, and only what every scene needs: the first download carries this file. Changing the switch is src/lightControl.ts (lazy).

export const LIGHT_KEY = 'joinallworld-light-v1'
/** The frame rate light mode allows a scene or map to draw at. */
export const LIGHT_FPS = 30

export interface SaveDataConnection { saveData?: boolean }
type Reader = Pick<Storage, 'getItem'> | null | undefined

/** The saved choice ('1' on, '0' off) or, when there is none, the default: on for a browser that asks to save data. */
export function readLight(storage: Reader, connection?: SaveDataConnection | null): boolean {
  try {
    const saved = storage?.getItem(LIGHT_KEY)
    if (saved === '1' || saved === '0') return saved === '1'
  } catch { /* storage is blocked: the default */ }
  return connection?.saveData === true
}

let current: boolean | null = null
/** Is light mode on in this tab? Read from the browser once, then kept. */
export const lightOn = (): boolean => {
  if (current === null) {
    let store: Storage | null = null
    try { store = globalThis.localStorage } catch { /* blocked */ }
    current = readLight(store, (globalThis.navigator as { connection?: SaveDataConnection } | undefined)?.connection)
  }
  return current
}
/** The frame cap now: 30 with light mode on, 0 (none) otherwise. */
export const lightFps = (): number => (lightOn() ? LIGHT_FPS : 0)
/** For lightControl.ts (Settings, lazy): hold a new value for this tab, or null to read it again. */
export const holdLight = (on: boolean | null): void => { current = on }
