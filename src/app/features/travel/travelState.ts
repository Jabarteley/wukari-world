// What the Map and the Ride app remember between draws. The existing panels kept this in module
// variables so that closing the Map and opening it again found the same place picked, the same
// filter and the same layers; here it is one reactive object each, kept for the page's lifetime in
// the same way. Nothing in it is saved or sent. Only the picked place (mapUi) is in the first download, the shell reads it; the layers, the
// Ride app's choice and the screen width are in ./travelMapState.ts, which the Map and the Ride app fetch.
import { reactive } from 'vue'

export interface MapUi {
  /** The place picked on the map or in the list; its card is on screen. */
  destination: string | null
  /** The way of travelling chosen on the card (null: the default). */
  mode: string | null
  filter: string
  /** 'world' is the country map behind the panel. */
  layer: 'city' | 'world'
  /** "+N more" was tapped on the card. */
  showAll: boolean
  /** Is the list of places open? null = not chosen yet: open on a wide screen, a handle on a phone. */
  listOpen: boolean | null
  /** Is "About" on the card open? */
  aboutOpen: boolean
}
export const mapUi = reactive<MapUi>({ destination: null, mode: null, filter: 'all', layer: 'city', showAll: false, listOpen: null, aboutOpen: false })
