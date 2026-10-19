import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: social — the social glue (docs/SOCIAL-GLUE.md, Phase 8 of docs/WOW-PLAN.md): close-friends presence (places in the game only, never
// to anyone but a close friend who is a friend and not blocked, off at once), the gist board (authors hidden from readers, kept for
// moderators and the reviewer, no names, "this is about me"), stage rooms (a talk on Phase 2's stage), group trips (everyone or nobody
// leaves) and marriage (two adults, both say yes, a ceremony in one place, a shared home, either ends it).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { fixture } from './test-fixture.ts';
import type { Device, TestSocket } from './test-fixture.ts';
import { boardService } from './glue/board.ts';
import { forgetGluePlayers } from './glue/forget.ts';
import { marriedBadge, peekGlue, sharesHome } from './glue/data.ts';
import { venuesFor } from '../src/game/cities/runtime.ts';
import { SQUARE_ROOM } from '../src/places/model.ts';
import type { SessionRecord } from './types.ts';

type Json = Record<string, any>;
async function setup(t: TestContext) {
  const f = await fixture(t, { env: { NEW_SESSIONS_PER_ADDRESS: '1000' } });
  const call = async (path: string, body?: unknown, who?: Device): Promise<Json> => { const res = await fetch(f.base + path, { method: body ? 'POST' : 'GET', headers: { Origin: f.base, ...(body ? { 'Content-Type': 'application/json' } : {}), ...(who ? { Cookie: who.cookie } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: res.status, ...(await res.json() as object) }; };
  async function player(name: string, { adult = true }: { adult?: boolean } = {}): Promise<Device> {
    const d = await f.device(name); await f.request('/api/life?city=lagos', null, d.cookie);
    await call('/api/growth/hello', { cityId: 'lagos' }, d);
    await call('/api/growth/consent', { cityId: 'lagos', age: adult ? 'adult' : 'minor' }, d);
    await call('/api/social/me', undefined, d);
    return d;
  }
  async function befriend(a: Device, b: Device): Promise<void> {
    assert.equal((await call('/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a)).code, 'requested');
    assert.equal((await call('/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b)).code, 'accepted');
  }
  /** Stand in the park (the room of a venue), with a live socket. */
  const at = (who: Device): Promise<TestSocket> => f.joinRoom(who);
  const session = (db: Parameters<Parameters<typeof f.server.store.read>[0]>[0], id: string): SessionRecord => Object.values(db.sessions).find((s) => s.publicId === id)!;
  return { f, call, player, befriend, at, session };
}

// ---- close friends -----------------------------------------------------------------------------------------------------------------
test('close friends: off by default; only a friend on the list sees the place in the game; never a stranger, a friend off the list or a block; off at once', async (t) => {
  const { call, player, befriend, at } = await setup(t);
  const tunde = await player('Tunde'), ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  await befriend(tunde, ada); await befriend(tunde, bola);
  await at(tunde);
  const none = await call('/api/glue/close', undefined, ada);
  assert.deepEqual([none.ok, none.on, none.now], [true, false, []], 'nobody shares until they choose to');
  assert.equal((await call('/api/glue/close', { add: chidi.id }, tunde)).code, 'friends_only', 'a stranger cannot be a close friend');
  const set = await call('/api/glue/close', { add: ada.id, on: true }, tunde);
  assert.deepEqual([set.ok, set.on, set.list.map((p: Json) => p.name)], [true, true, ['Ada']]);
  const seen = await call('/api/glue/close/now', undefined, ada);
  assert.equal(seen.now.length, 1);
  assert.equal(seen.now[0].name, 'Tunde');
  assert.match(seen.now[0].line, /^Tunde is at .+, Lagos$/);
  assert.equal(seen.now[0].place.kind, 'venue');
  // A place in the game only: no coordinate, no position of any kind, anywhere in the answer.
  assert.doesNotMatch(JSON.stringify(seen), /lat|lon|latitude|longitude|coords|position|\bx\b|\bz\b/i);
  assert.deepEqual(Object.keys(seen.now[0].place).sort(), ['city', 'cityName', 'kind', 'venue', 'venueName']);
  assert.deepEqual((await call('/api/glue/close/now', undefined, bola)).now, [], 'a friend who is not a close friend sees nothing');
  assert.deepEqual((await call('/api/glue/close/now', undefined, chidi)).now, [], 'a stranger sees nothing');
  // A block, either way, ends it.
  assert.equal((await call('/api/social/block', { id: tunde.id, cityId: 'lagos' }, ada)).ok, true);
  assert.deepEqual((await call('/api/glue/close/now', undefined, ada)).now, [], 'blocked: never');
  assert.equal((await call('/api/social/unblock', { id: tunde.id }, ada)).ok, true);
  await befriend(tunde, ada);
  assert.equal((await call('/api/glue/close', { add: ada.id }, tunde)).ok, true);
  assert.equal((await call('/api/glue/close/now', undefined, ada)).now.length, 1);
  // Turning it off stops it on the very next read.
  assert.equal((await call('/api/glue/close', { on: false }, tunde)).on, false);
  assert.deepEqual((await call('/api/glue/close/now', undefined, ada)).now, [], 'off: at once');
  await call('/api/glue/close', { on: true }, tunde);
  assert.equal((await call('/api/glue/close/now', undefined, ada)).now.length, 1);
  await call('/api/glue/close', { remove: ada.id }, tunde);
  assert.deepEqual((await call('/api/glue/close/now', undefined, ada)).now, [], 'taken off the list: at once');
});

// ---- the gist board ------------------------------------------------------------------------------------------------------------------
test('gist board: members read, adults post, no names; readers never get the author, moderators and the reviewer do', async (t) => {
  const { f, call, player } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bolanle'), chidi = await player('Chidi'), kid = await player('Kemi', { adult: false }), out = await player('Outsider');
  const made = await call('/api/feed/crews', { name: 'Yaba Tech Gist', kind: 'campus', colour: 'gold' }, ada);
  assert.equal(made.ok, true, JSON.stringify(made));
  const crew = made.crew;
  for (const who of [bola, chidi, kid]) assert.equal((await call('/api/feed/crews/join', { code: crew.code }, who)).ok, true);
  const key = `crew:${crew.id}`;
  assert.equal((await call(`/api/glue/board?key=${key}`, undefined, out)).code, 'members_only');
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'Who else is tired of the cafeteria rice?' }, out)).code, 'members_only');
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'Who else is tired of the cafeteria rice?' }, kid)).code, 'adults_only');
  assert.equal((await call(`/api/glue/board?key=${key}`, undefined, kid)).canPost, false, 'a member under 18 reads but does not post');
  // Names of members, and any @mention, are refused before anything is stored.
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'Chidi snores in the library every day' }, bola)).code, 'names_person');
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'chidi is always late to class, lol' }, bola)).code, 'names_person');
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'Somebody tell @kemz to stop' }, bola)).code, 'names_person');
  const posted = await call('/api/glue/board/posts', { board: key, body: 'Who else is tired of the cafeteria rice?' }, bola);
  assert.equal(posted.ok, true, JSON.stringify(posted));
  assert.equal(posted.post.status, 'review', 'not shown before the reviewer read it');
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'Another thought about the library hours' }, bola)).code, 'slow_down');
  assert.deepEqual((await call(`/api/glue/board?key=${key}`, undefined, chidi)).posts, []);
  const board = boardService(f.server.context);
  const facts = await f.server.store.read((db) => board.toReview(db, posted.post.id));
  assert.match(facts!.facts, /Written by "Bolanle"/, 'never anonymous to the reviewer');
  await f.server.store.transact((db) => board.reviewed(db, posted.post.id, { action: 'keep', reason: '' }));
  const reader = await call(`/api/glue/board?key=${key}`, undefined, chidi);
  assert.equal(reader.posts.length, 1);
  assert.equal(reader.posts[0].body, 'Who else is tired of the cafeteria rice?');
  assert.equal(reader.posts[0].by, undefined, 'a reader is not told who wrote it');
  assert.equal(reader.moderator, false);
  const raw = JSON.stringify(reader);
  assert.ok(!raw.includes(bola.id) && !raw.includes('Bolanle'), 'neither the id nor the name of the author is anywhere in a reader\'s answer');
  const author = await call(`/api/glue/board?key=${key}`, undefined, bola);
  assert.deepEqual([author.posts[0].mine, author.posts[0].by], [true, undefined], 'the author sees it is theirs, nothing more');
  const mod = await call(`/api/glue/board?key=${key}`, undefined, ada);
  assert.deepEqual([mod.moderator, mod.posts[0].by.name], [true, 'Bolanle'], 'the founder moderates and sees who wrote it');
  // "This is about me": off the board at once, back to the reviewer, and a reviewer's keep does not put it back; a moderator does.
  assert.equal((await call('/api/glue/board/report', { id: posted.post.id, aboutMe: true }, chidi)).ok, true);
  assert.deepEqual((await call(`/api/glue/board?key=${key}`, undefined, kid)).posts, [], 'held at once');
  await f.server.store.transact((db) => board.reviewed(db, posted.post.id, { action: 'keep', reason: '' }));
  const held = await call(`/api/glue/board?key=${key}`, undefined, ada);
  assert.deepEqual([held.posts.length, held.held.length, held.held[0].by.name, held.held[0].aboutMe], [0, 1, 'Bolanle', 1]);
  assert.equal((await call('/api/glue/board/moderate', { id: posted.post.id, action: 'restore' }, chidi)).code, 'not_moderator');
  assert.equal((await call('/api/glue/board/moderate', { id: posted.post.id, action: 'restore' }, ada)).ok, true);
  assert.equal((await call(`/api/glue/board?key=${key}`, undefined, chidi)).posts.length, 1);
  // A moderator's removal is a strike; three bar the author for a week.
  assert.equal((await call('/api/glue/board/moderate', { id: posted.post.id, action: 'remove' }, ada)).ok, true);
  assert.deepEqual((await call(`/api/glue/board?key=${key}`, undefined, chidi)).posts, []);
  for (const text of ['The new timetable is a mess honestly', 'Exams should not start at 7am']) {
    f.advance(61000);
    const p = await call('/api/glue/board/posts', { board: key, body: text }, bola);
    await f.server.store.transact((db) => board.reviewed(db, p.post.id, { action: 'remove', reason: 'Not allowed.' }));
  }
  f.advance(61000);
  assert.equal((await call('/api/glue/board/posts', { board: key, body: 'One more try at a normal post' }, bola)).code, 'barred');
  // Erasure: the author's posts go with them.
  await f.server.store.transact((db) => forgetGluePlayers(db, new Set([bola.id])));
  assert.equal(await f.server.store.read((db) => Object.values(peekGlue(db)!.posts).some((p) => p.by === bola.id)), false);
});

test('gist board: a crew of friends has none; the campus board is for current students', async (t) => {
  const { call, player } = await setup(t);
  const ada = await player('Ada');
  const crew = (await call('/api/feed/crews', { name: 'Just Us Four', colour: 'gold' }, ada)).crew;
  assert.equal((await call(`/api/glue/board?key=crew:${crew.id}`, undefined, ada)).code, 'unknown_board');
  assert.equal((await call('/api/glue/board?key=campus:unilag', undefined, ada)).code, 'students_only');
  assert.equal((await call('/api/glue/board?key=nonsense', undefined, ada)).code, 'unknown_board');
});

// ---- marriage ------------------------------------------------------------------------------------------------------------------------
test('marriage: two adults, both say yes, a ceremony where both stand, a shared home, either ends it', async (t) => {
  const { f, call, player, befriend, at } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi'), kid = await player('Kemi', { adult: false });
  await befriend(ada, bola); await befriend(ada, kid);
  assert.match((await call('/api/glue/family/propose', { to: kid.id, ring: 'gold' }, ada)).reason, /18 or older/, 'never someone under 18');
  assert.match((await call('/api/glue/family/propose', { to: chidi.id, ring: 'gold' }, ada)).reason, /friends/, 'friends first');
  assert.match((await call('/api/glue/family/propose', { to: ada.id, ring: 'gold' }, kid)).reason, /18 or older/);
  assert.equal((await call('/api/glue/family/propose', { to: bola.id, ring: 'tin' }, ada)).code, 'invalid_ring');
  const asked = await call('/api/glue/family/propose', { to: bola.id, ring: 'rose' }, ada);
  assert.equal(asked.ok, true, JSON.stringify(asked));
  assert.equal(asked.family.marriage.state, 'proposed');
  const waiting = await call('/api/glue/family', undefined, bola);
  assert.equal(waiting.asked.length, 1);
  const id = waiting.asked[0].id;
  // Only the person asked can say yes: not the one who asked, not anyone else.
  assert.equal((await call('/api/glue/family/answer', { id, yes: true }, ada)).code, 'no_proposal');
  assert.equal((await call('/api/glue/family/answer', { id, yes: true }, chidi)).code, 'no_proposal');
  assert.equal((await call('/api/glue/family/ceremony', {}, ada)).code, 'not_engaged', 'no ceremony without the yes');
  const yes = await call('/api/glue/family/answer', { id, yes: true }, bola);
  assert.equal(yes.family.marriage.state, 'engaged');
  assert.equal((await call('/api/glue/family/ceremony', {}, ada)).code, 'not_together', 'both must stand in the same place');
  const sockets = [await at(ada), await at(bola), await at(chidi)];
  const wed = await call('/api/glue/family/ceremony', {}, bola);
  assert.equal(wed.ok, true, JSON.stringify(wed));
  assert.equal(wed.family.marriage.state, 'married');
  assert.deepEqual(wed.family.marriage.guests, ['Chidi'], 'the people in the room are the guests');
  // The moment goes to the room.
  let moment: Json | null = null;
  for (let i = 0; i < 30 && !moment; i += 1) { const frame = await sockets[2]!.next().catch(() => null) as Json | null; if (!frame) break; if (frame.type === 'world-live' && frame.kind === 'moment') moment = frame; }
  assert.match(String(moment?.text), /Ada and Bola just got married/);
  // The married badge on a card, to anyone who may see the card.
  const card = (await call(`/api/social/players/${ada.id}`, undefined, chidi)).player;
  assert.deepEqual(card.married.to, { id: bola.id, name: 'Bola' });
  // A shared home: offered by its owner, only to the spouse.
  assert.equal(await f.server.store.read((db) => sharesHome(db, ada.id, bola.id)), false);
  const before = await call('/api/social/visit/enter', { host: ada.id }, bola);
  assert.equal(before.ok, false, 'a friend does not walk into an empty home');
  assert.equal((await call('/api/glue/family/home', { on: true }, ada)).ok, true);
  const inside = await call('/api/social/visit/enter', { host: ada.id }, bola);
  assert.equal(inside.code, 'inside', `the spouse comes into the shared home even while its owner is out: ${JSON.stringify(inside)}`);
  const sees = await call(`/api/social/visit/home?host=${ada.id}`, undefined, bola); assert.equal(sees.ok, true, JSON.stringify(sees));
  assert.equal((await call('/api/social/visit/enter', { host: ada.id }, chidi)).ok, false, 'nobody else does');
  assert.equal(await f.server.store.read((db) => sharesHome(db, ada.id, bola.id)), true);
  assert.equal(await f.server.store.read((db) => sharesHome(db, ada.id, chidi.id)), false);
  assert.equal(await f.server.store.read((db) => sharesHome(db, bola.id, ada.id)), false, 'each offers their own home');
  // Either ends it, alone; nothing else is touched.
  assert.equal((await call('/api/glue/family/divorce', {}, bola)).ok, true);
  assert.equal(await f.server.store.read((db) => marriedBadge(db, ada.id)), null);
  assert.equal(await f.server.store.read((db) => sharesHome(db, ada.id, bola.id)), false);
  assert.equal((await call(`/api/social/players/${ada.id}`, undefined, chidi)).player.married, undefined);
});

// ---- stage rooms -------------------------------------------------------------------------------------------------------------------
test('talks: an adult plans one where they stand, people ask to be reminded, the host opens Phase 2\'s stage in the window', async (t) => {
  const { f, call, player, befriend, at } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi'), kid = await player('Kemi', { adult: false });
  await befriend(ada, bola); await befriend(ada, kid);
  await at(ada);
  const rooms = (await call('/api/glue/talks', undefined, ada)).rooms;
  assert.deepEqual(rooms.map((r: Json) => r.room), [SQUARE_ROOM, 'lagos:park']);
  const start = f.now() + 20 * 60000;
  assert.equal((await call('/api/glue/talks', { title: 'Jollof wars', start, minutes: 60, room: 'lagos:park' }, kid)).code, 'adults_only');
  assert.equal((await call('/api/glue/talks', { title: 'Jollof wars', start, minutes: 60, room: 'lagos:park', speakers: [kid.id] }, ada)).code, 'adults_only', 'speakers are adults');
  assert.equal((await call('/api/glue/talks', { title: 'Jollof wars', start: f.now() + 60000, minutes: 60, room: 'lagos:park' }, ada)).code, 'invalid_time');
  assert.equal((await call('/api/glue/talks', { title: 'Jollof wars', start, minutes: 60, room: 'abuja:somewhere' }, ada)).code, 'invalid_room');
  const made = await call('/api/glue/talks', { title: 'Jollof wars', about: 'Ghana or Nigeria?', start, minutes: 60, room: 'lagos:park', speakers: [bola.id] }, ada);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.deepEqual([made.talk.phase, made.talk.speakers.map((p: Json) => p.name)], ['soon', ['Bola']]);
  const list = await call('/api/glue/talks', undefined, chidi);
  assert.equal(list.talks.length, 1);
  assert.equal((await call('/api/glue/talks/remind', { id: made.talk.id }, chidi)).talk.reminded, true);
  assert.equal((await call('/api/glue/talks/open', { id: made.talk.id }, ada)).code, 'too_early');
  f.advance(10 * 60000);
  assert.equal((await call('/api/glue/talks/open', { id: made.talk.id }, chidi)).code, 'not_host');
  const opened = await call('/api/glue/talks/open', { id: made.talk.id }, ada);
  assert.equal(opened.ok, true, JSON.stringify(opened));
  const stage = (await call('/api/world/stage?room=lagos:park', undefined, chidi)).stage;
  assert.deepEqual([stage.kind, stage.title, stage.moderator, stage.invitedPeople.map((p: Json) => p.name), stage.you], ['talk', 'Jollof wars', ada.id, ['Bola'], 'audience']);
  assert.equal((await call('/api/glue/talks', undefined, chidi)).talks[0].phase, 'live');
});

// ---- group trips -------------------------------------------------------------------------------------------------------------------
test('group trips: everyone answers, everyone online at the meeting point, all leave in one go or nobody does', async (t) => {
  const { f, call, player, at, session } = await setup(t);
  const ada = await player('Ada'), bola = await player('Bola'), chidi = await player('Chidi');
  const crew = (await call('/api/feed/crews', { name: 'Road Trip Crew', colour: 'gold' }, ada)).crew;
  for (const who of [bola, chidi]) assert.equal((await call('/api/feed/crews/join', { code: crew.code }, who)).ok, true);
  const to = venuesFor('lagos').find((v) => v.id !== 'park' && v.id !== 'home')!.id;
  assert.equal((await call('/api/glue/trips', { crew: crew.id, mode: 'danfo', to: 'park', cityId: 'lagos' }, ada)).code, 'invalid_destination');
  const made = await call('/api/glue/trips', { crew: crew.id, mode: 'danfo', to, cityId: 'lagos' }, ada);
  assert.equal(made.ok, true, JSON.stringify(made));
  assert.deepEqual(made.trip.members.map((m: Json) => m.answer).sort(), ['waiting', 'waiting', 'yes']);
  assert.match((await call('/api/glue/trips/go', { id: made.trip.id, cityId: 'lagos' }, ada)).reason, /Waiting for Bola and Chidi to answer/);
  assert.equal((await call('/api/glue/trips/answer', { id: made.trip.id, yes: true }, bola)).ok, true);
  assert.equal((await call('/api/glue/trips/answer', { id: made.trip.id, yes: false }, chidi)).ok, true);
  assert.equal((await call('/api/glue/trips/go', { id: made.trip.id, cityId: 'lagos' }, bola)).code, 'unknown_trip', 'only the organiser starts it');
  await at(ada);
  assert.equal((await call('/api/glue/trips/go', { id: made.trip.id, cityId: 'lagos' }, ada)).code, 'member_offline');
  await at(bola);
  // One person cannot pay: the whole departure is undone, nobody leaves and nobody pays.
  await f.server.store.transact((db) => { session(db, bola.id).cities.lagos!.state.cash = 0; });
  const cashBefore = await f.server.store.read((db) => session(db, ada.id).cities.lagos!.state.cash);
  const broke = await call('/api/glue/trips/go', { id: made.trip.id, cityId: 'lagos' }, ada);
  assert.equal(broke.ok, false);
  assert.match(broke.reason, /^Bola cannot leave/);
  assert.deepEqual(await f.server.store.read((db) => [session(db, ada.id).cities.lagos!.state.activeAction, session(db, ada.id).cities.lagos!.state.cash]), [null, cashBefore]);
  await f.server.store.transact((db) => { session(db, bola.id).cities.lagos!.state.cash = 5000; });
  const gone = await call('/api/glue/trips/go', { id: made.trip.id, cityId: 'lagos' }, ada);
  assert.equal(gone.ok, true, JSON.stringify(gone));
  assert.equal(gone.trip.state, 'gone');
  assert.match(gone.trip.card, /^2 of us took a danfo from .+ to .+, together$/);
  const trips = await f.server.store.read((db) => [ada.id, bola.id].map((id) => session(db, id).cities.lagos!.state.activeAction));
  assert.deepEqual(trips.map((a) => [a?.kind, a?.id, a?.remaining]), [['travel', to, trips[0]!.remaining], ['travel', to, trips[0]!.remaining]], 'the same trip, the same time: they arrive together');
  assert.equal(await f.server.store.read((db) => session(db, chidi.id).cities.lagos!.state.activeAction), null, 'who said no stays');
});
