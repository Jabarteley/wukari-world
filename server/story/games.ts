import type { StoryHelpKind } from '../../src/types/story.ts'

export type StoryHelpProof =
  | { kind: 'second-answer'; host: boolean; helper: boolean }
  | { kind: 'two-seat'; board: number[]; found: number[]; turn: 'host' | 'helper'; team: number; house: number; played: { host: number; helper: number }; last: number[]; result: 'playing' | 'lost' }
  | { kind: 'errand'; before: string[]; rewardId: string | null }

export function helpProof(kind: StoryHelpKind, seed: string): StoryHelpProof {
  if (kind === 'second-answer') return { kind, host: false, helper: false }
  if (kind === 'errand') return { kind, before: [], rewardId: null }
  const board = [0, 0, 1, 1, 2, 2, 3, 3]
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0
  for (let i = board.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0
    const j = h % (i + 1), a = board[i]!
    board[i] = board[j]!; board[j] = a
  }
  return { kind, board, found: [], turn: 'host', team: 0, house: 0, played: { host: 0, helper: 0 }, last: [], result: 'playing' }
}

export function playHelpTable(proof: Extract<StoryHelpProof, { kind: 'two-seat' }>, role: 'host' | 'helper', cards: unknown): { ok: boolean; code: string; won?: boolean } {
  if (proof.result !== 'playing') return { ok: false, code: 'table_finished' }
  if (proof.turn !== role) return { ok: false, code: 'other_seat_turn' }
  if (!Array.isArray(cards) || cards.length !== 2 || !cards.every((n): n is number => Number.isSafeInteger(n) && n >= 0 && n < 8)
    || cards[0] === cards[1] || cards.some(n => proof.found.includes(n))) return { ok: false, code: 'invalid_cards' }
  const [a, b] = cards as [number, number]
  proof.last = [a, b]
  proof.played[role] += 1
  if (proof.board[a] === proof.board[b]) { proof.team += 1; proof.found.push(a, b) }
  // The house makes its own deterministic pair choice after each seat's turn.
  const free = proof.board.map((_, i) => i).filter(i => !proof.found.includes(i))
  if (free.length >= 2) {
    const step = proof.played.host + proof.played.helper
    const x = free[step % free.length]!, y = free[(step + 1) % free.length]!
    if (proof.board[x] === proof.board[y]) { proof.house += 1; proof.found.push(x, y) }
    proof.last.push(x, y)
  }
  proof.turn = role === 'host' ? 'helper' : 'host'
  const won = proof.team >= 2 && proof.team > proof.house && proof.played.host > 0 && proof.played.helper > 0
  if (!won && proof.found.length === 8) proof.result = 'lost'
  return { ok: true, code: won ? 'table_won' : proof.result === 'lost' ? 'table_lost' : 'seat_played', won }
}
