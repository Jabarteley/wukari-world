import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
// OWNER: danfo — Drive a danfo (docs/DANFO.md), the server half: a run is settled from the stops the server recorded and timed itself,
// paid in game naira once, capped per run and per day, ranked on the line's weekly board, told in the gist; a crew rides along and the
// conductor collects a share; erasure leaves nothing behind.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import { ROUTE_MODULES } from './routes/index.ts';
import danfoRoutes from './routes/danfo.ts';
import { forgetDanfoPlayers, peekDanfo } from './danfo/service.ts';
import { peekGist } from './gist/ledger.ts';
import { minRunMs, routeById } from '../src/danfo/routes.ts';
import { DAY_CAP, RUN_CAP, conductorShare, manifest, tally } from '../src/danfo/run.ts';
import type { StopCall } from '../src/danfo/run.ts';
import { dayOf } from '../src/danfo/board.ts';
import type { DanfoPark, DanfoRunView } from '../src/types/danfo.ts';
import type { Look } from '../src/types/life.ts';

type F = Awaited<ReturnType<typeof fixture>>;
type Player = { cookie: string; id: string };
type Json = Record<string, any>;
const LOOK: Look = { body: 'woman', hair: 'braids', outfit: 'casual', fabric: 'plain', skin: 'skin-4', hairColor: 'black', outfitColor: 'blue', bottomsColor: 'navy' };
const LINE = routeById('lagos-ikorodu-road')!, LAST = LINE.stops.length - 1;

async function onboard(f: F, name: string): Promise<Player> {
  const created = await f.request('/api/session', { name, onboarding: true });
  const value = await created.json() as { session?: { id?: string } };
  const player = { cookie: (created.headers.get('set-cookie') ?? '').split(';')[0] ?? '', id: value.session?.id ?? '' };
  assert.equal((await f.action(player.cookie, { type: 'onboarding.quick-start', payload: { look: LOOK } })).code, 'playing');
  return player;
}
const post = async (f: F, path: string, body: object, player: Player): Promise<Json> => (await f.request(`/api/danfo/${path}`, body, player.cookie)).json() as Promise<Json>;
const get = async (f: F, path: string, player: Player): Promise<Json> => (await f.request(`/api/danfo/${path}`, null, player.cookie)).json() as Promise<Json>;
const cash = (f: F, player: Player): Promise<number> => f.server.store.read((db) => Object.values(db.sessions).find((s) => s.publicId === player.id)?.cities.lagos?.state.cash ?? -1);

/** Drives a run honestly: each stop reported no sooner than the top speed allows. */
async function drive(f: F, player: Player, run: DanfoRunView, calls: StopCall[] = Array.from({ length: LAST }, () => 'served')): Promise<Json> {
  let served = 0, last: Json = {};
  for (let stop = 1; stop <= LAST; stop++) {
    const due = run.startedAt + minRunMs(LINE, stop, served) + 200;
    if (f.now() < due) f.advance(due - f.now());
    last = await post(f, 'stop', { runId: run.id, stop, call: calls[stop - 1] }, player);
    assert.equal(last.ok, true, last.reason);
    if (calls[stop - 1] === 'served') served++;
  }
  return last;
}
async function start(f: F, player: Player): Promise<DanfoRunView> {
  const started = await post(f, 'start', { cityId: 'lagos', routeId: LINE.id, requestId: f.id() }, player);
  assert.equal(started.ok, true, started.reason);
  return started.run as DanfoRunView;
}

test('a danfo run: the park, a run too fast to be true, an honest run paid once from the server\'s own record, the board and the gist', async (t) => {
  assert.ok(ROUTE_MODULES.includes(danfoRoutes), 'the danfo module is registered');
  const f = await fixture(t), ada = await onboard(f, 'Ada');
  const park = await get(f, 'park?city=lagos', ada) as DanfoPark & { ok: boolean };
  assert.equal(park.ok, true);
  assert.equal(park.open, true);
  assert.equal(park.hub, 'Ojota Motor Park');
  assert.deepEqual(park.lines.map((line) => line.id), ['lagos-ikorodu-road', 'lagos-oshodi-mile2', 'lagos-cms-ajah']);
  assert.ok(park.traffic > 0 && park.traffic <= 1);
  assert.equal(park.mine, null);
  assert.equal((await post(f, 'start', { cityId: 'lagos', routeId: 'accra-circle-madina', requestId: f.id() }, ada)).code, 'unknown_route');

  // Reaching a stop sooner than a danfo can voids the run: nothing is paid.
  const fast = await start(f, ada);
  assert.equal(fast.next, 1);
  assert.equal((await post(f, 'start', { cityId: 'lagos', routeId: LINE.id, requestId: f.id() }, ada)).code, 'run_live', 'one run at a time');
  const cheat = await post(f, 'stop', { runId: fast.id, stop: 1, call: 'served' }, ada);
  assert.equal(cheat.code, 'too_fast');
  assert.equal((await get(f, `run?id=${fast.id}`, ada)).run.status, 'void');
  assert.equal((await post(f, 'finish', { runId: fast.id, requestId: f.id(), hardBrakes: 0, crashes: 0 }, ada)).code, 'run_over');

  // An honest run: the stops in order, timed by the server.
  const before = await cash(f, ada);
  const run = await start(f, ada);
  assert.equal((await post(f, 'stop', { runId: run.id, stop: 2, call: 'served' }, ada)).code, 'out_of_order');
  const calls: StopCall[] = Array.from({ length: LAST }, (_, i) => (i === 2 ? 'passed' : 'served'));
  await drive(f, ada, run, calls);
  // A repeat of a stop report already taken is harmless.
  assert.equal((await post(f, 'stop', { runId: run.id, stop: LAST, call: 'served' }, ada)).ok, true);
  const requestId = f.id();
  const done = await post(f, 'finish', { runId: run.id, requestId, hardBrakes: 2, crashes: 0 }, ada);
  assert.equal(done.ok, true, done.reason);
  const settled = done.run as DanfoRunView;
  assert.equal(settled.status, 'settled');
  const ms = settled.result!.ms;
  const expected = tally(LINE, manifest(run.seed, LINE, run.traffic), { calls, hardBrakes: 2, crashes: 0, ms, riders: 0, conductor: false });
  assert.equal(settled.result!.earned, expected.earned, 'the server settles with the shared arithmetic, from its own record of the stops');
  assert.equal(settled.result!.paid, expected.earned);
  assert.ok(expected.earned > 0 && expected.earned <= RUN_CAP);
  assert.equal(settled.result!.passed > 0, expected.passedBusy > 0);
  assert.equal(await cash(f, ada), before + expected.earned, 'paid in game naira into the life');
  // The same finish again, or a new request for the same run, pays nothing more.
  const again = await post(f, 'finish', { runId: run.id, requestId, hardBrakes: 0, crashes: 0 }, ada);
  assert.equal(again.duplicate, true);
  assert.equal((await post(f, 'finish', { runId: run.id, requestId: f.id(), hardBrakes: 0, crashes: 0 }, ada)).ok, true);
  assert.equal(await cash(f, ada), before + expected.earned, 'never paid twice');
  assert.equal(settled.result!.place, 1);

  // The weekly board and the gist line for the new first place.
  const board = await get(f, `board?route=${LINE.id}`, ada);
  assert.equal(board.ok, true);
  assert.equal(board.you, 1);
  assert.equal(board.rows[0].earned, expected.earned);
  assert.equal(board.rows[0].name, 'Ada', 'a driver sees their own name');
  assert.equal('id' in board.rows[0], false, 'no player id leaves the server');
  const line = await f.server.store.read((db) => (peekGist(db).cities.lagos ?? []).find((item) => item.text.includes('Ikorodu Road run')));
  assert.ok(line, 'the gist tells the city');
  assert.match(line!.text, /made ₦[\d,]+ on the Ikorodu Road run$/);
  assert.ok(!JSON.stringify(line).includes(ada.id), 'no player id in the gist');
  const parkAfter = await get(f, 'park?city=lagos', ada);
  assert.equal(parkAfter.today.earned, expected.earned);
  assert.equal(parkAfter.today.runs, 1);
  assert.equal(parkAfter.lines[0].best.earned, expected.earned);
});

test('a danfo run: the last stop must be served, the day cap holds, and leaving pays nothing', async (t) => {
  const f = await fixture(t), ada = await onboard(f, 'Ada');
  const run = await start(f, ada);
  let served = 0;
  for (let stop = 1; stop < LAST; stop++) {
    f.advance(run.startedAt + minRunMs(LINE, stop, served) + 200 - f.now());
    assert.equal((await post(f, 'stop', { runId: run.id, stop, call: 'served' }, ada)).ok, true);
    served++;
  }
  f.advance(run.startedAt + minRunMs(LINE, LAST, served) + 200 - f.now());
  assert.equal((await post(f, 'stop', { runId: run.id, stop: LAST, call: 'passed' }, ada)).code, 'invalid_request');
  assert.equal((await post(f, 'finish', { runId: run.id, requestId: f.id(), hardBrakes: 0, crashes: 0 }, ada)).code, 'not_finished');
  // Leaving the run: closed, nothing paid.
  const before = await cash(f, ada);
  assert.equal((await post(f, 'abandon', { runId: run.id }, ada)).run.status, 'closed');
  assert.equal(await cash(f, ada), before);

  // Near the day's cap, a run pays only what is left of it.
  await f.server.store.transact((db) => { (db as Json).danfo.days[ada.id] = { day: dayOf(f.now()), earned: DAY_CAP - 100, runs: 2 }; });
  const capped = await start(f, ada);
  await drive(f, ada, capped);
  const done = await post(f, 'finish', { runId: capped.id, requestId: f.id(), hardBrakes: 0, crashes: 0 }, ada);
  assert.equal(done.run.result.paid, 100);
  assert.equal(done.run.result.capped, true);
  assert.equal(await cash(f, ada), before + 100);
  assert.equal((await get(f, 'park?city=lagos', ada)).today.earned, DAY_CAP);
});

test('a danfo crew: a friend rides as the conductor, shouts the stops, and collects a share once; erasure forgets everyone', async (t) => {
  const f = await fixture(t), ada = await onboard(f, 'Ada'), bola = await onboard(f, 'Bola'), chidi = await onboard(f, 'Chidi');
  const run = await start(f, ada);
  const park = await get(f, 'park?city=lagos', bola);
  assert.deepEqual(park.leaving.map((item: Json) => item.id), [run.id], 'a run leaving now is listed for others in the city');
  assert.equal((await post(f, 'join', { runId: run.id, role: 'conductor' }, ada)).code, 'own_run');
  const joined = await post(f, 'join', { runId: run.id, role: 'conductor' }, bola);
  assert.equal(joined.ok, true, joined.reason);
  assert.equal(joined.run.you, 'conductor');
  assert.equal((await post(f, 'join', { runId: run.id, role: 'conductor' }, chidi)).code, 'conductor_taken');
  assert.equal((await post(f, 'join', { runId: run.id, role: 'passenger' }, chidi)).ok, true);
  assert.equal((await post(f, 'shout', { runId: run.id }, chidi)).code, 'not_conductor');
  const shout = await post(f, 'shout', { runId: run.id }, bola);
  assert.equal(shout.ok, true);
  assert.match(shout.run.shouts[0].line, /Maryland|Obalende/);
  assert.equal((await post(f, 'shout', { runId: run.id }, bola)).code, 'too_soon');
  const seen = await get(f, `run?id=${run.id}`, ada);
  assert.equal(seen.run.crew.length, 2);
  assert.equal(seen.run.shouts.length, 1, 'the driver sees the conductor\'s calls');
  assert.equal((await post(f, 'collect', { runId: run.id, requestId: f.id() }, bola)).code, 'not_finished');

  await drive(f, ada, run);
  const done = await post(f, 'finish', { runId: run.id, requestId: f.id(), hardBrakes: 0, crashes: 0 }, ada);
  const result = done.run.result;
  const expected = tally(LINE, manifest(run.seed, LINE, run.traffic), { calls: Array.from({ length: LAST }, () => 'served'), hardBrakes: 0, crashes: 0, ms: result.ms, riders: 1, conductor: true });
  assert.equal(result.earned, expected.earned);
  assert.equal(result.crewBonus, expected.crewBonus);
  assert.ok(result.crewBonus >= 150 + Math.round(result.fares * 0.1));

  const before = await cash(f, bola);
  const requestId = f.id();
  const share = await post(f, 'collect', { runId: run.id, requestId }, bola);
  assert.equal(share.ok, true, share.reason);
  assert.equal(share.paid, conductorShare(result.fares));
  assert.equal(share.run.share, share.paid);
  assert.equal(await cash(f, bola), before + share.paid);
  assert.equal((await post(f, 'collect', { runId: run.id, requestId: f.id() }, bola)).paid, share.paid, 'a second collect reports the first');
  assert.equal(await cash(f, bola), before + share.paid, 'collected once');
  assert.equal((await post(f, 'collect', { runId: run.id, requestId: f.id() }, chidi)).code, 'not_conductor');

  await f.server.store.transact((db) => forgetDanfoPlayers(db, new Set([ada.id, bola.id, chidi.id])));
  const left = await f.server.store.read((db) => JSON.stringify(peekDanfo(db)));
  for (const player of [ada, bola, chidi]) assert.ok(!left.includes(player.id), 'no trace of an erased player');
});
