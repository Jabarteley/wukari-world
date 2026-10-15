// Opt-in birthdays (docs/SMALLER-FEATURES.md): the date rules, what a friend may see and when, and that nothing is public.
import { loadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(loadCityContent));
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { isToday, readBirthday, todayIn, validDate, viewOf } from './stages/birthday.ts';

const at = (y: number, m: number, d: number, h = 12) => Date.UTC(y, m - 1, d, h);

test('dates that exist, and today in Lagos', () => {
  assert.equal(validDate(2, 29), true); assert.equal(validDate(2, 30), false); assert.equal(validDate(13, 1), false); assert.equal(validDate(4, 31), false); assert.equal(validDate(1.5, 1), false); assert.equal(validDate('1', 1), false);
  assert.deepEqual(todayIn(at(2026, 10, 15)), { y: 2026, m: 10, d: 15 });
  assert.deepEqual(todayIn(at(2026, 10, 15, 23) + 30 * 60000), { y: 2026, m: 10, d: 16 }, 'Lagos is an hour ahead of UTC');
  assert.equal(isToday({ m: 10, d: 15 }, at(2026, 10, 15)), true);
  assert.equal(isToday({ m: 10, d: 14 }, at(2026, 10, 15)), false);
  assert.equal(isToday({ m: 2, d: 29 }, at(2027, 2, 28)), true, '29 February is kept on 28 February in a year without one');
  assert.equal(isToday({ m: 2, d: 29 }, at(2028, 2, 28)), false);
  assert.equal(isToday({ m: 2, d: 29 }, at(2028, 2, 29)), true);
  assert.deepEqual(readBirthday({ m: 3, d: 9 }), { m: 3, d: 9, share: false });
  assert.equal(readBirthday({ m: 3, d: 99 }), null);
});
test('a friend is named only when they share, and only on the day', () => {
  const stages = { v: 1 as const, birthdays: { ada: { m: 10, d: 15, share: true }, bola: { m: 10, d: 15, share: false }, chi: { m: 10, d: 16, share: true } } };
  const friends = [{ id: 'ada', name: 'Ada' }, { id: 'bola', name: 'Bola' }, { id: 'chi', name: 'Chi' }, { id: 'dayo', name: 'Dayo' }];
  assert.deepEqual(viewOf(stages, 'me', friends, at(2026, 10, 15)), { mine: null, today: false, friends: ['Ada'] });
  assert.equal(viewOf({ ...stages, birthdays: { ...stages.birthdays, me: { m: 10, d: 15, share: false } } }, 'me', [], at(2026, 10, 15)).today, true);
});

type Fixture = Awaited<ReturnType<typeof fixture>>;
const body = async (res: Response): Promise<Record<string, any>> => ({ status: res.status, ...((await res.json()) as object) });
const get = async (f: Fixture, path: string, who?: Device) => body(await f.request(path, null, who?.cookie));
const post = async (f: Fixture, path: string, data: unknown, who?: Device) => body(await f.request(path, data, who?.cookie));

test('the routes: your own choice, a friend who shares, nothing for a stranger, nothing in the gist', async (t) => {
  const f = await fixture(t);
  const [ada, bola, chi] = [await f.device('Ada'), await f.device('Bola'), await f.device('Chi')];
  for (const who of [ada, bola, chi]) await get(f, '/api/social/me', who);
  assert.equal((await get(f, '/api/world/birthday')).status, 401, 'a session is needed');
  const today = todayIn(f.now());
  assert.deepEqual(await get(f, '/api/world/birthday', ada).then((r) => [r.mine, r.today, r.friends]), [null, false, []]);
  assert.equal((await post(f, '/api/world/birthday', { m: 2, d: 30 }, ada)).code ?? (await post(f, '/api/world/birthday', { m: 2, d: 30 }, ada)).error, 'invalid_date');
  // Bola shares today; Chi sets it today but keeps it private.
  assert.equal((await post(f, '/api/world/birthday', { m: today.m, d: today.d, share: true }, bola)).today, true);
  assert.equal((await post(f, '/api/world/birthday', { m: today.m, d: today.d }, chi)).mine?.share, false);
  // Ada and Bola become friends; Ada sees Bola by name, not Chi (not a friend, and private).
  assert.equal((await post(f, '/api/social/friends/request', { to: bola.id, cityId: 'lagos' }, ada)).code, 'requested');
  assert.equal((await post(f, '/api/social/friends/answer', { from: ada.id, accept: true, cityId: 'lagos' }, bola)).code, 'accepted');
  assert.deepEqual((await get(f, '/api/world/birthday', ada)).friends, ['Bola']);
  assert.deepEqual((await get(f, '/api/world/birthday', chi)).friends, [], 'a stranger sees no one');
  // Taking it back removes it everywhere.
  assert.deepEqual((await post(f, '/api/world/birthday', { clear: true }, bola)).mine, null);
  assert.deepEqual((await get(f, '/api/world/birthday', ada)).friends, []);
  assert.deepEqual((await get(f, '/api/world/gist?id=lagos')).items, [], 'nothing about a birthday is public');
});
