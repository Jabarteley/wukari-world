/**
 * OWNER: market
 * The Allworld Market on the server: the shared record and everything that changes it. Portable (no Node imports), used by
 * server/routes/market.ts and server/routes/market-mod.ts. The rules are pure (src/game/market-model.ts); the life's side is
 * the server-only action 'market.server' (src/game/systems/market.ts). Design: docs/MARKET.md.
 *
 * db.market = {
 *   v: 1,
 *   salt:     string   64 hex characters, made once; keys the price walk and the events; NEVER sent to a player (it is in the root, not in a keyed map)
 *   accounts: { [cityId]: { [publicId]: MarketAccountRecord } }   one account per player per city: free naira, holdings, today's counters
 *   books:    { [cityId]: { [commodity]: MarketOrderRecord[] } }   resting orders; price-time order is computed, not stored
 *   tape:     { [cityId]: MarketFillRecord[] }                     the newest MARKET_TAPE fills, newest last
 *   frozen:   string[]                                            public ids an operator froze: they may cancel and withdraw, not trade
 *   seq:      number                                              last order or fill id
 * }
 * Public ids appear only in this record and are NEVER sent to another player: the tape carries display labels (the public
 * character name, or "Anonymous trader", or "Market maker"; D4) and the view marks the reader's own fills.
 * Storage: the accounts and the books are kept one city at a time (server/keyed.ts), the tape and the small lists in the root.
 *
 * WRITES. Every write is ONE ctx.store.transact under the caller's receipt (ctx.once, mandatory requestId): the account and
 * the order book change together with the life's wallet (deposit and withdraw run ctx.act(life, 'market.server') in that same
 * transaction, so both are saved or neither). Resting orders expire lazily: whenever a city's books are touched by a write,
 * the orders past their time are removed and their holdings go back to their owners. A read changes and creates nothing: it
 * works the same expiry out for the reader's own account on the fly.
 *
 * D2. Cash and holdings belong to a city. Deposit and withdraw need the caller's character to be in that city; trading does not.
 * D5. Money that comes out of the market is not earned from work: it is a plain credit (systems/market.ts).
 *
 * WHAT A FILL BETWEEN TWO PLAYERS IS CHECKED AGAINST (src/game/market-model.ts has the rest)
 *   not your own order · neither is frozen · no block either way · not a device the other has used · the pair's naira today
 *   under pairPerDay (kept in account.pairs, reset each Lagos day) · each side's naira today under tradedPerDay.
 *   Buyers behind one network address are not tracked: the pair cap, the band and the daily limits bound what a pair can pass.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { COMMODITIES, MARKET_LIMITS, MARKET_TAPE, MARKET_TAPE_VIEW } from '../../src/game/content/market.ts';
import {
  cancelOrder, depositRefusal, emptyAccount, expireBook, history, isCommodity, labelOf, quoteOf, rollDay, submit, todayOf, unitsLeft, withdrawRefusal,
} from '../../src/game/market-model.ts';
import type { Refusal } from '../../src/game/market-model.ts';
import type {
  CommodityId, MarketAccountRecord, MarketAccountView, MarketCollection, MarketFill, MarketFillRecord, MarketHistoryResponse, MarketOrder, MarketOrderRecord, MarketQuote,
  MarketViewResponse,
} from '../../src/types/market.ts';
import type { LifeState } from '../../src/types/life.ts';
import type { CityId } from '../../src/types/protocol.ts';
import { socialService } from '../social/service.ts';
import type { ActionOutcome, Db, RouteContext, RouteRequest, SessionRecord } from '../types.ts';

type Bad = { ok: false; code: string; reason: string };
type Done<C extends string = string> = { ok: true; code: C };
const no = (code: string, reason: string): Bad => ({ ok: false, code, reason });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const COMMODITY_IDS = COMMODITIES.map((item) => item.id);

// ---- the stored record, repaired on write and tolerated on read -----------------------------------

export const emptyMarket = (): MarketCollection => ({ v: 1, accounts: {}, books: {}, tape: {}, frozen: [], seq: 0, salt: '' });
const SALT = /^[0-9a-f]{64}$/;
const saltOk = (value: unknown): value is string => typeof value === 'string' && SALT.test(value);
/** The collection, created or repaired in place so damaged data cannot crash a route. */
export function marketOf(ctx: Pick<RouteContext, 'collection' | 'randomId'>, db: Db): MarketCollection {
  const found = ctx.collection(db, 'market', emptyMarket()) as Partial<MarketCollection>;
  if (!record(found.accounts)) found.accounts = {};
  if (!record(found.books)) found.books = {};
  if (!record(found.tape)) found.tape = {};
  if (!Array.isArray(found.frozen)) found.frozen = [];
  else if (found.frozen.some((id) => typeof id !== 'string')) found.frozen = found.frozen.filter((id): id is string => typeof id === 'string');
  if (!whole(found.seq)) found.seq = 0;
  // The salt is made once from the host's random source and repaired if it is missing or damaged.
  if (!saltOk(found.salt)) found.salt = `${ctx.randomId()}${ctx.randomId()}`.replace(/-/g, '').slice(0, 64);
  found.v = 1;
  return found as MarketCollection;
}
/** The collection as a read sees it: nothing is created or changed. */
function peekMarket(db: Db): MarketCollection {
  const found: unknown = db.market;
  const part = (key: string): Record<string, unknown> => (record(found) && record(found[key]) ? found[key] : {});
  return {
    v: 1, accounts: part('accounts') as MarketCollection['accounts'], books: part('books') as MarketCollection['books'], tape: part('tape') as MarketCollection['tape'],
    frozen: record(found) && Array.isArray(found.frozen) ? found.frozen.filter((id): id is string => typeof id === 'string') : [], seq: record(found) && whole(found.seq) ? found.seq : 0,
    salt: record(found) && saltOk(found.salt) ? found.salt : '',
  };
}

const countMap = (value: unknown): value is Record<string, number> => record(value) && Object.values(value).every(whole);
function soundAccount(value: unknown): value is MarketAccountRecord {
  return record(value) && whole(value.cash) && record(value.holdings) && Object.entries(value.holdings).every(([id, units]) => isCommodity(id) && whole(units)) && typeof value.anon === 'boolean'
    && whole(value.day) && whole(value.deposited) && whole(value.traded) && countMap(value.makerUnits) && countMap(value.pairs) && typeof value.name === 'string';
}
/** What can be saved of a damaged account: every number that is a whole count, nothing else. */
function mendAccount(raw: unknown, name: string, day: number): MarketAccountRecord {
  const base = emptyAccount(name, day);
  if (!record(raw)) return base;
  const counts = (value: unknown, keep: (key: string) => boolean): Record<string, number> => Object.fromEntries(Object.entries(record(value) ? value : {}).filter(([key, count]) => keep(key) && whole(count)).map(([key, count]) => [key, count as number]));
  return {
    cash: whole(raw.cash) ? raw.cash : 0, holdings: counts(raw.holdings, isCommodity), anon: raw.anon === true, day: whole(raw.day) ? raw.day : day, deposited: whole(raw.deposited) ? raw.deposited : 0,
    traded: whole(raw.traded) ? raw.traded : 0, makerUnits: counts(raw.makerUnits, isCommodity), pairs: counts(raw.pairs, () => true), name: typeof raw.name === 'string' ? raw.name : name,
  };
}
function soundOrder(value: unknown): value is MarketOrderRecord {
  return record(value) && typeof value.id === 'string' && isCommodity(value.commodity) && (value.side === 'buy' || value.side === 'sell') && whole(value.price) && value.price > 0
    && whole(value.units) && value.units > 0 && whole(value.filled) && value.filled < value.units && whole(value.at) && whole(value.expiresAt) && typeof value.by === 'string'
    && (value.side === 'sell' || whole(value.held));
}
function soundFill(value: unknown): value is MarketFillRecord {
  return record(value) && typeof value.id === 'string' && isCommodity(value.commodity) && whole(value.price) && whole(value.units) && whole(value.at)
    && typeof value.buyerId === 'string' && typeof value.sellerId === 'string' && typeof value.buyer === 'string' && typeof value.seller === 'string';
}
const readBook = (raw: unknown, commodity: CommodityId): MarketOrderRecord[] => (Array.isArray(raw) ? raw.filter((order): order is MarketOrderRecord => soundOrder(order) && order.commodity === commodity) : []);
const readTape = (raw: unknown): MarketFillRecord[] => (Array.isArray(raw) ? raw.filter(soundFill) : []);

export type MarketService = ReturnType<typeof buildService>;
const services = new WeakMap<RouteContext, MarketService>();
export function marketService(ctx: RouteContext): MarketService {
  const cached = services.get(ctx);
  if (cached) return cached;
  const service = buildService(ctx);
  services.set(ctx, service);
  return service;
}

function buildService(ctx: RouteContext) {
  const now = (): number => ctx.now();
  const social = socialService(ctx);
  const blocked = (a: string, b: string): boolean => ctx.checks?.blocked?.(a, b) === true;
  const act = (life: LifeState, cityId: CityId, payload: { op: 'deposit' | 'withdraw'; amount: number }): ActionOutcome => ctx.act(life, { type: 'market.server', cityId, payload });
  const refuse = (outcome: ActionOutcome): Bad => no(outcome.code, outcome.reason ?? 'That could not be done.');
  /** The two players have used one device (the growth module keeps salted hashes of device tokens; read only). */
  function sharedDevice(db: Db, a: string, b: string): boolean {
    const mine = db.growth?.players?.[a]?.devices, theirs = db.growth?.players?.[b]?.devices;
    return Array.isArray(mine) && Array.isArray(theirs) && mine.some((hash) => theirs.includes(hash));
  }

  // ---- one city, for a write ---------------------------------------------------------------------
  interface City { m: MarketCollection; accounts: Record<string, MarketAccountRecord>; books: Record<string, MarketOrderRecord[]>; tape: MarketFillRecord[] }
  /**
   * The city's record for a write, repaired: damaged orders and fills are dropped, an order whose owner has no account is dropped,
   * and every order past its time is removed with its holding given back.
   */
  function cityOf(db: Db, cityId: string): City {
    const m = marketOf(ctx, db), at = now(), day = lagosTime(at).day;
    if (!record(m.accounts[cityId])) m.accounts[cityId] = {};
    const accounts = m.accounts[cityId] as Record<string, MarketAccountRecord>;
    const stored = record(m.books[cityId]) ? m.books[cityId] as Record<string, unknown> : (m.books[cityId] = {}) as Record<string, unknown>;
    const books: Record<string, MarketOrderRecord[]> = {};
    for (const id of COMMODITY_IDS) {
      const raw = stored[id];
      let book: MarketOrderRecord[];
      if (Array.isArray(raw) && raw.every((order) => soundOrder(order) && order.commodity === id)) book = raw as MarketOrderRecord[];
      else { book = readBook(raw, id); stored[id] = book; }
      // Orders that point at an account that is gone cannot be settled.
      for (let index = book.length - 1; index >= 0; index--) if (!accounts[(book[index] as MarketOrderRecord).by]) book.splice(index, 1);
      for (const order of book) if (!soundAccount(accounts[order.by])) accounts[order.by] = mendAccount(accounts[order.by], '', day);
      expireBook(accounts, book, at);
      books[id] = book;
    }
    if (!Array.isArray(m.tape[cityId])) m.tape[cityId] = [];
    else if (!(m.tape[cityId] as unknown[]).every(soundFill)) m.tape[cityId] = readTape(m.tape[cityId]);
    const tape = m.tape[cityId] as MarketFillRecord[];
    if (tape.length > MARKET_TAPE) tape.splice(0, tape.length - MARKET_TAPE);
    return { m, accounts, books, tape };
  }
  /** The caller's account in a city for a write, repaired and rolled to today; undefined when they have none (and `create` is false). */
  function accountOf(city: City, who: { id: string; name: string }, create: boolean): MarketAccountRecord | undefined {
    const day = lagosTime(now()).day, raw = city.accounts[who.id];
    if (raw === undefined && !create) return undefined;
    const account = soundAccount(raw) ? raw : (city.accounts[who.id] = mendAccount(raw, who.name, day));
    account.name = who.name;
    return account;
  }
  const openOrdersOf = (city: City, id: string): number => COMMODITY_IDS.reduce((sum, commodity) => sum + (city.books[commodity] ?? []).filter((order) => order.by === id).length, 0);

  // ---- views -------------------------------------------------------------------------------------
  function orderView(order: MarketOrderRecord): MarketOrder {
    return { id: order.id, commodity: order.commodity, side: order.side, price: order.price, units: order.units, filled: order.filled, at: order.at, expiresAt: order.expiresAt };
  }
  function fillView(fill: MarketFillRecord, reader: string | null): MarketFill {
    const view: MarketFill = { id: fill.id, commodity: fill.commodity, price: fill.price, units: fill.units, at: fill.at, buyer: fill.buyer, seller: fill.seller };
    if (reader !== null && (fill.buyerId === reader || fill.sellerId === reader)) view.mine = true;
    return view;
  }
  /** The reader's account as it stands now: orders past their time count as already given back, though nothing is written. */
  function accountView(raw: unknown, orders: MarketOrderRecord[], at: number, frozen: boolean): MarketAccountView {
    const day = lagosTime(at).day, account = soundAccount(raw) ? raw : undefined, today = todayOf(account, day);
    const view: MarketAccountView = { cash: account?.cash ?? 0, reservedCash: 0, holdings: { ...(account?.holdings ?? {}) }, reservedUnits: {}, orders: [], anon: account?.anon ?? false, today: { deposited: today.deposited, traded: today.traded, makerUnits: { ...today.makerUnits } } };
    for (const order of orders) {
      if (order.expiresAt <= at) {
        if (order.side === 'buy') view.cash += order.held ?? 0; else view.holdings[order.commodity] = (view.holdings[order.commodity] ?? 0) + unitsLeft(order);
        continue;
      }
      if (order.side === 'buy') view.reservedCash += order.held ?? 0; else view.reservedUnits[order.commodity] = (view.reservedUnits[order.commodity] ?? 0) + unitsLeft(order);
      view.orders.push(orderView(order));
    }
    view.orders.sort((a, z) => z.at - a.at);
    for (const commodity of COMMODITY_IDS) if (!view.holdings[commodity]) delete view.holdings[commodity];
    if (frozen) view.frozen = true;
    return view;
  }
  /** What a city's market looks like to a reader (a session, or nobody). Changes and creates nothing. */
  function view(db: Db, cityId: string, session: SessionRecord | undefined): MarketViewResponse {
    const m = peekMarket(db), at = now(), me = session ? ctx.publicSession(session).id : null;
    const stored = record(m.books[cityId]) ? m.books[cityId] as Record<string, unknown> : {};
    const tape = readTape(m.tape[cityId]);
    const quotes: MarketQuote[] = [];
    const mine: MarketOrderRecord[] = [];
    for (const commodity of COMMODITY_IDS) {
      const book = readBook(stored[commodity], commodity);
      quotes.push(quoteOf(cityId, commodity, at, book, tape, m.salt));
      if (me !== null) mine.push(...book.filter((order) => order.by === me));
    }
    const accounts = record(m.accounts[cityId]) ? m.accounts[cityId] as Record<string, unknown> : {};
    return {
      city: cityId, quotes,
      tape: tape.slice(-MARKET_TAPE_VIEW).reverse().map((fill) => fillView(fill, me)),
      account: me === null ? null : accountView(accounts[me], mine, at, m.frozen.includes(me)),
      limits: MARKET_LIMITS,
    };
  }
  /** The body of a write: the outcome, the fills it made, the life when it changed, and the market as it now stands. */
  function written(db: Db, cityId: string, session: SessionRecord, outcome: Bad | Done | (Done & { duplicate: true }) | (Bad & { duplicate: true }), extra: { fills?: MarketFillRecord[]; life?: LifeState }) {
    const me = ctx.publicSession(session).id;
    return {
      ...outcome,
      ...(extra.fills && extra.fills.length ? { fills: extra.fills.map((fill) => fillView(fill, me)) } : {}),
      ...(extra.life ? { state: extra.life } : {}),
      ...view(db, cityId, session),
    };
  }

  return {
    LIMITS: MARKET_LIMITS,

    /** Is the secret price salt made yet? A read needs it, and the first read makes it (ensureSalt): the one thing a read may create. */
    hasSalt(db: Db): boolean { return peekMarket(db).salt !== ''; },
    ensureSalt(db: Db): void { marketOf(ctx, db); },

    /** GET /api/market/view — works signed out (the prices and the tape are public); nothing is written. */
    view(db: Db, request: RouteRequest, cityId: CityId): MarketViewResponse {
      return view(db, cityId, request.session(db));
    },
    /** GET /api/market/history — computed from the pure reference; nothing is stored. */
    history(db: Db, cityId: CityId, commodity: CommodityId): MarketHistoryResponse {
      return { city: cityId, commodity, points: history(cityId, commodity, now(), peekMarket(db).salt) };
    },

    /** Move naira from the caller's wallet into this city's market account. The character must be in the city. */
    deposit(db: Db, request: RouteRequest, cityId: CityId, body: Record<string, unknown>) {
      const session = request.requireSession(db, { renew: true }), who = ctx.publicSession(session);
      const life = ctx.settle(session, cityId);
      const outcome = ctx.once(db, session, { id: body.requestId, kind: 'market.deposit', fingerprint: [cityId, String(body.amount ?? '')] }, (): Bad | Done<'deposited'> => {
        if (life.estate.city !== cityId) return no('not_in_city', 'Your character is in another city. Go there to move naira into its market.');
        const city = cityOf(db, cityId), day = lagosTime(now()).day, existing = accountOf(city, who, false);
        const frozen = city.m.frozen.includes(who.id), today = todayOf(existing, day);
        const reserved = COMMODITY_IDS.reduce((sum, commodity) => sum + (city.books[commodity] ?? []).filter((order) => order.by === who.id && order.side === 'buy').reduce((held, order) => held + (order.held ?? 0), 0), 0);
        const refusal: Refusal | null = depositRefusal({ amount: body.amount, cash: existing?.cash ?? 0, reserved, deposited: today.deposited, frozen });
        if (refusal) return no(refusal.code, refusal.reason);
        const amount = body.amount as number;
        const paid = act(life, cityId, { op: 'deposit', amount });
        if (!paid.ok) return refuse(paid);
        const account = accountOf(city, who, true) as MarketAccountRecord;
        rollDay(account, day);
        account.cash += amount; account.deposited += amount;
        return { ok: true, code: 'deposited' };
      });
      return written(db, cityId, session, outcome, { life });
    },

    /** Move free naira from this city's market account into the caller's wallet. A frozen account may withdraw. */
    withdraw(db: Db, request: RouteRequest, cityId: CityId, body: Record<string, unknown>) {
      const session = request.requireSession(db, { renew: true }), who = ctx.publicSession(session);
      const life = ctx.settle(session, cityId);
      const outcome = ctx.once(db, session, { id: body.requestId, kind: 'market.withdraw', fingerprint: [cityId, String(body.amount ?? '')] }, (): Bad | Done<'withdrawn'> => {
        if (life.estate.city !== cityId) return no('not_in_city', 'Your character is in another city. Go there to take naira out of its market.');
        const city = cityOf(db, cityId), account = accountOf(city, who, false);
        const refusal = withdrawRefusal({ amount: body.amount, cash: account?.cash ?? 0 });
        if (refusal || !account) return no(refusal?.code ?? 'insufficient_funds', refusal?.reason ?? 'You have no naira in this market account.');
        const amount = body.amount as number;
        const paid = act(life, cityId, { op: 'withdraw', amount });
        if (!paid.ok) return refuse(paid);
        account.cash -= amount;
        return { ok: true, code: 'withdrawn' };
      });
      return written(db, cityId, session, outcome, { life });
    },

    /** Place an order. Trading does not need the character to be in the city. */
    order(db: Db, request: RouteRequest, cityId: CityId, body: Record<string, unknown>) {
      const session = request.requireSession(db, { renew: true }), who = ctx.publicSession(session);
      if (!isCommodity(body.commodity)) throw ctx.fail(400, 'invalid_commodity');
      const commodity = body.commodity, side = body.side === 'buy' || body.side === 'sell' ? body.side : null, immediate = body.now === true;
      let fills: MarketFillRecord[] = [];
      const outcome = ctx.once(db, session, { id: body.requestId, kind: 'market.order', fingerprint: [cityId, commodity, String(body.side ?? ''), String(body.price ?? ''), String(body.units ?? ''), immediate ? 'now' : 'rest'] }, (): Bad | Done => {
        if (side === null) return no('invalid_side', 'Choose buy or sell.');
        const city = cityOf(db, cityId), at = now(), book = city.books[commodity] ?? [];
        const quote = quoteOf(cityId, commodity, at, book, city.tape, city.m.salt);
        const frozen = new Set(city.m.frozen);
        const barred = new Map<string, boolean>();
        const result = submit({ accounts: city.accounts, book, tape: city.tape }, who, { commodity, side, price: body.price as number, units: body.units as number, ...(immediate ? { now: true } : {}) }, {
          now: at, quote, frozen: (id) => frozen.has(id), openOrders: openOrdersOf(city, who.id),
          barred: (a, b) => { const key = `${a}|${b}`; let found = barred.get(key); if (found === undefined) { found = blocked(a, b) || sharedDevice(db, a, b); barred.set(key, found); } return found; },
          nextId: () => String(city.m.seq = Math.min(Number.MAX_SAFE_INTEGER - 1, city.m.seq + 1)),
        });
        if (!result.ok) return no(result.code, result.reason);
        fills = result.fills;
        return { ok: true, code: result.code };
      });
      return written(db, cityId, session, outcome, { fills });
    },

    /** Take one of the caller's own orders off the book; what it held goes back into the account. */
    cancel(db: Db, request: RouteRequest, cityId: CityId, body: Record<string, unknown>) {
      const session = request.requireSession(db, { renew: true }), who = ctx.publicSession(session);
      const order = typeof body.order === 'string' ? body.order : '';
      const outcome = ctx.once(db, session, { id: body.requestId, kind: 'market.cancel', fingerprint: [cityId, order] }, (): Bad | Done<'cancelled'> => {
        const city = cityOf(db, cityId);
        for (const commodity of COMMODITY_IDS) if (cancelOrder(city.accounts, city.books[commodity] ?? [], who.id, order)) return { ok: true, code: 'cancelled' };
        return no('no_such_order', 'That order is not open any more. It may have been filled or have run out of time.');
      });
      return written(db, cityId, session, outcome, {});
    },

    /** Choose to be shown as "Anonymous trader" (or by name) on this city's tape. Setting it twice sets the same thing. */
    anon(db: Db, request: RouteRequest, cityId: CityId, body: Record<string, unknown>) {
      const session = request.requireSession(db, { renew: true }), who = ctx.publicSession(session);
      let outcome: Bad | Done<'anon' | 'named'>;
      if (typeof body.anon !== 'boolean') outcome = no('invalid_anon', 'Choose whether to trade anonymously.');
      else {
        const city = cityOf(db, cityId), account = accountOf(city, who, true) as MarketAccountRecord;
        account.anon = body.anon;
        // The tape already written follows the choice, both ways.
        for (const fill of city.tape) {
          if (fill.buyerId === who.id) fill.buyer = labelOf(account);
          if (fill.sellerId === who.id) fill.seller = labelOf(account);
        }
        outcome = { ok: true, code: body.anon ? 'anon' : 'named' };
      }
      return written(db, cityId, session, outcome, {});
    },

    // ---- the operator -----------------------------------------------------------------------------
    /** Freeze or unfreeze a trader. Returns null when the player is unknown. */
    modFreeze(db: Db, publicId: unknown, frozen: unknown): { ok: true; code: 'frozen' | 'unfrozen'; id: string } | null {
      if (typeof publicId !== 'string' || !publicId || publicId.length > 80) return null;
      if (!social.modKnows(db, publicId)) return null;
      const m = marketOf(ctx, db), index = m.frozen.indexOf(publicId);
      if (frozen === false) { if (index >= 0) m.frozen.splice(index, 1); return { ok: true, code: 'unfrozen', id: publicId }; }
      if (index < 0) m.frozen.push(publicId);
      return { ok: true, code: 'frozen', id: publicId };
    },
  };
}
