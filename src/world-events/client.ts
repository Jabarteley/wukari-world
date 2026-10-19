/**
 * OWNER: world events (docs/WORLD-EVENTS.md "The city changes")
 * THE SCENE'S COPY OF THE CITY CHANGES: one small read of the public GET /api/world/event, kept CHANGES_MS. A city whose event reached its goal
 * looks different for a week: its gathering venue (where a new player arrives) leans toward the event's two colours, the same light-only
 * dressing as a festival (src/festivals/client.ts festiveLighting), used when no festival dresses the Square: the festival client's
 * dressingNow falls back to it, so the venue scene needs nothing of its own. Loaded on demand (a dynamic import), never part of the first download. A failed read changes nothing and never throws.
 */
export interface ChangeDressing { id: string; name: string; colour: string; second: string; label: string }
export const CHANGES_MS = 10 * 60000
interface Held { at: number; changes: { city: string; label: string; colours: [string, string]; until: number; week: number }[] }
let held: Held | null = null, pending: Promise<void> | null = null

export function loadChanges(fetchJson: (path: string) => Promise<unknown> = (path) => fetch(path).then((answer) => (answer.ok ? answer.json() : null))): Promise<void> {
  if (held && Date.now() - held.at < CHANGES_MS) return Promise.resolve()
  if (pending) return pending
  pending = (async () => {
    try {
      const body = await fetchJson('/api/world/event') as { changes?: unknown } | null
      const list = Array.isArray(body?.changes) ? body.changes : []
      held = { at: Date.now(), changes: list.filter((item): item is Held['changes'][number] => Boolean(item) && typeof item === 'object' && typeof (item as { city?: unknown }).city === 'string' && Array.isArray((item as { colours?: unknown }).colours)) }
    } catch { /* keep what was held */ } finally { pending = null }
  })()
  return pending
}
/** The dressing of a city at server time `now` from its change, or null. */
export function changeDressing(cityId: string, now: number): ChangeDressing | null {
  const found = held?.changes.find((item) => item.city === cityId && item.until > now)
  return found ? { id: `world-event-${found.week}`, name: found.label, colour: found.colours[0], second: found.colours[1], label: found.label } : null
}
