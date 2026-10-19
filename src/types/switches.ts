// The operator's switches (server/routes/switches-mod.ts): features that ship off, turned on with the operator's token.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'

/** The body fields of POST /api/mod/switches (server/routes/switches-mod.ts, OPERATOR_SWITCHES). */
export type OperatorSwitch = 'nysc' | 'jamb' | 'danfo3d' | 'haggle' | 'skit' | 'story' | 'safety' | 'spacesAi' | 'hosts' | 'earn'
  | 'residents' | 'residentsShadow' | 'residentPrayers' | 'calls' | 'callsStt' | 'houseAgents' | 'houseTalk' | 'houseMemory' | 'houseMemoryModel'
  | 'aiFollow' | 'aiHighlights' | 'aiRoles' | 'haggleModel' | 'hostModel' | 'chatPictures' | 'chatPush' | 'feedMedia' | 'houseCopy' | 'danfo' | 'launchBonus'
type E = HostErrorCode | JsonBodyErrorCode | 'not_found' | 'rate_limited' | 'storage_unavailable'
export interface SwitchesHttpRoutes {
  'GET /api/mod/switches': { response: Ok<Record<string, unknown>>; errors: E }
  'POST /api/mod/switches': { body: Partial<Record<OperatorSwitch, boolean>>; response: Ok<Record<string, unknown>>; errors: E | 'invalid_value' }
  'POST /api/mod/switches/house': { body: { room?: string; mates?: number; now?: boolean; cities?: string[] }; response: Ok<{ ok: true; code: 'started'; summary: string } | { ok: false; code: string; reason: string }>; errors: E }
}
