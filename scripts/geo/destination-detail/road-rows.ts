/**
 * The road rows of a destination's terrain.ts, from the recorded road ways (build-destination-detail.ts calls this; pure, so the
 * stage can be pinned by fixtures in road-rows.test.ts).
 *
 * Per-way rows (every city whose candidates fit the row cap, byte for byte as before): each way is simplified on its own, cut where
 * it leaves the drawn ground or enters the sea band, pieces under `minRoadKm` that are not motorway or trunk are dropped, the rest
 * is sorted major first and longest first and cut at `maxRoads`.
 * Chained rows (only when those candidates overflow `maxRoads`): see road-chains.ts. Same row cap, and no more points than the
 * per-way rows would have spent. With `closeEnds` (the roads-only regeneration, scripts/geo/regenerate-roads.ts) the chained network
 * is closed: no row end is left loose on the map unless it meets the edge of the drawn ground (road-chains.ts closeNetwork).
 */
import { inBox, simplify } from './geometry-tools.ts';
import type { Box, P } from './geometry-tools.ts';
import type { Element } from './overpass.ts';
import { lengthKm, rankOf, selectChains } from './road-chains.ts';
import { project } from '../../../src/geo/frame.ts';
import { tidyRoads } from '../../../src/map3d/road-tidy.ts';

export interface RoadRowConfig {
  readonly box: Box; readonly core: Box;
  readonly coreTolerance: number; readonly farTolerance: number;
  readonly minRoadKm: number; readonly maxRoads: number; readonly roadMarginDegrees: number;
}
export interface RoadRows {
  /** The rows as written into terrain.ts, one line each. */
  readonly rows: string[];
  readonly points: number;
  /** The header sentence that describes how the rows were chosen. */
  readonly note: string;
  /** Chain statistics when the chained selection was used, else null (per-way rows). */
  readonly chained: { readonly perWayRows: number; readonly perWayPoints: number; readonly chains: number; readonly connectors: number } | null;
}

export interface RoadRowOptions {
  /**
   * Close the chained network (road-chains.ts closeNetwork): snap ends within 25 m onto other roads, carry dead ends up to 40 m on
   * to a T-junction, keep motorways and trunk roads whole and every other road only as its span between junctions or the edge of
   * the map (an end within 30 m of the play box, the drawn ground's edge or the sea band), checked against the map's tidy pass.
   * Used by the roads-only regeneration (scripts/geo/regenerate-roads.ts); off, the rows are exactly those of 5cd8596e. Rows that
   * fit the cap are per-way rows either way.
   */
  readonly closeEnds?: boolean;
  /** With closeEnds: at most this many roads once the map has tidied the rows (the roads-only regeneration passes the shipped count). */
  readonly maxRibbons?: number;
}
/** How near (metres) a road end must be to the play box edge, the outline edge or the sea band to count as ending at the map's edge. */
export const EDGE_METRES = 30;
/** With closeEnds: a road is drawn through a stretch off the drawn ground (not sea) up to this long between two stretches on it; a
 * motorway or trunk road (which the per-way rows drew across such stretches) up to MAIN_GAP_KM. */
export const GAP_KM = 1, MAIN_GAP_KM = 5;

export function roadRows(elements: readonly Element[], config: RoadRowConfig, reach: (p: P, margin: number) => boolean, inSea: (p: P) => boolean, nameIn: (tags: Record<string, string> | undefined) => string, options: RoadRowOptions = {}): RoadRows {
  const candidates: { row: string; km: number; points: number; major: boolean }[] = [];
  for (const way of elements) {
    if (way.type !== 'way' || !way.geometry || !way.tags?.highway) continue;
    const isMajor = way.tags.highway === 'motorway' || way.tags.highway === 'trunk';
    const near = inBox(config.core, [way.geometry[0]!.lon, way.geometry[0]!.lat]);
    const kept = simplify(way.geometry.map((g): P => [g.lon, g.lat]), near ? config.coreTolerance : config.farTolerance)
      .filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]);
    if (kept.length < 2 || !kept.some((p) => inBox(config.box, p))) continue;
    // A road is kept where it runs through, or within a short way of, the built-up outline; beyond that it fades out rather than crossing the countryside to the edge.
    const runs: P[][] = [];
    let run: P[] = [];
    for (const p of kept) {
      if (reach(p, config.roadMarginDegrees) && !inSea(p)) run.push(p);
      else { if (run.length > 1) runs.push(run); run = []; }
    }
    if (run.length > 1) runs.push(run);
    for (const piece of runs) {
      const km = lengthKm(piece);
      // A short unmajor piece is a junction fragment, not a road a player can read at this scale.
      if (!isMajor && km < config.minRoadKm) continue;
      const q = piece.map(([lon, lat]): P => [Math.round(lon * 1e4), Math.round(lat * 1e4)]);
      const steps = q.slice(1).flatMap(([x, y], i) => [x - q[i]![0], y - q[i]![1]]);
      const name = nameIn(way.tags) || (way.tags.ref ?? '').trim() || 'Road';
      candidates.push({ row: `  [${JSON.stringify(name)}, ${isMajor ? 1 : 0}, ${q[0]![0]}, ${q[0]![1]}, ${steps.join(', ')}],`, km, points: q.length, major: isMajor });
    }
  }
  const perWay = candidates.sort((a, b) => Number(b.major) - Number(a.major) || b.km - a.km).slice(0, config.maxRoads);
  const perWayPoints = perWay.reduce((sum, road) => sum + road.points, 0);
  if (candidates.length <= config.maxRoads) {
    const rows = perWay.map((road) => road.row);
    return { rows, points: perWayPoints, chained: null, note: `${rows.length} ways of ${candidates.length} candidates (the longest first, none under ${config.minRoadKm} km unless motorway or trunk), ${perWayPoints} points` };
  }
  // The per-way rows would lose their short connectors to the cap and fall apart into pieces: join the ways into chains first.
  const chained = selectChains(elements.filter((way) => way.type === 'way' && way.geometry && way.tags?.highway).map((way) => ({
    rank: rankOf(way.tags!.highway!), name: nameIn(way.tags) || (way.tags!.ref ?? '').trim() || 'Road', points: way.geometry!.map((g): P => [g.lon, g.lat]),
  })), {
    minRoadKm: config.minRoadKm, maxRows: config.maxRoads, maxPoints: perWayPoints,
    toleranceAt: (p) => inBox(config.core, p) ? config.coreTolerance : config.farTolerance,
    runsOf: (line) => {
      if (!line.some((p) => inBox(config.box, p))) return [];
      const runs: P[][] = [];
      let run: P[] = [];
      for (const p of line) {
        if (reach(p, config.roadMarginDegrees) && !inSea(p)) run.push(p);
        else { if (run.length > 1) runs.push(run); run = []; }
      }
      if (run.length > 1) runs.push(run);
      return runs;
    },
    ...(options.closeEnds ? {
      closeEnds: {
        edgeAt: (p: P) => atEdge(config, reach, inSea, p),
        joinGap: (gap: readonly P[], rank: number) => lengthKm(gap) <= (rank <= 1 ? MAIN_GAP_KM : GAP_KM) && !gap.some(inSea),
        looseAfter: looseOnTheMap,
        ...(options.maxRibbons !== undefined ? { maxRibbons: options.maxRibbons } : {}),
      },
    } : {}),
  });
  // Quantised, a vertex that lands on the one before it is dropped (no zero-length steps), and a run left with one point is dropped.
  const quantised = chained.runs.map((run) => ({ run, q: run.points.map(([lon, lat]): P => [Math.round(lon * 1e4), Math.round(lat * 1e4)]).filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]) })).filter(({ q }) => q.length > 1);
  const rows = quantised.map(({ run, q }) => `  [${JSON.stringify(run.name)}, ${run.rank <= 1 ? 1 : 0}, ${q[0]![0]}, ${q[0]![1]}, ${q.slice(1).flatMap(([x, y], i) => [x - q[i]![0], y - q[i]![1]]).join(', ')}],`);
  const points = quantised.reduce((sum, { q }) => sum + q.length, 0);
  return {
    rows, points,
    chained: { perWayRows: perWay.length, perWayPoints, chains: chained.chains, connectors: chained.connectors },
    note: options.closeEnds
      ? `${rows.length} roads of ${chained.candidates} candidates: ${candidates.length} way pieces overflowed the ${config.maxRoads}-row cap, so the ways were joined end to end into ${chained.chains} chains (same class and name, junction nodes kept), cut to the outline, ends within 25 m snapped onto a road and dead ends carried up to 40 m to a T-junction, motorways and trunk roads kept whole and every other road cut back to its span between junctions or the map's edge (leaf stubs dropped, ${chained.connectors} short connectors kept), the weakest by class and length dropped first, inside ${config.maxRoads} rows and the ${perWayPoints}-point budget of the per-way rows; ${points} points`
      : `${rows.length} roads of ${chained.candidates} candidates: ${candidates.length} way pieces overflowed the ${config.maxRoads}-row cap, so the ways were joined end to end into ${chained.chains} chains (same class and name, junction nodes kept), cut to the outline, ranked by class and length (none under ${config.minRoadKm} km unless motorway, trunk or a connector between two kept roads, ${chained.connectors} connectors) inside ${config.maxRoads} rows and the ${perWayPoints}-point budget of the per-way rows; ${points} points`,
  };
}

/** True where a road end lies within EDGE_METRES of the play box edge, of the drawn ground's edge or of the sea band. */
function atEdge(config: RoadRowConfig, reach: (p: P, margin: number) => boolean, inSea: (p: P) => boolean, p: P): boolean {
  const [south, west, north, east] = config.box, dy = EDGE_METRES / 110570, dx = EDGE_METRES / (111320 * Math.cos(p[1] * Math.PI / 180));
  if (p[1] - south < dy || north - p[1] < dy || p[0] - west < dx || east - p[0] < dx) return true;
  for (let k = 0; k < 8; k++) {
    const q: P = [p[0] + dx * Math.cos(k * Math.PI / 4), p[1] + dy * Math.sin(k * Math.PI / 4)];
    if (!reach(q, config.roadMarginDegrees) || inSea(q)) return true;
  }
  return false;
}

/** Map units (src/geo/frame.ts): an end this close to another road is on it, as the map's continuity check counts it (15 m). */
const JOIN_UNITS = 0.15;
/**
 * The [row, end] pairs the map would draw loose, and how many roads it draws: the rows quantised as written, projected to map
 * units, run through the map's tidy pass (src/map3d/road-tidy.ts: twin carriageways dropped, ends snapped, stubs dropped), then
 * every end that is neither on another road nor at the edge of the map.
 */
function looseOnTheMap(rows: readonly { rank: number; points: readonly P[]; edge: readonly [boolean, boolean] }[]): { loose: [number, 0 | 1][]; ribbons: number } {
  const at = new Map<string, [number, 0 | 1][]>(), edgeKeys = new Set<string>();
  const roads = rows.flatMap(({ rank, points, edge }, row) => {
    const q = points.map(([lon, lat]): P => [Math.round(lon * 1e4), Math.round(lat * 1e4)]).filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]);
    if (q.length < 2) return [];
    const line = q.map(([x, y]): [number, number] => { const f = project(x / 1e4, y / 1e4); return [f.x, f.z]; });
    for (const end of [0, 1] as const) {
      const key = `${line[end ? line.length - 1 : 0]!.join(',')}`, list = at.get(key) ?? [];
      list.push([row, end]); at.set(key, list);
      if (edge[end]) edgeKeys.add(key);
    }
    return [{ id: `road-${row}`, name: '', ...(rank <= 1 ? { major: true } : {}), points: line }];
  });
  const tidy = tidyRoads(roads);
  const seg = (p: readonly number[], a: readonly number[], b: readonly number[]): number => {
    const dx = b[0]! - a[0]!, dz = b[1]! - a[1]!, span = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0]! - a[0]!) * dx + (p[1]! - a[1]!) * dz) / span));
    return Math.hypot(p[0]! - a[0]! - dx * t, p[1]! - a[1]! - dz * t);
  };
  const loose: [number, 0 | 1][] = [];
  tidy.forEach((road, index) => {
    const line = road.points;
    for (const end of [line[0]!, line[line.length - 1]!]) {
      const key = `${end[0]},${end[1]}`;
      if (edgeKeys.has(key)) continue;
      const far = end === line[0] ? line[line.length - 1]! : line[0]!;
      if (Math.hypot(far[0] - end[0], far[1] - end[1]) < JOIN_UNITS) continue;
      const joined = tidy.some((other, o) => o !== index && other.points.some((p, k) => k > 0 && seg(end, other.points[k - 1]!, p) < JOIN_UNITS));
      if (!joined) loose.push(...(at.get(key) ?? []));
    }
  });
  return { loose, ribbons: tidy.length };
}
