/**
 * READING THE REAL SKY: the half of src/game/weather-observed.ts that only the server and the browser's lazy feed module need (it is
 * kept out of the first download): the weather service's symbol codes as sky kinds, and the check of a list the feed sends before it
 * is set. The shapes and the rules' side are in weather-observed.ts.
 */
import { HOT_C, MAX_OBSERVED_HOURS, SKY_KINDS, putObservedWeather } from './weather-observed.ts'
import type { ObservedHour, ObservedWeather, SkyKind, SkyWords } from './weather-observed.ts'

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

/** Sets (or with null clears) a city's observed weather. The list is copied and cleaned: unknown kinds and bad times are dropped. */
export function setObservedWeather(cityId: string, value: ObservedWeather | null): void {
  const clean = value ? readObservedWeather(value) : null
  putObservedWeather(cityId, clean, clean ? clean.hours.map(([, kind, tempC]) => skyWords(kind, tempC)) : [])
}

/** A list as the feed sends it, checked and cleaned; null when nothing usable is in it. At most MAX_OBSERVED_HOURS hours, in time order. */
export function readObservedWeather(value: unknown): ObservedWeather | null {
  const list = typeof value === 'object' && value !== null ? (value as { hours?: unknown }).hours : null
  if (!Array.isArray(list)) return null
  const hours: ObservedHour[] = []
  for (const row of list.slice(0, MAX_OBSERVED_HOURS) as unknown[]) {
    if (!Array.isArray(row)) continue
    const [start, kind, temp] = row as unknown[]
    if (typeof start !== 'number' || !Number.isSafeInteger(start) || start <= 0 || typeof kind !== 'string' || !SKY_KINDS.includes(kind as SkyKind)) continue
    hours.push([start, kind as SkyKind, typeof temp === 'number' && Number.isFinite(temp) ? Math.round(temp * 10) / 10 : null])
  }
  hours.sort((a, b) => a[0] - b[0])
  return hours.length ? { hours } : null
}
