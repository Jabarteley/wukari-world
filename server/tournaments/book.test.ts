// The agent arena's pure rules (docs/AGENT-ARENA.md): pairing, the week, standings, the prize ceiling, erasure; and the match engine's clocks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lagosTime } from '../../src/game/clock.ts';
import { GAMES } from '../../src/tables/games.ts';
import { arenaGame } from '../../src/arena/registry.ts';
import { cleanArenaOptions } from '../../src/arena/rules.ts';
import { makeRng } from '../../src/game/util.ts';
import { ARENA, bracketFirstRound, bracketOrder, emptyBook, forgetArena, prizeRoom, roundRobin, tableOf, weekOf } from './book.ts';
import type { MatchRec } from './book.ts';
import { advance, newMatch, submit, touch, viewOf } from './matches.ts';
import { planTicks } from './windows.ts';
import { toInput, describe } from './inputs.ts';

test('round robin: everyone meets everyone exactly once, nobody twice in a round, seats shared out', () => {
  for (const n of [2, 3, 4, 5, 6]) {
    const ids = Array.from({ length: n }, (_, i) => `a${i}`), rounds = roundRobin(ids), seen = new Set<string>();
    assert.equal(rounds.length, n % 2 ? n : n - 1);
    for (const pairs of rounds) {
      const here = pairs.flat();
      assert.equal(new Set(here).size, here.length, 'nobody plays twice in a round');
      for (const [a, b] of pairs) { const key = [a, b].sort().join('|'); assert.ok(!seen.has(key), key); seen.add(key); }
    }
    assert.equal(seen.size, (n * (n - 1)) / 2);
    const first = new Map<string, number>();
    for (const pairs of rounds) for (const [a] of pairs) first.set(a, (first.get(a) ?? 0) + 1);
    for (const id of ids) assert.ok((first.get(id) ?? 0) < n - 1 || n === 2, `${id} does not always have the first seat`);
    assert.ok(Math.max(...ids.map((id) => first.get(id) ?? 0)) - Math.min(...ids.map((id) => first.get(id) ?? 0)) <= 2, 'the first seat is shared out');
  }
});

test('bracket: seeds 1 and 2 meet only in the final, byes go to the top seeds', () => {
  assert.deepEqual(bracketOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const ids = ['s1', 's2', 's3', 's4', 's5'], first = bracketFirstRound(ids);
  assert.deepEqual(first.byes.sort(), ['s1', 's2', 's3']);
  assert.deepEqual(first.pairs, [['s4', 's5']]);
});

test('the week: Monday 00:00 Lagos time, entries close Tuesday and Wednesday night, rounds end Saturday night', () => {
  const now = Date.UTC(2026, 9, 16, 12, 0), w = weekOf(lagosTime(now).week);
  assert.equal(lagosTime(w.start).weekday, 1);
  assert.deepEqual([lagosTime(w.start).hour, lagosTime(w.start).minute], [0, 0]);
  assert.equal(new Date(w.start).toISOString(), '2026-10-11T23:00:00.000Z', 'Monday 12 October 00:00 in Lagos (UTC+1)');
  assert.equal(lagosTime(w.entryEnd).weekday, 3, 'game entries close at the start of Wednesday');
  assert.equal(lagosTime(w.lifeEntryEnd).weekday, 4);
  assert.equal(lagosTime(w.roundsEnd).weekday, 0, 'rounds end as Sunday begins');
  assert.equal(w.end - w.start, 7 * 86400000);
  assert.ok(w.start <= now && now < w.end);
});

test('standings: 3 for a win, 1 for a draw, ties to wins then to the better seed', () => {
  const m = (a: string, b: string, winner: 0 | 1 | null): MatchRec => ({ ...newMatch({ id: `${a}${b}`, ref: 'w1-chess', game: 'chess', ids: [a, b], names: [a, b], seed: 's', round: 0, opened: 0, deadline: 1 }), status: 'done', result: { winner, reason: 'x', text: '', scores: [] } });
  const table = tableOf(['a', 'b', 'c'], {}, [m('a', 'b', 1), m('a', 'c', 0), m('b', 'c', null)]);
  assert.deepEqual(table.map((r) => [r.id, r.points]), [['b', 4], ['a', 3], ['c', 1]]);
});

test('the weekly prize ceiling: what one character may still be paid', () => {
  const book = emptyBook();
  assert.equal(prizeRoom(book, 'x', 5), ARENA.weeklyPrizeCeiling);
  book.paidWeek.x = { week: 5, amount: 3000 };
  assert.equal(prizeRoom(book, 'x', 5), ARENA.weeklyPrizeCeiling - 3000);
  assert.equal(prizeRoom(book, 'x', 6), ARENA.weeklyPrizeCeiling, 'a new week starts again');
  assert.ok(Math.max(...ARENA.prizes) <= 2000, 'no prize above the highest table stake');
});

test('forgetting an agent: open entries and challenges go, played results keep no name or id, prizes and badges go', () => {
  const book = emptyBook();
  book.cups.open = { id: 'open', week: 1, kind: 'game', key: 'chess', status: 'open', entrants: [{ id: 'gone', name: 'Gone', ok: 'o1', seed: 0, enteredAt: 0, base: 0, people: 0 }] };
  book.cups.done = { id: 'done', week: 0, kind: 'game', key: 'chess', status: 'settled', entrants: [{ id: 'gone', name: 'Gone', ok: 'o1', seed: 1, enteredAt: 0, base: 0, people: 0 }], results: [{ rank: 1, id: 'gone', name: 'Gone', score: 3, prize: 2000 }] };
  book.matches.m = { ...newMatch({ id: 'm', ref: 'done', game: 'chess', ids: ['gone', 'kept'], names: ['Gone', 'Kept'], seed: 's', round: 0, opened: 0, deadline: 1 }) };
  book.challenges['c-1'] = { code: 'c-1', kind: 'game', key: 'chess', from: { id: 'gone', name: 'Gone', ok: 'o1' }, createdAt: 0, expiresAt: 9, status: 'open' };
  book.badges.gone = [{ week: 0, kind: 'chess', label: 'Chess cup', rank: 1, at: 0, name: 'Gone', cup: 'done' }];
  book.prizes.p = { id: 'p', char: 'gone', amount: 2000, label: 'x', week: 0, paid: false, at: 0 };
  book.limits.o1 = { day: 1, made: 1, accepted: 0 };
  forgetArena(book, new Set(['gone']), new Set(['o1']));
  const text = JSON.stringify(book);
  assert.ok(!text.includes('"gone"') && !text.includes('Gone'), text);
  assert.equal(book.cups.open?.entrants.length, 0);
  assert.equal(book.cups.done?.results?.[0]?.name, 'Removed agent');
  assert.deepEqual(book.matches.m?.names, ['Removed agent', 'Kept']);
  assert.equal(Object.keys(book.challenges).length, 0);
  assert.deepEqual([book.badges, book.prizes, book.limits], [{}, {}, {}]);
});

test('a table match: the first look starts it, a turn nobody takes goes by the game\'s own rule (chess: lost on time), a deadline ends it', () => {
  const m = newMatch({ id: 'mt', ref: 'w1-chess', game: 'chess', ids: ['a', 'b'], names: ['Ada', 'Bob'], seed: 'seed-1', round: 0, opened: 0, deadline: 10 * 3600000 });
  assert.equal(viewOf(m, 0, 0).status, 'waiting');
  touch(m, 0, 1000);
  assert.equal(m.status, 'playing');
  touch(m, 1, 2000);
  const view = viewOf(m, 0, 2000) as { yourTurn: boolean; n: number; toMove: number[] };
  assert.equal(view.yourTurn, true);
  // A legal move from the game's own bot, as an agent would read it from `view`.
  const rules = GAMES.chess, state = rules.start(2, makeRng('seed-1'), { ...rules.options && {}, clock: 'untimed', colour: 'white', level: 'medium' } as never);
  const move = rules.bot(state, 0, makeRng('x'));
  assert.deepEqual(submit(m, 1, { move, n: 0 }, 3000), { ok: false, code: 'not_your_turn', reason: 'It is not your turn.' });
  assert.equal(submit(m, 0, { move, n: 0 }, 3000).ok, true);
  assert.equal(submit(m, 0, { move, n: 0 }, 3000).ok, false, 'a stale n is refused');
  advance(m, 3000 + ARENA.turnMs - 1);
  assert.equal(m.status, 'playing', 'the turn is not over yet');
  advance(m, 3000 + ARENA.turnMs);
  assert.equal(m.status, 'done');
  assert.deepEqual([m.result?.winner, m.result?.reason], [0, 'time']);
  assert.match(m.result?.text ?? '', /Bob|Ada/);
  // Whot plays a missed turn for the seat (draws a card); three missed turns in a row lose.
  const w = newMatch({ id: 'mw', ref: 'w1-whot', game: 'whot', ids: ['a', 'b'], names: ['Ada', 'Bob'], seed: 'seed-2', round: 0, opened: 0, deadline: 10 * 3600000 });
  touch(w, 0, 1); touch(w, 1, 1);
  advance(w, ARENA.turnMs * 6 + 2);
  assert.equal(w.status, 'done');
  assert.equal(w.result?.reason, 'no_answer');
  const idle = newMatch({ id: 'mi', ref: 'w1-chess', game: 'chess', ids: ['a', 'b'], names: ['Ada', 'Bob'], seed: 's', round: 0, opened: 0, deadline: 5000 });
  advance(idle, 5000);
  assert.deepEqual([idle.status, idle.result?.winner, idle.result?.reason], ['done', null, 'no_show']);
  const lone = newMatch({ id: 'ml', ref: 'w1-chess', game: 'chess', ids: ['a', 'b'], names: ['Ada', 'Bob'], seed: 's', round: 0, opened: 0, deadline: 10 * 3600000 });
  touch(lone, 1, 0);
  advance(lone, ARENA.graceMs);
  assert.deepEqual([lone.result?.winner, lone.result?.reason], [1, 'no_show'], 'the agent that never came loses after the grace');
});

test('a real-time match runs in decision windows: both plans run together, the engine equals stepping the ticks of planTicks', () => {
  const m = newMatch({ id: 'mf', ref: 'c-00000000', game: 'fight', ids: ['a', 'b'], names: ['Ada', 'Bob'], seed: 'fight-seed', round: 0, opened: 0, deadline: 3600000 });
  touch(m, 0, 1); touch(m, 1, 1);
  const plan = [toInput('fight', ['right']), toInput('fight', ['right', 'punch']), toInput('fight', ['punch']), toInput('fight', [])];
  assert.ok(plan.every((n) => typeof n === 'number'));
  assert.equal(submit(m, 0, { plan }, 10).ok, true);
  assert.equal(submit(m, 0, { plan }, 10).ok, false, 'one plan a window');
  assert.equal(m.log.length, 0, 'the window waits for the other seat');
  assert.equal(submit(m, 1, { plan: [] }, 20).ok, false, 'an empty plan is not a plan');
  assert.equal(submit(m, 1, { plan: [toInput('fight', [])] }, 20).ok, true);
  assert.equal(m.log.length, 1);
  // The first window is the fight's intro (2.5 s): the second walks.
  assert.equal(submit(m, 0, { plan }, 25).ok, true);
  assert.equal(submit(m, 1, { plan: [toInput('fight', [])] }, 26).ok, true);
  // The same game, stepped by hand from the log with the shared expansion: what the watched room plays.
  const rules = arenaGame('fight');
  assert.ok(rules);
  const rng = makeRng('fight-seed'), held = [rules.idle(), rules.idle()];
  let state = rules.start(2, rng, cleanArenaOptions(rules, {}));
  for (const window of m.log as unknown[][]) for (const inputs of planTicks(rules, held, window)) state = rules.step(state, inputs, rng);
  const view = viewOf(m, 0, 30) as { snapshot: unknown; reading: { you: { x: number } } };
  assert.deepEqual(view.snapshot, rules.snapshot(state));
  assert.ok(view.reading.you.x > 360, 'the fighter walked right');
  // Nobody answers: the clock closes the windows, and eight missed windows in a row lose.
  advance(m, 30 + ARENA.windowMs * (ARENA.windowMisses + 1));
  assert.equal(m.status, 'done');
  assert.equal(m.result?.reason, 'no_answer');
});

test('inputs by name: the games\' own integers, refusals for the unknown, and a plain reading', () => {
  assert.equal(toInput('fight', ['left', 'block']), 1 | 32);
  assert.equal(toInput('fight', 'right punch'), 2 | (8 << 6));
  assert.equal(toInput('fight', ['dance']), null);
  assert.equal(toInput('race', ['gas', 'left']), 5);
  assert.equal(toInput('football', { heading: 0, kick: true }), 1 | 64);
  assert.equal(toInput('football', { heading: 90 }), 7);
  assert.equal(toInput('football', { heading: 'up' }), null);
  const rules = arenaGame('race');
  assert.ok(rules);
  const reading = describe('race', rules.snapshot(rules.start(2, makeRng('r'), cleanArenaOptions(rules, {}))), 0) as { you: { turnNear: number; turnFar: number } };
  assert.equal(typeof reading.you.turnNear, 'number');
  assert.ok(Math.abs(reading.you.turnNear) <= 180);
});
