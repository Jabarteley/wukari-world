/**
 * Standalone landmark buildings for places OpenStreetMap maps only as a point (no footprint).
 * Pure data (no rendering imports) so the walk grid and the renderer read the same rectangles.
 *
 * Every footprint is an interpretation: it sits just behind the landmark's anchor (the anchor is the
 * door-step, the building is to its north) and is nudged or shrunk deterministically until it clears
 * mapped buildings, water, roads and planting. Storeys are estimates by building type.
 */
import { CAMPUS_MAP } from './map.generated.ts';
import type { CampusMapBuilding } from './geo.ts';
import { boundsOf, pointInRing } from './geo.ts';
import { ANCHORS, LANDMARK_MAPPINGS } from './layout.ts';
import { CAMPUS_TREES } from './landscape.ts';
import { campusPlan } from './life-plan.ts';
import { landmarkLabel } from './spot-names.ts';

export type StandaloneKind = 'hall' | 'faculty' | 'academic' | 'administration' | 'services';
export interface Standalone { id: string; label: string; kind: StandaloneKind; accent: string; building: CampusMapBuilding }

/** Footprint w x d (metres) and storeys by type. Estimates, not measurements. */
const SPEC: Record<StandaloneKind, { w: number; d: number; floors: number }> = {
  hall: { w: 36, d: 13, floors: 4 },
  faculty: { w: 32, d: 14, floors: 3 },
  academic: { w: 26, d: 13, floors: 3 },
  administration: { w: 24, d: 12, floors: 3 },
  services: { w: 16, d: 10, floors: 2 },
};
const FLOOR = 3.3, SYNTHETIC_OSM_BASE = 9_000_000_000, GAP = 6;
const KINDS = new Set<string>(Object.keys(SPEC));

type Rect = [number, number, number, number];
const overlap = (a: Rect, b: Rect) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];
const segDistance = (x: number, z: number, [ax, az]: readonly [number, number], [bx, bz]: readonly [number, number]) => {
  const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
};


/** Footprint area (shoelace) in square metres. */
const ringArea = (ring: readonly (readonly [number, number])[]) => Math.abs(ring.slice(1).reduce((sum, p, i) => sum + ring[i]![0] * p[1] - p[0] * ring[i]![1], 0)) / 2;
const ringDistance = (x: number, z: number, ring: readonly (readonly [number, number])[]) => {
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) best = Math.min(best, segDistance(x, z, ring[i - 1]!, ring[i]!));
  return best;
};
const ADOPT_RADIUS = 22, ADOPT_MIN_AREA = 120;
let resolved: Map<string, number> | null = null;
/**
 * landmark id -> OSM building id. Ways resolve directly; points resolve to the footprint that contains
 * them, or else the nearest unclaimed footprint within 22 m (a POI placed beside its building).
 */
export function landmarkBuildingIds(): ReadonlyMap<string, number> {
  if (resolved) return resolved;
  const result = new Map<string, number>(), claimed = new Set<number>();
  const byId = new Map(CAMPUS_MAP.buildings.map((b) => [b.osm.id, b]));
  const pending: Array<[string, readonly [number, number]]> = [];
  for (const [id, mapping] of Object.entries(LANDMARK_MAPPINGS)) {
    if (mapping.kind === 'open-space' || mapping.kind === 'gate') continue;
    if (mapping.osmType === 'way') {
      const b = byId.get(mapping.osmId);
      if (b && !claimed.has(b.osm.id)) { result.set(id, b.osm.id); claimed.add(b.osm.id); }
    } else if (mapping.osmType === 'node') {
      const poi = CAMPUS_MAP.pois.find((p) => p.osm.id === mapping.osmId);
      if (!poi) continue;
      const b = CAMPUS_MAP.buildings.find((c) => pointInRing(poi.point, c.ring));
      if (b && !claimed.has(b.osm.id)) { result.set(id, b.osm.id); claimed.add(b.osm.id); } else if (!b) pending.push([id, poi.point]);
    }
  }
  for (const [id, point] of pending) {
    let best: { id: number; d: number } | null = null;
    for (const b of CAMPUS_MAP.buildings) {
      if (claimed.has(b.osm.id) || ringArea(b.ring) < ADOPT_MIN_AREA) continue;
      const d = ringDistance(point[0], point[1], b.ring);
      if (d <= ADOPT_RADIUS && (!best || d < best.d)) best = { id: b.osm.id, d };
    }
    if (best) { result.set(id, best.id); claimed.add(best.id); }
  }
  return resolved = result;
}

let cache: Standalone[] | null = null;
export function standalones(): readonly Standalone[] {
  if (cache) return cache;
  const out: Standalone[] = [];
  const buildingBounds = CAMPUS_MAP.buildings.map((b) => ({ b, bounds: boundsOf(b.ring) as Rect }));
  const poiById = new Map(CAMPUS_MAP.pois.map((p) => [p.osm.id, p]));
  const hard = CAMPUS_MAP.surfaces.filter((s) => s.kind === 'water' || s.kind === 'wetland' || s.kind === 'pool' || s.kind === 'pitch');
  const plan = campusPlan().filter((p) => p.t === 'palm' || p.t === 'flame' || p.t === 'almond' || p.t === 'kiosk' || p.t === 'guard' || p.t === 'gen' || p.t === 'lamp');
  const placed: Rect[] = [];
  for (const [id, mapping] of Object.entries(LANDMARK_MAPPINGS)) {
    if (mapping.osmType !== 'node' || !KINDS.has(mapping.kind)) continue;
    const anchor = ANCHORS[id], poi = poiById.get(mapping.osmId);
    if (!anchor || !poi || landmarkBuildingIds().has(id)) continue;
    const kind = mapping.kind as StandaloneKind, spec = SPEC[kind], ax = anchor.x, az = anchor.z;
    let best: { rect: Rect; trees: number } | null = null;
    const places: Array<[number, number, number]> = [[0, 0, -GAP], [-.45, 0, -GAP], [.45, 0, -GAP], [-.9, 0, -GAP], [.9, 0, -GAP], [-1, 1, 2], [1, 1, 2], [0, 0, -GAP - 8]];
    for (const scale of [1, .8, .62, .5]) for (const [shift, side, front] of places) {
      const w = spec.w * scale, d = spec.d * scale, cx = ax + (side ? shift * (w / 2 + 5) : shift * spec.w), z1 = az + front, rect: Rect = [cx - w / 2, z1 - d, cx + w / 2, z1];
      const pad: Rect = [rect[0] - 1.5, rect[1] - 1.5, rect[2] + 1.5, rect[3] + 1.5];
      const corners: Array<[number, number]> = [[rect[0], rect[1]], [rect[2], rect[1]], [rect[0], rect[3]], [rect[2], rect[3]], [(rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2]];
      if (corners.some((c) => !pointInRing(c, CAMPUS_MAP.boundary))) continue;
      if (buildingBounds.some(({ bounds }) => overlap(pad, bounds)) || placed.some((r) => overlap(pad, r))) continue;
      if (hard.some((s) => { const sb = boundsOf(s.ring) as Rect; return overlap(pad, sb) && (corners.some((c) => pointInRing(c, s.ring)) || s.ring.some((p) => p[0] > pad[0] && p[0] < pad[2] && p[1] > pad[1] && p[1] < pad[3])); })) continue;
      let onRoad = false;
      for (const road of CAMPUS_MAP.roads) {
        for (let i = 1; i < road.points.length && !onRoad; i++) {
          const a = road.points[i - 1]!, b = road.points[i]!;
          if (Math.max(a[0], b[0]) < pad[0] - 8 || Math.min(a[0], b[0]) > pad[2] + 8 || Math.max(a[1], b[1]) < pad[1] - 8 || Math.min(a[1], b[1]) > pad[3] + 8) continue;
          for (let t = 0; t <= 1.001 && !onRoad; t += .1) {
            const x = a[0] + (b[0] - a[0]) * t, zz = a[1] + (b[1] - a[1]) * t;
            if (x > rect[0] - road.width / 2 - 1 && x < rect[2] + road.width / 2 + 1 && zz > rect[1] - road.width / 2 - 1 && zz < rect[3] + road.width / 2 + 1) onRoad = true;
          }
        }
        if (onRoad) break;
      }
      if (onRoad) continue;
      const trees = CAMPUS_TREES.filter((t) => t.x > pad[0] && t.x < pad[2] && t.z > pad[1] && t.z < pad[3]).length + plan.filter((p) => p.x > pad[0] && p.x < pad[2] && p.z > pad[1] && p.z < pad[3]).length;
      if (!best || trees < best.trees) best = { rect, trees };
      if (trees === 0) break;
    }
    if (!best) continue;
    placed.push(best.rect);
    const [x0, z0, x1, z1] = best.rect, i = out.length;
    out.push({
      id, label: landmarkLabel(id), kind, accent: mapping.color,
      building: {
        id: `standalone-${id}`, name: landmarkLabel(id), height: spec.floors * FLOOR, heightSource: 'estimated',
        osm: { type: 'node', id: SYNTHETIC_OSM_BASE + i, version: 0, timestamp: '' },
        ring: [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]],
      },
    });
  }
  return cache = out;
}

/** Walk-grid obstacles ([x0, z0, x1, z1]) for the standalone buildings. */
/** The Senate rotunda at the tower's foot (drawn by architecture.ts) also blocks walking. */
let rotunda: Rect | null = null;
const extraBlocks = (): Rect[] => { const a = ANCHORS.senate; if (!a) return []; return [rotunda ||= [a.x - 3.9, a.z + 2.6, a.x + 3.9, a.z + 10.4]]; };
export const standaloneBlocks = (): Rect[] => [...standalones().map((s) => boundsOf(s.building.ring) as Rect), ...extraBlocks()];
