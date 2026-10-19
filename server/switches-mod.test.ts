import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the operator's switches (server/routes/switches-mod.ts): the token is required, only the listed settings move, only to
// true or false, and an Allworld House season can be started.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { settingsOf } from './admin/settings.ts';

const TOKEN = 'operator-token-for-the-switches-test-0123456789';
test('operator switches: token only, listed settings only, booleans only; the house season starts', async (t) => {
  const f = await fixture(t, { moderatorToken: TOKEN });
  const post = async (path: string, body: unknown, token: string | null = TOKEN) => { const res = await fetch(f.base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }); return { status: res.status, body: await res.json() as Record<string, unknown> }; };
  assert.notEqual((await post('/api/mod/switches', { nysc: true }, null)).status, 200, 'no token, no change');
  assert.notEqual((await post('/api/mod/switches', { nysc: true }, 'wrong-token-0000000000000000000000000000')).status, 200);
  assert.equal((await post('/api/mod/switches', { nysc: 'yes' })).status, 400, 'booleans only');
  assert.equal((await post('/api/mod/switches', { dettyPreview: true })).status, 400, 'the Detty preview is not on this list');
  const on = await post('/api/mod/switches', { nysc: true, jamb: true, story: true, spacesAi: true });
  assert.equal(on.status, 200);
  assert.deepEqual([on.body.nysc, on.body.jamb, on.body.story, on.body.spacesAi], [true, true, true, true]);
  const values = await f.server.store.read((db) => settingsOf(f.server.context).list(db) as unknown as { key: string; value: unknown }[]);
  for (const key of ['nyscOn', 'jambOn', 'storyMode', 'spacesAi']) assert.equal(values.find((row) => row.key === key)?.value, true, key);
  const house = await post('/api/mod/switches/house', { now: true });
  assert.equal(house.status, 200);
  assert.ok(house.body.ok === true || house.body.code === 'too_few', JSON.stringify(house.body));
});
