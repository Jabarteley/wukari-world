import type { PlayerRef, HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { StoryHelpKind } from './story.ts'

export interface HelpQuestion {
  prompt: string
  options: Array<{ id: string; label: string }>
  answered: boolean
}

export interface HelpTable {
  cards: Array<number | null>
  found: number[]
  turn: 'host' | 'helper'
  team: number
  house: number
  played: { host: number; helper: number }
  last: number[]
  result: 'playing' | 'lost'
}

export interface HelpSessionView {
  id: string
  host: PlayerRef
  helper: PlayerRef
  city: string
  cityName: string
  venue: string
  label: string
  kind: StoryHelpKind
  status: 'offered' | 'active' | 'completed' | 'ended' | 'expired'
  expiresAt: number
  role: 'host' | 'helper'
  joined: boolean
  question: HelpQuestion | null
  table: HelpTable | null
  errand: { mission: string; rewardId: string | null } | null
}

export interface StoryHelpView {
  ok: true
  enabled: boolean
  remainingCalls: number
  challenge: { episodeId: string; venue: string; canCall: boolean; reason: string | null } | null
  friends: PlayerRef[]
  sessions: HelpSessionView[]
}

export interface StoryHelpResult { ok: boolean; code: string; reason?: string; id?: string }

export interface SignatureItemView {
  label: string
  list: number
  ask: number
  rounds: number
  deal: number | null
}

export interface SignatureGameView {
  ok: true
  enabled: boolean
  available: boolean
  reason: string | null
  city: string
  venue: string | null
  label: string
  item: SignatureItemView | null
  code?: 'offer_checked' | 'bargain_restarted'
  verdict?: { kind: 'accept' | 'counter' | 'refuse' | 'final'; price: number }
  duplicate?: true
}

export interface SignatureFailure { ok: false; code: string; reason?: string }
export type SignatureResult = SignatureGameView | SignatureFailure

type E = HostErrorCode | JsonBodyErrorCode | 'character_required' | 'invalid_help_session' | 'invalid_help_challenge' | 'invalid_answer' | 'help_reward_unavailable' | 'invalid_offer' | 'invalid_request_id'
type Command = { clientId: string; id: string }
export interface StoryHttpRoutes {
  'GET /api/story/help': { response: Ok<StoryHelpView>; errors: E }
  'POST /api/story/help': { body: { clientId: string; to: string; kind: StoryHelpKind; episodeId: string; chapter: 3 }; response: Ok<StoryHelpResult>; errors: E }
  'POST /api/story/help/join': { body: Command; response: Ok<StoryHelpResult>; errors: E }
  'POST /api/story/help/answer': { body: Command & { answer: string }; response: Ok<StoryHelpResult>; errors: E }
  'POST /api/story/help/seat': { body: Command & { cards?: [number, number]; restart?: boolean }; response: Ok<StoryHelpResult>; errors: E }
  'POST /api/story/help/errand': { body: Command & { rewardId: string }; response: Ok<StoryHelpResult>; errors: E }
  'POST /api/story/help/end': { body: Command; response: Ok<StoryHelpResult>; errors: E }
  'GET /api/story/signature': { response: Ok<SignatureGameView>; errors: E }
  'POST /api/story/signature': { body: { clientId: string; offer?: number; reset?: true }; response: Ok<SignatureResult>; errors: E }
}
