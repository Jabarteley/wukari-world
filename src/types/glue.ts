// Wire shapes of the social glue (docs/SOCIAL-GLUE.md): what /api/glue/* answers. Rules: src/glue/model.ts; server: server/glue/.
import type { ClosePlace, MarriageState, Ring, TalkPhase, TripAnswer, TripMode } from '../glue/model.ts'
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'

export interface GlueRefusal { ok: false; code: string; reason: string }
export interface PersonRef { id: string; name: string }

/** GET /api/glue/close: my own setting and list, and the close friends who share with me who are somewhere now. */
export interface CloseView {
  ok: true
  on: boolean
  list: PersonRef[]
  /** Ordinary friends I could add (not on the list yet), at most 60. */
  friends: PersonRef[]
  now: CloseNowLine[]
}
export interface CloseNowLine { id: string; name: string; line: string; place: ClosePlace }

/** A hosted talk: a feed event with a stage. */
export interface TalkView {
  id: string
  title: string
  about: string
  start: number
  end: number
  phase: TalkPhase
  host: PersonRef
  speakers: PersonRef[]
  /** Where: the room key the stage opens in, and its words. */
  room: string
  place: string
  city: string
  going: number
  /** The viewer said "remind me" (is going). */
  reminded: boolean
  mine: boolean
  /** The viewer may open the stage now (the host or a speaker, in the room, in the window). */
  canOpen: boolean
  /** The feed event, for its page and link. */
  event: string
}
export interface TalksView { ok: true; talks: TalkView[]; rooms: { room: string; label: string }[] }

export interface GistPostView {
  id: string
  body: string
  at: number
  same: number
  sameMine: boolean
  mine: boolean
  /** Only for the post's own author, while the reviewer reads it or after it was refused. */
  status?: 'review' | 'refused' | 'held'
  reason?: string
  /** ONLY in a moderator's view (the community's founder or moderators, an admin): who wrote it. Never sent to anyone else. */
  by?: PersonRef
  reports?: number
  aboutMe?: number
}
export interface GistBoardView {
  ok: true
  key: string
  name: string
  posts: GistPostView[]
  mine: GistPostView[]
  canPost: boolean
  /** Why not, when canPost is false. */
  why?: string
  moderator: boolean
  /** A moderator's queue: posts held by "this is about me" or reports. */
  held?: GistPostView[]
}

export interface TripMemberView extends PersonRef { answer: TripAnswer }
export interface TripView {
  id: string
  crew: string
  crewName: string
  mode: TripMode
  city: string
  from: string
  fromName: string
  to: string
  toName: string
  by: PersonRef
  members: TripMemberView[]
  state: 'open' | 'gone' | 'called-off'
  /** Server times, once gone. */
  leftAt?: number
  arriveAt?: number
  mine: boolean
  myAnswer: TripAnswer | null
  ready: string | null
  card?: string
}
export interface TripsView { ok: true; trips: TripView[] }

export interface MarriageView {
  id: string
  state: MarriageState
  with: PersonRef
  /** Who asked. */
  by: string
  ring: Ring
  ringLabel: string
  at: number
  since?: number
  venue?: string
  guests?: string[]
  /** Owners whose home is shared with the other (each offers their own). */
  shared: string[]
}
export interface FamilyLifeView {
  ok: true
  marriage: MarriageView | null
  /** Proposals made to me that are waiting. */
  asked: MarriageView[]
  rings: { id: Ring; label: string }[]
}
/** On a person's card: they are married (a badge). */
export interface MarriedBadge { to: PersonRef; since: number }

// ---- the routes (server/routes/glue.ts), merged into HttpRoutes in ./protocol.ts ----------------------------------------------------
type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable' | 'invalid_request'
type Done<T extends object = object> = Ok<({ ok: true } & T) | GlueRefusal>
export interface GlueHttpRoutes {
  'GET /api/glue/close': { response: Done<Omit<CloseView, 'ok'>>; errors: E }
  'GET /api/glue/close/now': { response: Done<{ now: CloseNowLine[] }>; errors: E }
  'POST /api/glue/close': { body: { on?: boolean; add?: string; remove?: string; ids?: string[] }; response: Done<Omit<CloseView, 'ok'>>; errors: E }
  'GET /api/glue/talks': { response: Done<Omit<TalksView, 'ok'>>; errors: E }
  'POST /api/glue/talks': { body: { title: string; about?: string; start: number; minutes: number; room: string; speakers?: string[] }; response: Done<{ talk: TalkView }>; errors: E }
  'POST /api/glue/talks/remind': { body: { id: string; on?: boolean }; response: Done<{ talk: TalkView }>; errors: E }
  'POST /api/glue/talks/open': { body: { id: string }; response: Done<{ room: string }>; errors: E }
  'POST /api/glue/talks/cancel': { body: { id: string }; response: Done; errors: E }
  'GET /api/glue/board': { query: { key: string }; response: Done<Omit<GistBoardView, 'ok'>>; errors: E }
  'POST /api/glue/board/posts': { body: { board: string; body: string }; response: Done<{ post: GistPostView }>; errors: E }
  'POST /api/glue/board/same': { body: { id: string; on?: boolean }; response: Done<{ post: GistPostView }>; errors: E }
  'POST /api/glue/board/report': { body: { id: string; aboutMe?: boolean }; response: Done; errors: E }
  'POST /api/glue/board/moderate': { body: { id: string; action: 'remove' | 'restore' }; response: Done; errors: E }
  'GET /api/glue/trips': { query: { crew?: string }; response: Done<Omit<TripsView, 'ok'>>; errors: E }
  'POST /api/glue/trips': { body: { crew: string; mode: TripMode; to: string; members?: string[]; cityId?: string }; response: Done<{ trip: TripView }>; errors: E }
  'POST /api/glue/trips/answer': { body: { id: string; yes: boolean }; response: Done<{ trip: TripView }>; errors: E }
  'POST /api/glue/trips/manage': { body: { id: string; action: 'drop' | 'cancel'; member?: string }; response: Done<{ trip: TripView }>; errors: E }
  'POST /api/glue/trips/go': { body: { id: string; cityId?: string }; response: Done<{ trip: TripView }>; errors: E }
  'GET /api/glue/family': { response: Done<Omit<FamilyLifeView, 'ok'>>; errors: E }
  'POST /api/glue/family/propose': { body: { to: string; ring: Ring }; response: Done<{ family: FamilyLifeView }>; errors: E }
  'POST /api/glue/family/answer': { body: { id: string; yes: boolean }; response: Done<{ family: FamilyLifeView }>; errors: E }
  'POST /api/glue/family/withdraw': { body: Record<string, never>; response: Done<{ family: FamilyLifeView }>; errors: E }
  'POST /api/glue/family/ceremony': { body: Record<string, never>; response: Done<{ family: FamilyLifeView; line: string }>; errors: E }
  'POST /api/glue/family/home': { body: { on: boolean }; response: Done<{ family: FamilyLifeView }>; errors: E }
  'POST /api/glue/family/divorce': { body: Record<string, never>; response: Done<{ family: FamilyLifeView }>; errors: E }
}
