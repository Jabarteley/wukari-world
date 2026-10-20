#!/usr/bin/env node
/** Curate a small reviewed boundary record; the national payload stays in the acquisition cache. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { boundaryContext, discoveryQuery } from './acquire.ts';
import { sha256 } from './acquisition.ts';
import type { Receipt } from './acquisition.ts';
import { checkedBytes, OVERPASS_ENDPOINTS, SOURCE_CONFIG } from './sources.ts';
import { selectBoundary } from '../../src/wukari/geography.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function recordBoundary(record: string, output = resolve(root, 'data/wukari/verified')): Promise<void> {
  const raw = await readFile(resolve(record, 'nga-adm2.source.geojson'));
  checkedBytes(raw, SOURCE_CONFIG.adm2);
  const selected = selectBoundary(JSON.parse(raw.toString()));
  const boundaryReceipt = JSON.parse(await readFile(resolve(record, 'nga-adm2.receipt.json'), 'utf8')) as Receipt;
  if (boundaryReceipt.status !== 'acquired' || boundaryReceipt.sha256 !== sha256(raw) || boundaryReceipt.bytes !== raw.length || boundaryReceipt.url !== SOURCE_CONFIG.adm2.url || boundaryReceipt.license !== 'CC-BY-4.0' || !boundaryReceipt.retrievedAt) throw new Error('Boundary acquisition receipt does not match source bytes/license/URL');
  const metadata = await readFile(resolve(record, 'nga-adm2.metadata.json'));
  const metadataReceipt = JSON.parse(await readFile(resolve(record, 'nga-adm2.metadata.receipt.json'), 'utf8')) as Receipt;
  if (metadataReceipt.status !== 'acquired' || metadataReceipt.sha256 !== sha256(metadata) || metadataReceipt.license !== 'CC-BY-4.0') throw new Error('Boundary metadata acquisition receipt is invalid');
  const info = JSON.parse(metadata.toString()) as { boundaryID: string; boundaryLicense: string; boundaryYearRepresented: string };
  if (info.boundaryID !== 'NGA-ADM2-59680162' || info.boundaryYearRepresented !== '2022' || !info.boundaryLicense.includes('CC BY 4.0')) throw new Error('Boundary metadata identity/license/year differs');
  const bytes = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: [selected] }) + '\n');
  checkedBytes(bytes, SOURCE_CONFIG.wukariAdm2);
  const query = discoveryQuery(selected.geometry);
  const osmReceipt = JSON.parse(await readFile(resolve(record, 'discovery.receipt.json'), 'utf8')) as Receipt | null;
  if (osmReceipt && (osmReceipt.querySha256 !== sha256(query) || !OVERPASS_ENDPOINTS.includes(osmReceipt.url))) throw new Error('Discovery receipt does not match the source-derived query');
  if (osmReceipt?.status === 'failed') osmReceipt.verification = 'not-acquired';
  const provenance = {
    schemaVersion: 1, sources: [boundaryReceipt, metadataReceipt],
    derived: { file: 'wukari-adm2.geojson', sha256: sha256(bytes), bytes: bytes.length, sourceSha256: SOURCE_CONFIG.adm2.sha256, sourceId: selected.properties.shapeID, operation: 'Exact Wukari/NGA/ADM2 feature selection; original properties and WGS84 numeric values retained' },
    discovery: osmReceipt,
    verification: { sourceBacked: true, fieldVerified: false, legalCampusBoundary: false, status: 'Wukari administrative context only; no FUW geography acquired' },
  };
  await mkdir(output, { recursive: true });
  await writeFile(resolve(output, 'wukari-adm2.geojson'), bytes);
  await writeFile(resolve(output, 'nga-adm2.metadata.json'), metadata);
  await writeFile(resolve(output, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  await writeFile(resolve(output, 'discovery.overpassql'), query);
  await writeFile(resolve(output, 'context.dataset.json'), JSON.stringify({ ...boundaryContext(selected), provenance }, null, 2) + '\n');
  await writeFile(resolve(output, 'coverage.json'), await readFile(resolve(record, 'coverage.json')));
  console.log(JSON.stringify({ status: 'recorded-boundary-context-only', output, selectedSourceId: selected.properties.shapeID, selectedSha256: sha256(bytes), campusReady: false }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) throw new Error('Usage: node scripts/wukari/record-boundary.ts ACQUISITION_DIRECTORY');
  await recordBoundary(resolve(path));
}
