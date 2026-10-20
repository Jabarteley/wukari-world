#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { acquire, AcquisitionError, sha256 } from './acquisition.ts';
import type { Receipt, SourceRequest } from './acquisition.ts';
import { checkedBytes, OVERPASS_ENDPOINTS, SOURCE_CONFIG } from './sources.ts';
import { contains, parseArea, parseOsm, rings, selectBoundary } from '../../src/wukari/geography.ts';
import type { Area, Dataset } from '../../src/wukari/geography.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const BOUNDARY_CREDIT = 'geoBoundaries gbOpen / William & Mary geoLab; original source GRID3, Nigeria ADM2, year 2022, release 9469f09. Selected Wukari feature; no source-coordinate rounding.';
export const OSM_CREDIT = '© OpenStreetMap contributors, https://www.openstreetmap.org/copyright (ODbL 1.0)';
export function boundsOf(area: Area): [number, number, number, number] {
  const points = rings(area).flat();
  return [Math.min(...points.map(p => p[1])), Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[1])), Math.max(...points.map(p => p[0]))];
}
/** Bbox is only a query scope, never an invented legal/campus boundary. */
export function discoveryQuery(area: Area): string {
  return `[out:json][timeout:15];\n(nwr["amenity"="university"](${boundsOf(area).join(',')});>;);\nout meta geom;\n`;
}
export function boundaryContext(boundary: ReturnType<typeof selectBoundary>): Dataset {
  return {
    schemaVersion: 1, mode: 'source-data',
    disclaimer: 'REAL WUKARI LGA CONTEXT ONLY — FUW campus geography is unavailable. This is not a campus map; no player spawn or campus features are invented.',
    origin: rings(boundary.geometry)[0]![0]!,
    projection: { name: 'Allworld Nigeria equirectangular frame, local metres', metresPerUnit: 1, elevation: 'unknown-flat-preview' },
    extents: { lga: { status: 'source-boundary', feature: boundary }, campus: { status: 'unknown', geometry: null, osmId: null }, town: { status: 'unknown', geometry: null } },
    osm: { elements: [], osmTimestamp: null },
    coverage: { nodes: 0, ways: 0, relations: 0, renderableWays: 0, omittedWays: 0 },
  };
}
export async function runAcquisition(options: {
  download?: typeof acquire; output?: string; boundaryOnly?: boolean; overpassEndpoint?: string;
} = {}): Promise<{ campusReady: false; output: string }> {
  const download = options.download ?? acquire;
  const endpoint = options.overpassEndpoint ?? SOURCE_CONFIG.osm.url;
  if (!OVERPASS_ENDPOINTS.includes(endpoint)) throw new Error('Select a documented public Overpass endpoint; no arbitrary endpoint or automatic failover');
  const output = options.output ?? resolve(root, '.cache/wukari/acquired/runs', new Date().toISOString().replaceAll(':', '-'));
  await mkdir(output, { recursive: true });
  const request: SourceRequest = { id: 'nga-adm2', url: SOURCE_CONFIG.adm2.url, expected: SOURCE_CONFIG.adm2, license: 'CC-BY-4.0', attribution: BOUNDARY_CREDIT };
  const boundary = await download(request);
  checkedBytes(boundary.body, SOURCE_CONFIG.adm2); // defense in depth; even a substituted transport must preserve the pin
  await writeFile(resolve(output, 'nga-adm2.source.geojson'), boundary.body);
  await writeFile(resolve(output, 'nga-adm2.receipt.json'), JSON.stringify(boundary.receipt, null, 2) + '\n');
  const metadata = await download({ id: 'nga-adm2-metadata', url: 'https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM2/', license: 'CC-BY-4.0', attribution: BOUNDARY_CREDIT, maxBytes: 100_000 });
  const info = JSON.parse(metadata.body.toString()) as { boundaryID?: string; boundaryLicense?: string; boundaryYearRepresented?: string };
  if (info.boundaryID !== 'NGA-ADM2-59680162' || info.boundaryYearRepresented !== '2022' || !info.boundaryLicense?.includes('CC BY 4.0')) throw new Error('Boundary metadata differs from pinned identity/year/license; review instead of silently changing sources');
  await writeFile(resolve(output, 'nga-adm2.metadata.json'), metadata.body);
  await writeFile(resolve(output, 'nga-adm2.metadata.receipt.json'), JSON.stringify(metadata.receipt, null, 2) + '\n');
  const selected = selectBoundary(JSON.parse(boundary.body.toString()));
  const adm1 = await readFile(resolve(root, 'scripts/geo/sources/nigeria-adm1-9469f09.geojson'));
  checkedBytes(adm1, SOURCE_CONFIG.adm1);
  const taraba = (JSON.parse(adm1.toString()) as { features: { properties: { shapeISO: string }; geometry: unknown }[] }).features.filter(f => f.properties.shapeISO === 'NG-TA');
  if (taraba.length !== 1) throw new Error('Pinned Taraba source is missing or ambiguous');
  const state = parseArea(taraba[0]!.geometry);
  if (!rings(selected.geometry).every(ring => ring.every(p => contains(state, p)))) throw new Error('Wukari source vertices do not all lie inside pinned Taraba ADM1; manual boundary review needed');
  const selection = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: [selected] }) + '\n');
  await writeFile(resolve(output, 'wukari-adm2.geojson'), selection);
  const query = discoveryQuery(selected.geometry);
  await writeFile(resolve(output, 'discovery.overpassql'), query);
  let osmReceipt: Receipt | null = null;
  try { if (!options.boundaryOnly) {
    const osm = await download({ id: 'fuw-discovery', url: endpoint, license: 'ODbL-1.0', attribution: OSM_CREDIT, query, timeoutSeconds: 25, maxBytes: 4 * 1024 * 1024 });
    parseOsm(JSON.parse(osm.body.toString()));
    await writeFile(resolve(output, 'discovery.source.json'), osm.body); osmReceipt = osm.receipt;
  } } catch (error) {
    if (!(error instanceof AcquisitionError)) throw error;
    osmReceipt = error.receipt;
  }
  await writeFile(resolve(output, 'discovery.receipt.json'), JSON.stringify(osmReceipt, null, 2) + '\n');
  const context = boundaryContext(selected);
  const provenance = {
    schemaVersion: 1, sources: [boundary.receipt, metadata.receipt], discovery: osmReceipt, unavailable: osmReceipt?.status === 'failed' ? [osmReceipt] : [],
    derived: { file: 'wukari-adm2.geojson', sha256: sha256(selection), bytes: selection.length, sourceSha256: SOURCE_CONFIG.adm2.sha256, operation: 'Select exact shapeName=Wukari, shapeGroup=NGA, shapeType=ADM2; retain properties and WGS84 values' },
    attribution: BOUNDARY_CREDIT,
  };
  await writeFile(resolve(output, 'context.dataset.json'), JSON.stringify({ ...context, provenance }, null, 2) + '\n');
  await writeFile(resolve(output, 'coverage.json'), JSON.stringify({
    status: 'boundary-only-campus-not-complete', lgaSourceId: selected.properties.shapeID,
    campusBoundary: 'unknown', gates: 'unavailable', roads: 'unavailable', paths: 'unavailable', buildings: 'unavailable', hostels: 'unavailable', sportsGrounds: 'unavailable', elevation: 'unavailable', fieldVerifiedFeatures: 0,
    discovery: osmReceipt?.status ?? 'not-requested', reason: osmReceipt?.status === 'failed' ? osmReceipt.attempts.at(-1)?.failure : osmReceipt ? 'Discovery snapshot obtained; requires explicit candidate review and bounded feature acquisition before campus build.' : 'Boundary-only mode requested; FUW data has not been acquired.',
  }, null, 2) + '\n');
  console.log(JSON.stringify({ status: 'boundary-only-campus-not-complete', output, boundarySha256: boundary.receipt.sha256, discovery: osmReceipt?.status ?? 'not-requested' }));
  return { campusReady: false, output };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    let boundaryOnly = false, overpassEndpoint: string | undefined;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--boundary-only') boundaryOnly = true;
      else if (args[i] === '--overpass-endpoint' && args[i + 1]) overpassEndpoint = args[++i];
      else throw new Error('Supported options: --boundary-only, --overpass-endpoint DOCUMENTED_URL');
    }
    await runAcquisition({ boundaryOnly, overpassEndpoint }); process.exitCode = 2;
  }
  catch (error) {
    console.error(JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : String(error), receipt: error instanceof AcquisitionError ? error.receipt : undefined }, null, 2)); process.exitCode = 1;
  }
}
