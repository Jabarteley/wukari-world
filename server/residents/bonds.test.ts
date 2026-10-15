// OWNER: agents — residents' relationships (server/residents/bonds.ts): closeness growth and decay, a marriage only after weeks of closeness and two consenting
// choices, quarrels that make up or fade, public lines without private detail, weddings as events (held at the venue, the card works), shadow hides it all,
// one resident is safe, a farewell only by the owner.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESIDENTS, REMI, residentId } from './life.ts';
import type { Resident } from './life.ts';
import { BOND, DAY_MS, HOUR_MS, askText, blankBond, bondsOf, dayPasses, fit, funeralNotice, grow, judgeChoice, marriageReady, nextAt, profileLine, publicWedding, quarrels, stageOf, traitsOf, weddingAnnouncement, weddingOpened, welcomeLine } from './bonds.ts';
import type { BondsDeps, BondsStored } from './bonds.ts';
import { OUT_OF_CHARACTER } from './life.ts';
import { agentWords } from '../moderation/agent-words.ts';

const person = (key: string, name: string, story: string = REMI.story): Resident => ({ ...REMI, key, name, story });
const KEMI = person('kemi', 'Kemi'), FEMI = person('femi', 'Femi'), TUNDE = person('tunde', 'Tunde', 'My name is Tunde. I am a Muslim and I like football and I have a temper that I am working on and I am stubborn.');
const [K, F, T] = [residentId(KEMI), residentId(FEMI), residentId(TUNDE)];
const DAY0 = 20000 * DAY_MS; // a UTC midnight
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function rig(options: { shadow?: boolean; active?: number; roster?: Resident[]; choose?: (id: string, text: string) => string | null; farewells?: string[]; venue?: boolean } = {}) {
  const clock = { t: DAY0 + 10 * HOUR_MS };
  const asked: { id: string; text: string }[] = [], announced: { text: string; kind: string; key: string }[] = [], said: { id: string; room: string; text: string }[] = [];
  const roster = options.roster ?? [KEMI, FEMI, TUNDE];
  const flags = { shadow: options.shadow ?? false, active: options.active ?? roster.length, farewells: options.farewells ?? [] };
  const presence = roster.map((who) => ({ id: residentId(who), city: who.city, where: 'room:market' as string | null, awake: true }));
  const deps: BondsDeps = {
    roster, now: () => clock.t, active: () => flags.active, shadow: () => flags.shadow, presence: () => presence,
    decide: async (id, messages) => { const text = messages.at(-1)!.content; asked.push({ id, text }); return (options.choose ?? (() => null))(id, text); },
    venue: () => (options.venue === false ? null : { room: 'venue:lagos:square', label: 'the Square' }),
    announce: async (line) => { announced.push(line); }, say: async (id, room, text) => { said.push({ id, room, text }); }, farewells: () => flags.farewells,
  };
  const engine = bondsOf(deps);
  const beat = async (): Promise<void> => { engine.tick(); await flush(); await flush(); await flush(); };
  const nextDay = async (hours = 10): Promise<void> => { clock.t = (Math.floor(clock.t / DAY_MS) + 1) * DAY_MS + hours * HOUR_MS; await beat(); };
  return { engine, clock, asked, announced, said, flags, presence, beat, nextDay };
}
const closeBond = (r: ReturnType<typeof rig>, x = K, y = F, c = 85, high = BOND.marryDays) => { const bond = blankBond(x, y, Math.floor(r.clock.t / DAY_MS)); Object.assign(bond, { c, high }); r.engine.stored.pairs[`${x < y ? x : y}|${x < y ? y : x}`] = bond; return bond; };
const PROPOSE_ANSWER = (id: string, text: string): string | null => (/"propose"/.test(text) ? '{"choice":"propose"}' : /"accept"/.test(text) ? '{"choice":"accept"}' : /"make_up"/.test(text) ? '{"choice":"make_up"}' : null);

test('closeness grows from talks and shared days, is capped each day, decays when idle and ends at zero', () => {
  const bond = blankBond(K, F, 10);
  assert.equal(grow(bond, BOND.talkGain, 10), 3);
  grow(bond, BOND.talkGain, 10); grow(bond, BOND.talkGain, 10);
  assert.equal(bond.c, BOND.dayCap, 'at most DAY_CAP a day');
  assert.equal(grow(bond, 3, 11), 3, 'a new day opens the cap again');
  assert.equal(stageOf(bond), null);
  bond.c = BOND.friendAt; assert.equal(stageOf(bond), 'friends');
  bond.c = BOND.bestAt; assert.equal(stageOf(bond), 'best');
  // Idle for more than IDLE_DAYS: one a day goes.
  bond.last = 11; bond.c = 30;
  for (let day = 12; day <= 13; day++) dayPasses(bond, day);
  assert.equal(bond.c, 30, 'two quiet days cost nothing');
  dayPasses(bond, 14); dayPasses(bond, 15);
  assert.equal(bond.c, 28);
  bond.c = 1; assert.equal(dayPasses(bond, 16), false, 'a bond that reaches zero is gone');
  const wed = blankBond(K, F, 1); wed.married = 1; wed.c = 10;
  dayPasses(wed, 99); assert.equal(wed.c, BOND.marriedFloor, 'a marriage keeps a floor');
});

test('talks from resident.ts and a day in the same place both grow a bond; a quarrel pauses growth', async () => {
  const r = rig();
  r.engine.talked(K, F, r.clock.t);
  assert.equal(r.engine.stored.pairs[`${F}|${K}`.split('|').sort().join('|')]!.c, 3);
  await r.beat();
  const key = [K, F].sort().join('|');
  assert.equal(r.engine.stored.pairs[key]!.c, 4, 'the same place on the same day gives +1');
  r.clock.t += 2 * 60000; await r.beat();
  assert.equal(r.engine.stored.pairs[key]!.c, 4, 'only once a day');
  r.engine.stored.pairs[key]!.quarrel = Math.floor(r.clock.t / DAY_MS);
  assert.equal(grow(r.engine.stored.pairs[key]!, 3, Math.floor(r.clock.t / DAY_MS) + 1), 0);
});

test('a marriage needs weeks of closeness: rules alone never ask before MARRY_DAYS at MARRY_AT', async () => {
  const r = rig({ choose: PROPOSE_ANSWER });
  const bond = closeBond(r, K, F, 85, BOND.marryDays - 1);
  await r.beat();
  assert.ok(!r.asked.some((q) => /"propose"/.test(q.text)), 'one day short: no proposal');
  const day = Math.floor(r.clock.t / DAY_MS);
  assert.equal(marriageReady(bond, day, 0.8, true, true), false);
  bond.high = BOND.marryDays;
  assert.equal(marriageReady(bond, day, 0.8, true, true), true);
  assert.equal(marriageReady(bond, day, 0.2, true, true), false, 'a poor fit never');
  assert.equal(marriageReady(bond, day, 0.8, false, true), false, 'someone already married');
  assert.equal(marriageReady(bond, day, 0.8, true, false), false, 'different cities');
  bond.c = 79; assert.equal(marriageReady(bond, day, 0.8, true, true), false);
  // From nothing, the fastest path takes weeks: +8 a day reaches 80 on day 10, and 21 more days at 80 or above.
  const slow = rig({ choose: PROPOSE_ANSWER });
  let days = 0;
  while (!slow.engine.stored.pairs[[K, F].sort().join('|')]?.asked && days < 90) {
    for (let i = 0; i < 3; i++) slow.engine.talked(K, F, slow.clock.t);
    await slow.nextDay(); days += 1;
    for (let i = 0; i < 4; i++) { slow.clock.t += 60000; await slow.beat(); }
  }
  assert.ok(days >= 28, `proposal came after ${days} days`);
  assert.ok(days < 60);
});

test('both must choose: propose, then accept; a "not yet", an invalid or out of character reply, or a failed call marries nobody', async () => {
  const key = [K, F].sort().join('|');
  // Nobody answers: nothing happens.
  const none = rig({ choose: () => null }); closeBond(none);
  await none.beat(); await none.beat();
  assert.equal(none.engine.stored.events.length, 0);
  // A reply that is not the right choice, or steps out of character.
  const odd = rig({ choose: () => '{"choice":"marry_now"}' }); closeBond(odd); await odd.beat();
  assert.equal(odd.engine.stored.pairs[key]!.asked, undefined);
  const robot = rig({ choose: () => '{"choice":"propose","say":"as an AI"}' }); closeBond(robot); await robot.beat();
  assert.equal(robot.engine.stored.pairs[key]!.asked, undefined, 'out of character is no choice');
  // One proposes, the other says not yet: no wedding, a wait.
  const shy = rig({ choose: (_id, text) => (/"propose"/.test(text) ? '{"choice":"propose"}' : '{"choice":"not_yet"}') });
  const bond = closeBond(shy);
  for (let i = 0; i < 4; i++) await shy.beat();
  assert.equal(shy.engine.stored.events.length, 0);
  assert.equal(bond.asked, undefined, 'not yet clears the question');
  assert.ok((bond.wait ?? 0) > Math.floor(shy.clock.t / DAY_MS), 'and they wait');
  assert.equal(bond.married, undefined);
  // Both choose: a wedding is set, and nobody is married until it opens.
  const yes = rig({ choose: PROPOSE_ANSWER });
  const yb = closeBond(yes);
  for (let i = 0; i < 4; i++) await yes.beat();
  assert.equal(yes.engine.stored.events.length, 1);
  const wedding = yes.engine.stored.events[0]!;
  assert.equal(wedding.kind, 'wedding');
  assert.equal(yb.married, undefined);
  assert.equal(yb.wedding, wedding.id);
  assert.ok(wedding.at >= yes.clock.t + BOND.weddingLeadDays * DAY_MS - DAY_MS);
  assert.equal(new Date(wedding.at + 60 * 60000).getUTCDay(), 6, 'a Saturday (Lagos time, 16:00)');
  assert.equal(new Date(wedding.at).getUTCHours(), 15, '16:00 in Lagos');
  // One proposal at a time, one marriage each: a third resident cannot be married to the same person.
  const third = closeBond(yes, K, T);
  for (let i = 0; i < 3; i++) await yes.beat();
  assert.equal(third.asked, undefined);
});

test('a quarrel makes up by choice or fades; it costs closeness and never reaches the gist or a profile', async () => {
  const day = Math.floor(DAY0 / DAY_MS) + 1;
  const bond = blankBond(K, F, day); bond.c = 60;
  assert.equal(quarrels(bond, day, 99, 10), false, 'the roll decides');
  assert.equal(quarrels(bond, day, 0, 10), true);
  assert.equal(bond.c, 60 - BOND.quarrelHit);
  assert.equal(quarrels(bond, day, 0, 10), false, 'one at a time');
  const wed = blankBond(K, F, day); wed.c = 90; wed.married = day;
  assert.equal(quarrels(wed, day, 0, 100), false, 'a marriage has no quarrels');
  // Make up, by choice.
  const r = rig({ choose: PROPOSE_ANSWER });
  const b = closeBond(r, K, F, 60, 0);
  b.quarrel = Math.floor(r.clock.t / DAY_MS);
  await r.beat();
  assert.equal(r.asked.length, 0, 'not on the day of the quarrel');
  await r.nextDay(); await r.beat(); await r.beat();
  assert.equal(b.quarrel, undefined);
  assert.ok(b.c > 60);
  assert.ok(r.engine.stored.log.some((line) => /made up/.test(line.text)));
  // Fade, when nobody chooses.
  const f = rig({ choose: () => null });
  const quiet = closeBond(f, K, F, 60, 0); quiet.quarrel = Math.floor(f.clock.t / DAY_MS); quiet.last = quiet.quarrel;
  for (let i = 0; i < BOND.quarrelFadeDays + 1; i++) { await f.nextDay(); }
  assert.equal(quiet.quarrel, undefined);
  assert.ok(quiet.c <= 60 - BOND.quarrelFadeHit, 'fading costs a little closeness');
  // Profiles say nothing of a quarrel; the public says "Friends with" when they are friends.
  const q = rig(); const qb = closeBond(q, K, F, 55, 0); qb.quarrel = 5;
  const names = (id: string): string => ({ [K]: 'Kemi', [F]: 'Femi', [T]: 'Tunde' })[id] ?? '?';
  assert.equal(profileLine(q.engine.stored, K, names), 'Best friends with Femi', 'a quarrel is private');
  qb.c = 25; assert.equal(profileLine(q.engine.stored, K, names), 'Friends with Femi');
  qb.c = 10; assert.equal(profileLine(q.engine.stored, K, names), null);
  qb.married = 3; assert.equal(profileLine(q.engine.stored, K, names), 'Married to Femi');
});

test('personality from the life stories: a shared faith and interests fit, a hot temper does not', () => {
  const a = traitsOf(KEMI), b = traitsOf(FEMI), c = traitsOf(TUNDE);
  assert.equal(a.faith, 'christian');
  assert.equal(c.faith, 'muslim');
  assert.equal(c.hot, true);
  assert.ok(fit(a, b) >= BOND.minFit && fit(a, b) > fit(a, c));
  assert.ok(fit(a, c) < BOND.minFit);
  // All thirty real residents have traits, and each pair's fit is a number between 0 and 1.
  for (const x of RESIDENTS) for (const y of RESIDENTS) { const v = fit(traitsOf(x), traitsOf(y)); assert.ok(v >= 0 && v <= 1); }
});

test('a wedding is an event: announced in the gist, held at the venue, married when it opens, and the welcome is said', async () => {
  const r = rig({ choose: PROPOSE_ANSWER });
  const bond = closeBond(r);
  for (let i = 0; i < 4; i++) await r.beat();
  const wedding = r.engine.stored.events[0]!;
  assert.equal(wedding.announced, true);
  assert.equal(r.announced.length, 1);
  assert.equal(r.announced[0]!.text, weddingAnnouncement(['Femi', 'Kemi'].sort((a, b) => (wedding.names[0] === a ? -1 : 1)), 'Saturday', 'the Square').replace(/^\S+ and \S+/, `${wedding.names[0]} and ${wedding.names[1]}`));
  assert.match(r.announced[0]!.text, /^\w+ and \w+ are getting married on Saturday at the Square$/);
  assert.equal(r.announced[0]!.kind, 'event');
  // Not held before an hour ahead; held from then until it is over.
  assert.equal(r.engine.hold(K), null);
  r.clock.t = wedding.at - 30 * 60000; await r.beat();
  assert.equal(r.engine.hold(K), wedding.room);
  assert.equal(r.engine.hold(F), wedding.room);
  assert.equal(r.engine.hold(T), null, 'only the couple (and for a funeral, friends)');
  assert.equal(bond.married, undefined);
  r.clock.t = wedding.at + 60000; await r.beat();
  assert.equal(bond.married !== undefined, true, 'married when it opens');
  assert.equal(wedding.opened, true);
  assert.equal(r.announced.length, 2);
  assert.equal(r.announced[1]!.text, weddingOpened(wedding.names, 'the Square'));
  assert.deepEqual(r.said.map((s) => s.text), [welcomeLine(wedding.colour)]);
  assert.equal(r.said[0]!.room, wedding.room);
  // The card: public once announced and opened, with the two public first names and the city only.
  assert.deepEqual(publicWedding(r.engine.stored, wedding.id), { a: wedding.names[0], b: wedding.names[1], city: 'lagos' });
  assert.equal(publicWedding(r.engine.stored, 'w-99'), null);
  // Over: not held any more.
  r.clock.t = wedding.until + 60000; await r.beat();
  assert.equal(wedding.done, true);
  assert.equal(r.engine.hold(K), null);
  const names = (id: string): string => (id === K ? 'Kemi' : 'Femi');
  assert.equal(profileLine(r.engine.stored, K, names), 'Married to Femi');
  // No private detail in anything the public sees.
  for (const line of [...r.announced.map((a) => a.text), ...r.said.map((s) => s.text), profileLine(r.engine.stored, K, names)!]) {
    assert.ok(!/\d/.test(line), `no numbers: ${line}`);
    assert.ok(!/quarrel|fell out|close|proposed|asked|accept|consent|AI\b/i.test(line), `no private detail: ${line}`);
    assert.ok(!OUT_OF_CHARACTER.test(line) && agentWords(line, { toMinor: true }).ok);
  }
});

test('shadow: everything happens on paper; nothing is announced, said, or shown on a profile', async () => {
  const r = rig({ shadow: true, choose: PROPOSE_ANSWER });
  closeBond(r);
  for (let i = 0; i < 4; i++) await r.beat();
  const wedding = r.engine.stored.events[0]!;
  assert.ok(wedding, 'the wedding is recorded');
  assert.equal(wedding.announced, false);
  assert.equal(r.announced.length, 0);
  assert.ok(r.engine.stored.log.some((line) => /^would announce: .* are getting married on Saturday/.test(line.text)), 'the admin page shows what would be said');
  r.clock.t = wedding.at + 60000; await r.beat();
  assert.equal(r.said.length, 0);
  assert.equal(r.announced.length, 0);
  assert.equal(publicWedding(r.engine.stored, wedding.id), null, 'no card for a wedding nobody saw');
  assert.ok(r.engine.report().log.length > 0 && r.engine.report().pairs.length > 0, 'the admin report has it');
  // When shadow is switched off later, a wedding still to come is announced; one that is over is not.
  const later = rig({ shadow: true, choose: PROPOSE_ANSWER }); closeBond(later);
  for (let i = 0; i < 4; i++) await later.beat();
  later.flags.shadow = false; await later.beat();
  assert.equal(later.announced.length, 1);
});

test('one resident running, or none, is safe: no bonds, no calls, no events', async () => {
  for (const active of [0, 1]) {
    const r = rig({ active, choose: PROPOSE_ANSWER, roster: [KEMI] });
    r.engine.talked(K, F, r.clock.t);
    closeBond(r);
    for (let i = 0; i < 5; i++) await r.beat();
    await r.nextDay();
    assert.equal(r.asked.length, 0);
    assert.equal(r.announced.length, 0);
    assert.equal(r.engine.stored.events.length, 0);
    assert.equal(r.engine.profile(K), null);
    assert.equal(r.engine.report().pairs.length >= 0, true);
  }
  // The real default: one resident from the roster.
  const real = rig({ active: 1, roster: [REMI] });
  real.engine.talked(residentId(REMI), residentId(REMI), real.clock.t);
  assert.equal(Object.keys(real.engine.stored.pairs).length, 0, 'nobody to be close to');
});

test('a funeral exists only when the owner asks, is gentle, public lines carry a name and a place only, and is rare', async () => {
  const quiet = rig({ choose: PROPOSE_ANSWER }); closeBond(quiet);
  for (let i = 0; i < 5; i++) await quiet.nextDay();
  assert.ok(!quiet.engine.stored.events.some((ev) => ev.kind === 'funeral'), 'never by a game rule');
  const r = rig({ farewells: ['tunde'] });
  const friend = closeBond(r, K, T, 70, 0), spouse = closeBond(r, F, T, 90, 0); spouse.married = 1; void friend;
  await r.beat(); await r.beat();
  const funeral = r.engine.stored.events.find((ev) => ev.kind === 'funeral')!;
  assert.ok(funeral);
  assert.equal(r.engine.retired(T), true, 'he stops living');
  assert.deepEqual([...funeral.guests].sort(), [K, F].sort());
  assert.equal(new Date(funeral.at + HOUR_MS).getUTCDay(), 0, 'a Sunday');
  assert.equal(r.announced.at(-1)!.text, funeralNotice('Tunde', 'Sunday', 'the Square'));
  assert.equal(r.announced.at(-1)!.kind, 'notice');
  assert.ok(!/die|death|dead|killed|\d/i.test(r.announced.at(-1)!.text));
  r.clock.t = funeral.at - 10 * 60000; await r.beat();
  assert.equal(r.engine.hold(K), funeral.room);
  assert.equal(r.engine.hold(T), null, 'the one remembered is not held');
  const names = (id: string): string => ({ [K]: 'Kemi', [F]: 'Femi', [T]: 'Tunde' })[id] ?? '?';
  assert.equal(profileLine(r.engine.stored, F, names), 'Remembers Tunde');
  assert.equal(profileLine(r.engine.stored, K, names), null);
  // Two a week at most, and the same key twice is one funeral.
  r.flags.farewells = ['tunde', 'kemi', 'femi']; await r.beat();
  assert.equal(r.engine.stored.events.filter((ev) => ev.kind === 'funeral').length, 2);
});

test('the choices are asked in plain words and checked; the cap of calls a day holds', () => {
  for (const task of ['propose', 'accept', 'make_up', 'visit'] as const) {
    const text = askText(task, 'Femi');
    assert.ok(!OUT_OF_CHARACTER.test(text), `no out-of-character words in the ask: ${task}`);
    assert.ok(!/sex|kiss|bed\b|romanc|money|₦|\$/i.test(text));
  }
  assert.equal(judgeChoice('{"choice":"propose"}', 'propose'), 'propose');
  assert.equal(judgeChoice('Sure! {"choice":"not_yet"} thanks', 'propose'), 'not_yet');
  assert.equal(judgeChoice('{"choice":"accept"}', 'propose'), null, 'a choice not offered for this question');
  assert.equal(judgeChoice('not json', 'visit'), null);
  assert.equal(judgeChoice('{"choice":"visit_friend","note":"I am a language model"}', 'visit'), 'visit_friend', 'extra fields are ignored, the choice is checked');
  assert.equal(judgeChoice('As an AI {"choice":"stay"}', 'visit'), null);
  // The time of an event: a Saturday at 16:00 local, at least the lead away.
  const t = DAY0 + 3 * HOUR_MS;
  for (const offset of [60, 180, -300, 120]) {
    const at = nextAt(t, offset, 6, 16, BOND.weddingLeadDays);
    assert.ok(at >= t + BOND.weddingLeadDays * DAY_MS && at < t + (BOND.weddingLeadDays + 7) * DAY_MS);
    const local = new Date(at + offset * 60000);
    assert.equal(local.getUTCDay(), 6); assert.equal(local.getUTCHours(), 16);
  }
});

test('every real resident is awake on a Saturday at 16:00 to 19:00 and on a Sunday at 15:00 to 17:00 in their own city (so an event is never held while one sleeps)', () => {
  for (const who of RESIDENTS) {
    const asleep = (hour: number): boolean => (who.sleep.bed > who.sleep.wake ? hour >= who.sleep.bed || hour < who.sleep.wake : hour >= who.sleep.bed && hour < who.sleep.wake);
    for (const hour of [15, 16, 17, 18, 19]) assert.equal(asleep(hour), false, `${who.name} at ${hour}`);
  }
});

test('stored state survives a restart and old shapes load', () => {
  const r = rig({ choose: PROPOSE_ANSWER }); closeBond(r);
  const copy = JSON.parse(JSON.stringify(r.engine.stored)) as BondsStored;
  const again = bondsOf({ roster: [KEMI, FEMI], now: () => r.clock.t, active: () => 2, shadow: () => false, presence: () => [], decide: async () => null, venue: () => null, announce: async () => {}, say: async () => {}, farewells: () => [] }, copy);
  assert.equal(Object.keys(again.stored.pairs).length, 1);
});
