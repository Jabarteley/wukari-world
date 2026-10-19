/**
 * OWNER: growth
 * THE PAGE'S SIDE OF DETTY DECEMBER (docs/DETTY-DECEMBER.md): one small public fetch (GET /api/world/detty, server/routes/detty.ts) kept for
 * FEED_MS, the check-in that lets the server record what it can see, and the venue scenes' hook that dresses a venue of Lagos, Accra or
 * Abuja while the season is on. Loaded on demand only: src/scene/venue-scenes.ts imports it for a venue of those three cities, the Events
 * app with itself. The props themselves (src/festivals/detty-skin.ts) are fetched only while the season is on. A failed fetch leaves the last
 * answer (or none); nothing here ever blocks a scene or throws.
 */
import { DETTY_CITIES, dettyOn, isDettyCity } from './detty-dates.ts'
import { skinFor } from './detty.ts'
import type { Night, SeasonFacts, SkinPlan } from './detty.ts'
import { publicArrivalVenue } from '../game/cities/runtime.ts'
import { bodyAllowed } from '../scene/body/gate.ts'
import type { Skin, SkinPlace } from './detty-skin.ts'

/** What GET /api/world/detty answers. `at` is when this page received it (its own clock, for the cache only). */
export interface DettyFeed { now: number; on: boolean; preview: boolean; day: number | null; year: number; key: string; cities: readonly string[]; nights: Night[]; drops: string[]; card: boolean; at: number }
/** What the caller's own season looks like (GET /api/world/detty/me, POST …/checkin). */
export interface DettyMine { season: Omit<DettyFeed, 'at'>; facts: SeasonFacts; returnee: string | null; added?: { city?: string; returnee?: string; event?: string; party?: true }; ok?: boolean; code?: string }
type FetchJson = (path: string, init?: { method?: 'GET' | 'POST'; body?: unknown }) => Promise<unknown>

export const FEED_MS = 5 * 60000
let held: DettyFeed | null = null, pending: Promise<DettyFeed | null> | null = null
const plainFetch: FetchJson = (path, init) => fetch(path, { method: init?.method ?? 'GET', credentials: 'same-origin', ...(init?.body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(init.body) }) }).then((answer) => (answer.ok ? answer.json() : null))

/** The feed held, or null before the first answer. */
export const dettyFeed = (): DettyFeed | null => held
/** Fetch the season (at most every FEED_MS). */
export function loadDetty(fetchJson: FetchJson = plainFetch, clock: () => number = Date.now): Promise<DettyFeed | null> {
  if (held && clock() - held.at < FEED_MS) return Promise.resolve(held)
  if (pending) return pending
  pending = (async (): Promise<DettyFeed | null> => {
    try {
      const body = await fetchJson('/api/world/detty') as Partial<DettyFeed> | null
      if (!body || typeof body.on !== 'boolean' || typeof body.now !== 'number') return held
      held = { now: body.now, on: body.on, preview: body.preview === true, day: typeof body.day === 'number' ? body.day : null, year: Number(body.year) || 0, key: String(body.key ?? ''), cities: Array.isArray(body.cities) ? body.cities : DETTY_CITIES, nights: Array.isArray(body.nights) ? body.nights : [], drops: Array.isArray(body.drops) ? body.drops : [], card: body.card === true, at: clock() }
      return held
    } catch { return held } finally { pending = null }
  })()
  return pending
}
/** Whether the season is on at server time `t` by what the page holds (the date, or the admin's preview). */
export const onAt = (feed: Pick<DettyFeed, 'preview'> | null, t: number): boolean => (feed ? dettyOn(t, feed.preview) : dettyOn(t))

/** Ask the server to record what it can see (the city, the Returnee rule, an event or a party). The body is not read by the server. */
export async function checkin(fetchJson: FetchJson = plainFetch): Promise<DettyMine | null> {
  try { const body = await fetchJson('/api/world/detty/checkin', { method: 'POST', body: {} }) as DettyMine | null; return body && typeof body === 'object' && body.facts ? body : null } catch { return null }
}
/** The caller's own season, read only. */
export async function mySeason(fetchJson: FetchJson = plainFetch): Promise<DettyMine | null> {
  try { const body = await fetchJson('/api/world/detty/me') as DettyMine | null; return body && typeof body === 'object' && body.facts ? body : null } catch { return null }
}

/** The scene asks at most once a minute of server time; a check-in goes at most every CHECKIN_MS from this page (and on a new venue). */
const SLOT_MS = 60000, CHECKIN_MS = 10 * 60000
let lastCheckin = -Infinity
/** What src/scene/venue-scenes.ts gives the hook: where to put the props and how to read the ground. */
export interface SceneHost { THREE: typeof import('three'); group: { add(object: unknown): void }; cityId: string; venueId: string; place: () => SkinPlace | null; /** Draw once more: the props came or went while the scene was idle (kit.requestRender). */ redraw?: () => void }
export interface SceneHook { tick(t: number): void; dispose(): void; /** For the tests: the plan in use. */ plan(): SkinPlan | null }

/** The plan for a venue at server time `t` with the feed held: null when the season is off (the props then go). */
export function scenePlan(feed: DettyFeed | null, t: number, cityId: string, venueId: string, light: boolean): SkinPlan | null {
  if (!isDettyCity(cityId)) return null
  let square: string | null = null
  try { square = publicArrivalVenue(cityId).id } catch { square = null }
  return skinFor(Boolean(feed) && onAt(feed, t), cityId, venueId, square, light)
}

/**
 * The hook a venue scene of a season city runs on every update (src/scene/venue-scenes.ts). Once a minute of server time it looks at the
 * season: on, it loads the props for this venue (a weak phone gets the light plan) and checks in now and then; off, the props go.
 */
export function sceneSkin(host: SceneHost, deps: { fetchJson?: FetchJson; light?: boolean; load?: () => Promise<typeof import('./detty-skin.ts')> } = {}): SceneHook {
  const light = deps.light ?? !bodyAllowed(), load = deps.load ?? (() => import('./detty-skin.ts'))
  let slot = -1, plan: SkinPlan | null = null, skin: Skin | null = null, gone = false, generation = 0, checkedHere = false
  const key = (p: SkinPlan | null): string => (p ? `${p.parts.join()}:${p.bulbs}:${p.umbrellas}:${p.beams}` : '')
  function apply(next: SkinPlan | null): void {
    if (key(next) === key(plan)) return
    const had = skin !== null
    plan = next; skin?.dispose(); skin = null
    const mine = ++generation
    if (had) host.redraw?.()
    if (!next) return
    void load().then((lib) => {
      const place = host.place()
      if (gone || mine !== generation || !place) return
      skin = lib.buildSkin(host.THREE, next, place)
      host.group.add(skin.group)
      host.redraw?.()
    }).catch(() => { /* no props: the venue stays as it is */ })
  }
  return {
    tick(t: number): void {
      if (gone || !Number.isFinite(t)) return
      const now = Math.floor(t / SLOT_MS)
      if (now === slot) return
      slot = now
      void loadDetty(deps.fetchJson).then((feed) => {
        if (gone) return
        apply(scenePlan(feed, t, host.cityId, host.venueId, light))
        if (feed && onAt(feed, t) && (!checkedHere || t - lastCheckin >= CHECKIN_MS) && t - lastCheckin >= SLOT_MS * 2) { checkedHere = true; lastCheckin = t; void checkin(deps.fetchJson) }
      })
    },
    dispose(): void { gone = true; generation++; skin?.dispose(); skin = null; plan = null },
    plan: () => plan,
  }
}
/** For the tests: forget what this page holds. */
export function resetDettyClient(): void { held = null; pending = null; lastCheckin = -Infinity }
