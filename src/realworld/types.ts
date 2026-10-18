/** The prepared area (scripts/realworld/prepare-lagos-island.ts): street metres, x east, z south, y up. */
export type P = [number, number];
export interface Polygon { outer: P[]; holes: P[][] }
export interface Building { id: string; ring: P[]; height: number; levels: number | null; use: string; roof: string | null }
export interface Road { id: string; name?: string; class: string; width: number; major: boolean; bridge: boolean; oneway: boolean; points: P[] }
export interface World {
  buildings: Building[]; roads: Road[]; water: P[][]; shoreline: P[]; land: P[][];
  asphalt: Polygon[]; sidewalks: Polygon[];
  landUse: { kind: string; ring: P[] }[]; trees: P[]; furniture: { kind: string; at: P }[]; paths: { kind: string; points: P[] }[];
  places: { id: string; name: string; kind: string; x: number; z: number; yaw: number; building?: string }[];
}
