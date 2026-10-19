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

test('near you: a public post of the badge city is listed once, not once per list it is in', async (t) => {
  const { post, get, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  for (const who of [ada, bola]) assert.equal((await post('/api/feed/located', { city: 'lagos' }, who)).profile?.located?.city, 'lagos');
  const made = await post('/api/feed/post', { body: 'Suya at Yaba market tonight', vis: 'public' }, bola);
  assert.equal(made.post?.vis, 'public');
  const page = await get('/api/feed/list?tab=near', ada);
  assert.deepEqual(page.posts.map((p: Json) => p.id), [made.post.id]);
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

test('the badge\'s local government: one of the city\'s own, shown with its name, never a position; a stranger\'s id is refused', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola');
  assert.equal((await post('/api/feed/located', { city: 'lagos', lga: 'atlantis' }, ada)).code, 'unknown_area');
  assert.equal((await post('/api/feed/located', { city: 'lagos', lga: 'dala' }, ada)).code, 'unknown_area', 'a local government of another city');
  const on = await post('/api/feed/located', { city: 'lagos', lga: 'ikeja', lat: 6.6018, lon: 3.3515, accuracy: 25 }, ada);
  assert.deepEqual(on.profile.located, { city: 'lagos', name: 'Lagos', lga: 'ikeja', lgaName: 'Ikeja' });
  const stored = await f.server.store.read((db) => JSON.stringify((db as Record<string, unknown>).feed));
  assert.equal(/6\.60|3\.35|lat|lon|accuracy/.test(stored), false, 'nothing like a position is kept, even if a client sends one');
  assert.match(stored, /"lga":"ikeja"/);
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, bola)).profile.located.lgaName, 'Ikeja');
  const cityOnly = await post('/api/feed/located', { city: 'lagos' }, ada);
  assert.deepEqual(cityOnly.profile.located, { city: 'lagos', name: 'Lagos' }, 'the city alone, when the player chose that');
});

test('Near you: neighbours first, then the city, then the world; this month\'s counts, each person once; without a badge it is the city tab', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi'), dayo = await player('Dayo'), eve = await player('Eve');
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, ada);
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, bola);
  await post('/api/feed/located', { city: 'lagos', lga: 'surulere' }, chidi);
  await post('/api/feed/located', { city: 'ibadan' }, dayo);
  const neighbour = (await post('/api/feed/post', { body: 'Ikeja market is busy today' }, bola)).post.id;
  f.advance(2 * 3600000);
  const cityPost = (await post('/api/feed/post', { body: 'Traffic on the bridge' }, chidi)).post.id;
  f.advance(3600000);
  const latest = (await post('/api/feed/post', { body: 'Hello everyone' }, eve)).post.id;
  const order = (page: Record<string, any>): string[] => page.posts.map((p: Record<string, any>) => p.id).filter((id: string) => [neighbour, cityPost, latest].includes(id));
  assert.deepEqual(order(await get('/api/feed/list?tab=world', ada)), [latest, cityPost, neighbour], 'the world tab: newest first');
  const near = await get('/api/feed/list?tab=near', ada);
  assert.equal(near.tab, 'near');
  assert.equal(order(near)[0], neighbour, 'a neighbour in the same local government comes first, though older');
  assert.deepEqual(near.near, { city: 'lagos', cityName: 'Lagos', n: 3, lga: 'ikeja', lgaName: 'Ikeja', lgaN: 2 });
  assert.equal(JSON.stringify(near.near).includes(bola.id), false, 'counts, never who');
  // Dayo's badge is in Ibadan: his Near you is Ibadan's (no posts there) and then the world, and his line counts Ibadan.
  assert.deepEqual((await get('/api/feed/list?tab=near', dayo)).near, { city: 'ibadan', cityName: 'Ibadan', n: 1 });
  // Eve has no badge: the city tab, with no counts line.
  const plain = await get('/api/feed/list?tab=near', eve), city = await get('/api/feed/list?tab=city', eve);
  assert.equal(plain.near, undefined);
  assert.deepEqual(order(plain), order(city));
  // Each person counts once a month, where their badge is now; removing it takes them off.
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, ada);
  assert.equal((await get('/api/feed/list?tab=near', ada)).near.lgaN, 2, 'checking again does not count twice');
  await post('/api/feed/located', { city: 'lagos', lga: 'surulere' }, bola);
  const moved = (await get('/api/feed/list?tab=near', ada)).near;
  assert.deepEqual([moved.n, moved.lgaN], [3, 1]);
  await post('/api/feed/located', { on: false }, chidi);
  assert.equal((await get('/api/feed/list?tab=near', ada)).near.n, 2);
  const stored = await f.server.store.read((db) => JSON.stringify(((db as Record<string, any>).feed).here));
  assert.equal(/[0-9a-f]{8}-/.test(stored), false, 'the counts hold no ids');
  // A new month starts from nothing (Ada's badge still shows; it lasts 90 days). A write on the way keeps her session.
  f.advance(20 * 86400000);
  await post('/api/feed/seen', {}, ada);
  f.advance(12 * 86400000);
  const later = await get('/api/feed/list?tab=near', ada);
  assert.deepEqual([later.near.n, later.near.lgaN], [0, 0]);
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, ada);
  assert.deepEqual((await get('/api/feed/list?tab=near', ada)).near.lgaN, 1);
  assert.equal((await get('/api/feed/list?tab=nearby', ada)).status, 400);
});

test('Plans and Work list what is near you first: your local government, then your city', async (t) => {
  const { f, get, post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), eve = await player('Eve');
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, ada);
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, bola);
  const far = (await post('/api/feed/events', { title: 'Beach day', start: f.now() + 2 * 3600000, place: 'Elegushi' }, eve)).event.id;
  const near = (await post('/api/feed/events', { title: 'Street football', start: f.now() + 5 * 3600000, place: 'The pitch' }, bola)).event.id;
  const named = (await post('/api/feed/events', { title: 'Book club', start: f.now() + 9 * 3600000, place: 'Ikeja City Mall' }, eve)).event.id;
  const ids = (r: Record<string, any>, key: string): string[] => r[key].map((x: Record<string, any>) => x.id);
  assert.deepEqual(ids(await get('/api/feed/events?city=lagos', eve), 'events'), [far, near, named], 'without a badge: soonest first');
  assert.deepEqual(ids(await get('/api/feed/events?city=lagos', ada), 'events'), [near, named, far], 'a neighbour\'s event, and one at a place in Ikeja, first');
  const g1 = (await post('/api/feed/gigs', { title: 'Paint my sign', reward: 500 }, bola)).gig.id;
  const g2 = (await post('/api/feed/gigs', { title: 'Carry boxes', reward: 300 }, eve)).gig.id;
  assert.deepEqual(ids(await get('/api/feed/gigs?city=lagos', eve), 'gigs'), [g2, g1], 'without a badge: newest first');
  assert.deepEqual(ids(await get('/api/feed/gigs?city=lagos', ada), 'gigs'), [g1, g2], 'a neighbour\'s gig first');
});

test('neighbours: a community of one local government, kept for the people confirmed there', async (t) => {
  const { post, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, ada);
  assert.equal((await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'area', city: 'lagos', lga: 'atlantis', open: true }, ada)).code, 'unknown_area');
  const made = await post('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'area', city: 'lagos', lga: 'ikeja', open: true, locals: 'lga' }, ada);
  assert.equal(made.crew.locals, 'lga');
  assert.equal(made.crew.place.lga, 'ikeja');
  assert.equal(made.crew.place.lgaName, 'Ikeja');
  assert.equal(made.crew.qualifies, true);
  await post('/api/feed/located', { city: 'lagos', lga: 'surulere' }, chidi);
  const refused = await post('/api/feed/crews/join', { id: made.crew.id }, chidi);
  assert.equal(refused.code, 'locals_only');
  assert.match(refused.reason, /Ikeja, Lagos/);
  await post('/api/feed/located', { city: 'lagos' }, bola);
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, bola)).code, 'locals_only', 'a city badge without the local government is not enough');
  await post('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, bola);
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, bola)).crew.mine, true);
  // The founder widens it to the city; the city scope still works as before.
  assert.equal((await post('/api/feed/crews/locals', { id: made.crew.id, locals: 'city' }, ada)).crew.locals, 'city');
  assert.equal((await post('/api/feed/crews/join', { id: made.crew.id }, chidi)).crew.mine, true);
  assert.equal((await post('/api/feed/crews/locals', { id: made.crew.id, locals: 'lga' }, ada)).crew.locals, 'lga', 'and back to the area');
  // A community of the whole city has no area to keep it for.
  const whole = await post('/api/feed/crews', { name: 'Lagos Peeps', kind: 'city', city: 'lagos', open: true, locals: 'lga' }, ada);
  assert.equal(whole.crew.locals, undefined);
  assert.equal((await post('/api/feed/crews/locals', { id: whole.crew.id, locals: 'lga' }, ada)).code, 'invalid_scope');
});
