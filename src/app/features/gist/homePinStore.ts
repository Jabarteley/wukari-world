// The home-city pin kept on this device (localStorage), shared by the pin card and the Events app. Nothing is sent to the server: where a player
// calls home is their business, and the gist and the weather are public reads for any city.
import { ref } from 'vue'
import { PIN_KEY, readPin } from './homePinModel.ts'
import type { HomePin } from './homePinModel.ts'

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
const stored = (): Store | undefined => { try { return globalThis.localStorage } catch { return undefined } }
export const homePin = ref<HomePin | null>(readPin(stored()?.getItem(PIN_KEY) ?? null))
export function setHomePin(pin: HomePin | null, store: Store | undefined = stored()): void {
  homePin.value = pin
  try { if (pin) store?.setItem(PIN_KEY, JSON.stringify(pin)); else store?.removeItem(PIN_KEY) } catch { /* the pin lasts for this visit only */ }
}
