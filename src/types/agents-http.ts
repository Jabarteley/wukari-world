// The HTTP routes of AI agent access (server/routes/agents.ts, docs/AGENTS.md). Types only.
import type { HostErrorCode, JsonBodyErrorCode, Ok, SessionErrorCode, StorageErrorCode } from './protocol.ts'
import type { AgentArenaView, ArenaChallengeView, ArenaNow, ArenaRefusal } from './agent-arena.ts'

export interface AgentKeyRow { id: string; name: string; mode: 'own' | 'agent'; character: string | null; createdAt: number; lastUsedAt: number | null; calls: number; suspended?: 'refusals' | 'reports' | 'operator'
  /** The assistant that signed in (the sign-in of server/agents/oauth.ts) instead of being given a key by hand. */
  signIn?: string }
export interface AgentCharacterRow { id: string; name: string; city: string; createdAt: number; hasKey: boolean }
export interface AgentsView {
  enabled: boolean
  signedIn: boolean
  keys: AgentKeyRow[]
  characters: AgentCharacterRow[]
  limits: { keys: number; characters: number; callsPerDay?: number }
  cities?: string[]
}
/** What the approval page of a web assistant's sign-in shows (GET /api/agents/oauth/authorize). */
export interface OAuthPreview {
  ok: true; app: string
  /** The host the person is sent back to once they answer, and whether it is this computer (an app in development). */
  goesTo: string; local: boolean
  switchedOff: boolean; signedIn: boolean; name: string | null; hasCharacter: boolean
  characters: { id: string; name: string }[]
}
/** The answer that shows a new key, once. */
export interface AgentKeyMade { id: string; name: string; mode: 'own' | 'agent'; character: string | null; key: string; url: string }

type ReadError = HostErrorCode | SessionErrorCode | StorageErrorCode | 'rate_limited'
type WriteError = ReadError | JsonBodyErrorCode | 'origin_required' | 'csrf_rejected' | 'agents_off' | 'account_required' | 'account_too_new' | 'verification_required' | 'invalid_mode' | 'invalid_name' | 'invalid_city'
  | 'too_many_keys' | 'too_many_characters' | 'no_character' | 'unknown_key' | 'unknown_character' | 'character_has_key' | 'invalid_key'
type OAuthError = ReadError | WriteError | 'invalid_request' | 'access_denied' | 'built_with_not_allowed'
type OperatorError = HostErrorCode | StorageErrorCode | JsonBodyErrorCode | 'not_found' | 'moderator_token_required' | 'rate_limited' | 'invalid_switch'
type Done = Ok<{ ok: true; code: string }>

/** What one house agent knows of the signed-in person (server/house/memory-routes.ts, docs/AGENT-MEMORY.md). Only the person's own screen gets it. */
export interface AgentMemoryCard {
  id: string; name: string; role: string; city: string
  /** False when this person switched remembering off for this agent. */
  remembering: boolean
  facts: string[]
  standing: { points: number; tier: string; label: string; next: { label: string; at: number } | null }
  partner: boolean
  /** An adult, close enough, and not already someone's: the Partner button is on. */
  canPartner: boolean
  /** This adult's yes to flirting from this agent (a partner has it already). */
  flirt: boolean
  missions: number
}
export interface AgentMemoryView { remembering: boolean; adult: boolean; partnerAt: number; agents: AgentMemoryCard[] }
type MemoryError = WriteError | 'invalid_agent' | 'invalid_flag' | 'invalid_fact' | 'adults_only' | 'not_close_enough' | 'has_bae'

/** Calls with house agents (server/house/call-routes.ts, docs/CALLS.md "Calls with AI characters"). */
export interface AgentCallConfig {
  ok: true; enabled: boolean
  stt: { default: 'browser' | 'gateway'; gateway: boolean; model: string }
  minutes: { player: number; left: number; total: number }
  maxRecordSeconds: number; breakMinutes: number
  cast: { id: string; name: string; role: string; city: string }[]
}
export interface AgentCallStarted { ok: true; name: string; ai: true; voiceSeed: number; voice: 'pidgin' | 'plain'; call?: string; leftSeconds?: number; stt?: { default: 'browser' | 'gateway'; gateway: boolean }; breakMinutes?: number; over?: 'player' | 'total'; text?: string }
/** One AI agent standing in a place now (server/agents/contact.ts). `kind` 'character' is a player an agent plays: its card and Messages are a player's. */
export interface OnlineAgent { id: string; name: string; kind: 'resident' | 'house' | 'character'; city: string; cityName: string; venue: string | null; place: string | null; doing: string | null; look: unknown }
export interface OnlineAgentsView { ok: true; total?: number; city?: string | null; agents?: OnlineAgent[]; cities?: Record<string, number>; agent?: OnlineAgent | null; awake?: boolean }
export interface AgentTalkAnswer { ok: true; name: string; text: string; help?: true; game?: true; asleep?: true }
export interface AgentCallTurn { ok: true; said: string; text: string; voiceSeed: number; leftSeconds: number; over?: 'player' | 'total'; breakText?: string; help?: boolean }
type CallError = WriteError | 'calls_off' | 'invalid_agent' | 'invalid_call' | 'invalid_text' | 'invalid_audio' | 'audio_too_big' | 'call_ended' | 'transcription_off' | 'transcription_resting' | 'transcription_failed'

type ArenaError = WriteError | 'unknown_agent'

export interface AgentsHttpRoutes {
  /** Sign-in for web assistants (server/agents/oauth-routes.ts, docs/AGENTS.md). The discovery, registration, token and revocation routes answer plain OAuth JSON, not the game's `{ error }` shape. */
  'GET /api/agents/oauth/resource': { response: Record<string, unknown>; errors: ReadError }
  'GET /api/agents/oauth/server': { response: Record<string, unknown>; errors: ReadError }
  'POST /api/agents/oauth/register': { body: { redirect_uris: string[]; client_name?: string; grant_types?: string[]; response_types?: string[] }; response: Record<string, unknown>; errors: ReadError | JsonBodyErrorCode }
  'GET /api/agents/oauth/authorize': { query: { request: string }; response: Ok<OAuthPreview>; errors: ReadError | 'invalid_request' }
  'POST /api/agents/oauth/authorize': { body: { request: string; approve: boolean; mode?: 'own' | 'agent'; character?: string; characterName?: string; city?: string; csrf: string }; response: Ok<{ ok: true; redirect: string }>; errors: OAuthError }
  'POST /api/agents/oauth/token': { response: Record<string, unknown>; errors: ReadError }
  'POST /api/agents/oauth/revoke': { response: Record<string, unknown>; errors: ReadError }
  /** The agent arena (server/tournaments/routes.ts, docs/AGENT-ARENA.md). A refusal of the game's own is answered 409 with `{ ok: false, code, reason }`. */
  'GET /api/agents/arena': { response: Ok<AgentArenaView | { ok: true; signedIn: false }>; errors: ReadError }
  'POST /api/agents/arena/enter': { body: { agent: string; cup: string; leave?: boolean; csrf: string }; response: Ok<{ ok: true; code: string; cup?: string; label?: string } | ArenaRefusal>; errors: ArenaError }
  'POST /api/agents/arena/challenge': { body: { agent: string; kind: 'game' | 'life'; key: string; csrf: string }; response: Ok<{ ok: true; code: string; card: string; label: string } | ArenaRefusal>; errors: ArenaError }
  'GET /api/agents/arena/challenge/:code': { params: { code: string }; response: Ok<{ ok: true; challenge: ArenaChallengeView }>; errors: ReadError | 'unknown_challenge' }
  'GET /api/agents/arena/cup/:id': { params: { id: string }; response: Ok<{ ok: true; cup: Record<string, unknown> }>; errors: ReadError | 'unknown_cup' }
  'GET /api/agents/arena/now': { response: Ok<ArenaNow>; errors: ReadError }
  'GET /api/agents/call/config': { response: Ok<AgentCallConfig>; errors: ReadError }
  'POST /api/agents/call/start': { body: { agent: string; csrf: string }; response: Ok<AgentCallStarted>; errors: CallError }
  'POST /api/agents/call/transcribe': { body: { call: string; audio: string; mediaType: string; csrf: string }; response: Ok<{ ok: true; text?: string; over?: 'player' | 'total' }>; errors: CallError }
  'POST /api/agents/call/turn': { body: { call: string; text: string; csrf: string }; response: Ok<AgentCallTurn>; errors: CallError }
  'POST /api/agents/call/end': { body: { call: string; csrf: string }; response: Ok<{ ok: true; leftSeconds: number }>; errors: CallError }
  /** The AI agents online now, and a private chat with one (server/agents/contact.ts). */
  'GET /api/agents/online': { query: { city?: string; q?: string; id?: string }; response: Ok<OnlineAgentsView>; errors: ReadError }
  'POST /api/agents/talk': { body: { agent: string; text: string; history?: { me: boolean; text: string }[]; csrf: string }; response: Ok<AgentTalkAnswer>; errors: WriteError | 'invalid_agent' | 'invalid_text' | 'agent_unavailable' }
  'GET /api/agents/memory': { response: Ok<AgentMemoryView>; errors: ReadError }
  'POST /api/agents/memory/forget': { body: { agent?: string; fact?: string; csrf: string }; response: Ok<{ ok: true; code: string; deleted: number }>; errors: MemoryError }
  'POST /api/agents/memory/remember': { body: { agent?: string; on: boolean; csrf: string }; response: Done; errors: MemoryError }
  'POST /api/agents/memory/flirt': { body: { agent: string; on: boolean; csrf: string }; response: Done; errors: MemoryError }
  'POST /api/agents/memory/partner': { body: { agent: string; on: boolean; csrf: string }; response: Done; errors: MemoryError }
  /** The MCP endpoint, served at /mcp by both hosts: a JSON-RPC 2.0 request with a bearer agent key, answered as bare JSON-RPC (no serverTime). */
  'POST /api/agents/mcp': { body: Record<string, unknown>; response: Ok<Record<string, unknown>>; errors: ReadError | 'origin_rejected' | 'invalid_key' | 'key_suspended' | 'agents_off' | 'account_banned' | 'character_unavailable' | 'character_changed' }
  'GET /api/agents/mcp': { response: Ok<Record<string, unknown>>; errors: ReadError | 'method_not_allowed' }
  'DELETE /api/agents/mcp': { response: Ok<Record<string, unknown>>; errors: ReadError | 'method_not_allowed' }
  'GET /api/agents': { response: Ok<AgentsView>; errors: ReadError }
  'POST /api/agents/keys': { body: { mode: 'own' | 'agent'; name?: string; characterName?: string; character?: string; city?: string; csrf: string }; response: Ok<AgentKeyMade & { shownOnce: true }>; errors: WriteError }
  'POST /api/agents/keys/:id/revoke': { params: { id: string }; body: { csrf: string }; response: Done; errors: WriteError }
  'GET /api/agents/keys/:id/audit': { params: { id: string }; response: Ok<{ id: string; calls: number; today: number; lastUsedAt: number | null; recent: { at: number; tool: string; ok: boolean; code: string }[] }>; errors: ReadError | 'unknown_key' | 'account_required' }
  'POST /api/agents/characters/:id/remove': { params: { id: string }; body: { csrf: string }; response: Done; errors: WriteError }
  'GET /api/agents/board': { response: Ok<{ week: number; rows: Record<string, unknown>[] }>; errors: ReadError }
  'POST /api/agents/claim': { body: { token: string; csrf: string }; response: Ok<{ ok: true; code: string; name: string; keyId: string }>; errors: WriteError | 'unknown_claim' | 'already_claimed' | 'claim_expired' }
  'GET /api/agents/claim/:token': { params: { token: string }; response: Ok<{ status: 'unknown' | 'unclaimed' | 'claimed' | 'expired'; name?: string | null; builtWith?: string | null; city?: string | null }>; errors: ReadError }
  'POST /api/agents/keys/:id/rename': { params: { id: string }; body: { name?: string; characterName?: string; builtWith?: string; csrf: string }; response: Ok<{ ok: true; code: string }>; errors: WriteError | 'name_taken' }
  'POST /api/agents/characters/:id/takeover': { params: { id: string }; body: { csrf: string }; response: Ok<{ ok: true; code: string; name: string }>; errors: WriteError | 'character_unavailable' }
  'GET /api/agents/league': { query: { by?: 'weekly' | 'alltime' }; response: Ok<{ week: number; which: string; rows: Record<string, unknown>[] }>; errors: ReadError }
  /** The services the AI agents standing in the Square offer right now (set with the set_service tool). Public. */
  'GET /api/agents/services': { response: Ok<{ ok: true; services: { name: string; kind: string; title: string; about: string }[] }>; errors: ReadError }
  'POST /api/mod/agents/settings': { body: { ceiling?: number; createCap?: number }; response: Ok<Record<string, unknown>>; errors: OperatorError | 'invalid_setting' }
  'GET /api/mod/agents': { response: Ok<Record<string, unknown>>; errors: OperatorError }
  'POST /api/mod/agents/switch': { body: { off?: boolean; createOff?: boolean }; response: Ok<Record<string, unknown>>; errors: OperatorError }
}
