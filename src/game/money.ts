/**
 * MONEY IN THE CITY'S OWN CURRENCY (docs/CURRENCY.md)
 * ===========================================================================
 * The game's unit is the naira and nothing stored changes. This file only decides how an amount is WRITTEN: in a city with a known rate the
 * naira amount is converted at the day's rate (from the world feed, docs/WORLD-FEED.md) and shown in that city's currency (£3.40, GH₵ 45,
 * KSh 1,200). With no rate, or in Nigeria, it is written exactly as it always was (₦5,000). Pure and shared: the browser fills it from
 * GET /api/world/feed, the server from its feed cache, so one function works on both hosts. No imports: it is in the first download.
 *
 * FROZEN  a city's rates are kept for the feed's day; a later answer for the same day does not move them, so a price never flickers.
 * ROUNDED whole units from 100 up (and for money with no minor unit), two decimals below; a non-zero amount is never written as zero:
 *         it shows the smallest unit (£0.01).
 * WHERE   `display city` is the one the player is in on this page (the browser sets it; the server never does, so server-built text stays ₦).
 */

/** One city's money for one day: units of its currency and of naira per US dollar. */
export interface CityMoney { readonly day: string; readonly code: string; readonly symbol: string; readonly decimals: number; readonly perUsd: number; readonly ngnPerUsd: number }

const held = new Map<string, CityMoney>()
let displayCity: string | null = null
const listeners = new Set<() => void>()
const changed = (): void => { for (const run of listeners) run() }

/** Calls `run` whenever the display city or a city's rates change (the UI re-reads its amounts). Returns a stopper. */
export function onMoneyChange(run: () => void): () => void { listeners.add(run); return () => { listeners.delete(run) } }

/** The city the page shows amounts for (null: naira). */
export const displayCityId = (): string | null => displayCity
export function setDisplayCity(cityId: string | null): void { if (displayCity !== cityId) { displayCity = cityId; changed() } }

/** Sets a city's money. The same day keeps the first rates it was given (frozen); a new day replaces them; null forgets the city. */
export function setCityMoney(cityId: string, value: CityMoney | null): void {
  const before = held.get(cityId)
  if (!value) { if (before) { held.delete(cityId); changed() } return }
  if (before && before.day === value.day) return
  held.set(cityId, value)
  changed()
}
export const cityMoneyOf = (cityId: string): CityMoney | null => held.get(cityId) ?? null

const naira = (value: unknown): string => `₦${Math.round(Number(value) || 0).toLocaleString('en-NG')}`

/** How many decimals an amount of this size is written with. */
const shownDecimals = (decimals: number, converted: number): number => (decimals === 0 || Math.round(Math.abs(converted) * 100) / 100 >= 100 ? 0 : 2)

/** The amount (naira) written in the city's currency at the day's rate; ₦ when the city is Nigerian, has no rate, or is not given. */
export function money(value: unknown, cityId: string | null = displayCity): string {
  const rate = cityId === null ? undefined : held.get(cityId)
  const amount = Number(value) || 0
  if (!rate || rate.code === 'NGN') return naira(amount)
  const converted = amount / rate.ngnPerUsd * rate.perUsd
  const places = shownDecimals(rate.decimals, converted)
  const unit = 10 ** -places
  let shown = Math.round(Math.abs(converted) * 10 ** places) / 10 ** places
  if (amount !== 0 && shown === 0) shown = unit
  const digits = shown.toLocaleString('en-NG', { minimumFractionDigits: places, maximumFractionDigits: places })
  const space = rate.symbol.length >= 2 && /\p{L}/u.test(rate.symbol) && !rate.symbol.endsWith('$') ? ' ' : ''
  return `${converted < 0 ? '-' : ''}${rate.symbol}${space}${digits}`
}

/** The naira value as written when pressing an amount ("≈ ₦5,000"), or null when the amount is already in naira. */
export function nairaHint(value: unknown, cityId: string | null = displayCity): string | null {
  const rate = cityId === null ? undefined : held.get(cityId)
  return !rate || rate.code === 'NGN' ? null : `≈ ${naira(value)}`
}

/** Forgets every city's money and the display city (tests). */
export function clearMoney(): void { held.clear(); displayCity = null; changed() }
