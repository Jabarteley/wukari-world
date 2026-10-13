/**
 * Zone-aware default placement for single-room homes: where a NEW piece of furniture is offered first, and the zones the home scene paints on
 * the floor. It lives outside src/game/ (whose modules ride in the startup engine chunk) because only the lazy Buy screen and the lazy home scene
 * use it; the server never places furniture (it only validates).
 */
import { FURNITURE } from '../game/content/furniture.ts';
import { checkPlacement, findFreeSpot, footprint, plotIn, windowSlot, type Placement, type Plot } from '../game/home-layout.ts';
import type { PlacedItem } from '../types/life.ts';
import type { FurnitureDefinition } from '../types/content.ts';

/**
 * The zones of a single-room home, as [x, y, w, h] in tiles, by tier: the kitchen corner at the back right, the sleeping corner at the
 * front right, and the entry strip by the door. The rest is the parlour. The home scene paints the same zones on the floor.
 */
export const zonesOf = (grid: number) => grid <= 6 ? { kitchen: [4, 0, 2, 2], bed: [4, 3, 2, 3], hall: [0, grid - 3, 2, 3] } as const
  : grid <= 9 ? { kitchen: [grid - 3, 0, 3, 3], bed: [grid - 4, grid - 4, 4, 4], hall: [0, grid - 3, 2, 3] } as const
  : { kitchen: [grid - 4, 0, 4, 4], bed: [grid - 4, grid - 4, 4, 4], hall: [0, grid - 3, 2, 3] } as const;
type Zone = readonly number[];
const touches = (zone: Zone, x: number, y: number, w: number, h: number): boolean => x < zone[0]! + zone[2]! && zone[0]! < x + w && y < zone[1]! + zone[3]! && zone[1]! < y + h;
const holds = (zone: Zone, x: number, y: number, w: number, h: number): boolean => x >= zone[0]! && y >= zone[1]! && x + w <= zone[0]! + zone[2]! && y + h <= zone[1]! + zone[3]!;

/**
 * Where a NEW object (a purchase, a piece taken out of storage) is offered first. In a single-room home it goes to its zone: kitchen and wet
 * things to the kitchen corner, beds and wardrobes to the sleeping corner, the TV to the back wall of the parlour with the sofa and rug facing
 * it, a desk under the window, plants and lamps in the corners. Everything it picks passes checkPlacement; when its zone is full (or the home is
 * an owned house, a wall item, or another floor) it is findFreeSpot's first free tile. Saved layouts never come through here: fitInto keeps them.
 */
export function suggestSpot(space: number | Plot, items: readonly PlacedItem[], def: FurnitureDefinition, floor = 0): Placement | null {
  const plot = plotIn(space), fallback = () => findFreeSpot(space, items, def, null, floor);
  if (def.wall || floor !== 0 || plot.w !== plot.grid || plot.floors !== 1) return fallback();
  const g = plot.grid, zones = zonesOf(g), shape = def.shape, kind = def.kind;
  const free = (x: number, y: number, rot: number, inside?: Zone): boolean => {
    const { w, h } = footprint(def, rot);
    if (inside ? !holds(inside, x, y, w, h) : [zones.kitchen, zones.bed, zones.hall].some((zone) => touches(zone, x, y, w, h))) return false;
    return !checkPlacement(space, items, def, x, y, rot, null, 0);
  };
  const pick = (cells: Iterable<[number, number, number]>, inside?: Zone): Placement | null => {
    for (const [x, y, rot] of cells) if (free(x, y, rot, inside)) return { x, y, rot };
    return null;
  };
  const rots = def.w === def.h ? [0] : [0, 1];
  function* scan(zone: Zone | null, from = 0): Generator<[number, number, number]> {
    const [zx, zy, zw, zh] = zone ?? [0, 0, g, g];
    for (const rot of rots) for (let y = Math.max(zy!, from); y < zy! + zh!; y++) for (let x = zx!; x < zx! + zw!; x++) yield [x, y, rot];
  }
  const tv = items.find((item) => (item.floor ?? 0) === 0 && FURNITURE[item.itemId]?.kind === 'tv');
  const tvDef = tv && FURNITURE[tv.itemId];
  const across = [0, 1, -1, 2, -2, 3];
  const cluster = (rows: number[], rot: number): [number, number, number][] => tv ? rows.flatMap((dy) => across.map((dx): [number, number, number] => [tv.x + dx, tv.y + dy, rot])) : [];
  let spot: Placement | null = null;
  if (['cooler', 'stove', 'water', 'bath', 'tub', 'toilet'].includes(kind) || shape === 'basin') spot = pick(scan(zones.kitchen), zones.kitchen);
  else if (kind === 'bed' || shape === 'wardrobe') spot = pick(scan(zones.bed), zones.bed);
  else if (kind === 'tv') spot = pick(Array.from({ length: g }, (_, x): [number, number, number] => [x, 0, 0]));
  else if (kind === 'seat' && tvDef) spot = pick([...cluster([3, 2, 4, 1], 2), ...scan(null, 2)]);
  else if (shape === 'rug') spot = pick([...cluster([1], 0), ...Array.from({ length: g * g }, (_, i): [number, number, number] => [i % g, 1 + Math.floor(i / g), 0])]);
  else if (kind === 'desk') { const ws = windowSlot(g); spot = pick([ws, ws - 1, ws + 1, ws - 2].map((x): [number, number, number] => [x, 0, 0])); }
  else if (shape === 'plant' || shape === 'floorlamp') spot = pick([[0, 0, 0], [zones.kitchen[0] - 1, 0, 0], [zones.bed[0] - 1, g - 1, 0], [0, 2, 0]]);
  else spot = pick(scan(null, kind === 'seat' ? 2 : 0));
  return spot ?? fallback();
}
