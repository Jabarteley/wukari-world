/** Shared addresses for later campus/town tile loading and presence. No server protocol changes. */
import { FRAME_LAT, FRAME_LON } from '../geo/frame.ts';
import { fromWorld, toWorld } from './geography.ts';
import type { Position } from './geography.ts';

export type RegionId = 'fuw-campus' | 'wukari-town';
export interface WorldPoint { x: number; z: number }
export interface TileAddress { region: RegionId; column: number; row: number; key: string }
export const TILE_METRES = 256;
// Projection constants, not invented campus/town landmarks or spawn coordinates.
const frameOrigin: Position = [FRAME_LON, FRAME_LAT];
export const sharedWorld = (point: Position): WorldPoint => toWorld(frameOrigin, point);
export const sharedGeography = (point: WorldPoint): Position => fromWorld(frameOrigin, point.x, point.z);
export function localToShared(origin: Position, point: WorldPoint): WorldPoint {
  const offset = sharedWorld(origin); return { x: offset.x + point.x, z: offset.z + point.z };
}
export function tileAt(region: RegionId, point: WorldPoint): TileAddress {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) throw new Error('Invalid world position');
  const column = Math.floor(point.x / TILE_METRES), row = Math.floor(point.z / TILE_METRES);
  if (!Number.isSafeInteger(column) || !Number.isSafeInteger(row)) throw new Error('Unsafe tile address');
  return { region, column, row, key: `${region}/${column}/${row}` };
}
export function nearbyTiles(address: TileAddress, radius = 1): TileAddress[] {
  if (!Number.isInteger(radius) || radius < 0 || radius > 3) throw new Error('Tile radius must be 0–3');
  const result: TileAddress[] = [];
  for (let row = address.row - radius; row <= address.row + radius; row++) {
    for (let column = address.column - radius; column <= address.column + radius; column++) {
      result.push(tileAt(address.region, { x: column * TILE_METRES, z: row * TILE_METRES }));
    }
  }
  return result;
}
export const REGION_COVERAGE: Readonly<Record<RegionId, { geography: 'unavailable'; terrain: 'unavailable'; playerSpawn: null }>> = Object.freeze({
  'fuw-campus': { geography: 'unavailable', terrain: 'unavailable', playerSpawn: null },
  'wukari-town': { geography: 'unavailable', terrain: 'unavailable', playerSpawn: null },
});
