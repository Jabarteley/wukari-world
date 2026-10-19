/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md "Match predictions")
 * PREDICTIONS on the fixtures an admin listed (server/admin/festivals.ts; the rules are src/watch/predictions.ts). A person picks before
 * kick-off; an admin types the result in (there is no score feed); the result scores every pick once, gives the badges, adds to the
 * season's board and writes one public gist line, the result card's words. An admin may correct a result: the old points and badges
 * are taken back and the new ones given, so the board is always the stored picks against the stored result.
 *
 * Never money: nothing here reads or writes a balance, game naira or Earn. A pick is a winner and a score.
 */
import { festivalsOf } from '../admin/festivals.ts';
import { countryOfCity } from '../routes/festivals.ts';
import { gistService, WORLD } from '../gist/ledger.ts';
import { PREDICT, badgeFor, cleanPick, cleanResult, pickOpen, pointsFor, rankBoard, resultGist, seasonOf, teamsOf } from '../../src/watch/predictions.ts';
import type { MatchPick } from '../../src/watch/predictions.ts';
import { countryKey } from '../../src/festivals/calendar.ts';
import type { Fixture } from '../../src/festivals/matches.ts';
import { peekWatch, watchOf } from './data.ts';
import type { WatchCollection } from './data.ts';
import type { BoardView, MatchView, MatchesView } from '../../src/types/watch.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
/** Fixtures shown: from three days ago (the result) to two weeks ahead (open for picks). */
const BACK_MS = 3 * 86400000;

/** A name for a public list (the board): an adult not hidden from the directory, else "A fan". */
export function shownName(ctx: RouteContext, db: Db, id: string): string {
  const prefs = record(db.civic) && record((db.civic as Record<string, unknown>).prefs) ? ((db.civic as Record<string, unknown>).prefs as Record<string, unknown>)[id] : null;
  const hidden = record(prefs) && prefs.directory === true;
  const name = (db.social?.players?.[id] as { name?: unknown } | undefined)?.name;
  return !hidden && ctx.checks?.adult?.(db, id) === true && typeof name === 'string' ? name.slice(0, 24) : 'A fan';
}

export function predictionsService(ctx: RouteContext) {
  const fixtures = (): Fixture[] => festivalsOf(ctx).fixtures();
  const fixtureOf = (id: unknown): Fixture | null => fixtures().find((item) => item.id === id) ?? null;

  function matchView(col: WatchCollection, fixture: Fixture, viewer: string | null, now: number): MatchView {
    const picks = col.picks[fixture.id] ?? {}, mine = viewer ? picks[viewer] : undefined, result = col.results[fixture.id];
    const counts = { home: 0, away: 0, draw: 0 };
    for (const pick of Object.values(picks)) if (record(pick) && (pick.w === 'home' || pick.w === 'away' || pick.w === 'draw')) counts[pick.w] += 1;
    const points = mine && result ? pointsFor(mine, result) : undefined;
    return {
      id: fixture.id, title: fixture.title, start: fixture.start, end: fixture.start + fixture.minutes * 60000, teams: teamsOf(fixture.title), open: pickOpen(fixture, now), counts,
      ...(mine ? { mine: { w: mine.w, ...(mine.s ? { s: [mine.s[0], mine.s[1]] as [number, number] } : {}) } } : {}),
      ...(result ? { result: { home: result.home, away: result.away }, right: result.right, picks: result.picks, season: result.season, ...(result.line ? { line: result.line } : {}) } : {}),
      ...(points !== undefined ? { points } : {}),
      ...(mine && result ? { badge: badgeFor(mine, result) } : {}),
    };
  }

  /** The fixtures a city's country is shown, with the caller's picks and the results. */
  function matches(db: Db, viewer: string | null, city: string, now: number): MatchesView {
    const col = peekWatch(db), country = countryKey(countryOfCity(city) ?? 'ng');
    const list = fixtures().filter((item) => (!item.countries.length || item.countries.includes(country)) && item.start + item.minutes * 60000 > now - BACK_MS && item.start < now + PREDICT.aheadMs)
      .sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));
    return { now, season: seasonOf(now), matches: list.map((fixture) => matchView(col, fixture, viewer, now)), badges: viewer ? [...(col.badges[viewer] ?? [])].reverse() : [] };
  }

  /** A pick, or the reason it is refused. Inside a transaction. */
  function predict(db: Db, session: SessionRecord, body: Record<string, unknown>, now: number): { ok: true; match: MatchView } | Refused {
    const fixture = fixtureOf(body.fixture);
    if (!fixture) return no('unknown_fixture', 'That match is not on the list.');
    if (!teamsOf(fixture.title)) return no('not_a_match', 'This match night has no two sides to pick from.');
    if (!pickOpen(fixture, now)) return no(now >= fixture.start ? 'kicked_off' : 'too_early', now >= fixture.start ? 'The match has started: picks are closed.' : 'Picks open two weeks before kick-off.');
    const done = cleanPick(body, now);
    if (!done.ok) return no('invalid_pick', done.reason);
    const col = watchOf(ctx, db);
    (col.picks[fixture.id] ??= {})[session.publicId] = done.pick;
    return { ok: true, match: matchView(col, fixture, session.publicId, now) };
  }

  /** Give (sign 1) or take back (sign -1) what a result gave one pick. */
  function score(col: WatchCollection, fixtureId: string, title: string, id: string, pick: MatchPick, result: { home: number; away: number; at: number }, season: string, sign: 1 | -1): void {
    const points = pointsFor(pick, result), badge = badgeFor(pick, result);
    const board = (col.board[season] ??= {}), row = board[id] ?? { p: 0, right: 0, exact: 0 };
    row.p = Math.max(0, row.p + sign * points);
    if (badge) { row.right = Math.max(0, row.right + sign); if (badge === 'exact') row.exact = Math.max(0, row.exact + sign); }
    if (row.p || row.right || row.exact) board[id] = row; else delete board[id];
    if (sign === -1) { const kept = (col.badges[id] ?? []).filter((item) => item.fixture !== fixtureId); if (kept.length) col.badges[id] = kept; else delete col.badges[id]; return; }
    if (badge) { const list = (col.badges[id] ??= []); list.push({ fixture: fixtureId, title, kind: badge, at: result.at }); if (list.length > PREDICT.badgesKept) list.splice(0, list.length - PREDICT.badgesKept); }
  }

  /** An admin's result (inside a transaction): scores every pick, once; a correction takes the old result back first. */
  function enterResult(db: Db, body: Record<string, unknown>, now: number): { ok: true; summary: string } | Refused {
    const fixture = fixtureOf(body.fixture);
    if (!fixture) return no('unknown_fixture', 'No fixture has that id.');
    if (!teamsOf(fixture.title)) return no('not_a_match', 'This fixture has no two sides.');
    if (now < fixture.start) return no('not_started', 'A result can be entered once the match has kicked off.');
    const done = cleanResult(body);
    if (!done.ok) return no('invalid_result', done.reason);
    const col = watchOf(ctx, db), picks = col.picks[fixture.id] ?? {}, before = col.results[fixture.id], season = before?.season ?? seasonOf(fixture.start);
    if (before && before.home === done.home && before.away === done.away) return { ok: true, summary: `result unchanged: ${fixture.id}` };
    if (before) for (const [id, pick] of Object.entries(picks)) if (record(pick)) score(col, fixture.id, fixture.title, id, pick, before, season, -1);
    const result = { home: done.home, away: done.away, at: now };
    let right = 0, exact = 0, total = 0;
    for (const [id, pick] of Object.entries(picks)) {
      if (!record(pick)) continue;
      total += 1;
      const badge = badgeFor(pick, result);
      if (badge) right += 1;
      if (badge === 'exact') exact += 1;
      score(col, fixture.id, fixture.title, id, pick, result, season, 1);
    }
    const line = gistService(ctx).add(db, { city: WORLD, kind: 'event', text: resultGist(fixture.title, result, right, total), refs: { key: `watch:result:${fixture.id}:${done.home}-${done.away}` } })?.n;
    col.results[fixture.id] = { ...result, title: fixture.title, start: fixture.start, season, right, exact, picks: total, ...(line ? { line } : {}) };
    return { ok: true, summary: `result ${before ? 'corrected' : 'entered'}: ${fixture.id} ${done.home}-${done.away} (${right} of ${total} called it)` };
  }

  /** The season's board: the best PREDICT.board and the caller's own place. */
  function board(db: Db, viewer: string | null, season: string): BoardView {
    const rows = Object.entries(peekWatch(db).board[season] ?? {}).filter(([, row]) => record(row)).map(([id, row]) => ({ id, name: shownName(ctx, db, id), points: row.p, right: row.right, exact: row.exact }));
    const ranked = rankBoard(rows), at = viewer ? ranked.findIndex((row) => row.id === viewer) : -1;
    return { season, rows: ranked.slice(0, PREDICT.board).map((row, index) => ({ rank: index + 1, name: row.name, points: row.points, right: row.right, exact: row.exact, you: row.id === viewer })), ...(at >= 0 ? { me: { rank: at + 1, points: ranked[at]!.points, right: ranked[at]!.right, exact: ranked[at]!.exact } } : {}), players: ranked.length };
  }

  /** The admin's list: every fixture with its pick count and result. */
  function adminList(db: Db): { id: string; title: string; start: number; teams: boolean; picks: number; result: { home: number; away: number } | null }[] {
    const col = peekWatch(db);
    return fixtures().map((item) => ({ id: item.id, title: item.title, start: item.start, teams: teamsOf(item.title) !== null, picks: Object.keys(col.picks[item.id] ?? {}).length, result: col.results[item.id] ? { home: col.results[item.id]!.home, away: col.results[item.id]!.away } : null }));
  }

  return { matches, predict, enterResult, board, adminList };
}
