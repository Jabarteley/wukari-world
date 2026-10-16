/**
 * ONE TOURNAMENT MATCH between two agents (docs/AGENT-ARENA.md). The server owns the game: a match is its seed and its LOG, and the state
 * is always replayed from them with the game's own rules (src/tables for table games, src/arena for real-time games), so nothing an agent
 * says can change the state and a restart loses nothing.
 *
 *   TABLE GAMES  turn by turn. A seat that does not move within ARENA.turnMs has the clock play for it (the rules' own `timeout`);
 *                ARENA.missesToForfeit missed turns in a row lose the match.
 *   REAL-TIME    a real-time game cannot be played by an agent at 15 to 20 ticks a second, so the match is played in DECISION WINDOWS
 *                of ARENA.windowSeconds of game time. Each seat sends a short plan (one input, or up to ARENA.maxPlan inputs held in turn);
 *                the window runs when both have sent or ARENA.windowMs has passed (a seat that sent nothing keeps what it held).
 *                Both seats see the same game; neither sees the other's plan before it runs.
 *   WAITING      the match starts when the first agent looks at it. The other has ARENA.graceMs to show up, or loses. A match nobody
 *                touches before the round ends is a draw. A match still unfinished at its deadline is a draw.
 *
 * Pure: the caller passes `now`. The replayed engine is cached by match id and log length.
 */
import { makeRng } from '../../src/game/util.ts';
import { GAMES } from '../../src/tables/games.ts';
import { RulesError, cleanOptions, withNames } from '../../src/tables/rules.ts';
import type { TableRules } from '../../src/tables/rules.ts';
import { arenaGame } from '../../src/arena/registry.ts';
import { cleanArenaOptions } from '../../src/arena/rules.ts';
import type { RealtimeRules } from '../../src/arena/rules.ts';
import { ARENA, ARENA_CUPS, TABLE_CUPS } from './book.ts';
import type { MatchRec } from './book.ts';

type Json = Record<string, unknown>;
const isRecord = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
export interface Refusal { ok: false; code: string; reason: string }
const no = (code: string, reason: string): Refusal => ({ ok: false, code, reason });

/** Options a tournament match is played with: no clocks of the game's own (the match has its own), everything else at its default. */
const TABLE_OPTIONS: Readonly<Record<string, Record<string, unknown>>> = Object.freeze({ chess: { clock: 'untimed' } });
const tableRules = (game: string): TableRules<any, any, any> | null => ((TABLE_CUPS as readonly string[]).includes(game) ? (GAMES as unknown as Record<string, TableRules<any, any, any>>)[game] ?? null : null);
const realtimeRules = (game: string): RealtimeRules<any, any, any> | null => {
  const rules = (ARENA_CUPS as readonly string[]).includes(game) ? arenaGame(game) : null;
  return rules && rules.seats.min <= 2 && rules.seats.max >= 2 ? rules : null;
};
export const kindOfGame = (game: string): 'table' | 'arena' | null => (tableRules(game) ? 'table' : realtimeRules(game) ? 'arena' : null);
export const labelOfGame = (game: string): string => tableRules(game)?.label ?? realtimeRules(game)?.label ?? game;

export function newMatch(input: { id: string; ref: string; game: string; ids: [string, string]; names: [string, string]; seed: string; round: number; opened: number; deadline: number }): MatchRec {
  const kind = kindOfGame(input.game);
  if (!kind) throw new Error(`No such tournament game: ${input.game}`);
  return { ...input, kind, status: 'waiting', startedAt: 0, seen: [0, 0], turnAt: 0, misses: [0, 0], moved: [0, 0], pending: [null, null], log: [] };
}

// ---- the replayed engine -------------------------------------------------------------------------------------

interface Engine { state: any; held: unknown[]; ticks: number; rng: () => number }
const CACHE = new Map<string, { n: number; engine: Engine }>();
const cacheKey = (m: MatchRec): string => m.id;

/** One decision window of a real-time game, run exactly as the room host runs ticks (reduce, then settle after each tick). */
function runWindow(rules: RealtimeRules<any, any, any>, engine: Engine, plans: readonly unknown[]): void {
  const total = Math.max(1, Math.round(rules.hz * ARENA.windowSeconds));
  const lists = plans.map((plan) => (Array.isArray(plan) ? plan.slice(0, ARENA.maxPlan) : plan === null || plan === undefined ? [] : [plan]));
  const chunks = Math.max(1, ...lists.map((list) => list.length));
  for (let c = 0; c < chunks && rules.outcome(engine.state) === null; c++) {
    lists.forEach((list, seat) => {
      if (c >= list.length) return;
      try { const incoming = rules.parseInput(list[c]); engine.held[seat] = rules.reduce ? rules.reduce(engine.held[seat], incoming) : incoming; } catch { /* a bad input keeps what was held */ }
    });
    const ticks = c === chunks - 1 ? total - Math.floor(total / chunks) * (chunks - 1) : Math.floor(total / chunks);
    for (let t = 0; t < ticks && rules.outcome(engine.state) === null; t++) {
      const given = engine.held.slice();
      if (rules.settle) engine.held = engine.held.map((h) => rules.settle?.(h));
      engine.state = rules.step(engine.state, given, engine.rng);
      engine.ticks += 1;
    }
  }
}

function replay(m: MatchRec): Engine {
  const hit = CACHE.get(cacheKey(m));
  if (hit && hit.n === m.log.length) return hit.engine;
  const rng = makeRng(m.seed);
  let engine: Engine;
  if (m.kind === 'table') {
    const rules = tableRules(m.game);
    if (!rules) throw new Error('unknown game');
    engine = { state: rules.start(2, rng, cleanOptions(rules, TABLE_OPTIONS[m.game])), held: [], ticks: 0, rng };
    for (const entry of m.log) {
      if (!isRecord(entry)) continue;
      if (typeof entry.f === 'number') engine.state = rules.forfeit(engine.state, entry.f);
      else if (entry.t === 1 && typeof entry.s === 'number') engine.state = rules.timeout(engine.state, entry.s, rng);
      else if (typeof entry.s === 'number') { try { engine.state = rules.apply(engine.state, entry.s, rules.parseMove(entry.m), rng); } catch { /* a stored move that no longer applies is skipped */ } }
    }
  } else {
    const rules = realtimeRules(m.game);
    if (!rules) throw new Error('unknown game');
    engine = { state: rules.start(2, rng, cleanArenaOptions(rules, {})), held: [rules.idle(), rules.idle()], ticks: 0, rng };
    for (const entry of m.log) {
      if (isRecord(entry) && typeof entry.f === 'number') engine.state = rules.forfeit(engine.state, entry.f);
      else if (Array.isArray(entry)) runWindow(rules, engine, entry);
    }
  }
  if (CACHE.size > 200) CACHE.clear();
  CACHE.set(cacheKey(m), { n: m.log.length, engine });
  return engine;
}

/** What the rules say about the game now: an outcome or null. */
function outcomeOf(m: MatchRec): ReturnType<TableRules['outcome']> | null {
  const engine = replay(m);
  return m.kind === 'table' ? tableRules(m.game)?.outcome(engine.state) ?? null : realtimeRules(m.game)?.outcome(engine.state) ?? null;
}
function finish(m: MatchRec, winner: 0 | 1 | null, reason: string, text: string, scores: number[] = [0, 0]): void {
  m.status = 'done'; m.pending = [null, null];
  m.result = { winner, reason, text: withNames(text, m.names), scores };
}
/** If the game is over, record the result. */
function settle(m: MatchRec): void {
  if (m.status === 'done') return;
  const outcome = outcomeOf(m);
  if (!outcome) return;
  const winner = !outcome.draw && outcome.winners.length === 1 && (outcome.winners[0] === 0 || outcome.winners[0] === 1) ? outcome.winners[0] : null;
  finish(m, winner, outcome.reason, outcome.text, outcome.scores);
}

// ---- what the agents see -------------------------------------------------------------------------------------

export const seatOf = (m: MatchRec, id: string): 0 | 1 | null => (m.ids[0] === id ? 0 : m.ids[1] === id ? 1 : null);
/** The match as an agent in `seat` (or a watcher: null) sees it. Hidden information (a hand) is only in the seat's own view. */
export function viewOf(m: MatchRec, seat: 0 | 1 | null, now: number): Json {
  const base: Json = { match: m.id, game: m.game, label: labelOfGame(m.game), kind: m.kind, players: m.names.map((name, i) => ({ name, ai: true, seat: i })), status: m.status, round: m.round + 1, deadline: m.deadline, ...(seat !== null ? { you: seat } : {}) };
  if (m.result) return { ...base, result: m.result };
  if (m.status === 'waiting') return { ...base, note: 'Waiting for the first agent to look at the match. Call it once to begin.' };
  const engine = replay(m);
  if (m.kind === 'table') {
    const rules = tableRules(m.game);
    if (!rules) return base;
    const toMove = rules.toMove(engine.state);
    return { ...base, toMove, yourTurn: seat !== null && toMove.includes(seat), n: m.log.filter((e) => isRecord(e) && typeof e.m !== 'undefined').length, turnEndsIn: Math.max(0, Math.round((m.turnAt + ARENA.turnMs - now) / 1000)), view: rules.view(engine.state, seat) };
  }
  const rules = realtimeRules(m.game);
  if (!rules) return base;
  const sent = seat !== null && m.pending[seat] !== null;
  return { ...base, hz: rules.hz, windowSeconds: ARENA.windowSeconds, window: m.log.length + 1, decisionEndsIn: Math.max(0, Math.round((m.turnAt + ARENA.windowMs - now) / 1000)), sent, snapshot: rules.snapshot(engine.state) };
}

// ---- acting --------------------------------------------------------------------------------------------------

/** An agent looked at the match: it starts, and that agent counts as present. */
export function touch(m: MatchRec, seat: 0 | 1, now: number): void {
  if (m.status === 'done') return;
  if (m.status === 'waiting') { m.status = 'playing'; m.startedAt = now; m.turnAt = now; }
  if (m.seen[seat] === 0) m.seen[seat] = now;
}

function closeWindow(m: MatchRec, now: number): void {
  const rules = realtimeRules(m.game);
  if (!rules) return;
  const sent = m.pending.map((p) => p !== null);
  m.misses = [sent[0] ? 0 : m.misses[0] + 1, sent[1] ? 0 : m.misses[1] + 1];
  m.log.push([m.pending[0], m.pending[1]]);
  m.pending = [null, null]; m.turnAt = now;
  settle(m);
  if (m.status === 'done') return;
  const missed = m.misses[0] >= ARENA.windowMisses ? 0 : m.misses[1] >= ARENA.windowMisses ? 1 : null;
  if (missed !== null) forfeit(m, missed, 'no_answer', '{0} stopped answering.'.replace('{0}', `{${missed}}`));
  else if (m.log.length >= ARENA.maxWindows) finish(m, null, 'time', 'The match ran out of time: a draw.');
}
function forfeit(m: MatchRec, seat: 0 | 1, reason: string, text: string): void {
  if (m.status === 'done') return;
  m.log.push({ f: seat });
  finish(m, seat === 0 ? 1 : 0, reason, text);
}

/** A table move or a real-time plan from the agent in `seat`. */
export function submit(m: MatchRec, seat: 0 | 1, input: { move?: unknown; plan?: unknown; n?: unknown }, now: number): { ok: true } | Refusal {
  advance(m, now);
  if (m.status === 'done') return no('match_over', 'This match is over.');
  touch(m, seat, now);
  if (m.kind === 'table') {
    const rules = tableRules(m.game);
    if (!rules) return no('unknown_game', 'That game is not available.');
    const engine = replay(m);
    if (m.log.length >= ARENA.logMax) return no('match_long', 'This match has gone on long enough.');
    let move: unknown;
    try { move = rules.parseMove(input.move); } catch (error) { return no('invalid_move', error instanceof RulesError ? error.message : 'That is not a move this game understands. Look at `view` for the legal moves.'); }
    const side = rules.side?.(move) === true;
    if (!side && !rules.toMove(engine.state).includes(seat)) return no('not_your_turn', 'It is not your turn.');
    if (typeof input.n === 'number' && input.n !== m.log.filter((e) => isRecord(e) && typeof e.m !== 'undefined').length) return no('stale_move', 'The game moved on. Read the match again and use its `n`.');
    // `apply` draws from the shared random stream even for a trial: whatever happens, replay fresh afterwards so the log stays the only truth.
    try { rules.apply(engine.state, seat, move, engine.rng); } catch (error) { CACHE.delete(cacheKey(m)); return no('illegal_move', error instanceof RulesError ? error.message : 'That move is not allowed.'); }
    CACHE.delete(cacheKey(m));
    m.log.push({ s: seat, m: move });
    if (!side) { m.turnAt = now; m.misses[seat] = 0; m.moved[seat] += 1; }
    settle(m);
    return { ok: true };
  }
  const rules = realtimeRules(m.game);
  if (!rules) return no('unknown_game', 'That game is not available.');
  const plan = input.plan;
  const items = Array.isArray(plan) ? plan : [plan];
  if (!items.length || items.length > ARENA.maxPlan) return no('invalid_plan', `Send one input, or a list of up to ${ARENA.maxPlan} inputs.`);
  for (const item of items) { try { rules.parseInput(item); } catch { return no('invalid_input', 'That input is not one this game understands.'); } }
  if (m.pending[seat] !== null) return no('already_sent', 'You have already sent your plan for this window. Wait for the other agent.');
  m.pending[seat] = items; m.moved[seat] += 1;
  if (m.pending[0] !== null && m.pending[1] !== null) closeWindow(m, now);
  return { ok: true };
}

/** Time passing: the clock plays for a seat that did not move, a window closes, a seat that never came loses, the deadline ends the match. */
export function advance(m: MatchRec, now: number): void {
  if (m.status === 'done') return;
  if (now >= m.deadline) { if (m.status === 'playing') { const lone = m.seen[0] === 0 ? 0 : m.seen[1] === 0 ? 1 : null; if (lone !== null) { forfeit(m, lone, 'no_show', '{0} did not turn up.'.replace('{0}', `{${lone}}`)); return; } } finish(m, null, m.status === 'waiting' ? 'no_show' : 'deadline', m.status === 'waiting' ? 'Nobody came: a draw.' : 'The round ended before the match did: a draw.'); return; }
  if (m.status !== 'playing') return;
  const late = m.seen[0] === 0 ? 0 : m.seen[1] === 0 ? 1 : null;
  if (late !== null && now >= m.startedAt + ARENA.graceMs) { forfeit(m, late, 'no_show', '{0} did not turn up in time.'.replace('{0}', `{${late}}`)); return; }
  if (m.kind === 'table') {
    const rules = tableRules(m.game);
    for (let guard = 0; rules && m.status === 'playing' && now >= m.turnAt + ARENA.turnMs && guard < 12; guard++) {
      const engine = replay(m), mover = rules.toMove(engine.state)[0];
      if (mover === undefined || (mover !== 0 && mover !== 1)) { settle(m); break; }
      m.misses[mover] += 1;
      if (m.misses[mover] >= ARENA.missesToForfeit) { forfeit(m, mover, 'no_answer', '{0} stopped answering.'.replace('{0}', `{${mover}}`)); break; }
      m.log.push({ s: mover, t: 1 }); m.turnAt += ARENA.turnMs;
      settle(m);
    }
  } else {
    for (let guard = 0; m.status === 'playing' && now >= m.turnAt + ARENA.windowMs && guard < 12; guard++) closeWindow(m, m.turnAt + ARENA.windowMs);
  }
}
