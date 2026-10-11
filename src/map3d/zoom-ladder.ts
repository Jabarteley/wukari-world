/**
 * OWNER: world
 * The zoom ladder: how zooming past the end of a map hands over to the map above or below it. Pure: no Three.js, no DOM,
 * no timers (the caller passes the time), so every rule here is a plain unit test.
 *
 *   world → continent → country → city → district → neighbourhood        (rungs; a city without districts stops at the city)
 *
 * The atlas draws the first three rungs on one camera (it already changes level by distance, see ./geo/levels.ts); the city map
 * draws the last three on its own camera. What this file decides is only what happens at the two ENDS of a camera's range:
 *
 *   rungsFor(options)                      the rungs a city has: a city with no districts or houses stops at the city
 *   stepOf(rungs, id, edge)                the rung beyond an edge, or null at the end of the ladder
 *   cityBand(distance, cuts, current)      which of city / district / neighbourhood a city-map camera distance reads as
 *   createPressure(options)                zoom that the camera could not take (it stood at its limit) builds up; enough of it, in one go, steps
 *   createHandoff(options)                 the hand-over itself: waits for the next map, fades, can be reversed, ends
 *   crossfade(progress)                    the two opacities of a hand-over: never both low
 *   entryDistance(edge, range, carry)      where the next map's camera starts, so the gesture carries on
 *   limitHint(edge, beyond, name, look)    the words of the chip that appears near a limit
 *   LadderPort                             what a map tells whoever runs the ladder (the host, src/map3d/zoom-host.ts)
 *
 * The rules a player can feel:
 *   - One wheel notch or a small pinch never changes level: a step needs PRESSURE_STEP of log-zoom (about a 1.7x pinch, or four notches)
 *     pushed against the limit within one gesture; the pressure drains away when the gesture pauses.
 *   - Once a step has fired nothing fires again until the hand-over is over and a cool-down has passed, and the next map starts well inside
 *     its own range, so a hand-over cannot bounce.
 *   - Zooming never travels: nothing here knows about the player (see the invariants in zoom-ladder.test.ts).
 */
import { levelAt } from './geo/levels.ts';

export type RungId = 'world' | 'continent' | 'country' | 'city' | 'district' | 'neighbourhood';
/** Which map draws a rung: the atlas (one camera for world, continent and country) or the city map. */
export type Surface = 'atlas' | 'city';
export interface Rung { id: RungId; surface: Surface; name: string }
export type Edge = 'out' | 'in';

/** Widest first. */
export const RUNGS: readonly Rung[] = Object.freeze([
  { id: 'world', surface: 'atlas', name: 'the world' },
  { id: 'continent', surface: 'atlas', name: 'the continent' },
  { id: 'country', surface: 'atlas', name: 'the country' },
  { id: 'city', surface: 'city', name: 'the city' },
  { id: 'district', surface: 'city', name: 'the district' },
  { id: 'neighbourhood', surface: 'city', name: 'the neighbourhood' },
]);

export interface LadderOptions {
  /** The city has a district level (its local governments are drawn as plates). */
  districts: boolean
  /** The city draws the houses of an estate, so there is a neighbourhood to come close to. */
  neighbourhood: boolean
}
/** The rungs a city has. The world, continent and country always exist; the city's own depth depends on its data. */
export function rungsFor({ districts, neighbourhood }: LadderOptions): Rung[] {
  return RUNGS.filter((rung) => rung.id !== 'district' || districts).filter((rung) => rung.id !== 'neighbourhood' || (districts && neighbourhood));
}
/** The rung beyond an edge of `id` ('out' is wider, 'in' is closer), or null where the ladder ends. */
export function stepOf(rungs: readonly Rung[], id: RungId, edge: Edge): Rung | null {
  const at = rungs.findIndex((rung) => rung.id === id);
  if (at < 0) return null;
  return rungs[edge === 'out' ? at - 1 : at + 1] ?? null;
}

// ---- inside the city map -------------------------------------------------------------------------------------------
export type CityBand = 'city' | 'district' | 'neighbourhood';
const BANDS: readonly CityBand[] = ['city', 'district', 'neighbourhood'];
/** The cuts between the bands, as camera distances widest first: wider than cuts[0] it reads as the city, closer than cuts[1] as the neighbourhood. The map chooses them from what it draws. */
/** The band a camera distance reads as, with the same hysteresis the atlas uses between its levels (no flicker at a cut). */
export function cityBand(distance: number, cuts: readonly number[], current: CityBand = 'city'): CityBand {
  return BANDS[levelAt(distance, cuts, BANDS.indexOf(current))]!;
}

// ---- pressure -------------------------------------------------------------------------------------------------------
/** Log-zoom pushed against a limit that takes a step: exp(0.55) is a 1.73x pinch or four notches of a wheel. */
export const PRESSURE_STEP = 0.55;
/** The pressure drains once a gesture has paused this long (ms), at DRAIN per second. */
export const PRESSURE_IDLE_MS = 260, PRESSURE_DRAIN = 1.6;
/** A hand-over that never reports back (it was lost) stops holding the pressure after this long (ms). */
export const HANDING_MS = 3000;
/** After a step nothing fires for this long (ms). */
export const COOLDOWN_MS = 900;
/** The hint chip shows from this share of the pressure, so it is there before the step is. */
export const HINT_FROM = 0.04;
export interface PressureState { edge: Edge | null; /** 0 to 1: how close the step is. */ amount: number; fired: boolean; /** Log-zoom pushed past the step, for the next map to carry on with. */ carry: number }
export interface Pressure {
  /** Zoom the camera could not take: `overflow` is the log of the factor it was refused (positive), `edge` which end it was. */
  push(edge: Edge, overflow: number, now: number): PressureState
  /** Zoom the camera took (it moved off its limit): the pressure is gone. */
  relax(): void
  /** A button or key at the limit: the whole step at once. */
  step(edge: Edge, now: number): PressureState
  /** Where the pressure stands at this time (it drains while nothing is pushed). */
  read(now: number): PressureState
  /** The hand-over is over: the cool-down starts from here. */
  settled(now: number): void
}
export function createPressure({ step = PRESSURE_STEP, coolDown = COOLDOWN_MS }: { step?: number; coolDown?: number } = {}): Pressure {
  let edge: Edge | null = null, level = 0, last = -Infinity, until = -Infinity, handing = false, handed = -Infinity;
  const state = (): PressureState => ({ edge, amount: Math.min(1, level / step), fired: false, carry: 0 });
  const drain = (now: number): void => {
    if (!level || now - last <= PRESSURE_IDLE_MS) return;
    level = Math.max(0, level - ((now - last - PRESSURE_IDLE_MS) / 1000) * PRESSURE_DRAIN * step); last = now;
    if (!level) edge = null;
  };
  return {
    push(next, overflow, now) {
      if (handing && now - handed > HANDING_MS) handing = false;
      if (handing || now < until || !(overflow > 0)) return state();
      drain(now);
      if (edge !== next) { edge = next; level = 0; }
      level += overflow; last = now;
      if (level < step) return state();
      const carry = level - step;
      handing = true; handed = now; level = 0;
      return { edge: next, amount: 1, fired: true, carry };
    },
    relax() { level = 0; edge = null; },
    step(next, now) {
      if (handing && now - handed > HANDING_MS) handing = false;
      if (handing || now < until) return state();
      edge = next; level = 0; handing = true; handed = now;
      return { edge: next, amount: 1, fired: true, carry: 0 };
    },
    read(now) { drain(now); return state(); },
    settled(now) { handing = false; level = 0; edge = null; until = now + coolDown; },
  };
}

// ---- the hand-over --------------------------------------------------------------------------------------------------
export type HandoffPhase = 'idle' | 'loading' | 'running';
export interface HandoffOptions {
  /** Milliseconds of the fade; a player who asked for less motion gets REDUCED_MS and no camera flight. */
  duration?: number
  reduced?: boolean
}
export const HANDOFF_MS = 420, REDUCED_MS = 160;
export interface HandoffView { phase: HandoffPhase; from: Rung | null; to: Rung | null; edge: Edge | null; /** 0 to 1 */ progress: number; /** The camera may fly during the fade. */ fly: boolean; reversed: boolean }
export interface Handoff {
  readonly view: HandoffView
  /** Start. `ready` says the next map's data is here; if not the phase is 'loading' until `arrived()`. */
  begin(from: Rung, to: Rung, edge: Edge, ready: boolean, now: number): void
  /** The next map's data has arrived. */
  arrived(now: number): void
  /** The player turned back: while loading it is cancelled (nothing was shown); while fading it runs backwards from where it is. Returns what happened. */
  reverse(now: number): 'cancelled' | 'reversed' | 'none'
  /** Move to this time. Returns true while still going; false once idle or just finished (read `finished`). */
  tick(now: number): boolean
  /** True for one `tick` after the fade reached its end: the host releases what was left behind. */
  readonly finished: boolean
  /** True when the fade ended on the map it started from (it had been reversed). */
  readonly returned: boolean
}
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));
const smooth = (value: number): number => { const x = clamp01(value); return x * x * (3 - 2 * x); };
export function createHandoff({ duration = HANDOFF_MS, reduced = false }: HandoffOptions = {}): Handoff {
  const length = reduced ? REDUCED_MS : duration;
  const view: HandoffView = { phase: 'idle', from: null, to: null, edge: null, progress: 0, fly: !reduced, reversed: false };
  let started = 0, direction = 1, base = 0, finished = false, returned = false;
  const api: Handoff = {
    view,
    get finished() { return finished; },
    get returned() { return returned; },
    begin(from, to, edge, ready, now) {
      finished = false; returned = false;
      Object.assign(view, { phase: ready ? 'running' : 'loading', from, to, edge, progress: 0, reversed: false });
      direction = 1; base = 0; started = now;
    },
    arrived(now) { if (view.phase === 'loading') { view.phase = 'running'; started = now; base = 0; } },
    reverse(now) {
      if (view.phase === 'loading') { Object.assign(view, { phase: 'idle', from: null, to: null, edge: null, progress: 0 }); return 'cancelled'; }
      if (view.phase !== 'running') return 'none';
      base = view.progress; started = now; direction = -direction; view.reversed = direction < 0;
      return 'reversed';
    },
    tick(now) {
      finished = false;
      if (view.phase !== 'running') return view.phase === 'loading';
      view.progress = clamp01(base + (direction * (now - started)) / length);
      if (direction > 0 ? view.progress >= 1 : view.progress <= 0) {
        returned = direction < 0; finished = true;
        view.phase = 'idle';
        return false;
      }
      return true;
    },
  };
  return api;
}
/** The opacity of the map being left and of the map being entered at `progress`: the one entered rises at once, the one left stays until the other is mostly there, so no frame is empty. */
export function crossfade(progress: number): { leaving: number; entering: number } {
  return { entering: smooth(progress), leaving: progress < 0.5 ? 1 : 1 - smooth((progress - 0.5) / 0.5) };
}

/**
 * Where the next map's camera starts, so that the player's gesture carries on instead of starting again from a default: going OUT it
 * starts a little inside the wide end of its range (as if the pinch were still opening), going IN a little outside the close end.
 * `range` is the next map's own camera range (distance), `carry` the log-zoom left over from the step.
 */
export function entryDistance(edge: Edge, range: { near: number; far: number }, carry = 0): number {
  const span = Math.log(range.far / range.near);
  // Start a fifth of the range from the end it is entered at, less what the gesture already carried.
  const inside = Math.max(0.04, 0.2 - Math.min(0.15, carry * 0.25)) * span;
  return edge === 'out' ? range.near * Math.exp(inside) : range.far * Math.exp(-inside);
}

/**
 * The words of the chip near a limit. `beyond` names what is past it (null at the end of the ladder), `name` the map you are at the end of,
 * and `look` says what is beyond can only be looked at (another city: an overview, never a move).
 */
export function limitHint(edge: Edge, beyond: string | null, name = '', look = false): string {
  if (beyond) return edge === 'out' ? `Keep zooming to see ${beyond}` : look ? `Zoom in for an overview of ${beyond}` : `Zoom in to enter ${beyond}`;
  return edge === 'out' ? `This is ${name || 'the whole map'}` : `This is as close as ${name || 'this place'} gets for now`;
}

/** What a map tells whoever runs the ladder. Every call is optional work for the map: it never waits for an answer. */
export interface LadderPort {
  /** Every zoom input, whether the camera took it or not: which way the player is going and by how much (log of the zoom factor; a hand-over that is loading or fading turns back once the player has gone the opposite way a notch or so). */
  intent(direction: Edge, amount?: number): void
  /** A zoom the camera could not take: the log of the refused factor, and the screen point (NDC) it was about, if there was one. */
  refused(edge: Edge, overflow: number, at: readonly [number, number] | null): void
  /** A button or a key pressed with the camera already at the limit: the whole step. */
  stepped(edge: Edge, at: readonly [number, number] | null): void
  /** Where the camera stands after zoom input: within reach of a limit (so the chip can say what is beyond), or clear of both. */
  near(edge: Edge | null): void
  /** A new level or band is showing: said politely to a screen reader. */
  level(text: string): void
}
export const NO_PORT: LadderPort = Object.freeze({ intent() {}, refused() {}, stepped() {}, near() {}, level() {} });
