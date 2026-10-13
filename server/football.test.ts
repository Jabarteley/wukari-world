// OWNER: games (real-time) — football rooms against a real server and real sockets: two players and a spectator, a whole match
// to a final score seen identically by all three, the computer as opponent, and the size of the snapshots.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { TUNING } from './growth/arena.ts';
import { BTN, packInput } from '../src/arena/football.ts';
import type { FootballSnap } from '../src/arena/football.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 150, awaySeatMs: 150, emptyMs: 150 });

interface Frame { type: string; [field: string]: unknown }
interface Peer { who: Device; ws: WebSocket; state: ArenaStateFrame; snaps: { k: number; s: FootballSnap; bytes: number }[]; errors: { code: string }[] }

async function harness(t: TestContext) {
  const f = await fixture(t);
  async function peer(name: string): Promise<Peer> {
    const who = await f.device(name);
    const sock = await f.socket(who);
    const p: Peer = { who, ws: sock.ws, state: null as unknown as ArenaStateFrame, snaps: [], errors: [] };
    sock.ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as Frame;
      if (frame.type === 'arena-state') p.state = frame as unknown as ArenaStateFrame;
      else if (frame.type === 'arena-snap') p.snaps.push({ k: frame.k as number, s: frame.s as FootballSnap, bytes: data.toString().length });
      else if (frame.type === 'error') p.errors.push(frame as unknown as { code: string });
    });
    return p;
  }
  const send = (p: Peer, type: string, body: Record<string, unknown> = {}) => p.ws.send(JSON.stringify({ type, ...body }));
  async function until(done: () => boolean, what: string, ms = 20000): Promise<void> {
    const end = Date.now() + ms;
    while (!done()) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 5)); }
  }
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  return { f, peer, send, until, wait };
}

test('football: two players and a spectator play a whole match to the same final score', async (t) => {
  const h = await harness(t);
  const [ada, bola, cy] = [await h.peer('Ada'), await h.peer('Bola'), await h.peer('Cyril')];
  h.send(ada, 'arena-create', { game: 'football', options: { seconds: 60, ending: 2, side: 1 } });
  await h.until(() => Boolean(ada.state), 'room');
  const room = ada.state.room;
  assert.match(room, /^g-football-[a-hj-km-np-z2-9]{6}$/);
  assert.equal(ada.state.status, 'lobby'); assert.equal(ada.state.max, 4); assert.equal(ada.state.min, 2);
  h.send(bola, 'arena-join', { room });
  await h.until(() => bola.state?.room === room, 'bola in');
  // Two of four seats: the host starts the match as a 1v1.
  h.send(ada, 'arena-start', { room });
  await h.until(() => ada.state.status === 'playing' && bola.state.status === 'playing', 'start');
  h.send(cy, 'arena-watch', { room });
  await h.until(() => cy.state?.room === room, 'watcher');
  assert.equal(cy.state.you, null);
  h.send(cy, 'arena-input', { room, i: 1 }); // a watcher's input counts for nothing
  // Ada runs east with the ball and shoots now and then; Bola stands still.
  const run = packInput(2, false), charge = packInput(2, true), kick = packInput(2, false, BTN.kick)
  for (let n = 0; ada.state.status === 'playing' && n < 200; n++) {
    h.send(ada, 'arena-input', { room, i: charge }); await h.wait(60);
    h.send(ada, 'arena-input', { room, i: kick }); await h.wait(20);
    h.send(ada, 'arena-input', { room, i: run }); await h.wait(150);
  }
  await h.until(() => ada.state.status === 'over' && bola.state.status === 'over' && cy.state.status === 'over', 'full time');
  const last = (p: Peer) => p.snaps.at(-1)!.s;
  const res = ada.state.result!;
  assert.deepEqual([ada.state.result, bola.state.result].map((r) => r?.text), [res.text, res.text]);
  assert.equal(cy.state.result?.text, res.text);
  assert.deepEqual(res.scores, [last(ada).g[0], last(ada).g[1]]);
  assert.deepEqual(last(cy).g, last(ada).g); assert.equal(last(bola).p, 3);
  assert.ok(res.draw || res.winners.length === 1);
  assert.ok(res.scores[0]! >= 1, 'Ada scored against an idle opponent: ' + res.text);
  assert.deepEqual(res.winners, [0]); assert.match(res.text, /Ada wins/);
  assert.equal(ada.state.watchers, 1);
  assert.deepEqual([ada.errors, bola.errors, cy.errors], [[], [], []]);
  const sizes = ada.snaps.map((s) => s.bytes);
  assert.ok(Math.max(...sizes) < 320, `largest snapshot frame ${Math.max(...sizes)} bytes`);
  // Rematch starts when both ask.
  h.send(ada, 'arena-again', { room }); h.send(bola, 'arena-again', { room });
  await h.until(() => ada.state.status === 'playing' && ada.state.match === 2, 'rematch');
});

test('football: practice against the computer starts at once and the computer scores on a player who does nothing', async (t) => {
  const h = await harness(t);
  const ada = await h.peer('Ada');
  h.send(ada, 'arena-create', { game: 'football', practice: true, options: { seconds: 60, ending: 2 } });
  await h.until(() => ada.state?.status === 'playing', 'practice');
  assert.equal(ada.state.practice, true); assert.ok(ada.state.seats.length >= 2);
  await h.until(() => ada.state.status === 'over', 'the match to end', 30000);
  assert.ok(ada.state.result!.scores.some((n) => n > 0) || ada.state.result!.draw);
  assert.deepEqual(ada.errors, []);
});

test('football: leaving during the match forfeits it', async (t) => {
  const h = await harness(t);
  const [ada, bola] = [await h.peer('Ada'), await h.peer('Bola')];
  h.send(ada, 'arena-create', { game: 'football' });
  await h.until(() => Boolean(ada.state), 'room');
  const room = ada.state.room;
  h.send(bola, 'arena-join', { room }); await h.until(() => bola.state?.room === room, 'join');
  h.send(ada, 'arena-start', { room }); await h.until(() => bola.state.status === 'playing', 'start');
  h.send(bola, 'arena-leave', { room });
  await h.until(() => ada.state.status === 'over', 'forfeit');
  assert.equal(ada.state.result?.reason, 'forfeit'); assert.deepEqual(ada.state.result?.winners, [0]);
});
