/**
 * OWNER: games (real-time)
 * The daily challenge's record (rules: src/arena/daily.ts). STORED ctx.collection(db, 'arenadaily') = { v: 1, players: { [id]: { [game]:
 * { day, streak } } } }: the last Lagos day a player met the goal of a game and the streak. Small, bounded by players; an erased player's
 * entry is deleted (server/admin/erasure-data.ts). Portable: no Node imports.
 */
import { lagosTime } from '../../src/game/clock.ts'
import { goalFor, goalMet, nextStreak, streakNow } from '../../src/arena/daily.ts'
import type { DailyEnd } from '../../src/arena/daily.ts'
import type { Db, RouteContext } from '../types.ts'

export const DAILY = 'arenadaily'
interface Entry { day: number; streak: number }
interface DailyCollection { v: 1; players: Record<string, Record<string, Entry>> }
const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const peek = (db: Db): DailyCollection | null => { const found = (db as Record<string, unknown>)[DAILY]; return isRecord(found) && isRecord(found.players) ? found as unknown as DailyCollection : null }

export function forgetDailyPlayers(db: Db, ids: ReadonlySet<string>): void { const c = peek(db); if (c) for (const id of ids) delete c.players[id] }

export function arenaDaily(ctx: Pick<RouteContext, 'collection' | 'store' | 'now'>) {
  return {
    /** A practice match ended: record the goal if it was met today. Never throws to the room. */
    record(game: string, player: string, end: DailyEnd): void {
      const day = lagosTime(ctx.now()).day
      if (!goalMet(game, day, end)) return
      void ctx.store.transact((db) => {
        const c = ctx.collection(db, DAILY, { v: 1, players: {} }) as unknown as DailyCollection
        if (!isRecord(c.players)) c.players = {}
        const mine = (c.players[player] ||= {}), prev = mine[game]
        mine[game] = { day, streak: nextStreak(prev, day) }
      }, { durable: false }).catch(() => {})
    },
    /** Today's goal, whether this player met it, and their streak. */
    async view(game: string, player: string | null): Promise<{ game: string; day: number; goal: string; done: boolean; streak: number } | null> {
      const day = lagosTime(ctx.now()).day, goal = goalFor(game, day)
      if (!goal) return null
      const entry = player ? await ctx.store.read((db) => peek(db)?.players[player]?.[game]) : undefined
      return { game, day, goal: goal.text, done: entry?.day === day, streak: streakNow(entry, day) }
    },
  }
}
