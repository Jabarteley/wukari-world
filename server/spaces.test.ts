// AI Spaces on the server (server/spaces/, routes/spaces.ts) against a fake model gateway on a local port: a blocked description never
// reaches a model, every router refusal has words, a bad answer is retried once, a plan with a bad piece is repaired, apply buys through
// the ordinary furniture actions and changes nothing when the cash is short, and a group room takes a plan from its members only.
import test from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { fakeGateway, redirectTo } from './testing/fakeGateway.ts';
import type { Planner } from './testing/fakeGateway.ts';
import { FURNITURE } from '../src/game/content/furniture.ts';
import { packPlan, type SpacePlanV1 } from '../src/spaces/plan.ts';
import { systemPrompt } from './spaces/design-prompt.ts';
import { eraseSpaces, homeTitleOf, spacesOf } from './spaces/store.ts';
import type { LifeState } from '../src/types/life.ts';

const KEY = 'sk-test-KEY-spaces-do-not-leak';
const TOKEN = 'operator-token-for-tests-0123456789';
const PORT = 4157;
interface Answer { ok?: boolean; code?: string; reason?: string; plan?: SpacePlanV1; problems?: { code: string; itemId: string }[]; cost?: number; placed?: number; spent?: number; ai?: boolean; error?: string }

const GOOD_PLAN = JSON.stringify({ schema: 'allworld-space', version: 1, target: 'home', title: 'Small and sweet', items: [
  { itemId: 'spring-bed', x: 0, y: 0, rot: 0 }, { itemId: 'plastic-chair', x: 0, y: 1, rot: 0 }, { itemId: 'kerosene-stove', x: 3, y: 0, rot: 0 },
  { itemId: 'toilet', x: 5, y: 5, rot: 0 }, { itemId: 'bucket-bowl', x: 4, y: 5, rot: 0 }, { itemId: 'jet-ski', x: 2, y: 2, rot: 0 }, { itemId: 'velvet-sofa', x: 2, y: 3, rot: 0 },
] });

async function harness(t: TestContext, env: Record<string, string> = { AI_GATEWAY_API_KEY: KEY }, plan: Planner = () => ({ reply: GOOD_PLAN })) {
  const gateway = await fakeGateway(PORT, plan);
  const f = await fixture(t, { moderatorToken: TOKEN, env, fetch: redirectTo(gateway.base) as never });
  t.after(() => gateway.stop());
  const life = async (name: string): Promise<Device> => { const who = await f.device(name); await f.request('/api/life?city=lagos', undefined, who.cookie); await f.request('/api/social/me', undefined, who.cookie); return who; };
  const post = async (who: Device, path: string, body: Record<string, unknown>): Promise<Answer & { status: number }> => {
    const res = await f.request(path, body, who.cookie);
    return { status: res.status, ...(await res.json() as Answer) };
  };
  const edit = async (who: Device, change: (state: LifeState) => void): Promise<void> => {
    await f.server.store.transact((db) => {
      const entry = Object.values(db.sessions).find((session) => session.publicId === who.id)?.cities.lagos;
      assert.ok(entry);
      change(entry.state);
    });
  };
  const read = async (who: Device): Promise<LifeState> => f.server.store.read((db) => structuredClone(Object.values(db.sessions).find((session) => session.publicId === who.id)!.cities.lagos!.state));
  return { f, gateway, life, post, edit, read };
}

test('the system prompt stays small and names every catalogue piece', () => {
  const prompt = systemPrompt();
  assert.ok(prompt.length / 4 < 3000, `about ${Math.round(prompt.length / 4)} tokens`);
  for (const id of Object.keys(FURNITURE)) assert.ok(prompt.includes(`\n${id} |`), id);
});

test('no key: AI design is off with words, nothing is sent, and the status says so', async (t) => {
  const { gateway, life, post, f } = await harness(t, {});
  const ada = await life('Ada');
  const answer = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'a cosy room' });
  assert.equal(answer.ok, false); assert.equal(answer.code, 'off'); assert.match(answer.reason ?? '', /resting/);
  assert.equal(gateway.seen.length, 0);
  assert.equal(((await (await f.request('/api/spaces/status', undefined, ada.cookie)).json()) as Answer).ai, false);
});

test('a blocked description never reaches a model', async (t) => {
  const { gateway, life, post } = await harness(t);
  const ada = await life('Ada');
  for (const prompt of ['a room, call me on 08031234567 0803', 'visit www.example.com for my room']) {
    const answer = await post(ada, '/api/spaces/design', { target: 'home', prompt });
    assert.equal(answer.ok, false, prompt);
    assert.match(answer.code ?? '', /not_allowed|blocked/);
  }
  assert.equal(gateway.seen.length, 0);
  assert.equal((await post(ada, '/api/spaces/design', { target: 'home', prompt: '' })).status, 400);
  assert.equal((await post(ada, '/api/spaces/design', { target: 'castle', prompt: 'x' })).status, 400);
});

test('a design: the player’s words reach a paid model fenced, the answer is repaired and priced, nothing is stored', async (t) => {
  const { gateway, life, post, read } = await harness(t);
  const ada = await life('Ada');
  const before = await read(ada);
  const answer = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'small and sweet, a sofa please' });
  assert.equal(answer.ok, true, JSON.stringify(answer));
  assert.equal(answer.code, 'designed');
  assert.equal(gateway.seen.length, 1);
  const messages = gateway.seen[0]!.body['messages'] as { role: string; content: string }[];
  assert.match(messages[1]!.content, /<<<\nsmall and sweet, a sofa please\n>>>/);
  assert.ok(!JSON.stringify(gateway.seen[0]!.body).includes(ada.id), 'never the public id');
  const ids = answer.plan!.items.map((item) => item.itemId);
  assert.ok(!ids.includes('jet-ski' as never));
  assert.ok(answer.problems!.some((p) => p.code === 'unknown_item' && p.itemId === 'jet-ski'));
  assert.ok(answer.problems!.some((p) => p.code === 'moved' && p.itemId === 'plastic-chair'), JSON.stringify(answer.problems));
  assert.equal(answer.plan!.title, 'Small and sweet');
  assert.equal(answer.plan!.notes, undefined);
  assert.ok(typeof answer.cost === 'number');
  assert.deepEqual((await read(ada)).home, before.home, 'a design changes nothing');
});

test('an unreadable answer is asked once more, and twice unreadable is `failed` with words', async (t) => {
  let calls = 0;
  const { gateway, life, post } = await harness(t, { AI_GATEWAY_API_KEY: KEY }, () => ({ reply: calls++ === 0 ? 'Sure! I would love to help.' : GOOD_PLAN }));
  const ada = await life('Ada');
  assert.equal((await post(ada, '/api/spaces/design', { target: 'home', prompt: 'cosy' })).ok, true);
  assert.equal(gateway.seen.length, 2);
  const retry = gateway.seen[1]!.body['messages'] as { role: string; content: string }[];
  assert.match(retry.at(-1)!.content, /could not be used/);
  gateway.plan(() => ({ reply: 'no json here' }));
  const failed = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'cosy' });
  assert.deepEqual([failed.ok, failed.code], [false, 'failed']);
  assert.match(failed.reason ?? '', /could not draw/);
});

test('router refusals become plain words: a provider failing is `failed`, and the hourly cap is per player', async (t) => {
  const { life, post, gateway } = await harness(t, { AI_GATEWAY_API_KEY: KEY }, () => ({ status: 500 }));
  const ada = await life('Ada');
  const failed = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'cosy' });
  assert.equal(failed.ok, false); assert.equal(failed.code, 'failed'); assert.ok(failed.reason);
  gateway.plan(() => ({ reply: GOOD_PLAN }));
  for (let i = 0; i < 9; i++) await post(ada, '/api/spaces/design', { target: 'home', prompt: `room ${i}` });
  const capped = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'one more' });
  assert.deepEqual([capped.ok, capped.code], [false, 'rate']);
  const bola = await life('Bola');
  assert.equal((await post(bola, '/api/spaces/design', { target: 'home', prompt: 'mine' })).ok, true);
});

test('check: a pasted plan is read, fitted and priced without a model; a room plan in a home is refused', async (t) => {
  const { gateway, life, post } = await harness(t, {});
  const ada = await life('Ada');
  const plan = JSON.parse(GOOD_PLAN) as SpacePlanV1;
  const answer = await post(ada, '/api/spaces/check', { target: 'home', plan });
  assert.equal(answer.ok, true); assert.equal(answer.code, 'checked');
  assert.equal(gateway.seen.length, 0);
  assert.equal((await post(ada, '/api/spaces/check', { target: 'home', plan: { ...plan, target: 'room' } })).code, 'wrong_target');
  assert.equal((await post(ada, '/api/spaces/check', { target: 'home', plan: { hello: 1 } })).code, 'invalid_plan');
});

test('apply to a home: buys through the furniture actions, stores what the plan leaves out, and refuses a shortfall leaving the save unchanged', async (t) => {
  const { life, post, edit, read, f } = await harness(t, {});
  const ada = await life('Ada');
  await edit(ada, (state) => { state.location = 'home'; state.cash = 1000; });
  const plan = packPlan({ schema: 'allworld-space', version: 1, target: 'home', style: { roof: 6 }, items: [{ itemId: 'spring-bed', x: 0, y: 0, rot: 0 }, { itemId: 'gold-sofa', x: 2, y: 3, rot: 0 }, { itemId: 'toilet', x: 5, y: 5, rot: 0 }] });
  const before = await read(ada);
  const short = await post(ada, '/api/spaces/apply', { target: 'home', plan, requestId: f.id() });
  assert.deepEqual([short.ok, short.code], [false, 'insufficient_funds']);
  assert.match(short.reason ?? '', /Nothing was bought/);
  const after = await read(ada);
  assert.deepEqual([after.cash, after.home.items, after.home.storage, after.estate.style], [before.cash, before.home.items, before.home.storage, before.estate.style], 'the save is exactly as before');

  await edit(ada, (state) => { state.cash = 500000; });
  const requestId = f.id();
  const done = await post(ada, '/api/spaces/apply', { target: 'home', plan, requestId });
  assert.equal(done.ok, true, JSON.stringify(done));
  assert.equal(done.placed, 3);
  const state = await read(ada);
  assert.deepEqual(state.home.items.map((item) => item.itemId).sort(), ['gold-sofa', 'spring-bed', 'toilet']);
  assert.equal(state.estate.style.roof, 6);
  assert.ok((state.home.storage['plastic-chair'] ?? 0) >= 1, 'the starter pieces the plan left out are in storage, not sold');
  assert.equal(500000 - state.cash, FURNITURE['gold-sofa']!.price + 1500, 'the bed and toilet were reused; the sofa and the gold roof bought');
  const again = await post(ada, '/api/spaces/apply', { target: 'home', plan, requestId });
  assert.equal((again as { duplicate?: boolean }).duplicate, true, 'a repeated request applies once');
  assert.equal((await read(ada)).cash, state.cash);
});

test('apply away from home is refused with words', async (t) => {
  const { life, post, edit, f } = await harness(t, {});
  const ada = await life('Ada');
  await edit(ada, (state) => { state.location = 'market' as never; });
  const answer = await post(ada, '/api/spaces/apply', { target: 'home', plan: packPlan({ schema: 'allworld-space', version: 1, target: 'home', items: [] }), requestId: f.id() });
  assert.deepEqual([answer.ok, answer.code], [false, 'not_home']);
});

test('a group room takes a plan from its members only, in one change', async (t) => {
  const { life, post, f } = await harness(t, {});
  const [ada, bola, chi] = [await life('Ada'), await life('Bola'), await life('Chi')];
  for (const other of [bola]) {
    assert.equal((await post(ada, '/api/social/friends/request', { to: other.id, cityId: 'lagos' })).ok, true);
    assert.equal((await post(other, '/api/social/friends/answer', { from: ada.id, accept: true, cityId: 'lagos' })).ok, true);
  }
  const made = await post(ada, '/api/social/groups', { name: 'Gang', members: [bola.id], clientId: f.id() }) as unknown as Answer & { conv: { id: string } };
  const roomId = made.conv.id;
  const plan = packPlan({ schema: 'allworld-space', version: 1, target: 'room', items: [{ itemId: 'family-sofa', x: 0, y: 0, rot: 0 }, { itemId: 'sound-system', x: 9, y: 0, rot: 0 }, { itemId: 'ludo-board', x: 4, y: 4, rot: 0 }] });
  const outsider = await post(chi, '/api/spaces/apply', { target: 'room', roomId, plan, requestId: f.id() });
  assert.deepEqual([outsider.ok, outsider.code], [false, 'not_member']);
  const done = await post(bola, '/api/spaces/apply', { target: 'room', roomId, plan, requestId: f.id() });
  assert.equal(done.ok, true, JSON.stringify(done));
  const room = await f.server.store.read((db) => structuredClone(db.social?.convs[roomId]?.room));
  assert.equal(room?.rev, 1, 'one change, one revision');
  assert.deepEqual(room?.items.map((item) => item.itemId), ['family-sofa', 'sound-system', 'ludo-board']);
  for (const item of room!.items) assert.match(item.id, /^p[0-9a-z]{8,24}$/);
  const seen = await (await f.request(`/api/places/room?id=${roomId}`, undefined, bola.cookie)).json() as { room: { items: unknown[] } };
  assert.equal(seen.room.items.length, 3, 'the places screen reads the new pieces');
  assert.equal(done.spent, 0, 'room furniture is free');
});

test('every recorded design answer becomes a clean plan through the route', async (t) => {
  const fixtures = JSON.parse((await import('node:fs')).readFileSync(new URL('./spaces/fixtures.json', import.meta.url), 'utf8')) as { target: 'home' | 'room'; tier: string | null; prompt: string; answer: string }[];
  assert.equal(fixtures.length, 12);
  let next = 0;
  const { life, post, edit } = await harness(t, { AI_GATEWAY_API_KEY: KEY }, () => ({ reply: fixtures[next]!.answer }));
  const homes = fixtures.filter((fixture) => fixture.target === 'home');
  for (const [index, fixture] of fixtures.entries()) {
    if (fixture.target === 'room') continue;
    next = index;
    const who = await life(`Tunde ${"abcdefghijkl"[index]}`);
    await edit(who, (state) => { state.cash = 5000000; if (fixture.tier !== 'starter') { state.estate.living = 'own'; state.estate.tier = fixture.tier as never; } });
    const answer = await post(who, '/api/spaces/design', { target: 'home', prompt: fixture.prompt });
    assert.equal(answer.ok, true, `${fixture.prompt}: ${JSON.stringify(answer).slice(0, 300)}`);
    assert.ok(answer.plan!.items.length >= 4, fixture.prompt);
    assert.ok(!answer.problems!.some((p) => p.code === 'unknown_item'), fixture.prompt);
  }
  assert.ok(homes.length >= 8);
});

test('keep what I have: the pieces standing stay put and the designer only adds', async (t) => {
  const brief = JSON.stringify({ title: 'More', rooms: [{ room: 'Room', items: ['bookshelf', 'potted-plant'] }] });
  const { life, post, read, gateway } = await harness(t, { AI_GATEWAY_API_KEY: KEY }, () => ({ reply: brief }));
  const ada = await life('Ada');
  const before = await read(ada);
  const answer = await post(ada, '/api/spaces/design', { target: 'home', prompt: 'add books and a plant', keep: true });
  assert.equal(answer.ok, true, JSON.stringify(answer));
  const messages = gateway.seen[0]!.body['messages'] as { content: string }[];
  assert.match(messages[1]!.content, /stay where they are/);
  for (const item of before.home.items) assert.ok(answer.plan!.items.some((got) => got.itemId === item.itemId && got.x === item.x && got.y === item.y), `${item.itemId} stays`);
  assert.equal(answer.plan!.items.length, before.home.items.length + 2);
});

test('share my place: the card says the applied title; a player with no designed home has nothing to share; erasure forgets it', async (t) => {
  const { life, post, edit, f } = await harness(t, {});
  const [ada, bola] = [await life('Ada'), await life('Bola')];
  await edit(ada, (state) => { state.location = 'home'; state.cash = 500000; });
  const plan = packPlan({ schema: 'allworld-space', version: 1, target: 'home', title: 'Mama Ada’s reading room', items: [{ itemId: 'bookshelf', x: 0, y: 2, rot: 0 }] });
  assert.equal((await post(ada, '/api/spaces/apply', { target: 'home', plan, requestId: f.id() })).ok, true);
  const shared = await post(ada, '/api/growth/share', { kind: 'space', cityId: 'lagos' }) as unknown as Answer & { share: { path: string; facts: { kind: string; headline: string } } };
  assert.equal(shared.ok, true, JSON.stringify(shared));
  assert.deepEqual([shared.share.facts.kind, shared.share.facts.headline], ['space', 'Mama Ada’s reading room']);
  const page = await (await fetch(`${f.base}${shared.share.path}`)).text();
  assert.match(page, /Ada’s place in/);
  assert.match(page, /join=/, 'a visitor lands with the sharer, as a house card does');
  const none = await post(bola, '/api/growth/share', { kind: 'space', cityId: 'lagos' });
  assert.deepEqual([none.ok, none.code], [false, 'nothing_to_share']);
  // A title that fails the filters on the way back is not kept.
  const rude = packPlan({ schema: 'allworld-space', version: 1, target: 'home', title: 'call 08031234567 now', items: [{ itemId: 'bookshelf', x: 0, y: 2, rot: 0 }] });
  assert.equal((await post(ada, '/api/spaces/apply', { target: 'home', plan: rude, requestId: f.id() })).ok, true);
  assert.equal(await f.server.store.read((db) => homeTitleOf(db, ada.id)), '');
  await f.server.store.transact((db) => { spacesOf(db).homes[ada.id] = { title: 'x', at: 1 }; assert.equal(eraseSpaces(db, [ada.id, bola.id]), 1); });
  assert.equal(await f.server.store.read((db) => homeTitleOf(db, ada.id)), '');
});
