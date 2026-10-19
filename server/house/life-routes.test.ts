// OWNER: agents — the Phase 3 routes on a real server (server/house/life-routes.ts, the feed lines for the AI cast): following a house agent in the feed, Spot the AI
// (adults only to opt in, the anti-forgery token, an AI agent's key refused), the landlord, boss and rival of a real life, and the memory download.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from '../agents/test-world.ts';
import type { Json } from '../agents/test-world.ts';
import * as memory from './memory.ts';

const AGENT = 'house.lagos.tolani';
const ctx = { collection: (db: object, name: string, init: unknown) => ((db as Record<string, unknown>)[name] ??= init) } as unknown as Parameters<typeof memory.touch>[0];

test('the AI cast in the feed, Spot the AI, the landlord, boss and rival, and the memory download, through the real routes', async (t) => {
  const w = await world(t);
  const ada = await w.guest('Ada'), kid = await w.guest('Kid');
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, ada.cookie);
  await w.json('/api/growth/consent', { cityId: 'lagos', age: 'minor' }, kid.cookie);

  // A house agent has a feed profile, labelled AI-played, that anyone may follow.
  const profile = await w.json(`/api/feed/profile?id=${AGENT}`, undefined, ada.cookie) as unknown as Json & { profile: { ai?: boolean; followable: boolean; name: string } };
  assert.equal(profile.status, 200, JSON.stringify(profile));
  assert.deepEqual([profile.profile.ai, profile.profile.followable, profile.profile.name], [true, true, 'Mama Tolani']);
  const followed = await w.post('/api/feed/follow', { id: AGENT, on: true }, ada.cookie) as unknown as Json & { profile: { following: boolean } };
  assert.equal(followed.profile.following, true, JSON.stringify(followed));
  const kidFollows = await w.post('/api/feed/follow', { id: AGENT, on: true }, kid.cookie) as unknown as Json & { profile?: { following: boolean } };
  assert.equal(kidFollows.profile?.following, true, 'anyone may follow an AI character, as before for agent characters');

  // Spot the AI.
  const spot = await w.json('/api/agents/spot', undefined, ada.cookie) as unknown as Json & { state: string; opted: boolean; adult: boolean };
  assert.deepEqual([spot.status, spot.state, spot.opted, spot.adult], [200, 'not_enough', false, true]);
  assert.equal((await w.json('/api/agents/spot/opt', { on: true }, ada.cookie)).status, 403, 'the anti-forgery token is needed');
  assert.equal((await w.post('/api/agents/spot/opt', { on: true }, kid.cookie)).status, 403, 'adults only');
  const opted = await w.post('/api/agents/spot/opt', { on: true }, ada.cookie);
  assert.equal(opted.status, 200, JSON.stringify(opted));
  assert.equal((await w.json('/api/agents/spot', undefined, ada.cookie) as unknown as Json & { opted: boolean }).opted, true);
  assert.equal((await w.post('/api/agents/spot/guess', { ai: [] }, ada.cookie)).status, 409, 'no game this week yet');
  assert.equal((await w.post('/api/agents/spot/guess', { ai: 'all' }, ada.cookie)).status, 400);

  // The landlord, boss and rival of Ada's life in Lagos.
  const roles = await w.json('/api/agents/roles?city=lagos', undefined, ada.cookie) as unknown as Json & { roles: { role: string; name: string; line: string }[] };
  assert.equal(roles.status, 200, JSON.stringify(roles));
  assert.deepEqual(roles.roles.map((role) => role.role), ['landlord', 'boss', 'rival']);
  for (const role of roles.roles) assert.ok(role.name && role.line.length > 5);
  assert.equal((await w.json('/api/agents/roles?city=atlantis', undefined, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/roles/ask', { city: 'lagos', what: 'lower' }, ada.cookie)).error, 'no_house', 'no room rented yet');
  // Ada rents a room and is behind: she asks for time; nothing in her life changes but the landlord's memory of the promise.
  await w.change((db) => { const state = Object.values(db.sessions).find((s) => s.publicId === ada.id)!.cities.lagos!.state as unknown as { economy: { rent: Record<string, unknown> }; cash: number }; state.economy.rent = { ...state.economy.rent, house: 'yaba', arrears: 6600, missed: 1 }; });
  const cash = await w.stored((db) => (Object.values(db.sessions).find((s) => s.publicId === ada.id)!.cities.lagos!.state as unknown as { cash: number }).cash);
  const time = await w.post('/api/agents/roles/ask', { city: 'lagos', what: 'time' }, ada.cookie) as unknown as Json & { promise: boolean; line: string };
  assert.deepEqual([time.status, time.promise], [200, true], JSON.stringify(time));
  assert.equal(await w.stored((db) => (Object.values(db.sessions).find((s) => s.publicId === ada.id)!.cities.lagos!.state as unknown as { cash: number }).cash), cash, 'no money moved');
  const after = await w.json('/api/agents/roles?city=lagos', undefined, ada.cookie) as unknown as Json & { rent: { arrears: number; promise: boolean; canAskTime: boolean } };
  assert.deepEqual([after.rent.arrears, after.rent.promise, after.rent.canAskTime], [6600, true, false]);
  assert.equal((await w.post('/api/agents/roles/ask', { city: 'lagos', what: 'free money' }, ada.cookie)).status, 400);

  // The memory download: Ada's own, as a file.
  const now = w.f.now();
  await w.change((db) => { memory.remember(ctx, db, ada.id, AGENT, ['likes football'], now); });
  const file = await w.call('/api/agents/memory/export', undefined, ada.cookie);
  assert.equal(file.status, 200);
  const kept = await file.json() as { file: string; players: { player: string; characters: { agent: string; facts: string[] }[] }[] };
  assert.equal(kept.file, 'allworld-ai-memory.json');
  assert.deepEqual(kept.players.map((entry) => [entry.player, entry.characters.map((item) => item.facts)]), [[ada.id, [['likes football']]]]);
  const theirs = await (await w.call('/api/agents/memory/export', undefined, kid.cookie)).json() as { players: unknown[] };
  assert.deepEqual(theirs.players, [], 'only your own');
});
