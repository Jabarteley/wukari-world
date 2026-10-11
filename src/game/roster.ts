/**
 * The roster: twelve finished characters (six men, six women) a player chooses from. Data only, so that the server and the
 * first download can read it for a few hundred bytes; the models, textures and portraits are fetched later (src/scene/roster/).
 *
 * `outfits` counts the outfits of a character, the one it is made in included (outfit 0). `skin` says whether the character has
 * skin-tone steps (SKIN_STEPS of them; step 0 is the tone it was made in). `on` is the switch: a character that is off is not
 * offered, not accepted from a client and not drawn; a look that names it is read as the nearest character that is on.
 * Turning one on is changing its `on` to 1 once its files are in src/scene/roster/assets/ and src/scene/roster/portraits/.
 */
import type { FabricId, HairId, OutfitId } from '../types/life.ts'

export type RosterSex = 'man' | 'woman'
export interface RosterEntry {
  readonly id: string
  readonly sex: RosterSex
  readonly name: string
  readonly outfits: number
  readonly skin: 0 | 1
  readonly on: 0 | 1
  /** The hairstyle, outfit and fabric of the old look that stands in for the character where the old figure is drawn (a free style each). */
  readonly as: readonly [HairId, OutfitId, FabricId]
}
export const SKIN_STEPS = 6

export const ROSTER: readonly RosterEntry[] = [
  { id: 'm1', sex: 'man', name: 'T-shirt and jeans', outfits: 4, skin: 1, on: 1, as: ['fade', 'casual', 'plain'] },
  { id: 'm2', sex: 'man', name: 'Senator', outfits: 4, skin: 1, on: 1, as: ['low-cut', 'office', 'plain'] },
  { id: 'm3', sex: 'man', name: 'Agbada', outfits: 4, skin: 1, on: 0, as: ['bald', 'office', 'aso-oke'] },
  { id: 'm4', sex: 'man', name: 'Hoodie and joggers', outfits: 4, skin: 1, on: 1, as: ['locs', 'hoodie', 'plain'] },
  { id: 'm5', sex: 'man', name: 'Shirt and trousers', outfits: 4, skin: 1, on: 1, as: ['classic', 'office', 'plain'] },
  { id: 'm6', sex: 'man', name: 'Ankara shirt and chinos', outfits: 4, skin: 1, on: 1, as: ['low-cut', 'casual', 'ankara'] },
  { id: 'w1', sex: 'woman', name: 'Ankara wrapper and blouse', outfits: 3, skin: 0, on: 1, as: ['braids', 'casual', 'ankara'] },
  { id: 'w2', sex: 'woman', name: 'Aso-ebi', outfits: 4, skin: 0, on: 1, as: ['gele', 'owambe', 'aso-oke'] },
  { id: 'w3', sex: 'woman', name: 'Crop top and jeans', outfits: 4, skin: 1, on: 1, as: ['afro', 'casual', 'plain'] },
  { id: 'w4', sex: 'woman', name: 'Two-piece', outfits: 4, skin: 1, on: 1, as: ['low-cut', 'office', 'plain'] },
  { id: 'w5', sex: 'woman', name: 'Iro and buba', outfits: 3, skin: 1, on: 0, as: ['bun', 'owambe', 'adire'] },
  { id: 'w6', sex: 'woman', name: 'Bubu', outfits: 3, skin: 1, on: 1, as: ['classic', 'owambe', 'plain'] },
]

/** A character's own entry (on or off), or null for an id that is not in the roster. */
export function rosterEntry(id: unknown): RosterEntry | null {
  return typeof id === 'string' ? ROSTER.find((entry) => entry.id === id) ?? null : null
}
/** The characters that are on, of one sex or of both. */
export const rosterOn = (sex?: RosterSex): RosterEntry[] => ROSTER.filter((entry) => entry.on === 1 && (!sex || entry.sex === sex))

/** What a look keeps of its character: the key exists only for a choice other than the default (outfit 0, skin step 0). */
export interface RosterFields { character?: string; characterOutfit?: number; characterSkin?: number }

const whole = (value: unknown, max: number): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max

/**
 * The character fields of a look from a client or a save: { fields } (a known character of the body's sex, outfit and skin step in
 * range; no defaults stored; an empty object when no character is named) or { reason }. `sex` is the look's body. A character that
 * is switched off is still a known one (a save made while it was on keeps it; it is read as the nearest character that is on), so
 * `on` decides what is offered and drawn, not what is accepted.
 */
export function checkRosterFields(value: unknown, sex: RosterSex): { fields: RosterFields } | { reason: string } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { fields: {} }
  const given = value as { character?: unknown; characterOutfit?: unknown; characterSkin?: unknown }
  if (given.character === undefined || given.character === null) {
    return given.characterOutfit === undefined && given.characterSkin === undefined ? { fields: {} } : { reason: 'Choose a character first.' }
  }
  const entry = rosterEntry(given.character)
  if (!entry || entry.sex !== sex) return { reason: `Choose a ${sex} character from the list.` }
  const outfit = given.characterOutfit ?? 0, skin = given.characterSkin ?? 0
  if (!whole(outfit, entry.outfits - 1)) return { reason: 'Choose one of the character’s outfits.' }
  if (!whole(skin, entry.skin ? SKIN_STEPS : 0)) return { reason: 'Choose a skin tone step the character has.' }
  return { fields: { character: entry.id, ...(outfit ? { characterOutfit: outfit } : {}), ...(skin ? { characterSkin: skin } : {}) } }
}
/** The same read from a saved life: whatever is valid is kept, anything else is dropped (the look itself is never refused for it). */
export function tidyRosterFields(value: unknown, sex: RosterSex): RosterFields {
  const checked = checkRosterFields(value, sex)
  if ('fields' in checked) return checked.fields
  const entry = rosterEntry((value as { character?: unknown }).character)
  // An outfit or skin step out of range falls back to the defaults; an unknown character or the wrong sex drops all three.
  return entry && entry.sex === sex ? { character: entry.id } : {}
}
