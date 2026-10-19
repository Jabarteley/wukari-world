/** Offline support-cost audit. This module is never imported by the game. */
import './node-test-fixture.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Object3D, Scene } from 'three';
import { extractCityBrief } from '../../../scripts/scene-factory/facts.ts';
import type { CityBriefV1 } from '../../../scripts/scene-factory/facts.ts';
import { draftVenueRecipe, venueForRecipe } from '../../../scripts/scene-factory/layout.ts';
import { screenText } from '../../../server/moderation/text.ts';
import { cityContent, playableCityIds } from '../../game/cities/registry.ts';
import { createHostLights } from '../../venue-world.ts';
import { tablesAt } from '../../tables/city-places.ts';
import { createKit } from '../kit.ts';
import { buildVenueScene } from '../venue-scenes.ts';
import { loadCityScenes } from '../city-scenes.ts';
import { measuredParts as parts } from './measure-host-state.ts';
import type { SceneDef, SceneVenue } from '../types.ts';
import { measureRenderCost } from '../body/render-cost.ts';
import { compileRecipe } from './compile.ts';
import { validateRecipe, parseHostSceneryByVenue } from './contract.ts';
import type { RegionId, SceneryEstimate, HostSceneryByVenue } from './contract.ts';
import type { RecipeRuntimeMetadata } from './pack.ts';
import { RecipeAssetStore } from './prepare.ts';
import { createOuterHostFixture } from './measure-outer-host.ts';
import type { OuterCalibration } from './measure-outer-host.ts';
import { acceptedOuterCalibration } from './calibrated-host.ts';
import { readHostKits } from './measure-host-kits.ts';

const root = new URL('../../../', import.meta.url);
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
/** Exclude actual object identities, including retained recipe floor/shell and lamps. */
export function measureNonRecipeHost(parent: Object3D, recipeObjects: readonly Object3D[]): SceneryEstimate & { drawCalls: number } {
  const excluded = new Set(recipeObjects), cost = measureRenderCost(parent, node => excluded.has(node)).scenery;
  let lights = 0;
  function visit(node: Object3D) {
    if (!node.visible || excluded.has(node)) return;
    if ((node as Object3D & { isLight?: boolean }).isLight) lights++;
    for (const child of node.children) visit(child);
  }
  visit(parent);
  return { triangles: cost.triangles, meshes: cost.meshes, lights, drawCalls: cost.drawCalls };
}


/** Ground is already in the scene traversal. Add only its extra pass and the renderer-owned background. */
export function measureCompleteNonRecipeHost(parent: Scene, recipeObjects: readonly Object3D[], outer: ReturnType<typeof createOuterHostFixture>, calibration: OuterCalibration): ReturnType<typeof measureNonRecipeHost> {
  assert.equal(outer.ground.mesh.parent, parent, 'actual outer ground must be present exactly once');
  assert.equal(outer.ground.mesh.visible, true, 'outer ground must be visible');
  assert.equal(parent.background, outer.sky.texture, 'actual outer sky must be present');
  for (let node: Object3D | null = outer.ground.mesh; node; node = node.parent) assert.ok(!recipeObjects.includes(node), 'recipe exclusion must not contain outer ground');
  const ground = measureRenderCost(outer.ground.mesh).scenery;
  assert.equal(ground.triangles, calibration.ground.triangles); assert.equal(ground.meshes, calibration.ground.meshes);
  const host = measureNonRecipeHost(parent, recipeObjects);
  return { triangles: host.triangles + calibration.background.triangles, meshes: host.meshes + calibration.background.meshes, lights: host.lights,
    drawCalls: host.drawCalls - ground.drawCalls + calibration.ground.mainPasses + calibration.ground.shadowPasses + calibration.background.mainPasses + calibration.background.shadowPasses };
}

interface Row {
  city: string; venue: string; kind: string; variant: string | null; mood: string; spots: number;
  tables: { id: string; game: string }[]; missingTables: string[];
  recipe: { triangles: number; meshes: number; lights: number };
  states: Record<string, ReturnType<typeof measureNonRecipeHost>>;
  maximum: ReturnType<typeof measureNonRecipeHost>;
}
const maximum = (values: readonly ReturnType<typeof measureNonRecipeHost>[]): ReturnType<typeof measureNonRecipeHost> => ({
  triangles: Math.max(0, ...values.map(v => v.triangles)), meshes: Math.max(0, ...values.map(v => v.meshes)),
  lights: Math.max(0, ...values.map(v => v.lights)), drawCalls: Math.max(0, ...values.map(v => v.drawCalls)),
});

export async function auditHosts(kitManifestPath: string, selected?: readonly string[]) {
  const kitInputs = await readHostKits(fileURLToPath(root), kitManifestPath);
  const outerWitness = await acceptedOuterCalibration();
  const regions = JSON.parse(await readFile(new URL('scripts/scene-factory/regions.json', root), 'utf8')) as { regions: { id: RegionId; cityIds: string[] }[] };
  const files = new Map<string, URL>(), originalFetch = globalThis.fetch, store = new RecipeAssetStore();
  const hookUrl = new URL('./host-audit-load.ts', import.meta.url).href;
  const hook = registerHooks({
    resolve(specifier, context, next) {
      if (specifier === './recipe/load.ts' && context.parentURL?.endsWith('/scene/city-scenes.ts')) return { url: hookUrl, shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      if (url === hookUrl) return { format: 'module', shortCircuit: true, source: `export {loadProbePart as loadRecipePart} from ${JSON.stringify(new URL('./measure-host-state.ts', import.meta.url).href)};` };
      return next(url, context);
    },
  });
  globalThis.fetch = async (input, init) => {
    const path = new URL(String(input instanceof Request ? input.url : input), 'http://native-character.test/').pathname;
    const file = files.get(path); return file ? new Response(await readFile(file)) : originalFetch(input, init);
  };
  const rows: Row[] = [], briefs: { city: string; inputSha256: string; targets: number; excluded: number; preserved: number }[] = [], pins = new Map<string, string>();
  const failures: { city: string; venue?: string; error: string }[] = [];
  const inventory: { city: string; venue: string; kind: string; mood: string; spots: number; tableIds: string[]; signature: string; representative: boolean }[] = [];
  for (const pin of [...outerWitness.sourcePins, ...kitInputs.sourcePins]) pins.set(pin.path, pin.sha256);
  const currentBriefs = new Map<string, CityBriefV1>(), signatures = new Set<string>();
  const sourceKinds: Record<string, Record<string, number>> = {};
  try {
    for (const region of regions.regions) for (const city of region.cityIds.filter(id => !selected || selected.includes(id))) {
      const brief = await extractCityBrief({ cityId: city, region: region.id }); currentBriefs.set(city, brief);
      briefs.push({ city, inputSha256: brief.digests.inputSha256, targets: brief.targetVenueIds.length, excluded: brief.excludedVenueIds.length, preserved: brief.preservedVenueIds.length });
      for (const pin of [...brief.provenance.files, ...brief.provenance.registrationFiles]) pins.set(pin.path, pin.sha256);
      for (const venue of brief.venues) {
        const counts = sourceKinds[venue.scene.kind] ??= {};
        counts[venue.scene.disposition] = (counts[venue.scene.disposition] ?? 0) + 1;
      }
      for (const venue of brief.venues.filter(v => v.scene.disposition === 'target-recipe')) {
        const kind = venue.scene.kind, mood = /meal|food|restaurant|cafe|canteen|bar|club/.test(kind) ? 'indoor' : 'outdoor';
        const tables = tablesAt(city, venue.id), signature = JSON.stringify([kind, mood, venue.effectiveSpots.length, tables.map(t => t.game).sort()]);
        const representative = !signatures.has(signature); signatures.add(signature);
        inventory.push({ city, venue: venue.id, kind, mood, spots: venue.effectiveSpots.length, tableIds: tables.map(t => t.id), signature, representative });
      }
    }
    audit: for (const region of regions.regions) {
      const cities = region.cityIds.filter(city => inventory.some(v => v.city === city && v.representative)); if (!cities.length) continue;
      const input = kitInputs.kits.get(region.id); assert.ok(input, `missing validated kit ${region.id}`);
      const { ref, file } = input, measured = ref.measurement;
      files.set(ref.url, file);
      const prepared = { kit: await store.prepare(ref, region.id) };
      for (const city of cities) {
        const brief = currentBriefs.get(city)!, representatives = new Set(inventory.filter(v => v.city === city && v.representative).map(v => v.venue));
        const kinds: Record<string, SceneDef> = {}, captured = new Map<string, Object3D[]>();
        // Audit bootstrap is not a published measurement: triangle support is derived below.
        const metadata: RecipeRuntimeMetadata = { schema: 'allworld-recipe-runtime', version: 1, city, region: region.id, recipeSha256: '0'.repeat(64), recipeBytes: 0,
          targetVenueIds: brief.targetVenueIds, assets: { kit: ref }, hostScenery: Object.fromEntries(brief.targetVenueIds.map(id => [id, { triangles: 0, meshes: 5 + outerWitness.calibration.total.meshes, lights: 3 }])) };
        for (const venue of brief.venues.filter(v => representatives.has(v.id))) {
          const recipe = draftVenueRecipe(venue, { brief, assets: { kit: measured }, screenText, hostScenery: metadata.hostScenery });
          const value = validateRecipe(recipe, { city, venue: venueForRecipe(venue), assets: { kit: measured }, screenText, hostScenery: metadata.hostScenery[venue.id]! });
          const def = compileRecipe(value, prepared, metadata), create = def.runtime!.createHost;
          def.runtime!.createHost = Object.assign((...args: Parameters<typeof create>) => {
            captured.set(venue.id, [...args[2].fallback]); return create(...args);
          }, { solids: create.solids, support: create.support, validate: create.validate, measure: create.measure });
          kinds[`recipe:${venue.id}`] = def;
        }
        parts.set(city, { kinds }); await loadCityScenes(city);
        const kit = createKit(), parent = new kit.THREE.Scene(), lights = createHostLights(kit.THREE, parent), outer = createOuterHostFixture(parent);
        try {
          for (const venue of cityContent(city).venues.filter(v => representatives.has(v.id))) {
            let entry: ReturnType<typeof buildVenueScene> | undefined;
            try {
              entry = buildVenueScene(kit, venue.definition as SceneVenue, city); parent.add(entry.group);
              await Promise.resolve(); await Promise.resolve();
              assert.equal(entry.group.userData.runtimeError, undefined);
              const imported = entry.group.getObjectByName(`recipe:${venue.id}`); assert.ok(imported);
              const owned = [...captured.get(venue.id)!, imported];
              const actualRecipe = owned.map(node => measureRenderCost(node).scenery).reduce((a, b) => ({ triangles: a.triangles + b.triangles, meshes: a.meshes + b.meshes, drawCalls: a.drawCalls + b.drawCalls }), { triangles: 0, meshes: 0, drawCalls: 0 });
              const declared = kinds[`recipe:${venue.id}`]!.runtime!.reservation;
              assert.equal(actualRecipe.triangles, declared.triangles);
              const states: Row['states'] = { day: measureCompleteNonRecipeHost(parent, owned, outer, outerWitness.calibration) };
              const point = entry.walk.entrance!;
              entry.walk.near({ x: point.x, y: 0, z: point.z }); states.near = measureCompleteNonRecipeHost(parent, owned, outer, outerWitness.calibration);
              entry.walk.goal(point.x, point.z); states.nearAndGoal = measureCompleteNonRecipeHost(parent, owned, outer, outerWitness.calibration);
              entry.setTime('night'); lights.apply(entry.lighting()); states.nightNearAndGoal = measureCompleteNonRecipeHost(parent, owned, outer, outerWitness.calibration);
              for (const state of Object.values(states)) {
                assert.ok(state.triangles + actualRecipe.triangles <= 15_000, 'actual full scenery triangle cap');
                assert.ok(state.meshes + actualRecipe.meshes <= 13, 'actual full scenery mesh cap');
                assert.ok(state.lights <= 4, 'actual full scenery light cap');
              }
              const expected = tablesAt(city, venue.id), actual = new Set(entry.walk.things().map(t => t.table));
              rows.push({ city, venue: venue.id, kind: venue.definition.scene.kind, variant: venue.definition.scene.variant ?? null, mood: entry.mood,
                spots: brief.venues.find(v => v.id === venue.id)!.effectiveSpots.length, tables: expected.map(t => ({ id: t.id, game: t.game })), missingTables: expected.filter(t => !actual.has(t.id)).map(t => t.id),
                recipe: { triangles: actualRecipe.triangles, meshes: actualRecipe.meshes, lights: 0 }, states, maximum: maximum(Object.values(states)) });
            } catch (error) { failures.push({ city, venue: venue.id, error: String(error) }); break audit; }
            finally { entry?.dispose(); entry?.group.removeFromParent(); }
          }
        } finally { outer.dispose(); kit.dispose(); lights.dispose(); }
      }
    }
    for (const path of ['src/scene/recipe/measure-host-kits.ts', 'src/scene/recipe/pack.ts', 'scripts/scene-factory/assets.ts', 'scripts/assets/glb.ts', 'scripts/assets/prepare.ts', 'node_modules/meshoptimizer/package.json', 'src/scene/recipe/calibrated-host.ts', 'src/scene/recipe/measure-host.ts', 'src/scene/recipe/measure-host-state.ts', 'src/scene/recipe/compile.ts', 'src/scene/recipe/runtime-host.ts', 'src/scene/recipe/contract.ts', 'src/scene/recipe/prepare.ts', 'src/scene/venue-scenes.ts', 'src/scene/build.ts', 'src/scene/kit.ts', 'src/scene/movement.ts', 'src/scene/walk-grid.ts', 'src/scene/lighting.ts', 'src/scene/body/render-cost.ts', 'src/scene/props.ts', 'src/tables/places.ts', 'src/venue-world.ts', 'src/tables/city-places.ts', 'src/tables/derive.ts', 'scripts/scene-factory/layout.ts', 'scripts/scene-factory/regions.json']) {
      try { pins.set(path, hash(await readFile(new URL(path, root)))); } catch (error) { failures.push({ city: '*', error: `source pin ${path}: ${error}` }); }
    }
    const global = maximum(rows.map(row => row.maximum));
    const perKind = Object.fromEntries([...new Set(rows.map(row => row.kind))].sort().map(kind => {
      const same = rows.filter(row => row.kind === kind), bound = maximum(same.map(row => row.maximum));
      return [kind, { signatures: same.length, maximum: bound, minimumTriangles: Math.min(...same.map(row => row.maximum.triangles)),
        worstTriangleDrift: Math.max(...same.map(row => (bound.triangles - row.maximum.triangles) / (row.recipe.triangles + row.maximum.triangles))) }];
    }));
    const worstWithinVenueMarkerDrift = Math.max(...rows.map(row => (row.maximum.triangles - row.states.day!.triangles) / (row.recipe.triangles + row.states.day!.triangles)));
    const drift = rows.map(row => ({ city: row.city, venue: row.venue, fraction: (global.triangles - row.maximum.triangles) / (row.recipe.triangles + row.maximum.triangles) })).sort((a, b) => b.fraction - a.fraction);
    return { schema: 'allworld-recipe-host-audit', version: 1, scope: 'Actual unchanged outer ground plus browser-calibrated renderer background; actual registered recipe targets and tables; explicit repository-staged fourteen-region kits with real GLB/report validation; heroes omitted; native actor settlement omitted; Node image headers only.',
      method: 'Fresh current city briefs; normal city loader and venue builder with probe-only compiled recipe injection. One actual representative per kind/mood/spot-count/table-game-multiset signature; other venues are inventoried, not scene-measured. No source runtime mutation. Subtract exact captured recipe fallback objects and runtime root; measure real near/goal markers and day/night host lighting. Ground geometry is included once by scene traversal; renderer background and the extra transparent ground pass are added once from the accepted real-render calibration. All omitted tables are failures.',
      kitInputs: kitInputs.sourcePins, outerCalibration: outerWitness, cityCount: briefs.length, inventoriedVenues: inventory.length, distinctSignatures: signatures.size, venueCount: rows.length, inventory, kinds: [...new Set(rows.map(r => r.kind))].sort(), global, sourceKinds, perKind, worstWithinVenueMarkerDrift, worstGlobalTriangleDrift: drift.slice(0, 20),
      failures, missingTableVenues: rows.filter(r => r.missingTables.length).map(r => ({ city: r.city, venue: r.venue, missing: r.missingTables })), briefs,
      sourcePins: [...pins].sort(([a], [b]) => a.localeCompare(b)).map(([path, sha256]) => ({ path, sha256 })), rows };
  } finally { hook.deregister(); globalThis.fetch = originalFetch; await store.dispose(); }
}

export interface HostMeasurementsFile {
  schema: 'allworld-scene-host-measurements'; version: 1;
  sourceFiles: { path: string; sha256: string }[];
  cities: Record<string, HostSceneryByVenue>;
}
/** Only the coverage projection is needed to expand measurements; tests do not need an offline world artifact. */
export interface HostAuditCoverage {
  failures: readonly unknown[]; missingTableVenues: readonly unknown[];
  briefs: readonly { city: string; targets: number }[];
  inventory: readonly { city: string; venue: string; signature: string; representative: boolean }[];
  rows: readonly { city: string; venue: string; maximum: SceneryEstimate }[];
  sourcePins: { path: string; sha256: string }[];
}
/** Measured representative costs expand only to inventoried exact matching signatures. */
export function hostMeasurementsFromAudit(audit: HostAuditCoverage, expectedCities: readonly string[]): HostMeasurementsFile {
  assert.equal(audit.failures.length, 0, 'failed audit cannot publish host measurements');
  assert.equal(audit.missingTableVenues.length, 0, 'missing tables cannot publish host measurements');
  assert.deepEqual(audit.briefs.map(b => b.city).sort(), [...expectedCities].sort(), 'exact city coverage required');
  const bySignature = new Map<string, SceneryEstimate>();
  for (const representative of audit.inventory.filter(row => row.representative)) {
    const measured = audit.rows.find(row => row.city === representative.city && row.venue === representative.venue);
    assert.ok(measured, `missing measured signature ${representative.signature}`);
    const { triangles, meshes, lights } = measured.maximum;
    assert.ok(!bySignature.has(representative.signature), 'duplicate representative signature');
    bySignature.set(representative.signature, { triangles, meshes, lights });
  }
  const cities: Record<string, HostSceneryByVenue> = {};
  for (const city of [...expectedCities].sort()) {
    const inventory = audit.inventory.filter(row => row.city === city);
    assert.equal(inventory.length, audit.briefs.find(brief => brief.city === city)!.targets);
    const map = Object.fromEntries(inventory.map(row => {
      const estimate = bySignature.get(row.signature); assert.ok(estimate, `unmeasured support signature ${row.signature}`);
      return [row.venue, estimate];
    }));
    cities[city] = parseHostSceneryByVenue(map, inventory.map(row => row.venue));
  }
  return { schema: 'allworld-scene-host-measurements', version: 1, sourceFiles: audit.sourcePins, cities };
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const [flag, kitManifest, out, selection, canonical, ...extra] = process.argv.slice(2);
  assert.ok(flag === '--kits' && kitManifest && out && selection && extra.length === 0, 'usage: measure-host.ts --kits REPO_RELATIVE_KITS.json AUDIT.json city,...|all [CANONICAL.json]');
  const result = await auditHosts(kitManifest, selection !== 'all' ? selection.split(',') : undefined);
  await writeFile(out, JSON.stringify(result, null, 2) + '\n');
  if (canonical) {
    assert.equal(selection, 'all', 'canonical generation requires the complete inventory');
    assert.ok(result.worstWithinVenueMarkerDrift <= 0.15, 'per-venue maximum-state estimate exceeds 15% actual scenery drift');
    for (const pin of result.sourcePins) assert.equal(hash(await readFile(new URL(pin.path, root))), pin.sha256, `source changed during host audit: ${pin.path}`);
    await writeFile(canonical, JSON.stringify(hostMeasurementsFromAudit(result, playableCityIds()), null, 2) + '\n');
  }
  console.log(JSON.stringify({ output: out, cities: result.cityCount, inventoriedVenues: result.inventoriedVenues, signatures: result.distinctSignatures, measuredVenues: result.venueCount, kinds: result.kinds, global: result.global, failures: result.failures.length, missingTableVenues: result.missingTableVenues.length, worstDrift: result.worstGlobalTriangleDrift[0], perVenueMaximumStateDrift: result.worstWithinVenueMarkerDrift }));
  if (result.failures.length || result.missingTableVenues.length) process.exitCode = 1;
}
