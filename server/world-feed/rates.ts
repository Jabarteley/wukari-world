/**
 * OWNER: world
 * THE DAY'S EXCHANGE RATES (docs/WORLD-FEED.md).
 *
 * PRIMARY   cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json   { date, usd: { ngn: 1328.1, ... } }
 *           about 340 currencies, daily, CC0, no key.
 * FALLBACK  open.er-api.com/v6/latest/USD   { result: 'success', rates: { NGN: 1331, ... } }   about 166 currencies, daily. Free, with
 *           caching allowed, on the condition that the page shows a link "Rates By Exchange Rate API" wherever its rates are used.
 *
 * Only the currencies of the game's countries are kept (src/game/currency.ts). An answer is accepted when it has a positive naira rate
 * and at least MIN_KEPT of those currencies; anything else counts as a failed source and the next one is asked.
 * Pure: the host's fetch is passed in.
 */
import { CURRENCY_CODES } from '../../src/game/currency.ts';

export const PRIMARY_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json';
export const FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD';
export const MIN_KEPT = 20;
export type RatesSource = 'jsdelivr' | 'er-api';
/** The day's record: rates against the US dollar (how many units of the currency one dollar buys). */
export interface RatesRecord { day: string; base: 'USD'; rates: Record<string, number>; source: RatesSource; /** When it was fetched (ms). */ at: number }

/** The UTC day, "2026-10-14". */
export const utcDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
/** Rates are fetched once the UTC day is this old (the sources publish after midnight). */
export const RATES_AFTER_MS = 30 * 60000;
/** After a failed attempt (both sources), wait this long. */
export const RATES_RETRY_MS = 30 * 60000;

/** Six significant digits: enough for money and small to keep. */
const six = (n: number): number => Number(n.toPrecision(6));

function keep(table: unknown, upper: boolean): Record<string, number> | null {
  if (typeof table !== 'object' || table === null) return null;
  const found: Record<string, number> = {};
  for (const code of CURRENCY_CODES) {
    const value = (table as Record<string, unknown>)[upper ? code : code.toLowerCase()];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) found[code] = six(value);
  }
  const naira = found['NGN'];
  return naira !== undefined && Object.keys(found).length >= MIN_KEPT ? found : null;
}
/** The primary source's answer as the kept rates, or null. */
export const readPrimary = (answer: unknown): Record<string, number> | null => keep((answer as { usd?: unknown } | null)?.usd, false);
/** The fallback source's answer as the kept rates, or null. */
export function readFallback(answer: unknown): Record<string, number> | null {
  const body = answer as { result?: unknown; rates?: unknown } | null;
  return body?.result === 'success' ? keep(body.rates, true) : null;
}

/** What the host's fetch gives back (the part read here). */
export interface FeedResponse { ok: boolean; status: number; headers: { get(name: string): string | null }; json(): Promise<unknown> }

/** Asks the primary source, then the fallback; the day's record, or null when both failed. Never throws. */
export async function fetchRates(get: (url: string, init?: object) => Promise<unknown>, now: number): Promise<RatesRecord | null> {
  const sources: [RatesSource, string, (answer: unknown) => Record<string, number> | null][] = [['jsdelivr', PRIMARY_URL, readPrimary], ['er-api', FALLBACK_URL, readFallback]];
  for (const [source, url, read] of sources) {
    try {
      const response = await get(url, { headers: { Accept: 'application/json' } }) as FeedResponse;
      if (!response.ok) continue;
      const rates = read(await response.json());
      if (rates) return { day: utcDay(now), base: 'USD', rates, source, at: now };
    } catch { /* this source failed: the next one is asked */ }
  }
  return null;
}
