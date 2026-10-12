/**
 * OWNER: neighbourhood
 * The street as a list: which model stands where, what blocks the walking grid and the camera, and where the lights are.
 * Pure and deterministic (the same street always plans the same), so it runs under `node --test` without WebGL, and the scene
 * (neighbourhood-scene.ts) only has to draw it. Coordinates are the scene's: x along the street (rowX), z toward the road.
 *
 *   z  -19 ......... -7.1 ...... -1.65 ...... 3 ...... 10.5 ...... 14.2
 *      back of plots   house front  gate line  kerb    far kerb    far pavement
 *
 * A plot is 12 wide (ROW_PITCH). A house stands on it by its tier, its door on the front plane where the walking grid expects
 * it (z = FRONT); its gate is on the compound's front fence at the same x. The pavement and the road are in front of the fences
 * and everything the street links (every gate, the bus stop, the junction's shops and kiosk, the way out) opens onto them.
 */
import { ESTATE, HOUSE_STYLE } from '../../game/content/world.ts';
import { ROW_HALF_WIDTH, ROW_PITCH, rowX } from '../../game/neighbourhood-space.ts';
import { hash } from '../build.ts';
import type { HouseTierId } from '../../types/life.ts';
import { GATE_OPENING, boxOf, wallLook } from './street-kit.ts';
import type { Palette } from './street-kit.ts';

export type Rect = [number, number, number, number];
export type Box6 = [number, number, number, number, number, number];

/** Where the street's cross-section lies (scene z). */
export const Z = Object.freeze({ back: -19, front: -7.1, fence: -1.65, pavement0: -1.45, kerb: 3.0, road0: 3.25, road1: 10.5, farKerb: 10.75, pavement1: 14.2, farFront: 14.5 });
export const BOUNDS: Rect = [-ROW_HALF_WIDTH, Z.back, ROW_HALF_WIDTH, Z.pavement1];
/** Half the width of a compound: the fence stands this far from the house's x on each side. */
const HALF = ROW_PITCH / 2;
/** The bus stop and the way out of the street. */
export const BUS_STOP = Object.freeze({ x: 81, z: 1.7 });

export interface PlanHouse {
  x: number;
  plot: number | null;
  tier: HouseTierId;
  wall: number;
  roof: number;
  door: number;
  fence: number;
  yard: number;
  land: number[];
  own: boolean;
}
export interface PlanPiece {
  id: string;
  asset: string;
  palette: Palette;
  x: number;
  y?: number;
  z: number;
  ry: number;
  scale: number;
  tint?: string | undefined;
  labels?: Record<string, string> | undefined;
  priority: number;
  detail?: boolean;
  mode?: 'merge' | 'instance';
  /** What the piece is for, for the scene's stand-ins and the tests: house, gate, lamp, ... */
  role: string;
  /** The house's saved colours, for its stand-in. */
  paint?: { wall: string; roof: string; door: string };
}
export interface Wall { rect: Rect; fence: number; height: number }
export interface StreetPlan {
  pieces: PlanPiece[];
  /** Walls drawn by the scene itself (compound sides and back) with the house's fence style. */
  walls: Wall[];
  blocks: Rect[];
  solids: Box6[];
  lights: [number, number, number][];
  /** Plots owned as land by a house: grass patches. */
  grass: { x: number }[];
  /** The scenery the vacant plots and the far side were given, by plot or x. */
  scenery: { plot: number | null; asset: string; x: number }[];
}
export interface SceneryMix { buildings: string[]; flats: boolean }

const TIER: Record<HouseTierId, { asset: string; scale: number; detail: number }> = {
  starter: { asset: 'bungalow', scale: 0.8, detail: 0 },
  bq: { asset: 'bungalow', scale: 0.88, detail: 1 },
  bungalow: { asset: 'bungalow', scale: 0.96, detail: 2 },
  duplex: { asset: 'house2', scale: 0.92, detail: 3 },
  villa: { asset: 'house2', scale: 1.0, detail: 3 },
};
export const tierLook = (tier: HouseTierId): { asset: string; scale: number; detail: number } => TIER[tier];

/** A model's footprint on the ground, in the scene, as a walking-grid rectangle. */
export function rectOf(asset: string, x: number, z: number, ry: number, scale: number): Rect {
  const [minX, maxX, minZ, maxZ] = boxOf(asset);
  const quarter = Math.round(ry / (Math.PI / 2));
  const c = Math.round(Math.cos(quarter * Math.PI / 2)), s = Math.round(Math.sin(quarter * Math.PI / 2));
  const corners = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]].map(([px, pz]) => [x + (px! * c + pz! * s) * scale, z + (-px! * s + pz! * c) * scale] as const);
  return [Math.min(...corners.map((p) => p[0])), Math.min(...corners.map((p) => p[1])), Math.max(...corners.map((p) => p[0])), Math.max(...corners.map((p) => p[1]))];
}

const piece = (id: string, asset: string, x: number, z: number, o: Partial<PlanPiece> & { role: string }): PlanPiece =>
  ({ id, asset, palette: 'cream', x, z, ry: 0, scale: 1, priority: 1, ...o });

/** The compounds: a house with the plots of land attached to it. Never fences over a vacant gap. */
export function compoundsOf(houses: PlanHouse[]): { left: number; right: number; gate: number; house: PlanHouse }[] {
  return houses.map((house) => {
    if (house.plot === null) return { left: house.x - HALF, right: house.x + HALF, gate: house.x, house };
    let first = house.plot, last = house.plot;
    while (house.land.includes(first - 1)) first--;
    while (house.land.includes(last + 1)) last++;
    return { left: rowX(first) - HALF, right: rowX(last) + HALF, gate: house.x, house };
  });
}

/** Which scenery buildings a city's venues call for, from the scene kinds of its venues. */
export function sceneryMix(kinds: readonly { kind: string; variant?: string | undefined }[], dear: boolean): SceneryMix {
  const found = new Set<string>();
  for (const { kind, variant } of kinds) {
    if (kind === 'worship') found.add(variant === 'mosque' ? 'mosque' : 'church');
    else if (kind === 'hospital' || kind === 'clinic') found.add('clinic');
    else if (kind === 'campus' || kind === 'school' || kind === 'library') found.add('school');
    else if (kind === 'market' || kind === 'mall' || kind === 'buka' || kind === 'shop') found.add('shoprow');
    else if (kind === 'office' || kind === 'bank' || kind === 'work') found.add('bank');
    else if (kind === 'transport' || kind === 'station' || kind === 'hub') found.add('filling');
  }
  const buildings = [...found].sort();
  if (!buildings.length) buildings.push('shoprow', 'unfinished');
  return { buildings, flats: dear };
}

function planHouse(plan: StreetPlan, house: PlanHouse, seed: string): void {
  const look = TIER[house.tier], [minX, maxX, minZ, maxZ] = boxOf(look.asset), s = look.scale;
  const cz = Z.front - maxZ * s;
  const wall = wallLook(house.wall);
  const label = house.plot === null ? '' : String(house.plot % ESTATE.plots + 1);
  const key = `${seed}:${house.x}`;
  const hex = (field: 'wall' | 'roof' | 'door', index: number, fallback: string): string => HOUSE_STYLE[field][index]?.hex ?? fallback;
  const paint = { wall: hex('wall', house.wall, '#e6cf9f'), roof: hex('roof', house.roof, '#a85c40'), door: hex('door', house.door, '#6b4a2b') };
  plan.pieces.push(piece(`house:${key}`, look.asset, house.x, cz, { palette: wall.palette, tint: wall.tint, scale: s, priority: 9, role: 'house', paint }));
  const rect = rectOf(look.asset, house.x, cz, 0, s);
  plan.blocks.push([rect[0], rect[1], rect[2], Z.front + 0.1]);
  plan.solids.push([rect[0], 0, rect[1], rect[2], boxOf(look.asset)[4] * s, Z.front]);
  void minX; void minZ; void maxX;

  // The gate in the front fence (open), the number of the plot on its pier, hedges and a bin by it.
  plan.pieces.push(piece(`gate:${key}`, 'fencegate', house.x, Z.fence, { priority: 8, role: 'gate' }));
  if (label) plan.pieces.push(piece(`number:${key}`, 'detail-number-sign', house.x + 2.75, Z.fence + 0.45, { y: 1.2, scale: 1.9, labels: { sign_number: label }, priority: 7, detail: true, role: 'number' }));
  if (house.tier !== 'starter') for (const side of [-1, 1]) plan.pieces.push(piece(`hedge:${key}:${side}`, 'hedge', house.x + side * 4.3, Z.fence - 1.1, { scale: 1.1, priority: 3, role: 'hedge' }));

  // Exterior detail by rule: more on richer tiers. [piece, x, y, z, turn, level] in the building's own frame.
  const wallZ = look.asset === 'bungalow' ? 2.86 : 2.95;
  const rules: [string, number, number, number, number, number][] = look.asset === 'bungalow'
    ? [['security-light', -3.0, 2.2, wallZ, 0, 1], ['ac-external', 5.0, 2.2, -1, Math.PI / 2, 2], ['dish', 2, 5.5, -1, 0, 2], ['bars-window', -3.3, 1.2, wallZ, 0, 3], ['bars-window', 3.3, 1.2, wallZ, 0, 3]]
    : [['security-light', -2.0, 2.6, wallZ, 0, 1], ['ac-external', -4.8, 4.8, 0, -Math.PI / 2, 2], ['dish', -2, 9.3, -1, 0, 2], ['bars-window', -3.1, 1.0, wallZ, 0, 3], ['bars-window', 3.1, 1.0, wallZ, 0, 3], ['awning', 3.1, 3.0, wallZ, 0, 3]];
  rules.forEach(([name, x, y, z, ry, level], i) => {
    if (level <= look.detail) plan.pieces.push(piece(`d:${key}:${i}`, `detail-${name}`, house.x + x * s, cz + z * s, { y: y * s, ry, scale: s, priority: 0, detail: true, role: 'detail' }));
  });
  if (look.detail >= 3) {
    plan.pieces.push(piece(`gatehouse:${key}`, 'detail-gatehouse', house.x + 4.55, Z.fence - 1.3, { priority: 5, detail: true, role: 'gatehouse' }));
    plan.blocks.push([house.x + 3.55, Z.fence - 2.3, house.x + 5.55, Z.fence - 0.3]);
    plan.pieces.push(piece(`hut:${key}`, 'detail-generator-hut', house.x - 4.5, Z.fence - 3.4, { priority: 1, detail: true, role: 'detail' }));
    plan.blocks.push([house.x - 5.5, Z.fence - 4.2, house.x - 3.5, Z.fence - 2.6]);
  }

  // What the yard was given (HOUSE_STYLE.yard): a tree, a palm, a tank, a generator, a kiosk.
  const yard = house.yard;
  const spot: [number, number] = [house.x + 4.1, Z.fence - 4.2];
  const add = (asset: string, x: number, z: number, scale: number, o: Partial<PlanPiece> = {}): void => {
    plan.pieces.push(piece(`yard:${key}`, asset, x, z, { scale, priority: 4, role: 'yard', palette: wall.palette, ...o }));
    const r = rectOf(asset, x, z, o.ry ?? 0, scale);
    plan.blocks.push(r);
  };
  if (yard === 1) add('plantain', spot[0], spot[1], 1);
  else if (yard === 2) add('shadetree', house.x - 4.0, Z.fence - 4.4, 0.62);
  else if (yard === 3) add('palm', spot[0], spot[1], 0.95, { mode: 'instance' });
  else if (yard === 4) add('tank', spot[0], spot[1], 1);
  else if (yard === 5) add('generator', spot[0], spot[1], 1.2);
  else if (yard === 7) add('kiosk', house.x - 3.1, Z.fence - 4.4, 0.9, { ry: 0 });
}

/** A scenery building in a vacant plot or on the far side: sized to fit the plot, its front on the plot's front plane. */
function fit(asset: string, width: number, depth: number): number {
  const [minX, maxX, minZ, maxZ] = boxOf(asset);
  return Math.min(1, width / (maxX - minX), depth / (maxZ - minZ));
}

export interface PlanInput {
  houses: PlanHouse[];
  seed: string;
  mix: SceneryMix;
}

export function planStreet({ houses, seed, mix }: PlanInput): StreetPlan {
  const plan: StreetPlan = { pieces: [], walls: [], blocks: [], solids: [], lights: [], grass: [], scenery: [] };
  const compounds = compoundsOf(houses);
  const taken = new Set<number>();
  for (const house of houses) { if (house.plot !== null) taken.add(house.plot); for (const plot of house.land) taken.add(plot); }

  // Compounds: fences (sides and back are walls; the front is the gate's piers plus two lengths of wall).
  for (const { left, right, gate, house } of compounds) {
    const depth = Z.fence - Z.back + 0.2;
    plan.walls.push({ rect: [left + 0.15, Z.back + 0.5, left + 0.42, Z.fence + 0.15], fence: house.fence, height: house.fence === 1 ? 1.1 : 1.5 });
    plan.walls.push({ rect: [right - 0.42, Z.back + 0.5, right - 0.15, Z.fence + 0.15], fence: house.fence, height: house.fence === 1 ? 1.1 : 1.5 });
    plan.walls.push({ rect: [left + 0.15, Z.back + 0.5, right - 0.15, Z.back + 0.77], fence: house.fence, height: house.fence === 1 ? 1.1 : 1.5 });
    plan.walls.push({ rect: [left + 0.15, Z.fence - 0.15, gate - 3.3, Z.fence + 0.15], fence: house.fence, height: house.fence === 1 ? 1.1 : 1.5 });
    plan.walls.push({ rect: [gate + 3.3, Z.fence - 0.15, right - 0.15, Z.fence + 0.15], fence: house.fence, height: house.fence === 1 ? 1.1 : 1.5 });
    plan.blocks.push([left + 0.15, Z.back, left + 0.42, Z.fence + 0.15], [right - 0.42, Z.back, right - 0.15, Z.fence + 0.15], [left + 0.15, Z.back, right - 0.15, Z.back + 0.77],
      [left + 0.15, Z.fence - 0.3, gate - GATE_OPENING - 0.1, Z.fence + 0.3], [gate + GATE_OPENING + 0.1, Z.fence - 0.3, right - 0.15, Z.fence + 0.3]);
    plan.solids.push([left + 0.15, 0, Z.back + 0.5, left + 0.42, 1.5, Z.fence], [right - 0.42, 0, Z.back + 0.5, right - 0.15, 1.5, Z.fence]);
    void depth;
    for (const plot of house.land) plan.grass.push({ x: rowX(plot) });
  }
  for (const house of houses) planHouse(plan, house, seed);

  // Vacant plots: scenery from what the city has, or green.
  for (let plot = 0; plot < ESTATE.plots; plot++) {
    if (taken.has(plot)) continue;
    const x = rowX(plot), roll = hash(`${seed}:plot:${plot}`) % 100;
    const choices = [...mix.buildings, ...(mix.flats ? ['flats'] : []), 'unfinished'];
    if (roll < 34) {
      const asset = choices[hash(`${seed}:kind:${plot}`) % choices.length]!;
      const [minX, maxX, minZ, maxZ] = boxOf(asset);
      const s = fit(asset, ROW_PITCH - 1.4, 11.4);
      const palette: Palette = (['cream', 'mint', 'sky'] as const)[hash(`${seed}:tone:${plot}`) % 3]!;
      // A mosque's minaret leans to one side: the model is centred on its walls.
      const cx = x - (minX + maxX) / 2 * s;
      const cz = Z.front - maxZ * s;
      plan.pieces.push(piece(`scene:${seed}:${plot}`, asset, cx, cz, { palette, scale: s, priority: 6, role: 'building' }));
      const r = rectOf(asset, cx, cz, 0, s);
      plan.blocks.push([r[0], r[1], r[2], Z.front + 0.1]);
      plan.solids.push([r[0], 0, r[1], r[2], boxOf(asset)[4] * s, Z.front]);
      plan.scenery.push({ plot, asset, x });
      void minZ;
    } else {
      const trees = roll < 62 ? ['shadetree', 'pawpaw'] : roll < 82 ? ['pawpaw', 'plantain'] : [];
      trees.forEach((asset, i) => {
        const tx = x + (i ? 3.2 : -2.6), tz = Z.front - 3 - (hash(`${seed}:t:${plot}:${i}`) % 5);
        plan.pieces.push(piece(`tree:${seed}:${plot}:${i}`, asset, tx, tz, { scale: asset === 'shadetree' ? 0.85 : 1, priority: 4, role: 'tree', mode: asset === 'palm' ? 'instance' : 'merge' }));
        plan.blocks.push(rectOf(asset, tx, tz, 0, asset === 'shadetree' ? 0.85 : 1));
      });
      if (!trees.length) plan.pieces.push(piece(`board:${seed}:${plot}`, 'billboard', x, Z.front - 1.5, { scale: 0.8, priority: 4, role: 'billboard', labels: { sign_1: `PLOT ${plot + 1}` } }));
      if (!trees.length) plan.blocks.push(rectOf('billboard', x, Z.front - 1.5, 0, 0.8));
      plan.pieces.push(piece(`hedge:${seed}:${plot}`, 'hedge', x, Z.fence - 0.9, { scale: 1.3, priority: 2, role: 'hedge' }));
      plan.pieces.push(piece(`hedge2:${seed}:${plot}`, 'hedge', x + 3.4, Z.fence - 0.9, { scale: 1.3, priority: 2, role: 'hedge' }));
      plan.scenery.push({ plot, asset: trees[0] ?? 'billboard', x });
    }
  }

  // The road: gutter slabs along the kerb, lamps with their lights, trees and bins on the pavement.
  // Gutter cover slabs along the kerb, one in front of every plot (the open channel is drawn by the scene).
  for (let i = 0; i < ESTATE.plots; i++) plan.pieces.push(piece(`gutter:${i}`, 'gutter', rowX(i), Z.road0 + 0.35, { priority: 1, role: 'gutter' }));
  for (let i = 0; i < Math.ceil(ESTATE.plots / 2); i++) {
    const x = rowX(i * 2) + 5;
    plan.pieces.push(piece(`lamp:${i}`, 'lamp', x, Z.kerb - 0.45, { ry: -Math.PI / 2, priority: 7, role: 'lamp', mode: 'instance' }));
    plan.blocks.push([x - 0.3, Z.kerb - 0.85, x + 0.3, Z.kerb - 0.05]);
    if (i % 2 === 0 || i === Math.ceil(ESTATE.plots / 2) - 1) plan.lights.push([x, 5.3, Z.kerb + 1.0]);
  }

  // The junction at the east end: the bus stop where trips start, a crossing, a traffic light, and across the road the shops and a kiosk.
  plan.pieces.push(piece('busstop', 'busstop', BUS_STOP.x, BUS_STOP.z, { priority: 9, role: 'busstop', labels: { sign_1: 'BUS STOP' } }));
  plan.blocks.push(rectOf('busstop', BUS_STOP.x, BUS_STOP.z, 0, 1));
  plan.solids.push([BUS_STOP.x - 2.2, 0, BUS_STOP.z - 1, BUS_STOP.x + 2.2, 2.85, BUS_STOP.z + 1]);
  plan.pieces.push(piece('bin:bus', 'bin', BUS_STOP.x - 3.2, Z.kerb - 0.7, { priority: 2, role: 'bin' }));
  plan.pieces.push(piece('light:junction', 'trafficlight', 74, Z.kerb - 0.35, { ry: -Math.PI / 2, priority: 6, role: 'trafficlight' }));
  plan.blocks.push([73.7, Z.kerb - 0.7, 74.3, Z.kerb]);

  // Across the road (scenery on the far pavement; its fronts face the road).
  const far = (id: string, asset: string, x: number, front: number, o: Partial<PlanPiece> = {}): void => {
    const s = o.scale ?? 1, maxZ = boxOf(asset)[3];
    plan.pieces.push(piece(id, asset, x, front + maxZ * s, { ry: Math.PI, priority: 5, role: 'far', ...o }));
    plan.scenery.push({ plot: null, asset, x });
  };
  far('far:shoprow', 'shoprow', 62, Z.farFront, { palette: 'cream' });
  far('far:kiosk', 'kiosk', 74, 11.9, { palette: 'cream', scale: 1, labels: { sign_1: 'KIOSK' }, role: 'kiosk' });
  plan.blocks.push(rectOf('kiosk', 74, 11.9 + boxOf('kiosk')[3], Math.PI, 1));
  far('far:stall', 'stall', 50, 12.2, { palette: 'mint', role: 'stall' });
  plan.blocks.push(rectOf('stall', 50, 12.2 + boxOf('stall')[3], Math.PI, 1));
  far('far:table', 'table', 77.5, 12.6, { role: 'table', priority: 2 });
  const farCity = mix.buildings.filter((asset) => asset !== 'shoprow');
  farCity.slice(0, 4).forEach((asset, i) => {
    const s = fit(asset, 20, 7);
    far(`far:${asset}`, asset, -60 + i * 30, Z.farFront + 0.2, { scale: s, palette: (['mint', 'cream', 'sky', 'cream'] as const)[i % 4]! });
  });
  far('far:flats', 'flats', -6, Z.farFront + 0.2, { scale: fit('flats', 14, 8), palette: 'sky' });
  far('far:sign', 'billboard', 34, Z.farFront + 0.4, { scale: 0.8, labels: { sign_1: 'ALLWORLD' }, role: 'billboard' });
  for (const x of [-70, -30, 12, 44]) plan.pieces.push(piece(`far:tree:${x}`, 'shadetree', x, 16.5, { scale: 0.9, priority: 3, role: 'tree' }));
  for (const x of [-48, 24]) plan.pieces.push(piece(`far:palm:${x}`, 'palm', x, 13.3, { priority: 3, role: 'tree', mode: 'instance' }));
  for (const x of [-48, 24]) plan.blocks.push(rectOf('palm', x, 13.3, 0, 1));

  // Palms along the near pavement between the lamps.
  for (let i = 0; i < ESTATE.plots; i += 2) {
    const x = rowX(i) - 4.6, asset = i % 4 === 0 ? 'pawpaw' : 'plantain';
    plan.pieces.push(piece(`tree:${i}`, asset, x, Z.kerb - 0.9, { priority: 3, role: 'tree', scale: 0.9 }));
    plan.blocks.push(rectOf(asset, x, Z.kerb - 0.9, 0, 0.9));
  }
  return plan;
}
