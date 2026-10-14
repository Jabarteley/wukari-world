/**
 * Road chains for a city whose per-way road rows would overflow the row cap (`maxRoads`).
 *
 * OpenStreetMap cuts one street into many ways (at every bridge, lane change or bus lane). Drawn one row per way, a dense city
 * spends its row cap on fragments: the longest ways are kept, the short pieces between them (junction connectors) are lost and
 * the network falls apart. Here the ways are first JOINED into chains (same class and name, end to end at a shared node, the
 * straightest continuation first), then simplified with every junction node kept (so a road that ends on another one ends on a
 * vertex of it), cut where they leave the drawn ground, and only then filtered and ranked: by class and length, inside the same
 * row cap and a point budget (the points the per-way rows would have spent), so the file and the scene do not grow. A short
 * piece is kept as a connector when both its ends meet kept roads.
 *
 * Pure and deterministic: no randomness, ties broken by input order. build-destination-detail.ts uses it only when the per-way
 * candidates outnumber `maxRoads`; every other city keeps its per-way rows byte for byte.
 */
import { simplify } from './geometry-tools.ts';
import type { P } from './geometry-tools.ts';

/** One source way: class rank (0 motorway, 1 trunk, 2 primary, 3 secondary, 4 other), display name and raw lon/lat points. */
export interface RoadWay { readonly rank: number; readonly name: string; readonly points: readonly P[] }
/** A joined chain of ways: same class and name, end to end. `ways` counts the source ways in it. */
export interface RoadChain { readonly rank: number; readonly name: string; readonly points: P[]; readonly ways: number }
export interface ChainRun { readonly rank: number; readonly name: string; readonly points: P[]; readonly km: number }
export interface ChainSelection { readonly runs: ChainRun[]; readonly chains: number; readonly candidates: number; readonly points: number; readonly connectors: number }

/** The class rank of an OSM highway value (motorway and trunk are the "major" roads of a row). */
export const ROAD_RANK: Readonly<Record<string, number>> = { motorway: 0, trunk: 1, primary: 2, secondary: 3 };
export const rankOf = (highway: string): number => ROAD_RANK[highway] ?? 4;
/** How much a kilometre of each class counts when ranking: a motorway outranks a primary of twice its length. */
const RANK_WEIGHT = [4, 3, 2, 1, 1] as const;
/** The largest turn (degrees) at which two pieces of one road still continue each other at a shared node. */
const MAX_TURN_DEGREES = 60;
/** The share of the row and point budgets the long roads may take before the connectors are added. */
const LONG_SHARE = 0.85;

const keyOf = (p: P): string => `${p[0]},${p[1]}`;
export const lengthKm = (line: readonly P[]): number => line.slice(1).reduce((sum, [lon, lat], i) => sum + Math.hypot((lon - line[i]![0]) * 111.32 * Math.cos(lat * Math.PI / 180), (lat - line[i]![1]) * 110.57), 0);

/** The unit direction leaving a way's end (`end` 0 = first point, 1 = last), in local metres, or null if the way has no length. */
function away(points: readonly P[], end: 0 | 1): [number, number] | null {
  const from = end === 0 ? points[0]! : points.at(-1)!;
  const step = end === 0 ? 1 : -1;
  for (let i = end === 0 ? 1 : points.length - 2; i >= 0 && i < points.length; i += step) {
    const p = points[i]!, dx = (p[0] - from[0]) * Math.cos(from[1] * Math.PI / 180), dy = p[1] - from[1], d = Math.hypot(dx, dy);
    if (d > 0) return [dx / d, dy / d];
  }
  return null;
}

/** Join ways end to end into chains. Only ways of one class and one name join, at a node where both end, and only if the turn there is gentle. */
export function joinWays(ways: readonly RoadWay[]): RoadChain[] {
  const partner = new Map<string, { way: number; end: 0 | 1 }>();
  const at = new Map<string, { way: number; end: 0 | 1; dir: [number, number] }[]>();
  ways.forEach((way, index) => {
    if (way.points.length < 2 || keyOf(way.points[0]!) === keyOf(way.points.at(-1)!)) return; // a closed way (a roundabout) stays whole
    for (const end of [0, 1] as const) {
      const dir = away(way.points, end);
      if (!dir) continue;
      const node = `${way.rank}\u0000${way.name}\u0000${keyOf(end === 0 ? way.points[0]! : way.points.at(-1)!)}`;
      const list = at.get(node) ?? [];
      list.push({ way: index, end, dir });
      at.set(node, list);
    }
  });
  const cosLimit = Math.cos((180 - MAX_TURN_DEGREES) * Math.PI / 180);
  for (const list of at.values()) {
    if (list.length < 2) continue;
    // Straight on first: two ends continue each other when they leave the node in opposite directions.
    const pairs: { a: number; b: number; dot: number }[] = [];
    for (let a = 0; a < list.length; a++) for (let b = a + 1; b < list.length; b++) {
      if (list[a]!.way === list[b]!.way) continue;
      const dot = list[a]!.dir[0] * list[b]!.dir[0] + list[a]!.dir[1] * list[b]!.dir[1];
      if (dot <= cosLimit) pairs.push({ a, b, dot });
    }
    pairs.sort((x, y) => x.dot - y.dot || x.a - y.a || x.b - y.b);
    const used = new Set<number>();
    for (const { a, b } of pairs) {
      if (used.has(a) || used.has(b)) continue;
      used.add(a); used.add(b);
      const ea = list[a]!, eb = list[b]!;
      partner.set(`${ea.way}:${ea.end}`, { way: eb.way, end: eb.end });
      partner.set(`${eb.way}:${eb.end}`, { way: ea.way, end: ea.end });
    }
  }
  const seen = new Set<number>(), chains: RoadChain[] = [];
  const walk = (start: number, enter: 0 | 1): void => {
    const points: P[] = [];
    let way: number | undefined = start, end: 0 | 1 = enter, count = 0;
    while (way !== undefined && !seen.has(way)) {
      seen.add(way); count += 1;
      const line = ways[way]!.points, ordered = end === 0 ? line : [...line].reverse();
      points.push(...(points.length ? ordered.slice(1) : ordered));
      const next = partner.get(`${way}:${end === 0 ? 1 : 0}`);
      way = next?.way; end = next?.end ?? 0;
    }
    chains.push({ rank: ways[start]!.rank, name: ways[start]!.name, points, ways: count });
  };
  // Open chains start at an end with no partner; what is left is a ring of joined ways, opened at its first way.
  ways.forEach((_, index) => {
    if (seen.has(index)) return;
    if (!partner.has(`${index}:0`)) walk(index, 0);
    else if (!partner.has(`${index}:1`)) walk(index, 1);
  });
  ways.forEach((_, index) => { if (!seen.has(index)) walk(index, 0); });
  return chains;
}

/**
 * Simplify a chain, keeping every vertex in `keep` (the ends of other chains that meet it): Douglas-Peucker between kept vertices,
 * at the core tolerance where the stretch starts in the core and the far tolerance elsewhere. Repeated points are dropped.
 */
export function simplifyChain(points: readonly P[], keep: ReadonlySet<string>, toleranceAt: (p: P) => number): P[] {
  const out: P[] = [];
  let from = 0;
  for (let i = 1; i < points.length; i++) {
    if (i < points.length - 1 && !keep.has(keyOf(points[i]!))) continue;
    const part = simplify(points.slice(from, i + 1) as P[], toleranceAt(points[from]!));
    out.push(...(out.length ? part.slice(1) : part));
    from = i;
  }
  return out.filter((p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1]);
}

/**
 * Chains to rows: join, simplify (junctions kept), cut to the drawn ground with `runsOf`, then choose. Long roads (at least
 * `minRoadKm`, or motorway/trunk) rank by length times class weight; a short run is a connector when both its ends are vertices of
 * chosen long roads. At most `maxRows` rows and `maxPoints` points in all.
 */
export function selectChains(ways: readonly RoadWay[], options: { minRoadKm: number; maxRows: number; maxPoints: number; toleranceAt: (p: P) => number; runsOf: (line: P[]) => P[][] }): ChainSelection {
  const chains = joinWays(ways);
  // Junction nodes: a node on two or more chains (a road ending on another, or two roads crossing at a shared node).
  const seenOn = new Map<string, number>(), junctions = new Set<string>();
  chains.forEach((chain, index) => {
    for (const p of chain.points) {
      const key = keyOf(p), first = seenOn.get(key);
      if (first === undefined) seenOn.set(key, index);
      else if (first !== index) junctions.add(key);
    }
  });
  const runs: ChainRun[] = [];
  for (const chain of chains) {
    const kept = simplifyChain(chain.points, junctions, options.toleranceAt);
    if (kept.length < 2) continue;
    for (const piece of options.runsOf(kept)) if (piece.length > 1) runs.push({ rank: chain.rank, name: chain.name, points: piece, km: lengthKm(piece) });
  }
  const isLong = (run: ChainRun): boolean => run.rank <= 1 || run.km >= options.minRoadKm;
  const score = (run: ChainRun): number => run.km * RANK_WEIGHT[Math.min(run.rank, 4)]!;
  const order = runs.map((run, index) => ({ run, index }));
  const long = order.filter(({ run }) => isLong(run)).sort((a, b) => score(b.run) - score(a.run) || a.run.rank - b.run.rank || a.index - b.index);
  const short = order.filter(({ run }) => !isLong(run)).sort((a, b) => a.run.rank - b.run.rank || a.run.km - b.run.km || a.index - b.index);
  const chosen = new Set<number>(), vertices = new Map<string, Set<number>>();
  let rows = 0, points = 0, connectors = 0;
  const take = (index: number, run: ChainRun): void => {
    chosen.add(index); rows += 1; points += run.points.length;
    for (const p of run.points) { const key = keyOf(p), set = vertices.get(key) ?? new Set<number>(); set.add(index); vertices.set(key, set); }
  };
  const fits = (run: ChainRun, share: number): boolean => rows + 1 <= Math.floor(options.maxRows * share) && points + run.points.length <= Math.floor(options.maxPoints * share);
  for (const { run, index } of long) if (fits(run, LONG_SHARE)) take(index, run);
  const meets = (p: P, self: number): boolean => [...(vertices.get(keyOf(p)) ?? [])].some((other) => other !== self);
  for (const { run, index } of short) if (fits(run, 1) && meets(run.points[0]!, index) && meets(run.points.at(-1)!, index)) { take(index, run); connectors += 1; }
  for (const { run, index } of long) if (!chosen.has(index) && fits(run, 1)) take(index, run);
  // Rows in rank order, then longest first, as the per-way rows were (major roads first, then by length).
  const picked = order.filter(({ index }) => chosen.has(index)).sort((a, b) => a.run.rank - b.run.rank || b.run.km - a.run.km || a.index - b.index).map(({ run }) => run);
  return { runs: picked, chains: chains.length, candidates: runs.length, points, connectors };
}
