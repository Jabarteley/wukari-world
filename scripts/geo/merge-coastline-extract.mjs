#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const labels = ['places', 'extras', 'water', 'landuse', 'roads'];
const rule = 'full original natural=coastline ways whose geometry bbox intersects primary wide box';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const fail = message => { throw new Error(`Coastline merge: ${message}`); };
const args = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i];
  if (!['--primary', '--supplement', '--out', '--manifest'].includes(key) || !process.argv[i + 1] || args[key]) fail('usage: --primary directory --supplement water.json --out new-directory --manifest pins.json');
  args[key] = process.argv[i + 1];
}
for (const key of ['--primary', '--supplement', '--out', '--manifest']) if (!args[key]) fail(`${key} is required`);
const primary = realpathSync(args['--primary']), supplementPath = realpathSync(args['--supplement']), out = resolve(args['--out']);
if (existsSync(out) || out === primary || out.startsWith(`${primary}/`)) fail('output must be a new directory outside the primary input');
const manifest = JSON.parse(readFileSync(args['--manifest'], 'utf8'));
const read = (path, pin) => {
  const raw = readFileSync(path);
  if (!/^[0-9a-f]{64}$/.test(pin ?? '') || sha(raw) !== pin) fail(`missing or mismatched SHA-256 pin for ${path}`);
  const value = JSON.parse(raw);
  if (value.version !== 1 || value.generator !== 'Allworld offline PBF adapter prototype' || !Array.isArray(value.elements) || value.source?.kind !== 'geofabrik-pbf' || value.source.coastSupplement) fail(`unsupported input ${path}`);
  return value;
};
const layers = Object.fromEntries(labels.map(label => [label, read(join(primary, `${label}.json`), manifest.primary?.[label])]));
const supplement = read(supplementPath, manifest.supplement);
const source = layers.water.source;
for (const label of labels) {
  // Water-specific selection fields differ between layers; cohort identity does not.
  for (const key of ['kind', 'datasetUrl', 'datasetSha256', 'pbfHeaderTimestamp', 'adapterSha256', 'cityId', 'boxes']) if (JSON.stringify(layers[label].source[key]) !== JSON.stringify(source[key])) fail(`primary source mismatch in ${label}: ${key}`);
}
for (const item of [source, supplement.source]) {
  if (!/^https:\/\/download\.geofabrik\.de\/[A-Za-z0-9._/-]+\.osm\.pbf$/.test(item.datasetUrl ?? '') || !/^[0-9a-f]{64}$/.test(item.datasetSha256 ?? '') || !/^[0-9a-f]{64}$/.test(item.adapterSha256 ?? '')) fail('invalid official PBF source pins');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.pbfHeaderTimestamp ?? '') || !Number.isFinite(Date.parse(item.pbfHeaderTimestamp)) || new Date(item.pbfHeaderTimestamp).toISOString().replace('.000Z', 'Z') !== item.pbfHeaderTimestamp) fail('invalid canonical PBF timestamp');
}
if (source.pbfHeaderTimestamp !== supplement.source.pbfHeaderTimestamp) fail('PBF timestamps differ');
const box = source.boxes?.wide;
const validBox = value => Array.isArray(value) && value.length === 4 && value.every(Number.isFinite) && value[0] < value[2] && value[1] < value[3] && Math.abs(value[0]) <= 90 && Math.abs(value[2]) <= 90 && Math.abs(value[1]) <= 180 && Math.abs(value[3]) <= 180;
if (!validBox(box) || !validBox(supplement.source.selectionBounds)) fail('invalid selection bounds');
const identity = element => `${element.type}/${element.id}`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const content = element => JSON.stringify(canonical(element));
const existing = new Map();
for (const element of layers.water.elements) {
  const key = identity(element);
  if (existing.has(key) && content(existing.get(key)) !== content(element)) fail(`conflicting primary duplicate ${key}`);
  existing.set(key, element);
}
const additions = [];
for (const element of supplement.elements) {
  if (element.type !== 'way' || element.tags?.natural !== 'coastline') continue;
  if (!Number.isSafeInteger(element.id) || element.id <= 0 || !Array.isArray(element.geometry) || element.geometry.length < 2 || element.geometry.some(p => !Number.isFinite(p.lat) || !Number.isFinite(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180)) fail(`invalid coastline geometry ${element.id}`);
  const lat = element.geometry.map(p => p.lat), lon = element.geometry.map(p => p.lon);
  if (Math.max(...lat) < box[0] || Math.min(...lat) > box[2] || Math.max(...lon) < box[1] || Math.min(...lon) > box[3]) continue;
  const key = identity(element), previous = existing.get(key);
  if (previous) { if (content(previous) !== content(element)) fail(`conflicting duplicate ${key}`); continue; }
  existing.set(key, element); additions.push(element);
}
additions.sort((a, b) => a.id - b.id);
const coastSupplement = {
  datasetUrl: supplement.source.datasetUrl, datasetSha256: supplement.source.datasetSha256,
  pbfHeaderTimestamp: supplement.source.pbfHeaderTimestamp, adapterSha256: supplement.source.adapterSha256,
  waterExtractSha256: manifest.supplement, selectionBounds: supplement.source.selectionBounds,
  primaryExtractSha256: Object.fromEntries(labels.map(label => [label, manifest.primary[label]])),
  mergerSha256: sha(readFileSync(fileURLToPath(import.meta.url))), selectionRule: rule,
};
layers.water.elements.push(...additions);
mkdirSync(out, { recursive: true });
for (const label of labels) {
  layers[label].source.coastSupplement = coastSupplement;
  writeFileSync(join(out, `${label}.json`), `${JSON.stringify(layers[label])}\n`, { flag: 'wx' });
}
console.log(JSON.stringify({ out, addedCount: additions.length, addedIds: additions.map(e => e.id), waterCount: layers.water.elements.length }));
