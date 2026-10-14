// The "Data and battery" section of the Settings tab, as plain data and one function: what the Light mode switch says, and what turning it
// on or off does besides remembering it. Pure enough to test without a browser. The switch itself is src/lightMode.ts; the meter is
// src/app/state/dataMeter.ts.
import { setLight } from '../../../lightControl.ts'
import { setSound } from '../../../audio/settings.ts'

export const LIGHT_LABEL = 'Light mode'
export const LIGHT_HINT = 'Uses less data and less battery: a simpler picture, 30 frames a second, nothing downloaded ahead, and music off. Takes full effect the next time you enter a place.'
export const LIGHT_AUTO_HINT = 'Your phone asked apps to save data, so this started on. You can turn it off.'
export const LIGHT_NOT_SAVED = 'This browser would not save Light mode, so it lasts only until you close the tab.'
export const DATA_NOTE = 'Counts what the game downloads on this device, not live chat or calls. Pictures and code kept from before cost nothing.'

/** Turn Light mode on or off. Turning it on also switches the music off (the existing Music switch); turning it off leaves sound as it is. False when it could not be saved. */
export function applyLight(on: boolean): boolean {
  const saved = setLight(on)
  if (on) setSound({ musicOn: false })
  return saved
}
