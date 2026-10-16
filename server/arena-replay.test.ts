// OWNER: games (real-time) — replay logs of finished matches (public route, exact reproduction) and the 15-second reconnect window
// (the seat's bot steers, never an instant forfeit, the returning person takes control back). Real server, real sockets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './test-fixture.ts';
import type { Device } from './test-fixture.ts';
import type { TestContext } from 'node:test';
import type WebSocket from 'ws';
import { TUNING } from './growth/arena.ts';
import { BTN } from '../src/arena/fight.ts';
import fight from '../src/arena/fight.ts';
import { parseReplay, replayMatch } from '../src/arena/replay.ts';
import type { ReplayLog } from '../src/arena/replay.ts';
import type { ArenaStateFrame } from '../src/types/arena.ts';

Object.assign(TUNING, { speed: 10, sweepMs: 20, awayForfeitMs: 15000, awaySeatMs: 150, emptyMs: 150 });
const TOKEN = 'replay-test-operator-token-0123456789';

interface Peer { who: Device; ws: WebSocket; state: ArenaStateFrame; snaps: { k: number; s: unknown }[]; errors: { code: string }[] }
async function harness(t: TestContext) {
  const f = await fixture(t, { moderatorToken: TOKEN });
  function listen(p: Peer): void {
    p.ws.on('message', (data) => {
      const frame = JSON.parse(data.toString()) as { type: string; [k: string]: unknown };
      if (frame.type === 'arena-state') p.state = frame as unknown as ArenaStateFrame;
      else if (frame.type === 'arena-snap') p.snaps.push({ k: frame.k as number, s: frame.s });
      else if (frame.type === 'error') p.errors.push(frame as unknown as { code: string });
    });
  }
  async function peer(name: string): Promise<Peer> {
    const who = await f.device(name), sock = await f.socket(who);
    const p: Peer = { who, ws: sock.ws, state: null as unknown as ArenaStateFrame, snaps: [], errors: [] };
    listen(p);
    return p;
  }
  /** The same person on a new socket (their old one dropped). */
  async function again(p: Peer): Promise<Peer> {
    const sock = await f.socket(p.who);
    const q: Peer = { who: p.who, ws: sock.ws, state: null as unknown as ArenaStateFrame, snaps: [], errors: [] };
    listen(q);
    return q;
  }
  const send = (p: Peer, type: string, body: Record<string, unknown> = {}) => p.ws.send(JSON.stringify({ type, ...body }));
  async function until(done: () => boolean, what: string, ms = 8000): Promise<void> {
    const end = Date.now() + ms;
    while (!done()) { if (Date.now() > end) throw new Error('Timed out waiting for ' + what); await new Promise((r) => setTimeout(r, 5)); }
  }
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  async function match(): Promise<{ ada: Peer; bola: Peer; room: string }> {
    const ada = await peer('Ada'), bola = await peer('Bola');
    send(ada, 'arena-create', { game: 'fight', options: { rounds: 1, seconds: 30 } });
    await until(() => Boolean(ada.state), 'room');
    const room = ada.state.room;
    send(bola, 'arena-join', { room });
    await until(() => ada.state.status === 'playing' && bola.state?.status === 'playing', 'start');
    return { ada, bola, room };
  }
  const get = (path: string, auth?: string) => fetch(f.base + path, auth ? { headers: { Authorization: `Bearer ${auth}` } } : undefined);
  return { f, send, until, again, sleep, match, get };
}

test('a finished match has a public replay that reproduces every snapshot the players saw', async (t) => {
  const h = await harness(t);
  const { ada, bola, room } = await h.match();
  // Both fight a little, then Bola leaves for good: Ada wins by forfeit.
  h.send(ada, 'arena-input', { room, i: BTN.right });
  h.send(bola, 'arena-input', { room, i: BTN.left | BTN.block });
  await h.until(() => ada.snaps.length > 40, 'some play');
  h.send(ada, 'arena-input', { room, i: BTN.punch | BTN.right });
  await h.sleep(60);
  h.send(bola, 'arena-leave', { room });
  await h.until(() => ada.state.status === 'over', 'the end');
  const id = ada.state.replay;
  assert.match(id ?? '', /^r-[a-z0-9]{10}$/);
  const res = await h.get(`/api/arena/replay/${id}`);   // no cookie: public
  assert.equal(res.status, 200);
  const body = await res.json() as { id: string; clip: string | null; log: ReplayLog };
  const log = parseReplay(body.log)!;
  assert.ok(log, 'a well formed log');
  const text = JSON.stringify(body);
  for (const secret of [ada.who.id, bola.who.id, room, ada.who.cookie.split('=')[1] ?? 'x']) assert.ok(!text.includes(secret), 'nothing personal in a replay');
  assert.deepEqual(log.seats.map((s) => s.name), ['Ada', 'Bola']);
  assert.equal(log.result.reason, 'forfeit'); assert.equal(log.f.length, 1);
  assert.ok(text.length < 24000, `a few KB (${text.length})`);
  const out = replayMatch(fight, log);
  assert.equal(out.verified, true, out.problem);
  for (const { k, s } of ada.snaps.filter((x) => x.k <= log.ticks)) assert.deepEqual(out.snaps[k - 1], s, `snapshot of tick ${k}`);
  assert.ok(ada.snaps.length > 40);
  // The small answer, and the refusals.
  assert.deepEqual(await (await h.get(`/api/arena/replay/${id}?meta=1`)).json(), { id, game: 'fight', clip: null, serverTime: (await (await h.get(`/api/arena/replay/${id}?meta=1`)).json() as { serverTime: number }).serverTime });
  assert.equal((await h.get('/api/arena/replay/r-aaaaaaaaaa')).status, 404);
  assert.equal((await h.get('/api/arena/replay/not-an-id')).status, 404);
});

test('a replay exists only for a finished match; the operator can attach a clip address', async (t) => {
  const h = await harness(t);
  const { ada, room } = await h.match();
  assert.equal(ada.state.replay, undefined, 'none while playing');
  h.send(ada, 'arena-leave', { room });
  const bola = (await h.match()).ada; // a second room, not finished
  assert.equal(bola.state.replay, undefined);
  const id = await (async () => { const { ada: a2, bola: b2, room: r2 } = await h.match(); h.send(b2, 'arena-leave', { room: r2 }); await h.until(() => a2.state.status === 'over', 'over'); return a2.state.replay as string; })();
  const post = (token: string | null, payload: unknown) => fetch(h.f.base + '/api/arena/clip', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: h.f.base, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  assert.equal((await post(null, { id, url: '/clips/a.mp4' })).status, 401);
  assert.equal((await post(TOKEN, { id, url: 'http://evil.example/a.mp4' })).status, 400);
  assert.equal((await post(TOKEN, { id, url: '//evil.example/a.mp4' })).status, 400);
  assert.equal((await post(TOKEN, { id: 'r-aaaaaaaaaa', url: '/clips/a.mp4' })).status, 404);
  assert.equal((await post(TOKEN, { id, url: '/clips/a.mp4' })).status, 200);
  assert.equal(((await (await h.get(`/api/arena/replay/${id}?meta=1`)).json()) as { clip: string }).clip, '/clips/a.mp4');
});

test('reconnect window: a dropped player is steered by the bot, not forfeited; coming back takes control', async (t) => {
  const h = await harness(t);
  const { ada, bola, room } = await h.match();
  h.send(bola, 'arena-input', { room, i: BTN.left });
  await h.until(() => ada.snaps.length > 10, 'play');
  bola.ws.terminate();
  await h.until(() => ada.state.seats[1]?.away === true, 'Bola marked away');
  const before = ada.snaps.length;
  await h.sleep(400); // far beyond any instant forfeit
  assert.equal(ada.state.status, 'playing', 'no instant forfeit');
  assert.ok(ada.snaps.length > before, 'the match goes on');
  const bola2 = await h.again(bola);
  h.send(bola2, 'arena-join', { room });
  await h.until(() => bola2.state?.you === 1, 'Bola back in the seat');
  await h.until(() => ada.state.seats[1]?.away !== true, 'away cleared');
  h.send(bola2, 'arena-input', { room, i: BTN.block });
  await h.sleep(150);
  h.send(ada, 'arena-leave', { room });
  await h.until(() => bola2.state.status === 'over', 'the end');
  const log = parseReplay(((await (await h.get(`/api/arena/replay/${bola2.state.replay}`)).json()) as { log: unknown }).log)!;
  assert.equal(log.s.length, 1, 'one steered stretch');
  const [seat, from, to] = log.s[0]!;
  assert.equal(seat, 1); assert.ok(to > from + 3, `bot steered for ${to - from} ticks`);
  assert.ok(log.i.some(([tick, who, input]) => who === 1 && tick >= to && JSON.stringify(input).includes('"h":32')), 'Bola\'s own input is back after the window');
  assert.ok(!log.i.some(([tick, who]) => who === 1 && tick > from && tick < to), 'nothing of Bola recorded while the bot steered');
  const out = replayMatch(fight, log);
  assert.equal(out.verified, true, out.problem);
});

test('a player who stays away for the whole window forfeits after it, not before', async (t) => {
  const h = await harness(t);
  const saved = TUNING.awayForfeitMs;
  TUNING.awayForfeitMs = 700;
  t.after(() => { TUNING.awayForfeitMs = saved; });
  const { ada, bola } = await h.match();
  const t0 = Date.now();
  bola.ws.terminate();
  await h.sleep(350);
  assert.equal(ada.state.status, 'playing', 'still inside the window');
  await h.until(() => ada.state.status === 'over', 'the forfeit', 3000);
  assert.ok(Date.now() - t0 >= 650, `forfeited only after the window (${Date.now() - t0} ms)`);
  assert.equal(ada.state.result?.reason, 'forfeit');
  const log = parseReplay(((await (await h.get(`/api/arena/replay/${ada.state.replay}`)).json()) as { log: unknown }).log)!;
  assert.equal(replayMatch(fight, log).verified, true);
  assert.equal(TUNING.awayForfeitMs === 700, true);
});
