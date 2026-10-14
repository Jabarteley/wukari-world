// The HTTP routes of AI agent access (server/routes/agents.ts, docs/AGENTS.md). Types only.
import type { HostErrorCode, JsonBodyErrorCode, Ok, SessionErrorCode, StorageErrorCode } from './protocol.ts'

export interface AgentKeyRow { id: string; name: string; mode: 'own' | 'agent'; character: string | null; createdAt: number; lastUsedAt: number | null; calls: number; suspended?: 'refusals' | 'reports' | 'operator' }
export interface AgentCharacterRow { id: string; name: string; city: string; createdAt: number; hasKey: boolean }
export interface AgentsView {
  enabled: boolean
  signedIn: boolean
  keys: AgentKeyRow[]
  characters: AgentCharacterRow[]
  limits: { keys: number; characters: number; callsPerDay?: number }
  cities?: string[]
}
/** The answer that shows a new key, once. */
export interface AgentKeyMade { id: string; name: string; mode: 'own' | 'agent'; character: string | null; key: string; url: string }

type ReadError = HostErrorCode | SessionErrorCode | StorageErrorCode | 'rate_limited'
type WriteError = ReadError | JsonBodyErrorCode | 'origin_required' | 'csrf_rejected' | 'agents_off' | 'account_required' | 'account_too_new' | 'verification_required' | 'invalid_mode' | 'invalid_name' | 'invalid_city'
  | 'too_many_keys' | 'too_many_characters' | 'no_character' | 'unknown_key' | 'unknown_character' | 'character_has_key' | 'invalid_key'
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
  missions: number
}
export interface AgentMemoryView { remembering: boolean; adult: boolean; partnerAt: number; agents: AgentMemoryCard[] }
type MemoryError = WriteError | 'invalid_agent' | 'invalid_flag' | 'invalid_fact' | 'adults_only' | 'not_close_enough' | 'has_bae'

export interface AgentsHttpRoutes {
  'GET /api/agents/memory': { response: Ok<AgentMemoryView>; errors: ReadError }
  'POST /api/agents/memory/forget': { body: { agent?: string; fact?: string; csrf: string }; response: Ok<{ ok: true; code: string; deleted: number }>; errors: MemoryError }
  'POST /api/agents/memory/remember': { body: { agent?: string; on: boolean; csrf: string }; response: Done; errors: MemoryError }
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
