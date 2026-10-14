// OWNER: admin - festivals and match-night fixtures edited without a release (server/admin/festivals.ts, routes/admin.ts, routes/festivals.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { admins, FOUNDER_ADDRESS } from './admin.test.ts';

type Json = Record<string, any>;
const item = { id: 'harvest-fair', name: 'Harvest fair', blurb: 'Stalls, music and food.', countries: ['ng'], start: '2026-11-06', end: '2026-11-09', colours: ['#aa5500', '#ffcc00'], main: { from: 12, to: 16 } };

async function setup(t: Parameters<typeof admins>[0]) {
  const a = await admins(t);
  const founder = await a.account(FOUNDER_ADDRESS, 'Founder'), ada = await a.account('ada@example.com', 'Ada');
  const post = (action: string, body: Json = {}, cookie = founder.cookie) => a.admin('/api/admin/festivals', cookie, { action, ...body });
  const feed = async (city = 'lagos'): Promise<Json> => (await (await fetch(`${a.f.base}/api/world/festivals?city=${city}`)).json()) as Json;
  return { a, founder, ada, post, feed };
}

test('only an admin reads or edits the festival list', async (t) => {
  const { a, ada, post } = await setup(t);
  assert.equal((await a.admin('/api/admin/festivals', ada.cookie)).status, 404);
  assert.equal((await post('festival.save', { item }, ada.cookie)).status, 404);
  assert.equal((await a.admin('/api/admin/festivals', '')).status, 404);
});

test('the admin page lists the built-in festivals with their next run, and what was changed', async (t) => {
  const { a, founder } = await setup(t);
  const page = (await a.admin('/api/admin/festivals', founder.cookie)).body;
  const ids = (page.festivals as Json[]).map((festival) => festival.id);
  for (const id of ['ng-independence', 'eid-fitr', 'christmas', 'ke-jamhuri', 'za-heritage', 'gh-homowo']) assert.ok(ids.includes(id), id);
  assert.ok((page.festivals as Json[]).every((festival) => festival.builtIn === true && festival.hidden === false));
  assert.deepEqual(page.custom, []); assert.deepEqual(page.fixtures, []);
});

test('an added festival and a fixture reach the public feed at once, get an audit line, and can be removed', async (t) => {
  const { a, founder, post, feed } = await setup(t);
  assert.deepEqual((await feed()).fixtures, []);
  const saved = await post('festival.save', { item });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const start = a.f.now() + 2 * 86400000;
  assert.equal((await post('fixture.save', { item: { id: 'derby-1', title: 'Red v Blue', start, minutes: 120, countries: ['ng'] } })).status, 200);
  const open = await feed();
  assert.equal(open.country, 'ng');
  assert.equal(open.extras.festivals[0].id, 'harvest-fair');
  assert.equal(open.extras.festivals[0].rule.start, '2026-11-06');
  assert.equal(open.fixtures[0].title, 'Red v Blue');
  assert.equal(open.now, a.f.now());
  const page = (await a.admin('/api/admin/festivals', founder.cookie)).body;
  assert.equal((page.custom as Json[]).length, 1); assert.equal((page.fixtures as Json[]).length, 1);
  const lines = ((await a.admin('/api/admin/audit?action=festivals', founder.cookie)).body.lines ?? (await a.admin('/api/admin/audit?action=festivals', founder.cookie)).body.items) as Json[] | undefined;
  assert.ok(Array.isArray(lines) && lines.length === 2, JSON.stringify(lines));
  assert.equal((await post('fixture.remove', { id: 'derby-1' })).status, 200);
  assert.equal((await post('festival.remove', { id: 'harvest-fair' })).status, 200);
  const empty = await feed();
  assert.deepEqual(empty.fixtures, []); assert.deepEqual(empty.extras.festivals, []);
});

test('saving again with the same id changes it; a built-in id replaces the built-in festival; hide and show work', async (t) => {
  const { a, founder, post, feed } = await setup(t);
  await post('festival.save', { item });
  await post('festival.save', { item: { ...item, name: 'Harvest fair 2' } });
  assert.equal((await feed()).extras.festivals.length, 1);
  assert.equal((await feed()).extras.festivals[0].name, 'Harvest fair 2');
  assert.equal((await post('festival.save', { item: { ...item, id: 'eid-fitr', name: 'Eid al-Fitr', start: '2027-03-10', end: '2027-03-12', focal: '2027-03-11' } })).status, 200);
  const page = (await a.admin('/api/admin/festivals', founder.cookie)).body;
  const eid = (page.festivals as Json[]).find((festival) => festival.id === 'eid-fitr')!;
  assert.equal(eid.replaced, true); assert.equal(eid.next.focal, '2027-03-11');
  assert.equal((await post('hide', { id: 'ng-independence' })).status, 200);
  assert.deepEqual((await feed()).extras.hidden, ['ng-independence']);
  assert.equal((await post('hide', { id: 'no-such-festival' })).body.error, 'unknown_festival');
  assert.equal((await post('show', { id: 'ng-independence' })).status, 200);
  assert.deepEqual((await feed()).extras.hidden, []);
});

test('bad input is refused with a reason and stores nothing: short runs, links, streams, scores, past times, unknown actions', async (t) => {
  const { a, founder, post, feed } = await setup(t);
  for (const bad of [{ ...item, end: '2026-11-07' }, { ...item, blurb: 'See https://example.com' }, { ...item, colours: ['red', 'blue'] }, { ...item, id: 'No Good' }]) assert.equal((await post('festival.save', { item: bad })).body.error, 'invalid_festival', JSON.stringify(bad));
  const fixture = { id: 'derby-1', title: 'Red v Blue', start: a.f.now() + 86400000, minutes: 120 };
  for (const bad of [{ ...fixture, title: 'Red v Blue live stream' }, { ...fixture, title: 'Red v Blue http://x.y' }, { ...fixture, start: a.f.now() - 9 * 86400000 }, { ...fixture, minutes: 5 }]) assert.equal((await post('fixture.save', { item: bad })).body.error, 'invalid_fixture', JSON.stringify(bad));
  assert.equal((await post('explode')).body.error, 'invalid_action');
  assert.equal((await post('festival.remove', { id: 'harvest-fair' })).body.error, 'unknown_festival');
  assert.equal((await post('fixture.remove', { id: 'derby-1' })).body.error, 'unknown_fixture');
  const page = (await a.admin('/api/admin/festivals', founder.cookie)).body;
  assert.deepEqual(page.custom, []); assert.deepEqual(page.fixtures, []);
  assert.deepEqual((await feed()).fixtures, []);
});

test('the public feed needs a known city and tells each city its country', async (t) => {
  const { a, feed } = await setup(t);
  assert.equal((await fetch(`${a.f.base}/api/world/festivals?city=nowhere`)).status, 400);
  assert.equal((await fetch(`${a.f.base}/api/world/festivals`)).status, 400);
  assert.equal((await feed('lagos')).country, 'ng');
});
