import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — Allworld for Business (docs/PROMOTE.md): free listings reviewed before they are live, boosts paid to Allworld through a
// verified checkout (or a bank transfer an admin confirms), Sponsored cards in the city feed, the admin's revenue view, and erasure.
import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { claimsFor, fakeProvider, makeKey, signToken } from './accounts/test-tokens.ts';
import { promoteService, forgetPromotePlayers } from './promote/service.ts';

const PROJECT = 'allworld-test-project', FOUNDER = 'founder.test@example.com';
type Json = Record<string, any>;
const emailHash = (e: string): string => createHash('sha256').update(e.trim().toLowerCase()).digest('hex');
async function setup(t: TestContext, { bachs = false }: { bachs?: boolean } = {}) {
  const key = await makeKey('key-1'), provider = fakeProvider([key]);
  const paid = new Map<string, string>(), sessions = new Map<string, string>();
  const fetcher = async (url: string, init?: { body?: unknown; headers?: Record<string, string> }) => {
    if (url.startsWith('https://sandbox-api.bachs.io/')) {
      assert.equal(init?.headers?.Authorization, 'Bearer sk_sandbox_abcdefghijklmnop', 'the secret goes only to Bachs');
      const path = url.slice('https://sandbox-api.bachs.io'.length);
      if (path === '/v1/checkout-sessions') { const b = JSON.parse(String(init?.body)); assert.equal(init?.headers?.['Idempotency-Key'], b.reference); paid.set(b.reference, b.pricing.amount); sessions.set(`chk_${b.reference.replace(/-/g, '')}`, b.reference); return new Response(JSON.stringify({ checkout_id: `chk_${b.reference.replace(/-/g, '')}`, checkout_url: `https://checkout.bachs.io/c/${b.reference}`, status: 'open', reference: b.reference }), { status: 201 }); }
      const chk = /^\/v1\/checkout-sessions\/(chk_\w+)$/.exec(path);
      if (chk) { const ref = sessions.get(chk[1]!)!; return new Response(JSON.stringify({ checkout_id: chk[1], reference: ref, amount: paid.get(ref), currency: 'NGN', status: 'completed', charge: { payment_id: `pay_${chk[1]}` } }), { status: 200 }); }
      const pay = /^\/v1\/payments\/pay_(chk_\w+)$/.exec(path);
      if (pay) { const ref = sessions.get(pay[1]!)!; return new Response(JSON.stringify({ payment_id: `pay_${pay[1]}`, checkout_id: pay[1], reference: ref, amount: paid.get(ref), currency: 'NGN', status: 'succeeded' }), { status: 200 }); }
      return new Response('{}', { status: 404 });
    }
    return provider.fetch(url, init as { body?: unknown });
  };
  const f = await fixture(t, { env: { ACCOUNTS_FIREBASE_PROJECT_ID: PROJECT, ACCOUNTS_FIREBASE_API_KEY: 'test-web-api-key-0000000000000000000000', FOUNDER_EMAIL_SHA256: emailHash(FOUNDER), NEW_SESSIONS_PER_ADDRESS: '1000', ...(bachs ? { BACHS_API_KEY: 'sk_sandbox_abcdefghijklmnop' } : {}) }, fetch: fetcher as never });
  const call = async (path: string, body?: unknown, cookie?: string): Promise<Json> => { const res = await fetch(f.base + path, { method: body ? 'POST' : 'GET', headers: { Origin: f.base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: res.status, ...(await res.json() as object) }; };
  let minted = 0;
  async function account(address: string, name: string, adult = true): Promise<Device> {
    const d = await f.device(name); await f.request('/api/life?city=lagos', null, d.cookie);
    const { csrf } = await call('/api/account', undefined, d.cookie);
    const res = await fetch(f.base + '/api/account/sign-in', { method: 'POST', headers: { Origin: f.base, 'Content-Type': 'application/json', Cookie: d.cookie }, body: JSON.stringify({ idToken: await signToken(key, claimsFor(PROJECT, f.now(), { subject: `Uid${address.replace(/\W/g, '')}`, email: address, n: ++minted })), csrf }) });
    assert.equal(res.status, 200);
    const out = { ...d, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] ?? d.cookie };
    await call('/api/growth/hello', { cityId: 'lagos' }, out.cookie);
    await call('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, out.cookie);
    await call('/api/social/me', undefined, out.cookie);
    return out;
  }
  const founder = await account(FOUNDER, 'Founder');
  const ctx = f.server.context, promote = promoteService(ctx);
  const approve = (id: string) => f.server.store.transact((db) => promote.reviewed(db, id, { action: 'keep', category: 'ok', reason: '' }));
  return { f, call, account, founder, promote, approve, paid };
}

test('business: a free listing is reviewed before it is live; refused words say why; guests and minors cannot list', async (t) => {
  const { f, call, account, promote, approve } = await setup(t);
  const guest = await f.device('Visitor'); await f.request('/api/life?city=lagos', null, guest.cookie);
  assert.equal((await call('/api/promote/listings', { name: 'Iya Basira Foods', category: 'food' }, guest.cookie)).code, 'account_required');
  const kid = await account('kid@example.com', 'Kid', false);
  assert.equal((await call('/api/promote/listings', { name: 'Kid Shop', category: 'shops' }, kid.cookie)).code, 'adults_only');
  const ada = await account('ada@example.com', 'Ada');
  assert.equal((await call('/api/promote/listings', { name: 'Iya Basira', category: 'food', about: 'Call 08031234567' }, ada.cookie)).code, 'contact_not_allowed');
  const made = await call('/api/promote/listings', { name: 'Iya Basira Foods', category: 'food', area: 'Yaba', about: 'Amala and ewedu, delivery around Yaba' }, ada.cookie);
  assert.equal(made.listing.status, 'review');
  assert.equal((await call('/api/promote/directory?city=lagos')).listings.length, 0, 'not live before review');
  await approve(made.listing.id);
  const dir = await call('/api/promote/directory?city=lagos');
  assert.deepEqual(dir.listings.map((l: Json) => l.name), ['Iya Basira Foods']);
  const loan = await call('/api/promote/listings', { name: 'Quick Loans', category: 'services' }, ada.cookie);
  await f.server.store.transact((db) => promote.reviewed(db, loan.listing.id, { action: 'remove', category: 'scam', reason: 'Loans cannot be advertised.' }));
  const mine = await call('/api/promote/me', undefined, ada.cookie);
  assert.equal(mine.listings.find((l: Json) => l.id === loan.listing.id).reason, 'Loans cannot be advertised.');
  assert.equal(mine.payment, 'closed');
  assert.equal((await call('/api/promote/order', { listing: made.listing.id, tier: 'boost', weeks: 1 }, ada.cookie)).code, 'payments_closed');
});

test('business: a boost is paid through a checkout Allworld verifies itself, then shows as Sponsored in the city feed; admin sees revenue', async (t) => {
  const { call, account, founder, approve } = await setup(t, { bachs: true });
  const ada = await account('ada@example.com', 'Ada'), bola = await account('bola@example.com', 'Bola');
  const made = await call('/api/promote/listings', { name: 'Ada Tailoring', category: 'fashion', area: 'Surulere' }, ada.cookie);
  await approve(made.listing.id);
  assert.equal((await call('/api/promote/order', { listing: made.listing.id, tier: 'boost', weeks: 2 }, ada.cookie)).code, 'invalid_email');
  const order = await call('/api/promote/order', { listing: made.listing.id, tier: 'boost', weeks: 2, email: 'ada@example.com' }, ada.cookie);
  assert.equal(order.order.amount, 5000);
  assert.match(order.pay, /^https:\/\/checkout\.bachs\.io\//);
  assert.equal((await call('/api/promote/order/verify', { ref: order.order.ref }, bola.cookie)).code, 'unknown_order', 'only the buyer checks their order');
  const paid = await call('/api/promote/order/verify', { ref: order.order.ref }, ada.cookie);
  assert.equal(paid.order.status, 'paid');
  assert.equal((await call('/api/promote/order/verify', { ref: order.order.ref }, ada.cookie)).order.status, 'paid', 'checking again after it started still says paid');
  const page = await call('/api/feed/list?tab=city&city=lagos', undefined, bola.cookie);
  assert.deepEqual(page.sponsored.map((s: Json) => s.name), ['Ada Tailoring']);
  assert.equal((await call('/api/feed/list?tab=world', undefined, bola.cookie)).sponsored.length, 0, 'a Boost is not in the World tab');
  assert.equal((await call('/api/promote/directory?city=lagos')).listings[0].boosted, true);
  const admin = await call('/api/admin/promote', undefined, founder.cookie);
  assert.equal(admin.revenue.all, 5000);
  assert.equal(admin.orders[0].status, 'paid');
  // Removing the listing ends the boost.
  assert.equal((await call('/api/admin/promote/act', { listing: made.listing.id, action: 'remove', note: 'test' }, founder.cookie)).ok, true);
  assert.equal((await call('/api/feed/list?tab=city&city=lagos', undefined, bola.cookie)).sponsored.length, 0);
});

test('business: erasure takes listings and pending orders; a paid order stays as a sale without the person', async (t) => {
  const { f, call, account, approve } = await setup(t, { bachs: true });
  const ada = await account('ada@example.com', 'Ada');
  const made = await call('/api/promote/listings', { name: 'Ada Phones', category: 'tech' }, ada.cookie);
  await approve(made.listing.id);
  const o = await call('/api/promote/order', { listing: made.listing.id, tier: 'spotlight', weeks: 1, email: 'ada@example.com' }, ada.cookie);
  await call('/api/promote/order/verify', { ref: o.order.ref }, ada.cookie);
  await call('/api/promote/order', { listing: made.listing.id, tier: 'boost', weeks: 1, email: 'ada@example.com' }, ada.cookie);
  await f.server.store.transact((db) => forgetPromotePlayers(db, new Set([ada.id])));
  const stored = await f.server.store.read((db) => JSON.stringify((db as Record<string, unknown>).promote));
  assert.equal(stored.includes(ada.id), false);
  assert.equal(stored.includes('ada@example.com'), false);
  assert.match(stored, /"status":"paid"/);
});
