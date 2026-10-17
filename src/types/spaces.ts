// AI Spaces over HTTP (server/routes/spaces.ts; docs/SPACES.md). Answers are { ok: true, code, … } or { ok: false, code, reason }
// with HTTP 200; a malformed request is 400. Types only.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { PackedPlan, SpacePlanV1, SpaceProblem, SpaceTarget } from '../spaces/plan.ts'

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'invalid_target' | 'invalid_room'
type Refused = { ok: false; code: string; reason: string }
export interface SpaceDesign { ok: true; code: 'designed' | 'checked'; plan: SpacePlanV1; problems: SpaceProblem[]; cost: number; cash: number | null; space: { grid: number; owned: boolean }; model?: string; costMicro?: number }
type Where = { target: SpaceTarget; roomId?: string }

export interface SpacesHttpRoutes {
  'GET /api/spaces/status': { response: Ok<{ ok: true; code: 'ok'; ai: boolean }>; errors: E }
  'POST /api/spaces/design': { body: Where & { prompt: string; keep?: boolean }; response: Ok<SpaceDesign | Refused>; errors: E | 'invalid_prompt' }
  'POST /api/spaces/check': { body: Where & { plan: PackedPlan | SpacePlanV1 }; response: Ok<SpaceDesign | Refused>; errors: E }
  'POST /api/spaces/apply': { body: Where & { plan: PackedPlan | SpacePlanV1; requestId: string }; response: Ok<{ ok: true; code: 'applied'; placed: number; spent: number; problems: SpaceProblem[] } | Refused>; errors: E | 'invalid_request_id' }
}
