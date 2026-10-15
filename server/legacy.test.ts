// OWNER: world — passing property on (docs/LEGACY.md): the move itself (every kind moves exactly once, nothing lost or duplicated), the
// refusals, and the routes: an heir at once, a friend through an offer, a repeated request, a refusal, a giver whose life changed, an
// interrupted transaction and old data. The sign-in provider is a stand-in (server/accounts/test-tokens.ts).
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { claimsFor, fakeProvider, makeKey, signToken } from './accounts/test-tokens.ts';
import { createLife } from '../src/life.ts';
import { loadCityContent } from '../src/game/cities/registry.ts';
import { NPCS } from '../src/game/cities/lagos/regulars.ts';
import { CAR_ORDER } from '../src/game/content/cars.ts';
import { FURNITURE } from '../src/game/content/furniture.ts';
import { newShop } from '../src/game/business-model.ts';
import { DEFAULT_STYLE, packStyle } from '../src/game/content/world.ts';
import { LEGACY, apply, describe, emptyManifest, furnitureOf, offerOf, partition, readManifest, sideOf, useFaultForTests, verify, worthOf } from './legacy/move.ts';
import type { Include } from './legacy/move.ts';
import { eraseLegacy, exportLegacy } from './legacy/privacy.ts';
import { peekLegacy } from './legacy/data.ts';
import type { LegacyCollection } from './legacy/data.ts';
import type { BusinessCollection, ShopRecord } from '../src/types/business.ts';
import type { LifeState } from '../src/types/life.ts';
import type { Db, SessionRecord } from './types.ts';

const DAY = 86400000;
await loadCityContent('lagos');
const [N1, N2, N3] = Object.keys(NPCS) as [string, string, string];
const ALL: Include = { houses: true, cars: true, shop: true, furniture: true, belongings: true, goodwill: true, titles: true };
const CAR_A = CAR_ORDER[0]!, CAR_B = CAR_ORDER[1]!;
// Two pieces the free starter room does not hold (it has a spring bed, a stool, a stove, a cooler, lamps ...), so counts are exact.
const SOFA = 'sleeping-mat', BED = 'king-bed';
assert.ok(FURNITURE[SOFA] && FURNITURE[BED]);

// ---- the move, on bare lives ----------------------------------------------------------------------------------------------------

const life = (name: string): LifeState => createLife({ name }, { now: 1000, cityId: 'lagos', isNew: true, salt: '0123456789abcdef' });
const holder = (id: string, state: LifeState) => ({ publicId: id, name: state.name, cities: { lagos: { state, updatedAt: 1000, salt: '0123456789abcdef' } }, character: { v: 2 as const, city: 'lagos' } });
const shopFor = (id: string, name: string): ShopRecord => newShop({ by: { id, name }, city: 'lagos', venue: 'yaba-market', type: 'food', name: 'Mama Put', colour: '#ffffff', icon: '🍲' }, 1000);
const business = (shops: Record<string, ShopRecord>): BusinessCollection => ({ v: 1, shops, reports: [], seq: 0 });
/** A giver rich in everything that can pass. */
function richGiver(): LifeState {
  const s = life('Giver');
  s.estate.tier = 'bungalow'; s.estate.style = { ...DEFAULT_STYLE, wall: 1 };
  s.property.cars = [CAR_A, CAR_B]; s.property.car = CAR_B;
  s.home.storage = { [SOFA]: 3 }; s.home.overflow = { [BED]: 1 };
  s.inventory = { zobo: 5, garri: 2 };
  s.social.rel = { [N1]: { p: 60, d: 1, n: 0, npc: true, at: 5 }, [N2]: { p: 10, d: 1, n: 0, npc: true, at: 5 }, [N3]: { p: 80, d: 1, n: 0, npc: true, at: 5, npcSnapshot: { city: 'lagos', name: 'Ada', emoji: 'x', role: 'y' } } };
  s.missions.titles = ['settled', 'lagosian', 'week-finisher'];
  return s;
}
const totals = (g: LifeState, r: LifeState) => ({
  cars: [...g.property.cars, ...r.property.cars].sort(), sofas: (g.home.storage[SOFA] ?? 0) + (r.home.storage[SOFA] ?? 0), zobo: (g.inventory.zobo ?? 0) + (r.inventory.zobo ?? 0),
});

test('the offer, the cut and the move: every kind moves once, nothing is lost or copied', () => {
  const gs = richGiver(), rs = life('Receiver');
  const giver = sideOf(holder('g', gs), shopFor('g', 'Giver'), true)!, receiver = sideOf(holder('r', rs), null, true)!;
  const biz = business({ g: giver.shop! });
  const before = totals(gs, rs), pieces = Object.values(furnitureOf(gs)).reduce((a, b) => a + b, 0);
  const offer = offerOf(giver, ALL);
  assert.deepEqual(offer.manifest.houses.map((h) => h.tier), ['bungalow']);
  assert.deepEqual(offer.manifest.goodwill, [N3, N1], 'the closest two with 20 points or more');
  const cut = partition(giver, receiver, offer.manifest, 'heir');
  assert.deepEqual(cut.stays, []);
  assert.equal(describe(cut.manifest).length, 7);
  assert.deepEqual(cut.manifest.titles, ['settled', 'lagosian'], 'two of the day titles, never the weekly one');
  const moved = apply(giver, receiver, cut.manifest, 'heir', biz);
  assert.equal(moved.houses, 1); assert.equal(moved.cars, 2); assert.equal(moved.shop, true); assert.equal(moved.furniture, pieces);
  assert.equal(rs.estate.tier, 'bungalow'); assert.equal(rs.estate.style.wall, 1);
  assert.equal(gs.estate.tier, 'starter'); assert.deepEqual(gs.estate.style, { ...DEFAULT_STYLE });
  assert.deepEqual(gs.property.cars, []); assert.equal(gs.property.car, null); assert.deepEqual(rs.property.cars.sort(), [CAR_A, CAR_B].sort());
  assert.equal(biz.shops.g, undefined); assert.equal(biz.shops.r?.by.id, 'r');
  assert.equal(gs.home.storage[SOFA], undefined); assert.equal(rs.home.storage[SOFA], 3); assert.equal(rs.home.storage[BED], 1);
  assert.equal(gs.home.overflow?.[BED], undefined);
  assert.deepEqual(totals(gs, rs).cars, before.cars, 'every car has exactly one holder, before and after');
  assert.equal(totals(gs, rs).sofas, before.sofas); assert.equal(totals(gs, rs).zobo, before.zobo);
  assert.deepEqual(gs.inventory, {}); assert.deepEqual(rs.inventory.zobo, 5);
  // Goodwill: half, at most 40; the giver keeps their own; a title is copied.
  assert.equal(rs.social.rel[N1]?.p, 30); assert.equal(rs.social.rel[N3]?.p, 40); assert.equal(gs.social.rel[N1]?.p, 60);
  assert.deepEqual(rs.social.rel[N3]?.npcSnapshot?.name, 'Ada'); assert.equal(rs.social.rel[N2], undefined, 'under 20 points does not carry');
  assert.deepEqual(rs.missions.titles, ['settled', 'lagosian']); assert.deepEqual(gs.missions.titles, ['settled', 'lagosian', 'week-finisher']);
  // The same manifest again moves nothing: it is refused, whole.
  const again = verify(giver, receiver, cut.manifest, 'heir', biz);
  assert.equal(again.ok, false);
  assert.throws(() => apply(giver, receiver, cut.manifest, 'heir', biz), /legacy: changed/);
  assert.equal(rs.property.cars.length, 2);
});

test('what the receiver cannot take stays with the giver, with the reason', () => {
  const gs = richGiver(), rs = life('Receiver');
  rs.estate.tier = 'duplex'; rs.property.cars = [CAR_A]; rs.home.storage = { [SOFA]: 98 };
  const giver = sideOf(holder('g', gs), shopFor('g', 'Giver'), true)!, receiver = sideOf(holder('r', rs), shopFor('r', 'Theirs'), true)!;
  const cut = partition(giver, receiver, offerOf(giver, ALL).manifest, 'heir');
  assert.deepEqual(cut.manifest.houses, [], 'their home is already bigger'); assert.deepEqual(cut.manifest.cars, [CAR_B]); assert.equal(cut.manifest.shop, null);
  assert.equal(cut.manifest.furniture[SOFA], undefined, 'storage holds at most 99 of one kind'); assert.equal(cut.manifest.furniture[BED], 1);
  assert.deepEqual(cut.stays.map((s) => s.why).length, 4);
  const biz = business({ g: giver.shop!, r: receiver.shop! });
  apply(giver, receiver, cut.manifest, 'heir', biz);
  assert.equal(gs.estate.tier, 'bungalow', 'the house that did not move is still the giver\'s'); assert.deepEqual(gs.property.cars, [CAR_A]);
  assert.equal(gs.home.storage[SOFA], 3); assert.ok(biz.shops.g && biz.shops.r?.name === 'Mama Put');
});

test('what cannot pass: a build in progress, rent owed, a cash box with money in it, a trip', () => {
  const gs = richGiver();
  gs.estate.upgrade = { to: 'duplex', cost: 1, startedAt: 1, doneAt: 9e12 };
  const shop = shopFor('g', 'Giver'); shop.till = 50;
  const giver = sideOf(holder('g', gs), shop, true)!;
  const offer = offerOf(giver, { houses: true, shop: true });
  assert.deepEqual(offer.manifest.houses, []); assert.equal(offer.manifest.shop, null);
  assert.equal(offer.stays.length, 2);
  gs.estate.upgrade = null; gs.estate.ground.arrears = 10;
  assert.equal(offerOf(giver, { houses: true }).stays[0]?.why.startsWith('Ground rent'), true);
  assert.deepEqual(offerOf(sideOf(holder('g', life('Poor')), null, true)!, ALL).manifest.houses, [], 'the free starter house is not property');
});

test('a hand-over to a different character carries no titles and a smaller share of goodwill, and the worth is counted', () => {
  const gs = richGiver(), rs = life('Receiver');
  const giver = sideOf(holder('g', gs), shopFor('g', 'Giver'), true)!, receiver = sideOf(holder('r', rs), null, true)!;
  const cut = partition(giver, receiver, offerOf(giver, ALL).manifest, 'other');
  assert.deepEqual(cut.manifest.titles, []);
  apply(giver, receiver, cut.manifest, 'other', business({ g: giver.shop! }));
  assert.equal(rs.social.rel[N1]?.p, 15); assert.equal(rs.social.rel[N3]?.p, 20); assert.deepEqual(rs.missions.titles, []);
  assert.ok(worthOf(cut.manifest, giver.shop) >= 150000 + 350000 + 900000);
  const probe = { ...emptyManifest(), titles: ['settled' as const] };
  assert.deepEqual(verify(giver, receiver, probe, 'other', undefined), { ok: false, code: 'not_allowed', reason: 'Titles go to your own next character only.' });
  assert.equal(verify(giver, receiver, probe, 'heir', undefined).ok, true);
  const many = life('Hoarder'); many.inventory = { zobo: LEGACY.beliefsMax + 1 };
  const hoarder = sideOf(holder('h', many), null, true)!;
  assert.equal(partition(hoarder, receiver, offerOf(hoarder, { belongings: true }).manifest, 'other').stays[0]?.what, 'belongings');
  assert.equal(partition(hoarder, receiver, offerOf(hoarder, { belongings: true }).manifest, 'heir').manifest.belongings.zobo, LEGACY.beliefsMax + 1);
});

test('a manifest read back from storage is clamped to known shapes', () => {
  const m = readManifest({ houses: [{ city: 'lagos', tier: 'villa', style: 3 }, { city: 'x', tier: 'starter', style: 1 }, 7], cars: [CAR_A, 'nope', CAR_A], shop: 12, furniture: { [SOFA]: 2, nonsense: 4, [BED]: -1 }, belongings: { zobo: 1, '': 3 }, goodwill: ['a', 5], titles: ['settled'] });
  assert.deepEqual(m.houses, [{ city: 'lagos', tier: 'villa', style: 3 }]); assert.deepEqual(m.cars, [CAR_A]); assert.equal(m.shop, 12);
  assert.deepEqual(m.furniture, { [SOFA]: 2 }); assert.deepEqual(m.belongings, { zobo: 1 }); assert.deepEqual(m.goodwill, ['a']);
  assert.deepEqual(readManifest(null), readManifest(undefined));
  assert.equal(packStyle(DEFAULT_STYLE, 'bq') > 0, true);
});

test('erasing and exporting the collection touches only the people named', () => {
  const offer = (id: string, from: string, to: string) => ({ id, from, fromName: from, to, toName: to, at: 1, expires: 9, manifest: readManifest({}), worth: 0 });
  const legacy: LegacyCollection = { v: 1, seq: 3, offers: { a: offer('a', 'x', 'y'), b: offer('b', 'p', 'q') }, done: [{ n: 1, id: 'L-1', kind: 'other', result: 'accepted', at: 1, from: 'x', to: 'p' }, { n: 2, id: 'L-2', kind: 'heir', result: 'passed', at: 2, from: 'q', to: 'q2' }], people: { x: { out: 1 }, q: { in: 2 } } };
  const db = { legacy: structuredClone(legacy) } as unknown as Db;
  assert.deepEqual(exportLegacy(db, ['x']).offers.length, 1);
  eraseLegacy(db, ['x']);
  const left = peekLegacy(db);
  assert.deepEqual(Object.keys(left.offers), ['b']); assert.deepEqual(left.done.map((l) => l.id), ['L-2']); assert.deepEqual(Object.keys(left.people), ['q']);
  assert.deepEqual(peekLegacy({}), { v: 1, seq: 0, offers: {}, done: [], people: {} }, 'old data: no collection is an empty one');
  assert.doesNotThrow(() => eraseLegacy({} as Db, ['x']));
});

// ---- the routes -----------------------------------------------------------------------------------------------------------------

const PROJECT = 'allworld-test-project';
const ENV = { ACCOUNTS_FIREBASE_PROJECT_ID: PROJECT, ACCOUNTS_FIREBASE_API_KEY: 'test-web-api-key-0000000000000000000000', ACCOUNTS_GOOGLE_CLIENT_ID: '1234567890-testclient.apps.googleusercontent.com' };
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Who = { cookie: string; id: string; name: string };

async function scene(t: TestContext) {
  const key = await makeKey('key-1'), provider = fakeProvider([key]);
  const f = await fixture(t, { env: ENV, fetch: (url, init) => provider.fetch(url, init as { body?: unknown }), log: () => {} });
  let minted = 0;
  const call = (path: string, body?: unknown, cookie?: string): Promise<Response> => fetch(f.base + path, { method: body ? 'POST' : 'GET', headers: { Origin: f.base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const send = async (path: string, body: unknown, who: { cookie: string }): Promise<Json> => { const r = await call(path, body, who.cookie); return { status: r.status, ...(await r.json() as Json) }; };
  const get = async (path: string, who: { cookie: string }): Promise<Json> => { const r = await call(path, undefined, who.cookie); return { status: r.status, ...(await r.json() as Json) }; };
  const token = (subject: string): Promise<string> => signToken(key, claimsFor(PROJECT, f.now(), { subject, email: `${subject.toLowerCase()}@example.com`, n: ++minted }));
  /** A state-changing account route with this cookie's own anti-forgery token. */
  const change = async (path: string, body: Json, cookie: string): Promise<Response> => call(path, { ...body, csrf: ((await (await call('/api/account', undefined, cookie)).json()) as Json).csrf }, cookie);
  const signIn = async (subject: string, cookie: string): Promise<{ cookie: string; body: Json }> => {
    const response = await change('/api/account/sign-in', { idToken: await token(subject) }, cookie);
    return { cookie: response.headers.get('set-cookie')?.split(';')[0] ?? '', body: await response.json() as Json };
  };
  /** A guest who has played. */
  const guest = async (name: string, adult = true): Promise<Who> => {
    const d = await f.device(name);
    await f.request('/api/life?city=lagos', null, d.cookie);
    assert.equal((await f.action(d.cookie, { type: 'travel', id: 'library', mode: 'trek' })).ok, true);
    await send('/api/growth/hello', { cityId: 'lagos' }, d); await send('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, d);
    await get('/api/social/me', d);
    return { cookie: d.cookie, id: d.id, name };
  };
  const befriend = async (a: Who, b: Who): Promise<void> => {
    assert.equal((await send('/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a)).code, 'requested');
    assert.equal((await send('/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b)).code, 'accepted');
  };
  /** Change a character's stored life (an open session or a set-aside one) outside the game, as a test fixture. */
  const edit = (id: string, fn: (state: LifeState, session: SessionRecord | null, db: Db) => void): Promise<void> => f.server.store.transact((db: Db) => {
    const key = db.$store?.sessionKeyByPublicId(id), session = key === undefined ? undefined : db.sessions[key];
    const holder = session ?? db.archivedLives?.[id];
    if (!holder) throw new Error(`no stored character ${id}`);
    fn(holder.cities.lagos!.state, session ?? null, db);
  });
  const read = <T>(fn: (db: Db) => T): Promise<T> => f.server.store.read(fn as never) as Promise<T>;
  const lifeOf = (id: string): Promise<LifeState> => read((db) => { const key = db.$store?.sessionKeyByPublicId(id), h = (key === undefined ? undefined : db.sessions[key]) ?? db.archivedLives?.[id]; return JSON.parse(JSON.stringify(h!.cities.lagos!.state)) as LifeState; });
  const shops = (): Promise<Record<string, ShopRecord>> => read((db) => JSON.parse(JSON.stringify(db.business?.shops ?? {})) as Record<string, ShopRecord>);
  const rich = (id: string): Promise<void> => edit(id, (s, _session, db) => {
    s.estate.tier = 'bungalow'; s.property.cars = [CAR_A]; s.property.car = CAR_A; s.home.storage = { [SOFA]: 2 }; s.inventory = { zobo: 4 }; s.social.earned = 50_000_000;
    s.social.rel = { [N1]: { p: 60, d: 1, n: 0, npc: true, at: 5 } }; s.missions.titles = ['settled'];
    const shop = shopFor(id, 'Giver'); db.business = { ...(db.business ?? { v: 1, shops: {}, reports: [], seq: 0 }), shops: { ...(db.business?.shops ?? {}), [id]: shop } };
  });
  const mine = (): { requestId: string } => ({ requestId: f.id() });
  /** An account whose active character is `ada` with a set-aside heir. */
  async function household(adult = true) {
    const first = await guest('Ada', adult), spare = await guest('Dayo', adult);
    f.advance(3600000);   // the walk each took to start playing is over
    const linked = await signIn('UidAda', first.cookie);
    const parked = await signIn('UidAda', spare.cookie);
    assert.equal(linked.body.outcome, 'linked'); assert.equal(parked.body.outcome, 'parked');
    return { ada: { cookie: parked.cookie, id: first.id, name: 'Ada' } as Who, heir: { id: spare.id, name: 'Dayo' } };
  }
  return { f, send, get, guest, befriend, edit, lifeOf, shops, rich, mine, household, read, signIn, token, change };
}

test('an heir: everything ticked moves at once, to the other character of the same account, and a repeated request moves nothing more', async (t) => {
  const s = await scene(t), { ada, heir } = await s.household();
  await s.rich(ada.id);
  const before = await s.lifeOf(ada.id), heirBefore = await s.lifeOf(heir.id);
  const view = await s.get('/api/world/legacy', ada);
  assert.deepEqual(view.heirs, [{ id: heir.id, name: 'Dayo' }]);
  assert.deepEqual(view.kinds.map((k: Json) => k.key), ['houses', 'cars', 'shop', 'furniture', 'belongings', 'goodwill', 'titles']);
  const preview = await s.send('/api/world/legacy/preview', { to: heir.id, include: ALL }, ada);
  assert.equal(preview.ok, true); assert.equal(preview.kind, 'heir');
  const request = s.mine();
  const done = await s.send('/api/world/legacy/pass', { ...request, to: heir.id, include: ALL }, ada);
  assert.equal(done.code, 'passed'); assert.equal(done.moved.cars, 1);
  const g = await s.lifeOf(ada.id), h = await s.lifeOf(heir.id);
  assert.equal(g.estate.tier, 'starter'); assert.equal(h.estate.tier, 'bungalow');
  assert.deepEqual([g.property.cars, h.property.cars], [[], [CAR_A]]);
  assert.equal(g.home.storage[SOFA], undefined); assert.equal((h.home.storage[SOFA] ?? 0) - (heirBefore.home.storage[SOFA] ?? 0), 2);
  assert.equal(before.inventory.zobo, 4); assert.equal(g.inventory.zobo, undefined); assert.equal(h.inventory.zobo, 4);
  const shops = await s.shops();
  assert.deepEqual(Object.keys(shops), [heir.id]); assert.equal(shops[heir.id]!.by.id, heir.id);
  assert.equal(h.social.rel[N1]?.p, 30);
  // The same request id: the stored answer, nothing moves again.
  const again = await s.send('/api/world/legacy/pass', { ...request, to: heir.id, include: ALL }, ada);
  assert.equal(again.duplicate, true); assert.equal(again.code, 'passed');
  assert.deepEqual(await s.lifeOf(heir.id), h);
  // A new request finds nothing left to pass: a plain refusal, no change.
  const next = await s.send('/api/world/legacy/pass', { ...s.mine(), to: heir.id, include: ALL }, ada);
  assert.equal(next.ok, false); assert.equal(next.code, 'nothing_to_pass');
  assert.deepEqual(await s.lifeOf(heir.id), h);
  // The same id used for something else is a conflict.
  assert.equal((await s.send('/api/world/legacy/pass', { ...request, to: heir.id, include: { cars: true } }, ada)).error, 'client_id_conflict');
  // The public line names nobody.
  const gist = await s.f.request('/api/world/gist?id=lagos'); const items = (await gist.json() as Json).items as Json[];
  assert.ok(items.some((i) => i.text === 'A family house was passed on in Lagos.')); assert.ok(items.every((i) => !/Ada|Dayo/.test(i.text)));
  // The request has to carry an id, and an unknown character is not an heir.
  assert.equal((await s.send('/api/world/legacy/pass', { to: heir.id, include: ALL }, ada)).error, 'client_id_required');
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: ada.id, include: ALL }, ada)).code, 'invalid_player');
});

test('an interrupted transaction leaves both lives, the shop and the record exactly as they were', async (t) => {
  const s = await scene(t), { ada, heir } = await s.household();
  await s.rich(ada.id);
  const before = JSON.stringify([await s.lifeOf(ada.id), await s.lifeOf(heir.id), await s.shops(), await s.read((db) => db.legacy ?? null)]);
  for (const stepName of ['houses', 'cars', 'shop', 'furniture', 'belongings', 'goodwill', 'titles']) {
    useFaultForTests((step) => { if (step === stepName) throw new Error(`injected failure after ${stepName}`); });
    try {
      const r = await s.f.request('/api/world/legacy/pass', { ...s.mine(), to: heir.id, include: ALL }, ada.cookie);
      assert.equal(r.status, 500, stepName);
    } finally { useFaultForTests(null); }
    // Settling the giver's clock is not a hand-over: compare what a hand-over moves.
    const g = await s.lifeOf(ada.id), h = await s.lifeOf(heir.id), was = JSON.parse(before) as [LifeState, LifeState, Record<string, ShopRecord>, unknown];
    assert.deepEqual([g.estate.tier, g.property.cars, g.home.storage, g.inventory, g.social.rel, g.missions.titles], [was[0].estate.tier, was[0].property.cars, was[0].home.storage, was[0].inventory, was[0].social.rel, was[0].missions.titles], stepName);
    assert.deepEqual(h, was[1], stepName);
    assert.deepEqual(await s.shops(), was[2], stepName);
    assert.equal(await s.read((db) => db.legacy ?? null), null, 'no record of a hand-over that did not happen');
  }
  // With the fault gone the same player can do it.
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: heir.id, include: ALL }, ada)).code, 'passed');
});

test('a minor can pass things to their own next character, and to no other player', async (t) => {
  const s = await scene(t), { ada, heir } = await s.household(false);
  await s.rich(ada.id);
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: heir.id, include: { houses: true, cars: true } }, ada)).code, 'passed');
  assert.deepEqual([(await s.lifeOf(heir.id)).estate.tier, (await s.lifeOf(heir.id)).property.cars], ['bungalow', [CAR_A]]);
  const friend = await s.guest('Friend'); await s.befriend(ada, friend); s.f.advance(4 * DAY);
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: friend.id, include: { cars: true } }, ada)).code, 'adults_only');
  assert.equal((await s.get('/api/world/legacy', ada)).friends.length, 0, 'a minor is not offered anyone to give to');
});

test('deleting the account removes its offers; the export shows its own hand-overs and nobody else\'s id', async (t) => {
  const s = await scene(t), { ada, heir } = await s.household();
  const bola = await s.guest('Bola'); await s.befriend(ada, bola); s.f.advance(4 * DAY);
  await s.rich(ada.id);
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: heir.id, include: { cars: true } }, ada)).code, 'passed');
  await s.edit(ada.id, (st) => { st.property.cars = [CAR_B]; });
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada)).code, 'offered');
  const exported = await (await s.change('/api/account/export', { idToken: await s.token('UidAda') }, ada.cookie)).json() as Json;
  assert.equal(exported.legacy.offers.length, 1); assert.equal(exported.legacy.done.length, 1);
  assert.ok(!JSON.stringify(exported.legacy).includes(bola.id), 'the other player\'s id is not in the export');
  assert.equal((await s.change('/api/account/delete', { confirm: 'delete', erase: true, idToken: await s.token('UidAda') }, ada.cookie)).status, 200);
  const left = await s.read((db) => peekLegacy(db));
  assert.deepEqual([Object.keys(left.offers).length, left.done.length], [0, 0]);
  assert.equal((await s.get('/api/world/legacy', bola)).incoming.length, 0);
});

async function pair(t: TestContext) {
  const s = await scene(t);
  const ada = await s.guest('Ada'), bola = await s.guest('Bola');
  await s.befriend(ada, bola);
  s.f.advance(4 * DAY);   // old enough to give, and the first walk is long over
  await s.rich(ada.id);
  return { s, ada, bola };
}

test('a different character: an offer moves nothing; accepting moves it once; a repeat does nothing; a second hand-over waits 14 days', async (t) => {
  const { s, ada, bola } = await pair(t);
  const adaBefore = await s.lifeOf(ada.id), bolaBefore = await s.lifeOf(bola.id);
  assert.deepEqual((await s.get('/api/world/legacy', ada)).friends, [{ id: bola.id, name: 'Bola' }]);
  const offered = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { houses: true, cars: true, shop: true, titles: true } }, ada);
  assert.equal(offered.code, 'offered'); assert.deepEqual(offered.lines.length, 3, 'titles do not go to a different character');
  assert.equal((await s.lifeOf(bola.id)).estate.tier, bolaBefore.estate.tier, 'nothing moved when the offer was made');
  assert.equal((await s.lifeOf(ada.id)).estate.tier, adaBefore.estate.tier);
  const seen = await s.get('/api/world/legacy', bola);
  assert.equal(seen.incoming.length, 1); assert.equal(seen.incoming[0].from.name, 'Ada');
  const updates = await s.get('/api/social/updates', bola).catch(() => ({}));
  void updates;
  const request = s.mine();
  const accepted = await s.send('/api/world/legacy/accept', { ...request, offer: offered.offer.id }, bola);
  assert.equal(accepted.code, 'accepted');
  const g = await s.lifeOf(ada.id), r = await s.lifeOf(bola.id);
  assert.deepEqual([g.estate.tier, r.estate.tier, g.property.cars, r.property.cars], ['starter', 'bungalow', [], [CAR_A]]);
  assert.deepEqual(Object.keys(await s.shops()), [bola.id]);
  assert.deepEqual(r.missions.titles, bolaBefore.missions.titles);
  const repeat = await s.send('/api/world/legacy/accept', { ...request, offer: offered.offer.id }, bola);
  assert.equal(repeat.duplicate, true); assert.deepEqual(await s.lifeOf(bola.id), r);
  assert.equal((await s.send('/api/world/legacy/accept', { ...s.mine(), offer: offered.offer.id }, bola)).code, 'unknown_offer', 'the offer is gone');
  assert.equal((await s.get('/api/world/legacy', bola)).incoming.length, 0);
  // Fourteen days between hand-overs, for the giver and for the receiver.
  await s.edit(ada.id, (st) => { st.property.cars = [CAR_B]; });
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada)).code, 'too_soon');
  s.f.advance(15 * DAY);
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada)).code, 'offered');
});

test('the receiver refuses, the giver cancels, an offer runs out: nothing moves and both lives are as they were', async (t) => {
  const { s, ada, bola } = await pair(t);
  const was = JSON.stringify([await s.lifeOf(ada.id), await s.lifeOf(bola.id), await s.shops()]);
  const first = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true, shop: true } }, ada);
  assert.equal((await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada)).code, 'offer_open', 'one offer at a time');
  const declined = await s.send('/api/world/legacy/decline', { ...s.mine(), offer: first.offer.id }, bola);
  assert.equal(declined.code, 'declined');
  assert.equal((await s.send('/api/world/legacy/decline', { ...s.mine(), offer: first.offer.id }, bola)).code, 'gone', 'declining twice is fine');
  assert.equal((await s.send('/api/world/legacy/accept', { ...s.mine(), offer: first.offer.id }, bola)).code, 'unknown_offer');
  const second = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada);
  assert.equal((await s.send('/api/world/legacy/cancel', { ...s.mine(), offer: second.offer.id }, bola)).code, 'gone', 'only the giver can cancel');
  assert.equal((await s.send('/api/world/legacy/cancel', { ...s.mine(), offer: second.offer.id }, ada)).code, 'cancelled');
  assert.equal((await s.get('/api/world/legacy', ada)).outgoing, null);
  const third = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada);
  s.f.advance(8 * DAY);
  const late = await s.send('/api/world/legacy/accept', { ...s.mine(), offer: third.offer.id }, bola);
  assert.equal(late.code, 'offer_void');
  assert.equal((await s.lifeOf(ada.id)).property.cars[0], CAR_A, 'the car is still the giver\'s');
  const adaNow = await s.lifeOf(ada.id), bolaNow = await s.lifeOf(bola.id), was0 = JSON.parse(was) as [LifeState, LifeState, unknown];
  assert.deepEqual([adaNow.property.cars, adaNow.estate.tier, bolaNow.property.cars, bolaNow.estate.tier], [was0[0].property.cars, was0[0].estate.tier, was0[1].property.cars, was0[1].estate.tier]);
  assert.equal(Object.keys(await s.shops())[0], ada.id);
  const record = await s.read((db) => peekLegacy(db));
  assert.deepEqual(record.done.map((l) => l.result), ['declined', 'cancelled', 'void']);
});

test('the giver\'s life changes between the offer and the accept: the offer is voided and nothing moves', async (t) => {
  const { s, ada, bola } = await pair(t);
  const offered = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { houses: true, cars: true } }, ada);
  assert.equal(offered.code, 'offered');
  await s.edit(ada.id, (st) => { st.property.cars = []; st.property.car = null; });   // sold the car
  const answer = await s.send('/api/world/legacy/accept', { ...s.mine(), offer: offered.offer.id }, bola);
  assert.equal(answer.code, 'offer_void');
  assert.equal((await s.lifeOf(ada.id)).estate.tier, 'bungalow', 'the house did not move either: all or nothing');
  assert.notEqual((await s.lifeOf(bola.id)).estate.tier, 'bungalow');
  assert.equal((await s.get('/api/world/legacy', ada)).outgoing, null);
  // A voided offer is not a hand-over: the fortnight's allowance is used only by one that happened.
  const again = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { houses: true } }, ada);
  assert.equal(again.code, 'offered');
});

test('the receiver\'s life changes: accepting is refused with the reason and the offer stays', async (t) => {
  const { s, ada, bola } = await pair(t);
  const offered = await s.send('/api/world/legacy/pass', { ...s.mine(), to: bola.id, include: { cars: true } }, ada);
  assert.equal(offered.code, 'offered');
  await s.edit(bola.id, (st) => { st.property.cars = [CAR_A]; });
  const refused = await s.send('/api/world/legacy/accept', { ...s.mine(), offer: offered.offer.id }, bola);
  assert.deepEqual([refused.ok, refused.code], [false, 'receiver_blocked']);
  assert.equal((await s.get('/api/world/legacy', bola)).incoming.length, 1, 'the offer is still there');
  await s.edit(bola.id, (st) => { st.property.cars = []; });
  assert.equal((await s.send('/api/world/legacy/accept', { ...s.mine(), offer: offered.offer.id }, bola)).code, 'accepted');
});

test('who may give to whom: friends, adults, people; minors can still pass things to their own next character', async (t) => {
  const s = await scene(t);
  const ada = await s.guest('Ada'), bola = await s.guest('Bola'), kid = await s.guest('Kid', false), cleo = await s.guest('Cleo');
  await s.befriend(ada, bola); await s.befriend(ada, kid);
  s.f.advance(4 * DAY);
  await s.rich(ada.id); await s.rich(kid.id);
  const to = async (who: Who, id: string, include: Include = { cars: true }) => (await s.send('/api/world/legacy/pass', { ...s.mine(), to: id, include }, who)).code;
  assert.equal(await to(ada, cleo.id), 'friends_only', 'a stranger');
  assert.equal(await to(ada, kid.id), 'receiver_not_adult');
  assert.equal(await to(kid, ada.id), 'adults_only');
  assert.equal(await to(ada, ada.id), 'invalid_player');
  assert.equal(await to(ada, bola.id, {}), 'nothing_chosen');
  // An AI-played character neither gives nor receives.
  await s.edit(bola.id, (_st, session) => { session!.agent = { char: true }; });
  assert.equal(await to(ada, bola.id), 'agents_excluded');
  await s.edit(bola.id, (_st, session) => { delete session!.agent; });
  // Over the allowance (what was earned from work): refused with a plain reason.
  await s.edit(ada.id, (st) => { st.social.earned = 10; });
  assert.equal(await to(ada, bola.id, { houses: true }), 'over_allowance');
  await s.edit(ada.id, (st) => { st.social.earned = 50_000_000; });
  // A new player (not yet days old) cannot give to another player.
  const fresh = await s.guest('Fresh'); await s.befriend(fresh, bola); await s.rich(fresh.id);
  s.f.advance(3600000);   // its first walk is over
  assert.equal(await to(fresh, bola.id), 'too_new');
  // No account, no heir: the list is empty, and an unknown id is not one.
  assert.deepEqual((await s.get('/api/world/legacy', ada)).heirs, []);
  assert.equal((await s.get('/api/world/legacy', kid)).adult, false);
  assert.equal((await s.get('/api/world/legacy', { cookie: '' })).status, 401);
});

test('old data: a server with no hand-overs answers, and a player with nothing to pass is told so', async (t) => {
  const s = await scene(t);
  const ada = await s.guest('Ada');
  s.f.advance(3600000);
  const view = await s.get('/api/world/legacy', ada);
  assert.deepEqual([view.status, view.outgoing, view.incoming, view.heirs], [200, null, [], []]);
  assert.ok(view.kinds.every((k: Json) => !['houses', 'cars', 'shop'].includes(k.key)), 'a new life has no house, car or shop to pass');
  assert.equal(await s.read((db) => db.legacy ?? null), null, 'a read creates nothing');
  const r = await s.send('/api/world/legacy/pass', { ...s.mine(), to: ada.id, include: { cars: true } }, ada);
  assert.equal(r.code, 'invalid_player');
});

test('the limits are the ones the design names', () => {
  assert.deepEqual([LEGACY.gapMs / DAY, LEGACY.offerMs / DAY, LEGACY.minAgeMs / DAY, LEGACY.incomingMax], [14, 7, 3, 3]);
  assert.equal(worthOf(readManifest({}), null), 0);
});
