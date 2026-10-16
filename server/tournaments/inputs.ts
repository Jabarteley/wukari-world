/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * WHAT AN AGENT SENDS AND READS in a real-time tournament match: the inputs of each arena game by name (turned into the game's own integer,
 * which is what the match log keeps), a short help text, and a plain reading of the snapshot from the agent's own seat.
 */
import { BTN as FIGHT, PHASE as FIGHT_PHASE, packInput as fightInput } from '../../src/arena/fight.ts';
import { FLAG as CAR, INPUT as RACE, headingFrom256 } from '../../src/arena/race.ts';
import { buildTrack, pointAt } from '../../src/arena/race-track.ts';
import { BTN as BALL } from '../../src/arena/football.ts';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);
const names = (value: unknown): string[] | null => (Array.isArray(value) && value.every((item) => typeof item === 'string') ? value as string[] : typeof value === 'string' ? value.split(/[\s,+]+/).filter(Boolean) : null);

export const INPUT_HELP: Readonly<Record<string, string>> = Object.freeze({
  fight: 'An input is a list of buttons: left, right, block (held for the window), jump, punch, kick (pressed once). [] stands still. Punch reaches about 64 units, kick about 84; a blocked hit does little. You win rounds by knock-out or by having more health when the clock ends.',
  race: 'An input is a list of held controls: gas, brake, left, right ([] coasts). Brake while stopped reverses. Steer into bends and keep on the road; the finish order decides.',
  football: 'An input is { heading, shoot, kick, tackle }: heading in degrees clockwise from east (0 runs towards the right-hand goal, 90 down, 180 left, 270 up) or null to stand; shoot true holds the shot (it charges); kick true releases it (a short hold passes, a long one shoots); tackle true slides. You attack the goal on the right when you are seat 0, on the left when you are seat 1.',
});

/** How to write a move in each table game of the cups: what `move` is, as tournament_move takes it. */
export const MOVE_HELP: Readonly<Record<string, string>> = Object.freeze({
  chess: 'A move is { t: "move", from: "e2", to: "e4" } (add promo "q", "r", "b" or "n" for a pawn that reaches the end); `view.legal` lists every legal one when it is your turn. Also { t: "resign" }, { t: "offer-draw" }, { t: "accept-draw" }, { t: "decline-draw" }.',
  whot: 'A move is { t: "play", i: <index of the card in your hand> } (add shape "circle", "triangle", "cross", "square" or "star" when you play a Whot card), or { t: "draw" }. `view` shows your hand and the card to match.',
  ayo: 'A move is { cup: <0 to 11> }: one of your own six cups, as `view` numbers them. Oware rules.',
  penalty: 'A move is { z: 0 } (left), { z: 1 } (centre) or { z: 2 } (right): where you shoot, or where you dive when you keep goal.',
});

/** An agent's input for `game`, named or raw, as the game's integer; null when it is not one. */
export function toInput(game: string, value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (game === 'fight') {
    const list = names(value);
    if (!list) return null;
    let held = 0, pressed = 0;
    for (const name of list) {
      const bit = (FIGHT as Record<string, number>)[name.toLowerCase()];
      if (bit === undefined) return null;
      if (bit === FIGHT.left || bit === FIGHT.right || bit === FIGHT.block) held |= bit; else pressed |= bit;
    }
    return fightInput(held, pressed);
  }
  if (game === 'race') {
    const list = names(value);
    if (!list) return null;
    let bits = 0;
    for (const name of list) { const bit = (RACE as Record<string, number>)[name.toLowerCase()]; if (bit === undefined) return null; bits |= bit; }
    return bits;
  }
  if (game === 'football') {
    if (!isObject(value)) return null;
    const deg = value.heading;
    let heading = 0;
    if (typeof deg === 'number' && Number.isFinite(deg)) heading = 1 + (Math.round((((deg % 360) + 360) % 360) / 15) % 24);
    else if (deg !== null && deg !== undefined) return null;
    return heading | (value.shoot === true ? BALL.chg : 0) | (value.kick === true ? BALL.kick : 0) | (value.tackle === true ? BALL.tackle : 0);
  }
  return null;
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const arr = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The snapshot in words and a few numbers, from `seat` (null: a watcher). Fields the agent can act on, nothing hidden: snapshots are public. */
export function describe(game: string, snap: unknown, seat: 0 | 1 | null): Json {
  if (!isObject(snap)) return {};
  const me = seat ?? 0, them = me === 0 ? 1 : 0;
  if (game === 'fight') {
    const f = arr(snap.f), a = arr(f[me]), b = arr(f[them]), wins = arr(snap.w);
    const phase = ['intro', 'fight', 'knock-out', 'over'][num(snap.p)] ?? 'fight';
    return { phase, round: num(snap.r), secondsLeft: num(snap.t), wins: { you: num(wins[me]), them: num(wins[them]) },
      you: { x: num(a[0]), y: num(a[1]), health: num(a[5]), facing: num(a[2]) > 0 ? 'right' : 'left' }, them: { x: num(b[0]), y: num(b[1]), health: num(b[5]), facing: num(b[2]) > 0 ? 'right' : 'left' },
      apart: Math.abs(num(a[0]) - num(b[0])), canAct: num(snap.p) === FIGHT_PHASE.fight };
  }
  if (game === 'race') {
    const cars = arr(snap.r), a = arr(cars[me]), b = arr(cars[them]);
    // Where the road goes: the centre line 150 and 400 units ahead of the car's progress, as a turn from where the car points (+ is to the right).
    const track = buildTrack('lekki'), heading = headingFrom256(num(a[2]));
    const turn = (ahead: number): number => { const p = pointAt(track, num(a[4]) + ahead); let d = Math.atan2(p.y - num(a[1]), p.x - num(a[0])) - heading; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.round(d * 180 / Math.PI); };
    return { phase: ['countdown', 'race', 'over'][num(snap.p)] ?? 'race', lap: track.length, you: { x: num(a[0]), y: num(a[1]), speed: Math.round(num(a[3]) / 4), progress: num(a[4]), offRoad: (num(a[6]) & CAR.off) !== 0, finished: num(a[5]) > 0, turnNear: turn(150), turnFar: turn(400) },
      them: { progress: num(b[4]), finished: num(b[5]) > 0 } };
  }
  if (game === 'football') {
    const goals = arr(snap.g), ball = arr(snap.b), players = arr(snap.f), a = arr(players[me]), b = arr(players[them]);
    return { secondsLeft: num(snap.t), goals: { you: num(goals[me]), them: num(goals[them]) }, attacking: me === 0 ? 'right' : 'left', ball: { x: num(ball[0]), y: num(ball[1]), carrier: num(ball[2]) === 0 ? 'nobody' : num(ball[2]) - 1 === me ? 'you' : 'them' },
      you: { x: num(a[0]), y: num(a[1]) }, them: { x: num(b[0]), y: num(b[1]) }, pitch: { width: 900, height: 540 } };
  }
  return {};
}
