/**
 * THE REAL SKY (the world feed, docs/WORLD-FEED.md)
 * ===========================================================================
 * What a city's weather really is, from the weather service the server asks (server/world-feed), reduced to the few states the game
 * knows. This file is pure and shared: the server fills it from its cache, the browser from GET /api/world/feed, and
 * weatherAt (systems/health.ts) reads it first and falls back to its own cycle when a city has none. Both sides therefore see one sky.
 *
 * SHAPE   an observation is a short list of hours, [start of the hour in ms, sky kind, air temperature in degrees C or null]. An hour
 *         covers [start, start + 1 h); a 20-minute weather block belongs to the hour that holds its start, so the same block gets the
 *         same answer on the server and on every phone that holds the same list. A block no hour covers uses the old cycle.
 * KINDS   clear, cloud (cloudy, dry), fog, lrain (light rain), rain, hrain (heavy rain), storm (thunder), sleet, snow. "Hot" is not a
 *         kind: a dry hour at 33 degrees or more reads as hot (HOT_C).
 * SPLIT   what the rules need (this file) is in the first download; reading the service's codes and checking what the feed sends
 *         (weather-observed-read.ts) is not: only the server and the lazy feed module of the browser load it.
 * RAIN    raining is true for light rain, rain, heavy rain, thunderstorm and sleet (they soak a walker); snow and the dry kinds are not.
 */

export type SkyKind = 'clear' | 'cloud' | 'fog' | 'lrain' | 'rain' | 'hrain' | 'storm' | 'sleet' | 'snow'
export type ObservedHour = readonly [start: number, kind: SkyKind, tempC: number | null]
export interface ObservedWeather { readonly hours: readonly ObservedHour[] }

export const HOUR_MS = 3600000
/** A dry hour at or above this air temperature reads as hot. */
export const HOT_C = 33
/** The most hours one observation may carry. */
export const MAX_OBSERVED_HOURS = 24
export const SKY_KINDS: readonly SkyKind[] = ['clear', 'cloud', 'fog', 'lrain', 'rain', 'hrain', 'storm', 'sleet', 'snow']

/** What the game shows for a sky (made by skyWords, weather-observed-read.ts). `over` replaces the plain dry/rain wording of the cycle (absent: the cycle's own wording). */
export interface SkyWords { readonly raining: boolean; readonly over?: { readonly label: string; readonly icon: string; readonly text?: string } }

/** Each city's hours, and the words of each hour (made when it was set, so the words' table stays out of the first download). */
const observed = new Map<string, { hours: readonly ObservedHour[]; words: readonly SkyWords[] }>()

/**
 * Sets (or with null clears) a city's observed weather, already checked (src/game/weather-observed-read.ts checks what the feed sends,
 * and is the only caller: it stays out of the first download). Listeners hear of a real change only.
 */
export function putObservedWeather(cityId: string, clean: ObservedWeather | null, words: readonly SkyWords[] = []): void {
  const before = observed.get(cityId)?.hours ?? null
  if (clean) observed.set(cityId, { hours: clean.hours, words }); else observed.delete(cityId)
  if (JSON.stringify(before) !== JSON.stringify(clean?.hours ?? null)) for (const listener of [...listeners]) listener(cityId)
}
const listeners = new Set<(cityId: string) => void>()
/** Called after a city's observed weather changed (the browser derives its views again). Returns the way to stop listening. */
export function onObservedWeather(listener: (cityId: string) => void): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
/** The observation a city holds now, or null. */
export const observedWeatherOf = (cityId: string): ObservedWeather | null => { const held = observed.get(cityId); return held ? { hours: held.hours } : null }
/** Forgets every city (a test, or a host that stops). */
export const clearObservedWeather = (): void => { observed.clear() }

/** The sky of a city at `at` (ms), from the hour that holds it; null when no hour does. Pure in the observation. */
export function observedSkyAt(cityId: string, at: number): { kind: SkyKind; tempC: number | null; words: SkyWords } | null {
  const held = observed.get(cityId)
  if (!held) return null
  for (let i = 0; i < held.hours.length; i += 1) {
    const [start, kind, tempC] = held.hours[i]!
    if (at >= start && at < start + HOUR_MS) return { kind, tempC, words: held.words[i] ?? { raining: false } }
  }
  return null
}
