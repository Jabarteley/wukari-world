// OWNER: watch (docs/ALLWORLD-HOUSE.md). Shared watching over HTTP: predictions on admin-listed fixtures (never money; an admin enters the
// result; points, badges, the board, a correction), Allworld House (AI housemates, adults vote once a week, the eviction stage, the reveal,
// the room cast, stop), and artist premieres (apply, approval before any name shows, a premiere on the artist's own event, the front row).
import test from 'node:test';
import assert from 'node:assert/strict';
import { admins, FOUNDER_ADDRESS } from './admin/admin.test.ts';
import { evictAt, revealAt } from '../src/watch/house.ts';
import type { HouseSeason } from '../src/watch/house.ts';
import { houseService } from './watch/house.ts';
import { forgetWatchPlayers, peekWatch } from './watch/data.ts';
import { peekWorldEvents } from './world-events/data.ts';
import { itemByNumber, peekGist } from './gist/ledger.ts';
import type { Db, RouteContext } from './types.ts';

type Json = Record<string, any>;

async function setup(t: Parameters<typeof admins>[0]) {
  const a = await admins(t), f = a.f;
  const founder = await a.account(FOUNDER_ADDRESS, 'Founder');
  const ctx = (f.server as unknown as { context: RouteContext }).context;
  const post = async (path: string, body: object, cookie: string): Promise<Json> => (await (await a.call(path, body, cookie)).json()) as Json;
  const get = async (path: string, cookie?: string): Promise<Json> => (await (await a.call(path, null, cookie ?? null)).json()) as Json;
  /** A played guest who said they are an adult (or under 18). */
  async function person(name: string, age: 'adult' | 'minor' = 'adult') { const d = await a.player(name); await a.call('/api/social/me', null, d.cookie); assert.equal((await a.call('/api/growth/consent', { cityId: 'lagos', age }, d.cookie)).status, 200); return d; }
  const admin = (body: Json) => a.admin('/api/admin/watch', founder.cookie, body);
  const fixture = async (item: Json) => { const done = await a.admin('/api/admin/festivals', founder.cookie, { action: 'fixture.save', item }); assert.equal(done.status, 200, JSON.stringify(done.body)); };
  const read = <T>(fn: (db: Db) => T): Promise<T> => ctx.store.read(fn);
  const gistText = (n: number): Promise<string> => read((db) => itemByNumber(peekGist(db), n)?.text ?? '');
  const to = (at: number): void => { if (at > f.now()) f.advance(at - f.now()); };
  return { a, f, ctx, founder, post, get, person, admin, fixture, read, gistText, to };
}

test('predictions: a pick before kick-off (an amount is never kept), refused after it; the admin’s result scores once, gives badges and the board; a correction re-scores', async (t) => {
  const h = await setup(t);
  const start = h.f.now() + 2 * 86400000;
  await h.fixture({ id: 'derby-1', title: 'Red v Blue', start, minutes: 120 });
  await h.fixture({ id: 'night-1', title: 'Match night special', start, minutes: 120 });
  const ada = await h.person('Ada'), bola = await h.person('Bola'), chi = await h.person('Chi', 'minor');
  const list = await h.get('/api/watch/matches?city=lagos', ada.cookie);
  const derby = list.matches.find((m: Json) => m.id === 'derby-1');
  assert.deepEqual(derby.teams, ['Red', 'Blue']); assert.equal(derby.open, true);
  assert.equal((await h.post('/api/watch/predict', { fixture: 'night-1', winner: 'home' }, ada.cookie)).code, 'not_a_match');
  const picked = await h.post('/api/watch/predict', { fixture: 'derby-1', winner: 'home', score: [2, 1], amount: 5000, stake: 'naira' }, ada.cookie);
  assert.equal(picked.ok, true, JSON.stringify(picked));
  assert.deepEqual(picked.match.mine, { w: 'home', s: [2, 1] });
  assert.ok(!JSON.stringify(await h.read((db) => peekWatch(db))).includes('5000'), 'no amount is stored');
  assert.equal((await h.post('/api/watch/predict', { fixture: 'derby-1', winner: 'home' }, bola.cookie)).ok, true);
  assert.equal((await h.post('/api/watch/predict', { fixture: 'derby-1', winner: 'away' }, chi.cookie)).ok, true, 'anyone may predict: there is nothing to lose');
  assert.equal((await h.post('/api/watch/predict', { fixture: 'derby-1', winner: 'home', score: [0, 3] }, bola.cookie)).code, 'invalid_pick');
  const cashBefore = (await h.a.life(ada.cookie)).cash;
  assert.equal((await h.admin({ action: 'result.save', fixture: 'derby-1', home: 2, away: 1 })).body.code, 'not_started', 'no result before kick-off');
  h.to(start + 60000);
  assert.equal((await h.post('/api/watch/predict', { fixture: 'derby-1', winner: 'draw' }, ada.cookie)).code, 'kicked_off');
  assert.equal((await h.a.admin('/api/admin/watch', ada.cookie, { action: 'result.save', fixture: 'derby-1', home: 2, away: 1 })).status, 404, 'only an admin enters a result');
  const saved = await h.admin({ action: 'result.save', fixture: 'derby-1', home: 2, away: 1 });
  assert.equal(saved.body.ok, true, JSON.stringify(saved.body));
  const after = await h.get('/api/watch/matches?city=lagos', ada.cookie), mine = after.matches.find((m: Json) => m.id === 'derby-1');
  assert.deepEqual(mine.result, { home: 2, away: 1 }); assert.equal(mine.badge, 'exact'); assert.equal(mine.points, 3); assert.equal(mine.right, 2); assert.equal(mine.picks, 3);
  assert.ok(mine.line > 0, 'the result is a gist line: the public card');
  assert.match(await h.gistText(mine.line), /Full time: Red 2–1 Blue\. 2 of 3 fans/);
  assert.deepEqual(after.badges.map((b: Json) => b.kind), ['exact']);
  const board = await h.get('/api/watch/board', ada.cookie);
  assert.deepEqual(board.rows.map((r: Json) => [r.name, r.points]), [['Ada', 3], ['Bola', 1]]);
  assert.equal(board.me.rank, 1);
  assert.equal((await h.a.life(ada.cookie)).cash, cashBefore, 'no money moved');
  // A correction takes the old points and badges back and gives the new ones: Chi called the away win.
  assert.equal((await h.admin({ action: 'result.save', fixture: 'derby-1', home: 0, away: 1 })).body.ok, true);
  const fixed = await h.get('/api/watch/board', chi.cookie);
  assert.deepEqual(fixed.rows.map((r: Json) => [r.name, r.points, r.you]), [['A fan', 1, true]], 'a minor is "A fan" on the public board');
  assert.deepEqual((await h.get('/api/watch/matches?city=lagos', ada.cookie)).badges, [], 'Ada’s badge was taken back');
  const page = (await h.a.admin('/api/admin/watch', h.founder.cookie)).body as Json;
  assert.deepEqual(page.fixtures.find((f: Json) => f.id === 'derby-1').result, { home: 0, away: 1 });
  // Erasure: the player's picks, points and badges go.
  await h.ctx.store.transact((db) => { forgetWatchPlayers(db, [chi.id]); });
  assert.deepEqual((await h.get('/api/watch/board', ada.cookie)).rows, []);
});

test('Allworld House: AI housemates, one adult save vote a week, the eviction stage, the reveal (fewest saves leave), the room cast, stop', async (t) => {
  const h = await setup(t);
  const ada = await h.person('Ada'), bola = await h.person('Bola'), chi = await h.person('Chi', 'minor');
  assert.equal((await h.get('/api/watch/house', ada.cookie)).season, null);
  const started = await h.admin({ action: 'house.start', cities: ['lagos', 'abuja', 'ibadan', 'kano', 'port-harcourt'], mates: 8 });
  assert.equal(started.body.ok, true, JSON.stringify(started.body));
  assert.equal((await h.admin({ action: 'house.start' })).body.code, 'season_running');
  let view = (await h.get('/api/watch/house', ada.cookie)).season as Json;
  assert.ok(view.mates.length >= 6 && view.mates.length <= 8, `${view.mates.length} housemates`);
  for (const mate of view.mates) { assert.match(mate.label, /\(AI\)$/); assert.match(mate.id, /^resident\./); }
  h.to(view.startsAt + 13 * 3600000);
  await houseService(h.ctx).tick(h.f.now(), true);
  view = (await h.get('/api/watch/house', ada.cookie)).season as Json;
  assert.equal(view.phase, 'voting');
  assert.ok(view.mates.every((m: Json) => typeof m.diary === 'string' && m.diary.startsWith('Day ')), 'a diary-room line each');
  assert.ok(view.line > 0, 'the season start is a gist line');
  const [first, second] = view.mates as Json[];
  assert.equal((await h.post('/api/watch/house/vote', { mate: first!.id }, chi.cookie)).code, 'adults_only');
  assert.equal((await h.post('/api/watch/house/vote', { mate: 'resident.nowhere.x' }, ada.cookie)).code, 'unknown_housemate');
  assert.equal((await h.post('/api/watch/house/vote', { mate: first!.id }, ada.cookie)).ok, true);
  assert.equal((await h.post('/api/watch/house/vote', { mate: second!.id }, ada.cookie)).code, 'voted', 'once a week');
  assert.equal((await h.post('/api/watch/house/vote', { mate: first!.id }, bola.cookie)).ok, true);
  assert.equal((await h.get('/api/watch/house', ada.cookie)).season.voted, first!.id);
  // Sunday 20:00: the stage opens with the housemates on it (AI), the votes close.
  const season = await h.read((db) => peekWatch(db).house.season as HouseSeason);
  h.to(evictAt(season, 0) + 1000);
  await houseService(h.ctx).tick(h.f.now(), true);
  const stage = await h.read((db) => peekWorldEvents(db).stages['world:square']);
  assert.ok(stage, 'the eviction stage is open in the Square');
  assert.equal(stage!.kind, 'talk'); assert.match(stage!.title, /eviction night, week 1/);
  assert.ok(stage!.speakers.length > 0 && stage!.speakers.every((s) => s.ai === true));
  assert.equal((await h.post('/api/watch/house/vote', { mate: first!.id }, ada.cookie)).code, 'votes_closed');
  // 20:30: the reveal. Somebody with no save votes leaves (never the one two adults saved); the votes themselves are dropped.
  h.to(revealAt(season, 0) + 1000);
  await houseService(h.ctx).tick(h.f.now(), true);
  const done = await h.read((db) => peekWatch(db));
  const week = done.house.season!.weeks['0']!;
  assert.ok(week.evicted && week.evicted !== first!.id);
  assert.equal(week.tally![first!.id], 2); assert.equal(week.voters, 2);
  assert.deepEqual(Object.keys(done.votes), [], 'the ballots go once tallied');
  assert.match(await h.gistText(week.line!), /\(AI\) leaves the house in week 1, with 0% of the save votes/);
  const shown = (await h.get('/api/watch/house', bola.cookie)).season as Json;
  assert.equal(shown.mates.filter((m: Json) => !m.in).length, 1);
  assert.match(shown.weekList[0].out, /\(AI\)$/);
  // The house in 3D is a group room: the housemates still in stand in it, labelled.
  assert.deepEqual(h.ctx.checks!.roomCast!('g.5'), [], 'only the house room');
  assert.equal((await h.admin({ action: 'house.stop' })).body.ok, true);
  assert.equal((await h.get('/api/watch/house', ada.cookie)).season.phase, 'stopped');
  assert.equal((await h.admin({ action: 'house.start', room: 'world:room:g.5', mates: 6 })).body.ok, true);
  const cast = h.ctx.checks!.roomCast!('g.5');
  assert.equal(cast.length, 6);
  assert.ok(cast.every((who) => / \(AI\)$/.test(who.name)));
  assert.equal((await h.get('/api/watch/house', ada.cookie)).past[0].number, 1);
});

test('premieres: an adult applies; no name shows before approval; an approved artist premieres their own event; the front row; a decline takes it down', async (t) => {
  const h = await setup(t);
  const ada = await h.person('Ada'), bola = await h.person('Bola'), chi = await h.person('Chi', 'minor');
  const form = { name: 'Ada Sings', about: 'Afrobeats from Yaba.', links: ['https://instagram.com/adasings'], track: 'https://youtu.be/dQw4w9WgXcQ' };
  assert.equal((await h.post('/api/watch/artist/apply', form, chi.cookie)).code, 'adults_only');
  assert.equal((await h.post('/api/watch/artist/apply', { ...form, track: 'https://example.com/song.mp3' }, ada.cookie)).code, 'invalid_application', 'a YouTube link, never an upload');
  const applied = await h.post('/api/watch/artist/apply', form, ada.cookie);
  assert.equal(applied.artist.status, 'pending');
  assert.doesNotMatch(JSON.stringify(await h.get('/api/watch/premieres', bola.cookie)), /Ada Sings/, 'nobody else sees the name before approval');
  const made = await h.post('/api/feed/events', { title: 'Lagos Love: the premiere', about: 'My new song.', start: h.f.now() + 3 * 3600000, hours: 1 }, ada.cookie);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.equal((await h.post('/api/watch/premiere', { event: made.event.id }, ada.cookie)).code, 'not_approved');
  const queue = (await h.a.admin('/api/admin/watch', h.founder.cookie)).body as Json;
  assert.equal(queue.artists[0].name, 'Ada Sings'); assert.equal(queue.artists[0].status, 'pending');
  assert.equal((await h.admin({ action: 'artist.approve', id: ada.id })).body.ok, true);
  const theirs = await h.post('/api/feed/events', { title: 'Bola’s night', start: h.f.now() + 3 * 3600000, hours: 1 }, bola.cookie);
  assert.equal((await h.post('/api/watch/premiere', { event: theirs.event.id }, ada.cookie)).code, 'unknown_event', 'only the artist’s own event');
  const premiere = await h.post('/api/watch/premiere', { event: made.event.id }, ada.cookie);
  assert.equal(premiere.ok, true, JSON.stringify(premiere));
  assert.equal(premiere.premiere.track, 'dQw4w9WgXcQ', 'the artist sees their track');
  assert.equal((await h.post('/api/watch/premiere', { event: made.event.id }, ada.cookie)).code, 'already');
  assert.match(await h.gistText(premiere.premiere.line), /New music: Ada Sings premieres "Lagos Love: the premiere"/);
  let seen = ((await h.get('/api/watch/premieres', bola.cookie)).premieres as Json[])[0]!;
  assert.equal(seen.artist, 'Ada Sings'); assert.equal(seen.phase, 'upcoming'); assert.equal(seen.track, undefined, 'the track drops at the premiere');
  assert.equal((await h.post('/api/feed/events/rsvp', { id: made.event.id, answer: 'going' }, bola.cookie)).ok, true);
  seen = ((await h.get('/api/watch/premieres', bola.cookie)).premieres as Json[])[0]!;
  assert.deepEqual(seen.front, ['Bola']); assert.equal(seen.me.front, true);
  h.to(made.event.start + 60000);
  seen = ((await h.get('/api/watch/premieres', bola.cookie)).premieres as Json[])[0]!;
  assert.equal(seen.phase, 'live'); assert.equal(seen.track, 'dQw4w9WgXcQ');
  assert.equal((await h.admin({ action: 'artist.decline', id: ada.id, reason: 'Testing' })).body.ok, true);
  assert.deepEqual((await h.get('/api/watch/premieres', bola.cookie)).premieres, []);
  assert.equal((await h.get('/api/watch/premieres', ada.cookie)).artist.reason, 'Testing');
});
