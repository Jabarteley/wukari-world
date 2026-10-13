/**
 * What a tapped trip across the campus should do. Pure, so it is tested without a browser.
 *   under 60 m          walk
 *   60 to 150 m         jog
 *   over 150 m          ask: walk (with its honest time), the campus shuttle, or "Go there" (a short fade)
 * The campus is ~2.3 km across and the avatar walks ~1.1 m/s, so the honest walk to Senate House is 20+ minutes.
 */
import { SHUTTLE_FEE, SHUTTLE_STOPS } from './shuttle.ts';
import { ANCHORS } from './layout.ts';

export const JOG_FROM = 60;
export const CHOOSE_FROM = 150;
/** A route is longer than the straight line. */
export const ROUTE_FACTOR = 1.35;

export interface Point { x: number; z: number }
export type TripKind = 'walk' | 'jog' | 'choose';
export const tripKind = (distance: number): TripKind => !(distance >= JOG_FROM) ? 'walk' : distance < CHOOSE_FROM ? 'jog' : 'choose';

/** "12 min" / "45 s": the duration of walking `distance` metres in a straight-ish route at `pace` m/s. */
export function walkTime(distance: number, pace: number): string {
  const seconds = Math.max(1, Math.round(distance * ROUTE_FACTOR / Math.max(.1, pace)));
  return seconds < 90 ? `${seconds} s` : `${Math.round(seconds / 60)} min`;
}

export interface ShuttlePlan { board: string; boardLabel: string; alight: string; alightLabel: string; fare: number; boardDistance: number; alightDistance: number }
const near = (to: Point, skip?: string) => SHUTTLE_STOPS.filter((s) => s.id !== skip).map((s) => ({ stop: s, d: Math.hypot(s.anchor.x - to.x, s.anchor.z - to.z) })).sort((a, b) => a.d - b.d)[0] ?? null;

/**
 * Board at the stop nearest the avatar and ride to the stop nearest the destination. Offered only when it
 * really saves walking: the ride must end clearly closer to the destination than the avatar is now.
 */
export function shuttlePlan(from: Point, to: Point): ShuttlePlan | null {
  const board = near(from), alight = near(to);
  if (!board || !alight || board.stop.id === alight.stop.id) return null;
  const direct = Math.hypot(to.x - from.x, to.z - from.z);
  if (alight.d > direct * .5 || board.d > 400) return null;
  return { board: board.stop.id, boardLabel: board.stop.label, alight: alight.stop.id, alightLabel: alight.stop.label, fare: SHUTTLE_FEE, boardDistance: board.d, alightDistance: alight.d };
}

export interface TripOption { id: 'walk' | 'shuttle' | 'go'; label: string; note: string }
/** The sheet's choices, in order. "Go there" is always last and always available. */
export function tripOptions(from: Point, spotId: string, pace: number): TripOption[] {
  const anchor = ANCHORS[spotId];
  if (!anchor) return [];
  const distance = Math.hypot(anchor.x - from.x, anchor.z - from.z), plan = shuttlePlan(from, anchor);
  return [
    { id: 'walk', label: `Walk (${walkTime(distance, pace)})`, note: 'See the campus on the way' },
    ...(plan ? [{ id: 'shuttle' as const, label: 'Take the campus shuttle', note: `To ${plan.alightLabel} · ₦${plan.fare}` }] : []),
    { id: 'go', label: 'Go there', note: 'Instant' },
  ];
}
