/**
 * The road rows of a destination's terrain.ts, from the recorded road ways (build-destination-detail.ts calls this; pure, so the
 * stage can be pinned by fixtures in road-rows.test.ts).
 *
 * Per-way rows (every city whose candidates fit the row cap, byte for byte as before): each way is simplified on its own, cut where
 * it leaves the drawn ground or enters the sea band, pieces under `minRoadKm` that are not motorway or trunk are dropped, the rest
 * is sorted major first and longest first and cut at `maxRoads`.
 * Chained rows (only when those candidates overflow `maxRoads`): see road-chains.ts. Same row cap, and no more points than the
 * per-way rows would have spent.
 */
import { inBox, simplify } from './geometry-tools.ts';
import type { Box, P } from './geometry-tools.ts';
import type { Element } from './overpass.ts';
import { lengthKm, rankOf, selectChains } from './road-chains.ts';

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

export function roadRows(elements: readonly Element[], config: RoadRowConfig, reach: (p: P, margin: number) => boolean, inSea: (p: P) => boolean, nameIn: (tags: Record<string, string> | undefined) => string): RoadRows {
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
  });
  // Quantised, a vertex that lands on the one before it is dropped (no zero-length steps), and a run left with one point is dropped.
  const quantised = chained.runs.map((run) => ({ run, q: run.points.map(([lon, lat]): P => [Math.round(lon * 1e4), Math.round(lat * 1e4)]).filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]) })).filter(({ q }) => q.length > 1);
  const rows = quantised.map(({ run, q }) => `  [${JSON.stringify(run.name)}, ${run.rank <= 1 ? 1 : 0}, ${q[0]![0]}, ${q[0]![1]}, ${q.slice(1).flatMap(([x, y], i) => [x - q[i]![0], y - q[i]![1]]).join(', ')}],`);
  const points = quantised.reduce((sum, { q }) => sum + q.length, 0);
  return {
    rows, points,
    chained: { perWayRows: perWay.length, perWayPoints, chains: chained.chains, connectors: chained.connectors },
    note: `${rows.length} roads of ${chained.candidates} candidates: ${candidates.length} way pieces overflowed the ${config.maxRoads}-row cap, so the ways were joined end to end into ${chained.chains} chains (same class and name, junction nodes kept), cut to the outline, ranked by class and length (none under ${config.minRoadKm} km unless motorway, trunk or a connector between two kept roads, ${chained.connectors} connectors) inside ${config.maxRoads} rows and the ${perWayPoints}-point budget of the per-way rows; ${points} points`,
  };
}
