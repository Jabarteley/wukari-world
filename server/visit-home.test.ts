// What a guest is shown of the home they are visiting (GET /api/social/visit/home, server/social/visit.ts homeProjection): the
// host's furniture as it stands, in a house of their own or a rented home, updated when the host changes it; nothing for
// somebody who is not inside.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';

type Fixture = Awaited<ReturnType<typeof fixture>>;
interface HomeReply { status: number; ok?: boolean; code?: string; reason?: string; home?: { host: { id: string }; grid: number; items: { id: string; itemId: string; x: number; y: number }[]; achievement?: string } }
const get = async (f: Fixture, path: string, who: Device): Promise<HomeReply> => { const res = await f.request(path, null, who.cookie); return { status: res.status, ...(await res.json() as object) }; };
const post = async (f: Fixture, path: string, body: object, who: Device): Promise<{ code?: string; reason?: string }> => (await f.request(path, body, who.cookie)).json() as Promise<{ code?: string }>;

test('a guest sees the furniture of the home they are in, a rented one too, and sees the host change it', async (t) => {
  const f = await fixture(t);
  const host = await f.device('Host'), guest = await f.device('Guest'), other = await f.device('Other');
  for (const who of [host, guest, other]) { await get(f, '/api/life?city=lagos', who); await get(f, '/api/social/me', who); }
  // The host lives in a rented home (the older settle-in), and is at home with a socket in their Home room.
  await f.action(host.cookie, { type: 'travel', id: 'home', mode: 'trek' });
  f.advance(20000);
  const h = await f.socket(host);
  h.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'home' }));
  await h.next();
  assert.equal((await get(f, `/api/social/visit/home?host=${host.id}`, guest)).code, 'visit_required', 'nobody sees a home they are not inside');
  assert.equal((await post(f, '/api/social/house/knock', { host: host.id, cityId: 'lagos' }, guest)).code, 'knocking');
  assert.equal((await post(f, '/api/social/house/answer', { visitor: guest.id, answer: 'accept' }, host)).code, 'accepted');

  const before = await get(f, `/api/social/visit/home?host=${host.id}`, guest);
  assert.equal(before.code, 'home', before.reason);
  assert.ok((before.home?.items.length ?? 0) > 0, 'the host’s furniture is in what the guest is shown');
  // The host buys a piece and puts it on the first free tile: the guest's next look has it.
  let bought = false;
  for (let y = 0; y < (before.home?.grid ?? 6) && !bought; y++) for (let x = 0; x < (before.home?.grid ?? 6) && !bought; x++) {
    const done = await f.action(host.cookie, { type: 'home.furniture-buy', payload: { item: 'potted-plant', x, y, rot: 0 } });
    bought = done.ok === true;
  }
  assert.ok(bought, 'the host could place a plant');
  assert.equal((await f.action(host.cookie, { type: 'achievements.display', payload: { id: 'home-maker' } })).code, 'displayed');
  const after = await get(f, `/api/social/visit/home?host=${host.id}`, guest);
  assert.equal(after.home?.items.length, (before.home?.items.length ?? 0) + 1);
  assert.ok(after.home?.items.some((item) => item.itemId === 'potted-plant'));
  assert.equal(after.home?.achievement, 'home-maker', 'an accepted guest sees the chosen earned plaque');
  assert.equal(Object.hasOwn(after.home ?? {}, 'achievements'), false, 'private progress and provenance stay out of the visit projection');
  assert.equal((await f.action(host.cookie, { type: 'achievements.display', payload: { id: null } })).code, 'cleared');
  assert.equal((await get(f, `/api/social/visit/home?host=${host.id}`, guest)).home?.achievement, undefined);
  assert.equal((await get(f, `/api/social/visit/home?host=${host.id}`, other)).code, 'visit_required');
});
