import { assertDestinationOutput } from './destination-contract.mjs';
import { loadCountryScope, assertCountryFacts } from './country-scope.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleAt = (app, path) => import(pathToFileURL(join(app, path)).href);

export function sourceProblemsFor(places, config, bundle) {
  const elements = new Map([...bundle.answers.places.elements, ...bundle.answers.extras.elements].map(element => [`${element.type}/${element.id}`, element]));
  const problems = [];
  for (const place of places) {
    const element = elements.get(place.osm), choice = config.places.find(candidate => candidate.ref === place.osm);
    if (!element || !choice) { problems.push({ ref: place.osm, problem: 'missing source or recipe reference' }); continue; }
    const expectedName = choice.label ?? (element.tags['name:en'] ?? element.tags['name:fr'] ?? element.tags.name ?? '').replace(/\s+/g, ' ').trim();
    const point = element.type === 'node' ? element : element.center;
    if (place.name !== expectedName || !point || Math.abs(place.lon - point.lon) > 0.00000051 || Math.abs(place.lat - point.lat) > 0.00000051) problems.push({ ref: place.osm, problem: 'name or point mismatch' });
  }
  for (const choice of config.places) {
    if (!elements.has(choice.ref) || places.filter(place => place.osm === choice.ref).length !== 1) problems.push({ ref: choice.ref, problem: 'selected recipe reference must resolve to exactly one generated place' });
  }
  return problems;
}

export async function loadSourceBundle(app, cityId, extractDir, config, expected) {
  const [tools, { loadPbfExtract }] = await Promise.all([
    moduleAt(app, 'scripts/geo/destination-detail/geometry-tools.ts'),
    moduleAt(app, 'scripts/geo/destination-detail/pbf-extract.ts'),
  ]);
  const [south, west, north, east] = config.box, reach = tools.reachFor(config.box);
  const bundle = loadPbfExtract(extractDir, cityId, {
    play: config.box, core: config.core,
    outline: [south - tools.OUTLINE_MARGIN, west - tools.OUTLINE_MARGIN, north + tools.OUTLINE_MARGIN, east + tools.OUTLINE_MARGIN],
    wide: [south - reach, west - reach, north + reach, east + reach],
  });
  for (const label of ['places', 'extras', 'water', 'landuse', 'roads']) {
    assert.equal(bundle.answers[label].sha256, expected.extractSha256[label], `${label} extract SHA-256 mismatch`);
  }
  if (expected.datasetSha256) assert.equal(bundle.source.datasetSha256, expected.datasetSha256, 'dataset SHA-256 mismatch');
  if (expected.adapterSha256) assert.equal(bundle.source.adapterSha256, expected.adapterSha256, 'adapter SHA-256 mismatch');
  return bundle;
}

export async function inspectSourceScene(app, cityId, extractDir, expected) {
  const relativeCity = `src/game/cities/${cityId}`;
  const [{ city }, { PLACES }, { FACTS }, { CONFIG }, registry, { KINDS }, { CITY_KINDS }, { buildCity, CITY_TRIANGLE_BUDGET }, { buildNetwork }, { createKit }, { CITY_DRAW_CALLS }] = await Promise.all([
    moduleAt(app, `${relativeCity}/index.ts`), moduleAt(app, `${relativeCity}/places.ts`), moduleAt(app, `${relativeCity}/facts.ts`), moduleAt(app, `scripts/geo/destination-detail/${cityId}.ts`), moduleAt(app, 'src/game/cities/registry.ts'),
    moduleAt(app, 'src/scene/venue-scenes.ts'), moduleAt(app, 'src/scene/city-scenes.ts'), moduleAt(app, 'src/map3d/city-build.ts'), moduleAt(app, 'src/map3d/roads.ts'), moduleAt(app, 'src/scene/kit.ts'), moduleAt(app, 'src/budgets.ts'),
  ]);
  assert.equal(FACTS.id, cityId, 'facts city mismatch');
  assert.ok(registry.isKnownCityId(cityId) && registry.isOpenCityId(cityId), 'city must be open in the real registry');
  const bundle = await loadSourceBundle(app, cityId, extractDir, CONFIG, expected);
  const sourceProblems = sourceProblemsFor(PLACES, CONFIG, bundle);
  const content = await registry.loadCityContent(cityId);
  const venues = content.venues.filter(venue => venue.id !== 'home');
  const unknownKinds = venues.filter(venue => !KINDS.includes(venue.definition.scene.kind)).map(venue => ({ id: venue.id, kind: venue.definition.scene.kind }));
  const pack = await (await city.loadMap()).loadScene();
  const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} });
  const drawCalls = built.group.children.filter(child => Reflect.get(child, 'isMesh') === true).length;
  const [west, south, east, north] = FACTS.bounds;
  const margin = Math.min((FACTS.airport.lon - west) * 111320 * Math.cos(FACTS.airport.lat * Math.PI / 180), (east - FACTS.airport.lon) * 111320 * Math.cos(FACTS.airport.lat * Math.PI / 180), (FACTS.airport.lat - south) * 111320, (north - FACTS.airport.lat) * 111320);
  return { sourceProblems, unknownKinds, sharedCityKinds: [...new Set(venues.map(venue => venue.definition.scene.kind).filter(kind => Object.hasOwn(CITY_KINDS, kind)))], places: PLACES.length, uniqueNames: new Set(PLACES.map(place => place.name)).size, venues: venues.length, airportMinimumBoxMarginMetres: margin, triangles: built.triangles, triangleLimit: CITY_TRIANGLE_BUDGET, drawCalls, drawCallLimit: CITY_DRAW_CALLS.value };
}


export function countryProblemsFor(places, bundle, scope) {
  assert.ok(scope, 'factory OSM country scope required');
  const refs = new Map([...bundle.answers.places.elements, ...bundle.answers.extras.elements].map(element => [`${element.type}/${element.id}`, element]));
  return places.flatMap(place => {
    const element = refs.get(place.osm), point = element?.type === 'node' ? element : element?.center;
    return !point || scope.classify([point.lon, point.lat]) !== 'inside' || scope.classify([place.lon, place.lat]) !== 'inside'
      ? [{ ref: place.osm, problem: 'outside/on OSM country boundary; HOLD' }] : [];
  });
}

export async function inspectFactorySourceScene(app, cityId, extractDir, expected) {
  const [{ PLACES }, { FACTS }, { CONFIG }] = await Promise.all([
    moduleAt(app, `src/game/cities/${cityId}/places.ts`), moduleAt(app, `src/game/cities/${cityId}/facts.ts`), moduleAt(app, `scripts/geo/destination-detail/${cityId}.ts`),
  ]);
  const bundle = await loadSourceBundle(app, cityId, extractDir, CONFIG, expected);
  assertDestinationOutput(FACTS, PLACES);
  const scope = loadCountryScope(app, expected.countryScope, FACTS.country.idISOlower, bundle.source.datasetSha256);
  assertCountryFacts(scope, FACTS);
  assert.deepEqual(scope.receipt, expected.countryScopeReceipt, 'country receipt changed since selection');
  const scene = await inspectSourceScene(app, cityId, extractDir, expected);
  return { ...scene, countryScope: scope.receipt, sourceProblems: [...scene.sourceProblems, ...countryProblemsFor(PLACES, bundle, scope)] };
}

export function assertSourceScene(scene) {
  assert.ok(!scene.sourceProblems.length && !scene.unknownKinds.length, 'source reference or scene-kind proof failed');
  assert.ok(scene.places >= 20 && scene.venues >= 20 && scene.airportMinimumBoxMarginMetres >= 900, 'places or airport margin below city acceptance bar');
  assert.ok(scene.triangles < scene.triangleLimit && scene.drawCalls <= scene.drawCallLimit, 'scene budget exceeded');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
  for (const flag of ['--workspace', '--city', '--extract-dir', '--expected', '--out']) if (!args.includes(flag)) throw Error(`Missing ${flag}`);
  const { readFileSync } = await import('node:fs');
  const scene = await inspectFactorySourceScene(resolve(get('--workspace')), get('--city'), resolve(get('--extract-dir')), JSON.parse(readFileSync(get('--expected'))));
  const output = resolve(get('--out'));
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(scene, null, 2) + '\n');
  console.log(JSON.stringify(scene));
  assertSourceScene(scene);
}
