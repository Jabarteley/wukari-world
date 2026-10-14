import { lagosDayStart, lagosTime } from './clock.ts'
import type { SeasonEvidence, SeasonState, SeasonView } from '../types/season.ts'

export const FIRST_SEASON_ID = 'akoka-first-season-v1'
export const SEASON_DAYS = 28
const validDay = (day: unknown): day is number => typeof day === 'number' && Number.isSafeInteger(day) && day >= 0 && day < 10_000_000

/** Only trusted host configuration supplies the season window. Traveling never changes it. */
export function seasonView(saved: SeasonState | undefined, startDay: number | null, now: number, evidence: readonly SeasonEvidence[]): SeasonView | null {
  if (saved?.id === FIRST_SEASON_ID && validDay(saved.startDay)) startDay = saved.startDay
  if (!validDay(startDay)) return null
  const startsAt = lagosDayStart(startDay), endsAt = lagosDayStart(startDay + SEASON_DAYS)
  const row = saved?.id === FIRST_SEASON_ID ? saved : undefined
  const played = row?.playedDay !== null && row?.playedDay !== undefined && row.playedDay >= startDay && row.playedDay < startDay + SEASON_DAYS
  const members = [...new Map(evidence.map(item => [item.id, item])).values()]
  // Earlier keepsakes count, including for a player who joins on the final day.
  const keepsakes = members.filter(item => item.earnedAt !== null && item.earnedAt < endsAt).length
  return { id: FIRST_SEASON_ID, title: 'A place at Akoka', startsAt, endsAt,
    status: now < startsAt ? 'upcoming' : now < endsAt ? 'open' : 'ended', joined: Boolean(row), played,
    keepsakes, target: 2, canClaim: Boolean(row && played && keepsakes >= 2 && row.earnedAt === null),
    earnedAt: row?.earnedAt ?? null, reward: 'First Season ribbon',
    reminder: members.some(item => item.id === row?.reminder && item.earnedAt === null) ? row?.reminder ?? null : null,
    reminderOptions: members.filter(item => item.earnedAt === null).map(({ id, title }) => ({ id, title })) }
}

export function noteSeasonDay(saved: SeasonState | undefined, startDay: number | null, now: number): void {
  if (saved?.id === FIRST_SEASON_ID && validDay(saved.startDay)) startDay = saved.startDay
  if (!saved || saved.id !== FIRST_SEASON_ID || saved.playedDay !== null || now < saved.joinedAt || !validDay(startDay)) return
  const day = lagosTime(now).day
  if (day >= startDay && day < startDay + SEASON_DAYS) saved.playedDay = day
}
