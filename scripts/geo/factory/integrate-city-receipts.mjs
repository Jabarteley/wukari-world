import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { validateSourceInputs, cityExtractInput } from './source-inputs.mjs';
import { profileFor } from './profile.mjs';
const [rootArg, manifestArg, receiptRootArg = 'world/playable-africa-rollout'] = process.argv.slice(2);
if (!rootArg || !manifestArg || !/^world\/playable-[a-z-]+-rollout$/.test(receiptRootArg)) throw Error('Usage: node --experimental-strip-types integrate-city-receipts.mjs <worktree> <private manifest> [world/playable-<region>-rollout]');
const root = resolve(rootArg), manifest = JSON.parse(readFileSync(manifestArg, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const readModule = path => import(pathToFileURL(join(root, path)).href);
const outputRoot = join(root, receiptRootArg);
for (const sub of ['sources', 'receipts']) mkdirSync(join(outputRoot, sub), { recursive: true });
for (const { id, extract, sourceInputs } of manifest.cities) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw Error('Invalid city id');
  const directory = `src/game/cities/${id}`;
  const [{ FACTS }, { PLACES }, { TERRAIN }, { GEOMETRY }, { CONFIG }] = await Promise.all([
    readModule(`${directory}/facts.ts`), readModule(`${directory}/places.ts`), readModule(`${directory}/terrain.ts`), readModule(`${directory}/geometry.ts`), readModule(`scripts/geo/destination-detail/${id}.ts`),
  ]);
  const layers = ['places', 'extras', 'water', 'landuse', 'roads'].map(label => {
    const raw = readFileSync(join(extract, `${label}.json`));
    return { label, raw, parsed: JSON.parse(raw) };
  });
  const provenance = layers[0].parsed.source;
  for (const layer of layers) for (const key of ['cityId', 'datasetUrl', 'datasetSha256', 'pbfHeaderTimestamp', 'adapterSha256']) {
    if (layer.parsed.source[key] !== provenance[key]) throw Error(`${id}: inconsistent ${key}`);
  }
  // The place minimum is the recipe's profile minimum (20 for a recipe without a profile; profile.mjs).
  const profile = profileFor(CONFIG.profile), emptySlots = CONFIG.emptySlots ?? [];
  if (provenance.cityId !== id || PLACES.length < profile.minimumPlaces) throw Error(`${id}: source identity or place minimum failed`);
  // Merged primary+neighbour source: datasetSha256 is the merged file's; the dated inputs are recorded beside it.
  // City sub-extract: datasetUrl/datasetSha256 are the city-extract input's; the primary (boundary) file is listed first.
  if (sourceInputs !== undefined) {
    validateSourceInputs(sourceInputs, { datasetUrl: provenance.datasetUrl });
    const cityExtract = cityExtractInput(sourceInputs);
    if (cityExtract && cityExtract.sha256 !== provenance.datasetSha256) throw Error(`${id}: extract datasetSha256 differs from the city-extract source input`);
  }
  const generatedAssets = Object.fromEntries(['facts.ts', 'geometry.ts', 'places.ts', 'terrain.ts', 'index.ts', 'content.ts', 'map.ts'].map(name => {
    const raw = readFileSync(join(root, directory, name)); return [name, { bytes: raw.length, sha256: hash(raw) }];
  }));
  const admission = { registered: true, accepted: false, status: 'CANDIDATE_ONLY/NOT_ACCEPTED' };
  const geometryInput = {
    kind: provenance.kind, datasetUrl: provenance.datasetUrl, datasetSha256: provenance.datasetSha256,
    pbfHeaderTimestamp: provenance.pbfHeaderTimestamp, adapter: provenance.adapter, adapterSha256: provenance.adapterSha256,
    ...(provenance.coastSupplement ? { coastSupplement: provenance.coastSupplement } : {}),
    ...(sourceInputs ? { sourceInputs } : {}),
    extracts: layers.map(({ label, raw, parsed }) => ({ file: `${label}.json`, sha256: hash(raw), elements: parsed.elements.length })),
  };
  const inventory = {
    schemaVersion: 1, cityId: id, countryIso2: FACTS.country.idISOlower.toUpperCase(), admission,
    cityPoint: { name: FACTS.name, coordinatesWgs84: [FACTS.centre.lon, FACTS.centre.lat], sourceClass: 'map projection origin', sourceUrl: FACTS.sourceUrl },
    airport: FACTS.airport, boxes: provenance.boxes, waterRecipe: provenance.waterRecipe, geometryInput,
    ...(CONFIG.profile === undefined ? {} : { profile: CONFIG.profile, emptySlots }),
    selectedPlaces: PLACES.map(({ name, osm, lon, lat, accuracy }) => ({ name, osm, coordinatesWgs84: [lon, lat], accuracy })),
    generatedAssets, licence: FACTS.licence, scope: FACTS.coverageNote,
  };
  const inventoryText = JSON.stringify(inventory, null, 2) + '\n';
  writeFileSync(join(outputRoot, 'sources', `${id}.json`), inventoryText);
  // Which place tags supplied the neighbourhood labels, recorded only when a label came from the lower-priority village|hamlet|locality|subdivision list or from a way/relation area (districtLabelAreas lists those OSM refs).
  const placeElements = new Map(layers[0].parsed.elements.map(element => [`${element.type}/${element.id}`, element]));
  const labelTags = CONFIG.names.filter(label => label.kind === 'neighbourhood').map(label => placeElements.get(label.ref)?.tags?.place);
  const areaLabels = CONFIG.names.filter(label => label.kind === 'neighbourhood' && !label.ref.startsWith('node/')).map(label => ({ ref: label.ref, place: placeElements.get(label.ref)?.tags?.place, name: placeElements.get(label.ref)?.tags?.name }));
  const fallbackLabels = labelTags.some(tag => ['village', 'hamlet', 'locality', 'subdivision', 'island', 'islet'].includes(tag)) || areaLabels.length > 0;
  const slotFallbacks = CONFIG.places.filter(place => place.slotFallback).map(place => place.slotFallback);
  const selection = slotFallbacks.length || fallbackLabels || CONFIG.profile !== undefined ? {
    ...(CONFIG.profile === undefined ? {} : { profile: CONFIG.profile, emptySlots }),
    ...(slotFallbacks.length ? { slotFallbacks } : {}),
    ...(areaLabels.length ? { districtLabelAreas: areaLabels } : {}),
    ...(fallbackLabels ? { districtLabelPlaceTags: Object.fromEntries([...new Set(labelTags)].sort().map(tag => [tag, labelTags.filter(item => item === tag).length])) } : {}),
  } : undefined;
  const receipt = {
    schemaVersion: 1, cityId: id, countryIso2: inventory.countryIso2,
    generationIdentity: { cityId: id, stateId: FACTS.state.idunique, stateName: FACTS.state.name },
    inventorySha256: hash(inventoryText), inventoryPath: `${receiptRootArg}/sources/${id}.json`, admission,
    airportCandidate: FACTS.airport, bounds: CONFIG.box, sources: { geometryInput },
    kept: { places: PLACES.length, roads: TERRAIN.roads.length, neighbourhoodLabels: TERRAIN.names.filter(label => label.kind === 'neighbourhood').length, landPolygons: GEOMETRY.land.length, waterPolygons: TERRAIN.water?.length ?? 0, reachWaterPolygons: TERRAIN.reachWater?.length ?? 0 },
    ...(selection ? { selection } : {}),
    observed: Object.fromEntries(layers.map(({ label, parsed }) => [label, parsed.elements.length])),
    assets: Object.fromEntries(['facts.ts', 'geometry.ts', 'index.ts', 'content.ts', 'map.ts'].map(name => [name, generatedAssets[name]])),
    cityDetail: { tier: 'detailed', generator: 'scripts/geo/build-destination-detail.ts', recipe: `scripts/geo/destination-detail/${id}.ts`, input: 'Geofabrik PBF extract', attribution: '© OpenStreetMap contributors', licence: 'ODbL-1.0' },
  };
  writeFileSync(join(outputRoot, 'receipts', `${id}.json`), JSON.stringify(receipt, null, 2) + '\n');
  console.log(`${id}: ${PLACES.length} source places, receipt and inventory pinned`);
}
