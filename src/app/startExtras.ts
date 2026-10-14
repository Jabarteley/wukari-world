// What the page starts only for some visits, or only once the game is up, behind one import so the first download carries one call for them
// instead of one each. `startExtras`: `?diagnostics` (the scene's frame counter, ./diagnostics.ts) and a short address (/games, /abuja, …:
// ./features/paths/arrive.ts; the landing starts it for an address kept earlier in this tab). `startAfterReady`: for every player, once the
// scene is shown, the venue card's local moment lines (./moments.ts) and the kit of work dilemmas and place actions (src/game/dilemma-pack.ts,
// a chunk of its own: the page lists place actions once it is in).
// The regulars talking to each other (./chatter/start.ts, REALISM R12) start here too, in a chunk of their own.
import { isEntryAddress } from './features/start/pathAddress.ts'
import { watch } from 'vue'
import { useApp } from './state/app.ts'
import { isNewDevice } from './features/start/warmLanding.ts'

export function startExtras(diagnostics: boolean): void {
  if (diagnostics) void import('./diagnostics.ts').then(({ showDiagnostics }) => { showDiagnostics() })
  if (location.search.includes('claim-agent=')) void import('./features/agents/claimEntry.ts').then(({ startClaim }) => { startClaim() })
  const startPaths = (): void => { void import('./features/paths/arrive.ts').then((module) => { module.startPaths() }) }
  // The Square's address or a group room's link: kept for this tab, then the place is opened once there is a life (features/places/placeEntry.ts).
  if (location.pathname === '/square' || location.pathname === '/square/' || location.pathname.startsWith('/r/')) { void import('./features/places/placeEntry.ts').then((module) => { module.startPlaceEntry() }); return }
  if (location.pathname === '/') return
  // A new visitor on an address of the entry page keeps it as it is until they act (the entry page starts the paths then). A visitor whose
  // session already has a life never sees the entry page: the paths start as soon as the life is there, if the address is still the one they came on.
  if (!(isEntryAddress(location.pathname) && isNewDevice(globalThis.localStorage))) { startPaths(); return }
  const { game } = useApp()
  const stop = watch(() => game.connected.value && game.view.value.onboarding?.required !== true, (ready) => {
    if (!ready) return
    stop()
    if (isEntryAddress(location.pathname)) startPaths()
  }, { immediate: true })
}

export function startAfterReady(): void {
  void import('./moments.ts').then(({ startMoments }) => { startMoments() }, () => undefined)
  void import('../game/dilemma-pack.ts').catch(() => undefined)
  void import('./chatter/start.ts').then(({ startChatter }) => { startChatter() }, () => undefined)
  void import('./chatter/ambient.ts').then(({ startAmbient }) => { startAmbient() }, () => undefined)
  // A tab that stood in a place before a reload goes back to it (a few lines unless there is one to go back to).
  try { if (globalThis.sessionStorage?.getItem('allworld-place') || globalThis.sessionStorage?.getItem('allworld-place-link')) void import('./features/places/placeEntry.ts').then((module) => { module.startPlaceEntry() }, () => undefined) } catch { /* no storage: nothing was kept */ }
}
