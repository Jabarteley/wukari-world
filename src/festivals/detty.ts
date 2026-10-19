/**
 * OWNER: growth
 * DETTY DECEMBER (docs/DETTY-DECEMBER.md, Phase 6 of docs/WOW-PLAN.md): the season's rules and lists as pure functions of a server time.
 * No I/O, no clock of its own, no DOM, and NOT under src/game/ (vite.config.ts sends everything there to the first download): the server
 * (server/routes/detty.ts), the Events app and the venue scenes read it, and the last two load it on demand. The dates are
 * src/festivals/detty-dates.ts (1 to 31 December, West Africa Time, in Lagos, Accra and Abuja).
 *
 * WHAT THE SEASON HOLDS, per city:
 *   - a NIGHT every evening from an admin-editable list (concerts at a music venue, beach days, street parties), and on SATURDAYS the
 *     city-wide OWAMBE SATURDAY instead: a party night that sends people to throw or visit an owambe at home (src/festivals/party.ts);
 *   - a DAILY DROP: one thing to do, the same for everyone that day, from an admin-editable list of 31;
 *   - the RETURNEE badge: someone whose location badge (docs/FEED.md) is in another country, in a season city during the season;
 *   - the SEASON CARD at the end: nights attended, parties, cities ("I did Detty December in Allworld").
 * The venues are named by id with fallbacks in order (a city may not have the first one yet: Labadi Beach is not an Accra venue today,
 * so Accra's beach day is at its park until one is added; the words follow the venue, "Park day" there). Event hours are the city's own
 * local hours; the season's edges are WAT.
 */
import { DETTY_CITIES, dettyOn, isDettyCity, seasonDay, seasonYear, watDate } from './detty-dates.ts'
import type { DettyCity } from './detty-dates.ts'

export type NightKind = 'concert' | 'beach' | 'street'
export const NIGHT_KINDS: readonly NightKind[] = Object.freeze(['concert', 'beach', 'street'])
/** A night of the list: what it is, its words ({day} is the day venue's word: "Beach day", "Lake day") and its local hours. */
export interface Night { kind: NightKind; title: string; from: number; to: number }
interface VenueChoice { id: string; /** For the day venue: "Beach", "Lake", "Park". */ word?: string }
export interface SeasonCity { id: DettyCity; name: string; country: 'ng' | 'gh'; /** Hours ahead of UTC (Ghana keeps GMT). */ offset: number; venues: Readonly<Record<NightKind, readonly VenueChoice[]>> }

export const SEASON_CITIES: Readonly<Record<DettyCity, SeasonCity>> = Object.freeze({
  // Lekki's beach stands in for Elegushi; Afrika Shrine has the stage; Freedom Park (the Square) has the street party.
  lagos: { id: 'lagos', name: 'Lagos', country: 'ng', offset: 1, venues: { concert: [{ id: 'shrine' }, { id: 'rooftop' }], beach: [{ id: 'beach', word: 'Beach' }], street: [{ id: 'park' }] } },
  // Labadi Beach first, the moment Accra has it; until then the memorial park. The National Theatre has the stage.
  accra: { id: 'accra', name: 'Accra', country: 'gh', offset: 0, venues: { concert: [{ id: 'accra-national-theatre' }, { id: 'accra-recreation' }], beach: [{ id: 'accra-labadi-beach', word: 'Beach' }, { id: 'accra-recreation', word: 'Park' }], street: [{ id: 'accra-recreation' }] } },
  // Abuja has no sea: Jabi Lake Park has the day out; Eagle Square the street party; Gwarinpa's evening garden the music.
  abuja: { id: 'abuja', name: 'Abuja', country: 'ng', offset: 1, venues: { concert: [{ id: 'gwarinpa-evening' }, { id: 'millennium-park' }], beach: [{ id: 'jabi-lake-park', word: 'Lake' }, { id: 'millennium-park', word: 'Park' }], street: [{ id: 'eagle-square' }, { id: 'millennium-park' }] } },
})
/** Where a city's owambe Saturday sends people: home, to throw a party or to visit one. */
export const OWAMBE_VENUE = 'home'
export const OWAMBE = Object.freeze({ title: 'Owambe Saturday', blurb: 'The whole city parties tonight. Throw an owambe at home (Home → Party, pick the aso-ebi colour) or visit a friend’s.', from: 18, to: 23 })

export const DEFAULT_NIGHTS: readonly Night[] = Object.freeze([
  { kind: 'concert', title: 'Afrobeats night', from: 20, to: 23 },
  { kind: 'beach', title: '{day} day', from: 13, to: 18 },
  { kind: 'street', title: 'Street party', from: 19, to: 23 },
  { kind: 'concert', title: 'Amapiano and highlife night', from: 20, to: 23 },
  { kind: 'beach', title: '{day} day: sunset session', from: 15, to: 19 },
  { kind: 'street', title: 'Block party', from: 19, to: 23 },
  { kind: 'concert', title: 'Live band night', from: 20, to: 23 },
])
/** Plain words: what a night of each kind is about, under its title. */
export const NIGHT_BLURB: Readonly<Record<NightKind, string>> = Object.freeze({
  concert: 'Music on stage, the whole city out. Be there while it is on to count it on your season card.',
  beach: 'Sun, suya and a speaker louder than the waves. Be there while it is on to count it on your season card.',
  street: 'The road is closed and the music is loud. Be there while it is on to count it on your season card.',
})

/** One thing to do each day of December: the same for everyone, in every season city. 31 lines. */
export const DEFAULT_DROPS: readonly string[] = Object.freeze([
  'Walk the Square and say hello to three people.',
  'Find the city’s music venue and stay for one song.',
  'Eat at a buka and rate the jollof.',
  'Spend the afternoon at the beach day, or the lake or park where your city holds it.',
  'Send a friend abroad a house link and show them round.',
  'Pick an aso-ebi colour for Saturday.',
  'Throw an owambe at home, or visit one. It is Saturday soon.',
  'Take a photo at the street party and post it to the feed.',
  'Ride across the city and visit a district you have never seen.',
  'Call someone you have not talked to this year.',
  'Find the market and buy something for a friend.',
  'Get the location badge in My profile so people near you can find you.',
  'Visit another season city: Lagos, Accra or Abuja.',
  'Dance at the concert until the end.',
  'Name an MC and a DJ at a party.',
  'Invite a friend who is travelling home this month.',
  'Play a table game at a venue with someone new.',
  'Watch the sunset from the beach, the lake or a rooftop.',
  'Share today’s street party on WhatsApp.',
  'Spray the floor at an owambe (no money moves).',
  'Visit a friend’s home and sign the visitors’ book.',
  'Find an event in the Events app and add it to your calendar.',
  'Make a new friend at the Square.',
  'Christmas Eve: light up your home and invite your people.',
  'Christmas Day: visit family, in the game and out of it.',
  'Boxing Day: the biggest street party of the month. Be there.',
  'Go back to the place you liked most this month.',
  'Leave a kind word on someone’s post.',
  'Plan New Year’s Eve with your friends.',
  'Share your season card with someone who could not come home.',
  'Count down to the New Year at the Square.',
])

export const LIST_LIMITS = Object.freeze({ nights: 14, drops: 31, title: 40, drop: 120, text: 4000 })
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f<>]/, LINK = /https?:|www\./i
const plain = (value: string, min: number, max: number): string | null => { const text = value.replace(/\s+/g, ' ').trim(); return text.length >= min && text.length <= max && !CONTROL.test(text) && !LINK.test(text) ? text : null }

/**
 * The admin's list of nights, one per line: `kind | title | from-to` (`concert | Afrobeats night | 20-23`). A line that does not read is
 * left out; null when nothing reads (the defaults then apply). At most LIST_LIMITS.nights.
 */
export function parseNights(text: unknown): Night[] | null {
  if (typeof text !== 'string') return null
  const out: Night[] = []
  for (const line of text.split(/\r?\n/)) {
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length !== 3) continue
    const kind = parts[0]!.toLowerCase(), title = plain(parts[1]!, 3, LIST_LIMITS.title), hours = /^(\d{1,2})\s*-\s*(\d{1,2})$/.exec(parts[2]!)
    if (!(NIGHT_KINDS as readonly string[]).includes(kind) || !title || !hours) continue
    const from = Number(hours[1]), to = Number(hours[2])
    if (from < 0 || to > 24 || to <= from) continue
    out.push({ kind: kind as NightKind, title, from, to })
    if (out.length >= LIST_LIMITS.nights) break
  }
  return out.length ? out : null
}
/** The list of nights written back as the admin edits it. */
export const nightsText = (list: readonly Night[]): string => list.map((item) => `${item.kind} | ${item.title} | ${item.from}-${item.to}`).join('\n')
/** The admin's daily drops, one per line (3 to 120 plain characters, no links); null when nothing reads. At most 31. */
export function parseDrops(text: unknown): string[] | null {
  if (typeof text !== 'string') return null
  const out = text.split(/\r?\n/).flatMap((line) => plain(line, 3, LIST_LIMITS.drop) ?? []).slice(0, LIST_LIMITS.drops)
  return out.length ? out : null
}
/** The drop of a season day (1 to 31): the list's line for that day, going round when the list is shorter. */
export const dropFor = (day: number, drops: readonly string[] = DEFAULT_DROPS): string | null => (drops.length && Number.isInteger(day) && day >= 1 ? drops[(day - 1) % drops.length] ?? null : null)

/** The season config the server holds (the admin's switch and lists) and the page is given. */
export interface SeasonConfig { preview: boolean; nights: readonly Night[]; drops: readonly string[] }
export const DEFAULT_CONFIG: SeasonConfig = Object.freeze({ preview: false, nights: DEFAULT_NIGHTS, drops: DEFAULT_DROPS })

/** The venue a city holds a kind of night at: the first of its choices the city has (`has`: the city's venue list; absent, the first). */
export function venueOf(cityId: DettyCity, kind: NightKind | 'owambe', has: (id: string) => boolean = () => true): VenueChoice | null {
  if (kind === 'owambe') return { id: OWAMBE_VENUE }
  return SEASON_CITIES[cityId].venues[kind].find((choice) => has(choice.id)) ?? null
}
/** Every venue a kind of night may be held at in a city (the server's attendance check accepts any of them). */
export const venueIdsOf = (cityId: DettyCity, kind: NightKind | 'owambe'): string[] => (kind === 'owambe' ? [OWAMBE_VENUE] : SEASON_CITIES[cityId].venues[kind].map((choice) => choice.id))

/** One season event in a city. `key` is stable: `detty:<city>:<YYYY-MM-DD>:<kind>`. */
export interface SeasonEvent { key: string; kind: NightKind | 'owambe'; title: string; blurb: string; city: DettyCity; venue: string; start: number; end: number; live: boolean; day: number }
const DAY = 86400000, HOUR = 3600000
/** Saturday in the city's local calendar day number (1970-01-01 was a Thursday). */
const saturday = (localDay: number): boolean => (localDay + 4) % 7 === 6

/**
 * The season's events in a city that start between `from` and `to` (server ms) or are still on at `from`, soonest first. Nothing outside
 * the season (unless `preview`). `has` says which venues the city has (the page passes its venue list; the server passes nothing).
 */
export function seasonEvents(from: number, to: number, cityId: string, config: Pick<SeasonConfig, 'preview' | 'nights'> = DEFAULT_CONFIG, has?: (id: string) => boolean): SeasonEvent[] {
  if (!isDettyCity(cityId) || !Number.isFinite(from) || !Number.isFinite(to) || to <= from) return []
  const city = SEASON_CITIES[cityId], nights = config.nights.length ? config.nights : DEFAULT_NIGHTS, out: SeasonEvent[] = []
  const first = Math.floor((from + city.offset * HOUR) / DAY) - 1, last = Math.floor((to - 1 + city.offset * HOUR) / DAY)
  for (let local = first; local <= last; local++) {
    const noon = local * DAY + 12 * HOUR - city.offset * HOUR, day = seasonDay(noon, config.preview)
    if (day === null) continue
    const night: Night | null = saturday(local) ? null : nights[(day - 1) % nights.length] ?? null
    const kind = night ? night.kind : 'owambe', venue = venueOf(cityId, kind, has)
    if (!venue) continue
    const hours = night ?? OWAMBE, start = local * DAY + hours.from * HOUR - city.offset * HOUR, end = local * DAY + hours.to * HOUR - city.offset * HOUR
    if (end <= from || start >= to) continue
    const title = night ? night.title.replace(/\{day\}/g, venue.word ?? 'Beach') : OWAMBE.title
    out.push({ key: `detty:${cityId}:${new Date(local * DAY).toISOString().slice(0, 10)}:${kind}`, kind, title, blurb: night ? NIGHT_BLURB[night.kind] : OWAMBE.blurb, city: cityId, venue: venue.id, start, end, live: from >= start && from < end, day })
  }
  return out.sort((a, b) => a.start - b.start)
}
/** The season events on at `now` in a city (at most one: one a day). */
export const liveEvents = (now: number, cityId: string, config: Pick<SeasonConfig, 'preview' | 'nights'> = DEFAULT_CONFIG): SeasonEvent[] => seasonEvents(now, now + 1, cityId, config).filter((item) => item.live)

/**
 * THE RETURNEE RULE. A player earns the badge when, during the season, they are in a season city and their location badge is in a
 * different country from that city's. Only ids and country codes go in: the badge is a city id the player chose to show (docs/FEED.md),
 * the visit is the city the server has the character in. No position is ever an input.
 */
export interface ReturneeInput { now: number; preview?: boolean; visited: string; /** The country of the player's location badge city, or null without a badge. */ badgeCountry: string | null }
export function returneeEarned(input: ReturneeInput): boolean {
  if (!dettyOn(input.now, input.preview === true) || !isDettyCity(input.visited) || !input.badgeCountry) return false
  return input.badgeCountry.toLowerCase() !== SEASON_CITIES[input.visited].country
}
export const returneeLabel = (year: number): string => `Returnee · Detty December ${year}`
/** The season a record belongs to: the year (`2026`), or `preview-2026` for what a preview recorded, so a preview never counts in the real season. */
export const seasonKey = (now: number, preview: boolean): string => (preview && watDate(now).month !== 12 ? `preview-${seasonYear(now)}` : String(seasonYear(now)))

/** What the server keeps per player and season (server/routes/detty.ts): small lists, bounded. */
export interface SeasonRecord {
  /** The season key (seasonKey). A record of another season is started again. */
  s: string
  /** Season cities visited. */
  cities: string[]
  /** Season event keys attended (SeasonEvent.key). */
  events: string[]
  /** Parties attended or thrown: `<host id>:<started at>`. */
  parties: string[]
  /** The returnee badge per season key: which city earned it and when. Kept across seasons. */
  returnee?: Record<string, { city: string; at: number }>
}
export const RECORD_LIMITS = Object.freeze({ events: 62, parties: 62 })

/** THE SEASON CARD's facts: public counts and city names only. */
export interface SeasonFacts { year: number; nights: number; parties: number; cities: string[]; returnee: boolean }
export function seasonFacts(record: SeasonRecord | null | undefined, key: string): SeasonFacts {
  const year = Number(/(\d{4})$/.exec(key)?.[1] ?? 0), same = record?.s === key
  const cities = same ? DETTY_CITIES.filter((id) => record.cities.includes(id)).map((id) => SEASON_CITIES[id].name) : []
  return { year, nights: same ? record.events.length : 0, parties: same ? record.parties.length : 0, cities, returnee: Boolean(record?.returnee?.[key]) }
}
const count = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`
const listed = (names: readonly string[]): string => (names.length < 2 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)
/** The card's words: the title, one line of facts, and the text a share sends (the link goes on its own last line). */
export function cardWords(facts: SeasonFacts): { title: string; line: string; text: string } {
  const title = 'I did Detty December in Allworld'
  const parts = [count(facts.nights, 'night out', 'nights out'), count(facts.parties, 'owambe', 'owambes'), ...(facts.cities.length ? [listed(facts.cities)] : []), ...(facts.returnee ? ['Returnee'] : [])]
  const line = parts.join(' · ')
  return { title, line, text: `${title}${facts.year ? ` ${facts.year}` : ''}: ${line}.` }
}
/** When the card is offered: from 24 December to 15 January (WAT), or at once in a preview. */
export function cardOpen(now: number, preview = false): boolean {
  const d = watDate(now)
  return preview || (d.month === 12 && d.day >= 24) || (d.month === 1 && d.day <= 15)
}

/**
 * THE SKIN: which December props a venue gets. Lights and banners at the street-party place and the Square, beach-day props (umbrellas,
 * loungers, a flag line) at the day venue, stage lights at the music venue. `light` (a weak phone, src/scene/body/gate.ts bodyAllowed) halves
 * every count. Null when the season is off, the city is not a season city or the venue has no part in it: nothing is loaded then.
 */
export type SkinPart = 'lights' | 'beach' | 'stage'
export interface SkinPlan { parts: SkinPart[]; bulbs: number; umbrellas: number; beams: number; colours: readonly [string, string] }
export const SKIN_COLOURS: readonly [string, string] = Object.freeze(['#e0a43a', '#7b3fa0'] as [string, string])
export function skinFor(on: boolean, cityId: string, venueId: string | null | undefined, square: string | null, light: boolean): SkinPlan | null {
  if (!on || !isDettyCity(cityId) || !venueId) return null
  const venues = SEASON_CITIES[cityId].venues, parts: SkinPart[] = []
  if (venueId === square || venues.street.some((item) => item.id === venueId)) parts.push('lights')
  if (venues.beach.some((item) => item.id === venueId)) parts.push('beach', 'lights')
  if (venues.concert.some((item) => item.id === venueId)) parts.push('stage')
  const unique = [...new Set(parts)]
  if (!unique.length) return null
  return { parts: unique, bulbs: unique.includes('lights') ? (light ? 16 : 36) : 0, umbrellas: unique.includes('beach') ? (light ? 4 : 8) : 0, beams: unique.includes('stage') ? (light ? 2 : 4) : 0, colours: SKIN_COLOURS }
}
