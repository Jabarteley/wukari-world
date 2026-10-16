/**
 * OWNER: games (real-time)
 * The real-time game rooms: private rooms (joined by a code in a link) where two or more people play a game that runs on
 * a fixed server tick (src/arena/*.ts), with watchers. The server is the only judge: it holds the state, takes each
 * seat's input, steps the rules `hz` times a second and broadcasts one compact snapshot per tick.
 *
 * A ROOM is not a place: it needs no venue, no city and no life, only an open socket. Its code (`g-<game>-` + 6 characters, src/arena/code.ts) is the
 * invitation. In a room:
 *   lobby    people arrive by the code; the first is the host. Full seats start the game by themselves; the host may
 *            start against the computer (`practice` rooms start at once).
 *   playing  ticks. A seat that has no connection for TUNING.awayForfeitMs forfeits.
 *   over     the result stays; every person seated may ask for a rematch (it starts when all asked). Seats of people
 *            who left are freed for the next arrival.
 * Anyone with the code who finds no free seat (or asks to) WATCHES: same snapshots, no input, at most TUNING.maxWatchers.
 *
 * LIMITS. A socket is in one room at a time. A player makes TUNING.createsPerMinute rooms a minute; the host holds at most
 * TUNING.maxRooms rooms; a seat's inputs are a token bucket (TUNING.inputBurst, TUNING.inputPerSecond; the surplus is dropped without a
 * word); a room with nobody connected closes after TUNING.emptyMs; a lobby after TUNING.lobbyMs; a finished room after TUNING.overMs.
 * Nothing is stored: a restart ends every room (the host keeps the Worker awake by its own timers while rooms exist,
 * see ctx.core.hibernates). Nothing is paid or rated in this phase.
 */
import { makeRng } from '../../src/game/util.ts';
import { withNames } from '../../src/tables/rules.ts';
import { arenaGame } from '../../src/arena/registry.ts';
import { cleanArenaOptions } from '../../src/arena/rules.ts';
import { ROOM_CODE } from '../../src/arena/code.ts';
import type { RealtimeRules } from '../../src/arena/rules.ts';
import { ReplayRecorder } from '../../src/arena/replay.ts';
import type { ReplayLog } from '../../src/arena/replay.ts';
import { CARTRIDGE_LIMITS } from '../../src/arena/cartridge.ts';
import { cartridgeOf } from '../../src/arena/cartridges.ts';
import { ReplayShelf } from './arena-replays.ts';
import type { ArenaLook, ArenaResult, ArenaSeat, ArenaStateFrame, ArenaStatus } from '../../src/types/arena.ts';
import type { TableOptionValue } from '../../src/types/growth.ts';
import type { IncomingFrame, RouteContext, WsConnection } from '../types.ts';

/** Limits and timings. A test may change them; nothing else should. `speed` multiplies the tick rate (tests only). */
export const TUNING = {
  speed: 1, maxRooms: 300, maxWatchers: 20, createsPerMinute: 8, inputBurst: 30, inputPerSecond: 24,
  awayForfeitMs: 15000, awaySeatMs: 30000, emptyMs: 60000, lobbyMs: 15 * 60000, overMs: 10 * 60000, sweepMs: 2000, maxCatchUp: 4,
  /** Replays kept (src/arena/replay.ts): per game, per room, bytes of JSON each, how long, and the entries one log may grow to before it is dropped. */
  replayPerGame: 40, replayPerRoom: 5, replayBytes: CARTRIDGE_LIMITS.replayBytes, replayTtlMs: 24 * 3600000, replayEntries: 4000,
};
const markOf = (ws: WsConnection, now: number): boolean => ws.session.agent === true && (ws.session.agentUntil === undefined || ws.session.agentUntil > now);
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const refuse = (code: string, reason: string) => Object.assign(new Error(code), { reason });
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const clock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface Seat {
  id: string; name: string; bot: boolean; look?: ArenaLook
  /** An AI agent plays this seat (the public mark), as at the last time a connection of this person was attached. */
  ai?: boolean
  /** When the last connection of this person went (clock ms), or 0 while connected. */
  away: number
  left: boolean
  input: unknown
  again: boolean
  tokens: number; refilled: number
  /** The client's counter on the newest input received, and the newest one a tick has consumed (sent back in `a` for prediction). */
  lastN: number; ackN: number
}
interface Room {
  code: string
  rules: RealtimeRules<any, any, any>
  host: string
  practice: boolean
  status: ArenaStatus
  seats: Seat[]
  options: Record<string, TableOptionValue>
  sockets: Set<WsConnection>
  state: unknown
  rng: () => number
  match: number
  result: (ArenaResult & { names: string[] }) | null
  tick: number
  nextAt: number
  timer: ReturnType<typeof setTimeout> | null
  lastText: string
  lastSentTick: number
  snap: unknown
  emptySince: number
  since: number
  /** The log being recorded for the match in play, or null (not playing, or it grew past its bound). */
  rec: ReplayRecorder | null
  /** The shelf id of the finished match's replay. */
  replayId: string | null
}

const services = new WeakMap<object, ReturnType<typeof buildService>>();
export function arenaService(ctx: RouteContext) {
  const cached = services.get(ctx);
  if (cached) return cached;
  const api = buildService(ctx);
  services.set(ctx, api);
  return api;
}

/**
 * Each seat's finishing place for a result, or undefined when the game has none. Places the rules supply are kept as given
 * (1 = first; 0 = did not finish) once they are one whole number per seat. Otherwise a game whose `winners` lists EVERY seat best to
 * worst is read as a ranking.
 */
export function resultPlaces(outcome: { winners: number[]; draw: boolean; places?: number[] }, seats: number): number[] | undefined {
  const given = outcome.places;
  if (given) return given.length === seats && given.every((place) => Number.isInteger(place) && place >= 0) ? given.slice() : undefined;
  if (outcome.draw || outcome.winners.length !== seats || seats < 2) return undefined;
  const derived = Array.from({ length: seats }, (_, seat) => outcome.winners.indexOf(seat) + 1);
  return derived.every((place) => place > 0) ? derived : undefined;
}

function newCode(game: string, taken: (code: string) => boolean): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const code = `g-${game}-` + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
    if (!taken(code)) return code;
  }
  throw refuse('arena_busy', 'Too many games are on. Try again in a minute.');
}

function newReplayId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return 'r-' + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

function lookOf(value: unknown): ArenaLook | undefined {
  if (!Array.isArray(value) || value.length !== 4) return undefined;
  return value.every((id) => typeof id === 'string' && /^[a-z0-9-]{1,24}$/.test(id)) ? value as ArenaLook : undefined;
}

function buildService(ctx: RouteContext) {
  const rooms = new Map<string, Room>();
  const at = new Map<WsConnection, Room>();
  let sweeper: ReturnType<typeof setInterval> | null = null;
  const shelf = new ReplayShelf(() => ({ perGame: TUNING.replayPerGame, perRoom: TUNING.replayPerRoom, bytes: TUNING.replayBytes, ttlMs: TUNING.replayTtlMs }));

  const seatOf = (room: Room, id: string): number => room.seats.findIndex((seat) => !seat.bot && !seat.left && seat.id === id);
  const connected = (room: Room, id: string): boolean => [...room.sockets].some((ws) => ws.session.id === id && ctx.core.isOpen(ws));
  const open = (ws: WsConnection): boolean => ctx.core.isOpen(ws);
  const send = (ws: WsConnection, frame: Parameters<RouteContext['send']>[1]): void => { if (open(ws)) ctx.send(ws, frame); };
  const sendAll = (room: Room, frame: Parameters<RouteContext['send']>[1]): void => {
    const live = [...room.sockets].filter(open);
    if (ctx.broadcast) ctx.broadcast(live, frame); else for (const ws of live) ctx.send(ws, frame);
  };

  function stateFor(room: Room, ws: WsConnection): ArenaStateFrame {
    const id = ws.session.id, seat = seatOf(room, id);
    const watchers = watching(room);
    return {
      type: 'arena-state', room: room.code, game: room.rules.id, label: room.rules.label, status: room.status, hz: room.rules.hz,
      you: seat >= 0 ? seat : null, host: room.host === id,
      seats: room.seats.map((s): ArenaSeat => ({ name: s.name, bot: s.bot, ...(s.bot ? {} : { id: s.id }), ...(s.ai ? { ai: true as const } : {}), ...(s.away > 0 && !s.left ? { away: true as const } : {}), ...(s.look ? { look: s.look } : {}) })),
      max: room.rules.seats.max, min: room.rules.seats.min, watchers, options: room.options,
      optionList: Object.entries(room.rules.options as Record<string, { label: string; values: readonly TableOptionValue[]; names?: readonly string[] }>).map(([name, spec]) => ({ name, label: spec.label, values: [...spec.values], names: spec.names ? [...spec.names] : spec.values.map(String), value: room.options[name] as TableOptionValue })),
      again: room.seats.map((s) => s.again), practice: room.practice,
      result: room.result ? { text: room.result.text, winners: room.result.winners, draw: room.result.draw, reason: room.result.reason, scores: room.result.scores, ...(room.result.places ? { places: room.result.places } : {}) } : null,
      snap: room.status === 'lobby' ? null : room.snap, match: room.match,
      ...(room.status === 'over' && room.replayId ? { replay: room.replayId } : {}),
    };
  }
  function announce(room: Room): void { for (const ws of room.sockets) send(ws, stateFor(room, ws)); }

  // ---- membership ----------------------------------------------------------------------------------
  function attach(room: Room, ws: WsConnection): void {
    const old = at.get(ws);
    if (old && old !== room) exit(ws);
    room.sockets.add(ws); at.set(ws, room); room.emptySince = 0;
    const seat = room.seats[seatOf(room, ws.session.id)];
    if (seat) {
      // Back within the window: the person takes the seat back from the bot, starting from a neutral hand (the client re-sends what is held).
      if (seat.away > 0 && room.status === 'playing') seat.input = room.rules.idle();
      seat.away = 0; seat.ai = markOf(ws, ctx.now());
    }
    ensureSweeper();
  }
  /** The socket stops being part of its room; the person's seat stays (a reconnect resumes it) unless they asked to leave. */
  function detach(ws: WsConnection): void {
    const room = at.get(ws);
    if (!room) return;
    at.delete(ws); room.sockets.delete(ws);
    const id = ws.session.id, seat = room.seats[seatOf(room, id)];
    if (seat && !connected(room, id)) seat.away = clock();
    if (![...room.sockets].some(open)) room.emptySince = clock();
    announce(room);
  }
  /** Leave the room this socket is in for good: a person with no other connection there gives up the seat (during a game: forfeits). */
  function exit(ws: WsConnection): void {
    const room = at.get(ws);
    if (!room) return;
    const id = ws.session.id, index = seatOf(room, id);
    detach(ws);
    if (index >= 0 && !connected(room, id)) { removeSeat(room, index); if (room.status !== 'closed') announce(room); }
  }
  function takeSeat(room: Room, ws: WsConnection, look: ArenaLook | undefined): boolean {
    const reuse = room.seats.findIndex((s) => s.left);
    if (reuse < 0 && room.seats.length >= room.rules.seats.max) return false;
    const seat: Seat = { id: ws.session.id, name: ws.session.name, bot: false, ai: markOf(ws, ctx.now()), ...(look ? { look } : {}), away: 0, left: false, input: room.rules.idle(), again: false, tokens: TUNING.inputBurst, refilled: clock(), lastN: 0, ackN: 0 };
    if (reuse >= 0) room.seats[reuse] = seat; else room.seats.push(seat);
    return true;
  }
  function removeSeat(room: Room, index: number): void {
    const seat = room.seats[index];
    if (!seat) return;
    if (room.status === 'playing') {
      // The leaver is in the result: keep the place, marked, until the next game.
      seat.left = true; seat.away = 0;
      room.rec?.forfeit(index);
      room.state = room.rules.forfeit(room.state, index);
      finishIfOver(room);
    } else if (room.status === 'over') {
      seat.left = true; seat.again = false;
    } else room.seats.splice(index, 1);
    if (room.host === seat.id) {
      const next = room.seats.find((s) => !s.bot && !s.left);
      if (next) room.host = next.id;
    }
    if (!room.seats.some((s) => !s.bot && !s.left)) close(room);
  }

  function close(room: Room): void {
    if (room.status === 'closed') return;
    room.status = 'closed';
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    rooms.delete(room.code);
    for (const ws of room.sockets) { at.delete(ws); send(ws, stateFor(room, ws)); }
    room.sockets.clear();
  }

  // ---- the game ------------------------------------------------------------------------------------
  function startMatch(room: Room): void {
    room.seats = room.seats.filter((s) => !s.left);
    const seed = ctx.randomId();
    room.rng = makeRng(seed);
    room.state = room.rules.start(room.seats.length, room.rng, cleanArenaOptions(room.rules, room.options));
    room.status = 'playing'; room.result = null; room.match += 1; room.tick = 0; room.replayId = null;
    const optionsNow = cleanArenaOptions(room.rules, room.options);
    room.rec = new ReplayRecorder({ game: room.rules.id, rev: cartridgeOf(room.rules.id)?.rev ?? 1, hz: room.rules.hz, seed: String(seed), options: optionsNow, seats: room.seats.map((s) => ({ name: s.name, bot: s.bot, ...(s.ai ? { ai: true as const } : {}), ...(s.look ? { look: s.look } : {}) })) }, JSON.stringify(room.rules.idle()));
    for (const seat of room.seats) { seat.input = room.rules.idle(); seat.again = false; seat.tokens = TUNING.inputBurst; seat.refilled = clock(); }
    room.snap = room.rules.snapshot(room.state);
    room.lastText = JSON.stringify(room.snap); room.lastSentTick = 0; room.since = clock();
    room.nextAt = clock() + dtOf(room);
    announce(room);
    schedule(room);
  }
  const dtOf = (room: Room): number => 1000 / (room.rules.hz * TUNING.speed);

  function schedule(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    if (room.status !== 'playing') return;
    room.timer = setTimeout(() => { room.timer = null; pump(room); }, Math.max(0, room.nextAt - clock()));
    room.timer.unref?.();
  }
  function pump(room: Room): void {
    if (room.status !== 'playing') return;
    let ran = 0;
    const dt = dtOf(room);
    while (room.status === 'playing' && clock() >= room.nextAt && ran < TUNING.maxCatchUp) { runTick(room); room.nextAt += dt; ran += 1; }
    // Far behind (a stalled host): do not try to replay the lost time.
    if (clock() - room.nextAt > dt * 8) room.nextAt = clock() + dt;
    schedule(room);
  }
  function runTick(room: Room): void {
    const rules = room.rules;
    // A person whose connection is down is NOT idle and NOT forfeited: the seat's bot steers until they are back or the window ends.
    const steered = room.seats.map((seat) => !seat.bot && !seat.left && seat.away > 0);
    const inputs = room.seats.map((seat, index) => {
      if (seat.bot || steered[index]) return rules.bot(room.state, index, room.rng);
      if (seat.left) return rules.idle();
      const given = seat.input;
      seat.ackN = seat.lastN;
      if (rules.settle) seat.input = rules.settle(given);
      return given;
    });
    room.rec?.tick(inputs, steered);
    if (room.rec && room.rec.size > TUNING.replayEntries) room.rec = null;
    room.state = rules.step(room.state, inputs, room.rng);
    room.tick += 1;
    room.snap = rules.snapshot(room.state);
    const acks = room.seats.map((seat) => seat.ackN);
    const text = JSON.stringify(room.snap) + (acks.some((n) => n > 0) ? JSON.stringify(acks) : '');
    // A tick that changed nothing is not sent (a standing fight is a frame a second), but a client hears something every second.
    if (text !== room.lastText || room.tick - room.lastSentTick >= rules.hz) {
      room.lastText = text; room.lastSentTick = room.tick;
      sendAll(room, { type: 'arena-snap', room: room.code, k: room.tick, s: room.snap, ...(acks.some((n) => n > 0) ? { a: acks } : {}) });
    }
    finishIfOver(room);
  }
  function finishIfOver(room: Room): void {
    if (room.status !== 'playing') return;
    const outcome = room.rules.outcome(room.state);
    if (!outcome) return;
    room.status = 'over'; room.since = clock();
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    const names = room.seats.map((s) => s.name);
    const ranked = resultPlaces(outcome, room.seats.length);
    room.result = { text: withNames(outcome.text, names), winners: outcome.winners, draw: outcome.draw, reason: outcome.reason, scores: outcome.scores, ...(ranked ? { places: ranked } : {}), names };
    room.snap = room.rules.snapshot(room.state);
    if (room.rec) {
      const log = room.rec.finish({ ...outcome, text: outcome.text }, room.snap, names);
      room.rec = null;
      const id = newReplayId();
      if (shelf.put(id, room.code, log, ctx.now())) room.replayId = id;
    }
    for (const seat of room.seats) seat.again = false;
    sendAll(room, { type: 'arena-snap', room: room.code, k: room.tick, s: room.snap });
    announce(room);
  }

  // ---- the sweep: absent players, empty and old rooms -------------------------------------------------
  function ensureSweeper(): void {
    if (sweeper) return;
    sweeper = setInterval(sweep, TUNING.sweepMs);
    sweeper.unref?.();
  }
  /** Read afresh: removing a seat can close the room, which a status check made earlier cannot know. */
  const isClosed = (room: Room): boolean => room.status === 'closed';
  function sweep(): void {
    const t = clock();
    for (const room of [...rooms.values()]) {
      for (let index = room.seats.length - 1; index >= 0; index--) {
        const seat = room.seats[index];
        if (!seat || seat.bot || seat.left || seat.away <= 0 || room.status === 'closed') continue;
        const limit = room.status === 'playing' ? TUNING.awayForfeitMs : TUNING.awaySeatMs;
        if (t - seat.away >= limit) { removeSeat(room, index); if (!isClosed(room)) announce(room); }
      }
      if (room.status === 'closed') continue;
      if (room.emptySince > 0 && t - room.emptySince >= TUNING.emptyMs) close(room);
      else if (room.status === 'lobby' && t - room.since >= TUNING.lobbyMs) close(room);
      else if (room.status === 'over' && t - room.since >= TUNING.overMs) close(room);
    }
    if (!rooms.size && sweeper) { clearInterval(sweeper); sweeper = null; }
  }

  // ---- messages --------------------------------------------------------------------------------------
  function roomOf(message: IncomingFrame): Room {
    const code = typeof message.room === 'string' ? message.room : '';
    const room = ROOM_CODE.test(code) ? rooms.get(code) : undefined;
    if (!room) throw refuse('arena_unknown', 'That game is not on any more. Ask your friend for a new link.');
    return room;
  }
  const watching = (room: Room): number => new Set([...room.sockets].map((s) => s.session.id).filter((who) => seatOf(room, who) < 0)).size;
  const humans = (room: Room): number => room.seats.filter((s) => !s.bot && !s.left).length;
  const fillBots = (room: Room, target: number = room.rules.seats.min): void => { const upTo = Math.max(room.rules.seats.min, Math.min(room.rules.seats.max, Math.floor(target) || 0)); while (room.seats.length < upTo) room.seats.push({ id: `bot-${room.seats.length}`, name: `Bot ${room.seats.length}`, bot: true, away: 0, left: false, input: room.rules.idle(), again: false, tokens: 0, refilled: 0, lastN: 0, ackN: 0 }); };

  function create(ws: WsConnection, message: IncomingFrame): void {
    const rules = arenaGame(message.game);
    if (!rules) throw refuse('arena_game', 'That game is not available.');
    if (!ctx.allow(`arena:create:${ws.session.id}`, TUNING.createsPerMinute, 60000)) throw refuse('arena_rate', 'You are starting games too fast. Wait a minute.');
    exit(ws);
    if (rooms.size >= TUNING.maxRooms) throw refuse('arena_busy', 'Too many games are on right now. Try again in a minute.');
    const practice = message.practice === true;
    const code = newCode(rules.id, (c) => rooms.has(c));
    const options = cleanArenaOptions(rules, message.options);
    const room: Room = { code, rules, host: ws.session.id, practice, status: 'lobby', seats: [], options, sockets: new Set(), state: null, rng: Math.random, match: 0, result: null, tick: 0, nextAt: 0, timer: null, lastText: '', lastSentTick: 0, snap: null, emptySince: 0, since: clock(), rec: null, replayId: null };
    rooms.set(code, room);
    takeSeat(room, ws, lookOf(message.look));
    attach(room, ws);
    if (practice) { fillBots(room, Number(message.seats)); startMatch(room); } else announce(room);
  }
  function join(ws: WsConnection, message: IncomingFrame, watchOnly = false): void {
    const room = roomOf(message);
    const id = ws.session.id;
    const known = seatOf(room, id) >= 0;
    if (room.practice && !known) throw refuse('arena_full', 'That is a practice game. Make your own, or ask for a link to a real game.');
    if (at.get(ws) !== room && !known && watching(room) >= TUNING.maxWatchers && (watchOnly || room.seats.length >= room.rules.seats.max)) throw refuse('arena_full', 'That game is full of people watching.');
    attach(room, ws);
    if (!known && !watchOnly && (room.status === 'lobby' || room.status === 'over') && takeSeat(room, ws, lookOf(message.look))) {
      // Over, and the table was left to one person: a new arrival sits down and the pair may ask for a rematch.
      if (room.status === 'lobby' && room.seats.length >= room.rules.seats.max) startMatch(room); else announce(room);
      return;
    }
    announce(room);
  }
  function start(ws: WsConnection, message: IncomingFrame): void {
    const room = roomOf(message);
    if (room.host !== ws.session.id) throw refuse('arena_not_host', 'Only the person who made the game can start it.');
    if (room.status !== 'lobby') throw refuse('arena_started', 'The game has started.');
    if (message.bots !== undefined && Number(message.bots) > 0) fillBots(room, Number(message.seats));
    if (room.seats.length < room.rules.seats.min) throw refuse('arena_need_players', 'You need someone to play against. Share the link, or play the computer.');
    startMatch(room);
  }
  function options(ws: WsConnection, message: IncomingFrame): void {
    const room = roomOf(message);
    if (room.host !== ws.session.id) throw refuse('arena_not_host', 'Only the person who made the game can change the rules.');
    if (room.status === 'playing') throw refuse('arena_started', 'The game has started.');
    room.options = cleanArenaOptions(room.rules, { ...room.options, ...(isRecord(message.options) ? message.options : {}) });
    announce(room);
  }
  function input(ws: WsConnection, message: IncomingFrame): void {
    const room = at.get(ws);
    if (!room || room.status !== 'playing' || message.room !== room.code) return;
    const index = seatOf(room, ws.session.id), seat = room.seats[index];
    if (!seat) return;
    const t = clock();
    seat.tokens = Math.min(TUNING.inputBurst, seat.tokens + (t - seat.refilled) / 1000 * TUNING.inputPerSecond); seat.refilled = t;
    if (seat.tokens < 1) return;
    seat.tokens -= 1;
    let parsed: unknown;
    try { parsed = room.rules.parseInput(message.i); } catch { return; }
    seat.input = room.rules.reduce ? room.rules.reduce(seat.input, parsed) : parsed;
    if (typeof message.n === 'number' && Number.isSafeInteger(message.n) && message.n > seat.lastN) seat.lastN = message.n;
  }
  function again(ws: WsConnection, message: IncomingFrame): void {
    const room = roomOf(message);
    const index = seatOf(room, ws.session.id);
    if (index < 0) throw refuse('arena_not_seated', 'You are not playing in this game.');
    if (room.status !== 'over') return;
    const seat = room.seats[index];
    if (seat) seat.again = true;
    for (const other of room.seats) if (other.bot) other.again = true;
    const here = room.seats.filter((s) => !s.left);
    if (here.length >= room.rules.seats.min && here.every((s) => s.again)) { startMatch(room); return; }
    announce(room);
  }
  function leave(ws: WsConnection, message: IncomingFrame): void {
    const room = at.get(ws);
    if (!room || (typeof message.room === 'string' && message.room !== room.code)) return;
    exit(ws);
  }

  return {
    create: async (ws: WsConnection, message: IncomingFrame) => { create(ws, message); },
    join: async (ws: WsConnection, message: IncomingFrame) => { join(ws, message); },
    watch: async (ws: WsConnection, message: IncomingFrame) => { join(ws, message, true); },
    start: async (ws: WsConnection, message: IncomingFrame) => { start(ws, message); },
    options: async (ws: WsConnection, message: IncomingFrame) => { options(ws, message); },
    input: (ws: WsConnection, message: IncomingFrame) => { input(ws, message); },
    again: async (ws: WsConnection, message: IncomingFrame) => { again(ws, message); },
    leave: async (ws: WsConnection, message: IncomingFrame) => { leave(ws, message); },
    drop: (ws: WsConnection) => { detach(ws); },
    /** The public view of a finished match's replay, or null (unknown, or expired). */
    replay: (id: string): { id: string; at: number; clip: string | null; log: ReplayLog } | null => shelf.view(id, ctx.now()),
    /** The operator says a clip of this replay can be fetched at `url` (a path on this site or an https address to an mp4). */
    setClip: (id: string, url: string): boolean => shelf.setClip(id, url, ctx.now()),
    /** For tests and the operator: how many rooms are open, and (for a code) a room's status. */
    stats: () => ({ rooms: rooms.size, sockets: at.size, status: (code: string) => rooms.get(code)?.status ?? null, humans: (code: string) => { const room = rooms.get(code); return room ? humans(room) : 0; } }),
  };
}
