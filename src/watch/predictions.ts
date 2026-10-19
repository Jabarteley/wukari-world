/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md "Match predictions")
 * MATCH-NIGHT PREDICTIONS, pure. Before kick-off of a fixture an admin listed (src/festivals/matches.ts), a person picks the winner and,
 * if they like, the score. An admin types the result in afterwards: there is no score feed and no stream (WOW-PLAN decision 2). A right
 * winner is a point and the "Called it" badge; the exact score is three points and "Spot on". The points add up on a board per football
 * season (August to July).
 *
 * NEVER MONEY. A pick has no amount: no naira, no game naira, no stake, no odds and nothing to win but the badge and a place on the board.
 * There is no field a stake could ride in, and the words below never say "bet". Pure; no I/O. The server is server/watch/predictions.ts.
 */
import type { Fixture } from '../festivals/matches.ts'

export type Outcome = 'home' | 'away' | 'draw'
export const OUTCOMES: readonly Outcome[] = Object.freeze(['home', 'away', 'draw'])
export const PREDICT = Object.freeze({ maxGoals: 20, outcomePoints: 1, exactPoints: 3, aheadMs: 14 * 86400000, board: 20, badgesKept: 30 })

/** A stored pick: the winner, and the score when one was given. */
export interface MatchPick { w: Outcome; s?: [number, number]; at: number }
export interface MatchResult { home: number; away: number; at: number }
export type BadgeKind = 'called' | 'exact'
export interface PredictionBadge { fixture: string; title: string; kind: BadgeKind; at: number }
export const BADGE_WORDS: Readonly<Record<BadgeKind, string>> = Object.freeze({ called: 'Called it', exact: 'Spot on' })

/** The two sides of a fixture's title ("Arsenal v Chelsea", "Super Eagles vs Black Stars"), or null when it does not name two. */
export function teamsOf(title: string): [string, string] | null {
  const parts = title.split(/\s+(?:v|vs\.?|versus)\s+/i)
  if (parts.length !== 2) return null
  const [home, away] = parts.map((part) => part.trim()) as [string, string]
  return home.length >= 2 && away.length >= 2 ? [home, away] : null
}

/** May a pick be made or changed now? Only before kick-off, and only in the last PREDICT.aheadMs before it. */
export function pickOpen(fixture: Pick<Fixture, 'start'>, now: number): boolean {
  return now < fixture.start && fixture.start - now <= PREDICT.aheadMs
}

const goals = (value: unknown): number | null => (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= PREDICT.maxGoals ? value : null)
/** The outcome a score means. */
export const outcomeOf = (home: number, away: number): Outcome => (home > away ? 'home' : home < away ? 'away' : 'draw')

/** A pick from a request: a winner, and optionally a score that agrees with it. Anything else in the body (an amount) is ignored. */
export function cleanPick(body: unknown, now: number): { ok: true; pick: MatchPick } | { ok: false; reason: string } {
  const r = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const w = OUTCOMES.find((item) => item === r.winner)
  if (!w) return { ok: false, reason: 'Pick the home side, the away side or a draw.' }
  if (r.score === undefined || r.score === null) return { ok: true, pick: { w, at: now } }
  const home = Array.isArray(r.score) && r.score.length === 2 ? goals(r.score[0]) : null, away = Array.isArray(r.score) && r.score.length === 2 ? goals(r.score[1]) : null
  if (home === null || away === null) return { ok: false, reason: `A score is two whole numbers from 0 to ${PREDICT.maxGoals}.` }
  if (outcomeOf(home, away) !== w) return { ok: false, reason: 'That score does not match the winner you picked.' }
  return { ok: true, pick: { w, s: [home, away], at: now } }
}
/** A result an admin typed in. */
export function cleanResult(body: unknown): { ok: true; home: number; away: number } | { ok: false; reason: string } {
  const r = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const home = goals(r.home), away = goals(r.away)
  return home === null || away === null ? { ok: false, reason: `The result is two whole numbers from 0 to ${PREDICT.maxGoals}.` } : { ok: true, home, away }
}

/** Points for a pick: the exact score PREDICT.exactPoints, the right winner PREDICT.outcomePoints, else 0. */
export function pointsFor(pick: MatchPick, result: Pick<MatchResult, 'home' | 'away'>): number {
  if (pick.s && pick.s[0] === result.home && pick.s[1] === result.away) return PREDICT.exactPoints
  return pick.w === outcomeOf(result.home, result.away) ? PREDICT.outcomePoints : 0
}
/** The badge a pick earns, or null. */
export function badgeFor(pick: MatchPick, result: Pick<MatchResult, 'home' | 'away'>): BadgeKind | null {
  const points = pointsFor(pick, result)
  return points >= PREDICT.exactPoints ? 'exact' : points > 0 ? 'called' : null
}

/** The football season a time falls in, by Lagos date: August to July, "2026/27". */
export function seasonOf(ms: number): string {
  const date = new Date(ms + 3600000), year = date.getUTCFullYear(), first = date.getUTCMonth() >= 7 ? year : year - 1
  return `${first}/${String((first + 1) % 100).padStart(2, '0')}`
}

export interface BoardRow { id: string; name: string; points: number; right: number; exact: number }
/** The board, best first: points, then exact scores, then right winners, then the name. */
export function rankBoard(rows: readonly BoardRow[]): BoardRow[] {
  return [...rows].sort((a, b) => b.points - a.points || b.exact - a.exact || b.right - a.right || a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
}

/** "Arsenal 2–1 Chelsea": the result line. */
export function scoreLine(title: string, result: Pick<MatchResult, 'home' | 'away'>): string {
  const teams = teamsOf(title)
  return teams ? `${teams[0]} ${result.home}–${result.away} ${teams[1]}` : `${title}: ${result.home}–${result.away}`
}
/** The public gist line for a result: how many called it. Never a name, never an amount. */
export function resultGist(title: string, result: Pick<MatchResult, 'home' | 'away'>, right: number, picks: number): string {
  const line = scoreLine(title, result)
  if (!picks) return `Full time: ${line}.`
  return `Full time: ${line}. ${right} of ${picks} ${picks === 1 ? 'fan' : 'fans'} at the viewing centres called it.`
}
/** The words of a person's own result card (drawn on their phone). */
export function resultCardWords(title: string, result: Pick<MatchResult, 'home' | 'away'>, kind: BadgeKind, season: string, points: number): { headline: string; sub: string } {
  return { headline: kind === 'exact' ? `Spot on: ${scoreLine(title, result)}` : `I called it: ${scoreLine(title, result)}`, sub: `${BADGE_WORDS[kind]} · ${points} ${points === 1 ? 'point' : 'points'} in ${season}` }
}
/** How a pick reads ("Arsenal to win, 2–1"). */
export function pickWords(title: string, pick: MatchPick): string {
  const teams = teamsOf(title), side = pick.w === 'draw' ? 'A draw' : `${teams ? teams[pick.w === 'home' ? 0 : 1] : pick.w === 'home' ? 'Home' : 'Away'} to win`
  return pick.s ? `${side}, ${pick.s[0]}–${pick.s[1]}` : side
}
