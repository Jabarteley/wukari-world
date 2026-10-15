// OWNER: agents — residents everywhere: three residents in every open city, made up from a seed and the same every time; their personalities change what they do by
// rules (no model); the model's small share and the budget; bounded work per beat; visible with the AI-played mark; small storage; old settings load.
// A fake host, a fake fetch, a fast clock; nothing here touches the network.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent, loadCityNetwork, playableCityIds } from '../../src/game/cities/index.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { createRouter, HARD_CAP_MICRO } from '../models/router.ts';
import type { Limits } from '../models/router.ts';
import { prayerText } from '../prayers/model.ts';
import type { AgentRoom, RouteContext } from '../types.ts';
import { generateResident } from './generate.ts';
import { RESIDENTS, residentId } from './life.ts';
import type { Resident } from './life.ts';
import { TRAITS, gainOf, lunchSkipped, outingOdds, pastimeAt, personaOf, prayersToday, quarrelScale, ruleLine, ruleVow, talkLine, talkOdds, talkProfile, worshipWindow } from './persona.ts';
import type { Persona } from './persona.ts';
import { DEEP_MAX, OUT_OF_CHARACTER, STEP_MAX, SHARDS, judgeTalk, residentsOf } from './resident.ts';
import type { Stored } from './resident.ts';
import { factsOf, residentById, residentsInCity, residentsOfCities } from './world.ts';
import { fit, traitsOf } from './bonds.ts';

const HOUR = 3600000, MIN = 60000, DAY = 86400000;
const DAY0 = lagosDayStart(20000); // a Lagos midnight (a Friday in the calendar of this clock: the weekday below is read from the clock)
const FORBIDDEN = /\b(?:ai|a\.i\.|model|models|game|games|player|players|assistant|prompt)\b/i;
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
await loadCityNetwork();
const OPEN = playableCityIds();
const PAID = 'gateway:openai/gpt-5.6-luna';

// ---- the generator ---------------------------------------------------------------------------------------------------------------------------------
test('three residents in every open city, the same every time, with distinct names and different characters', () => {
  assert.ok(OPEN.length >= 280, `${OPEN.length} open cities`);
  const all = residentsOfCities(OPEN, 3);
  assert.equal(all.length, OPEN.length * 3, 'three in every open city');
  const ids = new Set(all.map(residentId));
  assert.equal(ids.size, all.length, 'every id is unique');
  for (const city of OPEN) {
    const here = residentsInCity(city, 3);
    assert.equal(here.length, 3, city);
    assert.equal(new Set(here.map((who) => who.name)).size, 3, `${city}: no duplicate names`);
    const made = here.filter((who) => who.generated);
    // Neighbours are drawn from different bands of every trait: at least 8 apart on each of the eight numbers.
    for (const trait of TRAITS) for (let i = 0; i < made.length; i++) for (let j = i + 1; j < made.length; j++) {
      const a = personaOf(made[i]!), b = personaOf(made[j]!);
      if (trait === 'devout' && (a.faith === 'none' || b.faith === 'none')) continue; // devotion means nothing without a faith
      assert.ok(Math.abs(a[trait] - b[trait]) >= 8, `${city}: ${trait} of ${made[i]!.name} and ${made[j]!.name}`);
    }
    // Different sleeping habits: three residents are not on one clock.
    assert.ok(new Set(here.map((who) => who.sleep.wake)).size >= 2, `${city}: more than one wake-up time`);
  }
  // Authored residents keep their cities' first slots.
  assert.deepEqual(residentsInCity('lagos', 3).map((who) => who.key), ['remi', 'adaeze', 'ibrahim']);
  assert.equal(residentsInCity('cape-town', 3).filter((who) => who.generated).length, 1, 'two authored, one made up');
  // Deterministic: a second draw, from nothing, gives the same people (this is what a restart does).
  for (const city of ['kano', 'tokyo', 'lima', 'nairobi', 'cape-town']) {
    const facts = factsOf(city)!;
    for (let slot = 0; slot < 5; slot++) {
      const one = generateResident(facts, slot, ['x']), two = generateResident(facts, slot, ['x']);
      assert.deepEqual({ ...one }, { ...two });
      assert.equal(one.story, two.story);
    }
  }
  assert.deepEqual(residentsInCity('tokyo', 3).map((who) => who.name), residentsInCity('tokyo', 5).slice(0, 3).map((who) => who.name), 'a bigger setting keeps the first three');
  assert.equal(residentsInCity('lagos', 0).length, 0);
  assert.equal(residentsInCity('lagos', 9).length, 5, 'at most five');
});

test('every generated life is a long first-person story in plain words, in the city\'s own time, with a schedule that leaves the weekend afternoon awake', () => {
  const all = residentsOfCities(OPEN, 3).filter((who) => who.generated);
  assert.ok(all.length > 800);
  const faiths = new Set<string>(), styles = new Set<string>(), tongues = new Set<string>(), jobs = new Set<string>(), names = new Set<string>(), looks = new Set<string>();
  for (const who of all) {
    const story = who.story, words = story.split(/\s+/).length;
    assert.ok(words >= 170 && words <= 600, `${who.name}: ${words} words`);
    assert.match(story, /^My name is /);
    assert.equal(FORBIDDEN.test(story) || OUT_OF_CHARACTER.test(story), false, `${who.city}/${who.name}`);
    assert.ok(!/\b(?:scam|scammer|fraud|robber|thief|gang)\b/i.test(story));
    assert.ok(who.age! >= 21 && who.age! <= 75, `${who.name} is ${who.age}`);
    const bed = who.sleep.bed, wake = who.sleep.wake;
    assert.ok(bed !== wake && wake >= 4 && wake < 10 && who.work.hours.open > wake && who.work.hours.close > who.work.hours.open && who.work.hours.close <= 24);
    const asleepAtHour = (hour: number): boolean => (bed > wake ? hour >= bed || hour < wake : hour >= bed && hour < wake);
    for (const hour of [15, 16, 17, 18, 19]) assert.equal(asleepAtHour(hour), false, `${who.name} sleeps at ${hour}`);
    assert.match(residentId(who), /^resident\.[a-z0-9-]+\.g\d-[a-z]+$/);
    assert.equal(residentById(residentId(who))?.name, who.name, 'rebuilt from its id');
    const p = personaOf(who);
    faiths.add(p.faith); styles.add(p.style); tongues.add(p.tongue); jobs.add(who.doing!); names.add(who.name); looks.add(who.look!);
    for (const trait of TRAITS) assert.ok(p[trait] >= 0 && p[trait] <= 99);
  }
  assert.ok(faiths.size >= 8, [...faiths].join());
  assert.ok(styles.size >= 5, [...styles].join());
  assert.ok(tongues.size >= 20, `${tongues.size} tongues`);
  assert.ok(jobs.size >= 25, `${jobs.size} kinds of work`);
  assert.ok(names.size >= 400, `${names.size} different names`);
  assert.equal(looks.size, 6);
  for (const [city, minutes] of [['lagos', 60], ['tokyo', 540], ['nairobi', 180], ['london', 0], ['new-york', -300], ['kathmandu', 345]] as const) assert.equal(residentsInCity(city, 3)[0]!.utcOffsetMin, minutes, city);
  // The local words are the region's: a Nigerian city speaks Nigerian, a Japanese one Japanese.
  assert.equal(personaOf(residentsInCity('kano', 3)[0]!).tongue, 'naija');
  assert.equal(personaOf(residentsInCity('tokyo', 3)[0]!).tongue, 'japanese');
});

test('an unknown city has no generated residents; the Prayers page can find a generated one by id', () => {
  assert.equal(residentsInCity('no-such-city', 3).length, 0);
  assert.equal(residentById('resident.tokyo.g9-nobody'), null);
  assert.equal(residentById('resident.lagos.remi')?.name, 'Remi');
  assert.equal(residentById('not an id'), null);
});

// ---- personality that changes what a resident does --------------------------------------------------------------------------------------------------
const calm = (over: Partial<Persona> = {}): Persona => ({ chatty: 10, temper: 10, devout: 10, curious: 10, funny: 10, ambitious: 10, generous: 10, social: 10, faith: 'christian', likes: ['tea', 'books', 'music'], dislikes: ['litter in the street'], style: 'plain', tongue: 'anglo', ...over });

test('the rules read the traits: outings, lunch, prayer, talk, friendship and quarrels all change with them', () => {
  // The sociable go out more; at work they stay put more than in free time.
  assert.ok(outingOdds(calm({ social: 90 }), false) > outingOdds(calm({ social: 5 }), false) + 20);
  assert.ok(outingOdds(calm({ social: 90 }), true) < outingOdds(calm({ social: 90 }), false));
  const outings = (p: Persona): number => { let n = 0; for (let slot = 0; slot < 400; slot++) if (pastimeAt(p, `seed|${slot}`, 3, 18, false)) n += 1; return n; };
  assert.ok(outings(calm({ social: 90, curious: 90 })) > outings(calm({ social: 5, curious: 5 })) * 2);
  // The curious go and read; the faithful go to their place of worship in the window of their faith, the others do not.
  const where = (p: Persona, weekday: number, hour: number): string[] => { const out: string[] = []; for (let slot = 0; slot < 300; slot++) { const found = pastimeAt(p, `w|${slot}`, weekday, hour, false); if (found) out.push(found); } return out; };
  assert.ok(where(calm({ curious: 95, social: 60 }), 2, 15).filter((x) => x === 'learn').length > where(calm({ curious: 5, social: 60 }), 2, 15).filter((x) => x === 'learn').length);
  assert.ok(where(calm({ faith: 'muslim', devout: 90 }), 5, 13).filter((x) => x === 'worship').length > 200, 'Friday noon at the mosque');
  assert.equal(where(calm({ faith: 'none', devout: 90 }), 5, 13).includes('worship'), false);
  assert.ok(worshipWindow('christian', 0, 9) && !worshipWindow('christian', 3, 9) && worshipWindow('jewish', 6, 10));
  // Lunch: the ambitious and careful skip it more often.
  const skipped = (p: Persona): number => { let n = 0; for (let day = 0; day < 300; day++) if (lunchSkipped(p, `l|${day}`)) n += 1; return n; };
  assert.ok(skipped(calm({ ambitious: 95, generous: 5, social: 5 })) > skipped(calm({ ambitious: 5, generous: 90, social: 90 })) + 50);
  // Prayer: none without a faith; more days and more prayers the more devout.
  const prayers = (p: Persona): number => { let n = 0; for (let day = 0; day < 200; day++) n += prayersToday(p, `p|${day}`); return n; };
  assert.equal(prayers(calm({ faith: 'none', devout: 90 })), 0);
  assert.ok(prayers(calm({ devout: 95 })) > prayers(calm({ devout: 15 })) * 3);
  // Talk: talkers talk more often, longer, with shorter breaks, and begin more readily.
  const loud = talkProfile(calm({ chatty: 95 })), quiet = talkProfile(calm({ chatty: 5 }));
  assert.ok(loud.maxTalks > quiet.maxTalks + 2 && loud.turns > quiet.turns && loud.gapMs < quiet.gapMs && loud.lines > quiet.lines);
  assert.ok(talkOdds(calm({ chatty: 95, social: 95 }), calm({ chatty: 90 })) > talkOdds(calm({ chatty: 5, social: 5 }), calm({ chatty: 10 })) * 2);
  // Friendship and quarrels (bonds.ts reads these).
  assert.ok(gainOf(calm({ chatty: 95, social: 95 }), calm({ chatty: 90, social: 90 }), 3) > gainOf(calm({ chatty: 5, social: 5 }), calm({ chatty: 10, social: 10 }), 3));
  assert.ok(quarrelScale(calm({ temper: 95 }), calm({ temper: 90 })) > quarrelScale(calm({ temper: 5 }), calm({ temper: 10 })) * 3);
  const tA = traitsOf({ ...residentsInCity('tokyo', 3)[0]!, persona: calm({ temper: 10 }) }), tB = traitsOf({ ...residentsInCity('tokyo', 3)[1]!, persona: calm({ temper: 15 }) }), tC = traitsOf({ ...residentsInCity('tokyo', 3)[2]!, persona: calm({ temper: 90 }) });
  assert.ok(fit(tA, tB) > fit(tA, tC), 'like tempers get on better than a hot one and a calm one');
});

test('every line a character can write passes the word rules, has no digits and never speaks of what it is made of', () => {
  const all = residentsOfCities(OPEN, 3);
  let lines = 0;
  for (const who of all) {
    const p = personaOf(who);
    for (const kind of ['morning', 'greet', 'work', 'outing', 'remark', 'evening'] as const) for (let n = 0; n < 6; n++) {
      const line = ruleLine(p, kind, `${who.name}|${kind}|${n}`, { pastime: (['walk', 'worship', 'bite', 'browse', 'learn', 'view'] as const)[n], gist: n % 2 ? 'The market opens late on Saturday' : null });
      if (line === null) continue;
      lines += 1;
      const checked = judgeTalk(line, new Set());
      assert.ok(checked.ok, `${who.city}/${who.name}/${kind}: "${line}"`);
    }
    for (let turn = 0; turn < 3; turn++) { const line = talkLine(p, 'Friend', turn, `${who.name}|talk|${turn}`, turn === 0 ? 'The park reopens on Sunday' : null); assert.ok(judgeTalk(line, new Set()).ok, `${who.name} talk: "${line}"`); }
    const vow = ruleVow(p.faith, `${who.name}|vow`);
    assert.equal(prayerText(vow).ok, true, vow);
    assert.equal(agentWords(vow, { toMinor: true }).ok && !OUT_OF_CHARACTER.test(vow), true, vow);
  }
  assert.ok(lines > 20000, `${lines} lines checked`);
});

// ---- a host with residents everywhere --------------------------------------------------------------------------------------------------------------
interface Call { model: string; messages: { role: string; content: string }[]; n: number; kind: 'thought' | 'talk' | 'reply' | 'summary' | 'other' }
const kindOf = (messages: { content: string }[]): Call['kind'] => {
  const all = messages.map((m) => m.content).join('\n'), last = messages.at(-1)!.content;
  if (/going to bed/.test(all)) return 'summary';
  if (/Say ONE short line/.test(all)) return 'talk';
  if (/says to you:/.test(all)) return 'reply';
  if (/What do you do next/.test(all) || /JSON object/.test(last)) return 'thought';
  return 'other';
};
interface Options { cities?: readonly string[]; settings?: Record<string, boolean | number | string>; start?: number; list?: string; limits?: Partial<Limits>; roster?: readonly Resident[]; reply?: (call: Call) => string; people?: boolean }
function rig(options: Options = {}) {
  const clock = { t: options.start ?? DAY0 };
  const settings: Record<string, boolean | number | string> = { residentOn: true, residentShadow: false, residentsPerCity: 3, ...options.settings };
  const calls: Call[] = [], says: { id: string; room: string; body: string }[] = [], prayed: { id: string; text: string }[] = [], saves: Stored[] = [];
  const presents: { id: string; room: string; doing: string | null; agent: boolean }[] = [], present = new Map<string, string>();
  const sockets: { room: string; session: { id: string } }[] = [];
  const agentRoom: AgentRoom = {
    present(member) { presents.push({ id: member.id, room: member.room, doing: member.doing, agent: member.mark.agent === true }); present.set(member.id, member.room); }, absent(id) { present.delete(id); },
    async say(from, room, body) { says.push({ id: from.id, room, body }); return { ok: true, seq: says.length }; },
    lines: () => [], members: (room: string) => [...present.entries()].filter(([, where]) => where === room).map(([id]) => ({ id, name: id, mark: { agent: true } })) as never, count: () => present.size, rooms: () => [...present.values()],
  };
  const ctx = {
    now: () => clock.t, allow: () => true, cityIds: options.cities ?? ['lagos'], core: { sockets: () => sockets },
    checks: { agentRoom, setting: (key: string) => (typeof settings[key] === 'string' ? undefined : settings[key]), text: (key: string) => (typeof settings[key] === 'string' ? settings[key] as string : undefined) },
    on: () => {},
    store: { read: async <T>(fn: (db: object) => T): Promise<T> => fn({ gist: { v: 1, seq: 2, cursor: { records: -1, busy: {}, square: 0, events: {} }, cities: Object.fromEntries((options.cities ?? ['lagos']).map((city) => [city, [{ n: 1, at: clock.t, city, kind: 'notice', text: 'The market opens late on Saturday' }, { n: 2, at: clock.t, city, kind: 'notice', text: 'A new bus line starts next week' }]])) } }) },
    collection: () => ({}),
  } as unknown as RouteContext;
  const limits: Limits = { dailyCapMicro: HARD_CAP_MICRO, playerRequests: 200, playerMicro: 50000, freePerMinute: { openrouter: 20000, gateway: 20000 }, freePerDay: { openrouter: 100000, gateway: 100000 }, ...options.limits };
  const router = createRouter({
    now: () => clock.t,
    fetch: async (_url, init) => {
      const body = JSON.parse(String((init as { body?: string }).body ?? '{}')) as { model: string; messages: { role: string; content: string }[] };
      const call: Call = { model: body.model, messages: body.messages, n: calls.length, kind: kindOf(body.messages) };
      calls.push(call);
      const text = options.reply ? options.reply(call) : call.kind === 'thought' ? '{"next":"keep_routine","say":""}' : call.kind === 'summary' ? 'I walked, I worked and I talked with a few people. Tomorrow I hope for more of the same.' : 'Good day to you, friend.';
      return new Response(JSON.stringify({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 400, completion_tokens: 30 } }), { status: 200 });
    },
    provider: (name) => (name === 'gateway' ? { key: 'key-gateway', baseUrl: 'https://ai-gateway.vercel.sh' } : null),
    setting: (key) => (key === 'modelsResident' ? options.list : undefined), limits: () => limits, load: async () => undefined, save: async () => {},
  });
  const runner = residentsOf(ctx, { ask: (input) => router.ask(input), models: () => router.listFor('resident').map((e) => `${e.provider}:${e.id}`), load: async () => undefined, save: async (value) => { saves.push(structuredClone(value)); }, pray: async (p) => { prayed.push({ id: p.id, text: p.text }); }, ...(options.roster ? { residents: options.roster } : {}) });
  const run = async (minutes: number, step = 1): Promise<void> => { for (let n = 0; n < minutes; n += step) { runner.tick(); await flush(); await flush(); clock.t += step * MIN; } };
  return { clock, settings, calls, says, prayed, saves, presents, present, sockets, runner, router, agentRoom, run, ctx };
}

test('by default no model is asked: residents live by their routines and characters, and visible ones stand in their venues with the AI-played mark', async () => {
  await loadCityContent('london'); await loadCityContent('nairobi');
  const t = rig({ cities: ['london', 'nairobi'], settings: { residentDeepPerDay: 0 }, start: DAY0 + 3 * HOUR });
  await t.run(20 * 60, 2);
  assert.equal(t.calls.length, 0, 'no model call at all');
  assert.ok(t.presents.length > 0, 'they stand in venues');
  assert.ok(t.presents.every((p) => p.agent), 'the AI-played mark is always on');
  assert.ok(t.presents.every((p) => /^(?:london|nairobi):/.test(p.room)), 'in the venues of their own city');
  assert.ok(new Set(t.presents.map((p) => p.id)).size >= 4, 'several residents stand there');
  assert.ok(t.agentRoom.count() > 0, 'the AI count in the pulse sees them');
  assert.ok(t.says.length > 0, 'they speak');
  for (const said of t.says) { assert.ok(agentWords(said.body, { toMinor: true }).ok && !OUT_OF_CHARACTER.test(said.body), said.body); assert.equal(/\d/.test(said.body), false, said.body); }
  const census = t.runner.census();
  assert.equal(census.count, 6);
  assert.ok(census.present > 0);
  // In shadow they are on paper only: not in any room, nothing said.
  const shadow = rig({ cities: ['london'], settings: { residentShadow: true, residentDeepPerDay: 0 }, start: DAY0 + 3 * HOUR });
  await shadow.run(8 * 60, 3);
  assert.equal(shadow.presents.length, 0); assert.equal(shadow.says.length, 0); assert.equal(shadow.agentRoom.count(), 0);
});

test('residents of one city behave measurably differently over a simulated day, with no model', async () => {
  const cities = ['london', 'nairobi', 'tokyo', 'lima', 'kano', 'dublin'];
  for (const city of cities) await loadCityContent(city);
  const t = rig({ cities, settings: { residentDeepPerDay: 0 }, start: DAY0 + 2 * HOUR });
  const rooms = new Map<string, Set<string>>(), first = new Map<string, number>();
  await (async () => { for (let minute = 0; minute < 27 * 60; minute += 2) { t.runner.tick(); await flush(); await flush(); t.clock.t += 2 * MIN; for (const p of t.presents.splice(0)) { (rooms.get(p.id) ?? rooms.set(p.id, new Set()).get(p.id)!).add(p.room); if (!first.has(p.id)) first.set(p.id, t.clock.t); } } })();
  assert.equal(t.calls.length, 0);
  let compared = 0;
  const measures = (who: Resident): (number | string)[] => {
    const day = t.runner.day(residentId(who))!, id = residentId(who);
    return [rooms.get(id)?.size ?? 0, day.outings ?? 0, day.said ?? 0, day.prayed ?? 0, day.talks ?? 0, Math.round((first.get(id) ?? 0) / (30 * MIN))];
  };
  const spread = new Set<string>();
  for (const city of cities) {
    const here = residentsInCity(city, 3);
    for (let i = 0; i < here.length; i++) for (let j = i + 1; j < here.length; j++) {
      const a = measures(here[i]!), b = measures(here[j]!);
      const differing = a.filter((value, at) => value !== b[at]).length;
      assert.ok(differing >= 2, `${city}: ${here[i]!.name} ${JSON.stringify(a)} and ${here[j]!.name} ${JSON.stringify(b)} behave too alike`);
      compared += 1;
    }
    for (const who of here) spread.add(JSON.stringify(measures(who)));
  }
  assert.equal(compared, cities.length * 3);
  assert.ok(spread.size >= cities.length * 3 - 2, `${spread.size} different days among ${cities.length * 3} residents`);
  // Across the world the traits show in the numbers: the more sociable go out more, the more talkative speak more.
  const people = cities.flatMap((city) => residentsInCity(city, 3)), by = (value: (who: Resident) => number, trait: (p: Persona) => number): number => {
    const sorted = [...people].sort((x, y) => trait(personaOf(x)) - trait(personaOf(y))), half = Math.floor(sorted.length / 2);
    const sum = (list: Resident[]): number => list.reduce((total, who) => total + value(who), 0);
    return sum(sorted.slice(half)) - sum(sorted.slice(0, half));
  };
  const dayOf = (who: Resident) => t.runner.day(residentId(who))!;
  assert.ok(by((who) => dayOf(who).said ?? 0, (p) => p.chatty) >= 0, 'the talkative speak at least as much');
  assert.ok(by((who) => dayOf(who).outings ?? 0, (p) => p.social) >= 0, 'the sociable go out at least as much');
});

test('talk between residents is by rule and by character: the talkative talk more, in more lines, and every line is clean', async () => {
  await loadCityContent('lagos');
  const facts = factsOf('lagos')!;
  // Three made-up Lagos residents on one clock at one market: the same place, so only their characters differ.
  const crew: Resident[] = [3, 4, 5].map((slot) => { const made = generateResident(facts, slot, []); return { ...made, key: `t${slot}`, name: `Tester${'abc'[slot - 3]}`, sleep: { bed: 22, wake: 6 }, work: { ...made.work, role: 'guide' as const, hours: { open: 8, close: 20 } }, kinds: { post: ['market'], eatery: [] } }; });
  const t = rig({ cities: ['lagos'], settings: { residentDeepPerDay: 0, residentShadow: false }, roster: crew, start: DAY0 + 4 * HOUR });
  for (let minute = 0; minute < 2 * 24 * 60; minute += 2) { t.runner.tick(); await flush(); await flush(); t.clock.t += 2 * MIN; }
  assert.equal(t.calls.length, 0);
  const rows = crew.map((who) => { const days = Object.values(t.runner.stored().residents[residentId(who)]!.days); return { who, chatty: personaOf(who).chatty, talks: days.reduce((n, d) => n + (d.ruleTalks ?? 0), 0), lines: days.reduce((n, d) => n + (d.talkLines ?? 0), 0), said: days.reduce((n, d) => n + (d.said ?? 0), 0) }; }).sort((a, b) => a.chatty - b.chatty);
  console.log(`      rule talk over two days: ${rows.map((r) => `${r.who.name} chatty ${r.chatty}: ${r.talks} talks, ${r.lines} talk lines, ${r.said} other lines`).join(' | ')}`);
  assert.ok(rows.reduce((n, r) => n + r.talks, 0) > 0, 'they talked');
  assert.ok(rows.at(-1)!.talks >= rows[0]!.talks && rows.at(-1)!.lines + rows.at(-1)!.said >= rows[0]!.lines + rows[0]!.said, 'the talkative talk and speak at least as much as the quiet one');
  for (const row of rows) for (const day of Object.values(t.runner.stored().residents[residentId(row.who)]!.days)) assert.ok((day.talks ?? 0) <= talkProfile(personaOf(row.who)).maxTalks, 'within the character\'s own limit');
  for (const talk of t.runner.ruleTalks()) for (const line of talk.lines) { assert.ok(judgeTalk(line.text, new Set(['1', '2'])).ok, line.text); assert.equal(line.model, null); }
  assert.ok(t.says.length > 0 && t.says.every((s) => agentWords(s.body, { toMinor: true }).ok));
});

// ---- cost: the model's small share, the budget, and living on after it ----------------------------------------------------------------------------
test('at scale the model stays inside its share: rules by default, a few deep thoughts, answers to people, nights only for those who met someone; after the budget they carry on by rules', async () => {
  const cities = OPEN.slice(0, 120);
  for (const city of ['london', 'nairobi', 'tokyo']) await loadCityContent(city);
  const busy = ['london', 'nairobi', 'tokyo', ...cities.slice(3)];
  const t = rig({ cities: busy, settings: { residentDeepPerDay: 60, residentDailyCents: 1 }, list: PAID, start: DAY0 + 4 * HOUR });
  assert.equal(t.runner.roster.length, busy.length * 3);
  // People stand in the three loaded cities and speak to the residents by name.
  const names = t.runner.roster.filter((who) => ['london', 'nairobi', 'tokyo'].includes(who.city));
  let spoke = 0;
  const speak = (): void => { for (const who of names) for (const room of new Set(t.presents.filter((p) => p.id === residentId(who)).map((p) => p.room))) { if (!t.sockets.some((s) => s.room === room)) t.sockets.push({ room, session: { id: `s_${room}` } }); if (spoke++ < 600) t.runner.line({ room, body: `Hello ${who.name}, how is your day?`, from: { id: `person-${spoke % 7}`, name: 'Ada' } }); } };
  for (let minute = 0; minute < 14 * 60; minute += 3) { t.runner.tick(); await flush(); await flush(); t.clock.t += 3 * MIN; if (minute % 15 === 0) speak(); }
  await flush();
  const census = t.runner.census();
  const spent = t.router.today().ledger.byPurpose['resident']?.micro ?? 0;
  console.log(`      scale: ${t.calls.length} calls (${t.calls.filter((c) => c.kind === 'thought').length} thoughts, ${t.calls.filter((c) => c.kind === 'talk').length} talk, ${t.calls.filter((c) => c.kind === 'reply').length} replies, ${t.calls.filter((c) => c.kind === 'summary').length} nights), spent ${spent} micro, deep ${census.deepUsed}`);
  assert.ok(t.calls.length > 0, 'the model is used a little');
  assert.ok(census.deepUsed <= 60 + 4, `${census.deepUsed} deep units of a quota of 60`);
  const thoughts = t.calls.filter((c) => c.kind === 'thought').length;
  assert.ok(thoughts <= 60, `${thoughts} deep thoughts`);
  assert.ok(spent <= 10000 + 5 * (spent / Math.max(1, t.calls.length)), `spent ${spent} micro-dollars of the 1 cent limit (${t.calls.length} calls)`);
  assert.ok(spent < HARD_CAP_MICRO / 50);
  assert.equal(census.stopped, true, 'the residents\' own budget was spent');
  // Spent: no further model call; they carry on by rules (they still move, speak, talk and pray).
  const callsAtStop = t.calls.length, saysAtStop = t.says.length, presentsAtStop = t.presents.length;
  t.sockets.length = 0;
  for (let minute = 0; minute < 6 * 60; minute += 3) { t.runner.tick(); await flush(); await flush(); t.clock.t += 3 * MIN; }
  assert.equal(t.calls.length, callsAtStop, 'no call after the stop');
  assert.ok(t.says.length + t.presents.length > saysAtStop + presentsAtStop, 'they keep living by rules');
  assert.ok(t.runner.census().awake > 0, 'not put to bed by the budget');
  // The router still answers other purposes.
  assert.equal((await t.router.ask({ purpose: 'companion', messages: [{ role: 'user', content: 'hello' }], maxTokens: 20, carriesPlayerWords: true, playerId: 'p_x' })).ok, true);
});

test('a night summary is a model call only for a resident who met a person that day; the others write nothing and keep nothing', async () => {
  await loadCityContent('tokyo');
  const t = rig({ cities: ['tokyo'], settings: { residentDeepPerDay: 0 }, start: DAY0 + 3 * HOUR });
  await t.run(10 * 60, 3);
  // Somebody stands where one of the residents stands.
  const who = t.runner.roster.find((r) => t.runner.state(residentId(r))!.where)!, room = t.runner.state(residentId(who))!.where!;
  assert.ok(room, 'a resident is out');
  t.sockets.push({ room, session: { id: 's_1' } });
  await t.run(30, 1);
  t.sockets.length = 0;
  await t.run(20 * 60, 3);
  await flush(); await flush();
  const summaries = t.calls.filter((c) => c.kind === 'summary');
  assert.ok(summaries.length >= 1 && summaries.length <= 3, `${summaries.length} summary calls`);
  const met = t.runner.stored().residents[residentId(who)]!;
  assert.ok(Object.values(met.days).some((day) => day.met === true));
  const quiet = t.runner.roster.find((other) => other !== who && !Object.values(t.runner.stored().residents[residentId(other)]!.days).some((day) => day.met === true));
  assert.ok(quiet, 'someone met nobody');
  assert.equal(t.runner.stored().residents[residentId(quiet!)]!.memory.length, 0, 'a generated resident who met nobody keeps no summary');
  assert.equal(t.runner.stored().residents[residentId(quiet!)]!.model, null, 'and holds no model');
});

test('work per beat is bounded: at most STEP_MAX residents are stepped on a heartbeat, round-robin, so everyone is reached', async () => {
  const t = rig({ cities: OPEN, settings: { residentDeepPerDay: 0 }, start: DAY0 + 8 * HOUR });
  const size = t.runner.roster.length;
  assert.ok(size >= 850, `${size} residents`);
  t.runner.tick(); await flush(); await flush(); // the first beat only loads the records
  t.runner.tick(); await flush();
  assert.ok(t.runner.stepped() <= STEP_MAX && t.runner.stepped() > 0);
  const seen = new Set<string>();
  const cycle = Math.ceil(size / STEP_MAX);
  for (let n = 0; n < cycle; n++) { t.runner.tick(); await flush(); assert.ok(t.runner.stepped() <= STEP_MAX, 'never more than STEP_MAX'); }
  for (const who of t.runner.roster) if (t.runner.state(residentId(who))!.asleep !== null) seen.add(residentId(who));
  assert.equal(seen.size, size, 'every resident was reached within one cycle');
  assert.equal(t.calls.length, 0);
  // A heartbeat of the whole world is cheap: the stepping of one beat takes a fraction of a second.
  const began = performance.now();
  for (let n = 0; n < 40; n++) { t.runner.tick(); t.clock.t += 10000; }
  console.log(`      beats: ${((performance.now() - began) / 40).toFixed(2)} ms per beat for ${size} residents, ${STEP_MAX} stepped each`);
  assert.ok(performance.now() - began < 2000, `${(performance.now() - began).toFixed(0)} ms for 40 beats`);
});

// ---- storage ----------------------------------------------------------------------------------------------------------------------------------------
test('storage stays small for the whole world: per resident, bounded, in shards written only when they change', async () => {
  const t = rig({ cities: OPEN, settings: { residentDeepPerDay: 0 }, start: DAY0 + 1 * HOUR });
  // Three days, a beat every five minutes: every resident wakes, works, sleeps and keeps its small day records.
  for (let minute = 0; minute < 3 * 24 * 60; minute += 5) { t.runner.tick(); await flush(); t.clock.t += 5 * MIN; if (minute % 1440 === 1439) await flush(); }
  const text = JSON.stringify(t.runner.stored()), count = Object.keys(t.runner.stored().residents).length;
  assert.ok(count >= 850, `${count} residents kept`);
  const kb = text.length / 1024;
  console.log(`      storage: ${count} residents, ${kb.toFixed(0)} KB (${(text.length / count).toFixed(0)} bytes each)`);
  assert.ok(text.length / count < 1500, `${(text.length / count).toFixed(0)} bytes per resident`);
  assert.ok(kb < 1300, `${kb.toFixed(0)} KB`);
  for (const [id, life] of Object.entries(t.runner.stored().residents)) {
    const generated = /\.g\d-/.test(id);
    assert.ok(Object.keys(life.days).length <= (generated ? 2 : 7), id); assert.ok(life.memory.length <= (generated ? 2 : 7));
    if (generated) for (const day of Object.values(life.days)) assert.equal(day.entries.length, 0, 'rule days keep no entries');
  }
  assert.ok(SHARDS >= 8);
});

function storeRig() {
  const db: Record<string, unknown> = {};
  let writes = 0;
  const clock = { t: DAY0 + 9 * HOUR };
  const ctx = {
    now: () => clock.t, allow: () => true, cityIds: ['lagos'], on: () => {}, core: { sockets: () => [] },
    checks: { setting: (key: string) => ({ residentOn: true, residentShadow: true, residentsPerCity: 3, residentDeepPerDay: 0 } as Record<string, unknown>)[key] },
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => { writes += 1; return fn(db); } },
    collection: (d: Record<string, unknown>, name: string, empty: object) => (d[name] ??= empty),
  } as unknown as RouteContext;
  return { db, ctx, clock, writes: () => writes };
}

test('residents are saved in small shards, only those that changed, and the old single collection is read once and emptied', async () => {
  const s = storeRig();
  const id = residentId(RESIDENTS[0]!);
  s.db['residents'] = { v: 1, residents: { [id]: { born: 5, model: 'gateway:x/y', days: {}, memory: ['An old day, remembered.'] } } };
  const runner = residentsOf(s.ctx, {});
  await runner.ready();
  assert.equal(runner.stored().residents[id]!.memory[0], 'An old day, remembered.', 'the old collection loads');
  for (let n = 0; n < 40; n++) { runner.tick(); await flush(); await flush(); s.clock.t += MIN; }
  runner.flushSave(); await flush(); await flush(); await flush();
  const names = Object.keys(s.db).filter((key) => /^residentsS[0-9a-f]$/.test(key));
  assert.ok(names.length >= 1);
  assert.deepEqual((s.db['residents'] as Stored).residents, {}, 'the old collection is emptied after the first save');
  const merged = names.reduce((n, key) => n + Object.keys((s.db[key] as Stored).residents).length, 0);
  assert.equal(merged, Object.keys(runner.stored().residents).length);
  assert.equal((s.db[names.find((key) => (s.db[key] as Stored).residents[id])!] as Stored).residents[id]!.memory[0], 'An old day, remembered.');
  // A second save with nothing changed writes nothing.
  const before = s.writes();
  runner.flushSave(); await flush(); await flush();
  assert.equal(s.writes(), before);
  // A restart reads the shards back.
  const again = residentsOf(s.ctx, {});
  await again.ready();
  assert.equal(Object.keys(again.stored().residents).length, merged);
});

// ---- settings --------------------------------------------------------------------------------------------------------------------------------------
test('the defaults, and old saved settings still load: residentCount is retired and ignored, a saved shadow stays', async () => {
  const defaults = rig({ cities: ['lagos', 'accra'], settings: { residentShadow: undefined as never, residentsPerCity: undefined as never } });
  assert.equal(defaults.runner.settings().shadow, false, 'visible by default');
  assert.equal(defaults.runner.settings().perCity, 3);
  assert.equal(defaults.runner.roster.length, 6, 'three in each city');
  // An old saved residentCount of 1 (or 30) neither limits nor breaks anything.
  for (const count of [1, 5, 30, 999, -4]) {
    const old = rig({ cities: ['lagos', 'accra'], settings: { residentCount: count, residentShadow: true } });
    assert.equal(old.runner.roster.length, 6);
    assert.equal(old.runner.settings().shadow, true, 'a saved shadow stays on');
    await old.run(5, 1);
  }
  // The new settings are clamped.
  assert.equal(rig({ settings: { residentsPerCity: 99 } }).runner.settings().perCity, 5);
  assert.equal(rig({ settings: { residentsPerCity: -3 } }).runner.settings().perCity, 0);
  assert.equal(rig({ settings: { residentDeepPerDay: 99999 } }).runner.settings().deep, DEEP_MAX);
  assert.equal(rig({ cities: ['lagos'], settings: { residentsPerCity: 0 } }).runner.roster.length, 0);
});

test('the Prayers page can name a generated resident, and prayers by rule are few', async () => {
  await loadCityContent('london');
  const t = rig({ cities: ['london', 'nairobi', 'tokyo', 'lima', 'kano', 'dublin', 'accra', 'delhi', 'cairo', 'rome'], settings: { residentDeepPerDay: 0 }, start: DAY0 + 3 * HOUR });
  await t.run(30 * 60, 5);
  for (const prayer of t.prayed) { assert.ok(residentById(prayer.id), prayer.id); assert.equal(prayerText(prayer.text).ok, true); }
  assert.ok(t.prayed.length <= 40);
  const off = rig({ cities: ['london', 'nairobi'], settings: { residentDeepPerDay: 0, residentRulePrayers: false }, start: DAY0 + 3 * HOUR });
  await off.run(30 * 60, 5);
  assert.equal(off.prayed.length, 0);
});
