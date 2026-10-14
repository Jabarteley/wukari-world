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
const KINDS: readonly SkyKind[] = ['clear', 'cloud', 'fog', 'lrain', 'rain', 'hrain', 'storm', 'sleet', 'snow']

/**
 * The service's symbol code ("lightrainshowers_day", "heavyrainandthunder", "clearsky_night", "fog") as a sky kind; null for one we do not
 * know (that hour then uses the cycle). The day/night/polartwilight suffix means nothing here.
 */
export function skyKindOf(symbol: unknown): SkyKind | null {
  if (typeof symbol !== 'string') return null
  const code = symbol.toLowerCase().replace(/_(day|night|polartwilight)$/, '')
  if (code.includes('thunder')) return 'storm'
  if (code.includes('sleet')) return 'sleet'
  if (code.includes('snow')) return 'snow'
  if (code.includes('rain')) return code.startsWith('light') ? 'lrain' : code.startsWith('heavy') ? 'hrain' : 'rain'
  if (code === 'fog') return 'fog'
  if (code === 'cloudy' || code === 'partlycloudy') return 'cloud'
  if (code === 'clearsky' || code === 'fair') return 'clear'
  return null
}

/** What the game shows for a sky. `over` is what replaces the plain dry/rain wording of the cycle (absent: the cycle's own wording). */
export interface SkyWords { readonly raining: boolean; readonly over?: { readonly label: string; readonly icon: string; readonly text?: string } }
const RAIN_WORDS = { lrain: { label: 'Light rain', icon: '🌦️' }, rain: { label: 'Rain', icon: '🌧️' }, hrain: { label: 'Heavy rain', icon: '🌧️' } } as const

export function skyWords(kind: SkyKind, tempC: number | null): SkyWords {
  switch (kind) {
    case 'lrain': case 'rain': case 'hrain': return { raining: true, over: RAIN_WORDS[kind] }
    case 'storm': return { raining: true, over: { label: 'Thunderstorm', icon: '⛈️', text: 'There is a thunderstorm. Stay under cover; exposed travel will leave you soaked.' } }
    case 'sleet': return { raining: true, over: { label: 'Sleet', icon: '🌨️', text: 'Wet sleet is falling. Exposed travel will leave you soaked.' } }
    case 'snow': return { raining: false, over: { label: 'Snow', icon: '❄️', text: 'It is snowing. Wrap up warm.' } }
    case 'fog': return { raining: false, over: { label: 'Fog', icon: '🌫️', text: 'Thick fog. Take care getting around.' } }
    default:
      if (tempC !== null && tempC >= HOT_C) return { raining: false, over: { label: 'Hot', icon: '🥵', text: 'It is very hot. Drink water and keep to the shade.' } }
      return kind === 'cloud' ? { raining: false, over: { label: 'Cloudy', icon: '☁️', text: 'Cloudy but dry. Any way of getting around is fine.' } } : { raining: false }
  }
}

const observed = new Map<string, ObservedWeather>()

/** Sets (or with null clears) a city's observed weather. The list is copied and cleaned: unknown kinds and bad times are dropped. */
export function setObservedWeather(cityId: string, value: ObservedWeather | null): void {
  const clean = value ? readObservedWeather(value) : null
  const before = observed.get(cityId)
  if (clean) observed.set(cityId, clean); else observed.delete(cityId)
  if (JSON.stringify(before ?? null) !== JSON.stringify(clean)) for (const listener of [...listeners]) listener(cityId)
}
const listeners = new Set<(cityId: string) => void>()
/** Called after a city's observed weather changed (the browser derives its views again). Returns the way to stop listening. */
export function onObservedWeather(listener: (cityId: string) => void): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
/** The observation a city holds now, or null. */
export const observedWeatherOf = (cityId: string): ObservedWeather | null => observed.get(cityId) ?? null
/** Forgets every city (a test, or a host that stops). */
export const clearObservedWeather = (): void => { observed.clear() }

/** The sky of a city at `at` (ms), from the hour that holds it; null when no hour does. Pure in the observation. */
export function observedSkyAt(cityId: string, at: number): { kind: SkyKind; tempC: number | null } | null {
  const hours = observed.get(cityId)?.hours
  if (!hours) return null
  for (const [start, kind, tempC] of hours) if (at >= start && at < start + HOUR_MS) return { kind, tempC }
  return null
}

/** A list as the feed sends it, checked and cleaned; null when nothing usable is in it. At most MAX_OBSERVED_HOURS hours, in time order. */
export function readObservedWeather(value: unknown): ObservedWeather | null {
  const list = typeof value === 'object' && value !== null ? (value as { hours?: unknown }).hours : null
  if (!Array.isArray(list)) return null
  const hours: ObservedHour[] = []
  for (const row of list.slice(0, MAX_OBSERVED_HOURS) as unknown[]) {
    if (!Array.isArray(row)) continue
    const [start, kind, temp] = row as unknown[]
    if (typeof start !== 'number' || !Number.isSafeInteger(start) || start <= 0 || typeof kind !== 'string' || !KINDS.includes(kind as SkyKind)) continue
    hours.push([start, kind as SkyKind, typeof temp === 'number' && Number.isFinite(temp) ? Math.round(temp * 10) / 10 : null])
  }
  hours.sort((a, b) => a[0] - b[0])
  return hours.length ? { hours } : null
}
