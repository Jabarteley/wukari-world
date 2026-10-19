// The share loops' server records and models (docs/SHARE-LOOPS.md): passport stamps, Wrapped, street fame, the city front page and the routes.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../test-fixture.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { loadCityContent, loadCityNetwork } from '../../src/game/cities/registry.ts';
import { lagosDayStart, lagosTime } from '../../src/game/clock.ts';
import { fileCharacter } from '../character.ts';
import { gistService } from '../gist/ledger.ts';
import { PASSPORT_MAX, stampPassport } from './stamp.ts';
import { continentOf, openByContinent, passportView } from './passport.ts';
import { monthAllowed, monthOf, monthSpan, votesIn, wrappedOf } from './wrapped.ts';
import { BADGE_TOP, badgeOf, fameView, noteVisit, weekName } from './fame.ts';
import { MODEL_MIN_LINES, frontPageOf, frontPages, frontPrompt, frontTemplate, linesOfDay, readModelPage, staysWithin } from './frontpage.ts';
import { FAME_GUESTS, forgetLoopsPlayers, loopsOf, peekLoops } from './store.ts';
import type { LoopsCollection } from './store.ts';
import type { GistItem } from '../gist/ledger.ts';
import type { Db, RouteContext, RouteModule, SessionRecord } from '../types.ts';

await loadCityNetwork();
await Promise.all(['lagos', 'ibadan'].map(loadCityContent));

const DAY = 86400000;
const emptyLoops = (): LoopsCollection => ({ v: 1, visits: {}, guests: {}, pages: {}, made: { day: 0, n: 0, city: {} } });
const db = (parts: Record<string, unknown>): Db => ({ version: 1, sessions: {}, ...parts }) as unknown as Db;

// ---- passport -------------------------------------------------------------------------------

test('a city is stamped once, at its first arrival; a malformed or test city never is; the book is bounded', () => {
  const session: Pick<SessionRecord, 'passport'> = {};
  assert.equal(stampPassport(session, 'lagos', 1000), true);
  assert.equal(stampPassport(session, 'lagos', 5000), false, 'a second arrival keeps the first date');
  assert.deepEqual(session.passport, { lagos: 1000 });
  for (const bad of ['', 'Lagos', '../x', 'test-city', 42, null]) assert.equal(stampPassport(session, bad, 2000), false);
  const full: Pick<SessionRecord, 'passport'> = { passport: Object.fromEntries(Array.from({ length: PASSPORT_MAX }, (_, i) => [`c${i}`, i])) };
  assert.equal(stampPassport(full, 'lagos', 1), false);
});

test('an intercity trip stamps the city it arrives in (and the one it left), inside the filing of the trip', () => {
  const life = (city: string) => ({ state: { estate: { city } }, updatedAt: 1, salt: 'x'.repeat(16) });
  const session = { publicId: 'p', cities: { lagos: life('ibadan') }, character: { v: 2, city: 'lagos' } } as unknown as SessionRecord;
  fileCharacter(session, 'lagos', 7000);
  assert.deepEqual(session.passport, { lagos: 7000, ibadan: 7000 });
  fileCharacter(session, 'ibadan', 9000);
  assert.deepEqual(session.passport, { lagos: 7000, ibadan: 7000 }, 'settling again in the same city adds nothing');
});

test('the passport names each city, its country and its continent (Nigeria is in Africa), oldest first, and counts open cities per continent', () => {
  assert.equal(continentOf('ng'), 'africa');
  assert.equal(continentOf('gb'), 'europe');
  assert.equal(continentOf('jp'), 'asia');
  assert.equal(continentOf('zz'), null);
  const view = passportView({ passport: { ibadan: 3000, lagos: 1000, nowhere: 2000 } });
  assert.deepEqual(view.stamps.map((stamp) => [stamp.city, stamp.continent, stamp.country]), [['lagos', 'africa', 'ng'], ['ibadan', 'africa', 'ng']]);
  assert.equal(view.stamps[0]!.name, 'Lagos');
  assert.ok((openByContinent()['africa'] ?? 0) >= 2, 'Africa has open cities');
});

// ---- wrapped --------------------------------------------------------------------------------

test('months are Lagos calendar months; only this month and the two before may be asked for', () => {
  const now = Date.UTC(2026, 9, 19, 12);
  assert.equal(monthOf(now), '2026-10');
  assert.equal(monthOf(Date.UTC(2026, 8, 30, 23, 30)), '2026-10', '23:30 UTC on 30 September is already October in Lagos');
  const span = monthSpan('2026-10')!;
  assert.equal(span.start, Date.UTC(2026, 9, 1) - 3600000);
  assert.equal(span.end, Date.UTC(2026, 10, 1) - 3600000);
  assert.equal(monthSpan('2026-13'), null);
  assert.equal(monthSpan('26-10'), null);
  assert.ok(monthAllowed('2026-10', now) && monthAllowed('2026-09', now) && monthAllowed('2026-08', now));
  assert.equal(monthAllowed('2026-07', now), false);
  assert.equal(monthAllowed('2026-11', now), false, 'not a month to come');
});

test('Wrapped reads the month from records the game keeps: stamps, homes, friends, game naira, votes, the AI resident and the best post', () => {
  const span = monthSpan('2026-10')!, inside = span.start + 6 * DAY + 12 * 3600000, before = span.start - DAY;
  const week = lagosTime(inside).week, oldWeek = lagosTime(before - 20 * DAY).week;
  const store = db({
    loops: { ...emptyLoops(), guests: { me: { '2026-10': 4, '2026-09': 9 } } },
    social: { players: { me: { name: 'Ada', friends: { a: inside, b: before, c: inside + DAY } } } },
    walletEffects: [
      { publicId: 'me', cityId: 'lagos', operationId: null, ordinal: 0, at: inside, amount: 5000, balanceAfter: 5000, reason: 'Shift pay' },
      { publicId: 'me', cityId: 'lagos', operationId: null, ordinal: 1, at: inside, amount: 900, balanceAfter: 5900, reason: 'Refund: a ticket' },
      { publicId: 'me', cityId: 'lagos', operationId: null, ordinal: 2, at: inside, amount: -300, balanceAfter: 5600, reason: 'Food' },
      { publicId: 'me', cityId: 'lagos', operationId: null, ordinal: 3, at: before, amount: 7000, balanceAfter: 12600, reason: 'Shift pay' },
      { publicId: 'other', cityId: 'lagos', operationId: null, ordinal: 0, at: inside, amount: 99999, balanceAfter: 99999, reason: 'Shift pay' },
    ],
    civic: { cities: { lagos: { gov: { elections: { [String(week)]: { candidates: {}, votes: { me: 'x', other: 'x' } }, [String(oldWeek)]: { candidates: {}, votes: { me: 'y' } } } } } } },
    politics: { scopes: { 'state:lagos': { gov: { elections: { [String(week)]: { candidates: {}, votes: { me: 'z' } } } } } } },
    agentMemory: { v: 1, people: { me: { at: inside, a: { 'house.lagos.nobody': { p: 99, d: 1, n: 3, at: inside } } } } },
    feed: { posts: {
      p1: { id: 'p1', by: 'me', at: inside, kind: 'text', body: 'Jollof at the beach', vis: 'public', rx: { a: '❤️', b: '😂' } },
      p2: { id: 'p2', by: 'me', at: inside, kind: 'text', body: 'Removed', vis: 'public', rx: { a: '❤️', b: '😂', c: '🔥' }, gone: 1 },
      p3: { id: 'p3', by: 'me', at: before, kind: 'text', body: 'Last month', vis: 'public', rx: { a: '❤️', b: '😂', c: '🔥', d: '🔥' } },
    }, authors: { me: { name: 'Ada', posts: ['p1', 'p2', 'p3'] } } },
  });
  const wrapped = wrappedOf(store, { publicId: 'me', passport: { lagos: before, ibadan: inside } }, '2026-10', inside + DAY)!;
  assert.deepEqual(wrapped.cities, ['Ibadan']);
  assert.equal(wrapped.homes, 4);
  assert.equal(wrapped.friends, 2);
  assert.equal(wrapped.earned, 5000, 'income only: no refund, no spending, no other month, no other player');
  assert.equal(wrapped.votes, 2, 'the city and the state election of a week in the month');
  assert.equal(wrapped.ai, null, 'an id the house cast does not know is left out');
  assert.deepEqual(wrapped.post, { id: 'p1', body: 'Jollof at the beach', reactions: 2 });
  assert.equal(wrapped.partial, true);
  assert.equal(votesIn(store, 'nobody', span), 0);
  assert.equal(wrappedOf(store, { publicId: 'me' }, 'nonsense', inside), null);
});

// ---- street fame ----------------------------------------------------------------------------

test('a visit counts its guest once a week for the home and once for the guest\'s month; bounded and never self', () => {
  const loops = emptyLoops(), now = Date.UTC(2026, 9, 19, 12), week = String(lagosTime(now).week);
  assert.equal(noteVisit(loops, 'host', 'g1', 'lagos', now), true);
  assert.equal(noteVisit(loops, 'host', 'g1', 'lagos', now + 1000), false, 'the same guest again this week');
  assert.equal(noteVisit(loops, 'host', 'g2', 'lagos', now), true);
  assert.equal(noteVisit(loops, 'host', 'host', 'lagos', now), false);
  assert.equal(noteVisit(loops, 'host', 'g3', '../x', now), false);
  assert.equal(loops.visits[week]!['lagos']!['host']!.n, 2);
  assert.equal(loops.guests['g1']!['2026-10'], 2, 'the guest went in twice this month');
  assert.ok(!JSON.stringify(loops.visits).includes('g1'), 'no guest id is kept on the board');
  for (let i = 0; i < FAME_GUESTS + 5; i++) noteVisit(loops, 'busy', `x${i}`, 'lagos', now);
  assert.equal(loops.visits[week]!['lagos']!['busy']!.n, FAME_GUESTS);
  noteVisit(loops, 'host', 'g9', 'lagos', now + 30 * DAY);
  assert.equal(loops.visits[week], undefined, 'old weeks are dropped');
});

test('the board names adults who are listed, ranks homes and communities, and gives last week\'s top homes a badge', () => {
  const now = Date.UTC(2026, 9, 19, 12), week = lagosTime(now).week, start = lagosDayStart(week * 7 - 3);
  const loops = emptyLoops();
  loops.visits[String(week)] = { lagos: { a: { n: 3, g: [] }, b: { n: 9, g: [] }, kid: { n: 50, g: [] }, shy: { n: 40, g: [] }, me: { n: 1, g: [] } } };
  loops.visits[String(week - 1)] = { lagos: { me: { n: 5, g: [] }, a: { n: 9, g: [] }, kid: { n: 99, g: [] } } };
  const store = db({
    loops,
    civic: { prefs: { shy: { directory: true } } },
    feed: { cities: { lagos: { posts: ['p1', 'p2', 'p3', 'p4'] } }, crews: { c1: { id: 'c1', name: 'Yaba Runners', kind: 'area' }, c2: { id: 'c2', name: 'Banned', kind: 'area', banned: 1 }, c3: { id: 'c3', name: 'Friends', members: [] } },
      posts: { p1: { id: 'p1', at: start + DAY, crew: 'c1', rx: { a: 'x', b: 'y' } }, p2: { id: 'p2', at: start + DAY, crew: 'c2', rx: { a: 'x', b: 'y', c: 'z' } }, p3: { id: 'p3', at: start - DAY, crew: 'c1', rx: { a: 'x', b: 'y', c: 'z' } }, p4: { id: 'p4', at: start + DAY, crew: 'c3', rx: { a: 'x' } } } },
  });
  const adults = new Set(['a', 'b', 'shy', 'me']);
  const checks = { adult: (id: string) => adults.has(id), name: (id: string) => ({ a: 'Ada', b: 'Bola', shy: 'Shy', me: 'Me', kid: 'Kid' } as Record<string, string>)[id] ?? '' };
  const fame = fameView(store, 'lagos', week, 'me', checks);
  assert.deepEqual(fame.homes.map((home) => [home.rank, home.name, home.visitors]), [[1, 'Bola', 9], [2, 'Ada', 3], [3, 'Me', 1]], 'a minor and a hidden player are left off');
  assert.equal(fame.homes[2]!.mine, true);
  assert.deepEqual(fame.communities, [{ rank: 1, id: 'c1', name: 'Yaba Runners', reactions: 2 }], 'a banned community, a crew of friends and last week are left out');
  assert.equal(fame.name, weekName(week));
  assert.deepEqual(fame.badge, { rank: 2, city: 'lagos', cityName: 'Lagos', week: weekName(week - 1) }, 'second last week once the minor is left out');
  assert.ok(BADGE_TOP >= 2);
  assert.equal(badgeOf(store, 'b', week - 1, checks), null);
  assert.ok(!JSON.stringify(fame).includes('"kid"'));
});

test('erasure removes a player\'s months and their home from every board', () => {
  const loops = emptyLoops();
  loops.guests = { me: { '2026-10': 1 }, other: { '2026-10': 2 } };
  loops.visits = { '100': { lagos: { me: { n: 1, g: [] }, other: { n: 2, g: [] } } } };
  const store = db({ loops });
  forgetLoopsPlayers(store, new Set(['me']));
  assert.deepEqual(Object.keys(peekLoops(store)!.guests), ['other']);
  assert.deepEqual(Object.keys(peekLoops(store)!.visits['100']!['lagos']!), ['other']);
  forgetLoopsPlayers(db({}), ['me']);
});

// ---- the front page -------------------------------------------------------------------------

const day = 20000, at = (hour: number) => lagosDayStart(day) + hour * 3600000;
const item = (n: number, hour: number, kind: GistItem['kind'], text: string, ai = false): GistItem => ({ n, at: at(hour), city: 'lagos', kind, text, ...(ai ? { refs: { ai: 1 } } : {}) });
const LINES = [item(1, 9, 'busy', 'Yaba is busy tonight'), item(2, 10, 'election', 'Ada won the governor election in Lagos'), item(3, 12, 'business', 'Tunde opened a shop in Surulere'), item(4, 14, 'event', 'Kemi (AI) started an owambe at Freedom Park', true)];

test('the template is the lines as they are: the weightiest leads, an AI line keeps its mark, the date is the day reported on', () => {
  const lines = linesOfDay([...LINES, { ...item(9, 9, 'busy', 'Old'), at: at(-30) }, { ...item(10, 9, 'busy', 'Ibadan'), city: 'ibadan' }], 'lagos', day);
  assert.equal(lines.length, 4);
  const page = frontTemplate('lagos', 'Lagos', day, lines)!;
  assert.equal(page.headline, 'Ada won the governor election in Lagos');
  assert.equal(page.paper, 'The Lagos Gist');
  assert.equal(page.by, 'template');
  assert.equal(page.date, new Date(lagosDayStart(day) + 3600000).toISOString().slice(0, 10));
  assert.deepEqual(page.stories.map((story) => story.head), ['Tunde opened a shop in Surulere', 'Kemi (AI) started an owambe at Freedom Park (AI)', 'Yaba is busy tonight']);
  assert.equal(frontTemplate('lagos', 'Lagos', day, []), null);
});

test('the model page is kept only when it adds no name and no number: a story that does is dropped, a headline that does drops the page', () => {
  assert.equal(staysWithin('Ada wins big in Lagos', 'Ada won the governor election in Lagos'), true);
  assert.equal(staysWithin('Ada wins by 61%', 'Ada won the governor election'), false, 'a number the lines do not have');
  assert.equal(staysWithin('Ada and Chidi celebrate', 'Ada won'), false, 'a name the lines do not have');
  const answer = JSON.stringify({ headline: { line: 2, text: 'Ada takes Lagos!' }, stories: [
    { line: 3, head: 'Tunde opens up shop', body: 'A new shop in Surulere.' },
    { line: 1, head: 'Yaba buzzes', body: 'Chidi says 500 people came.' },
    { line: 4, head: 'Owambe at Freedom Park', body: 'Kemi got the party started.' },
    { line: 2, head: 'Again', body: 'The same line twice is not a second story.' },
  ] });
  const page = readModelPage(`\`\`\`json\n${answer}\n\`\`\``, 'lagos', 'Lagos', day, LINES)!;
  assert.equal(page.by, 'ai');
  assert.equal(page.headline, 'Ada takes Lagos!');
  assert.deepEqual(page.stories.map((story) => story.head), ['Tunde opens up shop', 'Owambe at Freedom Park (AI)']);
  assert.equal(readModelPage(JSON.stringify({ headline: { line: 2, text: 'Ada wins with 61%' }, stories: [] }), 'lagos', 'Lagos', day, LINES), null);
  assert.equal(readModelPage('not json', 'lagos', 'Lagos', day, LINES), null);
  assert.equal(readModelPage(JSON.stringify({ headline: { line: 9, text: 'Ada' } }), 'lagos', 'Lagos', day, LINES), null, 'a line that does not exist');
  const prompt = frontPrompt('Lagos', '2024-10-01', LINES);
  assert.match(prompt[0]!.content, /never add a person, a place, a number/);
  assert.match(prompt[1]!.content, /4\. Kemi \(AI\) started an owambe at Freedom Park \[about an AI character\]/);
});

async function scene(t: Parameters<typeof fixture>[0]) {
  let grabbed: RouteContext | null = null;
  const module: RouteModule = (ctx) => { grabbed = ctx; return {}; };
  const f = await fixture(t, { routes: [...ROUTE_MODULES, module] });
  const ctx = grabbed as RouteContext | null;
  assert.ok(ctx);
  (ctx.checks ??= {}).adult = () => true;
  const get = async (path: string, cookie?: string) => {
    const response = await f.request(path, null, cookie);
    return { status: response.status, body: await response.json() as Record<string, any>, cache: response.headers.get('cache-control') };
  };
  return { f, ctx, get };
}

test('the routes: passport, Wrapped, fame and the public front page; a visit that ended reaches the board', async (t) => {
  const s = await scene(t);
  const ada = await s.f.device('Ada');
  await s.f.request('/api/life?city=lagos', null, ada.cookie);
  const passport = await s.get('/api/loops/passport', ada.cookie);
  assert.equal(passport.status, 200);
  assert.deepEqual(passport.body.passport.stamps.map((stamp: { city: string }) => stamp.city), ['lagos'], 'the city a life began in is stamped');
  assert.equal(passport.cache, 'no-store');
  assert.equal((await s.get('/api/loops/passport')).status, 401);

  const wrapped = await s.get('/api/loops/wrapped', ada.cookie);
  assert.equal(wrapped.status, 200);
  assert.equal(wrapped.body.wrapped.month, monthOf(s.f.now()));
  assert.equal((await s.get('/api/loops/wrapped?month=1999-01', ada.cookie)).status, 400);

  // A home that has visitors has a social record (knocks, the house chat): its shown name is read from there.
  await s.f.server.store.transact((db) => { const social = s.ctx.collection(db, 'social') as unknown as { players: Record<string, { name: string }> }; (social.players ??= {})[ada.id] = { ...social.players[ada.id], name: 'Ada' }; });
  s.ctx.emit('visit-ended', { hostId: ada.id, guestId: 'someone', cityId: 'lagos' });
  s.ctx.emit('visit-ended', { hostId: ada.id, guestId: 'other' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  const fame = await s.get('/api/loops/fame?id=lagos', ada.cookie);
  assert.equal(fame.status, 200);
  assert.deepEqual(fame.body.fame.homes.map((home: { visitors: number; mine?: boolean }) => [home.visitors, home.mine]), [[1, true]], 'a visit without a city is not counted');
  assert.equal((await s.get('/api/loops/fame?id=atlantis', ada.cookie)).status, 400);

  assert.deepEqual((await s.get('/api/loops/frontpage?id=lagos')).body.page, null, 'no lines yesterday: no page');
  const gist = gistService(s.ctx);
  const yesterday = s.f.now() - DAY;
  await s.f.server.store.transact((db) => { const made = gist.add(db, { city: 'lagos', kind: 'business', text: 'A new shop opened in Yaba' }); if (made) made.at = yesterday; });
  const front = await s.get('/api/loops/frontpage?id=lagos');
  assert.equal(front.status, 200);
  assert.equal(front.body.page.headline, 'A new shop opened in Yaba');
  assert.equal(front.cache, 'public, max-age=300');
});

test('the morning job writes one model page for the busiest city, within its caps, and falls back to the template', async (t) => {
  const s = await scene(t);
  const gist = gistService(s.ctx);
  // The fixture's clock is near the epoch: move to a morning in Lagos and put yesterday's lines in.
  s.f.advance(lagosDayStart(lagosTime(s.f.now()).day + 1) + 8 * 3600000 - s.f.now());
  const yesterday = lagosTime(s.f.now()).day - 1;
  await s.f.server.store.transact((db) => {
    for (const [index, line] of LINES.entries()) { const made = gist.add(db, { city: 'lagos', kind: line.kind, text: line.text, ...(line.refs ? { refs: line.refs } : {}) }); if (made) made.at = lagosDayStart(yesterday) + (index + 9) * 3600000; }
  });
  const asked: string[] = [];
  const pages = frontPages(s.ctx, { ask: async (messages) => { asked.push(messages[1]!.content); return { ok: true, text: JSON.stringify({ headline: { line: 1, text: 'Ada takes Lagos' }, stories: [] }), model: 'm', provider: 'gateway', free: false, usage: null, costMicro: 1, attempts: [] }; } });
  const made = await pages.tick(true);
  assert.ok(made);
  assert.equal(asked.length, 1);
  assert.ok(MODEL_MIN_LINES <= LINES.length);
  const stored = await s.f.server.store.read((db) => frontPageOf(db, 'lagos', s.f.now()));
  assert.equal(stored?.by, made.by);
  assert.equal(await pages.tick(true), null, 'one model page per city a day');
  assert.equal(asked.length, 1);
  const refused = frontPages(s.ctx, { ask: async () => ({ ok: false, why: 'budget', attempts: [] }) });
  await s.f.server.store.transact((db) => { const loops = loopsOf(s.ctx, db); loops.pages = {}; loops.made = { day: 0, n: 0, city: {} }; });
  const fallback = await refused.tick(true);
  assert.equal(fallback?.by, 'template');
});
