/**
 * OWNER: scenes
 * The street scene kind (zoom phase 5b). Pure: no Three.js, no DOM. A STREET is one layout every street-level place shares: a
 * carriageway with two-way traffic on its country's side (traffic.ts), pavements with walking lanes, crossings with lights, shop windows
 * the browsers stop at, and the camera's start pose at a person's eye height on the pavement, looking along the street: where the map's
 * dive ends when it lands on a street (src/map3d/arrive-street.ts).
 *
 *   homeStreet()   the walkable street of the player's own row (src/scene/neighbourhood-scene.ts): the street the dive lands in when the
 *                  arrival is home. Its numbers are street/street-plan.ts Z (street-scene.test.ts holds them equal).
 *   fitStreet()    the final guard: a street is used only when every lane, road, crossing and the start pose lie inside the scene's
 *                  walkable bounds (and the eye stands on a walkable cell); otherwise there is none (null). Venue scenes get no street
 *                  of their own: there is no room for one inside a venue's floor, so their dive ends from above as before.
 *
 * The registry (noteStreet / streetOf) is how a scene that has drawn its street tells the map's dive where to put the camera, without
 * either importing the other: both reach this module only by dynamic import, so it is never in the shared scene chunk or the first download.
 */
import type { Lane, Road } from './plan.ts';
import { drivingSide, twoWayRoads } from './traffic.ts';
import type { Axis, DrivingSide } from './traffic.ts';

export const STREET_SCENE_KIND = 'street';
/** Scene units to the metre (a scene person, about 1.75 m, is about 2.6 units tall), and the eye height the street camera starts at. */
export const UNITS_PER_METRE = 1.5, EYE_METRES = 1.7;
export const EYE_UNITS = UNITS_PER_METRE * EYE_METRES;
/** How far ahead along the street the start pose looks. */
export const LOOK_AHEAD = 22;

/** Where the camera starts: the eye, and the point it looks at. */
export interface StartPose { eye: readonly [number, number, number]; look: readonly [number, number, number] }
/** A scene's walkable rectangle: [minX, minZ, maxX, maxZ] (a walk grid's bounds). */
export type Bounds = readonly [number, number, number, number];

export interface StreetLayout {
  kind: typeof STREET_SCENE_KIND
  /** The place it belongs to: 'neighbourhood' for the home street. */
  place: string
  side: DrivingSide
  /** The carriageway: its centre line (a → b), half its width, and the road's height. */
  axis: Axis
  half: number
  road: number
  lanes: Lane[]
  roads: Road[]
  crossings: Lane[]
  /** The walkable bounds everything above was checked against (fitStreet). */
  bounds: Bounds
  /** Null when the eye would not stand inside the bounds on a walkable cell: then the dive ends from above. */
  pose: StartPose | null
}

/** The home street's numbers (src/scene/street/street-plan.ts Z and the neighbourhood's crossings; street-scene.test.ts holds them equal). */
export const HOME = Object.freeze({ kerb: 3.0, road0: 3.25, road1: 10.5, farKerb: 10.75, pavement0: -1.45, pavement1: 14.2, crossings: [78, 10] as const, speed: 5.5 });
/** The home street's lanes are this far either side of its centre line, its vehicles HOME_NARROW as wide as elsewhere: two lanes fit
 * between the parked danfo and keke by the kerbs (neighbourhood-scene.ts PARKED). */
export const HOME_LANE_OFFSET = 0.78, HOME_NARROW = 0.8;
/** Half the widest vehicle on the home street (a full car is 1.8 wide), kept inside the bounds. */
const VEHICLE_HALF = 0.9;

/**
 * A pose at eye height on the line `line` (an offset across the axis toward (−uz, ux)) at `along`, looking `ahead` along the street at a
 * point on the line `onto` (the near edge of the road), on the ground.
 */
export function poseAlong(axis: Axis, along: number, line: number, onto: number, ground: number, ahead = LOOK_AHEAD): StartPose {
  const length = Math.hypot(axis.bx - axis.ax, axis.bz - axis.az) || 1, ux = (axis.bx - axis.ax) / length, uz = (axis.bz - axis.az) / length;
  const at = (a: number, c: number): [number, number] => [axis.ax + ux * a - uz * c, axis.az + uz * a + ux * c];
  const [ex, ez] = at(along, line), [lx, lz] = at(along + ahead, onto);
  return { eye: [ex, ground + EYE_UNITS, ez], look: [lx, ground, lz] };
}

/** The walkable home street, its traffic on the country's side, with the player standing by their own gate at `ownX`. Not yet guarded: see fitStreet. */
export function homeStreet(country: string | null | undefined, ownX: number, lanes: readonly Lane[], half: number, bounds: Bounds): StreetLayout {
  const side = drivingSide(country), mid = (HOME.road0 + HOME.road1) / 2;
  const axis: Axis = { ax: -half, az: mid, bx: half, bz: mid };
  const crossings = HOME.crossings.map((x) => ({ ax: x, az: HOME.kerb - 0.35, bx: x, bz: HOME.farKerb + 0.35, width: 2.4 }));
  // The eye on the near pavement by the gates (clear of the walkers by the kerb), a little back from the player's gate, looking up the street.
  const along = Math.max(4, Math.min(2 * half - LOOK_AHEAD - 4, ownX + half - 9));
  return {
    kind: STREET_SCENE_KIND, place: 'neighbourhood', side, axis, half: (HOME.road1 - HOME.road0) / 2, road: 0,
    lanes: [...lanes], roads: twoWayRoads(axis, side, HOME_LANE_OFFSET, HOME.speed), crossings, bounds,
    pose: poseAlong(axis, along, HOME.pavement0 + 0.9 - mid, HOME.road0 + 0.2 - mid, 0.05),
  };
}

// ---- the guard ---------------------------------------------------------------------------------------------------------------------

/** Is (x, z) inside the bounds, `margin` in from every edge? Non-finite points never are. */
export function inBounds(bounds: Bounds, x: number, z: number, margin = 0): boolean {
  return Number.isFinite(x) && Number.isFinite(z) && x >= bounds[0] + margin && x <= bounds[2] - margin && z >= bounds[1] + margin && z <= bounds[3] - margin;
}

/**
 * The final guard before a street is used: every lane (both ends, across its whole width), every road (both ends, a vehicle's half width
 * either side), every crossing, and the pose's eye and look point inside the scene's walkable bounds. Null when anything is outside (no
 * street: today's scene). The pose alone goes (null) when its eye is not on a walkable cell (`free`, the walk grid's test).
 */
export function fitStreet(layout: StreetLayout, free?: (x: number, z: number) => boolean): StreetLayout | null {
  const b = layout.bounds, band = (l: { ax: number; az: number; bx: number; bz: number }, w: number): boolean => {
    const length = Math.hypot(l.bx - l.ax, l.bz - l.az) || 1, cx = -(l.bz - l.az) / length * w, cz = (l.bx - l.ax) / length * w;
    return [[l.ax, l.az], [l.bx, l.bz]].every(([x, z]) => inBounds(b, x! + cx, z! + cz) && inBounds(b, x! - cx, z! - cz));
  };
  if (!layout.lanes.every((lane) => band(lane, lane.width / 2))) return null;
  if (!layout.crossings.every((lane) => band(lane, lane.width / 2))) return null;
  if (!layout.roads.every((road) => band(road, VEHICLE_HALF))) return null;
  const pose = layout.pose;
  const posed = pose && inBounds(b, pose.eye[0], pose.eye[2]) && inBounds(b, pose.look[0], pose.look[2]) && Number.isFinite(pose.eye[1] + pose.look[1])
    && (!free || free(pose.eye[0], pose.eye[2])) ? pose : null;
  return posed === pose ? layout : { ...layout, pose: posed };
}

// ---- the registry ------------------------------------------------------------------------------------------------------------------

const streets = new Map<string, StreetLayout | null>();
/** A scene says what street it drew (null: none here, on this device). */
export function noteStreet(place: string, layout: StreetLayout | null): void { streets.set(place, layout); }
/** The scene went: forget its street (only if it is still the one noted). */
export function forgetStreet(place: string, layout: StreetLayout | null): void { if (streets.get(place) === layout) streets.delete(place); }
/** The street noted for a place: a layout, null (noted as none), undefined (nothing noted yet). */
export const streetOf = (place: string): StreetLayout | null | undefined => streets.get(place);
