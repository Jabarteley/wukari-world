// OWNER: agents — the desk (server/house/desk.ts) on a fake host that runs the real rules engine: tasks are chosen by rules and rephrased by a model at most once per
// template and agent (kept in memory and in the store), the written brief is used with no budget or on an unsafe answer, every brief passes the AI word rules, the model never
// sees a reward or a player, and the hand-over pays exactly the price it is given.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent } from '../../src/game/cities/registry.ts';
import { createLife, dispatch } from '../../src/life.ts';
import { makeContext } from '../../src/game/util.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import { MISSION_REWARDS } from '../../src/game/content/missions.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { createRouter, HARD_CAP_MICRO } from '../models/router.ts';
import type { Limits } from '../models/router.ts';
import type { ActBody, RouteContext } from '../types.ts';
import type { ActionBody } from '../../src/types/actions.ts';
import type { LifeState } from '../../src/types/life.ts';
import { castOf } from './cast.ts';
import { deskOf } from './desk.ts';
import type { AgentRef } from './errands.ts';
import { TEMPLATES, writtenBrief } from './errands.ts';
import * as say from './lines.ts';

await loadCityContent('lagos');
const DAY = 86400000;
const DAY0 = lagosDayStart(20458);
const refOf = (key: string): AgentRef => { const spec = castOf('lagos').find((item) => item.key === key)!; return { id: `house.lagos.${key}`, key, name: spec.name, role: spec.role, voice: spec.voice, card: spec.card, city: 'lagos', venue: spec.post[0]!, place: spec.post[0]!, hours: '9 AM to 6 PM' }; };
const AGENTS = ['tolani', 'tunji', 'kofo', 'dayo', 'chinwe', 'ade'].map(refOf);
const specOf = (key: string) => castOf('lagos').find((item) => item.key === key)!;

function rig(options: { reply?: (n: number) => string; keys?: boolean; settings?: Record<string, boolean>; limits?: Partial<Limits> } = {}) {
  const clock = { t: DAY0 + 10 * 3600000 };
  const db: Record<string, unknown> & { sessions: Record<string, { publicId: string; expiresAt: number; name: string; cities: Record<string, { state: LifeState }> }> } = { sessions: {} };
  const calls: { body: Record<string, unknown> }[] = [];
  let seq = 0;
  const ctx = {
    now: () => clock.t, allow: () => true,
    checks: { setting: (key: string) => options.settings?.[key] },
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => fn(db) },
    core: { sessionByPublicId: (_db: object, id: string) => db.sessions[id] },
    settle: (session: { cities: Record<string, { state: LifeState }> }, city: string) => session.cities[city]!.state,
    act: (life: LifeState, body: ActBody) => dispatch(life, { type: body.type, payload: body.payload } as unknown as ActionBody, { ...makeContext({ now: clock.t, cityId: body.cityId, seed: `s${++seq}`, actionId: `s${seq}` }), internal: true }),
    collection: (d: Record<string, unknown>, name: string, initial: object) => (d[name] ??= initial),
  } as unknown as RouteContext;
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20, gateway: 20 }, freePerDay: { openrouter: 500, gateway: 500 }, ...options.limits };
  const router = createRouter({
    now: () => clock.t,
    fetch: async (_url, init) => {
      const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as Record<string, unknown>;
      calls.push({ body });
      const user = (body['messages'] as { role: string; content: string }[]).at(-1)!.content;
      const text = options.reply ? options.reply(calls.length - 1) : `Hmm, ${user}`;
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 120, completion_tokens: 30 } }), { status: 200 });
    },
    provider: (name) => (options.keys !== false && name === 'gateway' ? { key: 'key-gateway', baseUrl: 'https://ai-gateway.vercel.sh' } : null),
    setting: () => undefined, limits: () => limits, load: async () => undefined, save: async () => {},
  });
  const desk = (): ReturnType<typeof deskOf> => deskOf(ctx, { ask: (input) => router.ask(input) });
  const person = (id: string, name: string, saved: Record<string, unknown> = {}): LifeState => {
    const state = createLife({ cash: 5000, ...saved }, makeContext({ now: clock.t, cityId: 'lagos', seed: id, actionId: id }));
    state.t = clock.t;
    db.sessions[id] = { publicId: id, name, expiresAt: clock.t + 30 * DAY, cities: { lagos: { state } } };
    return state;
  };
  return { clock, db, calls, ctx, desk, person };
}

const WHO = (id: string, name: string) => ({ id, name });
const userOf = (call: { body: Record<string, unknown> }): string => (call.body['messages'] as { role: string; content: string }[]).at(-1)!.content;
/** One life asks the same agent on `days` successive mornings. */
async function mornings(r: ReturnType<typeof rig>, desk: ReturnType<typeof deskOf>, id: string, name: string, giver: AgentRef, days: number): Promise<{ say: string; given: boolean }[]> {
  const out: { say: string; given: boolean }[] = [];
  for (let day = 0; day < days; day++) {
    r.clock.t = DAY0 + day * DAY + 10 * 3600000;
    r.db.sessions[id]!.cities['lagos']!.state.t = r.clock.t;
    out.push(await desk.offer({ giver, spec: specOf(giver.key), peers: AGENTS.filter((agent) => agent.id !== giver.id), who: WHO(id, name) }));
  }
  return out;
}

test('the model only rephrases, once per template and agent: repeats come from memory, then from the store after a restart', async () => {
  const r = rig();
  r.person('p1', 'Ada', { cash: 40000, missions: { seed: 3 } });
  const desk = r.desk();
  const first = await mornings(r, desk, 'p1', 'Ada', AGENTS[0]!, 40);
  const given = first.filter((item) => item.given).length;
  assert.ok(given >= 25, `tasks were given on ${given} of 40 days`);
  const asked = r.calls.map(userOf);
  assert.equal(new Set(asked).size, asked.length, 'a template and agent pair is never asked twice');
  assert.ok(asked.length >= 2 && asked.length < given / 2, `${asked.length} model calls for ${given} tasks: most briefs cost nothing`);
  assert.equal(Object.keys(r.db['houseBriefs'] as object).length, asked.length, 'each phrasing is kept in the store');
  // A restart (a new desk, an empty memory), another life, the same agent: the same pairs cost nothing.
  const before = r.calls.length;
  r.person('p2', 'Bola', { cash: 40000, missions: { seed: 3 } });
  await mornings(r, r.desk(), 'p2', 'Bola', AGENTS[0]!, 40);
  assert.equal(r.calls.length, before, 'no template of this agent was asked again');
  // A different agent is a different pair.
  r.person('p3', 'Chi', { cash: 40000, missions: { seed: 3 } });
  await mornings(r, r.desk(), 'p3', 'Chi', AGENTS[5]!, 10);
  assert.ok(r.calls.length > before);
});

test('what the model sees: the written brief with its tokens, never the player, a number or a reward; and only a free model is needed', async () => {
  const r = rig();
  r.person('p1', 'Ada Okafor', { cash: 40000, missions: { seed: 3 } });
  await mornings(r, r.desk(), 'p1', 'Ada Okafor', AGENTS[0]!, 15);
  assert.ok(r.calls.length > 0);
  for (const call of r.calls) {
    const text = JSON.stringify(call.body);
    assert.doesNotMatch(text, /Ada|Okafor|p1|₦|reward|1500|600|250/, 'no player and no reward is in a prompt');
    assert.match(userOf(call), /\{\w+\}|[a-z]/);
    assert.doesNotMatch(userOf(call), /\d/, 'the user message has no digit');
  }
});

test('with no key or no budget the written brief is used, in the giver\'s voice, and nothing is spent; the task is still given', async () => {
  for (const options of [{ keys: false }, { settings: { houseTalkModel: false } }, { limits: { dailyCapMicro: 0, freePerDay: { openrouter: 0, gateway: 0 } } }]) {
    const r = rig(options);
    r.person('p1', 'Ada', { cash: 40000, missions: { seed: 3 } });
    const desk = r.desk();
    const out = await mornings(r, desk, 'p1', 'Ada', AGENTS[0]!, 12);
    assert.equal(r.calls.length, 0);
    assert.ok(out.filter((item) => item.given).length >= 8);
    assert.equal(desk.counters().model, 0);
    const entry = r.db.sessions['p1']!.cities['lagos']!.state.missions.agent!.at(-1)!;
    assert.ok(out.at(-1)!.say.startsWith(entry.brief), 'the agent says what is stored');
    assert.doesNotMatch(entry.brief, /[{}]/);
  }
});

test('an unsafe or careless rephrasing is thrown away and the written brief is said: lost tokens, numbers, links, a money ask, a long answer', async () => {
  const bad = ['I need something, bring it when you can please, {nothing} {item}.', 'Bring {units} {item}, about 5 of them.', 'Visit https://example.com for {units} {item}.', 'Send me money for {units} {item} please, I beg.', `${'Long words here. '.repeat(30)}{units} {item}`, '{units} {item}'];
  for (const [index, reply] of bad.entries()) {
    const r = rig({ reply: () => reply });
    r.person('p1', 'Ada', { cash: 40000, missions: { seed: 3 } });
    const desk = r.desk();
    const out = await mornings(r, desk, 'p1', 'Ada', AGENTS[0]!, 14);
    assert.ok(out.some((item) => item.given), `reply ${index}`);
    assert.equal(desk.counters().model, 0, `reply ${index}: nothing from the model was kept`);
    for (const entry of r.db.sessions['p1']!.cities['lagos']!.state.missions.agent ?? []) {
      assert.doesNotMatch(entry.brief, /example|money|about 5/, `reply ${index}`);
      assert.ok(agentWords(entry.brief, { toMinor: true }).ok);
    }
    assert.deepEqual(r.db['houseBriefs'] ?? {}, {}, `reply ${index}: a bad phrasing is not kept`);
  }
});

test('every brief and label the desk hands out passes the AI word rules for a minor, for every agent and several lives', async () => {
  const r = rig();
  const lives = [{ cash: 40000, job: 'tech', business: { opened: 1 } }, { cash: 300 }, { cash: 5000, growth: { tables: { played: 9 } } }];
  let n = 0;
  for (const [index, saved] of lives.entries()) {
    const id = `p${index}`;
    r.person(id, `Player ${index}`, { ...saved, missions: { seed: index + 1 } });
    for (const giver of AGENTS) {
      const out = await mornings(r, r.desk(), id, `Player ${index}`, giver, 6);
      for (const item of out) { assert.ok(agentWords(item.say, { toMinor: true }).ok, item.say); n += 1; }
      r.db.sessions[id]!.cities['lagos']!.state.missions.agent = [];
    }
    for (const entry of r.db.sessions[id]!.cities['lagos']!.state.missions.agent ?? []) assert.ok(agentWords(entry.label, { toMinor: true }).ok);
  }
  assert.ok(n >= 100);
});

test('every task given is inside the mission limits, belongs to its giver, and is asked once a day', async () => {
  const r = rig();
  r.person('p1', 'Ada', { cash: 40000, missions: { seed: 9 } });
  const desk = r.desk();
  r.clock.t = DAY0 + 10 * 3600000;
  const a = await desk.offer({ giver: AGENTS[0]!, spec: specOf('tolani'), peers: AGENTS.slice(1), who: WHO('p1', 'Ada') });
  const again = await desk.offer({ giver: AGENTS[0]!, spec: specOf('tolani'), peers: AGENTS.slice(1), who: WHO('p1', 'Ada') });
  assert.equal(a.given, true);
  assert.equal(again.given, false);
  assert.match(again.say, /today|Goals/);
  const b = await desk.offer({ giver: AGENTS[5]!, spec: specOf('ade'), peers: AGENTS.slice(0, 5), who: WHO('p1', 'Ada') });
  assert.equal(b.given, true);
  const c = await desk.offer({ giver: AGENTS[1]!, spec: specOf('tunji'), peers: [AGENTS[0]!], who: WHO('p1', 'Ada') });
  assert.equal(c.given, false, 'two a day is the limit');
  const entries = r.db.sessions['p1']!.cities['lagos']!.state.missions.agent!;
  assert.equal(entries.length, 2);
  assert.deepEqual(entries.map((entry) => entry.by.id), ['house.lagos.tolani', 'house.lagos.ade']);
  for (const entry of entries) assert.ok(entry.cash <= MISSION_REWARDS[entry.big ? 'weekly' : 'daily'].cash);
});

test('a person who is not there, has no life in the city, or is an agent gets nothing and nothing throws', async () => {
  const r = rig();
  const desk = r.desk();
  const out = await desk.offer({ giver: AGENTS[0]!, spec: specOf('tolani'), peers: [], who: WHO('ghost', 'Nobody') });
  assert.equal(out.given, false);
  assert.ok(agentWords(out.say, { toMinor: true }).ok);
  assert.equal(await desk.notice({ agent: AGENTS[0]!, spec: specOf('tolani'), who: WHO('ghost', 'Nobody'), peers: [], handWords: true }), null);
  assert.deepEqual(await desk.sell({ agent: AGENTS[0]!, who: WHO('ghost', 'Nobody'), item: { id: 'ankara', label: 'Ankara', list: 2000 }, price: 1900, quoteAt: 1 }), { ok: false, code: 'no_life' });
  r.person('bot', 'Agent Smith');
  r.db.sessions['bot']!.cities['lagos']!.state.t = r.clock.t;
  (r.db.sessions['bot'] as unknown as { agent: boolean }).agent = true;
  assert.equal((await desk.offer({ giver: AGENTS[0]!, spec: specOf('tolani'), peers: [], who: WHO('bot', 'Agent Smith') })).given, false, 'a character an AI plays is not given tasks');
});

test('the hand-over charges exactly the price given, refuses one below the least a house agent sells for, and once only', async () => {
  const r = rig();
  const state = r.person('p1', 'Ada', { cash: 10000 });
  const desk = r.desk();
  const sell = (price: number, quoteAt = 1) => desk.sell({ agent: AGENTS[0]!, who: WHO('p1', 'Ada'), item: { id: 'ankara', label: 'Ankara wax print', list: 2000 }, price, quoteAt });
  assert.deepEqual(await sell(1300), { ok: false, code: 'bad_price' }, 'under the floor share of the list price');
  assert.equal(state.cash, 10000);
  assert.deepEqual(await sell(1850), { ok: true, code: 'bought' });
  assert.equal(state.cash, 10000 - 1850);
  assert.deepEqual(await sell(1850), { ok: false, code: 'already_done' }, 'the same agreement is not paid twice');
  assert.equal(state.cash, 10000 - 1850);
  assert.equal(state.business.bag['ankara'], 1);
  assert.deepEqual(await sell(1700, 2), { ok: true, code: 'bought' }, 'a new agreement is a new purchase');
  assert.equal(state.cash, 10000 - 1850 - 1700);
  assert.deepEqual(await desk.sell({ agent: AGENTS[0]!, who: WHO('p1', 'Ada'), item: { id: 'unobtainium', label: 'x', list: 2000 }, price: 1900, quoteAt: 3 }), { ok: false, code: 'unknown_product' });
  assert.equal(desk.counters().sold, 2);
  assert.ok(say.sale(specOf('tolani'), { ok: true, label: 'Ankara', price: 1850 }, 's').includes('1,850'));
  assert.ok(writtenBrief(TEMPLATES[0]!, 'plain'));
});
