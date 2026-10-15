/** Passing property on (docs/LEGACY.md): what GET /api/world/legacy and its writes answer. Types only. */
export type LegacyKind = 'houses' | 'cars' | 'shop' | 'furniture' | 'belongings' | 'goodwill' | 'titles'
export type LegacyInclude = Partial<Record<LegacyKind, boolean>>
export interface LegacyPerson { id: string; name: string }
/** One kind of thing the player holds and could pass: what it is in plain words and anything that cannot go yet. */
export interface LegacyKindView { key: LegacyKind; label: string; lines: string[]; stays: { what: string; why: string }[]; heirOnly: boolean }
export interface LegacyOfferView { id: string; mine: boolean; from: LegacyPerson; to: LegacyPerson; lines: string[]; expires: number }
export interface LegacyView {
  heirs: LegacyPerson[]
  friends: LegacyPerson[]
  kinds: LegacyKindView[]
  /** The player said they are 18 or older: only then can things go to another player. */
  adult: boolean
  outgoing: LegacyOfferView | null
  incoming: LegacyOfferView[]
  nextGiftAt: number | null
}
export interface LegacyPreview { ok: boolean; kind?: 'heir' | 'other'; to?: LegacyPerson; lines?: string[]; stays?: { what: string; why: string }[]; code?: string; reason?: string }
/** What a write answers: the code (`passed`, `offered`, `accepted`, `declined`, `cancelled`, `gone`, `offer_void`), the plain lines of what moved, and a refusal's reason. */
export interface LegacyAnswer { ok: boolean; code: string; reason?: string; kind?: 'heir' | 'other'; lines?: string[]; stays?: { what: string; why: string }[]; duplicate?: true }
