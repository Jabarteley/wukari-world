/**
 * OWNER: games (real-time)
 * THE DAILY CHALLENGE, pure: one goal a Lagos day for a game against the computer, the same for everyone, judged by the server from
 * how the practice match ended (server/growth/arena-daily.ts). A reason to come back; it pays nothing (games against the computer
 * never do) and keeps a streak of days in a row.
 */
export interface DailyGoal { id: string; text: string }
/** What the server knows when a practice match ends, for the seat of the person. */
export interface DailyEnd { won: boolean; reason: string; seconds: number; hpLeft: number }

const GOALS: Readonly<Record<string, readonly (DailyGoal & { met: (end: DailyEnd) => boolean })[]>> = {
  fight: [
    { id: 'ko', text: 'Beat the computer by knock-out', met: (e) => e.won && e.reason === 'ko' },
    { id: 'quick', text: 'Beat the computer in under a minute', met: (e) => e.won && e.seconds < 60 },
    { id: 'clean', text: 'Beat the computer with more than half your health left', met: (e) => e.won && e.hpLeft > 50 },
  ],
}

/** Today's goal for a game (the Lagos day number), or null for a game with no daily challenge. */
export function goalFor(game: string, day: number): DailyGoal | null {
  const list = GOALS[game]
  if (!list?.length) return null
  const g = list[((day % list.length) + list.length) % list.length] as DailyGoal
  return { id: g.id, text: g.text }
}
/** Did this ending meet today's goal? */
export function goalMet(game: string, day: number, end: DailyEnd): boolean {
  const list = GOALS[game], goal = goalFor(game, day)
  return !!list && !!goal && (list.find((g) => g.id === goal.id)?.met(end) ?? false)
}
/** The streak after a goal met on `day`: one more when yesterday was met too, else 1; the same when today was already counted. */
export function nextStreak(prev: { day: number; streak: number } | undefined, day: number): number {
  if (!prev) return 1
  if (prev.day === day) return prev.streak
  return prev.day === day - 1 ? prev.streak + 1 : 1
}
/** The streak as it stands today (it lapses after a missed day). */
export const streakNow = (prev: { day: number; streak: number } | undefined, day: number): number => (prev && (prev.day === day || prev.day === day - 1) ? prev.streak : 0)
