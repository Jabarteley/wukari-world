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
 *   playing  ticks. A seat whose connection drops is steered by the game's bot (never left idle) for up to TUNING.awayForfeitMs
 *            (15 s, for prepaid networks that drop for seconds); the person takes it back when they return, or it forfeits after.
 *   over     the result stays; every person seated may ask for a rematch (it starts when all asked). Seats of people
 *            who left are freed for the next arrival.
 * Anyone with the code who finds no free seat (or asks to) WATCHES: same snapshots, no input, at most TUNING.maxWatchers.
 *
 * LIMITS. A socket is in one room at a time. A player makes TUNING.createsPerMinute rooms a minute; the host holds at most
 * TUNING.maxRooms rooms; a seat's inputs are a token bucket (TUNING.inputBurst, TUNING.inputPerSecond; the surplus is dropped without a
 * word); a room with nobody connected closes after TUNING.emptyMs; a lobby after TUNING.lobbyMs; a finished room after TUNING.overMs.
 * Nothing is stored: a restart ends every room (the host keeps the Worker awake by its own timers while rooms exist,
 * see ctx.core.hibernates). A finished match's replay log is kept on a small shelf (./arena-replays.ts) for its replay and clip links.
 *
 * DRIVEN ROOMS (`hostDriven`, `feedDriven`): the room of an agent tournament match (server/tournaments/live.ts). Its seats are the two agents,
 * held by no socket; its ticks come from the match's decision windows, already turned into one input per seat per tick, and it plays them at
 * the game's own speed and then waits for the next window. Everyone who opens its code watches: nobody takes a seat, sends input, stakes
 * or backs. It closes TUNING.drivenIdleMs after its last window, or TUNING.overMs after the result, like any room.
 */
import { makeRng } from '../../src/game/util.ts';
import { withNames } from '../../src/tables/rules.ts';
import { arenaGame } from '../../src/arena/registry.ts';
import { cleanArenaOptions } from '../../src/arena/rules.ts';
import { ROOM_CODE } from '../../src/arena/code.ts';
import type { RealtimeRules } from '../../src/arena/rules.ts';
import { ReplayRecorder } from '../../src/arena/replay.ts';
import type { ReplayLog } from '../../src/arena/replay.ts';
import { CARTRIDGE_LIMITS } from '../../src/arena/cartridge-limits.ts';
import { cartridgeOf } from '../../src/arena/cartridges.ts';
import { replayShelf } from './arena-replays.ts';
import { arenaStakes } from './arena-stakes.ts';
import { gistService } from '../gist/ledger.ts';
import { arenaDaily } from './arena-daily.ts';
import { characterCity } from '../character.ts';
import { PLAY_MONEY, backLine, backingOpen, isPlayStake, playLine, stakeHolds } from '../../src/arena/stakes.ts';
import { cleanNativeLook } from '../../src/arena/native-look.ts';
import type { ArenaLook, ArenaNative, ArenaResult, ArenaSeat, ArenaStateFrame, ArenaStatus } from '../../src/types/arena.ts';
import type { TableOptionValue } from '../../src/types/growth.ts';
import type { IncomingFrame, RouteContext, WsConnection } from '../types.ts';
import type { SocketErrorCode } from '../../src/types/protocol.ts';

/** Limits and timings. A test may change them; nothing else should. `speed` multiplies the tick rate (tests only). */
export const TUNING = {
  speed: 1, maxRooms: 300, maxWatchers: 20, createsPerMinute: 8, inputBurst: 30, inputPerSecond: 24,
  awayForfeitMs: 15000, awaySeatMs: 30000, emptyMs: 60000, lobbyMs: 15 * 60000, overMs: 10 * 60000, sweepMs: 2000, maxCatchUp: 4,
  /** Replays kept (src/arena/replay.ts, server/growth/arena-replays.ts): per game, per room a day, bytes of JSON each, how long, and the entries one log may grow to before it is dropped. */
  replayPerGame: 30, replayPerRoom: 40, replayBytes: CARTRIDGE_LIMITS.replayBytes, replayTtlMs: 7 * 24 * 3600000, replayEntries: 4000,
  /** Driven rooms: closed after this long with no new window; ticks queued beyond this many are played at once, unseen, so watchers stay near the game. */
  drivenIdleMs: 30 * 60000, drivenQueueMax: 600,
  /** At most this many of the rooms may be driven ones, so agent matches never crowd out people's games. */
  drivenMax: 60,
};
/** One tick of a driven room: every seat's input, or a seat that forfeits. */
export type DrivenTick = unknown[] | { f: number };
const markOf = (ws: WsConnection, now: number): boolean => ws.session.agent === true && (ws.session.agentUntil === undefined || ws.session.agentUntil > now);
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const refuse = (code: string, reason: string) => Object.assign(new Error(code), { reason });
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const clock = (): number => (typeof performance !== 'undefined' ? performance.now() : Date.now());

interface Seat {
  id: string; name: string; bot: boolean; look?: ArenaLook; nat?: ArenaNative
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
  /** STAKES (./arena-stakes.ts). What each of two people puts in, set by the host in the lobby (0: free). */
  stake: number
  /** The pot of the next or current match, and whether money is in it. A new id for every match. */
  potId: string
  money: boolean
  /** The stakes are being taken: the match starts when they are (or the start is refused). */
  starting: boolean
  /** Who backed which seat with what this match (shown back to them), and each person's sentence once a match settled. */
  backs: Map<string, { seat: number; amount: number }>
  stakeLines: Map<string, string>
  /** A driven room (see the header): its queued ticks, when it was last fed, and what to call with the replay once it is over. */
  driven?: { queue: DrivenTick[]; fedAt: number; onOver?: (replay: string | null) => void }
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

function newPotId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return 'p-' + [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
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
  const stakes = arenaStakes(ctx);
  const daily = arenaDaily(ctx);
  const shelf = replayShelf(ctx, () => ({ perGame: TUNING.replayPerGame, perRoom: TUNING.replayPerRoom, bytes: TUNING.replayBytes, ttlMs: TUNING.replayTtlMs }));

  // In a driven room no connection holds a seat (an agent playing its owner's own character must not be steered by the owner's phone).
  const seatOf = (room: Room, id: string): number => (room.driven ? -1 : room.seats.findIndex((seat) => !seat.bot && !seat.left && seat.id === id));
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
      seats: room.seats.map((s): ArenaSeat => ({ name: s.name, bot: s.bot, ...(s.bot ? {} : { id: s.id }), ...(s.ai ? { ai: true as const } : {}), ...(s.away > 0 && !s.left ? { away: true as const } : {}), ...(s.look ? { look: s.look } : {}), ...(s.nat ? { nat: s.nat } : {}) })),
      max: room.rules.seats.max, min: room.rules.seats.min, watchers, options: room.options,
      optionList: Object.entries(room.rules.options as Record<string, { label: string; values: readonly TableOptionValue[]; names?: readonly string[] }>).map(([name, spec]) => ({ name, label: spec.label, values: [...spec.values], names: spec.names ? [...spec.names] : spec.values.map(String), value: room.options[name] as TableOptionValue })),
      again: room.seats.map((s) => s.again), practice: room.practice,
      result: room.result ? { text: room.result.text, winners: room.result.winners, draw: room.result.draw, reason: room.result.reason, scores: room.result.scores, ...(room.result.places ? { places: room.result.places } : {}) } : null,
      snap: room.status === 'lobby' ? null : room.snap, match: room.match,
      ...(room.status === 'over' && room.replayId ? { replay: room.replayId } : {}),
      ...(room.practice || room.driven ? {} : { stakes: stakeView(room, id, seat) }),
      ...(room.driven ? { driven: true as const } : {}),
    };
  }
  /** What a person in the room is told about its stakes. */
  function stakeView(room: Room, id: string, seat: number): NonNullable<ArenaStateFrame['stakes']> {
    const holds = stakeHolds(room.seats), backed = room.backs.get(id), line = room.stakeLines.get(id);
    const open = seat < 0 && !backed && backingOpen(room.status, room.tick, room.rules.hz);
    return {
      amount: room.stake, line: room.stake > 0 ? playLine(room.stake) : '', note: PLAY_MONEY,
      ...(room.stake > 0 && !holds && room.status === 'lobby' ? { free: 'A stake is only played between two people with no computer seat: as it is, this match is free.' } : {}),
      back: open, ...(backed ? { backed: { seat: backed.seat, amount: backed.amount, line: backLine(room.seats[backed.seat]?.name ?? 'the player', backed.amount) } } : {}),
      ...(line ? { result: line } : {}),
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
  function takeSeat(room: Room, ws: WsConnection, look: ArenaLook | undefined, nat?: ArenaNative): boolean {
    const reuse = room.seats.findIndex((s) => s.left);
    if (reuse < 0 && room.seats.length >= room.rules.seats.max) return false;
    const seat: Seat = { id: ws.session.id, name: ws.session.name, bot: false, ai: markOf(ws, ctx.now()), ...(look ? { look } : {}), ...(nat ? { nat } : {}), away: 0, left: false, input: room.rules.idle(), again: false, tokens: TUNING.inputBurst, refilled: clock(), lastN: 0, ackN: 0 };
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
    // A room that closes with money in its pot and no result gives every stake back.
    if (room.money) { room.money = false; void stakes.drop(room.potId); }
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
  /**
   * Start the next match, taking the two players' stakes first when the room is played for one. A refusal keeps the room where it was
   * (the lobby, or the result of the last match) and tells the person who asked why, or that the other player cannot.
   */
  async function begin(room: Room, caller: string): Promise<void> {
    if (room.starting || (room.status !== 'lobby' && room.status !== 'over')) return;
    const people = room.seats.filter((s) => !s.left);
    if (room.stake > 0 && !room.practice && stakeHolds(people)) {
      room.starting = true;
      let answer;
      try { answer = await stakes.play(room.potId, room.rules.id, room.rules.label, people.map((s) => ({ id: s.id, name: s.name })), room.stake, caller); }
      finally { room.starting = false; }
      // The room may have closed while the stakes were taken (read afresh: the await let anything happen).
      if (isClosed(room)) { if (answer.ok) void stakes.drop(room.potId); return; }
      if (!answer.ok) { for (const seat of people) seat.again = false; announce(room); throw refuse(answer.code, answer.reason); }
      room.money = true;
    }
    room.stakeLines = new Map();
    startMatch(room);
  }
  const dtOf = (room: Room): number => 1000 / (room.rules.hz * TUNING.speed);

  function schedule(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
    if (room.status !== 'playing') return;
    // A driven room waits for its next window with no timer (the sweep keeps an eye on it).
    if (room.driven && !room.driven.queue.length) return;
    room.timer = setTimeout(() => { room.timer = null; pump(room); }, Math.max(0, room.nextAt - clock()));
    room.timer.unref?.();
  }
  function pump(room: Room): void {
    if (room.status !== 'playing') return;
    let ran = 0;
    const dt = dtOf(room);
    while (room.status === 'playing' && clock() >= room.nextAt && ran < TUNING.maxCatchUp && (!room.driven || room.driven.queue.length > 0)) { runTick(room); room.nextAt += dt; ran += 1; }
    // Far behind (a stalled host): do not try to replay the lost time.
    if (clock() - room.nextAt > dt * 8) room.nextAt = clock() + dt;
    schedule(room);
  }
  function runTick(room: Room): void {
    if (room.driven) { drivenTick(room, true); return; }
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
  /** One queued tick of a driven room (`show`: broadcast it, as a normal tick is). */
  function drivenTick(room: Room, show: boolean): void {
    const next = room.driven?.queue.shift();
    if (next === undefined) return;
    const rules = room.rules;
    if (!Array.isArray(next)) {
      const seat = next.f;
      if (seat >= 0 && seat < room.seats.length) { room.rec?.forfeit(seat); room.state = rules.forfeit(room.state, seat); }
    } else {
      const inputs = room.seats.map((_, index) => next[index] ?? rules.idle());
      room.rec?.tick(inputs, room.seats.map(() => false));
      if (room.rec && room.rec.size > TUNING.replayEntries) room.rec = null;
      room.state = rules.step(room.state, inputs, room.rng);
      room.tick += 1;
    }
    room.snap = rules.snapshot(room.state);
    const text = JSON.stringify(room.snap);
    if (show && (text !== room.lastText || room.tick - room.lastSentTick >= rules.hz)) {
      room.lastText = text; room.lastSentTick = room.tick;
      sendAll(room, { type: 'arena-snap', room: room.code, k: room.tick, s: room.snap });
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
    // Did anyone play? A match nobody pressed anything in gives the stakes back, as a table game nobody moved in does.
    const moved = !room.rec || room.rec.i.length > 0 || room.tick > room.rules.hz * 5;
    if (room.money) {
      const potId = room.potId;
      room.money = false;
      void stakes.settle(potId, outcome, moved).then((lines) => { for (const [who, text] of lines) room.stakeLines.set(who, text); if (room.status !== 'closed') announce(room); });
    }
    room.potId = newPotId(); room.backs = new Map();
    if (room.rec) {
      const log = room.rec.finish({ ...outcome, text: outcome.text }, room.snap, names);
      room.rec = null;
      const id = newReplayId();
      if (shelf.put(id, room.code, room.seats.filter((s) => !s.bot).map((s) => s.id), log, ctx.now())) room.replayId = id;
    }
    for (const seat of room.seats) seat.again = false;
    sendAll(room, { type: 'arena-snap', room: room.code, k: room.tick, s: room.snap });
    // The ladders and city leagues listen (server/clans/, src/clans/results.ts): a finished game is told once, with the seats and who won.
    if (!room.practice && !room.driven) tellTheCity(room, outcome);
    // The daily challenge (src/arena/daily.ts): a practice match against the computer may meet today's goal.
    if (room.practice) room.seats.forEach((seat, index) => {
      if (seat.bot) return;
      const hp = (room.snap as { f?: number[][] } | null)?.f?.[index]?.[5];
      daily.record(room.rules.id, seat.id, { won: !outcome.draw && outcome.winners.length === 1 && outcome.winners[0] === index, reason: outcome.reason, seconds: room.tick / room.rules.hz, hpLeft: typeof hp === 'number' ? hp : 0 });
    });
    // Not an agent tournament's room: its match is the arena's own record (server/tournaments/), and agents' results stay apart from people's.
    if (!room.practice && !room.driven) ctx.emit?.('game-result', { match: `${room.code}.${room.match}`, game: room.rules.id, at: ctx.now(), seats: room.seats.map((seat) => ({ id: seat.id, bot: seat.bot })), winners: outcome.winners, draw: outcome.draw, ...(ranked ? { places: ranked } : {}) });
    announce(room);
    if (room.driven) { room.driven.queue = []; try { room.driven.onOver?.(room.replayId) } catch { /* the tournament keeps its own result */ } }
  }

  /**
   * A match between people becomes a line of the winner's city gist ("Ada beat Bola at Fight", and that a crowd watched when one did).
   * The gist names adults only (a minor or a player who has not said their age is "a resident") and never an amount; one line a pair an hour, so rematches do not fill it.
   */
  function tellTheCity(room: Room, outcome: { winners: number[]; draw: boolean }): void {
    // Someone who walked away (a forfeit) still played the match.
    const people = room.seats.filter((s) => !s.bot), winner = room.seats[outcome.winners[0] ?? -1];
    if (outcome.draw || outcome.winners.length !== 1 || !winner || winner.bot || people.length < 2) return;
    const losers = people.filter((s) => s !== winner);
    const pair = [winner.id, ...losers.map((s) => s.id)].sort().join('|');
    if (!ctx.allow(`arena:gist:${pair}`, 1, 3600000)) return;
    const crowd = watching(room), label = room.rules.label;
    const text = losers.length === 1 ? `{0} beat {1} at ${label}${crowd >= 3 ? ` while ${crowd} people watched` : ''}.` : `{0} won a ${label} against ${losers.length} others${crowd >= 3 ? ` while ${crowd} people watched` : ''}.`;
    const work = ctx.store.transact((db) => {
      const session = ctx.core.sessionByPublicId(db, winner.id), city = session ? characterCity(session) : null;
      if (!city) return;
      gistService(ctx).add(db, { city, kind: 'other', text, people: [{ id: winner.id, name: winner.name }, ...(losers.length === 1 ? [{ id: losers[0]!.id, name: losers[0]!.name }] : [])], refs: { key: `arena:${room.code}.${room.match}` } });
    }, { durable: false }).catch(() => undefined);
    ctx.waitUntil?.(work);
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
      if (room.driven) {
        if ((room.status === 'over' && t - room.since >= TUNING.overMs) || (room.status === 'playing' && !room.driven.queue.length && t - room.driven.fedAt >= TUNING.drivenIdleMs)) close(room);
        continue;
      }
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
    const room: Room = { code, rules, host: ws.session.id, practice, status: 'lobby', seats: [], options, sockets: new Set(), state: null, rng: Math.random, match: 0, result: null, tick: 0, nextAt: 0, timer: null, lastText: '', lastSentTick: 0, snap: null, emptySince: 0, since: clock(), rec: null, replayId: null, stake: 0, potId: newPotId(), money: false, starting: false, backs: new Map(), stakeLines: new Map() };
    rooms.set(code, room);
    takeSeat(room, ws, lookOf(message.look), cleanNativeLook(message.nat));
    attach(room, ws);
    if (practice) { fillBots(room, Number(message.seats)); startMatch(room); } else announce(room);
  }
  function join(ws: WsConnection, message: IncomingFrame, watchOnly = false): void {
    const room = roomOf(message);
    if (room.driven) watchOnly = true;
    const id = ws.session.id;
    const known = seatOf(room, id) >= 0;
    if (room.practice && !known) throw refuse('arena_full', 'That is a practice game. Make your own, or ask for a link to a real game.');
    if (at.get(ws) !== room && !known && watching(room) >= TUNING.maxWatchers && (watchOnly || room.seats.length >= room.rules.seats.max)) throw refuse('arena_full', 'That game is full of people watching.');
    attach(room, ws);
    if (!known && !watchOnly && (room.status === 'lobby' || room.status === 'over') && takeSeat(room, ws, lookOf(message.look), cleanNativeLook(message.nat))) {
      // Over, and the table was left to one person: a new arrival sits down and the pair may ask for a rematch.
      if (room.status === 'lobby' && room.seats.length >= room.rules.seats.max) void begin(room, room.host).catch((error: Error & { reason?: string }) => { for (const other of room.sockets) send(other, { type: 'error', code: error.message as SocketErrorCode, error: error.message as SocketErrorCode, reason: error.reason ?? 'The match could not start.' }); }); else announce(room);
      return;
    }
    announce(room);
  }
  async function start(ws: WsConnection, message: IncomingFrame): Promise<void> {
    const room = roomOf(message);
    if (room.host !== ws.session.id) throw refuse('arena_not_host', 'Only the person who made the game can start it.');
    if (room.status !== 'lobby') throw refuse('arena_started', 'The game has started.');
    if (message.bots !== undefined && Number(message.bots) > 0) fillBots(room, Number(message.seats));
    if (room.seats.length < room.rules.seats.min) throw refuse('arena_need_players', 'You need someone to play against. Share the link, or play the computer.');
    await begin(room, ws.session.id);
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
    if (!room || room.driven || room.status !== 'playing' || message.room !== room.code) return;
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
  async function again(ws: WsConnection, message: IncomingFrame): Promise<void> {
    const room = roomOf(message);
    const index = seatOf(room, ws.session.id);
    if (index < 0) throw refuse('arena_not_seated', 'You are not playing in this game.');
    if (room.status !== 'over') return;
    const seat = room.seats[index];
    if (seat) seat.again = true;
    for (const other of room.seats) if (other.bot) other.again = true;
    const here = room.seats.filter((s) => !s.left);
    if (here.length >= room.rules.seats.min && here.every((s) => s.again)) { await begin(room, ws.session.id); return; }
    announce(room);
  }
  /** The host sets what each of the two players puts in (lobby only; 0 plays free). Checked against the host's own allowance now. */
  async function setStake(ws: WsConnection, message: IncomingFrame): Promise<void> {
    const room = roomOf(message);
    if (room.host !== ws.session.id) throw refuse('arena_not_host', 'Only the person who made the game can set the stake.');
    if (room.practice) throw refuse('stake_refused', 'A practice game is free.');
    if (room.status !== 'lobby' || room.starting) throw refuse('arena_started', 'The stake is set before the match starts.');
    const amount = message.amount;
    if (!isPlayStake(amount)) throw refuse('invalid_stake', 'Choose one of the stakes, or play for nothing.');
    if (amount > 0) {
      const others = room.seats.filter((s) => !s.bot && s.id !== ws.session.id).map((s) => s.id);
      const no = await stakes.refusal(ws.session.id, others, amount);
      if (no && !no.ok) throw refuse(no.code, no.reason);
    }
    room.stake = amount;
    announce(room);
  }
  /** Someone watching backs a seat (a person, an agent or a house bot) while backing is open. */
  async function back(ws: WsConnection, message: IncomingFrame): Promise<void> {
    const room = roomOf(message);
    if (at.get(ws) !== room) throw refuse('arena_not_watching', 'Open the match to back a player.');
    if (room.practice) throw refuse('stake_refused', 'A practice game cannot be backed.');
    if (room.driven) throw refuse('stake_refused', 'An agent tournament match cannot be backed.');
    if (!backingOpen(room.status, room.tick, room.rules.hz)) throw refuse('backing_closed', 'Backing closes ten seconds into a match.');
    const id = ws.session.id;
    if (seatOf(room, id) >= 0) throw refuse('stake_refused', 'You are playing in this match: you cannot back a side.');
    const seat = Number(message.seat), amount = Number(message.amount), potId = room.potId;
    const answer = await stakes.back(potId, room.rules.id, room.rules.label, room.seats.map((s) => s.name), room.seats.filter((s) => !s.bot && !s.left).map((s) => s.id), { id, name: ws.session.name }, seat, amount);
    if (!answer.ok) throw refuse(answer.code, answer.reason);
    if (room.potId !== potId || room.status === 'closed') { void stakes.drop(potId); return; }
    room.money = true;
    room.backs.set(id, { seat, amount });
    announce(room);
  }
  function leave(ws: WsConnection, message: IncomingFrame): void {
    const room = at.get(ws);
    if (!room || (typeof message.room === 'string' && message.room !== room.code)) return;
    exit(ws);
  }

  /**
   * A driven room for an agent tournament match, playing at once: `seed` and the game's default options are the match's own, so the room
   * replays exactly the game the match engine holds. Null when the game is unknown or too many rooms are open.
   */
  function hostDriven(spec: { game: string; seed: string; seats: readonly { id: string; name: string }[]; onOver?: (replay: string | null) => void }): string | null {
    const rules = arenaGame(spec.game);
    if (!rules || rooms.size >= TUNING.maxRooms || spec.seats.length < rules.seats.min || spec.seats.length > rules.seats.max) return null;
    if ([...rooms.values()].filter((room) => room.driven).length >= TUNING.drivenMax) return null;
    const code = newCode(rules.id, (c) => rooms.has(c));
    const seats: Seat[] = spec.seats.map((s) => ({ id: s.id, name: s.name, bot: false, ai: true, away: 0, left: false, input: rules.idle(), again: false, tokens: 0, refilled: 0, lastN: 0, ackN: 0 }));
    const room: Room = { code, rules, host: '', practice: false, status: 'lobby', seats, options: cleanArenaOptions(rules, {}), sockets: new Set(), state: null, rng: Math.random, match: 0, result: null, tick: 0, nextAt: 0, timer: null, lastText: '', lastSentTick: 0, snap: null, emptySince: 0, since: clock(), rec: null, replayId: null, stake: 0, potId: newPotId(), money: false, starting: false, backs: new Map(), stakeLines: new Map(),
      driven: { queue: [], fedAt: clock(), ...(spec.onOver ? { onOver: spec.onOver } : {}) } };
    rooms.set(code, room);
    room.seats = seats;
    const seed = spec.seed;
    room.rng = makeRng(seed);
    room.state = rules.start(seats.length, room.rng, cleanArenaOptions(rules, room.options));
    room.status = 'playing'; room.match = 1; room.tick = 0;
    room.rec = new ReplayRecorder({ game: rules.id, rev: cartridgeOf(rules.id)?.rev ?? 1, hz: rules.hz, seed, options: cleanArenaOptions(rules, room.options), seats: seats.map((s) => ({ name: s.name, bot: false, ai: true as const })) }, JSON.stringify(rules.idle()));
    room.snap = rules.snapshot(room.state); room.lastText = JSON.stringify(room.snap);
    ensureSweeper();
    return code;
  }
  /** Queue ticks for a driven room. `quiet`: play them now, unseen (a room made again after a restart catches up with its match). False when the room is gone. */
  function feedDriven(code: string, ticks: readonly DrivenTick[], quiet = false): boolean {
    const room = rooms.get(code);
    if (!room?.driven || room.status === 'closed') return false;
    if (room.status !== 'playing') return true;
    room.driven.fedAt = clock();
    room.driven.queue.push(...ticks);
    const behind = quiet ? room.driven.queue.length : room.driven.queue.length - TUNING.drivenQueueMax;
    for (let i = 0; i < behind && room.status === 'playing'; i++) drivenTick(room, false);
    if (quiet || behind > 0) { room.lastText = ''; if (room.status === 'playing') sendAll(room, { type: 'arena-snap', room: room.code, k: room.tick, s: room.snap }); announce(room); }
    if (room.status === 'playing' && !room.timer && room.driven.queue.length) { room.nextAt = clock() + dtOf(room); schedule(room); }
    return true;
  }

  return {
    hostDriven, feedDriven,
    create: async (ws: WsConnection, message: IncomingFrame) => { create(ws, message); },
    join: async (ws: WsConnection, message: IncomingFrame) => { join(ws, message); },
    watch: async (ws: WsConnection, message: IncomingFrame) => { join(ws, message, true); },
    start: async (ws: WsConnection, message: IncomingFrame) => { await start(ws, message); },
    options: async (ws: WsConnection, message: IncomingFrame) => { options(ws, message); },
    input: (ws: WsConnection, message: IncomingFrame) => { input(ws, message); },
    again: async (ws: WsConnection, message: IncomingFrame) => { await again(ws, message); },
    stake: async (ws: WsConnection, message: IncomingFrame) => { await setStake(ws, message); },
    back: async (ws: WsConnection, message: IncomingFrame) => { await back(ws, message); },
    leave: async (ws: WsConnection, message: IncomingFrame) => { leave(ws, message); },
    drop: (ws: WsConnection) => { detach(ws); },
    /** Today's challenge for a game and how this player stands (src/arena/daily.ts). */
    daily: (game: string, player: string | null) => daily.view(game, player),
    /** The public view of a finished match's replay, or null (unknown, or expired). */
    replay: (id: string): Promise<{ id: string; at: number; clip: string | null; log: ReplayLog } | null> => shelf.view(id, ctx.now()),
    /** The operator says a clip of this replay can be fetched at `url` (a path on this site or an https address to an mp4). */
    setClip: (id: string, url: string): Promise<boolean> => shelf.setClip(id, url, ctx.now()),
    /** For tests and the operator: how many rooms are open, and (for a code) a room's status. */
    stats: () => ({ rooms: rooms.size, sockets: at.size, status: (code: string) => rooms.get(code)?.status ?? null, humans: (code: string) => { const room = rooms.get(code); return room ? humans(room) : 0; } }),
  };
}
