// The city gist and the world ledger (server/gist, docs/GIST.md): what may enter, what never does, the limits, the sources, the route and the share card.
import assert from 'node:assert/strict';
import test from 'node:test';
import { fixture, snapshot } from '../test-fixture.ts';
import { ROUTE_MODULES } from '../routes/index.ts';
import { harness } from '../testing/politicsHarness.ts';
import { loadCityContent } from '../../src/game/cities/registry.ts';
import { eventsAt } from '../../src/game/calendar.ts';
import { QUORUM } from '../../src/game/content/politics.ts';
import { JOURNEY_TIME } from '../testing/cityJourney.ts';
import { append, recordsOf } from '../records/store.ts';
import { announceOf } from '../admin/announce.ts';
import { CITY_MAX, KEEP_MS, THRESHOLDS, TICK_MS, TOTAL_MAX, WORLD, gistOf, gistService, peekGist, search } from './ledger.ts';
import type { GistItem } from './ledger.ts';
import type { AnnouncementRecord } from '../admin/store.ts';
import type { RouteContext, RouteModule } from '../types.ts';

await Promise.all(['lagos', 'ibadan'].map(loadCityContent));

/** A server whose context the test can reach, with the age answers the test chooses (the real ones live in the growth store). */
async function scene(t: Parameters<typeof fixture>[0], adults: string[] = ['ada', 'tunde', 'chi']) {
  let grabbed: RouteContext | null = null;
  const module: RouteModule = (ctx) => { grabbed = ctx; return {}; };
  const f = await fixture(t, { routes: [...ROUTE_MODULES, module] });
  const ctx = grabbed as RouteContext | null;
  assert.ok(ctx);
  const ids = new Set(adults);
  (ctx.checks ??= {}).adult = (_db, id) => ids.has(id);
  const gist = gistService(ctx);
  const add = (entry: Parameters<typeof gist.add>[1]) => f.server.store.transact((db) => gist.add(db, entry));
  const all = (): Promise<GistItem[]> => f.server.store.read((db) => Object.values(snapshot(peekGist(db).cities)).flat().sort((a, b) => a.n - b.n));
  const texts = async (): Promise<string[]> => (await all()).map((item) => item.text);
  const get = async (path: string, cookie?: string): Promise<{ status: number; body: Record<string, unknown>; cache: string | null }> => {
    const response = await fetch(f.base + path, { headers: cookie ? { Cookie: cookie } : {} });
    return { status: response.status, body: await response.json() as Record<string, unknown>, cache: response.headers.get('cache-control') };
  };
  return { f, ctx, gist, add, all, texts, get, ids };
}

test('privacy: an adult is named; a minor or an unknown age is "a resident"; a hidden player, a money sign and an unknown city leave nothing', async (t) => {
  const s = await scene(t);
  await s.add({ city: 'lagos', kind: 'business', text: '{0} opened a food stall in Yaba Market', people: [{ id: 'ada', name: 'Ada' }] });
  await s.add({ city: 'lagos', kind: 'business', text: '{0} opened a food stall in Yaba Market', people: [{ id: 'kid', name: 'Kunle' }] });
  assert.equal(await s.add({ city: 'lagos', kind: 'jail', text: '{0} was arrested', people: [{ id: 'kid', name: 'Kunle' }], minors: 'skip' }), null, 'a minor is not in a jail line at all');
  assert.equal(await s.add({ city: 'lagos', kind: 'jail', text: '{0} was arrested', people: [{ id: 'nobody', name: 'Unknown' }], minors: 'skip' }), null, 'an unknown age is treated like a minor');
  // A player who hid themselves from the directory is in no line from then on, even an adult one.
  await s.f.server.store.transact((db) => { (s.ctx.collection(db, 'civic') as { prefs: Record<string, object> }).prefs = { ada: { directory: true } }; });
  assert.equal(await s.add({ city: 'lagos', kind: 'business', text: '{0} opened a stall', people: [{ id: 'ada', name: 'Ada' }] }), null);
  assert.equal(await s.add({ city: 'lagos', kind: 'business', text: 'A stall earned ₦5,000 today' }), null, 'no amounts of money');
  assert.equal(await s.add({ city: 'lagos', kind: 'business', text: 'Someone paid 300 naira' }), null);
  assert.ok(await s.add({ city: 'lagos', kind: 'law', text: 'The House passed a law: bus fare is ₦200', publicAmount: true }), 'an amount the public record already shows may stay');
  assert.equal(await s.add({ city: 'atlantis', kind: 'busy', text: 'Atlantis is buzzing' }), null);
  assert.equal(await s.add({ city: 'lagos', kind: 'busy', text: '{1} is here', people: [{ id: 'tunde', name: 'Tunde' }] }), null, 'a placeholder with no person is refused rather than shown');
  assert.deepEqual(await s.texts(), ['Ada opened a food stall in Yaba Market', 'A resident opened a food stall in Yaba Market', 'The House passed a law: bus fare is ₦200']);
  assert.equal((await s.all()).some((item) => JSON.stringify(item).includes('kid') || JSON.stringify(item).includes('Kunle')), false, 'no id and no minor name is stored');
});

test('the same keyed line is written once; a line is plain text of bounded size', async (t) => {
  const s = await scene(t);
  assert.ok(await s.add({ city: 'lagos', kind: 'event', text: 'Owambe has started', refs: { key: 'e1' } }));
  assert.equal(await s.add({ city: 'lagos', kind: 'event', text: 'Owambe has started', refs: { key: 'e1' } }), null);
  const long = await s.add({ city: 'lagos', kind: 'other', text: `  a\n\t${'word '.repeat(80)}`, refs: { key: 'long', note: 'x'.repeat(200), x: 1, y: 2, z: 3, w: 4 } });
  assert.ok(long && long.text.length <= 120 && !/[\n\t]/.test(long.text) && long.text.startsWith('A word'));
  assert.ok(Object.keys(long.refs ?? {}).length <= 4 && String(long.refs?.note).length <= 60);
});

test('size and expiry: at most 200 a city and 14 days, pruned on write', async (t) => {
  const s = await scene(t);
  for (let i = 0; i < CITY_MAX + 15; i++) await s.f.server.store.transact((db) => { s.gist.add(db, { city: 'lagos', kind: 'other', text: `Lagos thing ${i}` }); }, { durable: false });
  let all = await s.all();
  assert.equal(all.length, CITY_MAX);
  assert.equal(all[0]?.text, 'Lagos thing 15', 'the oldest were dropped first');
  assert.equal(all.at(-1)?.n, CITY_MAX + 15, 'numbers are never reused');
  s.f.advance(KEEP_MS - 1000);
  await s.add({ city: 'ibadan', kind: 'other', text: 'Ibadan thing' });
  assert.equal((await s.all()).length, CITY_MAX + 1, 'nothing has expired yet');
  s.f.advance(2000);
  await s.add({ city: 'ibadan', kind: 'other', text: 'Another Ibadan thing' });
  all = await s.all();
  assert.deepEqual(all.map((item) => item.text), ['Ibadan thing', 'Another Ibadan thing'], 'the old lines are gone, the newer one stays');
  assert.ok(TOTAL_MAX >= CITY_MAX);
  // The total is capped too: many cities cannot grow the collection without end.
  await s.f.server.store.transact((db) => {
    const g = gistOf(s.ctx, db);
    g.cities = {};
    for (let c = 0; c < 20; c++) g.cities[`c${c}`] = Array.from({ length: CITY_MAX }, (_, i) => ({ n: c * 1000 + i + 1, at: s.f.now() - (c * 1000 + i), city: `c${c}`, kind: 'other' as const, text: 'x' }));
    s.gist.add(db, { city: 'lagos', kind: 'other', text: 'One more' });
  });
  assert.ok((await s.all()).length <= TOTAL_MAX);
});

test('search and read: words in any order, the city and the world only, newest first, at most five', async (t) => {
  const s = await scene(t);
  await s.add({ city: 'lagos', kind: 'election', text: '{0} was elected governor of Lagos', people: [{ id: 'tunde', name: 'Tunde' }] });
  await s.add({ city: 'ibadan', kind: 'election', text: '{0} was elected governor of Ibadan', people: [{ id: 'chi', name: 'Chi' }] });
  await s.add({ city: WORLD, kind: 'busy', text: 'The Square is packed right now' });
  for (let i = 0; i < 7; i++) await s.add({ city: 'lagos', kind: 'business', text: `Chi opened stall number ${i} in Yaba` });
  const found = await s.f.server.store.read((db) => ({
    tunde: s.gist.search(db, 'lagos', 'did Tunde win governor?').map((item) => item.text),
    ibadan: s.gist.search(db, 'lagos', 'Chi governor').map((item) => item.text),
    square: s.gist.search(db, 'ibadan', 'square').map((item) => item.text),
    many: s.gist.search(db, 'lagos', 'yaba').length,
    none: s.gist.search(db, 'lagos', 'the was is').length,
    recent: s.gist.recent(db, 'ibadan').map((item) => item.text),
  }));
  assert.deepEqual(found.tunde, ['Tunde was elected governor of Lagos']);
  assert.deepEqual(found.ibadan, [], 'another city\'s line is not found from Lagos');
  assert.deepEqual(found.square, ['The Square is packed right now'], 'the world\'s lines belong to every city');
  assert.equal(found.many, 5);
  assert.equal(found.none, 0, 'only filler words asks for nothing');
  assert.deepEqual(found.recent, ['The Square is packed right now', 'Chi was elected governor of Ibadan']);
  assert.deepEqual(search(peekGist({} as never), 'lagos', 'x'), []);
});

test('sources: the public record, a busy city, a live event and an announcement reach the ledger on the heartbeat; private things do not', async (t) => {
  const s = await scene(t);
  THRESHOLDS.busy = 1;
  t.after(() => { THRESHOLDS.busy = 8; });
  // A private message between two players, and a report: neither is anywhere near the ledger.
  const ada = await s.f.device('Ada'), bola = await s.f.device('Bola');
  for (const d of [ada, bola]) await s.f.request('/api/life?city=lagos', null, d.cookie);
  s.ids.add(ada.id);
  await s.f.request('/api/social/message', { to: bola.id, message: 'my secret plan for 5000 naira', text: 'my secret plan for 5000 naira', cityId: 'lagos', clientId: s.f.id() }, ada.cookie);
  // The public record: a term, a law, a party, a removal, a ruling and an operator note, and a term that did not count.
  await s.f.server.store.transact((db) => {
    const records = recordsOf(s.ctx, db), at = s.f.now();
    append(records, at, { kind: 'term', scope: 'city:lagos', scopeName: 'Lagos', week: 1, title: 'Governor Tunde (independent) held Lagos for the week of 1 Oct, elected with 12 of 30 votes.', facts: { winnerId: 'tunde', winner: 'Tunde', votes: 12, void: false } });
    append(records, at, { kind: 'term', scope: 'city:lagos', scopeName: 'Lagos', week: 2, title: 'Lagos had no Governor for the week of 8 Oct: 1 vote cast and 5 needed, so the election did not count.', facts: { winnerId: null, winner: null, votes: 0, void: true } });
    append(records, at, { kind: 'law', scope: 'city:lagos', scopeName: 'Lagos', week: 2, title: 'The City House passed a law: Market levy is 4% for the week (7 of 9 votes, signed by Tunde).', facts: { lever: 'levy', value: 4, proposedBy: 'Tunde' } });
    append(records, at, { kind: 'party', scope: 'world', scopeName: 'Nigeria', week: null, title: 'Chi founded the Good Road Party: “Fix it”', facts: { party: 'Good Road Party', partyId: 'p1', founder: 'Chi', founderId: 'chi' } });
    append(records, at, { kind: 'impeachment', scope: 'city:ibadan', scopeName: 'Ibadan', week: 1, title: 'Governor Tunde of Ibadan was removed by petition, with 20 signatures.', facts: { removed: 'Tunde', removedId: 'tunde', signatures: 20 } });
    append(records, at, { kind: 'ruling', scope: 'city:lagos', scopeName: 'Lagos', week: null, title: 'Judge Chi upheld the arrest of Dayo by Ada: a long note', facts: { defendant: 'Dayo' } });
    append(records, at, { kind: 'operator', scope: 'world', scopeName: 'Allworld', week: null, title: 'An operator removed a name: reason', facts: { reason: 'x' } });
  });
  // A player in Lagos makes the city busy.
  const socket = await s.f.joinRoom(ada);
  assert.equal(await s.gist.tick(), 5, `four record lines and the busy city (the ruling, the operator note and the void term are left out): ${JSON.stringify(await s.texts())}`);
  const lines = await s.texts();
  assert.deepEqual(lines.filter((line) => !line.includes('buzzing')).sort(), [
    'Chi founded the Good Road Party', 'The City House passed a law: Market levy is 4% for the week', 'Tunde was elected governor of Lagos', 'Tunde was removed from office in Ibadan by petition',
  ]);
  assert.ok(lines.includes('Lagos is buzzing: 1 person out right now'));
  assert.equal(lines.some((line) => /secret|5000|naira|Dayo|reason|signed/.test(line)), false, 'no message, no defendant, no operator reason, no signer');
  // The same things are not written twice; the throttle holds until the next look.
  s.f.advance(TICK_MS + 1);
  assert.equal(await s.gist.tick(), 0);
  // A calendar event that has begun: move the clock to the first moment Lagos has one live.
  let at = Date.UTC(2026, 9, 5, 0, 0);
  while (at < Date.UTC(2026, 10, 5) && !eventsAt(at, 'lagos').length) at += 15 * 60000;
  assert.ok(eventsAt(at, 'lagos').length, 'the calendar has a live event in the month');
  s.f.advance(at - s.f.now());
  assert.ok(await s.gist.tick() >= 1);
  assert.ok((await s.texts()).some((line) => / has started at /.test(line)));
  // An announcement for everyone is news; one for "online now" is not.
  const base = { title: 'Weekend market', body: 'x', action: null, city: null, at: 0, sentAt: 1, expiresAt: Infinity, by: 'admin', createdAt: 0, cancelledAt: 0, reach: { sockets: 0 }, mail: { wanted: false, push: false, email: false, state: 'none', total: 0, sent: 0, failed: 0, cursor: '' } } as const;
  await announceOf(s.ctx).went({ ...base, id: 'a1', audience: 'everyone' } as unknown as AnnouncementRecord);
  await announceOf(s.ctx).went({ ...base, id: 'a2', audience: 'online', title: 'Only for now' } as unknown as AnnouncementRecord);
  const after = await s.texts();
  assert.ok(after.includes('From the Allworld team: Weekend market'));
  assert.equal(after.some((line) => line.includes('Only for now')), false);
  socket.ws.close();
});

test('the route is public, per city, filtered by since, limited and briefly cached', async (t) => {
  const s = await scene(t);
  await s.add({ city: 'lagos', kind: 'other', text: 'One in Lagos' });
  await s.add({ city: 'ibadan', kind: 'other', text: 'One in Ibadan' });
  await s.add({ city: WORLD, kind: 'busy', text: 'One for all' });
  const lagos = await s.get('/api/world/gist?id=lagos');
  assert.equal(lagos.status, 200);
  assert.deepEqual((lagos.body.items as { text: string }[]).map((item) => item.text), ['One for all', 'One in Lagos']);
  assert.equal(lagos.body.latest, 3);
  assert.match(lagos.cache ?? '', /max-age=15/);
  assert.deepEqual(Object.keys((lagos.body.items as object[])[0]!).sort(), ['at', 'city', 'kind', 'n', 'text'], 'a line carries nothing but its words, time, kind and number');
  assert.deepEqual(((await s.get('/api/world/gist?id=lagos&since=2')).body.items as { n: number }[]).map((item) => item.n), [3]);
  assert.deepEqual(((await s.get('/api/world/gist?id=lagos&limit=1')).body.items as unknown[]).length, 1);
  assert.equal((await s.get('/api/world/gist?id=nowhere')).status, 400);
  assert.equal((await s.get('/api/world/gist')).status, 400);
  const empty = await scene(t);
  assert.deepEqual((await empty.get('/api/world/gist?id=lagos')).body.items, []);
});

test('a gist line can be shared as a card made from its words alone; a missing or old line cannot', async (t) => {
  const s = await scene(t);
  const line = await s.add({ city: 'lagos', kind: 'election', text: '{0} was elected governor of Lagos', people: [{ id: 'tunde', name: 'Tunde' }] });
  assert.ok(line);
  const device = await s.f.device('Ada');
  await s.f.request('/api/life?city=lagos', null, device.cookie);
  const share = async (body: object) => (await (await s.f.request('/api/growth/share', { cityId: 'lagos', kind: 'gist', ...body }, device.cookie)).json()) as { code?: string; share?: { code: string; facts: { kind: string; headline: string; record: number; city: string } } };
  const made = await share({ record: line.n });
  assert.equal(made.code, 'shared', JSON.stringify(made));
  assert.deepEqual([made.share?.facts.kind, made.share?.facts.headline, made.share?.facts.record, made.share?.facts.city], ['gist', 'Tunde was elected governor of Lagos', line.n, 'Lagos']);
  const page = await (await s.f.request(`/s/${made.share?.code}`)).text();
  assert.match(page, /Tunde was elected governor of Lagos/);
  assert.match(page, /card-news\.png/);
  assert.equal((await share({ record: 999 })).code, 'nothing_to_share');
  assert.notEqual((await share({})).code, 'shared', 'a request with no number makes no card');
  s.f.advance(KEEP_MS + 1000);
  assert.equal((await share({ record: line.n })).code, 'nothing_to_share', 'an expired line is gone');
});

test('arrests and new stalls reach the gist from their routes: the adult by name, the minor as a resident or not at all, and never a price, a stall name or a sentence', async (t) => {
  const { f, post, get, player, edit, elect } = await harness(t);
  const consent = (d: { cookie: string }, age: 'adult' | 'minor') => f.request('/api/growth/consent', { cityId: 'lagos', age }, d.cookie);
  const atPark = async (name: string, age: 'adult' | 'minor', energy = 100) => {
    const d = await player(name);
    await consent(d, age);
    await edit(d, (state) => { state.location = 'park'; state.needs.energy = energy; });
    await f.joinRoom(d);
    return d;
  };
  const lines = async () => ((await get('/api/world/gist?id=lagos')).items as { text: string; kind: string }[]);
  // A new stall: the adult by name, no stall name, no price.
  const ada = await player('Ada');
  await consent(ada, 'adult');
  assert.equal((await post('/api/business/open', { cityId: 'lagos', venue: 'market', type: 'food', name: 'Mama Put', colour: 'gold', icon: '🍲', requestId: f.id() }, ada)).code, 'opened');
  const stall = (await lines()).find((line) => line.kind === 'business');
  assert.match(stall?.text ?? '', /^Ada opened a food stall in .+$/);
  assert.equal(/Mama Put|₦|\d/.test(stall?.text ?? ''), false);
  const kid = await player('Kunle');
  await consent(kid, 'minor');
  assert.equal((await post('/api/business/open', { cityId: 'lagos', venue: 'market', type: 'provisions', name: 'Kunle Kiosk', colour: 'gold', icon: '🧺', requestId: f.id() }, kid)).code, 'opened');
  assert.ok((await lines()).some((line) => /^A resident opened a provisions kiosk/.test(line.text)), 'a minor is "a resident"');
  assert.equal(JSON.stringify(await lines()).includes('Kunle'), false);

  // An arrest: the offender (an adult) by name; the officer, the offence and the sentence not at all. A minor's arrest is not told.
  const boss = await atPark('Boss', 'adult'), officer = await atPark('Chi', 'adult'), bully = await atPark('Bully', 'adult'), victim = await atPark('Victim', 'adult', 30), child = await atPark('Child', 'minor');
  await elect(boss, 'state:lagos', QUORUM.state);
  assert.equal((await post('/api/politics/justice/enrol', { cityId: 'lagos', tier: 'state', player: officer.id }, boss)).code, 'enrolled');
  const arrestAfterFight = async (attacker: typeof boss) => {
    assert.equal((await post('/api/politics/justice/fight', { cityId: 'lagos', target: victim.id, requestId: f.id() }, attacker)).code, 'won');
    const open = ((await get('/api/politics/justice/overview?city=lagos', attacker)).you as { wanted: { id: string }[] }).wanted[0]?.id ?? '';
    return post('/api/politics/justice/arrest', { cityId: 'lagos', offence: open, requestId: f.id() }, officer);
  };
  assert.equal((await arrestAfterFight(bully)).code, 'arrested');
  const told = (await lines()).filter((line) => line.kind === 'jail').map((line) => line.text);
  assert.deepEqual(told, ['Bully was arrested in Lagos']);
  assert.equal((await arrestAfterFight(child)).code, 'arrested');
  assert.deepEqual((await lines()).filter((line) => line.kind === 'jail').map((line) => line.text), told, 'the child\'s arrest is not in the gist');
  assert.equal(JSON.stringify(await lines()).includes('Chi'), false, 'the officer is not named');
});
