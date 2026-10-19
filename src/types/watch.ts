// Wire types of shared watching (docs/ALLWORLD-HOUSE.md): match predictions, Allworld House, artist premieres. Server: server/watch/.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { BadgeKind, Outcome, PredictionBadge } from '../watch/predictions.ts'
import type { ArtistStatus, PremierePhase } from '../watch/premiere.ts'
import type { HousePhase } from '../watch/house.ts'

export interface MatchView {
  id: string; title: string; start: number; end: number
  /** The two sides, or null for a match night with no "A v B" title (nothing to pick). */
  teams: [string, string] | null
  /** Picks are open (before kick-off, within two weeks). */
  open: boolean
  counts: { home: number; away: number; draw: number }
  mine?: { w: Outcome; s?: [number, number] }
  result?: { home: number; away: number }
  right?: number; picks?: number; season?: string
  /** The result's gist line number (the public result card). */
  line?: number
  points?: number
  badge?: BadgeKind | null
}
export interface MatchesView { now: number; season: string; matches: MatchView[]; badges: PredictionBadge[] }
export interface BoardView {
  season: string
  rows: { rank: number; name: string; points: number; right: number; exact: number; you: boolean }[]
  me?: { rank: number; points: number; right: number; exact: number }
  players: number
}

export interface HousemateView { id: string; name: string; label: string; city: string; in: boolean; outWeek?: number; winner?: true; diary?: string }
export interface HouseWeekView { week: number; evictAt: number; revealAt: number; finale: boolean; out?: string; share?: number; voters?: number; line?: number }
export interface HouseView {
  now: number
  past: { number: number; winner?: string }[]
  season: null | {
    number: number; phase: HousePhase; week: number; weeks: number; startsAt: number; endsAt: number
    /** The stage room of eviction night (and the house's 3D room when it is a group room). */
    room: string
    day: number
    mates: HousemateView[]
    weekList: HouseWeekView[]
    /** The housemate the caller saved this week, or null. */
    voted: string | null
    canVote: boolean
    line?: number
  }
}

export interface ArtistView { name: string; about: string; links: string[]; track: string; status: ArtistStatus; at: number; reason?: string }
export interface PremiereView {
  id: string; artist: string; title: string; start: number; end: number; phase: PremierePhase; event: string; place: string
  world?: string; price?: number; going: number
  /** The track's YouTube id: once the premiere is live (to the artist always). */
  track?: string
  /** The front row's shown names. */
  front: string[]
  me?: { artist: boolean; front: boolean; going: boolean; ticket?: true }
  line?: number
}
export interface PremieresView { now: number; premieres: PremiereView[]; artist?: ArtistView; events: { id: string; title: string; start: number }[] }

export interface WatchAdminView {
  fixtures: { id: string; title: string; start: number; teams: boolean; picks: number; result: { home: number; away: number } | null }[]
  house: HouseView
  votes: number
  artists: (ArtistView & { id: string })[]
  premieres: PremiereView[]
}
export type WatchAdminAction = 'result.save' | 'house.start' | 'house.stop' | 'artist.approve' | 'artist.decline' | 'premiere.remove'

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
/** Shared watching's routes (server/routes/watch.ts, watch-admin.ts): merged into HttpRoutes in protocol.ts. */
export interface WatchHttpRoutes {
  'GET /api/watch/matches': { query: { city: string }; response: Ok<MatchesView>; errors: E | 'invalid_city' }
  'POST /api/watch/predict': { body: { fixture: string; winner: Outcome; score?: [number, number] }; response: Done<{ match: MatchView }>; errors: E }
  'GET /api/watch/board': { query: { season?: string }; response: Ok<BoardView>; errors: E }
  'GET /api/watch/house': { response: Ok<HouseView>; errors: E }
  'POST /api/watch/house/vote': { body: { mate: string }; response: Done; errors: E }
  'GET /api/watch/premieres': { response: Ok<PremieresView>; errors: E }
  'POST /api/watch/artist/apply': { body: { name: string; about?: string; links?: string[]; track: string }; response: Done<{ artist: ArtistView }>; errors: E }
  'POST /api/watch/premiere': { body: { event: string; world?: string }; response: Done<{ premiere: PremiereView }>; errors: E }
  'POST /api/watch/premiere/cancel': { body: { id: string }; response: Done; errors: E }
  'GET /api/admin/watch': { response: Ok<WatchAdminView>; errors: E | 'not_found' }
  'POST /api/admin/watch': { body: { action: WatchAdminAction; fixture?: string; home?: number; away?: number; room?: string; cities?: string[]; mates?: number; now?: boolean; id?: string; reason?: string }; response: Done<{ summary: string }>; errors: E | 'not_found' | 'origin_required' | 'invalid_action' }
}
