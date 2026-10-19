/**
 * OWNER: social
 * What every part of the social glue asks of the rest of the server (docs/SOCIAL-GLUE.md): the social record's friendships, blocks and
 * names (read only), the age check, whether an id is an AI-played character, and the refusal shape. Portable: no Node imports.
 */
import { isAiCharacter } from '../gist/ledger.ts'
import type { Db, RouteContext } from '../types.ts'

export type No = { ok: false; code: string; reason: string }
export const no = (code: string, reason: string): No => ({ ok: false, code, reason })
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const idOf = (value: unknown): string | null => (typeof value === 'string' && UUID.test(value) ? value.toLowerCase() : null)

type Player = { name?: string; friends?: Record<string, unknown>; blocked?: Record<string, unknown>; agent?: { char?: boolean } }
const playersOf = (db: Db): Record<string, Player> => ((db as unknown as { social?: { players?: Record<string, Player> } }).social?.players ?? {})

export function glueKit(ctx: RouteContext) {
  const player = (db: Db, id: string): Player | undefined => { const all = playersOf(db); return Object.hasOwn(all, id) ? all[id] : undefined }
  /** Both listed each other: an ordinary friendship (the founder's automatic one is one-sided and never counts). */
  const friends = (db: Db, a: string, b: string): boolean => a !== b && player(db, a)?.friends?.[b] !== undefined && player(db, b)?.friends?.[a] !== undefined
  /** A block either way, from the stored records and the social module's index. */
  const blocked = (db: Db, a: string, b: string): boolean => Boolean(player(db, a)?.blocked?.[b] || player(db, b)?.blocked?.[a] || ctx.checks?.blocked?.(a, b))
  const nameOf = (db: Db, id: string): string => player(db, id)?.name ?? 'Someone'
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  /** An AI-played character (a registered agent character, or a social record marked so). */
  const ai = (db: Db, id: string): boolean => isAiCharacter(db, id) || player(db, id)?.agent?.char === true
  const known = (db: Db, id: string): boolean => player(db, id) !== undefined
  /** The ordinary friends of a person, at most `max`, with names. */
  const friendList = (db: Db, id: string, max = 200): { id: string; name: string }[] =>
    Object.keys(player(db, id)?.friends ?? {}).filter((other) => friends(db, id, other) && !blocked(db, id, other)).slice(0, max).map((other) => ({ id: other, name: nameOf(db, other) }))
  return { player, friends, blocked, nameOf, adult, ai, known, friendList }
}
export type GlueKit = ReturnType<typeof glueKit>
