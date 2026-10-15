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
export interface CloseEndsOptions {
  /** True where a road end sits on the edge of the drawn ground (the play box, the outline or the shore): such an end is not loose. */
  readonly edgeAt: (p: P) => boolean;
  /** An end this close to another road (metres) is moved onto it, with a junction vertex added there. */
  readonly snapMetres?: number;
  /** A dead end is carried this far (metres) along its heading when that meets another road (a T-junction). */
  readonly extendMetres?: number;
  /** True when a stretch of a chain (of this class rank) off the drawn ground, between two pieces on it, may be drawn through. */
  readonly joinGap?: (gap: readonly P[], rank: number) => boolean;
  /**
   * The map's check of a choice: given the rows (class rank, points, whether each end is at the edge), the [row, end] pairs that
   * the map would still draw loose. Used to stop anchoring on junctions the map's tidy pass takes away (twin carriageways, slivers).
   */
  readonly looseAfter?: (rows: readonly { rank: number; points: readonly P[]; edge: readonly [boolean, boolean] }[]) => { loose: [number, 0 | 1][]; ribbons: number };
  /** At most this many roads once the map has tidied them (needs `looseAfter`): the weakest runs go until the count holds, but not motorways or trunk roads. */
  readonly maxRibbons?: number;
}
export interface SelectChainsOptions {
  minRoadKm: number; maxRows: number; maxPoints: number; toleranceAt: (p: P) => number; runsOf: (line: P[]) => P[][];
  /** Close the network (see closeNetwork); without it the selection is exactly the one of 5cd8596e. */
  closeEnds?: CloseEndsOptions;
}

export function selectChains(ways: readonly RoadWay[], options: SelectChainsOptions): ChainSelection {
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
  if (options.closeEnds) {
    // Cut first, then simplify each piece: a long straight chain simplified first can keep only its two ends, and lose all of
    // itself when one of them lies off the drawn ground; cut on the mapped vertices, a piece also ends close to the edge. A short
    // gap between two pieces of one chain (a field or a park the road crosses: `joinGap`) is drawn through, as the per-way rows did.
    const runs: ChainRun[] = [], cut: [boolean, boolean][] = [];
    for (const chain of chains) for (const piece of bridged(chain.points, options.runsOf(chain.points), options.closeEnds.joinGap && ((gap) => options.closeEnds!.joinGap!(gap, chain.rank)))) {
      const kept = simplifyChain(piece, junctions, options.toleranceAt);
      if (kept.length < 2) continue;
      runs.push({ rank: chain.rank, name: chain.name, points: kept, km: lengthKm(kept) });
      // An end where the drawn ground cut the chain (not the chain's own end) is at the edge of the map.
      cut.push([keyOf(piece[0]!) !== keyOf(chain.points[0]!), keyOf(piece.at(-1)!) !== keyOf(chain.points.at(-1)!)]);
    }
    return closeNetwork(runs, cut, chains.length, options, options.closeEnds);
  }
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

const isLongRun = (run: ChainRun, minRoadKm: number): boolean => run.rank <= 1 || run.km >= minRoadKm;
const scoreOf = (run: ChainRun): number => run.km * RANK_WEIGHT[Math.min(run.rank, 4)]!;

/** Pieces of one line (slices of it, in order) joined across the gaps between them that `joinGap` allows. */
function bridged(line: readonly P[], pieces: readonly P[][], joinGap: ((gap: readonly P[]) => boolean) | undefined): P[][] {
  if (!joinGap || pieces.length < 2) return pieces as P[][];
  const out: P[][] = [];
  let from = line.indexOf(pieces[0]![0]!), to = from + pieces[0]!.length - 1;
  for (const piece of pieces.slice(1)) {
    const start = line.indexOf(piece[0]!, to + 1);
    if (start > to && joinGap(line.slice(to, start + 1))) { to = start + piece.length - 1; continue; }
    out.push(line.slice(from, to + 1)); from = start; to = start + piece.length - 1;
  }
  out.push(line.slice(from, to + 1));
  return out;
}

/** Default reach of closeNetwork's end snapping and dead-end extension (metres). */
export const SNAP_METRES = 25;
export const EXTEND_METRES = 40;
/** Twin carriageways: within this distance (metres) along this share of a run's length (as the map's tidy pass, road-tidy.ts). */
const TWIN_METRES = 35, TWIN_SHARE = 0.85, TWIN_STEP = 25, TWIN_LONG_METRES = 200;
/** Rounds of the map check, and how many of them may refill the budget before the rest only prune. */
const CHECK_ROUNDS = 16, FILL_ROUNDS = 4;

/**
 * A capped selection whose every row end meets another row or the edge of the map, as far as the map can draw it (the roads-only
 * regeneration; selectChains with `closeEnds`, whose runs were cut to the drawn ground before simplification). Rows stay inside
 * the same row cap and point budget.
 *  1. Ends: a run end that is not a junction, not cut by the drawn ground and not at its edge (`edgeAt`) is moved onto another run
 *     within `snapMetres` (onto its vertex, or onto its line with a junction vertex added there); failing that it is carried up to
 *     `extendMetres` along its heading to the first run it meets (a T-junction closed).
 *  2. Spans: each run is cut back to its span between its outermost anchors (a vertex it shares with another kept run, or an end
 *     at the edge). A run with no span (a leaf stub, a loose piece) is dropped, and then the leaves that leaves: what is kept is
 *     the closed core of the network. Twin carriageways do not anchor each other (the map draws one of them). Motorways and trunk
 *     roads are kept whole (the per-way rows held them all; they are the roads a player reads first) and anchor the rest.
 *  3. Budgets: the weakest runs (length times class weight) go first, each with the leaves it leaves, until rows and points fit;
 *     a bridge between strong roads stays as long as both roads do. What is left of the budget is then spent on dropped runs, best
 *     first, whose span holds.
 *  4. Check (`looseAfter`): an end the map's tidy pass would still draw loose (its junction was a twin or a sliver the tidy pass
 *     drops) stops anchoring there and the core is pruned again (a main road stays whole; a short piece of one is cut back or
 *     dropped). With `maxRibbons`, the weakest runs go until the map draws no more roads than that.
 * Deterministic: input order breaks every tie.
 */
export function closeNetwork(input: readonly ChainRun[], cut: readonly (readonly [boolean, boolean])[], chainCount: number, options: SelectChainsOptions, close: CloseEndsOptions): ChainSelection {
  if (!input.length) return { runs: [], chains: chainCount, candidates: 0, points: 0, connectors: 0 };
  const snapM = close.snapMetres ?? SNAP_METRES, extendM = close.extendMetres ?? EXTEND_METRES;
  const lines: P[][] = input.map((run) => run.points.slice());
  // Local metres about the first vertex (a city is small enough for one scale).
  const kx = 111320 * Math.cos(lines[0]![0]![1] * Math.PI / 180), ky = 110570;
  const CELL = 60, STEP = 20;
  interface Seg { line: number; a: P; b: P; cells: string[] }
  const grid = new Map<string, Seg[]>(), segsOf: Seg[][] = lines.map(() => []);
  const cellOf = (x: number, y: number): string => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;
  const register = (seg: Seg): void => {
    const ax = seg.a[0] * kx, ay = seg.a[1] * ky, bx = seg.b[0] * kx, by = seg.b[1] * ky, n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / STEP));
    for (let s = 0; s <= n; s++) {
      const key = cellOf(ax + (bx - ax) * s / n, ay + (by - ay) * s / n);
      if (seg.cells.includes(key)) continue;
      seg.cells.push(key);
      const list = grid.get(key); if (list) list.push(seg); else grid.set(key, [seg]);
    }
  };
  lines.forEach((line, index) => { for (let i = 1; i < line.length; i++) { const seg = { line: index, a: line[i - 1]!, b: line[i]!, cells: [] }; segsOf[index]!.push(seg); register(seg); } });
  const near = (x: number, y: number): Seg[] => {
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), out = new Set<Seg>();
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cy - 1; j <= cy + 1; j++) for (const seg of grid.get(`${i},${j}`) ?? []) out.add(seg);
    // Grid order, then line and position: the same answer every run.
    return [...out].sort((s, t) => s.line - t.line || lines[s.line]!.indexOf(s.a) - lines[t.line]!.indexOf(t.a));
  };
  const runsAt = new Map<string, Set<number>>();
  const mark = (p: P, line: number): void => { const key = keyOf(p), set = runsAt.get(key) ?? new Set<number>(); set.add(line); runsAt.set(key, set); };
  lines.forEach((line, index) => { for (const p of line) mark(p, index); });
  /** Put `v` on `seg` (a split of the segment: same line, one vertex more) unless it is one of its ends already. */
  const insert = (seg: Seg, v: P): void => {
    if (v === seg.a || v === seg.b) return;
    const line = lines[seg.line]!, at = line.indexOf(seg.a);
    line.splice(at + 1, 0, v);
    const tail: Seg = { line: seg.line, a: v, b: seg.b, cells: [] };
    seg.b = v;
    const list = segsOf[seg.line]!; list.splice(list.indexOf(seg) + 1, 0, tail);
    register(tail);
    mark(v, seg.line);
  };

  // 1. Ends.
  const isRing = (line: readonly P[]): boolean => keyOf(line[0]!) === keyOf(line.at(-1)!);
  for (let index = 0; index < lines.length; index++) for (const end of [0, 1] as const) {
    const line = lines[index]!;
    if (cut[index]![end] || isRing(line) || line.length < 2) continue;
    const p = end === 0 ? line[0]! : line.at(-1)!;
    if ((runsAt.get(keyOf(p))?.size ?? 0) >= 2 || close.edgeAt(p)) continue;
    const px = p[0] * kx, py = p[1] * ky;
    let best: { seg: Seg; v: P; d: number } | null = null;
    for (const seg of near(px, py)) {
      if (seg.line === index) continue;
      const ax = seg.a[0] * kx, ay = seg.a[1] * ky, dx = seg.b[0] * kx - ax, dy = seg.b[1] * ky - ay, span = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / span)), d = Math.hypot(px - ax - dx * t, py - ay - dy * t);
      if (d > snapM || (best && d >= best.d)) continue;
      // Within a metre of a vertex, that vertex: no sliver of a segment.
      const v: P = t * Math.sqrt(span) < 1 ? seg.a : (1 - t) * Math.sqrt(span) < 1 ? seg.b : [(ax + dx * t) / kx, (ay + dy * t) / ky];
      best = { seg, v, d };
    }
    let extend = false;
    if (!best) {
      // A dead end: carry it on along its last step to the first road it meets.
      const q = end === 0 ? line[1]! : line.at(-2)!, hx = px - q[0] * kx, hy = py - q[1] * ky, h = Math.hypot(hx, hy);
      if (!h) continue;
      const ux = hx / h, uy = hy / h;
      let hit: { seg: Seg; v: P; t: number } | null = null;
      for (const seg of [...near(px, py), ...near(px + ux * extendM, py + uy * extendM)]) {
        if (seg.line === index) continue;
        const ax = seg.a[0] * kx, ay = seg.a[1] * ky, dx = seg.b[0] * kx - ax, dy = seg.b[1] * ky - ay, den = ux * dy - uy * dx;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((ax - px) * dy - (ay - py) * dx) / den, u = ((ax - px) * uy - (ay - py) * ux) / den;
        if (t <= 0 || t > extendM || u < 0 || u > 1 || (hit && t >= hit.t)) continue;
        const length = Math.hypot(dx, dy);
        const v: P = u * length < 1 ? seg.a : (1 - u) * length < 1 ? seg.b : [(ax + dx * u) / kx, (ay + dy * u) / ky];
        hit = { seg, v, t };
      }
      if (!hit) continue;
      best = { seg: hit.seg, v: hit.v, d: hit.t };
      extend = true;
    }
    insert(best.seg, best.v);
    const own = segsOf[index]!;
    if (extend) {
      // The end stays and a step is added on to the junction.
      if (end === 0) { line.unshift(best.v); const seg: Seg = { line: index, a: best.v, b: p, cells: [] }; own.unshift(seg); register(seg); }
      else { line.push(best.v); const seg: Seg = { line: index, a: p, b: best.v, cells: [] }; own.push(seg); register(seg); }
    } else {
      // The end moves onto the junction.
      if (end === 0) { line[0] = best.v; own[0]!.a = best.v; register(own[0]!); } else { line[line.length - 1] = best.v; own.at(-1)!.b = best.v; register(own.at(-1)!); }
      runsAt.get(keyOf(p))?.delete(index);
    }
    mark(best.v, index);
  }
  // A move can fold a two-point line onto one point: such a line is left out.
  const runs: ChainRun[] = lines.map((line, index) => ({ ...input[index]!, points: line, km: lengthKm(line) }));
  const edge = lines.map((line, index) => [cut[index]![0] || close.edgeAt(line[0]!), cut[index]![1] || close.edgeAt(line.at(-1)!)] as const);

  // Twins: a run that lies within TWIN_METRES of another along nearly all its length (the other carriageway of a dual road) is
  // drawn by that road (the map's tidy pass drops it), so that road does not count it as an anchor.
  const twins = lines.map(() => new Set<number>());
  lines.forEach((line, index) => {
    const hits = new Map<number, number>();
    let samples = 0;
    for (let i = 1; i < line.length; i++) {
      const ax = line[i - 1]![0] * kx, ay = line[i - 1]![1] * ky, bx = line[i]![0] * kx, by = line[i]![1] * ky, n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / TWIN_STEP));
      for (let s = 0; s < n; s++) {
        const x = ax + (bx - ax) * (s + 0.5) / n, y = ay + (by - ay) * (s + 0.5) / n, seen = new Set<number>();
        samples += 1;
        for (const seg of near(x, y)) {
          if (seg.line === index || seen.has(seg.line)) continue;
          const sx = seg.a[0] * kx, sy = seg.a[1] * ky, dx = seg.b[0] * kx - sx, dy = seg.b[1] * ky - sy, t = Math.max(0, Math.min(1, ((x - sx) * dx + (y - sy) * dy) / (dx * dx + dy * dy || 1)));
          if (Math.hypot(x - sx - dx * t, y - sy - dy * t) < TWIN_METRES) { seen.add(seg.line); hits.set(seg.line, (hits.get(seg.line) ?? 0) + 1); }
        }
      }
    }
    // This run is drawn by `other`: `other` does not count it as an anchor (long enough that the tidy pass cannot snap across it).
    if (samples * TWIN_STEP >= TWIN_LONG_METRES) for (const [other, count] of hits) if (count >= samples * TWIN_SHARE) twins[other]!.add(index);
  });

  // 2. Spans. A junction anchors both runs or neither: not between twins, and not at a vertex the check (4.) rejected for either.
  // Motorways and trunk roads are kept whole (the map's main roads; the rows before chaining held them all): they anchor the rest.
  const kept = runs.map((run) => run.rank <= 1);
  const chosen = runs.map(() => true);
  const banned = new Set<string>();
  const pairs = (p: P, self: number): boolean => {
    const key = keyOf(p);
    if (banned.has(`${self}|${key}`)) return false;
    for (const other of runsAt.get(key) ?? []) if (other !== self && chosen[other] && !twins[self]!.has(other) && !twins[other]!.has(self) && !banned.has(`${other}|${key}`)) return true;
    return false;
  };
  /** The [first, last] vertex of a run's span between anchors, or null when it has none (a leaf or a loose piece). */
  const spanOf = (index: number): [number, number] | null => {
    const line = lines[index]!;
    if (line.length < 2) return null;
    // A main road is kept whole: its own ends hold it, loose or not (cut back, a motorway would lose kilometres to one loose
    // end). Only a short piece of one with an end the check found loose is cut back, and dropped if nothing holds it.
    const own = (i: number): boolean => kept[index]! && (i === 0 || i === line.length - 1) && (runs[index]!.km >= options.minRoadKm || !banned.has(`${index}|${keyOf(line[i]!)}`));
    const anchor = (i: number): boolean => (i === 0 && edge[index]![0]) || (i === line.length - 1 && edge[index]![1]) || own(i) || pairs(line[i]!, index);
    if (isRing(line)) return kept[index] || line.some((_, i) => anchor(i)) ? [0, line.length - 1] : null;
    let from = -1, to = -1;
    for (let i = 0; i < line.length; i++) if (anchor(i)) { if (from < 0) from = i; to = i; }
    return from >= 0 && to > from ? [from, to] : null;
  };
  const cost = (index: number): number => { const span = spanOf(index); return span ? span[1] - span[0] + 1 : 0; };
  // The runs that share a vertex with each run: the only spans a change to it can move.
  const neighbours = lines.map((line, index) => { const out = new Set<number>(); for (const p of line) for (const other of runsAt.get(keyOf(p)) ?? []) if (other !== index) out.add(other); return [...out].sort((x, y) => x - y); });
  const costs = runs.map((_, index) => cost(index));
  let rows = runs.length, points = costs.reduce((sum, c) => sum + c, 0);
  const recost = (index: number): void => { const c = chosen[index] ? cost(index) : 0; points += c - costs[index]!; costs[index] = c; };
  /** Drop every chosen run in `queue` (and then its neighbours) that has no span left: leaves go, and the leaves they leave. */
  const prune = (queue: number[]): void => {
    for (let at = 0; at < queue.length; at++) {
      const index = queue[at]!;
      if (!chosen[index]) continue;
      recost(index);
      if (costs[index]) continue;
      chosen[index] = false; rows -= 1;
      for (const other of neighbours[index]!) if (chosen[other]) queue.push(other);
    }
  };
  const remove = (index: number): void => {
    chosen[index] = false; rows -= 1; recost(index);
    prune([...neighbours[index]!]);
  };
  prune(runs.map((_, index) => index));
  // 3. Within the budgets: the weakest runs go first (short, minor), each with the leaves it leaves; a bridge between strong roads
  // stays as long as both roads do.
  const order = runs.map((run, index) => ({ run, index })).sort((a, b) => scoreOf(b.run) - scoreOf(a.run) || a.run.rank - b.run.rank || a.index - b.index);
  let rowCap = options.maxRows;
  const fits = (): boolean => rows <= rowCap && points <= options.maxPoints;
  for (let at = order.length - 1; at >= 0 && !fits(); at--) if (chosen[order[at]!.index] && !kept[order[at]!.index]) remove(order[at]!.index);
  // Main roads go too, weakest first, only if they alone overflow the budgets.
  for (let at = order.length - 1; at >= 0 && !fits(); at--) if (chosen[order[at]!.index]) { kept[order[at]!.index] = false; remove(order[at]!.index); }
  /** Spend what is left on runs that were dropped, best first, where their span holds and the budgets allow. */
  const fill = (): void => {
    for (let added = true; added;) {
      added = false;
      for (const { index } of order) {
        if (chosen[index] || rows + 1 > rowCap) continue;
        chosen[index] = true;
        if (!cost(index)) { chosen[index] = false; continue; }
        rows += 1; recost(index);
        for (const other of neighbours[index]!) if (chosen[other]) recost(other);
        if (points > options.maxPoints) {
          chosen[index] = false; rows -= 1; recost(index);
          for (const other of neighbours[index]!) if (chosen[other]) recost(other);
          continue;
        }
        added = true;
      }
    }
  };
  fill();
  // 4. Check: the ends the map's tidy pass would still leave loose (close.looseAfter) stop anchoring there; the spans shrink to
  // the next anchor and the choice is pruned again. The first rounds refill the freed budget; the last rounds only prune.
  const spans = (): { index: number; points: P[]; edge: [boolean, boolean] }[] => runs.flatMap((_, index) => {
    if (!chosen[index]) return [];
    const span = spanOf(index)!, line = lines[index]!;
    return [{ index, points: line.slice(span[0], span[1] + 1), edge: [span[0] === 0 && edge[index]![0], span[1] === line.length - 1 && edge[index]![1]] as [boolean, boolean] }];
  });
  for (let round = 0; close.looseAfter && round < CHECK_ROUNDS; round++) {
    const current = spans();
    const { loose, ribbons } = close.looseAfter(current.map(({ index, points: line, edge: ends }) => ({ rank: runs[index]!.rank, points: line, edge: ends })));
    if (close.maxRibbons !== undefined && ribbons > close.maxRibbons) {
      // Too many roads on the map: the weakest runs go (with their leaves) in proportion, and no refill may bring them back.
      const target = Math.floor(rows * close.maxRibbons / ribbons);
      for (let at = order.length - 1; at >= 0 && rows > target; at--) if (chosen[order[at]!.index] && !kept[order[at]!.index]) remove(order[at]!.index);
      rowCap = Math.min(rowCap, rows);
      continue;
    }
    if (!loose.length) break;
    const queue: number[] = [], bans = banned.size;
    for (const [at, end] of loose) {
      const { index, points: line } = current[at]!, key = keyOf(end === 0 ? line[0]! : line.at(-1)!);
      banned.add(`${index}|${key}`);
      queue.push(index, ...(runsAt.get(key) ?? []));
    }
    if (banned.size === bans) break;
    prune(queue);
    if (round < FILL_ROUNDS) fill();
  }
  let connectors = 0;
  runs.forEach((run, index) => { if (chosen[index] && !isLongRun(run, options.minRoadKm)) connectors += 1; });

  // Rows: each chosen run cut to its span; rank order, then longest first.
  const picked: ChainRun[] = [];
  runs.forEach((run, index) => {
    if (!chosen[index]) return;
    const span = spanOf(index)!, line = lines[index]!.slice(span[0], span[1] + 1);
    picked.push({ rank: run.rank, name: run.name, points: line, km: lengthKm(line) });
  });
  const sorted = picked.map((run, index) => ({ run, index })).sort((a, b) => a.run.rank - b.run.rank || b.run.km - a.run.km || a.index - b.index).map(({ run }) => run);
  return { runs: sorted, chains: chainCount, candidates: runs.length, points: sorted.reduce((sum, run) => sum + run.points.length, 0), connectors };
}
