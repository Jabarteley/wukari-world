/**
 * OWNER: world
 * THE WEATHER SERVICE'S ANSWER, reduced to what the game keeps (docs/WORLD-FEED.md).
 *
 * The service is MET Norway's locationforecast "compact" product. Its terms: no key; a User-Agent that names the app and its site;
 * the data under CC BY 4.0 and NLOD, credited as "Weather data from MET Norway"; coordinates with at most four decimals; and the
 * caller respects the `Expires` header and sends `If-Modified-Since` with the `Last-Modified` it was given.
 *
 * ANSWER   { properties: { timeseries: [{ time, data: { instant: { details: { air_temperature } }, next_1_hours?: { summary: { symbol_code } },
 *          next_6_hours?: ... } }] } }. The hours the game keeps are the ones that start at the top of an hour, from the one that holds `now`.
 *          A step that covers six hours (later in the forecast) is not used: the game only needs the next few hours.
 * Pure: no imports of the host, so the same code runs on both hosts.
 */
import { HOUR_MS, MAX_OBSERVED_HOURS, skyKindOf } from '../../src/game/weather-observed.ts';
import type { ObservedHour, ObservedWeather } from '../../src/game/weather-observed.ts';

export const MET_HOST = 'https://api.met.no/weatherapi/locationforecast/2.0/compact';
/** MET Norway asks every caller to name the app and the site. */
export const USER_AGENT = 'Allworld/1.0 https://joinallworld.com';
/** How many hours ahead are kept: enough to cover a three-hour interval and a failed attempt after it. */
export const KEEP_HOURS = 8;

/** The request for a city centre, with the coordinates cut to the four decimals the service allows. */
export const metUrl = (lat: number, lon: number): string => `${MET_HOST}?lat=${Number(lat.toFixed(4))}&lon=${Number(lon.toFixed(4))}`;

const timeOf = (value: unknown): number => (typeof value === 'string' ? Date.parse(value) : NaN);

/**
 * The hours of an answer from the one holding `now` on, at most KEEP_HOURS; null when the answer has none the game understands.
 * An hour whose symbol is not one the game knows is left out (the cycle covers it).
 */
export function readMet(answer: unknown, now: number): ObservedWeather | null {
  const series = (answer as { properties?: { timeseries?: unknown } } | null)?.properties?.timeseries;
  if (!Array.isArray(series)) return null;
  const hours: ObservedHour[] = [];
  for (const step of series as unknown[]) {
    const at = timeOf((step as { time?: unknown } | null)?.time);
    const data = (step as { data?: { instant?: { details?: { air_temperature?: unknown } }; next_1_hours?: { summary?: { symbol_code?: unknown } } } } | null)?.data;
    if (!Number.isFinite(at) || at % HOUR_MS !== 0 || at + HOUR_MS <= now) continue;
    const kind = skyKindOf(data?.next_1_hours?.summary?.symbol_code);
    if (!kind) continue;
    const temp = data?.instant?.details?.air_temperature;
    hours.push([at, kind, typeof temp === 'number' && Number.isFinite(temp) ? Math.round(temp * 10) / 10 : null]);
    if (hours.length >= Math.min(KEEP_HOURS, MAX_OBSERVED_HOURS)) break;
  }
  return hours.length ? { hours } : null;
}

/** An HTTP date header as ms, or null when it is missing or not a date. */
export function httpDate(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const at = Date.parse(value);
  return Number.isFinite(at) ? at : null;
}
