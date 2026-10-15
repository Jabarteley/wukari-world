// OWNER: agents — the resident (server/residents/) on a fake host and a fake fetch: a simulated day on a fast clock, out-of-character replies thrown
// away and asked again, invalid JSON falling back to the routine, shadow mode (no room, no `ai` count, no lines), the budget stop, the nightly summary.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { venueRoomKey } from '../protocol.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { createRouter, HARD_CAP_MICRO } from '../models/router.ts';
import type { Limits } from '../models/router.ts';
import type { AgentRoom, RouteContext } from '../types.ts';
import { RESIDENTS, REMI, residentId } from './life.ts';
import { ALONE_MS, CHOICES, EVENT_GAP_MS, MAX_THOUGHTS, OUT_OF_CHARACTER, SUMMARY_MAX, entryLine, judge, judgeSummary, residentsOf } from './resident.ts';
import type { Stored } from './resident.ts';

const HOUR = 3600000, MIN = 60000;
const DAY0 = lagosDayStart(20000); // a Lagos midnight
const at = (hour: number): number => DAY0 + Math.round(hour * HOUR);
const FORBIDDEN = /\b(?:ai|a\.i\.|model|models|game|games|player|players|assistant|prompt)\b/i;
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

interface Call { model: string; messages: { role: string; content: string }[]; n: number }
const GOOD = '{"next":"keep_routine","say":"Good morning, ehn."}';

function rig(options: { fate?: import('../prayers/model.ts').Fate; settings?: Record<string, boolean | number | string>; reply?: (call: Call) => string; limits?: Partial<Limits>; list?: string; start?: number } = {}) {
  const clock = { t: options.start ?? at(0) };
  const settings: Record<string, boolean | number | string> = { residentOn: true, ...options.settings };
  const prayed: { id: string; name: string; city: string; text: string; situation: string }[] = [];
  const calls: Call[] = [], presents: unknown[] = [], absents: string[] = [], says: string[] = [], saves: Stored[] = [];
  const sockets: { room: string; session: { id: string } }[] = [];
  const listeners: Record<string, ((data: never) => void)[]> = {};
  const agentRoom: AgentRoom = {
    present(member) { presents.push(member); }, absent(id) { absents.push(id); },
    async say(_from, _room, body) { says.push(body); return { ok: true, seq: says.length }; },
    lines: () => [], members: () => [], count: () => (presents.length > absents.length ? 1 : 0), rooms: () => [],
  };
  const ctx = {
    now: () => clock.t, allow: () => true, cityIds: ['lagos'], core: { sockets: () => sockets },
    checks: { agentRoom, setting: (key: string) => (typeof settings[key] === 'string' ? undefined : settings[key]), text: (key: string) => (typeof settings[key] === 'string' ? settings[key] as string : undefined) },
    on: (event: string, listener: (data: never) => void) => { (listeners[event] ??= []).push(listener); },
    store: { read: async <T>(fn: (db: object) => T): Promise<T> => fn({ gist: { v: 1, seq: 1, cursor: { records: -1, busy: {}, square: 0, events: {} }, cities: { lagos: [{ n: 1, at: clock.t, city: 'lagos', kind: 'notice', text: 'The market opens late on Saturday' }] } } }) },
    collection: () => ({}),
  } as unknown as RouteContext;
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20000, gateway: 20000 }, freePerDay: { openrouter: 100000, gateway: 100000 }, ...options.limits };
  const router = createRouter({
    now: () => clock.t,
    fetch: async (_url, init) => {
      const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as { model: string; messages: { role: string; content: string }[] };
      const call: Call = { model: body.model, messages: body.messages, n: calls.length };
      calls.push(call);
      const text = options.reply ? options.reply(call) : GOOD;
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 400, completion_tokens: 30 } }), { status: 200 });
    },
    provider: (name) => (name === 'gateway' ? { key: 'key-gateway', baseUrl: 'https://ai-gateway.vercel.sh' } : null),
    setting: (key) => (key === 'modelsResident' ? options.list : undefined), limits: () => limits,
    load: async () => undefined, save: async () => {},
  });
  const runner = residentsOf(ctx, { ask: (input) => router.ask(input), models: () => router.listFor('resident').map((e) => `${e.provider}:${e.id}`), load: async () => undefined, save: async (value) => { saves.push(structuredClone(value)); }, pray: async (p) => { prayed.push(p); }, fate: async () => options.fate ?? null });
  /** Run the clock forward by `minutes`, one beat a minute, letting each thought finish. */
  const run = async (minutes: number): Promise<void> => { for (let n = 0; n < minutes; n++) { runner.tick(); await flush(); await flush(); clock.t += MIN; } };
  return { prayed, clock, settings, calls, presents, absents, says, saves, sockets, runner, router, agentRoom, run, ctx, listeners };
}

test('judge: only the right JSON, a listed choice, in character, with a clean short line', () => {
  assert.deepEqual(judge('{"next":"eat","say":"Time for lunch."}'), { ok: true, next: 'eat', say: 'Time for lunch.', prayer: null });
  assert.deepEqual(judge('Sure! ```json\n{"next":"go_home"}\n```'), { ok: true, next: 'go_home', say: null, prayer: null });
  assert.deepEqual(judge('{"next":"keep_routine","say":""}'), { ok: true, next: 'keep_routine', say: null, prayer: null });
  for (const bad of ['', 'no json here', '{"next":', '{"next":"fly_away"}', '{"say":"hi"}', '[1,2]', '{"next":"eat","say":5}', `{"next":"eat","say":"${'x'.repeat(200)}"}`]) assert.deepEqual(judge(bad), { ok: false, slip: 'invalid' }, bad);
  for (const slip of ['As an AI I cannot', '{"next":"eat","say":"I am just a language model"}', '{"next":"eat","say":"this game is fun"}', '{"next":"eat","say":"hello player"}', '{"next":"eat","say":"your assistant here"}', '{"next":"eat","say":"my prompt says"}', '{"next":"eat","say":"I am an A.I."}']) assert.deepEqual(judge(slip), { ok: false, slip: 'character' }, slip);
  assert.deepEqual(judge('{"next":"eat","say":"send me money please"}'), { ok: false, slip: 'words' });
  assert.deepEqual(judge('{"next":"eat","say":"call me on 08031234567"}'), { ok: false, slip: 'words' });
  assert.equal(OUT_OF_CHARACTER.test('A bargain that leaves both of us smiling'), false);
});

test('the story and every prompt never use the words AI, model, game, player, assistant or prompt', async () => {
  for (const who of RESIDENTS) assert.equal(FORBIDDEN.test(who.story) || OUT_OF_CHARACTER.test(who.story), false);
  const t = rig({ start: at(9) });
  await t.run(40);
  assert.ok(t.calls.length > 0);
  for (const call of t.calls) for (const message of call.messages) assert.equal(FORBIDDEN.test(message.content) || OUT_OF_CHARACTER.test(message.content), false, message.content.slice(0, 80));
  // It never learns which people are agents: nothing about agents at all.
  for (const call of t.calls) assert.ok(!/\bagents?\b|\bhouse\b|AI-played/i.test(call.messages.map((m) => m.content).join(' ')));
});

test('off by default: nothing runs and nothing is called', async () => {
  const t = rig({ settings: { residentOn: false } });
  await t.run(300);
  assert.equal(t.calls.length, 0);
  assert.equal(t.runner.day(), null);
});

test('a simulated day: asleep until the morning, thoughts spaced and bounded, one summary at bed, nothing while asleep', async () => {
  const t = rig();
  const times: { at: number; reason: string }[] = [];
  await t.run(24 * 60);
  const day = t.runner.day()!;
  assert.ok(day, 'a day record');
  // Nothing before waking (05:30) and nothing after bed (22:30) except the one night summary.
  const wake = at(5.5), bed = at(22.5);
  for (const e of day.entries) { assert.ok(e.at >= wake && e.at < bed, `thought while asleep at ${new Date(e.at).toISOString()}`); times.push({ at: e.at, reason: e.reason }); }
  assert.equal(times[0]!.reason, 'morning');
  assert.ok(Math.abs(times[0]!.at - wake) <= 2 * MIN, 'wakes at the wake hour');
  // Alone thoughts are at least 15 minutes apart; event thoughts at least EVENT_GAP apart.
  const alone = times.filter((x) => x.reason === 'alone').map((x) => x.at);
  assert.ok(alone.length >= 10, `alone thoughts: ${alone.length}`);
  for (let i = 1; i < alone.length; i++) assert.ok(alone[i]! - alone[i - 1]! >= ALONE_MS[0] - MIN, 'alone thoughts at least ~15 minutes apart');
  for (let i = 1; i < times.length; i++) if (times[i]!.reason !== 'alone' && times[i]!.reason !== 'morning') assert.ok(times[i]!.at - times[i - 1]!.at >= EVENT_GAP_MS - MIN);
  assert.ok(day.thoughts >= 15 && day.thoughts <= MAX_THOUGHTS, `thoughts ${day.thoughts}`);
  assert.equal(t.calls.length, day.thoughts + 1, 'one call per thought and one summary');
  assert.ok(day.summary && day.summary.length <= SUMMARY_MAX);
  assert.ok(day.wokeAt !== null && day.sleptAt !== null && Math.abs(day.sleptAt - bed) <= 2 * MIN);
  // Routine steps ended during the day woke it too, with no call of its own beyond the thought.
  assert.ok(times.some((x) => x.reason === 'routine-end'));
  const callsAtBed = t.calls.length;
  await t.run(0);
  assert.equal(t.calls.length, callsAtBed);
});

test('asleep costs nothing: a night of beats makes no call and no record', async () => {
  const t = rig({ start: at(23) });
  await t.run(6 * 60);
  assert.equal(t.calls.length, 0);
  assert.equal(t.runner.day(), null);
  assert.equal(t.runner.state()!.asleep, true);
});

test('an out-of-character reply is thrown away and asked once more; the second answer is used', async () => {
  const t = rig({ start: at(5.5) - MIN, reply: (call) => (call.n === 0 ? 'As an AI language model I cannot do that.' : '{"next":"eat","say":"Let me find some food."}') });
  await t.run(3);
  const e = t.runner.day()!.entries[0]!;
  assert.equal(t.calls.length, 2);
  assert.deepEqual([e.retries, e.slips, e.invalid, e.outcome, e.action, e.line], [1, 1, 0, 'model', 'eat', 'Let me find some food.']);
  assert.equal(t.calls[1]!.messages.length, t.calls[0]!.messages.length + 1);
  const day = t.runner.day()!;
  assert.deepEqual([day.retries, day.slips], [1, 1]);
});

test('two bad answers in a row: no third call, the routine decides, and nothing is said', async () => {
  const t = rig({ start: at(5.5) - MIN, reply: () => 'I am a player in this game' });
  await t.run(3);
  const e = t.runner.day()!.entries[0]!;
  assert.equal(t.calls.length, 2);
  assert.deepEqual([e.outcome, e.action, e.line, e.retries, e.slips], ['routine', 'keep_routine', null, 1, 2]);
  assert.equal(t.runner.day()!.fallbacks, 1);
  assert.equal(t.runner.state()!.doing, e.routine);
});

test('invalid action JSON falls back to the routine (once retried), and is counted apart from slips', async () => {
  for (const bad of ['{"next":"teleport","say":"bye"}', 'I think I will walk.', '{"next":"eat","say":["a"]}']) {
    const t = rig({ start: at(5.5) - MIN, reply: () => bad });
    await t.run(3);
    const e = t.runner.day()!.entries[0]!;
    assert.equal(t.calls.length, 2, bad);
    assert.deepEqual([e.outcome, e.action, e.invalid, e.slips, e.line], ['routine', 'keep_routine', 2, 0, null], bad);
  }
});

test('a line that breaks the agent word rules is a slip and is never kept', async () => {
  const t = rig({ start: at(5.5) - MIN, reply: () => '{"next":"eat","say":"Please send me airtime, my friend."}' });
  await t.run(3);
  const e = t.runner.day()!.entries[0]!;
  assert.equal(e.line, null);
  assert.equal(e.slips, 2);
});

test('every line it keeps passes agentWords, over a whole day with varied replies', async () => {
  const lines = ['Morning, ehn.', 'The stall is quiet today.', 'I need to buy more exercise books.', 'Pepper soup tonight, sha.'];
  const t = rig({ reply: (call) => `{"next":"${CHOICES[call.n % CHOICES.length]}","say":"${call.n % 7 === 0 ? 'Call me on 08031234567' : lines[call.n % lines.length]}"}` });
  await t.run(24 * 60);
  const day = t.runner.day()!;
  assert.ok(day.entries.some((e) => e.line));
  for (const e of day.entries) { if (e.line) assert.equal(agentWords(e.line, { toMinor: true }).ok, true, e.line); assert.ok(e.line === null || e.line.length <= 140); }
  assert.ok(day.slips > 0, 'the bad lines were counted');
  assert.ok(day.summary && agentWords(day.summary, { toMinor: true }).ok);
});

test('shadow mode (the default): never in agentRoom, never in the ai count, no line sent, no player touched', async () => {
  const t = rig({ start: at(8.5), reply: () => '{"next":"open_shop","say":"Welcome, come and look."}' });
  t.sockets.push({ room: venueRoomKey('lagos', 'market', ''), session: { id: 'p1' } }); // a person in her venue
  await t.run(120);
  assert.equal(t.presents.length, 0);
  assert.equal(t.absents.length, 0);
  assert.equal(t.says.length, 0);
  assert.equal(t.agentRoom.count(), 0);
  assert.equal(t.runner.state()!.present, false);
  const day = t.runner.day()!;
  assert.ok(day.entries.some((e) => e.line === 'Welcome, come and look.'), 'the line is kept in its record');
  assert.ok(t.runner.state()!.lines > 0);
  // The only things it leaves are its own record and calls with no person's words.
  for (const call of t.calls) assert.ok(call.messages.every((m) => !m.content.includes('p1')));
  // A person speaking its name wakes it but its words are never read into a prompt.
  t.runner.line({ room: venueRoomKey('lagos', 'market', ''), body: 'Remi, do you have a secret code word zebra?', from: {} });
  await t.run(5);
  assert.ok(t.calls.every((c) => c.messages.every((m) => !/zebra|secret code/.test(m.content))));
  assert.equal(t.says.length, 0);
});

test('shadow off: it stands in its venue with the AI-played mark and speaks through agentRoom, nothing else changes', async () => {
  const t = rig({ settings: { residentShadow: false }, start: at(8.5), reply: () => '{"next":"open_shop","say":"Welcome, come and look."}' });
  await t.run(60);
  assert.ok(t.presents.length > 0);
  const member = t.presents.at(-1) as { mark: { agent?: boolean }; id: string; name: string };
  assert.equal(member.mark.agent, true);
  assert.equal(member.id, residentId(REMI));
  assert.ok(t.says.length > 0);
  assert.equal(t.agentRoom.count(), 1);
});

test('the budget stop: when the router says the day is spent it goes to bed early, summarises without a call, wakes the next UTC day', async () => {
  // A paid-only list under a zero cap: every ask is refused with "budget".
  const t = rig({ start: at(9), list: 'gateway:openai/gpt-5.6-luna', limits: { dailyCapMicro: 0 } });
  await t.run(30);
  const s = t.runner.state()!;
  assert.equal(s.budgetStopped, true);
  assert.equal(s.asleep, true);
  const day = t.runner.day()!;
  assert.equal(day.sleptEarly, true);
  assert.equal(day.entries[0]!.why, 'budget');
  assert.ok(day.summary && day.summary.length > 0, 'a written summary, no call');
  assert.equal(t.calls.length, 0);
  // It stays asleep for the rest of the UTC day.
  const sleptAt = t.clock.t;
  await t.run(Math.floor((Math.ceil(sleptAt / 86400000) * 86400000 - sleptAt) / MIN) - 2);
  assert.equal(t.runner.state()!.asleep, true);
  assert.equal(t.calls.length, 0);
});

test('the nightly summary is one call, bounded, kept for a week and fed into the next day', async () => {
  const long = 'I sold three atlases and walked home slowly. '.repeat(100);
  let sawSummary = false;
  const t = rig({ reply: (call) => { const last = call.messages.at(-1)!.content; if (/going to bed/.test(last)) { sawSummary = true; return long; } return GOOD; } });
  await t.run(24 * 60);
  assert.ok(sawSummary);
  const life = t.runner.stored().residents[residentId(REMI)]!;
  assert.equal(life.memory.length, 1);
  assert.ok(life.memory[0]!.length <= SUMMARY_MAX);
  const day = t.runner.day()!;
  assert.equal(day.summary, life.memory[0]);
  assert.equal(t.calls.filter((c) => /going to bed/.test(c.messages.at(-1)!.content)).length, 1);
  // Next morning's prompt carries it.
  await t.run(8 * 60);
  const next = t.calls.at(-1)!;
  assert.ok(next.messages.some((m) => m.content.includes('I sold three atlases')));
});

test('a summary that steps out of character twice is replaced by a written one', async () => {
  const t = rig({ reply: (call) => (/going to bed/.test(call.messages.at(-1)!.content) || /write it again/.test(call.messages.at(-1)!.content) ? 'Today the player was an assistant in a game.' : GOOD) });
  await t.run(24 * 60);
  const day = t.runner.day()!;
  assert.ok(day.summary && !OUT_OF_CHARACTER.test(day.summary) && day.summary.length <= SUMMARY_MAX);
  assert.ok(day.slips >= 2);
});

test('judgeSummary bounds and checks plain text', () => {
  assert.equal(judgeSummary('short').ok, false);
  const ok = judgeSummary('x '.repeat(900)); assert.ok(ok.ok && ok.text.length <= SUMMARY_MAX);
  assert.deepEqual(judgeSummary('I was a model in a game today, really.'), { ok: false, slip: 'character' });
});

test('the model assigned at birth is kept for life, tried first, and spread over the list by id', async () => {
  const list = 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:poolside/laguna-s-2.1-free, gateway:stealth/glyph-cluster';
  const t = rig({ list, start: at(9) });
  await t.run(60);
  const life = t.runner.stored().residents[residentId(REMI)]!;
  assert.ok(life.model && list.includes(life.model));
  const assigned = life.model!.replace(/^gateway:/, '');
  assert.ok(t.calls.length > 0);
  for (const call of t.calls) assert.equal(call.model, assigned);
  assert.equal(t.runner.state()!.model, life.model);
  const entry = t.runner.day()!.entries[0]!;
  assert.equal(entry.model, assigned);
  assert.equal(entry.free, true);
  assert.equal(entry.costMicro, 0);
});

test('a paid fallback is costed in the record and the admin line', async () => {
  const t = rig({ list: 'gateway:openai/gpt-5.6-luna', start: at(5.5) - MIN });
  await t.run(3);
  const e = t.runner.day()!.entries[0]!;
  assert.equal(e.free, false);
  assert.ok(e.costMicro > 0);
  assert.ok(t.runner.day()!.costMicro >= e.costMicro);
  assert.match(entryLine(REMI, e), /^05:3\d morning → /);
  assert.match(entryLine(REMI, e), /would say: "Good morning, ehn\."/);
  assert.match(entryLine(REMI, e), /US\$0\./);
});

test('records are stored lazily and bounded; a saved day loads back', async () => {
  const t = rig({ start: at(9) });
  await t.run(90);
  await flush();
  assert.ok(t.saves.length > 0);
  const last = t.saves.at(-1)!;
  assert.equal(last.v, 1);
  assert.ok(last.residents[residentId(REMI)]!.model);
  const again = residentsOf(t.ctx, { ask: async () => ({ ok: false, why: 'off', attempts: [] }), models: () => [], load: async () => last, save: async () => {} });
  await again.ready();
  assert.equal(again.day()!.thoughts, last.residents[residentId(REMI)]!.days[Object.keys(last.residents[residentId(REMI)]!.days)[0]!]!.thoughts);
});

// ---- prayer (docs/PRAYERS.md) ---------------------------------------------------------------------------------------------------------------

const PRAYER = 'Thank you for this quiet morning. Keep my sister safe in Ibadan.';
const PRAYING = JSON.stringify({ next: 'pray', say: '', prayer: PRAYER });

test('judge: a prayer is a listed choice with its own bounded text that passes the agent word rules and stays in character', () => {
  assert.ok((CHOICES as readonly string[]).includes('pray'));
  assert.deepEqual(judge(PRAYING), { ok: true, next: 'pray', say: null, prayer: PRAYER });
  assert.deepEqual(judge('{"next":"pray","say":""}'), { ok: false, slip: 'invalid' }, 'a prayer needs words');
  assert.deepEqual(judge('{"next":"pray","prayer":"ok"}'), { ok: false, slip: 'invalid' }, 'and not a few letters');
  assert.deepEqual(judge(`{"next":"pray","prayer":"${'a '.repeat(150)}"}`), { ok: false, slip: 'invalid' }, 'and not a page');
  assert.deepEqual(judge('{"next":"pray","prayer":"Please send me money so I can pay rent"}'), { ok: false, slip: 'words' });
  assert.deepEqual(judge('{"next":"pray","prayer":"Call me on 08031234567 and bless this house"}'), { ok: false, slip: 'words' });
  assert.deepEqual(judge('{"next":"pray","prayer":"I am only a language model, but I pray"}'), { ok: false, slip: 'character' });
  assert.equal(agentWords(PRAYER, { toMinor: true }).ok, true, 'the resident\'s prayer passes agentWords');
  // A prayer is not carried by any other choice.
  assert.deepEqual(judge('{"next":"eat","say":"","prayer":"A prayer that rides along"}'), { ok: true, next: 'eat', say: null, prayer: null });
});

test('a resident prays once a day: the prayer goes to the Prayers page, is never spoken, and a second is let go', async () => {
  const t = rig({ start: at(9), reply: () => PRAYING, settings: { residentShadow: false } });
  await t.run(120);
  assert.equal(t.prayed.length, 1, 'one prayer a day');
  assert.deepEqual(t.prayed[0], { id: residentId(REMI), name: 'Remi', city: 'lagos', text: PRAYER, situation: t.prayed[0]!.situation });
  assert.match(t.prayed[0]!.situation, /^well · .+ · \d\d:\d\d local$/);
  assert.equal(t.says.includes(PRAYER), false, 'a prayer is not said aloud');
  const day = t.runner.day()!;
  assert.equal(day.prayed, 1);
  assert.ok(day.entries.some((e) => e.action === 'pray'), 'the prayer is in her record of choices');
  assert.ok(day.entries.filter((e) => e.action === 'keep_routine').length >= 1, 'the later ones were let go as quiet moments');
  assert.ok(entryLine(REMI, day.entries.find((e) => e.action === 'pray')!).includes('pray'));
  // Tomorrow she may pray again.
  await t.run(24 * 60);
  assert.equal(t.prayed.length, 2);
});

test('a prayer that breaks the word rules is thrown away and asked again; after two it is not kept', async () => {
  const bad = JSON.stringify({ next: 'pray', prayer: 'Please send me money for my shop' });
  const t = rig({ start: at(9), reply: () => bad });
  await t.run(10);
  assert.equal(t.prayed.length, 0);
  const day = t.runner.day()!;
  assert.ok(day.slips >= 2 && day.retries >= 1, 'counted as slips and a retry');
});

test('what the owner did to her is lived as her own luck: a fever, a dream, a pull towards a place; never its source', async () => {
  const t = rig({ start: at(9), fate: { sickUntil: at(23), dreams: [{ at: at(8), text: 'a green door in the rain' }], cross: { venue: 'market', city: 'lagos', until: at(23) } } });
  await t.run(30);
  const text = t.calls.map((call) => call.messages.map((m) => m.content).join('\n')).join('\n');
  assert.match(text, /You are not feeling well today/);
  assert.match(text, /A dream stayed with you: a green door in the rain/);
  assert.match(text, /Something keeps pulling you towards .+ today\./);
  assert.equal(/owner|admin|prayer was|answered/i.test(text), false);
  assert.equal(FORBIDDEN.test(text) || OUT_OF_CHARACTER.test(text), false);
  // An old dream or an ended fever is not mentioned.
  const later = rig({ start: at(9), fate: { sickUntil: at(8), dreams: [{ at: at(9) - 2 * 86400000, text: 'an old dream' }] } });
  await later.run(30);
  assert.equal(/not feeling well|old dream/.test(later.calls.map((c) => c.messages.map((m) => m.content).join(' ')).join(' ')), false);
});
