/**
 * Fetches the OpenStreetMap features of the Lagos Island core (Marina, Broad Street, Nnamdi Azikiwe Street, the lagoon
 * shore) for the mapped-street proof of concept (docs/research/procedural-city-plan-2026-10-16.md, section 6), through
 * the public Overpass interpreter, and writes them unchanged as GeoJSON-like JSON with their tags:
 *
 *   node --experimental-strip-types scripts/geo/fetch-lagos-island-osm.ts
 *
 * Optional: --box s,w,n,e --out <dir> --title "<name>" (a box over about 0.0006 square degrees is fetched in two halves and merged).
 * Output: scripts/geo/sources/lagos-island/osm-<date>.json plus a provenance line (box, date, sha256, element counts).
 * © OpenStreetMap contributors, ODbL 1.0 (https://www.openstreetmap.org/copyright). One small box, fetched once; the
 * runtime never calls Overpass (docs: Overpass is not a production dependency).
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

/** South, west, north, east: the Lagos Island core, about 1.9 km by 2.2 km. */
export const LAGOS_ISLAND_BOX = [6.445, 3.383, 6.462, 3.403] as const;
/** The public interpreters, tried in turn when one is overloaded. */
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://lz4.overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
let ENDPOINT = ENDPOINTS[0]!;

interface Element { type: 'way' | 'relation' | 'node'; id: number; tags?: Record<string, string>; geometry?: { lat: number; lon: number }[]; members?: { type: string; ref: number; role: string; geometry?: { lat: number; lon: number }[] }[] }
async function query(text: string): Promise<{ raw: string; elements: Element[] }> {
  for (let attempt = 0; attempt < 9; attempt++) {
    ENDPOINT = ENDPOINTS[attempt % ENDPOINTS.length]!;
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { 'User-Agent': 'allworld-geo-build', 'Content-Type': 'application/x-www-form-urlencoded' }, body: `data=${encodeURIComponent(text)}` });
    if ([429, 502, 503, 504].includes(response.status)) { console.error(`${ENDPOINT} answered ${response.status}; trying again`); await new Promise((done) => setTimeout(done, attempt < ENDPOINTS.length ? 5000 : 30000)); continue; }
    if (!response.ok) throw new Error(`Overpass answered ${response.status}`);
    const raw = await response.text();
    return { raw, elements: (JSON.parse(raw) as { elements: Element[] }).elements };
  }
  throw new Error('Overpass kept refusing the request');
}

/** Optional `--box s,w,n,e --out <dir> --title "<name>"`; the defaults are the Lagos Island core. */
const args = process.argv.slice(2);
const arg = (name: string): string | undefined => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const BOX = (arg('--box')?.split(',').map(Number) ?? [...LAGOS_ISLAND_BOX]) as [number, number, number, number];
if (BOX.length !== 4 || BOX.some((v) => !Number.isFinite(v))) throw new Error('--box needs south,west,north,east');
const TITLE = arg('--title') ?? 'Lagos Island core';
const OUT_DIR = arg('--out') ?? 'scripts/geo/sources/lagos-island';

const dedupe = (parts: Element[][]): Element[] => { const seen = new Map<string, Element>(); for (const part of parts) for (const e of part) seen.set(`${e.type}/${e.id}`, e); return [...seen.values()]; };
/** Runs one query over the whole box; a box larger than the default is split into two halves (by longitude) and merged, deduped by type+id. */
async function run(build: (box: string) => string): Promise<{ elements: Element[] }> {
  const [s, w, n, e] = BOX;
  if ((n - s) * (e - w) <= 0.0006) return query(build(BOX.join(',')));
  const mid = Math.round(((w + e) / 2) * 1e5) / 1e5;
  const parts = [await query(build([s, w, n, mid].join(','))), await query(build([s, mid, n, e].join(',')))];
  return { elements: dedupe(parts.map((p) => p.elements)) };
}
const roads = await run((box) => `[out:json][timeout:180];way["highway"](${box});out geom tags;`);
const buildings = await run((box) => `[out:json][timeout:180];(way["building"](${box});relation["building"](${box}););out geom tags;`);
const water = await run((box) => `[out:json][timeout:180];(way["natural"="water"](${box});way["natural"="coastline"](${box});relation["natural"="water"](${box});way["waterway"](${box}););out geom tags;`);
const land = await run((box) => `[out:json][timeout:180];(way["landuse"](${box});way["leisure"~"^(park|garden|pitch|stadium)$"](${box});way["amenity"~"^(marketplace|place_of_worship|school|hospital|bus_station)$"](${box}););out geom tags;`);

const date = new Date().toISOString().slice(0, 10);
const out = resolve(OUT_DIR);
mkdirSync(out, { recursive: true });
const payload = { box: BOX, fetched: date, source: 'https://overpass-api.de/api/interpreter', licence: 'ODbL 1.0, © OpenStreetMap contributors', roads: roads.elements, buildings: buildings.elements, water: water.elements, land: land.elements };
const text = JSON.stringify(payload);
const sha256 = createHash('sha256').update(text).digest('hex');
writeFileSync(resolve(out, `osm-${date}.json`), text);
const counts = { roads: roads.elements.length, buildings: buildings.elements.length, water: water.elements.length, land: land.elements.length, bytes: Buffer.byteLength(text) };
const withHeight = buildings.elements.filter((e) => e.tags?.height || e.tags?.['building:levels']).length;
const named = roads.elements.filter((e) => e.tags?.name).length;
writeFileSync(resolve(out, 'PROVENANCE.md'), `# ${TITLE}, OpenStreetMap via Overpass\n\n- Box (south, west, north, east): ${BOX.join(', ')}\n- Fetched: ${date} from ${ENDPOINT}\n- File: osm-${date}.json, sha256 ${sha256}, ${counts.bytes} bytes\n- Elements: ${counts.roads} highway ways (${named} named), ${counts.buildings} buildings (${withHeight} with height or building:levels), ${counts.water} water features, ${counts.land} land-use features\n- Licence: ODbL 1.0, © OpenStreetMap contributors (https://www.openstreetmap.org/copyright). Compiled street tiles made from this file are a derivative database and are published under ODbL beside the game's AGPL source.\n`);
console.log(JSON.stringify({ file: `osm-${date}.json`, sha256, ...counts, named, withHeight }, null, 2));
