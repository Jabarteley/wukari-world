import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await Promise.all(['lagos', 'ibadan'].map(preloadCityContent));
// OWNER: social — friendship after shared play: who is offered to whom (server/social/friend-offers.ts), the gift limits that still hold,
// the thanks-and-gifts record on the profile, and the day-1/7/30 return split by ad source and by "made a friend" (server/growth/metrics.ts).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { friendOffers } from './social/friend-offers.ts';
import { KEEP, noteFriend, prune, report, touch } from './growth/metrics.ts';
import { SHIFT_SECONDS } from '../src/game/content/jobs.ts';
import { TRANSFER_LIMITS } from '../src/game/content/npcs.ts';
import { lagosTime } from '../src/game/clock.ts';
import type { LifeState } from '../src/types/life.ts';
import type { ThanksView } from '../src/types/social.ts';
import type { GrowthCollection, SocialCollection, SocialPlayerRecord } from './types.ts';

// ---- who is offered ---------------------------------------------------------------------------------

const record = (name: string, extra: Partial<SocialPlayerRecord> = {}): SocialPlayerRecord => ({ name, first: 1, seen: 1, friends: {}, in: {}, out: {}, blocked: {}, convs: {}, updates: [], reports: [], baeIn: {}, bae: null, visiting: null, recv: { day: 0, amount: 0 }, chats: { day: 0, count: 0 }, ...extra } as SocialPlayerRecord);
const world = (players: Record<string, SocialPlayerRecord>) => ({ players } as unknown as Pick<SocialCollection, 'players'>);
const seats = ['me', 'ada', 'bola', 'chi', 'dayo', 'eze', 'ghost'].map((id) => ({ id, name: id.toUpperCase() }));

test('offers: not yourself, not friends, not blocked either way, not someone you already asked, and only players who can be found', () => {
  const players = {
    me: record('Me', { friends: { bola: 1 }, blocked: { chi: 1 }, out: { eze: 1 } }),
    ada: record('Ada'),
    bola: record('Bola', { friends: { me: 1 } }),
    chi: record('Chi'),
    dayo: record('Dayo', { blocked: { me: 1 } }),
    eze: record('Eze', { in: { me: 1 } }),
  };
  // ghost has no social record at all.
  assert.deepEqual(friendOffers(world(players), 'me', seats).map((offer) => offer.id), ['ada']);
  // The same list from Ada's side: Ada is not friends with Me, Bola, Chi (a block is one-sided but still a block for Me), Eze.
  assert.deepEqual(friendOffers(world(players), 'ada', seats).map((offer) => offer.id), ['me', 'bola', 'chi', 'dayo', 'eze']);
  // Someone with no record is offered nothing; so is everyone when the collection is missing.
  assert.deepEqual(friendOffers(world(players), 'ghost', seats), []);
  assert.deepEqual([friendOffers(null, 'me', seats), friendOffers(undefined, 'me', seats)], [[], []]);
});

test('offers: a request they sent is marked incoming, an AI agent keeps its mark, duplicates are one, and the list is short', () => {
  const players = { me: record('Me', { in: { ada: 1 } }), ada: record('Ada'), bot: record('Guide', { agent: { char: true } }), ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`p${i}`, record(`P${i}`)])) };
  const seen = friendOffers(world(players), 'me', [{ id: 'ada', name: 'Ada' }, { id: 'ada', name: 'Ada' }, { id: 'bot', name: 'Guide' }]);
  assert.deepEqual(seen, [{ id: 'ada', name: 'Ada', incoming: true }, { id: 'bot', name: 'Guide', ai: true }]);
  assert.equal(friendOffers(world(players), 'me', Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `P${i}` }))).length, 5);
});

test('offers: the founder’s welcome friendship counts as a friendship, so the founder is never offered', () => {
  const players = { me: record('Me', { friends: { founder: 1 }, founder: { id: 'founder', at: 1 } }), founder: record('Founder') };
  assert.deepEqual(friendOffers(world(players), 'me', [{ id: 'founder', name: 'Founder' }]), []);
});

// ---- gifts and the thanks record -------------------------------------------------------------------

type Fixture = Awaited<ReturnType<typeof fixture>>;
interface Reply { status: number; ok: boolean; code: string; reason: string; player: { thanks?: ThanksView; friend: boolean }; state: { social: { earned: number } } }
const answer = async (res: Response): Promise<Reply> => ({ status: res.status, ...((await res.json()) as Partial<Reply>) } as Reply);
const get = async (f: Fixture, path: string, who?: Device): Promise<Reply> => answer(await f.request(path, null, who?.cookie));
const post = async (f: Fixture, path: string, body: unknown, who?: Device): Promise<Reply> => answer(await f.request(path, body, who?.cookie));
const people = async (f: Fixture, names: string[]): Promise<Device[]> => { const out: Device[] = []; for (const name of names) { const who = await f.device(name); await get(f, '/api/social/me', who); out.push(who); } return out; };
const befriend = async (f: Fixture, a: Device, b: Device): Promise<void> => {
  assert.equal((await post(f, '/api/social/friends/request', { to: b.id, cityId: 'lagos' }, a)).code, 'requested');
  assert.equal((await post(f, '/api/social/friends/answer', { from: a.id, accept: true, cityId: 'lagos' }, b)).code, 'accepted');
};
async function earn(f: Fixture, who: Device): Promise<void> {
  const applied = await f.action(who.cookie, { type: 'apply-job', id: 'teaching' }); assert.equal(applied.code, 'applied', JSON.stringify(applied));
  await f.action(who.cookie, { type: 'spot', id: 'work' });
  assert.equal((await f.action(who.cookie, { type: 'activity', id: 'teaching-shift' })).code, 'started');
  f.advance(SHIFT_SECONDS * 1000);
  assert.equal((await get(f, '/api/life?city=lagos', who)).state.social.earned, 3000);
}
const gift = (f: Fixture, from: Device, to: Device, amount: number) => post(f, '/api/social/transfers', { to: to.id, amount, cityId: 'lagos', clientId: f.id() }, from);
const card = async (f: Fixture, viewer: Device, of: Device) => (await get(f, `/api/social/players/${encodeURIComponent(of.id)}`, viewer)).player;

test('gifts: still friends only, still capped; a refused gift leaves no trace on the profile; a sent one is counted without an amount', async (t) => {
  const f = await fixture(t);
  const [ada, bola, chi] = await people(f, ['Ada', 'Bola', 'Chi']) as [Device, Device, Device];
  await earn(f, ada);
  // Met at a table but not friends: no gift. The offer to add as a friend comes first.
  assert.equal((await gift(f, ada, bola, 500)).code, 'friends_only');
  await befriend(f, ada, bola);
  assert.equal((await gift(f, ada, bola, TRANSFER_LIMITS.maxPerTransfer + 1)).code, 'amount_too_large');
  assert.equal((await gift(f, ada, bola, TRANSFER_LIMITS.min - 1)).code, 'amount_too_small');
  assert.equal((await card(f, bola, ada)).thanks, undefined, 'nothing was sent, so nothing is recorded');
  assert.equal((await gift(f, ada, bola, 500)).code, 'sent');
  const seenByBola = (await card(f, bola, ada)).thanks, seenByAda = (await card(f, ada, bola)).thanks;
  assert.deepEqual([seenByBola?.given, seenByBola?.got, seenByAda?.given, seenByAda?.got], [1, 0, 0, 1]);
  assert.deepEqual(seenByBola?.recent.map((item) => [item.name, item.dir]), [['Bola', 'gave']]);
  assert.ok(!JSON.stringify(seenByBola).includes('500'), 'no amount is shown');
  // A stranger sees the counts but not who gave to whom.
  const stranger = (await card(f, chi, ada)).thanks;
  assert.deepEqual([stranger?.given, stranger?.recent], [1, []]);
  // The daily count still holds: three gifts a day.
  f.advance(61000); // the per-minute rate limit is its own rule
  assert.equal((await gift(f, ada, bola, 100)).code, 'sent');
  assert.equal((await gift(f, ada, bola, 100)).code, 'sent');
  assert.notEqual((await gift(f, ada, bola, 100)).code, 'sent');
  const after = (await card(f, ada, ada)).thanks;
  assert.equal(after?.given, TRANSFER_LIMITS.dailyCount);
  assert.ok((after?.recent.length ?? 0) <= 5);
});

// ---- the return split ------------------------------------------------------------------------------

const DAY = 86400000;
const life = (since: number): LifeState => ({ civic: { since }, estate: { city: 'lagos' } } as unknown as LifeState);
const empty = (): GrowthCollection => ({ salt: 's', players: {}, shares: {}, metrics: {}, tables: {}, sweptAt: 0 });

test('return split: day 1, 7 and 30 by ad source and by a friend made in the first two days, counted once, with "too early" where no life is old enough', () => {
  const g = empty(), t0 = 1_800_000_000_000 + 12 * 3600000;
  const words = { source: 'TikTok', medium: 'paid', campaign: 'test1' };
  touch(g, t0, 'a', life(t0), null, words); touch(g, t0, 'b', life(t0), null, words); touch(g, t0, 'c', life(t0), null, undefined); touch(g, t0, 'd', life(t0), null, words);
  noteFriend(g, t0, 'a', 'founder-or-unfollowed'); // a made a friend on the first day
  noteFriend(g, t0 + 5 * DAY, 'd'); // d made one too late to count as early
  // Day 1: a and b come back; day 7 and 30: only a.
  touch(g, t0 + DAY, 'a', life(t0), t0, words); touch(g, t0 + DAY, 'b', life(t0), t0, words);
  prune(g, t0 + 3 * DAY);
  let split = report(g, t0 + 3 * DAY).returns;
  assert.deepEqual(split.byFriend.yes.d1, { lives: 1, returned: 1, rate: 100 });
  assert.deepEqual(split.byFriend.no.d1, { lives: 3, returned: 1, rate: 33.3 }, 'b came back, c and d did not');
  assert.deepEqual(split.byFriend.yes.d7, { lives: 0, returned: 0, rate: null }, 'too early to say, never 0');
  touch(g, t0 + 7 * DAY, 'a', life(t0), t0 + DAY, words);
  touch(g, t0 + 30 * DAY, 'a', life(t0), t0 + 7 * DAY, words);
  prune(g, t0 + 32 * DAY);
  split = report(g, t0 + 32 * DAY).returns;
  assert.deepEqual([split.byFriend.yes.d7, split.byFriend.yes.d30, split.byFriend.no.d30], [{ lives: 1, returned: 1, rate: 100 }, { lives: 1, returned: 1, rate: 100 }, { lives: 3, returned: 0, rate: 0 }]);
  const tiktok = split.bySource.find((row) => row.source === 'tiktok'), direct = split.bySource.find((row) => row.source === 'direct');
  assert.deepEqual([tiktok?.campaign, tiktok?.d1, tiktok?.d30], ['test1', { lives: 3, returned: 2, rate: 66.7 }, { lives: 3, returned: 1, rate: 33.3 }]);
  assert.deepEqual([direct?.medium, direct?.d1.lives, direct?.d1.returned], ['direct', 1, 0]);
  // Counted once: pruning again, an hour later, changes nothing; and the life records are gone after their window, the split is not.
  prune(g, t0 + 32 * DAY + 2 * 3600000);
  assert.deepEqual(report(g, t0 + 32 * DAY + 2 * 3600000).returns, split);
  assert.equal(Object.keys(g.metrics.lives ?? {}).length, 0);
  assert.equal(JSON.stringify(split).includes('"a"'), false, 'no player id in the report');
});

test('return split: a life without the new fields is counted as unknown, and the split is dropped after its cohorts are', () => {
  const g = empty(), t0 = 1_800_000_000_000;
  const old = lagosTime(t0).day;
  g.metrics.cities = { lagos: { days: {}, cohorts: {}, lives: { oldlife: { first: old - 5, last: old - 4, steps: 0 } } } };
  prune(g, t0);
  assert.equal(report(g, t0).returns.bySource[0]?.source, 'unknown');
  prune(g, t0 + (KEEP.cohorts + 2) * DAY + 2 * 3600000);
  assert.deepEqual(Object.keys(g.metrics.split ?? {}), []);
});
