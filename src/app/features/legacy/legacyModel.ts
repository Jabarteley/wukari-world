// Pass on (docs/LEGACY.md): the pure parts of the screen. Plain words only; the server decides everything and its own sentence is shown.
import type { LegacyInclude, LegacyKind, LegacyKindView, LegacyOfferView, LegacyPerson, LegacyPreview, LegacyView } from '../../../types/legacy.ts'

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const people = (value: unknown): LegacyPerson[] => (Array.isArray(value) ? value.flatMap((item) => (isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string' ? [{ id: item.id, name: item.name }] : [])) : [])
const lines = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 20) : [])
const stays = (value: unknown): { what: string; why: string }[] => (Array.isArray(value) ? value.flatMap((item) => (isRecord(item) && typeof item.what === 'string' && typeof item.why === 'string' ? [{ what: item.what, why: item.why }] : [])).slice(0, 12) : [])
const offer = (value: unknown): LegacyOfferView | null => (isRecord(value) && typeof value.id === 'string' && isRecord(value.from) && isRecord(value.to) ? { id: value.id, mine: value.mine === true, from: people([value.from])[0] ?? { id: '', name: '' }, to: people([value.to])[0] ?? { id: '', name: '' }, lines: lines(value.lines), expires: typeof value.expires === 'number' ? value.expires : 0 } : null)
export const KINDS: readonly LegacyKind[] = ['houses', 'cars', 'shop', 'furniture', 'belongings', 'goodwill', 'titles']

/** The server's view, read defensively (an older server answers less). */
export function readView(value: unknown): LegacyView | null {
  if (!isRecord(value)) return null
  const kinds = Array.isArray(value.kinds) ? value.kinds.flatMap((item): LegacyKindView[] => (isRecord(item) && KINDS.some((key) => key === item.key) && typeof item.label === 'string' ? [{ key: item.key as LegacyKind, label: item.label, lines: lines(item.lines), stays: stays(item.stays), heirOnly: item.heirOnly === true }] : [])) : []
  return { heirs: people(value.heirs), friends: people(value.friends), kinds, adult: value.adult === true, outgoing: offer(value.outgoing), incoming: Array.isArray(value.incoming) ? value.incoming.flatMap((item) => offer(item) ?? []) : [], nextGiftAt: typeof value.nextGiftAt === 'number' ? value.nextGiftAt : null }
}
export function readPreview(value: unknown): LegacyPreview {
  if (!isRecord(value)) return { ok: false, reason: 'That could not be checked. Try again.' }
  const to = people([value.to])[0]
  return { ok: value.ok === true, ...(value.kind === 'heir' || value.kind === 'other' ? { kind: value.kind } : {}), ...(to ? { to } : {}), lines: lines(value.lines), stays: stays(value.stays), ...(typeof value.code === 'string' ? { code: value.code } : {}), ...(typeof value.reason === 'string' ? { reason: value.reason } : {}) }
}
/** Only what is ticked, and for a friend never the titles (they go to your own next character only). */
export function includeOf(picked: ReadonlySet<LegacyKind>, toFriend: boolean): LegacyInclude {
  const out: LegacyInclude = {}
  for (const key of picked) if (!(toFriend && key === 'titles')) out[key] = true
  return out
}
/** A short sentence for the confirm button. */
export function confirmWords(kind: 'heir' | 'other', name: string): string {
  return kind === 'heir' ? `Pass these to ${name} now` : `Offer these to ${name}`
}
/** When an offer runs out, in words. */
export function expiryWords(expires: number, now: number): string {
  const days = Math.max(0, Math.ceil((expires - now) / 86400000))
  return days <= 1 ? 'until tomorrow' : `for ${days} more days`
}
