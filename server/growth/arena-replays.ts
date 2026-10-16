/**
 * OWNER: games (real-time)
 * The replay shelf of the arena: the logs of the last finished matches (src/arena/replay.ts), bounded and expiring.
 *
 * STORED   ctx.collection(db, 'arenareplays') = { v: 1, items: { [id]: { at, game, who, log, clip } } }. Kept so that a replay or clip
 *          link shared to a chat still opens after the host has slept or restarted (a status lasts a day; a replay is kept TTL_MS).
 * LIMITS   at most `perGame` per game (the newest stay), each at most `bytes` of JSON, none older than `ttlMs`; pruned on every write.
 *          A room may put at most `perRoom` replays a day on the shelf (counted in memory only), so one busy room cannot fill it.
 * PRIVACY  the log carries public names, the AI mark and the cosmetic look of each seat, never an id or the room code. `who` holds the
 *          seated people's public ids so that an erased player's replays are deleted with them (server/admin/erasure-data.ts); it is never
 *          sent anywhere. Nothing else about a player is kept.
 * WRITES   a finished match is one lazy write ({ durable: false }): losing the last replay before a crash costs nothing.
 * Portable: no Node imports.
 */
import type { ReplayLog } from '../../src/arena/replay.ts'
import type { Db, RouteContext } from '../types.ts'

export const COLLECTION = 'arenareplays'
export interface ShelfLimits { perGame: number; perRoom: number; bytes: number; ttlMs: number }
export interface StoredReplay { at: number; game: string; who: string[]; log: ReplayLog; clip: string | null }
export interface ReplayCollection { v: 1; items: Record<string, StoredReplay> }
export interface ReplayView { id: string; at: number; clip: string | null; log: ReplayLog }

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** The collection, made or repaired in place so damaged data cannot crash a route. */
export function replaysOf(ctx: Pick<RouteContext, 'collection'>, db: Db): ReplayCollection {
  const found = ctx.collection(db, COLLECTION, { v: 1, items: {} }) as Partial<ReplayCollection>
  if (found.v !== 1) found.v = 1
  if (!isRecord(found.items)) found.items = {}
  return found as ReplayCollection
}
/** The collection if it exists, without making it (reads). */
export const peekReplays = (db: Db): ReplayCollection | null => {
  const found = (db as Record<string, unknown>)[COLLECTION]
  return isRecord(found) && isRecord(found.items) ? found as unknown as ReplayCollection : null
}

/** Drop what is too old, then all but the newest `perGame` of each game. Pure over the collection. */
export function pruneReplays(c: ReplayCollection, now: number, limit: Pick<ShelfLimits, 'perGame' | 'ttlMs'>): void {
  const byGame = new Map<string, [string, number][]>()
  for (const [id, item] of Object.entries(c.items)) {
    if (!isRecord(item) || typeof item.at !== 'number' || now - item.at >= limit.ttlMs || !isRecord(item.log)) { delete c.items[id]; continue }
    const list = byGame.get(item.game) ?? []
    list.push([id, item.at]); byGame.set(item.game, list)
  }
  for (const list of byGame.values()) {
    list.sort((a, b) => b[1] - a[1])
    for (const [id] of list.slice(Math.max(0, limit.perGame))) delete c.items[id]
  }
}

/** Remove every replay an erased player sat in. */
export function forgetReplayPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekReplays(db)
  if (!c) return
  for (const [id, item] of Object.entries(c.items)) if (!Array.isArray(item?.who) || item.who.some((who) => ids.has(who))) delete c.items[id]
}

/** A clip address the shelf will keep: this site's own path or an https address to an mp4, short, no spaces. */
export const clipAddress = (value: unknown): string | null => (typeof value === 'string' && value.length <= 300 && /^(\/|https:\/\/)[^\s"'<>]+\.mp4$/.test(value) && !value.startsWith('//') ? value : null)

/** The shelf the room host uses. Reads go to the store; a room's daily count is memory only. */
export function replayShelf(ctx: Pick<RouteContext, 'collection' | 'store'>, limits: () => ShelfLimits) {
  const perRoom = new Map<string, { day: number; n: number }>()
  return {
    /** Keep a finished match's log. False when it is too big, or the room has put enough today (the players are simply not offered a replay). */
    put(id: string, room: string, who: readonly string[], log: ReplayLog, now: number): boolean {
      const limit = limits()
      if (JSON.stringify(log).length > limit.bytes) return false
      const day = Math.floor(now / 86400000), count = perRoom.get(room)
      if (count && count.day === day && count.n >= limit.perRoom) return false
      perRoom.set(room, { day, n: count && count.day === day ? count.n + 1 : 1 })
      if (perRoom.size > 2000) for (const [key, value] of perRoom) if (value.day !== day) perRoom.delete(key)
      void ctx.store.transact((db) => {
        const c = replaysOf(ctx, db)
        c.items[id] = { at: now, game: log.game, who: [...who], log, clip: null }
        pruneReplays(c, now, limit)
      }, { durable: false }).catch(() => {})
      return true
    },
    async view(id: string, now: number): Promise<ReplayView | null> {
      const ttl = limits().ttlMs
      return ctx.store.read((db) => {
        const found = peekReplays(db)?.items[id]
        if (!found || !isRecord(found.log) || now - found.at >= ttl) return null
        return { id, at: found.at, clip: found.clip ?? null, log: found.log }
      })
    },
    /** Record where the rendered clip of a replay can be fetched. False for an unknown replay. */
    async setClip(id: string, url: string, now: number): Promise<boolean> {
      const ttl = limits().ttlMs
      return ctx.store.transact((db) => {
        const found = peekReplays(db)?.items[id]
        if (!found || now - found.at >= ttl) return false
        found.clip = url
        return true
      })
    },
  }
}
