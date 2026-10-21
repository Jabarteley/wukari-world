/** Prepare a strict LGA-contained import; journal exclusions without repairing geometry. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { contains, parseOsm, selectBoundary, type OsmElement, type Position } from '../../src/wukari/geography.ts';
import { sha256, validateWay, withinBoundary } from './offline.ts';

export function selectContained(elements: OsmElement[], boundary: ReturnType<typeof selectBoundary>) {
  const nodes = new Map(elements.filter(e => e.type === 'node').map(e => [e.id, e]));
  const accepted: OsmElement[] = [], rejected: { id: string; reason: string }[] = [];
  for (const e of elements) {
    if (e.type !== 'way') continue;
    const points = e.nodes?.map(id => nodes.get(id)).map(n => n ? [n.lon!, n.lat!] as Position : null);
    try {
      if (!points || points.some(p => p === null)) throw new Error('Missing original node reference');
      const positions = points as Position[];
      if (!withinBoundary(boundary.geometry, positions)) throw new Error('Crosses or lies outside pinned LGA; preserved in complete extract');
      validateWay(positions, !!e.tags?.building && e.tags.building !== 'no');
      accepted.push(e);
    } catch (error) { rejected.push({ id: `way/${e.id}`, reason: String(error) }); }
  }
  const needed = new Set(accepted.flatMap(e => e.nodes ?? []));
  const keptNodes = [...nodes.values()].filter(n => contains(boundary.geometry, [n.lon!, n.lat!]) && (needed.has(n.id) || Object.keys(n.tags ?? {}).length > 0));
  const relations = elements.filter(e => e.type === 'relation');
  return { elements: [...keptNodes, ...accepted, ...relations], rejected };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [input, output, retrievalTime] = process.argv.slice(2);
  if (!input || !output || !retrievalTime) throw new Error('Use COMPLETE_JSON NEW_OUTPUT_DIR RECORDED_DOWNLOAD_COMPLETION_ISO');
  const bytesIn = readFileSync(input);
  const extraction = JSON.parse(readFileSync(resolve(dirname(input), 'extraction.json'), 'utf8'));
  const expected = extraction.outputs?.[basename(input)];
  if (extraction.sourceSha256 !== 'd3e80afbf39da31e660d5f13fbb092bd246cdf8830c149f9d1bee4902e0c92bb' ||
      !expected || expected.sha256 !== sha256(bytesIn) || expected.bytes !== bytesIn.length) {
    throw new Error('This receipt workflow requires the recorded dated Nigeria PBF and its unchanged complete JSON extraction');
  }
  const raw = parseOsm(JSON.parse(bytesIn.toString()));
  const boundary = selectBoundary(JSON.parse(readFileSync('data/wukari/verified/wukari-adm2.geojson', 'utf8')));
  const selected = selectContained(raw.elements, boundary);
  mkdirSync(output, { recursive: false });
  const bytes = Buffer.from(JSON.stringify({ version: 0.6, elements: selected.elements }) + '\n');
  writeFileSync(resolve(output, 'source.json'), bytes, { flag: 'wx' });
  writeFileSync(resolve(output, 'excluded.json'), JSON.stringify(selected.rejected, null, 2) + '\n', { flag: 'wx' });
  writeFileSync(resolve(output, 'receipt.json'), JSON.stringify({
    sourceUrl: 'https://download.geofabrik.de/africa/nigeria-261019.osm.pbf', retrievedAt: retrievalTime,
    retrievalTimeBasis: 'Original Windows file LastWriteTimeUtc: download completion estimate, not an authenticated HTTP retrieval receipt',
    license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors, https://www.openstreetmap.org/copyright',
    sha256: sha256(bytes), mode: 'source-data',
    scope: 'Pinned Wukari LGA polygon node selection and complete ways; strict contained valid ways retained unchanged. Crossing/invalid ways journaled in excluded.json; full originals remain in complete regional PBF/JSON. Untagged unused nodes omitted; relations retained unassembled.',
    derivedFrom: { ...extraction, command: ['python', 'scripts/wukari/local-pbf.py', '--input', 'Downloads/nigeria-261019.osm.pbf', '--out', '.cache/wukari/local-pbf-20261020'] },
  }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ elements: selected.elements.length, exclusions: selected.rejected.length }));
}
