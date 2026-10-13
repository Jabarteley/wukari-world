/**
 * Road ribbons for the mapped UNILAG campus. Pure geometry (no three import) so it is unit-testable.
 *
 * Each OSM way becomes ONE mitered strip with shared vertices (a rectangle per segment left notches and
 * spikes at every bend). Sharp turns split the strip, open ends get a rounded cap, and ends that meet another
 * road are left square because the other road covers them. Zebra crossings sit on the main junctions.
 * Layers are returned separately so the host can give each its own polygon offset instead of tiny height steps.
 */
import type { CampusMapRoad, MetrePoint } from './geo.ts';

export interface FlatLayer { pos: number[]; col: number[]; idx: number[] }
export type RoadLayers = Record<'verge' | 'surface' | 'marks', FlatLayer>;
export const ROAD_MAX_WIDTH = 8;
const FOOT = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway']);
export const isFootway = (road: Pick<CampusMapRoad, 'highway'>) => FOOT.has(road.highway);
/** Campus roads are narrow; OSM lane counts overstate them. */
export const roadWidth = (road: Pick<CampusMapRoad, 'highway' | 'width'>) => isFootway(road) ? Math.min(road.width, 3) : Math.min(road.width, ROAD_MAX_WIDTH);

const hex = (value: string): [number, number, number] => { const n = parseInt(value.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
const srgb = (c: number) => c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
const linear = (value: string) => hex(value).map(srgb) as [number, number, number];
const layer = (): FlatLayer => ({ pos: [], col: [], idx: [] });
const nearly = (a: MetrePoint, b: MetrePoint, d = .5) => Math.abs(a[0] - b[0]) < d && Math.abs(a[1] - b[1]) < d;
const key = (p: MetrePoint) => `${Math.round(p[0] / .75)}:${Math.round(p[1] / .75)}`;

/** Emit a triangle wound so it faces up (+y) whatever order the corners came in. */
function tri(out: FlatLayer, y: number, colour: [number, number, number], a: MetrePoint, b: MetrePoint, c: MetrePoint) {
  const cross = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(cross) < 1e-6) return;
  const base = out.pos.length / 3;
  for (const p of [a, b, c]) { out.pos.push(p[0], y, p[1]); out.col.push(...colour); }
  // viewed from +y with x right and z down the screen, a positive (x,z) cross product is the counter-clockwise (front) side.
  out.idx.push(...(cross < 0 ? [base, base + 1, base + 2] : [base, base + 2, base + 1]));
}

/** Drop repeats, then split where the way turns back on itself so a miter never explodes. */
export function cleanPieces(points: readonly MetrePoint[]): MetrePoint[][] {
  const pts: MetrePoint[] = [];
  for (const p of points) if (!pts.length || !nearly(pts[pts.length - 1]!, p, .3)) pts.push(p);
  const pieces: MetrePoint[][] = [];
  let cur: MetrePoint[] = [];
  for (let i = 0; i < pts.length; i++) {
    cur.push(pts[i]!);
    if (i > 0 && i < pts.length - 1) {
      const a = pts[i - 1]!, b = pts[i]!, c = pts[i + 1]!;
      const l0 = Math.hypot(b[0] - a[0], b[1] - a[1]), l1 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const dot = ((b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1])) / (l0 * l1);
      if (dot < -.3) { pieces.push(cur); cur = [b]; }
    }
  }
  pieces.push(cur);
  return pieces.filter(p => p.length > 1);
}

/** Left/right edge points of a mitered strip. Interior miters are clamped, so edges never spike. */
export function stripEdges(piece: readonly MetrePoint[], half: number, closed = false): Array<{ l: MetrePoint; r: MetrePoint }> {
  const n = piece.length, out: Array<{ l: MetrePoint; r: MetrePoint }> = [];
  const dir = (a: MetrePoint, b: MetrePoint): [number, number] => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? piece[i - 1]! : closed ? piece[n - 2]! : null, next = i < n - 1 ? piece[i + 1]! : closed ? piece[1]! : null;
    const d0 = prev ? dir(prev, piece[i]!) : dir(piece[i]!, next!), d1 = next ? dir(piece[i]!, next) : d0;
    let nx = -(d0[1] + d1[1]), nz = d0[0] + d1[0];
    const len = Math.hypot(nx, nz);
    if (len < 1e-6) { nx = -d0[1]; nz = d0[0]; } else { nx /= len; nz /= len; }
    const fit = Math.max(.55, nx * -d0[1] + nz * d0[0]);
    const o = half / fit, p = piece[i]!;
    out.push({ l: [p[0] + nx * o, p[1] + nz * o], r: [p[0] - nx * o, p[1] - nz * o] });
  }
  return out;
}

function cap(out: FlatLayer, y: number, colour: [number, number, number], at: MetrePoint, toward: MetrePoint, half: number) {
  const l = Math.hypot(at[0] - toward[0], at[1] - toward[1]) || 1, dx = (at[0] - toward[0]) / l, dz = (at[1] - toward[1]) / l;
  const base = Math.atan2(dz, dx), steps = 4;
  let prev: MetrePoint = [at[0] + Math.cos(base - Math.PI / 2) * half, at[1] + Math.sin(base - Math.PI / 2) * half];
  for (let i = 1; i <= steps; i++) {
    const a = base - Math.PI / 2 + Math.PI * i / steps, next: MetrePoint = [at[0] + Math.cos(a) * half, at[1] + Math.sin(a) * half];
    tri(out, y, colour, at, prev, next); prev = next;
  }
}

export interface RoadStyle { verge: string; foot: string; road: string; footPath: string; mark: string }
export const ROAD_STYLE: RoadStyle = { verge: '#c8c4b3', foot: '#c8c4b3', road: '#565e5e', footPath: '#b7ae95', mark: '#d9d5bc' };

export function buildRoadLayers(roads: readonly CampusMapRoad[], style: RoadStyle = ROAD_STYLE): RoadLayers {
  const layers: RoadLayers = { verge: layer(), surface: layer(), marks: layer() };
  const white = linear('#e9e6d3');
  // Road ends that touch another way stay square: a rounded cap there would poke out of the junction.
  const touching = new Map<string, number>();
  for (const road of roads) for (const p of road.points) touching.set(key(p), (touching.get(key(p)) ?? 0) + 1);
  const junctions: Array<{ at: MetrePoint; width: number; arms: MetrePoint[] }> = [];
  const nodeArms = new Map<string, { at: MetrePoint; width: number; arms: MetrePoint[]; ways: number }>();
  for (const road of roads) {
    const foot = isFootway(road), width = roadWidth(road), half = width / 2;
    const vergeColour = linear(style.verge), surfColour = linear(foot ? style.footPath : style.road);
    const closed = road.points.length > 3 && nearly(road.points[0]!, road.points[road.points.length - 1]!, .5);
    const pieces = closed ? [road.points.filter((p, i) => i === 0 || !nearly(p, road.points[i - 1]!, .3))] : cleanPieces(road.points);
    for (const piece of pieces) {
      if (piece.length < 2) continue;
      for (const [layerOut, y, colour, w] of [[layers.verge, .025, vergeColour, half + .9], [layers.surface, .065, surfColour, half]] as const) {
        const edges = stripEdges(piece, w, closed && pieces.length === 1);
        for (let i = 1; i < edges.length; i++) { const a = edges[i - 1]!, b = edges[i]!; tri(layerOut, y, colour, a.l, a.r, b.r); tri(layerOut, y, colour, a.l, b.r, b.l); }
        if (!(closed && pieces.length === 1)) {
          const first = piece[0]!, last = piece[piece.length - 1]!;
          if ((touching.get(key(first)) ?? 0) < 2) cap(layerOut, y, colour, first, piece[1]!, w);
          if ((touching.get(key(last)) ?? 0) < 2) cap(layerOut, y, colour, last, piece[piece.length - 2]!, w);
        }
      }
      if (foot || width < 6) continue;
      // dashed centre line, kept clear of both ends and of bends
      for (let i = 1; i < piece.length; i++) {
        const a = piece[i - 1]!, b = piece[i]!, length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const ux = (b[0] - a[0]) / (length || 1), uz = (b[1] - a[1]) / (length || 1);
        for (let d = 4; d + 3 < length - 3; d += 10) {
          const p: MetrePoint = [a[0] + ux * d, a[1] + uz * d], q: MetrePoint = [p[0] + ux * 3, p[1] + uz * 3];
          tri(layers.marks, .102, linear(style.mark), [p[0] - uz * .065, p[1] + ux * .065], [p[0] + uz * .065, p[1] - ux * .065], [q[0] + uz * .065, q[1] - ux * .065]);
          tri(layers.marks, .102, linear(style.mark), [p[0] - uz * .065, p[1] + ux * .065], [q[0] + uz * .065, q[1] - ux * .065], [q[0] - uz * .065, q[1] + ux * .065]);
        }
      }
    }
    if (!foot && width >= 6) for (let i = 0; i < road.points.length; i++) {
      const p = road.points[i]!, k = key(p), arm = road.points[i + 1] ?? road.points[i - 1];
      if (!arm || Math.hypot(arm[0] - p[0], arm[1] - p[1]) < 14) continue;
      const entry = nodeArms.get(k) ?? { at: p, width: 0, arms: [], ways: 0 }; entry.width = Math.max(entry.width, width); entry.arms.push(arm); entry.ways++; nodeArms.set(k, entry);
    }
    // arms in the other direction (previous point) also count at interior nodes
    if (!foot && width >= 6) for (let i = 1; i < road.points.length - 1; i++) {
      const p = road.points[i]!, arm = road.points[i - 1]!;
      if (Math.hypot(arm[0] - p[0], arm[1] - p[1]) < 14) continue;
      const entry = nodeArms.get(key(p)); if (entry) entry.arms.push(arm);
    }
  }
  for (const entry of nodeArms.values()) if (entry.arms.length >= 3) junctions.push(entry);
  // zebra crossings: on each arm of the busiest junctions (capped to keep the budget)
  for (const j of junctions.sort((a, b) => b.arms.length - a.arms.length).slice(0, 14)) for (const arm of j.arms.slice(0, 4)) {
    const length = Math.hypot(arm[0] - j.at[0], arm[1] - j.at[1]), ux = (arm[0] - j.at[0]) / length, uz = (arm[1] - j.at[1]) / length;
    const half = Math.min(j.width, ROAD_MAX_WIDTH) / 2, d0 = half + 2.4, d1 = d0 + 2.4;
    for (let o = -half + .7; o <= half - .6; o += 1.05) {
      const a: MetrePoint = [j.at[0] + ux * d0 - uz * o, j.at[1] + uz * d0 + ux * o], b: MetrePoint = [j.at[0] + ux * d1 - uz * o, j.at[1] + uz * d1 + ux * o];
      const t = .27;
      tri(layers.marks, .106, white, [a[0] - uz * t, a[1] + ux * t], [a[0] + uz * t, a[1] - ux * t], [b[0] + uz * t, b[1] - ux * t]);
      tri(layers.marks, .106, white, [a[0] - uz * t, a[1] + ux * t], [b[0] + uz * t, b[1] - ux * t], [b[0] - uz * t, b[1] + ux * t]);
    }
  }
  return layers;
}

/** A flat strip of `width` metres from a to b (pitch lines and similar markings). */
export function addStrip(out: FlatLayer, y: number, colour: string, a: MetrePoint, b: MetrePoint, width: number) {
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]); if (l < .01) return;
  const ux = (b[0] - a[0]) / l * width / 2, uz = (b[1] - a[1]) / l * width / 2, c = linear(colour);
  const p: MetrePoint = [a[0] - uz, a[1] + ux], q: MetrePoint = [a[0] + uz, a[1] - ux], r: MetrePoint = [b[0] + uz, b[1] - ux], s: MetrePoint = [b[0] - uz, b[1] + ux];
  tri(out, y, c, p, q, r); tri(out, y, c, p, r, s);
}
