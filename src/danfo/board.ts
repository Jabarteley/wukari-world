/**
 * OWNER: danfo (docs/DANFO.md)
 * THE WEEKLY BOARD of each line: a driver's best run of the game week (Monday to Sunday, Lagos time), ranked by what the run earned and,
 * when two earned the same, by the faster time. One row per driver; BOARD_MAX rows kept. Pure, so the server and the tests share it.
 */
import { lagosTime } from '../game/clock.ts'

export const BOARD_MAX = 20
export interface BoardRow { id: string; name: string; earned: number; ms: number; at: number }

/** The game week a time falls in (the same week number the clock gives everything else). */
export const weekOf = (at: number): number => lagosTime(at).week
/** The game day a time falls in. */
export const dayOf = (at: number): number => lagosTime(at).day
/** The key of a line's board for a week. */
export const boardKey = (routeId: string, week: number): string => `${routeId}@${week}`

const better = (a: BoardRow, b: BoardRow): number => b.earned - a.earned || a.ms - b.ms || a.at - b.at

/**
 * Puts a run on the board when it is the driver's best this week. Returns the new rows and the run's place (1 = first), or 0 when it did
 * not make the board (or was not the driver's best).
 */
export function enter(rows: readonly BoardRow[], row: BoardRow): { rows: BoardRow[]; place: number } {
  const mine = rows.find((item) => item.id === row.id)
  if (mine && better(mine, row) <= 0) return { rows: [...rows], place: 0 }
  const next = rows.filter((item) => item.id !== row.id).concat(row).sort(better).slice(0, BOARD_MAX)
  const place = next.indexOf(row) + 1
  return { rows: next, place }
}
/** A driver's place on rows (1 = first), or 0. */
export const placeOf = (rows: readonly BoardRow[], id: string): number => rows.findIndex((item) => item.id === id) + 1
