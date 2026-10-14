/**
 * OWNER: scenes
 * The street scene kind (zoom phase 5b). Pure: no Three.js, no DOM. A STREET is one layout every street-level place shares: a
 * carriageway with two-way traffic on its country's side (traffic.ts), pavements with walking lanes, crossings with lights, shop windows
 * the browsers stop at, and the camera's start pose at a person's eye height on the pavement, looking along the street: where the map's
 * dive ends when it lands on a street (src/map3d/arrive-street.ts).
 *
 *   homeStreet()   the walkable street of the player's own row (src/scene/neighbourhood-scene.ts): the street the dive lands in when the
 *                  arrival is home. Its numbers are street/street-plan.ts Z (street-scene.test.ts holds them equal).
 *   venueStreet()  the busy street behind an open venue (src/scene/ambient/layer.ts): the three pavements the phase-2 crowd walks,
 *                  then a carriageway with its traffic and one crossing, and a far pavement.
 *
 * The registry (noteStreet / streetOf) is how a scene that has drawn its street tells the map's dive where to put the camera, without
 * either importing the other: both reach this module only by dynamic import, so it is never in the shared scene chunk or the first download.
 */
import { cityRules } from '../../game/cities/registry.ts';
import { VENUE_GROUND, venueLanes } from './plan.ts';
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

export interface StreetLayout {
  kind: typeof STREET_SCENE_KIND
  /** The place it belongs to: 'neighbourhood' for the home street, else the venue's id. */
  place: string
  side: DrivingSide
  /** The carriageway: its centre line (a → b), half its width, and the road's height. */
  axis: Axis
  half: number
  road: number
  lanes: Lane[]
  roads: Road[]
  crossings: Lane[]
  /** Draw the carriageway (a venue has no road of its own; the home street paints its own). */
  surface: boolean
  pose: StartPose
}

/** The home street's numbers (src/scene/street/street-plan.ts Z and the neighbourhood's crossings; street-scene.test.ts holds them equal). */
export const HOME = Object.freeze({ kerb: 3.0, road0: 3.25, road1: 10.5, farKerb: 10.75, pavement0: -1.45, pavement1: 14.2, crossings: [78, 10] as const, speed: 5.5 });
/** The home street's lanes are this far either side of its centre line, its vehicles HOME_NARROW as wide as elsewhere: two lanes fit
 * between the parked danfo and keke by the kerbs (neighbourhood-scene.ts PARKED). */
export const HOME_LANE_OFFSET = 0.78, HOME_NARROW = 0.8;

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

/** The walkable home street, its traffic on the country's side, with the player standing by their own gate at `ownX`. */
export function homeStreet(country: string | null | undefined, ownX: number, lanes: readonly Lane[], half: number): StreetLayout {
  const side = drivingSide(country), mid = (HOME.road0 + HOME.road1) / 2;
  const axis: Axis = { ax: -half, az: mid, bx: half, bz: mid };
  const crossings = HOME.crossings.map((x) => ({ ax: x, az: HOME.kerb - 0.35, bx: x, bz: HOME.farKerb + 0.35, width: 2.4 }));
  // The eye on the near pavement by the gates (clear of the walkers by the kerb), a little back from the player's gate, looking up the street.
  const along = Math.max(4, Math.min(2 * half - LOOK_AHEAD - 4, ownX + half - 9));
  return {
    kind: STREET_SCENE_KIND, place: 'neighbourhood', side, axis, half: (HOME.road1 - HOME.road0) / 2, road: 0,
    lanes: [...lanes], roads: twoWayRoads(axis, side, HOME_LANE_OFFSET, HOME.speed), crossings, surface: false,
    pose: poseAlong(axis, along, HOME.pavement0 + 0.9 - mid, HOME.road0 + 0.2 - mid, 0.05),
  };
}

/** Behind a venue: how far beyond the walk bounds' far edge the carriageway's centre lies, half its width, and its lanes' offset. */
export const VENUE_ROAD = Object.freeze({ centre: 11.6, half: 2.7, offset: 1.3, speed: 5, reach: 12 });

/** The street behind an open venue (bounds: the walk grid's [minX, minZ, maxX, maxZ]): the phase-2 pavements, a road, a far pavement. */
export function venueStreet(place: string, country: string | null | undefined, bounds: readonly [number, number, number, number], open: boolean): StreetLayout {
  const [x0, z0, x1] = bounds, side = drivingSide(country), reach = VENUE_ROAD.reach, z = z0 - VENUE_ROAD.centre;
  const axis: Axis = { ax: x0 - reach, az: z, bx: x1 + reach, bz: z };
  const near = z + VENUE_ROAD.half, far = z - VENUE_ROAD.half;
  const lanes = [...venueLanes(bounds, open), { ax: x0 - 16, az: far - 1.6, bx: x1 + 16, bz: far - 1.6, width: 1.8 }];
  const cx = (x0 + x1) / 2 + Math.min(6, (x1 - x0) / 4);
  const crossings: Lane[] = [{ ax: cx, az: near + 0.45, bx: cx, bz: far - 0.45, width: 2.4 }];
  // The eye on the pavement between the phase-2 lanes at z0 − 4.6 and z0 − 7.6 (nobody walks through it), near the street's start, looking up it.
  return {
    kind: STREET_SCENE_KIND, place, side, axis, half: VENUE_ROAD.half, road: VENUE_GROUND,
    lanes, roads: twoWayRoads(axis, side, VENUE_ROAD.offset, VENUE_ROAD.speed), crossings, surface: true,
    pose: poseAlong(axis, reach - 8, (z0 - 6) - z, VENUE_ROAD.half - 0.5, VENUE_GROUND),
  };
}

/** A city's country id (the street's driving side, liveries and flavour), or null for a city not loaded. */
export function countryOf(cityId: string): string | null {
  try { return cityRules(cityId)?.country.id ?? null; } catch { return null; }
}

// ---- the registry ------------------------------------------------------------------------------------------------------------------

const streets = new Map<string, StreetLayout | null>();
/** A scene says what street it drew (null: none here, on this device). */
export function noteStreet(place: string, layout: StreetLayout | null): void { streets.set(place, layout); }
/** The scene went: forget its street (only if it is still the one noted). */
export function forgetStreet(place: string, layout: StreetLayout | null): void { if (streets.get(place) === layout) streets.delete(place); }
/** The street noted for a place: a layout, null (noted as none), undefined (nothing noted yet). */
export const streetOf = (place: string): StreetLayout | null | undefined => streets.get(place);
