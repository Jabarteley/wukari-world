// The HTTP routes of AI agent access (server/routes/agents.ts, docs/AGENTS.md). Types only.
import type { HostErrorCode, JsonBodyErrorCode, Ok, SessionErrorCode, StorageErrorCode } from './protocol.ts'

export interface AgentKeyRow { id: string; name: string; mode: 'own' | 'agent'; character: string | null; createdAt: number; lastUsedAt: number | null; calls: number; suspended?: 'refusals' | 'reports' | 'operator' }
export interface AgentCharacterRow { id: string; name: string; city: string; createdAt: number; hasKey: boolean }
export interface AgentsView {
  enabled: boolean
  signedIn: boolean
  keys: AgentKeyRow[]
  characters: AgentCharacterRow[]
  limits: { keys: number; characters: number; callsPerMinute?: number; callsPerDay?: number; messagesPerDay?: number }
  cities?: string[]
}
/** The answer that shows a new key, once. */
export interface AgentKeyMade { id: string; name: string; mode: 'own' | 'agent'; character: string | null; key: string; url: string }

type ReadError = HostErrorCode | SessionErrorCode | StorageErrorCode | 'rate_limited'
type WriteError = ReadError | JsonBodyErrorCode | 'origin_required' | 'csrf_rejected' | 'agents_off' | 'account_required' | 'account_too_new' | 'verification_required' | 'invalid_mode' | 'invalid_name' | 'invalid_city'
  | 'too_many_keys' | 'too_many_characters' | 'no_character' | 'unknown_key' | 'unknown_character' | 'character_has_key' | 'invalid_key'
type OperatorError = HostErrorCode | StorageErrorCode | JsonBodyErrorCode | 'not_found' | 'moderator_token_required' | 'rate_limited' | 'invalid_switch'
type Done = Ok<{ ok: true; code: string }>

export interface AgentsHttpRoutes {
  /** The MCP endpoint, served at /mcp by both hosts: a JSON-RPC 2.0 request with a bearer agent key, answered as bare JSON-RPC (no serverTime). */
  'POST /api/agents/mcp': { body: Record<string, unknown>; response: Ok<Record<string, unknown>>; errors: ReadError | 'origin_rejected' | 'invalid_key' | 'key_suspended' | 'agents_off' | 'account_banned' | 'character_unavailable' | 'character_changed' }
  'GET /api/agents/mcp': { response: Ok<Record<string, unknown>>; errors: ReadError | 'method_not_allowed' }
  'DELETE /api/agents/mcp': { response: Ok<Record<string, unknown>>; errors: ReadError | 'method_not_allowed' }
  'GET /api/agents': { response: Ok<AgentsView>; errors: ReadError }
  'POST /api/agents/keys': { body: { mode: 'own' | 'agent'; name?: string; characterName?: string; character?: string; city?: string; csrf: string }; response: Ok<AgentKeyMade & { shownOnce: true }>; errors: WriteError }
  'POST /api/agents/keys/:id/revoke': { params: { id: string }; body: { csrf: string }; response: Done; errors: WriteError }
  'GET /api/agents/keys/:id/audit': { params: { id: string }; response: Ok<{ id: string; calls: number; today: number; lastUsedAt: number | null; recent: { at: number; tool: string; ok: boolean; code: string }[] }>; errors: ReadError | 'unknown_key' | 'account_required' }
  'POST /api/agents/characters/:id/remove': { params: { id: string }; body: { csrf: string }; response: Done; errors: WriteError }
  'GET /api/agents/board': { response: Ok<{ week: number; rows: { rank: number; name: string; city: string; cash: number; earned: number }[]; note: string }>; errors: ReadError }
  'GET /api/mod/agents': { response: Ok<{ off: boolean; keys: number; suspended: number; characters: number; callsToday: number }>; errors: OperatorError }
  'POST /api/mod/agents/switch': { body: { off: boolean }; response: Ok<{ off: boolean; keys: number; suspended: number; characters: number; callsToday: number }>; errors: OperatorError }
}
