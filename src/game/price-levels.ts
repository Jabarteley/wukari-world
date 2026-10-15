/**
 * REAL PRICE LEVELS (docs/PRICE-LEVELS.md)
 * ===========================================================================
 * A city's prices and wages are the base values (written for Lagos, in naira) times its country's price level against Nigeria (= 1),
 * so London is dear and pays more, and Accra is close to Lagos. The levels come from the World Bank's open price-level data
 * (price-levels-data.ts, written by scripts/price-levels.ts once a year; CC BY 4.0). Nothing is fetched at runtime.
 *
 * ONE PLACE  the city registry (cities/registry.ts) calls `scaleCityContent` once, when a city's content is loaded, for a city outside
 *            Nigeria. The rules then read already-scaled rent, move-in, shift pay, ladder pay, activity prices and rewards, local fares
 *            and goal rewards from the city's content, so no rule knows about price levels. The shared catalogues that are not city
 *            content (furniture, groceries, cars) are scaled by the 'shop.price' modifier in systems/economy.ts, which asks `levelOf`.
 *            A Nigerian city (and any city whose level is exactly 1) gets its content back untouched: byte for byte the same objects.
 * NOT SCALED  what is not a price or a wage: the starting purse and the family loan, goal targets, stored balances, fares between cities,
 *            and wardrobe prices. Stored amounts are never rewritten; the level only changes what a city's rules ask for from now on.
 * Pure, tiny, no table: the table (price-levels-data.ts) is a lazy file that the registry fetches with the first city outside Nigeria.
 */
import { naira } from './money.ts'
import type { ActivityChoice, ActivityFields, CityContent, JobDefinition, SpotDefinition, VenueDefinition, WishDefinition } from '../types/content.ts'

/** The data file's shape (price-levels-data.ts). */
export interface PriceLevelData { readonly year: number; readonly source: string; readonly url: string; readonly licence: string; readonly licenceUrl: string; readonly levels: Readonly<Record<string, readonly [number, number]>> }

/** A level is kept inside this range: the World Bank's figure swings wildly where a currency has collapsed or was redenominated. */
export const LEVEL_MIN = 0.5
export const LEVEL_MAX = 4
/** Catalogue codes that are not countries, read as the country whose money they use. */
const ALIASES: Readonly<Record<string, string>> = { cyn: 'tr', kas: 'in', sol: 'so', atc: 'au', ioa: 'au' }

/** The price level of a country against Nigeria (Nigeria = 1), kept within LEVEL_MIN..LEVEL_MAX. No country, Nigeria, or a country the data does not have: 1. */
export function priceLevelOf(data: PriceLevelData, country?: string | null): number {
  const key = country ? country.toLowerCase() : 'ng'
  const own = data.levels[ALIASES[key] ?? key], base = data.levels['ng']
  if (!own || !base || key === 'ng' || key === 'nigeria' || !(own[0] > 0) || !(base[0] > 0)) return 1
  return Math.min(LEVEL_MAX, Math.max(LEVEL_MIN, Math.round((own[0] / base[0]) * 100) / 100))
}

/** A price or a wage times the level, rounded the way the game writes money: to ₦100 from ₦1,000 up, ₦10 from ₦100 up, else whole naira; a non-zero amount stays at least ₦1. */
export function scaleNaira(amount: number, level: number): number {
  if (!(amount > 0) || level === 1) return amount
  const raw = amount * level, step = raw >= 1000 ? 100 : raw >= 100 ? 10 : 1
  return Math.max(1, Math.round(raw / step) * step)
}
/** The level of a loaded city (1 for a Nigerian one). Used by the 'shop.price' modifier. */
export const levelOf = (content: Pick<CityContent, 'priceLevel'> | null | undefined): number => content?.priceLevel ?? 1

const money = <T extends Partial<Record<K, number>>, K extends string>(object: T, keys: readonly K[], level: number): T => {
  let out: T | null = null
  for (const key of keys) { const value = object[key]; if (typeof value === 'number' && value > 0) { out ??= { ...object }; (out as Record<K, number>)[key] = scaleNaira(value, level) } }
  return out ?? object
}
const fields = <T extends ActivityFields & { choices?: ActivityChoice[] }>(def: T, level: number): T => {
  const paid = money(def, ['cost', 'reward'] as const, level)
  return def.choices ? { ...paid, choices: def.choices.map((choice) => fields(choice, level)) } : paid
}
const spots = (all: Record<string, SpotDefinition>, level: number): Record<string, SpotDefinition> =>
  Object.fromEntries(Object.entries(all).map(([id, spot]) => [id, { ...spot, activities: spot.activities.map((def) => fields(def, level)) }]))
const venue = (def: VenueDefinition, level: number): VenueDefinition => ({ ...def, spots: spots(def.spots, level) })
const job = (def: JobDefinition, level: number): JobDefinition =>
  def.track ? { ...def, shift: fields(def.shift, level), ladder: def.ladder.map((rung) => ({ ...rung, pay: scaleNaira(rung.pay, level) })) } : { ...def, shift: fields(def.shift, level) }
const wish = (item: WishDefinition, level: number): WishDefinition => {
  if (item.on !== 'earn') return item
  const amount = scaleNaira(item.amount, level)
  return { ...item, amount, label: item.label.replace(naira(item.amount), naira(amount)) }
}

/** The city's content with every price and wage times `level`; `priceLevel` records it. A level of 1 returns the content itself. */
export function scaleCityContent<C extends CityContent>(content: C, level: number): C {
  if (level === 1) return content
  return Object.freeze({
    ...content,
    priceLevel: level,
    venues: Object.freeze(content.venues.map((item) => Object.freeze({ ...item, definition: venue(item.definition, level) }))),
    workplaces: Object.freeze(content.workplaces.map((item) => Object.freeze({ ...item, definition: job(item.definition, level) }))),
    housing: Object.freeze(content.housing.map((item) => Object.freeze({ ...item, definition: money(item.definition, ['rent', 'moveIn'] as const, level) }))),
    ...(content.localModes ? { localModes: Object.freeze(content.localModes.map((mode) => money(mode, ['fare'] as const, level))) } : {}),
    ...(content.localRoutes ? { localRoutes: Object.freeze(content.localRoutes.map((route) => money(route, ['fare'] as const, level))) } : {}),
    starterGoals: Object.freeze(content.starterGoals.map((goal) => money(goal, ['cash'] as const, level))),
    wishes: Object.freeze(content.wishes.map((item) => wish(item, level))),
  })
}
