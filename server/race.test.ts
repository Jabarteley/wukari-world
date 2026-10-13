// OWNER: games (real-time) — the race through a real server and real sockets: a room for four, two racers and a spectator, a whole
// 1-lap race to a result seen identically by everyone, snapshot size, a rematch, and a practice room with three computer racers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { TUNING } from './growth/arena.ts';
import { INPUT, headingFrom256 } from '../src/arena/race.ts';
import type { RaceSnap } from '../src/arena/race.ts';
import { buildTrack, pointAt } from '../src/arena/race-track.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 150, awaySeatMs: 150, emptyMs: 150 });

interface Frame { type: string; [field: string]: unknown }
interface Peer { who: Device; ws: WebSocket; state: ArenaStateFrame; snaps: { k: number; s: RaceSnap; bytes: number }[]; errors: { code: string }[]; frames: Frame[]; auto?: boolean }

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
      else if (frame.type === 'arena-snap') p.snaps.push({ k: frame.k as number, s: frame.s as RaceSnap, bytes: data.toString().length });
      else if (frame.type === 'error') p.errors.push(frame as unknown as { code: string });
    });
    return p;
  }
  const send = (p: Peer, type: string, body: Record<string, unknown> = {}) => p.ws.send(JSON.stringify({ type, ...body }));
  async function until(done: () => boolean, what: string, ms = 15000): Promise<void> {
    const end = Date.now() + ms;
    while (!done()) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 5)); }
  }
  const create = async (p: Peer, body: Record<string, unknown> = {}) => { p.state = null as unknown as ArenaStateFrame; send(p, 'arena-create', { game: 'race', options: { laps: 1, track: 0 }, ...body }); await until(() => Boolean(p.state), 'arena-state'); return p.state.room; };
  const join = async (p: Peer, room: string, type = 'arena-join') => { send(p, type, { room }); await until(() => p.state?.room === room, 'arena-state for ' + room); };
  /** A tiny autopilot: reads its own car in the snapshot and steers at a point down the road. */
  function drive(p: Peer, room: string, lane: number): void {
    const track = buildTrack('lekki');
    let last = -1, at = 0;
    p.ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as Frame;
      if (frame.type !== 'arena-snap' || p.state?.you == null) return;
      const snap = frame.s as RaceSnap;
      const me = snap.r[p.state.you];
      if (snap.p !== 1 || !me || me[5]) return;
      const sp = me[3] / 4;
      const target = pointAt(track, me[4] + 90 + sp * 10, lane);
      let diff = Math.atan2(target.y - me[1], target.x - me[0]) - headingFrom256(me[2]);
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const mask = (diff > 0.05 ? INPUT.right : diff < -0.05 ? INPUT.left : 0) | (sp < 6.5 ? INPUT.gas : 0);
      if (mask !== last && Date.now() - at > 45) { last = mask; at = Date.now(); send(p, 'arena-input', { room, i: mask }); }
    });
  }
  return { f, peer, send, until, create, join, drive };
}

test('a race room seats four, starts when the host starts it, and a late spectator sees the whole race through to the same result', async (t) => {
  const h = await harness(t);
  const [ada, bola, cy] = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Cyril')];
  const room = await h.create(ada);
  assert.match(room, /^g-race-[a-hj-km-np-z2-9]{6}$/);
  assert.equal(ada.state.max, 4); assert.equal(ada.state.min, 2);
  assert.deepEqual(ada.state.optionList.map((o) => o.name), ['laps', 'track']);
  await h.join(bola, room);
  assert.equal(bola.state.you, 1);
  assert.equal(ada.state.status, 'lobby', 'two of four seats: still waiting');
  h.send(ada, 'arena-start', { room, bots: 1, seats: 4 });
  await h.until(() => ada.state.status === 'playing' && bola.state.status === 'playing', 'the race to start');
  assert.equal(ada.state.seats.length, 4);
  assert.equal(ada.state.seats.filter((s) => s.bot).length, 2);
  await h.join(cy, room, 'arena-watch');
  assert.equal(cy.state.you, null);
  assert.ok(cy.state.snap, 'a late spectator is given the latest snapshot');
  h.drive(ada, room, -20); h.drive(bola, room, 25);
  // The spectator's input counts for nothing.
  h.send(cy, 'arena-input', { room, i: INPUT.gas });
  await h.until(() => ada.state.status === 'over' && bola.state.status === 'over' && cy.state.status === 'over', 'the race to end', 30000);
  const r = cy.state.result!;
  assert.deepEqual([...r.winners].sort(), [0, 1, 2, 3]);
  assert.deepEqual(ada.state.result, r); assert.deepEqual(bola.state.result, r);
  assert.match(r.text, /wins the race!/);
  assert.equal(r.draw, false);
  assert.equal(r.scores.length, 4);
  // Everyone saw the countdown, and a finish time in the last snapshot for the winner.
  const last = cy.snaps.at(-1)!.s;
  assert.equal(last.p, 2);
  assert.ok(last.r[r.winners[0]!]![5] > 0, 'the winner has a finish time');
  assert.ok(ada.snaps.some((s) => s.s.p === 0 && s.s.c === 2), 'countdown seen');
  assert.ok(cy.snaps.length > 30);
  const biggest = Math.max(...cy.snaps.map((s) => s.bytes));
  assert.ok(biggest < 300, 'a snapshot frame stays small: ' + biggest + ' bytes');
  assert.deepEqual(ada.errors, []); assert.deepEqual(cy.errors, []);
  // Rematch: both humans ask, the computer racers agree.
  h.send(ada, 'arena-again', { room }); h.send(bola, 'arena-again', { room });
  await h.until(() => ada.state.status === 'playing' && ada.state.match === 2, 'rematch');
  assert.equal(cy.state.match, 2);
});

test('a full house starts by itself', async (t) => {
  const h = await harness(t);
  const peers = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Chidi'), await h.peer('Dayo')];
  const room = await h.create(peers[0]!);
  for (const p of peers.slice(1)) await h.join(p, room);
  await h.until(() => peers.every((p) => p.state.status === 'playing'), 'auto start');
  assert.deepEqual(peers.map((p) => p.state.you), [0, 1, 2, 3]);
});

test('practice fills the grid with three computer racers and finishes without a human driving', async (t) => {
  const h = await harness(t);
  const ada = await h.peer('Ada');
  await h.create(ada, { practice: true, seats: 4 });
  await h.until(() => ada.state.status === 'playing', 'practice start');
  assert.equal(ada.state.seats.length, 4);
  assert.equal(ada.state.seats.filter((s) => s.bot).length, 3);
  assert.equal(ada.state.practice, true);
  await h.until(() => ada.state.status === 'over', 'the practice race to end', 40000);
  assert.deepEqual([...ada.state.result!.winners].sort(), [0, 1, 2, 3]);
  assert.ok(ada.state.result!.winners[0] !== 0, 'a parked human does not win');
});

test('bad input is dropped silently and does not stop the race', async (t) => {
  const h = await harness(t);
  const ada = await h.peer('Ada');
  const room = await h.create(ada, { practice: true, seats: 4 });
  await h.until(() => ada.snaps.length > 3, 'snapshots');
  for (const bad of [99, -1, 'gas', null, { gas: 1 }]) h.send(ada, 'arena-input', { room, i: bad });
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(ada.state.status, 'playing');
});
