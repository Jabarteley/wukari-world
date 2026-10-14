/**
 * OWNER: scenes
 * Street life, a richer crowd (zoom phase 3b). Pure: no Three.js, no DOM. The far crowd of ./plan.ts (lanes, pace, stride, the fade at a
 * lane's ends) gains, per person and all from the seed:
 *   - BODY: height (plan.ts HEIGHT) and a width, an outfit from one of OUTFITS (office, casual, print, sport, smart, coat, summer), an
 *     open jacket or not, and a bag (shoulder bag, backpack, tote) drawn by the cut-out shader as per-instance attachments;
 *   - GAIT: their own pace and a slight bob at each step;
 *   - A SCHEDULE: a walker walks and, on a cycle of their own, stops a few seconds (on a lane by the shops, turned to the windows);
 *     a few stand in small groups, some looking at a phone; a few wait at a crossing and cross the road only while the lights stop
 *     the traffic (signalFor / driveSeconds: the cars on a road stop together, never on a crossing: clearShift).
 * Everything is a function of (seed, wall-clock seconds), so every device sees the same street without a word sent between them.
 */
import { makeRng } from '../../game/util.ts';
import { FADE_UNITS, HARD_CAP, PACE, planCrowd, walkerAt } from './plan.ts';
import type { Lane, Road, Vehicle, Walker, WalkerPose } from './plan.ts';

// ---- what they wear ----------------------------------------------------------------------------------------------------------------

/** A kind of outfit: the colours it picks from, how often it has a jacket, a skirt or dress, a bag, and which bags. */
export interface Outfit {
  name: string
  shirts: readonly string[]
  legs: readonly string[]
  jackets: readonly string[]
  jacket: number
  skirt: number
  bag: number
  bags: readonly Bag[]
}
/** 0 none, 1 a shoulder bag, 2 a backpack, 3 a tote or handbag in one hand. */
export type Bag = 0 | 1 | 2 | 3;
export const OUTFITS: readonly Outfit[] = Object.freeze([
  { name: 'office', shirts: ['#f2f0ea', '#cfd8e3', '#e8e0cc', '#dfe7ef'], legs: ['#1f2630', '#2b2f3a', '#3f4f6b'], jackets: ['#1f2630', '#2c3f66', '#3a3d42'], jacket: 0.75, skirt: 0.25, bag: 0.6, bags: [1, 3] },
  { name: 'casual', shirts: ['#c0562f', '#2f6f8f', '#5a8f4e', '#b8c2c9', '#e07a2e', '#f2f0ea'], legs: ['#2c3f66', '#3d4a5c', '#4a5a78', '#1f2a2a'], jackets: ['#5b4a3a', '#6b6f78', '#2c3f66'], jacket: 0.2, skirt: 0.15, bag: 0.4, bags: [1, 2] },
  { name: 'print', shirts: ['#d9a441', '#a33a4a', '#2e8a7a', '#7b4b94', '#e07a2e', '#2f6f8f'], legs: ['#d9a441', '#a33a4a', '#2e8a7a', '#3b2a4a'], jackets: [], jacket: 0, skirt: 0.55, bag: 0.35, bags: [3, 1] },
  { name: 'sport', shirts: ['#e8e8e8', '#1f2630', '#d93b3b', '#2e6fd9', '#f2c12e'], legs: ['#1f2630', '#3a3d42', '#6b6f78'], jackets: ['#2e6fd9', '#1f2630', '#d93b3b'], jacket: 0.35, skirt: 0.05, bag: 0.55, bags: [2] },
  { name: 'smart', shirts: ['#e8e0cc', '#d97b9b', '#b8c2c9', '#f2f0ea', '#a9c6a0'], legs: ['#d9cfb8', '#5b4a3a', '#6b6f78', '#2b2f3a'], jackets: ['#8a6a4a', '#4a2f3f', '#3f4f6b'], jacket: 0.45, skirt: 0.35, bag: 0.55, bags: [3, 1] },
  { name: 'coat', shirts: ['#3a3d42', '#5b4a3a', '#6b2f2f', '#2b3a4a'], legs: ['#1f2630', '#2b2f3a', '#3d4a5c'], jackets: ['#8a6a4a', '#2b2f3a', '#6b6f78', '#7a2f2f', '#c9b38a'], jacket: 0.95, skirt: 0.2, bag: 0.5, bags: [1, 2, 3] },
  { name: 'summer', shirts: ['#f2f0ea', '#f2d24a', '#7fc8d9', '#f29a8a', '#9ad98a'], legs: ['#d9cfb8', '#7fa0c0', '#f2f0ea', '#c9b38a'], jackets: [], jacket: 0, skirt: 0.4, bag: 0.3, bags: [3, 1] },
] satisfies Outfit[]);
/** The bags' leathers and canvases (the shader's palette, indexed by Person.bagTone). */
export const BAG_TONES = ['#5b3a24', '#1d1f22', '#a8754a', '#7a2f3a'] as const;
/** How wide a body is against its height (1 is the plan's half-height quad). */
export const WIDTH: readonly [number, number] = [0.86, 1.22];
/** How far a body rises and falls each step, as a share of its height. */
export const BOB: readonly [number, number] = [0.006, 0.022];

// ---- what they do ------------------------------------------------------------------------------------------------------------------

/** walk: along a lane, now and then stopping; browse: the same by the shops, stopping more and turned to them; group: standing with
 * two or three others; cross: waiting at a crossing and crossing on the lights. */
export type Habit = 'walk' | 'browse' | 'group' | 'cross';
/** 0 walking, 1 standing, 2 standing and looking at a phone. */
export type Mode = 0 | 1 | 2;

export interface Person extends Walker {
  width: number
  outfit: number
  jacket: string | null
  bag: Bag
  bagTone: number
  bob: number
  habit: Habit
  /** The stop cycle (seconds), the seconds stopped in each, and where in the cycle the person was at time zero. */
  cycle: number
  pause: number
  shift: number
  /** Looks at a phone when standing. */
  phone: boolean
  /** A group stander's place and facing. */
  spot: { x: number; z: number; ry: number } | null
  /** A crosser's wait after the lights change (seconds). */
  delay: number
  /** A browser on a lane with shop windows (zoom phase 5b): the windows (along the lane) they stop at, each for `pause` seconds. */
  windows?: readonly number[]
}
type Dress = Pick<Person, 'outfit' | 'shirt' | 'legs' | 'skirt' | 'jacket' | 'bag' | 'bagTone' | 'width' | 'bob'>;
export interface PersonPose extends WalkerPose { mode: Mode; lift: number }

// ---- the lights --------------------------------------------------------------------------------------------------------------------

/** A crossing's lights: traffic moves for period − walk seconds, then stops for walk seconds while people cross. */
export interface Signal { period: number; walk: number; offset: number }
/** The seconds the traffic stops for people to cross, and the least it moves between. */
export const WALK_SECONDS = 9, MIN_GREEN = 20;
const laneLength = (lane: { ax: number; az: number; bx: number; bz: number }): number => Math.hypot(lane.bx - lane.ax, lane.bz - lane.az);
const wrap = (value: number, length: number): number => ((value % length) + length) % length;

/**
 * The lights for a road: the green lasts a whole number of laps of the road (at its speed), so the vehicles, which all move together,
 * stop at the same places every cycle. clearShift() then picks those places off every crossing.
 */
export function signalFor(road: Road, walk = WALK_SECONDS, offset = 0): Signal | null {
  const length = laneLength(road);
  if (!(length > 0) || !(road.speed > 0)) return null;
  const lap = length / road.speed, green = lap * Math.max(1, Math.ceil(MIN_GREEN / lap));
  return { period: green + walk, walk, offset };
}
/** Whether people may cross now. */
export const walkNow = (signal: Signal, seconds: number): boolean => wrap(seconds - signal.offset, signal.period) >= signal.period - signal.walk;
/** The seconds a road's traffic has moved by this time: the green phases only (continuous: they stop and go, never jump). */
export function driveSeconds(signal: Signal | null, seconds: number): number {
  if (!signal) return seconds;
  const green = signal.period - signal.walk, u = seconds - signal.offset, k = Math.floor(u / signal.period);
  return k * green + Math.min(u - k * signal.period, green);
}

/** Where along a road a crossing lies, and half its width. */
export interface Span { at: number; half: number }
export function crossingSpans(road: Road, crossings: readonly Lane[]): Span[] {
  const length = laneLength(road) || 1, ux = (road.bx - road.ax) / length, uz = (road.bz - road.az) / length;
  return crossings.map((c) => ({ at: ((c.ax + c.bx) / 2 - road.ax) * ux + ((c.az + c.bz) / 2 - road.az) * uz, half: c.width / 2 }));
}
/** The room a stopped vehicle keeps from a crossing's edge. */
export const CROSSING_MARGIN = 0.8;
/**
 * The shift along the road (added to every vehicle's offset) at which, when the lights stop the traffic, no vehicle stands on any
 * crossing. Null when there is none (then the road has no lights and nobody crosses).
 */
export function clearShift(vehicles: readonly Vehicle[], road: Road, spans: readonly Span[], step = 0.25): number | null {
  const length = laneLength(road);
  if (!(length > 0)) return null;
  const mine = vehicles.filter((v) => v.road === vehicles[0]?.road);
  const clear = (shift: number): boolean => mine.every((v) => spans.every((s) => {
    const d = Math.abs(wrap(v.offset + shift - s.at + length / 2, length) - length / 2);
    return d >= v.length / 2 + s.half + CROSSING_MARGIN;
  }));
  for (let shift = 0; shift < length; shift += step) if (clear(shift)) return shift;
  return null;
}

// ---- the plan ----------------------------------------------------------------------------------------------------------------------

/** The share of the crowd standing in groups, and the most who wait at one crossing. */
export const GROUP_SHARE = 0.1, CROSSERS = 5;

/**
 * Order a list so that any prefix of it is spread evenly over the whole (golden-ratio ranks): the adaptive caps draw the first n, so
 * fewer people thin every lane alike rather than emptying the last ones.
 */
export function spread<T>(items: readonly T[]): T[] {
  const golden = 0.6180339887498949;
  return items.map((item, i) => ({ item, rank: (i * golden) % 1, i })).sort((a, b) => a.rank - b.rank || a.i - b.i).map((entry) => entry.item);
}

export interface PeopleWorld {
  lanes: readonly Lane[]
  /** Crossings: lanes from one kerb to the other (a → b), people cross them on the lights. */
  crossings?: readonly Lane[]
  signal?: Signal | null
}

/** A crowd of `count`: walkers on the lanes, a share in groups, a few at each crossing (only with lights); spread() ordered. */
export function planPeople(seed: string, world: PeopleWorld, count: number): Person[] {
  const n = Math.max(0, Math.min(HARD_CAP.crowd, Math.floor(count)));
  const { lanes } = world, crossings = world.signal ? world.crossings ?? [] : [];
  if (!n || !lanes.length) return [];
  const next = makeRng(`street-life|people|${seed}`);
  const between = (low: number, high: number): number => low + next() * (high - low);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length) % list.length] as T;
  const crossers = Math.min(Math.floor(n * 0.15), crossings.length * CROSSERS);
  const roomy = lanes.map((lane, i) => [laneLength(lane), i] as const).filter(([length]) => length > 2 * FADE_UNITS + 6);
  const grouped = roomy.length ? Math.floor(n * GROUP_SHARE) : 0;
  const walkers = planCrowd(seed, lanes, n - crossers - grouped);

  const dress = (): Dress => {
    const outfit = Math.floor(next() * OUTFITS.length) % OUTFITS.length, kind = OUTFITS[outfit]!;
    const bag: Bag = next() < kind.bag ? pick(kind.bags) : 0;
    return {
      outfit, shirt: pick(kind.shirts), legs: pick(kind.legs), skirt: next() < kind.skirt,
      jacket: kind.jackets.length && next() < kind.jacket ? pick(kind.jackets) : null,
      bag, bagTone: Math.floor(next() * BAG_TONES.length) % BAG_TONES.length,
      width: between(WIDTH[0], WIDTH[1]), bob: between(BOB[0], BOB[1]),
    };
  };
  const out: Person[] = [];
  for (const walker of walkers) {
    const browse = lanes[walker.lane]!.browse !== undefined && next() < 0.4;
    const stops = browse || next() < 0.3;
    const person: Person = {
      ...walker, ...dress(), habit: browse ? 'browse' : 'walk',
      cycle: stops ? between(browse ? 18 : 28, browse ? 34 : 60) : 0, pause: stops ? between(browse ? 4 : 2, browse ? 9 : 5) : 0, shift: next() * 60,
      phone: next() < 0.3, spot: null, delay: 0,
    };
    // By shop windows a browser picks a few of them to stop at (never one where people fade at the lane's ends).
    const shown = browse ? windowsOf(lanes[walker.lane]!) : [];
    if (shown.length) {
      const picked = shown.filter(() => next() < 0.45);
      person.windows = picked.length ? picked : [shown[Math.floor(next() * shown.length) % shown.length]!];
    }
    out.push(person);
  }
  // Groups of two or three, standing a little off a roomy lane's line, turned to each other.
  for (let made = 0; made < grouped;) {
    const [length, lane] = pick(roomy), l = lanes[lane]!, size = Math.min(grouped - made, next() < 0.5 ? 2 : 3);
    const along = between(FADE_UNITS + 3, length - FADE_UNITS - 3), side = (next() < 0.5 ? -1 : 1) * l.width * 0.3;
    const ux = (l.bx - l.ax) / length, uz = (l.bz - l.az) / length;
    const cx = l.ax + ux * along + uz * side, cz = l.az + uz * along - ux * side;
    const turn = next() * Math.PI * 2;
    for (let k = 0; k < size; k++) {
      const a = turn + (k / size) * Math.PI * 2, x = cx + Math.sin(a) * 0.42, z = cz + Math.cos(a) * 0.42;
      const base = planCrowd(`${seed}|group|${made}`, [l], 1)[0]!;
      out.push({ ...base, ...dress(), lane, speed: 0, habit: 'group', cycle: between(20, 40), pause: 0, shift: next() * 40, phone: next() < 0.55,
        spot: { x, z, ry: Math.atan2(cx - x, cz - z) }, delay: 0 });
      made += 1;
    }
  }
  // At each crossing: they cross only while the lights stop the traffic, each after a little wait, and finish inside it.
  for (let k = 0; k < crossers; k++) {
    const lane = k % crossings.length, c = crossings[lane]!, length = laneLength(c), walk = world.signal!.walk * 0.92;
    const base = planCrowd(`${seed}|cross|${k}`, [c], 1)[0]!;
    const speed = Math.max(PACE[0] + next() * (PACE[1] - PACE[0]), length / walk);
    out.push({ ...base, ...dress(), lane, speed, across: (next() * 2 - 1) * c.width * 0.38, habit: 'cross', cycle: 0, pause: 0, shift: 0,
      phone: next() < 0.35, spot: null, delay: next() * Math.max(0, walk - length / speed) });
  }
  return spread(out);
}

/** A lane's shop windows a browser may stop at: along it, clear of the fade at both ends. */
export function windowsOf(lane: Lane): number[] {
  const length = laneLength(lane);
  return (lane.windows ?? []).filter((at) => at > FADE_UNITS + 1 && at < length - FADE_UNITS - 1);
}

/**
 * A browser by the shop windows (zoom phase 5b): they walk the lane and stop at each of their windows for `pause` seconds, turned to it,
 * lap after lap. `walked`: the seconds of walking done (plan.ts walkerAt places them from it); `stopped`: standing at a window now.
 */
export function browseAt(person: Pick<Person, 'speed' | 'offset' | 'dir' | 'pause' | 'shift' | 'windows'>, lane: Lane, seconds: number): { walked: number; stopped: boolean } {
  const length = laneLength(lane) || 1, speed = person.speed > 0 ? person.speed : 1, pause = Math.max(0, person.pause);
  const t = Number.isFinite(seconds) ? seconds : 0, windows = person.windows ?? [];
  if (!windows.length || !(pause > 0)) return { walked: t, stopped: false };
  // In the walking direction's own coordinate (0 where they start), the windows in the order they come to them.
  const start = person.dir === 1 ? wrap(person.offset, length) : length - wrap(person.offset, length);
  const stops = windows.map((at) => wrap((person.dir === 1 ? at : length - at) - start, length)).sort((a, b) => a - b);
  const lap = length / speed + stops.length * pause, q = t + person.shift, k = Math.floor(q / lap);
  let left = q - k * lap, done = 0;
  for (const stop of stops) {
    const walk = (stop - done) / speed;
    if (left <= walk) return { walked: (k * length + done + left * speed) / speed, stopped: false };
    left -= walk; done = stop;
    if (left <= pause) return { walked: (k * length + done) / speed, stopped: true };
    left -= pause;
  }
  return { walked: (k * length + Math.min(length, done + left * speed)) / speed, stopped: false };
}

/** The seconds a person has walked by this time: their stops taken out (continuous, so they never jump). */
export function walkedSeconds(person: Pick<Person, 'cycle' | 'pause' | 'shift'>, seconds: number): number {
  const { cycle, pause, shift } = person;
  if (!(pause > 0) || !(cycle > pause)) return seconds;
  const u = seconds + shift, walk = cycle - pause, k = Math.floor(u / cycle);
  return k * walk + Math.min(u - k * cycle, walk) - shift;
}
/** Is a walker stopped at this time? */
export const stoppedAt = (person: Pick<Person, 'cycle' | 'pause' | 'shift'>, seconds: number): boolean =>
  person.pause > 0 && person.cycle > person.pause && wrap(seconds + person.shift, person.cycle) >= person.cycle - person.pause;

/** A phone-looker in a group looks up now and then (one part of their cycle in three). */
const looking = (person: Person, seconds: number): boolean => person.phone && Math.floor((seconds + person.shift) / Math.max(1, person.cycle / 3)) % 3 !== 0;

/** Where a person is at `seconds`, which way they face, how far through a stride, how much shows, what they are doing, and their bob. */
export function personAt(person: Person, world: PeopleWorld, seconds: number): PersonPose {
  const t = Number.isFinite(seconds) ? seconds : 0;
  if (person.habit === 'group' && person.spot) {
    return { x: person.spot.x, z: person.spot.z, ry: person.spot.ry, phase: 0, fade: 1, mode: looking(person, t) ? 2 : 1, lift: 0 };
  }
  if (person.habit === 'cross') {
    const c = world.crossings?.[person.lane], signal = world.signal;
    if (!c || !signal) return { x: 0, z: 0, ry: 0, phase: 0, fade: 0, mode: 1, lift: 0 };
    const length = laneLength(c) || 1, ux = (c.bx - c.ax) / length, uz = (c.bz - c.az) / length;
    const u = t - signal.offset, k = Math.floor(u / signal.period), tau = u - k * signal.period;
    const forward = k % 2 === 0, green = signal.period - signal.walk;
    const s = Math.max(0, Math.min(1, (tau - green - person.delay) / (length / person.speed)));
    const along = forward ? s * length : (1 - s) * length, dir = forward ? 1 : -1;
    const moving = s > 0 && s < 1, travelled = s * length;
    return {
      x: c.ax + ux * along + uz * person.across, z: c.az + uz * along - ux * person.across,
      // Waiting, they face the far kerb; arrived, they face the way they came from (the next crossing's way).
      ry: Math.atan2(ux * (s >= 1 ? -dir : dir), uz * (s >= 1 ? -dir : dir)),
      phase: moving ? wrap(travelled / person.stride, 1) : 0, fade: 1, mode: moving ? 0 : person.phone ? 2 : 1,
      lift: moving ? person.bob * person.height * Math.abs(Math.sin(2 * Math.PI * wrap(travelled / person.stride, 1))) : 0,
    };
  }
  const lane = world.lanes[person.lane]!;
  if (person.habit === 'browse' && person.windows?.length) {
    const at = browseAt(person, lane, t), pose = walkerAt(person, lane, at.walked);
    if (at.stopped) return { ...pose, ry: lane.browse ?? pose.ry, phase: 0, mode: person.phone ? 2 : 1, lift: 0 };
    return { ...pose, mode: 0, lift: person.bob * person.height * Math.abs(Math.sin(2 * Math.PI * pose.phase)) };
  }
  const pose = walkerAt(person, lane, walkedSeconds(person, t));
  if (stoppedAt(person, t)) {
    return { ...pose, ry: person.habit === 'browse' && lane.browse !== undefined ? lane.browse : pose.ry, phase: 0, mode: person.phone ? 2 : 1, lift: 0 };
  }
  return { ...pose, mode: 0, lift: person.bob * person.height * Math.abs(Math.sin(2 * Math.PI * pose.phase)) };
}
