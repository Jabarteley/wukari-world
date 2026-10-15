import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: growth — shareable moment cards: the preview page of an election result, a piece of public news, a wedding and a table win,
// each with its own picture; the words are escaped; an unknown link is a generic card, never an error; nothing private is on a card;
// and the link a card sends lands a new visitor and a returning player in the right place.
import test from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { fixture } from './test-fixture.ts';
import { sharePageHtml } from './growth/share.ts';
import { append, emptyRecords } from './records/store.ts';
import { cardImage, cleanFacts, shareTarget, shareText, shareUrl, sourceQuery, SHARE_KINDS } from '../src/game/share-model.ts';
import { joinIdFrom, linkParts } from '../src/quick-start/model.ts';
import { goFrom } from '../src/game/go-links.ts';
import { cleanSource } from '../src/game/attribution.ts';
import { momentKind } from '../src/app/features/growth/shareMoment.ts';
import type { ShareFacts } from '../src/types/growth.ts';
import type { TestContext } from 'node:test';

type Dict = Record<string, unknown>;
type Shared = { status: number; ok: boolean; code: string; reason: string; share: { code: string; path: string; facts: ShareFacts } };
const EVIL = '"><script>alert(1)</script>\'&';
const ADA = '3f2b8c1e-4d5a-4e6f-8a7b-9c0d1e2f3a4b';

async function harness(t: TestContext) {
  const f = await fixture(t, { publicOrigin: 'https://play.example' });
  const post = async (path: string, body: unknown, who?: { cookie: string }) => { const res = await f.request(path, body, who?.cookie); return { status: res.status, ...(await res.json() as Dict) } as unknown as Shared; };
  const ada = await f.device('Ada');
  await f.request('/api/life?city=lagos', null, ada.cookie);
  /** A line of the public record, as the politics routes write it. */
  const seed = async (kind: 'term' | 'law' | 'ruling' | 'operator', title: string) => f.server.store.transact((db) => {
    const loose = db as unknown as { records?: ReturnType<typeof emptyRecords> };
    loose.records ??= emptyRecords();
    return append(loose.records, f.now(), { kind, scope: 'city:lagos', scopeName: 'Lagos', week: 1, title, facts: { voters: 12 } }).n;
  });
  return { f, ada, post, seed };
}
const tag = (html: string, key: string) => new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html)?.[1];

test('an election result card: its own title and picture, absolute image, a person is sent to the Governor panel', async (t) => {
  const { f, ada, post, seed } = await harness(t);
  const n = await seed('term', 'Ada Obi is the new Chairman of Lagos. Elected with 9 of 12 votes.');
  const made = await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: n }, ada);
  assert.equal(made.ok, true, made.reason);
  assert.equal(made.share.facts.headline, 'Ada Obi is the new Chairman of Lagos. Elected with 9 of 12 votes.');
  const res = await fetch(`${f.base}/s/${made.share.code}?utm_source=share&utm_medium=card&utm_campaign=election`);
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(tag(html, 'og:title') ?? '', /Ada Obi is the new Chairman/);
  assert.equal(tag(html, 'og:image'), 'https://play.example/og/card-election.png');
  assert.equal(tag(html, 'twitter:image'), 'https://play.example/og/card-election.png');
  assert.equal(tag(html, 'og:image:type'), 'image/png');
  assert.deepEqual([tag(html, 'og:image:width'), tag(html, 'og:image:height')], ['1200', '630']);
  assert.ok(html.includes(`content="0;url=/?go=governor&amp;ref=${made.share.code}&amp;utm_source=share&amp;utm_medium=card&amp;utm_campaign=election"`), 'the ad-source words go on to the game');
  assert.ok(!/<script/i.test(html));
  // The same entry as news is its own card with the news picture; a ruling or an operator entry is not shared; a missing entry is refused, not an error.
  assert.equal(tag(await (await fetch(`${f.base}/s/${(await post('/api/growth/share', { cityId: 'lagos', kind: 'news', record: n }, ada)).share.code}`)).text(), 'og:image'), 'https://play.example/og/card-news.png');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'news', record: await seed('ruling', 'A court decided a case about Bola.') }, ada)).code, 'nothing_to_share');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'news', record: await seed('operator', 'The operator did a thing.') }, ada)).code, 'nothing_to_share');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: 999 }, ada)).code, 'nothing_to_share');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: 'x' }, ada)).status, 400);
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: -1 }, ada)).status, 400);
  // A law entry is news but not an election.
  const law = await seed('law', 'The assembly passed a law: the fare is 200.');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: law }, ada)).code, 'nothing_to_share');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'news', record: law }, ada)).ok, true);
});

test('privacy: a card holds the public line and the sharer’s shown name only, nothing else of the stored record', async (t) => {
  const { f, ada, post, seed } = await harness(t);
  const n = await seed('term', 'Ada Obi is the new Chairman of Lagos.');
  const made = await post('/api/growth/share', { cityId: 'lagos', kind: 'election', record: n }, ada);
  const html = await (await fetch(`${f.base}/s/${made.share.code}`)).text();
  const stored = JSON.stringify(await f.server.store.read((db) => (db as unknown as { growth: { shares: unknown } }).growth.shares));
  for (const text of [html, stored]) {
    assert.ok(!text.includes(ada.cookie.slice(4)), 'no session secret');
    const found = /voters|"hash"|"prev"|e-?mail|"device/i.exec(text)?.[0];
    assert.equal(found, undefined, 'nothing of the record but its sentence, no device or e-mail');
  }
  assert.deepEqual(Object.keys(made.share.facts).sort(), ['city', 'days', 'district', 'done', 'event', 'game', 'headline', 'kind', 'name', 'partner', 'record', 'stamps', 'tableId', 'title', 'total', 'venue', 'won']);
  assert.ok(!/₦|naira|\$\d/.test(`${tag(html, 'og:title')} ${made.share.facts.headline}`), 'no amounts of money in the card (the open launch offer, which is public, may end the description)');
});

test('a resident wedding that was announced and has opened can be shared; the card carries the two public names and the city only', async (t) => {
  const { f, ada, post } = await harness(t);
  const event = (id: string, announced: boolean, opened: boolean) => ({ id, kind: 'wedding', city: 'lagos', room: 'x', label: 'The Square', who: ['resident.lagos.a', 'resident.lagos.b'], names: ['Kemi', 'Femi'], guests: [], at: f.now(), until: f.now() + 1, colour: 'green', announced, opened, done: false });
  await f.server.store.transact((db) => { (db as Record<string, unknown>)['bonds'] = { v: 1, day: 1, seq: 3, pairs: { 'resident.lagos.a|resident.lagos.b': { a: 'resident.lagos.a', b: 'resident.lagos.b', c: 91, quarrel: 4 } }, events: [event('w-1', true, true), event('w-2', false, true), event('w-3', true, false)], log: [], departed: [], calls: { day: 1, n: 0 } }; });
  const made = await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding', wedding: 'w-1' }, ada);
  assert.equal(made.ok, true, made.reason);
  assert.equal(made.share.facts.name, 'Kemi');
  assert.equal(made.share.facts.partner, 'Femi');
  const html = await (await fetch(`${f.base}/s/${made.share.code}`)).text();
  assert.match(tag(html, 'og:title') ?? '', /Kemi and Femi just got married/);
  assert.equal(tag(html, 'og:image'), 'https://play.example/og/card-wedding.png');
  assert.ok(!/91|quarrel|closeness|resident\.lagos/i.test(html), 'nothing of the bond is on the card');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding', wedding: 'w-2' }, ada)).code, 'nothing_to_share', 'not announced: not public');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding', wedding: 'w-3' }, ada)).code, 'nothing_to_share', 'not yet opened');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding', wedding: 'w-9' }, ada)).code, 'nothing_to_share');
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding', wedding: '../x' }, ada)).status, 400);
});

test('a wedding has nothing to share until the game has marriages; its card is ready for them', async (t) => {
  const { post, ada } = await harness(t);
  assert.equal((await post('/api/growth/share', { cityId: 'lagos', kind: 'wedding' }, ada)).code, 'nothing_to_share');
  const html = sharePageHtml({ by: ADA, facts: cleanFacts({ kind: 'wedding', name: 'Ada', partner: 'Bola', city: 'Lagos' }) }, 'abcdefghij', 'https://play.example');
  assert.match(tag(html, 'og:title') ?? '', /Ada and Bola just got married/);
  assert.equal(tag(html, 'og:image'), 'https://play.example/og/card-wedding.png');
  assert.ok(html.includes(`url=/?join=${ADA}&amp;ref=abcdefghij"`));
});

test('hostile words are escaped on every kind of card, in the tags and in the page', () => {
  for (const kind of SHARE_KINDS) {
    const html = sharePageHtml({ by: ADA, facts: cleanFacts({ kind, name: EVIL, partner: EVIL, headline: EVIL, event: EVIL, game: EVIL, venue: EVIL, city: EVIL, district: EVIL }) }, 'abcdefghij', 'https://play.example');
    assert.ok(!html.includes('<script>') && !html.includes('alert(1)</script>'), `${kind}: the script tag is text`);
    assert.ok(!/content="[^"]*"[^>]*"><script/.test(html), `${kind}: no attribute is broken out of`);
    assert.match(tag(html, 'og:title') ?? '', /&lt;script&gt;|&quot;&gt;/, `${kind}: the title carries the escaped text`);
    assert.match(tag(html, 'og:image') ?? '', /^https:\/\/play\.example\/og\/[a-z-]+\.(png|jpg)$/, `${kind}: an absolute image`);
  }
});

test('an unknown or expired link is a generic card, not an error page', async (t) => {
  const { f } = await harness(t);
  const res = await fetch(`${f.base}/s/aaaaaaaaaa`);
  const html = await res.text();
  assert.equal(res.status, 404);
  assert.match(tag(html, 'og:title') ?? '', /Allworld/);
  assert.equal(tag(html, 'og:image'), 'https://play.example/og/allworld.jpg');
  assert.ok(html.includes('content="0;url=/"'));
  assert.equal((await fetch(`${f.base}/s/not-a-code`)).status, 404);
  assert.match(sharePageHtml(null, 'aaaaaaaaaa', 'https://play.example', null, 'utm_source=share'), /og:title" content="Allworld/);
});

test('a table win card has its own picture and keeps the table link', () => {
  const html = sharePageHtml({ by: ADA, facts: cleanFacts({ kind: 'table', name: 'Ada', game: 'Whot', won: true, city: 'Lagos', tableId: 'buka-whot' }) }, 'abcdefghij', 'https://play.example', null, 'utm_source=share&utm_medium=card&utm_campaign=table');
  assert.equal(tag(html, 'og:image'), 'https://play.example/og/card-table.png');
  assert.ok(html.includes(`url=/?join=${ADA}&amp;ref=abcdefghij&amp;table=buka-whot&amp;utm_source=share&amp;utm_medium=card&amp;utm_campaign=table"`));
});

test('the preview pictures exist, are PNG, 1200x630 and well under 100 KB', () => {
  for (const kind of ['table', 'wedding', 'election', 'news']) {
    const path = new URL(`../public${cardImage(kind).path}`, import.meta.url);
    assert.ok(statSync(path).size < 100 * 1024, `${kind} is small`);
  }
  assert.deepEqual(cardImage('missions'), { path: '/og/allworld.jpg', type: 'image/jpeg' });
});

test('the share link and text carry the ad-source words in the owner’s utm convention', () => {
  const link = shareUrl('https://play.example/s/abcdefghij', 'election');
  assert.equal(link, 'https://play.example/s/abcdefghij?utm_source=share&utm_medium=card&utm_campaign=election');
  assert.equal(shareUrl('https://x.example/s/abcdefghij', 'table', 'whatsapp'), 'https://x.example/s/abcdefghij?utm_source=share&utm_medium=whatsapp&utm_campaign=table');
  const text = shareText({ kind: 'election', name: 'Ada', headline: 'Ada Obi is the new Chairman of Lagos.', city: 'Lagos' }, link);
  assert.equal(text.split('\n').at(-1), link, 'the link is the last line');
  assert.match(text, /Chairman of Lagos/);
  // The words the page passes on are cleaned by the same rule the growth counts use; hostile words become nothing useful.
  assert.equal(sourceQuery(new URLSearchParams('utm_source=Share&utm_medium=card&utm_campaign=election')), 'utm_source=share&utm_medium=card&utm_campaign=election');
  assert.equal(sourceQuery(new URLSearchParams('utm_source=%22%3E%3Cscript%3E&utm_campaign=x')), 'utm_source=direct&utm_medium=direct&utm_campaign=x');
  assert.equal(sourceQuery(new URLSearchParams('')), '');
  assert.deepEqual(cleanSource({ source: 'share', medium: 'card', campaign: 'election' }), { source: 'share', medium: 'card', campaign: 'election', content: 'none' });
});

test('the deep link resolves to the right place for a new visitor and a returning player', () => {
  const code = 'abcdefghij', query = 'utm_source=share&utm_medium=card&utm_campaign=';
  const open = (target: string) => { const url = new URL(target, 'https://play.example'); return { join: joinIdFrom(url.pathname, url.search), ...linkParts(url.pathname, url.search), go: goFrom(url.search), source: url.searchParams.get('utm_source') }; };
  // An election or news card opens the Governor panel (the landing keeps `go` and does not place the visitor beside the sharer).
  for (const kind of ['election', 'news']) assert.deepEqual(open(shareTarget({ by: ADA, facts: { kind } }, code, `${query}${kind}`)), { join: null, ref: code, table: null, go: 'governor', source: 'share' });
  // A table card lands at that table; a win without a table lands beside the winner; a wedding beside the couple.
  assert.deepEqual(open(shareTarget({ by: ADA, facts: { kind: 'table', tableId: 'buka-whot' } }, code, `${query}table`)), { join: ADA, ref: code, table: 'buka-whot', go: null, source: 'share' });
  assert.deepEqual(open(shareTarget({ by: ADA, facts: { kind: 'table', won: true, game: 'Whot' } }, code)), { join: ADA, ref: code, table: null, go: null, source: null });
  assert.deepEqual(open(shareTarget({ by: ADA, facts: { kind: 'wedding', partner: 'Bola' } }, code)), { join: ADA, ref: code, table: null, go: null, source: null });
  // No sharer, or no card: the home page.
  assert.equal(shareTarget({ by: 'nope', facts: { kind: 'table' } }, code), '/');
  assert.equal(shareTarget(null, code), '/');
  // The same links the sheet's Share buttons send: only the kinds with a record entry can be shared from the Hall of Records.
  assert.deepEqual(['term', 'law', 'party', 'impeachment', 'ruling', 'operator'].map((kind) => momentKind(kind as never)), ['election', 'news', 'news', 'news', null, null]);
});
