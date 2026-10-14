/**
 * OWNER: world
 * The small houses of the Neighbours layer (src/map3d/overlays.ts): their size and where they stand on an estate.
 * Pure numbers, no Three.js, so a test can hold the size of a house against the size of the player's piece (./actor.ts).
 *
 * A house of the layer stands HOME_SCALE times the unit house it is drawn from (a box 1.7 × 1.2 × 1.9 under a 0.75 roof), so it
 * reads as a house beside a person: about 1.7 times the height of the piece at its usual size. Its grid pitch is scaled the same, so
 * a house keeps the gap it always had to the next one. The estate's footprint stays what each pack gave it (the pack's x, z, cols and
 * max, `estateBox`): along a row the estate has the width of the pack's estate, down the rows the depth its homes took; a bigger house
 * means fewer of them on that ground, never more ground.
 */
import type { PackEstate } from './types.ts';

/** The unit house, as drawn in overlays.ts (map units). */
export const HOME_UNIT = { width: 1.7, depth: 1.9, wall: 1.2, ridge: 1.875, windowY: 0.68, windowZ: 0.96 } as const;
/** How much bigger than the unit house a house of the layer is drawn. */
export const HOME_SCALE = 2.2;
/** The height of a house of the layer, from the ground to the top of its roof. */
export const HOME_RIDGE = HOME_UNIT.ridge * HOME_SCALE;
/** The gap between the centres of neighbouring houses: the unit grid's 2.7 and 3.0, scaled with the house. */
export const HOME_PITCH_X = 2.7 * HOME_SCALE, HOME_PITCH_Z = 3.0 * HOME_SCALE;
/** An estate shown without a `max` holds this many houses at most. */
export const HOUSES_PER_ESTATE = 18;
/** How far a house's walls were kept from the estate's outer centres: the clearance the fabric keeps round an estate's box. */
const MARGIN = 1.6;

/** How many houses an estate may show at most. */
export const estateMax = (estate: PackEstate): number => estate.max ?? HOUSES_PER_ESTATE;

/**
 * The ground an estate's houses have always covered: from its first house's centre to its last (at the unit grid), and MARGIN round that.
 * With no `count` it is the ground of a full estate (`max` houses), which is what the city's fabric keeps clear; with a `count` it is the
 * ground that many houses took, which is as much as the bigger houses may take now.
 */
export function estateBox(estate: PackEstate, count: number = estateMax(estate)): [number, number, number, number] {
  const shown = Math.max(1, Math.min(count, estateMax(estate))), across = Math.min(shown, estate.cols), rows = Math.ceil(shown / estate.cols);
  return [estate.x - MARGIN, estate.z - MARGIN, estate.x + (across - 1) * 2.7 + MARGIN, estate.z + (rows - 1) * 3 + MARGIN];
}

export interface HomeGrid {
  /** Houses across, rows down, and how many fit: the most that may be drawn. */
  cols: number; rows: number; cap: number
  /** The centre of the houses that fill the grid (all `cap` of them), where the estate's chip goes. */
  centre: { x: number; z: number }
  /** The centre of house i (row by row). */
  at(i: number): { x: number; z: number }
}

/**
 * Lay out the houses of an estate that has `count` homes: the grid of scaled houses that fits inside the ground those homes took
 * before (estateBox), anchored at its north-west corner; at least one house.
 */
export function homeGrid(estate: PackEstate, count: number = estateMax(estate)): HomeGrid {
  // Along the row the estate has all the width its pack gave it; down the rows only the depth its homes took (the rest is kept clear of the city's fabric, but venues and roads may stand there).
  const [x0, , x1] = estateBox(estate), [, z0, , z1] = estateBox(estate, count), width = x1 - x0, depth = z1 - z0;
  const fit = (room: number, house: number, pitch: number) => Math.max(1, Math.floor((room - house) / pitch) + 1);
  const want = Math.max(1, Math.min(count, estateMax(estate)));
  const cols = Math.min(estate.cols, fit(width, HOME_UNIT.width * HOME_SCALE, HOME_PITCH_X));
  const rows = Math.min(Math.ceil(want / estate.cols), fit(depth, HOME_UNIT.depth * HOME_SCALE, HOME_PITCH_Z));
  const cap = Math.min(want, cols * rows);
  // The first house keeps the corner the first one always had (the north-west of the box, where a pack puts its estate beside a home or a venue) and the rest run east and south from it.
  const halfW = (HOME_UNIT.width * HOME_SCALE) / 2, halfD = (HOME_UNIT.depth * HOME_SCALE) / 2;
  const left = x0 + Math.min(halfW, width / 2), top = z0 + Math.min(halfD, depth / 2);   // ground thinner than a house: the house stands in the middle of it
  return { cols, rows, cap, centre: { x: left + ((Math.min(cols, cap) - 1) * HOME_PITCH_X) / 2, z: top + ((Math.ceil(cap / cols) - 1) * HOME_PITCH_Z) / 2 }, at: (i) => ({ x: left + (i % cols) * HOME_PITCH_X, z: top + Math.floor(i / cols) * HOME_PITCH_Z }) };
}
