/**
 * OWNER: scenes
 * Street life: a busy far crowd and moving traffic behind a street-level scene (zoom phase 2, first slice). Pure: no Three.js, no DOM
 * reads except deviceHints() and forcedFrom() (which take their inputs when given), so every rule here is a plain unit test.
 *
 * What it adds, and what it never does:
 *   - a FAR CROWD of people drawn as camera-facing cut-outs (two triangles each, one draw call for all of them), walking along pedestrian
 *     LANES: the pavements of the home street (a few hundred), or a light crowd on an open venue's own walkable floor (venueLanes: never
 *     outside its boundary, never through its walls, trees or props);
 *   - TRAFFIC: a few taxis, cars, buses and trucks on a scene's ROADS (one instanced mesh), only where the scene has a road;
 *   - nothing near the player: the ambient layer's own people (src/scene/ambient) are untouched, and are what is left when this is off.
 *
 * Who gets it (streetLifeFor): the ambient tier must be 'full' (bodyAllowed: not save-data, not 2G, more than two cores and 2 GB), the
 * phase-1 dive tier must not be 'cut' (deviceTier, the same rule as src/map3d/dive.ts diveTier: two cores or fewer, under 2 GB, save-data),
 * and the page must draw with WebGL2. A 'lite' tier (four cores or fewer, or 2 GB) gets half. Then, while it moves, the frame guard
 * (createFrameGuard: the dive's SLOW_FRAME_MS and STALL_MS) drops it at once when frames come slow.
 *
 * The dive's rules are repeated here, not imported: importing src/map3d/dive.ts would split it out of the maps chunk into a file of its own
 * that the first download's preload lists name. plan.test.ts holds the two to the same answers. `?streetlife=on` (or localStorage 'aw.streetlife' = 'on') forces it
 * on for hand testing on any device, with no frame guard; `?streetlife=off` forces it off.
 *
 * Everyone's place is a function of (seed, wall-clock time): the same street shows the same people and cars on every device, without a
 * word sent between them.
 */
import { makeRng } from '../../game/util.ts';

/** What a browser says about itself (src/map3d/dive.ts DeviceHints). */
export interface DeviceHints { reduced?: boolean; cores?: number; memory?: number; saveData?: boolean }
/** The dive's frame thresholds (src/map3d/dive.ts): a mean gap over SLOW_FRAME_MS, or one gap over STALL_MS, is slow. */
export const SLOW_FRAME_MS = 42, STALL_MS = 300;
/** The dive's device tier (src/map3d/dive.ts diveTier), repeated: 'cut' for reduced motion, save-data, two cores or fewer, or under 2 GB; 'lite' up to four cores or 2 GB. */
export function deviceTier({ reduced = false, cores, memory, saveData = false }: DeviceHints = {}): 'full' | 'lite' | 'cut' {
  if (reduced || saveData) return 'cut';
  const known = (value: number | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;
  if ((known(cores) && cores <= 2) || (known(memory) && memory < 2)) return 'cut';
  if ((known(cores) && cores <= 4) || (known(memory) && memory <= 2)) return 'lite';
  return 'full';
}

export type StreetTier = 'full' | 'lite';
/** The most people and vehicles one scene may ever draw, whatever asks for more. */
export const HARD_CAP = Object.freeze({ crowd: 320, vehicles: 12 });
/** What each tier draws at most. */
export const TIER_CAPS: Readonly<Record<StreetTier, { crowd: number; vehicles: number }>> = Object.freeze({
  full: { crowd: 240, vehicles: 8 },
  lite: { crowd: 120, vehicles: 4 },
});
/** Triangles a person and a vehicle cost (the draw module builds exactly these: a quad; five boxes: wheels, body, cabin, livery stripe, roof sign). */
export const PERSON_TRIANGLES = 2, VEHICLE_TRIANGLES = 60;
/** The share of a scene's spare triangles the crowd may take; the rest stays for the ambient layer's own people. */
export const ROOM_SHARE = 0.25;
/** The kinds of venue that stand on a street: open or covered places a city's crowd passes. Rooms, rooftops, beaches and hills have no street behind them. */
export const STREET_KINDS: ReadonlySet<string> = new Set(['market', 'hub', 'walk', 'park', 'buka', 'statehouse', 'polling', 'quad', 'generic', 'shrine']);

// ---- the gate --------------------------------------------------------------------------------------------------------------------

export type Forced = 'on' | 'off' | null;
/** The hand-testing switch: `?streetlife=on|off` in the address, else localStorage 'aw.streetlife'. */
export function forcedFrom(search = '', stored: string | null = null): Forced {
  const read = (value: string | null | undefined): Forced => {
    const v = (value ?? '').trim().toLowerCase();
    return v === 'on' || v === '1' || v === 'true' ? 'on' : v === 'off' || v === '0' || v === 'false' ? 'off' : null;
  };
  let asked: string | null = null;
  try { asked = new URLSearchParams(search).get('streetlife'); } catch { asked = null; }
  return read(asked) ?? read(stored);
}

interface NavigatorLike { hardwareConcurrency?: number; deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } }
/** What the browser says about itself, in the dive's terms (reduced motion is not asked: a still crowd is fine, it just never moves). */
export function deviceHints(device: NavigatorLike | undefined = globalThis.navigator as NavigatorLike | undefined): DeviceHints {
  const connection = device?.connection;
  return {
    ...(typeof device?.hardwareConcurrency === 'number' ? { cores: device.hardwareConcurrency } : {}),
    ...(typeof device?.deviceMemory === 'number' ? { memory: device.deviceMemory } : {}),
    saveData: connection?.saveData === true || connection?.effectiveType === '2g' || connection?.effectiveType === 'slow-2g',
  };
}

/** The switch as this page has it (none outside a browser). */
export function pageForced(): Forced {
  const where = globalThis.location as { search?: string } | undefined;
  let stored: string | null = null;
  try { stored = (globalThis.localStorage as Storage | undefined)?.getItem('aw.streetlife') ?? null; } catch { stored = null; }
  return forcedFrom(where?.search ?? '', stored);
}

export interface StreetAsk {
  /** The ambient layer's tier for this device ('full' | 'light' | 'off'). */
  ambientTier: string
  /** The venue kind; omitted for a scene that is a street itself (the home street). */
  kind?: string
  /** Does the page draw with WebGL2 (the frame budget assumes a real GPU)? */
  webgl: boolean
  hints?: DeviceHints
  forced?: Forced
}
export interface StreetChoice { tier: StreetTier; crowd: number; vehicles: number; forced: boolean }

/** Whether a scene gets street life on this device, and how much at most. Null: today's crowd only. */
export function streetLifeFor({ ambientTier, kind, webgl, hints = {}, forced = null }: StreetAsk): StreetChoice | null {
  if (forced === 'off') return null;
  if (kind !== undefined && !STREET_KINDS.has(kind)) return null;
  if (forced === 'on') return { tier: 'full', ...TIER_CAPS.full, forced: true };
  if (ambientTier !== 'full' || !webgl) return null;
  const dive = deviceTier({ ...hints, reduced: false });
  if (dive === 'cut') return null;
  const tier: StreetTier = dive === 'lite' ? 'lite' : 'full';
  return { tier, ...TIER_CAPS[tier], forced: false };
}

/** How many people fit in what the scene has left: never more than the tier allows, the hard cap, or ROOM_SHARE of the spare triangles; none without two spare draw calls. */
export function crowdFits(choice: StreetChoice, room: { triangles: number; meshes: number }): number {
  if (!(room.meshes >= 2) || !(room.triangles > 0)) return 0;
  return Math.max(0, Math.min(choice.crowd, HARD_CAP.crowd, Math.floor((room.triangles * ROOM_SHARE) / PERSON_TRIANGLES)));
}

// ---- the frame guard -------------------------------------------------------------------------------------------------------------

export type GuardVerdict = 'wait' | 'ok' | 'slow';
export interface FrameGuard { frame(dtSeconds: number): GuardVerdict; reset(): void; readonly verdict: GuardVerdict }
/** Frames the guard averages over, and the frames it ignores after a wake (they carry the work of starting). */
export const GUARD_FRAMES = 12, GUARD_SKIP = 2;
/**
 * Watches the frame gaps while the crowd moves. Slow (for good): the mean of the last GUARD_FRAMES gaps is over the dive's SLOW_FRAME_MS
 * (under about 24 frames a second), or one gap after the first few is over STALL_MS. reset() at each wake starts the skip again but
 * keeps a 'slow' verdict: a device that was too slow once does not get the crowd back in this scene.
 */
export function createFrameGuard(): FrameGuard {
  let gaps: number[] = [], skip = GUARD_SKIP, verdict: GuardVerdict = 'wait';
  return {
    get verdict() { return verdict; },
    reset() { gaps = []; skip = GUARD_SKIP; if (verdict === 'ok') verdict = 'wait'; },
    frame(dt) {
      if (verdict === 'slow') return verdict;
      const ms = Number.isFinite(dt) ? Math.max(0, dt * 1000) : 0;
      if (skip > 0) { skip -= 1; return verdict; }
      if (ms > STALL_MS) return (verdict = 'slow');
      gaps.push(ms);
      if (gaps.length > GUARD_FRAMES) gaps.shift();
      if (gaps.length === GUARD_FRAMES) verdict = gaps.reduce((a, b) => a + b, 0) / GUARD_FRAMES > SLOW_FRAME_MS ? 'slow' : 'ok';
      return verdict;
    },
  };
}

// ---- where they walk and drive ---------------------------------------------------------------------------------------------------

/** A pedestrian band: people walk from a to b and from b to a, spread across `width`. `browse`: the lane runs by shop windows, and
 * people who stop on it turn to this facing (crowd.ts). */
export interface Lane { ax: number; az: number; bx: number; bz: number; width: number; browse?: number }
/** A traffic lane: vehicles drive from a to b only (one way, all at one speed, so they never run into each other). */
export interface Road { ax: number; az: number; bx: number; bz: number; speed: number }

/** A venue's walk area: [x0, z0, x1, z1] (the walk grid's bounds). */
export type Bounds = readonly [number, number, number, number];
/** May a body stand here (the venue's walk grid: on its floor, clear of walls, trees and props by the avatar's radius). */
export type Walkable = (x: number, z: number) => boolean;
/** Inside a venue the crowd keeps this far in from the walk area's edge (walls, hedges, the slab's lip), on top of the grid's own clearance. */
export const VENUE_MARGIN = 1.5;
/** A lane on a venue's floor is cut where its band meets something in the way; pieces shorter than this are dropped. */
export const VENUE_MIN_RUN = 8;
/** The band of a lane on a venue's floor, and how finely it is checked against the floor. */
export const VENUE_LANE_WIDTH = 1.4, VENUE_LANE_STEP = 0.5;
/** A venue's floor carries a light crowd: at most this many per tier, and no more than one person per VENUE_SPACING units of lane. */
export const VENUE_CROWD: Readonly<Record<StreetTier, number>> = Object.freeze({ full: 32, lite: 16 });
export const VENUE_SPACING = 2.5;

const validBounds = (bounds: Bounds | null | undefined): bounds is Bounds => Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite)
  && bounds[2] - bounds[0] > 2 * VENUE_MARGIN + VENUE_LANE_WIDTH && bounds[3] - bounds[1] > 2 * VENUE_MARGIN + VENUE_LANE_WIDTH;

/** Is (x, z) at least `margin` inside the venue's walk bounds. */
export function insideFloor(bounds: Bounds, x: number, z: number, margin = VENUE_MARGIN): boolean {
  const [x0, z0, x1, z1] = bounds;
  return Number.isFinite(x) && Number.isFinite(z) && x >= x0 + margin && x <= x1 - margin && z >= z0 + margin && z <= z1 - margin;
}

/** The venue floor a crowd may stand on: inside the bounds by VENUE_MARGIN and free on the walk grid. Null (no crowd) without a grid or with no real floor. */
export function walkableFloor(bounds: Bounds | null | undefined, free: Walkable | null | undefined): Walkable | null {
  if (typeof free !== 'function' || !validBounds(bounds)) return null;
  return (x, z) => insideFloor(bounds, x, z) && free(x, z) === true;
}

/** The pieces of a line whose whole band (centre and both edges) stands on the floor, each at least VENUE_MIN_RUN long. */
function clipToFloor(line: { ax: number; az: number; bx: number; bz: number }, walkable: Walkable): Lane[] {
  const length = laneLength(line), half = VENUE_LANE_WIDTH / 2;
  if (!(length >= VENUE_MIN_RUN)) return [];
  const ux = (line.bx - line.ax) / length, uz = (line.bz - line.az) / length;
  const steps = Math.ceil(length / VENUE_LANE_STEP), out: Lane[] = [];
  const at = (k: number): number => Math.min(length, k * VENUE_LANE_STEP);
  const ok = (t: number): boolean => {
    const x = line.ax + ux * t, z = line.az + uz * t;
    return walkable(x, z) && walkable(x + uz * half, z - ux * half) && walkable(x - uz * half, z + ux * half);
  };
  let start = -1;
  for (let k = 0; k <= steps + 1; k++) {
    const good = k <= steps && ok(at(k));
    if (good && start < 0) start = k;
    if (!good && start >= 0) {
      const a = at(start), b = at(k - 1);
      if (b - a >= VENUE_MIN_RUN) out.push({ ax: line.ax + ux * a, az: line.az + uz * a, bx: line.ax + ux * b, bz: line.az + uz * b, width: VENUE_LANE_WIDTH });
      start = -1;
    }
  }
  return out;
}

/**
 * The lanes of a venue's light crowd, ON ITS OWN FLOOR: two rows across the back of the walk area (away from the scene's camera) and, for
 * an open place, one up each side over the back 60%, all VENUE_MARGIN inside the walk bounds and cut wherever their band meets a wall, a
 * tree or a prop on the walk grid (`free`). No grid, or no real floor: no lanes (no crowd). Never outside the boundary: before 14 Oct
 * these were pavements BEYOND the walk area, on the host's ground disc, and the Square showed lines of people outside its trees.
 */
export function venueLanes(bounds: Bounds, open: boolean, free?: Walkable | null): Lane[] {
  const walkable = walkableFloor(bounds, free);
  if (!walkable) return [];
  const [x0, z0, x1, z1] = bounds, half = VENUE_LANE_WIDTH / 2, depth = z1 - z0;
  const left = x0 + VENUE_MARGIN + half, right = x1 - VENUE_MARGIN - half, back = z0 + VENUE_MARGIN + half;
  const lines = [{ ax: left, az: back, bx: right, bz: back }];
  if (back + 2.6 < z0 + depth * 0.45) lines.push({ ax: left, az: back + 2.6, bx: right, bz: back + 2.6 });
  if (open) for (const x of [left, right]) lines.push({ ax: x, az: back, bx: x, bz: z0 + depth * 0.6 });
  return lines.flatMap((line) => clipToFloor(line, walkable));
}

/** How many people a venue's floor gets: what fits in the room (crowdFits), the venue's light cap for the tier, and the lanes' length. */
export function venueCrowd(choice: StreetChoice, room: { triangles: number; meshes: number }, lanes: readonly Lane[]): number {
  const length = lanes.reduce((sum, lane) => sum + laneLength(lane), 0);
  if (!lanes.length || !(length > 0)) return 0;
  return Math.max(0, Math.min(crowdFits(choice, room), VENUE_CROWD[choice.tier], Math.floor(length / VENUE_SPACING)));
}

function laneLength(lane: { ax: number; az: number; bx: number; bz: number }): number { return Math.hypot(lane.bx - lane.ax, lane.bz - lane.az); }
const wrap = (value: number, length: number): number => ((value % length) + length) % length;

// ---- the people ------------------------------------------------------------------------------------------------------------------

export const SHIRTS = ['#c0562f', '#2f6f8f', '#d9a441', '#5a8f4e', '#7b4b94', '#b8c2c9', '#a33a4a', '#e8e0cc', '#3f4f6b', '#d97b9b', '#f2f0ea', '#1f2630', '#e07a2e', '#2e8a7a'] as const;
export const LEGS = ['#2b2f3a', '#3d4a5c', '#5b4a3a', '#1f2a2a', '#6b6f78', '#2c3f66', '#d9cfb8', '#4a2f3f'] as const;
export const SKINS = ['#b27a50', '#a66c45', '#8a5535', '#7a4a30', '#6b4029', '#5a3524', '#4d2c1d', '#3b2218'] as const;
/** The walking pace (scene units a second) and the people's height (a scene person is about 2.6 units tall). */
export const PACE: readonly [number, number] = [1.2, 2.0];
export const HEIGHT: readonly [number, number] = [2.3, 2.85];
/** 0 short hair, 1 head wrap or cap (the shirt's colour), 2 grey hair. */
export type Style = 0 | 1 | 2;

export interface Walker {
  lane: number
  /** Across the lane from its centre line, and which way along it (+1 a→b, -1 b→a: each way keeps to its own half of the band). */
  across: number
  dir: 1 | -1
  /** Where along the lane at time zero, the pace, and the stride length (a step and a half per height). */
  offset: number
  speed: number
  stride: number
  height: number
  shirt: string
  legs: string
  skin: string
  style: Style
  /** A dress or skirt instead of trousers. */
  skirt: boolean
}

/** A lane's people, longest lanes getting the most, all from the seed. Deterministic: the same seed and lanes give the same crowd. */
export function planCrowd(seed: string, lanes: readonly Lane[], count: number): Walker[] {
  const n = Math.max(0, Math.min(HARD_CAP.crowd, Math.floor(count)));
  const lengths = lanes.map(laneLength), total = lengths.reduce((a, b) => a + b, 0);
  if (!n || !(total > 0)) return [];
  const next = makeRng(`street-life|crowd|${seed}`);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(next() * list.length) % list.length] as T;
  const out: Walker[] = [];
  // Share the people by length (largest remainder), so a long pavement is as busy as a short one.
  const shares = lengths.map((length) => (length / total) * n), whole = shares.map(Math.floor);
  let left = n - whole.reduce((a, b) => a + b, 0);
  for (const i of shares.map((s, i) => [s - Math.floor(s), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(([, i]) => i)) { if (left <= 0) break; whole[i]! += 1; left -= 1; }
  whole.forEach((people, lane) => {
    const length = lengths[lane]!, width = lanes[lane]!.width;
    for (let k = 0; k < people; k++) {
      const dir: 1 | -1 = next() < 0.5 ? 1 : -1;
      const height = HEIGHT[0] + next() * (HEIGHT[1] - HEIGHT[0]);
      const skirt = next() < 0.3;
      out.push({
        lane, dir,
        // The two ways along the band keep to its two halves, so people mostly pass beside each other rather than through.
        across: dir * (0.12 + next() * 0.38) * width,
        offset: ((k + next() * 0.8) / people) * length,
        speed: PACE[0] + next() * (PACE[1] - PACE[0]),
        stride: height * (0.55 + next() * 0.12),
        height, skirt,
        shirt: pick(SHIRTS), legs: pick(LEGS), skin: pick(SKINS),
        style: (next() < 0.22 ? 1 : next() < 0.12 ? 2 : 0) as Style,
      });
    }
  });
  return out;
}

/** People dissolve in over this distance from a lane's start and out over the same before its end, so nobody is seen to jump back round. */
export const FADE_UNITS = 4;
export interface WalkerPose { x: number; z: number; ry: number; phase: number; fade: number }
/** Where a person is at `seconds` (any wall-clock time in seconds), facing the way they walk, how far through a stride (0 … 1), and how much of them shows (0 … 1). */
export function walkerAt(walker: Walker, lane: Lane, seconds: number): WalkerPose {
  const length = laneLength(lane) || 1;
  const travelled = walker.speed * (Number.isFinite(seconds) ? seconds : 0);
  const along = wrap(walker.offset + walker.dir * travelled, length);
  const ux = (lane.bx - lane.ax) / length, uz = (lane.bz - lane.az) / length;
  // Across is measured along (uz, −ux), at right angles to the lane.
  const x = lane.ax + ux * along + uz * walker.across, z = lane.az + uz * along - ux * walker.across;
  const ry = Math.atan2(ux * walker.dir, uz * walker.dir);
  const edge = Math.min(along, length - along);
  return { x, z, ry, phase: wrap(travelled / walker.stride, 1), fade: Math.max(0, Math.min(1, edge / FADE_UNITS)) };
}

/** How near a cut-out person may come to the player before stepping aside (scene units), the way the layer's walkers do. */
export const KEEP_CLEAR = 1.4;
/** The place a person takes to keep clear of the player: pushed straight out to KEEP_CLEAR, or left alone when already clear. */
export function stepAside(pose: { x: number; z: number }, player: { x: number; z: number } | null | undefined, clear = KEEP_CLEAR): { x: number; z: number } {
  if (!player) return pose;
  const dx = pose.x - player.x, dz = pose.z - player.z, d = Math.hypot(dx, dz);
  if (d >= clear) return pose;
  if (d < 1e-6) return { x: player.x + clear, z: player.z };
  return { x: player.x + (dx / d) * clear, z: player.z + (dz / d) * clear };
}

// ---- the traffic -----------------------------------------------------------------------------------------------------------------

/** A keke (a tricycle taxi: keke, auto, tuk-tuk) is never planned here; a country's livery (livery.ts) turns some cars into them. */
export type VehicleKind = 'taxi' | 'car' | 'bus' | 'truck' | 'keke';
/** Length, height and width scale and colours of each kind (a car is 4.2 units long; the street's parked danfo is 5). */
export const VEHICLE_KINDS: Readonly<Record<VehicleKind, { length: number; tall: number; wide?: number; colours: readonly string[] }>> = Object.freeze({
  taxi: { length: 1, tall: 1, colours: ['#f2c12e', '#e8b923'] },
  car: { length: 1, tall: 1, colours: ['#c9ccd1', '#9a2b2b', '#2b4a7a', '#1d1f22', '#f1efe9', '#5c6a4a'] },
  bus: { length: 1.25, tall: 1.55, colours: ['#e5b52b'] },
  truck: { length: 1.55, tall: 1.6, colours: ['#f1efe9', '#3f6f8f', '#a33a2b'] },
  keke: { length: 0.62, tall: 1.05, wide: 0.72, colours: ['#f2c12e'] },
});
export const CAR_LENGTH = 4.2;
export interface Vehicle { road: number; kind: VehicleKind; colour: string; offset: number; length: number }

/** The vehicles on a scene's roads: evenly spaced along each with a little play, never closer than a car's length to the one ahead. */
export function planTraffic(seed: string, roads: readonly Road[], count: number): Vehicle[] {
  const n = Math.max(0, Math.min(HARD_CAP.vehicles, Math.floor(count)));
  const lengths = roads.map(laneLength), total = lengths.reduce((a, b) => a + b, 0);
  if (!n || !(total > 0)) return [];
  const next = makeRng(`street-life|traffic|${seed}`);
  const out: Vehicle[] = [];
  roads.forEach((_, road) => {
    const length = lengths[road]!, room = Math.floor(length / (CAR_LENGTH * (VEHICLE_KINDS.truck.length + 1)));
    const here = Math.max(0, Math.min(room, road === roads.length - 1 ? n - out.length : Math.round((length / total) * n)));
    const gap = length / Math.max(1, here);
    for (let k = 0; k < here; k++) {
      const roll = next(), kind: VehicleKind = roll < 0.45 ? 'taxi' : roll < 0.75 ? 'car' : roll < 0.9 ? 'bus' : 'truck';
      const spec = VEHICLE_KINDS[kind], size = CAR_LENGTH * spec.length;
      // The play is what the gap leaves after the longest vehicle and a car's length of room, so no two can touch.
      const play = Math.max(0, gap - CAR_LENGTH * VEHICLE_KINDS.truck.length - CAR_LENGTH) / 2;
      out.push({ road, kind, colour: spec.colours[Math.floor(next() * spec.colours.length) % spec.colours.length]!, offset: k * gap + (next() * 2 - 1) * play, length: size });
    }
  });
  return out;
}

export interface VehiclePose { x: number; z: number; ry: number }
/** Where a vehicle is at `seconds`: its road's speed carries everyone on it round the loop together. */
export function vehicleAt(vehicle: Vehicle, road: Road, seconds: number): VehiclePose {
  const length = laneLength(road) || 1;
  const along = wrap(vehicle.offset + road.speed * (Number.isFinite(seconds) ? seconds : 0), length);
  const ux = (road.bx - road.ax) / length, uz = (road.bz - road.az) / length;
  return { x: road.ax + ux * along, z: road.az + uz * along, ry: Math.atan2(ux, uz) };
}
