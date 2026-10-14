// OWNER: agents — the person's own controls over what house agents remember (server/house/memory-routes.ts), through the real routes: see, delete one or all,
// turn off for one agent or for all, partner for confirmed adults only, only your own record, and the same guards as the other agent routes.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from '../agents/test-world.ts';
import type { Json } from '../agents/test-world.ts';
import * as memory from './memory.ts';

const AGENT = 'house.lagos.tolani';
const ctx = { collection: (db: object, name: string, init: unknown) => ((db as Record<string, unknown>)[name] ??= init) } as unknown as Parameters<typeof memory.touch>[0];
type Card = { id: string; name: string; remembering: boolean; facts: string[]; standing: { points: number; label: string }; partner: boolean; canPartner: boolean };
type View = Json & { remembering: boolean; adult: boolean; agents: Card[] };

test('you see what an agent remembers about you, delete one or all, turn it off for one agent or all; nobody else sees it', async (t) => {
  const w = await world(t);
  const ada = await w.guest('Ada'), ben = await w.guest('Ben');
  const view = async (who: { cookie: string }): Promise<View> => await w.json('/api/agents/memory', undefined, who.cookie) as unknown as View;
  assert.deepEqual((await view(ada)).agents, []);
  const now = w.f.now();
  await w.change((db) => { memory.remember(ctx, db, ada.id, AGENT, ['likes football', 'is a tailor'], now); memory.touch(ctx, db, ada.id, AGENT, 5, now, false); });
  const first = await view(ada);
  assert.deepEqual([first.remembering, first.agents.length, first.agents[0]?.name, first.agents[0]?.facts, first.agents[0]?.standing.label], [true, 1, 'Mama Tolani', ['likes football', 'is a tailor'], 'Acquaintance']);
  assert.deepEqual((await view(ben)).agents, [], 'another person sees nothing of it');
  // Writes need the session's anti-forgery token.
  assert.equal((await w.json('/api/agents/memory/forget', { agent: AGENT }, ada.cookie)).status, 403);
  // Delete one fact.
  const one = await w.post('/api/agents/memory/forget', { agent: AGENT, fact: 'likes football' }, ada.cookie);
  assert.equal(one.status, 200, JSON.stringify(one));
  assert.deepEqual((await view(ada)).agents[0]?.facts, ['is a tailor']);
  // Off for this agent: its facts are deleted at once from the stored data.
  assert.equal((await w.post('/api/agents/memory/remember', { agent: AGENT, on: false }, ada.cookie)).status, 200);
  const off = await view(ada);
  assert.deepEqual([off.agents[0]?.remembering, off.agents[0]?.facts], [false, []]);
  assert.ok(!JSON.stringify(await w.stored((db) => (db as unknown as Record<string, unknown>)['agentMemory'])).includes('tailor'));
  assert.equal((await w.post('/api/agents/memory/remember', { agent: AGENT, on: true }, ada.cookie)).status, 200);
  // Off for all (Settings).
  await w.change((db) => { memory.remember(ctx, db, ada.id, AGENT, ['likes music'], now); });
  assert.equal((await w.post('/api/agents/memory/remember', { on: false }, ada.cookie)).status, 200);
  const none = await view(ada);
  assert.deepEqual([none.remembering, none.agents[0]?.facts], [false, []]);
  assert.equal((await w.post('/api/agents/memory/remember', { on: true }, ada.cookie)).status, 200);
  // Delete everything.
  await w.change((db) => { memory.remember(ctx, db, ada.id, AGENT, ['likes music'], now); });
  const gone = await w.post('/api/agents/memory/forget', {}, ada.cookie);
  assert.equal(gone.deleted, 1);
  assert.deepEqual((await view(ada)).agents, []);
  // Bad input.
  assert.equal((await w.post('/api/agents/memory/forget', { agent: 'house.lagos.nobody' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/memory/forget', { agent: ben.id }, ada.cookie)).status, 400, 'only house agents can be named, never a person');
  assert.equal((await w.post('/api/agents/memory/remember', { agent: AGENT, on: 'yes' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/memory/forget', { fact: 'likes music' }, ada.cookie)).status, 400, 'a fact needs its agent');
});

test('a partner: refused for under 18 and for an unknown age, allowed for a confirmed adult who is close enough, and the person can end it', async (t) => {
  const w = await world(t);
  const ada = await w.guest('Ada'), kemi = await w.guest('Kemi');
  const now = w.f.now();
  const seed = (id: string, points: number): Promise<void> => w.change((db) => { memory.touch(ctx, db, id, AGENT, 0, now, false); (db as unknown as { agentMemory: memory.MemoryCollection }).agentMemory.people[id]!.a[AGENT]!.p = points; });
  await seed(ada.id, 45); await seed(kemi.id, 45);
  const card = async (who: { cookie: string }): Promise<Card> => ((await w.json('/api/agents/memory', undefined, who.cookie)) as unknown as View).agents[0]!;
  const partner = (who: { cookie: string }, on: boolean) => w.post('/api/agents/memory/partner', { agent: AGENT, on }, who.cookie);
  // Age never answered: no.
  const unknown = await partner(ada, true);
  assert.deepEqual([unknown.status, unknown.error], [403, 'adults_only']);
  assert.match(String(unknown.reason), /18 or older/);
  assert.equal((await card(ada)).canPartner, false);
  // Under 18: no.
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'minor' }, ada.cookie);
  assert.equal((await partner(ada, true)).error, 'adults_only');
  assert.equal((await card(ada)).partner, false);
  // An adult who is not close enough yet: no.
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, kemi.cookie);
  await w.change((db) => { (db as unknown as { agentMemory: memory.MemoryCollection }).agentMemory.people[kemi.id]!.a[AGENT]!.p = 10; });
  assert.equal((await partner(kemi, true)).error, 'not_close_enough');
  await w.change((db) => { (db as unknown as { agentMemory: memory.MemoryCollection }).agentMemory.people[kemi.id]!.a[AGENT]!.p = 45; });
  const before = await card(kemi);
  assert.deepEqual([before.canPartner, before.partner], [true, false]);
  assert.equal((await partner(kemi, true)).status, 200);
  const after = await card(kemi);
  assert.deepEqual([after.partner, after.standing.label], [true, 'Partner']);
  // End it: always allowed; closeness stays.
  assert.equal((await partner(kemi, false)).status, 200);
  const ended = await card(kemi);
  assert.deepEqual([ended.partner, ended.standing.points], [false, 45]);
  // A person who said "under 18" after being a partner is no longer shown as one.
  await partner(kemi, true);
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'minor' }, kemi.cookie);
  assert.equal((await card(kemi)).partner, false);
});
