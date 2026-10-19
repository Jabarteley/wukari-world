export interface TalkHistoryLine {
  from: 'player' | 'npc'
  text: string
}

export type TalkAccounting =
  | { kind: 'zero'; routerCalls: 0 | 1; costMicro: 0 }
  | { kind: 'live'; routerCalls: 1; costMicro: number }
  | { kind: 'unknown'; routerCalls: 1; cost: 'unknown' }

export type TalkResult =
  | {
      kind: 'reply'
      source: 'bank' | 'live' | 'fallback' | 'cache'
      name: string
      ai: true
      text: string
      phrase?: { lang: string; text: string; gloss: string; beta: true }
      accounting: TalkAccounting
    }
  | { kind: 'notice'; source: 'game'; notice: 'identity' | 'crisis'; text: string; accounting: { kind: 'zero'; routerCalls: 0; costMicro: 0 } }
  | { kind: 'rejected'; reason: 'invalid-client' | 'nonce-conflict' | 'capacity' | 'bank-invalid' | 'already-attempted'; accounting: { kind: 'zero'; routerCalls: 0; costMicro: 0 } }
  | { kind: 'cancelled'; reason: 'actor-forgotten' | 'generation-invalidated' | 'authority-changed'; accounting: TalkAccounting }

export type StoryTalkRegular = { id: string; name: string; role: string; ai: true; ambient?: string[] }

export type StoryTalkView =
  | { ok: true; enabled: false; reason: string }
  | { ok: true; enabled: true; city: { id: string; name: string }; venue: { id: string; name: string; status: string }; regulars: StoryTalkRegular[]; available: boolean; reason: string | null }

export type StoryTalkTurn =
  | { ok: true; city: string; venue: string; npc: string; result: TalkResult }
  | { ok: false; code: 'unavailable' | 'place-changed' | 'bank-unavailable'; reason: string; accounting: TalkAccounting }
