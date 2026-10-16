/**
 * OWNER: games (real-time)
 * The replay shelf of the arena: the logs of the last finished matches (src/arena/replay.ts), kept in memory, bounded and expiring.
 * At most `perGame` per game and `perRoom` per room (the newest stay), each at most `bytes` of JSON, each for `ttlMs`. A restart
 * clears the shelf (like the rooms themselves); nothing here is stored on disk. The room code is kept only to count a room's
 * replays and is never given out; `view` is what the public route answers: the id, the log and the clip address if one was made.
 */
import type { ReplayLog } from '../../src/arena/replay.ts'

export interface ShelfLimits { perGame: number; perRoom: number; bytes: number; ttlMs: number }
interface Entry { id: string; room: string; at: number; log: ReplayLog; clip: string | null }
export interface ReplayView { id: string; at: number; clip: string | null; log: ReplayLog }

export class ReplayShelf {
  private readonly entries = new Map<string, Entry>()
  private readonly limits: () => ShelfLimits
  constructor(limits: () => ShelfLimits) { this.limits = limits }

  /** Keep a finished match's log; false when it is too big to keep (the player is simply not offered a replay). */
  put(id: string, room: string, log: ReplayLog, now: number): boolean {
    const limit = this.limits()
    if (JSON.stringify(log).length > limit.bytes) return false
    this.prune(now)
    this.entries.set(id, { id, room, at: now, log, clip: null })
    const mine = (pick: (e: Entry) => boolean): Entry[] => [...this.entries.values()].filter(pick)
    for (const [pick, max] of [[(e: Entry) => e.room === room, limit.perRoom], [(e: Entry) => e.log.game === log.game, limit.perGame]] as const) {
      const list = mine(pick)
      for (const old of list.slice(0, Math.max(0, list.length - max))) this.entries.delete(old.id)
    }
    return this.entries.has(id)
  }
  view(id: string, now: number): ReplayView | null {
    const found = this.entries.get(id)
    if (!found) return null
    if (now - found.at >= this.limits().ttlMs) { this.entries.delete(id); return null }
    return { id: found.id, at: found.at, clip: found.clip, log: found.log }
  }
  /** Record where the rendered clip of a replay can be fetched. false for an unknown replay. */
  setClip(id: string, url: string, now: number): boolean {
    const found = this.view(id, now) && this.entries.get(id)
    if (!found) return false
    found.clip = url
    return true
  }
  prune(now: number): void { const ttl = this.limits().ttlMs; for (const [id, e] of this.entries) if (now - e.at >= ttl) this.entries.delete(id) }
  get size(): number { return this.entries.size }
}

/** A clip address the shelf will keep: this site's own path or an https address to an mp4, short, no spaces. */
export const clipAddress = (value: unknown): string | null => (typeof value === 'string' && value.length <= 300 && /^(\/|https:\/\/)[^\s"'<>]+\.mp4$/.test(value) && !value.startsWith('//') ? value : null)
