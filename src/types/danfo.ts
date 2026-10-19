// OWNER: danfo. Drive a danfo (docs/DANFO.md): the motor park, a run, its crew, the weekly board. Game naira only, settled by the server.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { DanfoVehicle } from '../danfo/routes.ts'
import type { StopCall } from '../danfo/run.ts'
import type { BoardRow } from '../danfo/board.ts'

export type DanfoRole = 'passenger' | 'conductor'
export type DanfoRunStatus = 'live' | 'settled' | 'void' | 'closed'
export interface DanfoLineView {
  id: string; name: string; road: string; vehicle: DanfoVehicle; stops: string[]; km: number
  /** This week's first place on the line, if anyone has driven it. */
  best: { name: string; earned: number; ms: number } | null
}
export interface DanfoCrewView { name: string; role: DanfoRole; you: boolean }
export interface DanfoShout { at: number; line: string; by: string }
export interface DanfoResult {
  /** What the run earned by the rules; `paid` is what reached the wallet after the day's cap. */
  earned: number; paid: number; fares: number; drops: number; timeBonus: number; crewBonus: number; penalties: number
  hardBrakes: number; crashes: number; passed: number; ms: number
  /** Place on the line's weekly board (0: not on it). */
  place: number
  capped: boolean
}
export interface DanfoRunView {
  id: string; routeId: string; city: string; seed: string; traffic: number; startedAt: number; status: DanfoRunStatus
  /** The next stop the server expects (1 … last). */
  next: number; calls: StopCall[]
  driver: string; you: 'driver' | DanfoRole | null
  crew: DanfoCrewView[]; shouts: DanfoShout[]
  result: DanfoResult | null
  /** Why a run was voided ('too_fast', 'expired'). */
  reason?: string
  /** For a conductor: the share collected, or null while it is still to collect. */
  share?: number | null
}
export interface DanfoLeaving { id: string; routeId: string; driver: string; next: number; crew: number; conductor: boolean }
export interface DanfoPark {
  open: boolean; city: string; hub: string
  lines: DanfoLineView[]
  today: { earned: number; runs: number }
  caps: { run: number; day: number; runs: number }
  mine: DanfoRunView | null
  riding: DanfoRunView | null
  leaving: DanfoLeaving[]
  /** The 3D road view is switched on (admin setting `danfo3d`); weak devices still get the 2D lanes. */
  view3d: boolean
  traffic: number
}

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable' | 'invalid_request'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
export interface DanfoHttpRoutes {
  'GET /api/danfo/park': { query: { city: string }; response: Done<DanfoPark>; errors: E }
  'POST /api/danfo/start': { body: { cityId: string; routeId: string; requestId: string }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/stop': { body: { runId: string; stop: number; call: StopCall }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/finish': { body: { runId: string; requestId: string; hardBrakes: number; crashes: number }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/abandon': { body: { runId: string }; response: Done<{ run: DanfoRunView }>; errors: E }
  'GET /api/danfo/run': { query: { id: string }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/join': { body: { runId: string; role: DanfoRole }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/leave': { body: { runId: string }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/shout': { body: { runId: string }; response: Done<{ run: DanfoRunView }>; errors: E }
  'POST /api/danfo/collect': { body: { runId: string; requestId: string }; response: Done<{ run: DanfoRunView; paid: number }>; errors: E }
  'GET /api/danfo/board': { query: { route: string }; response: Done<{ route: string; week: number; rows: Omit<BoardRow, 'id'>[]; you: number }>; errors: E }
}
