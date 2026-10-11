// OWNER: growth
// Where this visit came from, counted as an aggregate (docs/REFERENCE.md, "Where visits came from"). A lazy chunk: the first download
// only keeps the raw utm_ words (src/quick-start/entry.ts, session storage, this visit only). Here they are cleaned and each step of
// the visit is reported once: landed (the page opened), play (Play pressed), game (the game is on screen), stayed (ten minutes later).
// Nothing is sent that names a person: no session, no player id, no cookie (credentials are omitted).
import { cleanSource, SOURCE_EVENTS } from '../../../game/attribution.ts'
import type { SourceEvent, SourceWords } from '../../../game/attribution.ts'

const WORDS = 'aw-src', DONE = 'aw-src-done', STAY_MS = 10 * 60000

/** The cleaned words kept for this visit (`direct` when the address carried none). */
export function visitSource(): SourceWords {
  let raw: unknown = null
  try { raw = JSON.parse(sessionStorage.getItem(WORDS) ?? 'null') } catch { /* none kept */ }
  const [source, medium, campaign, content] = Array.isArray(raw) ? raw : []
  return cleanSource({ source, medium, campaign, content })
}

/** Report a step of this visit, once per browser session. Never throws. */
export function noteSource(event: SourceEvent): void {
  try {
    if (!SOURCE_EVENTS.includes(event)) return
    const done = (sessionStorage.getItem(DONE) ?? '').split(',')
    if (done.includes(event)) return
    sessionStorage.setItem(DONE, [...done, event].filter(Boolean).join(','))
    void fetch('/api/growth/source', { method: 'POST', credentials: 'omit', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ event, ...visitSource() }) }).catch(() => undefined)
  } catch { /* counting must never break the game */ }
}

let stayTimer = 0
/** The page opened: count the landing. */
export const noteLanded = (): void => noteSource('landed')
/** The game is on screen: count it, and count again if this tab is still open ten minutes on. */
export function noteGame(): void {
  noteSource('game')
  if (!stayTimer) stayTimer = window.setTimeout(() => noteSource('stayed'), STAY_MS)
}
