/** Reference-complete batches through the unchanged 32 MiB offline import gate. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { buildDataset, indexNodes, parseOsm } from '../../src/wukari/geography.ts';
import { importOffline, sha256, validateReceipt, type Receipt } from './offline.ts';
import { coverage, report } from './coverage.ts';

const [review, output] = process.argv.slice(2);
if (!review || !output) throw new Error('Use REVIEW_DIRECTORY NEW_CACHE_OUTPUT_DIRECTORY');
const bytes = readFileSync(resolve(review, 'source.json'));
const receipt = JSON.parse(readFileSync(resolve(review, 'receipt.json'), 'utf8')) as Receipt;
validateReceipt(receipt, bytes);
const raw = parseOsm(JSON.parse(bytes.toString())), nodes = indexNodes(raw.elements);
const ways = raw.elements.filter(e => e.type === 'way');
const out = resolve(output);
if (!out.startsWith(resolve('.cache/wukari') + sep)) throw new Error('Use a new directory under .cache/wukari');
mkdirSync(out, { recursive: false });
const imported = new Set<string>(), batches: { name: string; sourceSha256: string; sourceBytes: number; datasetSha256: string }[] = [];
const originals = new Map(raw.elements.map(e => [`${e.type}/${e.id}`, JSON.stringify(e)]));
for (let offset = 0; offset < ways.length; offset += 5000) {
  const name = `batch-${String(batches.length + 1).padStart(2, '0')}`, dir = resolve(out, name);
  mkdirSync(dir);
  const selectedWays = ways.slice(offset, offset + 5000), needed = new Set(selectedWays.flatMap(w => w.nodes ?? []));
  const selectedNodes = [...nodes.values()].filter(n => needed.has(n.id) || (offset === 0 && Object.keys(n.tags ?? {}).length > 0));
  const elements = [...selectedNodes, ...selectedWays, ...(offset === 0 ? raw.elements.filter(e => e.type === 'relation') : [])];
  const source = Buffer.from(JSON.stringify({ version: 0.6, elements }) + '\n');
  if (source.length > 32 * 1024 * 1024) throw new Error('Batch exceeds existing limit; reduce batch way count');
  writeFileSync(resolve(dir, 'source.json'), source, { flag: 'wx' });
  writeFileSync(resolve(dir, 'receipt.json'), JSON.stringify({ ...receipt, sha256: sha256(source), parentSourceSha256: sha256(bytes), scope: `${receipt.scope}; ${name}: original way positions ${offset} through ${offset + selectedWays.length - 1}; complete original node references. Tagged standalone nodes and unassembled relations occur only in batch 1.` }, null, 2) + '\n', { flag: 'wx' });
  importOffline(resolve(dir, 'source.json'), resolve(dir, 'receipt.json'), 'osm-json', resolve(dir, 'imported'));
  const importedBytes = readFileSync(resolve(dir, 'imported/dataset.json'));
  const dataset = JSON.parse(importedBytes.toString());
  for (const e of dataset.osm.elements) {
    const key = `${e.type}/${e.id}`;
    if (JSON.stringify(e) !== originals.get(key)) throw new Error(`Imported record differs from reviewed source: ${key}`);
    imported.add(key);
  }
  batches.push({ name, sourceSha256: sha256(source), sourceBytes: source.length, datasetSha256: sha256(importedBytes) });
}
if (imported.size !== raw.elements.length || raw.elements.some(e => !imported.has(`${e.type}/${e.id}`))) throw new Error('Batch union differs from reviewed source identities');
const boundary = JSON.parse(readFileSync('data/wukari/verified/wukari-adm2.geojson', 'utf8'));
const dataset = { ...buildDataset(boundary, { version: 0.6, elements: raw.elements }), provenance: { ...receipt, validation: 'Every retained record passed existing offline importer in reference-complete <=32 MiB batches; aggregate identity union checked', batches, fieldVerified: false } };
writeFileSync(resolve(out, 'dataset.json'), JSON.stringify(dataset) + '\n', { flag: 'wx' });
writeFileSync(resolve(out, 'coverage.json'), JSON.stringify(coverage(dataset), null, 2) + '\n', { flag: 'wx' });
writeFileSync(resolve(out, 'provenance.json'), JSON.stringify(dataset.provenance, null, 2) + '\n', { flag: 'wx' });
writeFileSync(resolve(out, 'LOCAL_PBF_COVERAGE_REPORT.md'), report(resolve(out, 'dataset.json')), { flag: 'wx' });
console.log(JSON.stringify({ status: 'complete', batches: batches.length, uniqueImported: imported.size, ...coverage(dataset) }));
