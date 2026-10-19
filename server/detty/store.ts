/**
 * OWNER: growth
 * DETTY DECEMBER'S STORED SHAPE (docs/DETTY-DECEMBER.md): the collection `detty`, `{ v, players }`, kept one entry at a time
 * (server/keyed.ts KEYED_SPECS: players). `players[id]` is a SeasonRecord (src/festivals/detty.ts): the season key, the season cities
 * visited, the season event keys attended, one token per party (its start time, never another player's id) and the Returnee badge per
 * season. Nothing in it is a position, an address or another player's id. Erased with the player (server/admin/erasure-data.ts, an account's
 * deletion) and included in an account's export (server/accounts/service.ts).
 */
import { RECORD_LIMITS, returneeLabel } from '../../src/festivals/detty.ts'
import type { SeasonRecord } from '../../src/festivals/detty.ts'
import type { Db, RouteContext } from '../types.ts'

export interface DettyCollection { v: 1; players: Record<string, SeasonRecord> }
export const dettyOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): DettyCollection => {
  const c = ctx.collection(db, 'detty', { v: 1, players: {} }) as unknown as DettyCollection
  if (!c.players || typeof c.players !== 'object') c.players = {}
  return c
}
/** A read that never creates the collection. */
export const peekDetty = (db: Db): DettyCollection | undefined => (db as Record<string, unknown>)['detty'] as DettyCollection | undefined

const list = (value: unknown, max: number): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(-max) : [])
/** A stored record, repaired; a record of another season starts again (its Returnee badges stay). */
export function recordFor(stored: SeasonRecord | undefined, key: string): SeasonRecord {
  const returnee = stored?.returnee && typeof stored.returnee === 'object' ? { returnee: { ...stored.returnee } } : {}
  if (!stored || stored.s !== key) return { s: key, cities: [], events: [], parties: [], ...returnee }
  return { s: key, cities: list(stored.cities, 3), events: list(stored.events, RECORD_LIMITS.events), parties: list(stored.parties, RECORD_LIMITS.parties), ...returnee }
}

/** The Returnee badge a person shows (the feed's person, beside the location badge): the newest real season's, never a preview's. */
export function returneeBadge(db: Db, id: string): string | null {
  const earned = peekDetty(db)?.players?.[id]?.returnee
  if (!earned || typeof earned !== 'object') return null
  const years = Object.keys(earned).filter((key) => /^\d{4}$/.test(key)).map(Number).sort((a, b) => b - a)
  return years[0] ? returneeLabel(years[0]) : null
}

/** The account export (server/accounts/service.ts): each character's season records, as stored. */
export function exportDetty(db: Db, ids: readonly string[]): { player: string; season: SeasonRecord }[] {
  const players = peekDetty(db)?.players
  return players ? ids.flatMap((player) => { const season = players[player]; return season ? [{ player, season: structuredClone(season) }] : [] }) : []
}
/** Erasure: the players' season records go. */
export function forgetDettyPlayers(db: Db, ids: Iterable<string>): void {
  const players = peekDetty(db)?.players
  if (players) for (const id of ids) delete players[id]
}
