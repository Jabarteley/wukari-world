// The operator's switches (server/routes/switches-mod.ts): features that ship off, turned on with the operator's token.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'

type E = HostErrorCode | JsonBodyErrorCode | 'not_found' | 'rate_limited' | 'storage_unavailable'
export interface SwitchesHttpRoutes {
  'POST /api/mod/switches': { body: { nysc?: boolean; jamb?: boolean; danfo3d?: boolean; haggle?: boolean; skit?: boolean; story?: boolean; safety?: boolean; spacesAi?: boolean; hosts?: boolean; earn?: boolean }; response: Ok<Record<string, unknown>>; errors: E | 'invalid_value' }
  'POST /api/mod/switches/house': { body: { room?: string; mates?: number; now?: boolean; cities?: string[] }; response: Ok<{ ok: true; code: 'started'; summary: string } | { ok: false; code: string; reason: string }>; errors: E }
}
