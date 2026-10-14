/**
 * OWNER: world
 * The end of the map's dive (./dive.ts): the venue scene's camera starts high above, nearly straight down and pulled back, and comes
 * down to the scene's composed view more slowly than an ordinary ease (ABOVE_RATE of it, for `seconds`). The goal is not touched, so
 * nothing the player asked for is lost, and snap() (reduced motion, a new venue) ends it at once.
 *
 * It lives here, in the maps' lazy chunk, not in the shared scene chunk: it works on the orbit's public state (src/scene/camera-controls.ts)
 * through the handle the venue host gives out (venue-world.ts `motion()`), wrapping the orbit's step() for as long as it runs and putting
 * the orbit back as it was afterwards. Only the two angles and the zoom are eased slower; everything else steps as usual.
 */
import type { Orbit } from '../scene/camera-controls.ts';

/** The orbit's own limits and rates (src/scene/camera-controls.ts: PITCH_MAX, EASE.turn, EASE.zoom); ./arrive-above.test.ts holds them equal. */
export const ORBIT_PITCH_MAX = Math.PI / 2 - 0.07, TURN_RATE = 18, ZOOM_RATE = 11;
/** How far back the camera starts (a share of the farthest zoom), and how much slower than usual it comes down. */
export const ABOVE_PULL = 0.7, ABOVE_RATE = 0.25;

export function arriveFromAbove(orbit: Orbit, wake: () => unknown, seconds = 0.9): void {
  const { now, goal, base, limits } = orbit, step = orbit.step, snap = orbit.snap;
  now.tilt = ORBIT_PITCH_MAX - base.elevation;
  now.zoom = Math.min(goal.zoom, limits.zoomMin) * ABOVE_PULL;
  let gliding = Math.max(0, seconds);
  const done = (): void => { orbit.step = step; orbit.snap = snap; };
  orbit.snap = () => { done(); snap(); };
  orbit.step = (dt) => {
    if (gliding <= 0) { done(); return step(dt); }
    gliding = Math.max(0, gliding - dt);
    const yaw = now.yaw, tilt = now.tilt, zoom = now.zoom;
    const moving = step(dt);
    // The angles and the zoom again, from where they were, at the slower rate (the same thresholds as the orbit's own step).
    const turn = 1 - Math.exp(-TURN_RATE * ABOVE_RATE * dt);
    for (const [key, from] of [['yaw', yaw], ['tilt', tilt]] as const) {
      const delta = goal[key] - from;
      if (delta !== 0) now[key] = Math.abs(delta) < 0.0008 ? goal[key] : from + delta * turn;
    }
    const ratio = goal.zoom / zoom;
    if (ratio !== 1) now.zoom = Math.abs(Math.log(ratio)) < 0.002 ? goal.zoom : zoom * Math.exp(Math.log(ratio) * (1 - Math.exp(-ZOOM_RATE * ABOVE_RATE * dt)));
    return moving || now.yaw !== goal.yaw || now.tilt !== goal.tilt || now.zoom !== goal.zoom;
  };
  wake();
}
