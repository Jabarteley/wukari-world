// The client side of the world feed (docs/WORLD-FEED.md): reads GET /api/world/feed for the city the player is in, once when the city
// changes and again every 30 minutes while the page is visible, and hands the city's real weather to the rules (setObservedWeather) so the
// phone shows the same sky the server plays by. Loaded by a dynamic import after the first frame (App.vue): it is not in the first download.
// A failed read changes nothing: the weather keeps the last hours it was given, and when they run out the old cycle applies.
import { watch } from 'vue'
import type { Ref } from 'vue'
import { readObservedWeather, setObservedWeather } from '../../../game/weather-observed-read.ts'
import { takeCredits } from './feedCredits.ts'

export const FEED_EVERY_MS = 30 * 60000

export interface FeedDeps {
  fetchJson: (path: string) => Promise<unknown>
  cityId: Ref<string>
  visible: () => boolean
  now: () => number
  setTimer: (run: () => void, ms: number) => unknown
  clearTimer: (handle: unknown) => void
}

/** Applies one answer: the credits, and the city's weather (or none, so that the cycle applies). */
export function takeFeed(cityId: string, answer: unknown): void {
  if (typeof answer !== 'object' || answer === null) return
  const feed = answer as { weather?: unknown; credits?: unknown }
  takeCredits(feed.credits)
  setObservedWeather(cityId, readObservedWeather(feed.weather))
}

export function startWorldFeed(deps: FeedDeps): () => void {
  let timer: unknown = null
  let stopped = false
  let lastAt = -Infinity
  async function read(): Promise<void> {
    const city = deps.cityId.value
    lastAt = deps.now()
    try { takeFeed(city, await deps.fetchJson(`/api/world/feed?id=${encodeURIComponent(city)}`)) } catch { /* the last hours stay; the cycle covers the rest */ }
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
