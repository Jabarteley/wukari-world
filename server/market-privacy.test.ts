// OWNER: market — what an account's export carries of the market and what deleting the account takes out of it (server/market/privacy.ts),
// through the real account routes, and the same hooks on damaged data. The rules are in src/game/market-model.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { fakeProvider, makeKey, claimsFor, signToken } from './accounts/test-tokens.ts';
import { JOURNEY_TIME } from './testing/cityJourney.ts';
import { loadCityContent } from '../src/game/cities/registry.ts';
import { eraseMarket, exportMarket, FORMER_TRADER } from './market/privacy.ts';
import type { LifeState } from '../src/types/life.ts';
import type { Database } from './types.ts';

await Promise.all(['lagos'].map(loadCityContent));

const PROJECT = 'allworld-test-project';
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

async function setup(t: Parameters<typeof fixture>[0]) {
  const key = await makeKey('market-privacy-key'), provider = fakeProvider([key]);
  const f = await fixture(t, { env: { ACCOUNTS_FIREBASE_PROJECT_ID: PROJECT, ACCOUNTS_FIREBASE_API_KEY: 'test-web-api-key-0000000000000000000000', NEW_SESSIONS_PER_ADDRESS: '1000' }, fetch: (url, init) => provider.fetch(url, init as { body?: unknown }) });
  f.advance(JOURNEY_TIME - f.now());
  const call = async (path: string, body?: unknown, cookie?: string): Promise<Json> => {
    const res = await fetch(f.base + path, { method: body ? 'POST' : 'GET', headers: { Origin: f.base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, ...(await res.json() as object) };
  };
  let minted = 0;
  const token = (address: string) => signToken(key, claimsFor(PROJECT, f.now(), { subject: `Uid${address.replace(/\W/g, '')}`, email: address, n: ++minted }));
  async function trader(name: string, address?: string) {
    let device = await f.device(name);
    await f.request('/api/life?city=lagos', null, device.cookie);
    await f.server.store.transact((db) => { const state = db.sessions[device.cookie.slice(4)]?.cities.lagos?.state as LifeState | undefined; assert.ok(state); state.cash = 100000; state.location = 'market'; });
    if (address) {
      const { csrf } = await call('/api/account', undefined, device.cookie);
      const res = await fetch(f.base + '/api/account/sign-in', { method: 'POST', headers: { Origin: f.base, 'Content-Type': 'application/json', Cookie: device.cookie }, body: JSON.stringify({ idToken: await token(address), csrf }) });
      assert.equal(res.status, 200);
      device = { ...device, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] ?? device.cookie };
    }
    return device;
  }
  const post = (path: string, device: { cookie: string }, body: object) => call(path, { cityId: 'lagos', requestId: f.id(), ...body }, device.cookie);
  const database = async (): Promise<Database> => { await f.flush(); return JSON.parse(await (await import('node:fs/promises')).readFile((await import('node:path')).join(f.dir, 'devices.json'), 'utf8')) as Database; };
  return { f, call, token, trader, post, database };
}

test('an account export carries the market: accounts, open orders and the player’s own fills, and nobody else’s', async (t) => {
  const s = await setup(t);
  const ada = await s.trader('Ada', 'ada@example.com'), bola = await s.trader('Bola');
  const rice = (await s.call('/api/market/view?city=lagos')).quotes.find((item: Json) => item.commodity === 'rice');
  for (const who of [ada, bola]) assert.equal((await s.post('/api/market/deposit', who, { amount: 15000 })).ok, true);
  assert.equal((await s.post('/api/market/order', bola, { commodity: 'rice', side: 'buy', price: rice.band.max, units: 3, now: true })).code, 'filled');
  const price = Math.floor((rice.ref + rice.ask) / 2);
  assert.equal((await s.post('/api/market/order', bola, { commodity: 'rice', side: 'sell', price, units: 2 })).code, 'placed');
  assert.equal((await s.post('/api/market/order', ada, { commodity: 'rice', side: 'buy', price, units: 1 })).code, 'filled');
  assert.equal((await s.post('/api/market/order', ada, { commodity: 'garri', side: 'buy', price: 1, units: 1 })).code, 'outside_band');
  const low = (await s.call('/api/market/view?city=lagos')).quotes.find((item: Json) => item.commodity === 'garri').band.min;
  assert.equal((await s.post('/api/market/order', ada, { commodity: 'garri', side: 'buy', price: low, units: 2 })).code, 'placed');
  const csrf = (await s.call('/api/account', undefined, ada.cookie)).csrf;
  const exported = await s.call('/api/account/export', { idToken: await s.token('ada@example.com'), csrf }, ada.cookie);
  assert.equal(exported.status, 200);
  assert.deepEqual(exported.market.accounts.map((item: Json) => [item.city, item.holdings, item.name]), [['lagos', { rice: 1 }, 'Ada']]);
  assert.deepEqual(exported.market.orders.map((item: Json) => [item.city, item.commodity, item.side, item.price, item.units]), [['lagos', 'garri', 'buy', low, 2]]);
  assert.deepEqual(exported.market.fills.map((item: Json) => [item.side, item.commodity, item.price, item.units, item.otherSide]), [['buy', 'rice', price, 1, 'Bola']]);
  const text = JSON.stringify(exported.market);
  assert.ok(!text.includes(bola.id) && !text.includes('"salt"'), 'nothing of the other player, and never the salt');
  assert.ok(!JSON.stringify(exported).includes((await s.database()).market?.salt ?? 'no salt'));
});

test('deleting an account takes the market with it: accounts, orders and ids; the tape keeps price and units as "Former trader"', async (t) => {
  const s = await setup(t);
  const ada = await s.trader('Ada', 'ada@example.com'), bola = await s.trader('Bola');
  const rice = (await s.call('/api/market/view?city=lagos')).quotes.find((item: Json) => item.commodity === 'rice');
  for (const who of [ada, bola]) assert.equal((await s.post('/api/market/deposit', who, { amount: 15000 })).ok, true);
  assert.equal((await s.post('/api/market/order', bola, { commodity: 'rice', side: 'buy', price: rice.band.max, units: 3, now: true })).code, 'filled');
  const price = Math.floor((rice.ref + rice.ask) / 2);
  await s.post('/api/market/order', bola, { commodity: 'rice', side: 'sell', price, units: 2 });
  await s.post('/api/market/order', ada, { commodity: 'rice', side: 'buy', price, units: 1 });
  await s.post('/api/market/order', ada, { commodity: 'garri', side: 'buy', price: (await s.call('/api/market/view?city=lagos')).quotes.find((item: Json) => item.commodity === 'garri').band.min, units: 2 });
  await s.post('/api/market/anon', ada, { anon: true });
  const before = await s.database();
  assert.equal(before.market?.accounts?.lagos?.[bola.id]?.pairs?.[ada.id] !== undefined, true, 'Bola’s counters name Ada today');
  const csrf = (await s.call('/api/account', undefined, ada.cookie)).csrf;
  const gone = await s.call('/api/account/delete', { idToken: await s.token('ada@example.com'), csrf, confirm: 'delete', erase: true }, ada.cookie);
  assert.equal(gone.status, 200, JSON.stringify(gone));
  const after = await s.database(), market = after.market;
  assert.ok(market);
  assert.deepEqual(Object.keys(market.accounts.lagos ?? {}), [bola.id], 'Ada’s account is gone');
  assert.deepEqual((market.books.lagos?.garri ?? []).length, 0, 'her resting order is gone');
  assert.deepEqual((market.books.lagos?.rice ?? []).map((order) => order.by), [bola.id], 'Bola’s order stands');
  assert.equal(market.accounts.lagos?.[bola.id]?.pairs?.[ada.id], undefined, 'Bola’s counters no longer name her');
  assert.ok(!JSON.stringify(market).includes(ada.id), 'her public id is nowhere in the market');
  const fill = market.tape.lagos?.find((item) => item.units === 1 && item.price === price);
  assert.ok(fill);
  assert.deepEqual([fill.buyer, fill.buyerId, fill.seller, fill.sellerId], [FORMER_TRADER, '', 'Bola', bola.id], 'price and units stay; the buyer is no one');
  // Everyone else sees the same fill, relabelled; Bola's own fills are still hers.
  const seen = await s.call('/api/market/view?city=lagos', undefined, bola.cookie);
  assert.deepEqual(seen.tape.map((item: Json) => [item.buyer, item.seller, item.mine]), [[FORMER_TRADER, 'Bola', true], ['Bola', 'Market maker', true]]);
  assert.ok(typeof market.salt === 'string' && market.salt.length === 64, 'the salt is the market’s, not a player’s: it stays');
});

test('deleting an account but keeping the character (erase: false) also clears the market data, and a second city too', async (t) => {
  const s = await setup(t);
  const ada = await s.trader('Ada', 'ada@example.com');
  assert.equal((await s.post('/api/market/deposit', ada, { amount: 5000 })).ok, true);
  assert.equal((await s.call('/api/market/anon', { cityId: 'ibadan', anon: true }, ada.cookie)).code, 'anon');
  assert.ok((await s.database()).market?.accounts?.ibadan?.[ada.id]);
  const csrf = (await s.call('/api/account', undefined, ada.cookie)).csrf;
  assert.equal((await s.call('/api/account/delete', { idToken: await s.token('ada@example.com'), csrf, confirm: 'delete', erase: false }, ada.cookie)).status, 200);
  const market = (await s.database()).market;
  assert.deepEqual([Object.keys(market?.accounts?.lagos ?? {}), Object.keys(market?.accounts?.ibadan ?? {})], [[], []]);
});

test('the privacy hooks tolerate a damaged collection and an absent one', () => {
  const ids = ['gone'];
  for (const market of [undefined, null, 5, 'x', [], { accounts: 7, books: 'x', tape: null, frozen: 'x' }, { accounts: { lagos: 4, kano: { gone: 1, other: 7, third: { pairs: 5 } } }, books: { lagos: { rice: 'x', garri: [null, 3, { by: 'gone' }, { by: 'stay' }] } }, tape: { lagos: [1, null, { buyerId: 'gone', buyer: 'G', sellerId: 'x', seller: 'S' }] }, frozen: [1, 'gone', 'stay'] }]) {
    const db = { market } as unknown as Database;
    assert.doesNotThrow(() => eraseMarket(db, ids));
    assert.doesNotThrow(() => exportMarket(db, ids));
  }
  const db = { market: { accounts: { kano: { gone: { cash: 1 }, other: { pairs: { gone: 4, keep: 2 } } } }, books: { lagos: { garri: [{ by: 'gone' }, { by: 'stay' }] } }, tape: { lagos: [{ buyerId: 'gone', buyer: 'G', sellerId: 'x', seller: 'S' }] }, frozen: ['gone', 'stay'] } } as unknown as Database;
  eraseMarket(db, ids);
  assert.deepEqual(db.market, { accounts: { kano: { other: { pairs: { keep: 2 } } } }, books: { lagos: { garri: [{ by: 'stay' }] } }, tape: { lagos: [{ buyerId: '', buyer: FORMER_TRADER, sellerId: 'x', seller: 'S' }] }, frozen: ['stay'] });
  eraseMarket(db, []);
  eraseMarket(db, ['']);
  assert.equal(JSON.stringify(db.market).includes('stay'), true);
});
