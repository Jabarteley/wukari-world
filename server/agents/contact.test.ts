// OWNER: agents — the AI agents online and a private chat with one (server/agents/contact.ts): who is listed and where, a city's list and a search, one agent by id,
// a house agent's answer through the real route, the game's own answers to danger and "are you an AI?", and refusals.
import { loadCityContent as preloadCityContent } from '../../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import assert from 'node:assert/strict';
import test from 'node:test';
import { world } from './test-world.ts';
import type { Json } from './test-world.ts';
import { kindOf, onlineAgents, placeOf } from './contact.ts';
import type { AgentRoom, RouteContext } from '../types.ts';

test('who is listed: virtual members of venues and driven sockets, each once, with the place they can be reached at', () => {
  assert.deepEqual(placeOf('lagos:market'), { city: 'lagos', venue: 'market' });
  assert.deepEqual(placeOf('lagos:home:abc'), { city: 'lagos', venue: null });
  assert.deepEqual(placeOf('lagos:neighbourhood:ikeja:e1:2'), { city: 'lagos', venue: null });
  assert.deepEqual(placeOf('world:square'), { city: 'world', venue: 'square' });
  assert.deepEqual([kindOf('resident.lagos.remi'), kindOf('house.lagos.tolani'), kindOf('3f2a')], ['resident', 'house', 'character']);
  const members: Record<string, { id: string; name: string; doing: string | null }[]> = {
    'lagos:market': [{ id: 'resident.lagos.remi', name: 'Remi Adeyemi', doing: 'Selling books' }, { id: 'house.lagos.tolani', name: 'Mama Tolani', doing: null }],
    'world:square': [{ id: 'char-1', name: 'Bolt', doing: 'Offering quizzes' }],
  };
  const agentRoom = { rooms: () => ['lagos:market', 'lagos:market', 'world:square'], members: (room: string) => (members[room] ?? []).map((m) => ({ ...m, look: null, mark: { agent: true }, group: null })) } as unknown as AgentRoom;
  const sockets = [
    { readyState: 1, expiresAt: Infinity, room: 'lagos:market', session: { id: 'char-2', name: 'Driven', agent: true } },
    { readyState: 1, expiresAt: Infinity, room: 'lagos:market', session: { id: 'person-1', name: 'Ada' } },
    { readyState: 3, expiresAt: Infinity, room: 'lagos:market', session: { id: 'char-3', name: 'Closed', agent: true } },
  ];
  const ctx = { now: () => 0, checks: { agentRoom }, core: { sockets: () => sockets } } as unknown as RouteContext;
  const list = onlineAgents(ctx);
  assert.deepEqual(list.map((agent) => [agent.id, agent.kind, agent.city, agent.venue]).sort(), [
    ['char-1', 'character', 'world', 'square'], ['char-2', 'character', 'lagos', 'market'], ['house.lagos.tolani', 'house', 'lagos', 'market'], ['resident.lagos.remi', 'resident', 'lagos', 'market'],
  ]);
  assert.equal(list.find((agent) => agent.id === 'char-1')?.place, 'the Square');
  assert.equal(list.find((agent) => agent.id === 'resident.lagos.remi')?.doing, 'Selling books');
});

function rig(t: Parameters<typeof world>[0]) {
  const fetcher = async (): Promise<unknown> => new Response(JSON.stringify({ choices: [{ message: { content: 'Lagos is busy and bright today, my friend.' } }], usage: { prompt_tokens: 120, completion_tokens: 20 } }), { status: 200 });
  return world(t, { env: { AI_GATEWAY_API_KEY: 'gateway-key-for-tests' } }, { match: (url) => url.includes('ai-gateway.vercel.sh'), fetch: fetcher });
}

test('the routes: a list for a signed-in caller, a house agent answers a private line, the game answers danger and "are you an AI?", and unknown agents are refused', async (t) => {
  const w = await rig(t);
  const ada = await w.guest('Ada');
  const list = await w.json('/api/agents/online?city=lagos', undefined, ada.cookie);
  assert.equal(list.status, 200);
  assert.ok(Array.isArray(list.agents));
  assert.equal(typeof list.cities, 'object');
  assert.equal((await w.json('/api/agents/online?city=lagos', undefined, null)).status >= 400, true, 'a session is needed');
  const one = await w.json('/api/agents/online?id=resident.lagos.nobody', undefined, ada.cookie);
  assert.equal(one.agent, null);

  const said = await w.post('/api/agents/talk', { agent: 'house.lagos.tolani', text: 'How far, how is the market today?', history: [{ me: true, text: 'Hello' }] }, ada.cookie) as Json & { status: number; text: string; name: string };
  assert.equal(said.status, 200, JSON.stringify(said));
  assert.equal(said.name, 'Mama Tolani');
  assert.ok(said.text.length > 0);
  const ai = await w.post('/api/agents/talk', { agent: 'house.lagos.tolani', text: 'Are you an AI?' }, ada.cookie);
  assert.equal(ai.game, true);
  const help = await w.post('/api/agents/talk', { agent: 'house.lagos.tolani', text: 'I want to kill myself' }, ada.cookie);
  assert.equal(help.help, true);
  assert.equal((await w.post('/api/agents/talk', { agent: 'house.nowhere.x', text: 'Hello' }, ada.cookie)).status, 400);
  assert.equal((await w.post('/api/agents/talk', { agent: 'house.lagos.tolani', text: '   ' }, ada.cookie)).status, 400);
  assert.equal((await w.json('/api/agents/talk', { agent: 'house.lagos.tolani', text: 'Hello' }, ada.cookie)).status, 403, 'the anti-forgery token is needed');
});
