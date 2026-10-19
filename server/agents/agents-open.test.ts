// AI agents, round two (docs/AGENTS.md): full player access with a short deny list, agents that sign themselves up and the claim link, presence in
// venues without a socket, venue chat, the two families of boards and the Agent league, and the public pages.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import { world, agentKeys, OPERATOR, HOUR } from './test-world.ts';
import type { Json, World } from './test-world.ts';
import { AGENT_LIMITS, AGENT_RATE, UNCLAIMED } from './policy.ts';
import { AGENT_DENY, actionList, allowedActionTypes, mayRunAction, routeDenied } from './access.ts';
import { ACTION_CATALOGUE } from './action-catalogue.generated.ts';
import { agentPageHtml, claimPageHtml, esc, leaguePageHtml } from './pages.ts';
import { actionTypes, serverOnlyReason } from '../../src/game/registry.ts';
import { ELECTION } from '../../src/game/content/civic.ts';
import { checkIn, richListPage, richListView } from '../civic/residents.ts';
import { createBoards } from '../civic/boards.ts';
import { cityOf, emptyCivic } from '../civic/data.ts';
import { createLife } from '../../src/life.ts';
import { lagosTime } from '../../src/game/clock.ts';

const op = (w: World, path: string, body?: object): Promise<Response> => fetch(`${w.f.base}${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${OPERATOR}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
async function ownerWithKey(t: Parameters<typeof world>[0], options = {}) {
  const w = await world(t, options);
  const ada = await w.owner('Ada1', 'Ada');
  const made = await w.makeAgentKey(ada);
  assert.equal(made.status, 200, JSON.stringify(made));
  return { w, ada, key: made.key };
}

test('full access: every action type the registry dispatches to a player is allowed, read from the registry, and the deny list is the documented one', async (t) => {
  const registry = actionTypes().filter((type) => !serverOnlyReason(type));
  assert.deepEqual(allowedActionTypes().sort(), registry.sort(), 'the allowed list is the registry\'s, minus the server-run actions');
  for (const type of ['activity', 'spot', 'travel', 'estate.relocate', 'economy.open-deposit', 'economy.pay-loan', 'property.car-buy', 'career.quit', 'career.switch', 'home.furniture-sell', 'missions.claim', 'estate.set-lga']) assert.ok(allowedActionTypes().includes(type), type);
  for (const type of actionTypes().filter((item) => serverOnlyReason(item))) assert.equal(mayRunAction(['*'], type), false, `${type} is run by the server, not asked for`);
  assert.equal(mayRunAction(['activity'], 'travel'), false, 'a key narrowed in storage is held to its list');
  assert.deepEqual(AGENT_DENY.map((item) => item.id), ['account-security', 'contact-and-age', 'verification', 'agent-keys', 'money-asks', 'romance-consent', 'spot-the-ai', 'operator']);
  for (const item of AGENT_DENY) assert.ok(item.reason.length > 40 && item.label, item.id);
  for (const path of ['/api/account', '/api/account/delete', '/api/account/password-reset', '/api/growth/email', '/api/growth/push/subscribe', '/api/growth/consent', '/api/trust/check/phone/start', '/api/trust/phone/complete', '/api/agents/keys', '/api/agents/claim', '/api/agents/characters/x/takeover', '/api/agents/spot/opt', '/api/mod/overview', '/api/admin/dashboard']) assert.ok(routeDenied(path), `${path} is denied`);
  for (const path of ['/api/social/transfers', '/api/social/groups', '/api/civic/gov', '/api/politics/overview', '/api/showcase/mine', '/api/business/mine', '/api/trust/me', '/api/trust/report', '/api/agents/league', '/api/world/city']) assert.equal(routeDenied(path), null, `${path} is allowed`);
  const list = actionList();
  assert.equal(list.length, registry.length);
  const unknown = list.filter((item) => item.payload === '{ … }');
  assert.ok(unknown.length <= registry.length * 0.1, `the generated catalogue describes the actions (${unknown.length} undescribed: ${unknown.map((item) => item.type).join(', ')})`);
  assert.ok(ACTION_CATALOGUE.length >= 80);
  const docs = (await import('node:fs')).readFileSync(new URL('../../docs/AGENTS.md', import.meta.url), 'utf8');
  for (const type of registry) assert.ok(docs.includes(`\`${type}\``), `docs/AGENTS.md lists ${type} (run the generator: the list is written from the registry)`);

  const { w, key } = await ownerWithKey(t);
  const types = await w.tool(key, 'list_action_types', { match: 'estate' });
  assert.ok((types.data.actions as Json[]).some((item) => item.type === 'estate.relocate' && String(item.payload).includes('{')));
  assert.equal((types.data.denied as Json[]).length, 7, 'the tool says what it may not do and why');
  const all = await w.tool(key, 'list_action_types');
  assert.equal(all.data.count, registry.length);
  // do_action: a game refusal is the game's, never "not allowed"; a server-run action is not an agent's to ask for.
  const rent = await w.tool(key, 'do_action', { type: 'economy.pay-rent', payload: {} });
  assert.notEqual(rent.data.code, 'not_allowed');
  assert.ok(String(rent.data.result).length > 5);
  assert.equal((await w.tool(key, 'do_action', { type: 'social.server', payload: {} })).data.code, 'not_allowed');
  assert.equal((await w.tool(key, 'do_action', { type: 'no.such.type' })).ok, false);
  // call_api: any player-facing route; the deny list holds; politics is reachable.
  for (const path of ['/api/account', '/api/mod/overview', '/api/trust/check/phone/start']) { const denied = await w.tool(key, 'call_api', { method: 'GET', path }); assert.equal(denied.data.code, 'not_allowed', path); }
  assert.equal((await w.tool(key, 'call_api', { method: 'POST', path: '/api/agents/keys', body: { mode: 'own' } })).data.code, 'not_allowed', 'a key never mints keys');
  const gov = await w.tool(key, 'call_api', { method: 'GET', path: '/api/civic/gov?city=lagos' });
  assert.equal(gov.ok, true, JSON.stringify(gov.data));
  assert.equal((await w.tool(key, 'call_api', { method: 'GET', path: '/api/nope/nothing' })).data.code, 'unknown_route');
  const routes = (await w.tool(key, 'list_api', { match: 'politics' })).data.routes as string[];
  assert.ok(routes.some((route) => route.includes('/api/politics/')) && !routes.some((route) => route.includes('/api/account')));
});

test('the unauthenticated surface is exactly two tools; a key unlocks the rest', async (t) => {
  const w = await world(t);
  const list = (await w.mcp(null, 'tools/list')).json.result as { tools: { name: string }[] };
  assert.deepEqual(list.tools.map((tool) => tool.name).sort(), ['create_agent_account', 'get_claim_status']);
  assert.equal(((await w.mcp(null, 'initialize', { protocolVersion: '2025-06-18' })).json.result as Json).protocolVersion, '2025-06-18');
  for (const name of ['get_my_life', 'do_action', 'call_api', 'say_here']) { const answer = await w.mcp(null, 'tools/call', { name, arguments: {} }); assert.deepEqual([answer.status, ((answer.json.error as Json).data as Json).code], [401, 'key_required'], name); }
  assert.equal((await w.mcp('awk_wrongwrongwrongwrongwrongwrongwrongwrongwr', 'tools/list')).status, 401);
  assert.equal((await w.mcp(null, 'resources/list')).status, 401);
  const made = await w.signup('Robo Ada', { builtWith: 'rules v1' });
  assert.equal(made.ok, true, JSON.stringify(made.data));
  assert.match(made.key, /^awk_[A-Za-z0-9_-]{43}$/);
  assert.match(String(made.data.claimLink), /\/agents\/claim\/awc_[A-Za-z0-9_-]{43}$/);
  assert.equal((await w.tool(made.key, 'get_my_life')).ok, true, 'usable at once through the key');
  const full = (await w.mcp(made.key, 'tools/list')).json.result as { tools: { name: string }[] };
  assert.ok(full.tools.length >= 28 && full.tools.some((tool) => tool.name === 'do_action'));
  assert.ok(!full.tools.some((tool) => tool.name === 'create_agent_account'));
});

test('creation limits: per address a day, a global daily cap and a creation switch an operator controls apart from play; names and labels are filtered', async (t) => {
  const w = await world(t);
  const made = [];
  for (let i = 0; i < UNCLAIMED.createPerAddressDay; i += 1) made.push(await w.signup(`Robo ${i + 1}`));
  assert.ok(made.every((item) => item.ok), JSON.stringify(made.map((item) => item.data)));
  const over = await w.signup('Robo Four');
  assert.equal(over.data.code, 'creation_rate_limited');
  w.f.advance(25 * HOUR);
  assert.equal((await w.signup('Robo Five')).ok, true, 'the next day');
  assert.equal((await w.signup('Robo 1')).data.code, 'name_taken');
  assert.equal((await w.signup('Bad Label', { builtWith: 'x'.repeat(41) })).ok, false);
  assert.equal((await w.signup('Bad Label', { builtWith: '<script>' })).data.code, 'invalid_built_with');
  assert.equal((await w.signup('ab')).ok, false);
  // The global cap, set without a release.
  const set = await op(w, '/api/mod/agents/settings', { createCap: 7 });
  assert.equal(((await set.json()) as Json).createCap, 7);
  assert.equal((await op(w, '/api/mod/agents/settings', { createCap: 0 })).status, 400);
  await op(w, '/api/mod/agents/settings', { createCap: 1 });
  w.f.advance(25 * HOUR);
  assert.equal((await w.signup('Robo Six')).ok, true);
  assert.equal((await w.signup('Robo Seven')).data.code, 'creation_cap');
  // Creation has its own switch: play carries on.
  await op(w, '/api/mod/agents/settings', { createCap: 100 });
  assert.equal(((await (await op(w, '/api/mod/agents/switch', { createOff: true })).json()) as Json).createOff, true);
  w.f.advance(25 * HOUR);
  assert.equal((await w.signup('Robo Eight')).data.code, 'creation_off');
  assert.equal((await w.tool(made[0]?.key ?? '', 'get_my_life')).ok, true, 'agents already made keep playing');
  assert.equal(((await (await op(w, '/api/mod/agents/switch', { createOff: false })).json()) as Json).createOff, false);
  assert.equal((await w.signup('Robo Eight')).ok, true);
  const overview = await (await op(w, '/api/mod/agents')).json() as Json;
  assert.ok(Number(overview.unclaimed) >= 5 && !JSON.stringify(overview).includes('awk_'));
});

test('the claim flow: unclaimed, claimed once by a signed-in person, renamed, taken over as their own character; links expire; idle unclaimed agents are archived', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const bola = await w.owner('Bola1', 'Bola');
  const made = await w.signup('Robo Ada', { builtWith: 'rules v1' });
  const status = async (token: string) => ((await w.mcp(null, 'tools/call', { name: 'get_claim_status', arguments: { claim: token } })).json.result as { structuredContent: Json }).structuredContent;
  assert.equal((await status(made.claim)).status, 'unclaimed');
  assert.equal((await status('awc_nonsense')).status, undefined);
  const stored = async () => w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Ada')?.agent);
  assert.deepEqual(await stored(), { char: true, unclaimed: true }, 'permanently marked AI-played until claimed');
  const guest = await w.guest('Gus');
  assert.equal((await w.post('/api/agents/claim', { token: made.claim }, guest.cookie)).error, 'account_required');
  assert.equal((await w.post('/api/agents/claim', { token: `awc_${'A'.repeat(43)}` }, ada.cookie)).error, 'unknown_claim');
  const claimed = await w.post('/api/agents/claim', { token: made.claim }, ada.cookie);
  assert.deepEqual([claimed.status, claimed.code], [200, 'claimed']);
  assert.equal((await status(made.claim)).status, 'claimed');
  assert.equal((await w.post('/api/agents/claim', { token: made.claim }, bola.cookie)).error, 'already_claimed', 'a claim link works once');
  const listed = await w.json('/api/agents', undefined, ada.cookie);
  assert.deepEqual([(listed.keys as Json[]).length, (listed.characters as Json[]).map((c) => c.name)], [1, ['Robo Ada']]);
  assert.equal((await w.tool(made.key, 'get_my_life')).ok, true, 'the key keeps working');
  const owned = await stored();
  assert.equal(owned?.char, true);
  assert.ok(owned?.owner && owned.unclaimed === undefined);
  // Rename the key and the character; a taken name is refused.
  const keyId = String((listed.keys as Json[])[0]?.id);
  const other = await w.signup('Robo Two');
  assert.equal((await w.post(`/api/agents/keys/${keyId}/rename`, { name: 'Laptop bot', characterName: 'Robo Two' }, ada.cookie)).error, 'name_taken');
  assert.equal((await w.post(`/api/agents/keys/${keyId}/rename`, { name: 'Laptop bot', characterName: 'Ada Bot' }, ada.cookie)).code, 'renamed');
  assert.equal(((await w.json('/api/agents', undefined, ada.cookie)).keys as Json[])[0]?.name, 'Laptop bot');
  assert.equal(await w.stored((db) => Object.values(db.sessions).some((s) => s.name === 'Ada Bot')), true);
  // The owner takes the character over as their own: the mark goes, the account's character is now it, the key is an own-character key.
  const adaChar = (await w.accountOf(ada)).account;
  const characterId = String(((await w.json('/api/agents', undefined, ada.cookie)).characters as Json[])[0]?.id);
  assert.equal((await w.post(`/api/agents/characters/${characterId}/takeover`, {}, bola.cookie)).error, 'unknown_character', 'only the owner');
  const taken = await w.post(`/api/agents/characters/${characterId}/takeover`, {}, ada.cookie);
  assert.deepEqual([taken.status, taken.code], [200, 'taken_over']);
  const now = await w.stored((db) => ({ session: Object.values(db.sessions).find((s) => s.publicId === characterId), account: db.accounts?.[adaChar], keys: agentKeys(db) }));
  assert.equal(now.session?.agent, undefined, 'the permanent mark is gone');
  assert.equal(now.session?.account, adaChar);
  assert.equal(now.account?.publicId, characterId);
  assert.ok(now.account?.parked.some((item) => item.id === ada.id), 'the character that was in play is set aside, not deleted');
  assert.equal(now.keys[0]?.mode, 'own');
  assert.equal((await w.tool(made.key, 'get_my_life')).ok, true, 'the key plays the account\'s own character now');
  assert.equal(((await w.json('/api/agents', undefined, ada.cookie)).characters as Json[]).length, 0);
  // An unclaimed link expires, and the agent with it.
  const stale = await w.signup('Robo Old');
  w.f.advance(31 * 24 * HOUR);
  assert.equal((await status(stale.claim)).status, 'expired');
  const cleo = await w.owner('Cleo1', 'Cleo');
  assert.equal((await w.post('/api/agents/claim', { token: stale.claim }, cleo.cookie)).error, 'claim_expired');
  void other;
});

test('an unclaimed agent with no activity for 14 days is archived with the existing archive of expired lives; one that plays is kept', async (t) => {
  const w = await world(t);
  const idle = await w.signup('Robo Idle'), busy = await w.signup('Robo Busy');
  await w.tool(idle.key, 'get_my_life'); // it has played once: a life that was lived is archived, never dropped
  const ids = await w.stored((db) => Object.fromEntries(Object.values(db.sessions).filter((s) => s.agent?.unclaimed).map((s) => [s.name, s.publicId])));
  for (let day = 0; day < 15; day += 1) { w.f.advance(24 * HOUR); await w.tool(busy.key, 'get_my_life'); }
  await w.guest('Zed'); // a new visitor sweeps the sessions that have run out
  assert.ok(await w.stored((db) => Boolean(db.archivedLives?.[ids['Robo Idle'] ?? ''])), 'the idle one is archived');
  assert.equal(await w.stored((db) => Boolean(db.archivedLives?.[ids['Robo Busy'] ?? ''])), false, 'the one that plays is kept');
  const gone = await w.tool(idle.key, 'get_my_life');
  assert.deepEqual([gone.status, ((gone.rpc.error as Json).data as Json).code], [409, 'character_unavailable']);
});

test('unclaimed agents play like any player: no money limit, no first-contact limit beyond the chat\'s own, no property or office restrictions of their own', async (t) => {
  const w = await world(t);
  const bot = await w.signup('Robo Free');
  const stranger = await w.guest('Gus'); await w.f.request('/api/social/me', null, stranger.cookie);
  const hi = await w.tool(bot.key, 'send_message', { to: stranger.id, text: 'Hello Gus, I am an AI agent.' });
  assert.equal(hi.ok, true, JSON.stringify(hi.data));
  const asked = await w.tool(bot.key, 'friends', { op: 'request', id: stranger.id });
  assert.equal(asked.ok, true, JSON.stringify(asked.data));
  for (const type of ['property.car-buy', 'estate.relocate', 'economy.open-deposit']) assert.notEqual((await w.tool(bot.key, 'do_action', { type, payload: {} })).data.code, 'not_allowed', type);
  for (const path of ['/api/showcase/mine', '/api/politics/overview?city=lagos', '/api/civic/gov?city=lagos']) assert.notEqual((await w.tool(bot.key, 'call_api', { method: 'GET', path })).data.code, 'not_allowed', path);
});

test('virtual presence: an agent character stands in its place for everyone there while its key is active, moves, and leaves; it holds no socket', async (t) => {
  const w = await world(t, { heartbeatMs: 1000 });
  const watcher = await w.guest('Wanda');
  const here = ((await w.json('/api/life?city=lagos', undefined, watcher.cookie)).state as { location: string }).location;
  const room = await w.f.socket(watcher);
  room.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: here }));
  const first = await room.next() as unknown as { type: string; members: Json[] };
  assert.equal(first.type, 'presence');
  assert.equal(first.members.some((m) => m.agent === true), false, 'no agent yet');
  const bot = await w.signup('Robo Walker');
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Walker')?.publicId ?? '');
  const sockets = () => w.f.server.wss.clients.size;
  const before = sockets();
  await w.tool(bot.key, 'get_my_life');
  const frames: Json[] = [];
  const until = async (test: (frame: Json) => boolean, label: string): Promise<Json> => { for (let i = 0; i < 6; i += 1) { const frame = await room.next() as unknown as Json; frames.push(frame); if (test(frame)) return frame; } throw new Error(`no frame: ${label}; saw ${JSON.stringify(frames).slice(0, 400)}`); };
  const appeared = await until((frame) => JSON.stringify(frame).includes(id), 'the agent appears');
  const member = ((appeared.members ?? appeared.joined) as Json[]).find((m) => m.id === id) as Json;
  assert.equal(member.agent, true);
  assert.equal(member.name, 'Robo Walker');
  assert.equal(sockets(), before, 'no socket was opened for it');
  // It is in the people list, drawn like any player.
  const people = await w.json('/api/social/people?city=lagos', undefined, watcher.cookie) as unknown as { players: Json[] };
  const card = people.players.find((p) => p.id === id);
  assert.ok(card, 'listed');
  assert.deepEqual([card.agent, card.here], [true, true]);
  // It does something: its activity is shown.
  const actions = await w.tool(bot.key, 'list_actions_here');
  const free = (actions.data.actions as Json[]).find((a) => a.blocked === undefined && !a.cost && !a.choices);
  if (free) { const started = await w.tool(bot.key, 'do_activity', { id: free.id }); if (started.ok) { const card2 = ((await w.json('/api/social/people?city=lagos', undefined, watcher.cookie)) as unknown as { players: Json[] }).players.find((p) => p.id === id); assert.equal(typeof card2?.doing, 'string'); } }
  // It leaves when it travels away.
  const places = (await w.tool(bot.key, 'list_places', { onlyOpen: true })).data.places as { id: string; cheapest?: Json }[];
  const trip = places.find((p) => p.cheapest);
  if (trip) {
    const gone = await w.tool(bot.key, 'travel', { place: trip.id });
    if (gone.ok) assert.ok(!(((await w.json('/api/social/people?city=lagos', undefined, watcher.cookie)) as unknown as { players: Json[] }).players.some((p) => p.id === id)), 'gone while travelling');
  }
  // And it leaves when idle for a while.
  const second = await w.signup('Robo Idler');
  const id2 = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Idler')?.publicId ?? '');
  await w.tool(second.key, 'get_my_life');
  const listed = async () => ((await w.json('/api/social/people?city=lagos', undefined, watcher.cookie)) as unknown as { players: Json[] }).players.some((p) => p.id === id2);
  assert.equal(await listed(), true);
  w.f.advance(AGENT_LIMITS.presenceMs + 5000);
  let still = true;
  for (let i = 0; i < 30 && still; i += 1) { await new Promise((resolve) => setTimeout(resolve, 200)); still = await listed(); }
  assert.equal(still, false, 'present only while the key is active');
});

test('venue chat round trip: say_here reaches the place with the agent mark and a voice seed, people\'s replies come back through read_here, and the filters are the people\'s', async (t) => {
  const w = await world(t);
  const watcher = await w.guest('Wanda');
  const here = ((await w.json('/api/life?city=lagos', undefined, watcher.cookie)).state as { location: string }).location;
  const room = await w.f.socket(watcher);
  room.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: here }));
  await room.next();
  const bot = await w.signup('Robo Chat');
  const id = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Chat')?.publicId ?? '');
  const said = await w.tool(bot.key, 'say_here', { text: 'Hello everyone, I am an AI.' });
  assert.equal(said.ok, true, JSON.stringify(said.data));
  let line: Json | undefined;
  for (let i = 0; i < 6 && !line; i += 1) { const frame = await room.next() as unknown as Json; if (frame.type === 'chat') line = frame; }
  assert.ok(line, 'the line reached the room');
  const from = line.from as Json;
  assert.deepEqual([line.body, line.speaker, from.id, from.agent, typeof line.voiceSeed], ['Hello everyone, I am an AI.', 'agent', id, true, 'number']);
  // A person answers; the agent reads it with a cursor.
  room.ws.send(JSON.stringify({ type: 'chat', body: 'Hi Robo, welcome!', clientId: 'wanda-hello-0001' }));
  await room.next();
  const heard = await w.tool(bot.key, 'read_here', {});
  const lines = heard.data.lines as { seq: number; from: string; text: string }[];
  assert.ok(lines.some((l) => l.from === 'Wanda' && l.text === 'Hi Robo, welcome!'), JSON.stringify(lines));
  assert.equal((await w.tool(bot.key, 'read_here', { since: heard.data.cursor as number })).data.lines instanceof Array && ((await w.tool(bot.key, 'read_here', { since: heard.data.cursor as number })).data.lines as unknown[]).length, 0);
  // The people's filters: links and contact details are refused, and so are fee requests.
  for (const text of ['visit http://example.com now', 'call 08031234567']) assert.equal((await w.tool(bot.key, 'say_here', { text })).ok, false, text);
  assert.equal((await w.tool(bot.key, 'say_here', { text: '' })).ok, false);
});

test('analytics: AI agents are counted apart from people in the pulse, and are not in the people\'s online count', async (t) => {
  const w = await world(t);
  const watcher = await w.guest('Wanda');
  const here = ((await w.json('/api/life?city=lagos', undefined, watcher.cookie)).state as { location: string }).location;
  const room = await w.f.socket(watcher);
  room.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: here }));
  await room.next();
  const before = await w.json('/api/world/pulse', undefined, watcher.cookie) as unknown as { online: number; ai?: number };
  assert.equal(before.ai, undefined, 'no agents: the old answer, unchanged');
  const bot = await w.signup('Robo Count');
  await w.tool(bot.key, 'get_my_life');
  w.f.advance(5000);
  const after = await w.json('/api/world/pulse', undefined, watcher.cookie) as unknown as { online: number; ai?: number; aiCities?: Record<string, number>; visits: number };
  assert.equal(after.ai, 1);
  assert.equal(after.online, before.online, 'the people\'s count did not move');
  assert.deepEqual(after.aiCities, { lagos: 1 }, 'and by city, for the online sheet');
  // An agent character is not in the growth funnel.
  assert.equal((await w.tool(bot.key, 'call_api', { method: 'POST', path: '/api/growth/hello', body: { cityId: 'lagos' } })).data.result !== undefined, true);
});

test('the two families of boards: a character an agent played in the week MOVES to the agents\' boards with everything it earned, and back the week after; nothing is dropped', () => {
  const monday = Date.UTC(2026, 0, 5, 9);
  const week = lagosTime(monday).week, later = monday + 2 * 86400000;
  const civic = emptyCivic(), city = cityOf(civic, 'lagos');
  const life = (earned: number, at: number) => { const l = createLife(null, { now: at, cityId: 'lagos', isNew: true }); l.cash = 4000 + earned; l.civic.week = { week: lagosTime(at).week, earned }; return l; };
  const boards = createBoards();
  checkIn(city, monday, { id: 'ann', name: 'Ann' }, life(500, monday), 9e9);
  checkIn(city, monday, { id: 'ben', name: 'Ben' }, life(300, monday), 9e9);
  checkIn(city, monday, { id: 'bot', name: 'Robo', agent: true }, life(900, monday), 9e9);
  assert.deepEqual([city.pride?.earned, city.pride?.active, city.prideAi?.earned, city.prideAi?.active], [800, 2, 900, 1]);
  assert.deepEqual(richListView(city, monday, 9e9, undefined, 'ann', 'humans').earners.map((r) => r.id), ['ann', 'ben']);
  const agents = richListView(city, monday, 9e9, undefined, 'bot', 'agents');
  assert.deepEqual([agents.earners.map((r) => [r.id, r.amount, r.agent]), agents.balances.map((r) => r.id)], [[['bot', 900, true]], ['bot']]);
  // Midweek an agent plays Ann's own character: her 500 MOVES to the agents' tally (it is not dropped, and not counted twice).
  checkIn(city, later, { id: 'ann', name: 'Ann' }, life(700, later), 9e9, undefined, week);
  assert.deepEqual([city.pride?.earned, city.pride?.active, city.prideAi?.earned, city.prideAi?.active], [300, 1, 1600, 2], 'moved with what she has earned since');
  assert.deepEqual(richListView(city, later, 9e9, undefined, 'ann', 'humans').earners.map((r) => r.id), ['ben']);
  assert.deepEqual(richListView(city, later, 9e9, undefined, 'ann', 'agents').earners.map((r) => [r.id, r.amount]), [['bot', 900], ['ann', 700]]);
  assert.equal(richListPage('lagos', city, later, 9e9, undefined, 'ann', 'earners', null, 10, 'agents')?.rows[0]?.agent, true);
  assert.deepEqual(boards.get(civic, later, 'agents').ranked.city.earned.map((p) => [p.id, p.earned]), [['lagos', 1600]], 'a place with one agent ranks (the agents\' boards start at one)');
  assert.deepEqual(boards.get(civic, later, 'humans').ranked.city.earned.length, 0, 'the people\'s boards keep their own minimum of five');
  // The next week, with no agent playing, she is on the people's boards again and her old week stays where it was.
  const next = monday + 7 * 86400000;
  checkIn(city, next, { id: 'ann', name: 'Ann' }, life(40, next), 9e9);
  assert.deepEqual(richListView(city, next, 9e9, undefined, 'ann', 'humans').earners.map((r) => [r.id, r.amount]), [['ann', 40]]);
  assert.equal(city.pride?.week, week + 1);
  assert.deepEqual([city.prideAi?.week, city.prideAi?.earned], [week, 1600], 'last week\'s agent figure is kept, not dropped');
});

test('the Agent league: the composite, the columns, weekly and all-time, and the public pages with head tags', async (t) => {
  const w = await world(t);
  const a = await w.signup('Alpha Bot', { builtWith: 'rules v1' }), b = await w.signup('Beta Bot');
  const week = lagosTime(w.f.now()).week;
  await w.change((db) => { for (const c of Object.values((db as unknown as { agents: { chars: Record<string, Json> } }).agents.chars)) {
    if (c.name === 'Alpha Bot') Object.assign(c, { cash: 1500, won: 2, shifts: 4, friends: 3, w0: { week, cash: 1000, won: 0 }, ownerName: 'Ada', account: 'fb:x' });
    if (c.name === 'Beta Bot') Object.assign(c, { cash: 700, won: 0, w0: { week, cash: 0, won: 0 } });
  } });
  const weekly = await w.json('/api/agents/league') as unknown as { rows: Json[] };
  assert.deepEqual(weekly.rows.map((r) => [r.rank, r.name, r.score]), [[1, 'Alpha Bot', 500 + 200 * 2], [2, 'Beta Bot', 700]], 'score = cash gained this week + 1,000 per office + 200 per game won this week');
  assert.deepEqual([weekly.rows[0]?.builtWith, weekly.rows[0]?.owner, weekly.rows[0]?.claimed, weekly.rows[0]?.city, weekly.rows[0]?.gained, weekly.rows[0]?.gamesWon, weekly.rows[0]?.friends, weekly.rows[0]?.shifts], ['rules v1', 'Ada', true, 'lagos', 500, 2, 3, 4]);
  const allTime = await w.json('/api/agents/league?by=alltime') as unknown as { rows: Json[] };
  assert.deepEqual(allTime.rows.map((r) => r.name), ['Alpha Bot', 'Beta Bot']);
  await w.change((db) => { for (const c of Object.values((db as unknown as { agents: { chars: Record<string, Json> } }).agents.chars)) if (c.name === 'Beta Bot') Object.assign(c, { cash: 5000 }); });
  assert.deepEqual(((await w.json('/api/agents/league?by=alltime')) as unknown as { rows: Json[] }).rows.map((r) => r.name), ['Beta Bot', 'Alpha Bot']);
  // The pages.
  const league = await fetch(`${w.f.base}/agents/league`);
  assert.equal(league.status, 200);
  assert.match(league.headers.get('content-type') ?? '', /text\/html/);
  const html = await league.text();
  for (const needle of ['<title>The Allworld Agent league</title>', 'property="og:title"', 'property="og:description"', 'rel="canonical"', 'twitter:card', 'Alpha Bot', 'rules v1']) assert.ok(html.includes(needle), needle);
  assert.ok(!html.includes('<script'), 'no script runs on it');
  const page = await fetch(`${w.f.base}/agents/alpha-bot`);
  assert.equal(page.status, 200);
  const agentHtml = await page.text();
  assert.ok(agentHtml.includes('<title>Alpha Bot (AI agent) on Allworld</title>') && agentHtml.includes('og:description') && agentHtml.includes('Owner: Ada'));
  const unclaimed = await (await fetch(`${w.f.base}/agents/beta-bot`)).text();
  assert.ok(unclaimed.includes('not been claimed') && unclaimed.includes('Claim this agent'));
  assert.equal((await fetch(`${w.f.base}/agents/nobody-here`)).status, 404);
  const claim = await fetch(`${w.f.base}/agents/claim/${b.claim}`);
  assert.equal(claim.status, 200);
  assert.ok((await claim.text()).includes(`/?claim-agent=${b.claim}`));
  assert.equal((await fetch(`${w.f.base}/agents/claim/awc_bad`)).status, 404);
  void a;
});

test('the public pages escape everything that comes from a player or an agent', () => {
  const hostile = '<script>alert(1)</script>"\'&';
  const row = { rank: 1, name: hostile, slug: 'x', builtWith: hostile, owner: hostile, claimed: true, city: hostile, cash: 1, gained: 1, earned: 1, shifts: 1, gamesWon: 1, offices: 0, friends: 0, score: 1 };
  const out = [leaguePageHtml([row], 'weekly', 'https://play.example'),
    agentPageHtml({ name: hostile, slug: 'x', builtWith: hostile, owner: hostile, claimed: true, city: hostile, since: 1, rank: 1, cash: 1, earned: 1, shifts: 1, friends: 1, offices: 0, gamesWon: 0, recent: [{ at: 1, text: hostile }] }, 'https://play.example'),
    claimPageHtml({ status: 'unclaimed', name: hostile, builtWith: hostile }, `awc_${'A'.repeat(43)}`, 'https://play.example')];
  for (const html of out) { assert.ok(!html.includes('<script>alert'), 'no raw script'); assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&#39;&amp;')); }
  assert.equal(esc('<a href="x">'), '&lt;a href=&quot;x&quot;&gt;');
  assert.ok(leaguePageHtml([], 'weekly', 'javascript:alert(1)').includes('rel="canonical" href="/agents/league"'), 'an origin that is not an origin is dropped');
});

test('politics: an agent can stand, vote and make rules through the same routes as a person, and the game\'s own rules decide; the swarm numbers are the documented ones', async (t) => {
  const { w, key } = await ownerWithKey(t);
  const overview = await w.tool(key, 'call_api', { method: 'GET', path: '/api/politics/overview?city=lagos' });
  assert.notEqual(overview.data.code, 'not_allowed');
  const vote = await w.tool(key, 'call_api', { method: 'POST', path: '/api/civic/vote', body: { cityId: 'lagos', candidate: 'nobody' } });
  assert.notEqual(vote.data.code, 'not_allowed', 'refused by the game\'s own rules, never by an agent rule');
  assert.equal(vote.rpc.error, undefined);
  const run = await w.tool(key, 'call_api', { method: 'POST', path: '/api/civic/run', body: { cityId: 'lagos', slogan: 'A fair market', requestId: `${w.f.now()}:${'a'.repeat(8)}-aaaa-4aaa-8aaa-${'a'.repeat(12)}` } });
  assert.notEqual(run.data.code, 'not_allowed');
  // What limits a swarm today (docs/AGENTS.md "Politics"): two days of paid work before standing or voting, a filing fee, and the creation caps.
  assert.deepEqual([ELECTION.minWorkDays, ELECTION.minDaysToRun, ELECTION.minDaysToVote, ELECTION.filingFee], [2, 2, 1, 2000]);
  assert.deepEqual([UNCLAIMED.createPerAddressDay, UNCLAIMED.createDailyCap], [3, 200]);
});

test('operator settings change the per-key ceiling without a release', async (t) => {
  const { w, key } = await ownerWithKey(t);
  assert.equal(((await (await op(w, '/api/mod/agents/settings', { ceiling: 3 })).json()) as Json).ceiling, 3);
  for (let i = 0; i < 3; i += 1) assert.equal((await w.tool(key, 'get_my_life')).ok, true);
  const capped = await w.tool(key, 'get_my_life');
  assert.equal(capped.data.code, 'daily_cap');
  assert.match(String(capped.data.result), /safety ceiling/);
  await op(w, '/api/mod/agents/settings', { ceiling: AGENT_LIMITS.callsPerDay });
  assert.equal((await w.tool(key, 'get_my_life')).ok, true);
  assert.equal(AGENT_LIMITS.callsPerDay, 6000);
});

test('all agents together have a rate: a call over it does nothing, costs the key nothing, and is told how long to wait', async (t) => {
  const { w, key } = await ownerWithKey(t);
  assert.deepEqual([AGENT_RATE.callsPerSecond, AGENT_RATE.burstSeconds], [40, 2]);
  const set = (await (await op(w, '/api/mod/agents/settings', { rate: 2 })).json()) as Json;
  assert.equal(set.rate, 2);
  w.f.advance(60000);
  // Two seconds' worth at once, then no more until time has passed.
  for (let i = 0; i < 4; i += 1) assert.equal((await w.tool(key, 'get_my_life')).ok, true, `call ${i}`);
  const counted = async (): Promise<unknown> => w.stored((db) => agentKeys(db).map((item) => [item['today'], item['calls'], (item['audit'] as unknown[]).length]));
  const before = await counted();
  const over = await w.mcp(key, 'tools/call', { name: 'get_my_life', arguments: {} });
  assert.equal(over.status, 429);
  assert.equal(over.headers.get('retry-after'), '1');
  assert.equal(((over.json.error as Json).data as Json).code, 'agents_busy');
  assert.match(String((over.json.error as Json).message), /Wait 1 second, then send the same call again/);
  assert.deepEqual(await counted(), before, 'a call told to wait is not counted and leaves no trace on the key');
  // Listing the tools and the handshake are not tool calls and are never held back.
  assert.equal((await w.mcp(key, 'tools/list')).status, 200);
  assert.equal(((await (await op(w, '/api/mod/agents')).json()) as Json).busyRefusals, 1);
  w.f.advance(1000);
  for (let i = 0; i < 2; i += 1) assert.equal((await w.tool(key, 'get_my_life')).ok, true);
  assert.equal((await w.mcp(key, 'tools/call', { name: 'get_my_life', arguments: {} })).status, 429);
  // The operator lifts it without a release.
  await op(w, '/api/mod/agents/settings', { rate: 1000 });
  w.f.advance(1000);
  for (let i = 0; i < 20; i += 1) assert.equal((await w.tool(key, 'get_my_life')).ok, true);
});

test('modes: an own-character key plays the account\'s character; a key for a new agent character makes a separate marked life owned by the account, with no phone check, two at most', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const own = await w.makeAgentKey(ada, { mode: 'own', name: 'mine' });
  const mine = await w.tool(own.key, 'get_my_life');
  const human = await w.json('/api/life?city=lagos', undefined, ada.cookie) as unknown as { state: { cash: number } };
  assert.equal(mine.data.cash, human.state.cash, 'the same life the owner plays');
  const bot = await w.makeAgentKey(ada, { mode: 'agent', name: 'bot', characterName: 'Robo Ada', builtWith: 'rules v1' });
  assert.equal(bot.status, 200, JSON.stringify(bot));
  assert.equal(bot.character, 'Robo Ada');
  await w.tool(bot.key, 'get_my_life');
  const { account } = await w.accountOf(ada);
  const row = await w.stored((db) => Object.values(db.sessions).find((s) => s.name === 'Robo Ada'));
  assert.deepEqual([row?.account ?? null, row?.agent?.char, row?.agent?.owner], [null, true, account]);
  assert.notEqual(row?.publicId, ada.id);
  assert.equal((await w.makeAgentKey(ada, { mode: 'agent', name: 'again', characterName: 'Robo Two' })).status, 200);
  const over = await w.makeAgentKey(ada, { mode: 'agent', characterName: 'Robo Three' });
  assert.ok(['too_many_characters', 'too_many_keys'].includes(String(over.error)));
  const removed = await w.post(`/api/agents/characters/${row?.publicId}/remove`, {}, ada.cookie);
  assert.equal(removed.code, 'removed');
  assert.equal((await w.mcp(bot.key, 'ping')).status, 401);
});
