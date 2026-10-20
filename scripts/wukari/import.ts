#!/usr/bin/env node
/** Offline, checksum-gated import. Never changes the city registry or source inputs. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildDataset, contains, rings } from '../../src/wukari/geography.ts';
import { checkedBytes, SOURCE_CONFIG } from './sources.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export function run(args: string[]): void {
  const synthetic = args.includes('--synthetic');
  const option = (name: string): string | undefined => {
    const i = args.indexOf(name); if (i < 0) return undefined;
    const value = args[i + 1]; if (!value || value.startsWith('--')) throw new Error(`${name} needs a value`);
    return value;
  };
  const known = new Set(['--synthetic', '--adm2', '--adm2-retrieved-at', '--osm', '--osm-sha256', '--retrieved-at', '--query', '--campus-way', '--out']);
  for (const arg of args.filter(a => a.startsWith('--'))) if (!known.has(arg)) throw new Error(`Unknown option ${arg}`);
  const fixture = resolve(root, 'data/wukari/fixtures');
  const boundaryPath = synthetic ? resolve(fixture, 'boundary.synthetic.json') : option('--adm2');
  const osmPath = synthetic ? resolve(fixture, 'osm.synthetic.json') : option('--osm');
  if (!boundaryPath || !osmPath) throw new Error('Supply --adm2 FILE --osm FILE --osm-sha256 HASH --retrieved-at ISO_TIME, or --synthetic');
  const boundaryBytes = readFileSync(boundaryPath), osmBytes = readFileSync(osmPath);
  const hash = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
  const retrievedAt = synthetic ? null : option('--retrieved-at');
  const boundaryRetrievedAt = synthetic ? null : option('--adm2-retrieved-at');
  const queryPath = synthetic ? undefined : option('--query');
  const query = queryPath ? readFileSync(queryPath, 'utf8') : null;
  if (!synthetic) {
    checkedBytes(boundaryBytes, SOURCE_CONFIG.adm2);
    const expected = option('--osm-sha256');
    if (!expected || !/^[a-f0-9]{64}$/.test(expected) || hash(osmBytes) !== expected) throw new Error('OSM SHA-256 missing or mismatched');
    if (!retrievedAt || !/^\d{4}-\d{2}-\d{2}T/.test(retrievedAt) || !Number.isFinite(Date.parse(retrievedAt))) throw new Error('Supply the recorded OSM retrieval timestamp in ISO format');
    if (!boundaryRetrievedAt || !/^\d{4}-\d{2}-\d{2}T/.test(boundaryRetrievedAt) || !Number.isFinite(Date.parse(boundaryRetrievedAt))) throw new Error('Supply --adm2-retrieved-at with the actual boundary acquisition timestamp');
    if (!query?.trim()) throw new Error('Supply --query FILE with the exact Overpass query used to acquire the OSM response');
  }
  const campus = synthetic ? 101 : option('--campus-way');
  if (campus !== undefined && (!Number.isSafeInteger(Number(campus)) || Number(campus) <= 0)) throw new Error('Invalid campus way ID');
  const dataset = buildDataset(JSON.parse(boundaryBytes.toString()), JSON.parse(osmBytes.toString()), { synthetic, campusWay: campus === undefined ? undefined : Number(campus) });
  if (!synthetic) {
    const adm1 = readFileSync(resolve(root, 'scripts/geo/sources/nigeria-adm1-9469f09.geojson'));
    checkedBytes(adm1, SOURCE_CONFIG.adm1);
    const taraba = JSON.parse(adm1.toString()).features.filter((f: { properties: { shapeISO: string } }) => f.properties.shapeISO === 'NG-TA');
    if (taraba.length !== 1 || !rings(dataset.extents.lga.feature.geometry).every(r => r.every(p => contains(taraba[0].geometry, p)))) {
      throw new Error('Selected boundary must have all vertices inside pinned Taraba ADM1; investigate boundary mismatch rather than moving coordinates');
    }
  }
  const provenance = {
    schemaVersion: 1, mode: dataset.mode, importedAt: new Date().toISOString(),
    sources: [
      { id: 'boundary', url: synthetic ? null : SOURCE_CONFIG.adm2.url, license: synthetic ? 'project synthetic fixture, AGPL-3.0-or-later' : 'CC-BY-4.0', release: synthetic ? null : '9469f09', retrievedAt: boundaryRetrievedAt, sha256: hash(boundaryBytes), bytes: boundaryBytes.length },
      { id: 'osm', url: synthetic ? null : SOURCE_CONFIG.osm.url, license: synthetic ? 'project synthetic fixture, AGPL-3.0-or-later' : 'ODbL-1.0', retrievedAt, query, querySha256: query ? hash(Buffer.from(query)) : null, sha256: hash(osmBytes), bytes: osmBytes.length },
      ...(!synthetic ? [{ id: 'state-context', ...SOURCE_CONFIG.adm1, license: 'CC-BY-4.0', release: '9469f09', retrievedAt: null, note: 'Existing repository ADM1 source; independently checksum verified at import, original acquisition time unknown' }] : []),
    ],
    transformations: ['Exact property-based boundary selection', 'WGS84 coordinate values and OSM IDs/references retained without rounding', 'Local display projection only; source geometry unchanged'],
    verification: 'Dataset identity and structural checks only; not surveyed or ground-verified. Relations retained but not assembled. Town extent unknown.',
  };
  const output = resolve(option('--out') ?? resolve(root, '.cache/wukari'));
  // Dedicated output folder; never overwrite source inputs or arbitrary existing directories.
  if (output !== resolve(root, '.cache/wukari') && !output.startsWith(resolve(root, '.cache/wukari') + '/')) throw new Error('--out must stay under .cache/wukari');
  mkdirSync(output, { recursive: true });
  for (const [name, bytes] of [['boundary.source.json', boundaryBytes], ['osm.source.json', osmBytes], ['dataset.json', Buffer.from(JSON.stringify({ ...dataset, provenance }, null, 2) + '\n')]] as const) {
    const path = resolve(output, name); writeFileSync(`${path}.tmp`, bytes); renameSync(`${path}.tmp`, path);
  }
  console.log(`${dataset.disclaimer}\nImported ${dataset.coverage.ways} ways; ${dataset.coverage.omittedWays} incomplete ways and ${dataset.coverage.relations} unassembled relations. Output: ${output}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) run(process.argv.slice(2));
