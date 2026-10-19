// OWNER: agents — following the game's own AI characters (server/house/follow.ts, the feed lines in server/feed/service.ts, cast-ids.ts): a profile labelled AI-played with
// a Follow button, a daily written line for followed characters only, a weekly highlight written by a model within the per-city daily cap and by rules past it, and a
// model's highlight thrown away when it adds a name or a number.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityContent, loadCityNetwork } from '../../src/game/cities/index.ts';
import { lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { agentWords } from '../moderation/agent-words.ts';
import type { AskInput, AskResult } from '../models/router.ts';
import { feedService } from '../feed/service.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import { castMember, isCastId } from './cast-ids.ts';
import { dailyLine, followService, followedCast, writtenHighlight } from './follow.ts';
import { castOf } from './cast.ts';

await loadCityNetwork();
await loadCityContent('lagos');
const HOUR = 3600000, DAY = 86400000;
const DAY0 = lagosDayStart(20000);
const TOLANI = 'house.lagos.tolani', REMI = 'resident.lagos.remi';

function rig(settings: Record<string, unknown> = {}, reply: (input: AskInput) => string = () => 'What a week at the stall. Thank you all for coming by.') {
  const clock = { t: DAY0 + 20 * HOUR };
  let n = 0;
  const db: Record<string, unknown> = {
    social: { players: { p1: { name: 'Ada', friends: {} }, p2: { name: 'Bola', friends: {} } } },
    gist: { v: 1, seq: 1, cursor: { records: -1, busy: {}, square: 0, events: {} }, cities: { lagos: [{ n: 1, at: clock.t - HOUR, city: 'lagos', kind: 'business', text: 'Kemi opened a food stall in Lagos Market' }] } },
  };
  const asked: { input: AskInput; at: number }[] = [];
  const ctx = {
    now: () => clock.t,
    randomId: () => `${(++n).toString(16).padStart(8, '0')}-0000-4000-8000-000000000000`,
    fail: (status: number, code: string) => Object.assign(new Error(code), { status, code }),
    cityIds: ['lagos', 'accra'],
    checks: { adult: () => true, setting: (key: string) => settings[key] },
    on: () => {},
    store: { read: async <T>(fn: (d: Db) => T): Promise<T> => fn(db as never), transact: async <T>(fn: (d: Db) => T): Promise<T> => fn(db as never) },
    collection: (d: Record<string, unknown>, name: string, init: unknown) => (d[name] ??= init),
  } as unknown as RouteContext;
  const ask = async (input: AskInput): Promise<AskResult> => { asked.push({ input, at: clock.t }); return { ok: true, text: reply(input), model: 'm', provider: 'gateway', free: false, usage: null, costMicro: 1, attempts: [] }; };
  const feed = feedService(ctx);
  const follow = followService(ctx, { ask, tally: (id) => (id === TOLANI ? { talks: 7, sold: 2, quiz: 0 } : { talks: 0, sold: 0, quiz: 0 }) });
  const session = (publicId: string) => ({ publicId }) as unknown as SessionRecord;
  return { clock, db, ctx, feed, follow, asked, session };
}

test('every character of the cast has a feed profile labelled AI-played that people can follow; people and unknown ids do not become cast', () => {
  const r = rig();
  assert.ok(isCastId(TOLANI) && isCastId(REMI));
  assert.ok(!isCastId('house.lagos.nobody') && !isCastId('p1') && !isCastId('resident.lagos.g9-x'));
  const done = r.feed.follow(r.db as never, r.session('p1'), { id: TOLANI });
  assert.ok(done.ok, JSON.stringify(done));
  if (!done.ok) return;
  assert.equal(done.profile.ai, true, 'labelled AI-played');
  assert.equal(done.profile.following, true);
  assert.equal(done.profile.name, 'Mama Tolani');
  assert.match(done.profile.bio ?? '', /Lagos/);
  assert.equal((r.db.feed as { authors: Record<string, { followers?: number }> }).authors[TOLANI]?.followers, 1);
  const viewed = r.feed.profile(r.db as never, 'p2', TOLANI);
  assert.ok(viewed.ok && viewed.profile.followable && viewed.profile.ai);
  assert.ok(r.feed.follow(r.db as never, r.session('p2'), { id: REMI }).ok, 'a resident too');
  // A follow of a cast member tells nobody: an AI character has no inbox to fill.
  assert.equal(((r.db.feed as { authors: Record<string, { inbox?: unknown[] }> }).authors[TOLANI]?.inbox ?? []).length, 0);
  assert.ok(!r.feed.follow(r.db as never, r.session('p1'), { id: 'house.lagos.nobody' }).ok);
  assert.deepEqual(followedCast(r.db as never).map((entry) => entry.member.id).sort(), [REMI, TOLANI].sort());
  assert.ok(r.feed.follow(r.db as never, r.session('p1'), { id: TOLANI, on: false }).ok);
  assert.deepEqual(followedCast(r.db as never).map((entry) => entry.member.id), [REMI]);
});

test('daily lines: only followed characters post, once a Lagos day after the evening hour, written from their routine, the day\'s tally and the public gist', async () => {
  const r = rig();
  r.clock.t = DAY0 + 10 * HOUR;
  assert.deepEqual(await r.follow.run(), { daily: 0, highlights: 0 }, 'nobody follows anyone: nothing is written');
  r.feed.follow(r.db as never, r.session('p1'), { id: TOLANI });
  r.feed.follow(r.db as never, r.session('p1'), { id: REMI });
  assert.deepEqual(await r.follow.run(), { daily: 0, highlights: 0 }, 'before the evening: nothing yet');
  r.clock.t = DAY0 + 20 * HOUR;
  const first = await r.follow.run();
  assert.equal(first.daily, 2);
  assert.deepEqual(await r.follow.run(), { daily: 0, highlights: 0 }, 'once a day');
  const page = r.feed.read(r.db as never, 'p1', { tab: 'friends' });
  assert.ok(page.ok);
  if (!page.ok) return;
  const mine = page.posts.filter((post) => post.by.id === TOLANI && post.kind === 'moment');
  assert.equal(mine.length, 1);
  assert.equal(mine[0]!.ai, true);
  assert.match(mine[0]!.body, /stall/);
  assert.match(mine[0]!.body, /7 people/);
  assert.match(mine[0]!.body, /Kemi opened a food stall/, 'the town news is a public gist line');
  assert.ok(page.posts.some((post) => post.by.id === REMI && /Another day/.test(post.body)));
  const profile = r.feed.profile(r.db as never, 'p2', TOLANI);
  assert.ok(profile.ok && profile.profile.status?.text.startsWith('Today:'));
  // Every daily line of every Lagos cast member passes the AI word rules for a minor.
  for (const spec of castOf('lagos')) {
    const member = castMember(`house.lagos.${spec.key}`)!;
    const line = dailyLine(member, { hours: 'from 9am to 6pm', place: 'Lagos Market', tally: { talks: 3, sold: 1, quiz: 2 }, news: 'Ada opened a food stall in Yaba Market' });
    assert.ok(agentWords(line.body, { toMinor: true }).ok, line.body);
    assert.ok(line.status.length <= 60);
    assert.ok(agentWords(writtenHighlight(member, [line.body]), { toMinor: true }).ok);
  }
});

test('weekly highlights: one a week per followed character, by a model within the per-city daily cap, written past it, and a model text with a new name or number is thrown away', async () => {
  const r = rig({ aiHighlightCityCalls: 1 }, (input) => (input.messages.some((m) => m.content.includes('Bro Dayo')) ? 'Great week! Call Chinedu, he paid 9000 for jollof.' : 'What a week here. Thank you all for coming by.'));
  for (const spec of castOf('lagos')) r.feed.follow(r.db as never, r.session('p1'), { id: `house.lagos.${spec.key}` });
  const highlights: { by: string; body: string }[] = [];
  for (let d = 0; d < 7; d++) {
    r.clock.t = DAY0 + d * DAY + 20 * HOUR;
    await r.follow.run();
  }
  const feed = r.db.feed as { posts: Record<string, { by: string; kind: string; body: string; vis: string; at: number; ai?: 1 }> };
  for (const post of Object.values(feed.posts)) if (post.kind === 'recap') { highlights.push(post); assert.equal(post.vis, 'public'); assert.equal(post.ai, 1); assert.ok(agentWords(post.body, { toMinor: true }).ok, post.body); }
  assert.equal(highlights.length, 6, 'each of the six once in the week');
  assert.equal(new Set(highlights.map((post) => post.by)).size, 6);
  // The cap: never more than one model call a UTC day in Lagos.
  const perDay = new Map<number, number>();
  for (const call of r.asked) { const day = Math.floor(call.at / DAY); perDay.set(day, (perDay.get(day) ?? 0) + 1); }
  for (const [, count] of perDay) assert.ok(count <= 1, 'the per-city daily cap holds');
  for (const call of r.asked) assert.equal(call.input.carriesPlayerWords, false, 'no person\'s words are in a highlight prompt');
  // Dayo's model text named a person and a sum: it was thrown away for the written one.
  const dayo = highlights.find((post) => post.by === 'house.lagos.dayo');
  assert.ok(dayo && !/Chinedu|9000/.test(dayo.body));
  assert.ok(highlights.some((post) => /What a week here/.test(post.body)), 'some were written by the model');
  assert.equal(highlights.filter((post) => /What a week here/.test(post.body)).length + highlights.filter((post) => /^My week in Lagos/.test(post.body)).length, 6, 'the rest are written by rules');
  // Another week: they come again, once each.
  for (let d = 7; d < 14; d++) { r.clock.t = DAY0 + d * DAY + 20 * HOUR; await r.follow.run(); }
  assert.equal(Object.values(feed.posts).filter((post) => post.kind === 'recap').length, 12);
  assert.ok(lagosTime(r.clock.t).week > lagosTime(DAY0).week);
});

test('with the model switched off or both caps at zero, every highlight is written and no model is asked', async () => {
  for (const settings of [{ aiHighlightModel: false }, { aiHighlightCalls: 0 }, { aiHighlightCityCalls: 0 }]) {
    const r = rig(settings);
    for (const spec of castOf('lagos')) r.feed.follow(r.db as never, r.session('p1'), { id: `house.lagos.${spec.key}` });
    for (let d = 0; d < 7; d++) { r.clock.t = DAY0 + d * DAY + 20 * HOUR; await r.follow.run(); }
    assert.equal(r.asked.length, 0, JSON.stringify(settings));
    const recaps = Object.values((r.db.feed as { posts: Record<string, { kind: string; body: string }> }).posts).filter((post) => post.kind === 'recap');
    assert.equal(recaps.length, 6);
    for (const post of recaps) assert.match(post.body, /^My week in Lagos/);
  }
  const off = rig({ aiFollowOn: false });
  off.feed.follow(off.db as never, off.session('p1'), { id: TOLANI });
  assert.deepEqual(await off.follow.run(true), { daily: 0, highlights: 0 });
});
