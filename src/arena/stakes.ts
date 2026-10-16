/**
 * OWNER: games (real-time)
 * STAKES IN THE ARENA, pure (no clock, no I/O): game naira on a live match, by the two people playing it and by the people watching.
 * The money moves in server/growth/arena-stakes.ts through the same server-only life action as table stakes ('tables.server'), so
 * every rule of src/game/table-stakes.ts holds: game naira only, never real money, never cashed out; adults only; only money the
 * player worked for and has not passed on (the gift rule); and the same day limits (TABLE_STAKES), which arena and table stakes
 * share.
 *
 * PLAYERS. The host of a room may set a stake in the lobby (one of TABLE_STAKES.choices). It is played only between exactly two
 * people, never against a computer seat: a room with a bot, or with more than two people, plays free. The winner takes the prize
 * (both stakes); a draw, or a match nobody moved in, gives both back; a player who leaves or forfeits has lost.
 * BACKERS. Someone watching (not seated) may back one seat, a person, an agent or a house bot, with BACK_CHOICES, once a match,
 * while the room is in its lobby or in the first BACK_WINDOW_TICKS seconds of play. The winner's backers share the prize: everything
 * all backers put in, in proportion to what each put in. A draw, a match nobody backed the other side of, or a match with no single
 * winner gives every backer their stake back. Nobody is shown how much is on each side, and there are no odds.
 *
 * WORDS. "Stake", "prize", "back", "play for". Never the words a betting site uses (FORBIDDEN_WORDS; the tests check every line).
 */
import { naira } from '../game/util.ts'

/** What each player may put in; 0 is a free game (TABLE_STAKES.choices, src/game/content/growth.ts). */
export const PLAY_CHOICES: readonly number[] = [0, 100, 500, 1000, 2000]
/** What a watcher may back a seat with. */
export const BACK_CHOICES: readonly number[] = [100, 500]
/** Backing closes this many seconds into a match (it is open in the lobby). */
export const BACK_WINDOW_SECONDS = 10
/** At most this many backers per match (the record stays small). */
export const MAX_BACKERS = 40

export const PLAY_MONEY = 'Play money only: game naira, never real money.'

export const isPlayStake = (value: unknown): value is number => typeof value === 'number' && PLAY_CHOICES.includes(value)
export const isBackStake = (value: unknown): value is number => typeof value === 'number' && BACK_CHOICES.includes(value)

/** A room plays for its stake only with exactly two people and no computer seat. */
export const stakeHolds = (seats: readonly { bot: boolean }[]): boolean => seats.length === 2 && seats.every((s) => !s.bot)

/** "Play for ₦500 each: the winner takes the ₦1,000 prize", or "Free game". */
export const playLine = (stake: number): string => (stake > 0 ? `Play for ${naira(stake)} each: the winner takes the ${naira(stake * 2)} prize` : 'Free game')
/** What backing says before it is pressed. */
export const backLine = (name: string, amount: number): string => `Back ${name} with ${naira(amount)}. If ${name} wins, ${name}'s backers share the prize.`

export interface Back { id: string; seat: number; amount: number }
/** Who gets what when a match ends: per backer id, the naira paid back (0 = lost), and whether it was a refund. */
export interface BackPayout { id: string; paid: number; refund: boolean; stake: number }

/**
 * Settle the backers of a match. `winner` is the single winning seat, or null (a draw, no result). Whole naira only: shares are
 * rounded down and what rounding leaves goes to the winning backers who put in most (the earliest first), so the prize is paid
 * out exactly and never more than was put in.
 */
export function settleBacks(backs: readonly Back[], winner: number | null): BackPayout[] {
  const total = backs.reduce((sum, b) => sum + b.amount, 0)
  const winning = winner === null ? [] : backs.filter((b) => b.seat === winner)
  const onWinner = winning.reduce((sum, b) => sum + b.amount, 0)
  if (winner === null || onWinner === 0 || onWinner === total) return backs.map((b) => ({ id: b.id, paid: b.amount, refund: true, stake: b.amount }))
  const paid = new Map<Back, number>()
  let given = 0
  for (const b of winning) { const share = Math.floor((total * b.amount) / onWinner); paid.set(b, share); given += share }
  const order = winning.map((b, i) => ({ b, i })).sort((x, y) => y.b.amount - x.b.amount || x.i - y.i)
  for (let left = total - given, k = 0; left > 0 && order.length; left--, k++) { const b = (order[k % order.length] as { b: Back }).b; paid.set(b, (paid.get(b) ?? 0) + 1) }
  return backs.map((b) => ({ id: b.id, paid: paid.get(b) ?? 0, refund: false, stake: b.amount }))
}

/** What a finished match did for one of the two players who played for a stake. */
export function playOutcome(stake: number, outcome: 'won' | 'lost' | 'refunded'): string {
  if (outcome === 'won') return `You won the ${naira(stake * 2)} prize: your ${naira(stake)} back and ${naira(stake)} from the other player.`
  if (outcome === 'lost') return `You lost your ${naira(stake)} stake: it went to the winner's prize.`
  return `Your ${naira(stake)} stake came back. Nobody won or lost.`
}

/** What a finished match did for one backer, in a sentence to them. */
export function backOutcome(p: BackPayout, seatName: string): string {
  if (p.refund) return `Your ${naira(p.stake)} came back: nobody won the prize.`
  return p.paid > 0 ? `${seatName} won. Your share of the prize: ${naira(p.paid)}.` : `${seatName} did not win. Your ${naira(p.stake)} stake went to the prize.`
}

/** Is backing open now? In the lobby, or in the first seconds of play (`tick` ticks in at `hz`). */
export const backingOpen = (status: string, tick: number, hz: number): boolean => status === 'lobby' || (status === 'playing' && tick < BACK_WINDOW_SECONDS * hz)
