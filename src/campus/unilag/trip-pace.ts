/**
 * How fast the avatar walks when the player picks a far landmark (a spot tap or "Walk there").
 * The campus is about 2.3 km across and the avatar walks at ~1.1 m/s, so a straight walk to Senate House
 * or the Library took 20+ minutes and nobody saw it arrive. A tapped trip therefore speeds up so it takes
 * at most TRIP_SECONDS; keyboard and joystick walking keep the ordinary pace.
 */
export const TRIP_SECONDS = 40;
export const TRIP_MAX_SPEED = 32;

/** Metres per second for a trip of `distance` metres, never slower than the ordinary pace. */
export function tripPace(distance: number, basePace: number): number {
  if (!Number.isFinite(distance) || distance <= 0) return basePace;
  return Math.max(basePace, Math.min(TRIP_MAX_SPEED, distance / TRIP_SECONDS));
}
