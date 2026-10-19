// The owambe in the 3D home (docs/FESTIVALS.md "Owambe parties"): while the home being shown has a party on, the scene draws the jollof
// table, dresses everyone in the party's aso-ebi and sends notes flying whenever the spray count goes up (anyone's spray, as the house
// view tells it). Started with the home chip's conversation with the scene (home/homeScene.ts), which loads with the first paint's HUD
// as a lazy chunk: nothing here is in the startup download.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { social } from '../social/useSocial.ts'

let started = false
/** The party of the home on screen: the one visited, else the player's own (when they are home). */
export const partyOnScreen = (): { hex: string; sprays: number } | null => {
  const house = social.me?.visiting ?? social.me?.house ?? null, party = house?.party
  return party && party.until > Date.now() - 60000 ? { hex: party.colour.hex, sprays: party.sprays } : null
}
export function startPartyScene(): void {
  if (started) return
  started = true
  const { game, scene } = useApp()
  watch([() => JSON.stringify(partyOnScreen()), () => game.state.value.location, () => scene.venue.value], () => {
    const at = social.me?.visiting ? true : game.state.value.location === 'home'
    scene.venue.value?.setParty?.(at ? partyOnScreen() : null)
  }, { immediate: true })
}
