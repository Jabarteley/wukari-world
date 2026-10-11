// The 2D faces of the game: a person's roster portrait, wherever a letter avatar used to stand alone.
//
// A face is the portrait of the character a look wears (src/scene/roster/). Whose look is known: yours; every player the client has
// seen in a room (it keeps the few fields that say which character, outfit and skin step, in memory and on this device, so a friend met
// yesterday still has a face in the contacts); and a family contact or a regular, by their description. Anyone else keeps the
// letter: the game never puts a face on a person that is not theirs.
import { reactive } from 'vue'
import { regularPick } from '../../scene/roster/map.ts'
import type { Regular } from '../../scene/roster/map.ts'
import { portraitOf, portraitUrl } from '../../scene/roster/portraits.ts'

const KEY = 'aw.faces.v1'
const MAX = 200
interface Kept { character?: string; characterOutfit?: number; characterSkin?: number; body?: string; outfit?: string; fabric?: string; hair?: string; skin?: string; accessories?: string[] }
const store = (): Storage | null => { try { return globalThis.localStorage ?? null } catch { return null } }
function read(): Record<string, Kept> {
  try { const value: unknown = JSON.parse(store()?.getItem(KEY) ?? 'null'); return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, Kept> : {} } catch { return {} }
}
const known = reactive<Record<string, Kept>>(read())

/** The fields of a look that choose a face. */
function keep(look: unknown): Kept | null {
  if (!look || typeof look !== 'object') return null
  const l = look as Record<string, unknown>
  const text = (v: unknown): string | undefined => (typeof v === 'string' && v.length < 24 ? v : undefined)
  const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 20 ? v : undefined)
  const out: Kept = {}
  for (const field of ['character', 'body', 'outfit', 'fabric', 'hair', 'skin'] as const) { const v = text(l[field]); if (v) out[field] = v }
  for (const field of ['characterOutfit', 'characterSkin'] as const) { const v = num(l[field]); if (v) out[field] = v }
  if (Array.isArray(l.accessories)) out.accessories = l.accessories.filter((v): v is string => typeof v === 'string').slice(0, 5)
  return out.body || out.character ? out : null
}
/** Remember how a player looks (from a room listing, or their own life). */
export function rememberLook(id: string, look: unknown): void {
  const kept = keep(look)
  if (!id || !kept || JSON.stringify(known[id]) === JSON.stringify(kept)) return
  known[id] = kept
  const ids = Object.keys(known)
  for (const old of ids.slice(0, Math.max(0, ids.length - MAX))) delete known[old]
  try { store()?.setItem(KEY, JSON.stringify(known)) } catch { /* storage is off: the faces live in memory */ }
}
/** The portrait of a player whose look the client knows (`look` is given, or was seen before), else null. */
export function faceOfPlayer(id: string | undefined, look?: unknown): string | null {
  const wanted = look ?? (id ? known[id] : undefined)
  return wanted ? portraitOf(wanted, id) : null
}
/** The portrait of a regular or a family contact, from what the game says of them. */
export function faceOfRegular(who: Regular): string | null {
  const pick = regularPick(who)
  return pick ? portraitUrl(pick.id, pick.outfit) : null
}
