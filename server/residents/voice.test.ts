// OWNER: agents - the residents' voice to the owner (server/residents/voice.ts): wishes and needs clustered and the five most asked for kept, the
// weekly election of the residents' assembly (deterministic, never touching people's offices), the Sunday letter on a fake fetch (bounded, in
// character, passing agentWords, retried or written by rules), the owner's reply as a gist line and as news in the residents' thoughts, and the
// admin routes refusing everyone who is not an admin.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lagosDayStart } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { createRouter, HARD_CAP_MICRO } from '../models/router.ts';
import type { Limits } from '../models/router.ts';
import { admins, FOUNDER_ADDRESS } from '../admin/admin.test.ts';
import { governorAt, tally } from '../civic/elections.ts';
import type { RouteContext } from '../types.ts';
import { OUT_OF_CHARACTER, REMI, RESIDENTS, residentId } from './life.ts';
import { LETTER_MAX, TOP_N, affinity, clusterIdeas, electionStep, emptyVoice, gistWords, judgeIdea, judgeLetter, judgeReply, newsFromFounders, presidentAt, splitNight, stands, voiceOf, writtenLetter } from './voice.ts';
import type { Voice } from './voice.ts';

const HOUR = 3600000;
const WEEK = 2900; // a Monday-started week; Monday is Lagos day 7*WEEK-3, Sunday 7*WEEK+3
const MONDAY = lagosDayStart(7 * WEEK - 3), THURSDAY = MONDAY + 3 * 86400000, SATURDAY = MONDAY + 5 * 86400000, SUNDAY = MONDAY + 6 * 86400000;
const FORBIDDEN = /\b(?:ai|a\.i\.|model|models|game|games|player|players|assistant|prompt)\b/i;
const GOOD_LETTER = 'To the Founders,\n\nThis week many of us asked for a night market and for cheaper rent for our stalls. We would be grateful if you could think kindly on both. Thank you for reading.\n\nWith respect,\nRemi, for the residents';

interface Call { messages: { role: string; content: string }[] }
/** A host with an in-memory store, the settings, a clock, a router on a fake fetch. */
function rig(options: { count?: number; on?: boolean; reply?: (call: Call, n: number) => string; start?: number; limits?: Partial<Limits>; list?: string; extra?: Record<string, unknown> } = {}) {
  const clock = { t: options.start ?? SUNDAY + 9 * HOUR };
  const settings: Record<string, boolean | number> = { residentOn: options.on ?? true, residentCount: options.count ?? 1 };
  const db: Record<string, unknown> = { ...options.extra };
  const calls: Call[] = [];
  const ctx = {
    now: () => clock.t, allow: () => true, cityIds: ['lagos'], on: () => {},
    checks: { setting: (key: string) => settings[key] },
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => fn(db) },
    collection: (d: Record<string, unknown>, name: string, empty: object) => (d[name] ??= empty),
  } as unknown as RouteContext;
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20000, gateway: 20000 }, freePerDay: { openrouter: 100000, gateway: 100000 }, ...options.limits };
  const router = createRouter({
    now: () => clock.t,
    fetch: async (_url, init) => {
      const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as { messages: { role: string; content: string }[] };
      calls.push({ messages: body.messages });
      const text = options.reply ? options.reply({ messages: body.messages }, calls.length - 1) : GOOD_LETTER;
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 400, completion_tokens: 120 } }), { status: 200 });
    },
    provider: (name) => (name === 'gateway' ? { key: 'key-gateway', baseUrl: 'https://ai-gateway.vercel.sh' } : null),
    setting: (key) => (key === 'modelsResident' ? options.list : undefined), limits: () => limits, load: async () => undefined, save: async () => {},
  });
  const voice = voiceOf(ctx, { ask: (input) => router.ask(input) });
  const stored = (): Voice => voice.peekVoice(db as never);
  return { clock, settings, db, calls, ctx, voice, stored, router };
}
const idea = (n: number, kind: 'wish' | 'need', text: string) => ({ id: `resident.lagos.r${n}`, name: `R${n}`, city: 'lagos', kind, text });

test('judgeIdea: short, plain, in character, clean of money asks and links; splitNight reads the Wish and Need lines', () => {
  assert.deepEqual(judgeIdea('"A night market in Yaba for the evenings."'), { ok: true, text: 'A night market in Yaba for the evenings.' });
  assert.deepEqual(judgeIdea('short'), { ok: false, slip: 'invalid' });
  assert.deepEqual(judgeIdea('x'.repeat(101)), { ok: false, slip: 'invalid' });
  assert.deepEqual(judgeIdea('This game needs more shops for players.'), { ok: false, slip: 'character' });
  assert.deepEqual(judgeIdea('Please send me money for the stall rent'), { ok: false, slip: 'words' });
  assert.deepEqual(judgeIdea('See https://example.com for the plan please'), { ok: false, slip: 'words' });
  const parts = splitNight('A quiet day.\nWish: A reading corner for children.\n- Need: Steady work on weekdays.\nWish: ignored second');
  assert.deepEqual(parts, { summary: 'A quiet day.', wish: 'A reading corner for children.', need: 'Steady work on weekdays.' });
  assert.deepEqual(splitNight('Just a summary.'), { summary: 'Just a summary.', wish: null, need: null });
});

test('similar wishes are merged by word overlap and the five most asked for are kept, most first', async () => {
  const merged = clusterIdeas([
    { text: 'A night market in Yaba for the evenings', by: 'Ada', city: 'lagos' },
    { text: 'More buses to Ikeja after dark', by: 'Bode', city: 'lagos' },
    { text: 'Yaba needs a night market for evenings', by: 'Chi', city: 'lagos' },
    { text: 'A night market for Yaba evenings please', by: 'Dayo', city: 'lagos' },
    { text: 'Buses to Ikeja running after dark', by: 'Efe', city: 'lagos' },
    { text: 'A library with a free shelf', by: 'Fola', city: 'ibadan' },
  ]);
  assert.deepEqual(merged.map((c) => [c.text, c.count]), [['A night market in Yaba for the evenings', 3], ['More buses to Ikeja after dark', 2], ['A library with a free shelf', 1]]);
  assert.deepEqual(merged[0]!.by, ['Ada', 'Chi', 'Dayo']);
  // Through the service: seven distinct wishes, three of them the same; the day keeps five, the market first. One wish a day per resident.
  const t = rig();
  const wishes = ['A night market in Yaba for the evenings', 'Yaba night market for the evenings please', 'A night market in Yaba, evenings', 'Cheaper buses to Ikeja after dark', 'A free reading shelf for children', 'Clean water at the Ibadan stalls', 'A dance floor for Monday nights', 'A clinic open at the weekend'];
  for (const [n, text] of wishes.entries()) assert.equal(await t.voice.collect(idea(n, 'wish', text)), true);
  assert.equal(await t.voice.collect(idea(0, 'wish', 'Something different entirely, kind of')), false, 'one wish a day per resident');
  assert.equal(await t.voice.collect(idea(1, 'need', 'A job that I can get in the week')), true, 'a need is separate');
  assert.equal(await t.voice.collect(idea(9, 'wish', 'bad send me money now please')), false, 'a bad one is never kept');
  const top = t.voice.view(t.db as never).today;
  assert.equal(top.wishes.length, TOP_N);
  assert.equal(top.wishes[0]!.count, 3); assert.match(top.wishes[0]!.text, /night market/);
  assert.equal(top.needs.length, 1);
  assert.deepEqual(t.voice.view(t.db as never).week.wishes[0]!.count, 3);
  // Days older than the raw window keep only the tops.
  t.clock.t += 3 * 86400000;
  await t.voice.collect(idea(0, 'wish', 'A market for Sundays after church'));
  const voice = t.stored();
  assert.ok(Object.keys(voice.days).length <= 2 && Object.keys(voice.tops).length === 2);
});

test('the assembly: residents stand and vote by rules and life stories, deterministically; a one-resident assembly elects Remi', () => {
  const six = RESIDENTS.slice(0, 6);
  const run = () => {
    const scope = emptyVoice().assembly;
    electionStep(scope, six, MONDAY + 10 * HOUR);
    electionStep(scope, six, THURSDAY + 10 * HOUR);
    return scope;
  };
  const a = run(), b = run();
  assert.deepEqual(a, b, 'the same people, the same week, the same ballot');
  const week = Object.keys(a.gov.elections)[0]!, election = a.gov.elections[week]!;
  assert.ok(Object.keys(election.candidates).length >= 1);
  assert.equal(Object.keys(election.votes).length, six.length, 'every resident voted once');
  for (const choice of Object.values(election.votes)) assert.ok(Object.hasOwn(election.candidates, choice), 'a vote is a valid choice');
  assert.equal(electionStep(a, six, THURSDAY + 11 * HOUR), false, 'a second step changes nothing');
  assert.equal(governorAt(a, SATURDAY, 1), null, 'nobody sits before the polls close');
  const winner = governorAt(a, SUNDAY + HOUR, 1);
  assert.ok(winner && winner.id === tally(election)[0]!.id);
  assert.equal(presidentAt(a, six, SUNDAY + HOUR)?.who && residentId(presidentAt(a, six, SUNDAY + HOUR)!.who), winner.id);
  // The winner is whatever the votes say, with the people's tie-break (earlier declaration, then id).
  const hand = emptyVoice().assembly;
  hand.gov.elections[String(WEEK)] = { candidates: { 'resident.x': { name: 'X', slogan: 'x', at: 2 }, 'resident.y': { name: 'Y', slogan: 'y', at: 1 } }, votes: { a: 'resident.x', b: 'resident.y', c: 'resident.y', d: 'resident.x' } };
  assert.equal(governorAt(hand, SUNDAY + HOUR, 1)?.id, 'resident.y', 'a tie goes to the earlier declaration');
  // Affinity and standing are pure functions of the stories.
  assert.equal(affinity(six[0]!, six[1]!, WEEK), affinity(six[0]!, six[1]!, WEEK));
  assert.equal(stands(six[2]!, WEEK), stands(six[2]!, WEEK));
  // One resident: Remi stands, votes for herself and is elected.
  const one = emptyVoice().assembly;
  electionStep(one, [REMI], MONDAY + 10 * HOUR); electionStep(one, [REMI], THURSDAY + HOUR);
  assert.equal(governorAt(one, SUNDAY + HOUR, 1)?.id, residentId(REMI));
  // Started late (the polls already open, nobody stood): somebody is put forward and the vote still happens.
  const late = emptyVoice().assembly;
  electionStep(late, [REMI], THURSDAY + HOUR);
  assert.equal(governorAt(late, SUNDAY + HOUR, 1)?.id, residentId(REMI));
  // Nothing at all happens on results day.
  assert.equal(electionStep(emptyVoice().assembly, six, SUNDAY + HOUR), false);
});

test('the election runs every week, in the residents\' own record, and never touches a people\'s office', async () => {
  const people = { civic: { cities: { lagos: { gov: { elections: { '2900': { candidates: { p1: { name: 'Tunde', slogan: 'Fair roads', at: 1 } }, votes: { p2: 'p1' } } }, announcements: [] } } } }, politics: { scopes: { nation: { gov: { elections: {} } } } } };
  const before = JSON.stringify(people);
  const t = rig({ count: 4, start: MONDAY + 10 * HOUR, extra: people });
  await t.voice.elect();
  t.clock.t = THURSDAY + 10 * HOUR; await t.voice.elect();
  t.clock.t = SUNDAY + 2 * HOUR;
  const first = t.voice.view(t.db as never).president;
  assert.ok(first && !first.caretaker);
  t.clock.t = MONDAY + 7 * 86400000 + 10 * HOUR; await t.voice.elect();
  t.clock.t = THURSDAY + 7 * 86400000 + 10 * HOUR; await t.voice.elect();
  assert.deepEqual(Object.keys(t.stored().assembly.gov.elections).sort(), [String(WEEK), String(WEEK + 1)], 'one election each week');
  assert.equal(JSON.stringify({ civic: t.db['civic'], politics: t.db['politics'] }), before, 'people\'s offices and ballots are untouched');
  assert.ok(!JSON.stringify(people).includes('resident.'), 'no resident on any people\'s ballot');
  // Off: nothing runs on the heartbeat.
  const off = rig({ on: false, start: MONDAY + 10 * HOUR });
  off.voice.tick(); await Promise.resolve();
  assert.equal(off.db['residentVoice'], undefined);
});

test('the letter: on Sunday only, once a week, one call, bounded, in character, to the Founders, passing agentWords, with the week\'s asks in the prompt', async () => {
  const t = rig({ start: SATURDAY + 20 * HOUR });
  await t.voice.collect(idea(1, 'wish', 'A night market in Yaba for the evenings'));
  await t.voice.collect(idea(2, 'need', 'Rent for a stall that people can pay'));
  assert.equal(await t.voice.letter(), null, 'not on a Saturday');
  assert.equal(t.calls.length, 0);
  t.clock.t = SUNDAY + 9 * HOUR;
  const made = await t.voice.letter();
  assert.ok(made);
  assert.equal(t.calls.length, 1, 'one router call');
  assert.equal(made.source, 'model'); assert.equal(made.by.name, 'Remi'); assert.equal(made.tries, 1);
  assert.ok(made.text.length <= LETTER_MAX && made.text.startsWith('To the Founders'));
  assert.equal(agentWords(made.text, { toMinor: true }).ok, true);
  assert.equal(OUT_OF_CHARACTER.test(made.text) || FORBIDDEN.test(made.text), false);
  const prompt = t.calls[0]!.messages.map((m) => m.content).join('\n');
  assert.match(prompt, /A night market in Yaba/); assert.match(prompt, /Rent for a stall/);
  assert.equal(FORBIDDEN.test(prompt) || OUT_OF_CHARACTER.test(prompt), false, 'the president is never shown a word from outside the world');
  assert.equal(await t.voice.letter(), null, 'one letter a week');
  assert.equal(t.calls.length, 1);
  assert.equal(t.voice.view(t.db as never).letters[0]!.text, made.text);
  // The next Sunday brings the next letter.
  t.clock.t += 7 * 86400000;
  assert.ok(await t.voice.letter());
  assert.equal(t.stored().letters.length, 2);
});

test('the letter: an out-of-character or rule-breaking answer is asked again; after two bad ones it is written by rules; a long one is cut', async () => {
  const bad = ['As an AI I cannot write letters to anyone.', 'To the Founders, please send me money and call 08031234567 so we can talk about the weekly asks of everyone.'];
  const again = rig({ reply: (_call, n) => (n === 0 ? bad[0]! : GOOD_LETTER) });
  const second = await again.voice.letter();
  assert.equal(second?.source, 'model'); assert.equal(second?.tries, 2); assert.equal(again.calls.length, 2);
  assert.match(again.calls[1]!.messages.at(-1)!.content, /not what I needed/);
  const rules = rig({ reply: (_call, n) => bad[n]! });
  await rules.voice.collect(idea(1, 'wish', 'A night market in Yaba for the evenings'));
  const written = await rules.voice.letter();
  assert.equal(written?.source, 'rules'); assert.equal(rules.calls.length, 2, 'no third call');
  assert.match(written!.text, /^To the Founders,/); assert.match(written!.text, /night market/);
  assert.deepEqual(judgeLetter(written!.text), { ok: true, text: written!.text }, 'the written letter passes the same checks');
  // The budget is spent: no model, a written letter, nothing breaks.
  const spent = rig({ list: 'gateway:openai/gpt-5.6-luna', limits: { dailyCapMicro: 0 } });
  const quiet = await spent.voice.letter();
  assert.equal(quiet?.source, 'rules'); assert.match(quiet!.text, /quiet week/);
  // Bounded.
  const long = rig({ reply: () => `To the Founders,\n\n${'We would like a little more time for the market. '.repeat(22)}\n\nWith respect, Remi` });
  const cut = await long.voice.letter();
  assert.ok(cut && cut.source === 'model' && cut.text.length <= LETTER_MAX, `${cut?.text.length}`);
  assert.equal(judgeLetter('x'.repeat(2000)).ok, false);
  assert.equal(judgeLetter('This letter has no one it is for, but it is long enough to count as a letter in every way that matters.').ok, false, 'must be to the Founders');
  assert.equal(writtenLetter(REMI, [], []).length <= LETTER_MAX, true);
});

test('with residentCount 1 everything works: Remi is the president and the letter comes', async () => {
  const t = rig({ count: 1, start: MONDAY + 10 * HOUR });
  await t.voice.elect();
  t.clock.t = THURSDAY + 10 * HOUR; await t.voice.elect();
  t.clock.t = SUNDAY + 9 * HOUR;
  assert.equal(t.voice.view(t.db as never).president?.name, 'Remi');
  const letter = await t.voice.letter();
  assert.equal(letter?.by.name, 'Remi'); assert.equal(letter?.caretaker, false);
});

test('the owner\'s reply: kept, a gist line of kind owner, and news from the Founders for the residents; the words are checked', async (t) => {
  const a = await admins(t);
  const founder = await a.account(FOUNDER_ADDRESS, 'Founder');
  const gist = async () => ((await (await a.f.request('/api/world/gist?id=lagos')).json()) as { items: { text: string; kind: string }[] }).items;
  const post = (body: Record<string, unknown>, cookie = founder.cookie) => a.admin('/api/admin/residents/reply', cookie, body);
  const ada = await a.ready('Ada');
  // Everyone who is not an admin gets a 404, and nothing is written.
  const plain = await a.account('plain@example.com', 'Plain'), guest = await a.player('Guest');
  for (const who of [ada.cookie, guest.cookie, plain.cookie, '']) {
    const read = await a.admin('/api/admin/residents', who);
    assert.equal(read.status, 404); assert.deepEqual(read.body, { error: 'not_found' });
    const sent = await post({ text: 'The market road will be mended soon.' }, who);
    assert.equal(sent.status, 404); assert.deepEqual(sent.body, { error: 'not_found' });
  }
  assert.equal((await gist()).filter((item) => item.kind === 'owner').length, 0);
  // Words that do not belong in the world are refused; so are too-short ones.
  for (const text of ['This game will add a new city soon.', 'Send me money for the new road please', 'See https://example.com for the plan', 'ok']) assert.equal((await post({ text })).status, 400, text);
  assert.equal((await post({ text: 'The road is going to be mended soon.', kind: 'letter' })).status, 400);
  // A good one.
  const ok = await post({ text: 'The road to the market will be mended before the rains. Thank you for your patience.' });
  assert.equal(ok.status, 200); assert.equal(ok.body['code'], 'sent'); assert.equal(typeof ok.body['gist'], 'number');
  const line = (await gist()).find((item) => item.kind === 'owner');
  assert.ok(line); assert.equal(line!.text, 'News from the Founders: The road to the market will be mended before the rains.');
  const decree = await post({ text: 'Every stall in Yaba pays no fee this Saturday.', kind: 'decree' });
  assert.equal(decree.status, 200);
  assert.ok((await gist()).some((item) => item.kind === 'owner' && item.text.startsWith('The Founders have decreed: Every stall')));
  // The residents hear it as news, in the kind's wording, bounded; nobody else is messaged.
  const news = await a.f.server.store.read((db) => newsFromFounders(db, a.f.now()));
  assert.equal(news.length, 2);
  assert.match(news[0]!, /^Word has come: "The road to the market will be mended before the rains\./);
  assert.match(news[1]!, /^They have decreed: "Every stall in Yaba/);
  assert.equal(FORBIDDEN.test(news.join(' ')), false);
  assert.equal(JSON.stringify(await (await a.f.request('/api/social/me', null, ada.cookie)).json()).includes('Founders'), false, 'never a message to a person');
  const page = (await a.admin('/api/admin/residents', founder.cookie)).body as { replies: unknown[]; letters: unknown[]; replyMax: number };
  assert.equal(page.replies.length, 2); assert.equal(page.replyMax, 400);
  // The audit log has both.
  const audit = (await a.admin('/api/admin/audit?action=residents-reply', founder.cookie)).body as { lines: unknown[] };
  assert.equal(audit.lines.length, 2);
  // News fades after a few days.
  const later = await a.f.server.store.read((db) => newsFromFounders(db, a.f.now() + 4 * 86400000));
  assert.deepEqual(later, []);
});

test('judgeReply and gistWords bound what is sent and fit the ledger', () => {
  assert.equal(judgeReply('x'.repeat(401), 'news').ok, false);
  assert.deepEqual(judgeReply('  A kind word  for all.  ', undefined), { ok: true, text: 'A kind word for all.', kind: 'news' });
  assert.ok(gistWords('news', 'Short.').length <= 120);
  const long = gistWords('decree', 'Every market in every town will stay open late on Fridays because the Founders have thought long about how people like to shop and meet and sing together in the evenings.');
  assert.ok(long.length <= 120 && long.startsWith('The Founders have decreed: ') && long.endsWith('…'), long);
});
