// The home-city pin (docs/SMALLER-FEATURES.md): a player abroad picks a home city and sees its gist and weather in a small card, and event times in
// their own clock and the home city's. Pure: no fetch, no Vue, no storage. Loaded only with the card and the Events app, never at first paint.
// Nothing is imported from src/game: the feed's weather reader there is shared with the world feed's lazy chunk, and a second reader of it would split that module
// into a chunk of its own and add its name to a startup file. The shape read here is the one docs/WORLD-FEED.md gives.

export interface HomePin { city: string; name: string; /** An IANA zone ("Africa/Lagos"), read from the city's rules when it was pinned. */ tz: string }
export const PIN_KEY = 'allworld.homepin'

const SKY: Readonly<Record<string, string>> = { clear: 'Clear', cloud: 'Cloudy', fog: 'Foggy', lrain: 'Light rain', rain: 'Rain', hrain: 'Heavy rain', storm: 'Thunderstorm', sleet: 'Sleet', snow: 'Snow' }

/** The pin kept on this device, or null when none, junk, or a zone this browser does not know. */
export function readPin(raw: unknown): HomePin | null {
  let value: unknown = raw
  if (typeof raw === 'string') { try { value = JSON.parse(raw) } catch { return null } }
  if (typeof value !== 'object' || value === null) return null
  const { city, name, tz } = value as Record<string, unknown>
  if (typeof city !== 'string' || !/^[a-z0-9-]{2,40}$/.test(city) || typeof name !== 'string' || !name || typeof tz !== 'string' || !validZone(tz)) return null
  return { city, name: name.slice(0, 60), tz }
}
export function validZone(tz: string): boolean { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true } catch { return false } }
export const pinPaths = (city: string): { gist: string; feed: string } => ({ gist: `/api/world/gist?id=${encodeURIComponent(city)}&limit=5`, feed: `/api/world/feed?id=${encodeURIComponent(city)}` })

/** The weather now in a feed answer: the hour that has begun most recently (not older than 3 hours), or null. */
export function weatherNow(answer: unknown, now: number): { sky: string; tempC: number | null } | null {
  const weather = typeof answer === 'object' && answer !== null ? (answer as { weather?: unknown }).weather : null
  const list = typeof weather === 'object' && weather !== null ? (weather as { hours?: unknown }).hours : null
  let found: [number, string, number | null] | undefined
  for (const row of Array.isArray(list) ? list.slice(0, 24) as unknown[] : []) {
    if (!Array.isArray(row)) continue
    const [start, kind, temp] = row as unknown[]
    if (typeof start !== 'number' || !Number.isSafeInteger(start) || start > now || typeof kind !== 'string' || !Object.hasOwn(SKY, kind)) continue
    if (!found || start > found[0]) found = [start, kind, typeof temp === 'number' && Number.isFinite(temp) ? temp : null]
  }
  return found && now - found[0] < 3 * 3600000 ? { sky: SKY[found[1]]!, tempC: found[2] } : null
}
export const weatherLine = (weather: { sky: string; tempC: number | null } | null): string => (weather ? `${weather.sky}${weather.tempC === null ? '' : `, ${Math.round(weather.tempC)}°C`}` : 'Weather not available right now.')
/** The words the feed says the page must show for its weather (the credit), or ''. */
export const weatherCredit = (answer: unknown): string => { const credits = typeof answer === 'object' && answer !== null ? (answer as { credits?: unknown }).credits : null; const text = typeof credits === 'object' && credits !== null ? (credits as { weather?: unknown }).weather : ''; return typeof text === 'string' ? text.slice(0, 160) : '' }

const stamp = (tz: string | undefined, withDay: boolean): Intl.DateTimeFormat => new Intl.DateTimeFormat('en-GB', { ...(tz ? { timeZone: tz } : {}), ...(withDay ? { weekday: 'short' as const } : {}), hour: 'numeric', minute: '2-digit', hour12: true })
/** "Fri 7:00 pm – 1:00 am" for a span, in a zone (the device's own when `tz` is undefined). */
export const spanIn = (start: number, end: number, tz?: string): string => `${stamp(tz, true).format(new Date(start))} – ${stamp(tz, false).format(new Date(end))}`
/** An event's time on this device's clock and on the home city's: "Fri 7:00 pm – 1:00 am your time · Fri 1:00 pm – 7:00 pm in Houston". '' when the two clocks agree (nothing to add). */
export function homeTimes(start: number, end: number, pin: HomePin | null, localTz: string | undefined = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  if (!pin) return ''
  const mine = spanIn(start, end, localTz), home = spanIn(start, end, pin.tz)
  return mine === home ? '' : `${mine} your time · ${home} in ${pin.name}`
}
