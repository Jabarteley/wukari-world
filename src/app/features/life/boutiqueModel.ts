// What the Boutique decides: which look the preview shows, and what each item offers. Pure, so it
// is tested without a browser. Rules and prices are the engine's (systems/onboarding.js,
// content/traits.js BOUTIQUE_PRICES — original beta prices).
import type { LifeState } from '../../../types/life.ts'
import type { BoutiqueItem, OnboardingView } from '../../../types/view.ts'
import type { AvatarLook } from '../../../game/wardrobe/look.ts'
import { NATIVE_STARTER_ITEMS, normalizeNativeRecipe } from '../../../character/native-recipe.ts'
import { NATIVE_BOUTIQUE_PRICES } from '../../../character/native-catalog.ts'
import { nativeRecipeForLook } from '../../../character/native-migration.ts'
import type { NativeWardrobeKind } from '../../../character/native-recipe.ts'
import { NATIVE_CHARACTER_CATALOG } from '../../../character/native-catalog.ts'
import { naira } from '../../../game/util.ts'

/** Complete the startup projection when Boutique opens; catalogue rules stay in this lazy module. */
export function withWearableBoutique(base: OnboardingView, state: Pick<LifeState, 'onboarding' | 'cash'>): OnboardingView {
  if (base.boutique.length) return base
  const ownedIds = new Set([...NATIVE_STARTER_ITEMS, ...(state.onboarding.wardrobe.native ?? [])])
  const current = nativeRecipeForLook(base.look, 'boutique-view').appearance
  const notYet = base.guest ? 'Settle in first.' : 'Finish creating your character first.'
  const nativeItems = (kind: NativeWardrobeKind) => kind === 'native-hair' ? NATIVE_CHARACTER_CATALOG.hair : kind === 'native-garment' ? NATIVE_CHARACTER_CATALOG.garments : NATIVE_CHARACTER_CATALOG.shoes
  const boutique = (['native-hair', 'native-garment', 'native-shoes'] as const).flatMap((kind) => nativeItems(kind).map((item): BoutiqueItem => {
    const owned = ownedIds.has(item.id), price = NATIVE_BOUTIQUE_PRICES[kind][item.id]!
    const wearing = kind === 'native-hair' ? current.hair === item.id : kind === 'native-garment' ? current.garments.some((id) => id === item.id) : current.shoes === item.id
    const blocked = !base.done ? notYet : owned ? null : state.cash < price ? `Costs ${naira(price)}; you have ${naira(state.cash)}.` : null
    return { kind, id: item.id, label: item.label, price, owned, wearing, blocked }
  }))
  return { ...base, boutique }
}

export type BoutiqueChoice = Omit<BoutiqueItem, 'kind'> & { kind: BoutiqueItem['kind'] | 'wearables' }
export const SECTIONS: readonly (readonly [BoutiqueChoice['kind'], string])[] = [['native-hair', 'Hairstyles'], ['native-garment', 'Outfits'], ['native-shoes', 'Shoes']]

export interface Trying { kind: string; id: string }

/** `look` wearing `item`: a style replaces the one worn; an accessory is added (and replaces one in the same slot). */
export function wearing(look: AvatarLook, item: Pick<BoutiqueChoice, 'kind' | 'id'>): AvatarLook {
  const recipe = nativeRecipeForLook(look, 'boutique-preview')
  const appearance = item.kind === 'native-hair' ? { ...recipe.appearance, hair: item.id }
    : item.kind === 'native-garment' ? { ...recipe.appearance, garments: [item.id] }
      : item.kind === 'native-shoes' ? { ...recipe.appearance, shoes: item.id } : recipe.appearance
  return { ...look, native: normalizeNativeRecipe({ ...recipe, appearance }) }
}

/** The item being tried on, while it is still on offer for this body and not already worn. */
export const triedItem = (boutique: readonly BoutiqueItem[], trying: Trying | null): BoutiqueItem | null =>
  (trying ? boutique.find((entry) => entry.kind === trying.kind && entry.id === trying.id && !entry.wearing) ?? null : null)

/** Pressing Try on again on the item being tried takes it off. */
export const nextTrying = (current: Trying | null, pressed: Trying | null): Trying | null => (pressed && current && current.kind === pressed.kind && current.id === pressed.id ? null : pressed)

export type ItemControl =
  | { kind: 'take-off'; why: string }
  | { kind: 'worn' }
  | { kind: 'wear'; why: string }
  | { kind: 'buy'; why: string }

/** What an item's one control is, and the reason it is disabled ('' when it can be pressed). `offline` is already worded for this app. */
export function itemControl(item: BoutiqueChoice, input: { offline: string; done: boolean }): ItemControl {
  const unfinished = input.done ? '' : 'Finish creating your character first.'
  if (item.wearing) return { kind: 'worn' }
  if (item.owned) return { kind: 'wear', why: input.offline || unfinished }
  return { kind: 'buy', why: input.offline || item.blocked || '' }
}

/** The small line under an item's name. */
export function itemNote(item: Pick<BoutiqueItem, 'wearing' | 'owned' | 'price'>, money: (value: number) => string): string {
  return item.wearing ? 'On your character now' : item.owned ? (item.price ? 'In your wardrobe' : 'Free · yours') : money(item.price)
}

/** Distinguish independently wearable layers from base outfit styles and wrist accessories. */
export const itemLabel = (item: Pick<BoutiqueItem, 'label'>): string => item.label
