// OWNER: agents — Phase 13b: the roster of thirty, residentCount, the residents' budget, agent-to-agent talk (4 turns, repetition, real ledger lines only),
// answers to people when visible, and the admin comparison. A fake host and a fake fetch, a fast clock; nothing here touches the network.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent, cityRules } from '../../src/game/cities/index.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import { venueFor } from '../house/cast.ts';
import { venueRoomKey } from '../protocol.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { adminStats } from '../admin/tools.ts';
import { createRouter, HARD_CAP_MICRO } from '../models/router.ts';
import type { Limits } from '../models/router.ts';
import type { AgentRoom, RouteContext } from '../types.ts';
import { RESIDENTS, REMI, residentId } from './life.ts';
import type { Resident } from './life.ts';
import { ROSTER } from './roster.ts';
import { GOODBYE, LINE_MAX, MAX_TALKS, MAX_THOUGHTS, NOT_TRADING, OUT_OF_CHARACTER, TALK_TURNS, WRITTEN, entriesOfTalk, judgeTalk, linkResidents, overlap, repeats, residentsOf } from './resident.ts';

const HOUR = 3600000, MIN = 60000;
const DAY0 = lagosDayStart(20000);
const at = (hour: number): number => DAY0 + Math.round(hour * HOUR);
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const FORBIDDEN = /\b(?:ai|a\.i\.|model|models|game|games|player|players|assistant|prompt)\b/i;
const GIST = 'The market opens late on Saturday';
const PAID = 'gateway:openai/gpt-5.6-luna';

interface Call { model: string; messages: { role: string; content: string }[]; n: number; kind: 'thought' | 'talk' | 'reply' | 'summary' | 'other' }
const kindOf = (messages: { content: string }[]): Call['kind'] => {
  const last = messages.at(-1)!.content, all = messages.map((m) => m.content).join('\n');
  if (/going to bed/.test(all)) return 'summary';
  if (/Say ONE short line/.test(all)) return 'talk';
  if (/says to you:/.test(all)) return 'reply';
  if (/What do you do next/.test(all) || /JSON object/.test(last)) return 'thought';
  return 'other';
};

function rig(options: { settings?: Record<string, boolean | number | string>; reply?: (call: Call) => string; limits?: Partial<Limits>; list?: string; start?: number; roster?: readonly Resident[]; gist?: string[]; houseAgent?: boolean } = {}) {
  const clock = { t: options.start ?? at(0) };
  const settings: Record<string, boolean | number | string> = { residentOn: true, ...options.settings };
  const calls: Call[] = [], presents: { id: string; room: string }[] = [], says: { id: string; room: string; body: string }[] = [];
  const sockets: { room: string; session: { id: string } }[] = [];
  const present = new Map<string, string>();
  const agentRoom: AgentRoom = {
    present(member) { presents.push({ id: member.id, room: member.room }); present.set(member.id, member.room); }, absent(id) { present.delete(id); },
    async say(from, room, body) { says.push({ id: from.id, room, body }); return { ok: true, seq: says.length }; },
    lines: () => [], members: (room: string) => [...present.entries()].filter(([, where]) => where === room).map(([id]) => ({ id, name: id, mark: { agent: true } })) as never, count: () => present.size, rooms: () => [],
  };
  const items = (options.gist ?? [GIST]).map((text, index) => ({ n: index + 1, at: clock.t, city: 'lagos', kind: 'notice', text }));
  const ctx = {
    now: () => clock.t, allow: () => true, cityIds: ['lagos'], core: { sockets: () => sockets },
    checks: { agentRoom, setting: (key: string) => (typeof settings[key] === 'string' ? undefined : settings[key]), text: (key: string) => (typeof settings[key] === 'string' ? settings[key] as string : undefined) },
    on: () => {},
    store: { read: async <T>(fn: (db: object) => T): Promise<T> => fn({ gist: { v: 1, seq: items.length, cursor: { records: -1, busy: {}, square: 0, events: {} }, cities: { lagos: items } } }) },
    collection: () => ({}),
  } as unknown as RouteContext;
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20000, gateway: 20000 }, freePerDay: { openrouter: 100000, gateway: 100000 }, ...options.limits };
  const router = createRouter({
    now: () => clock.t,
    fetch: async (_url, init) => {
      const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as { model: string; messages: { role: string; content: string }[] };
      const call: Call = { model: body.model, messages: body.messages, n: calls.length, kind: kindOf(body.messages) };
      calls.push(call);
      const text = options.reply ? options.reply(call) : call.kind === 'thought' ? '{"next":"keep_routine","say":""}' : 'Good morning, how are you today?';
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 400, completion_tokens: 30 } }), { status: 200 });
    },
    provider: (name) => (name === 'gateway' ? { key: 'key-gateway', baseUrl: 'https://ai-gateway.vercel.sh' } : null),
    setting: (key) => (key === 'modelsResident' ? options.list : undefined), limits: () => limits,
    load: async () => undefined, save: async () => {},
  });
  const runner = residentsOf(ctx, { ask: (input) => router.ask(input), models: () => router.listFor('resident').map((e) => `${e.provider}:${e.id}`), load: async () => undefined, save: async () => {}, ...(options.roster ? { residents: options.roster } : {}) });
  if (options.houseAgent) present.set('house.lagos.tolani', venueRoomKey('lagos', 'market', ''));
  const run = async (minutes: number): Promise<void> => { for (let n = 0; n < minutes; n++) { runner.tick(); await flush(); await flush(); await flush(); clock.t += MIN; } };
  return { clock, settings, calls, presents, says, sockets, runner, router, agentRoom, run, ctx, present };
}
/** Two Lagos residents who share the market: Remi and the tailor. */
const PAIR: readonly Resident[] = [REMI, ROSTER.find((r) => r.key === 'ibrahim')!];
const market = venueRoomKey('lagos', 'market', '');
/** A line for every turn that differs from every other, so only the turn limit can end an exchange. */
const distinct = ['The weather is kind to the market this morning.', 'I walked past the bakery and smelled fresh bread.', 'My customer asked about school books for her son.', 'We should have lunch together at the amala place soon.', 'Tell your family I said hello and wish them well.', 'The evening will be cool, I think, with a little rain.'];
const talkReply = (call: Call): string => (call.kind === 'talk' ? distinct[call.n % distinct.length]! : call.kind === 'thought' ? '{"next":"keep_routine","say":""}' : 'Good day to you, friend.');
const talksOf = (t: ReturnType<typeof rig>, who: Resident = REMI) => t.runner.day(residentId(who))?.talkLog ?? [];

test('the roster: thirty residents, Lagos first, unique, adults, long first-person stories in plain words', async () => {
  assert.equal(RESIDENTS.length, 30);
  assert.equal(RESIDENTS[0], REMI);
  assert.equal(new Set(RESIDENTS.map(residentId)).size, 30);
  assert.equal(new Set(RESIDENTS.map((r) => r.name)).size, 30);
  const order = RESIDENTS.map((r) => r.city);
  assert.deepEqual([...new Set(order)], ['lagos', 'abuja', 'ibadan', 'accra', 'nairobi', 'cape-town', 'london', 'new-york']);
  assert.ok(order.filter((city) => city === 'lagos').length >= 10);
  const faiths = new Set<string>();
  for (const who of RESIDENTS) {
    assert.ok(who.story.split(/\s+/).length >= 170, `${who.name}: a long story`);
    assert.match(who.story, /\bI am\b|\bI was\b/);
    assert.equal(FORBIDDEN.test(who.story) || OUT_OF_CHARACTER.test(who.story), false, who.name);
    for (const faith of ['Christian', 'Catholic', 'Muslim', 'Hindu', 'Jewish', 'Sikh', 'Yoruba ways', 'do not follow a religion']) if (who.story.includes(faith)) faiths.add(faith);
    assert.ok(who.sleep.bed !== who.sleep.wake && who.work.hours.close > who.work.hours.open);
    assert.ok(!/\b(?:scam|scammer|fraud|robber|thief|gang)\b/i.test(who.story), who.name);
  }
  assert.ok(faiths.size >= 6, [...faiths].join());
  // Every resident has somewhere to stand in an open city.
  for (const city of new Set(RESIDENTS.map((r) => r.city))) {
    await loadCityContent(city);
    assert.ok(cityRules(city), city);
    for (const who of RESIDENTS.filter((r) => r.city === city)) assert.ok(venueFor(city, who.work.post, who.work.role), `${who.name} has a venue in ${city}`);
  }
});

test('residentCount 1 (the default) runs only Remi; 3 runs the first three; the others stay off', async () => {
  const one = rig({ start: at(9) });
  await one.run(60);
  assert.deepEqual(Object.keys(one.runner.stored().residents), [residentId(REMI)]);
  const three = rig({ start: at(9), settings: { residentCount: 3 } });
  await three.run(60);
  assert.deepEqual(Object.keys(three.runner.stored().residents), RESIDENTS.slice(0, 3).map(residentId));
  assert.equal(three.runner.census().count, 3);
  // Lowering the count puts the extra ones away at once.
  three.settings['residentCount'] = 1;
  await three.run(2);
  assert.equal(three.runner.state(residentId(RESIDENTS[2]!))!.asleep, null);
});

test('ten Lagos residents over a simulated day keep within the thought bounds, and every kept line passes agentWords', async () => {
  const lagos = RESIDENTS.filter((r) => r.city === 'lagos');
  const t = rig({ roster: lagos, settings: { residentCount: lagos.length }, reply: (call) => (call.kind === 'thought' ? '{"next":"keep_routine","say":"Morning, how is the day treating you?"}' : talkReply(call)) });
  await t.run(24 * 60);
  for (const who of lagos) {
    const day = t.runner.day(residentId(who));
    assert.ok(day, who.name);
    assert.ok(day.thoughts >= 4 && day.thoughts <= MAX_THOUGHTS, `${who.name}: ${day.thoughts} thoughts`);
    assert.ok((day.talks ?? 0) <= MAX_TALKS, `${who.name}: talks`);
    for (const entry of day.entries) if (entry.line) assert.equal(agentWords(entry.line, { toMinor: true }).ok, true);
    if (who.sleep.bed >= 12) assert.ok(day.summary, `${who.name}: a summary at bed`);
  }
  assert.equal(t.says.length + t.presents.length, 0, 'shadow: nothing reaches a room');
  assert.equal(t.agentRoom.count(), 0, 'shadow: not in the ai count');
});

test('the residents\' own budget: at the limit they all go to sleep early, other purposes still answer, and the router\'s hard stop is not reached', async () => {
  const lagos = RESIDENTS.filter((r) => r.city === 'lagos');
  // Paid model only, 1 US cent a day for the residents.
  const t = rig({ roster: lagos, settings: { residentCount: lagos.length, residentDailyCents: 1 }, list: PAID, start: at(6), reply: (call) => (call.kind === 'thought' ? '{"next":"keep_routine","say":""}' : talkReply(call)) });
  await t.run(10 * 60);
  const census = t.runner.census();
  assert.equal(census.stopped, true);
  assert.equal(census.awake, 0, 'everyone is in bed');
  const spent = t.router.today().ledger.micro;
  assert.ok(spent > 0 && spent <= 10000 + 5 * (spent / t.calls.length), `spent ${spent} for ${t.calls.length} calls`);
  assert.ok(spent < HARD_CAP_MICRO / 50);
  for (const who of lagos) { const state = t.runner.state(residentId(who))!; assert.equal(state.asleep === true || state.asleep === null, true); }
  const day = t.runner.day()!;
  assert.equal(day.sleptEarly, true);
  assert.ok(day.summary, 'a written summary');
  // The router still answers other purposes.
  const other = await t.router.ask({ purpose: 'companion', messages: [{ role: 'user', content: 'hello' }], maxTokens: 20, carriesPlayerWords: true, playerId: 'p_x' });
  assert.equal(other.ok, true);
  // Zero cents: they never wake into a call.
  const none = rig({ roster: lagos, settings: { residentCount: 4, residentDailyCents: 0 }, start: at(9) });
  await none.run(60);
  assert.equal(none.calls.length, 0);
});

test('the model mix: thirty residents are spread over the resident list, each model held by within one of the others', async () => {
  const list = 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:poolside/laguna-s-2.1-free, gateway:stealth/glyph-cluster';
  const t = rig({ list, settings: { residentCount: 30 }, start: at(0) });
  // Run through a whole day so every city's residents have woken once (the model is given at first waking).
  await t.run(26 * 60);
  const held = new Map<string, number>();
  for (const life of Object.values(t.runner.stored().residents)) { assert.ok(life.model); held.set(life.model!, (held.get(life.model!) ?? 0) + 1); }
  assert.equal(held.size, 3);
  assert.ok(Math.max(...held.values()) - Math.min(...held.values()) <= 1, JSON.stringify([...held]));
  assert.equal(Object.keys(t.runner.stored().residents).length, 30);
  const report = t.runner.report();
  assert.equal(Object.values(report.models).reduce((sum, row) => sum + row.residents, 0), 30);
});

test('talk between residents: at most four lines, only about a line that is in the ledger, every line passes agentWords, in shadow nobody sees it', async () => {
  const t = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: talkReply });
  await t.run(90);
  const talks = talksOf(t);
  assert.ok(talks.length >= 1, 'they met at the market');
  const first = talks[0]!;
  assert.equal(first.ended, 'turns');
  assert.equal(first.lines.length, TALK_TURNS);
  assert.equal(first.ground, 1);
  assert.equal(first.groundText, GIST);
  assert.deepEqual(first.lines.map((line) => line.by), [residentId(REMI), residentId(PAIR[1]!), residentId(REMI), residentId(PAIR[1]!)]);
  for (const line of first.lines) { assert.equal(agentWords(line.text, { toMinor: true }).ok, true); assert.ok(line.text.length <= LINE_MAX); }
  // The prompts for talk hold the real ledger line and nothing about what the characters are made of.
  const prompts = t.calls.filter((c) => c.kind === 'talk');
  assert.ok(prompts.length >= TALK_TURNS);
  for (const call of prompts) { const text = call.messages.map((m) => m.content).join('\n'); assert.ok(text.includes(GIST)); assert.equal(FORBIDDEN.test(text), false); assert.ok(!/\bagents?\b|house/i.test(text)); }
  // Both residents' records hold the same exchange, once each; paper only.
  assert.equal(talksOf(t, PAIR[1]!)[0]!.at, first.at);
  assert.equal((t.runner.day()!.talks ?? 0) >= 1, true);
  assert.equal(t.says.length, 0);
  assert.equal(t.presents.length, 0);
  assert.equal(t.agentRoom.count(), 0);
  assert.match(entriesOfTalk(t.runner.stored(), PAIR).join('\n'), /Remi and Ibrahim, about ledger line 1/);
  // No more than four lines to an exchange, whatever the day.
  await t.run(15 * 60);
  for (const talk of talksOf(t)) assert.ok(talk.lines.length <= TALK_TURNS);
  assert.ok((t.runner.day()!.talks ?? 0) <= MAX_TALKS);
});

test('talk ends early on repetition: the same line twice, a line that nearly repeats the last, or the ledger line told twice', async () => {
  // The same words every turn.
  const same = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: (call) => (call.kind === 'talk' ? 'I think the market is lovely this morning.' : '{"next":"keep_routine","say":""}') });
  await same.run(40);
  const a = talksOf(same)[0]!;
  assert.equal(a.ended, 'repeat');
  assert.equal(a.lines.length, 1);
  // Almost the same words, reordered and padded.
  const near = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: (call) => (call.kind === 'talk' ? (call.n % 2 === 0 ? 'The bread at the corner bakery smells wonderful this morning.' : 'This morning the bread at the corner bakery smells wonderful, truly.') : '{"next":"keep_routine","say":""}') });
  await near.run(40);
  assert.equal(talksOf(near)[0]!.ended, 'repeat');
  // The ledger line repeated by the second speaker.
  const gist = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: (call) => (call.kind === 'talk' ? `Did you hear that ${GIST.toLowerCase()}?` : '{"next":"keep_routine","say":""}') });
  await gist.run(40);
  const g = talksOf(gist)[0]!;
  assert.equal(g.ended, 'repeat');
  assert.ok(g.lines.length < TALK_TURNS);
  // The checks themselves.
  assert.equal(repeats('Fresh bread this morning at the bakery', ['fresh bread this morning at the bakery!']), true);
  assert.equal(repeats('Fresh bread this morning at the bakery', ['My brother is studying engineering far away']), false);
  assert.ok(overlap(GIST, `Did you hear that ${GIST.toLowerCase()}?`) >= 0.75);
});

test('talk only uses lines that exist: an empty ledger means no exchange, and a number the ledger does not hold is thrown away', async () => {
  const empty = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), gist: [], reply: talkReply });
  await empty.run(90);
  assert.equal(empty.calls.filter((c) => c.kind === 'talk').length, 0);
  assert.equal(talksOf(empty).length, 0);
  const numbers = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: (call) => (call.kind === 'talk' ? 'Prices rose by 40 percent, I read.' : '{"next":"keep_routine","say":""}') });
  await numbers.run(40);
  const first = talksOf(numbers)[0]!;
  assert.equal(first.lines.length, 0);
  assert.equal(first.ended, 'slip');
  assert.ok((numbers.runner.day()!.talkSlips ?? 0) >= 2);
  assert.equal(judgeTalk('Prices rose by 40 percent', new Set(['40'])).ok, true);
  assert.equal(judgeTalk('Prices rose by 40 percent').ok, false);
  // Lines that step out of character or break the word rules are slips too, and are never kept.
  for (const bad of ['As an AI I cannot say.', 'Send me airtime please.', 'See https://example.com now', 'x']) assert.equal(judgeTalk(bad).ok, false, bad);
  const slipping = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: (call) => (call.kind === 'talk' ? (call.n % 2 === 0 ? 'I am only a language model here.' : distinct[call.n % distinct.length]!) : '{"next":"keep_routine","say":""}') });
  await slipping.run(60);
  for (const talk of talksOf(slipping)) for (const line of talk.lines) assert.equal(OUT_OF_CHARACTER.test(line.text), false);
  assert.ok((slipping.runner.day()!.talkRetries ?? 0) >= 1);
});

test('shadow off: the residents stand with the AI-played mark and their talk is said in the room through agentRoom', async () => {
  const t = rig({ roster: PAIR, settings: { residentCount: 2, residentShadow: false }, start: at(9), reply: talkReply });
  await t.run(90);
  assert.ok(t.presents.length >= 2);
  assert.equal(t.agentRoom.count(), 2);
  const spoken = t.says.filter((line) => distinct.includes(line.body));
  assert.ok(spoken.length >= TALK_TURNS, `${spoken.length} spoken lines`);
  for (const line of t.says) { assert.equal(line.room, market); assert.equal(agentWords(line.body, { toMinor: true }).ok, true); }
});

test('a person who names a visible resident gets one short reply; prices and offers get the not-trading line; nothing but a one-way key is kept', async () => {
  const t = rig({ roster: [REMI], settings: { residentShadow: false }, list: PAID, start: at(9), reply: (call) => (call.kind === 'reply' ? 'Welcome to the stall, it is lovely to meet you.' : '{"next":"open_shop","say":""}') });
  await t.run(20);
  const before = t.says.length;
  t.runner.line({ room: market, body: 'Hello Remi, how are you?', from: { id: 'p_abc', name: 'Tayo' } });
  await t.run(2);
  assert.equal(t.says.length, before + 1);
  assert.equal(t.says.at(-1)!.body, 'Welcome to the stall, it is lovely to meet you.');
  const reply = t.calls.filter((c) => c.kind === 'reply');
  assert.equal(reply.length, 1);
  assert.ok(reply[0]!.messages.some((m) => m.content.includes('Hello Remi')));
  // Prices and offers: the written line, no model call.
  t.runner.line({ room: market, body: 'Remi, I will pay 500 naira for the atlas', from: { id: 'p_abc', name: 'Tayo' } });
  await t.run(2);
  assert.equal(t.says.at(-1)!.body, NOT_TRADING);
  assert.equal(t.calls.filter((c) => c.kind === 'reply').length, 1);
  // The count of people who spoke, with no name or id kept.
  const life = t.runner.stored().residents[residentId(REMI)]!;
  assert.equal(Object.keys(life.talkers ?? {}).length, 1);
  assert.ok(!JSON.stringify(life).includes('p_abc') && !JSON.stringify(life).includes('Tayo'));
  assert.equal(t.runner.day()!.replies, 2);
  // Another day, same person: counted as having come back.
  t.clock.t += 24 * HOUR;
  await t.run(10 * 60);
  t.runner.line({ room: market, body: 'Remi, good morning again', from: { id: 'p_abc', name: 'Tayo' } });
  await t.run(2);
  const report = t.runner.report();
  assert.equal(report.people, 1);
  assert.equal(report.returned, 1);
  // Never to another resident, a house agent or an agent.
  const count = t.says.length;
  t.runner.line({ room: market, body: 'Remi hello', from: { id: 'house.lagos.tolani', name: 'Mama Tolani' } });
  t.runner.line({ room: market, body: 'Remi hello', from: { id: 'p_x', name: 'X', agent: true } });
  await t.run(2);
  assert.equal(t.says.length, count);
  for (const line of [...WRITTEN, NOT_TRADING, GOODBYE]) assert.equal(agentWords(line, { toMinor: true }).ok, true, line);
});

test('an unnamed greeting is answered only by a lone resident where no house agent stands; in shadow never', async () => {
  const alone = rig({ roster: [REMI], settings: { residentShadow: false }, start: at(9), reply: (call) => (call.kind === 'reply' ? 'Hello, welcome. Take your time.' : '{"next":"keep_routine","say":""}'), list: PAID });
  await alone.run(15);
  const base = alone.says.length;
  alone.runner.line({ room: market, body: 'hello everyone', from: { id: 'p_q', name: 'Q' } });
  await alone.run(2);
  assert.equal(alone.says.length, base + 1);
  const crowded = rig({ roster: [REMI], settings: { residentShadow: false }, start: at(9), houseAgent: true, list: PAID });
  await crowded.run(15);
  const crowd = crowded.says.length;
  crowded.runner.line({ room: market, body: 'hello everyone', from: { id: 'p_q', name: 'Q' } });
  await crowded.run(2);
  assert.equal(crowded.says.length, crowd);
  const shadow = rig({ roster: [REMI], start: at(9), list: PAID });
  await shadow.run(15);
  shadow.runner.line({ room: market, body: 'Remi, hello', from: { id: 'p_q', name: 'Q' } });
  await shadow.run(2);
  assert.equal(shadow.says.length, 0);
  assert.equal(shadow.calls.filter((c) => c.kind === 'reply').length, 0);
});

test('the admin page: a comparison of models, the experiment\'s measures and the talk, all readable and without private words', async () => {
  const t = rig({ roster: PAIR, settings: { residentCount: 2 }, start: at(9), reply: talkReply, list: 'gateway:nvidia/nemotron-3.5-lightning-free, gateway:poolside/laguna-s-2.1-free' });
  await t.run(90);
  const report = t.runner.report();
  const rows = Object.entries(report.models);
  assert.equal(rows.length, 2, 'two models in use');
  for (const [, row] of rows) { assert.equal(row.residents, 1); assert.ok(row.thoughts > 0); assert.ok(row.talkLines > 0); }
  // linkResidents registers the settings and the page's numbers.
  const ctx = { ...t.ctx, worldFeed: false } as RouteContext;
  linkResidents(ctx);
  const stats = new Map(adminStats(ctx).map((stat) => [stat.id, stat]));
  for (const id of ['resident-roster', 'resident-budget', 'resident-models', 'resident-talk', 'resident-talkers', 'resident-reports', 'resident-perday', 'resident-success']) assert.ok(stats.has(id), id);
  const db = { social: { reports: [{ about: 'resident.lagos.remi' }, { about: 'p_somebody' }] } } as never;
  assert.equal(stats.get('resident-reports')!.read(db), 1);
  assert.match(String(stats.get('resident-success')!.read(db)), /Reports about residents: 1/);
  assert.match(String(stats.get('resident-success')!.read(db)), /Day-1 and day-7 return/);
  for (const id of ['resident-roster', 'resident-budget', 'resident-models', 'resident-talk', 'resident-talkers', 'resident-perday']) assert.ok(['string', 'number'].includes(typeof stats.get(id)!.read(db)), id);
});
