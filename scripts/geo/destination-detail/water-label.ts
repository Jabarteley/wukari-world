import type { Element } from './overpass.ts';
import { inRing, ringArea, round } from './geometry-tools.ts';
import type { P, Ring } from './geometry-tools.ts';

const refOf = (element: Element): string => `${element.type}/${element.id}`;
const inPolygon = (point: P, polygon: readonly Ring[]): boolean => Boolean(polygon[0] && inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)));
const covered = (point: P, polygons: readonly Ring[][]): boolean => polygons.some((polygon) => inPolygon(point, polygon));

/** Only an area explicitly tagged as water can supply a water label. Coastline/island members and untyped relations cannot. */
export function waterLabelSource(element: Element): boolean {
  return element.tags?.natural === 'water' || element.tags?.waterway === 'riverbank';
}

/** A point inside both the selected source water area and the polygons the map actually renders. */
export function waterLabelPoint(element: Element, source: readonly Ring[][], rendered: readonly Ring[][]): P {
  const ref = refOf(element);
  if (!waterLabelSource(element)) throw new Error(`${ref} is not tagged as a water area; islands and coastline cannot supply water labels`);
  if (!source.length) throw new Error(`${ref} has no retained closed water geometry: it is open, outside the water box or below minWaterKm2`);
  if (!rendered.length) throw new Error(`${ref} cannot be labelled because the map renders no water`);
  const direct: P | null = element.type === 'node' && Number.isFinite(element.lon) && Number.isFinite(element.lat) ? [element.lon!, element.lat!]
    : element.center && Number.isFinite(element.center.lon) && Number.isFinite(element.center.lat) ? [element.center.lon, element.center.lat] : null;
  if (direct) {
    const point: P = [round(direct[0], 5), round(direct[1], 5)];
    if (covered(point, source) && covered(point, rendered)) return point;
  }

  for (const polygon of [...source].sort((a, b) => ringArea(b[0]!) - ringArea(a[0]!))) {
    const outer = polygon[0]!;
    const west = Math.min(...outer.map(([lon]) => lon)), east = Math.max(...outer.map(([lon]) => lon));
    const south = Math.min(...outer.map(([, lat]) => lat)), north = Math.max(...outer.map(([, lat]) => lat));
    const centre: P = [(west + east) / 2, (south + north) / 2];
    const candidates: P[] = [];
    // Search the full source geometry from its centre outwards. A bbox centre in an island hole is rejected by inPolygon.
    for (let row = 0; row <= 80; row++) for (let col = 0; col <= 80; col++) candidates.push([round(west + (east - west) * (col + 0.5) / 81, 5), round(south + (north - south) * (row + 0.5) / 81, 5)]);
    candidates.sort((a, b) => Math.hypot(a[0] - centre[0], a[1] - centre[1]) - Math.hypot(b[0] - centre[0], b[1] - centre[1]));
    const found = candidates.find((point) => inPolygon(point, polygon) && covered(point, rendered));
    if (found) return found;
  }
  throw new Error(`${ref} has no interior point in the rendered water; its centre may fall in a hole or the selected water may have been filtered out`);
}
