// The world feed (server/world-feed, docs/WORLD-FEED.md), with recorded answers only: no test here makes an outside call.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../test-fixture.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { worldFeedOf } from './service.ts';
import type { RouteContext, RouteModule } from '../types.ts';
import { CURRENCY_CODES } from '../../src/game/currency.ts';
import { HOUR_MS, clearObservedWeather, observedWeatherOf } from '../../src/game/weather-observed.ts';
import { weatherAt } from '../../src/game/systems/health.ts';
import { playableCityIds } from '../../src/game/cities/registry.ts';
import { FALLBACK_URL, PRIMARY_URL, fetchRates, readFallback, readPrimary, utcDay } from './rates.ts';
import { metUrl, readMet } from './met.ts';
import { BUSY_EVERY_MS, CAP_FAST, QUIET_EVERY_MS, backoffMs, dueCities } from './schedule.ts';
import type { Asked } from './schedule.ts';

const DAY = Date.UTC(2026, 9, 14, 1, 0, 0);

/** A recorded MET answer: ten hourly steps from the hour holding `at`, as the compact product sends them (plus a six-hour step at the end, which is not used). */
function metAnswer(at: number, symbols = ['heavyrainandthunder', 'clearsky_day', 'lightrainshowers_day', 'fog', 'snow', 'partlycloudy_night', 'fair_day', 'cloudy', 'rain', 'clearsky_night']) {
  const start = Math.floor(at / HOUR_MS) * HOUR_MS;
  const steps = symbols.map((symbol, i) => ({ time: new Date(start + i * HOUR_MS).toISOString(), data: { instant: { details: { air_temperature: 25 + i * 1.04 } }, next_1_hours: { summary: { symbol_code: symbol } } } }));
  steps.push({ time: new Date(start + 20 * HOUR_MS).toISOString(), data: { instant: { details: { air_temperature: 30 } }, next_6_hours: { summary: { symbol_code: 'rain' } } } } as never);
  return { type: 'Feature', properties: { meta: { updated_at: new Date(at).toISOString() }, timeseries: steps } };
}
const everyCode = (value: (code: string, i: number) => number): Record<string, number> => Object.fromEntries(CURRENCY_CODES.map((code, i) => [code, value(code, i)]));
const primaryAnswer = { date: '2026-10-14', usd: Object.fromEntries(Object.entries(everyCode((code, i) => (code === 'NGN' ? 1328.123456 : code === 'USD' ? 1 : 2 + i))).map(([c, v]) => [c.toLowerCase(), v]).concat([['btc', 0.00001], ['xyz', 3]])) };
const fallbackAnswer = { result: 'success', base_code: 'USD', rates: everyCode((code, i) => (code === 'NGN' ? 1331 : code === 'USD' ? 1 : 2 + i)) };
const json = (body: unknown, headers: Record<string, string> = {}, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

interface Call { url: string; headers: Record<string, string> }
/** A fake outside world: the two rate sources and MET, each of which a test can break or change. */
function outside(now: () => number) {
  const world = {
    calls: [] as Call[], primaryDown: false, fallbackDown: false, metStatus: 200, metExpiresMs: 0, notModified: false,
    metCalls: () => world.calls.filter((c) => c.url.startsWith('https://api.met.no/')),
    fetch: async (url: string, init: RequestInit = {}): Promise<Response> => {
      world.calls.push({ url, headers: { ...(init.headers as Record<string, string> | undefined) } });
      if (url === PRIMARY_URL) return world.primaryDown ? json({}, {}, 503) : json(primaryAnswer);
      if (url === FALLBACK_URL) return world.fallbackDown ? json({}, {}, 500) : json(fallbackAnswer);
      if (url.startsWith('https://api.met.no/')) {
        if (world.metStatus !== 200) return json({}, {}, world.metStatus);
        const expires = new Date(now() + (world.metExpiresMs || 0)).toUTCString();
        if (world.notModified) return new Response(null, { status: 304, headers: { expires } });
        return json(metAnswer(now()), { expires, 'last-modified': new Date(now()).toUTCString() });
      }
      throw new TypeError(`unexpected outside call ${url}`);
    },
  };
  return world;
}
/** A route module that keeps the context it is given, so a test can reach the service. */
function grabContext(): { ctx: RouteContext | null; module: RouteModule } {
  const grab: { ctx: RouteContext | null; module: RouteModule } = { ctx: null, module: (ctx) => { grab.ctx = ctx; return {}; } };
  return grab;
}
async function settled(world: { calls: unknown[] }): Promise<void> {
  let seen = -1;
  while (seen !== world.calls.length) { seen = world.calls.length; await new Promise((resolve) => setTimeout(resolve, 15)); }
}

test('MET answers become the game skies; a step that is not an hour, past, or unknown is left out', () => {
  const at = Date.UTC(2026, 9, 14, 12, 20);
  const read = readMet(metAnswer(at), at);
  assert.ok(read);
  assert.equal(read.hours.length, 8, 'at most eight hours are kept, and the six-hour step is not one of them');
  assert.deepEqual(read.hours.slice(0, 3).map((h) => h[1]), ['storm', 'clear', 'lrain']);
  assert.equal(read.hours[0]?.[0], Date.UTC(2026, 9, 14, 12));
  assert.equal(read.hours[1]?.[2], 26, 'temperature to one decimal');
  assert.equal(readMet(metAnswer(at), at + 3 * HOUR_MS)?.hours[0]?.[0], Date.UTC(2026, 9, 14, 15), 'hours already over are dropped');
  assert.equal(readMet(metAnswer(at, ['unknownthing']), at), null);
  assert.equal(readMet({}, at), null);
  assert.equal(readMet({ properties: { timeseries: [{ time: '2026-10-14T12:30:00Z', data: { next_1_hours: { summary: { symbol_code: 'rain' } } } }] } }, at), null, 'half past is not an hour step');
  assert.equal(metUrl(6.524379, 3.379206), 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=6.5244&lon=3.3792');
});

test('rates: only the game currencies, six digits; both sources are read; a thin answer is refused', () => {
  const primary = readPrimary(primaryAnswer);
  assert.equal(primary?.['NGN'], 1328.12);
  assert.equal(primary?.['USD'], 1);
  assert.ok(primary && !('BTC' in primary) && !('XYZ' in primary));
  assert.equal(readFallback(fallbackAnswer)?.['NGN'], 1331);
  assert.equal(readFallback({ result: 'error' }), null);
  assert.equal(readPrimary({ usd: { ngn: 1300 } }), null, 'too few currencies');
  assert.equal(readPrimary({ usd: { ...primaryAnswer.usd, ngn: 0 } }), null, 'no naira rate');
  assert.equal(readPrimary(null), null);
});

test('rates: the primary is asked first, the fallback when it fails, nothing when both fail', async () => {
  const world = outside(() => DAY);
  const first = await fetchRates(world.fetch, DAY);
  assert.deepEqual([first?.source, first?.day, world.calls.length], ['jsdelivr', '2026-10-14', 1]);
  world.primaryDown = true;
  const second = await fetchRates(world.fetch, DAY);
  assert.deepEqual([second?.source, second?.rates['NGN']], ['er-api', 1331]);
  world.fallbackDown = true;
  assert.equal(await fetchRates(world.fetch, DAY), null);
  assert.equal(await fetchRates(async () => { throw new TypeError('offline'); }, DAY), null);
  assert.equal(utcDay(Date.UTC(2026, 9, 14, 23, 59)), '2026-10-14');
});

test('schedule: busy hourly, quiet every three hours, Expires kept, a queue of a few, backoff doubling', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  const now = 10 * 86400000;
  const last = new Map<string, Asked>(ids.map((id) => [id, { at: now - 2 * 3600000, expires: 0 }]));
  const seen = new Map([['a', now - 1000], ['b', now - 100000000]]);
  const none = new Map<string, number>();
  assert.deepEqual(dueCities({ ids, last, seen, retry: none, now, cap: 10 }), ['a'], 'two hours on: only the busy one is due (b was last busy over a day ago)');
  assert.deepEqual(dueCities({ ids, last, seen, retry: none, now: now + 1800000, cap: 10 }), ['a'], 'half an hour on: the quiet ones are still two and a half hours old');
  assert.deepEqual(dueCities({ ids, last, seen, retry: none, now: now + 3600000, cap: 10 }).sort(), ids, 'three hours after their last ask the quiet ones are due too');
  last.set('a', { at: now - 2 * 3600000, expires: now + 5 * 3600000 });
  assert.ok(!dueCities({ ids, last, seen, retry: none, now, cap: 10 }).includes('a'), 'Expires is not undercut');
  assert.deepEqual(dueCities({ ids, last: new Map(), seen, retry: none, now, cap: CAP_FAST }), ['a', 'b', 'c'], 'never asked: a few per beat, busy first');
  assert.deepEqual(dueCities({ ids, last: new Map(), seen, retry: new Map([['a', now + 1]]), now, cap: 2 }), ['b', 'c'], 'a city that failed waits');
  assert.deepEqual([1, 2, 3, 4, 5, 9].map(backoffMs), [600000, 1200000, 2400000, 3600000, 3600000, 3600000]);
  assert.ok(BUSY_EVERY_MS < QUIET_EVERY_MS);
});

test('the feed through the server: no burst, one request each, UA, route shape, one sky on the server', async (t) => {
  clearObservedWeather();
  t.after(clearObservedWeather);
  let clock = () => 0;
  const world = outside(() => clock());
  const f = await fixture(t, { worldFeed: true, fetch: world.fetch });
  clock = f.now;
  f.advance(DAY - f.now());
  const playable = playableCityIds();
  assert.ok(playable.length > 100);

  // the very first beat after a long pause may take a dozen; every beat after it, only a few
  f.server.beat(); await settled(world);
  const afterFirst = world.metCalls().length;
  assert.ok(afterFirst > 0 && afterFirst <= 12, `first beat asked for ${afterFirst}`);
  assert.equal(world.calls.filter((c) => c.url === PRIMARY_URL).length, 1, 'the rates were asked for once');
  let most = 0;
  for (let i = 0; i < 120 && world.metCalls().length < playable.length; i += 1) {
    const before = world.metCalls().length;
    f.advance(10000); f.server.beat(); await settled(world);
    most = Math.max(most, world.metCalls().length - before);
  }
  assert.ok(most <= CAP_FAST, `a beat asked for ${most}`);
  const asked = world.metCalls().map((c) => c.url);
  assert.equal(new Set(asked).size, playable.length, 'every playable city once, none twice');
  assert.ok(world.metCalls().every((c) => c.headers['User-Agent'] === 'Allworld/1.0 https://joinallworld.com'), 'the app and site are named');
  assert.equal(world.calls.filter((c) => c.url === PRIMARY_URL).length, 1, 'the rates are not asked again the same day');

  // the route: from memory, public, cached
  const res = await f.request('/api/world/feed?id=lagos');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control') ?? '', /max-age=300/);
  const body = await res.json() as { day: string; rates: Record<string, number>; weather: { at: number; hours: [number, string, number | null][] }; credits: Record<string, unknown> };
  assert.equal(body.day, '2026-10-14');
  assert.deepEqual(Object.keys(body.rates).sort(), ['NGN', 'USD']);
  assert.equal(body.rates['NGN'], 1328.12);
  assert.equal(body.weather.hours[0]?.[1], 'storm');
  assert.deepEqual(body.credits, { weather: 'Weather data from MET Norway', weatherUrl: 'https://www.met.no/en', rates: null, ratesUrl: null });
  const accra = await (await f.request('/api/world/feed?id=accra')).json() as { rates: Record<string, number> };
  assert.deepEqual(Object.keys(accra.rates).sort(), ['GHS', 'NGN', 'USD']);
  assert.equal((await f.request('/api/world/feed?id=nowhere')).status, 400);
  assert.equal((await f.request('/api/world/feed')).status, 400);

  // one sky: the server's rules read the same hours the phone is given
  const hour = Math.floor(f.now() / HOUR_MS) * HOUR_MS;
  assert.deepEqual(observedWeatherOf('lagos')?.hours, body.weather.hours);
  const sky = weatherAt(hour + 60000, 'lagos');
  assert.deepEqual([sky.observed, sky.raining, sky.label], [true, true, 'Thunderstorm']);
  assert.equal(weatherAt(hour + HOUR_MS + 60000, 'lagos').raining, false, 'the clear hour after');
  assert.equal(weatherAt(hour + 3 * HOUR_MS + 60000, 'lagos').label, 'Fog');
});

test('the fallback rates are used and credited when the primary is down; the last good record survives total failure', async (t) => {
  clearObservedWeather();
  t.after(clearObservedWeather);
  let clock = () => 0;
  const world = outside(() => clock());
  world.metStatus = 503;
  world.primaryDown = true;
  const f = await fixture(t, { worldFeed: true, fetch: world.fetch });
  clock = f.now;
  f.advance(DAY - f.now());
  f.server.beat(); await settled(world);
  const first = await (await f.request('/api/world/feed?id=lagos')).json() as { day: string; rates: Record<string, number>; credits: { rates: string; ratesUrl: string } };
  assert.equal(first.rates['NGN'], 1331);
  assert.deepEqual([first.credits.rates, first.credits.ratesUrl], ['Rates By Exchange Rate API', 'https://www.exchangerate-api.com']);
  assert.ok(world.calls.some((c) => c.url === PRIMARY_URL) && world.calls.some((c) => c.url === FALLBACK_URL), 'primary first, then the fallback');

  // the next day both fail: yesterday's record stays; and a city whose weather failed has none (the cycle applies)
  world.fallbackDown = true;
  f.advance(86400000); f.server.beat(); await settled(world);
  const second = await (await f.request('/api/world/feed?id=lagos')).json() as { day: string; rates: Record<string, number>; weather: unknown };
  assert.equal(second.day, '2026-10-14', 'the last good record stays');
  assert.equal(second.rates['NGN'], 1331);
  assert.equal(second.weather, null);
  assert.equal(weatherAt(f.now(), 'lagos').observed, undefined);
  // and when a source comes back, the new day's record replaces it (a retry waits half an hour after a failure)
  world.primaryDown = false;
  f.advance(31 * 60000); f.server.beat(); await settled(world);
  const third = await (await f.request('/api/world/feed?id=lagos')).json() as { day: string; rates: Record<string, number>; credits: { rates: unknown } };
  assert.deepEqual([third.day, third.rates['NGN'], third.credits.rates], ['2026-10-15', 1328.12, null]);
});

test('Expires is respected even for a city with a person in it, and a 429 waits an hour', async (t) => {
  clearObservedWeather();
  t.after(clearObservedWeather);
  let clock = () => 0;
  const grab = grabContext();
  const world = outside(() => clock());
  const f = await fixture(t, { worldFeed: true, fetch: world.fetch, routes: [...ROUTE_MODULES, grab.module] });
  clock = f.now;
  f.advance(DAY - f.now());
  world.metExpiresMs = 5 * 3600000; // the service says: not before five hours
  // a person is in Lagos (the pulse reports it; tests need no life for that, so the service is told directly)
  const feed = worldFeedOf(grab.ctx!);
  feed.seen('lagos');
  const lagosUrl = metUrl(6.52, 3.38);
  const lagosCalls = (): Call[] => world.metCalls().filter((c) => c.url === lagosUrl);
  // fill the first pass
  for (let i = 0; i < 120 && world.metCalls().length < playableCityIds().length; i += 1) { f.advance(10000); f.server.beat(); await settled(world); }
  assert.equal(lagosCalls().length, 1);

  // an hour later: Lagos has a person in it (so it would be hourly), but the service said five hours, so nothing is asked
  const total = world.metCalls().length;
  f.advance(3600000 + 10000); f.server.beat(); await settled(world);
  assert.equal(world.metCalls().length, total, 'Expires is respected for busy cities too');

  // five hours on: Lagos is due, but behind the quiet cities that fell due earlier (a queue, longest overdue first); it is answered 304
  // and the held hours go on serving. The hours held no longer reach three hours ahead after five hours, so a full answer is asked for.
  world.metExpiresMs = 0; world.notModified = true;
  f.advance(4 * 3600000);
  const beatsUntil = async (done: () => boolean): Promise<void> => { for (let i = 0; i < 60 && !done(); i += 1) { f.advance(10000); f.server.beat(); await settled(world); } };
  await beatsUntil(() => lagosCalls().length >= 2);
  assert.equal(lagosCalls().length, 2);
  assert.equal(lagosCalls()[1]?.headers['If-Modified-Since'], undefined);
  world.notModified = false;

  // 429: the city waits at least an hour, whatever the schedule says
  world.metStatus = 429;
  f.advance(3 * 3600000);
  await beatsUntil(() => world.metCalls().some((c) => c.url === lagosUrl) && lagosCalls().length >= 4);
  const afterBlock = lagosCalls().length;
  f.advance(1800000); f.server.beat(); await settled(world);
  assert.equal(lagosCalls().length, afterBlock, 'no new ask within the hour after a 429');
  world.metStatus = 200;
  f.advance(3 * 3600000);
  await beatsUntil(() => lagosCalls().length > afterBlock);
  assert.ok(lagosCalls().length > afterBlock, 'asked again after the wait');
});

test('a busy city is asked hourly with If-Modified-Since while the held hours reach on; a 304 keeps them serving; a quiet city waits three hours', async (t) => {
  clearObservedWeather();
  t.after(clearObservedWeather);
  let clock = () => 0;
  const grab = grabContext();
  const world = outside(() => clock());
  const f = await fixture(t, { worldFeed: true, fetch: world.fetch, routes: [...ROUTE_MODULES, grab.module] });
  clock = f.now;
  f.advance(DAY - f.now());
  // a person is in Lagos (the pulse reports it; tests need no life for that, so the service is told directly)
  const feed = worldFeedOf(grab.ctx!);
  feed.seen('lagos');
  const lagosUrl = metUrl(6.52, 3.38), lagos = (): Call[] => world.metCalls().filter((c) => c.url === lagosUrl);
  const quietUrl = world.metCalls()[0]?.url;
  for (let i = 0; i < 120 && world.metCalls().length < playableCityIds().length; i += 1) { f.advance(10000); f.server.beat(); await settled(world); }
  assert.equal(lagos().length, 1);
  assert.equal(lagos()[0]?.headers['If-Modified-Since'], undefined, 'nothing to be modified since on the first ask');
  const quiet = world.metCalls().find((c) => c.url !== lagosUrl)?.url ?? '';
  const quietCalls = (): number => world.metCalls().filter((c) => c.url === quiet).length;
  void quietUrl;
  const before = quietCalls();
  const hour = Math.floor(f.now() / HOUR_MS) * HOUR_MS;

  // an hour on: Lagos only, with If-Modified-Since; the service says 304 and the hours held still serve
  world.notModified = true;
  f.advance(3600000 + 10000); f.server.beat(); await settled(world);
  assert.equal(lagos().length, 2, 'a busy city is asked every hour');
  assert.match(lagos()[1]?.headers['If-Modified-Since'] ?? '', /GMT$/);
  assert.equal(quietCalls(), before, 'a quiet city is not');
  assert.equal(weatherAt(hour + 60000, 'lagos').observed, true);
  assert.equal(weatherAt(hour + 60000, 'lagos').label, 'Thunderstorm', 'the hours held after a 304');

  // when the hours held no longer reach three hours on, the next ask is a full one
  world.notModified = false;
  f.advance(5 * 3600000); f.server.beat(); await settled(world);
  const full = lagos().filter((c) => c.headers['If-Modified-Since'] === undefined);
  assert.ok(full.length >= 2, 'a full answer is asked for once the held hours run short');
  // three hours after their first ask, the quiet cities are asked again (a queue: a few per beat)
  for (let i = 0; i < 20 && quietCalls() === before; i += 1) { f.advance(10000); f.server.beat(); await settled(world); }
  assert.equal(quietCalls(), before + 1);
});

test('a host that is not told to ask the outside world never does', async (t) => {
  const world = outside(() => DAY);
  const f = await fixture(t, { fetch: world.fetch });
  f.advance(DAY - f.now());
  f.server.beat(); await settled(world);
  assert.equal(world.calls.length, 0);
  const body = await (await f.request('/api/world/feed?id=lagos')).json() as { day: unknown; rates: unknown; weather: unknown };
  assert.deepEqual([body.day, body.rates, body.weather], [null, {}, null]);
});
