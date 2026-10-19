// Puts the first-minute strip (./FirstMinute.vue, docs/FEED.md "First minute") on the first screen: a small app of its own at the top of the
// bottom stack's guest slot, in the 3D world and in Lite. A chunk of its own, fetched once the scene is up (startExtras.ts startAfterReady)
// and only for a tab that has not shown it this session. It waits for the game to be connected, the creator to be done and the
// walkthrough's turn to be over (tour.pending: the tour decides first who is new); for a new player the tour hands its turn to the strip
// (tour/TourDecider.vue calls this with `fresh`), so the first minute ends with one social action, not a walkthrough.
import { createApp, watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { tour } from '../tour/tourState.ts'

/** Shown in this tab already (session storage): once per session. Read by startExtras.ts before it fetches this chunk. */
export const FIRST_MINUTE_KEY = 'allworld-first-minute'
let waiting = false, shown = false, fresh = false

const seen = (): boolean => { try { return globalThis.sessionStorage?.getItem(FIRST_MINUTE_KEY) === '1' } catch { return false } }
const markSeen = (): void => { try { globalThis.sessionStorage?.setItem(FIRST_MINUTE_KEY, '1') } catch { /* private mode: once per page instead */ } }

function mount(): void {
  const slot = document.querySelector('[data-slot="guest"]')
  if (shown || !slot) return
  shown = true
  markSeen()
  const element = document.createElement('div')
  element.className = 'first-minute-slot'
  slot.prepend(element)
  void import('./FirstMinute.vue').then(({ default: Strip }) => {
    const app = createApp(Strip, { fresh, onClose: () => { app.unmount(); element.remove() } })
    app.mount(element)
  }).catch(() => { element.remove() })
}

/** `isNew`: the walkthrough would have started for this player now; the strip is their first minute instead. */
export function startFirstMinute(isNew = false): void {
  if (isNew) fresh = true
  if (shown || waiting || seen()) return
  waiting = true
  const { game, shell } = useApp()
  const due = (): boolean => game.connected.value && game.view.value.onboarding?.required !== true && !tour.pending && !tour.active && !shell.sheet.value
  if (due()) { mount(); return }
  const stop = watch(due, (now) => { if (now) { stop(); mount() } })
}
