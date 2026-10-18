// Arriving by a crew's or an event's invitation (/?crew=CODE, /?event=CODE, /?friend=CODE): the code is kept for this tab, the address goes
// back to /, the landing says where the link leads (names and counts only), and once there is a life the right app opens with the code.
import { watch } from 'vue'
import { useApp } from '../../state/app.ts'
import { cleanCode } from '../../../feed/model.ts'

const KEY = 'allworld-feed-link'
type Wanted = { kind: 'crew' | 'event' | 'friend'; code: string }
function read(): Wanted | null {
  const params = new URLSearchParams(location.search)
  for (const kind of ['crew', 'event', 'friend'] as const) { const code = cleanCode(params.get(kind)); if (code) return { kind, code } }
  try { const kept = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Wanted | null; return kept && cleanCode(kept.code) ? kept : null } catch { return null }
}
export function startFeedEntry(): void {
  const wanted = read()
  if (!wanted) return
  try { sessionStorage.setItem(KEY, JSON.stringify(wanted)) } catch { /* private mode */ }
  const params = new URLSearchParams(location.search); params.delete('crew'); params.delete('event'); params.delete('friend')
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}${location.hash}`)
  const { game, shell, landing } = useApp()
  let said = 0
  void fetch(`/api/feed/code?code=${wanted.code}`, { credentials: 'same-origin' }).then((r) => r.json()).then((found: { ok?: boolean; crew?: { name: string; size: number }; event?: { title: string; going: number }; profile?: { name: string } }) => {
    if (!found.ok) return
    const title = found.crew ? `You're invited to ${found.crew.name}` : found.event ? `You're invited to ${found.event.title}` : found.profile ? `${found.profile.name} wants to connect` : ''
    const text = found.crew ? `A crew of ${found.crew.size} on Allworld. Pick a name and press Play to join, no sign-up.` : found.event ? `${found.event.going} going. Press Play and answer in one tap.` : 'Press Play, then add them as a friend.'
    if (title && !game.connected.value) landing.banner.value = { id: said = Date.now(), title, text, tone: 'good', knock: false, knockHost: null }
  }).catch(() => undefined)
  const stop = watch(() => game.connected.value && game.view.value.onboarding?.required !== true, (ready) => {
    if (!ready) return
    stop()
    try { sessionStorage.removeItem(KEY) } catch { /* private mode */ }
    if (said && landing.banner.value?.id === said) landing.banner.value = null
    if (wanted.kind === 'crew') shell.open('crews', { code: wanted.code })
    else if (wanted.kind === 'event') shell.open('plans', { code: wanted.code })
    else shell.open('me', { code: wanted.code })
  }, { immediate: true })
}
