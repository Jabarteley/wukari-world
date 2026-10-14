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
export interface CityMoney { readonly day: string; readonly code: string; readonly symbol: string /* with a trailing space when it is letters ("KSh ") */; readonly decimals: number; readonly perUsd: number; readonly ngnPerUsd: number }

/** Each city's money (read by money-feed.ts). */
export const held = new Map<string, CityMoney>()
let displayCity: string | null = null
let listener: (() => void) | null = null
const changed = (): void => listener?.()

/** Calls `run` whenever the display city or a city's rates change (the UI re-reads its amounts). One listener: the UI formatter's. */
export const onMoneyChange = (run: () => void): void => { listener = run }

/** The city the page shows amounts for (null: naira). */
export const displayCityId = (): string | null => displayCity
export function setDisplayCity(cityId: string | null): void { if (displayCity !== cityId) { displayCity = cityId; changed() } }

/** Sets a city's money. The same day keeps the first rates it was given (frozen); a new day replaces them. */
export function setCityMoney(cityId: string, value: CityMoney | null): void {
  if (!value || held.get(cityId)?.day === value.day) return
  held.set(cityId, value)
  changed()
}

/** Naira as it has always been written: ₦5,000. */
export const naira = (value: unknown): string => `₦${Math.round(Number(value) || 0).toLocaleString('en-NG')}`

/** The amount (naira) written in the city's currency at the day's rate; ₦ when the city is Nigerian, has no rate, or is not given. */
export function money(value: unknown, cityId: string | null = displayCity): string {
  const rate = cityId === null ? undefined : held.get(cityId)
  if (!rate || rate.code === 'NGN') return naira(value)
  const amount = Number(value) || 0, converted = amount / rate.ngnPerUsd * rate.perUsd, abs = Math.abs(converted)
  const places = rate.decimals === 0 || Math.round(abs * 100) / 100 >= 100 ? 0 : 2 // whole units from 100 up
  const shown = Math.max(Math.round(abs * 10 ** places) / 10 ** places, amount ? 10 ** -places : 0) // never zero for a non-zero amount
  return `${converted < 0 ? '-' : ''}${rate.symbol}${shown.toLocaleString('en-NG', { minimumFractionDigits: places, maximumFractionDigits: places })}`
}
