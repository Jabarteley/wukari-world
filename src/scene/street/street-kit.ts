/**
 * OWNER: neighbourhood
 * What the street set is made of: which model files exist, how big each stands (measured from the files, in scene units, in
 * the model's own frame: x right, y up, z toward the street), and how a wall colour or a palette picks a file. Pure data and
 * functions, no WebGL and no file addresses (those are in street-files.ts, which is only reached through a dynamic import).
 */
import type { ModelLevel } from '../models/scene-models.ts';

export type Palette = 'cream' | 'mint' | 'sky';
/** minX, maxX, minZ, maxZ, height of the body of a model (signs and lamp glass left out). */
export type Box = readonly [number, number, number, number, number];

/** Buildings and props that come in three palettes (and a far version of each). */
export const BOXES: Readonly<Record<string, Box>> = Object.freeze({
  bungalow: [-5.7, 5.7, -5.85, 5.3, 5.5], house2: [-5.5, 5.5, -5.4, 4.84, 9.2], flats: [-5.74, 5.74, -4.24, 5.5, 13.2],
  shops: [-6.24, 6.24, -4.24, 5.55, 11.45], shoprow: [-5.55, 5.55, -3.95, 3.65, 3.7], church: [-4.5, 4.5, -8.25, 7.9, 13.9],
  mosque: [-5.12, 6.3, -5.12, 6.3, 13.7], school: [-8.24, 8.24, -4.69, 4.45, 7.55], clinic: [-5.74, 5.74, -5.34, 5.1, 4.45],
  filling: [-6.02, 6.02, -4.62, 4.52, 5.15], bank: [-5.74, 5.74, -5.84, 5.6, 7.95], unfinished: [-4.6, 6.25, -3.6, 3.6, 8],
  kiosk: [-1.75, 2.5, -1.75, 2.25, 2.82], stall: [-1.6, 1.95, -2.39, 1.4, 3.3], busstop: [-2.2, 2.2, -1, 1, 2.85],
  lamp: [-0.5, 1.9, -0.45, 0.45, 5.78], fencegate: [-3.32, 3.32, -0.32, 0.32, 2.35], hedge: [-1.5, 1.5, -0.4, 0.4, 1.05],
  shadetree: [-3.6, 3.6, -2.7, 2.7, 7.3], pawpaw: [-1.5, 1.5, -1.5, 1.5, 3.6], plantain: [-1.88, 1.82, -1.77, 1.89, 2.38],
  bin: [-0.4, 0.4, -0.38, 0.38, 1.14], gutter: [-1.78, 1.78, -0.4, 0.4, 0.12], tank: [-1, 1, -1.15, 1, 4.4],
  generator: [-0.7, 0.7, -0.45, 0.45, 1.35], table: [-0.9, 1.15, -0.5, 0.45, 2.2], wheelbarrow: [-0.38, 0.38, -1, 0.75, 0.58],
  billboard: [-3.3, 3.3, -0.3, 0.3, 7.2], signboard: [-1.5, 1.5, -0.1, 0.11, 3], trafficlight: [-0.1, 3.5, -0.2, 0.2, 5],
  palm: [-1.96, 1.82, -2.08, 2.08, 7],
  'detail-gatehouse': [-1, 1, -1, 1, 2.3], 'detail-generator-hut': [-1, 1, -0.8, 0.8, 2.3], 'detail-awning': [-0.9, 0.9, 0, 0.9, 0],
  'detail-balcony': [-1.3, 1.3, 0, 1.11, 1.08], 'detail-bars-window': [-0.7, 0.7, 0, 0.15, 1.5], 'detail-ac-external': [-0.4, 0.4, 0, 0.41, 0.55],
  'detail-dish': [-0.34, 0.34, -0.12, 0.34, 0.96], 'detail-security-light': [-0.14, 0.14, 0, 0.36, 0.3], 'detail-clothes-line': [-1.63, 1.84, -0.03, 0.03, 2.1],
  'detail-number-sign': [-0.3, 0.3, 0, 0.04, 0.3],
});
export const boxOf = (asset: string): Box => BOXES[asset] ?? [-1, 1, -1, 1, 1];

/** Models that have one file for the whole set (their own texture, no palette) or that are the same for every palette. */
const NO_PALETTE = new Set(['palm']);
const COLOURED = new Set(['kiosk', 'stall']);
const COLOUR_OF: Record<Palette, string> = { cream: 'teal', mint: 'red', sky: 'blue' };
/** The file a placement asks for. Exterior details have no palette and no far version. */
export function fileKey(asset: string, palette: Palette, level: ModelLevel = 'near'): string {
  const base = asset.startsWith('detail-') || NO_PALETTE.has(asset) ? asset : `${asset}-${COLOURED.has(asset) ? COLOUR_OF[palette] : palette}`;
  return level === 'far' && !asset.startsWith('detail-') ? `${base}-far` : base;
}
export const hasFar = (asset: string): boolean => !asset.startsWith('detail-');

const OLDER = /^(bungalow|house2|flats)-/;
const PALETTE_OF: Record<string, Palette> = { cream: 'cream', teal: 'cream', mint: 'mint', red: 'mint', sky: 'sky', blue: 'sky' };
/**
 * The texture atlas a file's picture parts sample. Every file of one palette and level carries the same picture, so the
 * three older houses share an atlas, every other building and prop another (per palette), and the far versions have their own.
 */
export function atlasOf(file: string): string {
  const far = file.endsWith('-far'), base = far ? file.slice(0, -4) : file;
  const colour = base.slice(base.lastIndexOf('-') + 1);
  const palette = PALETTE_OF[colour];
  if (!palette) return `${base}${far ? '-far' : ''}`;
  return `${OLDER.test(base) ? 'older' : 'street'}-${palette}${far ? '-far' : ''}`;
}

/** The palette a house wall colour is drawn in, and a tint that nudges the palette's wall toward colours it does not have. */
export function wallLook(wall: number): { palette: Palette; tint?: string } {
  switch (wall) {
    case 3: return { palette: 'mint' };
    case 4: return { palette: 'sky' };
    case 5: return { palette: 'cream', tint: '#ffb9a6' };
    case 6: return { palette: 'sky', tint: '#e6d2ff' };
    case 7: return { palette: 'cream', tint: '#ffeb70' };
    default: return { palette: 'cream' };
  }
}

/** The triangles of the closed gate's leaf (the "rail" tile of the street atlas): left out, the gate stands open. */
export const RAIL_TILE = { u0: 768 / 1024, v0: 256 / 1024, u1: 896 / 1024, v1: 384 / 1024 } as const;
export const isGateLeaf = (key: string, u: number, v: number): boolean => key.startsWith('fencegate-') && u >= RAIL_TILE.u0 && u < RAIL_TILE.u1 && v >= RAIL_TILE.v0 && v < RAIL_TILE.v1;
/** The opening of an open gate, in the model's own x. */
export const GATE_OPENING = 1.3;

/** The window and stained-glass tiles of each atlas family, in 1024 px atlas pixels (x, y, w, h): what lights up at dusk. */
export const WINDOW_TILES: Readonly<Record<'street' | 'older', readonly (readonly [number, number, number, number])[]>> = Object.freeze({
  street: [[0, 0, 256, 256], [256, 0, 128, 256], [384, 0, 128, 256]],
  older: [[512, 768, 256, 256]],
});
export const familyOf = (atlas: string): 'street' | 'older' | null => atlas.startsWith('street-') ? 'street' : atlas.startsWith('older-') ? 'older' : null;
