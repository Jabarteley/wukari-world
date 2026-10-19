// OWNER: world events (docs/WORLD-EVENTS.md). The weekly event over HTTP and sockets: the schedule an admin edits, a counter only the
// server moves, the badge once, the AI helpers and the city change; stage mode's roles and voice; election night's board, speech and card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { admins, FOUNDER_ADDRESS } from './admin/admin.test.ts';
import { lagosTime } from '../src/game/clock.ts';
import { occurrenceOf } from '../src/world-events/model.ts';
import { nightTimes } from '../src/world-events/election-night.ts';
import { worldEventsService } from './world-events/service.ts';
import { nightService } from './world-events/night.ts';
import type { RouteContext, Database } from './types.ts';
import type { TestSocket } from './test-fixture.ts';

type Json = Record<string, any>;
type Setup = Awaited<ReturnType<typeof setup>>;
const pause = (ms = 30): Promise<void> => new Promise((done) => setTimeout(done, ms));

async function setup(t: Parameters<typeof admins>[0]) {
  const a = await admins(t), f = a.f;
  const founder = await a.account(FOUNDER_ADDRESS, 'Founder');
  const ctx = (f.server as unknown as { context: RouteContext }).context;
  const post = async (path: string, body: object, cookie: string): Promise<Json> => (await (await a.call(path, body, cookie)).json()) as Json;
  const get = async (path: string, cookie?: string): Promise<Json> => (await (await a.call(path, null, cookie ?? null)).json()) as Json;
  /** A played guest who said they are an adult. */
  async function adult(name: string) { const d = await a.player(name); assert.equal((await a.call('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, d.cookie)).status, 200); return d; }
  const admin = (body: Json) => a.admin('/api/admin/world-events', founder.cookie, body);
  /** This week's event day (Lagos date) under the schedule in force. */
  const eventDay = (): string => { const o = occurrenceOf(lagosTime(f.now()).week, worldEventsService(ctx).extras())!; return new Date(o.startsAt + 3600000).toISOString().slice(0, 10); };
  async function pin(item: object): Promise<void> {
    const saved = await admin({ action: 'event.save', item: { id: 'test-event', title: 'Rebuild the test bridge', blurb: 'Words.', city: 'lagos', target: 10, venues: [], change: { label: 'The new bridge', colours: ['#f0a830', '#2a9d8f'] }, on: eventDay(), ...item } });
    assert.equal(saved.status, 200, JSON.stringify(saved.body)); assert.equal(saved.body.ok, true, JSON.stringify(saved.body));
  }
  const event = async (): Promise<Json> => (await get('/api/world/event')).event as Json;
  const to = async (at: number): Promise<void> => { if (at > f.now()) f.advance(at - f.now()); };
  const tick = async (): Promise<void> => { f.advance(20000); await worldEventsService(ctx).tick(f.now(), true); };
  const step = (cookie: string, body: object) => post('/api/world/event/step', body, cookie);
  async function room(device: { cookie: string }, join: object): Promise<TestSocket> { const s = await f.socket(device); s.ws.send(JSON.stringify({ type: 'join', ...join })); await until(s, (m) => m.type === 'presence'); return s; }
  return { a, f, ctx, founder, post, get, adult, admin, pin, event, to, tick, step, room };
}
async function until(s: TestSocket, match: (frame: Json) => boolean): Promise<Json> {
  for (let k = 0; k < 40; k++) { const frame = (await s.next()) as unknown as Json; if (match(frame)) return frame; }
  throw new Error('frame not seen');
}
const occurrence = (h: Setup) => occurrenceOf(lagosTime(h.f.now()).week, worldEventsService(h.ctx).extras())!;
async function travel(h: Setup, cookie: string, id: string): Promise<void> {
  const went = await h.f.action(cookie, { type: 'travel', id, mode: 'cab' });
  assert.equal(went.ok, true, JSON.stringify(went));
  h.f.advance(10 * 60000);
  const life = (await h.get('/api/life?city=lagos', cookie)) as { state: { location: string } };
  assert.equal(life.state.location, id);
}

test('the week’s event is public and announced with its time; an admin edits the schedule; no accepted answer leaves the server', async (t) => {
  const h = await setup(t);
  const view = await h.get('/api/world/event');
  assert.equal(view.schedule.weekday, 6); assert.equal(view.schedule.hour, 20);
  assert.equal(view.event.phase, 'announced');
  assert.equal(lagosTime(view.event.startsAt).weekday, 6);
  assert.equal((await h.admin({ action: 'schedule.save', item: { weekday: 5, hour: 19, minute: 30, minutes: 90, warmup: 30 } })).status, 200);
  const moved = await h.event();
  assert.deepEqual([lagosTime(moved.startsAt).weekday, lagosTime(moved.startsAt).hour, lagosTime(moved.startsAt).minute], [5, 19, 30]);
  assert.equal(moved.endsAt - moved.startsAt, 90 * 60000);
  await h.pin({ goal: 'answer', questions: [{ q: 'What is the yellow bus?', answers: ['danfo'] }] });
  const quiz = await h.event();
  assert.equal(quiz.id, 'test-event'); assert.deepEqual(quiz.questions, [{ id: 'q1', q: 'What is the yellow bus?' }]);
  assert.ok(!JSON.stringify(await h.get('/api/world/event')).includes('danfo'), 'answers stay on the server');
  const ada = await h.adult('Ada');
  assert.equal((await h.a.admin('/api/admin/world-events', ada.cookie)).status, 404, 'only an admin edits it');
  const page = (await h.a.admin('/api/admin/world-events', h.founder.cookie)).body as Json;
  assert.equal(page.custom.length, 1); assert.equal(page.next.length, 4);
  assert.equal((await h.admin({ action: 'schedule.save', item: { weekday: 9, hour: 1, minute: 0, minutes: 60, warmup: 0 } })).body.ok, false);
});

test('a delivery counts only what the server saw: a load picked up in the first venue and put down in the second; a number from the page is ignored; one badge', async (t) => {
  const h = await setup(t);
  await h.pin({ goal: 'deliver', venues: ['park', 'library'] });
  const ada = await h.adult('Ada');
  assert.equal((await h.step(ada.cookie, { op: 'pickup' })).code, 'not_live', 'not before the start');
  await h.to(occurrence(h).startsAt + 1000);
  assert.equal((await h.step(ada.cookie, { op: 'drop', count: 999 })).code, 'not_carrying');
  assert.equal((await h.step(ada.cookie, { op: 'pickup' })).code, 'not_there', 'not standing in the park’s room');
  const life = (await h.get('/api/life?city=lagos', ada.cookie)) as { state: { location: string } };
  assert.equal(life.state.location, 'park');
  const socket = await h.room(ada, { cityId: 'lagos', venueId: 'park' });
  assert.equal((await h.step(ada.cookie, { op: 'pickup' })).code, 'picked_up');
  assert.equal((await h.step(ada.cookie, { op: 'pickup' })).code, 'carrying');
  assert.equal((await h.step(ada.cookie, { op: 'drop' })).code, 'not_there', 'the park is not where it goes');
  assert.equal((await h.event()).count, 0);
  await travel(h, ada.cookie, 'library');
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'library' })); await until(socket, (m) => m.type === 'presence');
  const dropped = await h.step(ada.cookie, { op: 'drop', count: 999 });
  assert.equal(dropped.code, 'delivered', JSON.stringify(dropped)); assert.equal(dropped.count, 1);
  assert.equal((await h.event()).count, 1, 'one load, one step, whatever the page said');
  assert.equal(dropped.mine.badge, true); assert.equal(dropped.mine.badges.length, 1);
  // A second load: the badge is not given again.
  await travel(h, ada.cookie, 'park');
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'park' })); await until(socket, (m) => m.type === 'presence');
  assert.equal((await h.step(ada.cookie, { op: 'pickup' })).code, 'picked_up');
  await travel(h, ada.cookie, 'library');
  h.f.advance(15 * 60000);
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'library' })); await until(socket, (m) => m.type === 'presence');
  assert.equal((await h.step(ada.cookie, { op: 'drop' })).code, 'too_late', 'a load held longer than twenty minutes slips');
  const me = await h.get('/api/world/event/me', ada.cookie);
  assert.equal(me.steps, 1); assert.equal(me.badges.length, 1, 'one badge per event'); assert.equal(me.badges[0].title, 'Rebuild the test bridge');
  assert.equal((await h.a.call('/api/world/event/step', { op: 'count' }, ada.cookie)).status, 400);
});

test('walking there counts once per person and venue; answers are checked on the server, one try a question', async (t) => {
  const h = await setup(t);
  await h.pin({ goal: 'gather', venues: ['library'] });
  const ada = await h.adult('Ada');
  await h.to(occurrence(h).startsAt + 1000);
  const socket = await h.room(ada, { cityId: 'lagos', venueId: 'park' });
  await pause();
  assert.equal((await h.event()).count, 0, 'the park is not one of the venues');
  await travel(h, ada.cookie, 'library');
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'library' })); await until(socket, (m) => m.type === 'presence');
  await pause(80);
  assert.equal((await h.event()).count, 1);
  socket.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'library' })); await until(socket, (m) => m.type === 'presence');
  await pause(80);
  assert.equal((await h.event()).count, 1, 'coming again does not count again');
  assert.equal((await h.step(ada.cookie, { op: 'answer', question: 'q1', answer: 'x' })).code, 'wrong_goal');
});

test('answers, then the AI residents’ share at the end fills the bar: the city changes for a week, the result is a gist line and a card', async (t) => {
  const h = await setup(t);
  const questions = Array.from({ length: 7 }, (_, k) => ({ q: `Question number ${k + 1}?`, answers: ['yes'] }));
  await h.pin({ goal: 'answer', questions });
  const ada = await h.adult('Ada');
  const socket = await h.f.socket(ada); void socket;
  await h.to(occurrence(h).startsAt + 1000);
  const wrong = await h.step(ada.cookie, { op: 'answer', question: 'q1', answer: 'no' });
  assert.equal(wrong.code, 'wrong_answer');
  assert.equal((await h.step(ada.cookie, { op: 'answer', question: 'q1', answer: 'yes' })).code, 'answered', 'one try a question');
  for (let k = 2; k <= 7; k++) assert.equal((await h.step(ada.cookie, { op: 'answer', question: `q${k}`, answer: ' YES ' })).code, 'right');
  const during = await h.event();
  assert.equal(during.count, 6); assert.equal(during.done, false);
  await h.tick();
  const midway = await h.event();
  assert.ok(midway.aiSteps >= 0 && midway.helpers.every((item: Json) => item.ai === true), 'every helper is marked AI');
  await h.to(occurrence(h).endsAt + 1000); await h.tick();
  const after = await h.event();
  assert.equal(after.phase, 'done');
  assert.equal(after.aiSteps, 3, '35% of ten, by the AI residents');
  assert.equal(after.count, 9); assert.equal(after.done, false, 'the AI alone never finish it');
  assert.ok(after.helpers.length >= 1 && after.helpers.every((item: Json) => item.ai === true));
  assert.match(after.resultLine.text, /^Lagos got 90% of the way: Rebuild the test bridge\. 1 person and \d AI residents? helped$/);
  // The card: the gist line, shared like any gist line.
  const share = await h.post('/api/growth/share', { cityId: 'lagos', kind: 'gist', record: after.resultLine.n }, ada.cookie);
  assert.equal(share.code, 'shared', JSON.stringify(share)); assert.equal(share.share.facts.headline, after.resultLine.text);
  assert.deepEqual((await h.get('/api/world/event')).changes, [], 'not reached: the city does not change');
});

test('reaching the goal changes the city for a week and puts the line in the gist', async (t) => {
  const h = await setup(t);
  await h.pin({ goal: 'answer', target: 10, questions: Array.from({ length: 8 }, (_, k) => ({ q: `Question number ${k + 1}?`, answers: ['yes'] })) });
  const ada = await h.adult('Ada');
  await h.f.socket(ada);
  await h.to(occurrence(h).startsAt + 1000);
  for (let k = 1; k <= 8; k++) await h.step(ada.cookie, { op: 'answer', question: `q${k}`, answer: 'yes' });
  await h.to(occurrence(h).endsAt + 1000); await h.tick();
  const view = await h.get('/api/world/event');
  assert.equal(view.event.done, true);
  assert.deepEqual(view.changes.map((item: Json) => [item.city, item.label]), [['lagos', 'The new bridge']]);
  assert.equal(view.changes[0].until, occurrence(h).endsAt + 7 * 86400000);
  const gist = await h.get('/api/world/gist?id=lagos');
  assert.ok(gist.items.some((item: Json) => /^Lagos did it: Rebuild the test bridge\./.test(item.text)), JSON.stringify(gist.items));
  h.f.advance(8 * 86400000); await h.tick();
  assert.deepEqual((await h.get('/api/world/event')).changes, [], 'a week later the change is gone');
});

test('warm-up drops: only in the Square, once each, while one is open', async (t) => {
  const h = await setup(t);
  await h.pin({ goal: 'gather', venues: ['library'] });
  const ada = await h.adult('Ada');
  assert.equal((await h.step(ada.cookie, { op: 'grab' })).code, 'no_drop');
  await h.to(occurrence(h).warmupAt + 60000);
  assert.equal((await h.step(ada.cookie, { op: 'grab' })).code, 'not_in_square');
  await h.room(ada, { place: 'square' });
  assert.equal((await h.step(ada.cookie, { op: 'grab' })).code, 'grabbed');
  assert.equal((await h.step(ada.cookie, { op: 'grab' })).code, 'already_grabbed');
  const view = await h.event();
  assert.equal(view.count, 1); assert.equal(view.drop.left, 19);
  // An admin's drop ("the admins are in town").
  h.f.advance(9 * 60000);
  assert.equal((await h.event()).drop, null);
  assert.equal((await h.admin({ action: 'drop' })).body.ok, true);
  assert.equal((await h.step(ada.cookie, { op: 'grab' })).code, 'grabbed');
});

// ---- stage mode and election night -------------------------------------------------------------------------------------------------
/** Put a city ballot of this week in the store as the civic module keeps it. */
async function ballot(h: Setup, week: number, candidates: { id: string; name: string }[], votes: Record<string, number>): Promise<void> {
  await h.f.server.store.transact((db: Database) => {
    const civic = ((db as unknown as Json).civic ??= { cities: {} }) as Json;
    civic.cities ??= {}; civic.cities.lagos ??= {};
    const city = civic.cities.lagos as Json;
    city.gov ??= { elections: {}, announcements: [] }; city.gov.elections ??= {};
    const record: Json = { candidates: {}, votes: {} };
    candidates.forEach((item, at) => { record.candidates[item.id] = { name: item.name, slogan: 'For all', at: at + 1 }; });
    for (const [id, n] of Object.entries(votes)) for (let k = 0; k < n; k++) record.votes[`voter-${id}-${k}`] = id;
    city.gov.elections[week] = record;
  });
}

test('election night: the live board, the result with its percentage after the close, the card, and the winner’s speech to the Square', async (t) => {
  const h = await setup(t);
  const ada = await h.adult('Ada'), tunde = await h.adult('Tunde'), bola = await h.adult('Bola');
  const week = lagosTime(h.f.now()).week, times = nightTimes(week);
  await ballot(h, week, [{ id: ada.id, name: 'Ada' }, { id: tunde.id, name: 'Tunde' }], { [ada.id]: 11, [tunde.id]: 7 });
  const live = await h.get('/api/world/election-night?city=lagos', bola.cookie);
  const seat = live.seats.find((item: Json) => item.scope === 'city:lagos');
  assert.deepEqual(seat.rows.map((row: Json) => [row.name, row.votes, row.percent]), [['Ada', 11, 61], ['Tunde', 7, 39]]);
  assert.equal(seat.winner, null, 'nobody has won while the polls are open'); assert.equal(seat.rows[0].leading, true);
  assert.equal((await h.post('/api/world/election-night/speech', { city: 'lagos', scope: 'city:lagos', text: 'Thank you Lagos!' }, ada.cookie)).code, 'not_results');
  assert.equal((await h.post('/api/world/election-night/card', { city: 'lagos', scope: 'city:lagos' }, bola.cookie)).code, 'no_result');
  await h.to(times.closesAt + 60000);
  const after = (await h.get('/api/world/election-night?city=lagos', bola.cookie)).seats.find((item: Json) => item.scope === 'city:lagos');
  assert.deepEqual(after.winner, { id: ada.id, name: 'Ada', percent: 61, ai: false });
  const card = await h.post('/api/world/election-night/card', { city: 'lagos', scope: 'city:lagos' }, bola.cookie);
  assert.equal(card.ok, true, JSON.stringify(card)); assert.equal(card.text, 'Ada wins Lagos with 61%');
  assert.equal((await h.post('/api/world/election-night/card', { city: 'lagos', scope: 'city:lagos' }, tunde.cookie)).n, card.n, 'written once');
  const share = await h.post('/api/growth/share', { cityId: 'lagos', kind: 'gist', record: card.n }, bola.cookie);
  assert.deepEqual([share.share.facts.headline, share.share.facts.city], ['Ada wins Lagos with 61%', 'Lagos']);
  // The speech: the winner only, once, screened, and it reaches the Square at once.
  const square = await h.room(bola, { place: 'square' });
  assert.equal((await h.post('/api/world/election-night/speech', { city: 'lagos', scope: 'city:lagos', text: 'Thank you!' }, tunde.cookie)).code, 'not_winner');
  assert.equal((await h.post('/api/world/election-night/speech', { city: 'lagos', scope: 'city:lagos', text: 'Call me on 08031234567' }, ada.cookie)).ok, false, 'a phone number is refused like in chat');
  const spoken = await h.post('/api/world/election-night/speech', { city: 'lagos', scope: 'city:lagos', text: 'Thank you Lagos! The roads come first.' }, ada.cookie);
  assert.equal(spoken.ok, true, JSON.stringify(spoken));
  const moment = await until(square, (m) => m.type === 'world-live' && m.kind === 'moment');
  assert.deepEqual([moment.name, moment.text], ['Ada', 'Thank you Lagos! The roads come first.']);
  assert.equal((await h.post('/api/world/election-night/speech', { city: 'lagos', scope: 'city:lagos', text: 'Again!' }, ada.cookie)).code, 'spoken');
  const stage = (await h.get('/api/world/stage?room=world:square', bola.cookie)).stage;
  assert.equal(stage.kind, 'speech'); assert.deepEqual(stage.speakers.map((item: Json) => item.id), [ada.id]);
  const night = (await h.get('/api/world/election-night?city=lagos', bola.cookie));
  assert.equal(night.speeches[0].text, 'Thank you Lagos! The roads come first.');
});

test('the Friday debate: a stage in the Square, candidates take their seats, adults raise hands, listeners cannot unmute, questions queue', async (t) => {
  const h = await setup(t);
  const ada = await h.adult('Ada'), tunde = await h.adult('Tunde'), bola = await h.adult('Bola'), kid = await h.a.player('Kid');
  const week = lagosTime(h.f.now()).week, times = nightTimes(week);
  await ballot(h, week, [{ id: ada.id, name: 'Ada' }, { id: tunde.id, name: 'Tunde' }], {});
  await h.to(times.debateAt + 60000);
  await nightService(h.ctx).tick(h.f.now(), true);
  const view = await h.get('/api/world/election-night?city=lagos', bola.cookie);
  assert.deepEqual(view.debates.map((item: Json) => item.scope), ['city:lagos']);
  const sq = { bola: await h.room(bola, { place: 'square' }), ada: await h.room(ada, { place: 'square' }), kid: await h.room(kid, { place: 'square' }) };
  const stage = (await h.get('/api/world/stage?room=world:square', bola.cookie)).stage;
  assert.equal(stage.kind, 'debate'); assert.equal(stage.moderator, null);
  assert.deepEqual(stage.invitedPeople.map((item: Json) => item.name).sort(), ['Ada', 'Tunde']);
  const act = (who: { cookie: string }, body: object) => h.post('/api/world/stage', { room: 'world:square', ...body }, who.cookie);
  assert.equal((await act(ada, { op: 'seat' })).ok, true);
  assert.equal((await act(bola, { op: 'seat' })).code, 'not_invited');
  assert.equal((await act(tunde, { op: 'seat' })).code, 'not_in_room', 'a candidate who is not in the Square cannot sit');
  assert.equal((await act(kid, { op: 'hand' })).code, 'adults_only');
  assert.equal((await act(bola, { op: 'hand' })).ok, true);
  assert.equal((await act(bola, { op: 'invite', target: bola.id })).code, 'not_moderator');
  assert.equal((await act(kid, { op: 'ask', text: 'What about schools?' })).ok, true, 'anyone in the room asks in writing');
  const asked = await act(bola, { op: 'ask', text: 'What about the roads?' });
  assert.equal(asked.ok, true); assert.equal(asked.stage.queue.length, 2);
  assert.equal((await act(bola, { op: 'ask', text: 'Call 08031234567 now' })).ok, false);
  // Voice: a listener's unmute is refused by the server; a speaker may talk.
  sq.bola.ws.send(JSON.stringify({ type: 'voice-state', enabled: true, muted: false }));
  assert.equal((await until(sq.bola, (m) => m.type === 'error')).code, 'stage_listener');
  assert.equal(h.ctx.checks.stageMayTalk?.('world:square', ada.id), true);
  assert.equal(h.ctx.checks.stageMayTalk?.('world:square', bola.id), false);
  assert.equal(h.ctx.checks.stagePair?.('world:square', ada.id, kid.id), true, 'a speaker reaches anyone in the room');
  assert.equal(h.ctx.checks.stagePair?.('world:square', bola.id, kid.id), false);
  // The game moves the queue by itself; an admin can name a moderator, who then runs it.
  h.f.advance(15000); await nightService(h.ctx).tick(h.f.now(), true);
  const named = await h.admin({ action: 'stage.moderator', room: 'world:square', moderator: bola.id });
  assert.equal(named.body.ok, true, JSON.stringify(named.body));
  assert.equal((await act(bola, { op: 'pick', question: asked.stage.queue[1].id })).ok, true);
  assert.equal((await act(kid, { op: 'pick', question: asked.stage.queue[0].id })).code, 'not_moderator');
  assert.equal((await act(bola, { op: 'end' })).ok, true);
  assert.equal((await act(bola, { op: 'hand' })).code, 'no_stage');
});
