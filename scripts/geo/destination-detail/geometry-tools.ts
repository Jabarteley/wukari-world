/** Small, dependency-free polygon and line tools for the destination-detail builders (WGS84 degrees, longitude first). */
import type { Element } from './overpass.ts';
import type { Pt } from '../../../src/game/cities/africa/polygonCheck.ts';
import { polygonProblem, triangulationProblem } from '../../../src/game/cities/africa/polygonCheck.ts';

export type P = [number, number];
export type Ring = P[];
export type Box = readonly [south: number, west: number, north: number, east: number];

export const inBox = (box: Box, [lon, lat]: P): boolean => lat >= box[0] && lat <= box[2] && lon >= box[1] && lon <= box[3];

/** Douglas-Peucker on a line; the tolerance is in degrees. */
export function simplify(points: P[], tolerance: number): P[] {
  if (points.length < 3) return points;
  const [ax, ay] = points[0]!, [bx, by] = points.at(-1)!;
  let worst = -1, at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i]!;
    const length = Math.hypot(bx - ax, by - ay) || 1e-12;
    const distance = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / length;
    if (distance > worst) { worst = distance; at = i; }
  }
  if (worst <= tolerance) return [points[0]!, points.at(-1)!];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

/** Simplify a closed ring (first point repeated at the end); returns a ring of at least four points or nothing. */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  const open = ring.slice(0, -1);
  if (open.length < 4) return open.length >= 3 ? [...open, open[0]!] : [];
  // Split at the farthest vertex so the closing edge is not simplified away.
  let far = 0, best = -1;
  open.forEach(([x, y], i) => { const d = Math.hypot(x - open[0]![0], y - open[0]![1]); if (d > best) { best = d; far = i; } });
  const a = simplify(open.slice(0, far + 1), tolerance), b = simplify([...open.slice(far), open[0]!], tolerance);
  const closed = [...a.slice(0, -1), ...b];
  return closed.length >= 4 ? closed : [];
}

/** Sutherland-Hodgman clip of a ring to a box. Concave rings may gain edges along the box, which is the map's own edge. */
export function clipRing(ring: Ring, box: Box): Ring {
  let points = ring.slice(0, -1);
  const edges: { inside: (p: P) => boolean; cross: (a: P, b: P) => P }[] = [
    { inside: (p) => p[0] >= box[1], cross: (a, b) => [box[1], a[1] + (b[1] - a[1]) * (box[1] - a[0]) / (b[0] - a[0])] },
    { inside: (p) => p[0] <= box[3], cross: (a, b) => [box[3], a[1] + (b[1] - a[1]) * (box[3] - a[0]) / (b[0] - a[0])] },
    { inside: (p) => p[1] >= box[0], cross: (a, b) => [a[0] + (b[0] - a[0]) * (box[0] - a[1]) / (b[1] - a[1]), box[0]] },
    { inside: (p) => p[1] <= box[2], cross: (a, b) => [a[0] + (b[0] - a[0]) * (box[2] - a[1]) / (b[1] - a[1]), box[2]] },
  ];
  for (const edge of edges) {
    const next: P[] = [];
    points.forEach((point, i) => {
      const prior = points[(i + points.length - 1) % points.length]!;
      if (edge.inside(point)) { if (!edge.inside(prior)) next.push(edge.cross(prior, point)); next.push(point); }
      else if (edge.inside(prior)) next.push(edge.cross(prior, point));
    });
    points = next;
    if (!points.length) return [];
  }
  return points.length >= 3 ? [...points, points[0]!] : [];
}

export const ringArea = (ring: Ring): number => Math.abs(ring.slice(1).reduce((sum, [x, y], i) => sum + ring[i]![0] * y - x * ring[i]![1], 0)) / 2;

export function inRing([x, y]: P, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i]!, [bx, by] = ring[j]!;
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) inside = !inside;
  }
  return inside;
}

/** Join way pieces end to end into closed rings. A piece that never closes is dropped, never forced shut. */
export function assemble(pieces: P[][]): Ring[] {
  const rest = pieces.filter((piece) => piece.length >= 2).map((piece) => piece.slice());
  const same = (a: P, b: P): boolean => a[0] === b[0] && a[1] === b[1];
  const rings: Ring[] = [];
  while (rest.length) {
    let line = rest.pop()!;
    for (let grew = true; grew && !same(line[0]!, line.at(-1)!);) {
      grew = false;
      for (let i = 0; i < rest.length; i++) {
        const piece = rest[i]!;
        const head = line[0]!, tail = line.at(-1)!;
        if (same(tail, piece[0]!)) line = [...line, ...piece.slice(1)];
        else if (same(tail, piece.at(-1)!)) line = [...line, ...piece.slice(0, -1).reverse()];
        else if (same(head, piece.at(-1)!)) line = [...piece.slice(0, -1), ...line];
        else if (same(head, piece[0]!)) line = [...piece.slice(1).reverse(), ...line];
        else continue;
        rest.splice(i, 1);
        grew = true;
        break;
      }
    }
    if (line.length >= 4 && same(line[0]!, line.at(-1)!)) rings.push(line);
  }
  return rings;
}

/** The outer and inner rings of one area element (a closed way, or a relation of outer and inner member ways). */
export function areaRings(element: Element): { outer: Ring[]; inner: Ring[] } {
  const line = (geometry: { lat: number; lon: number }[] | undefined): P[] => (geometry ?? []).map((g): P => [g.lon, g.lat]);
  if (element.type === 'way') return { outer: assemble([line(element.geometry)]), inner: [] };
  const members = element.members ?? [];
  return {
    outer: assemble(members.filter((m) => m.type === 'way' && m.role !== 'inner').map((m) => line(m.geometry))),
    inner: assemble(members.filter((m) => m.type === 'way' && m.role === 'inner').map((m) => line(m.geometry))),
  };
}

/** Outer rings with the inner rings that fall inside them, clipped to the box and simplified. */
export function polygonsOf(rings: { outer: Ring[]; inner: Ring[] }, box: Box, tolerance: number): Ring[][] {
  const out: Ring[][] = [];
  for (const outer of rings.outer) {
    const shell = simplifyRing(clipRing(outer, box), tolerance);
    if (!shell.length) continue;
    const holes = rings.inner.filter((inner) => inRing(inner[0]!, outer)).map((inner) => simplifyRing(clipRing(inner, box), tolerance)).filter((ring) => ring.length);
    out.push([shell, ...holes]);
  }
  return out;
}

export const round = (value: number, places = 5): number => Math.round(value * 10 ** places) / 10 ** places;
export const roundRing = (ring: Ring): Ring => ring.map(([lon, lat]): P => [round(lon), round(lat)]);

/** The outline is traced over the play box plus this margin (degrees), so the built-up ground ends where it really ends and not in a straight cut at the box edge. */
export const OUTLINE_MARGIN = 0.05;
/** Water is asked for, and drawn, this far (degrees) beyond the play box: the ground reaches 1.5 times the city's width past the traced land (at most 60 km), which is the play box plus the outline margin. */
export const reachFor = (box: Box): number => Math.min(0.6, Math.max(0.4, 1.5 * Math.max(box[2] - box[0], box[3] - box[1]) + 0.2));

/** Fill closed rings onto a grid (`value` 1 where covered). Every ring is filled on its own, so overlapping areas join instead of cancelling. Three scan lines per row, so a thin stream still lands in a cell. */
function fillRings(rings: readonly Ring[], cols: number, rows: number, box: Box, cell: number, into: Uint8Array): void {
  const byRow: number[][] = Array.from({ length: rows }, () => []);
  rings.forEach((ring, id) => {
    let lo = Infinity, hi = -Infinity;
    for (const [, y] of ring) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const r0 = Math.max(0, Math.floor((lo - box[0]) / cell) - 1), r1 = Math.min(rows - 1, Math.ceil((hi - box[0]) / cell) + 1);
    for (let r = r0; r <= r1; r++) byRow[r]!.push(id);
  });
  for (let r = 0; r < rows; r++) for (const part of [0.2, 0.5, 0.8]) {
    const lat = box[0] + (r + part) * cell;
    for (const id of byRow[r]!) {
      const ring = rings[id]!, hits: number[] = [];
      for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1]!, [bx, by] = ring[i]!;
        if ((ay > lat) !== (by > lat)) hits.push(ax + ((lat - ay) / (by - ay)) * (bx - ax));
      }
      hits.sort((a, b) => a - b);
      for (let h = 0; h + 1 < hits.length; h += 2) {
        const from = Math.max(0, Math.floor((hits[h]! - box[1]) / cell)), to = Math.min(cols - 1, Math.floor((hits[h + 1]! - box[1]) / cell));
        for (let c = from; c <= to; c++) into[r * cols + c] = 1;
      }
    }
  }
}

/** Drop filled regions under `minIsland` cells and fill empty pockets under `minHole` cells that do not reach the edge of the grid. */
function tidyMask(mask: Uint8Array, cols: number, rows: number, minIsland: number, minHole: number): void {
  const seen = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  for (const value of [1, 0]) {
    seen.fill(0);
    for (let start = 0; start < mask.length; start++) {
      if (seen[start] || mask[start] !== value) continue;
      let head = 0, tail = 0, edge = false;
      queue[tail++] = start; seen[start] = 1;
      while (head < tail) {
        const at = queue[head++]!, c = at % cols, r = (at - c) / cols;
        if (c === 0 || r === 0 || c === cols - 1 || r === rows - 1) edge = true;
        if (c > 0 && !seen[at - 1] && mask[at - 1] === value) { seen[at - 1] = 1; queue[tail++] = at - 1; }
        if (c < cols - 1 && !seen[at + 1] && mask[at + 1] === value) { seen[at + 1] = 1; queue[tail++] = at + 1; }
        if (r > 0 && !seen[at - cols] && mask[at - cols] === value) { seen[at - cols] = 1; queue[tail++] = at - cols; }
        if (r < rows - 1 && !seen[at + cols] && mask[at + cols] === value) { seen[at + cols] = 1; queue[tail++] = at + cols; }
      }
      if (value === 1 ? tail < minIsland : !edge && tail < minHole) for (let i = 0; i < tail; i++) mask[queue[i]!] = value === 1 ? 0 : 1;
    }
  }
}

/**
 * The built-up extent of an area as two sets of polygons: the play area (built-up ground and the water in it) and the land (the same without the water).
 * The built-up ground is the mapped land-use areas themselves (`areas`, closed rings), filled on a grid `cell / split` degrees wide (about 37 m), plus a disc round
 * every place of the game and round every labelled neighbourhood (a named quarter is built-up ground even where its land use is not mapped). The result is closed by `closeMetres` (small gaps between blocks join) and smoothed by a second blur, so the edge
 * follows the real edge of the mapped blocks as a smooth curve, and a coast, a lake shore or a river bank is the water polygons' own edge. Regions under `minIslandKm2`
 * are dropped and pockets under `minHoleKm2` are filled. Each polygon is an outer ring followed by its holes.
 */
export function builtUp(areas: readonly Ring[], anchors: readonly { at: P; metres: number }[], roads: readonly P[][], water: readonly Ring[][], box: Box, options: { cell: number; split: number; closeMetres: number; minIslandKm2: number; minHoleKm2: number; shore: number; joinMetres: number }): { play: Ring[][]; land: Ring[][]; water: Ring[][] } {
  const { cell, split, closeMetres, minIslandKm2, minHoleKm2, shore, joinMetres } = options;
  const fine = cell / split, fc = Math.ceil((box[3] - box[1]) / fine), fr = Math.ceil((box[2] - box[0]) / fine);
  const metresPerCell = fine * 111_000, cellKm2 = (metresPerCell / 1000) ** 2 * Math.cos(((box[0] + box[2]) / 2) * Math.PI / 180);
  const mask = new Uint8Array(fc * fr);
  fillRings(areas, fc, fr, box, fine, mask);
  for (const { at: [lon, lat], metres } of anchors) {
    const radius = Math.round(metres / metresPerCell);
    const c0 = Math.floor((lon - box[1]) / fine), r0 = Math.floor((lat - box[0]) / fine);
    for (let r = Math.max(0, r0 - radius); r <= Math.min(fr - 1, r0 + radius); r++) for (let c = Math.max(0, c0 - radius); c <= Math.min(fc - 1, c0 + radius); c++) if ((c - c0) ** 2 + (r - r0) ** 2 <= radius * radius) mask[r * fc + c] = 1;
  }
  const close = blur(mask, fc, fr, closeMetres / metresPerCell / 1.6);
  const joined = new Uint8Array(mask.length);
  for (let i = 0; i < joined.length; i++) joined[i] = close[i]! >= 0.3 ? 1 : 0;
  // Main roads join the fragments of one built-up area: where a road runs within `joinMetres` of the joined ground, a corridor round it (300 m each side) is built-up too.
  // A road far from any built-up ground adds nothing, so a highway across the countryside does not grow a spur.
  if (joinMetres > 0 && roads.length) {
    const near = blur(joined, fc, fr, joinMetres / metresPerCell / 1.6), corridor = Math.round(300 / metresPerCell);
    for (const line of roads) {
      for (let i = 1; i < line.length; i++) {
        const [ax, ay] = line[i - 1]!, [bx, by] = line[i]!;
        const steps = Math.max(1, Math.ceil(Math.hypot((bx - ax) * 111320 * Math.cos(ay * Math.PI / 180), (by - ay) * 110574) / 100));
        for (let k = 0; k <= steps; k++) {
          const c0 = Math.floor((ax + (bx - ax) * k / steps - box[1]) / fine), r0 = Math.floor((ay + (by - ay) * k / steps - box[0]) / fine);
          if (c0 < 0 || r0 < 0 || c0 >= fc || r0 >= fr || near[r0 * fc + c0]! < 0.1) continue;
          for (let r = Math.max(0, r0 - corridor); r <= Math.min(fr - 1, r0 + corridor); r++) for (let c = Math.max(0, c0 - corridor); c <= Math.min(fc - 1, c0 + corridor); c++) if ((c - c0) ** 2 + (r - r0) ** 2 <= corridor * corridor) joined[r * fc + c] = 1;
        }
      }
    }
  }
  const soft = blur(joined, fc, fr, 2.5);
  for (let i = 0; i < joined.length; i++) joined[i] = soft[i]! >= 0.5 ? 1 : 0;
  // Where the built-up ground runs on past the edge of the traced box, it ends in a wavy oval (an ellipse in the box, its radius varied by angle) and not in a straight cut,
  // so no edge of the traced box shows as a straight line; the discs round the places stay.
  for (let r = 0; r < fr; r++) for (let c = 0; c < fc; c++) {
    const dx = (c + 0.5 - fc / 2) / (fc / 2), dy = (r + 0.5 - fr / 2) / (fr / 2), rho = Math.hypot(dx, dy), theta = Math.atan2(dy, dx);
    if (rho > 1.02 + 0.045 * Math.sin(5 * theta + 0.7) + 0.03 * Math.sin(11 * theta + 2.1)) joined[r * fc + c] = 0;
  }
  for (const { at: [lon, lat], metres } of anchors) {
    const radius = Math.round(metres / metresPerCell), c0 = Math.floor((lon - box[1]) / fine), r0 = Math.floor((lat - box[0]) / fine);
    for (let r = Math.max(0, r0 - radius); r <= Math.min(fr - 1, r0 + radius); r++) for (let c = Math.max(0, c0 - radius); c <= Math.min(fc - 1, c0 + radius); c++) if ((c - c0) ** 2 + (r - r0) ** 2 <= radius * radius) joined[r * fc + c] = 1;
  }
  tidyMask(joined, fc, fr, Math.round(minIslandKm2 / cellKm2), Math.round(minHoleKm2 / cellKm2));
  // The water, filled on the same grid.
  const wet = new Uint8Array(fc * fr);
  fillRings(water.flatMap((polygon) => polygon.slice(0, 1)), fc, fr, box, fine, wet);
  // Inner rings of a water polygon (an island in a river) are land again.
  const islands = new Uint8Array(fc * fr);
  fillRings(water.flatMap((polygon) => polygon.slice(1)), fc, fr, box, fine, islands);
  for (let i = 0; i < wet.length; i++) if (islands[i]) wet[i] = 0;
  const play = new Uint8Array(fc * fr), land = new Uint8Array(fc * fr);
  for (let i = 0; i < play.length; i++) if (joined[i] || wet[i]) play[i] = 1;
  // The declared water is the water one cell in from its raster edge, so that it lies inside the play area whatever each outline's simplification does.
  const inner = new Uint8Array(fc * fr);
  const wetAt = (r: number, c: number): boolean => r < 0 || c < 0 || r >= fr || c >= fc || wet[r * fc + c] === 1;
  for (let r = 0; r < fr; r++) for (let c = 0; c < fc; c++) if (wet[r * fc + c] && wetAt(r - 1, c) && wetAt(r + 1, c) && wetAt(r, c - 1) && wetAt(r, c + 1)) inner[r * fc + c] = 1;
  for (let r = 0; r < fr; r++) for (let c = 0; c < fc; c++) {
    const at = r * fc + c;
    if (!joined[at] || wet[at]) continue;
    let near = false;
    for (let dr = -shore; dr <= shore && !near; dr++) for (let dc = -shore; dc <= shore; dc++) {
      const nr = r + dr, nc = c + dc;
      if (shore > 0 && nr >= 0 && nc >= 0 && nr < fr && nc < fc && wet[nr * fc + nc]) { near = true; break; }
    }
    if (!near) land[at] = 1;
  }
  // Smooth edges: each mask is blurred a little and cut between its samples (see `contour`). The play area is cut lower than the land and the water, so that it
  // always encloses them.
  return { play: smoothPolygons(play, fc, fr, box, fine, 1.3, 0.47), land: smoothPolygons(land, fc, fr, box, fine, 1.3, 0.53), water: smoothPolygons(wet, fc, fr, box, fine, 1.3, 0.53) };
}

/** A mask of 0 and 1 blurred with a Gaussian of the given standard deviation (in cells); beyond the grid counts as empty. */
export function blur(mask: Uint8Array, cols: number, rows: number, sigma: number): Float32Array {
  const radius = Math.ceil(sigma * 3), kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-((i - radius) ** 2) / (2 * sigma * sigma)));
  const total = kernel.reduce((a, b) => a + b, 0);
  const pass = (from: Float32Array, to: Float32Array, horizontal: boolean): void => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const cc = horizontal ? c + k : c, rr = horizontal ? r : r + k;
        if (cc >= 0 && rr >= 0 && cc < cols && rr < rows) sum += from[rr * cols + cc]! * kernel[k + radius]!;
      }
      to[r * cols + c] = sum / total;
    }
  };
  const a = Float32Array.from(mask), b = new Float32Array(mask.length);
  pass(a, b, true); pass(b, a, false);
  return a;
}

/** The outer rings (with their holes) of the filled cells of a grid. */
export function traceCells(fill: Uint8Array, cols: number, rows: number, box: Box, cell: number): Ring[][] {
  const key = (c: number, r: number): number => r * (cols + 1) + c;
  const next = new Map<number, number[]>();
  const edge = (c0: number, r0: number, c1: number, r1: number): void => {
    const from = key(c0, r0), list = next.get(from);
    if (list) list.push(key(c1, r1)); else next.set(from, [key(c1, r1)]);
  };
  const filled = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < cols && r < rows && fill[r * cols + c] === 1;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!filled(c, r)) continue;
    if (!filled(c, r - 1)) edge(c, r, c + 1, r);
    if (!filled(c + 1, r)) edge(c + 1, r, c + 1, r + 1);
    if (!filled(c, r + 1)) edge(c + 1, r + 1, c, r + 1);
    if (!filled(c - 1, r)) edge(c, r + 1, c, r);
  }
  const at = (k: number): P => [box[1] + (k % (cols + 1)) * cell, box[0] + Math.floor(k / (cols + 1)) * cell];
  const rings: Ring[] = [];
  for (const start of [...next.keys()]) {
    while (next.get(start)?.length) {
      const ring: Ring = [at(start)];
      let current = start;
      for (;;) {
        const options = next.get(current);
        if (!options?.length) break;
        const to = options.pop()!;
        ring.push(at(to));
        current = to;
        if (to === start) break;
      }
      if (ring.length >= 4 && current === start) rings.push(ring);
    }
  }
  const signed = (ring: Ring): number => ring.slice(1).reduce((sum, [x, y], i) => sum + ring[i]![0] * y - x * ring[i]![1], 0) / 2;
  const outers = rings.filter((ring) => signed(ring) > 0), holes = rings.filter((ring) => signed(ring) < 0);
  return outers.map((outer) => [outer, ...holes.filter((hole) => inRing(hole[0]!, outer))]);
}


/**
 * The outline of the part of a grid where `field` is at least `threshold`, as smooth polygons (marching squares: the edge is placed between
 * two samples by linear interpolation, so it is a curve and not a staircase of cells). The grid is padded by its own edge values and then by
 * an empty ring, so every contour closes. Each polygon is an outer ring (counter-clockwise) followed by its holes (clockwise).
 */
export function contour(field: Float32Array, cols: number, rows: number, box: Box, cell: number, threshold: number): Ring[][] {
  const W = cols + 2;
  const sample = (c: number, r: number): number => (c < 0 || r < 0 || c >= cols || r >= rows ? 0 : field[r * cols + c]!);
  // Samples at c in [-1, cols], r in [-1, rows]; the outer layer is empty, the next one repeats the edge so ground that reaches the edge is kept.
  const value = (c: number, r: number): number => (c <= -1 || r <= -1 || c >= cols || r >= rows ? 0 : sample(Math.min(cols - 1, Math.max(0, c)), Math.min(rows - 1, Math.max(0, r))));
  const hKey = (c: number, r: number): number => ((r + 1) * W + (c + 1)) * 2, vKey = (c: number, r: number): number => ((r + 1) * W + (c + 1)) * 2 + 1;
  const where = new Map<number, P>();
  const link = new Map<number, number[]>();
  const point = (key: number, x: number, y: number): void => { if (!where.has(key)) where.set(key, [box[1] + (x + 0.5) * cell, box[0] + (y + 0.5) * cell]); };
  const join = (a: number, b: number): void => { const la = link.get(a); if (la) la.push(b); else link.set(a, [b]); const lb = link.get(b); if (lb) lb.push(a); else link.set(b, [a]); };
  const lerp = (v0: number, v1: number): number => (threshold - v0) / (v1 - v0);
  for (let r = -1; r <= rows - 1 + 1 - 1; r++) for (let c = -1; c <= cols - 1; c++) {
    const a = value(c, r), b = value(c + 1, r), d = value(c + 1, r + 1), e = value(c, r + 1);
    const code = (a >= threshold ? 1 : 0) | (b >= threshold ? 2 : 0) | (d >= threshold ? 4 : 0) | (e >= threshold ? 8 : 0);
    if (code === 0 || code === 15) continue;
    const T = hKey(c, r), B = hKey(c, r + 1), L = vKey(c, r), R = vKey(c + 1, r);
    if ((code & 1) !== ((code >> 1) & 1)) point(T, c + lerp(a, b), r);
    if (((code >> 1) & 1) !== ((code >> 2) & 1)) point(R, c + 1, r + lerp(b, d));
    if (((code >> 3) & 1) !== ((code >> 2) & 1)) point(B, c + lerp(e, d), r + 1);
    if ((code & 1) !== ((code >> 3) & 1)) point(L, c, r + lerp(a, e));
    const centre = (a + b + d + e) / 4 >= threshold;
    switch (code) {
      case 1: case 14: join(T, L); break;
      case 2: case 13: join(T, R); break;
      case 3: case 12: join(L, R); break;
      case 4: case 11: join(R, B); break;
      case 6: case 9: join(T, B); break;
      case 7: case 8: join(L, B); break;
      case 5: if (centre) { join(T, R); join(L, B); } else { join(T, L); join(R, B); } break;
      case 10: if (centre) { join(T, L); join(R, B); } else { join(T, R); join(L, B); } break;
    }
  }
  const rings: Ring[] = [];
  const used = new Set<number>();
  for (const start of link.keys()) {
    if (used.has(start)) continue;
    const ring: Ring = [];
    let prev = -1, current = start;
    for (;;) {
      used.add(current);
      ring.push(where.get(current)!);
      const [n0, n1] = link.get(current)!;
      const to = n0 === prev ? n1! : n0!;
      prev = current;
      current = to;
      if (current === start) break;
      if (used.has(current)) break;
    }
    if (ring.length >= 3) rings.push([...ring, ring[0]!]);
  }
  const signed = (ring: Ring): number => ring.slice(1).reduce((sum, [x, y], i) => sum + ring[i]![0] * y - x * ring[i]![1], 0) / 2;
  const depth = (ring: Ring): number => rings.filter((other) => other !== ring && inRing(ring[0]!, other)).length;
  const out: { outer: Ring; holes: Ring[] }[] = [];
  const outers: Ring[] = [], holes: Ring[] = [];
  for (const ring of rings) { if (depth(ring) % 2 === 0) outers.push(signed(ring) < 0 ? [...ring].reverse() : ring); else holes.push(signed(ring) > 0 ? [...ring].reverse() : ring); }
  for (const outer of outers) out.push({ outer, holes: holes.filter((hole) => inRing(hole[0]!, outer)) });
  return out.map((o) => [o.outer, ...o.holes]);
}

/** A 0/1 mask as smooth polygons: blurred by `sigma` cells, then the contour where the blur is `threshold`. */
export function smoothPolygons(mask: Uint8Array, cols: number, rows: number, box: Box, cell: number, sigma: number, threshold: number): Ring[][] {
  return contour(blur(mask, cols, rows, sigma), cols, rows, box, cell, threshold);
}

/**
 * Rasterise one mapped area before tracing it back to polygons. This is a clipping fallback for large relations whose holes meet
 * the edge of `box`: clipping every ring separately can make a hole cross or touch its clipped outer ring, while the filled area
 * still has an unambiguous shape. Inner rings stay empty, so mapped islands remain land.
 */
export function rasterArea(rings: { outer: readonly Ring[]; inner: readonly Ring[] }, box: Box, cell: number): Ring[][] {
  const cols = Math.ceil((box[3] - box[1]) / cell), rows = Math.ceil((box[2] - box[0]) / cell);
  const filled = new Uint8Array(cols * rows), holes = new Uint8Array(cols * rows);
  fillRings(rings.outer, cols, rows, box, cell, filled);
  fillRings(rings.inner, cols, rows, box, cell, holes);
  for (let i = 0; i < filled.length; i++) if (holes[i]) filled[i] = 0;
  return smoothPolygons(filled, cols, rows, box, cell, 1.3, 0.5);
}

const roundPt = (p: P): P => [round(p[0]), round(p[1])];
const tidyRing = (ring: Ring): Ring => { const out: Ring = []; for (const p of ring) { const q = roundPt(p); const last = out.at(-1); if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q); } if (out.length && (out[0]![0] !== out.at(-1)![0] || out[0]![1] !== out.at(-1)![1])) out.push(out[0]!); return out; };

/**
 * Simplify polygons (outer ring and holes, Douglas-Peucker) and round them to five decimals, keeping only a result the renderer can triangulate:
 * Every ring retains 75–125% of its source area. Valid source polygons simplify each ring independently, retaining narrow islands;
 * other polygons retry the existing tolerance sequence without dropping rings. Every accepted polygon passes geometry and triangulation checks.
 */
export function safePolygons(polygons: readonly Ring[][], tolerance: number, project?: (p: Pt) => Pt): Ring[][] {
  const out: Ring[][] = [];
  for (const polygon of polygons) {
    let kept: Ring[] | null = null;
    const faithful = (ring: Ring, original: Ring): boolean => {
      const area = ringArea(original), simplified = ringArea(ring);
      return ring.length >= 4 && area > 0 && simplified >= area * 0.75 && simplified <= area * 1.25;
    };
    const wind = (rings: Ring[]): Ring[] => rings.map((ring, i) => {
      const area = ring.slice(1).reduce((sum, [x, y], j) => sum + ring[j]![0] * y - x * ring[j]![1], 0);
      return (i === 0) === (area > 0) ? ring : [...ring].reverse();
    });
    const valid = (rings: Ring[]): boolean => !polygonProblem(rings) && !triangulationProblem(rings, project);
    // A tiny island must not force every bank and island to keep all source vertices.
    // Change one ring at a time from a valid polygon; preserve every hole and its area.
    const independent = wind(polygon.map(tidyRing));
    if (independent.every((ring, i) => faithful(ring, polygon[i]!)) && valid(independent)) {
      for (let i = 0; i < independent.length; i++) {
        const original = independent[i]!;
        for (const tol of [tolerance, tolerance / 2, tolerance / 4, tolerance / 8]) {
          const simplified = tidyRing(simplifyRing(polygon[i]!, tol));
          if (!faithful(simplified, polygon[i]!)) continue;
          independent[i] = wind([simplified])[0]!;
          if (i > 0) independent[i] = [...independent[i]!].reverse();
          if (!polygonProblem(independent)) break;
          independent[i] = original;
        }
      }
      if (valid(independent)) kept = independent;
    }
    for (const tol of [tolerance, tolerance / 2, tolerance / 4, tolerance * 2, tolerance * 4, tolerance * 8, tolerance * 16, tolerance / 8, 0]) {
      if (kept) break;
      const rings = polygon.map((ring) => tidyRing(tol > 0 ? simplifyRing(ring, tol) : ring));
      if (!rings.length) break;
      if (!rings.every((ring, i) => faithful(ring, polygon[i]!))) continue;
      const first = rings[0]!;
      const holes = rings.slice(1);
      if (!holes.every((hole) => inRing(hole[0]!, first))) continue;
      // Outer ring counter-clockwise, holes clockwise.
      const wound = [first, ...holes].map((ring, i) => { const area = ring.slice(1).reduce((sum, [x, y], j) => sum + ring[j]![0] * y - x * ring[j]![1], 0); return (i === 0) === (area > 0) ? ring : [...ring].reverse(); });
      if (!polygonProblem(wound) && !triangulationProblem(wound, project)) { kept = wound; break; }
    }
    if (kept) out.push(kept);
  }
  return out;
}

/**
 * The sea, or a big lake, as water polygons, from the shore ways OpenStreetMap holds (the coastline, or the member ways of the lake's relation).
 * The ways are drawn as a barrier on a grid `cell` degrees wide over `wide`; the ground between the barriers falls into regions, and a region is land
 * when a known land point (a place of the game, a neighbourhood label) lies in it and water otherwise. The shore needs no direction, so the same
 * recipe serves a coastline and a lake. Closed shore ways also form barriers, so island land points cannot classify the surrounding sea. Returns the water of the whole box `wide`
 * (`far`) and the part of it within `bandMetres` of the shore and inside `box` (`band`, what the play area keeps).
 */
export function shoreWater(shore: readonly P[][], landPoints: readonly P[], box: Box, wide: Box, bandMetres: number, cell: number): { far: Ring[][]; band: Ring[][] } {
  const cols = Math.ceil((wide[3] - wide[1]) / cell), rows = Math.ceil((wide[2] - wide[0]) / cell);
  const barrier = new Uint8Array(cols * rows);
  const colOf = (lon: number): number => Math.floor((lon - wide[1]) / cell), rowOf = (lat: number): number => Math.floor((lat - wide[0]) / cell);
  for (const way of shore) {
    if (way.length < 2) continue;
    for (let i = 1; i < way.length; i++) {
      const [ax, ay] = way[i - 1]!, [bx, by] = way[i]!;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) / (cell / 3)));
      if (steps > 4000) continue;
      for (let k = 0; k <= steps; k++) {
        const c = colOf(ax + (bx - ax) * k / steps), r = rowOf(ay + (by - ay) * k / steps);
        if (c >= 0 && r >= 0 && c < cols && r < rows) barrier[r * cols + c] = 1;
      }
    }
  }
  // Regions of ground between the barriers (4-connected, so a stepped line cannot leak).
  const region = new Int32Array(cols * rows).fill(-1);
  const hasLand: boolean[] = [];
  const marked = new Set<number>();
  for (const [lon, lat] of landPoints) { const c = colOf(lon), r = rowOf(lat); if (c >= 0 && r >= 0 && c < cols && r < rows) marked.add(r * cols + c); }
  const queue = new Int32Array(cols * rows);
  for (let start = 0; start < region.length; start++) {
    if (barrier[start] || region[start] !== -1) continue;
    const id = hasLand.length;
    let head = 0, tail = 0, land = false;
    queue[tail++] = start; region[start] = id;
    while (head < tail) {
      const at = queue[head++]!, c = at % cols, r = (at - c) / cols;
      if (marked.has(at)) land = true;
      if (c > 0 && !barrier[at - 1] && region[at - 1] === -1) { region[at - 1] = id; queue[tail++] = at - 1; }
      if (c < cols - 1 && !barrier[at + 1] && region[at + 1] === -1) { region[at + 1] = id; queue[tail++] = at + 1; }
      if (r > 0 && !barrier[at - cols] && region[at - cols] === -1) { region[at - cols] = id; queue[tail++] = at - cols; }
      if (r < rows - 1 && !barrier[at + cols] && region[at + cols] === -1) { region[at + cols] = id; queue[tail++] = at + cols; }
    }
    hasLand.push(land);
  }
  // Closed coastlines are complete island outlines. Keep their interiors as source-backed land
  // even when no selected venue falls on the island; the outer ocean ring then remains water.
  const closedShore = shore.filter(way => way.length > 3 && way[0]![0] === way.at(-1)![0] && way[0]![1] === way.at(-1)![1]);
  const closedLand = new Uint8Array(cols * rows);
  fillRings(closedShore, cols, rows, wide, cell, closedLand);
  // Barrier cells cannot establish which side is land; only interior anchors and closed source
  // islands classify a region. Open water-facing cells remain water across the coastline barrier.
  const water = new Uint8Array(cols * rows);
  for (let at = 0; at < water.length; at++) if (!closedLand[at] && !barrier[at] && !hasLand[region[at]!]) water[at] = 1;
  // A shore cell belongs to the water when water lies beside it.
  for (let at = 0; at < water.length; at++) if (barrier[at]) {
    const c = at % cols;
    if ((c > 0 && water[at - 1]) || (c < cols - 1 && water[at + 1]) || (at >= cols && water[at - cols]) || (at + cols < water.length && water[at + cols])) water[at] = 2;
  }
  for (let at = 0; at < water.length; at++) if (water[at] === 2) water[at] = 1;
  // The band: water within `reach` cells of the ground, inside the play box.
  const reach = Math.max(1, Math.round(bandMetres / (cell * 111_000)));
  const distance = new Int32Array(cols * rows).fill(-1);
  let head = 0, tail = 0;
  for (let at = 0; at < water.length; at++) if (!water[at]) { distance[at] = 0; queue[tail++] = at; }
  while (head < tail) {
    const at = queue[head++]!;
    if (distance[at]! >= reach) continue;
    const c = at % cols;
    for (const next of [c > 0 ? at - 1 : -1, c < cols - 1 ? at + 1 : -1, at - cols, at + cols]) {
      if (next < 0 || next >= distance.length || !water[next] || distance[next] !== -1) continue;
      distance[next] = distance[at]! + 1; queue[tail++] = next;
    }
  }
  const band = new Uint8Array(cols * rows);
  const [c0, r0, c1, r1] = [colOf(box[1]), rowOf(box[0]), colOf(box[3]), rowOf(box[2])];
  for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) { const at = r * cols + c; if (water[at] && distance[at]! > 0) band[at] = 1; }
  // The grid's staircase is rounded off by a light blur, so a shore reads as a curve and not as 37 m steps.
  return { far: contour(blur(water, cols, rows, 1.6), cols, rows, wide, cell, 0.5), band: contour(blur(band, cols, rows, 1.6), cols, rows, wide, cell, 0.5) };
}

/** A lookup of where polygons (each an outer ring and holes, even-odd) cover a box, on a grid `cell` degrees wide: `near(point, margin)` asks whether the point, or any of eight points `margin` degrees round it, is covered. */
export function coverage(polygons: readonly Ring[][], box: Box, cell: number): (point: P, margin: number) => boolean {
  const cols = Math.ceil((box[3] - box[1]) / cell), rows = Math.ceil((box[2] - box[0]) / cell);
  const covered = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    const lat = box[0] + (r + 0.5) * cell;
    for (const polygon of polygons) {
      const hits: number[] = [];
      for (const ring of polygon) for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1]!, [bx, by] = ring[i]!;
        if ((ay > lat) !== (by > lat)) hits.push(ax + ((lat - ay) / (by - ay)) * (bx - ax));
      }
      hits.sort((a, b) => a - b);
      for (let h = 0; h + 1 < hits.length; h += 2) {
        const from = Math.max(0, Math.ceil((hits[h]! - box[1]) / cell - 0.5)), to = Math.min(cols - 1, Math.floor((hits[h + 1]! - box[1]) / cell - 0.5));
        for (let c = from; c <= to; c++) covered[r * cols + c] = 1;
      }
    }
  }
  const at = ([lon, lat]: P): boolean => {
    const c = Math.floor((lon - box[1]) / cell), r = Math.floor((lat - box[0]) / cell);
    return c >= 0 && r >= 0 && c < cols && r < rows && covered[r * cols + c] === 1;
  };
  return ([lon, lat], margin) => at([lon, lat]) || [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => (dx || dy) && at([lon + dx * margin, lat + dy * margin])));
}
