/**
 * OWNER: growth
 * DETTY DECEMBER (docs/DETTY-DECEMBER.md): the season's public read, a player's own season, and the check-in that records what the
 * server can see for itself. The rules are src/festivals/detty.ts; the dates src/festivals/detty-dates.ts (1 to 31 December, WAT).
 *
 *   GET  /api/world/detty          { now, on, preview, day, year, key, cities, nights, drops, card }   PUBLIC, the same for everyone, cached a
 *                                  minute: the switch and the two admin lists, which the page feeds to the same pure functions.
 *   GET  /api/world/detty/me       { season, facts, returnee, card }                                    the caller's own season (session).
 *   POST /api/world/detty/checkin  {}  →  the same, plus `added`                                        the caller's session; the body is not read.
 * THE CHECK-IN trusts nothing the page says. During the season it looks at the stored records only:
 *   - the CITY the character is in (server/character.ts characterCity): a season city is added to the season's cities;
 *   - the RETURNEE rule (returneeEarned): that city's country against the country of the caller's location badge city (the feed's
 *     `authors[id].located`, a city id the player chose to show, while it lasts: docs/FEED.md). No position exists anywhere in this;
 *   - the season EVENT on now in that city, when the stored life stands at one of its venues (protocol.ts canOccupyVenue);
 *   - an owambe PARTY the caller is inside (as a guest the host let in, social.players[id].visiting) or is throwing at home while it is
 *     on (src/festivals/party.ts partyOn). A party is kept as its start time, never as the host's id.
 * It writes only when something was added (the keyed entry is compared by its text). At most 20 a minute per player.
 *
 * ADMIN (Admin → World → Settings, server/admin/settings.ts registerAdminSetting): `dettyPreview` turns the season on now for EVERY player,
 * for testing before 1 December (typed confirmation; what a preview records is kept apart as `preview-<year>` and never counts in the real
 * season); `dettyNights` and `dettyDrops` are the two lists, one line each (empty: the defaults).
 */
import { addressBucket } from '../host-context.ts'
import { canOccupyVenue } from '../protocol.ts'
import { characterCity } from '../character.ts'
import { registerAdminSetting, settingsOf } from '../admin/settings.ts'
import { peekFeed } from '../feed/data.ts'
import { dettyOf, peekDetty, recordFor } from '../detty/store.ts'
import { cityCatalogueEntry } from '../../src/game/cities/registry.ts'
import { LOCATED } from '../../src/feed/model.ts'
import { partyOn } from '../../src/festivals/party.ts'
import type { PartyRecord } from '../../src/festivals/party.ts'
import { DETTY_CITIES, dettyOn, isDettyCity, seasonDay, seasonYear } from '../../src/festivals/detty-dates.ts'
import { DEFAULT_DROPS, DEFAULT_NIGHTS, RECORD_LIMITS, cardOpen, liveEvents, nightsText, parseDrops, parseNights, returneeEarned, returneeLabel, seasonFacts, seasonKey, venueIdsOf } from '../../src/festivals/detty.ts'
import type { Night, SeasonConfig, SeasonRecord } from '../../src/festivals/detty.ts'
import type { Db, RouteContext, RouteHandler, RouteKey, SessionRecord } from '../types.ts'

/** The settings an admin edits (Admin → World → Settings). */
export const DETTY_SETTINGS = Object.freeze({ preview: 'dettyPreview', nights: 'dettyNights', drops: 'dettyDrops' })

/** The country code of a city of the catalogue: Nigeria's cities carry none. */
const countryOf = (cityId: string): string | null => { try { const entry = cityCatalogueEntry(cityId); return entry ? (entry.countryISO ?? 'ng').toLowerCase() : null } catch { return null } }

export default function dettyRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  registerAdminSetting(ctx, { key: DETTY_SETTINGS.preview, label: 'Detty December preview', help: 'Turns the December season on NOW for every player in Lagos, Accra and Abuja (skin, nights, drops, the Returnee badge), for testing. What it records is kept apart and never counts in the real season. Off by default; the season turns itself on from 1 to 31 December either way.', kind: 'boolean', confirmOn: true, default: () => false })
  registerAdminSetting(ctx, { key: DETTY_SETTINGS.nights, label: 'Detty December nights', help: 'One night per line: kind | title | from-to (kind is concert, beach or street; {day} becomes Beach, Lake or Park; hours are local). Saturdays are always Owambe Saturday. Empty: the defaults.', kind: 'text', max: 4000, default: () => nightsText(DEFAULT_NIGHTS) })
  registerAdminSetting(ctx, { key: DETTY_SETTINGS.drops, label: 'Detty December daily drops', help: 'One thing to do per line, for 1 to 31 December in order (a shorter list goes round). Plain words, no links. Empty: the defaults.', kind: 'text', max: 4000, default: () => DEFAULT_DROPS.join('\n') })
  const settings = settingsOf(ctx)
  let held: { nights: unknown; drops: unknown; config: Omit<SeasonConfig, 'preview'> } | null = null
  /** The switch and the lists in force (the lists are read again only when their text changed). */
  function config(): SeasonConfig {
    const nights = settings.get(DETTY_SETTINGS.nights), drops = settings.get(DETTY_SETTINGS.drops)
    if (!held || held.nights !== nights || held.drops !== drops) held = { nights, drops, config: { nights: parseNights(nights) ?? DEFAULT_NIGHTS, drops: parseDrops(drops) ?? DEFAULT_DROPS } }
    return { preview: settings.get(DETTY_SETTINGS.preview) === true, ...held.config }
  }
  /** What everyone may see of the season now. */
  function season(now: number, cfg: SeasonConfig = config()) {
    const on = dettyOn(now, cfg.preview)
    return { now, on, preview: cfg.preview, day: seasonDay(now, cfg.preview), year: seasonYear(now), key: seasonKey(now, cfg.preview), cities: DETTY_CITIES, nights: cfg.nights as readonly Night[], drops: cfg.drops, card: cardOpen(now, cfg.preview) }
  }
  /** The caller's own season: the card's facts and the Returnee badge of this season ("(preview)" for a preview's). */
  function mine(record: SeasonRecord | undefined, key: string) {
    const facts = seasonFacts(record, key), earned = record?.returnee?.[key]
    return { facts, returnee: earned ? `${returneeLabel(facts.year)}${key.startsWith('preview-') ? ' (preview)' : ''}` : null }
  }
  /** The country of the caller's location badge city while the badge lasts, or null. Only a city id is read: never a position. */
  function badgeCountry(db: Db, id: string, now: number): string | null {
    const located = peekFeed(db)?.authors?.[id]?.located
    if (!located || typeof located.city !== 'string' || !(now - located.at < LOCATED.days * 86400000)) return null
    return countryOf(located.city)
  }
  /** The party the caller is at now (inside as a guest, or throwing it at home), as its start time; null when none. */
  function partyNow(db: Db, session: SessionRecord, city: string, now: number): string | null {
    const social = db.social, id = session.publicId
    if (!social) return null
    const host = social.players?.[id]?.visiting
    const visited = host ? social.houses?.[host] : undefined
    if (host && visited?.guests?.[id] && partyOn(visited.party as PartyRecord | undefined, now)) return String((visited.party as PartyRecord).startedAt)
    const own = social.houses?.[id]
    if (own && partyOn(own.party as PartyRecord | undefined, now) && ctx.atHome(db, id, city)) return String((own.party as PartyRecord).startedAt)
    return null
  }
  const push = (list: string[], item: string, max: number): boolean => { if (list.includes(item)) return false; list.push(item); if (list.length > max) list.splice(0, list.length - max); return true }

  return {
    'GET /api/world/detty': async (request) => {
      if (!ctx.allow(`detty:${addressBucket(request.ip)}`, 60, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' })
      return { body: season(ctx.now()), headers: { 'Cache-Control': 'public, max-age=60' } }
    },
    'GET /api/world/detty/me': async (request) => {
      const now = ctx.now(), cfg = config(), view = season(now, cfg)
      const body = await ctx.store.read((db) => { const session = request.requireSession(db); return { season: view, ...mine(peekDetty(db)?.players?.[session.publicId], view.key) } })
      return { body, headers: { 'Cache-Control': 'no-store' } }
    },
    'POST /api/world/detty/checkin': async (request) => {
      const now = ctx.now(), cfg = config(), view = season(now, cfg)
      const body = await ctx.store.transact((db) => {
        const session = request.requireSession(db), id = session.publicId
        if (!ctx.allow(`detty:checkin:${id}`, 20, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a minute and try again.' })
        const stored = peekDetty(db)?.players?.[id]
        if (!view.on) return { ok: false as const, code: 'off_season' as const, reason: 'Detty December runs from 1 to 31 December.', season: view, ...mine(stored, view.key), added: {} }
        const city = characterCity(session) ?? '', record = recordFor(stored, view.key), added: { city?: string; returnee?: string; event?: string; party?: true } = {}
        if (isDettyCity(city)) {
          if (push(record.cities, city, 3)) added.city = city
          if (!record.returnee?.[view.key] && returneeEarned({ now, preview: cfg.preview, visited: city, badgeCountry: badgeCountry(db, id, now) })) {
            record.returnee = { ...record.returnee, [view.key]: { city, at: now } }
            const label = mine(record, view.key).returnee
            if (label) added.returnee = label
          }
          const state = session.cities[city as keyof SessionRecord['cities']]?.state, party = partyNow(db, session, city, now)
          if (party !== null && push(record.parties, party, RECORD_LIMITS.parties)) added.party = true
          for (const event of liveEvents(now, city, cfg)) {
            const there = event.kind === 'owambe' ? party !== null : Boolean(state) && venueIdsOf(event.city, event.kind).some((venue) => canOccupyVenue(state!, venue))
            if (there && push(record.events, event.key, RECORD_LIMITS.events)) added.event = event.title
          }
        }
        if (Object.keys(added).length) dettyOf(ctx, db).players[id] = record
        return { ok: true as const, code: 'checked' as const, season: view, ...mine(record, view.key), added }
      })
      return { body }
    },
  }
}
