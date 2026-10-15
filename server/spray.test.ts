// Group spray packets (docs/SMALLER-FEATURES.md): the split, and the gift rules that still hold.
import { loadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(loadCityContent));
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { TRANSFER_LIMITS } from '../src/game/content/npcs.ts';
import { pickSome, randomFrom, splitSpray } from './social/spray.ts';
import type { LifeState } from '../src/types/life.ts';

test('the split: whole shares, each at least the minimum and inside its room, adding up, and random', () => {
  const rand = randomFrom('seed-one');
  for (let round = 0; round < 200; round++) {
    const rooms = [20000, 5000, 400, 20000], total = 100 + Math.floor(rand() * 4900);
    const shares = splitSpray(total, rooms, 100, rand);
    if (total < 400) { assert.equal(shares, null); continue; }
    assert.ok(shares);
    assert.equal(shares.reduce((a, b) => a + b, 0), total);
    shares.forEach((share, i) => { assert.ok(Number.isSafeInteger(share) && share >= 100 && share <= rooms[i]!); });
  }
  assert.equal(splitSpray(250, [1000, 1000, 1000], 100, rand), null, 'not enough for everyone');
  assert.equal(splitSpray(1000, [1000, 50], 100, rand), null, 'a room below the minimum');
  assert.deepEqual(splitSpray(1000, [300, 300], 100, rand), [300, 300], 'the rooms cap what can be placed');
  const different = new Set(Array.from({ length: 30 }, (_, i) => splitSpray(3000, [9000, 9000, 9000], 100, randomFrom(`s${i}`))!.join()));
  assert.ok(different.size > 5, 'different seeds give different splits');
  assert.equal(pickSome([1, 2, 3, 4], 2, rand).length, 2);
  assert.equal(pickSome([1, 2], 5, rand).length, 2);
});

type Fixture = Awaited<ReturnType<typeof fixture>>;
const body = async (res: Response): Promise<Record<string, any>> => ({ status: res.status, ...((await res.json()) as object) });
const get = async (f: Fixture, path: string, who?: Device) => body(await f.request(path, null, who?.cookie));
const post = async (f: Fixture, path: string, data: unknown, who?: Device) => body(await f.request(path, data, who?.cookie));
const people = async (f: Fixture, names: string[]): Promise<Device[]> => { const out: Device[] = []; for (const name of names) { const who = await f.device(name); await get(f, '/api/social/me', who); out.push(who); } return out; };
const befriend = async (f: Fixture, a: Device, b: Device): Promise<void> => {
  assert.equal((await post(f, '/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a)).code, 'requested');
  assert.equal((await post(f, '/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b)).code, 'accepted');
};
const edit = (f: Fixture, who: Device, change: (state: LifeState) => void) => f.server.store.transact((db) => { const state = db.sessions[who.cookie.slice(4)]?.cities.lagos?.state; assert.ok(state); change(state); });
// A share waits for its owner's next request; the social page applies it.
const cash = async (f: Fixture, who: Device): Promise<number> => { await get(f, '/api/social/me', who); return (await get(f, '/api/life?city=lagos', who)).state.cash; };

test('a packet is split among the friends in a group; one charge; limits and agents hold', async (t) => {
  const f = await fixture(t);
  const [ada, bola, chi, dayo, eze] = await people(f, ['Ada', 'Bola', 'Chi', 'Dayo', 'Eze']) as [Device, Device, Device, Device, Device];
  await get(f, '/api/life?city=lagos', ada);
  for (const who of [bola, chi, dayo, eze]) await get(f, '/api/life?city=lagos', who);
  await edit(f, ada, (state) => { state.social.earned = 20000; });
  // Ada is friends with Bola, Chi and Dayo, not Eze.
  for (const friend of [bola, chi, dayo]) await befriend(f, ada, friend);
  const made = await post(f, '/api/social/groups', { name: 'Eid crew', members: [bola.id, chi.id, dayo.id], clientId: f.id() }, ada);
  const conv = made.conv.id as string;
  const before = await Promise.all([ada, bola, chi, dayo].map((who) => cash(f, who)));

  const id = f.id();
  const first = await post(f, '/api/social/spray', { conv, amount: 3000, cityId: 'lagos', clientId: id }, ada);
  assert.equal(first.code, 'sprayed', JSON.stringify(first));
  assert.equal(first.amount, 3000); assert.equal(first.shares, 3);
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 3000, cityId: 'lagos', clientId: id }, ada)).code, 'sprayed', 'a repeat is answered, not charged twice');
  const after = await Promise.all([ada, bola, chi, dayo].map((who) => cash(f, who)));
  assert.equal(before[0]! - after[0]!, 3000, 'one charge for the whole packet');
  const got = [1, 2, 3].map((i) => after[i]! - before[i]!);
  assert.equal(got.reduce((a, b) => a + b, 0), 3000);
  got.forEach((share) => assert.ok(share >= TRANSFER_LIMITS.min));
  // The group sees one line saying who got what.
  const thread = await get(f, `/api/social/conversations/${encodeURIComponent(conv)}`, bola);
  assert.ok(JSON.stringify(thread).includes('sprayed'));

  // The gift rules still hold: the size limits, membership, the daily count and the earned-money rule.
  assert.equal((await post(f, '/api/social/spray', { conv, amount: TRANSFER_LIMITS.min - 1, cityId: 'lagos', clientId: f.id() }, ada)).code, 'amount_too_small');
  assert.equal((await post(f, '/api/social/spray', { conv, amount: TRANSFER_LIMITS.maxPerTransfer + 1, cityId: 'lagos', clientId: f.id() }, ada)).code, 'amount_too_large');
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 1000, cityId: 'lagos', clientId: f.id() }, eze)).code, 'not_a_member', 'Eze is not in the group');
  assert.equal((await post(f, '/api/social/spray', { conv: 'g.999', amount: 1000, cityId: 'lagos', clientId: f.id() }, ada)).code, 'not_a_member');
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 1000, cityId: 'lagos', clientId: f.id() }, bola)).code, 'earn_first', 'only money earned from work can be given');
  f.advance(61000);
  for (let i = 0; i < TRANSFER_LIMITS.dailyCount - 1; i++) assert.equal((await post(f, '/api/social/spray', { conv, amount: 500, cityId: 'lagos', clientId: f.id() }, ada)).code, 'sprayed');
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 500, cityId: 'lagos', clientId: f.id() }, ada)).code, 'daily_transfer_limit', 'a packet is one gift against the daily count');
});

test('an agent-played character can receive a packet but never sends one', async (t) => {
  const f = await fixture(t);
  const [ada, bola] = await people(f, ['Ada', 'Bola']) as [Device, Device];
  await get(f, '/api/life?city=lagos', ada); await get(f, '/api/life?city=lagos', bola);
  await befriend(f, ada, bola);
  await edit(f, ada, (state) => { state.social.earned = 20000; });
  await edit(f, bola, (state) => { state.social.earned = 20000; });
  const conv = (await post(f, '/api/social/groups', { name: 'Crew', members: [bola.id], clientId: f.id() }, ada)).conv.id as string;
  await f.server.store.transact((db) => { const social = db.social?.players?.[bola.id]; assert.ok(social); social.agent = { char: true, at: f.now() }; });
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 1000, cityId: 'lagos', clientId: f.id() }, bola)).code, 'agents_cannot_spray');
  const before = await cash(f, bola);
  assert.equal((await post(f, '/api/social/spray', { conv, amount: 1000, cityId: 'lagos', clientId: f.id() }, ada)).code, 'sprayed');
  assert.equal(await cash(f, bola) - before, 1000, 'the agent received it');
});
