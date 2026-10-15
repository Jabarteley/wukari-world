/**
 * World wire shapes: everything `/api/world/*` returns — your place in the city, the city at a
 * glance, one local government, its estates and houses, and its directory of residents.
 *
 * Derived from server/routes/world.ts (the adapters), server/world/service.ts (the answers) and
 * server/world/registry.ts (one page of houses, one page of the directory).
 *
 * Conventions of every world route: `?city=<cityId>`; the session cookie is required; all of them
 * READ (a player's local government, house style and upgrades are ordinary actions on
 * POST /api/action: 'estate.set-lga', 'estate.style', 'estate.upgrade', 'estate.move-in',
 * 'estate.relocate'); each is rate limited per player (429 `world_rate_limited`, with a `reason`)
 * on top of the host's per-address limit; 503 `world_unavailable` on a host started without the
 * shard store. `v` is a version stamp: send it back as `?v=` and an unchanged answer is short.
 * Both Node and Worker use these routes; their registry shards use files and SQLite respectively.
 */
import type { CityId, HostErrorCode, JsonBodyErrorCode, Ok, SessionErrorCode, StorageErrorCode } from './protocol.ts'
import type { HouseId, LgaId, PlotAddress } from './life.ts'

/** What every world route can throw before its own validation. */
type WorldCommon = HostErrorCode | SessionErrorCode | 'world_unavailable' | 'invalid_city' | 'world_rate_limited'
/** Routes about one local government add 404 `unknown_lga`. */
type WorldLga = WorldCommon | 'unknown_lga'

/** Residents, houses and who is online now in one local government. */
export interface LgaCounts {
  residents: number
  houses: number
  online: number
}

/**
 * GET /api/world/me. Also makes sure the caller has their plot (allocating it on a first visit),
 * so it is the one call a client makes after creation or after changing local government.
 * `placed` is false — and `lga`, `plot` and `counts` are null — for a life that has not settled in.
 */
export interface WorldMeResponse {
  city: CityId
  /** The city the session's one character is in (this city when it never travelled). */
  character: { city: string }
  placed: boolean
  lga: LgaId | null
  /** Null for a moment after a first choice, until the server has allocated one. */
  plot: PlotAddress | null
  /** The caller is hidden from the directory (the civic `directory` preference): their house stays on the map, anonymous. */
  hidden: boolean
  counts: LgaCounts | null
}

/** One local government in the city summary. `occ` is base64 of 512 bytes: houses per estate. */
export interface WorldCityLga extends LgaCounts {
  id: LgaId
  occ: string
}
/**
 * GET /api/world/city. With `?v=` equal to the current version the answer is the short form:
 * presence moves without the version changing, so the online counts always travel.
 */
export type WorldCityResponse =
  | { v: string; lgas: WorldCityLga[] }
  | { v: string; unchanged: true; online: Partial<Record<LgaId, number>> }

/** GET /api/world/lga/:id. `rev` is the registry's revision; `yours` = it is the caller's local government. */
export interface WorldLgaResponse extends LgaCounts {
  id: LgaId
  /** Plots in a local government (content/world.js LGA_CAPACITY). */
  capacity: number
  rev: number
  yours: boolean
}

/** GET /api/world/lga/:id/estates: houses per estate for estates [from, from + count), at most 128 a request. */
export type WorldEstatesResponse =
  | { v: number; from: number; counts: number[] }
  | { v: number; unchanged: true }

/**
 * One house on a page of an estate. Short keys keep a page small: `p` the plot number (0…195),
 * `s` the packed style (content/world.js packStyle), `u` the server ms an upgrade finishes (0 =
 * none). A house whose owner is hidden from the directory has no `id` or `name` (and so no
 * `online` or `you`) — unless the viewer is that owner.
 */
export interface WorldHouse {
  p: number
  s: number
  u: number
  id?: string
  name?: string
  /** Only with `id`. */
  online?: boolean
  /** Present (true) only on the viewer's own house. */
  you?: true
}
/** GET /api/world/lga/:id/estate/:estate/houses: at most 98 plots a page. Always answered in full (presence is part of it). */
export interface WorldHousesResponse {
  /** The estate's own revision stamp. */
  v: number
  page: number
  pages: number
  houses: WorldHouse[]
}

export interface WorldStreetHouse {
  plot: number
  style: number
  upgradeAt: number
  /** Public compound geometry, including for anonymous residents; never an owner identifier. */
  land?: number[]
  owner?: { id: string; name: string; friend: boolean; online: boolean }
  you?: true
}
/** Only the caller's current street; identifiers are server-derived, not a shared-room admission token. */
export interface WorldStreetResponse {
  position?: { x: number; z: number }
  city: CityId
  anchor: PlotAddress
  street: { city: CityId; lga: LgaId; estate: number; row: number }
  houses: WorldStreetHouse[]
  land: number[]
}

/** One row of a local government's directory. `home` is 'own' or the rented tier. `estate`/`plot` only once a plot is held. */
export interface WorldPerson {
  id: string
  name: string
  home: HouseId | 'own'
  estate?: number
  plot?: number
  online: boolean
  you: boolean
}
/**
 * GET /api/world/lga/:id/people: 25 a page, in name order; `next` is the cursor to send back as
 * `after`, or null. A `q` of fewer than two (folded) characters answers the empty page with `short`.
 */
export type WorldPeopleResponse =
  | { items: WorldPerson[]; next: number | null }
  | { items: []; next: null; short: true }

/** A standing location-confirmed badge: the local government the player lives in, confirmed by their own device (docs/LOCATION.md). */
export interface WorldBadge { lga: LgaId; name: string }
/** POST /api/world/badges: the badges of up to 40 players, only those with one. */
export interface WorldBadgesResponse { badges: Record<string, WorldBadge> }
export interface WorldPulseResponse { online: number; visits: number; today: number; cities: Record<string, number> }
/** GET /api/world/feed (server/world-feed): the day's rates and a city's real weather. */
export interface WorldFeedResponse {
  day: string | null
  rates: Record<string, number>
  weather: { at: number; hours: [start: number, kind: string, tempC: number | null][] } | null
  credits: { weather: string; weatherUrl: string; rates: string | null; ratesUrl: string | null }
}
/** GET /api/world/gist (server/gist): public lines of what happened in a city, newest first (docs/GIST.md). */
export interface GistLine { n: number; at: number; city: string; kind: string; text: string }
export interface WorldGistResponse { city: CityId; items: GistLine[]; latest: number }
/** GET /api/world/works: see server/works/works.ts WorksView. */
export interface WorldWorksResponse {
  city: CityId
  active: { id: string; label: string; line: string; paid: number; cost: number; gifts: number } | null
  done: { id: string; label: string; line: string; at: number }[]
  order: string[]
  later: { id: string; label: string }[]
  limits: { min: number; max: number; daily: number }
  you?: { canOrder: boolean }
}
export interface WorldHomeCityResponse { home: { city: string; name: string; tz: string } | null }
export interface WorldBirthdayResponse { mine: { m: number; d: number; share: boolean } | null; today: boolean; friends: string[] }
export interface WorldHttpRoutes {
  'GET /api/world/street': { query: { city: CityId }; response: Ok<WorldStreetResponse>; errors: WorldCommon | StorageErrorCode | 'city_moved' | 'not_on_street' | 'plot_unavailable' }
  /** Settles (or creates) the caller's life in that city exactly as a poll would, so it can also answer 409 `city_moved` and 503 `storage_unavailable`. */
  'GET /api/world/me': { query: { city: CityId }; response: Ok<WorldMeResponse>; errors: WorldCommon | StorageErrorCode | 'city_moved' }
  /** Who is online now and how many visits there have been (server/pulse.ts); `cities` counts the online players whose character is in that city (visitors too); the caller is always counted. */
  'GET /api/world/pulse': { query: Record<string, never>; response: Ok<WorldPulseResponse>; errors: HostErrorCode | SessionErrorCode | 'pulse_rate_limited' }
  /** Public: only how many players are online (at least 1), for a visitor who has no session yet. No visit is counted. */
  'GET /api/world/pulse/online': { query: Record<string, never>; response: Ok<{ online: number }>; errors: HostErrorCode | 'pulse_rate_limited' }
  /** Public: the city's country and what an admin changed in the festival calendar and fixtures (server/routes/festivals.ts, docs/FESTIVALS.md). */
  'GET /api/world/festivals': { query: { city: CityId }; response: Ok<{ now: number; city: CityId; country: string; extras: unknown; fixtures: unknown[] }>; errors: HostErrorCode | 'invalid_city' | 'rate_limited' }
  /** Public: the day's rates (the city's own currency, NGN, USD) and the city's observed weather; cached five minutes (docs/WORLD-FEED.md). */
  'GET /api/world/feed': { query: { id: CityId }; response: Ok<WorldFeedResponse>; errors: HostErrorCode | 'invalid_city' | 'feed_rate_limited' }
  /** Public: the newest public lines of a city's gist (its own and the world's) after `since`; cached 15 seconds. */
  'GET /api/world/gist': { query: { id: CityId; since?: number; limit?: number }; response: Ok<WorldGistResponse>; errors: HostErrorCode | 'invalid_city' | 'gist_rate_limited' }
  /** A player's prayer (server/routes/prayers.ts, docs/PRAYERS.md): the notice to show first, then the prayer, sent with `notice: true`. */
  'GET /api/world/pray': { query: Record<string, never>; response: Ok<{ notice: string; received: string; left: number; max: number }>; errors: WorldCommon }
  'POST /api/world/pray': { body: { text: string; notice: true; venue?: string; clientId: string }; response: Ok<{ ok: true; message: string }>; errors: WorldCommon | 'notice_required' | 'invalid_prayer' | 'too_many_prayers' }
  /** Public: the city's shared works, the one taking gifts, those that stand and the order (server/routes/works.ts, docs/SMALLER-FEATURES.md). `you` only with a session. */
  'GET /api/world/works': { query: { id: CityId }; response: Ok<WorldWorksResponse>; errors: HostErrorCode | 'invalid_city' | 'works_rate_limited' }
  /** Opt-in birthdays (server/routes/stages.ts, docs/SMALLER-FEATURES.md): the caller's own choice and the friends who share and celebrate today. */
  'GET /api/world/birthday': { query: Record<string, never>; response: Ok<WorldBirthdayResponse>; errors: HostErrorCode | SessionErrorCode }
  'POST /api/world/birthday': { body: { m: number; d: number; share?: boolean } | { clear: true }; response: Ok<WorldBirthdayResponse>; errors: HostErrorCode | SessionErrorCode | JsonBodyErrorCode | 'invalid_date' | 'stages_rate_limited' }
  /** The home-city pin kept with the caller's character, so it follows an account across devices (server/routes/stages.ts, docs/SMALLER-FEATURES.md). `ifNone`: the device's one-off upload, which never overwrites. */
  'GET /api/world/home-city': { query: Record<string, never>; response: Ok<WorldHomeCityResponse>; errors: HostErrorCode | SessionErrorCode }
  'POST /api/world/home-city': { body: { city: string; name: string; tz: string; ifNone?: boolean } | { clear: true }; response: Ok<WorldHomeCityResponse>; errors: HostErrorCode | SessionErrorCode | JsonBodyErrorCode | 'invalid_home_city' | 'stages_rate_limited' }
  'GET /api/world/city': { query: { city: CityId; v?: string }; response: Ok<WorldCityResponse>; errors: WorldCommon }
  'GET /api/world/lga/:id': { params: { id: LgaId }; query: { city: CityId }; response: Ok<WorldLgaResponse>; errors: WorldLga }
  /** `from` 0…511, `count` 0…128 (default 128); 400 `invalid_number` otherwise. */
  'GET /api/world/lga/:id/estates': {
    params: { id: LgaId }
    query: { city: CityId; from?: number; count?: number; v?: number }
    response: Ok<WorldEstatesResponse>
    errors: WorldLga | 'invalid_number'
  }
  /** `estate` 0…511, `page` 0…9 (clamped to the last page); 400 `invalid_number` otherwise. */
  'GET /api/world/lga/:id/estate/:estate/houses': {
    params: { id: LgaId; estate: string }
    query: { city: CityId; page?: number }
    response: Ok<WorldHousesResponse>
    errors: WorldLga | 'invalid_number'
  }
  /** `q`: a name prefix of at most 40 characters (400 `invalid_query`); `online=1` lists who is online now instead. */
  'GET /api/world/lga/:id/people': {
    params: { id: LgaId }
    query: { city: CityId; q?: string; after?: number; online?: '1' }
    response: Ok<WorldPeopleResponse>
    errors: WorldLga | 'invalid_query' | 'invalid_number'
  }
  /** Who among the given players holds a location-confirmed badge, and the name of their local government when they are listed (server/routes/residence.ts). */
  'POST /api/world/badges': { body: { ids: string[] }; response: Ok<WorldBadgesResponse>; errors: HostErrorCode | JsonBodyErrorCode | SessionErrorCode | 'invalid_ids' | 'rate_limited' }
}

// ---- runtime key lists (compared with the running server by protocol.test.ts) -------------------

export const WORLD_ME_RESPONSE_KEYS = ['character', 'city', 'counts', 'hidden', 'lga', 'placed', 'plot', 'serverTime'] as const satisfies readonly (keyof Ok<WorldMeResponse>)[]
export const WORLD_CITY_LGA_KEYS = ['houses', 'id', 'occ', 'online', 'residents'] as const satisfies readonly (keyof WorldCityLga)[]
export const WORLD_LGA_RESPONSE_KEYS = ['capacity', 'houses', 'id', 'online', 'residents', 'rev', 'serverTime', 'yours'] as const satisfies readonly (keyof Ok<WorldLgaResponse>)[]
export const WORLD_HOUSES_RESPONSE_KEYS = ['houses', 'page', 'pages', 'serverTime', 'v'] as const satisfies readonly (keyof Ok<WorldHousesResponse>)[]
/** A house whose owner is listed, seen by that owner. */
export const WORLD_OWN_HOUSE_KEYS = ['id', 'name', 'online', 'p', 's', 'u', 'you'] as const satisfies readonly (keyof WorldHouse)[]
/** A directory row of a resident who holds a plot. */
export const WORLD_PERSON_KEYS = ['estate', 'home', 'id', 'name', 'online', 'plot', 'you'] as const satisfies readonly (keyof WorldPerson)[]
