/**
 * OWNER: world
 * The small houses of the Neighbours layer (src/map3d/overlays.ts): their size and where they stand on an estate.
 * Pure numbers, no Three.js, so a test can hold the size of a house against the size of the player's piece (./actor.ts).
 *
 * A house of the layer stands HOME_SCALE times the unit house it is drawn from (a box 1.7 × 1.2 × 1.9 under a 0.75 roof), so it
 * reads as a house beside a person: about 1.7 times the height of the piece at its usual size. Its grid pitch is scaled the same, so
 * a house keeps the gap it always had to the next one. The estate's footprint stays what each pack gave it (the pack's x, z, cols and
 * max: the box the city's fabric keeps clear, `estateBox`); a bigger house means fewer of them in that box, never a bigger box.
 */
import type { PackEstate } from './types.ts';

/** The unit house, as drawn in overlays.ts (map units). */
export const HOME_UNIT = { width: 1.7, depth: 1.9, wall: 1.2, ridge: 1.875, windowY: 0.68, windowZ: 0.96 } as const;
/** How much bigger than the unit house a house of the layer is drawn. */
export const HOME_SCALE = 2.3;
/** The height of a house of the layer, from the ground to the top of its roof. */
export const HOME_RIDGE = HOME_UNIT.ridge * HOME_SCALE;
/** The gap between the centres of neighbouring houses: the unit grid's 2.7 and 3.0, scaled with the house. */
export const HOME_PITCH_X = 2.7 * HOME_SCALE, HOME_PITCH_Z = 3.0 * HOME_SCALE;
/** An estate shown without a `max` holds this many houses at most. */
export const HOUSES_PER_ESTATE = 18;
/** How far a house's walls were kept from the estate's outer centres: the clearance the fabric keeps round an estate's box. */
const MARGIN = 1.6;

/** The ground an estate has always held: from its first house's centre to its last (at the unit grid), and MARGIN round that. */
export function estateBox(estate: PackEstate): [number, number, number, number] {
  const rows = Math.ceil((estate.max ?? HOUSES_PER_ESTATE) / estate.cols);
  return [estate.x - MARGIN, estate.z - MARGIN, estate.x + (estate.cols - 1) * 2.7 + MARGIN, estate.z + (rows - 1) * 3 + MARGIN];
}

export interface HomeGrid {
  /** Houses across, rows down, and how many fit: the most that may be drawn. */
  cols: number; rows: number; cap: number
  /** The centre of the grid, where the estate's chip goes. */
  centre: { x: number; z: number }
  /** The centre of house i (row by row). */
  at(i: number): { x: number; z: number }
}

/** Lay out the houses of an estate: the grid of scaled houses that fits inside the estate's box, centred in it, at least one house. */
export function homeGrid(estate: PackEstate): HomeGrid {
  const [x0, z0, x1, z1] = estateBox(estate), width = x1 - x0, depth = z1 - z0;
  const fit = (room: number, house: number, pitch: number) => Math.max(1, Math.floor((room - house) / pitch) + 1);
  const cols = Math.min(estate.cols, fit(width, HOME_UNIT.width * HOME_SCALE, HOME_PITCH_X));
  const rowsAsked = Math.ceil((estate.max ?? HOUSES_PER_ESTATE) / estate.cols);
  const rows = Math.min(rowsAsked, fit(depth, HOME_UNIT.depth * HOME_SCALE, HOME_PITCH_Z));
  const cap = Math.min(estate.max ?? HOUSES_PER_ESTATE, cols * rows);
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const left = cx - ((cols - 1) * HOME_PITCH_X) / 2, top = cz - ((rows - 1) * HOME_PITCH_Z) / 2;
  return { cols, rows, cap, centre: { x: cx, z: cz }, at: (i) => ({ x: left + (i % cols) * HOME_PITCH_X, z: top + Math.floor(i / cols) * HOME_PITCH_Z }) };
}
