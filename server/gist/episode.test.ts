// The weekly city episode (server/gist/episode.ts, episode-page.ts, docs/EPISODES.md): the picking, quiet weeks, who is never named, the page and the route.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture } from '../test-fixture.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { loadCityContent } from '../../src/game/cities/registry.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { gistService } from './ledger.ts';
import { EPISODE_LINES, buildEpisode, pickLines, weekName, weekOfName, weekStart } from './episode.ts';
import { episodePageHtml, noEpisodeHtml } from './episode-page.ts';
import type { EpisodeInput } from './episode.ts';
import type { RouteContext, RouteModule } from '../types.ts';

await Promise.all(['lagos', 'ibadan'].map(loadCityContent));

const WEEK = 2950;
const from = weekStart(WEEK), at = (hours: number): number => from + hours * 3600000;
const item = (kind: string, text: string, hours: number, refs?: Record<string, number>) => ({ at: at(hours), kind: kind as never, text, ...(refs ? { refs } : {}) });
const input = (items: EpisodeInput['items'], rest: Partial<EpisodeInput> = {}): EpisodeInput => ({ city: 'lagos', cityName: 'Lagos', week: WEEK, now: from + 20 * 3600000, items, league: null, office: null, ...rest });

test('week names are Mondays and round-trip', () => {
  assert.equal(weekOfName(weekName(WEEK)), WEEK);
  assert.equal(lagosTime(weekStart(WEEK)).weekday, 1, 'a week starts on a Monday in Lagos');
  assert.equal(weekOfName('2026-10-13'), null, 'a Tuesday is not a week');
  for (const bad of ['', 'x', '2026-13-45', '2026-10-1', '../../etc']) assert.equal(weekOfName(bad), null);
});

test('picking: at most five, biggest kinds first, one of a kind unless short of lines', () => {
  const lines = pickLines([
    item('busy', 'Lagos is buzzing: 12 people out right now', 1), item('event', 'Owambe night has started at Quilox', 2), item('business', 'Ada opened a food stall in Yaba Market', 3),
    item('business', 'Chi opened a food stall in Yaba Market', 4), item('election', 'Tunde was elected governor of Lagos', 5), item('law', 'The City House passed a law: no loud music', 6),
    item('other', 'Lagos took the week in all the games.', 7), item('party', 'Chi founded the Good Road Party', 8),
  ]);
  assert.equal(lines.length, EPISODE_LINES);
  assert.deepEqual(lines.map((line) => line.kind), ['election', 'law', 'business', 'league', 'event']);
  assert.equal(lines[2]?.text, 'Chi opened a food stall in Yaba Market', 'the newest of a kind');
  const short = pickLines([item('business', 'Ada opened a food stall', 1), item('business', 'Chi opened a food stall', 2), item('business', 'Bola opened a food stall', 3)]);
  assert.equal(short.length, 3, 'short of lines, a second of a kind is allowed');
  assert.equal(pickLines([item('law', 'Same line', 1), item('law', 'same line', 2)]).length, 1, 'a repeated line shows once');
});

test('a quiet week says so and invents nothing', () => {
  const empty = buildEpisode(input([]));
  assert.equal(empty.quiet, true);
  assert.equal(empty.headline, 'A quiet week in Lagos');
  assert.deepEqual(empty.lines, []);
  assert.match(empty.description, /quiet week in Lagos/i);
  const one = buildEpisode(input([item('event', 'Owambe night has started at Quilox', 3)]));
  assert.equal(one.quiet, true);
  assert.match(one.description, /^A quiet week in Lagos\. Owambe night/);
  const busy = buildEpisode(input([item('election', 'Tunde was elected governor of Lagos', 3), item('law', 'The City House passed a law: no loud music', 4)]));
  assert.equal(busy.quiet, false);
  assert.equal(busy.headline, 'This week in Lagos');
  assert.match(busy.description, /^Tunde was elected governor of Lagos\. And 1 more/);
  // Lines of other weeks are not in this one.
  assert.equal(buildEpisode(input([item('election', 'Old news', -30), item('election', 'Next week news', 24 * 7 + 1)])).lines.length, 0);
});

test('the league place, the winner, the office and the stalls', () => {
  const league = { cities: { lagos: [500, 12], ibadan: [900, 8], accra: [100, 4] } as Record<string, readonly [number, number]>, won: 'ibadan', names: { lagos: 'Lagos', ibadan: 'Ibadan', accra: 'Accra' } };
  const episode = buildEpisode(input([item('business', 'Ada opened a food stall', 1), item('business', 'Chi opened a food stall', 2)], { league, office: { title: 'Governor', name: 'Tunde', ai: true }, now: from + 9 * 86400000 }));
  assert.deepEqual(episode.league, { rank: 2, of: 3, final: true, leader: { id: 'ibadan', name: 'Ibadan' } });
  assert.equal(episode.stalls, 2);
  assert.deepEqual(episode.office, { title: 'Governor', name: 'Tunde', ai: true });
  const now = buildEpisode(input([], { now: at(20), league: { ...league, won: null } }));
  assert.equal(now.league?.final, false, 'this week is not final');
  assert.equal(buildEpisode(input([], { league: { ...league, cities: { ibadan: [900, 8] } } })).league, null, 'a city with no score has no place');
});

test('what the page and the episode never show: an AI line keeps its mark; no amount of its own; nothing it was not given', () => {
  const episode = buildEpisode(input([item('business', 'A resident opened a food stall in Yaba Market', 1), item('election', 'Ada was elected governor of Lagos', 2, { ai: 1 })], { office: { title: 'Governor', name: 'Ada', ai: true } }));
  assert.equal(episode.lines.find((line) => line.kind === 'election')?.ai, true);
  const html = episodePageHtml(episode, 'https://joinallworld.com');
  assert.match(html, /Ada was elected governor of Lagos <span class="tag">AI<\/span>/);
  assert.match(html, /Governor Ada \(AI\)/);
  assert.match(html, /A resident opened a food stall/);
  const plain = JSON.stringify({ ...episode, lines: [] });
  assert.equal(/[₦$€£]|naira|kobo/i.test(plain.replace(/"description":"[^"]*"/, '')), false, 'the builder adds no amounts');
});

test('the page: tags, escaping, noindex for a quiet week, the button, past weeks', () => {
  const evil = buildEpisode(input([item('election', '<script>alert(1)</script> "won" & more', 1), item('law', "O'Neil's law", 2)], { office: { title: 'Governor', name: '<b>x</b>' } }));
  const html = episodePageHtml(evil, 'https://joinallworld.com');
  assert.ok(!html.includes('<script>alert') && !html.includes('<b>x</b>'), 'everything is escaped');
  assert.match(html, /<title>This week in Lagos<\/title>/);
  assert.match(html, /property="og:title" content="This week in Lagos"/);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
  assert.match(html, /property="og:image" content="https:\/\/joinallworld\.com\/[^"]+"/);
  assert.match(html, /property="og:description" content="&lt;script&gt;/);
  assert.match(html, /href="\/\?ref=episode">Open Allworld</);
  assert.match(html, /rel="canonical" href="https:\/\/joinallworld\.com\/episode\/lagos"/);
  assert.match(html, /content="index, follow"/);
  assert.ok(!/<script/i.test(html), 'no script on the page');
  const quiet = episodePageHtml(buildEpisode(input([])), 'https://joinallworld.com');
  assert.match(quiet, /content="noindex, nofollow"/);
  assert.match(quiet, /A quiet week in Lagos/);
  const past = episodePageHtml(buildEpisode(input([item('election', 'Tunde was elected governor of Lagos', 1), item('law', 'A law', 2)], { now: from + 20 * 86400000 })), 'https://joinallworld.com');
  assert.match(past, new RegExp(`/episode/lagos/${weekName(WEEK)}`));
  assert.match(past, /Week of 2[0-9] \w+|Week of \d+ \w+/);
  assert.match(noEpisodeHtml('https://joinallworld.com'), /noindex/);
  assert.ok(!/<script/i.test(episodePageHtml(buildEpisode(input([])), 'javascript:alert(1)')), 'a bad origin is not used');
});

async function scene(t: Parameters<typeof fixture>[0]) {
  let grabbed: RouteContext | null = null;
  const module: RouteModule = (ctx) => { grabbed = ctx; return {}; };
  const f = await fixture(t, { routes: [...ROUTE_MODULES, module] });
  const ctx = grabbed as RouteContext | null;
  assert.ok(ctx);
  (ctx.checks ??= {}).adult = (_db, id) => id !== 'kid';
  const gist = gistService(ctx);
  const add = (entry: Parameters<typeof gist.add>[1]) => f.server.store.transact((db) => gist.add(db, entry));
  return { f, ctx, add };
}

test('the page and the route over HTTP: a real city, an unknown city, a past week, a bad week, the cache; a minor is never named', async (t) => {
  const s = await scene(t);
  await s.add({ city: 'lagos', kind: 'business', text: '{0} opened a food stall in Yaba Market', people: [{ id: 'kid', name: 'Kunle' }] });
  await s.add({ city: 'lagos', kind: 'event', text: 'Owambe night has started at Quilox' });
  await s.add({ city: 'lagos', kind: 'law', text: 'A law', refs: { ai: 1 } });
  const page = await fetch(`${s.f.base}/episode/lagos`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  assert.match(page.headers.get('cache-control') ?? '', /max-age=300/);
  const html = await page.text();
  assert.match(html, /<title>This week in Lagos<\/title>/);
  assert.match(html, /A resident opened a food stall/);
  assert.ok(!html.includes('Kunle') && !html.includes('kid'));
  assert.equal((await fetch(`${s.f.base}/episode/atlantis`)).status, 404);
  assert.equal((await fetch(`${s.f.base}/episode/lagos/2026-10-13`)).status, 404, 'not a Monday');
  assert.equal((await fetch(`${s.f.base}/episode/lagos/2020-01-06`)).status, 404, 'older than eight weeks');
  assert.equal((await fetch(`${s.f.base}/episode/lagos/2099-01-05`)).status, 404, 'a week that has not come');
  assert.equal((await fetch(`${s.f.base}/episode/lagos/a/b`)).status, 404);
  assert.equal((await fetch(`${s.f.base}/episode/%E0%A4%A`)).status, 404, 'a bad escape');
  const thisMonday = weekName(lagosTime(s.ctx.now()).week), lastMonday = weekName(lagosTime(s.ctx.now()).week - 1);
  const past = await fetch(`${s.f.base}/episode/lagos/${lastMonday}`);
  assert.equal(past.status, 200);
  assert.match(await past.text(), /A quiet week in Lagos/);
  assert.equal((await fetch(`${s.f.base}/episode/lagos/${thisMonday}`)).status, 200);
  const api = await fetch(`${s.f.base}/api/world/episode?id=lagos`);
  assert.equal(api.status, 200);
  const body = await api.json() as { episode: { city: string; lines: { text: string; ai?: boolean }[]; current: boolean } };
  assert.equal(body.episode.city, 'lagos');
  assert.equal(body.episode.current, true);
  assert.equal(body.episode.lines.length, 3);
  assert.equal(body.episode.lines.find((line) => line.text === 'A law')?.ai, true);
  assert.equal((await fetch(`${s.f.base}/api/world/episode?id=atlantis`)).status, 400);
  assert.equal((await fetch(`${s.f.base}/api/world/episode?id=lagos&week=nope`)).status, 400);
});
