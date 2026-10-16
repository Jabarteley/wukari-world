/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * THE TOURNAMENT SERVICE: weekly agent cups, challenges, prizes and what is shown of them. Every function that takes `db` runs inside one store
 * transaction (or a read) and returns, or answers a refusal `{ ok: false, code, reason }` in plain words; the routes and the MCP tools turn that
 * into their own answers. Time only enters through ctx.now(), so a test with a fake clock settles a whole week.
 *
 * THE WEEK (Lagos time, Monday 00:00 to the end of Sunday): game cups take entries Monday and Tuesday and play their rounds from Wednesday to the
 * end of Saturday, then settle; life cups take entries Monday to Wednesday and are measured to the end of Sunday (life.ts), then settle.
 * PRIZES are game naira, paid once, to the agent's character through the server-only `wallet.bonus` life action (its own ledger line, never counted
 * as worked-for money), at most ARENA.weeklyPrizeCeiling a week a character, and only in a cup that people from ARENA.minOwnersForPrizes different
 * accounts entered. The owner gets a badge and a card (/agents/cup/<id>); a winner gets a line in the world's gist.
 * WHO MAY ENTER: an agent character claimed by a person (somebody holds the badge and answers for it), one for each person in a cup, and no two
 * entrants in one cup may share an account or a device. An agent wins a prize or a badge only if it played (sent at least one move or plan).
 */
import { lagosTime } from '../../src/game/clock.ts';
import { characterCity } from '../character.ts';
import { gistService, WORLD } from '../gist/ledger.ts';
import { prepareStoredCityContent } from '../request-city-content.ts';
import { agentService } from '../agents/service.ts';
import type { AgentCharacter } from '../agents/service.ts';
import type { Db, RouteContext } from '../types.ts';
import { ARENA, COLLECTION, CUP_ID, LIFE_CATEGORIES, LIFE_LABELS, bracketFirstRound, bracketRounds, categoryOf, cupId, cupKeys, emptyBook, isLifeKey, peekBook, prizeFor, prizeRoom, repairBook, roundRobin, tableOf, weekOf } from './book.ts';
import type { ArenaBook, Challenge, Cup, CupResult, Entrant, LifeCategory, MatchRec, Standing, Week } from './book.ts';
import { SNAPPED, baseOf, ownerKeyOf, related, scoreOf } from './life.ts';
import { advance, kindOfGame, labelOfGame, newMatch, seatOf, submit, touch, viewOf } from './matches.ts';

type Json = Record<string, unknown>;
export interface Refused { ok: false; code: string; reason: string }
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const CHALLENGE_CODE = /^c-[a-z0-9]{8}$/;
export const MATCH_ID = /^m[a-z0-9]{1,8}[a-f0-9]{5}$/;

const isCategory = (key: string): key is LifeCategory => (LIFE_CATEGORIES as readonly string[]).includes(key);
/** What a cup key ("chess", "life-stall") or a challenge key ("chess", "stall") is called. */
export const keyLabel = (key: string): string => { const c = categoryOf(key) ?? (isCategory(key) ? key : null); return c ? LIFE_LABELS[c].label : labelOfGame(key); };
/** The kinds of challenge: every game a cup is played at, and every life category. */
export const challengeKeys = (): { kind: 'game' | 'life'; key: string; label: string }[] => [
  ...cupKeys().filter((key) => !isLifeKey(key) && kindOfGame(key) !== null).map((key) => ({ kind: 'game' as const, key, label: labelOfGame(key) })),
  ...LIFE_CATEGORIES.map((key) => ({ kind: 'life' as const, key, label: LIFE_LABELS[key].label })),
];

const services = new WeakMap<object, ReturnType<typeof build>>();
export function tournamentService(ctx: RouteContext) {
  const cached = services.get(ctx);
  if (cached) return cached;
  const made = build(ctx);
  services.set(ctx, made);
  return made;
}

function build(ctx: RouteContext) {
  const agents = agentService(ctx);
  const now = (): number => ctx.now();
  const weekNow = (): Week => weekOf(lagosTime(now()).week);
  const writeBook = (db: Db): ArenaBook => repairBook(ctx.collection(db, COLLECTION, emptyBook()) as Partial<ArenaBook>);
  const charOf = (db: Db, id: string): AgentCharacter | undefined => { const chars = agents.peek(db)?.chars; return chars && Object.hasOwn(chars, id) ? chars[id] : undefined; };
  const holders = (db: Db) => agents.holders(db);
  const ratingOf = (db: Db, id: string, game: string): number => { const found = (db.growth?.tables?.ratings?.[id] as Record<string, { rating?: number }> | undefined)?.[game]?.rating; return typeof found === 'number' && Number.isFinite(found) ? found : 1200; };
  const nextId = (book: ArenaBook, prefix: string): string => `${prefix}${(++book.seq).toString(36)}${ctx.randomId().replace(/[^a-f0-9]/g, '').slice(0, 5).padEnd(5, '0')}`;
  const matchesOfCup = (book: ArenaBook, cup: Cup): MatchRec[] => (cup.rounds ?? []).flatMap((round) => round.matches.map((m) => book.matches[m]).filter((m): m is MatchRec => m !== undefined));
  /**
   * A life cup entrant's score at `t`, counting only what happened before the week ended. Missions and offices carry no time, so once the
   * end is more than ARENA.snapMs behind, the score read last before the end is used (the heartbeat reads it every ARENA.snapMs while the cup runs).
   */
  function lifeScore(db: Db, cup: Cup, e: Entrant, category: LifeCategory, t: number): number {
    const end = weekOf(cup.week).end;
    if (SNAPPED.includes(category) && t - end > ARENA.snapMs && e.snap !== undefined) return e.snap;
    return scoreOf(ctx, db, category, e, t, holders, Math.min(t, end));
  }
  /** Read the running life contests' scores when the last reading is ARENA.snapMs old (see lifeScore). */
  const snapDue = (book: ArenaBook, t: number): boolean => Object.values(book.cups).some((cup) => cupSnapDue(cup, t)) || Object.values(book.challenges).some((c) => challengeSnapDue(c, t));
  const cupSnapDue = (cup: Cup, t: number): boolean => { const cat = categoryOf(cup.key); return cat !== null && SNAPPED.includes(cat) && cup.status === 'open' && cup.entrants.length > 0 && t < weekOf(cup.week).end && t - (cup.snapAt ?? 0) >= ARENA.snapMs; };
  const challengeSnapDue = (c: Challenge, t: number): boolean => c.status === 'playing' && c.life !== undefined && isCategory(c.key) && SNAPPED.includes(c.key) && t < c.life.end && t - (c.life.snap?.at ?? 0) >= ARENA.snapMs;
  function snapLife(db: Db, book: ArenaBook, t: number): void {
    for (const cup of Object.values(book.cups)) {
      const cat = categoryOf(cup.key);
      if (!cat || !cupSnapDue(cup, t)) continue;
      for (const e of cup.entrants) e.snap = scoreOf(ctx, db, cat, e, t, holders);
      cup.snapAt = t;
    }
    for (const c of Object.values(book.challenges)) if (c.life && challengeSnapDue(c, t)) { const scores = lifeScores(db, c, t); if (scores) c.life.snap = { at: t, scores }; }
  }

  // ---- the cups --------------------------------------------------------------------------------------------------

  /** The cups on offer this week (stored or not yet), with how many are in and which of `viewer` are. */
  function cupsView(db: Db, viewer: readonly string[] = []) {
    const w = weekNow(), book = peekBook(db), t = now();
    return {
      week: { id: w.id, start: w.start, entryEnd: w.entryEnd, lifeEntryEnd: w.lifeEntryEnd, roundsEnd: w.roundsEnd, end: w.end },
      cups: cupKeys().filter((key) => isLifeKey(key) || kindOfGame(key) !== null).map((key) => {
        const stored = book?.cups[cupId(w.week, key)], life = isLifeKey(key), closes = life ? w.lifeEntryEnd : w.entryEnd;
        return { id: cupId(w.week, key), key, kind: life ? 'life' as const : 'game' as const, label: keyLabel(key),
          about: life ? LIFE_LABELS[categoryOf(key) ?? 'stall'].blurb : `Agents play ${labelOfGame(key)} against each other: everyone plays everyone up to ${ARENA.roundRobinMax}, a knockout above.`,
          status: stored?.status ?? 'open', entries: stored?.entrants.length ?? 0, open: t < closes && (stored?.status ?? 'open') === 'open', closes, mine: viewer.filter((id) => stored?.entrants.some((e) => e.id === id)) };
      }),
    };
  }
  /** One cup: the table of a game cup, the live scores of a life cup, the rounds, and the results once settled. Public. */
  function cupDetail(db: Db, id: unknown) {
    const book = peekBook(db), cup = book && typeof id === 'string' && CUP_ID.test(id) && Object.hasOwn(book.cups, id) ? book.cups[id] : undefined, t = now();
    if (!book || !cup) return null;
    const names = Object.fromEntries(cup.entrants.map((e) => [e.id, e.name]));
    const category = categoryOf(cup.key);
    const scores = category && cup.status !== 'void' ? cup.entrants.map((e, index) => ({ name: e.name, score: cup.results?.find((r) => r.id === e.id)?.score ?? lifeScore(db, cup, e, category, t), index }))
      .sort((a, b) => b.score - a.score || a.index - b.index).map((row, index) => ({ rank: index + 1, name: row.name, score: row.score, ai: true })) : null;
    const standings: Standing[] | null = !category && cup.format === 'roundrobin' ? cup.table ?? tableOf(cup.entrants.map((e) => e.id), names, matchesOfCup(book, cup)) : null;
    return { id: cup.id, key: cup.key, kind: cup.kind, label: keyLabel(cup.key), week: cup.week, status: cup.status, format: cup.format ?? null, unit: category ? LIFE_LABELS[category].unit : 'points',
      entrants: cup.entrants.map((e) => ({ name: e.name, ai: true })), standings: standings?.map(({ id: _id, ...row }) => ({ ...row, ai: true })) ?? null, scores,
      results: cup.results?.map(({ id: _id, ...row }) => ({ ...row, ai: true })) ?? null, note: cup.note ?? null,
      rounds: (cup.rounds ?? []).map((round, index) => ({ round: index + 1, start: round.start, end: round.end, matches: round.matches.flatMap((m) => { const rec = book.matches[m]; return rec ? [{ match: rec.id, players: rec.names, status: rec.status, winner: rec.result?.winner ?? null, text: rec.result?.text ?? null }] : []; }) })) };
  }

  /** Enter agent `id` in this week's cup `key`. */
  function enter(db: Db, id: string, key: unknown): { ok: true; cup: string; code: 'entered'; label: string } | Refused {
    const t = now(), w = weekNow();
    if (typeof key !== 'string' || !cupKeys().includes(key)) return no('unknown_cup', 'There is no such cup this week. tournament_cups lists them.');
    const char = charOf(db, id);
    if (!char) return no('not_an_agent', 'Only an agent character can enter a cup. Give your agent a character of its own in Settings, AI agents.');
    if (!char.account) return no('claim_first', 'Only an agent claimed by a person can enter, so somebody holds the badge. Claim it with its claim link first.');
    if (!ctx.core.sessionByPublicId(db, id)) return no('character_unavailable', 'This agent character is not available right now.');
    const life = isLifeKey(key), closes = life ? w.lifeEntryEnd : w.entryEnd;
    if (t >= closes) return no('entries_closed', `Entries for this cup closed on ${DAYS[lagosTime(closes - 1).weekday]} night. New cups open on Monday.`);
    if (!life && !kindOfGame(key)) return no('game_unavailable', 'That game is not available for cups right now.');
    const book = writeBook(db), cid = cupId(w.week, key);
    const cup = book.cups[cid] ??= { id: cid, week: w.week, kind: life ? 'life' : 'game', key, entrants: [], status: 'open' };
    if (cup.status !== 'open') return no('entries_closed', 'Entries for this cup are closed.');
    if (cup.entrants.some((e) => e.id === id)) return no('already_in', 'Your agent is already in this cup.');
    if (cup.entrants.length >= ARENA.maxEntrants) return no('cup_full', `This cup is full (${ARENA.maxEntrants} agents).`);
    const ok = ownerKeyOf(char.account);
    if (cup.entrants.some((e) => e.ok === ok)) return no('one_per_owner', 'Each person may enter one agent in a cup.');
    if (cup.entrants.some((e) => related(ctx, db, e.id, id))) return no('shared_device', 'Another agent in this cup belongs to the same account or was played from the same device, so this one cannot join.');
    const category = categoryOf(key);
    cup.entrants.push({ id, name: char.name, ok, seed: 0, enteredAt: t, base: category ? baseOf(ctx, db, category, id, holders) : 0, people: 0 });
    return { ok: true, cup: cid, code: 'entered', label: keyLabel(key) };
  }
  function leave(db: Db, id: string, key: unknown): { ok: true; code: 'left' } | Refused {
    const book = peekBook(db), cup = book && typeof key === 'string' ? book.cups[cupId(weekNow().week, key)] : undefined;
    if (!cup || cup.status !== 'open' || !cup.entrants.some((e) => e.id === id)) return no('not_in', 'Your agent is not in that cup, or the cup has started.');
    const write = writeBook(db).cups[cup.id];
    if (write) write.entrants = write.entrants.filter((e) => e.id !== id);
    return { ok: true, code: 'left' };
  }

  // ---- running a game cup ------------------------------------------------------------------------------------------

  function startCup(db: Db, cup: Cup, w: Week): void {
    if (cup.entrants.length < 2) { cup.status = 'void'; cup.note = 'Fewer than two agents entered, so the cup was not played.'; cup.settledAt = now(); return; }
    // Seeded by rating in the cup's game (1,200 for an agent with none), then by who entered first.
    cup.entrants.sort((a, b) => ratingOf(db, b.id, cup.key) - ratingOf(db, a.id, cup.key) || a.enteredAt - b.enteredAt);
    cup.entrants.forEach((e, index) => { e.seed = index + 1; });
    const ids = cup.entrants.map((e) => e.id), n = ids.length;
    cup.format = n <= ARENA.roundRobinMax ? 'roundrobin' : 'bracket';
    if (cup.format === 'roundrobin') cup.plan = roundRobin(ids);
    const count = cup.format === 'roundrobin' ? (cup.plan?.length ?? 0) : bracketRounds(n), len = Math.floor((w.roundsEnd - w.roundsStart) / Math.max(1, count));
    cup.rounds = Array.from({ length: count }, (_, r) => ({ start: w.roundsStart + r * len, end: r === count - 1 ? w.roundsEnd : w.roundsStart + (r + 1) * len, matches: [] }));
    cup.status = 'running';
  }
  const seedOf = (cup: Cup, id: string): number => cup.entrants.find((e) => e.id === id)?.seed ?? 99;
  /** Who goes through a bracket match: the winner, or on a draw the better seed. */
  const winnerOf = (cup: Cup, m: MatchRec): string => {
    const w = m.result?.winner;
    if (w === 0 || w === 1) return m.ids[w];
    return seedOf(cup, m.ids[0]) <= seedOf(cup, m.ids[1]) ? m.ids[0] : m.ids[1];
  };
  /** Make the matches of every round whose time has come (a bracket round once the one before is decided). */
  function openRounds(book: ArenaBook, cup: Cup, t: number): void {
    const rounds = cup.rounds ?? [];
    rounds.forEach((round, r) => {
      if (round.byes !== undefined || t < round.start) return;
      let pairs: [string, string][] = [];
      if (cup.format === 'roundrobin') { pairs = cup.plan?.[r] ?? []; round.byes = cup.entrants.map((e) => e.id).filter((id) => !pairs.some((pair) => pair.includes(id))); }
      else if (r === 0) { const first = bracketFirstRound(cup.entrants.map((e) => e.id)); pairs = first.pairs; round.byes = first.byes; }
      else {
        const before = rounds[r - 1];
        if (!before || before.byes === undefined) return;
        const played = before.matches.map((m) => book.matches[m]).filter((m): m is MatchRec => m !== undefined);
        if (played.some((m) => m.status !== 'done')) return;
        const alive = [...played.map((m) => winnerOf(cup, m)), ...before.byes].sort((a, b) => seedOf(cup, a) - seedOf(cup, b));
        const byes: string[] = [];
        if (alive.length % 2) { const top = alive.shift(); if (top) byes.push(top); }
        for (let i = 0; i < alive.length / 2; i++) { const a = alive[i], b = alive[alive.length - 1 - i]; if (a && b) pairs.push([a, b]); }
        round.byes = byes;
      }
      const name = (id: string): string => cup.entrants.find((e) => e.id === id)?.name ?? 'Agent';
      for (const pair of pairs) {
        const id = nextId(book, 'm');
        book.matches[id] = newMatch({ id, ref: cup.id, game: cup.key, ids: pair, names: [name(pair[0]), name(pair[1])], seed: ctx.randomId(), round: r, opened: Math.max(t, round.start), deadline: round.end });
        round.matches.push(id);
      }
    });
  }

  /** Rank a finished cup. Game cups: the table, or how far each agent went in the bracket. Life cups: the score. */
  function rankCup(db: Db, book: ArenaBook, cup: Cup, t: number): CupResult[] {
    const category = categoryOf(cup.key);
    const ranked = (rows: { id: string; name: string; score: number; index: number }[]): CupResult[] => rows.sort((a, b) => b.score - a.score || a.index - b.index).map((row, i) => ({ rank: i + 1, id: row.id, name: row.name, score: row.score, prize: 0 }));
    if (category) return ranked(cup.entrants.map((e, index) => ({ id: e.id, name: e.name, score: lifeScore(db, cup, e, category, now()), index })));
    const matches = matchesOfCup(book, cup), names = Object.fromEntries(cup.entrants.map((e) => [e.id, e.name]));
    if (cup.format === 'roundrobin') { cup.table = tableOf(cup.entrants.map((e) => e.id), names, matches); return cup.table.map((row) => ({ rank: row.rank, id: row.id, name: row.name, score: row.points, prize: 0 })); }
    // A bracket: the round an agent went out in (the winner of the last match is one further). A bye counts as going through.
    const reach = new Map<string, number>(cup.entrants.map((e) => [e.id, 0]));
    (cup.rounds ?? []).forEach((round, r) => {
      for (const id of round.byes ?? []) reach.set(id, Math.max(reach.get(id) ?? 0, r + 1));
      for (const m of round.matches) { const rec = book.matches[m]; if (!rec || rec.status !== 'done') continue; const win = winnerOf(cup, rec); reach.set(win, Math.max(reach.get(win) ?? 0, r + 1)); }
    });
    return ranked(cup.entrants.map((e, index) => ({ id: e.id, name: e.name, score: reach.get(e.id) ?? 0, index: e.seed || index })));
  }
  /** Did the agent play in the cup: a move or a plan in any of its matches (a life cup: it entered). */
  const playedIn = (book: ArenaBook, cup: Cup, id: string): boolean => cup.kind === 'life' || matchesOfCup(book, cup).some((m) => { const seat = seatOf(m, id); return seat !== null && m.moved[seat] > 0; });

  function settleCup(db: Db, book: ArenaBook, cup: Cup, t: number): string[] {
    const lines: string[] = [];
    for (const m of matchesOfCup(book, cup)) advance(m, t);
    cup.results = rankCup(db, book, cup, t);
    const pays = new Set(cup.entrants.map((e) => e.ok)).size >= ARENA.minOwnersForPrizes;
    if (!pays) cup.note = `Fewer than ${ARENA.minOwnersForPrizes} people entered an agent, so no prizes this week. The badges and the standings still count.`;
    const label = keyLabel(cup.key), category = categoryOf(cup.key);
    for (const result of cup.results) {
      const earned = category ? result.score > 0 : cup.format === 'roundrobin' ? result.score > 0 : true;
      const qualifies = earned && result.rank <= ARENA.prizes.length && playedIn(book, cup, result.id);
      if (!qualifies) continue;
      const prize = pays ? prizeFor(result.rank) : 0;
      result.prize = prize;
      const badges = book.badges[result.id] ??= [];
      badges.push({ week: cup.week, kind: cup.key, label: `${label} cup`, rank: result.rank, at: t, name: result.name, cup: cup.id });
      if (badges.length > 40) badges.shift();
      if (prize > 0) { const pid = `${cup.id}:${result.rank}`; book.prizes[pid] = { id: pid, char: result.id, amount: prize, label: `${label} cup, week ${cup.week}`, week: cup.week, paid: false, at: t }; }
      if (result.rank === 1) lines.push(`${result.name} (AI) won this week's agent ${label} cup.`);
    }
    if (!lines.length) cup.note ??= 'Nobody did enough to win this cup.';
    cup.status = 'settled'; cup.settledAt = t;
    return lines;
  }

  // ---- challenges --------------------------------------------------------------------------------------------------

  function limitsOf(book: ArenaBook, ok: string, t: number) {
    const day = lagosTime(t).day, entry = book.limits[ok];
    if (!entry || entry.day !== day) return (book.limits[ok] = { day, made: 0, accepted: 0 });
    return entry;
  }
  const challengeKeyOk = (kind: unknown, key: unknown): key is string => (kind === 'game' && typeof key === 'string' && !isLifeKey(key) && cupKeys().includes(key) && kindOfGame(key) !== null) || (kind === 'life' && typeof key === 'string' && (LIFE_CATEGORIES as readonly string[]).includes(key));
  /** A challenge from agent `fromId` (its owner made it in Settings, or the agent itself through its key). */
  function createChallenge(db: Db, fromId: string, input: { kind?: unknown; key?: unknown }): { ok: true; code: string; card: string; label: string } | Refused {
    const t = now(), char = charOf(db, fromId);
    if (!char) return no('not_an_agent', 'A challenge is played by an agent character. Give your agent a character of its own in Settings, AI agents.');
    if (!char.account) return no('claim_first', 'Challenges are for agents claimed by a person.');
    if (!challengeKeyOk(input.kind, input.key)) return no('invalid_challenge', `Choose a game (${challengeKeys().filter((c) => c.kind === 'game').map((c) => c.key).join(', ')}) or a life contest (${LIFE_CATEGORIES.join(', ')}).`);
    const book = writeBook(db), ok = ownerKeyOf(char.account), limit = limitsOf(book, ok, t);
    if (limit.made >= ARENA.challenge.createPerDay) return no('daily_limit', `You can make ${ARENA.challenge.createPerDay} challenges a day. Try again tomorrow.`);
    if (Object.values(book.challenges).filter((c) => c.from.ok === ok && c.status === 'open' && c.expiresAt > t).length >= ARENA.challenge.openMax) return no('too_many_open', `You already have ${ARENA.challenge.openMax} open challenges. Wait for one to be taken or to run out.`);
    limit.made += 1;
    let code = '';
    for (let i = 0; i < 5 && (!code || Object.hasOwn(book.challenges, code)); i++) code = `c-${ctx.randomId().replace(/[^a-z0-9]/g, '').slice(0, 8).padEnd(8, '0')}`;
    book.challenges[code] = { code, kind: input.kind as 'game' | 'life', key: input.key, from: { id: fromId, name: char.name, ok }, createdAt: t, expiresAt: t + ARENA.challenge.expireMs, status: 'open' };
    return { ok: true, code, card: `/agents/challenge/${code}`, label: keyLabel(input.key) };
  }
  /** Agent `byId` takes challenge `code`. */
  function acceptChallenge(db: Db, code: unknown, byId: string): { ok: true; code: string; match: string | null; card: string } | Refused {
    const t = now(), found = challengeByCode(db, code);
    if (!found) return no('unknown_challenge', 'That challenge link is not valid.');
    if (found.status !== 'open' || found.expiresAt <= t) return no(found.status === 'open' || found.status === 'expired' ? 'expired' : 'taken', found.status === 'open' || found.status === 'expired' ? 'That challenge ran out. Ask for a new one.' : 'Somebody has already taken that challenge.');
    const char = charOf(db, byId);
    if (!char) return no('not_an_agent', 'A challenge is taken by an agent character with its own key.');
    if (!char.account) return no('claim_first', 'Only an agent claimed by a person can take a challenge.');
    const ok = ownerKeyOf(char.account);
    if (ok === found.from.ok || related(ctx, db, found.from.id, byId)) return no('own_challenge', 'This is your own challenge, or one from your own account or device. Take a challenge from somebody else.');
    const book = writeBook(db), c = book.challenges[found.code];
    if (!c) return no('unknown_challenge', 'That challenge link is not valid.');
    const limit = limitsOf(book, ok, t);
    if (limit.accepted >= ARENA.challenge.acceptPerDay) return no('daily_limit', `Your agents can take ${ARENA.challenge.acceptPerDay} challenges a day. Try again tomorrow.`);
    limit.accepted += 1;
    c.to = { id: byId, name: char.name, ok }; c.status = 'playing';
    if (c.kind === 'game') {
      const id = nextId(book, 'm');
      book.matches[id] = newMatch({ id, ref: c.code, game: c.key, ids: [c.from.id, byId], names: [c.from.name, char.name], seed: ctx.randomId(), round: 0, opened: t, deadline: t + ARENA.challenge.matchMs });
      c.match = id;
    } else {
      const cat = c.key as LifeCategory;
      c.life = { start: t, end: t + ARENA.challenge.lifeMs, bases: [baseOf(ctx, db, cat, c.from.id, holders), baseOf(ctx, db, cat, byId, holders)], people: [0, 0] };
    }
    return { ok: true, code: c.code, match: c.match ?? null, card: `/agents/challenge/${c.code}` };
  }
  /** A life challenge's scores at `t`, counting only its seven days (as lifeScore does for a cup). */
  function lifeScores(db: Db, c: Challenge, t: number): [number, number] | null {
    if (!c.life || !c.to) return null;
    const cat = c.key as LifeCategory, life = c.life;
    if (SNAPPED.includes(cat) && t - life.end > ARENA.snapMs && life.snap) return [life.snap.scores[0], life.snap.scores[1]];
    const one = (id: string, i: 0 | 1): number => scoreOf(ctx, db, cat, { id, enteredAt: life.start, base: life.bases[i], people: life.people[i] }, t, holders, Math.min(t, life.end));
    return [one(c.from.id, 0), one(c.to.id, 1)];
  }
  function syncChallenge(db: Db, book: ArenaBook, c: Challenge, t: number): void {
    if (c.status === 'open' && c.expiresAt <= t) { c.status = 'expired'; return; }
    if (c.status !== 'playing' || !c.to) return;
    const label = keyLabel(c.key), a = `${c.from.name} (AI)`, b = `${c.to.name} (AI)`;
    if (c.kind === 'game') {
      const m = c.match ? book.matches[c.match] : undefined;
      if (m) advance(m, t);
      if (!m || (m.status === 'done' && m.result)) {
        const w = m?.result?.winner ?? null;
        c.status = 'done'; c.result = { winner: w, text: w === null ? `${a} and ${b} drew at ${label}.` : `${w === 0 ? a : b} beat ${w === 0 ? b : a} at ${label}.`, at: t };
      }
    } else if (c.life && t >= c.life.end) {
      const scores = lifeScores(db, c, t) ?? [0, 0];
      c.life.scores = scores;
      const unit = LIFE_LABELS[c.key as LifeCategory].unit, w = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;
      c.status = 'done';
      c.result = { winner: w, text: w === null ? `${a} and ${b} tied over seven days of ${label.toLowerCase()} (${scores[0]} ${unit} each).` : `${w === 0 ? a : b} beat ${w === 0 ? b : a} over seven days of ${label.toLowerCase()}: ${scores[w]} to ${scores[w === 0 ? 1 : 0]} ${unit}.`, at: c.life.end };
    }
  }
  function prune(book: ArenaBook, t: number): void {
    const cutoff = t - ARENA.keepWeeks * 7 * 86400000;
    for (const [id, cup] of Object.entries(book.cups)) if (cup.settledAt !== undefined && cup.settledAt < cutoff) delete book.cups[id];
    for (const [code, c] of Object.entries(book.challenges)) if ((c.status === 'done' || c.status === 'expired') && (c.result?.at ?? c.expiresAt) < t - ARENA.challenge.keepMs) delete book.challenges[code];
    const kept = new Set<string>([...Object.values(book.cups).flatMap((cup) => (cup.status === 'running' ? (cup.rounds ?? []).flatMap((r) => r.matches) : [])), ...Object.values(book.challenges).flatMap((c) => (c.match ? [c.match] : []))]);
    for (const [id, m] of Object.entries(book.matches)) {
      if (m.status !== 'done') continue;
      // A finished match keeps its result; its log goes once its room has had time to play it out.
      if (m.log.length && t - (m.doneAt ?? m.deadline) > 3600000) m.log = [];
      if (!kept.has(id) && t - (m.doneAt ?? m.deadline) > ARENA.doneKeepMs) delete book.matches[id];
    }
    for (const [id, prize] of Object.entries(book.prizes)) if (prize.paid && prize.at < cutoff) delete book.prizes[id];
    for (const [ok, limit] of Object.entries(book.limits)) if (limit.day < lagosTime(t).day - 1) delete book.limits[ok];
  }

  // ---- the clock ---------------------------------------------------------------------------------------------------

  /** Is anything due? A read: when nothing is, the heartbeat does not write. */
  function due(db: Db): boolean {
    const book = peekBook(db), t = now();
    if (!book) return false;
    if (Object.values(book.prizes).some((p) => !p.paid) || snapDue(book, t)) return true;
    for (const cup of Object.values(book.cups)) {
      const w = weekOf(cup.week);
      if (cup.status === 'open' && t >= (cup.kind === 'life' ? w.end : w.entryEnd)) return true;
      if (cup.status === 'running' && (t >= w.roundsEnd || (cup.rounds ?? []).some((r) => r.byes === undefined && t >= r.start))) return true;
    }
    for (const m of Object.values(book.matches)) {
      if (m.status === 'done') { if (m.log.length && t - (m.doneAt ?? m.deadline) > 3600000) return true; continue; }
      if (t >= m.deadline) return true;
      if (m.status === 'playing' && (t >= m.turnAt + (m.kind === 'table' ? ARENA.turnMs : ARENA.windowMs) || ((m.seen[0] === 0 || m.seen[1] === 0) && t >= m.startedAt + ARENA.graceMs))) return true;
    }
    return Object.values(book.challenges).some((c) => (c.status === 'open' && c.expiresAt <= t) || (c.status === 'playing' && (c.kind === 'life' ? t >= (c.life?.end ?? Infinity) : book.matches[c.match ?? '']?.status !== 'playing' && book.matches[c.match ?? '']?.status !== 'waiting')));
  }
  /** Bring everything to now: start cups, make matches, run the clocks, settle cups and challenges, write the gist. Returns the gist lines. */
  function sync(db: Db): string[] {
    if (!peekBook(db)) return [];
    const book = writeBook(db), t = now(), lines: { text: string; key: string }[] = [];
    snapLife(db, book, t);
    for (const cup of Object.values(book.cups)) {
      const w = weekOf(cup.week);
      if (cup.status === 'open') {
        if (cup.kind === 'life') { if (t >= w.end) for (const text of settleCup(db, book, cup, w.end)) lines.push({ text, key: cup.id }); }
        else if (t >= w.entryEnd) startCup(db, cup, w);
      }
      if (cup.status === 'running') {
        openRounds(book, cup, Math.min(t, w.roundsEnd));
        for (const m of matchesOfCup(book, cup)) advance(m, t);
        openRounds(book, cup, Math.min(t, w.roundsEnd));
        if (t >= w.roundsEnd) for (const text of settleCup(db, book, cup, w.roundsEnd)) lines.push({ text, key: cup.id });
      }
    }
    for (const m of Object.values(book.matches)) advance(m, t);
    for (const c of Object.values(book.challenges)) syncChallenge(db, book, c, t);
    if (lines.length) { const gist = gistService(ctx); for (const line of lines) gist.add(db, { city: WORLD, kind: 'other', text: line.text, refs: { key: `arena:${line.key}` } }); }
    prune(book, t);
    return lines.map((line) => line.text);
  }

  // ---- matches -----------------------------------------------------------------------------------------------------

  const matchOf = (db: Db, id: unknown): MatchRec | undefined => { const book = peekBook(db); return book && typeof id === 'string' && Object.hasOwn(book.matches, id) ? book.matches[id] : undefined; };
  /** The agent's matches: open ones, and those that finished in the last three days. */
  function matchesOf(db: Db, id: string) {
    const t = now();
    return Object.values(peekBook(db)?.matches ?? {}).filter((m) => seatOf(m, id) !== null && (m.status !== 'done' || t - (m.doneAt ?? m.deadline) < 3 * 86400000)).sort((a, b) => a.deadline - b.deadline)
      .map((m) => ({ match: m.id, game: m.game, label: labelOfGame(m.game), against: { name: m.names[seatOf(m, id) === 0 ? 1 : 0], ai: true }, status: m.status, deadline: m.deadline, in: m.ref.startsWith('c-') ? 'challenge' : 'cup', result: m.result?.text ?? null }));
  }
  /** An agent looks at its match (the first look starts it). */
  function look(db: Db, id: string, matchId: unknown): { ok: true; view: Json; match: MatchRec } | Refused {
    const found = matchOf(db, matchId), t = now();
    if (!found) return no('unknown_match', 'There is no such match. tournament_matches lists yours.');
    const seat = seatOf(found, id);
    if (seat === null) return no('not_your_match', 'That match is not yours.');
    const m = writeBook(db).matches[found.id] as MatchRec;
    advance(m, t); touch(m, seat, t);
    syncChallenges(db, t);
    return { ok: true, view: viewOf(m, seat, t), match: m };
  }
  /** An agent moves (a table game) or sends its plan for the window (a real-time game). */
  function act(db: Db, id: string, matchId: unknown, input: { move?: unknown; plan?: unknown; n?: unknown }): { ok: true; view: Json; match: MatchRec } | Refused {
    const found = matchOf(db, matchId), t = now();
    if (!found) return no('unknown_match', 'There is no such match. tournament_matches lists yours.');
    const seat = seatOf(found, id);
    if (seat === null) return no('not_your_match', 'That match is not yours.');
    const m = writeBook(db).matches[found.id] as MatchRec;
    const done = submit(m, seat, input, t);
    if (!done.ok) return done;
    syncChallenges(db, t);
    return { ok: true, view: viewOf(m, seat, t), match: m };
  }
  const syncChallenges = (db: Db, t: number): void => { const book = writeBook(db); for (const c of Object.values(book.challenges)) if (c.status === 'playing' && c.kind === 'game') syncChallenge(db, book, c, t); };
  /** A match as anyone may watch it: the watcher's view (no hidden information). */
  function watch(db: Db, matchId: unknown): Json | null {
    const m = typeof matchId === 'string' && MATCH_ID.test(matchId) ? matchOf(db, matchId) : undefined;
    return m ? { ...viewOf(m, null, now()), ref: m.ref.startsWith('c-') ? { challenge: m.ref } : { cup: m.ref }, ...(m.replay ? { replay: m.replay } : {}) } : null;
  }
  /** Matches being played now, for "Agents playing now": most recent first. */
  function playingNow(db: Db) {
    const t = now();
    return Object.values(peekBook(db)?.matches ?? {}).filter((m) => m.status === 'playing' && t - Math.max(m.turnAt, m.startedAt) < 30 * 60000).sort((a, b) => b.turnAt - a.turnAt).slice(0, 20)
      .map((m) => ({ match: m.id, game: m.game, label: labelOfGame(m.game), kind: m.kind, players: m.names.map((name) => ({ name, ai: true })), since: m.startedAt, in: m.ref.startsWith('c-') ? 'challenge' as const : 'cup' as const }));
  }

  // ---- views ---------------------------------------------------------------------------------------------------------

  const challengeByCode = (db: Db, code: unknown): Challenge | undefined => { const book = peekBook(db); return book && typeof code === 'string' && CHALLENGE_CODE.test(code) && Object.hasOwn(book.challenges, code) ? book.challenges[code] : undefined; };
  /** A challenge as its card shows it to anyone: names with the AI mark, what is played, how it stands. Nothing private. */
  function challengeView(db: Db, c: Challenge, viewer: readonly string[] = []) {
    const t = now(), book = peekBook(db), m = c.match ? book?.matches[c.match] : undefined;
    return { code: c.code, kind: c.kind, key: c.key, label: keyLabel(c.key), status: c.status === 'open' && c.expiresAt <= t ? 'expired' as const : c.status, from: { name: c.from.name, ai: true }, to: c.to ? { name: c.to.name, ai: true } : null, createdAt: c.createdAt, expiresAt: c.expiresAt,
      match: c.match ?? null, ...(m ? { matchStatus: m.status, ...(m.replay ? { replay: m.replay } : {}) } : {}), result: c.result ?? null, mine: viewer.includes(c.from.id) ? 'maker' as const : c.to && viewer.includes(c.to.id) ? 'taker' as const : null,
      ...(c.life ? { life: { start: c.life.start, end: c.life.end, unit: LIFE_LABELS[c.key as LifeCategory]?.unit ?? '', scores: c.status === 'done' ? c.life.scores ?? null : lifeScores(db, c, t) } } : {}),
      card: `/agents/challenge/${c.code}` };
  }
  function challengesOf(db: Db, ids: readonly string[]) {
    return Object.values(peekBook(db)?.challenges ?? {}).filter((c) => ids.includes(c.from.id) || (c.to !== undefined && ids.includes(c.to.id))).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map((c) => challengeView(db, c, ids));
  }
  const badgesOf = (db: Db, id: string) => (peekBook(db)?.badges[id] ?? []).slice().reverse();
  /** What a person sees in Settings: their agent characters, this week's cups (which of theirs are in), challenges, badges with their cards, prizes. */
  function ownerView(db: Db, account: string) {
    const chars = Object.entries(agents.peek(db)?.chars ?? {}).filter(([, c]) => c.account === account && account !== '').map(([id, c]) => ({ id, name: c.name }));
    const ids = chars.map((c) => c.id), book = peekBook(db), t = now();
    return { ok: true as const, agents: chars, ...cupsView(db, ids), challenges: challengesOf(db, ids), kinds: challengeKeys(),
      badges: ids.flatMap((id) => badgesOf(db, id).map((b) => ({ agent: charOf(db, id)?.name ?? b.name, label: b.label, rank: b.rank, week: b.week, at: b.at, card: `/agents/cup/${b.cup}` }))).sort((a, b) => b.at - a.at).slice(0, 30),
      prizes: Object.values(book?.prizes ?? {}).filter((p) => ids.includes(p.char)).sort((a, b) => b.at - a.at).slice(0, 10).map((p) => ({ agent: charOf(db, p.char)?.name ?? '', label: p.label, amount: p.amount, paid: p.paid })), now: t,
      limits: { challengesPerDay: ARENA.challenge.createPerDay, takesPerDay: ARENA.challenge.acceptPerDay, prizes: ARENA.prizes, weeklyPrizeCeiling: ARENA.weeklyPrizeCeiling } };
  }
  /** For the Agent league page: this week's cups and how they stand, and the latest winners. */
  function leagueCups(db: Db) {
    const book = peekBook(db), w = weekNow();
    const current = Object.values(book?.cups ?? {}).filter((cup) => cup.week === w.week).map((cup) => {
      const detail = cupDetail(db, cup.id);
      const top = detail?.results?.[0] ?? detail?.standings?.[0] ?? detail?.scores?.[0] ?? null;
      return { id: cup.id, label: keyLabel(cup.key), status: cup.status, entries: cup.entrants.length, leader: top ? { name: top.name, ai: true } : null };
    });
    const winners = Object.values(book?.cups ?? {}).filter((cup) => cup.status === 'settled' && cup.results?.[0]).sort((a, b) => (b.settledAt ?? 0) - (a.settledAt ?? 0)).slice(0, 12)
      .map((cup) => ({ id: cup.id, label: keyLabel(cup.key), week: cup.week, winner: { name: cup.results?.[0]?.name ?? '', ai: true }, prize: cup.results?.[0]?.prize ?? 0 }));
    return { week: w.id, current, winners };
  }

  // ---- prizes ------------------------------------------------------------------------------------------------------

  /** Pay every prize owed, once each, to the agent's character, within the weekly ceiling. A prize that cannot be paid now is tried on the next beat. */
  async function payPrizes(): Promise<number> {
    const owed = await ctx.store.read((db) => Object.values(peekBook(db)?.prizes ?? {}).filter((p) => !p.paid).map((p) => ({ id: p.id, session: ctx.core.sessionByPublicId(db, p.char) })));
    let paid = 0;
    for (const { id, session } of owed) {
      try {
        const city = session ? characterCity(session) : null;
        if (session && city) await prepareStoredCityContent(ctx, session, [city]);
        paid += await ctx.store.transact((db) => {
          const book = writeBook(db), prize = book.prizes[id];
          if (!prize || prize.paid) return 0;
          const stored = ctx.core.sessionByPublicId(db, prize.char), where = stored ? characterCity(stored) : null;
          // The agent is gone: the prize lapses (nothing is paid to nobody).
          if (!stored || !where) { prize.paid = true; prize.amount = 0; return 0; }
          const amount = Math.min(prize.amount, prizeRoom(book, prize.char, prize.week));
          if (amount > 0) {
            const life = ctx.settle(stored, where);
            const done = ctx.act(life, { type: 'wallet.bonus', cityId: where, payload: { amount, reason: `Agent cup prize: ${prize.label}`.slice(0, 80) }, stateGuard: 'The prize record is marked paid in this same transaction, so a prize is paid once' });
            if (!done.ok) { if (done.code === 'balance_limit') { prize.paid = true; prize.amount = 0; } return 0; }
            const so = book.paidWeek[prize.char];
            book.paidWeek[prize.char] = { week: prize.week, amount: (so && so.week === prize.week ? so.amount : 0) + amount };
          }
          prize.paid = true; prize.amount = amount;
          return amount;
        });
      } catch (error) { ctx.core.log?.(`Agent cup prize ${id} not paid yet: ${String((error as Error)?.message ?? error).split('\n')[0]?.slice(0, 120)}`); }
    }
    return paid;
  }
  let running: Promise<void> | null = null;
  /** The heartbeat: only when something is due does it write. Resolves when this beat's work is done (tests wait for it). */
  function tick(): Promise<void> {
    running ??= (async () => {
      try {
        if (!(await ctx.store.read((db) => due(db)))) return;
        await ctx.store.transact((db) => { sync(db); });
        await payPrizes();
      } catch (error) { ctx.core.log?.(`Agent tournaments: ${String((error as Error)?.message ?? error).split('\n')[0]?.slice(0, 160)}`); }
      finally { running = null; }
    })();
    return running;
  }
  /** Live arena matches (for the watched rooms, live.ts): those playing, and those finished in the last hour whose log is still kept. */
  const liveMatches = (db: Db): MatchRec[] => Object.values(peekBook(db)?.matches ?? {}).filter((m) => m.kind === 'arena' && (m.status === 'playing' || (m.status === 'done' && m.log.length > 0)));
  /** The watched room's replay, once it has played out. */
  async function noteReplay(matchId: string, replay: string): Promise<void> {
    await ctx.store.transact((db) => { const m = peekBook(db) ? writeBook(db).matches[matchId] : undefined; if (m && !m.replay) m.replay = replay; }, { durable: false });
  }

  return { cupsView, cupDetail, enter, leave, createChallenge, acceptChallenge, challengeView, challengeByCode, challengesOf, look, act, watch, matchesOf, playingNow, badgesOf, ownerView, leagueCups, sync, due, tick, payPrizes, charOf, liveMatches, noteReplay };
}
export type TournamentService = ReturnType<typeof build>;
