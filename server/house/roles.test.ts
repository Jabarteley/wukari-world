// OWNER: agents — your landlord, boss and rival (server/house/roles.ts): who they are, every written line against the AI word rules for a minor, the honest haggle (time and
// goodwill, never money), and the model used only within the per-city daily cap, its rephrasing thrown away when it adds a number or a name.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent, loadCityNetwork } from '../../src/game/cities/index.ts';
import { jobsFor } from '../../src/game/cities/runtime.ts';
import { lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import type { RouteContext } from '../types.ts';
import { ROLE_KINDS, castFor, cleanRephrase, factsOf, nextRentDay, rolesService, writtenLine } from './roles.ts';
import type { RoleRecord } from './roles.ts';

await loadCityNetwork();
await loadCityContent('lagos');
await loadCityContent('accra');
const DAY = 86400000;
const DAY0 = lagosDayStart(20000);
const JOB = jobsFor('lagos')[0]!.id;
const life = (over: { arrears?: number; cash?: number; job?: string | null; performance?: number; completed?: number; lastShiftDay?: number | null; house?: string | null } = {}) => ({
  cash: over.cash ?? 5000, job: over.job === undefined ? JOB : over.job, completedShifts: over.completed ?? 4,
  economy: { rent: { house: over.house === undefined ? 'yaba' : over.house, arrears: over.arrears ?? 0, missed: over.arrears ? 1 : 0 } },
  career: { level: 2, performance: over.performance ?? 70, shifts: over.completed ?? 4, lastShiftDay: over.lastShiftDay === undefined ? lagosTime(DAY0).day - 1 : over.lastShiftDay },
});

test('the three are the same for the same person and city, named from the city\'s country', () => {
  assert.deepEqual(castFor('p1', 'lagos'), castFor('p1', 'lagos'));
  assert.ok(['Alhaji Musa', 'Chief Okafor', 'Mrs Adebayo', 'Mama Ronke'].includes(castFor('p1', 'lagos').landlord.name));
  assert.ok(['Nana Owusu', 'Auntie Akosua', 'Mr Mensah'].includes(castFor('p1', 'accra').landlord.name));
});

test('every written line, for every role, temper and state of a life, passes the AI word rules for a minor and never invents money', () => {
  const facts = factsOf(life(), 'lagos')!;
  assert.equal(facts.house?.label !== undefined, true, 'the house is read from the city');
  const states = [life(), life({ arrears: 6600 }), life({ house: null }), life({ job: null }), life({ completed: 0 }), life({ lastShiftDay: lagosTime(DAY0).day }), life({ lastShiftDay: lagosTime(DAY0).day - 6 }), life({ performance: 20 }), life({ performance: 95 })];
  const records: (RoleRecord | null)[] = [null, { at: 0, mood: 0, kept: 2, broken: 0 }, { at: 0, mood: -2, kept: 0, broken: 3 }, { at: 0, mood: 0, kept: 0, broken: 0, promise: { city: 'lagos', by: DAY0 + 3 * DAY, week: 1 } }];
  let seen = 0;
  for (const person of ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']) for (const state of states) for (const rec of records) for (let d = 0; d < 7; d++) for (const role of ROLE_KINDS) {
    const t = DAY0 + d * DAY + 10 * 3600000;
    const line = writtenLine(role, castFor(person, 'lagos')[role], factsOf(state, 'lagos'), rec, 'lagos', t, `${person}|${d}`);
    assert.ok(line.length > 10 && line.length < 240, line);
    assert.ok(agentWords(line, { toMinor: true }).ok, line);
    assert.ok(!/\{\w+\}/.test(line), line);
    if (role !== 'landlord') assert.ok(!/₦/.test(line), 'only the landlord speaks of money, and only the game\'s own rent');
    seen += 1;
  }
  assert.ok(seen > 4000);
});

function rig(settings: Record<string, unknown> = {}, reply: (input: AskInput) => string = () => 'Rent day is coming, my friend.') {
  const clock = { t: DAY0 + 10 * 3600000 };
  const db: Record<string, unknown> = {};
  const asked: AskInput[] = [];
  const ctx = {
    now: () => clock.t,
    checks: { setting: (key: string) => settings[key] },
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => fn(db) },
    collection: (d: Record<string, unknown>, name: string, init: unknown) => (d[name] ??= init),
  } as unknown as RouteContext;
  const ask = async (input: AskInput): Promise<AskResult> => { asked.push(input); return { ok: true, text: reply(input), model: 'm', provider: 'gateway', free: false, usage: null, costMicro: 1, attempts: [] }; };
  return { clock, db, asked, roles: rolesService(ctx, { ask }) };
}

test('the haggle is honest: rent never changes; more time is given once a week, and a kept or broken promise is remembered', () => {
  const r = rig();
  const owing = life({ arrears: 6600 });
  const before = JSON.stringify(owing);
  const lower = r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, 'lower');
  assert.ok(lower.ok && /estate|lower|fixed|No/.test(lower.line), JSON.stringify(lower));
  const time = r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, 'time');
  assert.ok(time.ok && time.promise);
  const again = r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, 'time');
  assert.ok(again.ok && again.promise && /already|Again|Saturday/.test(again.line));
  assert.equal(JSON.stringify(owing), before, 'nothing in the life changed');
  const rec = (r.db.aiRoles as { people: Record<string, RoleRecord> }).people['p1']!;
  assert.equal(rec.promise?.by, nextRentDay(r.clock.t));
  // Paid before Saturday: kept.
  r.roles.askLandlord(r.db as never, 'p1', 'lagos', life(), 'lower');
  assert.equal(rec.kept, 1); assert.equal(rec.promise, undefined);
  // Next week, asked again, then Saturday passes with the arrears still there: broken.
  r.clock.t += 7 * DAY;
  assert.ok(r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, 'time').ok);
  r.clock.t = nextRentDay(r.clock.t) + 3600000;
  r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, 'lower');
  assert.equal(rec.broken, 1);
  for (const what of ['nothing', 42, undefined]) assert.ok(!r.roles.askLandlord(r.db as never, 'p1', 'lagos', owing, what).ok);
  assert.ok(!r.roles.askLandlord(r.db as never, 'p1', 'lagos', life({ house: null }), 'time').ok);
  // Every answer of every temper passes the AI word rules for a minor.
  for (const person of ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']) for (const what of ['lower', 'time', 'time']) for (const state of [owing, life()]) { const said = r.roles.askLandlord(r.db as never, person, 'lagos', state, what); assert.ok(said.ok && agentWords(said.line, { toMinor: true }).ok, JSON.stringify(said)); }
  const free = r.roles.askLandlord(r.db as never, 'p2', 'lagos', life(), 'time');
  assert.ok(free.ok && !free.promise, 'nothing owed: no time needed');
});

test('the model rephrases within the per-city daily cap only; a rephrasing with a new number or name is thrown away; the same line is not asked twice in a day', async () => {
  const r = rig({ aiRolesCityCalls: 4 }, (input) => (input.messages.some((m) => /boss/.test(m.content)) ? 'Great work. Ask Chinedu, he did 12 shifts.' : 'Saturday is rent day, my good tenant.'));
  for (const person of ['p1', 'p2', 'p3']) {
    const view = await r.roles.view(person, 'lagos', life());
    assert.equal(view.roles.length, 3);
    for (const card of view.roles) assert.ok(agentWords(card.line, { toMinor: true }).ok);
    for (const card of view.roles.filter((entry) => entry.role === 'boss')) assert.ok(!/Chinedu|12/.test(card.line), 'the boss\'s invented name and number were thrown away');
  }
  assert.equal(r.asked.length, 4, 'the Lagos cap of four held');
  for (const input of r.asked) assert.equal(input.carriesPlayerWords, true, 'facts of a life: paid models only');
  await r.roles.view('p1', 'lagos', life());
  assert.equal(r.asked.length, 4, 'nothing asked again for the same lines');
  await r.roles.view('p1', 'accra', life({ house: null }));
  assert.ok(r.asked.length > 4, 'another city has its own cap');
  const off = rig({ aiRolesModel: false });
  await off.roles.view('p1', 'lagos', life());
  assert.equal(off.asked.length, 0);
  // The rephrasing check on its own.
  assert.equal(cleanRephrase('Saturday is rent day, so be ready.', 'Rent is collected on Saturday.', []), 'Saturday is rent day, so be ready.');
  assert.equal(cleanRephrase('Pay ₦9,000 by Saturday.', 'Rent is ₦6,000 on Saturday.', []), null, 'a new number');
  assert.equal(cleanRephrase('Your friend Tunde already paid.', 'Rent is collected on Saturday.', []), null, 'a new name');
  assert.equal(cleanRephrase('As an AI I cannot lower rent.', 'Rent is fixed.', []), null, 'out of character');
  assert.equal(cleanRephrase('Send me your account number.', 'Rent is fixed.', []), null, 'the AI word rules');
});
