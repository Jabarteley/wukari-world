// OWNER: agents — Spot the AI (server/house/spot.ts): which lines are kept (AI lines, and people's lines only when an adult opted in), the weekly game (never built
// without enough lines from enough people, answers never sent before a guess), scoring, one play a week, and opting out deleting a person's lines everywhere.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadCityNetwork } from '../../src/game/cities/index.ts';
import { lagosDayStart } from '../../src/game/clock.ts';
import type { RouteContext } from '../types.ts';
import { SPOT, buildGame, eraseSpot, personKey, score, spotLine, spotService, weekOf } from './spot.ts';
import type { SpotLine } from './spot.ts';

await loadCityNetwork();
const DAY = 86400000;
const MONDAY = lagosDayStart(20000 + ((((1 - ((20000 + 4) % 7)) % 7) + 7) % 7)); // a Monday, Lagos time

test('a line is used only when it is plain public talk: no names, numbers, links, contact details or anything the AI word rules refuse', () => {
  for (const ok of ['The market is busy this morning, come and see', 'I love the jollof here in Lagos', 'Who wants to play a game of ayo tonight?', 'This place is lovely. The music is good.']) assert.equal(spotLine(ok, 'lagos'), ok, ok);
  for (const bad of ['hi', 'call me on 08031234567 later', 'Tunde come and see this', 'meet me at www.example.com', 'my whatsapp is open, text me', 'send me money please my friend', 'I go see Ada for market tomorrow', 'follow @ada_lagos on there']) assert.equal(spotLine(bad, 'lagos'), null, bad);
});

function lines(w: number): SpotLine[] {
  const out: SpotLine[] = [];
  let n = 0;
  const people = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
  for (let i = 0; i < 18; i++) out.push({ n: ++n, at: 0, w, ai: 0, text: `People line number ${'abcdefghijklmnopqrstuvwxyz'[i]} is here today`, city: 'lagos', by: people[i % people.length]! });
  for (let i = 0; i < 16; i++) out.push({ n: ++n, at: 0, w, ai: 1, text: `Fresh stock today, come and see ${'abcdefghijklmnopqrstuvwxyz'[i]} things`, city: 'lagos', by: i % 2 ? 'Mama Tolani' : 'Tunji' });
  return out;
}

test('the game: up to five rounds of five lines, one to three AI in each, at most three lines of a person, and nothing without enough lines from enough people', () => {
  const w = 3000;
  const game = buildGame(lines(w - 1), w, 0)!;
  assert.ok(game);
  assert.equal(game.rounds.length, SPOT.rounds);
  for (const round of game.rounds) {
    assert.equal(round.length, SPOT.perRound);
    const ai = round.filter((item) => item.ai === 1).length;
    assert.ok(ai >= 1 && ai <= 3, `${ai} AI lines`);
  }
  const perPerson = new Map<string, number>();
  for (const item of game.rounds.flat()) if (item.ai === 0) perPerson.set(item.by, (perPerson.get(item.by) ?? 0) + 1);
  for (const [, count] of perPerson) assert.ok(count <= SPOT.perPerson);
  for (const item of game.rounds.flat()) assert.equal(item.label, item.ai ? `${item.by} (AI-played)` : 'A player who opted in', 'the reveal uses the AI-played label, never a player\'s name');
  assert.deepEqual(buildGame(lines(w - 1), w, 0), game, 'the same lines give the same game');
  // Two people only: not enough.
  assert.equal(buildGame(lines(w - 1).filter((line) => line.ai === 1 || line.by === 'k1' || line.by === 'k2'), w, 0), null);
  assert.equal(buildGame(lines(w - 1).filter((line) => line.ai === 0), w, 0), null, 'no AI lines: no game');
  assert.equal(buildGame(lines(w - 5), w, 0), null, 'old lines are not used');
  // Scoring: a point for every line told right.
  const truth = game.rounds.flat().filter((item) => item.ai === 1).map((item) => item.n);
  assert.deepEqual([score(game, truth).s, score(game, truth).of], [25, 25]);
  const none = score(game, []);
  assert.equal(none.s, game.rounds.flat().filter((item) => item.ai === 0).length);
  const all = score(game, game.rounds.flat().map((item) => item.n));
  assert.equal(all.s, truth.length);
});

function rig() {
  const clock = { t: MONDAY + 10 * 3600000 };
  const adults = new Set(['a1', 'a2', 'a3', 'a4', 'bot']);
  const db: Record<string, unknown> = { social: { players: { bot: { agent: { char: true } } } } };
  const listeners: Record<string, ((data: never) => void)[]> = {};
  const ctx = {
    now: () => clock.t,
    cityIds: ['lagos'],
    checks: { adult: (_db: unknown, id: string) => adults.has(id) },
    on: (event: string, listener: (data: never) => void) => { (listeners[event] ??= []).push(listener); },
    store: { read: async <T>(fn: (d: object) => T): Promise<T> => fn(db), transact: async <T>(fn: (d: object) => T): Promise<T> => fn(db) },
    collection: (d: Record<string, unknown>, name: string, init: unknown) => (d[name] ??= init),
  } as unknown as RouteContext;
  const spot = spotService(ctx);
  const say = (id: string, body: string, room = 'lagos:market'): void => { for (const listener of listeners['venue-line'] ?? []) listener({ room, group: null, from: { id, name: id }, body } as never); };
  return { clock, adults, db, spot, say };
}
const PEOPLE_LINES = ['The market is busy this morning, come and see', 'I love the jollof here so much', 'Who wants to play a game tonight?', 'This music is really good today', 'My feet are tired from walking', 'The weather is lovely this afternoon', 'Is anybody going to the beach later?', 'I just finished my shift at work', 'The traffic was terrible this morning'];
const AI_LINES = ['Fresh stock today. Come and have a look.', 'Fair prices here, take your time.', 'Come and see what is new today.', 'New in town? Ask me where anything is.', 'Looking for a place? Ask me the way.', 'Ask me about prices, hours or the way.', 'A quiz is coming up. Come and play!'];

test('only opted-in adults\' public lines are kept; a character an AI plays, a minor, a home and a person who did not opt in are never kept', async () => {
  const r = rig();
  assert.equal(r.spot.opt(r.db as never, 'minor', true).ok, false, 'adults only');
  assert.equal(r.spot.opt(r.db as never, 'bot', true).ok, false, 'never an AI-played character');
  for (const id of ['a1', 'a2', 'a3']) assert.ok(r.spot.opt(r.db as never, id, true).ok);
  r.say('a1', PEOPLE_LINES[0]!); r.say('a4', PEOPLE_LINES[1]!); r.say('bot', PEOPLE_LINES[2]!); r.say('a2', PEOPLE_LINES[3]!, 'lagos:home'); r.say('a3', 'call me on 08031234567');
  r.spot.noteAi({ name: 'Mama Tolani', text: AI_LINES[0]!, city: 'lagos' });
  await r.spot.flush(true);
  const kept = (r.db.spotAi as { lines: SpotLine[] }).lines;
  assert.deepEqual(kept.map((line) => [line.ai, line.text]), [[0, PEOPLE_LINES[0]], [1, AI_LINES[0]]]);
  assert.equal(kept[0]!.by, personKey('a1'), 'a one-way key, never the id');
  assert.ok(!JSON.stringify(kept).includes('a1'));
  // An adult who later is not one (their age answer changed): no more lines are kept.
  r.adults.delete('a1');
  r.say('a1', PEOPLE_LINES[4]!);
  await r.spot.flush(true);
  assert.equal((r.db.spotAi as { lines: SpotLine[] }).lines.length, 2);
});

test('a week of play: not enough → open (no answers sent) → one guess a week with the reveal and a rank → opting out deletes the person\'s lines everywhere', async () => {
  const r = rig();
  for (const id of ['a1', 'a2', 'a3']) r.spot.opt(r.db as never, id, true);
  r.say('a1', PEOPLE_LINES[0]!);
  await r.spot.flush(true);
  const early = r.spot.view(r.db as never, 'a4');
  assert.equal(early.state, 'not_enough');
  PEOPLE_LINES.slice(1).forEach((line, at) => r.say(['a1', 'a2', 'a3'][at % 3]!, line));
  for (const line of AI_LINES) r.spot.noteAi({ name: line.includes('Ask me') ? 'Tunji' : 'Mama Tolani', text: line, city: 'lagos' });
  await r.spot.flush(true);
  const open = r.spot.view(r.db as never, 'a4');
  assert.equal(open.state, 'open');
  if (open.state !== 'open') return;
  assert.ok(open.rounds.length >= SPOT.minRounds);
  assert.ok(!JSON.stringify(open).includes('"ai"') && !JSON.stringify(open).includes('AI-played'), 'no answer before the guess');
  const game = (r.db.spotAi as { games: Record<string, { rounds: { n: number; ai: 0 | 1 }[][] }> }).games[String(weekOf(r.clock.t))]!;
  const truth = game.rounds.flat().filter((item) => item.ai === 1).map((item) => item.n);
  const won = r.spot.guess(r.db as never, 'a4', truth);
  assert.ok(won.ok);
  if (!won.ok) return;
  assert.equal(won.result.s, won.result.of);
  assert.ok(won.result.rounds.flat().every((item) => item.right));
  assert.ok(won.result.rounds.flat().some((item) => item.label === 'Mama Tolani (AI-played)'));
  assert.ok(won.result.rounds.flat().filter((item) => !item.ai).every((item) => item.label === 'A player who opted in'));
  const again = r.spot.guess(r.db as never, 'a4', []);
  assert.ok(!again.ok && again.code === 'played');
  const view = r.spot.view(r.db as never, 'a4');
  assert.equal(view.state, 'played');
  const lost = r.spot.guess(r.db as never, 'a5', game.rounds.flat().filter((item) => item.ai === 0).map((item) => item.n));
  assert.ok(lost.ok && lost.result.s === 0 && lost.result.better === 0);
  assert.ok(!r.spot.guess(r.db as never, 'a6', 'everything' as never).ok);
  // Opting out: a1's lines leave the pool and this week's game at once.
  const out = r.spot.opt(r.db as never, 'a1', false);
  assert.ok(out.ok && out.deleted > 0);
  const kept = r.db.spotAi as { lines: SpotLine[]; games: Record<string, { rounds: { by: string }[][] }> };
  assert.ok(!kept.lines.some((line) => line.by === personKey('a1')));
  assert.ok(!Object.values(kept.games).some((g) => g.rounds.flat().some((item) => item.by === personKey('a1'))));
  // Erasure takes the rest: a2's lines, choice and plays.
  eraseSpot(r.db as never, 'a2');
  assert.ok(!kept.lines.some((line) => line.by === personKey('a2')));
  assert.ok(!Object.hasOwn((r.db.spotAi as { opt: Record<string, number> }).opt, 'a2'));
  // Next week a new game is built from last week's lines; old weeks are dropped as weeks pass.
  r.clock.t += 7 * DAY;
  assert.notEqual(r.spot.view(r.db as never, 'a4').state, 'played');
});
