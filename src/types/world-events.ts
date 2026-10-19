// OWNER: world events (docs/WORLD-EVENTS.md). The weekly world event, stage mode and election night: what the routes answer.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { GoalKind, Phase, Schedule, WorldEventDef } from '../world-events/model.ts'
import type { StageOp, StageView } from '../world-events/stage.ts'
import type { BoardSeat, NightPhase } from '../world-events/election-night.ts'

/** An AI resident helping with the event: always shown as AI. */
export interface EventHelper { name: string; steps: number; ai: true }
/** The week's event as everyone sees it (no answers, no ids of people). */
export interface WorldEventPublic {
  week: number; id: string; title: string; blurb: string; city: string; cityName: string; goal: GoalKind; target: number; venues: string[]
  questions: { id: string; q: string }[]
  change: { label: string; colours: [string, string] }
  announcedAt: number; warmupAt: number; startsAt: number; endsAt: number; phase: Phase
  count: number; percent: number; people: number; aiSteps: number; helpers: EventHelper[]; done: boolean; doneAt: number
  /** The surprise drop open in the Square now, with the places left. */
  drop: { id: string; closesAt: number; left: number } | null
  /** The gist line of the result (its number makes the share card), once the event has ended. */
  resultLine: { n: number; text: string } | null
}
/** A city that looks different for a week. */
export interface CityChangeView { city: string; label: string; colours: [string, string]; until: number; week: number }
export interface WorldEventView { now: number; schedule: Schedule; event: WorldEventPublic | null; changes: CityChangeView[] }
export interface EventBadge { week: number; title: string; city: string; at: number }
export interface WorldEventMine { steps: number; badge: boolean; carrying: number | null; answered: string[]; grabbed: string[]; badges: EventBadge[] }
export type EventStepOp = 'pickup' | 'drop' | 'answer' | 'grab'
export interface ElectionNightView { now: number; week: number; phase: NightPhase; debateAt: number; liveAt: number; closesAt: number; resultsEnd: number; seats: BoardSeat[]; debates: { scope: string; place: string; title: string; at: number }[]; speeches: { scope: string; name: string; text: string; at: number }[] }
export interface WorldEventsAdminView { schedule: Schedule; custom: WorldEventDef[]; hidden: string[]; builtIn: { id: string; title: string; city: string; goal: GoalKind }[]; next: { week: number; id: string; title: string; city: string; startsAt: number }[]; limits: { events: number } }
export type WorldEventsAdminAction = 'schedule.save' | 'event.save' | 'event.remove' | 'hide' | 'show' | 'drop' | 'stage.moderator' | 'stage.end'

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
export interface WorldEventsHttpRoutes {
  /** Public, cached a few seconds: the week's event, its bar and the cities that look different. */
  'GET /api/world/event': { response: Ok<WorldEventView>; errors: HostErrorCode }
  'GET /api/world/event/me': { response: Ok<WorldEventMine>; errors: E }
  'POST /api/world/event/step': { body: { op: EventStepOp; question?: string; answer?: string }; response: Done<{ code: string; count: number; mine: WorldEventMine }>; errors: E | 'invalid_op' }
  'GET /api/world/stage': { query: { room: string }; response: Ok<{ stage: StageView | null; canOpen: boolean }>; errors: E | 'invalid_room' }
  'POST /api/world/stage': { body: { room: string; op: StageOp | 'open'; target?: string; question?: string; text?: string; title?: string; minutes?: number }; response: Done<{ stage: StageView | null }>; errors: E | 'invalid_room' }
  'GET /api/world/election-night': { query: { city: string }; response: Ok<ElectionNightView>; errors: E | 'invalid_city' }
  'POST /api/world/election-night/speech': { body: { city: string; scope: string; text: string }; response: Done<{ code: string }>; errors: E }
  'POST /api/world/election-night/card': { body: { city: string; scope: string }; response: Done<{ n: number; text: string }>; errors: E }
  'GET /api/admin/world-events': { response: Ok<WorldEventsAdminView>; errors: E | 'not_found' }
  'POST /api/admin/world-events': { body: { action: WorldEventsAdminAction; item?: unknown; id?: string; room?: string; moderator?: string }; response: Done<{ summary: string }>; errors: E | 'not_found' | 'origin_required' | 'invalid_action' }
}

/** Pushed to the people in the Square and in a room with a stage (server/world-events/live.ts); the page also reads the routes. */
export type WorldLiveFrame =
  | { type: 'world-live'; kind: 'event'; week: number; count: number; percent: number; phase: Phase }
  | { type: 'world-live'; kind: 'stage'; room: string; rev: number }
  | { type: 'world-live'; kind: 'moment'; title: string; name: string; text: string; ai?: true }
  /** The social glue (docs/SOCIAL-GLUE.md): something of mine changed (close friends, a trip, a proposal, a talk went live); read it again. */
  | { type: 'world-live'; kind: 'glue'; what: 'close' | 'trip' | 'family' | 'talk' }
