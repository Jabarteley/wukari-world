import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the economy dashboard of a city (docs/NEIGHBOURHOOD.md): the rich list (its opt-out holds), median prices from the Market's trades,
// the treasury and what came in this week, and game naira in circulation, from existing records only; as JSON and as a public page on /economy/<city>.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { economyView, median } from './economy/dashboard.ts';
import { quoteOf } from '../src/game/market-model.ts';
import type { MarketCollection } from '../src/types/market.ts';
import type { CivicCollection, PoliticsCollection } from './types.ts';
import { lagosTime } from '../src/game/clock.ts';
import { cityOf, emptyCivic } from './civic/data.ts';

type Json = Record<string, any>;
const SALT = 'a'.repeat(64);
async function setup(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t, {});
  const send = async (path: string, body: unknown, who?: Device): Promise<Json> => { const res = await fetch(f.base + path, { method: body === null ? 'GET' : 'POST', headers: { Origin: f.base, ...(body === null ? {} : { 'Content-Type': 'application/json' }), ...(who ? { Cookie: who.cookie } : {}) }, ...(body === null ? {} : { body: JSON.stringify(body) }) }); return { status: res.status, ...((await res.json()) as Json) }; };
  const get = (path: string, who?: Device) => send(path, null, who), post = (path: string, body: unknown, who?: Device) => send(path, body, who);
  /** A player who has opened the civic pulse once, so the city knows them as a resident with their cash. */
  async function resident(name: string): Promise<Device> {
    const who = await f.device(name);
    await f.request('/api/life?city=lagos', null, who.cookie);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await get('/api/civic/richlist?city=lagos', who);
    return who;
  }
  return { f, get, post, resident };
}

test('economy: the median is the middle price, and the mean of the two middle ones', () => {
  assert.equal(median([]), 0);
  assert.equal(median([900, 100, 500]), 500);
  assert.equal(median([1000, 1200, 1400, 3000]), 1300);
});

test('economy: the rich list, wallets and the opt-out; a total never says what one person who left the list holds', async (t) => {
  const { f, get, post, resident } = await setup(t);
  const empty = await get('/api/economy?city=lagos');
  assert.deepEqual([empty.ok, empty.cityName, empty.circulation.total, empty.rich.balances], [true, 'Lagos', 0, []]);
  const ada = await resident('Ada');
  await post('/api/civic/prefs', { richList: false }, ada);
  const alone = await get('/api/economy?city=lagos');
  assert.deepEqual([alone.rich.balances, alone.circulation.wallets, alone.circulation.players], [[], 0, 1], 'one player who left the list: not named, not in the total');
  await post('/api/civic/prefs', { richList: true }, ada);
  const more = [await resident('Bola'), await resident('Chidi'), await resident('Dayo'), await resident('Efe')];
  const five = await get('/api/economy?city=lagos');
  assert.deepEqual(five.rich.balances.map((r: Json) => r.name).sort(), ['Ada', 'Bola', 'Chidi', 'Dayo', 'Efe'], 'equal balances rank by id');
  assert.deepEqual(five.rich.balances.map((r: Json) => [r.rank, r.amount]), [1, 2, 3, 4, 5].map((i) => [i, 5000]));
  assert.equal(five.circulation.wallets, 25000);
  assert.equal(JSON.stringify(five).includes(ada.id), false, 'no id anywhere');
  await post('/api/civic/prefs', { richList: false }, more[0]!);
  const left = await get('/api/economy?city=lagos');
  assert.deepEqual(left.rich.balances.map((r: Json) => r.name).sort(), ['Ada', 'Chidi', 'Dayo', 'Efe'], 'gone from the list');
  assert.equal(left.circulation.wallets, 25000, 'five players or more: the total is nobody\'s balance');
  assert.equal(left.circulation.players, 5);
  assert.equal((await get('/api/economy?city=atlantis')).status, 400);
  void f;
});

test('economy: median prices from the day\'s trades, the reference while fewer than three traded; Market accounts count as circulation', async (t) => {
  const { f, get } = await setup(t);
  assert.deepEqual((await get('/api/economy?city=lagos')).prices, [], 'the market has not opened');
  const now = f.now();
  await f.server.store.transact((db) => {
    const fill = (commodity: string, price: number, at: number) => ({ id: `f${price}${at}`, commodity, price, units: 1, at, buyerId: '', sellerId: '', buyer: 'x', seller: 'y' });
    ;(db as Record<string, unknown>).market = { v: 1, salt: SALT, seq: 0, frozen: [], books: {}, accounts: { lagos: { p1: { cash: 4000 }, p2: { cash: 1500 } } },
      tape: { lagos: [fill('rice', 1000, now - 60000), fill('rice', 1200, now - 50000), fill('rice', 1400, now - 40000), fill('rice', 3000, now - 30000), fill('rice', 9999, now - 3 * 86400000), fill('garri', 700, now - 1000), fill('garri', 800, now - 900)] } } as unknown as MarketCollection;
  });
  const view = await get('/api/economy?city=lagos');
  const price = (id: string): Json => view.prices.find((p: Json) => p.commodity === id);
  assert.deepEqual([price('rice').median, price('rice').trades, price('rice').source], [1300, 4, 'trades'], 'a trade older than a day does not count');
  const ref = quoteOf('lagos', 'garri', now, [], [], SALT).ref;
  assert.deepEqual([price('garri').median, price('garri').reference, price('garri').source, price('garri').trades], [ref, ref, 'reference', 2], 'two trades: not enough to call a median');
  assert.equal(view.prices.length, 6);
  assert.equal(view.circulation.market, 5500);
  assert.equal(view.circulation.total, 5500);
});

test('economy: the treasury, this week\'s levies and fees against what was paid out, and the term\'s accounts', async (t) => {
  const { f, get } = await setup(t);
  const now = f.now(), DAY = 86400000;
  const none = await get('/api/economy?city=lagos');
  assert.deepEqual([none.government.governor, none.government.treasury, none.government.taxWeek, none.government.term], [null, 0, 0, null]);
  await f.server.store.transact((db) => {
    (db as Record<string, unknown>).politics = { v: 1, seq: 0, parties: {}, members: {}, scopes: { 'city:lagos': { treasury: { balance: 4200, ledger: [
      { at: now - 2 * DAY, kind: 'levy', amount: 300, note: 'Market levy' }, { at: now - 1 * DAY, kind: 'levy', amount: 200, note: 'Market levy' }, { at: now - 20 * DAY, kind: 'levy', amount: 900, note: 'old' },
      { at: now - 3 * DAY, kind: 'fee', amount: 50, note: 'Filing fee' }, { at: now - 3 * DAY, kind: 'bail', amount: 25, note: 'Bail' },
      { at: now - 1 * DAY, kind: 'salary', amount: -100, note: 'Salary' }, { at: now - 1 * DAY, kind: 'grant', amount: -40, note: 'Grant' }] },
      term: { week: 0, income: 575, salary: 100, granted: 40 } } } } as unknown as PoliticsCollection;
  });
  const view = await get('/api/economy?city=lagos');
  assert.deepEqual([view.government.treasury, view.government.taxWeek, view.government.feesWeek, view.government.spentWeek], [4200, 500, 75, 140], 'only the last seven days');
  assert.deepEqual(view.government.term, { income: 575, salary: 100, granted: 40 });
  assert.equal(view.circulation.treasury, 4200);
  assert.equal(view.government.title, 'Chairman');
  assert.equal(view.government.governor, null, 'no one won the election');
  // A winner of the city's ballot (five votes, over the quorum) sits as the Governor for the term: the dashboard names them.
  const week = Math.floor((lagosTime(now).day - 3) / 7);
  await f.server.store.transact((db) => {
    const civic = f.server.context.collection(db, 'civic', emptyCivic()) as unknown as CivicCollection;
    cityOf(civic, 'lagos').gov = { elections: { [week]: { candidates: { g1: { name: 'Ada Obi', slogan: 'Light', at: 1 } }, votes: Object.fromEntries(['v1', 'v2', 'v3', 'v4', 'v5'].map((v) => [v, 'g1'])) } }, announcements: [] };
  });
  assert.equal((await get('/api/economy?city=lagos')).government.governor, 'Ada Obi');
  void economyView;
});

test('economy: the public page is plain HTML with its preview tags, no script and no cookie; an unknown city is a 404 page', async (t) => {
  const { f, resident } = await setup(t);
  await resident('Ada');
  const res = await fetch(f.base + '/economy/lagos'), html = await res.text();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /^text\/html/);
  assert.equal(res.headers.get('set-cookie'), null);
  assert.match(html, /<title>The economy of Lagos · Allworld<\/title>/);
  assert.match(html, /og:title/);
  assert.match(html, /never real money/);
  assert.match(html, /Ada/);
  assert.doesNotMatch(html, /<script/i);
  assert.equal((await fetch(f.base + '/economy/atlantis')).status, 404);
  assert.equal((await fetch(f.base + '/economy/')).status, 404);
});
