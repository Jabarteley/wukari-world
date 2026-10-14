/**
 * READING AND SHORTENING MONEY (docs/CURRENCY.md)
 * ===========================================================================
 * The parts of src/game/money.ts that are not needed at first paint: reading a world-feed answer into a city's money (the feed module and
 * the server's feed service call it) and the short form (£1.2k) for the top bar and boards. Kept apart so the first download carries only
 * the writer.
 */
import { displayCityId, held, money, setDisplayCity } from './money.ts'
import type { CityMoney } from './money.ts'

/** Reads the feed answer's `day`, `rates` and `currency` into a city's money, or null when anything is missing or not a usable number. */
export function readCityMoney(feed: unknown): CityMoney | null {
  if (typeof feed !== 'object' || feed === null) return null
  const { day, rates, currency } = feed as { day?: unknown; rates?: unknown; currency?: unknown }
  if (typeof day !== 'string' || typeof rates !== 'object' || rates === null || typeof currency !== 'object' || currency === null) return null
  const { code, symbol, decimals } = currency as { code?: unknown; symbol?: unknown; decimals?: unknown }
  if (typeof code !== 'string' || typeof symbol !== 'string' || (decimals !== 0 && decimals !== 2 && decimals !== 3)) return null
  const table = rates as Record<string, unknown>
  const perUsd = code === 'USD' ? 1 : table[code]
  const ngnPerUsd = table['NGN']
  const usable = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0
  return usable(perUsd) && usable(ngnPerUsd) ? { day, code, symbol: symbol + (symbol.length >= 2 && /\p{L}/u.test(symbol) && !symbol.endsWith('$') ? ' ' : ''), decimals, perUsd, ngnPerUsd } : null
}

/** A short form for tight spaces in the city's currency (£1.2k, KSh 34k, $3.4m, rounded down), or null when naira applies (the caller keeps its naira form). */
export function compactMoney(value: unknown, cityId: string | null = displayCityId()): string | null {
  const rate = cityId === null ? null : (held.get(cityId) ?? null)
  if (!rate || rate.code === 'NGN') return null
  const converted = (Number(value) || 0) / rate.ngnPerUsd * rate.perUsd
  const abs = Math.abs(converted), tier = abs >= 1e9 ? 3 : abs >= 1e6 ? 2 : abs >= 1e3 ? 1 : 0
  if (!tier) return money(value, cityId)
  const scaled = abs / 1000 ** tier
  return `${converted < 0 ? '-' : ''}${rate.symbol}${scaled < 10 ? Math.floor(scaled * 10) / 10 : Math.floor(scaled)}${'kmb'.charAt(tier - 1)}`
}


/** Forgets every city's money and the display city (tests). */
export function clearMoney(): void { held.clear(); setDisplayCity(null) }
