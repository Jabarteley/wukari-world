/**
 * OWNER: scenes
 * Street life: two-way traffic (zoom phase 5b). Pure: no Three.js, no DOM.
 *
 *   SIDE      which side of the road a country drives on (LEFT_HAND, from the city's country id), and a carriageway split into two
 *             lanes, one each way, each on its country's side of the centre line (twoWayRoads);
 *   FLAVOUR   what a country's traffic is made of besides taxis, cars, buses and trucks: a share of the cars become okadas (motorbike
 *             taxis: okada, boda-boda, ojek, xe ôm) or bicycles (FLAVOURS). They keep the car's paint and are shorter, so nothing touches;
 *   SCHEDULE  every vehicle on a road follows one path in time (a PROFILE: cruising, slowing to SLOW_SHARE of its speed near each
 *             crossing), shifted by its own start, so no vehicle ever closes on the one ahead. With crossings the road gets lights
 *             (crowd.ts signalFor: green for whole laps, then WALK_SECONDS for people to cross). When the lights change, a vehicle near a
 *             crossing rolls on to its place in the queue at the stop line, waits, and leaves a little after the one ahead (the queue's
 *             release); one farther off waits where it is. Its place on the road is a pure function of (plan, wall-clock seconds).
 *
 * Nothing here is drawn: draw.ts asks vehiclePose() for every vehicle each frame.
 */
import { makeRng } from '../../game/util.ts';
import { CAR_LENGTH, VEHICLE_KINDS } from './plan.ts';
import type { Lane, Road, Vehicle, VehicleKind, VehiclePose } from './plan.ts';
import { CROSSING_MARGIN, WALK_SECONDS, crossingSpans, signalFor } from './crowd.ts';
import type { Signal, Span } from './crowd.ts';
import { countryKey } from './livery.ts';

// ---- which side --------------------------------------------------------------------------------------------------------------------

export type DrivingSide = 'left' | 'right';
/**
 * Countries and territories that drive on the left (ISO 3166 two letters, lower case). Everyone else drives on the right. Nigeria and
 * Ghana are NOT here: both changed to the right in 1972 and 1974; Samoa changed to the left in 2009.
 */
export const LEFT_HAND: ReadonlySet<string> = new Set([
  // Europe and the Atlantic
  'gb', 'ie', 'mt', 'cy', 'im', 'je', 'gg', 'fk', 'sh',
  // Africa
  'ke', 'ug', 'tz', 'za', 'zm', 'zw', 'mw', 'mz', 'bw', 'na', 'ls', 'sz', 'mu', 'sc',
  // Asia
  'in', 'pk', 'bd', 'lk', 'np', 'bt', 'mv', 'jp', 'th', 'my', 'sg', 'bn', 'id', 'tl', 'hk', 'mo',
  // Oceania
  'au', 'nz', 'fj', 'pg', 'sb', 'to', 'ws', 'ki', 'tv', 'nr', 'ck', 'nu', 'tk', 'nf', 'pn', 'cx', 'cc',
  // The Americas and the Caribbean
  'jm', 'tt', 'bb', 'bs', 'gy', 'sr', 'ag', 'dm', 'gd', 'kn', 'lc', 'vc', 'ai', 'bm', 'ky', 'ms', 'tc', 'vg', 'vi',
]);
export const drivingSide = (country: string | null | undefined): DrivingSide => (LEFT_HAND.has(countryKey(country)) ? 'left' : 'right');

/** A carriageway's centre line, from a to b. */
export interface Axis { ax: number; az: number; bx: number; bz: number }

/**
 * Two lanes, one each way, `offset` either side of the centre line: road 0 runs a → b, road 1 b → a, each keeping to the country's side
 * of the road (seen from above with y up, the right of a heading (ux, uz) is (−uz, ux)). Both have the same length and speed, so one set of
 * lights serves both.
 */
export function twoWayRoads(axis: Axis, side: DrivingSide, offset: number, speed: number): Road[] {
  const length = Math.hypot(axis.bx - axis.ax, axis.bz - axis.az) || 1;
  const ux = (axis.bx - axis.ax) / length, uz = (axis.bz - axis.az) / length, s = side === 'right' ? offset : -offset;
  const rx = -uz * s, rz = ux * s;
  return [
    { ax: axis.ax + rx, az: axis.az + rz, bx: axis.bx + rx, bz: axis.bz + rz, speed },
    { ax: axis.bx - rx, az: axis.bz - rz, bx: axis.ax - rx, bz: axis.az - rz, speed },
  ];
}

/** Which side of the centre line a road keeps to, seen in its own direction of travel. */
export function sideOf(road: Road, axis: Axis): DrivingSide {
  const length = Math.hypot(road.bx - road.ax, road.bz - road.az) || 1, ux = (road.bx - road.ax) / length, uz = (road.bz - road.az) / length;
  const mx = (road.ax + road.bx) / 2 - (axis.ax + axis.bx) / 2, mz = (road.az + road.bz) / 2 - (axis.az + axis.bz) / 2;
  return mx * -uz + mz * ux >= 0 ? 'right' : 'left';
}

// ---- what drives -------------------------------------------------------------------------------------------------------------------

/** The share of the cars that are motorbikes (okadas and the like) and bicycles. */
export interface Flavour { moto: number; bike: number }
export const DEFAULT_FLAVOUR: Flavour = Object.freeze({ moto: 0, bike: 0 });
export const FLAVOURS: Readonly<Record<string, Flavour>> = Object.freeze({
  // West and central Africa: okadas, zemidjans, bendskins.
  ng: { moto: 0.35, bike: 0.02 }, gh: { moto: 0.15, bike: 0.03 }, bj: { moto: 0.5, bike: 0.02 }, tg: { moto: 0.45, bike: 0.02 },
  bf: { moto: 0.45, bike: 0.08 }, ml: { moto: 0.35, bike: 0.05 }, ne: { moto: 0.3, bike: 0.04 }, cm: { moto: 0.35, bike: 0.02 },
  cd: { moto: 0.3, bike: 0.02 }, sl: { moto: 0.35, bike: 0.02 }, lr: { moto: 0.3, bike: 0.02 }, gn: { moto: 0.3, bike: 0.02 },
  ci: { moto: 0.15, bike: 0.02 }, sn: { moto: 0.12, bike: 0.03 },
  // East Africa: boda-bodas.
  ke: { moto: 0.3, bike: 0.04 }, ug: { moto: 0.4, bike: 0.05 }, tz: { moto: 0.3, bike: 0.05 }, rw: { moto: 0.35, bike: 0.05 },
  et: { moto: 0.08, bike: 0.03 }, mw: { moto: 0.2, bike: 0.12 },
  // South and south-east Asia: motorbikes everywhere.
  in: { moto: 0.35, bike: 0.05 }, pk: { moto: 0.35, bike: 0.04 }, bd: { moto: 0.2, bike: 0.12 }, lk: { moto: 0.3, bike: 0.04 },
  np: { moto: 0.4, bike: 0.04 }, id: { moto: 0.5, bike: 0.02 }, vn: { moto: 0.7, bike: 0.05 }, th: { moto: 0.4, bike: 0.03 },
  ph: { moto: 0.3, bike: 0.02 }, my: { moto: 0.3, bike: 0.02 }, kh: { moto: 0.55, bike: 0.04 }, la: { moto: 0.5, bike: 0.04 },
  mm: { moto: 0.4, bike: 0.06 }, tw: { moto: 0.45, bike: 0.04 }, cn: { moto: 0.25, bike: 0.15 }, tl: { moto: 0.3, bike: 0.03 },
  // Europe and East Asia: bicycles.
  nl: { moto: 0.03, bike: 0.45 }, dk: { moto: 0.02, bike: 0.35 }, de: { moto: 0.04, bike: 0.12 }, be: { moto: 0.04, bike: 0.12 },
  se: { moto: 0.03, bike: 0.1 }, fi: { moto: 0.03, bike: 0.08 }, fr: { moto: 0.08, bike: 0.08 }, it: { moto: 0.15, bike: 0.05 },
  es: { moto: 0.1, bike: 0.05 }, gr: { moto: 0.15, bike: 0.02 }, jp: { moto: 0.06, bike: 0.12 }, kr: { moto: 0.08, bike: 0.04 },
  gb: { moto: 0.03, bike: 0.06 }, at: { moto: 0.04, bike: 0.08 }, ch: { moto: 0.05, bike: 0.07 },
  // The Americas.
  co: { moto: 0.3, bike: 0.03 }, br: { moto: 0.15, bike: 0.03 }, mx: { moto: 0.08, bike: 0.02 }, pe: { moto: 0.15, bike: 0.02 },
  ht: { moto: 0.35, bike: 0.02 },
});
export const flavourFor = (country: string | null | undefined): Flavour => FLAVOURS[countryKey(country)] ?? DEFAULT_FLAVOUR;

/**
 * The traffic in its country's flavour: a share of the cars (never a taxi, a bus, a truck or a keke) become motorbikes or bicycles. They
 * keep their paint and trim, and are shorter than the car they replace, so no two vehicles can touch.
 */
export function flavourTraffic<T extends Vehicle>(vehicles: readonly T[], country: string | null | undefined, seed: string): T[] {
  const flavour = flavourFor(country), next = makeRng(`street-life|flavour|${seed}|${countryKey(country)}`);
  return vehicles.map((vehicle) => {
    const roll = next();
    if (vehicle.kind !== 'car') return vehicle;
    const kind: VehicleKind | null = roll < flavour.moto ? 'okada' : roll < flavour.moto + flavour.bike ? 'bike' : null;
    return kind ? { ...vehicle, kind, length: CAR_LENGTH * VEHICLE_KINDS[kind].length } : vehicle;
  });
}

// ---- the path in time --------------------------------------------------------------------------------------------------------------

/** Near a crossing traffic slows to this share of its speed, from SLOW_BEFORE before the crossing to SLOW_AFTER past it. */
export const SLOW_SHARE = 0.65, SLOW_BEFORE = 7, SLOW_AFTER = 1.5;
/** A stretch of a road (along it, from its a) driven slowly. */
export interface Zone { from: number; to: number }
/** One road's path in time: its length, cruising speed, slow zones and the seconds a lap takes. */
export interface Profile { length: number; speed: number; slow: number; zones: readonly Zone[]; lap: number }

const roadLength = (road: { ax: number; az: number; bx: number; bz: number }): number => Math.hypot(road.bx - road.ax, road.bz - road.az);
const wrap = (value: number, length: number): number => ((value % length) + length) % length;

export function profileFor(road: Road, spans: readonly Span[], slow = SLOW_SHARE): Profile {
  const length = roadLength(road), speed = road.speed > 0 ? road.speed : 1;
  // A zone that runs over either end of the road goes on at the other (the road is a loop), so both ways of a street slow for as long.
  const raw = spans.flatMap((s) => {
    const from = s.at - s.half - SLOW_BEFORE, to = s.at + s.half + SLOW_AFTER;
    if (from < 0) return [{ from: 0, to: Math.min(length, to) }, { from: Math.max(0, length + from), to: length }];
    if (to > length) return [{ from, to: length }, { from: 0, to: Math.min(length, to - length) }];
    return [{ from, to }];
  }).filter((z) => z.to > z.from).sort((a, b) => a.from - b.from);
  const zones: Zone[] = [];
  for (const zone of raw) {
    const last = zones[zones.length - 1];
    if (last && zone.from <= last.to) last.to = Math.max(last.to, zone.to); else zones.push({ ...zone });
  }
  const profile = { length, speed, slow, zones, lap: 0 };
  profile.lap = freeTime(profile, length);
  return profile;
}

/** The seconds a vehicle takes from the road's start to `along` (0 … length), slowing through the zones. */
export function freeTime(profile: Omit<Profile, 'lap'>, along: number): number {
  const s = Math.max(0, Math.min(profile.length, along));
  let slowed = 0;
  for (const zone of profile.zones) slowed += Math.max(0, Math.min(s, zone.to) - zone.from);
  return (s - slowed) / profile.speed + slowed / (profile.speed * profile.slow);
}

/** Where along the road a vehicle is after `tau` seconds from its start (any tau: laps wrap). */
export function freePlace(profile: Profile, tau: number): number {
  if (!(profile.lap > 0)) return 0;
  let left = wrap(Number.isFinite(tau) ? tau : 0, profile.lap), at = 0;
  const fast = profile.speed, slow = profile.speed * profile.slow;
  for (const zone of profile.zones) {
    const cruise = (zone.from - at) / fast;
    if (left <= cruise) return at + left * fast;
    left -= cruise; at = zone.from;
    const crawl = (zone.to - zone.from) / slow;
    if (left <= crawl) return at + left * slow;
    left -= crawl; at = zone.to;
  }
  return Math.min(profile.length, at + left * fast);
}

/** The seconds from `from` to `from + distance` along the road (forward, across its end if need be). */
function secondsAhead(profile: Profile, from: number, distance: number): number {
  const a = wrap(from, profile.length), b = a + Math.max(0, distance);
  if (b <= profile.length) return freeTime(profile, b) - freeTime(profile, a);
  const laps = Math.floor(b / profile.length), rest = b - laps * profile.length;
  return laps * profile.lap - freeTime(profile, a) + freeTime(profile, rest);
}

// ---- lights and queues -------------------------------------------------------------------------------------------------------------

/** The room a queued vehicle leaves to the one ahead, the most seconds it may roll on into the walk phase, and the search step. */
export const QUEUE_GAP = 1.1, ROLL_MAX = 0.8 * WALK_SECONDS;
const SHIFT_STEP = 0.05;

export interface RoadPlan {
  profile: Profile
  /** Seconds added to every vehicle's start on this road, chosen so that when the lights change no vehicle stands on a crossing. */
  shift: number
  spans: readonly Span[]
}
export interface TrafficPlan {
  /** One set of lights for every road (null: no crossings, or no way to keep them clear; nobody crosses then). */
  signal: Signal | null
  roads: readonly RoadPlan[]
  /** Per vehicle: its start along its road's path (seconds) and how long it rolls on when the lights change before it stops. */
  start: readonly number[]
  roll: readonly number[]
}

/** Does a vehicle centred at `along` (of `length`) stand on any crossing, with the margin a stopped vehicle keeps? */
function onCrossing(along: number, length: number, spans: readonly Span[], road: number): boolean {
  return spans.some((s) => Math.abs(wrap(along - s.at + road / 2, road) - road / 2) < length / 2 + s.half + CROSSING_MARGIN);
}

/**
 * The lights and queues for a street's roads. Every road with vehicles needs the same lap (two lanes of one carriageway have) and a shift
 * that keeps its vehicles off every crossing when the lights change; otherwise there are no lights and nobody crosses.
 */
export function planSchedule(vehicles: readonly Vehicle[], roads: readonly Road[], crossings: readonly Lane[], walk = WALK_SECONDS): TrafficPlan {
  const plans: RoadPlan[] = roads.map((road) => {
    const spans = crossings.length ? crossingSpans(road, crossings).filter((s) => s.at > 0 && s.at < roadLength(road)) : [];
    return { profile: profileFor(road, spans), shift: 0, spans };
  });
  const start = vehicles.map((v) => { const p = plans[v.road]?.profile; return p ? freeTime(p, wrap(v.offset, p.length)) : 0; });
  const roll = vehicles.map(() => 0);
  const used = [...new Set(vehicles.map((v) => v.road))].filter((r) => plans[r]);
  const laps = used.map((r) => plans[r]!.profile.lap);
  const lit = crossings.length > 0 && used.length > 0 && used.every((r) => plans[r]!.spans.length > 0) && laps.every((lap) => Math.abs(lap - laps[0]!) < 1e-6);
  let signal: Signal | null = null;
  if (lit) {
    const first = plans[used[0]!]!.profile;
    const lights = signalFor({ ax: 0, az: 0, bx: first.lap, bz: 0, speed: 1 }, walk);
    let clear = Boolean(lights);
    for (const r of used) {
      const plan = plans[r]!, p = plan.profile, mine = vehicles.map((v, i) => [v, i] as const).filter(([v]) => v.road === r);
      // Of the shifts that keep every stopped vehicle off the crossings, the one where the most of them roll on and queue at a stop line.
      let best: { shift: number; rolls: number[]; queued: number } | null = null;
      for (let shift = 0; shift < p.lap; shift += SHIFT_STEP) {
        // Clear when the lights change, while easing to a stop, and stopped (the ease is short: three looks cannot miss a crossing).
        if (!mine.every(([v, i]) => [0, SETTLE / 2, SETTLE].every((h) => !onCrossing(freePlace(p, start[i]! + shift + h), v.length, plan.spans, p.length)))) continue;
        const rolls = queue(vehicles, r, plan, start, shift, walk), queued = rolls.filter((value) => value > 0).length;
        if (!best || queued > best.queued) best = { shift, rolls, queued };
      }
      if (!best) { clear = false; break; }
      plan.shift = best.shift;
      best.rolls.forEach((value, i) => { if (vehicles[i]!.road === r) roll[i] = value; });
    }
    if (clear && lights) signal = lights;
    else roll.fill(0);
  }
  return { signal, roads: plans, start, roll };
}

/** When the lights change: each vehicle's place then, the stop line ahead of it, its place in that stop line's queue, and the seconds it rolls on to get there. */
function queue(vehicles: readonly Vehicle[], r: number, plan: RoadPlan, start: readonly number[], shift: number, walk: number): number[] {
  const { profile: p, spans } = plan, L = p.length, roll = vehicles.map(() => 0);
  const stops = spans.map((s) => s.at - s.half - CROSSING_MARGIN);
  const lines = new Map<number, { i: number; ahead: number; at: number }[]>();
  vehicles.forEach((v, i) => {
    if (v.road !== r) return;
    const at = freePlace(p, start[i]! + shift + SETTLE), front = at + v.length / 2;
    let best = -1, ahead = Infinity;
    stops.forEach((stop, k) => { const d = wrap(stop - front, L); if (d < ahead) { ahead = d; best = k; } });
    if (best < 0) return;
    const list = lines.get(best) ?? [];
    list.push({ i, ahead, at });
    lines.set(best, list);
  });
  const most = Math.min(ROLL_MAX, 0.8 * walk);
  for (const list of lines.values()) {
    list.sort((a, b) => a.ahead - b.ahead);
    let back = 0;
    for (const { i, ahead, at } of list) {
      const v = vehicles[i]!, distance = ahead - back;
      // Its place in the queue: not behind where it already is, not on any crossing, and reached within the walk phase.
      if (distance < 0 || onCrossing(at + distance, v.length, spans, L)) break;
      const seconds = secondsAhead(p, at, distance);
      if (seconds > most) break;
      roll[i] = seconds;
      back += v.length + QUEUE_GAP;
    }
  }
  return roll;
}

/** Seconds a vehicle takes to slow from its speed to a stop, and to pull away again (it loses half of each). */
export const RAMP = 1.2;
/**
 * The seconds of driving a vehicle has done by `seconds` (its progress along its road's path): all of them without lights; with them, it
 * loses the walk phase every cycle: `roll` seconds after the lights change it starts to slow, eases to a stop (RAMP seconds, covering
 * RAMP / 2 of progress), stands, and pulls away `roll` seconds after the green. It never moves off before the green. Continuous and
 * never decreasing; standing, its progress is a whole number of greens plus `roll` plus RAMP / 2.
 */
export function drivenAt(signal: Signal | null, roll: number, seconds: number, ramp = RAMP): number {
  if (!signal) return seconds;
  const walk = signal.walk, r = Math.max(0, Math.min(ramp, walk)), still = walk - r, green = signal.period - walk;
  const u = seconds - signal.offset - roll - green, k = Math.floor(u / signal.period), x = u - k * signal.period;
  let lost: number;
  if (x < r) lost = (x * x) / (2 * r);
  else if (x < r + still) lost = r / 2 + (x - r);
  else if (x < 2 * r + still) { const y = x - r - still; lost = r / 2 + still + y - (y * y) / (2 * r); }
  else lost = walk;
  return u - k * walk - lost + green + roll;
}
/** The progress a vehicle that does not roll on stops at, past where it was when the lights changed (half its ramp). */
const SETTLE = RAMP / 2;

/** Where vehicle `i` is at `seconds` (wall clock), which way it faces, and how far along its road; `lost`: seconds of driving its road
 * has given up to the player (createGiveWay). */
export function vehiclePose(plan: TrafficPlan, vehicles: readonly Vehicle[], roads: readonly Road[], i: number, seconds: number, lost = 0): VehiclePose & { along: number } {
  const v = vehicles[i]!, road = roads[v.road]!, rp = plan.roads[v.road]!, p = rp.profile;
  const t = Number.isFinite(seconds) ? seconds : 0;
  const along = freePlace(p, plan.start[i]! + rp.shift + drivenAt(plan.signal, plan.roll[i] ?? 0, t) - (Number.isFinite(lost) ? lost : 0));
  const length = p.length || 1, ux = (road.bx - road.ax) / length, uz = (road.bz - road.az) / length;
  return { x: road.ax + ux * along, z: road.az + uz * along, ry: Math.atan2(ux, uz), along };
}

// ---- giving way to the player ------------------------------------------------------------------------------------------------------

/** Someone a vehicle must not drive through (the player): where they stand and their radius (src/scene/walk-grid.ts AVATAR_RADIUS). */
export interface InTheWay { x: number; z: number; radius?: number }
/** A vehicle stops STOP_SHORT (scene units, about 1 m) short of someone in its path and starts braking BRAKE_ROOM before that; once
 * clear, it catches up the driving it lost at CATCH_UP of its pace again (then it is back on the shared schedule). */
export const STOP_SHORT = 1.5, BRAKE_ROOM = 4, CATCH_UP = 0.4;
/** Behind a vehicle that has lost more than it has (it gave way), a vehicle stops FOLLOW_SHORT short of its rear, braking FOLLOW_ROOM before. */
export const FOLLOW_SHORT = 0.6, FOLLOW_ROOM = 2.5;
/** Someone this far either side of a vehicle's line, past half its width, is not in its path. */
export const PATH_MARGIN = 0.35;
const PERSON_RADIUS = 0.34;

/**
 * The room in front of a vehicle (its front to the nearest edge of someone in its path), or Infinity when nobody is. In its path: ahead of
 * its centre, and within half its width and PATH_MARGIN of its line. Someone already against its front half gives a room under zero.
 */
export function roomAhead(pose: { x: number; z: number; ry: number }, length: number, half: number, people: readonly (InTheWay | null | undefined)[]): number {
  const ux = Math.sin(pose.ry), uz = Math.cos(pose.ry);
  let room = Infinity;
  for (const o of people) {
    if (!o || !Number.isFinite(o.x) || !Number.isFinite(o.z)) continue;
    const dx = o.x - pose.x, dz = o.z - pose.z, along = dx * ux + dz * uz, r = o.radius ?? PERSON_RADIUS;
    if (along < 0 || Math.abs(dx * uz - dz * ux) >= half + r + PATH_MARGIN) continue;
    room = Math.min(room, along - length / 2 - r);
  }
  return room;
}

/** What the give-way needs to know of a frame's vehicles (giveWayFrame builds it from a schedule). */
export interface GiveWayFrame {
  /** The vehicles drawn: the first `count`. */
  count: number
  road(i: number): number
  length(i: number): number
  half(i: number): number
  /** Seconds of driving vehicle i did over the frame on its own schedule (none while the lights hold it). */
  gained(i: number): number
  /** Where vehicle i is now, had it lost `lost` seconds of driving. */
  poseAt(i: number, lost: number): { x: number; z: number; ry: number }
  /** A road's lap in seconds: a whole lap lost by all its vehicles is no loss (the same places come round). */
  lap(road: number): number
  /** Who stands in the street (the player, other players). */
  people: readonly (InTheWay | null | undefined)[]
}
export interface GiveWay {
  /** Seconds of driving each vehicle has given up (vehiclePose's `lost`). */
  readonly lost: readonly number[]
  advance(frame: GiveWayFrame): void
}

/**
 * Vehicles giving way to people on the road. Each vehicle brakes for someone in its path (STOP_SHORT, BRAKE_ROOM) and for a vehicle ahead
 * that has lost more than it has (FOLLOW_SHORT, FOLLOW_ROOM, against where that one stood a frame ago, which it never falls behind), by
 * giving up a share of the frame's own driving: never more, so nobody is pushed back. Inside the stopping room it gives up the whole
 * frame (it stands where it was). Clear, it catches up at CATCH_UP faster. With nobody on the road and nothing lost, the shared schedule
 * is untouched.
 */
export function createGiveWay(count: number): GiveWay {
  const lost: number[] = Array.from({ length: Math.max(0, count) }, () => 0);
  return {
    lost,
    advance(frame) {
      const n = Math.min(frame.count, lost.length), was = lost.slice(), gain = was.map((_, i) => (i < n ? Math.max(0, frame.gained(i) || 0) : 0));
      // Where every vehicle stood a frame ago (its old loss plus the frame's driving, at the new time): none ends up behind it.
      const before = was.map((value, i) => (i < n ? frame.poseAt(i, value + gain[i]!) : null));
      const rooms = (i: number, value: number): { people: number; ahead: number } => {
        const pose = frame.poseAt(i, value), length = frame.length(i), half = frame.half(i);
        const rears: InTheWay[] = [];
        for (let k = 0; k < n; k++) {
          if (k === i || frame.road(k) !== frame.road(i) || !(was[k]! > value + 1e-9)) continue;
          const b = before[k]!, back = frame.length(k) / 2;
          rears.push({ x: b.x - Math.sin(b.ry) * back, z: b.z - Math.cos(b.ry) * back, radius: 0 });
        }
        return { people: roomAhead(pose, length, half, frame.people), ahead: roomAhead(pose, length, half, rears) };
      };
      const rate = (r: { people: number; ahead: number }): number => Math.max(0, Math.min(1,
        (r.people - STOP_SHORT) / BRAKE_ROOM, (r.ahead - FOLLOW_SHORT) / FOLLOW_ROOM));
      for (let i = 0; i < n; i++) {
        const now = was[i]!, own = gain[i]!;
        if (!(own > 0)) continue;
        const r = rooms(i, now), k = rate(r);
        let next = k < 1 ? now + own * (1 - k) : now > 0 ? Math.max(0, now - own * CATCH_UP) : now;
        if (next < now && rate(rooms(i, next)) < 1) next = now;
        // The guarantee: never inside the stopping room after the frame (stand where it was).
        const after = rooms(i, next);
        if (next < now + own && (after.people < STOP_SHORT || after.ahead < FOLLOW_SHORT)) next = now + own;
        lost[i] = next;
      }
      // A whole lap lost by every vehicle of a road comes round to the same places: take it off.
      const roads = new Set(Array.from({ length: n }, (_, i) => frame.road(i)));
      for (const road of roads) {
        const lap = frame.lap(road), mine = Array.from({ length: n }, (_, i) => i).filter((i) => frame.road(i) === road);
        if (!(lap > 0)) continue;
        const least = Math.min(...mine.map((i) => lost[i]!));
        if (least >= lap) { const off = lap * Math.floor(least / lap); for (const i of mine) lost[i]! -= off; }
      }
    },
  };
}

/** A give-way frame from a schedule: vehicles `count` first of `vehicles`, from one wall-clock time to the next (seconds). */
export function giveWayFrame(plan: TrafficPlan, vehicles: readonly Vehicle[], roads: readonly Road[], from: number, to: number, count: number,
  half: (i: number) => number, people: readonly (InTheWay | null | undefined)[]): GiveWayFrame {
  return {
    count: Math.min(count, vehicles.length), people, half,
    road: (i) => vehicles[i]!.road,
    length: (i) => vehicles[i]!.length,
    gained: (i) => { const roll = plan.roll[i] ?? 0; return Math.max(0, drivenAt(plan.signal, roll, to) - drivenAt(plan.signal, roll, from)); },
    poseAt: (i, lost) => vehiclePose(plan, vehicles, roads, i, to, lost),
    lap: (road) => plan.roads[road]?.profile.lap ?? 0,
  };
}
