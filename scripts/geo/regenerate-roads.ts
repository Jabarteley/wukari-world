/**
 * Roads-only regeneration of one destination whose road rows overflow the row cap: recomputes ONLY the `roads` rows of
 * src/game/cities/<id>/terrain.ts (and the one header sentence that describes them) from the city's recorded road answer, with the
 * closed chained selection (road-rows.ts `closeEnds`: ends snapped and carried on to junctions, spans cut back to junctions or the
 * map's edge, checked against the map's tidy pass). Water, labels, places and geometry stay byte for byte as shipped: the rows are
 * cut to the SHIPPED play area, and the sea band is rebuilt exactly as build-destination-detail.ts builds it.
 *
 *   ALLWORLD_GEO_CACHE=<directory outside the repository> node --experimental-strip-types scripts/geo/regenerate-roads.ts cairo
 *   node --experimental-strip-types scripts/geo/regenerate-roads.ts rome --extract-dir <extract/rome>
 *
 * The map may draw no more roads than the shipped rows do (`maxRibbons`, counted after src/map3d/road-tidy.ts). With `--out <file>`
 * the spliced terrain.ts is written there instead of over the shipped file. A city whose rows fit the cap is refused (its per-way
 * rows do not change).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { ask } from './destination-detail/overpass.ts';
import type { Element } from './destination-detail/overpass.ts';
import { loadPbfExtract } from './destination-detail/pbf-extract.ts';
import { OUTLINE_MARGIN, coverage, reachFor, round, safePolygons, shoreWater } from './destination-detail/geometry-tools.ts';
import type { Box, P } from './destination-detail/geometry-tools.ts';
import type { DetailConfig } from './destination-detail/config.ts';
import { roadRows } from './destination-detail/road-rows.ts';
import { validateDestinationFacts } from '../../src/game/cities/africa/types.ts';
import { project, toLocal } from '../../src/geo/frame.ts';
import { tidyRoads } from '../../src/map3d/road-tidy.ts';

const args = process.argv.slice(2), id = args[0];
const flags = new Map<string, string>();
for (let i = 1; i < args.length; i += 2) {
  const flag = args[i], value = args[i + 1];
  if (!flag || !['--extract-dir', '--out'].includes(flag) || !value || value.startsWith('--') || flags.has(flag)) throw new Error('Usage: regenerate-roads.ts <city id> [--extract-dir directory] [--out file]');
  flags.set(flag, value);
}
if (!id) throw new Error('A city id is required');
const config = (await import(`./destination-detail/${id}.ts`) as { CONFIG: DetailConfig }).CONFIG;
const { FACTS } = await import(`../../src/game/cities/${id}/facts.ts`) as { FACTS: Parameters<typeof validateDestinationFacts>[0] };
const { GEOMETRY } = await import(`../../src/game/cities/${id}/geometry.ts`) as { GEOMETRY: { playArea: P[][][] } };
const terrainUrl = new URL(`../../src/game/cities/${id}/terrain.ts`, import.meta.url);
const { TERRAIN } = await import(terrainUrl.href) as { TERRAIN: { roads: readonly (readonly (string | number)[])[] } };
const origin = validateDestinationFacts(FACTS).mapOrigin;
const [south, west, north, east] = config.box;
const bbox = `${south},${west},${north},${east}`;
const REACH = reachFor(config.box);
const outlineBox: Box = [south - OUTLINE_MARGIN, west - OUTLINE_MARGIN, north + OUTLINE_MARGIN, east + OUTLINE_MARGIN];
const wide = [south - REACH, west - REACH, north + REACH, east + REACH] as const;
const extractDir = flags.get('--extract-dir');
const extract = extractDir ? loadPbfExtract(extractDir, id, { play: config.box, core: config.core, outline: outlineBox, wide }) : null;
const recorded = async (label: string, query: string) => {
  if (!extract) return ask(id, label, query);
  const answer = (extract.answers as Record<string, Awaited<ReturnType<typeof ask>> | undefined>)[label];
  if (!answer) throw new Error(`PBF extract has no ${label} source`);
  return answer;
};
const refOf = (element: Element): string => `${element.type}/${element.id}`;
const centreOf = (element: Element): P => {
  if (element.type === 'node') return [element.lon!, element.lat!];
  if (!element.center) throw new Error(`${refOf(element)} has no centre`);
  return [element.center.lon, element.center.lat];
};
const nameIn = (tags: Record<string, string> | undefined): string => (tags?.['name:en'] ?? tags?.['name:fr'] ?? tags?.name ?? '').replace(/\s+/g, ' ').trim();

// The sea band, as build-destination-detail.ts builds it: from the shore ways and the land points (place centres and neighbourhood labels).
const discoveries = [];
for (const [label, query] of Object.entries(config.discovery(bbox))) discoveries.push(await recorded(label, query));
const byRef = new Map(discoveries.flatMap((answer) => answer.elements).map((element) => [refOf(element), element]));
const pick = (ref: string): Element => { const element = byRef.get(ref); if (!element) throw new Error(`${ref} is not in the recorded answers`); return element; };
const placePoints = config.places.map((choice) => { const [lon, lat] = centreOf(pick(choice.ref)); return [round(lon, 6), round(lat, 6)] as P; });
const labelPoints = config.names.filter((choice) => choice.kind === 'neighbourhood').map((choice) => centreOf(pick(choice.ref)));
const waterAnswer = await recorded('water', config.water(config.sea || config.wideWater ? wide.join(',') : bbox));
const isShore = (element: Element): boolean => Boolean(element.geometry) && element.type === 'way' && (element.tags?.natural === 'coastline' || (config.sea?.kind === 'lake' && !element.tags?.natural && !element.tags?.waterway));
const coast = waterAnswer.elements.filter(isShore).map((element) => element.geometry!.map((g): P => [g.lon, g.lat]));
const shoreSide = coast.length && config.sea ? shoreWater(coast, [...placePoints, ...labelPoints], outlineBox, wide, config.sea.bandMetres, config.cell / config.split) : null;
const sea = shoreSide ? safePolygons(shoreSide.band, config.waterTolerance, (p: readonly [number, number]) => toLocal(origin, p[0], p[1])) : [];
const reach = coverage(GEOMETRY.playArea, outlineBox, config.cell / config.split);
const inSeaCover = sea.length ? coverage(sea, outlineBox, config.cell / config.split) : null;
const inSea = (p: P): boolean => Boolean(inSeaCover && inSeaCover(p, 0));

// The shipped map's road count once tidied: the regenerated rows may not draw more.
const shippedRibbons = tidyRoads(TERRAIN.roads.map((row, i) => {
  const [, major, x0, y0, ...steps] = row as [string, number, number, number, ...number[]];
  const points: [number, number][] = [];
  for (let k = -2, x = x0, y = y0; k < steps.length; k += 2) {
    if (k >= 0) { x += steps[k]!; y += steps[k + 1]!; }
    const f = project(x / 1e4, y / 1e4); points.push([f.x, f.z]);
  }
  return { id: `road-${i}`, name: '', ...(major ? { major: true } : {}), points };
}).filter((road) => road.points.length > 1)).length;

const roadsAnswer = await recorded('roads', config.roads(bbox, `${config.core.join(',')}`));
const roads = roadRows(roadsAnswer.elements, config, reach, inSea, nameIn, { closeEnds: true, maxRibbons: shippedRibbons });
if (!roads.chained) throw new Error(`${id}: the road candidates fit the ${config.maxRoads}-row cap; its per-way rows do not change`);
const before = readFileSync(terrainUrl, 'utf8');
const start = before.indexOf('  roads: [\n'), end = before.indexOf('\n  ],\n  trunkRoads:', start);
const note = / \* \d+ (?:ways|roads) of \d+ candidates[^\n]*?points;/;
if (start < 0 || end < 0 || !note.test(before)) throw new Error(`${id}: terrain.ts has no roads block or roads note`);
const after = `${before.slice(0, start + '  roads: [\n'.length)}${roads.rows.join('\n')}${before.slice(end)}`.replace(note, ` * ${roads.note};`);
writeFileSync(flags.get('--out') ?? terrainUrl, after);
console.log(JSON.stringify({ id, roadsSha: roadsAnswer.sha256, rows: roads.rows.length, points: roads.points, shippedRibbons, bytesBefore: Buffer.byteLength(before), bytesAfter: Buffer.byteLength(after) }));
