// The home-city pin. The truth is kept with the player's character on the server (GET / POST /api/world/home-city), so it follows an account to every
// device; this device keeps a copy in localStorage as a cache, which the pin card and the Events app read at once, before any answer. Older builds kept
// the pin on the device only: when the server has none and this device has one, it is uploaded once (`ifNone`, so a pin made on another device is never overwritten).
import { ref } from 'vue'
import { PIN_KEY, readPin } from './homePinModel.ts'
import type { HomePin } from './homePinModel.ts'
import type { FetchOptions } from '../../types/client.ts'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
/** The game's authenticated JSON call (game.fetchJson). */
export type Call = (path: string, options?: FetchOptions) => Promise<unknown>
const stored = (): Store | undefined => { try { return globalThis.localStorage } catch { return undefined } }
const PATH = '/api/world/home-city'
export const homePin = ref<HomePin | null>(readPin(stored()?.getItem(PIN_KEY) ?? null))
/** Changes the cache (this device and the screens that read `homePin`) only. */
export function setHomePin(pin: HomePin | null, store: Store | undefined = stored()): void {
  homePin.value = pin
  try { if (pin) store?.setItem(PIN_KEY, JSON.stringify(pin)); else store?.removeItem(PIN_KEY) } catch { /* the pin lasts for this visit only */ }
}
const answered = (answer: unknown): HomePin | null => readPin(typeof answer === 'object' && answer !== null ? (answer as { home?: unknown }).home : null)

/** The player chose (or removed) the pin: the cache at once, then the account. A failed save leaves the cache, and the next sync uploads it. */
export async function savePin(call: Call, pin: HomePin | null, store: Store | undefined = stored()): Promise<void> {
  setHomePin(pin, store)
  try { await call(PATH, { method: 'POST', body: pin ?? { clear: true } }) } catch { /* kept on this device; uploaded by the next sync if the server still has none */ }
}

let synced = false
/**
 * Once per page: read the pin the server holds. It wins (another device may have changed it); with none on the server and one on this device, the
 * device's is uploaded once. Never throws: offline, the cache stands. Returns the pin now in force.
 */
export async function syncHomePin(call: Call, store: Store | undefined = stored(), force = false): Promise<HomePin | null> {
  if (synced && !force) return homePin.value
  try {
    const server = answered(await call(PATH))
    synced = true
    if (server) { setHomePin(server, store); return server }
    const local = readPin(store?.getItem(PIN_KEY) ?? null) ?? homePin.value
    if (local) {
      const kept = answered(await call(PATH, { method: 'POST', body: { ...local, ifNone: true } }))
      if (kept) setHomePin(kept, store)
      return homePin.value
    }
    setHomePin(null, store)
    return null
  } catch { return homePin.value }
}
/** For tests: forget that this page has synced. */
export const resetHomePinSync = (): void => { synced = false }
