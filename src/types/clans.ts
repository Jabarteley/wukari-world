// Clans, ladders and city leagues over HTTP (server/routes/clans.ts; docs/CLANS.md). Answers are { ok: true, code, … } or
// { ok: false, code, reason } with HTTP 200; a malformed request is 400. Types only.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'

/** A clan as its members (or someone holding its code) see it; members see `code`, `role`, `members` and the rest. */
export interface ClanView {
  id: string; name: string; colour: string; hex: string; city: string; cityName: string; size: number; cap: number; leader: string
  code?: string; role?: 'leader' | 'deputy' | 'member'; room?: string; rating?: number; deputies?: number; venueMin?: number
  members?: { id: string; name: string; role: string; ai?: true; pts: number }[]
  venue?: { city: string; cityName: string; venue: string; venueName: string } | null
  war?: { week: number; vs: { name: string; size: number; colour: string } | null; mine: number[] } | null
  last?: { n: number; vs: string; vsName: string; mine: number; theirs: number; outcome: 'win' | 'loss' | 'draw'; prize: number } | null
}
export type ClanAnswer<Extra extends object = object> = Ok<({ ok: true; code: string } & Extra) | { ok: false; code: string; reason: string }>
/** A board: key, title, how many are on it, and rows [rank, name, score, tier, me?, ai?]. */
export interface ClanBoard { k: string; t: string; n: number; r: (number | string)[][] }
type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required'

export interface ClansHttpRoutes {
  'GET /api/clans/me': { response: ClanAnswer<{ clan: ClanView | null; colours: { id: string; name: string; hex: string }[]; cap: number; homeCity: string; canCreate: boolean }>; errors: E }
  'GET /api/clans/preview': { query: { code: string }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_code' }
  'POST /api/clans/create': { body: { name: string; colour: string; city?: string; clientId: string }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_clan_name' | 'invalid_colour' | 'invalid_city' }
  'POST /api/clans/join': { body: { code: string }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_code' }
  'POST /api/clans/leave': { response: ClanAnswer<{ clan: null }>; errors: E }
  'POST /api/clans/kick': { body: { id: string }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_player' }
  'POST /api/clans/role': { body: { id: string; role: 'deputy' | 'member' | 'leader' }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_player' | 'invalid_role' }
  'POST /api/clans/edit': { body: { name?: string; colour?: string; city?: string }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_clan_name' | 'invalid_colour' | 'invalid_city' }
  'POST /api/clans/code': { response: ClanAnswer<{ clan: ClanView }>; errors: E }
  'POST /api/clans/venue': { body: { city: string; venue: string } | { venue: null }; response: ClanAnswer<{ clan: ClanView }>; errors: E | 'invalid_venue' }
  'POST /api/clans/prize': { body: { cityId?: string }; response: ClanAnswer<{ amount: number }>; errors: E | 'invalid_city' }
  'GET /api/clans/boards': { query: { period?: 'week' | 'season'; game?: string }; response: Ok<{ ok: true; period: 'week' | 'season'; game: string | null; me: unknown; boards: ClanBoard[] }>; errors: E | 'invalid_game' }
  'GET /api/clans/league': { query: { game?: string }; response: Ok<{ ok: true; week: number; game: string | null; cities: { id: string; name: string; score: number; players: number; mine?: 1 }[]; countries: { id: string; name: string; score: number; players: number }[]; lastWinner: { id: string; name: string; week: number } | null; home: { id: string; name: string } | null }>; errors: E | 'invalid_game' }
}
