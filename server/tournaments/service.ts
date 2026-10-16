/**
 * THE TOURNAMENT SERVICE (docs/AGENT-ARENA.md): weekly agent cups, challenges, prizes and spectating. Every function that takes `db` runs inside one
 * store transaction (or a read) and either returns or answers a refusal `{ ok: false, code, reason }` in plain words; the routes and the MCP tools
 * turn that into their own answers. Time only enters through ctx.now(), so a test with a fake clock settles a whole week.
 *
 * THE WEEK (Lagos time): entries Monday and Tuesday for the game cups, Monday to Wednesday for the life cups; game rounds run Wednesday to
 * Saturday night; everything is settled at the end of Sunday. A life cup is measured from the game's own records (life.ts).
 * PRIZES are game naira, paid once, to the agent's character, within ARENA.weeklyPrizeCeiling a week; the owner gets a badge. Only agents
 * claimed by a person can enter (an unclaimed agent has no owner to give a badge to, and no one to hold responsible), one agent for each owner in
 * a cup, and no two entrants in a cup may share an owner or a device.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { characterCity } from '../character.ts';
import { gistService } from '../gist/ledger.ts';
import { prepareStoredCityContent } from '../request-city-content.ts';
import { agentService } from '../agents/service.ts';
import type { AgentCharacter, AgentsCollection } from '../agents/service.ts';
import type { Db, RouteContext } from '../types.ts';
import { ARENA, ARENA_CUPS, LIFE_CATEGORIES, LIFE_LABELS, TABLE_CUPS, bookOf, bracketFirstRound, bracketRounds, cupId, cupKeys, categoryOf, isLifeKey, prizeFor, roundRobin, tableOf, weekOf } from './book.ts';
import type { ArenaBook, Challenge, Cup, CupResult, Entrant, MatchRec, Standing, Week } from './book.ts';
import { figure, ownerKeyOf, related, scoreOf } from './life.ts';
import { advance, kindOfGame, labelOfGame, newMatch, seatOf, submit, touch, viewOf } from './matches.ts';

type Json = Record<string, unknown>;
export interface Refused { ok: false; code: string; reason: string }
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
const isObject = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const keyLabel = (key: string): string => { const c = categoryOf(key); return c ? LIFE_LABELS[c].label : labelOfGame(key); };

export function tournamentService(ctx: RouteContext) {
  const agents = agentService(ctx);
  const now = (): number => ctx.now();
  const weekNow = (): Week => weekOf(now(), lagosTime(now()).week);
  const peekBook = (db: Db): ArenaBook | null => agents.peek(db)?.arena ?? null;
  const writeBook = (db: Db): ArenaBook => bookOf(agents.col(db));
  const charOf = (db: Db, id: string): AgentCharacter | undefined => { const chars = agents.peek(db)?.chars; return chars && Object.hasOwn(chars, id) ? chars[id] : undefined; };
  const holders = (db: Db) => agents.holders(db);
  const ratingOf = (db: Db, id: string, game: string): number => db.growth?.tables?.ratings?.[id]?.[game as 'chess']?.rating ?? 1200;
  const nextId = (book: ArenaBook, prefix: string): string => `${prefix}${(++book.seq).toString(36)}${ctx.randomId().replaceAll('-', '').slice(0, 5)}`;

  // ---- entering a cup --------------------------------------------------------------------------------------------

  /** The cups on offer this week (stored or not yet), with who is in and how it stands. */
  function cupsView(db: Db, viewer: readonly string[] = []) {
    const w = weekNow(), book = peekBook(db), t = now();
    return {
      week: { id: w.id, start: w.start, entryEnd: w.entryEnd, lifeEntryEnd: w.lifeEntryEnd, roundsEnd: w.roundsEnd, end: w.end },
      cups: cupKeys().map((key) => {
        const stored = book?.cups[cupId(w.week, key)];
        const life = isLifeKey(key), closes = life ? w.lifeEntryEnd : w.entryEnd;
        return { id: cupId(w.week, key), key, kind: life ? 'life' as const : 'game' as const, label: keyLabel(key), blurb: life ? LIFE_LABELS[categoryOf(key) ?? 'stall'].blurb : `Agents play ${labelOfGame(key)} against each other, ${stored?.format === 'bracket' ? 'knockout' : 'everyone plays everyone'}.`,
          status: stored?.status ?? 'open', entries: stored?.entrants.length ?? 0, open: t < closes && (stored?.status ?? 'open') === 'open', closes, mine: viewer.filter((id) => stored?.entrants.some((e) => e.id === id)) };
      }),
    };
  }
  /** One cup's standing: a table for a game cup, live scores for a life cup, and the prizes once settled. */
  function cupDetail(db: Db, id: string) {
    const book = peekBook(db), cup = book?.cups[id], t = now();
    if (!book || !cup) return null;
    const names = Object.fromEntries(cup.entrants.map((e) => [e.id, e.name]));
    const matches = (cup.rounds ?? []).flatMap((round) => round.matches.map((m) => book.matches[m]).filter((m): m is MatchRec => m !== undefined));
    const category = categoryOf(cup.key);
    const scores = category && cup.status !== 'void' ? cup.entrants.map((e) => ({ id: e.id, name: e.name, score: cup.results?.find((r) => r.id === e.id)?.score ?? scoreOf(ctx, db, category, e, t, holders) })).sort((a, b) => b.score - a.score || (cup.entrants.findIndex((e) => e.id === a.id) - cup.entrants.findIndex((e) => e.id === b.id))).map((row, index) => ({ rank: index + 1, ...row })) : null;
    const standings: Standing[] | null = !category && cup.format === 'roundrobin' ? tableOf(cup.entrants.map((e) => e.id), names, matches) : null;
    return { id: cup.id, key: cup.key, kind: cup.kind, label: keyLabel(cup.key), week: cup.week, status: cup.status, format: cup.format ?? null, entrants: cup.entrants.map((e) => ({ id: e.id, name: e.name, ai: true })), standings, scores, results: cup.results ?? null, note: cup.note ?? null,
      rounds: (cup.rounds ?? []).map((round, index) => ({ round: index + 1, start: round.start, end: round.end, matches: round.matches.flatMap((m) => { const rec = book.matches[m]; return rec ? [{ match: rec.id, players: rec.names, status: rec.status, winner: rec.result?.winner ?? null, text: rec.result?.text ?? null }] : []; }) })) };
  }

  function enter(db: Db, id: string, key: string): { ok: true; cup: string; code: string } | Refused {
    const t = now(), w = weekNow();
    if (!cupKeys().includes(key)) return no('unknown_cup', 'There is no such cup this week.');
    const char = charOf(db, id);
    if (!char) return no('not_an_agent', 'Only an agent character can enter. Give your agent its own character in Settings, AI agents.');
    if (!char.account) return no('claim_first', 'Only an agent claimed by a person can enter, so there is someone to hold the badge. Claim it with its claim link first.');
    if (!ctx.core.sessionByPublicId(db, id)) return no('character_unavailable', 'This agent character is not available right now.');
    const life = isLifeKey(key), closes = life ? w.lifeEntryEnd : w.entryEnd;
    if (t >= closes) return no('entries_closed', `Entries for this cup closed on ${DAYS[lagosTime(closes - 1).weekday]} night. New cups open on Monday.`);
    if (!life && !kindOfGame(key)) return no('game_unavailable', 'That game is not available for cups right now.');
    const book = writeBook(db), cid = cupId(w.week, key);
    let cup = book.cups[cid];
    if (cup && cup.status !== 'open') return no('entries_closed', 'Entries for this cup are closed.');
    cup ??= (book.cups[cid] = { id: cid, week: w.week, kind: life ? 'life' : 'game', key, entrants: [], status: 'open' });
    if (cup.entrants.some((e) => e.id === id)) return no('already_in', 'Your agent is already in this cup.');
    if (cup.entrants.length >= ARENA.maxEntrants) return no('cup_full', `This cup is full (${ARENA.maxEntrants} agents).`);
    const ok = ownerKeyOf(char.account);
    if (cup.entrants.some((e) => e.ok === ok)) return no('one_per_owner', 'Each person may enter one agent in a cup.');
    if (cup.entrants.some((e) => related(ctx, db, e.id, id))) return no('shared_device', 'Another agent in this cup was entered from the same device or account, so this one cannot join.');
    const category = categoryOf(key);
    cup.entrants.push({ id, name: char.name, ok, seed: 0, enteredAt: t, base: category && category !== 'friends' ? figure(ctx, db, category, id, t, holders) : 0, self: 0 });
    return { ok: true, cup: cid, code: 'entered' };
  }
  function leave(db: Db, id: string, key: string): { ok: true } | Refused {
    const book = peekBook(db), cup = book?.cups[cupId(weekNow().week, key)];
    if (!cup || cup.status !== 'open' || !cup.entrants.some((e) => e.id === id)) return no('not_in', 'Your agent is not in that cup, or the cup has started.');
    cup.entrants = cup.entrants.filter((e) => e.id !== id);
    return { ok: true };
  }

  // ---- running a cup ---------------------------------------------------------------------------------------------

  function startCup(book: ArenaBook, db: Db, cup: Cup, w: Week): void {
    if (cup.entrants.length < 2) { cup.status = 'void'; cup.note = 'Fewer than two agents entered, so the cup was not played.'; return; }
    cup.entrants.sort((a, b) => ratingOf(db, b.id, cup.key) - ratingOf(db, a.id, cup.key) || a.enteredAt - b.enteredAt);
    cup.entrants.forEach((e, index) => { e.seed = index + 1; });
    const ids = cup.entrants.map((e) => e.id), n = ids.length;
    cup.format = n <= ARENA.roundRobinMax ? 'roundrobin' : 'bracket';
    if (cup.format === 'roundrobin') cup.plan = roundRobin(ids);
    const count = cup.format === 'roundrobin' ? (cup.plan?.length ?? 0) : bracketRounds(n), len = Math.floor((w.roundsEnd - w.roundsStart) / Math.max(1, count));
    cup.rounds = Array.from({ length: count }, (_, r) => ({ start: w.roundsStart + r * len, end: r === count - 1 ? w.roundsEnd : w.roundsStart + (r + 1) * len, matches: [] }));
    cup.status = 'running';
  }
  /** Who goes through a bracket match: the winner, or on a draw the better seed. */
  const winnerOf = (cup: Cup, m: MatchRec): string => {
    const w = m.result?.winner;
    if (w === 0 || w === 1) return m.ids[w];
    const seed = (id: string): number => cup.entrants.find((e) => e.id === id)?.seed ?? 99;
    return seed(m.ids[0]) <= seed(m.ids[1]) ? m.ids[0] : m.ids[1];
  };
  /** Make the matches of every round whose time has come. */
  function openRounds(book: ArenaBook, cup: Cup, t: number): void {
    const rounds = cup.rounds ?? [];
    rounds.forEach((round, r) => {
      if (round.matches.length || (round.byes?.length ?? 0) > 0 || t < round.start) return;
      let pairs: [string, string][] = [];
      if (cup.format === 'roundrobin') pairs = cup.plan?.[r] ?? [];
      else if (r === 0) { const first = bracketFirstRound(cup.entrants.map((e) => e.id)); pairs = first.pairs; round.byes = first.byes; }
      else {
        const before = rounds[r - 1];
        if (!before) return;
        const alive = [...before.matches.map((m) => book.matches[m]).filter((m): m is MatchRec => m !== undefined).map((m) => winnerOf(cup, m)), ...(before.byes ?? [])];
        const seedOf = (id: string): number => cup.entrants.find((e) => e.id === id)?.seed ?? 99;
        alive.sort((a, b) => seedOf(a) - seedOf(b));
        const byes: string[] = [];
        if (alive.length % 2) { const top = alive.shift(); if (top) byes.push(top); }
        for (let i = 0; i < alive.length / 2; i++) { const a = alive[i], b = alive[alive.length - 1 - i]; if (a && b) pairs.push([a, b]); }
        round.byes = byes;
      }
      const name = (id: string): string => cup.entrants.find((e) => e.id === id)?.name ?? 'Agent';
      for (const pair of pairs) {
        const id = nextId(book, 'm');
        book.matches[id] = newMatch({ id, ref: cup.id, game: cup.key, ids: pair, names: [name(pair[0]), name(pair[1])], seed: ctx.randomId(), round: r, opened: round.start, deadline: round.end });
        round.matches.push(id);
      }
      if (!pairs.length && !(round.byes?.length)) round.byes = [];
    });
  }

  /** Rank a finished cup. Game cups: the table, or how late each agent went out of the bracket. Life cups: the score. */
  function rankCup(db: Db, book: ArenaBook, cup: Cup, t: number): CupResult[] {
    const category = categoryOf(cup.key);
    if (category) {
      return cup.entrants.map((e, index) => ({ id: e.id, name: e.name, score: scoreOf(ctx, db, category, e, t, holders), index })).sort((a, b) => b.score - a.score || a.index - b.index).map((row, i) => ({ rank: i + 1, id: row.id, name: row.name, score: row.score, prize: 0 }));
    }
    const matches = (cup.rounds ?? []).flatMap((round) => round.matches.map((m) => book.matches[m]).filter((m): m is MatchRec => m !== undefined));
    const names = Object.fromEntries(cup.entrants.map((e) => [e.id, e.name]));
    if (cup.format === 'roundrobin') return tableOf(cup.entrants.map((e) => e.id), names, matches).map((row) => ({ rank: row.rank, id: row.id, name: row.name, score: row.points, prize: 0 }));
    const exit = new Map<string, number>(cup.entrants.map((e) => [e.id, -1]));
    (cup.rounds ?? []).forEach((round, r) => {
      for (const id of round.byes ?? []) exit.set(id, Math.max(exit.get(id) ?? -1, r));
      for (const m of round.matches) { const rec = book.matches[m]; if (!rec) continue; const win = winnerOf(cup, rec); for (const id of rec.ids) exit.set(id, Math.max(exit.get(id) ?? -1, id === win ? r + 1 : r)); }
    });
    return cup.entrants.map((e, index) => ({ id: e.id, name: e.name, score: exit.get(e.id) ?? -1, index })).sort((a, b) => b.score - a.score || a.index - b.index).map((row, i) => ({ rank: i + 1, id: row.id, name: row.name, score: row.score, prize: 0 }));
  }

  function settleCup(db: Db, book: ArenaBook, cup: Cup, t: number): string[] {
    const lines: string[] = [];
    cup.results = rankCup(db, book, cup, t);
    const owners = new Set(cup.entrants.map((e) => e.ok));
    const pays = owners.size >= ARENA.minOwnersForPrizes;
    if (!pays) cup.note = `Fewer than ${ARENA.minOwnersForPrizes} people entered, so no prizes this week. The standings still count.`;
    const label = keyLabel(cup.key);
    for (const result of cup.results) {
      const qualifies = categoryOf(cup.key) || cup.format === 'roundrobin' ? result.score > 0 : true;
      const prize = pays && qualifies ? prizeFor(result.rank) : 0;
      result.prize = prize;
      if (result.rank > 3 || !qualifies) continue;
      (book.badges[result.id] ??= []).push({ week: cup.week, kind: cup.key, label: `${label} cup`, rank: result.rank, at: t, name: result.name });
      if (book.badges[result.id]!.length > 40) book.badges[result.id]!.shift();
      if (prize > 0) { const pid = `${cup.id}:${result.rank}`; book.prizes[pid] = { id: pid, char: result.id, amount: prize, label: `${label} cup, week ${cup.week}`, week: cup.week, paid: false, at: t }; }
      if (result.rank === 1) lines.push(`${result.name} (AI) won this week's ${label} cup for agents.`);
    }
    cup.status = 'settled'; cup.settledAt = t;
    return lines;
  }

  // ---- challenges ------------------------------------------------------------------------------------------------

  const dayKey = (ok: string): string => ok;
  function limitsOf(book: ArenaBook, ok: string, t: number) {
    const day = lagosTime(t).day, entry = book.limits[dayKey(ok)];
    if (!entry || entry.day !== day) return (book.limits[dayKey(ok)] = { day, made: 0, accepted: 0 });
    return entry;
  }
  const challengeKeyOk = (kind: unknown, key: unknown): key is string => (kind === 'game' && typeof key === 'string' && kindOfGame(key) !== null) || (kind === 'life' && typeof key === 'string' && (LIFE_CATEGORIES as readonly string[]).includes(key));
  function createChallenge(db: Db, fromId: string, input: { kind?: unknown; key?: unknown }): { ok: true; code: string } | Refused {
    const t = now(), char = charOf(db, fromId);
    if (!char?.account) return no('claim_first', 'Challenges are for agents claimed by a person.');
    if (!challengeKeyOk(input.kind, input.key)) return no('invalid_challenge', 'Choose a game or a life contest.');
    const book = writeBook(db), ok = ownerKeyOf(char.account), limit = limitsOf(book, ok, t);
    if (limit.made >= ARENA.challenge.createPerDay) return no('daily_limit', `You can make ${ARENA.challenge.createPerDay} challenges a day. Try again tomorrow.`);
    if (Object.values(book.challenges).filter((c) => c.from.ok === ok && c.status === 'open' && c.expiresAt > t).length >= ARENA.challenge.openMax) return no('too_many_open', `You already have ${ARENA.challenge.openMax} open challenges. Wait for one to be taken or to run out.`);
    limit.made += 1;
    const code = `c-${ctx.randomId().replaceAll('-', '').slice(0, 8)}`;
    book.challenges[code] = { code, kind: input.kind as 'game' | 'life', key: input.key, from: { id: fromId, name: char.name, ok }, createdAt: t, expiresAt: t + ARENA.challenge.expireMs, status: 'open' };
    return { ok: true, code };
  }
  function acceptChallenge(db: Db, code: unknown, byId: string): { ok: true; code: string } | Refused {
    const t = now(), book = peekBook(db), c = book && typeof code === 'string' && Object.hasOwn(book.challenges, code) ? book.challenges[code] : undefined;
    if (!book || !c) return no('unknown_challenge', 'That challenge link is not valid.');
    if (c.status !== 'open' || c.expiresAt <= t) return no(c.status === 'open' ? 'expired' : 'taken', c.status === 'open' ? 'That challenge ran out. Ask for a new one.' : 'Someone has already taken that challenge.');
    const char = charOf(db, byId);
    if (!char?.account) return no('claim_first', 'Only an agent claimed by a person can take a challenge.');
    const ok = ownerKeyOf(char.account);
    if (ok === c.from.ok || related(ctx, db, c.from.id, byId)) return no('own_challenge', 'This is your own challenge, or one from your own device. Take a challenge from someone else.');
    const limit = limitsOf(writeBook(db), ok, t);
    if (limit.accepted >= ARENA.challenge.acceptPerDay) return no('daily_limit', `Your agents can take ${ARENA.challenge.acceptPerDay} challenges a day. Try again tomorrow.`);
    limit.accepted += 1;
    c.to = { id: byId, name: char.name, ok }; c.status = 'playing';
    if (c.kind === 'game') {
      const id = nextId(book, 'm');
      book.matches[id] = newMatch({ id, ref: c.code, game: c.key, ids: [c.from.id, byId], names: [c.from.name, char.name], seed: ctx.randomId(), round: 0, opened: t, deadline: t + ARENA.challenge.matchMs });
      c.match = id;
    } else {
      const cat = c.key as keyof typeof LIFE_LABELS;
      c.life = { start: t, end: t + ARENA.challenge.lifeMs, bases: [cat === 'friends' ? 0 : figure(ctx, db, cat, c.from.id, t, holders), cat === 'friends' ? 0 : figure(ctx, db, cat, byId, t, holders)], self: [0, 0] };
    }
    return { ok: true, code: c.code };
  }
  function lifeScores(db: Db, c: Challenge, t: number): [number, number] | null {
    if (!c.life || !c.to) return null;
    const cat = c.key as keyof typeof LIFE_LABELS, life = c.life, at = Math.min(t, life.end);
    const one = (id: string, i: 0 | 1): number => scoreOf(ctx, db, cat, { id, name: '', ok: '', seed: 0, enteredAt: life.start, base: life.bases[i], self: life.self[i] }, at, holders);
    return [one(c.from.id, 0), one(c.to.id, 1)];
  }
  function finishChallenge(c: Challenge, winner: 0 | 1 | null, text: string, t: number): void { c.status = 'done'; c.result = { winner, text, at: t }; }
  function syncChallenge(db: Db, book: ArenaBook, c: Challenge, t: number): void {
    if (c.status === 'open' && c.expiresAt <= t) { c.status = 'expired'; return; }
    if (c.status !== 'playing' || !c.to) return;
    const label = keyLabel(c.key), a = `${c.from.name} (AI)`, b = `${c.to.name} (AI)`;
    if (c.kind === 'game') {
      const m = c.match ? book.matches[c.match] : undefined;
      if (m?.status === 'done' && m.result) finishChallenge(c, m.result.winner, m.result.winner === null ? `${a} and ${b} drew at ${label}.` : `${m.result.winner === 0 ? a : b} beat ${m.result.winner === 0 ? b : a} at ${label}.`, t);
    } else if (c.life && t >= c.life.end) {
      const scores = lifeScores(db, c, t) ?? [0, 0];
      c.life.scores = scores;
      const unit = LIFE_LABELS[c.key as keyof typeof LIFE_LABELS].unit, winner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
      finishChallenge(c, winner, winner === null ? `${a} and ${b} tied in seven days of ${label.toLowerCase()} (${scores[0]} ${unit} each).` : `${winner === 0 ? a : b} beat ${winner === 0 ? b : a} in seven days of ${label.toLowerCase()}: ${scores[winner]} to ${scores[winner === 0 ? 1 : 0]} ${unit}.`, t);
    }
  }
  function prune(book: ArenaBook, t: number): void {
    const cutoff = t - ARENA.keepWeeks * 7 * 86400000;
    for (const [id, cup] of Object.entries(book.cups)) if (cup.settledAt !== undefined && cup.settledAt < cutoff) delete book.cups[id];
    const live = new Set<string>(Object.values(book.cups).flatMap((cup) => (cup.rounds ?? []).flatMap((r) => r.matches)));
    for (const c of Object.values(book.challenges)) if (c.match && c.status !== 'done' && c.status !== 'expired') live.add(c.match);
    for (const c of Object.values(book.challenges)) { if (c.match && (c.result?.at ?? c.createdAt) > t - ARENA.challenge.keepMs) live.add(c.match); }
    for (const [id, m] of Object.entries(book.matches)) if (!live.has(id) && (m.deadline < cutoff)) delete book.matches[id];
    for (const [code, c] of Object.entries(book.challenges)) if ((c.result?.at ?? c.expiresAt) < t - ARENA.challenge.keepMs) delete book.challenges[code];
    for (const [id, prize] of Object.entries(book.prizes)) if (prize.paid && prize.at < cutoff) delete book.prizes[id];
  }

  // ---- the clock -------------------------------------------------------------------------------------------------

  /** Is anything due? A read: when nothing is, the heartbeat does not touch the store. */
  function due(db: Db): boolean {
    const book = peekBook(db), t = now();
    if (!book) return false;
    if (Object.values(book.prizes).some((p) => !p.paid)) return true;
    for (const cup of Object.values(book.cups)) {
      const w = weekOf(t, cup.week);
      if (cup.status === 'open' && t >= (cup.kind === 'life' ? w.end : w.entryEnd)) return true;
      if (cup.status === 'running' && (t >= w.roundsEnd || (cup.rounds ?? []).some((r) => !r.matches.length && r.byes === undefined && t >= r.start))) return true;
    }
    for (const m of Object.values(book.matches)) {
      if (m.status === 'done') continue;
      if (t >= m.deadline) return true;
      if (m.status === 'playing' && (t >= m.turnAt + (m.kind === 'table' ? ARENA.turnMs : ARENA.windowMs) || (m.seen[0] === 0 || m.seen[1] === 0) && t >= m.startedAt + ARENA.graceMs)) return true;
    }
    return Object.values(book.challenges).some((c) => (c.status === 'open' && c.expiresAt <= t) || (c.status === 'playing' && (c.kind === 'life' ? t >= (c.life?.end ?? Infinity) : book.matches[c.match ?? '']?.status === 'done')));
  }
  /** Bring everything to now: start cups, make matches, run the clocks, settle cups and challenges. Returns the gist lines to write. */
  function sync(db: Db): string[] {
    const book = peekBook(db), t = now(), lines: string[] = [];
    if (!book) return lines;
    const b = writeBook(db);
    for (const cup of Object.values(b.cups)) {
      const w = weekOf(t, cup.week);
      if (cup.status === 'open') {
        if (cup.kind === 'life') { if (t >= w.end) lines.push(...settleCup(db, b, cup, w.end)); }
        else if (t >= w.entryEnd) startCup(b, db, cup, w);
      }
      if (cup.status === 'running') {
        openRounds(b, cup, t);
        for (const round of cup.rounds ?? []) for (const id of round.matches) { const m = b.matches[id]; if (m) advance(m, t); }
        if (t >= w.roundsEnd) lines.push(...settleCup(db, b, cup, w.roundsEnd));
      }
    }
    for (const m of Object.values(b.matches)) advance(m, t);
    for (const c of Object.values(b.challenges)) syncChallenge(db, b, c, t);
    if (lines.length) {
      const gist = gistService(ctx);
      lines.forEach((text, index) => { gist.add(db, { city: 'world', kind: 'other', text, refs: { key: `arena:${t}:${index}:${text.length}` } }); });
    }
    prune(b, t);
    return lines;
  }

  // ---- matches ---------------------------------------------------------------------------------------------------

  const matchOf = (db: Db, id: unknown): MatchRec | undefined => { const book = peekBook(db); return book && typeof id === 'string' && Object.hasOwn(book.matches, id) ? book.matches[id] : undefined; };
  /** The agent's open matches (cups and challenges), and a finished one it can still read. */
  function matchesOf(db: Db, id: string) {
    const book = peekBook(db);
    return Object.values(book?.matches ?? {}).filter((m) => seatOf(m, id) !== null && (m.status !== 'done' || (m.result && now() - m.deadline < 3 * 86400000))).sort((a, b) => a.deadline - b.deadline)
      .map((m) => ({ match: m.id, game: m.game, label: labelOfGame(m.game), against: m.names[seatOf(m, id) === 0 ? 1 : 0], status: m.status, deadline: m.deadline, in: m.ref.startsWith('c-') ? 'challenge' : 'cup', result: m.result?.text ?? null }));
  }
  /** An agent looks at its match (this starts it), or acts in it. */
  function look(db: Db, id: string, matchId: unknown): { ok: true; view: Json } | Refused {
    const m = matchOf(db, matchId), t = now();
    if (!m) return no('unknown_match', 'There is no such match. tournament_matches lists yours.');
    const seat = seatOf(m, id);
    if (seat === null) return no('not_your_match', 'That match is not yours.');
    advance(m, t); touch(m, seat, t);
    return { ok: true, view: viewOf(m, seat, t) };
  }
  function act(db: Db, id: string, matchId: unknown, input: { move?: unknown; plan?: unknown; n?: unknown }): { ok: true; view: Json } | Refused {
    const m = matchOf(db, matchId), t = now();
    if (!m) return no('unknown_match', 'There is no such match. tournament_matches lists yours.');
    const seat = seatOf(m, id);
    if (seat === null) return no('not_your_match', 'That match is not yours.');
    const done = submit(m, seat, input, t);
    if (!done.ok) return done;
    const book = peekBook(db);
    if (book) for (const c of Object.values(book.challenges)) syncChallenge(db, book, c, t);
    return { ok: true, view: viewOf(m, seat, t) };
  }
  /** A match as anyone may watch it: no hidden information (a watcher's view). */
  function watch(db: Db, matchId: unknown): Json | null {
    const m = matchOf(db, matchId);
    return m ? { ...viewOf(m, null, now()), ref: m.ref } : null;
  }
  /** Matches being played right now, for "Agents playing now". */
  function playingNow(db: Db) {
    const t = now();
    return Object.values(peekBook(db)?.matches ?? {}).filter((m) => m.status === 'playing' && t - Math.max(m.turnAt, m.startedAt) < 30 * 60000)
      .map((m) => ({ game: labelOfGame(m.game), kind: m.kind, players: m.names, link: `/agents/match/${m.id}`, since: m.startedAt })).slice(0, 20);
  }

  // ---- views for the page, the routes and the owner ----------------------------------------------------------------

  function challengeView(db: Db, c: Challenge, viewer: readonly string[] = []) {
    const t = now(), book = peekBook(db);
    return { code: c.code, kind: c.kind, key: c.key, label: keyLabel(c.key), status: c.status === 'open' && c.expiresAt <= t ? 'expired' : c.status, from: { name: c.from.name, ai: true }, to: c.to ? { name: c.to.name, ai: true } : null, expiresAt: c.expiresAt, match: c.match ?? null,
      result: c.result ?? null, mine: viewer.includes(c.from.id) ? 'maker' : c.to && viewer.includes(c.to.id) ? 'taker' : null, ...(c.life ? { life: { start: c.life.start, end: c.life.end, scores: c.status === 'done' ? c.life.scores ?? null : lifeScores(db, c, t) } } : {}),
      ...(c.match && book?.matches[c.match] ? { matchStatus: book.matches[c.match]?.status } : {}) };
  }
  const challengeByCode = (db: Db, code: unknown): Challenge | undefined => { const book = peekBook(db); return book && typeof code === 'string' && Object.hasOwn(book.challenges, code) ? book.challenges[code] : undefined; };
  function challengesOf(db: Db, ids: readonly string[]) {
    const book = peekBook(db);
    return Object.values(book?.challenges ?? {}).filter((c) => ids.includes(c.from.id) || (c.to && ids.includes(c.to.id))).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((c) => challengeView(db, c, ids));
  }
  const badgesOf = (db: Db, id: string) => (peekBook(db)?.badges[id] ?? []).slice().reverse();
  function ownerView(db: Db, ids: readonly string[]) {
    const book = peekBook(db), t = now(), w = weekNow();
    return { ...cupsView(db, ids), challenges: challengesOf(db, ids), badges: ids.flatMap((id) => badgesOf(db, id).map((b) => ({ ...b, agent: charOf(db, id)?.name ?? b.name }))).sort((a, b) => b.at - a.at).slice(0, 30),
      prizes: Object.values(book?.prizes ?? {}).filter((p) => ids.includes(p.char)).map((p) => ({ label: p.label, amount: p.amount, paid: p.paid })).slice(-10), week: w.id, now: t,
      limits: { challengesPerDay: ARENA.challenge.createPerDay, takesPerDay: ARENA.challenge.acceptPerDay } };
  }

  // ---- prizes ----------------------------------------------------------------------------------------------------

  /** Pay every prize that is owed, once each, to the agent's character. A prize that cannot be paid now is tried again on the next beat. */
  async function payPrizes(): Promise<number> {
    const owed = await ctx.store.read((db) => Object.values(peekBook(db)?.prizes ?? {}).filter((p) => !p.paid).map((p) => ({ id: p.id, session: ctx.core.sessionByPublicId(db, p.char) })));
    let paid = 0;
    for (const { id, session } of owed) {
      try {
        const city = session ? characterCity(session) : null;
        if (session && city) await prepareStoredCityContent(ctx, session, [city]);
        paid += await ctx.store.transact((db) => {
          const book = peekBook(db), prize = book?.prizes[id];
          if (!book || !prize || prize.paid) return 0;
          const stored = ctx.core.sessionByPublicId(db, prize.char), where = stored ? characterCity(stored) : null;
          // The agent is gone: the prize lapses (nothing is paid to nobody).
          if (!stored || !where) { prize.paid = true; prize.amount = 0; return 0; }
          const so_far = book.paidWeek[prize.char], used = so_far && so_far.week === prize.week ? so_far.amount : 0;
          const amount = Math.max(0, Math.min(prize.amount, ARENA.weeklyPrizeCeiling - used));
          if (amount > 0) {
            const life = ctx.settle(stored, where);
            const done = ctx.act(life, { type: 'tables.server', cityId: where, payload: { op: 'prize', amount, label: prize.label.slice(0, 40) }, stateGuard: 'the prize record is marked paid in this same transaction, so a prize is paid once' });
            if (!done.ok) { if (done.code === 'balance_limit') { prize.paid = true; prize.amount = 0; } return 0; }
            book.paidWeek[prize.char] = { week: prize.week, amount: used + amount };
          }
          prize.paid = true; prize.amount = amount;
          return amount;
        });
      } catch (error) { ctx.core.log?.(`Tournament prize ${id} not paid yet: ${String((error as Error)?.message ?? error).split('\n')[0]?.slice(0, 120)}`); }
    }
    return paid;
  }
  let running = false;
  /** The heartbeat: only when something is due does it write. */
  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      if (!(await ctx.store.read((db) => due(db)))) return;
      await ctx.store.transact((db) => { sync(db); });
      await payPrizes();
    } finally { running = false; }
  }

  return { cupsView, cupDetail, enter, leave, createChallenge, acceptChallenge, challengeView, challengeByCode, challengesOf, look, act, watch, matchesOf, playingNow, badgesOf, ownerView, sync, due, tick, payPrizes, charOf };
}
export type TournamentService = ReturnType<typeof tournamentService>;
export type { AgentsCollection, Cup, Entrant };
void TABLE_CUPS; void ARENA_CUPS;
