// AI Spaces over HTTP (server/routes/spaces.ts; docs/SPACES.md). Answers are { ok: true, code, … } or { ok: false, code, reason }
// with HTTP 200; a malformed request is 400. Types, and the model limits both sides share.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { PackedPlan, SpacePlanV1, SpaceProblem, SpaceTarget } from '../spaces/plan.ts'
import type { LiteGameV1 } from '../arena/lite/schema.ts'

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'invalid_target' | 'invalid_room'
type Refused = { ok: false; code: string; reason: string }
export interface SpaceDesign { ok: true; code: 'designed' | 'checked'; plan: SpacePlanV1; problems: SpaceProblem[]; cost: number; cash: number | null; space: { grid: number; owned: boolean }; model?: string; costMicro?: number }
type Where = { target: SpaceTarget; roomId?: string }

/** Players' 3D models (server/spaces/models.ts, docs/SPACES-3D.md). */
export const MODELS = Object.freeze({ perPlayer: 30, bytesPerPlayer: 300_000_000, uploadsPerHour: 10, name: 40, reportsToHide: 3 })
export interface ModelView { id: string; by: string; name: string; hash: string; bytes: number; triangles: number; textures: number; size: [number, number, number]; min: [number, number, number]; animations: number; skinned: boolean; hidden: boolean; at: number }
export interface ModelsMine { ok: true; code: 'ok'; on: boolean; ready: boolean; canUpload: boolean; why: string | null; models: ModelView[]; used: { count: number; bytes: number }; limits: { count: number; bytes: number; file: number; triangles: number } }
export interface PlacedModel { k: string; m: string; by: string; hash: string; x: number; y: number; z: number; ry: number; s: number; floor: number; loose?: true; name: string; size: [number, number, number]; triangles: number }
export interface WorldItem { itemId: string; x: number; y: number; rot: number; floor?: number }
/** A world's open ground (docs/WORLDS.md): there is no house; `ground` names its surface (src/spaces/worlds.ts WORLD_GROUNDS). */
export interface WorldTerrain { ground: string; size: string; open: string; blurb: string }
export interface WorldView { ok: true; code: 'ok'; world: { key: string; kind: 'home' | 'room' | 'world'; title: string; owner: { id: string; name: string }; grid: number; owned: boolean; plot: { w: number; d: number; floors: number }; style: object | null; items: WorldItem[]; canEdit: boolean; models: PlacedModel[]; mine: ModelView[]; limits: { placements: number; triangles: number }; scripts: boolean; script?: { code: string; lines: string[] }; terrain?: WorldTerrain } }
/** A world in a list (server/spaces/worlds.ts). `cover`: the first letters of its cover's hash (a cache key), or null without one. */
export interface WorldCard { id: string; name: string; blurb: string; by: { id: string; name: string }; size: string; ground: string; open: string; visits: number; here: number; cover: string | null; at: number; updated: number; mine: boolean }
export interface WorldsList { ok: true; code: 'ok'; worlds: WorldCard[]; mine: number; limit: number }
type ModelDone = Ok<{ ok: true; code: 'uploaded' | 'already' | 'renamed'; model: ModelView } | Refused>
export interface HostView { kind: 'butler' | 'dj' | 'quizmaster' | 'gateman' | null; persona: string; on: boolean; name: string | null; kinds: { id: string; label: string; name: string }[] }
export interface LiteSummary { id: string; title: string; seats: { min: number; max: number }; win: string; controls: string; mine: boolean }
export interface SpacesHttpRoutes {
  'GET /api/spaces/status': { response: Ok<{ ok: true; code: 'ok'; ai: boolean }>; errors: E }
  'POST /api/spaces/design': { body: Where & { prompt: string; keep?: boolean }; response: Ok<SpaceDesign | Refused>; errors: E | 'invalid_prompt' }
  'POST /api/spaces/check': { body: Where & { plan: PackedPlan | SpacePlanV1 }; response: Ok<SpaceDesign | Refused>; errors: E }
  'GET /api/spaces/host': { response: Ok<{ ok: true; code: 'ok'; ai: boolean; host: HostView }>; errors: E }
  'POST /api/spaces/host': { body: { kind: HostView['kind']; persona?: string; on: boolean }; response: Ok<{ ok: true; code: 'saved' | 'removed'; host: HostView } | Refused>; errors: E | 'invalid_kind' | 'invalid_on' }
  'GET /api/spaces/games': { response: Ok<{ ok: true; code: 'ok'; games: LiteSummary[] }>; errors: E }
  'GET /api/spaces/game': { response: Ok<{ ok: true; code: 'ok'; def: LiteGameV1 } | Refused>; errors: E }
  'POST /api/spaces/games': { body: { def: unknown }; response: Ok<{ ok: true; code: 'imported'; game: LiteSummary } | (Refused & { problems?: string[] })>; errors: E }
  'GET /api/spaces/models': { response: Ok<ModelsMine>; errors: E }
  'POST /api/spaces/models': { body: Uint8Array; response: ModelDone; errors: E | 'type_not_accepted' | 'body_too_large' }
  'POST /api/spaces/models/rename': { body: { id: string; name: string }; response: ModelDone; errors: E }
  'POST /api/spaces/models/delete': { body: { id: string }; response: Ok<{ ok: true; code: 'deleted' } | Refused>; errors: E }
  'POST /api/spaces/models/report': { body: { by: string; id: string }; response: Ok<{ ok: true; code: 'reported' } | Refused>; errors: E }
  'GET /api/spaces/model-file/:hash': { params: { hash: string }; response: Ok<Record<string, never>>; errors: E | 'unknown_model' }
  'GET /api/mod/spaces/models': { response: Ok<Record<string, unknown>>; errors: E }
  'POST /api/mod/spaces/switch': { body: { models?: boolean; world?: boolean; scripts?: boolean }; response: Ok<Record<string, unknown>>; errors: E | 'invalid_value' }
  'POST /api/mod/spaces/models': { body: { by: string; id: string; action: 'remove' | 'hide' | 'clear' }; response: Ok<Record<string, unknown>>; errors: E }
  'GET /api/spaces/world': { response: Ok<WorldView | Refused>; errors: E | 'invalid_host' }
  'POST /api/spaces/world/script': { body: { target: SpaceTarget; id?: string; code: string; lines?: string[] }; response: Ok<{ ok: true; code: 'saved' | 'removed'; lines?: number } | Refused>; errors: E }
  'POST /api/spaces/world/layout': { body: { target: SpaceTarget; id?: string; models: Omit<PlacedModel, 'name' | 'size' | 'triangles'>[] }; response: Ok<{ ok: true; code: 'saved'; placed: number; triangles: number } | Refused>; errors: E }
  'POST /api/spaces/apply': { body: Where & { plan: PackedPlan | SpacePlanV1; requestId: string }; response: Ok<{ ok: true; code: 'applied'; placed: number; spent: number; problems: SpaceProblem[] } | Refused>; errors: E | 'invalid_request_id' }
  'GET /api/spaces/worlds': { response: Ok<WorldsList | Refused>; errors: E }
  'POST /api/spaces/worlds': { body: { name: string; blurb?: string; size?: string; ground?: string; open?: string }; response: Ok<{ ok: true; code: 'created'; world: WorldCard } | Refused>; errors: E }
  'POST /api/spaces/worlds/update': { body: { id: string; name?: string; blurb?: string; ground?: string; open?: string }; response: Ok<{ ok: true; code: 'saved'; world: WorldCard } | Refused>; errors: E }
  'POST /api/spaces/worlds/delete': { body: { id: string }; response: Ok<{ ok: true; code: 'deleted' } | Refused>; errors: E }
  'POST /api/spaces/worlds/cover': { body: Uint8Array; response: Ok<{ ok: true; code: 'saved'; cover: string } | Refused>; errors: E | 'type_not_accepted' | 'body_too_large' }
  'GET /api/spaces/world-cover/:id': { params: { id: string }; response: Ok<Record<string, never>>; errors: E | 'unknown_world' }
}

// Together in a space (server/ws/spaces.ts, docs/SPACES-3D.md phase 5). `p` is [x, y, z, yaw]; `o` rows are [index, x, y, z, qx, qy, qz, qw]
// by the placement's index in the space's layout; `say` is [line index, …numbers].
export interface SpaceJoinFrame { type: 'space-join'; target: SpaceTarget | 'world'; host?: string; id?: string }
export interface SpaceTickFrame { type: 'space-tick'; p: number[]; o?: number[][]; s?: number; say?: number[] }
export interface SpaceLeaveFrame { type: 'space-leave' }
export type SpaceClientFrame = SpaceJoinFrame | SpaceTickFrame | SpaceLeaveFrame
export interface SpaceRoomFrame { type: 'space-room'; key: string; you: string; host: string | null; members: { id: string; name: string }[] }
export interface SpacePeerFrame { type: 'space-peer'; id: string; p: number[]; o?: number[][]; s?: number; say?: number[] }
export type SpaceServerFrame = SpaceRoomFrame | SpacePeerFrame
