// The client side of the world feed (docs/WORLD-FEED.md): reads GET /api/world/feed for the city the player is in, once when the city
// changes and again every 30 minutes while the page is visible, and hands the city's real weather to the rules (setObservedWeather) so the
// phone shows the same sky the server plays by. Loaded by a dynamic import after the first frame (App.vue): it is not in the first download.
// A failed read changes nothing: the weather keeps the last hours it was given, and when they run out the old cycle applies.
import { watch } from 'vue'
import type { Ref } from 'vue'
import { readObservedWeather, setObservedWeather } from '../../../game/weather-observed-read.ts'
import { setCityMoney, setDisplayCity } from '../../../game/money.ts'
import type { CityMoney } from '../../../game/money.ts'
import { readCityMoney } from '../../../game/money-feed.ts'
import { takeCredits } from './feedCredits.ts'

export const FEED_EVERY_MS = 30 * 60000
/** The phone keeps each city's last answer's money (day, the two rates, the currency) so amounts are right at once on the next visit; older than this it is ignored. */
export const RATES_KEEP_MS = 3 * 86400000
export const ratesKey = (cityId: string): string => `allworld.rates.${cityId}`
type Store = Pick<Storage, 'getItem' | 'setItem'>
const stored = (): Store | undefined => { try { return globalThis.localStorage } catch { return undefined } }
/** Keeps this answer's money for the next visit (only what money needs; storage that is full or off changes nothing). */
function remember(cityId: string, answer: unknown, at: number, store: Store | undefined = stored()): void {
  const m = readCityMoney(answer)
  if (m) try { store?.setItem(ratesKey(cityId), JSON.stringify({ at, day: m.day, rates: { NGN: m.ngnPerUsd, [m.code]: m.perUsd }, currency: (answer as { currency: unknown }).currency })) } catch { /* not kept */ }
}
/** The kept money of a city, or null: nothing kept, junk, or older than three days. It is read like a feed answer, so the same checks apply. */
export function recall(cityId: string, now: number, store: Store | undefined = stored()): CityMoney | null {
  try { const kept = JSON.parse(store?.getItem(ratesKey(cityId)) ?? 'null') as { at?: unknown } | null; return typeof kept?.at === 'number' && now - kept.at < RATES_KEEP_MS && now >= kept.at ? readCityMoney(kept) : null } catch { return null }
}

export interface FeedDeps {
  fetchJson: (path: string) => Promise<unknown>
  cityId: Ref<string>
  visible: () => boolean
  now: () => number
  setTimer: (run: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
  /** Where the last rates are kept (the page's localStorage when not given). */
  storage?: Store
}

/** Applies one answer: the credits, and the city's weather (or none, so that the cycle applies). */
export function takeFeed(cityId: string, answer: unknown, now: number = Date.now(), store?: Store): void {
  if (typeof answer !== 'object' || answer === null) return
  const feed = answer as { weather?: unknown; credits?: unknown }
  takeCredits(feed.credits)
  setCityMoney(cityId, readCityMoney(answer))
  remember(cityId, answer, now, store ?? stored())
  setObservedWeather(cityId, readObservedWeather(feed.weather))
}

export function startWorldFeed(deps: FeedDeps): () => void {
  let timer: unknown = null
  let stopped = false
  let lastAt = -Infinity
  async function read(): Promise<void> {
    const city = deps.cityId.value
    setDisplayCity(city) // amounts are written for this city from now on (naira until its rates arrive)
    lastAt = deps.now()
    setCityMoney(city, recall(city, lastAt, deps.storage)) // the last answer's rates at once (frozen for their day), until the feed answers
    try { takeFeed(city, await deps.fetchJson(`/api/world/feed?id=${encodeURIComponent(city)}`), lastAt, deps.storage) } catch { /* the last hours stay; the cycle covers the rest */ }
  }
  function schedule(): void {
    if (timer !== null) deps.clearTimer(timer)
    timer = stopped || !deps.visible() ? null : deps.setTimer(() => { timer = null; void read().then(schedule) }, FEED_EVERY_MS)
  }
  const stopWatch = watch(deps.cityId, () => { void read().then(schedule) })
  const onVisible = (): void => { if (deps.visible() && deps.now() - lastAt >= FEED_EVERY_MS) void read().then(schedule); else schedule() }
  globalThis.document?.addEventListener('visibilitychange', onVisible)
  void read().then(schedule)
  return () => { stopped = true; stopWatch(); globalThis.document?.removeEventListener('visibilitychange', onVisible); if (timer !== null) deps.clearTimer(timer) }
}

/** Starts it for the real page. */
export function startRealWorldFeed(fetchJson: (path: string) => Promise<unknown>, cityId: Ref<string>): () => void {
  return startWorldFeed({
    fetchJson, cityId, now: () => Date.now(),
    visible: () => globalThis.document?.visibilityState !== 'hidden',
    setTimer: (run, ms) => globalThis.setTimeout(run, ms),
    clearTimer: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  })
}
