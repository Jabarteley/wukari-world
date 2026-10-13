/**
 * OWNER: market
 * THE MARKET RULES. Pure: a time, a city and a book go in; prices, quotes and fills come out. No I/O, no clock of its own,
 * no random numbers (only seeded hashes of text) — the same inputs always give the same market, so a request that writes
 * and a screen that only reads agree on every price. Read by server/market/service.ts and scripts/market-sim.ts.
 * The numbers are in src/game/content/market.ts, the stored shapes in src/types/market.ts, the design in docs/MARKET.md.
 *
 * PRICES. The reference price of a commodity in a city is whole naira:
 *     base × cityFactor × (1 + walk) × shock
 *   cityFactor  0.92–1.08, fixed per city and commodity, so cities differ
 *   walk        smooth noise within ±swing, constant within each hour, always coming back to zero (it is made of bounded
 *               waves, never a running sum), so a price never drifts away
 *   shock       the scripted event in force (eventsAt), if any: a week of the Lagos calendar picks 0–2 commodities per city,
 *               each for 1–3 days
 *   THE SALT. `walk` and the event picks are keyed by a secret salt the server keeps (db.market.salt, never sent to a player), so the
 *   open-source code alone cannot tell anyone tomorrow's prices. The salt is a parameter of every function that reads a price, ''
 *   by default (what a reader of the code can compute); the server always passes its own. cityFactor is public and unsalted.
 *   The market maker quotes ref ∓ spreadBps. A limit order's price must lie within ref ± bandBps when it is placed.
 *
 * ORDERS. `submit` checks the rules, matches by price then time against the resting player orders (a trade happens at the
 *   RESTING order's price) and against the market maker (at its ask or bid, up to makerUnitsPerDay units a player a day),
 *   whichever is better for the incoming order, players first at an equal price. What is left rests, unless the order is
 *   `now` (fill what can be filled and drop the rest). A buy holds its worst-case cost (price × units and the fees) in the
 *   order; a sell holds its units. Both sides of a fill pay the fee, which is destroyed. Naira appears or vanishes only
 *   through fees and through fills with the maker, so a book of players alone conserves it (tests check it).
 *
 * WHAT A FILL BETWEEN TWO PLAYERS IS CHECKED AGAINST: not your own order · not frozen · not blocked either way and not the
 *   same device (the `barred` callback) · the pair's naira today under pairPerDay · each side's naira today under tradedPerDay.
 */
import { lagosDayStart, lagosTime } from './clock.ts';
import { makeRng, naira } from './util.ts';
import { ANONYMOUS_TRADER, COMMODITIES, MARKET_BOOK_MAX, MARKET_EVENT_TEMPLATES, MARKET_LIMITS, MARKET_MAKER, MARKET_TAPE } from './content/market.ts';
import type {
  Commodity, CommodityId, MarketAccountRecord, MarketEvent, MarketFillRecord, MarketLimits, MarketOrderRecord, MarketQuote, MarketSide,
} from '../types/market.ts';

const HOUR = 3600000, DAY = 86400000, BPS = 10000;
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const hourOf = (t: number): number => Math.floor((Number.isFinite(t) ? t : 0) / HOUR);

// ---- the catalogue -------------------------------------------------------------------------------

const BY_ID = new Map<string, Commodity>(COMMODITIES.map((item) => [item.id, item]));
export const isCommodity = (value: unknown): value is CommodityId => typeof value === 'string' && BY_ID.has(value);
export function commodityOf(id: CommodityId): Commodity {
  const found = BY_ID.get(id);
  if (!found) throw new TypeError(`unknown commodity ${String(id)}`);
  return found;
}

// ---- prices --------------------------------------------------------------------------------------

/** How much dearer or cheaper a city is for a commodity: 0.92–1.08, fixed. */
export const cityFactor = (cityId: string, commodity: CommodityId): number => 0.92 + 0.16 * makeRng(`market|city|${cityId}|${commodity}`)();

const lattice = (key: string, index: number): number => makeRng(`${key}|${index}`)() * 2 - 1;
/** Smooth value noise in [−1, 1]: a hashed value at every `period` hours, joined by a smooth curve. */
function noise(key: string, hours: number, period: number): number {
  const x = hours / period, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
  return lattice(key, i) * (1 - s) + lattice(key, i + 1) * s;
}
/** The wander of a price around its base, as a part of 1, in [−swing, +swing]; the same all through an hour. */
export function walkOf(cityId: string, commodity: CommodityId, t: number, salt = ''): number {
  const hours = hourOf(t), key = `market|walk|${salt}|${cityId}|${commodity}`;
  const n = 0.5 * noise(`${key}|a`, hours, 10) + 0.3 * noise(`${key}|b`, hours, 40) + 0.2 * noise(`${key}|c`, hours, 160);
  return commodityOf(commodity).swing * Math.max(-1, Math.min(1, n * 1.6));
}

/** The shocks of one Lagos calendar week in a city (they may run into the next week). Deterministic. */
function weekEvents(cityId: string, week: number, salt: string): MarketEvent[] {
  const rng = makeRng(`market|events|${salt}|${cityId}|${week}`);
  const roll = rng(), count = roll < 0.3 ? 0 : roll < 0.8 ? 1 : 2;
  const picked: number[] = [], events: MarketEvent[] = [];
  for (let index = 0; index < count; index++) {
    let at = Math.floor(rng() * COMMODITIES.length);
    while (picked.includes(at)) at = (at + 1) % COMMODITIES.length;
    picked.push(at);
    const startDay = Math.floor(rng() * 7), days = 1 + Math.floor(rng() * 3), other = rng() >= 0.65;
    const commodity = COMMODITIES[at];
    const templates = commodity ? MARKET_EVENT_TEMPLATES[commodity.id] : undefined;
    const template = templates?.[other ? 1 : 0] ?? templates?.[0];
    if (!commodity || !template) continue;
    const from = lagosDayStart(7 * week - 3 + startDay);
    events.push({ id: `${cityId}:${week}:${commodity.id}`, commodity: commodity.id, headline: template.headline, shock: template.shock, from, to: from + days * DAY });
  }
  return events;
}
/** The scripted events in force in a city at a time. Events last at most three days, so this week's and last week's are all there is. */
export function eventsAt(cityId: string, t: number, salt = ''): MarketEvent[] {
  const time = Number.isFinite(t) ? t : 0, week = lagosTime(time).week;
  return [...weekEvents(cityId, week - 1, salt), ...weekEvents(cityId, week, salt)].filter((event) => event.from <= time && time < event.to);
}

/** The reference price: whole naira, at least 1, the same all through an hour. */
export function refPrice(cityId: string, commodity: CommodityId, t: number, salt = ''): number {
  const hour = hourOf(t) * HOUR;
  const shock = Math.max(0.7, Math.min(1.5, eventsAt(cityId, hour, salt).filter((event) => event.commodity === commodity).reduce((product, event) => product * event.shock, 1)));
  return Math.max(1, Math.round(commodityOf(commodity).base * cityFactor(cityId, commodity) * (1 + walkOf(cityId, commodity, hour, salt)) * shock));
}

/** What the market maker pays and asks, and the band a limit price must lie in, for a reference price. */
export const bidOf = (ref: number, limits: MarketLimits = MARKET_LIMITS): number => Math.max(1, Math.floor(ref * (BPS - limits.spreadBps) / BPS));
export const askOf = (ref: number, limits: MarketLimits = MARKET_LIMITS): number => Math.max(bidOf(ref, limits) + 1, Math.ceil(ref * (BPS + limits.spreadBps) / BPS));
export const bandOf = (ref: number, limits: MarketLimits = MARKET_LIMITS): { min: number; max: number } => ({
  min: Math.max(1, Math.ceil(ref * (BPS - limits.bandBps) / BPS)), max: Math.max(1, Math.floor(ref * (BPS + limits.bandBps) / BPS)),
});

/** Just what a quote needs of a resting order and of a tape line. */
export type QuoteOrder = Pick<MarketOrderRecord, 'side' | 'price' | 'units' | 'filled' | 'expiresAt'>;
export type QuoteFill = Pick<MarketFillRecord, 'commodity' | 'price'>;

/** One commodity as a city shows it at time `t`. `book` holds this commodity's resting orders, `tape` the city's fills (newest last). */
export function quoteOf(cityId: string, commodity: CommodityId, t: number, book: readonly QuoteOrder[] = [], tape: readonly QuoteFill[] = [], salt = ''): MarketQuote {
  const ref = refPrice(cityId, commodity, t, salt), before = refPrice(cityId, commodity, t - DAY, salt);
  const quote: MarketQuote = { commodity, ref, bid: bidOf(ref), ask: askOf(ref), change: Math.round((ref - before) / before * BPS), band: bandOf(ref) };
  let bestBid: number | undefined, bestAsk: number | undefined;
  for (const order of book) {
    if (order.expiresAt <= t || order.units - order.filled <= 0) continue;
    if (order.side === 'buy') { if (bestBid === undefined || order.price > bestBid) bestBid = order.price; }
    else if (bestAsk === undefined || order.price < bestAsk) bestAsk = order.price;
  }
  if (bestBid !== undefined) quote.bestBid = bestBid;
  if (bestAsk !== undefined) quote.bestAsk = bestAsk;
  for (let index = tape.length - 1; index >= 0; index--) { const fill = tape[index]; if (fill?.commodity === commodity) { quote.last = fill.price; break; } }
  const event = eventsAt(cityId, hourOf(t) * HOUR, salt).filter((item) => item.commodity === commodity).sort((a, z) => z.to - a.to)[0];
  if (event) quote.event = { headline: event.headline, to: event.to };
  return quote;
}

/** The reference price each hour of the last seven days, oldest first: [hour start ms, ref] — 168 points, the last is this hour. */
export function history(cityId: string, commodity: CommodityId, t: number, salt = ''): [number, number][] {
  const last = hourOf(t) * HOUR;
  return Array.from({ length: 168 }, (_, index): [number, number] => { const at = last - (167 - index) * HOUR; return [at, refPrice(cityId, commodity, at, salt)]; });
}

// ---- fees and amounts ----------------------------------------------------------------------------

/** The fee on a fill worth `value` naira, paid by each side: feeBps of the value, at least 1. */
export const feeOf = (value: number, limits: MarketLimits = MARKET_LIMITS): number => Math.max(1, Math.ceil(value * limits.feeBps / BPS));
/** What a buy holds in its order: its limit price for every unit and the fees on them, at most. Fills never use more (see feeOf). */
export const holdFor = (price: number, units: number, limits: MarketLimits = MARKET_LIMITS): number => units * (price + feeOf(price, limits));
/** Units of an order not yet filled. */
export const unitsLeft = (order: Pick<MarketOrderRecord, 'units' | 'filled'>): number => Math.max(0, order.units - order.filled);

// ---- accounts ------------------------------------------------------------------------------------

export const emptyAccount = (name: string, day: number): MarketAccountRecord => ({ cash: 0, holdings: {}, anon: false, day, deposited: 0, traded: 0, makerUnits: {}, pairs: {}, name });
/** Start a new Lagos day's counters when the day has changed. */
export function rollDay(account: MarketAccountRecord, day: number): void {
  if (account.day === day) return;
  account.day = day; account.deposited = 0; account.traded = 0; account.makerUnits = {}; account.pairs = {};
}
/** An account's counters as they stand on `day`, without changing it. */
export function todayOf(account: Pick<MarketAccountRecord, 'day' | 'deposited' | 'traded' | 'makerUnits' | 'pairs'> | undefined, day: number): { deposited: number; traded: number; makerUnits: Partial<Record<CommodityId, number>>; pairs: Record<string, number> } {
  return account && account.day === day ? { deposited: account.deposited, traded: account.traded, makerUnits: account.makerUnits, pairs: account.pairs } : { deposited: 0, traded: 0, makerUnits: {}, pairs: {} };
}
/** Naira held by open buy orders. */
export const reservedCash = (orders: readonly MarketOrderRecord[]): number => orders.reduce((sum, order) => sum + (order.side === 'buy' ? order.held ?? 0 : 0), 0);
/** How a trader is named on the tape (D4): the public name, or "Anonymous trader". Never an id. */
export const labelOf = (account: Pick<MarketAccountRecord, 'anon' | 'name'> | undefined): string => (account && !account.anon && account.name ? account.name : ANONYMOUS_TRADER);

// ---- refusals ------------------------------------------------------------------------------------

/** Why the rules refuse something, in a sentence a player can act on. */
export interface Refusal { code: string; reason: string }
const no = (code: string, reason: string): Refusal => ({ code, reason });

export interface OrderCheck {
  commodity: CommodityId
  side: MarketSide
  price: number
  units: number
  now?: boolean
  quote: MarketQuote
  /** Free naira in the account. */
  cash: number
  /** Units of this commodity held, not in a sell order. */
  held: number
  /** Units held plus units still wanted by open buy orders. */
  position: number
  /** Open orders in this city, all commodities. */
  openOrders: number
  /** Naira filled today. */
  traded: number
  frozen: boolean
}
/** Why a new order is refused, or null. Nothing is changed. */
export function orderRefusal(check: OrderCheck, limits: MarketLimits = MARKET_LIMITS): Refusal | null {
  const item = commodityOf(check.commodity), { price, units, quote } = check;
  if (check.frozen) return no('frozen', 'Your market account is paused by the moderators. You can still cancel orders and withdraw your naira.');
  if (check.side !== 'buy' && check.side !== 'sell') return no('invalid_side', 'Choose buy or sell.');
  if (!whole(units) || units < 1 || units > limits.maxUnitsPerOrder) return no('invalid_units', `Choose 1 to ${limits.maxUnitsPerOrder} units.`);
  if (!whole(price) || price < 1) return no('invalid_price', 'Enter a price in whole naira.');
  if (price < quote.band.min || price > quote.band.max) return no('outside_band', `Today ${item.label.toLowerCase()} can be priced from ${naira(quote.band.min)} to ${naira(quote.band.max)}. The reference price is ${naira(quote.ref)}.`);
  if (check.now !== true && check.openOrders >= limits.maxOpenOrders) return no('too_many_orders', `You have ${check.openOrders} open orders in this city, which is the most allowed (${limits.maxOpenOrders}). Cancel one first.`);
  const value = price * units;
  if (check.traded + value > limits.tradedPerDay) return no('traded_limit', `You can trade ${naira(limits.tradedPerDay)} a day in one city. ${naira(Math.max(0, limits.tradedPerDay - check.traded))} is left today; it resets at midnight, Nigerian time.`);
  if (check.side === 'buy') {
    const need = holdFor(price, units, limits);
    if (check.cash < need) return no('insufficient_cash', `This order needs ${naira(need)} in your market account (${naira(value)} and up to ${naira(need - value)} in fees); ${check.cash ? `you have ${naira(check.cash)}` : 'it is empty'}. Deposit naira first.`);
    if (check.position + units > limits.maxPosition) return no('position_limit', `You can hold at most ${limits.maxPosition} ${item.label.toLowerCase()} in one city. You hold or have ordered ${check.position}.`);
  } else if (check.held < units) return no('insufficient_units', `You hold ${check.held} × ${item.label.toLowerCase()} (${item.unit}) in this city; you tried to sell ${units}.`);
  return null;
}

/** Why a deposit is refused, or null. `cash` and `reserved` are what the account holds now. */
export function depositRefusal(input: { amount: unknown; cash: number; reserved: number; deposited: number; frozen: boolean }, limits: MarketLimits = MARKET_LIMITS): Refusal | null {
  const { amount } = input;
  if (!whole(amount) || amount < 1) return no('invalid_amount', 'Enter a whole number of naira.');
  if (input.frozen) return no('frozen', 'Your market account is paused by the moderators. You can still cancel orders and withdraw your naira.');
  if (input.deposited + amount > limits.depositPerDay) return no('deposit_limit', `You can move ${naira(limits.depositPerDay)} a day into a city’s market. ${naira(Math.max(0, limits.depositPerDay - input.deposited))} is left today; it resets at midnight, Nigerian time.`);
  if (input.cash + input.reserved + amount > limits.accountMax) return no('account_full', `A city’s market account holds at most ${naira(limits.accountMax)}. You can add ${naira(Math.max(0, limits.accountMax - input.cash - input.reserved))}.`);
  return null;
}
/** Why a withdrawal is refused, or null. `cash` is the free naira in the account. */
export function withdrawRefusal(input: { amount: unknown; cash: number }): Refusal | null {
  const { amount } = input;
  if (!whole(amount) || amount < 1) return no('invalid_amount', 'Enter a whole number of naira.');
  if (amount > input.cash) return no('insufficient_funds', `You have ${naira(input.cash)} free in this market account${input.cash ? '' : '; naira held by open orders comes back when you cancel them'}.`);
  return null;
}

// ---- matching ------------------------------------------------------------------------------------

/** The order engine's input: who, which side, the limit price, how many, and whether it is fill-or-drop. */
export interface MatchOrder { by: string; side: MarketSide; price: number; units: number; now?: boolean }
export interface MatchOptions {
  /** The resting orders of ONE commodity in one city, either side. Expired ones must be left out by the caller. */
  book: readonly MarketOrderRecord[]
  /** What the market maker pays and asks now. */
  quote: Pick<MarketQuote, 'bid' | 'ask'>
  /** Units the market maker may still trade with this player today. */
  makerLeft: number
  /** May this player trade with that one at all (not frozen, not blocked, not the same device)? Asked once per counterparty. */
  eligible?: (counterpartyId: string) => boolean
  /** The most units that may still change hands with that player at that price, given the naira already matched with them in this call. */
  room?: (counterpartyId: string, price: number, matchedValue: number) => number
  /** Naira of fills this player may still make today. */
  tradedLeft?: number
}
/** One fill the engine found. `order` is the resting order it used; '' (and `by` '') for the market maker. */
export interface MatchFill { order: string; by: string; price: number; units: number }
export interface MatchResult {
  fills: MatchFill[]
  /** Units filled. */
  filled: number
  /** Units not filled. */
  left: number
  /** Whether the rest goes on the book: units left and the order is not `now`. */
  rests: boolean
  /** Units of the fills that were with the market maker. */
  makerUnits: number
}

/** Best first for resting orders on `side`: the highest buy and the lowest sell, then the earliest, then the id (ids count up, so a longer one is later: equal orders always sort the same way). */
const priority = (side: MarketSide) => (a: MarketOrderRecord, z: MarketOrderRecord): number => (side === 'buy' ? z.price - a.price : a.price - z.price) || a.at - z.at || a.id.length - z.id.length || (a.id < z.id ? -1 : a.id > z.id ? 1 : 0);

/**
 * Match an incoming order against the book and the market maker. Pure: nothing is changed, the fills are returned. Fills are
 * found best price first, the resting players' orders and the maker's quote together (the maker is one more order, at its
 * ask or bid, with room for `makerLeft` units, and it comes after players at an equal price). A fill is at the price of the
 * order it uses. An order never fills against its own player.
 */
export function match(order: MatchOrder, options: MatchOptions): MatchResult {
  const buying = order.side === 'buy';
  const resting = options.book
    .filter((item) => item.side !== order.side && item.by !== order.by && unitsLeft(item) > 0 && (buying ? item.price <= order.price : item.price >= order.price))
    .sort(priority(order.side === 'buy' ? 'sell' : 'buy'));
  const makerPrice = buying ? options.quote.ask : options.quote.bid;
  const makerCrosses = buying ? order.price >= makerPrice : order.price <= makerPrice;
  const allowed = new Map<string, boolean>(), matchedValue = new Map<string, number>(), taken = new Map<string, number>();
  const may = (id: string): boolean => { let found = allowed.get(id); if (found === undefined) { found = options.eligible ? options.eligible(id) : true; allowed.set(id, found); } return found; };
  const fills: MatchFill[] = [];
  let want = order.units, valueLeft = options.tradedLeft ?? Infinity, makerLeft = Math.max(0, options.makerLeft), makerUnits = 0, at = 0;
  while (want > 0) {
    let candidate = resting[at];
    while (candidate && !may(candidate.by)) candidate = resting[++at];
    const useMaker = makerCrosses && makerLeft > 0 && (!candidate || (buying ? makerPrice < candidate.price : makerPrice > candidate.price));
    if (!candidate && !useMaker) break;
    const price = useMaker ? makerPrice : (candidate as MarketOrderRecord).price;
    const mine = Math.min(want, Math.floor(valueLeft / price));
    if (mine <= 0) break;
    let units: number;
    if (useMaker) units = Math.min(mine, makerLeft);
    else {
      const rest = candidate as MarketOrderRecord;
      const room = options.room ? Math.floor(options.room(rest.by, price, matchedValue.get(rest.by) ?? 0)) : Infinity;
      units = Math.min(mine, unitsLeft(rest) - (taken.get(rest.id) ?? 0), room);
      if (units <= 0) { at += 1; continue; }
      taken.set(rest.id, (taken.get(rest.id) ?? 0) + units);
      matchedValue.set(rest.by, (matchedValue.get(rest.by) ?? 0) + units * price);
      fills.push({ order: rest.id, by: rest.by, price, units });
    }
    if (useMaker) { fills.push({ order: '', by: '', price, units }); makerLeft -= units; makerUnits += units; }
    want -= units; valueLeft -= units * price;
    // A fully used resting order is behind us.
    if (!useMaker && candidate && unitsLeft(candidate) - (taken.get(candidate.id) ?? 0) <= 0) at += 1;
  }
  return { fills, filled: order.units - want, left: want, rests: want > 0 && order.now !== true, makerUnits };
}

// ---- the book ------------------------------------------------------------------------------------

/** One commodity in one city, as the rules change it. `accounts` is the whole city's (the book's owners are in it). */
export interface MarketRoom {
  accounts: Record<string, MarketAccountRecord>
  /** This commodity's resting orders. */
  book: MarketOrderRecord[]
  /** The city's fills, newest last. */
  tape: MarketFillRecord[]
}
export interface SubmitEnv {
  now: number
  /** The quote at `now`, with this book (quoteOf). */
  quote: MarketQuote
  /** Players who may not trade with each other: a block either way, or a shared device. */
  barred: (a: string, b: string) => boolean
  frozen: (id: string) => boolean
  /** Open orders `who` has in this city, all commodities. */
  openOrders: number
  /** A fresh id for an order or a fill. */
  nextId: () => string
  limits?: MarketLimits
}
export interface Submit { commodity: CommodityId; side: MarketSide; price: number; units: number; now?: boolean }
export type SubmitResult =
  | { ok: false; code: string; reason: string }
  | { ok: true; code: 'filled' | 'partial' | 'placed'; order: MarketOrderRecord; fills: MarketFillRecord[]; rested: boolean }

/** Give an order's holding back to its owner (a cancel, an expiry or the end of an order): naira for a buy, units for a sell. */
export function release(accounts: Record<string, MarketAccountRecord>, order: MarketOrderRecord): void {
  const account = accounts[order.by];
  if (!account) return;
  if (order.side === 'buy') account.cash += Math.max(0, order.held ?? 0);
  else account.holdings[order.commodity] = (account.holdings[order.commodity] ?? 0) + unitsLeft(order);
}
/** Remove the orders that have run out of time from a book, giving back what they held. Returns how many. */
export function expireBook(accounts: Record<string, MarketAccountRecord>, book: MarketOrderRecord[], now: number): number {
  let removed = 0;
  for (let index = book.length - 1; index >= 0; index--) {
    const order = book[index];
    if (!order || order.expiresAt > now) continue;
    release(accounts, order); book.splice(index, 1); removed += 1;
  }
  return removed;
}
/** Take the player's own order off the book and give back what it held; null when there is no such order of theirs. */
export function cancelOrder(accounts: Record<string, MarketAccountRecord>, book: MarketOrderRecord[], who: string, orderId: string): MarketOrderRecord | null {
  const index = book.findIndex((order) => order.id === orderId && order.by === who);
  const order = book[index];
  if (index < 0 || !order) return null;
  release(accounts, order); book.splice(index, 1);
  return order;
}

/** The naira an account holds in all: free, and held by its buy orders (`book` lists the orders of every commodity the account may have). */
export const wealthOf = (account: MarketAccountRecord | undefined, orders: readonly MarketOrderRecord[]): number => (account?.cash ?? 0) + reservedCash(orders);

/**
 * Place an order: check, match, settle every fill on both accounts, append the fills to the tape and rest what is left.
 * Changes nothing when it refuses. The caller has already removed expired orders from the book and made the account exist.
 */
export function submit(room: MarketRoom, who: { id: string; name: string }, input: Submit, env: SubmitEnv): SubmitResult {
  const limits = env.limits ?? MARKET_LIMITS, day = lagosTime(env.now).day, { accounts, book, tape } = room;
  const mine = accounts[who.id];
  const today = todayOf(mine, day);
  const holding = mine?.holdings[input.commodity] ?? 0;
  const wanted = book.reduce((sum, order) => sum + (order.by === who.id && order.side === 'buy' ? unitsLeft(order) : 0), 0);
  const refusal = orderRefusal({
    commodity: input.commodity, side: input.side, price: input.price, units: input.units, ...(input.now === true ? { now: true } : {}), quote: env.quote,
    cash: mine?.cash ?? 0, held: holding, position: holding + wanted, openOrders: env.openOrders, traded: today.traded, frozen: env.frozen(who.id),
  }, limits);
  if (refusal) return { ok: false, ...refusal };
  if (!mine) return { ok: false, ...no('insufficient_cash', 'Deposit naira into this city’s market first.') };

  const live = book.filter((order) => order.expiresAt > env.now && whole(order.price) && order.price > 0 && (order.side === 'sell' || whole(order.held)));
  const found = match({ by: who.id, side: input.side, price: input.price, units: input.units, ...(input.now === true ? { now: true } : {}) }, {
    book: live,
    quote: env.quote,
    makerLeft: limits.makerUnitsPerDay - (today.makerUnits[input.commodity] ?? 0),
    tradedLeft: limits.tradedPerDay - today.traded,
    eligible: (id) => id !== who.id && accounts[id] !== undefined && !env.frozen(id) && !env.barred(who.id, id),
    room: (id, price, matchedValue) => {
      const other = todayOf(accounts[id], day);
      return Math.floor(Math.min(limits.pairPerDay - (today.pairs[id] ?? 0) - matchedValue, limits.tradedPerDay - other.traded - matchedValue) / price);
    },
  });
  if (input.now === true && found.filled === 0) return { ok: false, ...no('no_match', 'Nothing could be filled at that price right now. Try a price closer to the market, or place a resting order.') };

  // Where the rest would go: a full book gives way only to a better price on the same side.
  let evict: MarketOrderRecord | null = null;
  if (found.rests && book.length >= MARKET_BOOK_MAX) {
    const same = book.filter((order) => order.side === input.side).sort(priority(input.side));
    const worst = same[same.length - 1];
    const better = worst !== undefined && (input.side === 'buy' ? input.price > worst.price : input.price < worst.price);
    if (better) evict = worst;
    else if (found.filled === 0) return { ok: false, ...no('book_full', `The ${commodityOf(input.commodity).label.toLowerCase()} book is full at the moment. Try a better price, or try again later.`) };
  }

  // ---- from here on, it changes things -----
  rollDay(mine, day);
  mine.name = who.name;
  const order: MarketOrderRecord = {
    id: env.nextId(), commodity: input.commodity, side: input.side, price: input.price, units: input.units, filled: 0, at: env.now, expiresAt: env.now + limits.orderHours * HOUR, by: who.id,
  };
  if (input.side === 'buy') { order.held = holdFor(input.price, input.units, limits); mine.cash -= order.held; }
  else mine.holdings[input.commodity] = holding - input.units;

  const fills: MarketFillRecord[] = [];
  for (const fill of found.fills) {
    const value = fill.price * fill.units, fee = Math.min(value, feeOf(value, limits));
    const resting = fill.order ? book.find((item) => item.id === fill.order) : undefined;
    const other = fill.by ? accounts[fill.by] : undefined;
    if (other) rollDay(other, day);
    const buyerOrder = input.side === 'buy' ? order : resting, sellerOrder = input.side === 'buy' ? resting : order;
    const buyerAccount = input.side === 'buy' ? mine : other, sellerAccount = input.side === 'buy' ? other : mine;
    // The buyer's order pays the price and the fee out of what it holds; the seller gets the price less the fee.
    if (buyerOrder) buyerOrder.held = Math.max(0, (buyerOrder.held ?? 0) - value - fee);
    if (buyerAccount) buyerAccount.holdings[input.commodity] = (buyerAccount.holdings[input.commodity] ?? 0) + fill.units;
    if (sellerAccount) sellerAccount.cash += value - fee;
    if (sellerOrder) sellerOrder.filled += fill.units;
    if (buyerOrder) buyerOrder.filled += fill.units;
    mine.traded += value;
    if (other) { other.traded += value; mine.pairs[fill.by] = (mine.pairs[fill.by] ?? 0) + value; other.pairs[who.id] = (other.pairs[who.id] ?? 0) + value; }
    else mine.makerUnits[input.commodity] = (mine.makerUnits[input.commodity] ?? 0) + fill.units;
    const youBuy = input.side === 'buy';
    const record: MarketFillRecord = {
      id: env.nextId(), commodity: input.commodity, price: fill.price, units: fill.units, at: env.now,
      buyerId: youBuy ? who.id : fill.by, sellerId: youBuy ? fill.by : who.id,
      buyer: youBuy ? labelOf(mine) : other ? labelOf(other) : MARKET_MAKER, seller: youBuy ? (other ? labelOf(other) : MARKET_MAKER) : labelOf(mine),
    };
    fills.push(record);
    tape.push(record);
    // A resting order that is used up leaves the book, giving back the slack of its hold.
    if (resting && unitsLeft(resting) <= 0) { release(accounts, resting); book.splice(book.indexOf(resting), 1); }
  }
  if (tape.length > MARKET_TAPE) tape.splice(0, tape.length - MARKET_TAPE);

  let rested = false;
  if (unitsLeft(order) > 0 && found.rests) {
    if (evict) { release(accounts, evict); book.splice(book.indexOf(evict), 1); }
    if (evict || book.length < MARKET_BOOK_MAX) { book.push(order); rested = true; }
  }
  // An order that does not rest (filled, or dropped) gives back what it still holds.
  if (!rested) release(accounts, order);
  return { ok: true, code: order.filled === 0 ? 'placed' : unitsLeft(order) === 0 ? 'filled' : 'partial', order, fills, rested };
}
