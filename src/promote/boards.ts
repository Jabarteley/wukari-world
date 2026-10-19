/**
 * OWNER: social
 * BILLBOARDS OF RUNNING BOOSTS (docs/PROMOTE.md): the Map panel loads the city's billboards (GET /api/civic/ads: boards players rent with game
 * naira) and, beside them, the city's boosted businesses (GET /api/promote/boards). Here the second fills the free boards of the first, so
 * the maps draw them without a new kind of thing: a rented board is never replaced, a business takes a free one, the rest stay "for rent".
 * Pure: no clock, no DOM, no fetch. The business's words are plain text for the renderer to escape; a tap opens the business by its id.
 */
import type { Ad, AdsView, BillboardSlot } from '../types/civic.ts'
import type { BoardListing } from '../types/neighbourhood.ts'
import type { Category } from './model.ts'

/** Which palette colour and icon a kind of business wears, so a street of boards is not one colour. */
const LOOK: Readonly<Record<Category, { colour: string; icon: string }>> = Object.freeze({
  food: { colour: 'red', icon: 'food' }, fashion: { colour: 'purple', icon: 'scissors' }, beauty: { colour: 'teal', icon: 'heart' }, tech: { colour: 'blue', icon: 'phone' },
  repairs: { colour: 'night', icon: 'fire' }, transport: { colour: 'gold', icon: 'car' }, events: { colour: 'purple', icon: 'music' }, learning: { colour: 'blue', icon: 'book' },
  health: { colour: 'green', icon: 'heart' }, home: { colour: 'teal', icon: 'house' }, shops: { colour: 'gold', icon: 'shop' }, services: { colour: 'green', icon: 'star' },
})
const paletteHas = (ads: AdsView, kind: 'colours' | 'icons', id: string): boolean => (ads.palette?.[kind] as { id: string }[] | undefined)?.some((p) => p.id === id) === true

/** One board's creative for a business: its name on the board, the colour and icon of its kind, and what a tap needs. */
export function boardAd(ads: AdsView, b: BoardListing, now: number, price: number): Ad {
  const look = LOOK[b.category] ?? { colour: 'green', icon: 'star' }
  return {
    text: b.name, colour: paletteHas(ads, 'colours', look.colour) ? look.colour : (ads.palette?.colours?.[0]?.id ?? 'green'), icon: paletteHas(ads, 'icons', look.icon) ? look.icon : 'star',
    by: { id: b.owner.id, name: b.owner.name }, at: now, expiresAt: now + 600000, mine: false, price,
    business: { id: b.id, label: b.categoryLabel, ...(b.photo ? { photo: b.photo } : {}) },
  }
}
/**
 * The ads with the businesses on its free billboards, in the order the server rotated them. The input is not changed. With no businesses,
 * or no free board, the ads come back as they are.
 */
export function fillBoards<T extends AdsView>(ads: T, boards: readonly BoardListing[], now: number): T {
  const slots = ads.billboards?.slots
  if (!slots?.length || !boards.length) return ads
  let next = 0
  const filled: BillboardSlot[] = slots.map((slot) => {
    if (slot.ad || next >= boards.length) return slot
    return { ...slot, ad: boardAd(ads, boards[next++]!, now, slot.price) }
  })
  return next ? { ...ads, billboards: { ...ads.billboards, slots: filled } } : ads
}
