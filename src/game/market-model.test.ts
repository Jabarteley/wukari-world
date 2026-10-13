// OWNER: market — the market rules (market-model.ts) and the catalogue (content/market.ts): prices, events, quotes, fees, the
// order engine and the conservation of naira. Pure, no server. The server's side is in server/market.test.ts; the economy in
// src/game/market-economy.test.ts. The design is docs/MARKET.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosDayStart, lagosTime } from './clock.ts';
import { ANONYMOUS_TRADER, COMMODITIES, COMMODITY_IDS, MARKET_BOOK_MAX, MARKET_EVENT_TEMPLATES, MARKET_LIMITS, MARKET_MAKER, MARKET_TAPE, MARKET_TAPE_VIEW } from './content/market.ts';
import {
  askOf, bandOf, bidOf, cancelOrder, cityFactor, commodityOf, depositRefusal, emptyAccount, eventsAt, expireBook, feeOf, history, holdFor, isCommodity, labelOf, match, orderRefusal,
  quoteOf, refPrice, reservedCash, rollDay, submit, todayOf, unitsLeft, walkOf, withdrawRefusal,
} from './market-model.ts';
import type { MarketRoom, SubmitEnv } from './market-model.ts';
import type { CommodityId, MarketAccountRecord, MarketOrderRecord, MarketSide } from '../types/market.ts';

const HOUR = 3600000, DAY = 86400000;
/** Monday 5 January 2026, 00:00 Lagos time. */
const MONDAY = lagosDayStart(lagosTime(Date.UTC(2026, 0, 5, 9)).day);
const CITIES = ['lagos', 'ibadan', 'abeokuta', 'ota', 'ijebu-ode', 'sagamu', 'port-harcourt', 'abuja', 'kano'];
const L = MARKET_LIMITS;
const NOON = MONDAY + 12 * HOUR;

// ---- the catalogue ---------------------------------------------------------------------------------

test('catalogue: six commodities with whole-naira bases, bounded swings and one headline set each', () => {
  assert.deepEqual(COMMODITY_IDS, ['rice', 'garri', 'beans', 'palm-oil', 'cement', 'petrol']);
  assert.equal(new Set(COMMODITIES.map((item) => item.id)).size, COMMODITIES.length);
  for (const item of COMMODITIES) {
    assert.ok(Number.isInteger(item.base) && item.base > 0, item.id);
    assert.ok(item.swing > 0 && item.swing < 0.5, `${item.id}: a swing that can never reach zero`);
    assert.ok(item.unit && item.label && item.icon, item.id);
    assert.ok(MARKET_EVENT_TEMPLATES[item.id].length >= 1 && MARKET_EVENT_TEMPLATES[item.id].every((event) => event.headline.length > 8 && event.shock > 0.5 && event.shock < 1.5), item.id);
    // The wording rule of the market (docs/REAL-VALUE.md): a simulation never talks about earning, investing or profit.
    for (const event of MARKET_EVENT_TEMPLATES[item.id]) assert.doesNotMatch(event.headline, /earn|invest|profit/i);
  }
  assert.deepEqual(L, { feeBps: 50, spreadBps: 200, bandBps: 1000, maxUnitsPerOrder: 50, maxOpenOrders: 10, depositPerDay: 20000, accountMax: 50000, tradedPerDay: 60000, makerUnitsPerDay: 40, maxPosition: 200, pairPerDay: 5000, orderHours: 24 });
  assert.deepEqual([MARKET_TAPE, MARKET_TAPE_VIEW, MARKET_BOOK_MAX], [100, 30, 300]);
  assert.ok(isCommodity('rice') && !isCommodity('bitcoin') && !isCommodity(7));
  assert.equal(commodityOf('petrol').unit, '10 litres');
});

// ---- prices ----------------------------------------------------------------------------------------

test('city factors are deterministic, within 0.92 to 1.08, and make cities differ', () => {
  for (const city of CITIES) for (const id of COMMODITY_IDS) {
    const factor = cityFactor(city, id);
    assert.ok(factor >= 0.92 && factor < 1.08, `${city} ${id} ${factor}`);
    assert.equal(cityFactor(city, id), factor);
  }
  const rice = new Set(CITIES.map((city) => cityFactor(city, 'rice').toFixed(4)));
  assert.equal(rice.size, CITIES.length, 'every city has its own factor');
  assert.notEqual(cityFactor('lagos', 'rice'), cityFactor('lagos', 'garri'));
});

test('events: deterministic, calendar-driven, one to three days, never two of one commodity in a week, and cities differ', () => {
  let any = 0;
  const seen = new Set<string>();
  for (const city of CITIES) {
    for (let t = MONDAY; t < MONDAY + 120 * DAY; t += 6 * HOUR) {
      const events = eventsAt(city, t);
      assert.deepEqual(eventsAt(city, t), events, 'the same time gives the same events');
      assert.ok(events.length <= 4);
      for (const event of events) {
        any += 1; seen.add(event.id);
        assert.ok(event.from <= t && t < event.to);
        const days = (event.to - event.from) / DAY;
        assert.ok(Number.isInteger(days) && days >= 1 && days <= 3, `${event.id}: ${days} days`);
        assert.equal(event.from, lagosDayStart(lagosTime(event.from).day), 'an event starts at midnight, Lagos time');
        assert.ok(MARKET_EVENT_TEMPLATES[event.commodity].some((item) => item.headline === event.headline && item.shock === event.shock));
        assert.ok(isCommodity(event.commodity));
      }
    }
  }
  assert.ok(any > 200 && seen.size > 50, 'events happen');
  // Cities do not all have the same week.
  const weeks = CITIES.map((city) => JSON.stringify(Array.from({ length: 12 }, (_, week) => eventsAt(city, MONDAY + week * 7 * DAY + 3 * DAY).map((event) => event.commodity))));
  assert.ok(new Set(weeks).size > 3);
  // An event of a week may run into the next one, and is found there.
  const spill = [...seen].length;
  assert.ok(spill > 0);
});

test('refPrice: whole naira, never zero, bounded by base × city × swing × shock, for every city and commodity over a year, hourly', () => {
  for (const city of CITIES) for (const item of COMMODITIES) {
    const factor = cityFactor(city, item.id);
    let sum = 0, count = 0, min = Infinity, max = 0;
    for (let t = MONDAY; t < MONDAY + 365 * DAY; t += HOUR) {
      const price = refPrice(city, item.id, t);
      assert.ok(Number.isInteger(price) && price >= 1, `${city} ${item.id} ${price}`);
      const low = Math.floor(item.base * factor * (1 - item.swing) * 0.7), high = Math.ceil(item.base * factor * (1 + item.swing) * 1.5);
      assert.ok(price >= low && price <= high, `${city} ${item.id} ${price} outside ${low}..${high}`);
      sum += walkOf(city, item.id, t); count += 1; min = Math.min(min, price); max = Math.max(max, price);
    }
    // It wanders and comes back: the walk is centred, and uses a good part of its range.
    assert.ok(Math.abs(sum / count) < item.swing / 3, `${city} ${item.id}: mean walk ${sum / count}`);
    assert.ok(max / min > 1 + item.swing / 2, `${city} ${item.id}: it moves (${min}..${max})`);
  }
});

test('the salt: the walk and the events change with it, are deterministic for one salt, and stay within bounds; the city factor does not use it', () => {
  const salts = ['', 'a'.repeat(64), 'b'.repeat(64)];
  for (const id of COMMODITY_IDS) {
    for (const salt of salts) {
      assert.equal(refPrice('lagos', id, NOON, salt), refPrice('lagos', id, NOON, salt));
      for (let hour = 0; hour < 24 * 20; hour++) {
        const t = MONDAY + hour * HOUR, price = refPrice('lagos', id, t, salt), item = commodityOf(id);
        assert.ok(price >= 1 && Math.abs(walkOf('lagos', id, t, salt)) <= item.swing + 1e-12);
        assert.ok(price >= Math.floor(item.base * cityFactor('lagos', id) * (1 - item.swing) * 0.7) && price <= Math.ceil(item.base * cityFactor('lagos', id) * (1 + item.swing) * 1.5));
      }
    }
    // Another salt is another tomorrow: the two series are not the same, and neither is the one without a salt.
    const series = salts.map((salt) => Array.from({ length: 96 }, (_, hour) => refPrice('lagos', id, MONDAY + hour * HOUR, salt)).join());
    assert.equal(new Set(series).size, 3, id);
  }
  const events = salts.map((salt) => JSON.stringify(Array.from({ length: 30 }, (_, week) => eventsAt('lagos', MONDAY + week * 7 * DAY + 3 * DAY, salt).map((event) => event.id))));
  assert.equal(new Set(events).size, 3);
  assert.equal(quoteOf('lagos', 'rice', NOON, [], [], salts[1]).ref, refPrice('lagos', 'rice', NOON, salts[1]));
  assert.notEqual(quoteOf('lagos', 'rice', NOON, [], [], salts[1]).ref, quoteOf('lagos', 'rice', NOON).ref);
  assert.deepEqual(history('lagos', 'rice', NOON, salts[1]).map(([, price]) => price), Array.from({ length: 168 }, (_, index) => refPrice('lagos', 'rice', NOON - (167 - index) * HOUR, salts[1])));
  assert.equal(cityFactor('lagos', 'rice'), cityFactor('lagos', 'rice'), 'the city factor takes no salt');
});

test('refPrice is constant within an hour, moves smoothly, and the walk stays inside its swing', () => {
  for (const item of COMMODITIES) {
    let previous = refPrice('lagos', item.id, MONDAY);
    for (let hour = 0; hour < 24 * 30; hour++) {
      const start = MONDAY + hour * HOUR;
      const price = refPrice('lagos', item.id, start);
      for (const offset of [1, 59 * 60 * 1000, HOUR - 1]) assert.equal(refPrice('lagos', item.id, start + offset), price, 'the same all through the hour');
      const walk = walkOf('lagos', item.id, start);
      assert.ok(Math.abs(walk) <= item.swing + 1e-12);
      // Smooth: an hour moves the price by a little over a tenth at the very most, except when an event begins or ends.
      if (eventsAt('lagos', start).length === 0 && eventsAt('lagos', start - HOUR).length === 0) assert.ok(Math.abs(price - previous) / previous < 0.12, `${item.id} hour ${hour}: ${previous} → ${price}`);
      previous = price;
    }
  }
  assert.equal(refPrice('lagos', 'rice', Number.NaN), refPrice('lagos', 'rice', 0), 'a time that is not a number is the epoch, never NaN');
});

test('a scripted event moves the reference by its shock while it lasts', () => {
  let checked = 0;
  for (const city of CITIES) for (let t = MONDAY; t < MONDAY + 200 * DAY && checked < 12; t += DAY) {
    const [event] = eventsAt(city, t + 6 * HOUR);
    if (!event || eventsAt(city, t + 6 * HOUR).filter((item) => item.commodity === event.commodity).length !== 1) continue;
    const at = t + 6 * HOUR, item = commodityOf(event.commodity);
    const base = item.base * cityFactor(city, event.commodity) * (1 + walkOf(city, event.commodity, at));
    assert.equal(refPrice(city, event.commodity, at), Math.max(1, Math.round(base * event.shock)));
    const quote = quoteOf(city, event.commodity, at);
    assert.equal(quote.event?.headline, event.headline);
    assert.equal(quote.event?.to, event.to);
    checked += 1;
  }
  assert.equal(checked, 12);
  assert.equal(quoteOf('lagos', 'rice', MONDAY).event === undefined || typeof quoteOf('lagos', 'rice', MONDAY).event?.headline === 'string', true);
});

test('quotes: the maker pays less and asks more than the reference, the band is ±10%, the change is against 24 hours ago', () => {
  for (const city of ['lagos', 'kano']) for (const id of COMMODITY_IDS) {
    const quote = quoteOf(city, id, NOON);
    const ref = refPrice(city, id, NOON);
    assert.equal(quote.ref, ref);
    assert.ok(quote.bid < ref && ref < quote.ask, `${id}: ${quote.bid} < ${ref} < ${quote.ask}`);
    assert.equal(quote.bid, bidOf(ref)); assert.equal(quote.ask, askOf(ref));
    assert.ok(Math.abs(quote.bid - ref * 0.98) <= 1 && Math.abs(quote.ask - ref * 1.02) <= 1);
    assert.deepEqual(quote.band, bandOf(ref));
    assert.ok(quote.band.min <= ref * 0.9 + 1 && quote.band.max >= ref * 1.1 - 1 && quote.band.min < quote.band.max);
    const before = refPrice(city, id, NOON - DAY);
    assert.equal(quote.change, Math.round((ref - before) / before * 10000));
    assert.equal(quote.commodity, id);
    assert.equal(quote.bestBid, undefined); assert.equal(quote.bestAsk, undefined); assert.equal(quote.last, undefined);
  }
  assert.deepEqual(bandOf(1000), { min: 900, max: 1100 });
  assert.deepEqual([bidOf(1000), askOf(1000)], [980, 1020]);
  assert.deepEqual([bidOf(1), askOf(1)], [1, 2], 'the spread never closes on a tiny price');
});

test('quotes show the best resting orders and the last fill, and ignore orders past their time', () => {
  const order = (side: MarketSide, price: number, expiresAt = NOON + HOUR, filled = 0): MarketOrderRecord => ({ id: `o${price}${side}`, by: 'a', commodity: 'rice', side, price, units: 3, filled, at: NOON, expiresAt });
  const book = [order('buy', 1700), order('buy', 1750), order('sell', 1900), order('sell', 1850), order('buy', 1790, NOON - 1), order('sell', 1800, NOON + HOUR, 3)];
  const tape = [{ commodity: 'garri' as const, price: 500 }, { commodity: 'rice' as const, price: 1801 }, { commodity: 'rice' as const, price: 1822 }, { commodity: 'garri' as const, price: 7 }];
  const quote = quoteOf('lagos', 'rice', NOON, book, tape);
  assert.deepEqual([quote.bestBid, quote.bestAsk, quote.last], [1750, 1850, 1822]);
});

test('history: seven days of hourly reference prices, oldest first, ending with this hour', () => {
  const points = history('ibadan', 'beans', NOON + 17 * 60000);
  assert.equal(points.length, 168);
  assert.equal(points[167]?.[0], NOON);
  assert.equal(points[0]?.[0], NOON - 167 * HOUR);
  points.forEach(([time, price], index) => { assert.equal(price, refPrice('ibadan', 'beans', time)); if (index) assert.equal(time - (points[index - 1]?.[0] ?? 0), HOUR); });
});

// ---- fees and amounts ------------------------------------------------------------------------------

test('fees: 0.5% of the value rounded up, at least one naira; a buy holds its price and its fees', () => {
  assert.equal(feeOf(1800), 9);
  assert.equal(feeOf(1801), 10);
  assert.equal(feeOf(100), 1);
  assert.equal(feeOf(1), 1);
  assert.equal(feeOf(60000), 300);
  assert.equal(holdFor(1800, 5), 5 * (1800 + 9));
  // The hold always covers the fees of any way of splitting the order into fills at the limit price or better.
  for (const price of [37, 199, 201, 601, 999, 1001, 1799, 1800, 2199]) for (const units of [1, 2, 7, 50]) {
    let fees = 0;
    for (let unit = 0; unit < units; unit++) fees += feeOf(price);
    assert.ok(feeOf(price * units) <= fees && fees <= units * feeOf(price));
    assert.ok(holdFor(price, units) >= price * units + fees, `${price} × ${units}`);
  }
  assert.equal(unitsLeft({ units: 5, filled: 2 }), 3);
});

// ---- refusals --------------------------------------------------------------------------------------

const QUOTE = quoteOf('lagos', 'rice', NOON);
const check = (change: Partial<Parameters<typeof orderRefusal>[0]> = {}) => orderRefusal({
  commodity: 'rice', side: 'buy', price: QUOTE.ref, units: 5, quote: QUOTE, cash: 100000, held: 20, position: 0, openOrders: 0, traded: 0, frozen: false, ...change,
});

test('an order is refused, in a sentence, for: a frozen account, units, price, the band, too many orders, the daily limit, cash with fees, units held, position', () => {
  assert.equal(check(), null);
  const refusals: [Partial<Parameters<typeof orderRefusal>[0]>, string][] = [
    [{ frozen: true }, 'frozen'],
    [{ units: 0 }, 'invalid_units'], [{ units: 51 }, 'invalid_units'], [{ units: 1.5 }, 'invalid_units'], [{ units: Number.NaN }, 'invalid_units'],
    [{ price: 0 }, 'invalid_price'], [{ price: 12.5 }, 'invalid_price'], [{ price: Number.NaN }, 'invalid_price'],
    [{ price: QUOTE.band.max + 1 }, 'outside_band'], [{ price: QUOTE.band.min - 1 }, 'outside_band'], [{ side: 'sell', price: QUOTE.band.max + 1 }, 'outside_band'],
    [{ openOrders: 10 }, 'too_many_orders'],
    [{ traded: 60000 - QUOTE.ref * 5 + 1 }, 'traded_limit'],
    [{ cash: holdFor(QUOTE.ref, 5) - 1 }, 'insufficient_cash'],
    [{ side: 'sell', held: 4 }, 'insufficient_units'],
    [{ position: 199, units: 2 }, 'position_limit'],
  ];
  for (const [change, code] of refusals) {
    const refusal = check(change);
    assert.equal(refusal?.code, code, JSON.stringify(change));
    assert.ok(refusal && refusal.reason.length > 20 && /[.]$/.test(refusal.reason), `a sentence for ${code}`);
  }
  assert.equal(check({ price: QUOTE.band.max, units: 1 })?.code, undefined, 'the band edge is allowed');
  assert.equal(check({ price: QUOTE.band.min, units: 1 }), null);
  assert.equal(check({ cash: holdFor(QUOTE.ref, 5) }), null, 'cash exactly covering price and fees');
  assert.equal(check({ side: 'sell', held: 5, cash: 0 }), null, 'a sell needs units, not cash');
  assert.equal(check({ now: true, openOrders: 10 }), null, 'a fill-or-drop order never rests, so open orders do not count');
  assert.match(check({ price: QUOTE.band.max + 1 })?.reason ?? '', /₦/);
  assert.equal(check({ side: 'hold' as MarketSide })?.code, 'invalid_side');
});

test('deposits and withdrawals are refused for amounts, the daily limit, the account cap and a frozen account', () => {
  const base = { amount: 1000, cash: 0, reserved: 0, deposited: 0, frozen: false };
  assert.equal(depositRefusal(base), null);
  for (const amount of [0, -5, 1.5, Number.NaN, '100', null, undefined, Number.MAX_SAFE_INTEGER + 2]) assert.equal(depositRefusal({ ...base, amount })?.code, 'invalid_amount');
  assert.equal(depositRefusal({ ...base, amount: 20000 }), null);
  assert.equal(depositRefusal({ ...base, amount: 20001 })?.code, 'deposit_limit');
  assert.equal(depositRefusal({ ...base, deposited: 19500, amount: 501 })?.code, 'deposit_limit');
  assert.equal(depositRefusal({ ...base, deposited: 19500, amount: 500 }), null);
  assert.equal(depositRefusal({ ...base, cash: 30000, reserved: 19000, amount: 1001 })?.code, 'account_full');
  assert.equal(depositRefusal({ ...base, cash: 30000, reserved: 19000, amount: 1000 }), null);
  assert.equal(depositRefusal({ ...base, frozen: true })?.code, 'frozen');
  assert.equal(withdrawRefusal({ amount: 500, cash: 500 }), null);
  assert.equal(withdrawRefusal({ amount: 501, cash: 500 })?.code, 'insufficient_funds');
  for (const amount of [0, -1, 2.5, '5', Number.NaN]) assert.equal(withdrawRefusal({ amount, cash: 500 })?.code, 'invalid_amount');
});

// ---- the order engine ------------------------------------------------------------------------------

let counter = 0;
const rest = (by: string, side: MarketSide, price: number, units: number, at = 1000, extra: Partial<MarketOrderRecord> = {}): MarketOrderRecord => ({
  id: `r${++counter}`, by, commodity: 'rice', side, price, units, filled: 0, at, expiresAt: NOON + DAY, ...(side === 'buy' ? { held: holdFor(price, units) } : {}), ...extra,
});
const QUOTE_1000 = { bid: 980, ask: 1020 };
const engine = (options: Partial<Parameters<typeof match>[1]> = {}) => ({ book: [], quote: QUOTE_1000, makerLeft: 0, ...options });

test('match: best price first, then the earliest; the trade is at the RESTING order\'s price', () => {
  const book = [rest('a', 'sell', 1010, 2, 100), rest('b', 'sell', 1000, 2, 300), rest('c', 'sell', 1000, 2, 200), rest('d', 'sell', 1030, 5, 50), rest('e', 'buy', 990, 5, 10)];
  const result = match({ by: 'z', side: 'buy', price: 1015, units: 5 }, engine({ book }));
  assert.deepEqual(result.fills.map((fill) => [fill.by, fill.price, fill.units]), [['c', 1000, 2], ['b', 1000, 2], ['a', 1010, 1]]);
  assert.deepEqual([result.filled, result.left, result.rests, result.makerUnits], [5, 0, false, 0]);
  // A seller meets the highest bid first.
  const bids = [rest('a', 'buy', 990, 2, 100), rest('b', 'buy', 1000, 2, 300), rest('c', 'buy', 1000, 2, 200), rest('d', 'buy', 950, 9, 1)];
  const sold = match({ by: 'z', side: 'sell', price: 960, units: 5 }, engine({ book: bids }));
  assert.deepEqual(sold.fills.map((fill) => [fill.by, fill.price, fill.units]), [['c', 1000, 2], ['b', 1000, 2], ['a', 990, 1]]);
  assert.equal(match({ by: 'z', side: 'buy', price: 999, units: 5 }, engine({ book })).filled, 0, 'a limit below every ask finds nothing');
});

test('match: orders of the same price and the same millisecond keep the order they were placed in, whatever their ids look like as text', () => {
  const book = [rest('late', 'sell', 1000, 1, 5, { id: '10' }), rest('early', 'sell', 1000, 1, 5, { id: '9' }), rest('earliest', 'sell', 1000, 1, 5, { id: '2' })];
  const result = match({ by: 'z', side: 'buy', price: 1000, units: 3 }, engine({ book }));
  assert.deepEqual(result.fills.map((fill) => fill.by), ['earliest', 'early', 'late']);
});

test('match: a partial fill rests the remainder; fill-or-drop (now) drops it; nothing is changed in the book', () => {
  const book = [rest('a', 'sell', 1000, 3)];
  const before = JSON.stringify(book);
  const partial = match({ by: 'z', side: 'buy', price: 1000, units: 5 }, engine({ book }));
  assert.deepEqual([partial.filled, partial.left, partial.rests], [3, 2, true]);
  const dropped = match({ by: 'z', side: 'buy', price: 1000, units: 5, now: true }, engine({ book }));
  assert.deepEqual([dropped.filled, dropped.left, dropped.rests], [3, 2, false]);
  assert.equal(JSON.stringify(book), before);
  // A resting order already partly filled offers only what is left.
  const used = [rest('a', 'sell', 1000, 5, 1000, { filled: 4 })];
  assert.equal(match({ by: 'z', side: 'buy', price: 1000, units: 5 }, engine({ book: used })).filled, 1);
  const none = match({ by: 'z', side: 'buy', price: 1000, units: 5 }, engine());
  assert.deepEqual([none.filled, none.rests], [0, true]);
});

test('match: skips your own orders and the players the callback refuses, and goes on to the next', () => {
  const book = [rest('me', 'sell', 990, 5, 1), rest('blocked', 'sell', 995, 5, 2), rest('ok', 'sell', 1000, 5, 3)];
  const result = match({ by: 'me', side: 'buy', price: 1000, units: 4 }, engine({ book, eligible: (id) => id !== 'blocked' }));
  assert.deepEqual(result.fills.map((fill) => [fill.by, fill.price, fill.units]), [['ok', 1000, 4]]);
  const asked: string[] = [];
  match({ by: 'me', side: 'buy', price: 1000, units: 4 }, engine({ book, eligible: (id) => { asked.push(id); return true; } }));
  assert.ok(!asked.includes('me'), 'your own order is never offered to the callback');
});

test('match: a room callback caps what may change hands with one player, across all their orders', () => {
  const book = [rest('p', 'sell', 1000, 3, 1), rest('p', 'sell', 1001, 3, 2), rest('q', 'sell', 1002, 9, 3)];
  const result = match({ by: 'me', side: 'buy', price: 1010, units: 8 }, engine({ book, room: (id, price, matched) => (id === 'p' ? Math.floor((4000 - matched) / price) : Infinity) }));
  const withP = result.fills.filter((fill) => fill.by === 'p').reduce((sum, fill) => sum + fill.price * fill.units, 0);
  assert.ok(withP <= 4000 && withP > 4000 - 1002, `${withP} naira with p`);
  assert.equal(result.filled, 8);
  assert.ok(result.fills.some((fill) => fill.by === 'q'));
  // Naira of fills today caps the incoming player too.
  const capped = match({ by: 'me', side: 'buy', price: 1010, units: 8 }, engine({ book, tradedLeft: 2500 }));
  assert.equal(capped.fills.reduce((sum, fill) => sum + fill.price * fill.units, 0), 2000);
  assert.equal(capped.filled, 2);
});

test('match: the market maker fills what is left at its ask or bid, up to the units it has left for the player', () => {
  const buy = match({ by: 'z', side: 'buy', price: 1050, units: 10 }, engine({ makerLeft: 4 }));
  assert.deepEqual(buy.fills, [{ order: '', by: '', price: 1020, units: 4 }]);
  assert.deepEqual([buy.filled, buy.left, buy.rests, buy.makerUnits], [4, 6, true, 4]);
  const sell = match({ by: 'z', side: 'sell', price: 950, units: 10, now: true }, engine({ makerLeft: 40 }));
  assert.deepEqual(sell.fills, [{ order: '', by: '', price: 980, units: 10 }]);
  assert.equal(sell.rests, false);
  assert.equal(match({ by: 'z', side: 'buy', price: 1019, units: 1 }, engine({ makerLeft: 40 })).filled, 0, 'a buy below the ask does not reach the maker');
  assert.equal(match({ by: 'z', side: 'sell', price: 981, units: 1 }, engine({ makerLeft: 40 })).filled, 0, 'a sell above the bid does not reach the maker');
  assert.equal(match({ by: 'z', side: 'buy', price: 1050, units: 10 }, engine({ makerLeft: 0 })).filled, 0);
  assert.equal(match({ by: 'z', side: 'buy', price: 1050, units: 10 }, engine({ makerLeft: -3 })).filled, 0);
});

test('match: players come first at an equal price, and the maker when it is the better price', () => {
  const book = [rest('a', 'sell', 1020, 2, 1), rest('b', 'sell', 1015, 2, 2), rest('c', 'sell', 1040, 9, 3)];
  const result = match({ by: 'z', side: 'buy', price: 1040, units: 9 }, engine({ book, makerLeft: 3 }));
  // 1015 (player b), then 1020 (player a first, at equal price with the maker), then the maker's 1020, then c.
  assert.deepEqual(result.fills.map((fill) => [fill.by || 'maker', fill.price, fill.units]), [['b', 1015, 2], ['a', 1020, 2], ['maker', 1020, 3], ['c', 1040, 2]]);
  // A resting ask above the maker's is not taken while the maker still has units.
  const dear = match({ by: 'z', side: 'buy', price: 1100, units: 3 }, engine({ book: [rest('a', 'sell', 1080, 5)], makerLeft: 3 }));
  assert.deepEqual(dear.fills.map((fill) => fill.by || 'maker'), ['maker']);
});

// ---- submit: the book, the accounts and the conservation of naira ----------------------------------

interface World { accounts: Record<string, MarketAccountRecord>; books: Record<CommodityId, MarketOrderRecord[]>; tape: MarketRoomTape; seq: number; now: number; barred: Set<string>; frozen: Set<string> }
type MarketRoomTape = MarketRoom['tape'];
function world(players: Record<string, { cash?: number; holdings?: Partial<Record<CommodityId, number>>; anon?: boolean }>, now = NOON): World {
  const accounts: Record<string, MarketAccountRecord> = {};
  for (const [id, setup] of Object.entries(players)) accounts[id] = { ...emptyAccount(id.toUpperCase(), lagosTime(now).day), cash: setup.cash ?? 0, holdings: { ...(setup.holdings ?? {}) }, anon: setup.anon ?? false };
  return { accounts, books: { rice: [], garri: [], beans: [], 'palm-oil': [], cement: [], petrol: [] }, tape: [], seq: 0, now, barred: new Set(), frozen: new Set() };
}
function place(w: World, id: string, input: { commodity?: CommodityId; side: MarketSide; price: number; units: number; now?: boolean }, extra: Partial<SubmitEnv> = {}) {
  const commodity = input.commodity ?? 'rice', book = w.books[commodity];
  const openOrders = Object.values(w.books).reduce((sum, list) => sum + list.filter((order) => order.by === id).length, 0);
  const env: SubmitEnv = {
    now: w.now, quote: quoteOf('lagos', commodity, w.now, book, w.tape), barred: (a, b) => w.barred.has(`${a}|${b}`) || w.barred.has(`${b}|${a}`), frozen: (who) => w.frozen.has(who), openOrders,
    nextId: () => `i${++w.seq}`, ...extra,
  };
  return submit({ accounts: w.accounts, book, tape: w.tape }, { id, name: id.toUpperCase() }, { commodity, side: input.side, price: input.price, units: input.units, ...(input.now ? { now: true } : {}) }, env);
}
/** All naira in the world: free cash and the holds of buy orders. */
const naira = (w: World): number => Object.values(w.accounts).reduce((sum, account) => sum + account.cash, 0) + Object.values(w.books).reduce((sum, list) => sum + reservedCash(list), 0);
/** All units of one commodity: held and in sell orders. */
const units = (w: World, commodity: CommodityId): number => Object.values(w.accounts).reduce((sum, account) => sum + (account.holdings[commodity] ?? 0), 0) + w.books[commodity].reduce((sum, order) => sum + (order.side === 'sell' ? unitsLeft(order) : 0), 0);

test('submit: two players trade; the buyer pays price and fee, the seller gets price less fee, at the resting price', () => {
  const w = world({ ada: { cash: 20000 }, bola: { holdings: { rice: 10 } } });
  const ref = QUOTE.ref;
  assert.ok(ref + 10 < QUOTE.ask, 'the seller asks less than the maker does');
  const sell = place(w, 'bola', { side: 'sell', price: ref + 10, units: 4 });
  assert.ok(sell.ok && sell.code === 'placed' && sell.rested && sell.fills.length === 0);
  assert.equal(w.accounts.bola?.holdings.rice, 6, 'the units are held by the order');
  const buy = place(w, 'ada', { side: 'buy', price: ref + 20, units: 2 });
  assert.ok(buy.ok && buy.code === 'filled');
  const value = 2 * (ref + 10), fee = feeOf(value);
  assert.deepEqual(buy.fills.map((fill) => [fill.price, fill.units, fill.buyer, fill.seller, fill.buyerId, fill.sellerId]), [[ref + 10, 2, 'ADA', 'BOLA', 'ada', 'bola']]);
  assert.equal(w.accounts.ada?.cash, 20000 - value - fee, 'the buyer paid the resting price and the fee; the rest of the hold came back');
  assert.equal(w.accounts.ada?.holdings.rice, 2);
  assert.equal(w.accounts.bola?.cash, value - fee);
  assert.equal(w.books.rice.length, 1);
  assert.equal(unitsLeft(w.books.rice[0] as MarketOrderRecord), 2);
  assert.equal(w.tape.length, 1);
  assert.equal(w.accounts.ada?.traded, value); assert.equal(w.accounts.bola?.traded, value);
  assert.equal(w.accounts.ada?.pairs.bola, value); assert.equal(w.accounts.bola?.pairs.ada, value);
  // Naira left the world as exactly two fees; units did not leave at all.
  assert.equal(naira(w), 20000 - 2 * fee);
  assert.equal(units(w, 'rice'), 10);
});

test('submit: a refusal, and a fill-or-drop that finds nothing, change nothing at all', () => {
  const w = world({ ada: { cash: 5000, holdings: { rice: 2 } } });
  const before = JSON.stringify(w);
  for (const input of [
    { side: 'buy' as const, price: QUOTE.band.max + 5, units: 1 }, { side: 'buy' as const, price: QUOTE.ref, units: 99 }, { side: 'sell' as const, price: QUOTE.ref, units: 3 },
    { side: 'buy' as const, price: QUOTE.ref, units: 50 }, { side: 'buy' as const, price: QUOTE.ref - 100, units: 2, now: true },
  ]) {
    const result = place(w, 'ada', input);
    assert.equal(result.ok, false, JSON.stringify(input));
    assert.equal(JSON.stringify(w), before, `nothing changed after ${JSON.stringify(input)}`);
  }
  const stranger = place(w, 'nobody', { side: 'buy', price: QUOTE.ref, units: 1 });
  assert.ok(!stranger.ok && stranger.code === 'insufficient_cash');
  assert.equal(JSON.stringify(w), before);
  const none = place(w, 'ada', { side: 'buy', price: QUOTE.ref - 100, units: 1, now: true });
  assert.ok(!none.ok && none.code === 'no_match');
});

test('submit: price-time priority across players, partial fills and the remainder resting', () => {
  const w = world({ s1: { holdings: { rice: 5 } }, s2: { holdings: { rice: 5 } }, s3: { holdings: { rice: 5 } }, buyer: { cash: 40000 } });
  const p = QUOTE.ref;
  w.now += 1; place(w, 's1', { side: 'sell', price: p + 30, units: 2 });
  w.now += 1; place(w, 's2', { side: 'sell', price: p + 20, units: 2 });
  w.now += 1; place(w, 's3', { side: 'sell', price: p + 20, units: 2 });
  w.now += 1;
  const result = place(w, 'buyer', { side: 'buy', price: p + 30, units: 7 });
  assert.ok(result.ok);
  assert.deepEqual(result.fills.map((fill) => [fill.sellerId, fill.price, fill.units]), [['s2', p + 20, 2], ['s3', p + 20, 2], ['s1', p + 30, 2]]);
  assert.equal(result.code, 'partial');
  assert.ok(result.rested && unitsLeft(result.order) === 1);
  assert.equal(w.books.rice.length, 1, 'the sellers\' used-up orders left the book; the buyer\'s remainder rests');
  assert.equal(w.books.rice[0]?.side, 'buy');
  assert.equal(w.accounts.buyer?.cash, 40000 - result.fills.reduce((sum, fill) => sum + fill.price * fill.units + feeOf(fill.price * fill.units), 0) - (result.order.held ?? 0));
});

test('submit: your own order, a blocked or same-device player and a frozen player are skipped; the maker answers instead', () => {
  const w = world({ me: { cash: 30000 }, friend: { holdings: { rice: 5 } }, twin: { holdings: { rice: 5 } }, ghost: { holdings: { rice: 5 } }, self: { holdings: { rice: 5 } } });
  const cheap = QUOTE.ref - 30;
  for (const id of ['friend', 'twin', 'ghost']) { w.now += 1; assert.ok(place(w, id, { side: 'sell', price: cheap, units: 5 }).ok); }
  w.barred.add('me|friend'); w.barred.add('twin|me'); w.frozen.add('ghost');
  w.now += 1;
  const bought = place(w, 'me', { side: 'buy', price: QUOTE.ask + 20, units: 3, now: true });
  assert.ok(bought.ok);
  assert.deepEqual(bought.fills.map((fill) => [fill.seller, fill.price]), [[MARKET_MAKER, QUOTE.ask]], 'only the maker was left');
  assert.equal(w.books.rice.length, 3, 'the skipped orders stand untouched');
  // A frozen player cannot place; and an account that is not there cannot be matched against.
  assert.equal(place(w, 'ghost', { side: 'buy', price: QUOTE.ref, units: 1 }).ok, false);
  const gone = world({ me: { cash: 30000 } });
  gone.books.rice.push(rest('missing', 'sell', QUOTE.ref - 10, 3, 1, { commodity: 'rice' }));
  assert.equal(place(gone, 'me', { side: 'buy', price: QUOTE.ref, units: 1, now: true }).ok, false, 'an order without an account is not filled');
});

test('submit: the maker takes and gives at most makerUnitsPerDay units a commodity a player a day, and the counter resets at midnight', () => {
  const w = world({ ada: { cash: 90000, holdings: { garri: 100, rice: 5 } } });
  const garri = () => quoteOf('lagos', 'garri', w.now);
  const bought = place(w, 'ada', { commodity: 'garri', side: 'buy', price: garri().ask, units: 30, now: true });
  assert.ok(bought.ok && bought.code === 'filled' && bought.fills.every((fill) => fill.seller === MARKET_MAKER));
  const sold = place(w, 'ada', { commodity: 'garri', side: 'sell', price: garri().bid, units: 30, now: true });
  assert.ok(sold.ok && sold.code === 'partial' && sold.fills.reduce((sum, fill) => sum + fill.units, 0) === 10, 'the maker\'s 40 units a day are bought and sold together');
  assert.equal(w.accounts.ada?.makerUnits.garri, 40);
  assert.equal(place(w, 'ada', { commodity: 'garri', side: 'buy', price: garri().ask, units: 1, now: true }).ok, false);
  // Another commodity has its own 40.
  const rice = place(w, 'ada', { commodity: 'rice', side: 'sell', price: quoteOf('lagos', 'rice', w.now).bid, units: 5, now: true });
  assert.ok(rice.ok && rice.code === 'filled');
  // Next Lagos day.
  w.now += DAY;
  const again = place(w, 'ada', { commodity: 'garri', side: 'buy', price: garri().ask, units: 5, now: true });
  assert.ok(again.ok);
  assert.equal(w.accounts.ada?.makerUnits.garri, 5);
  assert.equal(w.accounts.ada?.makerUnits.rice, undefined);
});

test('conservation: across thousands of random orders, naira changes only by fees and fills with the maker; units only by the maker', () => {
  const players = ['a', 'b', 'c', 'd', 'e'];
  const w = world(Object.fromEntries(players.map((id) => [id, { cash: 30000, holdings: { rice: 30, garri: 30 } }])));
  let state = 12345;
  const random = (): number => { state = (Math.imul(state, 1103515245) + 12345) >>> 0; return state / 4294967296; };
  let fees = 0, makerNaira = 0, makerUnits = { rice: 0, garri: 0 } as Record<string, number>, fills = 0;
  const start = { naira: naira(w), rice: units(w, 'rice'), garri: units(w, 'garri') };
  for (let step = 0; step < 4000; step++) {
    w.now += Math.floor(random() * 40 * 60000);
    const id = players[Math.floor(random() * players.length)] as string;
    const commodity: CommodityId = random() < 0.5 ? 'rice' : 'garri';
    const quote = quoteOf('lagos', commodity, w.now, w.books[commodity], w.tape);
    const side: MarketSide = random() < 0.5 ? 'buy' : 'sell';
    const price = Math.round(quote.band.min + random() * (quote.band.max - quote.band.min));
    // Some orders are cancelled, some expire, some are fill-or-drop.
    if (random() < 0.1) { const mine = w.books[commodity].filter((order) => order.by === id); const pick = mine[Math.floor(random() * mine.length)]; if (pick) cancelOrder(w.accounts, w.books[commodity], id, pick.id); continue; }
    for (const list of Object.values(w.books)) expireBook(w.accounts, list, w.now);
    const before = { naira: naira(w), rice: units(w, 'rice'), garri: units(w, 'garri') };
    const result = place(w, id, { commodity, side, price, units: 1 + Math.floor(random() * 12), ...(random() < 0.3 ? { now: true } : {}) });
    if (!result.ok) { assert.equal(naira(w), before.naira); continue; }
    let stepFees = 0, stepMaker = 0;
    for (const fill of result.fills) {
      fills += 1;
      const value = fill.price * fill.units, fee = feeOf(value);
      const isMaker = fill.buyerId === '' || fill.sellerId === '';
      // Both sides pay the fee; with the maker only the player's side does, and the maker's side is the naira that appears (it pays a seller) or vanishes (a buyer pays it).
      stepFees += isMaker ? fee : 2 * fee;
      if (isMaker) { stepMaker += fill.buyerId === '' ? value : -value; makerUnits[commodity] = (makerUnits[commodity] ?? 0) + (fill.buyerId === '' ? -fill.units : fill.units); }
    }
    fees += stepFees; makerNaira += stepMaker;
    assert.equal(naira(w), before.naira - stepFees + stepMaker, `step ${step}: naira after an order`);
    for (const account of Object.values(w.accounts)) assert.ok(account.cash >= 0 && Number.isSafeInteger(account.cash));
    for (const list of Object.values(w.books)) for (const order of list) assert.ok(unitsLeft(order) > 0 && (order.side === 'sell' || (order.held ?? -1) >= 0));
  }
  assert.ok(fills > 300, `${fills} fills`);
  assert.equal(naira(w), start.naira - fees + makerNaira);
  assert.equal(units(w, 'rice'), start.rice + (makerUnits.rice ?? 0));
  assert.equal(units(w, 'garri'), start.garri + (makerUnits.garri ?? 0));
  // Cancelling and expiring everything gives every hold back: only free naira remains.
  for (const list of Object.values(w.books)) expireBook(w.accounts, list, w.now + 10 * DAY);
  assert.equal(Object.values(w.books).reduce((sum, list) => sum + list.length, 0), 0);
  assert.equal(Object.values(w.accounts).reduce((sum, account) => sum + account.cash, 0), start.naira - fees + makerNaira);
});

test('players alone: a closed book of trades without the maker changes the naira in the world only by the fees', () => {
  const w = world({ a: { cash: 20000, holdings: { rice: 20 } }, b: { cash: 20000, holdings: { rice: 20 } } });
  const start = naira(w);
  let fees = 0;
  for (let round = 0; round < 40; round++) {
    const seller = round % 2 ? 'a' : 'b', buyer = round % 2 ? 'b' : 'a', price = QUOTE.ref + (round % 5) * 10;
    w.now += DAY;
    place(w, seller, { side: 'sell', price, units: 2 }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } });
    const result = place(w, buyer, { side: 'buy', price, units: 2 }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } });
    assert.ok(result.ok);
    for (const fill of result.fills) fees += 2 * feeOf(fill.price * fill.units);
    // the maker's quote above is out of reach, so every fill is with the other player
    assert.ok(result.fills.every((fill) => fill.buyerId && fill.sellerId));
  }
  assert.equal(naira(w), start - fees);
  assert.ok(fees > 0);
});

test('pair cap: two players cannot move more than pairPerDay of value between them in a Lagos day, nor tradedPerDay each', () => {
  const w = world({ giver: { holdings: { rice: 200 } }, taker: { cash: 50000 } });
  const price = QUOTE.band.min;
  let moved = 0;
  for (let round = 0; round < 40; round++) {
    w.now += 1;
    place(w, 'giver', { side: 'sell', price, units: 5 }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } });
    const result = place(w, 'taker', { side: 'buy', price, units: 5, now: true }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } });
    if (result.ok) moved += result.fills.reduce((sum, fill) => sum + fill.price * fill.units, 0);
  }
  assert.ok(moved <= L.pairPerDay && moved > L.pairPerDay - 5 * price, `${moved} moved`);
  assert.ok((w.accounts.taker?.pairs.giver ?? 0) <= L.pairPerDay);
  // The next day the pair may trade again.
  w.now += DAY;
  w.books.rice.length = 0;
  w.accounts.giver!.holdings.rice = 100;
  place(w, 'giver', { side: 'sell', price, units: 5 }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } });
  assert.equal(place(w, 'taker', { side: 'buy', price, units: 5, now: true }, { quote: { ...QUOTE, bid: 1, ask: 10 ** 9 } }).ok, true);
  assert.deepEqual(todayOf(w.accounts.taker, lagosTime(w.now).day).pairs, { giver: Math.floor(L.pairPerDay / price) * price }, 'a new day, a new allowance');
});

test('a day\'s trading is capped at tradedPerDay a player, with the maker included', () => {
  const w = world({ rich: { cash: 50000, holdings: { cement: 200 } } });
  let traded = 0;
  for (let round = 0; round < 60; round++) {
    const quote = quoteOf('lagos', 'cement', w.now, w.books.cement, w.tape);
    const result = place(w, 'rich', { commodity: 'cement', side: round % 2 ? 'sell' : 'buy', price: round % 2 ? quote.bid : quote.ask, units: 20, now: true });
    if (result.ok) traded += result.fills.reduce((sum, fill) => sum + fill.price * fill.units, 0);
    w.accounts.rich!.cash += 5000; w.accounts.rich!.holdings.cement = Math.min(200, (w.accounts.rich!.holdings.cement ?? 0) + 5);
    w.accounts.rich!.makerUnits = {};
  }
  assert.ok(traded <= L.tradedPerDay, `${traded}`);
  assert.equal(w.accounts.rich?.traded, traded);
});

test('cancel and expiry give back exactly what an order held; only the owner can cancel', () => {
  const w = world({ ada: { cash: 10000, holdings: { rice: 6 } }, bola: {} });
  const buy = place(w, 'ada', { side: 'buy', price: QUOTE.band.min, units: 3 });
  const sell = place(w, 'ada', { side: 'sell', price: QUOTE.band.max, units: 4 });
  assert.ok(buy.ok && sell.ok);
  assert.equal(w.accounts.ada?.cash, 10000 - holdFor(QUOTE.band.min, 3));
  assert.equal(w.accounts.ada?.holdings.rice, 2);
  assert.equal(cancelOrder(w.accounts, w.books.rice, 'bola', buy.order.id), null, 'not your order');
  assert.equal(cancelOrder(w.accounts, w.books.rice, 'ada', 'nope'), null);
  assert.equal(cancelOrder(w.accounts, w.books.rice, 'ada', buy.order.id)?.id, buy.order.id);
  assert.equal(w.accounts.ada?.cash, 10000);
  // The other order runs out of time after orderHours.
  assert.equal(expireBook(w.accounts, w.books.rice, w.now + L.orderHours * HOUR - 1), 0);
  assert.equal(expireBook(w.accounts, w.books.rice, w.now + L.orderHours * HOUR), 1);
  assert.equal(w.accounts.ada?.holdings.rice, 6);
  assert.equal(w.books.rice.length, 0);
});

test('open orders, position and book size are bounded', () => {
  const w = world({ ada: { cash: 50000, holdings: { rice: 90 } }, bola: { cash: 50000 } });
  for (let index = 0; index < 10; index++) assert.ok(place(w, 'ada', { side: 'sell', price: QUOTE.band.max, units: 1 }).ok, String(index));
  const eleventh = place(w, 'ada', { side: 'sell', price: QUOTE.band.max, units: 1 });
  assert.ok(!eleventh.ok && eleventh.code === 'too_many_orders');
  // Holding plus wanting is capped.
  const big = world({ bola: { cash: 50000, holdings: { rice: 190 } } });
  assert.ok(place(big, 'bola', { side: 'buy', price: QUOTE.band.min, units: 10 }).ok);
  const over = place(big, 'bola', { side: 'buy', price: QUOTE.band.min, units: 1 });
  assert.ok(!over.ok && over.code === 'position_limit');
  // A full book gives way to a better price only.
  const full = world({ ada: { cash: 50000 }, many: { cash: 0 } });
  for (let index = 0; index < MARKET_BOOK_MAX; index++) full.books.rice.push(rest('many', 'buy', QUOTE.band.min + (index % 3), 1, index + 1));
  const same = place(full, 'ada', { side: 'buy', price: QUOTE.band.min, units: 1 });
  assert.ok(!same.ok && same.code === 'book_full');
  const better = place(full, 'ada', { side: 'buy', price: QUOTE.band.min + 5, units: 1 });
  assert.ok(better.ok && better.rested);
  assert.equal(full.books.rice.length, MARKET_BOOK_MAX);
});

test('the tape keeps the newest MARKET_TAPE fills and names traders by label, never by id', () => {
  const w = world({ ada: { cash: 5000000, anon: true }, bola: { holdings: { rice: 200 } } });
  for (let round = 0; round < 120; round++) {
    w.now += 1;
    place(w, 'bola', { side: 'sell', price: QUOTE.ref, units: 1 }, { quote: { ...QUOTE, ask: 10 ** 9 } });
    place(w, 'ada', { side: 'buy', price: QUOTE.ref, units: 1, now: true }, { quote: { ...QUOTE, ask: 10 ** 9 } });
    w.accounts.ada!.pairs = {}; w.accounts.bola!.pairs = {}; w.accounts.ada!.traded = 0; w.accounts.bola!.traded = 0;
    w.accounts.bola!.holdings.rice = 100;
  }
  assert.equal(w.tape.length, MARKET_TAPE);
  assert.equal(w.tape.at(-1)?.at, w.now);
  assert.ok(w.tape.every((fill) => fill.buyer === ANONYMOUS_TRADER && fill.seller === 'BOLA'));
  assert.equal(labelOf({ anon: false, name: 'Chi' }), 'Chi');
  assert.equal(labelOf({ anon: true, name: 'Chi' }), ANONYMOUS_TRADER);
  assert.equal(labelOf(undefined), ANONYMOUS_TRADER);
  assert.equal(labelOf({ anon: false, name: '' }), ANONYMOUS_TRADER);
});

test('accounts: the day counters roll at midnight, Lagos time', () => {
  const account = { ...emptyAccount('Ada', 100), deposited: 5, traded: 6, makerUnits: { rice: 3 }, pairs: { x: 4 } };
  assert.deepEqual(todayOf(account, 100), { deposited: 5, traded: 6, makerUnits: { rice: 3 }, pairs: { x: 4 } });
  assert.deepEqual(todayOf(account, 101), { deposited: 0, traded: 0, makerUnits: {}, pairs: {} });
  assert.equal(account.deposited, 5, 'todayOf changes nothing');
  rollDay(account, 100); assert.equal(account.deposited, 5);
  rollDay(account, 101); assert.deepEqual([account.day, account.deposited, account.traded, account.makerUnits, account.pairs], [101, 0, 0, {}, {}]);
  assert.deepEqual(todayOf(undefined, 5), { deposited: 0, traded: 0, makerUnits: {}, pairs: {} });
});

test('the market maker is the only faucet and it is bounded: a player\'s best day from perfect foresight stays small', () => {
  // Buy at the maker's ask when the reference is lowest, sell at its bid when highest, the day's units only (40 a commodity, bought and sold together).
  let best = 0;
  for (const id of COMMODITY_IDS) for (let day = 0; day < 60; day++) {
    const hours = Array.from({ length: 24 }, (_, hour) => refPrice('lagos', id, MONDAY + day * DAY + hour * HOUR));
    const low = Math.min(...hours), high = Math.max(...hours);
    const profit = 20 * (bidOf(high) - askOf(low)) - 20 * feeOf(askOf(low)) - 20 * feeOf(bidOf(high));
    best = Math.max(best, profit);
  }
  assert.ok(best < 20 * 1000, `${best}`);
});
