/**
 * OWNER: world events (docs/WORLD-EVENTS.md "Election night", docs/POLITICS.md)
 * ELECTION NIGHT, AS PURE FUNCTIONS. The weekly cycle is the civic one (server/civic/elections.ts): voting Thursday to Saturday, polls
 * close at 00:00 on Sunday (Lagos), and the winner's term starts then. Election night dresses that cycle:
 *
 *   debate      Friday 20:00 to 22:00: up to DEBATE_SLOTS races, half an hour each, on a stage in the Square (src/world-events/stage.ts).
 *               The candidates are invited to take their seats; the agents' ballot's AI candidates for the same seat may sit too, labelled.
 *   board       the results board in the Square: the live tally while the polls are open (the civic tally is public and live), "results
 *               live" from Saturday 18:00, and the result from the close until the end of Sunday.
 *   speech      the winner's speech: one short text the winner sends once, broadcast to everyone in the Square, from the close to the end
 *               of Sunday; and a stage of their own in the Square while it is free.
 *   card        "Ada wins Lagos with 61%": a gist line (so it is shared like any gist line, docs/GIST.md), written once per seat.
 *
 * Nothing here decides an election: the tally, the quorum and the winner are the civic module's, read as they are stored.
 */
import { lagosDayStart } from '../game/clock.ts'

const HOUR = 3600000, MINUTE = 60000
export type Tier = 'city' | 'state' | 'nation'
export type Side = 'humans' | 'agents'
export const DEBATE_SLOTS = 4, DEBATE_MINUTES = 30, SPEECH_MAX = 280, SPEECH_STAGE_MINUTES = 10

/** The moments of one week's election night, from the civic week number. */
export interface NightTimes { week: number; debateAt: number; debateEnds: number; liveAt: number; closesAt: number; resultsEnd: number }
export function nightTimes(week: number): NightTimes {
  const closesAt = lagosDayStart(7 * week - 3 + 6)
  return { week, debateAt: closesAt - 28 * HOUR, debateEnds: closesAt - 28 * HOUR + DEBATE_SLOTS * DEBATE_MINUTES * MINUTE, liveAt: closesAt - 6 * HOUR, closesAt, resultsEnd: closesAt + 24 * HOUR }
}
export type NightPhase = 'quiet' | 'debate' | 'voting' | 'live' | 'results'
export function nightPhase(times: NightTimes, now: number): NightPhase {
  if (now >= times.debateAt && now < times.debateEnds) return 'debate'
  if (now >= times.liveAt && now < times.closesAt) return 'live'
  if (now >= times.closesAt && now < times.resultsEnd) return 'results'
  return now < times.closesAt && now >= times.closesAt - 3 * 24 * HOUR ? 'voting' : 'quiet'
}

/** A race as the server reads it from the stored ballot. */
export interface Race { scope: string; tier: Tier; side: Side; place: string; title: string; quorum: number; candidates: { id: string; name: string; votes: number; party: string | null; ai: boolean }[] }
export interface BoardRow { id: string; name: string; votes: number; percent: number; party: string | null; ai: boolean; leading: boolean }
export interface BoardSeat { scope: string; tier: Tier; side: Side; place: string; title: string; total: number; quorum: number; rows: BoardRow[]; winner: { id: string; name: string; percent: number; ai: boolean } | null; void: boolean }

/** Whole per cents that add up to 100 (largest remainder); none when nobody voted. */
export function percents(votes: readonly number[]): number[] {
  const total = votes.reduce((sum, n) => sum + n, 0)
  if (total <= 0) return votes.map(() => 0)
  const exact = votes.map((n) => (n * 100) / total), out = exact.map(Math.floor)
  let left = 100 - out.reduce((sum, n) => sum + n, 0)
  const order = exact.map((value, at) => ({ at, rest: value - Math.floor(value) })).sort((a, b) => b.rest - a.rest || a.at - b.at)
  for (const { at } of order) { if (left <= 0) break; out[at]! += 1; left -= 1 }
  return out
}
/**
 * One seat of the board. The candidates come best first (the civic order, which is also the tie-break). `closed`: the polls have closed,
 * so the first is the winner when the quorum was reached; before that nobody is the winner and the first is only leading.
 */
export function boardSeat(race: Race, closed: boolean): BoardSeat {
  const total = race.candidates.reduce((sum, item) => sum + item.votes, 0), shares = percents(race.candidates.map((item) => item.votes))
  const rows = race.candidates.map((item, at) => ({ id: item.id, name: item.name, votes: item.votes, percent: shares[at] ?? 0, party: item.party, ai: item.ai, leading: at === 0 && item.votes > 0 }))
  const best = rows[0], counts = Boolean(best && best.votes > 0 && total >= race.quorum)
  return { scope: race.scope, tier: race.tier, side: race.side, place: race.place, title: race.title, total, quorum: race.quorum, rows,
    winner: closed && counts && best ? { id: best.id, name: best.name, percent: best.percent, ai: best.ai } : null, void: closed && !counts && rows.length > 0 }
}

/** The results card's words, which are also its gist line: "Ada wins Lagos with 61%". An AI winner is marked. */
export const resultLine = (name: string, place: string, percent: number, ai: boolean): string => `${name}${ai ? ' (AI)' : ''} wins ${place} with ${percent}%`.slice(0, 120)
export const debateLine = (place: string, title: string): string => `Debate tonight in the Square: the race for ${title} of ${place}`.slice(0, 120)
export const speechLine = (name: string, title: string, place: string): string => `${name}, the new ${title} of ${place}, gave a victory speech in the Square`.slice(0, 120)

/** Which races get the Friday debate: two or more candidates on the people's ballot; the nation first, then states, then cities; the most candidates first. */
export function pickDebates(races: readonly Pick<Race, 'scope' | 'tier' | 'side' | 'candidates'>[]): string[] {
  const rank: Record<Tier, number> = { nation: 0, state: 1, city: 2 }
  return races.filter((race) => race.side === 'humans' && race.candidates.length >= 2)
    .sort((a, b) => rank[a.tier] - rank[b.tier] || b.candidates.length - a.candidates.length || b.candidates.reduce((s, c) => s + c.votes, 0) - a.candidates.reduce((s, c) => s + c.votes, 0) || (a.scope < b.scope ? -1 : 1))
    .slice(0, DEBATE_SLOTS).map((race) => race.scope)
}
/** The debate slot running at `now` (0 to DEBATE_SLOTS - 1), or -1. */
export const debateSlot = (times: NightTimes, now: number): number => (now >= times.debateAt && now < times.debateEnds ? Math.floor((now - times.debateAt) / (DEBATE_MINUTES * MINUTE)) : -1)
