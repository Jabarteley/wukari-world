import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the location badge (docs/FEED.md): optional, adults only, a city and never a position, the network's country as a
// second word, 90 days; and communities kept for people confirmed in their city, state or country.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { LOCATED } from '../src/feed/model.ts';

type Json = Record<string, any>;
async function setup(t: Parameters<typeof fixture>[0]) {
  const f = await fixture(t, {});
  const send = async (path: string, body: unknown, who?: Device, headers: Record<string, string> = {}): Promise<Json> => { const res = await fetch(f.base + path, { method: body === null ? 'GET' : 'POST', headers: { ...(body === null ? {} : { 'Content-Type': 'application/json' }), ...(who ? { Cookie: who.cookie } : {}), ...headers }, ...(body === null ? {} : { body: JSON.stringify(body) }) }); return { status: res.status, ...((await res.json()) as Json) }; };
  const get = (path: string, who?: Device) => send(path, null, who), post = (path: string, body: unknown, who?: Device, headers?: Record<string, string>) => send(path, body, who, headers);
  async function player(name: string, { adult = true }: { adult?: boolean } = {}): Promise<Device> {
    const who = await f.device(name);
    await f.request('/api/life?city=lagos', null, who.cookie);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await post('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, who);
    await get('/api/social/me', who);
    return who;
  }
  return { f, get, post, player };
}

test('location badge: a city and the network\'s word, shown on the profile and posts, removable, gone after 90 days; adults only', async (t) => {
  const { f, get, post, player } = await setup(t);
  const kid = await player('Kiddo', { adult: false });
  assert.equal((await post('/api/feed/located', { city: 'lagos' }, kid)).code, 'adults_only');
  const ada = await player('Ada'), bola = await player('Bola');
  assert.equal((await post('/api/feed/located', { city: 'atlantis' }, ada)).code, 'unknown_city');
  const on = await post('/api/feed/located', { city: 'lagos' }, ada, { 'cf-ipcountry': 'NG' });
  assert.deepEqual(on.profile.located, { city: 'lagos', name: 'Lagos', net: true });
  const abroad = await post('/api/feed/located', { city: 'lagos', lat: 6.5, lon: 3.3 }, ada, { 'cf-ipcountry': 'GB' });
  assert.deepEqual(abroad.profile.located, { city: 'lagos', name: 'Lagos' }, 'the network said another country: device only');
  const stored = await f.server.store.read((db) => JSON.stringify((db as Record<string, unknown>).feed));
  assert.equal(/6\.5|3\.3|lat|lon/.test(stored), false, 'nothing like a position is kept, even if a client sends one');
  await post('/api/feed/post', { body: 'Hello from the island' }, ada);
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, bola)).profile.located.name, 'Lagos');
  assert.equal((await get('/api/feed/list?tab=world', bola)).posts.find((p: Json) => p.by.id === ada.id).by.located.city, 'lagos');
  for (let i = 0; i < LOCATED.perDay - 2; i++) await post('/api/feed/located', { city: 'lagos' }, ada);
  assert.equal((await post('/api/feed/located', { city: 'lagos' }, ada)).code, 'daily_limit');
  f.advance((LOCATED.days + 1) * 86400000);
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, bola)).profile?.located, undefined, 'expired');
  const again = await player('Chidi');
  await post('/api/feed/located', { city: 'lagos' }, again);
  assert.equal((await post('/api/feed/located', { on: false }, again)).profile.located, undefined);
});

test('locals only: a community of a real place admits people whose badge is in its city, state or country', async (t) => {
  const { post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  assert.equal((await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', open: true, locals: 'city' }, ada)).code, 'badge_needed', 'the founder needs a badge there too');
  await post('/api/feed/located', { city: 'lagos' }, ada);
  const made = await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', open: true, locals: 'city' }, ada);
  assert.equal(made.crew.locals, 'city');
  assert.equal(made.crew.qualifies, true);
  const refused = await post('/api/feed/crews/join', { id: made.crew.id }, bola);
  assert.equal(refused.code, 'locals_only');
  assert.match(refused.reason, /Lagos/);
  await post('/api/feed/located', { city: 'lagos' }, bola);
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, bola)).crew.mine, true);
  // Another Lagos-state or Nigerian badge: the founder widens it to the country.
  assert.equal((await post('/api/feed/located', { city: 'ibadan' }, chidi)).profile?.located?.city, 'ibadan', 'badge set');
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, chidi)).code, 'locals_only');
  assert.equal((await post('/api/feed/crews/locals', { id: made.crew.id, locals: 'country' }, bola)).code, 'not_owner');
  assert.equal((await post('/api/feed/crews/locals', { id: made.crew.id, locals: 'country' }, ada)).crew.locals, 'country');
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, chidi)).crew.mine, true);
  assert.equal((await post('/api/feed/crews/locals', { id: made.crew.id, locals: 'all' }, ada)).crew.locals, undefined, 'open to all again');
  const imagined = await post('/api/feed/crews', { name: 'New Eko', kind: 'city', placeName: 'New Eko', open: true, locals: 'city' }, ada);
  assert.equal(imagined.crew.locals, undefined, 'an imagined place has no locals');
});
