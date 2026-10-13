// The words and rules of the Tables app that need no browser: what a row of the list says, how the
// list is split into "where you are" and "elsewhere", the result sentence of a finished game, the
// turn clock's numbers, the choices of the rules select. Pure, so node --test reaches it.
import type { TableOptionValue, TableRating, TableResultMine, TableStakes, TableStateFrame, TableSummary, TableClaim } from './tablesBoundary.ts'
import { money } from '../../ui/format.ts'
import { PLAY_MONEY, STAKE_MAX, stakeChip, stakeLine, stakeOutcome } from '../../../game/table-stakes.ts'

export { PLAY_MONEY, stakeLine }

/** The list is asked for again on open when it is older than this. */
export const LIST_STALE_MS = 20000

export const tableTitle = (table: Pick<TableSummary, 'gameLabel' | 'label'>): string => `${table.gameLabel} · ${table.label}`

/** Who is at the table, in a row of the list. */
export function rowWho(table: TableSummary): string {
  const humans = table.seats.filter((seat) => !seat.bot)
  if (table.status === 'playing') return `Game on · ${table.seats.map((seat) => seat.name).join(', ')}`
  return humans.length ? `${humans.map((seat) => seat.name).join(', ')} waiting for players` : 'Empty: sit down and start'
}
/** The quiet second line of a row: venue, who, how many watch. */
export const rowSub = (table: TableSummary): string => `${table.venueLabel} · ${rowWho(table)}${table.watching ? ` · ${table.watching} watching` : ''}`
export const openLabel = (table: Pick<TableSummary, 'status'>, mine: boolean): 'Watch' | 'Sit' | 'Look' => (table.status === 'playing' ? 'Watch' : mine ? 'Sit' : 'Look')

/** The tables where the player is (null where when travelling) and all the others, in the server's order. */
export function partition(list: readonly TableSummary[], at: string | null): { mine: TableSummary[]; other: TableSummary[] } {
  return { mine: list.filter((table) => table.venue === at), other: list.filter((table) => table.venue !== at) }
}
export const heroFigure = (count: number): string => (count ? `${count} table${count === 1 ? '' : 's'} where you are` : 'No table where you are')
export interface PaidTerms { win: number; paidLeft: number; perDay: number }
export const heroNote = (paid: PaidTerms | null | undefined): string => (paid ? `A win against a real player pays ${money(paid.win)} · ${paid.paidLeft} of ${paid.perDay} paid wins left today` : 'Play with whoever is here, or with a bot.')
export const ratingLine = (label: string, rating: TableRating): string => `Your ${label} rating: ${rating.rating}${rating.provisional ? ' (provisional)' : ''} · ${rating.won} won of ${rating.played} rated games.`

export const LIST_RULES: readonly string[] = [
  'Sit at a table in the place where your character is. Anyone can watch from anywhere.',
  'A table is free unless the player who sat first chose a stake. A win in a free game against a real player is paid by the game.',
  'Four paid wins a day. Games against the same player count three times a day; after that they are for fun.',
  `To play for a stake, the first to sit picks what each player puts in, up to ${money(STAKE_MAX)}. The other player sees it before sitting, and sitting accepts it. The winner takes the pot; a draw gives both stakes back.`,
  'A stake is game naira only, never real money, and only for two real players, 18 or older, within what you have worked for. A staked game pays no win reward.',
  'Bots fill empty seats when you ask. A game against bots pays nothing and is never played for a stake.',
  'If you leave before everyone has really played, the game is called off and nothing counts. After play began, a player who leaves has lost.',
]
export const NO_TABLE_HERE = { title: 'Go where the tables are', text: 'Whot is played at the buka, the park, the rooftop and the viewing centre; penalties at the viewing centre, the park and the beach.' }

/** The stake chip on a row of the list: free tables say so too. */
export const rowStake = (table: Pick<TableSummary, 'stake'>): { text: string; tone: 'neutral' | 'warn' } => ({ text: stakeChip(table.stake), tone: table.stake > 0 ? 'warn' : 'neutral' })
/** The label of the button that sits down: at a staked table it says what is being accepted. */
export const sitLabel = (table: Pick<TableSummary, 'stake'>, free: number): string => (!free ? 'Table full' : table.stake > 0 ? `Sit down and play for ${money(table.stake)}` : 'Sit down')
/** Why Sit is disabled, or null: a full table, a press on its way, or the sentence the server gave for this player and this stake. */
export const sitReason = (free: number, pending: boolean, stakes: Pick<TableStakes, 'why'> | null): string | null => (!free ? 'The table is full.' : pending ? 'Waiting for the table to answer.' : stakes?.why ?? null)
/** Does the table show its Stake card? Where staking is possible and there is a stake, or the host may pick one. */
export const showsStake = (stakes: TableStakes | null, stake: number): boolean => stakes !== null && stakes.allowed && (stake > 0 || stakes.choices.length > 0)
/** The line under the picker, and the one a player who has not sat reads. */
export const pickNote = 'Choose before anyone sits down: the stake is fixed once two players sit. Both stakes are taken when the game starts; the winner takes the pot.'
export const acceptNote = (stake: number): string => `${stakeLine(stake)}. Sitting down accepts it; both stakes are taken when the game starts and the winner takes the pot.`
/** The body of the consent answer that says "18 or older" (POST /api/growth/consent: the one home of the age answer). */
export const adultAnswer = (cityId: string): { cityId: string; age: 'adult' } => ({ cityId, age: 'adult' })
export const AGAIN_STAKE_NOTE = 'To play for a stake again, get up and sit down again: a stake is agreed each time.'

/** The bot buttons of an open table: 1, 2 or 3 bots, as many as there are free seats. Never at a staked table: a stake is between two real players. */
export const botCounts = (free: number): number[] => (free > 0 ? [1, 2, 3].filter((count) => count <= free) : [])
export const botLabel = (count: number): string => `+ ${count} bot${count === 1 ? '' : 's'}`
export const startNote = (table: Pick<TableSummary, 'min' | 'stake'> & { seats: readonly unknown[] }): string => (table.stake > 0
  ? (table.seats.length < table.min ? 'A game for a stake needs a second real player. Invite a friend: there are no bots at a staked table.' : `Starting takes ${money(table.stake)} from each of you, and the winner takes ${money(table.stake * 2)}.`)
  : table.seats.length < table.min
    ? 'Nobody else here yet? Invite a friend, or play with a bot (a bot game pays nothing).'
    : 'Everyone seated plays. Add bots to fill the table if you like.')
export const hostNote = (host: boolean): string => (host ? 'You sat down first, so you choose.' : 'Whoever sat down first chooses.')
export const seatLabel = (seat: { name: string; away?: boolean }): string => `${seat.name}${seat.away ? ' · away' : ''}`

export type Result = NonNullable<TableStateFrame['result']>
export const outcomeTitle = (result: Pick<Result, 'calledOff'> & { mine: Pick<TableResultMine, 'won' | 'draw'> | null }): string => (result.calledOff ? 'Called off'
  : result.mine ? (result.mine.won ? 'You won' : result.mine.draw ? 'A draw' : 'You lost this one') : 'Game over')
/** The line under the result sentence: what the game paid, or why it did not. Null when there is none (called off, a watcher). */
export function outcomeNote(result: Pick<Result, 'calledOff'> & { mine: TableResultMine | null }, claimed: TableClaim | null, win: number): string | null {
  const mine = result.mine
  // A game played for a stake says what happened to the stake, and nothing else pays: the pot is the other player's stake.
  if (mine?.stake) return `${stakeOutcome(mine.stake)}${mine.change !== undefined ? ` Rating ${mine.rating} (${mine.change >= 0 ? '+' : ''}${mine.change}).` : ''}`
  if (!mine || result.calledOff) return null
  const paid = mine.won && mine.human && mine.counted
    ? (claimed?.code === 'paid' ? `+${money(win)} paid.` : claimed ? 'Counted for your missions. Today’s paid wins are used up.' : 'Collecting your win…')
    : !mine.human ? 'A game against bots pays nothing.'
      : !mine.counted ? 'You two have played your three counted games today: this one was for fun.'
        : 'It counts for your missions.'
  return `${paid}${mine.change !== undefined ? ` Rating ${mine.rating} (${mine.change >= 0 ? '+' : ''}${mine.change}).` : ''}`
}

/** The table a panel was opened on (a link, the venue chip), or null. */
export function tableParam(params: unknown): string | null {
  if (typeof params !== 'object' || params === null || !('table' in params)) return null
  return typeof params.table === 'string' && params.table ? params.table : null
}
/** Back to the list: the seat is given up unless a game is on. Written as the existing panel decided it, a table that has not loaded yet included. */
export const leavesOnBack = (state: Pick<TableStateFrame, 'you' | 'table'> | null): boolean => state?.you !== null && state?.table.status !== 'playing'
/** Is the list old enough to ask for again? Only on the list screen. */
export const listIsStale = (onList: boolean, listAt: number, hasList: boolean, now: number): boolean => !onList ? false : hasList && now - listAt > LIST_STALE_MS

/** A select's value is the JSON of the option's value, so numbers and booleans survive the round trip. */
export const optionKey = (value: TableOptionValue): string => JSON.stringify(value)
export function parseOption(raw: string): TableOptionValue | undefined {
  try { const value: unknown = JSON.parse(raw); return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined } catch { return undefined }
}

/** The turn clock bar: it starts where the turn's time really is, by the server's clock, and runs out with it. Null when no game is on. */
export function clockBar(state: Pick<TableStateFrame, 'clock' | 'n' | 'table'>, now: number): { seconds: number; from: string; key: string } | null {
  if (!state.clock || state.table.status === 'over') return null
  const left = Math.max(0, (state.clock.deadline - Math.max(now, state.clock.now)) / 1000)
  const seconds = Math.max(1, Math.round(left)), from = Math.min(1, left / state.clock.seconds).toFixed(2)
  return { seconds, from, key: `${state.n}|${seconds}|${from}` }
}

/** The name of a seat, or `fallback` when there is none (a turn that is null). */
export const nameAt = (seats: readonly { name: string }[], index: number | null, fallback = ''): string => (index === null ? fallback : seats[index]?.name ?? fallback)
export const plain = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`
