import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// Agents in places (docs/AGENTS.md, "Services: agents as mini programs"): an AI agent stands in the Square or in a group's room without its life moving,
// is seen there with the AI-played mark, talks and listens, and offers a service on a small card. A real server with a fake clock; people join the
// place with a socket, as the page does (server/places.test.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { world } from './test-world.ts';
import type { Json, World } from './test-world.ts';
import type { Device, TestSocket } from '../test-fixture.ts';
import { SERVICE } from '../../src/places/model.ts';
import { serve } from '../../scripts/agents/service-agent.ts';

interface Frame { type: string; body?: string; speaker?: string; members: { id: string; name: string; agent?: boolean }[] }
const next = async (peer: TestSocket): Promise<Frame> => (await peer.next()) as unknown as Frame;
const say = (peer: TestSocket, message: object) => peer.ws.send(JSON.stringify(message));
/** Read frames until one of `type` that `accept` takes. */
async function until(peer: TestSocket, type: string, accept: (frame: Frame) => boolean = () => true): Promise<Frame> {
  for (let i = 0; i < 300; i += 1) { const frame = await next(peer); if (frame.type === type && accept(frame)) return frame; }
  throw Error(`No ${type} frame`);
}
const seesAgent = (id: string) => (frame: Frame) => frame.members.some((member) => member.id === id && member.agent === true);
const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null;
const reply = async (res: Response): Promise<Json> => { const body: unknown = await res.json(); return { ...(isRecord(body) ? body : {}), status: res.status }; };

/** A person who has opened the game and is known to the social module. */
async function person(w: World, name: string): Promise<Device> {
  const device = await w.f.device(name);
  await w.f.request('/api/life?city=lagos', null, device.cookie);
  await w.f.request('/api/social/me', null, device.cookie);
  return device;
}
/** An agent that signed itself up, and its public id. */
async function agent(w: World, name: string) {
  const made = await w.signup(name);
  assert.equal(made.ok, true, JSON.stringify(made.data));
  // Its life starts with its first call.
  assert.equal((await w.tool(made.key, 'get_my_life')).ok, true);
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === name)?.publicId ?? '');
  return { key: made.key, id, name };
}
const serviceOf = (w: World, id: string) => w.stored((db) => (db.social?.players[id] as { service?: unknown } | undefined)?.service);
const lifeLocation = async (w: World, id: string) => w.stored((db) => Object.values(db.sessions).find((s) => s.publicId === id)?.cities.lagos?.state?.location);

test('an agent enters the Square: people there see it with the AI-played mark, its line reaches them and theirs come back through read_here; its life does not move', async (t) => {
  const w = await world(t);
  const wanda = await person(w, 'Wanda'), bot = await agent(w, 'Robo Square');
  const room = await w.f.socket(wanda);
  say(room, { type: 'join', place: 'square' });
  await until(room, 'presence');
  const where = await lifeLocation(w, bot.id);
  const entered = await w.tool(bot.key, 'enter_place', { place: 'square' });
  assert.equal(entered.ok, true, JSON.stringify(entered.data));
  await until(room, 'presence', seesAgent(bot.id));
  assert.equal(await lifeLocation(w, bot.id), where, 'a place is not where the life is');

  const said = await w.tool(bot.key, 'say_here', { text: 'Hello Square, I am an AI.' });
  assert.equal(said.ok, true, JSON.stringify(said.data));
  const line = await until(room, 'chat', (frame) => frame.speaker === 'agent');
  assert.equal(line.body, 'Hello Square, I am an AI.');
  say(room, { type: 'chat', body: 'Welcome, Robo!', clientId: 'wanda-square-0001' });
  await until(room, 'chat', (frame) => frame.body === 'Welcome, Robo!');
  const heard = await w.tool(bot.key, 'read_here', {});
  assert.ok((heard.data.lines as { from: string; text: string }[]).some((item) => item.from === 'Wanda' && item.text === 'Welcome, Robo!'), JSON.stringify(heard.data));
  const people = await w.tool(bot.key, 'list_people_here', {});
  assert.deepEqual([people.data.here, (people.data.players as { id: string }[]).map((p) => p.id)], ['square', [wanda.id]]);
});

test('a service card: shown to the agent\'s neighbours and on the public route; a link or a phone number refuses the whole card and stores nothing; off takes it down', async (t) => {
  const w = await world(t);
  const bot = await agent(w, 'Robo Quiz'), wanda = await person(w, 'Wanda');
  const room = await w.f.socket(wanda);
  say(room, { type: 'join', place: 'square' });
  await until(room, 'presence');
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'square' })).ok, true);
  assert.deepEqual((await w.json('/api/agents/services')).services, [], 'no card yet');

  for (const [title, about] of [['Quiz night', 'Ring me on 08031234567 for prizes'], ['Visit http://example.com', 'A quiz'], ['Quiz night', 'Mail me at quiz@example.com']]) {
    const refused = await w.tool(bot.key, 'set_service', { kind: 'quiz', title, about });
    assert.equal(refused.ok, false, `${title} / ${about}`);
    assert.equal(typeof refused.data.result, 'string');
  }
  assert.equal(await serviceOf(w, bot.id), undefined, 'a refused card stores nothing');
  assert.equal((await w.tool(bot.key, 'set_service', { kind: 'chess', title: 'Quiz', about: 'x' })).ok, false, 'an unknown kind');
  assert.equal((await w.tool(bot.key, 'set_service', { kind: 'quiz', title: 'T'.repeat(SERVICE.title + 1), about: 'x' })).ok, false, 'too long');
  assert.equal((await w.tool(bot.key, 'set_service', { kind: 'quiz', title: 'Quiz', about: 'a\nb' })).ok, false, 'one line');

  const set = await w.tool(bot.key, 'set_service', { kind: 'quiz', title: 'Square quiz', about: 'One general-knowledge question every minute. Answer in the chat.' });
  assert.equal(set.ok, true, JSON.stringify(set.data));
  const listed = await w.tool(bot.key, 'list_services', {});
  assert.deepEqual(listed.data.services, [{ name: 'Robo Quiz', kind: 'quiz', title: 'Square quiz', about: 'One general-knowledge question every minute. Answer in the chat.', where: 'the Square' }]);
  const open = await w.json('/api/agents/services');
  assert.deepEqual([open.status, open.ok, open.services], [200, true, [{ name: 'Robo Quiz', kind: 'quiz', title: 'Square quiz', about: 'One general-knowledge question every minute. Answer in the chat.' }]]);
  assert.match(String((await w.call('/api/agents/services')).headers.get('cache-control')), /public/);
  // Another agent sees it too, and so does the card on the place's people list.
  const other = await agent(w, 'Robo Two');
  assert.equal((await w.tool(other.key, 'enter_place', { place: 'square' })).ok, true);
  assert.equal(((await w.tool(other.key, 'list_services', {})).data.services as unknown[]).length, 1);
  const seen = await w.tool(other.key, 'list_people_here', {});
  assert.ok((seen.data.players as { id: string; service?: { title: string } }[]).some((p) => p.id === bot.id && p.service?.title === 'Square quiz'), JSON.stringify(seen.data));

  // Saved data is untrusted: a card of the wrong shape is not shown, and nothing crashes.
  await w.change((db) => { (db.social!.players[bot.id] as { service?: unknown }).service = { kind: 'weapons', title: 5, about: null, at: 'now' }; });
  assert.deepEqual((await w.json('/api/agents/services')).services, []);
  assert.equal((await w.tool(other.key, 'list_services', {})).ok, true);

  assert.equal((await w.tool(bot.key, 'set_service', { off: true })).ok, true);
  assert.equal(await serviceOf(w, bot.id), undefined);
});

test('leave_place puts the agent back in the venue of its life, and going anywhere ends the place too', async (t) => {
  const w = await world(t);
  const wanda = await person(w, 'Wanda'), bola = await person(w, 'Bola'), bot = await agent(w, 'Robo Back');
  const here = String(await lifeLocation(w, bot.id));
  const inSquare = await w.f.socket(wanda), inVenue = await w.f.socket(bola);
  say(inSquare, { type: 'join', place: 'square' });
  await until(inSquare, 'presence');
  say(inVenue, { type: 'join', cityId: 'lagos', venueId: here });
  await until(inVenue, 'presence');
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'square' })).ok, true);
  await until(inSquare, 'presence', seesAgent(bot.id));
  assert.equal((await w.tool(bot.key, 'list_people_here', {})).data.here, 'square');

  const left = await w.tool(bot.key, 'leave_place', {});
  assert.deepEqual([left.ok, left.data.code], [true, 'left']);
  await until(inVenue, 'presence', seesAgent(bot.id));
  const venue = await w.tool(bot.key, 'list_people_here', {});
  assert.equal(venue.data.here, here);
  assert.ok((venue.data.players as { id: string }[]).some((p) => p.id === bola.id), JSON.stringify(venue.data));
  assert.equal((await w.tool(bot.key, 'leave_place', {})).data.code, 'not_in_place');

  // Standing in the Square, a trip to another place ends the note: the agent is not in the Square afterwards.
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'square' })).ok, true);
  const places = (await w.tool(bot.key, 'list_places', {})).data.places as { id: string; cheapest?: unknown }[];
  const trip = places.find((place) => place.cheapest);
  assert.ok(trip, 'somewhere to go');
  assert.equal((await w.tool(bot.key, 'travel', { place: trip.id })).ok, true);
  assert.notEqual((await w.tool(bot.key, 'list_people_here', {})).data.here, 'square');
  assert.deepEqual((await w.tool(bot.key, 'list_services', {})).data.place, 'the Square', 'not in a place: the Square is what it reads');
});

test('a place note is forgotten when it runs out, and a dead or malformed room link is refused with the game\'s own sentence', async (t) => {
  const w = await world(t);
  const bot = await agent(w, 'Robo Lost');
  const dead = await w.tool(bot.key, 'enter_place', { place: 'room', link: '/r/9-AAAAAAAAAAAAAAAAAAAAAA' });
  assert.deepEqual([dead.ok, dead.data.code, dead.data.result], [false, 'link_ended', 'That link has ended. Ask for a new one.']);
  const malformed = await w.tool(bot.key, 'enter_place', { place: 'room', link: 'not a link' });
  assert.deepEqual([malformed.ok, malformed.data.code], [false, 'invalid_link']);
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'room' })).ok, false, 'a room needs its link');
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'moon' })).ok, false);

  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'square' })).ok, true);
  assert.equal((await w.tool(bot.key, 'list_people_here', {})).data.here, 'square');
  w.f.advance(10 * 60000);
  assert.notEqual((await w.tool(bot.key, 'list_people_here', {})).data.here, 'square', 'a host that sleeps, or a key that goes quiet, forgets it');
});

test('an agent enters a group\'s room by its real link, is seen there, talks with the members, and loses its place when the link is switched off', async (t) => {
  const w = await world(t);
  const ada = await person(w, 'Ada'), bola = await person(w, 'Bola'), bot = await agent(w, 'Robo Guest');
  const post = async (path: string, body: object, who: Device): Promise<Json> => reply(await w.f.request(path, body, who.cookie));
  assert.equal((await post('/api/social/friends/request', { to: bola.id, cityId: 'lagos' }, ada)).ok, true);
  assert.equal((await post('/api/social/friends/answer', { from: ada.id, accept: true, cityId: 'lagos' }, bola)).ok, true);
  const made = await post('/api/social/groups', { name: 'Night shift', members: [bola.id], clientId: w.f.id() }, ada);
  const id = (made.conv as { id: string }).id;
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'room', link: '/r/1-AAAAAAAAAAAAAAAAAAAAAA' })).ok, false, 'no link yet');
  const link = await post('/api/places/room/link', { id, on: true }, ada);
  const path = ((link.room as Json).link as { path: string }).path;

  const inRoom = await w.f.socket(ada);
  say(inRoom, { type: 'join', place: 'room', roomId: id });
  await until(inRoom, 'presence');
  const entered = await w.tool(bot.key, 'enter_place', { place: 'room', link: `${w.f.base}${path}` });
  assert.equal(entered.ok, true, JSON.stringify(entered.data));
  assert.equal(entered.data.name, 'Night shift');
  await until(inRoom, 'presence', seesAgent(bot.id));
  assert.equal((await w.tool(bot.key, 'say_here', { text: 'Good evening, I can run a quiz here.' })).ok, true);
  assert.equal((await until(inRoom, 'chat', (frame) => frame.speaker === 'agent')).body, 'Good evening, I can run a quiz here.');
  say(inRoom, { type: 'chat', body: 'Go on then!', clientId: 'ada-room-0001' });
  await until(inRoom, 'chat', (frame) => frame.body === 'Go on then!');
  assert.ok(((await w.tool(bot.key, 'read_here', {})).data.lines as { text: string }[]).some((item) => item.text === 'Go on then!'));
  const people = (await w.tool(bot.key, 'list_people_here', {})).data;
  assert.deepEqual([people.here, (people.players as { id: string }[]).map((p) => p.id)], ['room', [ada.id]]);
  assert.equal((await w.tool(bot.key, 'set_service', { kind: 'games', title: 'Room games', about: 'Ask me for a riddle.' })).ok, true);
  assert.deepEqual(((await w.tool(bot.key, 'list_services', {})).data.services as { where: string }[]).map((row) => row.where), ['this room']);
  assert.deepEqual((await w.json('/api/agents/services')).services, [], 'the public route lists the Square only');
  assert.ok(((await w.f.request(`/api/places/room?id=${id}`, null, ada.cookie).then(reply)).room as { here: { id: string; service?: unknown }[] }).here.some((p) => p.id === bot.id), 'the room lists it for its members');

  // The link goes off: the agent's pass ends; it is out of the room at once and can no longer speak there.
  assert.equal((await post('/api/places/room/link', { id, on: false }, ada)).code, 'off');
  let gone = false;
  for (let i = 0; i < 40 && !gone; i += 1) { await new Promise((resolve) => setTimeout(resolve, 50)); gone = !((await w.f.request(`/api/places/room?id=${id}`, null, ada.cookie).then(reply)).room as { here: { id: string }[] }).here.some((p) => p.id === bot.id); }
  assert.equal(gone, true, 'the agent left the room when its pass ended');
  assert.notEqual((await w.tool(bot.key, 'list_people_here', {})).data.here, 'room');
  assert.equal((await w.tool(bot.key, 'enter_place', { place: 'room', link: path })).data.code, 'link_ended');
});

test('the places routes are open to agents through call_api, like any player route', async (t) => {
  const w = await world(t);
  const bot = await agent(w, 'Robo Api');
  const routes = (await w.tool(bot.key, 'list_api', { match: 'places' })).data.routes as string[];
  for (const key of ['GET /api/places', 'GET /api/places/square', 'GET /api/places/room', 'POST /api/places/room/edit', 'POST /api/places/room/link', 'POST /api/places/room/remove', 'POST /api/places/room/enter']) assert.ok(routes.includes(key), key);
  const seen = await w.tool(bot.key, 'call_api', { method: 'GET', path: '/api/places' });
  assert.equal(seen.ok, true, JSON.stringify(seen.data));
  const services = await w.tool(bot.key, 'call_api', { method: 'GET', path: '/api/agents/services' });
  assert.equal(services.ok, true, JSON.stringify(services.data));
  const names = ((await w.mcp(bot.key, 'tools/list')).json.result as { tools: { name: string }[] }).tools.map((tool) => tool.name);
  for (const name of ['enter_place', 'leave_place', 'set_service', 'list_services']) assert.ok(names.includes(name), name);
});

/** The sample service agent (scripts/agents/service-agent.ts) against a real server: a person in the Square talks to it, and it answers with its rules. */
async function serveWith(t: Parameters<typeof world>[0], service: 'quiz' | 'guide', talk: (round: number, heard: string[], send: (text: string) => void) => void) {
  const w = await world(t);
  const wanda = await person(w, 'Wanda'), room = await w.f.socket(wanda);
  say(room, { type: 'join', place: 'square' });
  await until(room, 'presence');
  const heard: string[] = [];
  room.ws.on('message', (data) => { const frame = JSON.parse(data.toString()) as Frame; if (frame.type === 'chat' && frame.speaker === 'agent' && typeof frame.body === 'string') heard.push(frame.body); });
  let round = 0, sent = 0;
  const send = (text: string) => { say(room, { type: 'chat', body: text, clientId: `wanda-sample-${String(++sent).padStart(4, '0')}` }); };
  const report = await serve({ url: `${w.f.base}/mcp`, create: `Sample ${service}`, service, minutes: 3, sleep: async (ms) => { w.f.advance(ms); round += 1; talk(round, heard, send); await new Promise((resolve) => setTimeout(resolve, 40)); }, now: () => w.f.now() });
  return { w, heard, report };
}

test('the sample guide agent stands in the Square with a card and answers a question and a city', async (t) => {
  const { w, heard, report } = await serveWith(t, 'guide', (round, _heard, send) => { if (round === 2) send('What can I do here?'); if (round === 5) send('Tell me about Lagos please'); });
  assert.ok(heard.some((line) => line.startsWith('You can ask me about')), JSON.stringify(heard));
  assert.ok(heard.some((line) => line.startsWith('In Lagos,')), JSON.stringify(heard));
  assert.equal(report.said.length, heard.length);
  assert.deepEqual((await w.json('/api/agents/services')).services, [], 'it left the Square when it finished');
});

test('the sample quiz agent asks a question and says who answered first', async (t) => {
  const { heard } = await serveWith(t, 'quiz', (_round, said, send) => { if (said.some((line) => line.includes('capital of Nigeria')) && !said.some((line) => line.includes('answered first'))) send('Abuja'); });
  assert.ok(heard.some((line) => line.includes('Quiz time! What is the capital of Nigeria?')), JSON.stringify(heard));
  assert.ok(heard.some((line) => line === 'Wanda answered first: abuja. Well done!'), JSON.stringify(heard));
});
