// OWNER: games (real-time) — the game rooms against a real server and real sockets: creating and joining by code,
// watching, a whole fight to a result, rematch, leaving, dropping, practice against the computer, and the limits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { TUNING } from './growth/arena.ts';
import { BTN } from '../src/arena/fight.ts';
import type { FightSnap } from '../src/arena/fight.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 150, awaySeatMs: 150, emptyMs: 150 });

interface Frame { type: string; [field: string]: unknown }
interface Peer { who: Device; ws: WebSocket; state: ArenaStateFrame; snaps: { k: number; s: FightSnap; bytes: number }[]; errors: { code: string; reason?: string }[]; frames: Frame[] }

async function harness(t: TestContext) {
  const f = await fixture(t);
  async function peer(name: string): Promise<Peer> {
    const who = await f.device(name);
    const sock = await f.socket(who);
    const p: Peer = { who, ws: sock.ws, state: null as unknown as ArenaStateFrame, snaps: [], errors: [], frames: [] };
    sock.ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as Frame;
      p.frames.push(frame);
      if (frame.type === 'arena-state') p.state = frame as unknown as ArenaStateFrame;
      else if (frame.type === 'arena-snap') p.snaps.push({ k: frame.k as number, s: frame.s as FightSnap, bytes: data.toString().length });
      else if (frame.type === 'error') p.errors.push(frame as unknown as { code: string });
    });
    return p;
  }
  const send = (p: Peer, type: string, body: Record<string, unknown> = {}) => p.ws.send(JSON.stringify({ type, ...body }));
  /** Poll until `done()` holds (the server is asynchronous and ticking). */
  async function until(done: () => boolean, what: string, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!done()) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 5)); }
  }
  const create = async (p: Peer, body: Record<string, unknown> = {}) => { p.state = null as unknown as ArenaStateFrame; send(p, 'arena-create', { game: 'fight', options: { rounds: 1, seconds: 30 }, ...body }); await until(() => Boolean(p.state), 'arena-state'); return p.state.room; };
  const join = async (p: Peer, room: string, type = 'arena-join') => { send(p, type, { room }); await until(() => p.state?.room === room, 'arena-state for ' + room); };
  /** Press the punch button over and over (a tap every 40 ms) until the match is over. */
  async function punchUntilOver(p: Peer, other: Peer, room: string) {
    send(p, 'arena-input', { room, i: BTN.right });
    await until(() => (p.snaps.at(-1)?.s.f[1][0] ?? 1000) - (p.snaps.at(-1)?.s.f[0][0] ?? 0) < 70, 'closing in');
    for (let n = 0; p.state.status === 'playing' && n < 400; n++) {
      send(p, 'arena-input', { room, i: BTN.punch | BTN.right }); await new Promise((r) => setTimeout(r, 25));
      send(p, 'arena-input', { room, i: BTN.right }); await new Promise((r) => setTimeout(r, 65));
    }
    await until(() => p.state.status === 'over' && other.state.status === 'over', 'the fight to end');
  }
  return { f, peer, send, until, create, join, punchUntilOver };
}

test('a room is made, joined by its code, and starts by itself when both seats are taken', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  assert.match(room, /^g-fight-[a-hj-km-np-z2-9]{6}$/);
  assert.equal(ada.state.status, 'lobby'); assert.equal(ada.state.you, 0); assert.equal(ada.state.host, true);
  assert.equal(ada.state.practice, false); assert.equal(ada.state.snap, null);
  await h.join(bola, room);
  await h.until(() => bola.state.status === 'playing' && ada.state.status === 'playing', 'the game to start');
  assert.equal(bola.state.you, 1); assert.equal(bola.state.host, false);
  assert.deepEqual(ada.state.seats.map((s) => s.name), ['Ada', 'Bola']);
  await h.until(() => ada.snaps.length > 3 && bola.snaps.length > 3, 'snapshots');
  assert.deepEqual(ada.errors, []);
});

test('the secrets of a room: no stored identity in the roster beyond the public id and name', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  await h.join(bola, room);
  const text = JSON.stringify(ada.frames.filter((frame) => frame.type === 'arena-state'));
  assert.ok(!text.includes(ada.who.cookie.split('=')[1] ?? 'x'), 'no cookie in a frame');
});

test('a whole fight: someone wins, the result is the same for the players and a watcher who came in late', async (t) => {
  const h = await harness(t);
  const [ada, bola, cy] = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Cyril')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  await h.join(cy, room, 'arena-watch');
  assert.equal(cy.state.you, null); assert.ok(cy.state.snap, 'a late watcher is given the latest snapshot');
  await h.until(() => cy.snaps.length > 2, 'the watcher to get snapshots');
  // The watcher's input counts for nothing.
  h.send(cy, 'arena-input', { room, i: BTN.right });
  await h.punchUntilOver(ada, bola, room);
  assert.deepEqual(ada.state.result?.winners, [0]); assert.equal(ada.state.result?.reason, 'ko');
  await h.until(() => cy.state.status === 'over', 'the watcher to see the end');
  assert.equal(cy.state.result?.text, ada.state.result?.text); assert.match(ada.state.result?.text ?? '', /Ada wins/);
  assert.equal(ada.state.watchers, 1);
  assert.deepEqual([ada.errors, bola.errors, cy.errors], [[], [], []]);
  // Bandwidth: a snapshot frame is small.
  const sizes = ada.snaps.map((s) => s.bytes);
  assert.ok(Math.max(...sizes) < 260, `largest snapshot frame ${Math.max(...sizes)} bytes`);
});

test('rematch starts when everyone seated asks; a second match number is counted', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  await h.punchUntilOver(ada, bola, room);
  h.send(ada, 'arena-again', { room });
  await h.until(() => bola.state.again[0] === true, 'ada asking');
  assert.equal(bola.state.status, 'over');
  h.send(bola, 'arena-again', { room });
  await h.until(() => ada.state.status === 'playing' && ada.state.match === 2, 'the rematch');
  assert.equal(ada.state.result, null);
});

test('leaving during a game forfeits it: the other player wins at once', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  h.send(bola, 'arena-leave', { room });
  await h.until(() => ada.state.status === 'over', 'the forfeit');
  assert.equal(ada.state.result?.reason, 'forfeit'); assert.deepEqual(ada.state.result?.winners, [0]);
  // The empty seat is free: a newcomer sits in it and the pair can play again.
  const cy = await h.peer('Cyril');
  await h.join(cy, room);
  assert.equal(cy.state.you, 1);
});

test('a player whose connection drops forfeits after the grace period, and reconnecting in time keeps the seat', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  // Bola comes back in time on a new socket (the same device).
  const sock = await h.f.socket(bola.who);
  const again: Peer = { ...bola, ws: sock.ws, state: null as unknown as ArenaStateFrame, snaps: [], errors: [], frames: [] };
  sock.ws.on('message', (data) => { const frame = JSON.parse(data.toString()) as Frame; if (frame.type === 'arena-state') again.state = frame as unknown as ArenaStateFrame; });
  bola.ws.terminate();
  h.send(again, 'arena-join', { room });
  await h.until(() => Boolean(again.state), 'the resumed state');
  assert.equal(again.state.you, 1);
  await new Promise((r) => setTimeout(r, TUNING.awayForfeitMs * 2));
  assert.equal(ada.state.status, 'playing', 'still playing: Bola came back');
  // Now Bola vanishes for good.
  again.ws.terminate();
  await h.until(() => ada.state.status === 'over', 'the forfeit for a dropped player');
  assert.equal(ada.state.result?.reason, 'forfeit');
});

test('practice: the computer takes the other seat and the fight starts at once; leaving closes the room', async (t) => {
  const h = await harness(t);
  const ada = await h.peer('Ada');
  const room = await h.create(ada, { practice: true });
  assert.equal(ada.state.status, 'playing'); assert.equal(ada.state.practice, true); assert.equal(ada.state.seats[1]?.bot, true);
  await h.until(() => ada.snaps.length > 5, 'snapshots');
  const bola = await h.peer('Bola');
  h.send(bola, 'arena-join', { room });
  await h.until(() => bola.errors.length > 0, 'a refusal');
  assert.equal(bola.errors[0]?.code, 'arena_full');
  h.send(ada, 'arena-leave', { room });
  await new Promise((r) => setTimeout(r, 40));
  h.send(bola, 'arena-watch', { room });
  await h.until(() => bola.errors.length > 1, 'unknown room');
  assert.equal(bola.errors[1]?.code, 'arena_unknown');
});

test('a host can start a lobby against the computer; a stranger cannot start it; options are the host\'s', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  h.send(ada, 'arena-start', { room });
  await h.until(() => ada.errors.length === 1, 'need players');
  assert.equal(ada.errors[0]?.code, 'arena_need_players');
  h.send(ada, 'arena-options', { room, options: { rounds: 5, seconds: 90, nonsense: 1 } });
  await h.until(() => ada.state.options.rounds === 5, 'options');
  assert.equal(ada.state.options.seconds, 90); assert.ok(!('nonsense' in ada.state.options));
  await h.join(bola, room, 'arena-watch');
  h.send(bola, 'arena-start', { room, bots: 1 });
  await h.until(() => bola.errors.length === 1, 'not host');
  assert.equal(bola.errors[0]?.code, 'arena_not_host');
  h.send(bola, 'arena-options', { room, options: { rounds: 1 } });
  await h.until(() => bola.errors.length === 2, 'not host (options)');
  h.send(ada, 'arena-start', { room, bots: 1 });
  await h.until(() => ada.state.status === 'playing', 'start vs computer');
  assert.equal(ada.state.seats[1]?.bot, true);
});

test('limits: unknown game and room are refused, rooms per minute, watchers per room, one room per socket', async (t) => {
  const h = await harness(t);
  const [ada, bola, cy] = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Cyril')];
  h.send(ada, 'arena-create', { game: 'nope' });
  h.send(ada, 'arena-join', { room: 'g-fight-aaaaaa' });
  h.send(ada, 'arena-join', { room: '../../etc' });
  await h.until(() => ada.errors.length === 3, 'refusals');
  assert.deepEqual(ada.errors.map((e) => e.code), ['arena_game', 'arena_unknown', 'arena_unknown']);
  const first = await h.create(ada);
  const second = await h.create(ada);
  assert.notEqual(first, second);
  // The first room was left when the second was made: nobody is in it any more, so it is gone.
  h.send(bola, 'arena-watch', { room: first });
  await h.until(() => bola.errors.length === 1, 'the first room is gone');
  const before = TUNING.maxWatchers; TUNING.maxWatchers = 1;
  t.after(() => { TUNING.maxWatchers = before; });
  await h.join(bola, second, 'arena-watch');
  h.send(cy, 'arena-watch', { room: second });
  await h.until(() => cy.errors.length === 1, 'watchers are capped');
  assert.equal(cy.errors[0]?.code, 'arena_full');
  // Making rooms too fast.
  const max = TUNING.createsPerMinute;
  for (let i = 0; i < max + 1; i++) h.send(cy, 'arena-create', { game: 'fight' });
  await h.until(() => cy.errors.some((e) => e.code === 'arena_rate'), 'the create limit');
});

test('input flooding and junk are dropped without breaking the room', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  await h.join(bola, room);
  await h.until(() => ada.state.status === 'playing', 'start');
  for (let i = 0; i < 300; i++) h.send(ada, 'arena-input', { room, i: i % 64 });
  for (const junk of [-1, 99, 'x', null, [1], { a: 1 }, 1.5]) h.send(ada, 'arena-input', { room, i: junk });
  h.send(ada, 'arena-input', { room: 'g-fight-zzzzzz', i: 1 });
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual(ada.errors, []);
  assert.equal(ada.state.status, 'playing');
});

test('a room nobody is connected to closes by itself', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  const room = await h.create(ada);
  ada.ws.terminate();
  await new Promise((r) => setTimeout(r, TUNING.emptyMs * 3));
  h.send(bola, 'arena-join', { room });
  await h.until(() => bola.errors.length === 1, 'refusal');
  assert.equal(bola.errors[0]?.code, 'arena_unknown');
});

test('practice seat count: default is the game\'s minimum, `seats` raises it up to the maximum and never beyond', async (t) => {
  const h = await harness(t);
  const [ada, bola, cyril] = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Cyril')];
  const make = async (p: Peer, body: Record<string, unknown>) => { p.state = null as unknown as ArenaStateFrame; h.send(p, 'arena-create', { game: 'race', practice: true, ...body }); await h.until(() => Boolean(p.state), 'state'); return p.state; };
  const base = await make(ada, {});
  assert.equal(base.min, 2); assert.equal(base.seats.length, base.min);
  assert.equal((await make(bola, { seats: 3 })).seats.length, 3);
  assert.equal((await make(cyril, { seats: 99 })).seats.length, cyril.state.max);
  assert.equal((await make(cyril, { seats: 1 })).seats.length, cyril.state.min);
});
