import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// AI agent access (docs/AGENTS.md): the MCP endpoint, agent keys, what a key may do, the limits, the safety valves and the marks other players see.
// A real server on a random port with a fake clock and the sign-in stand-in of server/accounts/test-tokens.ts. The Worker's run: deploy/agents.edge.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { world, agentKeys, OPERATOR, HOUR } from './test-world.ts';
import type { Json, World } from './test-world.ts';
import { AGENT_ACTIONS, AGENT_LIMITS, agentMark, agentMarked, scopeAllows } from './policy.ts';
import { hashOfKey, newKeySecret, bearerKey } from './service.ts';
import { TOOL_NAMES } from './tools.ts';
import { eraseAgents, exportAgents } from './privacy.ts';
import { hasAction, actionTypes } from '../../src/game/registry.ts';
import { checkIn, richListView } from '../civic/residents.ts';
import { cityOf, emptyCivic } from '../civic/data.ts';
import { createLife } from '../../src/life.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { publicSession } from '../protocol.ts';

const text = (value: unknown): string => JSON.stringify(value);
/** An owner with an own-character key: the usual start of a test. */
async function ownerWithKey(t: Parameters<typeof world>[0]) {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const made = await w.makeAgentKey(ada);
  assert.equal(made.status, 200, text(made));
  return { w, ada, key: made.key, id: made.id };
}
const post = (w: World, path: string, body: Json, cookie: string) => w.json(path, body, cookie);

test('protocol: initialize, ping, tools/list and tools/call answer as JSON-RPC 2.0; a notification gets 202; mistakes get the right error codes', async (t) => {
  const { w, key } = await ownerWithKey(t);
  const init = await w.mcp(key, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.status, 200);
  const result = init.json.result as Json;
  assert.deepEqual([init.json.jsonrpc, init.json.id, result.protocolVersion], ['2.0', 1, '2025-06-18']);
  assert.equal((result.serverInfo as Json).name, 'allworld');
  assert.deepEqual(Object.keys(result.capabilities as Json), ['tools']);
  assert.equal(typeof result.instructions, 'string');
  assert.equal(((await w.mcp(key, 'initialize', { protocolVersion: '1999-01-01' })).json.result as Json).protocolVersion, '2025-06-18', 'an unknown version is answered with the newest one this server speaks');
  assert.deepEqual((await w.mcp(key, 'ping')).json.result, {});
  const note = await w.mcp(key, 'notifications/initialized', undefined, { id: null });
  assert.equal(note.status, 202);
  const list = (await w.mcp(key, 'tools/list')).json.result as { tools: { name: string; description: string; inputSchema: Json; annotations: Json }[] };
  assert.deepEqual(list.tools.map((tool) => tool.name).sort(), [...TOOL_NAMES].sort());
  for (const tool of list.tools) {
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    assert.equal(tool.inputSchema.additionalProperties, false, `${tool.name}: a tight schema`);
    assert.ok(tool.description.length > 60, `${tool.name}: written for an AI reader`);
  }
  for (const name of ['get_my_life', 'get_goals', 'list_places', 'list_actions_here', 'travel', 'do_activity', 'wait_until_done', 'eat_or_rest', 'work', 'buy', 'list_people_here', 'list_friends', 'read_messages', 'send_message', 'answer_money_request']) assert.ok(TOOL_NAMES.includes(name), name);
  const life = await w.tool(key, 'get_my_life');
  assert.equal(life.ok, true);
  assert.equal(typeof life.data.cash, 'number');
  assert.ok(life.data.needs && life.data.place && life.data.time, 'a compact summary of the life');
  assert.equal(life.status, 200);
  assert.equal(((await w.mcp(key, 'tools/call', { name: 'nope', arguments: {} })).json.error as Json).code, -32602);
  assert.equal(((await w.mcp(key, 'resources/list')).json.error as Json).code, -32601);
  assert.equal(((await w.mcp(key, 'x', undefined, { raw: '{not json' })).json.error as Json).code, -32700);
  assert.equal(((await w.mcp(key, 'x', undefined, { raw: '[1]' })).json.error as Json).code, -32600);
  const wrong = await w.tool(key, 'get_my_life', { bogus: 1 });
  assert.equal(wrong.ok, false);
  assert.match(String(wrong.data.result), /not a known field/);
});

test('the endpoint is for programs: a key is required, a browser origin is refused, nothing allows another site, and only POST answers', async (t) => {
  const { w, key } = await ownerWithKey(t);
  assert.equal((await w.mcp(null, 'ping')).status, 401);
  assert.equal(((await w.mcp(null, 'ping')).json.error as Json & { data: Json }).data.code, 'invalid_key');
  assert.equal((await w.mcp(`awk_${'A'.repeat(43)}`, 'ping')).status, 401);
  assert.equal((await w.mcp('some-other-token', 'ping')).status, 401, 'a bearer token of another shape is never looked up');
  const browser = await w.mcp(key, 'ping', undefined, { headers: { origin: 'https://evil.example' } });
  assert.equal(browser.status, 403);
  assert.equal(browser.headers.get('access-control-allow-origin'), null);
  const same = await w.mcp(key, 'ping', undefined, { headers: { origin: w.f.base } });
  assert.equal(same.status, 403, 'even the game\'s own page is not an agent');
  const ok = await w.mcp(key, 'ping');
  assert.equal(ok.status, 200);
  for (const name of ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers']) assert.equal(ok.headers.get(name), null, name);
  assert.equal((await fetch(`${w.f.base}/mcp`)).status, 405);
  assert.equal((await fetch(`${w.f.base}/mcp`, { method: 'OPTIONS' })).headers.get('access-control-allow-origin'), null);
  assert.equal((await fetch(`${w.f.base}/mcp`, { method: 'DELETE', headers: { authorization: `Bearer ${key}` } })).status, 405);
  assert.deepEqual(Object.keys(ok.json).sort(), ['id', 'jsonrpc', 'result'], 'a JSON-RPC answer carries nothing else (no serverTime)');
});

test('key lifecycle: shown once, stored only as a hash, listed without the secret, last-used time, revoked at once, at most three', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const made = await w.makeAgentKey(ada, { mode: 'own', name: 'Laptop' });
  assert.equal(made.status, 200);
  assert.match(made.key, /^awk_[A-Za-z0-9_-]{43}$/);
  assert.equal(made.shownOnce, true);
  assert.equal(made.url, `${w.f.base}/mcp`);
  const stored = await w.stored((db) => text(JSON.parse(text(db.agents))));
  assert.ok(!stored.includes(made.key), 'the key is not stored');
  assert.ok(stored.includes(hashOfKey(made.key)), 'its hash is');
  const listed = await w.json('/api/agents', undefined, ada.cookie);
  const keys = listed.keys as Json[];
  assert.equal(keys.length, 1);
  assert.deepEqual([keys[0]?.name, keys[0]?.mode, keys[0]?.lastUsedAt, keys[0]?.calls], ['Laptop', 'own', null, 0]);
  assert.ok(!text(listed).includes(made.key) && !text(listed).includes(hashOfKey(made.key)), 'a list never carries the key or its hash');
  w.f.advance(1000);
  await w.tool(made.key, 'get_my_life');
  const after = ((await w.json('/api/agents', undefined, ada.cookie)).keys as Json[])[0];
  assert.deepEqual([after?.lastUsedAt, after?.calls], [w.f.now(), 1]);
  const second = await w.makeAgentKey(ada), third = await w.makeAgentKey(ada), fourth = await w.makeAgentKey(ada);
  assert.deepEqual([second.status, third.status, fourth.status, fourth.error], [200, 200, 409, 'too_many_keys']);
  assert.notEqual(second.key, made.key);
  assert.equal((await post(w, `/api/agents/keys/${made.id}/revoke`, { csrf: await w.csrf(ada.cookie) }, ada.cookie)).status, 200);
  assert.equal((await w.mcp(made.key, 'ping')).status, 401, 'a revoked key stops at once');
  assert.equal((await w.mcp(second.key, 'ping')).status, 200, 'the others are untouched');
  assert.equal((await w.makeAgentKey(ada)).status, 200, 'a revoked key frees a place');
  assert.equal((await w.post(`/api/agents/keys/${made.id}/revoke`, {}, ada.cookie)).error, 'unknown_key');
  assert.equal(newKeySecret().length, 47);
  assert.equal(bearerKey(`Bearer ${made.key}`), made.key);
  assert.equal(bearerKey('Bearer nope'), null);
});

test('who may make a key: guests are refused, a new account waits a day, a browser must name this host and carry its token', async (t) => {
  const w = await world(t);
  const guest = await w.guest('Gus');
  const refused = await w.post('/api/agents/keys', { mode: 'own' }, guest.cookie);
  assert.deepEqual([refused.status, refused.error], [403, 'account_required']);
  assert.match(String(refused.reason), /Guests cannot connect/);
  const view = await w.json('/api/agents', undefined, guest.cookie);
  assert.deepEqual([view.signedIn, view.keys], [false, []]);
  const young = await w.owner('Young1', 'Yemi', false);
  const early = await w.makeAgentKey(young);
  assert.deepEqual([early.status, early.error], [403, 'account_too_new']);
  w.f.advance(25 * HOUR);
  assert.equal((await w.makeAgentKey(young)).status, 200);
  assert.equal((await w.json('/api/agents/keys', { mode: 'own' }, young.cookie)).error, 'csrf_rejected');
  const noOrigin = await fetch(`${w.f.base}/api/agents/keys`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: young.cookie }, body: JSON.stringify({ mode: 'own', csrf: await w.csrf(young.cookie) }) });
  assert.equal((await noOrigin.json() as Json).error, 'origin_required');
  const other = await w.call('/api/agents/keys', { mode: 'own', csrf: await w.csrf(young.cookie) }, young.cookie, { Origin: 'https://evil.example' });
  assert.equal(other.status, 403, 'another site cannot make a key');
});

test('scope: the allow-list is deny by default; a key narrowed in storage is refused what is outside it', async (t) => {
  assert.deepEqual([scopeAllows(['activity'], 'activity'), scopeAllows(['activity'], 'travel'), scopeAllows(['estate.relocate'], 'estate.relocate'), scopeAllows([...AGENT_ACTIONS], 'estate.relocate')], [true, false, false, false]);
  for (const type of AGENT_ACTIONS) assert.ok(hasAction(type), `${type} is a real action`);
  const denied = ['estate.relocate', 'estate.set-lga', 'estate.upgrade', 'property.car-buy', 'property.house-move', 'economy.pay-loan', 'economy.open-deposit', 'home.furniture-sell', 'career.quit', 'career.switch', 'civic.hunt-claim', 'onboarding.home', 'onboarding.lottery', 'goals.buy-perk', 'social.call', 'stories.publish', 'unilag.apply', 'campus-shuttle', 'home.refuel'];
  for (const type of denied) { assert.ok(actionTypes().includes(type), `${type} exists`); assert.equal(scopeAllows([...AGENT_ACTIONS], type), false, type); }
  const { w, key, id } = await ownerWithKey(t);
  assert.equal((await w.tool(key, 'list_actions_here')).ok, true);
  await w.change((db) => { for (const record of agentKeys(db)) (record as { scopes: string[] }).scopes = ['spot']; });
  const refused = await w.tool(key, 'do_activity', { id: 'anything' });
  assert.equal(refused.ok, false);
  assert.equal(refused.data.code, 'not_allowed');
  assert.match(String(refused.data.result), /not allowed/);
  assert.notEqual((await w.tool(key, 'travel', { place: 'park' })).ok, true, 'travel is outside the narrowed list too');
  void id;
});

test('limits: calls per minute and per day are refused in words and cost the game nothing; the minute and the day start again', async (t) => {
  const { w, key } = await ownerWithKey(t);
  const results: boolean[] = [];
  for (let i = 0; i < AGENT_LIMITS.callsPerMinute + 1; i += 1) results.push((await w.tool(key, 'get_my_life')).ok);
  assert.equal(results.filter(Boolean).length, AGENT_LIMITS.callsPerMinute);
  const over = await w.tool(key, 'get_my_life');
  assert.equal(over.data.code, 'rate_limited');
  assert.match(String(over.data.result), /calls a minute/);
  w.f.advance(61000);
  assert.equal((await w.tool(key, 'get_my_life')).ok, true, 'the minute passed');
  await w.change((db) => { for (const record of agentKeys(db)) { const key2 = record as { day: number; today: number }; key2.day = Math.floor(w.f.now() / 86400000); key2.today = AGENT_LIMITS.callsPerDay; } });
  const capped = await w.tool(key, 'get_my_life');
  assert.equal(capped.data.code, 'daily_cap');
  assert.match(String(capped.data.result), /midnight UTC/);
  w.f.advance(86400000);
  assert.equal((await w.tool(key, 'get_my_life')).ok, true, 'the day passed');
  assert.deepEqual([AGENT_LIMITS.callsPerMinute, AGENT_LIMITS.callsPerDay], [30, 600]);
});

test('chat: agents message only friends and people who messaged first, no links or contact details, a daily cap, and a retry sends once', async (t) => {
  const { w, ada, key } = await ownerWithKey(t);
  const bola = await w.guest('Bola'), chi = await w.guest('Chi');
  await w.f.request('/api/social/me', null, bola.cookie); await w.f.request('/api/social/me', null, chi.cookie);
  const stranger = await w.tool(key, 'send_message', { to: bola.id, text: 'Hello there' });
  assert.equal(stranger.data.code, 'not_allowed_to_message');
  assert.match(String(stranger.data.result), /only message friends/);
  // Become friends the ordinary way.
  assert.equal((await w.post('/api/social/friends/request', { to: bola.id, cityId: 'lagos' }, ada.cookie)).code, 'requested');
  assert.equal((await w.json('/api/social/friends/answer', { from: ada.id, accept: true, cityId: 'lagos' }, bola.cookie)).code, 'accepted');
  const friends = await w.tool(key, 'list_friends');
  assert.deepEqual((friends.data.friends as Json[]).map((friend) => friend.id), [bola.id]);
  assert.equal((await w.tool(key, 'send_message', { to: bola.id, text: 'Hello Bola' })).ok, true);
  const chat = (await w.json('/api/social/conversations', undefined, bola.cookie)).conversations as { last: { body: string } }[];
  assert.equal(chat[0]?.last.body, 'Hello Bola');
  for (const bad of ['call me on 08031234567', 'see https://example.com now', 'mail me at a@b.co']) assert.equal((await w.tool(key, 'send_message', { to: bola.id, text: bad })).data.code, 'message_refused', bad);
  // A retry with the same request id sends once.
  assert.equal((await w.tool(key, 'send_message', { to: bola.id, text: 'Once only', rid: 'retry-0001' })).ok, true);
  await w.tool(key, 'send_message', { to: bola.id, text: 'Once only', rid: 'retry-0001' });
  const lines = (await w.json(`/api/social/conversations/dm.${[ada.id, bola.id].sort().join('.')}`, undefined, bola.cookie)).messages as { body: string }[];
  assert.equal(lines.filter((line) => line.body === 'Once only').length, 1);
  // Someone who messages first may be answered; the agent never opens with a stranger.
  assert.equal((await w.tool(key, 'send_message', { to: chi.id, text: 'Hi Chi' })).data.code, 'not_allowed_to_message');
  assert.equal((await w.json('/api/social/messages', { to: ada.id, body: 'Hi Ada, are you there?', clientId: `chi-hello-${randomUUID()}` }, chi.cookie)).ok, true);
  const inbox = await w.tool(key, 'read_messages');
  const chiChat = (inbox.data.chats as { with: { id: string }; unread: number }[]).find((chat) => chat.with.id === chi.id);
  assert.equal(chiChat?.unread, 1);
  const read = await w.tool(key, 'read_messages', { with: chi.id });
  assert.equal(((read.data.lines as Json[])[0] as Json).text, 'Hi Ada, are you there?');
  assert.equal((await w.tool(key, 'send_message', { to: chi.id, text: 'Hi Chi, yes!' })).ok, true);
  // Groups and strangers' ids are not reachable by id; the daily cap holds.
  assert.equal((await w.tool(key, 'send_message', { to: randomUUID(), text: 'hello' })).ok, false);
  assert.equal((await w.tool(key, 'send_message', { to: bola.id, text: 'Too many' })).data.code, 'rate_limited', 'four messages a minute');
  w.f.advance(61000);
  await w.change((db) => { for (const record of agentKeys(db)) { const k = record as { msgDay: number; msgToday: number }; k.msgDay = Math.floor(w.f.now() / 86400000); k.msgToday = AGENT_LIMITS.messagesPerDay; } });
  assert.equal((await w.tool(key, 'send_message', { to: bola.id, text: 'One more' })).data.code, 'message_cap');
});

test('honesty: a key that acted marks its character AI-played for a few minutes; an agent character is marked for good', async (t) => {
  const { w, ada, key } = await ownerWithKey(t);
  const bola = await w.guest('Bola'); await w.f.request('/api/social/me', null, bola.cookie);
  const seen = async (name: string) => ((await w.json(`/api/social/search?q=${encodeURIComponent(name)}`, undefined, bola.cookie)).results as Json[]).find((item) => item.name === name);
  assert.equal((await seen('Ada'))?.agent, undefined, 'before any agent acted: no mark, and the wire shape is the old one');
  await w.tool(key, 'get_my_life');
  const marked = await seen('Ada') as { agent?: true; agentUntil?: number };
  assert.equal(marked.agent, true);
  assert.equal(marked.agentUntil, w.f.now() + AGENT_LIMITS.activeWindowMs);
  assert.equal(agentMarked(marked, w.f.now() + 60000), true);
  w.f.advance(AGENT_LIMITS.activeWindowMs + 1000);
  assert.equal(agentMarked(marked, w.f.now()), false, 'the mark lapses on its own');
  const lapsed = await seen('Ada') as { agentUntil?: number };
  assert.ok((lapsed.agentUntil ?? 0) < w.f.now(), 'and the server says when');
  await w.tool(key, 'get_my_life');
  assert.equal(agentMarked(await seen('Ada') as { agent?: true; agentUntil?: number }, w.f.now()), true, 'it returns when the agent acts again');
  assert.deepEqual(publicSession({ publicId: 'p', name: 'N' }), { id: 'p', name: 'N' });
  assert.deepEqual(publicSession({ publicId: 'p', name: 'N', agent: { char: true, owner: 'x' } }), { id: 'p', name: 'N', agent: true });
  assert.deepEqual(agentMark({ at: 1000 }), { agent: true, agentUntil: 1000 + AGENT_LIMITS.activeWindowMs });
  // A player who is looking at their own page sees the mark on their own session in the room list.
  const room = await w.f.socket(ada);
  room.ws.send(JSON.stringify({ type: 'join', cityId: 'lagos', venueId: 'park' }));
  const first = await room.next();
  assert.equal(first.type, 'presence');
  assert.equal(((first as unknown as { members: Json[] }).members.find((member) => member.id === ada.id) as Json).agent, true);
});

test('modes: an own-character key plays the account\'s character; an agent character is a separate, marked life owned by the account, two at most, phone check required', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const own = await w.makeAgentKey(ada, { mode: 'own', name: 'mine' });
  const mine = await w.tool(own.key, 'get_my_life');
  const human = await w.json('/api/life?city=lagos', undefined, ada.cookie) as unknown as { state: { cash: number } };
  assert.equal(mine.data.cash, human.state.cash, 'the same life the owner plays');
  const plain = await w.makeAgentKey(ada, { mode: 'agent', name: 'bot', characterName: 'Robo Ada' });
  assert.deepEqual([plain.status, plain.error], [403, 'verification_required']);
  assert.match(String(plain.reason), /checked phone number/);
  await w.checkPhone(ada);
  const bot = await w.makeAgentKey(ada, { mode: 'agent', name: 'bot', characterName: 'Robo Ada' });
  assert.equal(bot.status, 200, text(bot));
  assert.equal(bot.character, 'Robo Ada');
  const life = await w.tool(bot.key, 'get_my_life');
  assert.equal(life.ok, true);
  assert.notEqual(life.data.cash, undefined);
  const rows = await w.stored((db) => Object.values(db.sessions).filter((session) => session.name === 'Robo Ada').map((session) => ({ account: session.account ?? null, agent: session.agent, id: session.publicId })));
  assert.equal(rows.length, 1);
  const { account } = await w.accountOf(ada);
  assert.deepEqual([rows[0]?.account, rows[0]?.agent?.char, rows[0]?.agent?.owner], [null, true, account]);
  assert.notEqual(rows[0]?.id, ada.id, 'its own life, not the owner\'s');
  // The marked character shows to everyone, always.
  const bola = await w.guest('Bola'); await w.f.request('/api/social/me', null, bola.cookie);
  w.f.advance(30 * 24 * HOUR - 1000);
  await w.tool(bot.key, 'get_my_life');
  const robo = ((await w.json('/api/social/search?q=Robo', undefined, bola.cookie)).results as Json[]).find((item) => item.name === 'Robo Ada') as Json;
  assert.deepEqual([robo.agent, robo.agentUntil], [true, undefined]);
  // Caps: two agent characters, and a name still passes the name filter.
  assert.equal((await w.makeAgentKey(ada, { mode: 'agent', name: 'again', characterName: 'Robo Two' })).status, 200);
  assert.equal((((await w.json('/api/agents', undefined, ada.cookie)).characters) as Json[]).length, 2);
  const over = await post(w, '/api/agents/keys', { mode: 'agent', characterName: 'Robo Three', csrf: await w.csrf(ada.cookie) }, ada.cookie);
  assert.ok(['too_many_characters', 'too_many_keys'].includes(String(over.error)), text(over));
  // The agents board lists agent characters only; removing one ends its keys and keeps its life in the archive.
  const board = await w.json('/api/agents/board');
  assert.ok((board.rows as Json[]).some((row) => row.name === 'Robo Ada'));
  assert.ok(!(board.rows as Json[]).some((row) => row.name === 'Ada'), 'a player\'s own character is not on it');
  const removed = await w.post(`/api/agents/characters/${rows[0]?.id}/remove`, {}, ada.cookie);
  assert.equal(removed.code, 'removed');
  assert.equal((await w.mcp(bot.key, 'ping')).status, 401);
  assert.ok(await w.stored((db) => Boolean(db.archivedLives?.[rows[0]?.id ?? ''])), 'its life is kept');
  assert.equal((((await w.json('/api/agents', undefined, ada.cookie)).characters) as Json[]).length, 1);
});

test('rankings: an agent character is on no player ranking; a player\'s own character played by an agent has that week\'s earnings left out and its balance marked', () => {
  const now = Date.UTC(2026, 0, 7, 10);
  const week = lagosTime(now).week;
  const civic = emptyCivic(), city = cityOf(civic, 'lagos');
  const life = (earned: number) => { const l = createLife(null, { now, cityId: 'lagos', isNew: true }); l.cash = 4000; l.civic.week = { week, earned }; return l; };
  checkIn(city, now, { id: 'human', name: 'Human' }, life(800), 3600000, undefined, false);
  checkIn(city, now, { id: 'played', name: 'Played' }, life(5000), 3600000, undefined, true);
  const view = richListView(city, now, 3600000, undefined, 'human');
  assert.deepEqual(view.earners.map((row) => row.id), ['human'], 'the agent-played week is not ranked');
  assert.deepEqual(view.balances.filter((row) => 'agent' in row && row.agent).map((row) => row.id), ['played'], 'and its balance is marked');
  assert.equal(city.pride?.earned, 800, 'nor is it in the place tally');
  assert.equal(city.residents.played?.ag, week);
  // The next week it is ranked again unless an agent plays again.
  const later = now + 7 * 86400000;
  const next = createLife(null, { now: later, cityId: 'lagos', isNew: true }); next.civic.week = { week: lagosTime(later).week, earned: 300 };
  checkIn(city, later, { id: 'played', name: 'Played' }, next, 3600000 * 24 * 14, undefined, false);
  assert.equal(city.residents.played?.earned, 300);
});

test('safety valves: the operator switch ends all agent access at once and back; a key is suspended after repeated refusals and after reports', async (t) => {
  const { w, ada, key } = await ownerWithKey(t);
  const bearer = (token?: string): Record<string, string> => ({ authorization: `Bearer ${token ?? OPERATOR}`, 'content-type': 'application/json' });
  const off = await fetch(`${w.f.base}/api/mod/agents/switch`, { method: 'POST', headers: bearer(), body: JSON.stringify({ off: true }) });
  assert.deepEqual([off.status, ((await off.json()) as Json).off], [200, true]);
  const refused = await w.mcp(key, 'tools/list');
  assert.deepEqual([refused.status, ((refused.json.error as Json).data as Json).code], [403, 'agents_off']);
  assert.equal((await w.makeAgentKey(ada)).error, 'agents_off');
  assert.equal(((await w.json('/api/agents', undefined, ada.cookie)).enabled), false);
  assert.equal((await fetch(`${w.f.base}/api/mod/agents/switch`, { method: 'POST', headers: bearer('wrong-token-wrong-token-0123456'), body: JSON.stringify({ off: false }) })).status, 401);
  const overview = await (await fetch(`${w.f.base}/api/mod/agents`, { headers: bearer() })).json() as Json;
  assert.deepEqual([overview.off, overview.keys], [true, 1]);
  assert.ok(!text(overview).includes(hashOfKey(key)) && !text(overview).includes(key), 'the operator sees counts, not keys');
  await fetch(`${w.f.base}/api/mod/agents/switch`, { method: 'POST', headers: bearer(), body: JSON.stringify({ off: false }) });
  assert.equal((await w.tool(key, 'get_my_life')).ok, true, 'and back on');
  // Repeated refusals.
  const second = await w.makeAgentKey(ada, { mode: 'own', name: 'loop' });
  for (let i = 0; i < AGENT_LIMITS.refusalsToSuspend; i += 1) { assert.equal((await w.tool(second.key, 'travel', { place: 'nowhere-at-all' })).ok, false); if (i % 10 === 9) w.f.advance(61000); }
  const suspended = await w.mcp(second.key, 'tools/list');
  assert.deepEqual([suspended.status, ((suspended.json.error as Json).data as Json).code], [403, 'key_suspended']);
  const listed = ((await w.json('/api/agents', undefined, ada.cookie)).keys as Json[]).find((item) => item.name === 'loop');
  assert.equal(listed?.suspended, 'refusals');
  assert.equal((await w.tool(key, 'get_my_life')).ok, true, 'the other key is not affected');
  // Reports about the character an agent plays.
  const reporters = await Promise.all(['Rita1', 'Rita2', 'Rita3'].map(async (name) => { const p = await w.guest(name); await w.f.request('/api/social/me', null, p.cookie); return p; }));
  await w.tool(key, 'get_my_life');
  for (const reporter of reporters) assert.equal((await w.json('/api/social/reports', { id: ada.id, reason: 'spam' }, reporter.cookie)).code, 'reported');
  w.f.advance(61000);
  const reported = await w.mcp(key, 'tools/list');
  assert.equal(((reported.json.error as Json).data as Json).code, 'key_suspended');
});

test('audit: each key keeps its last calls, bounded, and the owner can read them', async (t) => {
  const { w, ada, key, id } = await ownerWithKey(t);
  for (let i = 0; i < 25; i += 1) { await w.tool(key, i % 2 ? 'get_goals' : 'get_my_life'); if (i === 20) w.f.advance(61000); }
  const audit = await w.json(`/api/agents/keys/${id}/audit`, undefined, ada.cookie);
  assert.equal((audit.recent as Json[]).length, AGENT_LIMITS.auditEntries);
  assert.equal(audit.calls, 25);
  assert.deepEqual(Object.keys((audit.recent as Json[])[0] ?? {}).sort(), ['at', 'code', 'ok', 'tool']);
  assert.equal((await w.json(`/api/agents/keys/${id}/audit`, undefined, (await w.owner('Other1', 'Other')).cookie)).error, 'unknown_key', 'only the owner reads it');
});

test('privacy: tools show only what the player\'s own client could read; no other player\'s position, no keys, no hashes', async (t) => {
  const { w, ada, key } = await ownerWithKey(t);
  const bola = await w.guest('Bola'); await w.f.request('/api/social/me', null, bola.cookie);
  const here = await w.tool(key, 'list_people_here');
  assert.equal(here.ok, true);
  const everything = text([here.data, (await w.tool(key, 'list_friends')).data, (await w.tool(key, 'list_places')).data, (await w.tool(key, 'get_goals')).data]);
  assert.ok(!/"x":|"z":|position|latitude|longitude|lat"|lng"/i.test(everything), 'no coordinates');
  assert.ok(!everything.includes(hashOfKey(key)) && !everything.includes(key));
  void ada;
});

test('a life saved before this change reads the same: no agent data is added until a key is made, and the wire shapes are unchanged', async (t) => {
  const w = await world(t);
  const ada = await w.owner('Ada1', 'Ada');
  const before = await w.json('/api/life?city=lagos', undefined, ada.cookie);
  const session = await w.json('/api/session', undefined, ada.cookie);
  assert.equal(await w.stored((db) => db.agents), undefined);
  await w.json('/api/agents', undefined, ada.cookie);
  await w.json('/api/agents/board');
  await w.json('/api/social/me', undefined, ada.cookie);
  assert.equal(await w.stored((db) => db.agents), undefined, 'reading creates nothing');
  assert.equal(await w.stored((db) => Object.values(db.sessions).some((s) => s.agent !== undefined)), false);
  const { serverTime: _t1, ...a } = before, again = await w.json('/api/life?city=lagos', undefined, ada.cookie);
  const { serverTime: _t2, ...b } = again;
  assert.deepEqual({ ...a, rev: undefined }, { ...b, rev: undefined });
  assert.deepEqual(Object.keys((session.session as Json)).sort(), ['cities', 'id', 'name']);
  // The first key leaves the life as it was.
  const made = await w.makeAgentKey(ada);
  const withKey = await w.json('/api/life?city=lagos', undefined, ada.cookie);
  assert.equal(text((withKey.state as Json).cash), text((before.state as Json).cash));
  await w.tool(made.key, 'get_my_life');
  assert.equal(text(((await w.json('/api/life?city=lagos', undefined, ada.cookie)).state as Json).cash), text((before.state as Json).cash));
});

test('account data: the export lists keys without secrets, and deleting an account ends them', () => {
  const sessions: Record<string, { secret: string; publicId: string; agent?: { char?: true; owner?: string } }> = { s1: { secret: 's1', publicId: 'p1', agent: { char: true, owner: 'acc' } } };
  const db = { sessions, agents: { v: 1, keys: { h1: { name: 'k', mode: 'agent', createdAt: 1, lastUsedAt: null, calls: 2 }, h2: { name: 'j', mode: 'own', createdAt: 1, lastUsedAt: 5, calls: 0 } }, owners: { acc: { keys: ['h1', 'h2'], chars: ['p1'] } }, chars: { p1: { name: 'Bot', city: 'lagos', createdAt: 1 } } } };
  const exported = exportAgents(db as never, 'acc');
  assert.equal(exported?.keys.length, 2);
  assert.ok(!text(exported).includes('h1'));
  const archived: string[] = [];
  eraseAgents(db as never, 'acc', (_d, id) => Object.values(sessions).find((item) => item.publicId === id) as never, (_d, secret) => { archived.push(secret); });
  assert.deepEqual([Object.keys(db.agents.keys), Object.keys(db.agents.owners), Object.keys(db.agents.chars), archived], [[], [], [], ['s1']]);
});

test('every tool answers with the life summary, and the game\'s own refusals come back in plain words with what to do next', async (t) => {
  const { w, key } = await ownerWithKey(t);
  const places = await w.tool(key, 'list_places');
  assert.ok((places.data.places as Json[]).length > 0);
  assert.ok(places.data.life);
  const actions = await w.tool(key, 'list_actions_here');
  assert.ok(Array.isArray(actions.data.actions));
  const closed = (places.data.places as { id: string; open: boolean; cheapest?: Json }[]).find((place) => !place.open);
  if (closed) { const go = await w.tool(key, 'travel', { place: closed.id }); if (!go.ok) assert.match(String(go.data.result), /\w+/); }
  const unknown = await w.tool(key, 'do_activity', { id: 'no-such-activity' });
  assert.equal(unknown.ok, false);
  assert.ok(String(unknown.data.result).length > 10);
  assert.ok(unknown.data.life, 'a refusal still carries the summary');
  const since = (await w.tool(key, 'get_my_life')).data.cursor as string;
  const quiet = await w.tool(key, 'get_my_life', { since });
  assert.deepEqual([quiet.data.unchanged, Object.keys(quiet.data).length < 6], [true, true], 'the since cursor makes polling cheap');
});
