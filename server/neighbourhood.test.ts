import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the neighbourhood (docs/NEIGHBOURHOOD.md): the noticeboard of an area (adults with a badge, the AI reviewer first, "still true?"
// votes that keep it current or end it, reports and removal) and "Meet your neighbours" (a monthly meetup of a local government, planned by an
// admin or a community founder, only for people whose badge is in that local government, free or ticketed through Earn).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { createHash } from 'node:crypto';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { claimsFor, fakeProvider, makeKey, signToken } from './accounts/test-tokens.ts';
import { neighbourhoodService, forgetNeighbourhoodPlayers } from './neighbourhood/service.ts';
import { meetupRefusal, peekNeighbourhood } from './neighbourhood/data.ts';
import { earnOf } from './earn/data.ts';
import { NOTICE, firstSaturday, nextMeetupStart } from '../src/neighbourhood/model.ts';
import { LOCATED } from '../src/feed/model.ts';

const PROJECT = 'allworld-test-project', FOUNDER = 'founder.test@example.com';
type Json = Record<string, any>;
const emailHash = (e: string): string => createHash('sha256').update(e.trim().toLowerCase()).digest('hex');
async function setup(t: TestContext) {
  const key = await makeKey('key-1'), provider = fakeProvider([key]);
  const f = await fixture(t, { env: { ACCOUNTS_FIREBASE_PROJECT_ID: PROJECT, ACCOUNTS_FIREBASE_API_KEY: 'test-web-api-key-0000000000000000000000', FOUNDER_EMAIL_SHA256: emailHash(FOUNDER), NEW_SESSIONS_PER_ADDRESS: '1000', BACHS_API_KEY: 'sk_sandbox_abcdefghijklmnop' }, fetch: provider.fetch as never });
  const call = async (path: string, body?: unknown, cookie?: string): Promise<Json> => { const res = await fetch(f.base + path, { method: body ? 'POST' : 'GET', headers: { Origin: f.base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: res.status, ...(await res.json() as object) }; };
  let minted = 0;
  /** A player: a guest, or (with `address`) an account; an adult unless said otherwise. */
  async function player(name: string, { adult = true, address }: { adult?: boolean; address?: string } = {}): Promise<Device> {
    let d = await f.device(name); await f.request('/api/life?city=lagos', null, d.cookie);
    if (address) {
      const { csrf } = await call('/api/account', undefined, d.cookie);
      const res = await fetch(f.base + '/api/account/sign-in', { method: 'POST', headers: { Origin: f.base, 'Content-Type': 'application/json', Cookie: d.cookie }, body: JSON.stringify({ idToken: await signToken(key, claimsFor(PROJECT, f.now(), { subject: `Uid${address.replace(/\W/g, '')}`, email: address, n: ++minted })), csrf }) });
      assert.equal(res.status, 200);
      d = { ...d, cookie: (res.headers.get('set-cookie') ?? '').split(';')[0] ?? d.cookie };
    }
    await call('/api/growth/hello', { cityId: 'lagos' }, d.cookie);
    await call('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, d.cookie);
    await call('/api/social/me', undefined, d.cookie);
    return d;
  }
  /** A player with a location badge: a local government of Lagos, or the city alone. */
  const local = async (name: string, lga?: string): Promise<Device> => { const d = await player(name); const r = await call('/api/feed/located', { city: 'lagos', ...(lga ? { lga } : {}) }, d.cookie); assert.equal(r.ok, true, JSON.stringify(r)); return d; };
  const hood = neighbourhoodService(f.server.context);
  const keep = (id: string) => f.server.store.transact((db) => hood.reviewed(db, id, { action: 'keep', reason: '' }));
  /** Post a notice and let the reviewer keep it. */
  const notice = async (who: Device, kind: string, body: string): Promise<Json> => { const r = await call('/api/neighbourhood/notices', { kind, body }, who.cookie); assert.equal(r.ok, true, JSON.stringify(r)); await keep(r.notice.id); return r.notice; };
  return { f, call, player, local, hood, keep, notice };
}

test('noticeboard: for adults whose badge names the area; the reviewer reads every notice first; other areas never see it', async (t) => {
  const { f, call, player, local, hood, keep } = await setup(t);
  const stranger = await player('Stranger');
  assert.equal((await call('/api/neighbourhood/board', undefined, stranger.cookie)).code, 'badge_needed');
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'power', body: 'No light on Allen Avenue since noon' }, stranger.cookie)).code, 'badge_needed');
  const kid = await player('Kid', { adult: false });
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'power', body: 'No light on Allen Avenue since noon' }, kid.cookie)).code, 'adults_only');
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja'), chidi = await local('Chidi', 'lagos-mainland'), city = await local('Dayo');
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'power', body: 'Call me on 08031234567 for light' }, ada.cookie)).code, 'contact_not_allowed');
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'gossip', body: 'Something happened here today' }, ada.cookie)).code, 'invalid_kind');
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'power', body: 'Hi' }, ada.cookie)).code, 'too_short');
  const made = await call('/api/neighbourhood/notices', { kind: 'power', body: 'No light on Allen Avenue since noon' }, ada.cookie);
  assert.equal(made.notice.status, 'review', 'not up before the reviewer has read it');
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'power', body: 'No light on Allen Avenue since noon' }, ada.cookie)).code, 'duplicate');
  assert.deepEqual((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices, [], 'a neighbour does not see it yet');
  const mine = await call('/api/neighbourhood/board', undefined, ada.cookie);
  assert.deepEqual([mine.notices.length, mine.mine[0].status], [0, 'review']);
  await keep(made.notice.id);
  const seen = await call('/api/neighbourhood/board', undefined, bola.cookie);
  assert.equal(seen.area.name, 'Ikeja, Lagos');
  assert.deepEqual(seen.notices.map((n: Json) => [n.kind, n.body, n.by]), [['power', 'No light on Allen Avenue since noon', 'Ada']]);
  assert.deepEqual((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices, [], 'another local government has its own board');
  assert.deepEqual((await call('/api/neighbourhood/board', undefined, city.cookie)).notices, [], 'a badge of the city alone has the city board');
  assert.equal((await call('/api/neighbourhood/notices/vote', { id: made.notice.id, vote: 'up' }, chidi.cookie)).code, 'badge_needed', 'only the area says what is still true');
  // A refused notice says why, to its author only.
  const rude = await call('/api/neighbourhood/notices', { kind: 'roads', body: 'The chairman stole the road money' }, ada.cookie);
  await f.server.store.transact((db) => hood.reviewed(db, rude.notice.id, { action: 'remove', reason: 'Accusing a named person is not allowed.' }));
  assert.equal((await call('/api/neighbourhood/board', undefined, ada.cookie)).mine.at(-1).reason, 'Accusing a named person is not allowed.');
  assert.equal((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices.length, 1);
  // The reviewer may have no answer: the notice waits, is tried again, and after three tries is left for an admin.
  const slow = await call('/api/neighbourhood/notices', { kind: 'water', body: 'Tap is dry in Opebi this morning' }, ada.cookie);
  for (let i = 0; i < NOTICE.reviewTries; i++) await f.server.store.transact((db) => hood.reviewed(db, slow.notice.id, null));
  assert.deepEqual(await f.server.store.read((db) => hood.pending(db)), []);
  assert.equal((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices.length, 1, 'still not up');
  await keep(slow.notice.id);
  assert.equal((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices.length, 2);
});

test('noticeboard: "still true?" votes keep a notice up, three more noes end it, and time ends every notice', async (t) => {
  const { f, call, local, notice } = await setup(t);
  const ada = await local('Ada', 'ikeja'), voters = await Promise.all(['Bola', 'Chidi', 'Dayo', 'Efe'].map((n) => local(n, 'ikeja')));
  const power = await notice(ada, 'power', 'No light on Allen Avenue since noon');
  const lost = await notice(ada, 'lost', 'Found a blue backpack near the Ikeja bus stop');
  assert.equal((await call('/api/neighbourhood/notices/vote', { id: power.id, vote: 'up' }, ada.cookie)).code, 'own_notice');
  // Still true: a yes pushes the end out; a vote changed replaces the first.
  const before = (await call('/api/neighbourhood/board', undefined, voters[0]!.cookie)).notices.find((n: Json) => n.id === power.id);
  f.advance(5 * 3600000);
  const yes = await call('/api/neighbourhood/notices/vote', { id: power.id, vote: 'up' }, voters[0]!.cookie);
  assert.deepEqual([yes.notice.up, yes.notice.vote], [1, 'up']);
  assert.ok(yes.notice.until > before.until, 'a yes keeps it up longer');
  const flipped = await call('/api/neighbourhood/notices/vote', { id: power.id, vote: 'down' }, voters[0]!.cookie);
  assert.deepEqual([flipped.notice.up, flipped.notice.down], [0, 1]);
  assert.equal((await call('/api/neighbourhood/notices/vote', { id: power.id, vote: null }, voters[0]!.cookie)).notice.vote, null);
  // Three more noes than yeses end it at once.
  for (const v of voters.slice(0, 3)) await call('/api/neighbourhood/notices/vote', { id: power.id, vote: 'down' }, v.cookie);
  assert.deepEqual((await call('/api/neighbourhood/board', undefined, voters[3]!.cookie)).notices.map((n: Json) => n.id), [lost.id], 'the power notice is gone');
  assert.equal((await call('/api/neighbourhood/notices/vote', { id: power.id, vote: 'up' }, voters[3]!.cookie)).code, 'notice_over');
  // A yes cannot keep a notice up forever: three lives at most.
  for (let i = 0; i < 12; i++) { f.advance(2 * 86400000); await call('/api/neighbourhood/notices/vote', { id: lost.id, vote: 'up' }, voters[i % 4]!.cookie); }
  assert.deepEqual((await call('/api/neighbourhood/board', undefined, voters[3]!.cookie)).notices, [], 'lost-and-found ends after at most 21 days');
});

test('noticeboard: report, remove, the admin, and a daily limit', async (t) => {
  const { f, call, player, local, hood, keep, notice } = await setup(t);
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja'), chidi = await local('Chidi', 'ikeja');
  const stranger = await local('Dayo', 'lagos-mainland');
  const n = await notice(ada, 'roads', 'Ikorodu Road is blocked at Maryland by a fallen truck');
  assert.equal((await call('/api/neighbourhood/notices/report', { id: n.id }, stranger.cookie)).code, 'badge_needed');
  assert.equal((await call('/api/neighbourhood/notices/report', { id: n.id }, ada.cookie)).code, 'own_notice');
  assert.equal((await call('/api/neighbourhood/notices/report', { id: n.id }, bola.cookie)).ok, true);
  assert.equal((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices.length, 1, 'one report does not hide it');
  await call('/api/neighbourhood/notices/report', { id: n.id }, bola.cookie);
  assert.equal((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices.length, 1, 'the same person twice is one report');
  await call('/api/neighbourhood/notices/report', { id: n.id }, chidi.cookie);
  assert.equal((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices.length, 0, 'two people send it back to the reviewer');
  assert.deepEqual(await f.server.store.read((db) => hood.pending(db)), [n.id]);
  const asked = await f.server.store.read((db) => hood.toReview(db, n.id));
  assert.match(asked!.facts, /2 neighbours reported it/);
  await keep(n.id);
  assert.equal((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices.length, 1, 'the reviewer kept it');
  // The author takes their own down; nobody else can.
  assert.equal((await call('/api/neighbourhood/notices/remove', { id: n.id }, bola.cookie)).code, 'unknown_notice');
  assert.equal((await call('/api/neighbourhood/notices/remove', { id: n.id }, ada.cookie)).ok, true);
  assert.equal((await call('/api/neighbourhood/board', undefined, chidi.cookie)).notices.length, 0);
  // Daily limit.
  for (let i = 0; i < NOTICE.perDay - 1; i++) assert.equal((await call('/api/neighbourhood/notices', { kind: 'water', body: `No water in block ${i} this morning` }, ada.cookie)).ok, true);
  assert.equal((await call('/api/neighbourhood/notices', { kind: 'water', body: 'No water in block 99 this morning' }, ada.cookie)).code, 'daily_limit');
  void player;
});

test('noticeboard: an admin removes and restores a notice, and it is audited; only admins can', async (t) => {
  const { call, player, local, notice } = await setup(t);
  const founder = await player('Founder', { address: FOUNDER });
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja');
  const n = await notice(ada, 'power', 'No light on Allen Avenue since noon');
  assert.equal((await call('/api/admin/neighbourhood', undefined, bola.cookie)).status, 404, 'not an admin: the section does not exist');
  const list = await call('/api/admin/neighbourhood', undefined, founder.cookie);
  assert.deepEqual(list.notices.map((x: Json) => [x.id, x.area, x.status]), [[n.id, 'Ikeja, Lagos', 'live']]);
  assert.equal((await call('/api/admin/neighbourhood/act', { notice: n.id, action: 'remove', note: 'Rumour' }, founder.cookie)).ok, true);
  assert.equal((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices.length, 0);
  assert.equal((await call('/api/neighbourhood/board', undefined, ada.cookie)).mine[0].reason, 'Rumour');
  assert.equal((await call('/api/admin/neighbourhood/act', { notice: n.id, action: 'restore' }, founder.cookie)).ok, true);
  assert.equal((await call('/api/neighbourhood/board', undefined, bola.cookie)).notices.length, 1);
  assert.equal((await call('/api/admin/neighbourhood/act', { notice: n.id, action: 'burn' }, founder.cookie)).status, 400);
});

test('meetups: the month\'s first Saturday at 16:00 West Africa Time, never in the past', () => {
  assert.equal(new Date(firstSaturday('2026-11')).toISOString(), '2026-11-07T15:00:00.000Z');
  assert.equal(new Date(firstSaturday('2026-08')).toISOString(), '2026-08-01T15:00:00.000Z');
  assert.equal(new Date(nextMeetupStart(Date.UTC(2026, 9, 19, 12))).toISOString(), '2026-11-07T15:00:00.000Z', 'October\'s first Saturday is over');
  assert.equal(new Date(nextMeetupStart(Date.UTC(2026, 10, 1, 12))).toISOString(), '2026-11-07T15:00:00.000Z');
  assert.equal(new Date(nextMeetupStart(Date.UTC(2026, 10, 7, 14))).toISOString(), '2026-12-05T15:00:00.000Z', 'under two hours away: next month\'s');
  assert.equal(new Date(nextMeetupStart(Date.UTC(2026, 11, 20))).toISOString(), '2027-01-02T15:00:00.000Z');
});

test('meetups: an admin plans a local government\'s meetup; only people whose badge is there may go; one a month', async (t) => {
  const { f, call, player, local } = await setup(t);
  const founder = await player('Founder', { address: FOUNDER });
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja'), chidi = await local('Chidi', 'lagos-mainland'), city = await local('Dayo'), nobody = await player('Nobody');
  assert.equal((await call('/api/admin/neighbourhood/meetup', { city: 'lagos', lga: 'ikeja' }, ada.cookie)).status, 404, 'only admins');
  assert.equal((await call('/api/admin/neighbourhood/meetup', { city: 'lagos', lga: 'atlantis' }, founder.cookie)).code, 'unknown_area');
  const made = await call('/api/admin/neighbourhood/meetup', { city: 'lagos', lga: 'ikeja', place: 'Ikeja City Mall steps' }, founder.cookie);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.match(made.meetup.event.title, /^Meet your neighbours: Ikeja/);
  assert.equal(new Date(made.meetup.event.start).getUTCHours(), 15);
  assert.equal(new Date(made.meetup.event.start).getUTCDay(), 6);
  assert.equal((await call('/api/admin/neighbourhood/meetup', { city: 'lagos', lga: 'ikeja' }, founder.cookie)).code, 'already_planned');
  const id = made.meetup.event.id;
  // The locals-only rule: the badge must be in Ikeja itself.
  for (const [who, why] of [[chidi, 'another local government'], [city, 'the city alone'], [nobody, 'no badge']] as const) assert.equal((await call('/api/feed/events/rsvp', { id, answer: 'going' }, who.cookie)).code, 'locals_only', why);
  assert.equal((await call('/api/feed/events/rsvp', { id, answer: 'going' }, ada.cookie)).ok, true);
  assert.equal((await call('/api/feed/events/rsvp', { id, answer: 'going' }, bola.cookie)).event.going, 3, 'the host and two neighbours');
  // The list: my area's meetup first, with whether I can go.
  const mine = await call('/api/neighbourhood/meetups', undefined, ada.cookie);
  assert.deepEqual([mine.area.name, mine.meetups.length, mine.meetups[0].canGo, mine.meetups[0].event.me], ['Ikeja, Lagos', 1, true, 'going']);
  const other = await call('/api/neighbourhood/meetups', undefined, chidi.cookie);
  assert.deepEqual([other.meetups.length, other.meetups[0].canGo], [1, false], 'a neighbour area sees it, but cannot go');
  assert.deepEqual((await call('/api/neighbourhood/meetups', undefined, nobody.cookie)).meetups, []);
  // A priced meetup (docs/EARN.md): the locals rule comes before the ticket one, and Earn's sale refuses an outsider too.
  await f.server.store.transact((db) => { earnOf(f.server.context, db).prices[id] = 1500; });
  assert.equal((await call('/api/feed/events/rsvp', { id, answer: 'going' }, chidi.cookie)).code, 'locals_only');
  assert.equal(await f.server.store.read((db) => meetupRefusal(db, id, chidi.id, f.now())?.code), 'locals_only');
  assert.equal(await f.server.store.read((db) => meetupRefusal(db, id, ada.id, f.now())), null);
  assert.equal(await f.server.store.read((db) => meetupRefusal(db, 'not-a-meetup', chidi.id, f.now())), null, 'any other event is not locked');
  // The badge lapses after 90 days: so does the right to go.
  f.advance((LOCATED.days + 1) * 86400000);
  assert.equal(await f.server.store.read((db) => meetupRefusal(db, id, bola.id, f.now())?.code), 'locals_only');
});

test('meetups: a community founder plans their own local government\'s meetup, with their own badge there', async (t) => {
  const { call, player, local } = await setup(t);
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja'), chidi = await local('Chidi', 'lagos-mainland');
  const made = await call('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', lga: 'ikeja', open: true }, ada.cookie);
  assert.equal(made.ok, true, JSON.stringify(made));
  const plain = await call('/api/feed/crews', { name: 'Just friends' }, ada.cookie);
  const listed = await call('/api/neighbourhood/meetups', undefined, ada.cookie);
  assert.deepEqual(listed.plannable.map((p: Json) => [p.crew, p.area.name]), [[made.crew.id, 'Ikeja, Lagos']], 'a community of a local government, not a crew of friends');
  assert.deepEqual((await call('/api/neighbourhood/meetups', undefined, bola.cookie)).plannable, [], 'only the founder');
  assert.equal((await call('/api/neighbourhood/meetups/plan', { crew: made.crew.id }, bola.cookie)).code, 'not_founder');
  assert.equal((await call('/api/neighbourhood/meetups/plan', { crew: plain.crew.id }, ada.cookie)).code, 'not_founder');
  assert.equal((await call('/api/neighbourhood/meetups/plan', { crew: made.crew.id }, chidi.cookie)).code, 'not_founder');
  const planned = await call('/api/neighbourhood/meetups/plan', { crew: made.crew.id, title: 'Ikeja Peeps coffee morning', about: 'Meet at the roundabout' }, ada.cookie);
  assert.equal(planned.ok, true, JSON.stringify(planned));
  assert.equal(planned.meetup.event.title, 'Ikeja Peeps coffee morning');
  assert.equal(planned.meetup.event.mine, true);
  assert.equal((await call('/api/neighbourhood/meetups/plan', { crew: made.crew.id }, ada.cookie)).code, 'already_planned');
  assert.equal((await call('/api/feed/events/rsvp', { id: planned.meetup.event.id, answer: 'going' }, chidi.cookie)).code, 'locals_only');
  assert.equal((await call('/api/feed/events/rsvp', { id: planned.meetup.event.id, answer: 'going' }, bola.cookie)).ok, true);
  void player;
});

test('meetups: Earn sells no ticket to someone whose badge is not in the area, before any money moves', async (t) => {
  const { f, call, player } = await setup(t);
  const founder = await player('Founder', { address: FOUNDER });
  const outsider = await player('Chidi', { address: 'chidi@example.com' }), neighbour = await player('Ada', { address: 'ada@example.com' });
  await call('/api/feed/located', { city: 'lagos', lga: 'lagos-mainland' }, outsider.cookie);
  await call('/api/feed/located', { city: 'lagos', lga: 'ikeja' }, neighbour.cookie);
  const id = (await call('/api/admin/neighbourhood/meetup', { city: 'lagos', lga: 'ikeja' }, founder.cookie)).meetup.event.id;
  // The host's payout account is ready and the meetup has a ticket price (set directly: Earn's own tests cover the setting of it).
  await f.server.store.transact((db) => { const e = earnOf(f.server.context, db); e.prices[id] = 1500; e.accounts[founder.id] = { acct: 'acct_test', email: FOUNDER, status: 'ready', at: f.now() }; });
  assert.equal((await call('/api/earn/pay', { kind: 'ticket', id, email: 'chidi@example.com' }, outsider.cookie)).code, 'locals_only');
  const mine = await call('/api/earn/pay', { kind: 'ticket', id, email: 'ada@example.com' }, neighbour.cookie);
  assert.notEqual(mine.code, 'locals_only', 'a neighbour is past that rule (the checkout itself needs Bachs, which the test does not have)');
  const sales = await f.server.store.read((db) => Object.values(earnOf(f.server.context, db).sales).map((s) => s.buyer));
  assert.ok(!sales.includes(outsider.id), 'no sale was even opened for the outsider');
});

test('meetups: a ticket price needs the host\'s Earn account; without one the meetup stays free and says why', async (t) => {
  const { call, local } = await setup(t);
  const ada = await local('Ada', 'ikeja');
  const made = await call('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', lga: 'ikeja', open: true }, ada.cookie);
  const planned = await call('/api/neighbourhood/meetups/plan', { crew: made.crew.id, price: 1000 }, ada.cookie);
  assert.equal(planned.ok, true);
  assert.match(planned.priceNote, /payout account/);
  assert.equal(planned.meetup.event.price, undefined);
});

test('erasure: a person\'s notices, votes, reports, templates and meetups leave the neighbourhood', async (t) => {
  const { f, call, local, notice } = await setup(t);
  const ada = await local('Ada', 'ikeja'), bola = await local('Bola', 'ikeja');
  const mine = await notice(ada, 'water', 'Tap is dry in Opebi this morning'), theirs = await notice(bola, 'power', 'Light is back on Allen Avenue now');
  await call('/api/neighbourhood/notices/vote', { id: theirs.id, vote: 'up' }, ada.cookie);
  await call('/api/neighbourhood/notices/report', { id: theirs.id }, ada.cookie);
  const crew = await call('/api/feed/crews', { name: 'Ikeja Peeps', kind: 'city', city: 'lagos', lga: 'ikeja', open: true }, ada.cookie);
  await call('/api/neighbourhood/meetups/plan', { crew: crew.crew.id }, ada.cookie);
  await f.server.store.transact((db) => forgetNeighbourhoodPlayers(db, new Set([ada.id])));
  const stored = await f.server.store.read((db) => JSON.stringify(peekNeighbourhood(db)));
  assert.equal(stored.includes(ada.id), false);
  assert.equal(stored.includes(mine.id), false);
  assert.equal(stored.includes(theirs.id), true, 'a neighbour\'s notice stays');
});
