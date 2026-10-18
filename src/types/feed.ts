// The feed's wire shapes (docs/FEED.md): what /api/feed/* answers. Every person is a public id and a name; nothing private travels.
import type { FeedTab, GigState, PostKind, Skill, Visibility, EventPhase } from '../feed/model.ts'

export interface FeedPerson {
  id: string
  name: string
  handle?: string
  /** The portrait's content hash: GET /api/feed/portrait/:id serves it. */
  portrait?: string
  /** AI-played (an agent character, or an agent acted for this character recently). */
  ai?: true
  friend?: true
}
export interface FeedMedia { hash: string; type: 'jpeg' | 'png' | 'webp' | 'webm' | 'mp4'; w: number; h: number; ms?: number }
export interface FeedPlace { city: string; cityName: string; venue?: string; label?: string }
export interface ReplyView { n: number; by: FeedPerson; at: number; body: string; mine?: true }
export interface PostView {
  id: string
  by: FeedPerson
  at: number
  kind: PostKind
  body: string
  place: FeedPlace | null
  vis: Visibility
  crew?: { id: string; name: string }
  media?: FeedMedia
  /** A clip's still image (a media hash). */
  poster?: string
  /** A moment: the gist line it came from (a share card can be made from it). */
  gist?: number
  event?: EventView
  gig?: GigView
  reactions: { emoji: string; count: number; mine?: true }[]
  replies: number
  /** The newest replies, oldest first (at most 3 in a list; all in a thread). */
  thread: ReplyView[]
  canReply: boolean
  mine?: true
  hidden?: true
  ai?: true
}
export interface NewsLine { n: number; at: number; city: string; text: string }
export interface FeedPage { ok: true; tab: FeedTab | 'crew' | 'author'; posts: PostView[]; next: string | null; news?: NewsLine[] }
export interface Draft { n: number; at: number; city: string; kind: string; text: string }
export interface InboxLine { at: number; kind: 'reply' | 'reaction' | 'follow' | 'crew' | 'rsvp' | 'gig' | 'vouch' | 'review' | 'mention' | 'moderation'; text: string; post?: string; from?: FeedPerson; seen?: true }
export interface ProfileView extends FeedPerson {
  bio?: string
  status?: { text: string; place?: string; at: number }
  followers: string
  following: boolean
  followable: boolean
  code?: string
  crews: { id: string; name: string; colour: string }[]
  work: WorkView
  mutual?: FeedPerson[]
  mine?: true
  adult?: true
  canFollowMe?: boolean
  handleChangeAt?: number
}
export interface WorkView {
  rating: string | null
  gigsDone: number
  vouches: { skill: Skill; count: number; mine?: true }[]
  service?: { kind: string; title: string; about: string }
  reviews: { by: FeedPerson; stars: number; text: string; at: number }[]
}
export interface CrewView {
  id: string; name: string; colour: string; about: string; at: number
  owner: FeedPerson; members: FeedPerson[]; size: number
  mine: boolean; owned: boolean
  /** Only for members: the join link's code. */
  code?: string
}
export interface EventView {
  id: string; title: string; about: string; by: FeedPerson; cohosts: FeedPerson[]
  start: number; end: number; phase: EventPhase; place: FeedPlace; cap: number
  going: number; maybe: number; me: 'going' | 'maybe' | null; friendsGoing: FeedPerson[]
  code: string; mine: boolean
}
export interface GigView {
  id: string; title: string; about: string; by: FeedPerson; city: string; cityName: string; reward: number; at: number
  state: GigState; applicants: number; applied: boolean; worker?: FeedPerson; mine: boolean
  /** For the poster: who applied. */
  people?: FeedPerson[]
  reviewed?: { poster: boolean; worker: boolean }
}
export interface Suggestion { person: FeedPerson; why: string; mutual: number }
export interface FeedMe {
  profile: ProfileView
  drafts: Draft[]
  inbox: InboxLine[]
  unseen: number
  crews: CrewView[]
  publicMedia: boolean
  media: boolean
}

// ---- the routes (server/routes/feed.ts) ------------------------------------------------------------------------------------------
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
type File = { file: true }
export interface FeedHttpRoutes {
  'GET /api/feed/me': { response: Ok<{ ok: true } & FeedMe>; errors: E }
  'POST /api/feed/seen': { body: object; response: Done; errors: E }
  'GET /api/feed/list': { query: { tab: FeedTab; city?: string; after?: string }; response: Ok<FeedPage | Refused>; errors: E | 'invalid_tab' }
  'GET /api/feed/crew': { query: { id: string; after?: string }; response: Ok<FeedPage | Refused>; errors: E }
  'GET /api/feed/by': { query: { id: string; after?: string }; response: Ok<FeedPage | Refused>; errors: E }
  'GET /api/feed/post': { query: { id: string }; response: Done<{ post: PostView }>; errors: E }
  'POST /api/feed/post': { body: { body?: string; vis?: Visibility; crew?: string; media?: string; poster?: string; draft?: number; label?: string }; response: Done<{ post: PostView }>; errors: E }
  'POST /api/feed/post/remove': { body: { id: string }; response: Done; errors: E }
  'POST /api/feed/react': { body: { id: string; emoji: string | null }; response: Done<{ post: PostView }>; errors: E }
  'POST /api/feed/reply': { body: { id: string; body: string }; response: Done<{ post: PostView }>; errors: E }
  'POST /api/feed/reply/remove': { body: { id: string; n: number }; response: Done; errors: E }
  'POST /api/feed/report': { body: { kind: string; id: string; n?: number; reason: string }; response: Done; errors: E }
  'POST /api/feed/draft/remove': { body: { n: number }; response: Done; errors: E }
  'POST /api/feed/media': { body: Uint8Array; response: Done<{ media: FeedMedia }>; errors: E | 'type_not_accepted' | 'body_too_large' }
  'GET /api/feed/media/:hash': { params: { hash: string }; response: File; errors: E | 'unknown_media' }
  'GET /api/feed/portrait/:id': { params: { id: string }; response: File; errors: E | 'unknown_media' }
  'GET /api/feed/profile': { query: { id: string }; response: Done<{ profile: ProfileView }>; errors: E }
  'POST /api/feed/profile': { body: { bio?: string; status?: string; withPlace?: boolean; open?: boolean }; response: Done<{ profile: ProfileView }>; errors: E }
  'POST /api/feed/handle': { body: { handle: string }; response: Done<{ profile: ProfileView }>; errors: E }
  'GET /api/feed/code': { query: { code: string }; response: Done<{ kind: 'friend' | 'crew' | 'event'; profile?: ProfileView; crew?: CrewView; event?: EventView }>; errors: E }
  'POST /api/feed/follow': { body: { id: string; on?: boolean }; response: Done<{ profile: ProfileView }>; errors: E }
  'GET /api/feed/suggestions': { response: Ok<{ ok: true; people: Suggestion[] }>; errors: E }
  'POST /api/feed/vouch': { body: { id: string; skill: string; on?: boolean }; response: Done<{ profile: ProfileView }>; errors: E }
  'POST /api/feed/crews': { body: { name: string; colour?: string; about?: string }; response: Done<{ crew: CrewView }>; errors: E }
  'POST /api/feed/crews/join': { body: { code: string }; response: Done<{ crew: CrewView }>; errors: E }
  'POST /api/feed/crews/leave': { body: { id: string; member?: string }; response: Done; errors: E }
  'GET /api/feed/crews/one': { query: { id: string }; response: Done<{ crew: CrewView }>; errors: E }
  'GET /api/feed/events': { query: { city?: string }; response: Ok<{ ok: true; events: EventView[]; mine: EventView[] }>; errors: E }
  'GET /api/feed/events/one': { query: { id?: string; code?: string }; response: Done<{ event: EventView }>; errors: E }
  'POST /api/feed/events': { body: { title: string; about?: string; start: number; hours?: number; place?: string; cap?: number; cohosts?: string[]; city?: string }; response: Done<{ event: EventView; post: PostView | null }>; errors: E }
  'POST /api/feed/events/rsvp': { body: { id: string; answer: 'going' | 'maybe' | null }; response: Done<{ event: EventView }>; errors: E }
  'POST /api/feed/events/cancel': { body: { id: string }; response: Done; errors: E }
  'GET /api/feed/gigs': { query: { city?: string }; response: Ok<{ ok: true; gigs: GigView[]; mine: GigView[] }>; errors: E }
  'POST /api/feed/gigs': { body: { title: string; about?: string; reward: number }; response: Done<{ gig: GigView }>; errors: E }
  'POST /api/feed/gigs/act': { body: { id: string; op: 'apply' | 'withdraw' | 'choose' | 'done' | 'close' | 'review'; worker?: string; stars?: number; text?: string }; response: Done<{ gig: GigView }>; errors: E }
  'GET /api/admin/feed': { response: Ok<{ ok: true; decisions: object[]; open: number }>; errors: E | 'not_found' }
  'POST /api/admin/feed/undo': { body: { n: number; reason?: string }; response: Done; errors: E | 'not_found' | 'invalid_decision' | 'origin_required' }
  'POST /api/admin/feed/act': { body: { kind: string; id: string; rn?: number; action: 'remove' | 'hide' | 'keep'; reason?: string }; response: Done<{ n: number }>; errors: E | 'not_found' | 'invalid_action' | 'origin_required' }
  'GET /api/feed/contacts': { response: Ok<{ ok: true; declared: boolean; declaredAt: number | null; found: number; uploadedAt: number | null; adult: boolean; limits: object }>; errors: E }
  'POST /api/feed/contacts/self': { body: { hash?: string; consent?: boolean; off?: boolean }; response: Done<{ declared: boolean }>; errors: E }
  'POST /api/feed/contacts/match': { body: { hashes: string[] }; response: Done<{ matched: FeedPerson[]; waiting: number }>; errors: E | 'body_too_large' }
  'POST /api/feed/contacts/forget': { body: object; response: Done; errors: E }
  'GET /api/mod/feed': { response: Ok<{ ok: true; items: object[] }>; errors: E | 'moderator_required' }
  'POST /api/mod/feed': { body: { kind: string; id: string; n?: number; action: 'remove' | 'clear' }; response: Done; errors: E | 'moderator_required' }
}
