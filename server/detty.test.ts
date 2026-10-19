import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos', 'london', 'accra'].map((city) => preloadCityContent(city)));
// OWNER: growth — Detty December over HTTP (docs/DETTY-DECEMBER.md): the season switches itself on at 00:00 WAT on 1 December and off at New
// Year; the admin's preview turns it on early and keeps what it records apart; the check-in records the season city, the night the stored
// life is at and the party it is inside; the Returnee badge needs a location badge in another country and never reads a position; the
// badge shows on the profile; erasure takes the record; and the link preview of /visit/lagos reads "Detty December in Lagos" in December.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { ROUTE_MODULES } from './routes/index.ts';
import { settingsOf } from './admin/settings.ts';
import { exportDetty, forgetDettyPlayers } from './detty/store.ts';
import { DETTY_SETTINGS } from './routes/detty.ts';
import { metaFor, sitemapPaths, withPathMeta } from './path-meta.ts';
import { watMidnight } from '../src/festivals/detty-dates.ts';
import type { Db, RouteContext } from './types.ts';

type Json = Record<string, any>;
const HOUR = 3600000;
const wat = (y: number, m: number, d: number, h = 12, min = 0): number => watMidnight(y, m, d) + h * HOUR + min * 60000;

async function setup(t: Parameters<typeof fixture>[0], at: number) {
  const held: { ctx?: RouteContext } = {};
  const f = await fixture(t, { routes: [...ROUTE_MODULES, (ctx: RouteContext) => { held.ctx = ctx; return {}; }] });
  f.advance(at - f.now());
  const send = async (path: string, body: unknown, who?: Device, headers: Record<string, string> = {}): Promise<Json> => { const res = await fetch(f.base + path, { method: body === null ? 'GET' : 'POST', headers: { ...(body === null ? {} : { 'Content-Type': 'application/json' }), ...(who ? { Cookie: who.cookie } : {}), ...headers }, ...(body === null ? {} : { body: JSON.stringify(body) }) }); return { status: res.status, ...((await res.json()) as Json) }; };
  const get = (path: string, who?: Device) => send(path, null, who), post = (path: string, body: unknown, who?: Device, headers?: Record<string, string>) => send(path, body, who, headers);
  async function player(name: string, badge?: string): Promise<Device> {
    const who = await f.device(name);
    await f.request('/api/life?city=lagos', null, who.cookie);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await post('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, who);
    await get('/api/social/me', who);
    if (badge) { const r = await post('/api/feed/located', { city: badge }, who); assert.equal(r.profile?.located?.city, badge, JSON.stringify(r)); }
    return who;
  }
  const preview = (on: boolean): void => settingsOf(held.ctx!).sync(on ? { [DETTY_SETTINGS.preview]: { value: true } } : {});
  /** Move the clock to `at`, in steps of 20 days with a request each, so the players' sessions (30 days, sliding) stay alive. */
  async function until(at: number, ...who: Device[]): Promise<void> {
    while (at - f.now() > 20 * 86400000) { f.advance(20 * 86400000); for (const one of who) await f.request('/api/life?city=lagos', null, one.cookie); }
    f.advance(at - f.now());
  }
  const stored = (): Promise<string> => f.server.store.read((db) => JSON.stringify((db as Record<string, unknown>)['detty'] ?? null));
  return { f, get, post, player, preview, stored, until, ctx: () => held.ctx! };
}

test('the season turns itself on at 00:00 WAT on 1 December and off at New Year; the public read carries the lists', async (t) => {
  const { f, get, post, player, until } = await setup(t, wat(2026, 11, 30, 23, 30));
  const ada = await player('Ada', 'london');
  const before = await get('/api/world/detty');
  assert.equal(before.on, false);
  assert.equal(before.day, null);
  assert.equal(before.nights.length, 7);
  assert.equal(before.drops.length, 31);
  const refused = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(refused.code, 'off_season');
  assert.equal(refused.returnee, null);
  f.advance(30 * 60000);
  const first = await get('/api/world/detty');
  assert.equal(first.on, true);
  assert.equal(first.day, 1);
  assert.equal(first.key, '2026');
  const checked = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(checked.ok, true);
  assert.equal(checked.added.city, 'lagos');
  assert.equal(checked.returnee, 'Returnee · Detty December 2026');
  await until(wat(2027, 1, 1, 0), ada);
  assert.equal((await get('/api/world/detty')).on, false, 'New Year in Lagos');
  assert.equal((await post('/api/world/detty/checkin', {}, ada)).code, 'off_season');
  const after = await get('/api/world/detty/me', ada);
  assert.deepEqual(after.facts, { year: 2026, nights: 0, parties: 0, cities: ['Lagos'], returnee: true }, 'January still reads the season just ended, for the card');
  assert.equal(after.season.card, true);
  assert.equal((await get('/api/world/detty/me')).status, 401, 'one\'s own season needs a session');
});

test('the Returnee badge: a location badge in another country and a season city; never from a position, never twice; shown on the profile', async (t) => {
  const { get, post, player, stored } = await setup(t, wat(2026, 12, 10, 14));
  const ada = await player('Ada', 'london'), bola = await player('Bola', 'lagos'), chidi = await player('Chidi');
  const away = await post('/api/world/detty/checkin', { lat: 51.5, lon: -0.12, city: 'london', badgeCountry: 'gb' }, ada);
  assert.equal(away.added.returnee, 'Returnee · Detty December 2026');
  assert.equal((await post('/api/world/detty/checkin', {}, ada)).added.returnee, undefined, 'once a season');
  const home = await post('/api/world/detty/checkin', { badgeCountry: 'gb', lat: 51.5, lon: -0.12 }, bola);
  assert.equal(home.returnee, null, 'a Lagos badge in Lagos is not a return, whatever the body says');
  assert.equal((await post('/api/world/detty/checkin', {}, chidi)).returnee, null, 'no location badge, no Returnee');
  const text = await stored();
  assert.equal(/51\.5|0\.12|lat|lon|london/.test(text), false, 'nothing like a position, and not even the badge city, is kept');
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, bola)).profile.returnee, 'Returnee · Detty December 2026');
  assert.equal((await get(`/api/feed/profile?id=${bola.id}`, ada)).profile.returnee, undefined);
});

test('nights and parties: the server counts the night the stored life is at, and the party a player is inside, once each', async (t) => {
  // 3 December 2026, 20:30 WAT: the street party at Freedom Park (the Square), where a new life stands.
  const { f, post, player, stored } = await setup(t, wat(2026, 12, 3, 20, 30));
  const ada = await player('Ada'), host = await player('Host');
  const night = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(night.added.event, 'Street party');
  assert.equal(night.facts.nights, 1);
  assert.equal((await post('/api/world/detty/checkin', {}, ada)).added.event, undefined, 'a night counts once');
  // Ada is let into Host's home while Host throws an owambe.
  const now = f.now(), started = now - 60000;
  await f.server.store.transact((db: Db) => {
    const social = db.social!;
    social.houses[host.id] = { knocks: {}, guests: { [ada.id]: { since: now, expires: now + HOUR, cityId: 'lagos' } }, party: { title: 'Owambe at my place', colour: 'gold', startedAt: started, until: started + 2 * HOUR, sprays: 0 } };
    social.players[ada.id]!.visiting = host.id;
  });
  const party = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(party.added.party, true);
  assert.equal(party.facts.parties, 1);
  assert.equal((await post('/api/world/detty/checkin', {}, ada)).added.party, undefined, 'a party counts once');
  assert.equal((await stored()).includes(host.id), false, 'a party is kept as its start time, never as the host');
  // Saturday 5 December, 21:00: Owambe Saturday counts for a guest at a party.
  f.advance(wat(2026, 12, 5, 21) - f.now());
  const later = f.now();
  await f.server.store.transact((db: Db) => { db.social!.houses[host.id]!.party = { title: 'Saturday owambe', colour: 'red', startedAt: later, until: later + 2 * HOUR, sprays: 0 }; db.social!.houses[host.id]!.guests[ada.id] = { since: later, expires: later + HOUR, cityId: 'lagos' }; });
  const saturday = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(saturday.added.event, 'Owambe Saturday');
  assert.equal(saturday.facts.parties, 2);
  assert.equal(saturday.facts.nights, 2);
});

test('the admin preview turns the season on now for testing, keeps its record apart, and the real season starts clean', async (t) => {
  const { get, post, player, preview, stored, until } = await setup(t, wat(2026, 10, 19, 20, 30));
  const ada = await player('Ada', 'accra');
  assert.equal((await get('/api/world/detty')).on, false);
  preview(true);
  const season = await get('/api/world/detty');
  assert.equal(season.on, true);
  assert.equal(season.preview, true);
  assert.equal(season.day, 19);
  assert.equal(season.key, 'preview-2026');
  assert.equal(season.card, true, 'the card can be tried in a preview');
  const tried = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(tried.returnee, 'Returnee · Detty December 2026 (preview)');
  assert.equal(tried.facts.cities.length, 1);
  assert.equal((await get(`/api/feed/profile?id=${ada.id}`, ada)).profile.returnee, undefined, 'a preview badge is never on the profile');
  preview(false);
  assert.equal((await get('/api/world/detty')).on, false);
  await until(wat(2026, 12, 2, 10), ada);
  const real = await post('/api/world/detty/checkin', {}, ada);
  assert.equal(real.returnee, 'Returnee · Detty December 2026');
  assert.deepEqual(real.facts.cities, ['Lagos']);
  assert.equal(real.facts.nights, 0, 'nothing the preview recorded counts');
  assert.ok((await stored()).includes('preview-2026'), 'the preview badge stays apart');
});

test('an account export carries a player\'s season record and erasure takes it', async (t) => {
  const { f, post, player, stored } = await setup(t, wat(2026, 12, 10, 14));
  const ada = await player('Ada', 'london');
  await post('/api/world/detty/checkin', {}, ada);
  assert.ok((await stored()).includes(ada.id));
  const exported = await f.server.store.read((db: Db) => exportDetty(db, [ada.id, 'nobody']));
  assert.deepEqual(exported.map((item) => [item.player, item.season.s, item.season.cities]), [[ada.id, '2026', ['lagos']]], 'the account export carries it');
  await f.server.store.transact((db: Db) => forgetDettyPlayers(db, [ada.id]));
  assert.equal((await stored()).includes(ada.id), false);
});

test('the link preview: /visit/lagos, /visit/accra and /visit/abuja say "Detty December in …" in December only; /detty has its own head', () => {
  const dec = wat(2026, 12, 1, 0), nov = wat(2026, 11, 30, 23, 59), jan = wat(2027, 1, 1, 0);
  assert.equal(metaFor('/visit/lagos', dec)?.title, 'Detty December in Lagos — Allworld');
  assert.match(metaFor('/visit/lagos', dec)!.description, /owambe Saturdays in Lagos, 1 to 31 December/);
  assert.equal(metaFor('/visit/lagos', nov)?.title, 'Visit Lagos on Allworld');
  assert.equal(metaFor('/visit/lagos', jan)?.title, 'Visit Lagos on Allworld');
  assert.equal(metaFor('/visit/lagos', dec)?.canonical, '/visit/lagos');
  assert.equal(metaFor('/visit/kano', dec)?.title, 'Visit Kano on Allworld', 'another city keeps its words');
  const detty = metaFor('/detty', nov)!;
  assert.equal(detty.title, 'Detty December in Allworld: Lagos, Accra and Abuja');
  assert.equal(detty.canonical, '/detty');
  assert.ok(detty.description.length <= 155);
  assert.ok(sitemapPaths().includes('/detty'));
  const page = '<title>x</title><meta property="og:title" content="x"><meta name="description" content="x"><meta property="og:description" content="x"><meta name="twitter:title" content="x"><meta name="twitter:description" content="x">';
  assert.match(withPathMeta(page, '/visit/abuja', 'https://example.test', '', wat(2026, 12, 25)), /<title>Detty December in Abuja — Allworld<\/title>/);
  assert.match(withPathMeta(page, '/visit/abuja', 'https://example.test', '', wat(2026, 11, 25)), /<title>Visit Abuja on Allworld<\/title>/);
});
