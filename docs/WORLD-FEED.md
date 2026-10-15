# The world feed: real weather and real exchange rates

Phase 4 of the "world alive" programme (`docs/agent-plans/world-alive/`). The code is `server/world-feed/`, the route
`server/routes/worldfeed.ts`, the shared rules `src/game/weather-observed.ts` and `src/game/currency.ts`, and the phone side
`src/app/features/world/`.

## What a player gets

- The weather in a city is the weather there now: clear, cloudy, fog, light rain, rain, heavy rain, thunderstorm, sleet, snow, or hot
  (a dry hour at 33 degrees or more). Rain, thunder and sleet soak a walker as the old rain did; snow, fog, cloud and heat do not.
  The Health app and the map show the temperature.
- Where the feed has nothing for an hour (a failed call, a new city, a server that has not asked yet) the game uses its old
  20-minute weather cycle, so nothing breaks and nothing is empty.
- The Help sheet ends with the credit "Weather data from MET Norway", and, only while the fallback rate source is the one in use,
  "Rates By Exchange Rate API" with its link.

## Sources and terms

| Data | Source | Terms |
| --- | --- | --- |
| Rates (primary) | `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json` | CC0, no key. |
| Rates (fallback) | `https://open.er-api.com/v6/latest/USD` | Free, caching allowed; needs a visible "Rates By Exchange Rate API" link wherever its rates are used. |
| Weather | `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=..&lon=..` | No key. User-Agent `Allworld/1.0 https://joinallworld.com`; credit "Weather data from MET Norway" (CC BY 4.0 / NLOD); coordinates cut to four decimals; `Expires` and `If-Modified-Since` respected. Heavy commercial use needs their agreement: ask once the game has real traffic. |

## How it runs

- Off by default. The Node host's entry point and the Cloudflare Worker turn it on (`ctx.worldFeed`); a test turns it on only with a
  fake `fetch`, so no test calls out. `WORLD_FEED=off` turns it off on the Node host and on the Worker (the edge tests set it).
- It rides the host's heartbeat (`ctx.on('heartbeat')`): every 10 seconds on Node, every 10 seconds on the Worker while a socket
  is open, and the Worker's 5-minute alarm otherwise. Work is kept alive with `ctx.waitUntil`. Nothing is fetched while a player waits.
- **Rates.** Once a day, after 00:30 UTC: the primary, then the fallback. Only the currencies of `src/game/currency.ts` are kept
  (six significant digits). An answer needs a naira rate and at least 20 of those currencies. If both fail, the last good record
  stays and the next try is 30 minutes later.
- **Weather.** Only for playable cities, at the city's catalogue coordinates. A city with a person in it (the pulse's per-city count)
  within the last day is asked every hour, any other every three hours, never before the service's `Expires`. Cities fall due in a
  queue, longest overdue first, busy ones first: at most 3 per beat on the Node host, 12 after a long pause (the Worker's alarm), so
  284 cities are never one burst. `If-Modified-Since` is sent only while the held hours still reach three hours ahead (a 304 must
  not leave a city without a sky). A failure backs the city off 10 minutes, doubling to an hour; a 403 or 429 waits at least an hour.
- **Kept.** The next eight hours of each answer, as `[hour start ms, kind, tempC]`. Kinds: `clear cloud fog lrain rain hrain storm sleet snow`.
  The symbol codes are mapped in `skyKindOf` (anything unknown is left out). Stored in the `worldfeed` collection, written lazily and
  only when something changed: `{ rates, weather: { [city]: { at, expires, modified?, hours } }, seen: { [city]: ms } }`.

## One sky

`weatherAt(now, city)` (`src/game/systems/health.ts`) first asks `observedSkyAt(city, blockStart)`: the observed hour that holds the
start of the 20-minute block decides. The server sets its lists as it fetches (and from the store at start-up); the phone sets
the same lists from `GET /api/world/feed`. The same list gives the same answer for the same block on both. With no hour it falls
back to the old cycle, unchanged. The returned object only gains optional fields (`observed`, `tempC`); `id` stays `clear` or `rain`.
The browser derives its views again when a city's observed weather changes (`onObservedWeather`).

## The route

`GET /api/world/feed?id=<city id>` is public (no session), limited to 30 a minute per address, `Cache-Control: public, max-age=300`.
It is `id`, not `city`, so that the host does not load the city's content for a call that never needs it.

```
{ day: "2026-10-14" | null,
  rates: { NGN: 1328.12, GHS: 15.3, USD: 1 },            // the city's own currency, NGN and USD; units per US dollar
  currency: { code: "GHS", symbol: "GH₵", decimals: 2 } | null,
  weather: { at, hours: [[hourStartMs, "rain", 24.5], ...] } | null,
  credits: { weather, weatherUrl, rates: null | "Rates By Exchange Rate API", ratesUrl } }
```

The phone reads it about a second and a half after the first frame (a dynamic import, not in the first download), when the city
changes, and every 30 minutes while the page is visible.

## Money

`src/game/currency.ts` maps every country the catalogue uses (241 codes, lower case; a city without one is in Nigeria) to ISO 4217
code, symbol and decimals. The formatter built on it is described in [CURRENCY.md](CURRENCY.md); the answer carries `currency: { code, symbol, decimals }` for it. The server answers rates only for the currencies of this table.
A new country in the catalogue must be added there; `currency.test.ts` fails otherwise.

## Tests

`server/world-feed/world-feed.test.ts` (recorded answers; the schedule; the rate fallback and last-good record; Expires, 304 and
429; the route; one sky on the server), `src/game/weather-observed.test.ts` (mapping, `weatherAt` override and fallback,
determinism), `src/game/currency.test.ts`, `src/app/features/world/worldFeed.test.ts`.
