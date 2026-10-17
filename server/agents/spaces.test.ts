import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// The Allworld skill's tools (server/spaces/tools.ts, docs/SKILLS.md): an agent checks a Space Plan against its own home, imports it with its
// own naira through the ordinary furniture actions, is told the shortfall when it cannot pay, and cannot import into a room it is not in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './test-world.ts';
import type { World } from './test-world.ts';
import { FURNITURE } from '../../src/game/content/furniture.ts';
import type { LifeState } from '../../src/types/life.ts';

async function agent(w: World, name: string) {
  const made = await w.signup(name);
  assert.equal(made.ok, true, JSON.stringify(made.data));
  assert.equal((await w.tool(made.key, 'get_my_life')).ok, true);
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === name)?.publicId ?? '');
  return { key: made.key, id };
}
async function edit(w: World, id: string, change: (state: LifeState) => void): Promise<void> {
  await w.f.server.store.transact((db) => { const life = Object.values(db.sessions).find((s) => s.publicId === id)?.cities.lagos; assert.ok(life); change(life.state); });
}
const life = (w: World, id: string) => w.stored((db) => structuredClone(Object.values(db.sessions).find((s) => s.publicId === id)!.cities.lagos!.state));
const PLAN = { schema: 'allworld-space', version: 1, target: 'home', title: 'Agent built this', items: [{ itemId: 'gold-sofa', x: 2, y: 3, rot: 0 }, { itemId: 'jet-ski', x: 0, y: 0, rot: 0 }] };

test('check_space answers the fitted plan and the cost and changes nothing; import_space buys with the character’s naira, or names the shortfall', async (t) => {
  const w = await world(t);
  const bot = await agent(w, 'Robo Builder');
  await edit(w, bot.id, (state) => { state.location = 'home'; state.cash = 1000; if (state.onboarding) state.onboarding.done = true; });
  const before = await life(w, bot.id);
  const checked = await w.tool(bot.key, 'check_space', { target: 'home', plan: PLAN });
  assert.equal(checked.ok, true, JSON.stringify(checked.data));
  const data = checked.data as { plan: { items: { itemId: string }[] }; problems: { code: string }[]; cost: number };
  assert.deepEqual(data.plan.items.map((item) => item.itemId), ['gold-sofa']);
  assert.ok(data.problems.some((p) => p.code === 'unknown_item'));
  assert.equal(data.cost, FURNITURE['gold-sofa']!.price);
  assert.deepEqual((await life(w, bot.id)).home, before.home, 'a check changes nothing');

  const short = await w.tool(bot.key, 'import_space', { target: 'home', plan: PLAN });
  assert.equal(short.ok, false);
  assert.equal((short.data as { code?: string }).code, 'insufficient_funds', JSON.stringify(short.data));
  assert.equal((await life(w, bot.id)).cash, 1000);

  await edit(w, bot.id, (state) => { state.cash = 100000; });
  const done = await w.tool(bot.key, 'import_space', { target: 'home', plan: PLAN });
  assert.equal(done.ok, true, JSON.stringify(done.data));
  const after = await life(w, bot.id);
  assert.equal(after.cash, 100000 - FURNITURE['gold-sofa']!.price);
  assert.deepEqual(after.home.items.map((item) => item.itemId), ['gold-sofa']);
});

test('import_space into a group room needs membership', async (t) => {
  const w = await world(t);
  const bot = await agent(w, 'Robo Roomer');
  const refused = await w.tool(bot.key, 'import_space', { target: 'room', roomId: 'g.1', plan: { ...PLAN, target: 'room' } });
  assert.equal(refused.ok, false);
  assert.equal((refused.data as { code?: string }).code, 'not_member', JSON.stringify(refused.data));
});
