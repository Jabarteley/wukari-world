// What the Map and the Ride app remember between draws, beyond the place picked (that is mapUi, in ./travelState.ts, which the first download
// carries): the layers, the Ride app's choice, what the panel last acted on, and the screen width. Nothing in it is saved or sent.
import { reactive, ref } from 'vue'
import { initialLayers } from './travelLayers.ts'
import type { LayerState, MapUiDetail } from './travelModel.ts'
import { mapUi } from './travelState.ts'

export const layers = reactive<LayerState>(initialLayers())
/** The way of travelling picked once in the Ride app. */
export const ride = reactive<{ wanted: string | null }>({ wanted: null })
/** What the panel last acted on: the city, the params object (by identity) and the layout it told the map about. */
export const seen: { city: string | null; params: unknown; layout: string } = { city: null, params: null, layout: '' }

/** The panel talks to the city map through the window event 'jaw:map-ui' (src/app/scene/MapPane.vue replays it until the map exists). */
export const tell = (detail: MapUiDetail): void => { globalThis.window?.dispatchEvent(new CustomEvent('jaw:map-ui', { detail })) }

export const wide = (): boolean => Boolean(globalThis.matchMedia?.('(min-width: 721px)').matches)
/** The same, as something a template can depend on. */
export const wideNow = ref(wide())
/** Follow the screen width while the Map is on screen; returns the function that stops. */
export function trackWide(): () => void {
  const query = globalThis.matchMedia?.('(min-width: 721px)')
  const update = (): void => { wideNow.value = Boolean(query?.matches) }
  update()
  query?.addEventListener('change', update)
  return () => { query?.removeEventListener('change', update) }
}
export const isListOpen = (): boolean => (mapUi.listOpen === null ? wideNow.value : mapUi.listOpen)
