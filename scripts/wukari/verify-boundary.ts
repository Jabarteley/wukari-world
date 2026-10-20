#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BOUNDARY_CREDIT, boundaryContext, discoveryQuery } from './acquire.ts';
import { sha256 } from './acquisition.ts';
import { checkedBytes, SOURCE_CONFIG } from './sources.ts';
import { contains, parseArea, rings, selectBoundary } from '../../src/wukari/geography.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export async function verifyBoundary(directory = resolve(root, 'data/wukari/verified'), master?: string): Promise<void> {
  const raw = await readFile(resolve(directory, 'wukari-adm2.geojson')); checkedBytes(raw, SOURCE_CONFIG.wukariAdm2);
  const selected = selectBoundary(JSON.parse(raw.toString()));
  if (selected.properties.shapeID !== '59680162B18982121994254') throw new Error('Wukari identity differs');
  const provenance = JSON.parse(await readFile(resolve(directory, 'provenance.json'), 'utf8'));
  const boundary = provenance.sources.find((s: { id: string }) => s.id === 'nga-adm2');
  if (!boundary || boundary.status !== 'acquired' || boundary.sha256 !== SOURCE_CONFIG.adm2.sha256 || boundary.bytes !== SOURCE_CONFIG.adm2.bytes || boundary.url !== SOURCE_CONFIG.adm2.url || boundary.license !== 'CC-BY-4.0' || boundary.attribution !== BOUNDARY_CREDIT || boundary.fieldVerified !== false || !Number.isFinite(Date.parse(boundary.retrievedAt))) throw new Error('Boundary source provenance differs');
  if (provenance.verification.fieldVerified !== false || provenance.verification.legalCampusBoundary !== false) throw new Error('Administrative context cannot claim field-verified campus geography');
  if (provenance.derived.sha256 !== sha256(raw) || provenance.derived.bytes !== raw.length || provenance.derived.sourceSha256 !== SOURCE_CONFIG.adm2.sha256 || provenance.derived.sourceId !== selected.properties.shapeID) throw new Error('Derived boundary provenance differs');
  const metadata = await readFile(resolve(directory, 'nga-adm2.metadata.json'));
  const metadataSource = provenance.sources.find((s: { id: string }) => s.id === 'nga-adm2-metadata');
  const info = JSON.parse(metadata.toString());
  if (!metadataSource || metadataSource.status !== 'acquired' || metadataSource.sha256 !== sha256(metadata) || metadataSource.bytes !== metadata.length || metadataSource.url !== 'https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM2/' || metadataSource.license !== 'CC-BY-4.0' || metadataSource.fieldVerified !== false || !Number.isFinite(Date.parse(metadataSource.retrievedAt)) || info.boundaryID !== 'NGA-ADM2-59680162' || !info.boundaryLicense.includes('CC BY 4.0')) throw new Error('Boundary license metadata differs');
  const query = await readFile(resolve(directory, 'discovery.overpassql'), 'utf8');
  if (query !== discoveryQuery(selected.geometry) || (provenance.discovery && provenance.discovery.querySha256 !== sha256(query))) throw new Error('Discovery query differs from recorded administrative bounds');
  const adm1 = await readFile(resolve(root, 'scripts/geo/sources/nigeria-adm1-9469f09.geojson')); checkedBytes(adm1, SOURCE_CONFIG.adm1);
  const taraba = JSON.parse(adm1.toString()).features.find((f: { properties: { shapeISO: string } }) => f.properties.shapeISO === 'NG-TA');
  if (!taraba || !rings(selected.geometry).every(r => r.every(p => contains(parseArea(taraba.geometry), p)))) throw new Error('Wukari vertex outside Taraba');
  const dataset = JSON.parse(await readFile(resolve(directory, 'context.dataset.json'), 'utf8'));
  const { provenance: contextProvenance, ...context } = dataset;
  if (JSON.stringify(context) !== JSON.stringify(boundaryContext(selected)) || JSON.stringify(contextProvenance) !== JSON.stringify(provenance)) throw new Error('Context dataset differs from recorded source; no synthetic/campus additions permitted');
  const coverage = JSON.parse(await readFile(resolve(directory, 'coverage.json'), 'utf8'));
  if (coverage.status !== 'boundary-only-campus-not-complete' || coverage.campusBoundary !== 'unknown' || coverage.fieldVerifiedFeatures !== 0) throw new Error('Coverage overstates campus verification');
  if (master) {
    const full = await readFile(master); checkedBytes(full, SOURCE_CONFIG.adm2);
    const reproduced = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: [selectBoundary(JSON.parse(full.toString()))] }) + '\n');
    if (!reproduced.equals(raw)) throw new Error('Selected feature does not reproduce from pinned national payload');
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--master')) throw new Error('Usage: node scripts/wukari/verify-boundary.ts [--master NATIONAL_ADM2_FILE]');
  await verifyBoundary(undefined, args[1]);
  console.log('PASS: pinned Wukari ADM2, Taraba membership, source licenses/provenance, source-derived query, context-only coverage' + (args[1] ? ', exact reproduction from national source' : ' (national-source reproduction not requested)'));
}
