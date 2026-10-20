/** Wukari development data contract. No registration in the playable city catalogue. */
import { project, unproject, UNITS_PER_KM } from '../geo/frame.ts';

export type Position = readonly [number, number]; // WGS84 longitude, latitude, never rounded.
export type Polygon = { type: 'Polygon'; coordinates: Position[][] };
export type MultiPolygon = { type: 'MultiPolygon'; coordinates: Position[][][] };
export type Area = Polygon | MultiPolygon;
export interface Boundary { type: 'Feature'; properties: Record<string, unknown>; geometry: Area }
export interface OsmElement {
  type: 'node' | 'way' | 'relation'; id: number; tags?: Record<string, string>;
  lon?: number; lat?: number; nodes?: number[]; geometry?: { lon: number; lat: number }[];
  members?: { type: string; ref: number; role: string }[];
  version?: number; timestamp?: string;
}
export interface Dataset {
  schemaVersion: 1;
  mode: 'synthetic' | 'source-data';
  disclaimer: string;
  origin: Position;
  projection: { name: string; metresPerUnit: 1; elevation: 'unknown-flat-preview' };
  extents: {
    lga: { status: 'synthetic' | 'source-boundary'; feature: Boundary };
    town: { status: 'unknown'; geometry: null };
    campus: { status: 'unknown' | 'osm-candidate' | 'synthetic'; geometry: Polygon | null; osmId: string | null };
  };
  osm: { elements: OsmElement[]; osmTimestamp: string | null };
  coverage: { nodes: number; ways: number; relations: number; renderableWays: number; omittedWays: number };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function ensure(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
export function position(value: unknown): Position {
  ensure(Array.isArray(value) && value.length === 2, 'Expected [longitude, latitude]');
  const [lon, lat] = value;
  ensure(typeof lon === 'number' && Number.isFinite(lon) && Math.abs(lon) <= 180, 'Invalid longitude');
  ensure(typeof lat === 'number' && Number.isFinite(lat) && Math.abs(lat) <= 90, 'Invalid latitude');
  return [lon, lat];
}
export function rings(area: Area): Position[][] {
  return area.type === 'Polygon' ? area.coordinates : area.coordinates.flat();
}
export function parseArea(value: unknown): Area {
  ensure(record(value) && (value.type === 'Polygon' || value.type === 'MultiPolygon'), 'Expected polygon geometry');
  ensure(Array.isArray(value.coordinates) && value.coordinates.length > 0, 'Empty polygon geometry');
  const polygon = (raw: unknown): Position[][] => {
    ensure(Array.isArray(raw) && raw.length > 0, 'Empty polygon');
    return raw.map(rawRing => {
      ensure(Array.isArray(rawRing) && rawRing.length >= 4, 'Polygon ring needs four positions');
      const points = rawRing.map(position), first = points[0]!, last = points.at(-1)!;
      ensure(first[0] === last[0] && first[1] === last[1], 'Polygon ring must be closed');
      const twiceArea = points.slice(1).reduce((sum, p, i) => sum + points[i]![0] * p[1] - p[0] * points[i]![1], 0);
      ensure(Math.abs(twiceArea) > 1e-15, 'Degenerate polygon ring');
      return points;
    });
  };
  return value.type === 'Polygon'
    ? { type: 'Polygon', coordinates: polygon(value.coordinates) }
    : { type: 'MultiPolygon', coordinates: value.coordinates.map(polygon) };
}
export function selectBoundary(raw: unknown, synthetic = false): Boundary {
  ensure(record(raw) && raw.type === 'FeatureCollection' && Array.isArray(raw.features), 'Expected boundary FeatureCollection');
  const matches = raw.features.filter((f: unknown) => record(f) && f.type === 'Feature' && record(f.properties) && f.properties.shapeName === (synthetic ? 'SYNTHETIC TEST AREA' : 'Wukari'));
  ensure(matches.length === 1, 'Expected exactly one Wukari boundary (or explicit synthetic fixture)');
  const f = matches[0] as Record<string, unknown>, properties = f.properties as Record<string, unknown>;
  ensure(properties.shapeGroup === (synthetic ? 'SYNTHETIC' : 'NGA') && properties.shapeType === 'ADM2' && typeof properties.shapeID === 'string' && properties.shapeID.length > 0, 'Boundary identity must be NGA ADM2 with shapeID');
  return { type: 'Feature', properties: { ...properties }, geometry: parseArea(f.geometry) };
}
export function contains(area: Area, point: Position): boolean {
  const insideRing = (ring: Position[]): boolean => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i]!, b = ring[j]!;
      // Include points on edges (including shared ADM1/ADM2 edges), without moving source vertices.
      const cross = (point[0] - a[0]) * (b[1] - a[1]) - (point[1] - a[1]) * (b[0] - a[0]);
      if (Math.abs(cross) < 1e-14 && point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1])) return true;
      if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  };
  const polys = area.type === 'Polygon' ? [area.coordinates] : area.coordinates;
  return polys.some(poly => insideRing(poly[0]!) && !poly.slice(1).some(insideRing));
}
/** Compatible with the shared Nigeria frame, rescaled to metres with an unrounded local origin.
 * This is a display projection, not a survey CRS. Source coordinates stay authoritative. */
export function toWorld(origin: Position, point: Position): { x: number; z: number } {
  position(origin); position(point);
  const o = project(...origin), p = project(...point), scale = 1000 / UNITS_PER_KM;
  return { x: (p.x - o.x) * scale, z: (p.z - o.z) * scale };
}
export function fromWorld(origin: Position, x: number, z: number): Position {
  position(origin); ensure(Number.isFinite(x) && Number.isFinite(z), 'Invalid world position');
  const o = project(...origin), scale = 1000 / UNITS_PER_KM;
  const p = unproject(o.x + x / scale, o.z + z / scale);
  return [p.lon, p.lat];
}
export function parseOsm(raw: unknown): Dataset['osm'] {
  ensure(record(raw) && raw.version === 0.6 && Array.isArray(raw.elements) && !raw.remark, 'Expected complete OSM 0.6 response without Overpass errors');
  const seen = new Set<string>(), nodePositions = new Map<number, Position>();
  const retainPosition = (id: number, p: Position): void => {
    const previous = nodePositions.get(id);
    ensure(!previous || (previous[0] === p[0] && previous[1] === p[1]), `Conflicting coordinates for OSM node/${id}`);
    nodePositions.set(id, p);
  };
  for (const value of raw.elements) {
    ensure(record(value) && ['node', 'way', 'relation'].includes(String(value.type)) && Number.isSafeInteger(value.id) && Number(value.id) > 0, 'Invalid OSM identity');
    const key = `${value.type}/${value.id}`;
    ensure(!seen.has(key), `Duplicate OSM identity ${key}`); seen.add(key);
    if (value.tags !== undefined) ensure(record(value.tags) && Object.values(value.tags).every(v => typeof v === 'string'), 'Invalid OSM tags');
    if (value.type === 'node') retainPosition(Number(value.id), position([value.lon, value.lat]));
    if (value.geometry !== undefined) {
      ensure(Array.isArray(value.geometry), 'Invalid OSM geometry');
      for (const p of value.geometry) { ensure(record(p), 'Invalid OSM position'); position([p.lon, p.lat]); }
    }
    if (value.type === 'way') {
      ensure(Array.isArray(value.nodes) && value.nodes.every(n => Number.isSafeInteger(n) && n > 0), 'OSM way must retain node references');
      if (Array.isArray(value.geometry)) ensure(value.geometry.length === value.nodes.length, 'OSM way geometry/node count mismatch');
      if (Array.isArray(value.geometry)) value.geometry.forEach((p: { lon: number; lat: number }, i: number) => retainPosition((value.nodes as number[])[i]!, position([p.lon, p.lat])));
    }
    if (value.type === 'relation') {
      ensure(Array.isArray(value.members), 'OSM relation must retain members');
      for (const m of value.members) ensure(record(m) && ['node', 'way', 'relation'].includes(String(m.type)) && Number.isSafeInteger(m.ref) && Number(m.ref) > 0 && typeof m.role === 'string', 'Invalid OSM relation member');
    }
  }
  const meta = raw.osm3s;
  return { elements: structuredClone(raw.elements) as OsmElement[], osmTimestamp: record(meta) && typeof meta.timestamp_osm_base === 'string' ? meta.timestamp_osm_base : null };
}
export function indexNodes(elements: OsmElement[]): Map<number, OsmElement> {
  return new Map(elements.filter(e => e.type === 'node').map(e => [e.id, e]));
}
export function wayPositions(way: OsmElement, elements: OsmElement[], nodes = indexNodes(elements)): Position[] | null {
  if (way.type !== 'way') return null;
  if (way.geometry) return way.geometry.map(p => [p.lon, p.lat] as const);
  const points: Position[] = [];
  for (const id of way.nodes ?? []) {
    const n = nodes.get(id); if (!n || n.lon === undefined || n.lat === undefined) return null;
    points.push([n.lon, n.lat]);
  }
  return points.length >= 2 ? points : null;
}
export function buildDataset(boundaryRaw: unknown, osmRaw: unknown, options: { synthetic?: boolean; campusWay?: number } = {}): Dataset {
  const synthetic = options.synthetic === true, boundary = selectBoundary(boundaryRaw, synthetic), osm = parseOsm(osmRaw);
  let campus: Dataset['extents']['campus'] = { status: 'unknown', geometry: null, osmId: null };
  if (options.campusWay !== undefined) {
    const way = osm.elements.find(e => e.type === 'way' && e.id === options.campusWay);
    ensure(way && way.tags?.amenity === 'university', 'Campus candidate must be an explicitly selected university way');
    ensure(synthetic || /federal university.*wukari/i.test(way.tags.name ?? ''), 'Campus candidate name does not identify FUW');
    const points = wayPositions(way, osm.elements); ensure(points, 'Campus candidate has incomplete geometry');
    const area = parseArea({ type: 'Polygon', coordinates: [points] }) as Polygon;
    ensure(points.every(p => contains(boundary.geometry, p)), 'Campus candidate vertices must lie inside selected LGA');
    campus = { status: synthetic ? 'synthetic' : 'osm-candidate', geometry: area, osmId: `way/${way.id}` };
  }
  // Origin is a recorded vertex, never an invented campus location or spawn point.
  const origin = (campus.geometry ? rings(campus.geometry) : rings(boundary.geometry))[0]![0]!;
  const ways = osm.elements.filter(e => e.type === 'way'), nodes = indexNodes(osm.elements);
  const renderableWays = ways.filter(e => (wayPositions(e, osm.elements, nodes)?.length ?? 0) >= 2).length;
  return {
    schemaVersion: 1, mode: synthetic ? 'synthetic' : 'source-data',
    disclaimer: synthetic ? 'SYNTHETIC TEST FIXTURE — NOT WUKARI. No real campus, roads or buildings.' : `DEVELOPMENT ONLY — source-derived GIS preview, not a completed or surveyed Wukari map. Campus extent ${campus.geometry ? 'is an unverified OSM candidate' : 'is unknown'}. Unofficial; no university endorsement.`,
    origin, projection: { name: 'Allworld Nigeria equirectangular frame, local metres', metresPerUnit: 1, elevation: 'unknown-flat-preview' },
    extents: { lga: { status: synthetic ? 'synthetic' : 'source-boundary', feature: boundary }, town: { status: 'unknown', geometry: null }, campus },
    osm, coverage: { nodes: osm.elements.filter(e => e.type === 'node').length, ways: ways.length, relations: osm.elements.filter(e => e.type === 'relation').length, renderableWays, omittedWays: ways.length - renderableWays },
  };
}
