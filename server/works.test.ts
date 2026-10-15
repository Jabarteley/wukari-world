// City works (docs/SMALLER-FEATURES.md): funding with game money, the head of the city choosing the order, the gist line, old data untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCityContent } from '../src/game/cities/registry.ts';
import { QUORUM } from '../src/game/content/politics.ts';
import { harness, object } from './testing/politicsHarness.ts';
import { DAILY_MAX, GIVE_MAX, WORKS, activeOf, cityWorks, giveBlock, orderBlock, orderOf, viewOf } from './works/works.ts';
import type { WorksCollection } from './works/works.ts';

await Promise.all(['lagos', 'ibadan'].map(loadCityContent));

test('the rules: order, the active work, limits', () => {
  const works = cityWorks({ v: 1, cities: {} } as WorksCollection, 'lagos');
  assert.deepEqual(orderOf(works), ['clinic', 'market-roof', 'pitch']);
  works.order = ['pitch', 'pitch', 'nope' as 'clinic'];
  assert.deepEqual(orderOf(works), ['pitch', 'clinic', 'market-roof']);
  assert.equal(activeOf(works)?.id, 'pitch');
  assert.equal(giveBlock(works, 99, 0)?.code, 'amount_too_small');
  assert.equal(giveBlock(works, GIVE_MAX + 1, 0)?.code, 'amount_too_large');
  assert.equal(giveBlock(works, 1.5, 0)?.code, 'invalid_amount');
  assert.equal(giveBlock(works, 500, DAILY_MAX)?.code, 'daily_limit');
  assert.equal(giveBlock(works, 500, 0), null);
  assert.equal(orderBlock(['clinic', 'clinic'])?.code, 'invalid_order');
  assert.equal(orderBlock([])?.code, 'invalid_order');
  assert.equal(orderBlock(['pitch', 'clinic']), null);
  assert.equal(viewOf('lagos', works).active?.cost, WORKS[2]!.cost);
});

test('residents fund the active work, the head of the city chooses the order, a finished work is in the gist', { timeout: 60000 }, async (t) => {
  const { f, post, get, player, elect, edit } = await harness(t);
  const ada = await player('Ada'), bola = await player('Bola'), mayor = await player('Mayor');
  await get('/api/civic/pulse?city=lagos', mayor); await post('/api/civic/pulse', {}, mayor);
  await elect(mayor, 'city:lagos', QUORUM.city);

  const empty = await get('/api/world/works?id=lagos');
  assert.equal(object(empty.active).id, 'clinic'); assert.deepEqual(empty.done, []);
  assert.equal(object(object((await get('/api/world/works?id=lagos', mayor)).you)).canOrder, true);
  assert.equal(object(object((await get('/api/world/works?id=lagos', ada)).you)).canOrder, false);

  // Only the head chooses the order.
  assert.equal((await post('/api/civic/works/order', { cityId: 'lagos', order: ['pitch'], requestId: f.id() }, ada)).code, 'not_in_office');
  assert.equal((await post('/api/civic/works/order', { cityId: 'lagos', order: ['pitch', 'pitch'], requestId: f.id() }, mayor)).code, 'invalid_order');
  assert.equal((await post('/api/civic/works/order', { cityId: 'lagos', order: ['pitch'], requestId: f.id() }, mayor)).code, 'ordered');
  assert.equal(object((await get('/api/world/works?id=lagos')).active).id, 'pitch');

  // A gift is game money out of the wallet; it counts once per request id; limits hold.
  const before = (await get('/api/life?city=lagos', ada)).state?.cash ?? 0;
  const id = f.id();
  const first = await post('/api/civic/works/give', { cityId: 'lagos', amount: 1000, requestId: id }, ada);
  assert.equal(first.code, 'given');
  assert.equal((await post('/api/civic/works/give', { cityId: 'lagos', amount: 1000, requestId: id }, ada)).code, 'given', 'a repeat is answered, not charged twice');
  assert.equal(before - ((await get('/api/life?city=lagos', ada)).state?.cash ?? 0), 1000);
  assert.equal(object((await get('/api/world/works?id=lagos')).active).paid, 1000);
  assert.equal((await post('/api/civic/works/give', { cityId: 'lagos', amount: 10, requestId: f.id() }, ada)).code, 'amount_too_small');
  assert.equal((await post('/api/civic/works/give', { cityId: 'lagos', amount: GIVE_MAX + 1, requestId: f.id() }, ada)).code, 'amount_too_large');
  assert.equal((await post('/api/civic/works/give', { cityId: 'lagos', amount: 1000, requestId: f.id() })).status, 401);

  // The last gift is cut to what is left, the work stands, and the gist says so without an amount.
  await edit(bola, (state) => { state.cash = 1_000_000; });
  const cost = WORKS[2]!.cost;
  for (let paid = 1000; paid < cost; paid += 0) {
    const give = Math.min(GIVE_MAX, DAILY_MAX - 0, cost - paid);
    const answer = await post('/api/civic/works/give', { cityId: 'lagos', amount: give, requestId: f.id() }, bola);
    if (answer.code === 'daily_limit') f.advance(24 * 3600000);
    else { assert.equal(answer.code, 'given'); paid += answer.amount ?? 0; }
  }
  const after = await get('/api/world/works?id=lagos');
  assert.equal(object(after.active).id, 'clinic', 'the next work in the order takes gifts now');
  const done = (after.done as Record<string, unknown>[]).map((item) => item.id);
  assert.deepEqual(done, ['pitch']);
  const gist = await get('/api/world/gist?id=lagos');
  console.log(JSON.stringify(gist));
  assert.ok((gist.items as { text: string }[]).some((item) => item.text === 'The football pitch in Lagos is finished.'));
});
