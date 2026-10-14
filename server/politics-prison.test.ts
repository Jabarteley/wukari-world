// OWNER: politics — jail you can play on the Node host (docs/JAIL.md): jobs with a daily cap, community service, parole at half,
// visitors in visiting hours, and an old saved sentence. The pure rules are in server/politics/prison.test.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosTime } from '../src/game/clock.ts';
import { loadCityContent } from '../src/game/cities/registry.ts';
import { QUORUM } from '../src/game/content/politics.ts';
import type { JusticeResponse } from '../src/types/politics.ts';
import { harness } from './testing/politicsHarness.ts';
import type { Device } from './testing/politicsHarness.ts';
import { PRISON } from './politics/prison.ts';

await loadCityContent('lagos');
const MIN = 60000;

async function jailed(t: Parameters<typeof harness>[0], sentenceMin: number) {
  const h = await harness(t);
  const { f, edit, player, elect, post, get } = h;
  const atPark = async (name: string, energy = 100): Promise<Device> => { const device = await player(name); await edit(device, (state) => { state.location = 'park'; state.needs.energy = energy; }); await f.joinRoom(device); return device; };
  const justice = async (device: Device): Promise<JusticeResponse> => (await get('/api/politics/justice/overview?city=lagos', device)) as unknown as JusticeResponse;
  // Land on 11:00 Lagos time, inside visiting hours, whatever hour the fixture starts at.
  const hour = lagosTime(f.now()).hour; f.advance(((PRISON.visitFromHour + 1 - hour + 24) % 24) * 60 * MIN);
  const governor = await atPark('Governor'), ada = await atPark('Ada', 100), bola = await atPark('Bola', 30), chi = await atPark('Chi');
  await elect(governor, 'state:lagos', QUORUM.state);
  assert.equal((await post('/api/politics/justice/enrol', { cityId: 'lagos', tier: 'state', player: chi.id }, governor)).code, 'enrolled');
  assert.equal((await post('/api/politics/decree', { cityId: 'lagos', tier: 'state', lever: 'stateSentence', value: sentenceMin }, governor)).code, 'decreed');
  assert.equal((await post('/api/politics/justice/fight', { cityId: 'lagos', target: bola.id, requestId: f.id() }, ada)).code, 'won');
  const offence = (await justice(ada)).you?.wanted[0]?.id ?? '';
  assert.equal((await post('/api/politics/justice/arrest', { cityId: 'lagos', offence, requestId: f.id() }, chi)).code, 'arrested');
  const work = (device: Device, job: string) => post('/api/politics/justice/prison/work', { cityId: 'lagos', job, requestId: f.id() }, device);
  const parole = (device: Device) => post('/api/politics/justice/prison/parole', { cityId: 'lagos', requestId: f.id() }, device);
  const visit = (device: Device, to: Device) => post('/api/politics/justice/prison/visit', { cityId: 'lagos', to: to.id }, device);
  const record = () => f.server.store.read((db) => db.politics?.justice?.jail[ada.id]);
  return { ...h, ada, bola, chi, governor, justice, work, parole, visit, record };
}

test('jobs take minutes off, wait between repeats, and stop at the daily cap; the sentence never drops below the last minute', { timeout: 90000 }, async (t) => {
  const { f, ada, justice, work, record } = await jailed(t, 100);
  const view = (await justice(ada)).you?.jail?.prison;
  assert.deepEqual(view?.jobs.map((job) => job.id), ['kitchen', 'laundry', 'library']);
  assert.equal(view?.capLeftMin, PRISON.dailyCapMin);
  const before = (await record())?.until ?? 0;
  assert.equal((await work(ada, 'kitchen')).code, 'worked');
  assert.equal((await record())?.until, before - PRISON.jobs.kitchen!.cutMin * MIN);
  assert.equal((await work(ada, 'kitchen')).code, 'job_wait', 'not the same job twice at once');
  assert.equal((await work(ada, 'nonsense')).code, 'no_such_job');
  for (let i = 0; i < 12; i++) { f.advance(4 * MIN); const answer = await work(ada, ['kitchen', 'laundry', 'library'][i % 3] ?? 'kitchen'); if (answer.code === 'job_cap') break; }
  const stored = await record();
  assert.equal(stored?.cutMin, PRISON.dailyCapMin, 'the day’s total is capped');
  f.advance(MIN);
  assert.equal((await work(ada, 'library')).code, 'job_cap');
  assert.equal((await justice(ada)).you?.jail?.prison?.capLeftMin, 0);
});

test('community service: short sentences only, once, and half of what is left', { timeout: 90000 }, async (t) => {
  const short = await jailed(t, 10);
  const left = ((await short.record())?.until ?? 0) - short.f.now();
  assert.equal((await short.work(short.ada, 'service')).code, 'served');
  const after = ((await short.record())?.until ?? 0) - short.f.now();
  assert.ok(after < left * 0.7 && after > left * 0.4, 'about half is taken off');
  assert.equal((await short.work(short.ada, 'service')).code, 'service_done');
});

test('community service is refused for a long sentence', { timeout: 90000 }, async (t) => {
  const long = await jailed(t, 60);
  assert.equal((await long.work(long.ada, 'service')).code, 'service_long');
});

test('parole: refused before half, granted at half with a clean record, refused for good after trouble', { timeout: 90000 }, async (t) => {
  const { f, ada, parole, justice, record, get } = await jailed(t, 40);
  assert.equal((await justice(ada)).you?.jail?.prison?.parole.state, 'wait');
  assert.equal((await parole(ada)).code, 'parole_early');
  f.advance(21 * MIN);
  assert.equal((await justice(ada)).you?.jail?.prison?.parole.state, 'ready');
  assert.equal((await parole(ada)).code, 'paroled');
  assert.equal((await justice(ada)).you?.jail, null);
  assert.equal(await record(), undefined);
  assert.equal((await parole(ada)).code, 'not_jailed');
  void get;
});

test('a report made about a prisoner while inside ends their chance of parole', { timeout: 90000 }, async (t) => {
  const { f, ada, bola, parole, post, record } = await jailed(t, 40);
  const answer = await post('/api/social/reports', { to: ada.id, reason: 'harassment', text: 'Bad words in chat', cityId: 'lagos', clientId: f.id() }, bola);
  void answer;
  await f.server.store.transact((db) => { db.social?.reports.push({ id: 'R-9999', by: bola.id, about: ada.id, aboutName: 'Ada', reason: 'harassment', text: 'x', at: f.now(), status: 'received', evidence: [] }); });
  f.advance(21 * MIN);
  assert.equal((await parole(ada)).code, 'parole_denied');
  assert.equal((await record())?.parole, 'denied');
  assert.equal((await parole(ada)).code, 'parole_denied', 'one hearing per sentence');
});

test('visitors: friends only, inside visiting hours, with a wait between visits', { timeout: 90000 }, async (t) => {
  const { f, ada, bola, chi, visit, record } = await jailed(t, 100);
  assert.equal((await visit(bola, ada)).code, 'friends_only');
  assert.equal((await f.request('/api/social/friends/request', { to: ada.id, cityId: 'lagos' }, bola.cookie)).status < 500, true);
  await f.server.store.transact((db) => { const a = db.social?.players?.[ada.id], b = db.social?.players?.[bola.id]; if (a && b) { a.friends[bola.id] = f.now(); b.friends[ada.id] = f.now(); } });
  const before = (await record())?.until ?? 0;
  const first = await visit(bola, ada);
  assert.equal(first.code, 'visited', JSON.stringify(first).slice(0, 300));
  assert.equal((await record())?.until, before - PRISON.visitCutMin * MIN);
  assert.equal((await visit(bola, ada)).code, 'visit_wait');
  assert.equal((await visit(ada, bola)).code, 'jailed', 'a prisoner cannot visit');
  assert.equal((await visit(bola, chi)).code, 'not_jailed');
  // After hours the door is shut.
  await f.server.store.transact((db) => { const sentence = db.politics?.justice?.jail[ada.id]; if (sentence) delete sentence.visits; });
  f.advance(((PRISON.visitToHour - lagosTime(f.now()).hour + 24) % 24 + 1) * 60 * MIN);
  await f.server.store.transact((db) => { const sentence = db.politics?.justice?.jail[ada.id]; if (sentence) sentence.until = f.now() + 60 * MIN; });
  assert.equal((await visit(bola, ada)).code, 'visiting_closed');
});

test('a sentence saved before this feature has none of the new fields, still shows, and ends by time', { timeout: 90000 }, async (t) => {
  const { f, ada, justice, record, work } = await jailed(t, 30);
  await f.server.store.transact((db) => {
    const sentence = db.politics?.justice?.jail[ada.id]; assert.ok(sentence);
    delete sentence.cutDay; delete sentence.cutMin; delete sentence.jobs; delete sentence.service; delete sentence.parole; delete sentence.visits;
  });
  const old = await record();
  assert.ok(old && old.cutMin === undefined && old.jobs === undefined);
  const prison = (await justice(ada)).you?.jail?.prison;
  assert.equal(prison?.capLeftMin, PRISON.dailyCapMin);
  assert.equal((await work(ada, 'laundry')).code, 'worked');
  f.advance(31 * MIN);
  assert.equal((await justice(ada)).you?.jail, null, 'it ends by time like any sentence');
});
