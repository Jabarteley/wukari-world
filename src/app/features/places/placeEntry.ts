// Arriving at a place by its address: `/square`, or a group room's link `/r/<number>-<key>` (src/places/model.ts). The address
// is kept for this tab and the page goes back to `/`, so a reload or a share of the address bar never repeats a stale link.
// A new visitor meets the landing first (a name, Play: no sign-up); as soon as there is a life, they are taken into the place.
// Also puts a tab back in the place it stood in before a reload. Started from startExtras.ts and after the scene is up.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { roomTokenOf } from '../../../places/model.ts'

const KEY = 'allworld-place-link'
const KEEP_MS = 3 * 3600000
type Wanted = { square: true; at: number } | { token: string; at: number }
const store = (): Storage | null => { try { return globalThis.sessionStorage ?? null } catch { return null } }
function kept(): Wanted | null {
  try {
    const found = JSON.parse(store()?.getItem(KEY) ?? 'null') as { square?: unknown; token?: unknown; at?: unknown } | null
    if (!found || typeof found.at !== 'number' || Date.now() - found.at > KEEP_MS) return null
    if (found.square === true) return { square: true, at: found.at }
    if (typeof found.token === 'string') return { token: found.token, at: found.at }
  } catch { /* nothing kept */ }
  return null
}
const forget = (): void => { try { store()?.removeItem(KEY) } catch { /* nothing was kept */ } }

/** Is this address a place's? (startExtras.ts asks before fetching this file's work.) */
export const isPlaceAddress = (pathname: string): boolean => pathname === '/square' || pathname === '/square/' || roomTokenOf(pathname) !== null

let started = false
export function startPlaceEntry(): void {
  if (started) return
  started = true
  const path = globalThis.location?.pathname ?? '/', token = roomTokenOf(path)
  if (token || path === '/square' || path === '/square/') {
    try { store()?.setItem(KEY, JSON.stringify(token ? { token, at: Date.now() } : { square: true, at: Date.now() })) } catch { /* private mode: the place is opened this once only */ }
    try { globalThis.history?.replaceState(globalThis.history.state, '', '/') } catch { /* the address stays; nothing depends on it */ }
  }
  const { game } = useApp()
  let entering = false
  const stop = watch(() => game.connected.value && game.view.value.onboarding?.required !== true, async (ready) => {
    if (!ready || entering) return
    const wanted = kept()
    entering = true
    try {
      const { enterByLink, enterRoom, enterSquare, keptPlace } = await import('./placesStore.ts')
      if (!wanted) {
        // No link: a reload goes back to the place this tab stood in.
        const before = keptPlace()
        if (before?.kind === 'square') await enterSquare()
        else if (before) await enterRoom(before.id)
        stop()
        return
      }
      if ('square' in wanted) { forget(); stop(); await enterSquare(); return }
      const done = await enterByLink(wanted.token)
      if (!done.ok && done.retry) return // no connection or no life yet: the link is kept for the next try
      forget(); stop()
      if (!done.ok) game.toast(done.reason, 'error')
    } finally { entering = false }
  }, { immediate: true })
}
