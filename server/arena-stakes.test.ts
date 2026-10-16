// OWNER: games (real-time) — arena stakes against a real server and real sockets (src/arena/stakes.ts, server/growth/arena-stakes.ts):
// two people's stakes taken once when the match starts and the prize paid to the winner; 18+ and the gift allowance; never with a
// computer seat; backers who watch share the prize, or get their stake back; backing closes; a room that closes refunds; the
// day limits are the tables' own; every line avoids betting words.
import { loadCityContent as preloadCityContent } from '../src/game/cities/registry.ts';
await preloadCityContent('lagos');
import test from 'node:test';
import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import { TUNING } from './growth/arena.ts';
import { FORBIDDEN_WORDS } from '../src/game/table-stakes.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';
import type { LifeState } from '../src/types/life.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 150, awaySeatMs: 150, emptyMs: 150 });
const CASH = 30000, EARNED = 20000;

interface Peer { who: Device; ws: WebSocket; state: ArenaStateFrame; errors: { code: string; reason?: string }[] }
async function harness(t: TestContext) {
  const f = await fixture(t);
  const json = async <T extends object = object>(res: Response): Promise<T & { status: number }> => ({ status: res.status, ...(await res.json()) });
  const post = async (path: string, body: unknown, who: Device) => json(await f.request(path, body, who.cookie));
  const life = async (who: Device): Promise<LifeState> => (await json<{ state: LifeState }>(await f.request('/api/life?city=lagos', null, who.cookie))).state;
  const edit = (who: Device, change: (state: LifeState) => void) => f.server.store.transact((db) => { const state = db.sessions[who.cookie.slice(4)]?.cities.lagos?.state; assert.ok(state); change(state); });
  const pots = (): Promise<Record<string, unknown>> => f.server.store.read((db) => JSON.parse(JSON.stringify((db as Record<string, { pots?: object }>).arenapots?.pots ?? {})) as Record<string, unknown>);
  async function peer(name: string, { earned = EARNED, cash = CASH, adult = true }: { earned?: number; cash?: number; adult?: boolean } = {}): Promise<Peer> {
    const who = await f.device(name);
    await life(who);
    await post('/api/growth/hello', { cityId: 'lagos' }, who);
    await edit(who, (state) => { state.cash = cash; state.social.earned = earned; state.ledger = []; state.ledgerDays = []; });
    if (adult) assert.equal((await post('/api/growth/consent', { cityId: 'lagos', age: 'adult' }, who)).status, 200);
    const sock = await f.socket(who);
    const p: Peer = { who, ws: sock.ws, state: null as unknown as ArenaStateFrame, errors: [] };
    sock.ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as { type: string };
      if (frame.type === 'arena-state') p.state = frame as unknown as ArenaStateFrame;
      else if (frame.type === 'error') p.errors.push(frame as unknown as { code: string });
    });
    return p;
  }
  const send = (p: Peer, type: string, body: Record<string, unknown> = {}) => p.ws.send(JSON.stringify({ type, ...body }));
  async function until(done: () => boolean, what: string, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!done()) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 5)); }
  }
  const create = async (p: Peer) => { p.state = null as unknown as ArenaStateFrame; send(p, 'arena-create', { game: 'fight', options: { rounds: 1, seconds: 30 } }); await until(() => Boolean(p.state), 'arena-state'); return p.state.room; };
  const join = async (p: Peer, room: string, type = 'arena-join') => { send(p, type, { room }); await until(() => p.state?.room === room, 'arena-state for ' + room); };
  const cash = async (...peers: Peer[]) => Promise.all(peers.map(async (p) => (await life(p.who)).cash));
  const errorCount = (p: Peer) => p.errors.length;
  return { f, peer, send, until, create, join, cash, pots, edit, life, errorCount };
}

test('two people play for a stake: both are taken when the match starts, and the winner takes the prize', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  h.send(ada, 'arena-stake', { room, amount: 500 });
  await h.until(() => ada.state.stakes?.amount === 500, 'the stake to be set');
  assert.match(ada.state.stakes?.line ?? '', /Play for ₦500 each: the winner takes the ₦1,000 prize/);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing' && bola.state.status === 'playing', 'the match to start');
  assert.deepEqual(await h.cash(ada, bola), [CASH - 500, CASH - 500]);
  assert.equal(Object.keys(await h.pots()).length, 1, 'the pot is held');
  // Bola walks away: Ada wins the prize.
  h.send(ada, 'arena-input', { room, i: 0 });
  await new Promise((r) => setTimeout(r, 120));
  h.send(bola, 'arena-input', { room, i: 1 }); await new Promise((r) => setTimeout(r, 60));
  h.send(bola, 'arena-leave', { room });
  await h.until(() => ada.state.status === 'over' && Boolean(ada.state.stakes?.result), 'the prize');
  assert.deepEqual(await h.cash(ada, bola), [CASH + 500, CASH - 500]);
  assert.match(ada.state.stakes?.result ?? '', /You won the ₦1,000 prize/);
  assert.deepEqual(await h.pots(), {}, 'paid once: the record is gone');
  for (const line of [ada.state.stakes?.line, ada.state.stakes?.result, ada.state.stakes?.note]) assert.doesNotMatch(line ?? '', FORBIDDEN_WORDS);
  const lines = (await h.life(ada.who)).ledger.map((l) => l.reason).join(' | ');
  assert.match(lines, /Fight with Bola/);
});

test('the 18+ rule and the gift allowance: a host who may not cannot set a stake; an opponent who may not stops the start and nothing moves', async (t) => {
  const h = await harness(t);
  const young = await h.peer('Kid', { adult: false });
  const roomA = await h.create(young);
  h.send(young, 'arena-stake', { room: roomA, amount: 100 });
  await h.until(() => young.errors.length > 0, 'a refusal');
  assert.equal(young.errors[0]?.code, 'adults_only');
  const [ada, poor] = [await h.peer('Ada2'), await h.peer('Poor', { earned: 0 })];
  const room = await h.create(ada);
  h.send(ada, 'arena-stake', { room, amount: 500 });
  await h.until(() => ada.state.stakes?.amount === 500, 'stake');
  await h.join(poor, room);
  await h.until(() => ada.errors.length > 0 || poor.errors.length > 0, 'the start to be refused');
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(ada.state.status, 'lobby');
  assert.deepEqual(await h.cash(ada, poor), [CASH, CASH]);
  assert.deepEqual(await h.pots(), {});
});

test('never with a computer seat: a stake set in the lobby is played free against the computer', async (t) => {
  const h = await harness(t);
  const ada = await h.peer('Ada3');
  const room = await h.create(ada);
  h.send(ada, 'arena-stake', { room, amount: 100 });
  await h.until(() => ada.state.stakes?.amount === 100, 'stake');
  h.send(ada, 'arena-start', { room, bots: 1 });
  await h.until(() => ada.state.status === 'playing', 'start');
  assert.deepEqual(await h.cash(ada), [CASH]);
  assert.deepEqual(await h.pots(), {});
});

test('people watching back a side: the winner’s backers share the prize; a backer cannot be seated; backing closes', async (t) => {
  const h = await harness(t);
  const [ada, bola, cara, dan] = [await h.peer('Ada4'), await h.peer('Bola4'), await h.peer('Cara4'), await h.peer('Dan4')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  await h.join(cara, room); await h.join(dan, room);
  assert.equal(cara.state.stakes?.back, true, 'backing is open at the start');
  h.send(ada, 'arena-back', { room, seat: 0, amount: 100 });
  await h.until(() => ada.errors.length > 0, 'a seated player is refused');
  assert.equal(ada.errors[0]?.code, 'stake_refused');
  h.send(cara, 'arena-back', { room, seat: 0, amount: 100 });
  h.send(dan, 'arena-back', { room, seat: 1, amount: 500 });
  await h.until(() => Boolean(cara.state.stakes?.backed) && Boolean(dan.state.stakes?.backed), 'both backed');
  assert.match(cara.state.stakes?.backed?.line ?? '', /Back Ada4 with ₦100/);
  h.send(cara, 'arena-back', { room, seat: 1, amount: 100 });
  await h.until(() => cara.errors.length > 0, 'once a match');
  assert.deepEqual(await h.cash(cara, dan), [CASH - 100, CASH - 500]);
  h.send(bola, 'arena-input', { room, i: 1 }); h.send(ada, 'arena-input', { room, i: 1 }); await new Promise((r) => setTimeout(r, 60));
  h.send(bola, 'arena-leave', { room }); // Ada wins: Cara backed her
  await h.until(() => Boolean(cara.state.stakes?.result) && Boolean(dan.state.stakes?.result), 'the backers settle');
  assert.deepEqual(await h.cash(cara, dan), [CASH + 500, CASH - 500]);
  assert.match(cara.state.stakes?.result ?? '', /share of the prize: ₦600/);
  assert.match(dan.state.stakes?.result ?? '', /did not win/);
  for (const line of [cara.state.stakes?.result, dan.state.stakes?.result]) assert.doesNotMatch(line ?? '', FORBIDDEN_WORDS);
  assert.deepEqual(await h.pots(), {});
});

test('backing in the lobby, then the room closes before a match: every stake comes back', async (t) => {
  const h = await harness(t);
  const [ada, bola, cara] = [await h.peer('Ada5'), await h.peer('Bola5'), await h.peer('Cara5')];
  const room = await h.create(ada);
  await h.join(cara, room, 'arena-watch');
  h.send(cara, 'arena-back', { room, seat: 0, amount: 500 });
  await h.until(() => Boolean(cara.state.stakes?.backed), 'backed');
  assert.deepEqual(await h.cash(cara), [CASH - 500]);
  h.send(ada, 'arena-leave', { room });
  await h.until(() => cara.state.status === 'closed', 'the room to close');
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(await h.cash(cara), [CASH]);
  assert.deepEqual(await h.pots(), {});
  void bola;
});
