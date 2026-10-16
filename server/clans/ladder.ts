/**
 * OWNER: games
 * LADDERS, CITY LEAGUES AND CLAN WARS on the server (rules: src/clans/; words and numbers: docs/CLANS.md).
 *
 * INTAKE. `record(db, result)` runs inside the transaction of whatever finished the game (ctx.checks.gameResult) or, for the arena, inside
 * its own transaction after the event 'game-result'. It is idempotent per match id and never throws to its caller. For each person seated:
 * the season rolls (soft reset), the day rolls (best 10 count), the week rolls (weekly points, cohort); the match changes the game's
 * points (+30/-12 below the top tier, rating-based above), the weekly points, the boards, the city's weekly score and, for a clan
 * member, the clan's war points. AI-played characters have a ladder of their own and appear only on the agents' board.
 *
 * BOARDS are kept as the top 50 rows of one scope, written when the player's row changes. Friends and clan boards are read from the
 * players' own records (at most 100 and 25). A reply is cut to ten rows and the player's own, so it stays under 4 KB gzipped.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { cityRules } from '../../src/game/cities/index.ts';
import { characterCity } from '../character.ts';
import { countryOfCity } from '../moderation/ai-intercept.ts';
import { gistService } from '../gist/ledger.ts';
import { LADDER, applyPoints, bestOfDay, chooseCohort, pointsFor, rankName, softReset, tierOf } from '../../src/clans/ladder.ts';
import { LEAGUE, cityScore, gistLine, rankCities, rollupCity, weekWinner } from '../../src/clans/league.ts';
import { WAR, matchClan, outcomeOf, prizeFor, ratings, warScore } from '../../src/clans/war.ts';
import { CLAN } from '../../src/clans/clan.ts';
import { validGame } from '../../src/clans/results.ts';
import { clansOf, peekClans } from './data.ts';
import type { BoardRecord, BoardRow, ClansCollection, ClanRecord, PlayerRecord } from './data.ts';
import type { GameResult } from '../../src/clans/results.ts';
import type { Db, RouteContext } from '../types.ts';

const DAY_MS = 86400000;
export const cityName = (id: string): string => { try { return cityRules(id)?.name ?? id; } catch { return id; } };
// Kept in a constant: the frame-type check (src/types/protocol.test.ts) reads `type: '…'` in server code as a socket frame.
const REGION = 'region' as const;
export const countryName = (cc: string): string => { try { return new Intl.DisplayNames(['en'], { type: REGION }).of(cc.toUpperCase()) ?? cc.toUpperCase(); } catch { return cc.toUpperCase(); } };
const gameLabel = (game: string): string => game.replace(/-/g, ' ');
const blank = (name: string, city: string): PlayerRecord => ({ name, city, season: 0, g: {}, day: 0, best: {}, pairs: {}, wk: 0, wp: 0, wg: {}, plays: 0, seen: [] });

export function ladderService(ctx: RouteContext) {
  const gist = gistService(ctx);
  const setting = (key: string, fallback: number): number => { const v = ctx.checks?.setting?.(key); return typeof v === 'number' ? v : fallback; };
  /** The clan size in force (admin setting `clanSize`). */
  const clanCap = (): number => Math.max(CLAN.sizeMin, Math.min(CLAN.sizeMax, Math.round(setting('clanSize', CLAN.size))));

  /** The season now, advanced if it has ended. A new length (admin setting) applies from the next season. */
  function seasonOf(c: ClansCollection, t: number): { n: number; start: number; days: number } {
    const today = lagosTime(t).day, days = Math.max(7, Math.min(90, Math.round(setting('seasonDays', LADDER.seasonDays))));
    const s = c.meta.season;
    if (!(s.n > 0)) { const monday = lagosTime(t).week * 7 - 3; c.meta.season = { n: 1, start: monday, days }; return c.meta.season; }
    if (today >= s.start + s.days) { const jumps = Math.floor((today - s.start) / s.days); s.start += jumps * s.days; s.n += jumps; s.days = days; }
    return s;
  }
  /** Bring a player's record up to this season, day and week. */
  function roll(rec: PlayerRecord, season: number, day: number, week: number): void {
    if (rec.season !== season) {
      let top = 0, topGame = '';
      for (const [game, g] of Object.entries(rec.g)) { if (g.p > top) { top = g.p; topGame = game; } }
      if (rec.season > 0 && top > 0) rec.prev = { season: rec.season, pts: top, game: topGame };
      for (const g of Object.values(rec.g)) if (g.w + g.l + g.d > 0) { g.p = softReset(g.p); g.hi = tierOf(g.p); g.w = g.l = g.d = 0; }
      rec.season = season;
    }
    if (rec.day !== day) { rec.day = day; rec.best = {}; rec.pairs = {}; }
    if (rec.wk !== week) { rec.wk = week; rec.wp = 0; rec.wg = {}; rec.plays = 0; delete rec.first; delete rec.cohort; }
  }
  const seasonScore = (rec: PlayerRecord, game: string | null): number => (game ? rec.g[game]?.p ?? 0 : Object.values(rec.g).reduce((a, g) => a + g.p, 0));
  const topTier = (rec: PlayerRecord): number => tierOf(Math.max(0, ...Object.values(rec.g).map((g) => g.p)));

  function upsert(c: ClansCollection, key: string, id: string, name: string, score: number, tier: number): BoardRow[] {
    const board = (c.boards[key] ||= {}), rows = (board.rows ||= []);
    const at = rows.findIndex((r) => r[0] === id);
    if (at >= 0) rows.splice(at, 1);
    else if (rows.length >= LEAGUE.boardRows && score <= (rows[rows.length - 1]?.[2] ?? 0)) { if (!rows.length) delete c.boards[key]; return rows; }
    const row: BoardRow = [id, name, score, tier];
    let i = rows.findIndex((r) => r[2] < score);
    if (i < 0) i = rows.length;
    rows.splice(i, 0, row);
    if (rows.length > LEAGUE.boardRows) rows.length = LEAGUE.boardRows;
    return rows;
  }

  // ---- clan wars -------------------------------------------------------------------------------------------------------------------
  /** Points of each counted member (an AI-played one is not counted; a quiet member is 0). */
  function warPoints(c: ClansCollection, clan: ClanRecord, s: Readonly<Record<string, number>> | undefined = clan.wk?.s): [string, number][] {
    return clan.members.filter((id) => !c.players[id]?.ai).map((id): [string, number] => [id, Math.max(0, s?.[id] ?? 0)]);
  }
  /** Settle a clan's war from an earlier week (and its opponent's, at once). */
  function settleWar(c: ClansCollection, clan: ClanRecord, week: number): void {
    const wk = clan.wk;
    if (!wk || wk.n >= week) return;
    delete clan.wk;
    const opp = wk.vs ? c.clans[wk.vs] : undefined;
    if (!opp || !opp.wk || opp.wk.n !== wk.n || opp.wk.vs !== clan.id) return;
    // The week's points are read from the records just taken off the clans (`wk`, `owk`), never from the clans themselves.
    const owk = opp.wk, pointsOf = (of: ClanRecord): [string, number][] => warPoints(c, of, of === clan ? wk.s : owk.s);
    const mine = warScore(pointsOf(clan).map((p) => p[1])).score, theirs = warScore(pointsOf(opp).map((p) => p[1])).score;
    const outcome = outcomeOf(mine, theirs), [a, b] = ratings(clan.rating, opp.rating, outcome);
    const eligible = (of: ClanRecord, won: boolean): { ids: string[]; amount: number } | undefined => {
      const amount = prizeFor(won ? outcomeOf(1, 0) : 'draw');
      if (!won || amount <= 0) return undefined;
      const sorted = pointsOf(of).sort((x, y) => y[1] - x[1]).slice(0, warScore(pointsOf(of).map((p) => p[1])).used);
      return { ids: sorted.filter((p) => p[1] > 0).map((p) => p[0]), amount };
    };
    const drawn = outcome === 'draw';
    const prize = (of: ClanRecord, won: boolean) => { const p = drawn ? { ids: pointsOf(of).filter((x) => x[1] > 0).map((x) => x[0]), amount: WAR.prizeDraw } : eligible(of, won); return p && p.ids.length ? { prize: p } : {}; };
    clan.rating = a; opp.rating = b; delete opp.wk;
    clan.last = { n: wk.n, vs: opp.id, vsName: opp.name, mine, theirs, outcome, ...prize(clan, outcome === 'win') };
    opp.last = { n: wk.n, vs: clan.id, vsName: clan.name, mine: theirs, theirs: mine, outcome: outcome === 'win' ? 'loss' : outcome === 'loss' ? 'win' : 'draw', ...prize(opp, outcome === 'loss') };
  }
  /** Make sure a clan is in this week's war: rolled, and matched or waiting in the pool. */
  function enrol(c: ClansCollection, clan: ClanRecord, week: number): void {
    settleWar(c, clan, week);
    clan.wk ||= { n: week, s: {} };
    if (clan.wk.n !== week) clan.wk = { n: week, s: {} };
    if (clan.wk.vs || clan.members.length < CLAN.warMin) return;
    const poolKey = `p${week}`, pool = ((c.boards[poolKey] ||= {}).pool ||= []);
    const me: [string, number, number] = [clan.id, clan.members.length, clan.rating];
    const at = pool.findIndex((e) => e[0] === clan.id);
    if (at >= 0) pool.splice(at, 1);
    const found = matchClan(pool.filter((e) => c.clans[e[0]]?.wk?.n === week && !c.clans[e[0]]?.wk?.vs), me);
    const other = found ? c.clans[found[0]] : undefined;
    if (found && other?.wk) {
      pool.splice(pool.findIndex((e) => e[0] === found[0]), 1);
      clan.wk.vs = other.id; clan.wk.vsName = other.name; other.wk.vs = clan.id; other.wk.vsName = clan.name;
    } else if (pool.length < WAR.poolMax) pool.push(me);
  }

  // ---- intake ----------------------------------------------------------------------------------------------------------------------
  function record(db: Db, r: GameResult): void {
    try { intake(db, r); } catch (error) { ctx.core?.log?.(`Ladder result not recorded: ${String((error as Error)?.message ?? error).split('\n')[0]?.slice(0, 120)}`); }
  }
  function intake(db: Db, r: GameResult): void {
    if (!r || typeof r.match !== 'string' || r.match.length > 80 || !validGame(r.game) || !Array.isArray(r.seats) || r.seats.length < 2 || r.seats.length > 8) return;
    if (new Set(r.seats.map((s) => s.id)).size !== r.seats.length) return;
    const c = clansOf(ctx, db), t = ctx.now(), tm = lagosTime(t), season = seasonOf(c, t);
    settleLeague(db, c, tm.week);
    const seats = r.seats.flatMap((seat) => {
      const session = ctx.core.sessionByPublicId(db, seat.id);
      if (!session || typeof seat.score !== 'number' || !(seat.score >= 0 && seat.score <= 1)) return [];
      const rec = (c.players[seat.id] ||= blank(session.name, 'lagos'));
      rec.name = session.name; rec.city = rollupCity(session.homeCity?.city, characterCity(session));
      if (session.agent?.char === true) rec.ai = 1; else delete rec.ai;
      roll(rec, season.n, tm.day, tm.week);
      return [{ id: seat.id, score: seat.score, rec }];
    });
    if (seats.length !== r.seats.length) return;
    const before = new Map(seats.map((s) => [s.id, s.rec.g[r.game]?.p ?? 0]));
    for (const seat of seats) {
      const rec = seat.rec;
      if (rec.seen.includes(r.match)) continue;
      rec.seen.push(r.match); if (rec.seen.length > 20) rec.seen.shift();
      const others = seats.filter((o) => o.id !== seat.id);
      const open = others.some((o) => (rec.pairs[o.id] ?? 0) < LADDER.pairPerDay);
      for (const o of others) if (rec.pairs[o.id] !== undefined || Object.keys(rec.pairs).length < 40) rec.pairs[o.id] = (rec.pairs[o.id] ?? 0) + 1;
      if (!open || (!rec.g[r.game] && Object.keys(rec.g).length >= 12)) continue;
      const game = (rec.g[r.game] ||= { p: 0, hi: 0, w: 0, l: 0, d: 0 });
      const opp = others.reduce((a, o) => a + (before.get(o.id) ?? 0), 0) / others.length;
      const res = bestOfDay(rec.best[r.game] ?? [], pointsFor(game.p, seat.score, opp));
      rec.best[r.game] = res.day;
      if (!res.counted) continue;
      game.p = applyPoints(game.p, res.net, game.hi); game.hi = Math.max(game.hi, tierOf(game.p));
      if (seat.score >= 1) game.w += 1; else if (seat.score <= 0) game.l += 1; else game.d += 1;
      rec.wp += res.net; rec.wg[r.game] = (rec.wg[r.game] ?? 0) + res.net; rec.plays += 1;
      publish(c, seat.id, rec, r.game, tm, season.n);
      const clan = rec.clan ? c.clans[rec.clan] : undefined;
      if (clan && !rec.ai) { enrol(c, clan, tm.week); clan.wk!.s[seat.id] = (clan.wk!.s[seat.id] ?? 0) + res.net; }
    }
  }
  /** Cohort, boards and the city's score after a counted match. */
  function publish(c: ClansCollection, id: string, rec: PlayerRecord, game: string, tm: { week: number; weekday: number; hour: number }, season: number): void {
    const w = tm.week, tier = topTier(rec), name = rec.name;
    if (rec.ai) { upsert(c, `w${w}:a:all:all`, id, name, rec.wp, tier); upsert(c, `s${season}:a:all:all`, id, name, seasonScore(rec, null), tier); return; }
    const hour = ((tm.weekday + 6) % 7) * 24 + tm.hour;
    if (!rec.cohort) {
      const book = (c.boards[`o${w}`] ||= {}), open = (book.open ||= []);
      let key = chooseCohort(open, hour);
      if (!key) { book.n = (book.n ?? 0) + 1; key = `${hour}.${book.n}`; open.push([key, hour, 0]); }
      const entry = open.find((e) => e[0] === key);
      if (entry) { entry[2] += 1; if (entry[2] >= LEAGUE.boardRows) open.splice(open.indexOf(entry), 1); }
      rec.cohort = key; rec.first = hour;
    }
    const cc = countryOfCity(rec.city) ?? 'ng', lw = (c.league[`w${w}`] ||= { cities: {}, countries: {} });
    for (const which of [game, 'all']) {
      const rows = upsert(c, `w${w}:c:${rec.city}:${which}`, id, name, which === 'all' ? rec.wp : rec.wg[game] ?? 0, tier);
      ((lw.cities[rec.city] ||= {})[which] = [cityScore(rows.map((x) => x[2])), rows.length]);
    }
    const kr = upsert(c, `w${w}:k:${cc}:all`, id, name, rec.wp, tier);
    (lw.countries[cc] = [cityScore(kr.map((x) => x[2])), kr.length]);
    upsert(c, `w${w}:g:all:all`, id, name, rec.wp, tier);
    upsert(c, `w${w}:h:${rec.cohort}:all`, id, name, rec.wp, tier);
    for (const which of [game, 'all']) {
      const s = which === 'all' ? seasonScore(rec, null) : seasonScore(rec, game);
      upsert(c, `s${season}:c:${rec.city}:${which}`, id, name, s, tier);
      upsert(c, `s${season}:g:all:${which}`, id, name, s, tier);
    }
    upsert(c, `s${season}:k:${cc}:all`, id, name, seasonScore(rec, null), tier);
  }

  // ---- weekly league: winners to the gist, old data swept --------------------------------------------------------------------------
  function settleLeague(db: Db, c: ClansCollection, week: number): void {
    if (c.meta.settled >= week - 1) return;
    if (c.meta.settled < week - 3) c.meta.settled = week - 3;
    for (let w = c.meta.settled + 1; w <= week - 1; w++) {
      const lw = c.league[`w${w}`];
      if (lw) {
        const games = new Set<string>(); for (const m of Object.values(lw.cities)) for (const g of Object.keys(m)) games.add(g);
        lw.won = {};
        for (const g of games) {
          const winner = weekWinner(Object.entries(lw.cities).flatMap(([id, m]) => (m[g] ? [{ id, score: m[g][0], players: m[g][1] }] : [])));
          if (!winner) continue;
          lw.won[g] = winner.id;
          gist.add(db, { city: winner.id, kind: 'other', text: gistLine(cityName(winner.id), g === 'all' ? null : gameLabel(g)), refs: { key: `league:${w}:${g}` } });
        }
      }
      c.meta.settled = w;
    }
    // Forget what is more than two weeks or two seasons old.
    if (c.meta.swept < week) {
      c.meta.swept = week;
      const season = c.meta.season.n;
      for (const key of Object.keys(c.boards)) { const m = /^([wsop])(\d+)/.exec(key); if (m && ((m[1] === 's' && Number(m[2]) < season - 1) || (m[1] !== 's' && Number(m[2]) < week - 2))) delete c.boards[key]; }
      for (const key of Object.keys(c.league)) if (Number(key.slice(1)) < week - 8) delete c.league[key];
    }
  }

  // ---- reading ---------------------------------------------------------------------------------------------------------------------
  type Period = 'week' | 'season';
  interface View { k: string; t: string; n: number; r: (number | string)[][] }
  const CUT = 10;
  /** Rows [rank, name, score, tier, me, ai] cut to the top ten and the viewer's own. */
  function cut(rows: readonly BoardRow[], me: string, ai: ReadonlySet<string> = new Set()): { n: number; r: (number | string)[][] } {
    const sorted = [...rows].filter((x) => x[2] > 0 || x[0] === me).sort((a, b) => b[2] - a[2]);
    const out = sorted.map((x, i): (number | string)[] => [i + 1, x[1], Math.round(x[2]), x[3], ...(x[0] === me ? [1] : ai.has(x[0]) ? [0, 1] : [])]);
    const mine = sorted.findIndex((x) => x[0] === me);
    return { n: sorted.length, r: mine >= CUT ? [...out.slice(0, CUT - 1), out[mine]!] : out.slice(0, CUT) };
  }
  /** The boards in the order players meet them: friends, my city, my weekly cohort, my clan, my country, then global. */
  function boards(db: Db, id: string, period: Period, game: string | null): { period: Period; game: string | null; me: Mine | null; boards: View[] } {
    const c = peekClans(db), t = ctx.now(), tm = lagosTime(t);
    const rec = c?.players[id];
    if (!c || !rec) return { period, game, me: null, boards: [] };
    const season = seasonOf(c, t);
    if (rec.season !== season.n || rec.wk !== tm.week || rec.day !== tm.day) roll(rec, season.n, tm.day, tm.week);
    const which = game ?? 'all', cc = countryOfCity(rec.city) ?? 'ng';
    const score = (p: PlayerRecord): number => (period === 'week' ? (game ? p.wg[game] ?? 0 : p.wp) : seasonScore(p, game));
    const prefix = period === 'week' ? `w${tm.week}` : `s${season.n}`;
    const rowOf = (pid: string, p: PlayerRecord): BoardRow => [pid, p.name, score(p), topTier(p)];
    const fresh = (p: PlayerRecord): PlayerRecord => { if (p.season !== season.n || p.wk !== tm.week) { const copy = structuredClone(p); roll(copy, season.n, tm.day, tm.week); return copy; } return p; };
    const out: View[] = [];
    const friendIds = Object.keys((db.social?.players[id]?.friends as Record<string, unknown> | undefined) ?? {}).slice(0, 100);
    const friends = [id, ...friendIds].flatMap((fid) => { const p = c.players[fid]; return p ? [rowOf(fid, fresh(p))] : []; });
    if (friendIds.length) out.push({ k: 'friends', t: 'Friends', ...cut(friends, id, new Set(friends.filter((x) => c.players[x[0]]?.ai).map((x) => x[0]))) });
    const mine = rec.ai ? [] : [
      { k: 'city', t: cityName(rec.city), key: `${prefix}:c:${rec.city}:${which}` },
      ...(period === 'week' && rec.cohort ? [{ k: 'cohort', t: 'My weekly group', key: `${prefix}:h:${rec.cohort}:all` }] : []),
    ];
    for (const b of mine) { const rows = c.boards[b.key]?.rows; if (rows) out.push({ k: b.k, t: b.t, ...cut(rows, id) }); }
    const clan = rec.clan ? c.clans[rec.clan] : undefined;
    if (clan) {
      const rows = clan.members.flatMap((m) => { const p = c.players[m]; return p ? [rowOf(m, fresh(p))] : []; });
      out.push({ k: 'clan', t: clan.name, ...cut(rows, id, new Set(rows.filter((x) => c.players[x[0]]?.ai).map((x) => x[0]))) });
    }
    const extra = rec.ai ? [{ k: 'agents', t: 'AI-played characters', key: `${prefix}:a:all:all` }] : [
      { k: 'country', t: countryName(cc), key: `${prefix}:k:${cc}:all` },
      { k: 'global', t: 'Everyone', key: `${prefix}:g:all:${which}` },
    ];
    for (const b of extra) { const rows = c.boards[b.key]?.rows; if (rows) out.push({ k: b.k, t: b.t, ...cut(rows, id) }); }
    const fr = fresh(rec);
    return { period, game, me: mineOf(fr, c, season), boards: out };
  }
  interface Mine { name: string; rank: string; pts: number; tier: number; week: number; games: { game: string; rank: string; pts: number; w: number; l: number; d: number }[]; season: number; seasonEnds: number; prev: PlayerRecord['prev'] | null; city: string; cityName: string }
  function mineOf(p: PlayerRecord, c: ClansCollection, season: { n: number; start: number; days: number }): Mine {
    const games = Object.entries(p.g).map(([game, g]) => ({ game, rank: rankName(g.p), pts: g.p, w: g.w, l: g.l, d: g.d })).sort((a, b) => b.pts - a.pts);
    const top = games[0]?.pts ?? 0;
    return { name: p.name, rank: rankName(top), pts: top, tier: tierOf(top), week: Math.max(0, p.wp), games, season: season.n, seasonEnds: season.start + season.days, prev: p.prev ?? null, city: p.city, cityName: cityName(p.city) };
  }
  /** The weekly standing of cities and countries, overall or in one game. */
  function league(db: Db, id: string | null, game: string | null) {
    const c = peekClans(db), tm = lagosTime(ctx.now()), w = tm.week, which = game ?? 'all';
    const lw = c?.league[`w${w}`], last = c?.league[`w${w - 1}`];
    const rec = id && c ? c.players[id] : undefined, home = rec?.city ?? null;
    const standing = (l: typeof lw): { id: string; name: string; score: number; players: number; mine?: 1 }[] => rankCities(Object.entries(l?.cities ?? {}).flatMap(([cid, m]) => (m[which] ? [{ id: cid, score: m[which][0], players: m[which][1] }] : []))).filter((x) => x.score > 0)
      .map((x) => ({ ...x, name: cityName(x.id), ...(x.id === home ? { mine: 1 as const } : {}) }));
    const cities = standing(lw), shown = cities.slice(0, LEAGUE.standingRows);
    const mineRow = cities.find((x) => x.id === home);
    if (mineRow && !shown.includes(mineRow)) shown.push(mineRow);
    const countries = rankCities(Object.entries(lw?.countries ?? {}).map(([cc, v]) => ({ id: cc, score: v[0], players: v[1] }))).filter((x) => x.score > 0).slice(0, LEAGUE.standingRows).map((x) => ({ ...x, name: countryName(x.id) }));
    const won = last?.won?.[which];
    return { week: w, game, cities: shown, countries, lastWinner: won ? { id: won, name: cityName(won), week: w - 1 } : null, home: home ? { id: home, name: cityName(home) } : null };
  }
  return { record, intake, boards, league, enrol, settleWar, seasonOf, roll, clanCap, mineOf, settleLeague, upsert, cut };
}
export type LadderService = ReturnType<typeof ladderService>;
