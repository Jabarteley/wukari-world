/**
 * OWNER: world
 * WHERE EVERY HOUSE STANDS — computed from the city pack alone.
 *
 * A local government has 512 estates of 14 streets × 14 plots (src/game/content/world.ts). The
 * server hands out addresses (`lga/estate/street/plot`) and never positions; this file turns an
 * address into a point on the map, the same way on every device and in both maps, so a street of
 * houses can be drawn without fetching anything about the houses that are not there.
 *
 *   estateLayout(pack, lgaId) → { id, size, front, cells: [{ x, z, size }] × 512, pitch(estate), plot(estate, plot) → { x, z }, estateAt(x, z) }
 *     Estate 1 is one big square near the name plate (`front` units a side): the first 196
 *     residents live where their houses can be seen from across the district. The other 511 are
 *     a square lattice just fine enough (`size` a side) that every one lies wholly on the local
 *     government's buildable land — clear of the venues, the home lots, the coming-soon zones and
 *     the roads — numbered outwards from the first, so the growing edge spreads from the middle.
 *     A tiny country (the Vatican) that cannot hold 512 has `layout.count` < 512 estates, all on one lattice (see TINY_FLOOR); everywhere else count is 512.
 *   plotAt(layout, x, z)      → { estate, plot } under the point, or null
 * Pure maths: no Three.js, no DOM. Layouts are cached per pack.
 */
import { ESTATE } from '../game/content/world.ts';
import { inLga, landOf, partsOf, scanRings } from './lga.ts';
import type { CityPack, PackLga, Rect, XZ } from './types.ts';

/** One estate's square on the map: its centre and its side. */
export interface EstateCell { x: number; z: number; size: number }
/** Where every house of one local government stands; see the header. */
export interface EstateLayout {
  id: string
  /** The side of the compact estates' lattice. */
  size: number
  /** The side of the first, big estate. */
  front: number
  /** The squares of the estates, the first (the show estate) at index 0; 512 of them, fewer only on a tiny island (see TINY_FLOOR). */
  cells: EstateCell[]
  /** How many estates there are: `cells.length` (ESTATE.estates unless the land is tiny). Addresses beyond it are drawn on the last estate. */
  count: number
  /** The distance between two plots of an estate. */
  pitch: (estate: number) => number
  /** Where a plot is: streets run west–east, street 1 at the north side; plots count from the west. */
  plot: (estate: number, plot: number) => XZ
  /** The estate whose square contains the point, or -1. */
  estateAt: (x: number, z: number) => number
}
/** An address on the map: an estate and a plot of it (plot -1 on the verge of an estate). */
export interface PlotRef { estate: number; plot: number }
interface Grid { width: number; height: number; owner: Uint8Array; x0: number; z0: number }
type Sampler = (x: number, z: number) => boolean;

const cache = new WeakMap<CityPack, Map<string, EstateLayout>>();
const FRONT = 15;            // the side of a local government's first estate, where the land allows
/**
 * How small the squares may get before a local government is refused. Searching goes from big to small and stops at the first square that
 * fits, so a government that already fitted keeps exactly its layout; the lower floors only matter for a very small or narrow island
 * (a coral atoll such as Funafuti, whose land is a strip a few hundred metres wide), which used to throw "no room for its first estate".
 */
const FRONT_FLOOR = 1.2, LATTICE_FLOOR = 0.15;
/**
 * A compact microstate (the Vatican: land of about 11 × 7 map units, of which the venues' lots and the roads leave about 5 units² free) cannot hold 512 estates
 * at any square a house can be drawn in, because the map draws a fixed 10 units to the kilometre. Only land that is not a strip (both sides at least
 * TINY_SPAN units, so a thin strip is still refused as before) and that failed the ordinary search may use the tiny search: the squares go down to TINY_FLOOR and the
 * local government gets as many estates as fit, at least MIN_ESTATES (the show estate and seven more: 1,568 plots). The count is `layout.count`.
 */
const TINY_SPAN = 3, TINY_START = 2, TINY_FLOOR = 0.3, MIN_ESTATES = 8;
const FILL = 0.9;            // the share of an estate's square its plots cover (the rest is the verge between estates)

const SCALE = 4;             // cells of the buildable-land grid per map unit
/** Half the side, in map units, of the square a venue's or home's landmark keeps clear of estates. */
export const SITE_CLEAR = 1.2;
/** Half the width of the verge a ground road keeps clear of estates: its half width (scaled by the pack's roadScale) and a margin. */
export const roadClear = (pack: CityPack, major: boolean | undefined) => ((major ? 1.25 : 0.9) * (pack.roadScale ?? 1)) + 0.3;
const grids = new WeakMap<CityPack, Grid>();
/**
 * The city as a grid: for every quarter-unit cell, the local government it belongs to if a house
 * may stand there (0 otherwise: water, sand, a venue's lot, a coming-soon zone, a road). Built once
 * per pack with scan-line fills, so laying out twenty local governments costs milliseconds.
 */
function gridOf(pack: CityPack): Grid {
  if (grids.has(pack)) return grids.get(pack)!;
  const steps = gridSteps(pack);
  for (;;) { const step = steps.next(); if (step.done) return step.value; }
}
/** gridOf in steps: paused (`yield`) between the local governments and every few roads, for a caller that gives the browser a turn between them (./warm.ts). */
export function* gridSteps(pack: CityPack): Generator<void, Grid, void> {
  if (grids.has(pack)) return grids.get(pack)!;
  const { minX, maxX, minZ, maxZ } = pack.bounds, cell = 1 / SCALE;
  const width = Math.ceil((maxX - minX) * SCALE), height = Math.ceil((maxZ - minZ) * SCALE);
  const owner = new Uint8Array(width * height);
  const paint = (target: Uint8Array, value: number) => (row: number, from: number, to: number) => target.fill(value, row * width + from, row * width + to + 1);
  // An exact pack's land is its boundaries themselves; any other pack's boundaries are clipped to its land.
  const lands = landOf(pack).filter((entry) => entry.kind !== 'sand');
  const land = pack.land.every((entry) => entry.exact) ? null : new Uint8Array(width * height);
  if (land) for (const entry of lands) scanRings([entry.polygon, ...(entry.holes || [])], minX, minZ, cell, width, height, paint(land, 1));
  for (const [index, lga] of pack.lgas.entries()) { yield; for (const part of partsOf(lga)) scanRings(part, minX, minZ, cell, width, height, (row, from, to) => { for (let i = row * width + from; i <= row * width + to; i++) if ((!land || land[i]) && !owner[i]) owner[i] = index + 1; }); }
  const clear = (x0: number, z0: number, x1: number, z1: number) => scanRings([[[x0, z0], [x1, z0], [x1, z1], [x0, z1]]], minX, minZ, cell, width, height, paint(owner, 0));
  for (const zone of pack.zones || []) clear(zone[0], zone[1], zone[2], zone[3]);
  for (const spot of [...Object.values<XZ>(pack.sites || {}), ...Object.values<XZ>(pack.homes || {})]) clear(spot.x - SITE_CLEAR, spot.z - SITE_CLEAR, spot.x + SITE_CLEAR, spot.z + SITE_CLEAR);
  let roadsDone = 0;
  for (const road of pack.roads || []) {
    if (++roadsDone % 40 === 0) yield;
    if (road.bridge) continue;
    const half = roadClear(pack, road.major);
    for (let i = 1; i < road.points.length; i++) {
      const [ax, az] = road.points[i - 1]!, [bx, bz] = road.points[i]!, length = Math.hypot(bx - ax, bz - az) || 1, nx = (-(bz - az) / length) * half, nz = ((bx - ax) / length) * half;
      const ex = ((bx - ax) / length) * half, ez = ((bz - az) / length) * half;
      scanRings([[[ax - ex + nx, az - ez + nz], [bx + ex + nx, bz + ez + nz], [bx + ex - nx, bz + ez - nz], [ax - ex - nx, az - ez - nz]]], minX, minZ, cell, width, height, paint(owner, 0));
    }
  }
  const grid = { width, height, owner, x0: minX, z0: minZ };
  grids.set(pack, grid);
  return grid;
}

const sampler = (grid: Grid, id: number): Sampler => (x: number, z: number) => { const col = Math.floor((x - grid.x0) * SCALE), row = Math.floor((z - grid.z0) * SCALE); return col >= 0 && row >= 0 && col < grid.width && row < grid.height && grid.owner[row * grid.width + col] === id; };
/** Is the whole square (centre x, z; side `size`) this local government's buildable land? */
function squareFree(mine: Sampler, x: number, z: number, size: number): boolean {
  const steps = Math.max(2, Math.ceil(size * SCALE)), inset = (size / 2) * 0.96;
  for (let i = 0; i <= steps; i++) for (let j = 0; j <= steps; j++) if (!mine(x - inset + (2 * inset * i) / steps, z - inset + (2 * inset * j) / steps)) return false;
  return true;
}
/**
 * The grid answers to a quarter of a unit; a small local government's estates are not much bigger, so the grid's
 * answer is confirmed against the real boundary itself: a 7 × 7 lattice over the square the plots cover (only for a square within a unit of an edge).
 */
function insideBoundary(lga: PackLga, mine: Sampler, x: number, z: number, size: number): boolean {
  if (squareFree(mine, x, z, size + 1)) return true;   // well clear of every edge: the grid's answer stands
  const half = (size * FILL) / 2;
  for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) if (!inLga(lga, x - half + (half * i) / 3, z - half + (half * j) / 3)) return false;
  return true;
}
const boundsOf = (lga: PackLga): Rect => {
  const box = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const part of partsOf(lga)) for (const point of part[0]!) { box.minX = Math.min(box.minX, point[0]); box.maxX = Math.max(box.maxX, point[0]); box.minZ = Math.min(box.minZ, point[1]); box.maxZ = Math.max(box.maxZ, point[1]); }
  return box;
};

/**
 * ESTATE 1 IS THE SHOW ESTATE: one big square near the name plate, where the first 196 residents
 * live in houses large enough to be seen from a street away. It is as big as the land allows
 * (up to FRONT units a side). The other 511 estates are the compact lattice around it.
 */
function frontFor(lga: PackLga, mine: Sampler, floor = FRONT_FLOOR, from = FRONT): EstateCell | null {
  const { minX, maxX, minZ, maxZ } = boundsOf(lga), [px, pz] = lga.plate;
  for (let size = from; size >= floor; size *= 0.9) {
    let best: { x: number; z: number; size: number; far: number } | null = null;
    for (let z = minZ + size / 2; z <= maxZ - size / 2; z += size / 4) for (let x = minX + size / 2; x <= maxX - size / 2; x += size / 4) {
      const far = Math.hypot(x - px, z - pz);
      if ((!best || far < best.far) && squareFree(mine, x, z, size) && insideBoundary(lga, mine, x, z, size)) best = { x, z, size, far };
    }
    if (best) return { x: best.x, z: best.z, size: best.size };
  }
  return null;
}
function cellsFor(lga: PackLga, size: number, mine: Sampler, front: EstateCell | null, want: number): EstateCell[] | null {
  const { minX, maxX, minZ, maxZ } = boundsOf(lga), half = size / 2, cells: EstateCell[] = [], gap = front ? front.size / 2 + half + 0.4 : 0;
  for (let z = minZ + half; z + half <= maxZ + 1e-9; z += size) for (let x = minX + half; x + half <= maxX + 1e-9; x += size) {
    if (front && Math.abs(x - front.x) < gap && Math.abs(z - front.z) < gap) continue;
    if (squareFree(mine, x, z, size) && insideBoundary(lga, mine, x, z, size)) cells.push({ x, z, size });
  }
  return cells.length >= want ? cells : null;
}

/**
 * The tiny search: one lattice for every estate, the first (show) estate included, on the squares of side TINY_START down to TINY_FLOOR. The estates are as many as the land can
 * hold (up to 512), at the coarsest side that holds that many; the first is the square nearest the name plate. Null when even the finest side holds fewer than MIN_ESTATES.
 */
function tinyLattice(lga: PackLga, mine: Sampler): { front: EstateCell; cells: EstateCell[]; size: number } | null {
  const [px, pz] = lga.plate, want = ESTATE.estates;
  let best: EstateCell[] | null = null, size = 0;
  for (let side = TINY_START; side >= TINY_FLOOR; side *= 0.94) {
    const found = cellsFor(lga, side, mine, null, 0) ?? [];
    if (Math.min(found.length, want) > (best ? Math.min(best.length, want) : MIN_ESTATES - 1)) { best = found; size = side; }
  }
  if (!best) return null;
  best.sort((a, b) => Math.hypot(a.x - px, a.z - pz) - Math.hypot(b.x - px, b.z - pz) || a.z - b.z || a.x - b.x);
  return { front: best[0]!, cells: best.slice(1), size };
}

export function estateLayout(pack: CityPack, lgaId: string): EstateLayout | null {
  let layouts = cache.get(pack);
  if (!layouts) cache.set(pack, layouts = new Map<string, EstateLayout>());
  if (layouts.has(lgaId)) return layouts.get(lgaId)!;
  const lga = pack.lgas?.find((item) => item.id === lgaId);
  if (!lga) return null;
  const mine = sampler(gridOf(pack), pack.lgas.indexOf(lga) + 1), want = ESTATE.estates - 1;
  let front = frontFor(lga, mine), size = 4, cells: EstateCell[] | null = null;
  // The ordinary search: the coarsest lattice that still gives every other estate its own square.
  if (front) for (; size > LATTICE_FLOOR && !cells; size *= 0.94) cells = cellsFor(lga, size, mine, front, want);
  if (front && cells) size /= 0.94;
  else {
    // Only a compact land that failed the ordinary search is tiny; a strip is refused as before and a land that fitted never comes here.
    const box = boundsOf(lga);
    if (box.maxX - box.minX < TINY_SPAN || box.maxZ - box.minZ < TINY_SPAN) throw new Error(front ? `The land of ${lgaId} cannot hold ${ESTATE.estates} estates` : `The land of ${lgaId} has no room for its first estate`);
    const tiny = tinyLattice(lga, mine);
    if (!tiny) throw new Error(`The land of ${lgaId} cannot hold even ${MIN_ESTATES} estates`);
    ({ front, cells, size } = tiny);
  }
  cells.sort((a, b) => Math.hypot(a.x - front!.x, a.z - front!.z) - Math.hypot(b.x - front!.x, b.z - front!.z) || a.z - b.z || a.x - b.x);
  cells.length = Math.min(cells.length, want);
  cells.unshift(front);
  const count = cells.length;
  const key = (x: number, z: number) => `${Math.round((x / size) * 2)}:${Math.round((z / size) * 2)}`;
  const index = new Map<string, number>(cells.slice(1).map((cell, i): [string, number] => [key(cell.x, cell.z), i + 1]));
  const anchor = cells[1] ?? front, cellOf = (estate: number) => cells[Math.min(estate, count - 1)]!;
  const layout: EstateLayout = {
    id: lgaId, size, front: front.size, cells, count,
    /** The distance between two plots of an estate. */
    pitch: (estate) => (cellOf(estate).size * FILL) / ESTATE.plots,
    /** Where a plot is: streets run west–east, street 1 at the north side; plots count from the west. */
    plot(estate, plot) {
      const cell = cellOf(estate), pitch = (cell.size * FILL) / ESTATE.plots, origin = -(cell.size * FILL) / 2 + pitch / 2;
      return { x: cell.x + origin + (plot % ESTATE.plots) * pitch, z: cell.z + origin + Math.floor(plot / ESTATE.plots) * pitch };
    },
    /** The estate whose square contains the point, or -1. */
    estateAt(x, z) {
      if (Math.abs(x - front.x) <= front.size / 2 && Math.abs(z - front.z) <= front.size / 2) return 0;
      // The compact estates sit on a lattice of step `size`, so the nearest lattice point is found without a search.
      const gx = anchor.x + Math.round((x - anchor.x) / size) * size, gz = anchor.z + Math.round((z - anchor.z) / size) * size;
      const found = index.get(key(gx, gz));
      return found === undefined || Math.abs(x - gx) > size / 2 || Math.abs(z - gz) > size / 2 ? -1 : found;
    },
  };
  layouts.set(lgaId, layout);
  return layout;
}

export const estateAt = (layout: EstateLayout, x: number, z: number) => layout.estateAt(x, z);
/** The plot under a point: { estate, plot } (plot −1 on the verge of an estate), or null off every estate. */
export function plotAt(layout: EstateLayout, x: number, z: number): PlotRef | null {
  const estate = layout.estateAt(x, z);
  if (estate < 0) return null;
  const cell = layout.cells[estate]!, pitch = layout.pitch(estate), span = pitch * ESTATE.plots;
  const col = Math.floor((x - (cell.x - span / 2)) / pitch), row = Math.floor((z - (cell.z - span / 2)) / pitch);
  if (col < 0 || col >= ESTATE.plots || row < 0 || row >= ESTATE.streets) return { estate, plot: -1 };
  return { estate, plot: row * ESTATE.plots + col };
}
