// The words the world feed's data must be credited with (docs/WORLD-FEED.md), kept apart from the feed itself so the Help sheet can show
// them without loading it. The weather credit is always shown; the rates credit (with its link) only while the fallback source's rates are
// the ones in use, because that source's terms ask for a visible "Rates By Exchange Rate API" link wherever its rates are used.
import { reactive } from 'vue'

export interface FeedCredits { weather: string; weatherUrl: string; rates: string | null; ratesUrl: string | null }
export const feedCredits = reactive<FeedCredits>({ weather: 'Weather data from MET Norway', weatherUrl: 'https://www.met.no/en', rates: null, ratesUrl: null })

const text = (value: unknown, fallback: string): string => (typeof value === 'string' && value.length > 0 && value.length < 120 ? value : fallback)
const link = (value: unknown): string | null => (typeof value === 'string' && /^https:\/\/[\w.-]+(\/[\w./-]*)?$/.test(value) ? value : null)
/** Takes the credits of a feed answer; anything unreadable leaves the defaults. */
export function takeCredits(value: unknown): void {
  const c = typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
  feedCredits.weather = text(c['weather'], 'Weather data from MET Norway')
  feedCredits.weatherUrl = link(c['weatherUrl']) ?? 'https://www.met.no/en'
  const rates = typeof c['rates'] === 'string' && c['rates'] ? text(c['rates'], '') : ''
  feedCredits.rates = rates || null
  feedCredits.ratesUrl = rates ? link(c['ratesUrl']) : null
}
