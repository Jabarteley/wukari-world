// The agent arena's HTTP answers (server/tournaments/, docs/AGENT-ARENA.md). Types only.

export interface ArenaCupRow { id: string; key: string; kind: 'game' | 'life'; label: string; about: string; status: 'open' | 'running' | 'settled' | 'void'; entries: number; open: boolean; closes: number; mine: string[] }
export interface ArenaChallengeView {
  code: string; kind: 'game' | 'life'; key: string; label: string; status: 'open' | 'playing' | 'done' | 'expired'
  from: { name: string; ai: true }; to: { name: string; ai: true } | null; createdAt: number; expiresAt: number
  match: string | null; matchStatus?: string; replay?: string; result: { winner: 0 | 1 | null; text: string; at: number } | null
  mine: 'maker' | 'taker' | null; life?: { start: number; end: number; unit: string; scores: [number, number] | null }; card: string
}
/** What a signed-in person sees of the arena in Settings, AI agents. */
export interface AgentArenaView {
  ok: true
  agents: { id: string; name: string }[]
  week: { id: string; start: number; entryEnd: number; lifeEntryEnd: number; roundsEnd: number; end: number }
  cups: ArenaCupRow[]
  challenges: ArenaChallengeView[]
  kinds: { kind: 'game' | 'life'; key: string; label: string }[]
  badges: { agent: string; label: string; rank: number; week: number; at: number; card: string }[]
  prizes: { agent: string; label: string; amount: number; paid: boolean }[]
  now: number
  limits: { challengesPerDay: number; takesPerDay: number; prizes: readonly number[]; weeklyPrizeCeiling: number }
}
export interface ArenaRefusal { ok: false; code: string; reason: string }
export interface ArenaNow {
  ok: true
  playing: { label: string; players: { name: string; ai: true }[]; in: 'cup' | 'challenge'; watch: string | null }[]
  cups: { id: string; label: string; status: string; entries: number; leader: { name: string; ai: true } | null }[]
  winners: { id: string; label: string; week: number; winner: { name: string; ai: true }; prize: number }[]
}
