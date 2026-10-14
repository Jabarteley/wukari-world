/**
 * OWNER: world
 * The end of the map's dive when it lands on a street (zoom phase 5b): instead of coming down from above (./arrive-above.ts), the venue's
 * camera starts at a person's eye height on the pavement, looking along the busy street (src/scene/street-life/street-scene.ts StartPose),
 * holds there for STREET_HOLD seconds, then rises to the scene's composed view more slowly than an ordinary ease.
 *
 * Like arrive-above it lives in the maps' lazy chunk and works only on the orbit's public state through the handle the venue host gives out
 * (venue-world.ts `motion()`): nothing in the shared scene chunk changes, and neither do the player's movement or actions. The goal is not
 * touched; a drag, a pinch or a step by the player during the hold ends it at once, and snap() (reduced motion, a new venue) ends it all.
 *
 * Who gets it: only where the dive ended as planned ('arrived'), motion() is offered (no reduced motion, a frame loop), the place is a
 * street (STREET_PLACES), and the scene noted a street there (it passed street life's own device gate, src/scene/street-life/plan.ts).
 * Everyone else gets arrive-from-above, as before.
 */
import type { Orbit } from '../scene/camera-controls.ts';
import { ABOVE_RATE, TURN_RATE, ZOOM_RATE } from './arrive-above.ts';

/** The orbit's pivot rate (src/scene/camera-controls.ts EASE.pivot) and its lowest pitch (PITCH_MIN); arrive-street.test.ts holds them equal. */
export const PIVOT_RATE = 7, ORBIT_PITCH_MIN = 0.1;
/** Seconds at eye height, then seconds of the rise (at ABOVE_RATE of the usual ease). */
export const STREET_HOLD = 1.2, STREET_RISE = 1.8;
/** The venue kinds that stand on a street (src/scene/street-life/plan.ts STREET_KINDS, repeated so the maps chunk does not import the
 * gate's chunk; the test holds them equal), and the home street. */
export const STREET_PLACES: ReadonlySet<string> = new Set(['market', 'hub', 'walk', 'park', 'buka', 'statehouse', 'polling', 'quad', 'generic', 'shrine']);
export const HOME_STREET = 'neighbourhood';
/** How long the venue's arrival may wait for its scene to say where its street is (inside the venue's 0.34 s arrival fade). */
export const STREET_WAIT_MS = 220;

export interface StartPose { eye: readonly [number, number, number]; look: readonly [number, number, number] }
type Street = { pose: StartPose } | null | undefined;

/** May the arrival at this place look down a street? (the home street, or a venue of a street kind) */
export const streetCandidate = (location: string | null | undefined, kind: string | null | undefined): boolean =>
  location === HOME_STREET || (typeof kind === 'string' && STREET_PLACES.has(kind));

/** The orbit's state (yaw, tilt, zoom, pivot) that puts the camera at the pose's eye looking at its point; yaw the nearest turn to `near`. */
export function streetOrbit(orbit: Pick<Orbit, 'base'>, pose: StartPose, near = 0): { yaw: number; tilt: number; zoom: number; x: number; y: number; z: number } {
  const [ex, ey, ez] = pose.eye, [tx, ty, tz] = pose.look;
  const dx = ex - tx, dy = ey - ty, dz = ez - tz, flat = Math.hypot(dx, dz), distance = Math.hypot(flat, dy) || 1;
  const turn = Math.PI * 2, raw = Math.atan2(dx, dz) - orbit.base.azimuth;
  const yaw = raw + Math.round((near - raw) / turn) * turn;
  const pitch = Math.max(ORBIT_PITCH_MIN, Math.atan2(dy, flat));
  return { yaw, tilt: pitch - orbit.base.elevation, zoom: orbit.base.distance / distance, x: tx, y: ty, z: tz };
}

/**
 * Start the orbit at the street pose, hold, then ease to the goal. The orbit's own step() is wrapped while it runs and put back
 * afterwards (or at snap()); the frame loop is woken so the hold and the rise are drawn, and asks for no frames after.
 */
export function arriveFromStreet(orbit: Orbit, wake: () => unknown, pose: StartPose, hold = STREET_HOLD, seconds = STREET_RISE): void {
  const { now, goal } = orbit, step = orbit.step, snap = orbit.snap;
  const start = streetOrbit(orbit, pose, goal.yaw);
  now.yaw = start.yaw; now.tilt = start.tilt; now.zoom = start.zoom; now.x = start.x; now.y = start.y; now.z = start.z; now.px = 0; now.pz = 0; now.squeeze = 1;
  const asked = (): string => `${goal.yaw}|${goal.tilt}|${goal.zoom}|${goal.px}|${goal.pz}`, at = asked();
  const fromX = goal.x, fromZ = goal.z;
  let holding = Math.max(0, hold), rising = Math.max(0, seconds);
  const done = (): void => { orbit.step = step; orbit.snap = snap; };
  orbit.snap = () => { done(); snap(); };
  orbit.step = (dt) => {
    // The player turned, zoomed, slid the view or walked: the hold is over.
    if (holding > 0 && (asked() !== at || Math.hypot(goal.x - fromX, goal.z - fromZ) > 0.05)) holding = 0;
    if (holding > 0) { holding = Math.max(0, holding - dt); return true; }
    if (rising <= 0) { done(); return step(dt); }
    rising = Math.max(0, rising - dt);
    const before = { yaw: now.yaw, tilt: now.tilt, zoom: now.zoom, x: now.x, y: now.y, z: now.z };
    const moving = step(dt);
    // The angles, the pivot and the zoom again, from where they were, at the slower rate (the same thresholds as the orbit's own step).
    const turn = 1 - Math.exp(-TURN_RATE * ABOVE_RATE * dt), slide = 1 - Math.exp(-PIVOT_RATE * ABOVE_RATE * dt);
    for (const key of ['yaw', 'tilt'] as const) {
      const delta = goal[key] - before[key];
      if (delta !== 0) now[key] = Math.abs(delta) < 0.0008 ? goal[key] : before[key] + delta * turn;
    }
    for (const key of ['x', 'y', 'z'] as const) {
      const delta = goal[key] - before[key];
      if (delta !== 0) now[key] = Math.abs(delta) < 0.004 ? goal[key] : before[key] + delta * slide;
    }
    const ratio = goal.zoom / before.zoom;
    if (ratio !== 1) now.zoom = Math.abs(Math.log(ratio)) < 0.002 ? goal.zoom : before.zoom * Math.exp(Math.log(ratio) * (1 - Math.exp(-ZOOM_RATE * ABOVE_RATE * dt)));
    return moving || ['yaw', 'tilt', 'zoom', 'x', 'y', 'z'].some((key) => now[key as 'yaw'] !== goal[key as 'yaw']);
  };
  wake();
}

export interface StreetLookup {
  /** The street-scene module (dynamic import: its own chunk, already in when a scene drew its street). */
  load(): Promise<{ streetOf(place: string): Street }>
  wait?: number
  /** Resolves after a frame or so (requestAnimationFrame in the page; a timer under test). */
  tick?(): Promise<unknown>
  now?(): number
}

/**
 * The street pose for the place the dive lands at: what its scene noted, waiting at most `wait` ms for the scene to note it (it notes null
 * at once when it has no street, or the device fails street life's gate). Null: arrive from above.
 */
export async function streetArrival(place: string, lookup: StreetLookup): Promise<StartPose | null> {
  const wait = lookup.wait ?? STREET_WAIT_MS, now = lookup.now ?? (() => Date.now());
  const tick = lookup.tick ?? (() => new Promise((done) => setTimeout(done, 16)));
  const began = now();
  let module: Awaited<ReturnType<StreetLookup['load']>>;
  try { module = await lookup.load(); } catch { return null; }
  for (;;) {
    const street = module.streetOf(place);
    if (street) return street.pose;
    if (street === null || now() - began >= wait) return null;
    await tick();
  }
}
