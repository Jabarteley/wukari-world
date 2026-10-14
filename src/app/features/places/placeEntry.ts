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

/**
 * THE INVITATION, SAID ON ARRIVAL. A visitor who opened a place's address is told where it leads before anything else: the
 * room's name and how many are inside (POST /api/places/room/peek needs no session and says nothing more), or the Square.
 * The landing's own banner says it (App.vue LinkBanner), and it stays until the visitor is inside or closes it.
 */
let said = 0
function say(title: string, text: string, tone: 'good' | 'info' = 'good'): void {
  const { landing } = useApp()
  said = Date.now()
  landing.banner.value = { id: said, title, text, tone, knock: false, knockHost: null }
}
function unsay(): void { const { landing } = useApp(); if (said && landing.banner.value?.id === said) landing.banner.value = null; said = 0 }
async function announce(wanted: Wanted): Promise<void> {
  if ('square' in wanted) { say('You are invited to the Square', 'One place for the whole world: meet people from every city and talk. Pick a name and press Play to come in, no sign-up.'); return }
  try {
    const response = await fetch('/api/places/room/peek', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: wanted.token }) })
    const answer = await response.json() as { code?: unknown; room?: { name?: unknown; here?: unknown } }
    if (answer.code === 'open' && typeof answer.room?.name === 'string') {
      const here = typeof answer.room.here === 'number' && answer.room.here > 0 ? `${answer.room.here} ${answer.room.here === 1 ? 'person is' : 'people are'} inside now. ` : ''
      say(`You are invited to “${answer.room.name}”`, `${here}A group’s room in Allworld, where friends talk and build together. Pick a name and press Play to come in, no sign-up.`)
    } else if (answer.code === 'ended') say('That room link has ended', 'Ask for a new link. You can still play Allworld.', 'info')
  } catch { /* no answer: the landing says nothing more, and the link is still tried once there is a life */ }
}

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
  // Said at once, to a visitor still on the welcome screen and to a player who is about to be taken in alike (it goes when they are inside).
  const first = kept()
  if (first) void announce(first)
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
      if ('square' in wanted) { forget(); stop(); unsay(); await enterSquare(); return }
      const done = await enterByLink(wanted.token)
      if (!done.ok && done.retry) return // no connection or no life yet: the link is kept for the next try
      forget(); stop(); unsay()
      if (!done.ok) game.toast(done.reason, 'error')
    } finally { entering = false }
  }, { immediate: true })
}
