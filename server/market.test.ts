// OWNER: market — the Allworld Market on the Node host: deposits and withdrawals through the wallet, orders between two players
// and with the market maker, exactly-once, the abuse rules (band, pair cap, blocks, shared devices, freezing), what the tape
// shows, D5, and what is stored. The rules themselves are in src/game/market-model.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fixture } from './test-fixture.ts';
import { JOURNEY_TIME } from './testing/cityJourney.ts';
import { loadCityContent } from '../src/game/cities/registry.ts';
import { feeOf } from '../src/game/market-model.ts';
import { emptyMarket } from './market/service.ts';
import { MARKET_LIMITS } from '../src/game/content/market.ts';
import type { LifeState } from '../src/types/life.ts';
import type { Database } from './types.ts';

await Promise.all(['lagos', 'ibadan'].map(loadCityContent));

type Fixture = Awaited<ReturnType<typeof fixture>>;
type Device = Awaited<ReturnType<Fixture['device']>>;
type Answer = Record<string, any> & { status: number }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 86400000, HOUR = 3600000;
const object = (value: unknown): Record<string, unknown> => { assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value)); return value as Record<string, unknown>; };
const TOKEN = 'operator-token-for-market-tests-0123456789';

/** The salt the tests give the market, so that prices are the same on every run (the server makes its own at random). */
const SALT = '5eed'.repeat(16);

async function harness(t: Parameters<typeof fixture>[0], options: Parameters<typeof fixture>[1] = {}, { salted = true } = {}) {
  const f = await fixture(t, options);
  f.advance(JOURNEY_TIME - f.now());
  if (salted) await f.server.store.transact((db) => { db.market = { ...emptyMarket(), salt: SALT }; });
  const post = async (path: string, body: object, device?: Device, headers: Record<string, string> = {}): Promise<Answer> => {
    const response = await fetch(f.base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(device ? { Cookie: device.cookie } : {}), ...headers }, body: JSON.stringify(body) });
    return { ...object(await response.json()), status: response.status };
  };
  const get = async (path: string, device?: Device, headers: Record<string, string> = {}): Promise<Answer> => {
    const response = await fetch(f.base + path, { headers: { ...(device ? { Cookie: device.cookie } : {}), ...headers } });
    return { ...object(await response.json()), status: response.status };
  };
  const edit = (device: Device, change: (state: LifeState) => void, city = 'lagos') => f.server.store.transact((db) => { const state = db.sessions[device.cookie.slice(4)]?.cities[city as 'lagos']?.state; assert.ok(state); change(state); });
  /** A player in Lagos with money in the wallet and ₦30,000 earned from work. */
  async function trader(name: string): Promise<Device> {
    const device = await f.device(name);
    await f.request('/api/life?city=lagos', null, device.cookie);
    await edit(device, (state) => { state.cash = 100000; state.ledger = []; state.ledgerDays = []; state.location = 'market'; state.social.earned = 30000; });
    await f.request('/api/social/me', null, device.cookie);
    return device;
  }
  const view = (device?: Device, city = 'lagos') => get(`/api/market/view?city=${city}`, device);
  const quote = async (commodity = 'rice') => { const found = (await view()).quotes.find((item: { commodity: string }) => item.commodity === commodity); assert.ok(found); return found as { ref: number; bid: number; ask: number; band: { min: number; max: number }; change: number; bestBid?: number; bestAsk?: number; last?: number }; };
  const deposit = (device: Device, amount: number, extra: object = {}) => post('/api/market/deposit', { cityId: 'lagos', amount, requestId: f.id(), ...extra }, device);
  const withdraw = (device: Device, amount: number, extra: object = {}) => post('/api/market/withdraw', { cityId: 'lagos', amount, requestId: f.id(), ...extra }, device);
  const order = (device: Device, body: object) => post('/api/market/order', { cityId: 'lagos', commodity: 'rice', requestId: f.id(), ...body }, device);
  const cancel = (device: Device, id: string, extra: object = {}) => post('/api/market/cancel', { cityId: 'lagos', order: id, requestId: f.id(), ...extra }, device);
  const life = async (device: Device) => object((await get('/api/life?city=lagos', device)).state) as unknown as LifeState;
  const database = async (): Promise<Database> => { await f.flush(); return JSON.parse(await readFile(join(f.dir, 'devices.json'), 'utf8').catch(() => '{}')) as Database; };
  /** A trader who holds `units` rice in the market, bought from the maker. */
  async function holder(name: string, units: number): Promise<Device> {
    const device = await trader(name), rice = await quote();
    assert.equal((await deposit(device, units * rice.ask + 2000)).ok, true);
    const bought = await order(device, { side: 'buy', price: rice.band.max, units, now: true });
    assert.equal(bought.code, 'filled', bought.reason);
    return device;
  }
  const rich = async (name: string, amount = 20000) => { const device = await trader(name); assert.equal((await deposit(device, amount)).ok, true); return device; };
  return { f, post, get, edit, trader, view, quote, deposit, withdraw, order, cancel, life, database, holder, rich };
}

test('a trade between two players from deposit to withdrawal: wallets, accounts, fees, the tape and what each sees', async (t) => {
  const { f, trader, view, quote, deposit, withdraw, order, cancel, life, holder } = await harness(t);
  // Signed out: prices and an empty tape, no account.
  const open = await view();
  assert.deepEqual([open.status, open.city, open.account, open.tape, open.quotes.map((item: { commodity: string }) => item.commodity)], [200, 'lagos', null, [], ['rice', 'garri', 'beans', 'palm-oil', 'cement', 'petrol']]);
  assert.deepEqual(open.limits, MARKET_LIMITS);

  const bola = await holder('Bola', 5), ada = await trader('Ada'), chi = await trader('Chi');
  const rice = await quote();
  const asked = rice.ask;
  // Bola's purchase from the maker: at the maker's ask, the fee on top, from her market account.
  const bolaView = object((await view(bola)).account) as any;
  assert.deepEqual(bolaView.holdings, { rice: 5 });
  assert.equal(bolaView.cash, 5 * asked + 2000 - 5 * asked - feeOf(5 * asked));
  assert.deepEqual(bolaView.today.makerUnits, { rice: 5 });
  assert.equal(bolaView.today.deposited, 5 * asked + 2000);
  assert.equal((await life(bola)).cash, 100000 - (5 * asked + 2000));
  assert.deepEqual((await life(bola)).ledger.map((line) => [line.reason, line.amount]), [['Market deposit', -(5 * asked + 2000)]]);

  // Bola offers 3 bags between the maker's bid and ask; Ada takes 2 of them.
  const price = Math.floor((rice.ref + asked) / 2);
  const resting = await order(bola, { side: 'sell', price, units: 3 });
  assert.deepEqual([resting.status, resting.ok, resting.code], [200, true, 'placed']);
  assert.deepEqual(resting.account.orders.map((item: any) => [item.side, item.price, item.units, item.filled]), [['sell', price, 3, 0]]);
  assert.deepEqual(resting.account.reservedUnits, { rice: 3 });
  assert.deepEqual(resting.account.holdings, { rice: 2 });
  assert.equal((await quote()).bestAsk, price);
  assert.equal((await deposit(ada, 10000)).ok, true);
  const bought = await order(ada, { side: 'buy', price: price + 5, units: 2 });
  assert.deepEqual([bought.ok, bought.code, bought.fills.length, bought.fills[0].price, bought.fills[0].units, bought.fills[0].seller, bought.fills[0].buyer, bought.fills[0].mine], [true, 'filled', 1, price, 2, 'Bola', 'Ada', true]);
  const value = 2 * price, fee = feeOf(value);
  assert.equal(bought.account.cash, 10000 - value - fee, 'the buyer paid the resting price and the fee, and got the rest of her hold back');
  assert.deepEqual(bought.account.holdings, { rice: 2 });
  assert.deepEqual([bought.account.reservedCash, bought.account.orders], [0, []]);
  assert.deepEqual(bought.account.today, { deposited: 10000, traded: value, makerUnits: {} });
  assert.equal(Number((await quote()).last), price);

  // Bola's side: one bag left on the book, and the price less the fee in her account.
  const after = object((await view(bola)).account) as any;
  assert.deepEqual([after.orders[0].filled, after.orders[0].units, after.reservedUnits, after.holdings], [2, 3, { rice: 1 }, { rice: 2 }]);
  assert.equal(after.cash, bolaView.cash + value - fee);

  // The tape: names and labels, newest first; the buyer's own fill is marked for her and for nobody else; no ids anywhere.
  const stranger = await view(chi);
  assert.deepEqual(stranger.tape.map((fill: any) => [fill.buyer, fill.seller, fill.price, fill.units, fill.mine]), [['Ada', 'Bola', price, 2, undefined], ['Bola', 'Market maker', asked, 5, undefined]]);
  assert.deepEqual((await view(ada)).tape.map((fill: any) => fill.mine), [true, undefined]);
  assert.deepEqual((await view(bola)).tape.map((fill: any) => fill.mine), [true, true]);
  for (const reader of [undefined, chi, ada, bola]) {
    const text = JSON.stringify((await view(reader)).tape);
    for (const secret of [ada.id, bola.id, chi.id, ada.cookie.slice(4)]) assert.ok(!text.includes(secret), 'the tape never carries an id');
    assert.ok(!text.includes('"by"') && !text.includes('buyerId') && !text.includes('sellerId'));
  }
  assert.ok(!JSON.stringify(stranger).includes(bola.id), 'nor does anything else another player is sent');

  // Bola cancels what is left; the bag comes back. Ada takes her naira out. Neither wallet gained from nowhere.
  const cancelled = await cancel(bola, resting.account.orders[0].id);
  assert.deepEqual([cancelled.ok, cancelled.code, cancelled.account.orders, cancelled.account.holdings], [true, 'cancelled', [], { rice: 3 }]);
  const out = await withdraw(ada, bought.account.cash);
  assert.deepEqual([out.ok, out.code, out.account.cash], [true, 'withdrawn', 0]);
  assert.equal(out.state.cash, 100000 - 10000 + bought.account.cash);
  assert.deepEqual((await life(ada)).ledger.map((line) => [line.reason, line.amount]), [['Market deposit', -10000], ['Market withdrawal', bought.account.cash]]);
  assert.equal((await withdraw(ada, 1)).code, 'insufficient_funds');
});

test('D5: market money is not earned from work: the earned figure and every allowance stay exactly as they were', async (t) => {
  const { rich, quote, order, withdraw, life, holder, view, edit } = await harness(t);
  const bola = await holder('Bola', 5), ada = await rich('Ada');
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2);
  const before = async (device: Device) => { const state = await life(device); return { earned: state.social.earned, spent: state.business.spent, given: state.social.transfer.total, free: state.social.free, loan: state.economy.loan }; };
  const start = [await before(ada), await before(bola)];
  assert.equal((await order(bola, { side: 'sell', price, units: 5 })).code, 'placed');
  assert.equal((await order(ada, { side: 'buy', price, units: 2 })).code, 'filled');
  for (const device of [ada, bola]) { const cash = object((await view(device)).account).cash as number; assert.equal((await withdraw(device, cash)).code, 'withdrawn'); }
  assert.deepEqual([await before(ada), await before(bola)], start);
  assert.equal((await life(ada)).social.earned, 30000);
  // And the stranger who has earned nothing can trade and withdraw, but still has nothing to give away.
  await edit(ada, (state) => { state.social.earned = 0; });
  assert.equal((await life(ada)).social.earned, 0);
});

test('exactly once: a repeated request id changes nothing more, a changed one is refused, and every money route needs an id', async (t) => {
  const { f, post, deposit, withdraw, order, cancel, life, view, holder, quote, rich } = await harness(t);
  const ada = await rich('Ada', 10000);
  const id = f.id();
  const first = await deposit(ada, 3000, { requestId: id });
  const again = await deposit(ada, 3000, { requestId: id });
  assert.deepEqual([first.ok, first.duplicate, again.ok, again.duplicate, again.code], [true, undefined, true, true, 'deposited']);
  assert.equal(again.account.cash, 13000);
  assert.equal((await life(ada)).cash, 100000 - 13000, 'the wallet was charged once');
  const clash = await deposit(ada, 3100, { requestId: id });
  assert.deepEqual([clash.status, clash.error], [409, 'client_id_conflict']);
  const reused = await withdraw(ada, 3000, { requestId: id });
  assert.deepEqual([reused.status, reused.error], [409, 'client_id_conflict'], 'one id, one kind of request');
  for (const path of ['deposit', 'withdraw', 'order', 'cancel']) {
    const missing = await post(`/api/market/${path}`, { cityId: 'lagos', commodity: 'rice', side: 'buy', price: 1000, units: 1, amount: 100, order: 'x' }, ada);
    assert.equal(missing.status, 400, path);
  }
  assert.equal((await view(ada)).account.cash, 13000);

  // An order repeated with the same id is not placed twice, and a withdrawal not paid twice.
  const rice = await quote();
  const buy = { side: 'buy', price: rice.band.max, units: 2, now: true, requestId: f.id() };
  const filled = await order(ada, buy);
  const twice = await order(ada, buy);
  assert.deepEqual([filled.code, twice.duplicate, twice.code], ['filled', true, 'filled']);
  assert.deepEqual((await view(ada)).account.holdings, { rice: 2 });
  assert.equal((await order(ada, { ...buy, units: 3 })).error, 'client_id_conflict');
  const payout = { requestId: f.id() };
  assert.equal((await withdraw(ada, 500, payout)).code, 'withdrawn');
  assert.equal((await withdraw(ada, 500, payout)).duplicate, true);
  assert.equal((await life(ada)).cash, 100000 - 13000 + 500);
  const rest = await order(ada, { side: 'sell', price: rice.band.max, units: 1 });
  const cancelId = f.id();
  assert.equal((await cancel(ada, rest.account.orders[0].id, { requestId: cancelId })).code, 'cancelled');
  const repeat = await cancel(ada, rest.account.orders[0].id, { requestId: cancelId });
  assert.deepEqual([repeat.ok, repeat.duplicate], [true, true]);
  // A refusal keeps no receipt: the same id can be tried again once the rules allow it.
  const refused = await withdraw(ada, 999999, { requestId: payout.requestId });
  assert.deepEqual([refused.status, refused.error], [409, 'client_id_conflict'], 'a changed amount is still a conflict');
  const small = { requestId: f.id() };
  const tooMuch = await withdraw(ada, 70000, small);
  assert.deepEqual([tooMuch.ok, tooMuch.code], [false, 'insufficient_funds']);
  assert.equal((await withdraw(ada, 100, small)).code, 'withdrawn', 'a refusal keeps no receipt, so the id is free to be used again');
});

test('what the rules refuse answers 200 with a reason and changes nothing; malformed requests are 400', async (t) => {
  const { f, post, get, deposit, order, view, quote, rich, holder, life } = await harness(t);
  const ada = await rich('Ada', 20000), bola = await holder('Bola', 3);
  const rice = await quote();
  const snapshot = async () => JSON.stringify([(await view(ada)).account, (await life(ada)).cash, (await life(ada)).ledger]);
  const start = await snapshot();
  const cases: [object, string][] = [
    [{ side: 'buy', price: rice.band.max + 1, units: 1 }, 'outside_band'],
    [{ side: 'sell', price: rice.band.min - 1, units: 1 }, 'outside_band'],
    [{ side: 'buy', price: rice.ref, units: 0 }, 'invalid_units'],
    [{ side: 'buy', price: rice.ref, units: 51 }, 'invalid_units'],
    [{ side: 'buy', price: rice.ref, units: 1.5 }, 'invalid_units'],
    [{ side: 'buy', price: 12.5, units: 1 }, 'invalid_price'],
    [{ side: 'buy', price: 'cheap', units: 1 }, 'invalid_price'],
    [{ side: 'swap', price: rice.ref, units: 1 }, 'invalid_side'],
    [{ side: 'buy', price: rice.ref, units: 30 }, 'insufficient_cash'],
    [{ side: 'sell', price: rice.ref, units: 1 }, 'insufficient_units'],
    [{ side: 'buy', price: rice.band.min, units: 1, now: true }, 'no_match'],
  ];
  for (const [body, code] of cases) {
    const answer = await order(ada, body);
    assert.deepEqual([answer.status, answer.ok, answer.code], [200, false, code], JSON.stringify(body));
    assert.ok(typeof answer.reason === 'string' && answer.reason.length > 15, `a reason for ${code}`);
    assert.ok(answer.quotes.length === 6 && answer.account.cash === 20000, 'the answer still carries the market');
  }
  assert.equal(await snapshot(), start, 'nothing changed');
  // Ten resting orders is the most.
  for (let index = 0; index < 10; index++) assert.equal((await order(ada, { side: 'buy', price: rice.band.min, units: 1 })).ok, true, String(index));
  assert.equal((await order(ada, { side: 'buy', price: rice.band.min, units: 1 })).code, 'too_many_orders');
  assert.equal((await order(bola, { side: 'sell', price: rice.band.max, units: 1 })).ok, true);
  // Deposits: amounts and the day's limit.
  for (const amount of [0, -5, 1.5, '100', null]) assert.equal((await deposit(ada, amount as number)).code, 'invalid_amount', String(amount));
  assert.equal((await deposit(ada, 1)).code, 'deposit_limit', '₦20,000 a day, and Ada has moved that already');
  f.advance(DAY);
  assert.equal((await deposit(ada, 20001)).code, 'deposit_limit');
  assert.equal((await deposit(ada, 20000)).ok, true, 'a new day, a new allowance');
  f.advance(DAY);
  assert.equal((await deposit(ada, 20000)).code, 'account_full', 'a city’s account holds ₦50,000 at most, orders included');
  assert.equal((await deposit(ada, 9000)).ok, true);
  assert.equal((await deposit(ada, 1001)).code, 'account_full');
  // The wallet cannot be overdrawn.
  const broke = await f.device('Broke');
  await f.request('/api/life?city=lagos', null, broke.cookie);
  await f.server.store.transact((db) => { const state = db.sessions[broke.cookie.slice(4)]?.cities.lagos?.state; assert.ok(state); state.cash = 300; });
  const short = await deposit(broke, 301);
  assert.deepEqual([short.status, short.ok, short.code], [200, false, 'insufficient_funds']);
  assert.equal(short.state.cash, 300);
  // Malformed.
  assert.equal((await get('/api/market/view')).error, 'invalid_city');
  assert.equal((await get('/api/market/view?city=atlantis')).error, 'invalid_city');
  assert.equal((await get('/api/market/history?city=lagos&commodity=gold')).error, 'invalid_commodity');
  assert.equal((await get('/api/market/history?city=nowhere&commodity=rice')).error, 'invalid_city');
  assert.equal((await order(ada, { commodity: 'bitcoin', side: 'buy', price: 1, units: 1 })).error, 'invalid_commodity');
  assert.equal((await post('/api/market/order', { cityId: 'atlantis', commodity: 'rice' }, ada)).error, 'invalid_city');
  assert.equal((await post('/api/market/order', { commodity: 'rice' }, ada)).error, 'invalid_city');
  assert.equal((await post('/api/market/order', { cityId: 'lagos', commodity: 'rice', side: 'buy', price: 1, units: 1, requestId: 'x' })).status, 401, 'a session is needed to trade');
});

test('the price history is computed, seven days hourly, and the same for everyone', async (t) => {
  const { get, quote, f } = await harness(t);
  const history = await get('/api/market/history?city=lagos&commodity=petrol');
  assert.deepEqual([history.status, history.city, history.commodity, history.points.length], [200, 'lagos', 'petrol', 168]);
  const last = history.points.at(-1);
  assert.equal(last[0], Math.floor(f.now() / HOUR) * HOUR);
  assert.equal(last[1], (await quote('petrol')).ref);
  const kano = await get('/api/market/history?city=kano&commodity=petrol');
  assert.notDeepEqual(kano.points, history.points, 'cities differ');
  assert.deepEqual((await get('/api/market/history?city=lagos&commodity=petrol')).points, history.points);
});

test('the pair cap: two players cannot pass more than ₦5,000 of value in a Lagos day, and a new day brings a new allowance', async (t) => {
  const { f, order, quote, view, holder, rich } = await harness(t);
  const bola = await holder('Bola', 9), ada = await rich('Ada');
  // The lowest price that is not below the maker's bid: a seller who asks less is simply paid by the maker.
  const rice = await quote(), low = rice.bid + 1;
  assert.equal((await order(bola, { side: 'sell', price: low, units: 9 })).code, 'placed');
  // The most that fits is two bags (the third would take it past ₦5,000).
  const first = await order(ada, { side: 'buy', price: low, units: 4, now: true });
  assert.deepEqual([first.ok, first.code, first.fills.map((fill: any) => fill.units)], [true, 'partial', [Math.floor(MARKET_LIMITS.pairPerDay / low)]]);
  const moved = first.fills.reduce((sum: number, fill: any) => sum + fill.price * fill.units, 0);
  assert.ok(moved <= MARKET_LIMITS.pairPerDay && moved + low > MARKET_LIMITS.pairPerDay);
  const second = await order(ada, { side: 'buy', price: low, units: 1, now: true });
  assert.deepEqual([second.ok, second.code], [false, 'no_match']);
  // A resting buy by Ada meets Bola's resting sell only up to the cap too: nothing more is matched today.
  assert.equal((await order(ada, { side: 'buy', price: low, units: 3 })).code, 'placed');
  assert.equal(((await view(ada)).account.orders as unknown[]).length, 1);
  f.advance(DAY - HOUR);
  const fresh = await quote();
  assert.equal(fresh.bestAsk, low, 'the order is still on the book');
  const next = await order(ada, { side: 'buy', price: Math.max(low, fresh.band.min), units: 4, now: true });
  assert.equal(next.ok, true, next.reason);
  assert.deepEqual([next.ok, next.fills.reduce((sum: number, fill: any) => sum + fill.units, 0)], [true, Math.floor(MARKET_LIMITS.pairPerDay / low)], 'a new day, a new allowance');
});

test('blocks, shared devices and your own orders: the book skips them and the maker answers if it can', async (t) => {
  const { post, order, quote, view, holder, rich } = await harness(t);
  const bola = await holder('Bola', 6), ada = await rich('Ada'), chi = await rich('Chi'), dayo = await rich('Dayo');
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2);
  assert.equal((await order(bola, { side: 'sell', price, units: 6 })).code, 'placed');
  // Ada blocked Bola: Bola's order is not offered to her, either way round.
  assert.equal((await post('/api/social/block', { id: bola.id, cityId: 'lagos' }, ada)).ok, true);
  const blocked = await order(ada, { side: 'buy', price, units: 1, now: true });
  assert.deepEqual([blocked.ok, blocked.code], [false, 'no_match']);
  assert.equal((await order(bola, { side: 'buy', price: price + 1, units: 1 })).code, 'placed', 'Bola’s own buy does not meet her own sell');
  assert.deepEqual((await view(bola)).account.orders.map((item: any) => item.side).sort(), ['buy', 'sell']);
  // A device both have used.
  for (const who of [bola, chi]) assert.equal((await post('/api/growth/hello', { cityId: 'lagos', device: 'device-0000-0000-0001' }, who)).status, 200);
  assert.equal((await order(chi, { side: 'buy', price, units: 1, now: true })).code, 'no_match');
  // A stranger buys at once.
  const fine = await order(dayo, { side: 'buy', price, units: 1, now: true });
  assert.deepEqual([fine.code, fine.fills[0].seller], ['filled', 'Bola']);
  // Even a willing price above the maker's ask is met by the maker, not by a skipped player.
  const maker = await order(ada, { side: 'buy', price: rice.band.max, units: 2, now: true });
  assert.deepEqual([maker.code, maker.fills.map((fill: any) => fill.seller)], ['filled', ['Market maker']]);
});

test('the operator can freeze a trader: no new orders and no fills against their orders, but cancelling and withdrawing still work', async (t) => {
  const { f, post, get, order, cancel, withdraw, quote, view, holder, rich, database } = await harness(t, { moderatorToken: TOKEN });
  const operator = { Authorization: `Bearer ${TOKEN}` };
  const bola = await holder('Bola', 4), ada = await rich('Ada');
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2);
  const resting = await order(bola, { side: 'sell', price, units: 2 });
  assert.equal(resting.code, 'placed');
  assert.equal((await post('/api/mod/market/freeze', { publicId: bola.id, frozen: true })).status, 401, 'the operator’s token is needed');
  assert.equal((await post('/api/mod/market/freeze', { publicId: 'nobody', frozen: true }, undefined, operator)).status, 404);
  const frozen = await post('/api/mod/market/freeze', { publicId: bola.id, frozen: true, reason: 'wash trading' }, undefined, operator);
  assert.deepEqual([frozen.status, frozen.ok, frozen.code], [200, true, 'frozen']);
  assert.equal((await post('/api/mod/market/freeze', { publicId: bola.id, frozen: true }, undefined, operator)).code, 'frozen', 'freezing twice freezes once');
  assert.equal(((await database()).market?.frozen ?? []).length, 1);
  const mine = await view(bola);
  assert.equal(mine.account.frozen, true);
  assert.equal((await view(ada)).account.frozen, undefined);
  const refused = await order(bola, { side: 'sell', price, units: 1 });
  assert.deepEqual([refused.ok, refused.code], [false, 'frozen']);
  // Her resting order is not offered to others.
  assert.equal((await order(ada, { side: 'buy', price, units: 1, now: true })).code, 'no_match');
  // She can still cancel and withdraw; she cannot deposit.
  assert.equal((await cancel(bola, resting.account.orders[0].id)).code, 'cancelled');
  assert.equal((await withdraw(bola, 100)).code, 'withdrawn');
  assert.equal((await post('/api/market/deposit', { cityId: 'lagos', amount: 100, requestId: f.id() }, bola)).code, 'frozen');
  const lifted = await post('/api/mod/market/freeze', { publicId: bola.id, frozen: false }, undefined, operator);
  assert.deepEqual([lifted.ok, lifted.code], [true, 'unfrozen']);
  assert.equal((await order(bola, { side: 'sell', price, units: 1 })).code, 'placed');
  assert.deepEqual(((await database()).moderation?.audit ?? []).map((line) => line.action).filter((action) => action.startsWith('market-')), ['market-freeze', 'market-freeze', 'market-unfreeze']);
  assert.equal((await get('/api/mod/market/freeze', undefined, operator)).status, 404, 'a route that does not exist');
});

test('the anonymous choice relabels the tape, both ways, and is the only thing that changes the label', async (t) => {
  const { post, order, quote, view, holder, rich } = await harness(t);
  const bola = await holder('Bola', 4), ada = await rich('Ada');
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2);
  await order(bola, { side: 'sell', price, units: 4 });
  await order(ada, { side: 'buy', price, units: 1, now: true });
  const names = async () => ((await view()).tape as any[]).map((fill) => [fill.buyer, fill.seller]);
  assert.deepEqual(await names(), [['Ada', 'Bola'], ['Bola', 'Market maker']]);
  const hidden = await post('/api/market/anon', { cityId: 'lagos', anon: true }, ada);
  assert.deepEqual([hidden.ok, hidden.code, hidden.account.anon], [true, 'anon', true]);
  assert.deepEqual(await names(), [['Anonymous trader', 'Bola'], ['Bola', 'Market maker']]);
  await order(ada, { side: 'buy', price, units: 1, now: true });
  assert.deepEqual((await names())[0], ['Anonymous trader', 'Bola']);
  assert.deepEqual([(await post('/api/market/anon', { cityId: 'lagos', anon: true }, ada)).code, (await view(ada)).account.anon], ['anon', true]);
  assert.equal((await post('/api/market/anon', { cityId: 'lagos', anon: 'yes' }, ada)).code, 'invalid_anon');
  assert.equal((await post('/api/market/anon', { cityId: 'lagos', anon: false }, ada)).code, 'named');
  assert.deepEqual(await names(), [['Ada', 'Bola'], ['Ada', 'Bola'], ['Bola', 'Market maker']]);
  // The choice is per city.
  assert.equal((await view(ada, 'ibadan')).account.anon, false);
});

test('money moves only in the city the character is in; orders in a city need no travel', async (t) => {
  const { f, post, deposit, withdraw, order, view, trader } = await harness(t);
  const ada = await trader('Ada');
  const away = await post('/api/market/deposit', { cityId: 'ibadan', amount: 1000, requestId: f.id() }, ada);
  assert.deepEqual([away.status, away.error], [409, 'city_moved']);
  const out = await post('/api/market/withdraw', { cityId: 'ibadan', amount: 100, requestId: f.id() }, ada);
  assert.deepEqual([out.status, out.error], [409, 'city_moved']);
  assert.equal((await view(ada, 'ibadan')).account.cash, 0, 'a read from anywhere works');
  const ibadan = await post('/api/market/order', { cityId: 'ibadan', commodity: 'garri', side: 'buy', price: 600, units: 1, now: true, requestId: f.id() }, ada);
  assert.equal(ibadan.status, 200, 'it reaches the rules, which look at the money, not at where the character is');
  assert.ok(ibadan.ok === false && ['insufficient_cash', 'outside_band'].includes(ibadan.code), ibadan.code);
  // Each city has its own account.
  assert.equal((await deposit(ada, 2000)).account.cash, 2000);
  assert.equal((await view(ada, 'ibadan')).account.cash, 0);
  assert.equal((await withdraw(ada, 2000)).account.cash, 0);
});

test('resting orders run out of time: the owner sees what came back at once, and the record is cleaned by the next write', async (t) => {
  const { f, order, quote, view, deposit, holder, rich, database } = await harness(t);
  const bola = await holder('Bola', 4), ada = await rich('Ada');
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2), low = rice.band.min;
  assert.equal((await order(bola, { side: 'sell', price, units: 4 })).code, 'placed');
  const held = await order(ada, { side: 'buy', price: low, units: 3 });
  assert.equal(held.account.reservedCash > 0, true);
  assert.equal(((await database()).market?.books?.lagos?.rice ?? []).length, 2);
  f.advance(MARKET_LIMITS.orderHours * HOUR + 1);
  // A read changes nothing but already shows the account as it is.
  const stored = JSON.stringify((await database()).market);
  const seen = await view(ada);
  assert.deepEqual([seen.account.orders, seen.account.reservedCash, seen.account.cash], [[], 0, 20000]);
  assert.deepEqual((await view(bola)).account.holdings, { rice: 4 });
  assert.equal((await quote()).bestAsk, undefined);
  assert.equal(JSON.stringify((await database()).market), stored, 'a read writes nothing');
  // The next write by anyone cleans the book.
  assert.equal((await deposit(ada, 1000)).ok, true);
  const cleaned = (await database()).market;
  assert.deepEqual(cleaned?.books?.lagos?.rice, []);
  assert.equal(cleaned?.accounts?.lagos?.[ada.id]?.cash, 21000);
  assert.equal(cleaned?.accounts?.lagos?.[bola.id]?.holdings?.rice, 4);
});

test('what is stored: public ids and names only, nothing from a read, and a damaged collection is tolerated and repaired', async (t) => {
  const { f, view, get, post, deposit, order, cancel, quote, holder, rich, database } = await harness(t, {}, { salted: false });
  assert.equal((await database()).market, undefined, 'a market nobody has looked at stores nothing');
  await view();
  const first = (await database()).market;
  assert.deepEqual([first?.accounts, first?.books, first?.tape, first?.frozen, first?.seq], [{}, {}, {}, [], 0], 'the first look makes the salt and nothing else');
  assert.match(String(first?.salt), /^[0-9a-f]{64}$/);
  await view(); await get('/api/market/history?city=lagos&commodity=rice');
  assert.deepEqual((await database()).market, first, 'and every other read creates and writes nothing');
  const bola = await holder('Bola', 3), ada = await rich('Ada', 15000);
  const rice = await quote(), price = Math.floor((rice.ref + rice.ask) / 2);
  await order(bola, { side: 'sell', price, units: 3 });
  await order(ada, { side: 'buy', price, units: 1, now: true });
  const stored = JSON.stringify((await database()).market);
  for (const device of [ada, bola]) assert.ok(!stored.includes(device.cookie.slice(4)), 'the collection never holds a session secret');
  assert.ok(!stored.includes('127.0.0.1'));
  assert.deepEqual(Object.keys((await database()).market?.accounts?.lagos ?? {}).sort(), [ada.id, bola.id].sort());
  assert.deepEqual(Object.keys((await database()).market ?? {}).sort(), ['accounts', 'books', 'frozen', 'salt', 'seq', 'tape', 'v']);
  for (let index = 0; index < 4; index++) { f.advance(600000); await view(ada); await view(); }
  assert.equal(JSON.stringify((await database()).market), stored, 'looking again and again writes nothing');

  // Damage it every way a bad file could.
  await f.server.store.transact((db) => {
    const market = db.market as unknown as Record<string, any>;
    market.frozen = [5, 'real-id', null];
    market.seq = 'many';
    market.tape = { lagos: [1, 'x', null, { id: 'f1', commodity: 'rice', price: 'free', units: 1, at: 1, buyerId: '', sellerId: '', buyer: 'x', seller: 'y' }, ...market.tape.lagos] };
    market.books.lagos.rice = [null, 5, 'order', { id: 'o9', commodity: 'rice', side: 'sell', price: -3, units: 2, filled: 0, at: 1, expiresAt: 9e15, by: ada.id }, ...market.books.lagos.rice];
    market.books.lagos.garri = 'nothing';
    market.books.lagos.beans = [{ id: 'o8', commodity: 'rice', side: 'sell', price: 100, units: 2, filled: 0, at: 1, expiresAt: 9e15, by: 'ghost' }];
    market.accounts.lagos[ada.id].cash = 'lots';
    market.accounts.lagos[ada.id].pairs = 7;
    market.accounts.lagos[bola.id].holdings = { rice: -4, gold: 9, garri: 2 };
  });
  const sane = await view(ada);
  assert.equal(sane.status, 200);
  assert.equal(sane.quotes.length, 6);
  assert.deepEqual(sane.tape.map((fill: any) => fill.price), [price, rice.ask], 'only the sound fills are shown');
  assert.equal(sane.account.cash, 0, 'a damaged number reads as nothing');
  assert.equal((await view()).status, 200);
  const repaired = await deposit(ada, 1000);
  assert.equal(repaired.ok, true, repaired.reason);
  assert.deepEqual([repaired.status, repaired.ok, repaired.account.cash], [200, true, 1000]);
  const market = (await database()).market as any;
  assert.deepEqual(market.frozen, ['real-id']);
  assert.equal(Number.isSafeInteger(market.seq), true);
  assert.deepEqual(market.books.lagos.rice.map((item: any) => item.by), [bola.id]);
  assert.deepEqual(market.books.lagos.garri, []);
  assert.deepEqual(market.books.lagos.beans, []);
  assert.deepEqual(market.tape.lagos.map((fill: any) => fill.id).includes('f1'), false);
  assert.equal(market.accounts.lagos[bola.id].holdings.gold, undefined);
  const mine = (await view(bola)).account;
  assert.deepEqual([mine.holdings, mine.orders.length], [{ garri: 2 }, 1], 'a damaged holding is dropped, the sound ones stay');
  const cancelled = await cancel(bola, mine.orders[0].id);
  assert.deepEqual([cancelled.ok, cancelled.account.holdings], [true, { garri: 2, rice: 2 }], 'and the market goes on');
});

test('hostile input: huge, negative and odd values are refused without a crash, and the market has no way to mint naira', async (t) => {
  const { f, post, order, deposit, withdraw, rich, quote, view, life } = await harness(t);
  const ada = await rich('Ada');
  const rice = await quote();
  const wallet = (await life(ada)).cash, account = (await view(ada)).account.cash;
  for (const amount of [Number.MAX_SAFE_INTEGER, 2 ** 60, -100, 0.5, 'NaN', [], {}, true]) {
    assert.equal((await deposit(ada, amount as number)).ok, false);
    assert.equal((await withdraw(ada, amount as number)).ok, false);
  }
  for (const body of [{ price: 2 ** 60, units: 1 }, { price: -5, units: 1 }, { price: rice.ref, units: 2 ** 40 }, { price: rice.ref, units: -1 }, { price: [], units: {} }, { price: null, units: null }, {}]) {
    const answer = await order(ada, { side: 'sell', ...body });
    assert.equal(answer.ok, false, JSON.stringify(body));
  }
  for (const side of ['BUY', 'sell ', '', null, 7, ['buy']]) assert.equal((await order(ada, { side, price: rice.ref, units: 1 })).ok, false);
  assert.equal((await post('/api/market/cancel', { cityId: 'lagos', order: { $gt: '' }, requestId: f.id() }, ada)).code, 'no_such_order');
  assert.equal((await post('/api/market/cancel', { cityId: 'lagos', requestId: f.id() }, ada)).code, 'no_such_order');
  assert.equal((await life(ada)).cash, wallet);
  assert.equal((await view(ada)).account.cash, account);
  // A player cannot run the life's half themselves.
  const direct = await f.action(ada.cookie, { type: 'market.server', payload: { op: 'withdraw', amount: 50000 } });
  assert.equal(direct.code, 'server_only');
  assert.equal((await life(ada)).cash, wallet);
});
