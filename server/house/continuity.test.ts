// OWNER: agents — AI characters are never taken away quietly (server/house/continuity.ts, continuity-data.ts; Phase 0 of docs/WOW-PLAN.md built in Phase 3).
// The released cast's fingerprints must match the code unless a change entry gave seven days' notice; the owner's farewell of a followed or partnered resident waits
// seven days with a notice in each person's inbox and a goodbye on the last day; a farewell taken back says so; the memory export stays downloadable.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent, loadCityNetwork, loadCityRules } from '../../src/game/cities/index.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import { feedService } from '../feed/service.ts';
import type { RouteContext, RouteRequest, SessionRecord } from '../types.ts';
import { leftMember } from './cast-ids.ts';
import { CAST_PRINTS, CHANGES, NOTICE_DAYS, covers, lagosDate, noticeDays } from './continuity-data.ts';
import type { Change } from './continuity-data.ts';
import { CAST_GROUP_CITIES, byeLine, continuityService, currentPrints, goodbyePost, noticeLine, registryProblems, stayLine } from './continuity.ts';
import { lifeRoutes } from './life-routes.ts';
import * as memory from './memory.ts';

await loadCityNetwork();
await loadCityContent('lagos');
for (const city of Object.values(CAST_GROUP_CITIES)) await loadCityRules(city);
const DAY = 86400000;
const DAY0 = lagosDayStart(20000);

test('THE RULE IN CODE: the cast in the code matches the released fingerprints, unless a change gave at least seven days\' notice and its day has come', () => {
  const problems = registryProblems(CAST_PRINTS, currentPrints(), CHANGES, Date.now());
  assert.deepEqual(problems, [], `\n${problems.join('\n')}`);
  for (const change of CHANGES) {
    assert.ok(noticeDays(change) >= NOTICE_DAYS, change.id);
    assert.ok(agentWords(noticeLine({ name: change.name, what: change.what, reason: change.reason, until: lagosDate(change.effective) }), { toMinor: true }).ok);
  }
});

test('the check catches a character removed, renamed or re-voiced without notice, a notice shorter than seven days, and a change released before its day', () => {
  const released = { 'house:lagos:tolani': 'aaa', 'house:ng:nkechi': 'bbb', 'resident:resident.lagos.remi': 'ccc', generated: 'ddd' };
  const now = lagosDate('2026-11-01');
  // Tolani changed, Nkechi removed, the generator changed, a new character added: four problems, and a fifth for the new one.
  const current = { 'house:lagos:tolani': 'zzz', 'resident:resident.lagos.remi': 'ccc', generated: 'eee', 'house:lagos:new': 'fff' };
  assert.equal(registryProblems(released, current, [], now).length, 4);
  const good: Change[] = [
    { id: 'house.lagos.tolani', name: 'Mama Tolani', what: 'change', notice: '2026-10-20', effective: '2026-10-27', reason: 'Mama Tolani is moving her stall.' },
    { id: 'house.*.nkechi', name: 'Mama Nkechi', what: 'leave', notice: '2026-10-20', effective: '2026-10-28', reason: 'Mama Nkechi is retiring.' },
    { id: 'resident.*', name: 'Residents', what: 'change', notice: '2026-10-20', effective: '2026-10-27', reason: 'New neighbours are arriving.' },
  ];
  assert.deepEqual(registryProblems(released, { ...current, 'house:lagos:new': undefined } as never, good, now).filter((p) => !p.includes('new')), []);
  const short: Change[] = [{ ...good[0]!, effective: '2026-10-23' }];
  assert.ok(registryProblems(released, released, short, now).some((p) => p.includes('3 days of notice')));
  const early = registryProblems(released, { ...released, 'house:lagos:tolani': 'zzz' }, good, lagosDate('2026-10-22'));
  assert.ok(early.some((p) => p.startsWith('house:lagos:tolani changed')), 'released before its effective day: refused');
  assert.ok(covers({ id: 'house.*.nkechi' }, 'house.ibadan.nkechi') && covers({ id: 'resident.*' }, 'resident.paris.g1-amelie') && !covers({ id: 'resident.*' }, 'resident.lagos.remi'));
});

function rig(changes: Change[] = []) {
  const clock = { t: DAY0 + 10 * 3600000 };
  let n = 0;
  const players: Record<string, { name: string; friends: Record<string, number> }> = { p1: { name: 'Ada', friends: {} }, p2: { name: 'Bola', friends: {} }, p3: { name: 'Chi', friends: {} } };
  const db: Record<string, unknown> = { social: { players } };
  const ctx = {
    now: () => clock.t,
    randomId: () => `${(++n).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`,
    fail: (status: number, code: string) => Object.assign(new Error(code), { status, code }),
    allow: () => true,
    cityIds: ['lagos'],
    checks: { adult: () => true, setting: () => undefined },
    on: () => {},
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => fn(db) },
    collection: (d: Record<string, unknown>, name: string, init: unknown) => (d[name] ??= init),
  } as unknown as RouteContext;
  const roster = [{ id: 'resident.lagos.remi', key: 'remi', name: 'Remi', city: 'lagos' }, { id: 'resident.lagos.bisi', key: 'bisi', name: 'Bisi', city: 'lagos' }];
  const continuity = continuityService(ctx, { roster: () => roster, changes });
  const feed = feedService(ctx);
  const inbox = (id: string): { kind: string; text: string; from?: { id: string; ai?: true } }[] => ((db.feed as { authors: Record<string, { inbox?: { kind: string; text: string; from?: { id: string; ai?: true } }[] }> } | undefined)?.authors[id]?.inbox ?? []);
  const session = (publicId: string) => ({ publicId }) as unknown as SessionRecord;
  return { clock, db, ctx, continuity, feed, inbox, session };
}

test('the owner\'s farewell of a followed resident waits seven days: a notice in each follower\'s inbox, a goodbye on the last day, then it may leave; an unfollowed one leaves at once', async () => {
  const r = rig();
  assert.deepEqual(r.continuity.farewells(['remi', 'bisi']), [], 'nothing leaves before it is known who would miss them');
  assert.ok(r.feed.follow(r.db as never, r.session('p1'), { id: 'resident.lagos.remi' }).ok);
  await r.continuity.run();
  assert.deepEqual(r.continuity.farewells(['remi', 'bisi']), ['bisi'], 'nobody follows Bisi; Remi is followed and waits');
  await r.continuity.run();
  const told = r.inbox('p1');
  assert.equal(told.length, 1);
  assert.equal(told[0]!.kind, 'ai');
  assert.equal(told[0]!.from?.id, 'resident.lagos.remi');
  assert.equal(told[0]!.from?.ai, true, 'from the character, with its AI mark');
  assert.match(told[0]!.text, /Remi is leaving on .+ downloadable/);
  assert.deepEqual(r.inbox('p2'), [], 'nobody else is told');
  // Somebody follows during the notice: told on the next run, once.
  r.clock.t += 2 * DAY;
  r.feed.follow(r.db as never, r.session('p2'), { id: 'resident.lagos.remi' });
  r.continuity.farewells(['remi', 'bisi']);
  await r.continuity.run(); await r.continuity.run();
  assert.equal(r.inbox('p2').length, 1);
  assert.equal(r.inbox('p1').length, 1, 'never twice');
  assert.deepEqual(r.continuity.farewells(['remi', 'bisi']), ['bisi']);
  // The last day: a goodbye post and one more line.
  r.clock.t = DAY0 + 10 * 3600000 + 6 * DAY + 60000;
  await r.continuity.run();
  const posts = Object.values((r.db.feed as { posts: Record<string, { by: string; body: string; ai?: 1; vis: string }> }).posts).filter((post) => post.by === 'resident.lagos.remi');
  assert.equal(posts.length, 1);
  assert.equal(posts[0]!.ai, 1);
  assert.match(posts[0]!.body, /last day here in Lagos/);
  assert.match(r.inbox('p1').at(-1)!.text, /last day/);
  assert.deepEqual(r.continuity.farewells(['remi', 'bisi']), ['bisi'], 'still not before the seventh day');
  r.clock.t = DAY0 + 10 * 3600000 + 7 * DAY + 60000;
  await r.continuity.run();
  assert.deepEqual(r.continuity.farewells(['remi', 'bisi']), ['remi', 'bisi'], 'the notice has run');
  for (const line of [noticeLine({ name: 'Remi', what: 'leave', reason: 'Remi is leaving Lagos for good.', until: r.clock.t }), noticeLine({ name: 'Remi', what: 'change', reason: 'Remi is changing jobs.', until: r.clock.t }), byeLine('Remi'), goodbyePost('lagos'), stayLine('Remi')]) assert.ok(agentWords(line, { toMinor: true }).ok, line);
});

test('a farewell taken back during the notice tells everyone the character is staying', async () => {
  const r = rig();
  r.feed.follow(r.db as never, r.session('p1'), { id: 'resident.lagos.remi' });
  await r.continuity.run();
  r.continuity.farewells(['remi']);
  await r.continuity.run();
  assert.equal(r.inbox('p1').length, 1);
  r.continuity.farewells([]);
  await r.continuity.run();
  assert.match(r.inbox('p1').at(-1)!.text, /staying after all/);
  r.continuity.farewells(['remi']);
  assert.deepEqual(r.continuity.farewells(['remi']), [], 'a cancelled notice does not let it go; a new farewell needs a new notice');
  r.clock.t += 8 * DAY;
  assert.deepEqual(r.continuity.farewells(['remi']), [], 'not even later');
  await r.continuity.run();
  assert.match(r.inbox('p1').at(-1)!.text, /Remi is leaving on/, 'the new notice is told');
  assert.deepEqual(r.continuity.farewells(['remi']), []);
  r.clock.t += 7 * DAY + 60000;
  await r.continuity.run();
  assert.deepEqual(r.continuity.farewells(['remi']), ['remi']);
});

test('a change in code reaches every partner and follower of the house agent; after it, its card and memory export stay downloadable', async () => {
  const change: Change = { id: 'house.lagos.tolani', name: 'Mama Tolani', what: 'leave', notice: '2024-10-04', effective: '2024-10-11', reason: 'Mama Tolani is retiring from the market.' };
  const r = rig([change]);
  r.clock.t = lagosDate('2024-10-05') + 3600000;
  // Bola is Mama Tolani's partner (memory.ts), Chi follows her, Ada has facts with her but neither: only the first two are told.
  memory.remember(r.ctx, r.db as never, 'p1', 'house.lagos.tolani', ['is saving for a car'], r.clock.t);
  memory.touch(r.ctx, r.db as never, 'p2', 'house.lagos.tolani', 1, r.clock.t, true);
  ((r.db.agentMemory as memory.MemoryCollection).people['p2']!.a['house.lagos.tolani']!).w = r.clock.t;
  r.feed.follow(r.db as never, r.session('p3'), { id: 'house.lagos.tolani' });
  await r.continuity.run(); await r.continuity.run();
  assert.equal(r.inbox('p2').length, 1); assert.equal(r.inbox('p3').length, 1); assert.equal(r.inbox('p1').length, 0);
  assert.match(r.inbox('p2')[0]!.text, /retiring from the market/);
  assert.equal(r.continuity.noticeFor('house.lagos.tolani')?.what, 'leave');
  // After she has gone (were she removed from the cast), her card keeps her name and the day she left.
  const left = leftMember('house.lagos.tolani', [change]);
  assert.equal(left?.name, 'Mama Tolani');
  assert.equal(left?.left, lagosDate('2024-10-11'));
  // The export is a JSON file of the person's own memory, for every character or one.
  const routes = lifeRoutes(r.ctx, async () => {}, () => {});
  const request = (query: string) => ({ query: new URLSearchParams(query), ip: '1.1.1.1', requireSession: () => ({ publicId: 'p1' }) }) as unknown as RouteRequest;
  const all = await routes['GET /api/agents/memory/export']!(request(''));
  const body = (all as { body: unknown }).body as { file: string; players: { characters: { agent: string; facts: string[]; name: string | null }[] }[] };
  assert.deepEqual(body.players[0]!.characters.map((item) => [item.agent, item.facts, item.name]), [['house.lagos.tolani', ['is saving for a car'], 'Mama Tolani']]);
  const one = await routes['GET /api/agents/memory/export']!(request('agent=house.lagos.tolani'));
  assert.equal(((one as { body: unknown }).body as { file: string }).file, 'allworld-ai-memory-house.lagos.tolani.json');
  await assert.rejects(() => routes['GET /api/agents/memory/export']!(request('agent=../etc')) as Promise<unknown>);
});
