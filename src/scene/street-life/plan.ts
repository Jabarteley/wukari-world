/**
 * OWNER: scenes
 * Street life: a busy far crowd and moving traffic behind a street-level scene (zoom phase 2, first slice). Pure: no Three.js, no DOM
 * reads except deviceHints() and forcedFrom() (which take their inputs when given), so every rule here is a plain unit test.
 *
 * What it adds, and what it never does:
 *   - a FAR CROWD of a few hundred people drawn as camera-facing cut-outs (two triangles each, one draw call for all of them), walking
 *     along pedestrian LANES that lie beyond where the player can walk (the back of an open venue; the far pavement of the home street);
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

/** What the carriageway under a venue's street costs at most (draw.ts surface: asphalt, kerbs, dashes, zebra; about 40 triangles). */
export const SURFACE_TRIANGLES = 80;
/**
 * How many vehicles fit beside `crowd` people (zoom phase 5b: the street behind a venue): within the same ROOM_SHARE of the spare
 * triangles, after the road's own; none without four spare draw calls (the crowd, the traffic, the road and one to spare).
 */
export function trafficFits(choice: StreetChoice, room: { triangles: number; meshes: number }, crowd: number): number {
  if (!(room.meshes >= 4) || !(room.triangles > 0)) return 0;
  const left = room.triangles * ROOM_SHARE - crowd * PERSON_TRIANGLES - SURFACE_TRIANGLES;
  return Math.max(0, Math.min(choice.vehicles, HARD_CAP.vehicles, Math.floor(left / VEHICLE_TRIANGLES)));
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
export interface Lane { ax: number; az: number; bx: number; bz: number; width: number; browse?: number
  /** Where along the lane (from a) its shop windows are (zoom phase 5b): a browser stops at these, and only these (crowd.ts). */
  windows?: readonly number[] }
/** A traffic lane: vehicles drive from a to b only (one way, all at one speed, so they never run into each other). */
export interface Road { ax: number; az: number; bx: number; bz: number; speed: number }

/**
 * The lanes behind an open venue: three pavements beyond the far edge of where the player can walk (the back of the place, away from
 * the scene's camera), running past both sides to where the host's ground disc fades (people dissolve in and out there: FADE_UNITS), and
 * for an open place one down its left side. They stand on the disc, which lies VENUE_GROUND below the floor.
 */
export function venueLanes(bounds: readonly [number, number, number, number], open: boolean): Lane[] {
  const [x0, z0, x1, z1] = bounds, reach = 16;
  const lanes: Lane[] = [
    { ax: x0 - reach, az: z0 - 2.0, bx: x1 + reach, bz: z0 - 2.0, width: 1.6 },
    { ax: x0 - reach, az: z0 - 4.6, bx: x1 + reach, bz: z0 - 4.6, width: 2.2 },
    { ax: x0 - reach, az: z0 - 7.6, bx: x1 + reach, bz: z0 - 7.6, width: 2.6 },
  ];
  if (open) lanes.push({ ax: x0 - 2.4, az: z1 + 4, bx: x0 - 2.4, bz: z0 - 9, width: 1.6 });
  return lanes;
}

/** The host's ground disc beyond a venue's slab lies this far below the floor (src/venue-world.ts ground.place). */
export const VENUE_GROUND = -0.42;

const laneLength = (lane: { ax: number; az: number; bx: number; bz: number }): number => Math.hypot(lane.bx - lane.ax, lane.bz - lane.az);
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

/** A keke (a tricycle taxi: keke, auto, tuk-tuk) is never planned here; a country's livery (livery.ts) turns some cars into them, and its
 * flavour (traffic.ts) some into okadas (motorbike taxis, boda-boda, ojek) and bicycles. */
export type VehicleKind = 'taxi' | 'car' | 'bus' | 'truck' | 'keke' | 'okada' | 'bike';
/** Length, height and width scale and colours of each kind (a car is 4.2 units long; the street's parked danfo is 5). */
export const VEHICLE_KINDS: Readonly<Record<VehicleKind, { length: number; tall: number; wide?: number; colours: readonly string[] }>> = Object.freeze({
  taxi: { length: 1, tall: 1, colours: ['#f2c12e', '#e8b923'] },
  car: { length: 1, tall: 1, colours: ['#c9ccd1', '#9a2b2b', '#2b4a7a', '#1d1f22', '#f1efe9', '#5c6a4a'] },
  bus: { length: 1.25, tall: 1.55, colours: ['#e5b52b'] },
  truck: { length: 1.55, tall: 1.6, colours: ['#f1efe9', '#3f6f8f', '#a33a2b'] },
  keke: { length: 0.62, tall: 1.05, wide: 0.72, colours: ['#f2c12e'] },
  okada: { length: 0.5, tall: 0.95, wide: 0.34, colours: ['#1d1f22', '#a33a2b', '#2b4a7a'] },
  bike: { length: 0.42, tall: 0.88, wide: 0.26, colours: ['#2b4a7a', '#1d1f22', '#5c6a4a'] },
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
