/**
 * OWNER: world
 * THE WORLD FEED: the day's real exchange rates and each city's real weather, kept in memory and in one small stored collection.
 * Read docs/WORLD-FEED.md first. This file is the service; the parts are met.ts (the weather answer), rates.ts (the rates answer)
 * and schedule.ts (who is asked when).
 *
 * RUNS     on the host's heartbeat (Node: every 10 s; Worker: every 10 s while a socket is open, else its alarm every 5 min). Each beat
 *          asks for at most a few cities' weather (schedule.ts) and, once a day after 00:30 UTC, for the rates. Nothing is fetched
 *          while a player waits: a request is answered from memory. It does nothing unless the host says `ctx.worldFeed` (the real
 *          hosts do; a test turns it on with a fake fetch, so a test never makes an outside call by accident).
 * ONE SKY  every weather answer is set with setObservedWeather (src/game/weather-observed.ts), the same list the browser is given, so
 *          the rules engine on the server and on a phone read the same sky. When a city has none, the old cycle applies.
 * STORED   the collection `worldfeed`: { rates?: RatesRecord, weather?: { [city]: { at, expires, modified?, hours } }, seen?: { [city]: ms } }.
 *          Written lazily (durable: false) and only when something changed. An old or empty store simply starts the schedule over.
 * FAILURE  a failed weather request backs the city off (10 min, doubling, up to an hour; an hour at least after 403/429); the last good
 *          hours stay in use until they run out. If both rate sources fail, the last good record stays.
 */
import { cityCatalogueEntry, playableCityIds } from '../../src/game/cities/registry.ts';
import { CURRENCY_CODES, currencyOfCountry } from '../../src/game/currency.ts';
import { setCityMoney } from '../../src/game/money.ts';
import { readCityMoney } from '../../src/game/money-feed.ts';
import { HOUR_MS, MAX_OBSERVED_HOURS } from '../../src/game/weather-observed.ts';
import { readObservedWeather, setObservedWeather } from '../../src/game/weather-observed-read.ts';
import type { ObservedHour, SkyKind } from '../../src/game/weather-observed.ts';
import { pulseOf } from '../pulse.ts';
import { USER_AGENT, httpDate, metUrl, readMet } from './met.ts';
import { RATES_AFTER_MS, RATES_RETRY_MS, fetchRates, utcDay } from './rates.ts';
import type { FeedResponse, RatesRecord } from './rates.ts';
import { BUSY_WINDOW_MS, MIN_GAP_MS, backoffMs, capFor, dueCities } from './schedule.ts';
import type { Asked } from './schedule.ts';
import type { RouteContext } from '../types.ts';

/** What is kept of one city's last good answer. */
export interface WeatherEntry extends Asked { /** The service's `Last-Modified`, sent back as `If-Modified-Since`. */ modified?: string; hours: ObservedHour[] }
/** What GET /api/world/feed answers (besides `serverTime`). */
export interface FeedAnswer {
  /** The UTC day of the rates, or null when there are none yet. */
  day: string | null
  /** Units of each currency one US dollar buys: the city's own, NGN and USD. Absent codes are missing from the feed. */
  rates: Record<string, number>
  /** The city's own money (code, symbol, decimals), for the phone's money formatter (src/game/money.ts); null for an unknown country. */
  currency: { code: string; symbol: string; decimals: number } | null
  /** The city's observed hours, or null. */
  weather: { at: number; hours: readonly ObservedHour[] } | null
  credits: { weather: string; weatherUrl: string; rates: string | null; ratesUrl: string | null }
}
export interface WorldFeed {
  /** One beat: asks for what is due. Resolves with what it asked for. */
  tick(options?: { force?: boolean }): Promise<{ weather: string[]; rates: boolean }>
  /** The answer for a city, from memory. */
  answer(cityId: string): FeedAnswer
  /** Someone is in this city now. */
  seen(cityId: string): void
  /** The day's rates as held, or null. */
  rates(): RatesRecord | null
  /** Resolves once the stored record has been read. */
  ready: Promise<void>
  /** The owner's weather (docs/PRAYERS.md): `sky` over a city from now for `hours`, over the real weather. Returns when it ends. */
  override(cityId: string, sky: SkyKind, hours: number, tempC?: number | null): number
  /** The override in force over a city, or null. */
  overrideOf(cityId: string): { sky: SkyKind; from: number; until: number } | null
}

const SIX_HOURS = 6 * HOUR_MS;
const services = new WeakMap<RouteContext, WorldFeed>();
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export function worldFeedOf(ctx: RouteContext): WorldFeed {
  const known = services.get(ctx);
  if (known) return known;
  const built = build(ctx);
  services.set(ctx, built);
  return built;
}

function build(ctx: RouteContext): WorldFeed {
  const now = (): number => ctx.now();
  let rates: RatesRecord | null = null;
  let ratesRetryAt = 0;
  const weather = new Map<string, WeatherEntry>();
  /** When someone was last in each city. */
  const seen = new Map<string, number>();
  /** The owner's weather over a city, laid over the real hours (docs/PRAYERS.md). Kept in the stored record. */
  const overrides = new Map<string, { sky: SkyKind; tempC: number | null; from: number; until: number }>();
  const retry = new Map<string, number>();
  const fails = new Map<string, number>();
  let lastBeat = 0;
  let dirty = false;
  let running: Promise<{ weather: string[]; rates: boolean }> | null = null;

  const ready: Promise<void> = ctx.worldFeed === true
    ? ctx.store.read((db) => {
      const stored = Object.hasOwn(db, 'worldfeed') ? db['worldfeed'] : undefined;
      return isObject(stored) ? JSON.parse(JSON.stringify(stored)) as Record<string, unknown> : {};
    }).then((stored) => {
      const r = stored['rates'];
      if (isObject(r) && typeof r['day'] === 'string' && isObject(r['rates']) && typeof r['at'] === 'number') rates = { day: r['day'], base: 'USD', rates: r['rates'] as Record<string, number>, source: r['source'] === 'er-api' ? 'er-api' : 'jsdelivr', at: r['at'] };
      const w = stored['weather'];
      if (isObject(w)) for (const [id, value] of Object.entries(w)) {
        const hours = isObject(value) ? readObservedWeather({ hours: value['hours'] }) : null;
        if (!isObject(value) || !hours || typeof value['at'] !== 'number') continue;
        weather.set(id, { at: value['at'], expires: typeof value['expires'] === 'number' ? value['expires'] : 0, ...(typeof value['modified'] === 'string' ? { modified: value['modified'] } : {}), hours: [...hours.hours] });
        setObservedWeather(id, hours);
      }
      const o = stored['overrides'];
      if (isObject(o)) for (const [id, value] of Object.entries(o)) {
        if (isObject(value) && typeof value['sky'] === 'string' && typeof value['from'] === 'number' && typeof value['until'] === 'number' && value['until'] > now()) overrides.set(id, { sky: value['sky'] as SkyKind, tempC: typeof value['tempC'] === 'number' ? value['tempC'] : null, from: value['from'], until: value['until'] });
      }
      for (const id of overrides.keys()) publish(id);
      const s = stored['seen'];
      if (isObject(s)) for (const [id, at] of Object.entries(s)) if (typeof at === 'number') seen.set(id, at);
    }).catch(() => {})
    : Promise.resolve();
  ctx.startup?.push(ready);

  async function save(): Promise<void> {
    if (!dirty) return;
    dirty = false;
    const t = now();
    for (const [id, at] of seen) if (t - at > BUSY_WINDOW_MS) seen.delete(id);
    for (const [id, o] of overrides) if (o.until <= t) overrides.delete(id);
    const plain = { overrides: Object.fromEntries(overrides), rates, weather: Object.fromEntries([...weather].map(([id, e]) => [id, { at: e.at, expires: e.expires, ...(e.modified ? { modified: e.modified } : {}), hours: e.hours.map((h) => [...h]) }])), seen: Object.fromEntries(seen) };
    try { await ctx.store.transact((db) => { Object.assign(ctx.collection(db, 'worldfeed'), JSON.parse(JSON.stringify(plain))); }, { durable: false }); } catch { dirty = true; }
  }

  /** The hours a city shows: the real ones with the owner's sky laid over the hours it covers (the hours it adds when the feed has none). */
  function hoursOf(id: string): ObservedHour[] | null {
    const real = weather.get(id)?.hours ?? null, o = overrides.get(id);
    if (!o || o.until <= now()) return real ? [...real] : null;
    const byStart = new Map<number, ObservedHour>((real ?? []).map((h) => [h[0], h]));
    for (let start = Math.floor(o.from / HOUR_MS) * HOUR_MS; start < o.until; start += HOUR_MS) byStart.set(start, [start, o.sky, o.tempC ?? byStart.get(start)?.[2] ?? null]);
    return [...byStart.values()].sort((a, b) => a[0] - b[0]).filter((h) => h[0] + HOUR_MS > now()).slice(0, MAX_OBSERVED_HOURS);
  }
  /** Hands the city's hours (real and laid over) to the rules engine, so the server and every phone that asks read one sky. */
  function publish(id: string): void {
    const hours = hoursOf(id);
    setObservedWeather(id, hours ? readObservedWeather({ hours }) : null);
  }

  async function askRates(): Promise<boolean> {
    const t = now();
    if (rates?.day === utcDay(t) || t < ratesRetryAt || t - Date.parse(`${utcDay(t)}T00:00:00Z`) < RATES_AFTER_MS) return false;
    const record = await fetchRates((url, init) => ctx.fetch(url, init), t);
    if (!record) { ratesRetryAt = t + RATES_RETRY_MS; return true; }
    rates = record; dirty = true;
    return true;
  }

  async function askWeather(id: string): Promise<void> {
    const place = cityCatalogueEntry(id);
    if (!place) return;
    const t = now(), before = weather.get(id);
    const failed = (wait = 0): void => { const n = (fails.get(id) ?? 0) + 1; fails.set(id, n); retry.set(id, t + Math.max(wait, backoffMs(n))); };
    try {
      // If-Modified-Since only while the hours held still reach three hours on: a 304 must not leave a city without a sky.
      const last = before?.hours.at(-1);
      const fresh = before?.modified !== undefined && last !== undefined && last[0] + HOUR_MS - t >= 3 * HOUR_MS;
      const response = await ctx.fetch(metUrl(place.lat, place.lon), { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...(fresh ? { 'If-Modified-Since': before.modified } : {}) } }) as FeedResponse;
      const expires = Math.min(httpDate(response.headers.get('expires')) ?? 0, t + SIX_HOURS);
      if (response.status === 304 && before) { before.at = t; before.expires = expires; dirty = true; fails.delete(id); retry.delete(id); return; }
      if (!response.ok) { failed(response.status === 403 || response.status === 429 ? 3600000 : 0); return; }
      const hours = readMet(await response.json(), t);
      if (!hours) { failed(); return; }
      const modified = response.headers.get('last-modified');
      weather.set(id, { at: t, expires, ...(modified ? { modified } : {}), hours: [...hours.hours] });
      publish(id);
      fails.delete(id); retry.delete(id); dirty = true;
    } catch { failed(); }
  }

  async function run(): Promise<{ weather: string[]; rates: boolean }> {
    const t = now();
    const gap = t - lastBeat;
    lastBeat = t;
    const result = { weather: [] as string[], rates: false };
    // Someone is in these cities now (a city someone was in within the last day is asked for hourly). The page only reads; it never marks a city..
    try { for (const [id, people] of Object.entries(pulseOf(ctx).pulse(null).cities)) if (people > 0) markSeen(id); } catch { /* the pulse is not ready: no city is busy */ }
    result.rates = await askRates();
    let ids: readonly string[] = [];
    try { ids = playableCityIds(); } catch { /* the city index is not in yet */ }
    const last = new Map<string, Asked>();
    for (const [id, entry] of weather) last.set(id, entry);
    for (const id of dueCities({ ids, last, seen, retry, now: t, cap: capFor(gap) })) { await askWeather(id); result.weather.push(id); }
    await save();
    return result;
  }
  function markSeen(id: string): void { const t = now(); if (t - (seen.get(id) ?? 0) > 3600000) dirty = true; seen.set(id, t); }

  const service: WorldFeed = {
    ready,
    async tick({ force = false } = {}) {
      if (ctx.worldFeed !== true) return { weather: [], rates: false };
      if (running) return running;
      if (!force && now() - lastBeat < MIN_GAP_MS) return { weather: [], rates: false };
      await ready;
      running = run().catch(() => ({ weather: [], rates: false })).finally(() => { running = null; });
      return running;
    },
    answer(cityId) {
      const place = cityCatalogueEntry(cityId);
      const currency = currencyOfCountry(place?.countryISO);
      const own = currency?.code;
      const wanted = new Set([own, 'NGN', 'USD'].filter((code): code is string => typeof code === 'string' && CURRENCY_CODES.includes(code)));
      const out: Record<string, number> = {};
      if (rates) for (const code of wanted) { const rate = code === 'USD' ? 1 : rates.rates[code]; if (rate !== undefined) out[code] = rate; }
      const entry = weather.get(cityId);
      const shown = hoursOf(cityId);
      const fallback = rates?.source === 'er-api';
      const result: FeedAnswer = {
        day: rates?.day ?? null, rates: out, currency: currency ? { code: currency.code, symbol: currency.symbol, decimals: currency.decimals } : null,
        weather: shown ? { at: entry?.at ?? overrides.get(cityId)?.from ?? now(), hours: shown.filter((h) => h[0] + HOUR_MS > now()) } : null,
        credits: { weather: 'Weather data from MET Norway', weatherUrl: 'https://www.met.no/en', rates: fallback ? 'Rates By Exchange Rate API' : null, ratesUrl: fallback ? 'https://www.exchangerate-api.com' : null },
      };
      setCityMoney(cityId, readCityMoney(result)); // the server's own holder, so money(amount, city) works here too
      return result;
    },
    seen: markSeen,
    rates: () => rates,
    override(cityId, sky, hours, tempC = null) {
      const from = now(), until = from + Math.max(1, Math.min(hours, 6)) * HOUR_MS;
      overrides.set(cityId, { sky, tempC, from, until });
      dirty = true;
      publish(cityId);
      void save();
      return until;
    },
    overrideOf: (cityId) => { const o = overrides.get(cityId); return o && o.until > now() ? { sky: o.sky, from: o.from, until: o.until } : null; },
  };
  ctx.on?.('heartbeat', () => { const work = service.tick(); ctx.waitUntil?.(work); });
  return service;
}
