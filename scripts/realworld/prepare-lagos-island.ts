/**
 * Development: merge the Lagos Island sources (public/realworld/lagos-island: mapped.json, open-buildings-heights.json,
 * roof-colours.json, osm-extra.json, shore-ways.json; provenance in PROVENANCE.md) into world.json for the realworld prototype.
 * Coordinates are street metres (x east, z south) around 3.4°E 6.45°N (src/geo/frame.ts), as in mapped.json.
 *   node --experimental-strip-types scripts/realworld/prepare-lagos-island.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
const ClipperLib = createRequire(import.meta.url)('clipper-lib');

const dir = join(import.meta.dirname, '../../public/realworld/lagos-island');
const read = (name: string) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
type P = [number, number];
const R = 6371.0088, DEG = Math.PI / 180, UPK = 10, UPD_LAT = R * DEG * UPK, UPD_LON = UPD_LAT * Math.cos(9 * DEG);
const project = (lon: number, lat: number): P => [(lon - 8) * UPD_LON, (9 - lat) * UPD_LAT];
const ORIGIN = project(3.4, 6.45).map(Math.round) as P;
const toMetres = (lon: number, lat: number): P => { const [x, z] = project(lon, lat); return [round((x - ORIGIN[0]) * 100), round((z - ORIGIN[1]) * 100)]; };
const round = (v: number) => Math.round(v * 100) / 100;

const mapped = read('mapped.json'), heights = read('open-buildings-heights.json').heights as { id: string; height_m: number | null; presence: number }[];
const roofs = read('roof-colours.json') as Record<string, string>, extra = read('osm-extra.json'), shore = read('shore-ways.json');
const measured = new Map(heights.map((h) => [h.id, h]));

const buildings = (mapped.buildings as { id: string; ring: P[]; height: number; levels?: number; use: string; roof?: string }[]).map((b) => {
  const m = measured.get(b.id);
  // The measured roof height wins when the satellite saw a roof there; small or unseen footprints keep the mapped height.
  const height = m?.height_m && m.presence > 0.2 ? Math.max(3, m.height_m) : b.height;
  return { id: b.id, ring: b.ring, height: round(height), levels: b.levels ?? null, use: b.use, roof: roofs[b.id] ?? b.roof ?? null };
});

// The island's shore, east to south-east: the lagoon's north shore, the short link at the channel mouth, the Marina along
// Commodore Channel, then two short pieces past the harbour. The ways branch where the lagoon, the channel and the mainland
// shore meet, so the order is listed (OSM way ids from shore-ways.json); each way is turned to join the one before.
const SHORE_WAYS = [294559015, 158039865, 87798478, 1292697545, 1292697544];
const byId = new Map((shore.elements as { id: number; geometry?: { lat: number; lon: number }[] }[]).map((w) => [w.id, (w.geometry ?? []).map((g) => [g.lon, g.lat] as P)]));
const gap = (p: P, q: P) => Math.hypot((p[0] - q[0]) * 110_000, (p[1] - q[1]) * 110_000);
let best: P[] = [];
for (const id of SHORE_WAYS) {
  let w = byId.get(id); if (!w?.length) throw new Error(`shore way ${id} missing`);
  if (best.length) { const end = best[best.length - 1]!; if (gap(end, w[w.length - 1]!) < gap(end, w[0]!)) w = [...w].reverse(); if (gap(end, w[0]!) > 10) throw new Error(`shore way ${id} does not join`); best.push(...w.slice(1)); }
  else best = [...w];
}
const shoreline = best.map(([lon, lat]) => toMetres(lon, lat));

const landUse = (extra.elements as { type: string; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[]; lat?: number; lon?: number }[]);
const polygons = landUse.filter((e) => e.type === 'way' && e.geometry && e.geometry.length > 3 && e.tags && (e.tags.landuse || e.tags.leisure || e.tags.amenity === 'parking' || e.tags.natural))
  .map((e) => ({ kind: e.tags!.leisure ?? e.tags!.landuse ?? (e.tags!.amenity === 'parking' ? 'parking' : e.tags!.natural!), ring: e.geometry!.map((g) => toMetres(g.lon, g.lat)) }));
const trees = landUse.filter((e) => e.type === 'node' && e.tags?.natural === 'tree').map((e) => toMetres(e.lon!, e.lat!));
const furniture = landUse.filter((e) => e.type === 'node' && e.tags?.highway).map((e) => ({ kind: e.tags!.highway!, at: toMetres(e.lon!, e.lat!) }));
const paths = landUse.filter((e) => e.type === 'way' && /footway|pedestrian|path|steps/.test(e.tags?.highway ?? '') && e.geometry)
  .map((e) => ({ kind: e.tags!.highway!, points: e.geometry!.map((g) => toMetres(g.lon, g.lat)) }));

// Road surfaces as polygons: every ground-level carriageway merged into one asphalt area (so junctions are one surface), and the
// pavements as the band round it less the asphalt. Bridges (viaducts) stay out: they are drawn raised. Clipper works in integer
// centimetres. A pavement's width depends on the road's class.
type Road = { class: string; width: number; bridge: boolean; points: P[] };
const SIDEWALK: Record<string, number> = { motorway: 0, motorway_link: 0, trunk: 2.5, trunk_link: 1.5, primary: 3, primary_link: 2, secondary: 3, secondary_link: 2, tertiary: 2.5, residential: 2, unclassified: 2, living_street: 1.5, service: 1, pedestrian: 0 };
const SCALE = 100;
function offsetRoads(roads: Road[], extra: (road: Road) => number) {
  const offset = new ClipperLib.ClipperOffset(2, 0.25 * SCALE), tree = new ClipperLib.PolyTree();
  // ClipperOffset takes one delta: add each road at its own half width by offsetting in groups of equal width.
  const groups = new Map<number, Road[]>();
  for (const road of roads) { const half = Math.round((road.width / 2 + extra(road)) * 4) / 4; if (half > 0) groups.set(half, [...(groups.get(half) ?? []), road]); }
  const clipper = new ClipperLib.Clipper();
  for (const [half, group] of groups) {
    offset.Clear();
    for (const road of group) offset.AddPath(road.points.map(([x, z]) => ({ X: Math.round(x * SCALE), Y: Math.round(z * SCALE) })), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
    const solution = new ClipperLib.Paths(); offset.Execute(solution, half * SCALE);
    clipper.AddPaths(solution, ClipperLib.PolyType.ptSubject, true);
  }
  clipper.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return tree;
}
function polygonsOf(tree: { Childs(): unknown[] }) {
  type Node = { Contour(): { X: number; Y: number }[]; Childs(): Node[]; IsHole(): boolean };
  const out: { outer: P[]; holes: P[][] }[] = [];
  const ring = (path: { X: number; Y: number }[]) => path.map((p) => [p.X / SCALE, p.Y / SCALE] as P);
  const visit = (node: Node) => { if (!node.IsHole()) out.push({ outer: ring(node.Contour()), holes: node.Childs().map((hole) => ring(hole.Contour())) }); for (const hole of node.Childs()) for (const inner of hole.Childs()) visit(inner); };
  for (const node of tree.Childs() as Node[]) visit(node);
  return out;
}
function differenceOf(a: { outer: P[]; holes: P[][] }[], b: { outer: P[]; holes: P[][] }[]) {
  const clipper = new ClipperLib.Clipper(), tree = new ClipperLib.PolyTree(), path = (r: P[]) => r.map(([x, z]) => ({ X: Math.round(x * SCALE), Y: Math.round(z * SCALE) }));
  for (const p of a) { clipper.AddPath(path(p.outer), ClipperLib.PolyType.ptSubject, true); for (const h of p.holes) clipper.AddPath(path(h), ClipperLib.PolyType.ptSubject, true); }
  for (const p of b) { clipper.AddPath(path(p.outer), ClipperLib.PolyType.ptClip, true); for (const h of p.holes) clipper.AddPath(path(h), ClipperLib.PolyType.ptClip, true); }
  clipper.Execute(ClipperLib.ClipType.ctDifference, tree, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
  return polygonsOf(tree);
}
const ground = (mapped.roads as Road[]).filter((r) => !r.bridge);
const asphalt = polygonsOf(offsetRoads(ground, () => 0));
const sidewalkBand = polygonsOf(offsetRoads(ground.filter((r) => (SIDEWALK[r.class] ?? 1.5) > 0), (r) => SIDEWALK[r.class] ?? 1.5));
const sidewalks = differenceOf(sidewalkBand, asphalt);
const simplify = (polys: { outer: P[]; holes: P[][] }[]) => polys.map((p) => ({ outer: p.outer.map(([x, z]) => [round(x), round(z)] as P), holes: p.holes.map((h) => h.map(([x, z]) => [round(x), round(z)] as P)) }));

// Land: the outlines traced from imagery (scripts/geo/sample-shoreline-imagery.py -> land.json); OpenStreetMap has no closed island ring here.
const land = (read('land.json') as { rings: P[][] }).rings;

const world = { v: 1, land, asphalt: simplify(asphalt), sidewalks: simplify(sidewalks), area: 'lagos-island', origin: [3.4, 6.45], licence: 'ODbL 1.0 © OpenStreetMap contributors; Overture Maps Foundation; Open Buildings 2.5D © Google CC BY 4.0 (PROVENANCE.md)',
  buildings, roads: mapped.roads, water: mapped.water, places: mapped.places, shoreline, landUse: polygons, trees, furniture, paths };
writeFileSync(join(dir, 'world.json'), JSON.stringify(world));
const tall = buildings.filter((b) => b.height > 30).length;
console.log(`asphalt ${asphalt.length} polygons (${asphalt.reduce((n, p) => n + p.outer.length, 0)} points), sidewalks ${sidewalks.length}`);
console.log(`world.json: ${buildings.length} buildings (${tall} over 30 m), ${mapped.roads.length} roads, shoreline ${shoreline.length} points, ${polygons.length} land-use, ${trees.length} trees`);
