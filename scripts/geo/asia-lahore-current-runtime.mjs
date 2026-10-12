import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

const json = path => JSON.parse(readFileSync(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const command = (name, args, cwd) => execFileSync(name, args, { cwd, encoding: 'utf8', timeout: 900000, maxBuffer: 32 * 1024 * 1024 });
const moduleAt = (root, path) => import(pathToFileURL(join(root, path)).href);
const files = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const path = join(root, entry.name);
  assert.ok(!lstatSync(path).isSymbolicLink(), `Symlink forbidden: ${path}`);
  return entry.isDirectory() ? files(path) : (assert.ok(entry.isFile(), `Nonregular file: ${path}`), [path]);
});
const tree = root => Object.fromEntries(files(root).map(path => [relative(root, path), hash(readFileSync(path))]));

// Only JSON literal data is adapted; imports, query functions and geographic data remain intact.
function jsonLiteral(text, start, end) {
  const from = text.indexOf(start);
  assert.ok(from >= 0 && text.indexOf(start, from + 1) < 0, 'Unique JSON literal start required');
  const offset = from + start.length, until = text.indexOf(end, offset);
  assert.ok(until >= offset, 'JSON literal end required');
  return { data: JSON.parse(text.slice(offset, until)), replace(data) { return text.slice(0, offset) + JSON.stringify(data, null, 2) + text.slice(until); } };
}
function uiFieldsFromStarter(source) {
  const mapping = {};
  for (const match of source.matchAll(/id: ids\.([a-z]+),[^\n]*category: '([^']+)', icon: '([^']+)'/g)) {
    assert.ok(!mapping[match[1]], `Ambiguous starter slot ${match[1]}`);
    mapping[match[1]] = { category: match[2], icon: match[3] };
  }
  for (const slot of ['transit', 'meal', 'community', 'clinic', 'recreation', 'market', 'worship', 'polling', 'government']) assert.ok(mapping[slot], `Missing current starter slot ${slot}`);
  return mapping;
}
function adaptUiMetadata(factsText, placesText, recipeText, mapping) {
  const facts = jsonLiteral(factsText, 'export const FACTS = ', ' satisfies DestinationFacts');
  // The generated array is multiline; its final bracket is followed by a newline.
  const placeStart = placesText.indexOf('export const PLACES: readonly DestinationPlace[] = ');
  assert.ok(placeStart >= 0);
  const arrayStart = placeStart + 'export const PLACES: readonly DestinationPlace[] = '.length;
  const arrayEnd = placesText.lastIndexOf(']\n');
  assert.ok(arrayEnd >= arrayStart);
  const originalPlaces = JSON.parse(placesText.slice(arrayStart, arrayEnd + 1));
  const recipe = jsonLiteral(recipeText, 'export const CONFIG = {\n...', ',\ndiscovery:');
  const originalFacts = structuredClone(facts.data), originalConfig = structuredClone(recipe.data);
  const fields = [];
  assert.ok(facts.data.names && !Object.hasOwn(facts.data.names, 'unit'), 'Adapter requires the known missing names.unit');
  facts.data.names.unit = 'neighbourhood';
  fields.push({ file: 'facts.ts', path: 'names.unit', value: 'neighbourhood', provenance: 'Generic interface label; no administrative boundary claim' });
  const add = (entry, file, index) => {
    const missing = ['category', 'icon'].filter(key => !Object.hasOwn(entry, key));
    if (!missing.length) return entry;
    assert.deepEqual(missing, ['category', 'icon'], 'Partial UI metadata requires review');
    assert.ok(entry.slot && mapping[entry.slot], `No authoritative slot metadata for ${entry.osm ?? entry.ref}`);
    for (const key of missing) fields.push({ file, index, ref: entry.osm ?? entry.ref, slot: entry.slot, field: key, value: mapping[entry.slot][key] });
    return { ...entry, ...mapping[entry.slot] };
  };
  const adaptedPlaces = originalPlaces.map((entry, index) => add(entry, 'places.ts', index));
  recipe.data.places = recipe.data.places.map((entry, index) => add(entry, 'recipe.ts', index));
  for (const entry of adaptedPlaces.filter(entry => entry.slot)) {
    const choice = recipe.data.places.find(choice => choice.ref === entry.osm);
    assert.ok(choice, 'Generated place has no recipe pick');
    assert.equal(choice.category, entry.category); assert.equal(choice.icon, entry.icon);
  }
  const strippedFacts = structuredClone(facts.data); delete strippedFacts.names.unit;
  assert.deepEqual(strippedFacts, originalFacts, 'Geographic facts changed');
  const strip = (entries, file) => entries.map((entry, index) => {
    const copy = { ...entry };
    for (const field of fields.filter(field => field.file === file && field.index === index)) delete copy[field.field];
    return copy;
  });
  assert.deepEqual(strip(adaptedPlaces, 'places.ts'), originalPlaces, 'Protected place data changed');
  const strippedConfig = { ...recipe.data, places: strip(recipe.data.places, 'recipe.ts') };
  assert.deepEqual(strippedConfig, originalConfig, 'Protected recipe data changed');
  return { facts: facts.replace(facts.data), places: placesText.slice(0, arrayStart) + JSON.stringify(adaptedPlaces, null, 2) + placesText.slice(arrayEnd + 1), recipe: recipe.replace(recipe.data), fields };
}

const args = process.argv.slice(2);
assert.equal(args.length, 8, 'Usage: --phase prepare|validate|finish --config JSON --sandbox DIR --factory DIR');
assert.deepEqual(args.filter((_, i) => i % 2 === 0), ['--phase', '--config', '--sandbox', '--factory']);
const [phase, configPath, sandboxArg, factoryArg] = args.filter((_, i) => i % 2 === 1);
const config = json(resolve(configPath)), sandbox = resolve(sandboxArg), factory = resolve(factoryArg);
assert.equal(process.platform, 'linux', 'Cloud Linux execution only');
assert.equal(process.env.GITHUB_ACTIONS, 'true', 'GitHub Actions execution only');
assert.equal(process.env.GITHUB_REPOSITORY, config.repository);
assert.equal(command('git', ['rev-parse', 'HEAD'], factory).trim(), config.factorySha);
assert.equal(command('git', ['status', '--porcelain', '--untracked-files=all', '--', 'scripts'], factory).trim(), '');
const app = join(sandbox, 'app'), evidence = join(sandbox, 'evidence'), generation = join(sandbox, 'generation');
mkdirSync(evidence, { recursive: true });
const write = (name, value) => writeFileSync(join(evidence, name), JSON.stringify(value, null, 2) + '\n');
const retainedCity = join(generation, 'delivery/cities/lahore');
const retainedRecipe = join(generation, 'delivery/recipes/lahore.ts');
const runtimeCity = join(app, 'src/game/cities/lahore');
const runtimeRecipe = join(app, 'scripts/geo/destination-detail/lahore.ts');
const table = json(join(dirname(resolve(configPath)), 'asia-factory-lahore-targets.json'));
const target = table.targets[0];
assert.equal(table.expectedSourceGitSHA, config.generationAppSha);
assert.equal(target.sourceJob.datasetSha256, config.source.pbfSha256);
assert.equal(target.sourceJob.sourceRunId, config.source.runId);
assert.equal(target.sourceJob.sourceSha, config.source.headSha);

async function execute() {
  assert.ok(['prepare', 'validate', 'finish'].includes(phase), 'Unknown phase');
  if (phase === 'prepare') {
    assert.equal(command('git', ['rev-parse', 'HEAD'], app).trim(), config.runtimeSha);
    assert.equal(command('git', ['status', '--porcelain', '--untracked-files=all'], app).trim(), '', 'Runtime checkout must be pristine');
    const pin = config.generation;
    const run = JSON.parse(command('gh', ['api', `repos/${config.repository}/actions/runs/${pin.runId}`]));
    assert.equal(run.repository.full_name, config.repository);
    assert.equal(run.id, pin.runId); assert.equal(run.head_sha, pin.headSha);
    assert.equal(run.head_branch, config.branch); assert.equal(run.event, 'push');
    assert.equal(run.path, '.github/workflows/asia-lahore-factory.yml');
    assert.equal(run.status, 'completed'); assert.equal(run.conclusion, 'success');
    const artifact = JSON.parse(command('gh', ['api', `repos/${config.repository}/actions/artifacts/${pin.artifactId}`]));
    assert.equal(artifact.id, pin.artifactId); assert.equal(artifact.name, pin.artifactName);
    assert.equal(artifact.size_in_bytes, pin.artifactBytes); assert.equal(artifact.digest, pin.artifactDigest);
    assert.equal(artifact.expired, false); assert.ok(Date.parse(artifact.expires_at) > Date.now());
    assert.equal(artifact.workflow_run.id, pin.runId); assert.equal(artifact.workflow_run.head_sha, pin.headSha);
    const archive = execFileSync('gh', ['api', `repos/${config.repository}/actions/artifacts/${pin.artifactId}/zip`], { maxBuffer: 16 * 1024 * 1024, timeout: 900000 });
    assert.equal(archive.length, pin.artifactBytes); assert.equal('sha256:' + hash(archive), pin.artifactDigest);
    const zip = join(sandbox, 'generation.zip'); writeFileSync(zip, archive, { flag: 'wx' });
    const entries = command('unzip', ['-Z1', zip]).trim().split('\n');
    for (const entry of entries) assert.ok(entry && !entry.startsWith('/') && !entry.includes('\\') && !entry.split('/').includes('..'), 'Unsafe ZIP path');
    mkdirSync(generation, { recursive: true }); command('unzip', ['-q', zip, '-d', generation]);
    files(generation);
    const plan = json(join(generation, 'evidence/plan.json'));
    assert.equal(plan.pins.sourceGitSHA, config.generationAppSha);
    assert.equal(plan.pins.sourceWorkingTreeClean, true);
    const machine = json(join(generation, 'evidence/machine-holds.json'));
    assert.equal(machine.identity, plan.identity);
    assert.equal(machine.catalogue, true);
    assert.equal(machine.machineFailed, false);
    const row = machine.rows.find(row => row.id === 'lahore');
    assert.ok(row, 'Lahore generation row missing');
    for (const stage of ['generation', 'sourceScene', 'acceptance', 'proofGround', 'proofCity', 'proof', 'receipt']) assert.equal(row.machineStages[stage], true, `Retained generation ${stage} failed`);
    const inventory = json(join(generation, 'delivery/playable-africa-rollout/sources/lahore.json'));
    assert.equal(inventory.cityId, 'lahore'); assert.equal(inventory.admission.accepted, false);
    for (const [name, asset] of Object.entries(inventory.generatedAssets)) {
      const bytes = readFileSync(join(retainedCity, name));
      assert.equal(bytes.length, asset.bytes); assert.equal(hash(bytes), asset.sha256, `Generation ${name} differs from receipt`);
    }
    assert.ok(!existsSync(runtimeCity) && !existsSync(runtimeRecipe), 'Lahore already exists in runtime; review required');
    cpSync(retainedCity, runtimeCity, { recursive: true }); cpSync(retainedRecipe, runtimeRecipe);
    const starterPath = join(app, 'src/game/cities/africa/contentBuilder.ts');
    const starter = readFileSync(starterPath, 'utf8'), mapping = uiFieldsFromStarter(starter);
    const adapted = adaptUiMetadata(readFileSync(join(retainedCity, 'facts.ts'), 'utf8'), readFileSync(join(retainedCity, 'places.ts'), 'utf8'), readFileSync(retainedRecipe, 'utf8'), mapping);
    writeFileSync(join(runtimeCity, 'facts.ts'), adapted.facts);
    writeFileSync(join(runtimeCity, 'places.ts'), adapted.places);
    writeFileSync(runtimeRecipe, adapted.recipe);
    const donorHashes = tree(retainedCity), adaptedHashes = tree(runtimeCity);
    for (const [name, digest] of Object.entries(donorHashes)) if (!['facts.ts', 'places.ts'].includes(name)) assert.equal(adaptedHashes[name], digest, `Protected ${name} changed`);
    write('ui-adapter.json', { kind: 'retained-lahore-current-runtime-ui-metadata-v1', runtimeSha: config.runtimeSha, mappingSource: 'src/game/cities/africa/contentBuilder.ts', mappingSourceSha256: hash(Buffer.from(starter)), effectiveSlotMapping: mapping, fields: adapted.fields, donorCityHashes: donorHashes, adaptedCityHashes: adaptedHashes, donorRecipeSha256: hash(readFileSync(retainedRecipe)), adaptedRecipeSha256: hash(readFileSync(runtimeRecipe)), protectedSemanticEquality: true, allowedChanges: ['facts.names.unit', 'missing slot category/icon in PLACES and recipe picks'] });

    write('transfer.json', { generationAppSha: config.generationAppSha, generationHeadSha: pin.headSha, runtimeSha: config.runtimeSha, factorySha: config.factorySha, artifact: pin, cityHashes: tree(retainedCity), recipeSha256: hash(readFileSync(retainedRecipe)), acceptance: config.acceptance, holds: config.holds });
  } else {
    assert.equal(command('git', ['rev-parse', 'HEAD'], app).trim(), config.runtimeSha);
    const adapter = json(join(evidence, 'ui-adapter.json'));
    assert.deepEqual(tree(runtimeCity), adapter.adaptedCityHashes, 'Adapted city bytes changed');
    assert.equal(hash(readFileSync(runtimeRecipe)), adapter.adaptedRecipeSha256, 'Adapted recipe bytes changed');
    assert.deepEqual(tree(retainedCity), adapter.donorCityHashes, 'Donor city bytes changed');
    assert.equal(hash(readFileSync(retainedRecipe)), adapter.donorRecipeSha256, 'Donor recipe bytes changed');
    const starter = readFileSync(join(app, adapter.mappingSource), 'utf8');
    assert.equal(hash(Buffer.from(starter)), adapter.mappingSourceSha256, 'Current starter metadata changed');
    const adapted = adaptUiMetadata(readFileSync(join(retainedCity, 'facts.ts'), 'utf8'), readFileSync(join(retainedCity, 'places.ts'), 'utf8'), readFileSync(retainedRecipe, 'utf8'), uiFieldsFromStarter(starter));
    for (const [path, expected] of [[join(runtimeCity, 'facts.ts'), adapted.facts], [join(runtimeCity, 'places.ts'), adapted.places], [runtimeRecipe, adapted.recipe]]) assert.equal(readFileSync(path, 'utf8'), expected, 'UI-only adaptation changed');
    assert.deepEqual(adapted.fields, adapter.fields);

    // Import the CURRENT runtime box policy and source loader without running any generator.
    const { CONFIG } = await moduleAt(app, 'scripts/geo/destination-detail/lahore.ts');
    const tools = await moduleAt(app, 'scripts/geo/destination-detail/geometry-tools.ts');
    const { proposeBounds } = await moduleAt(factory, 'scripts/geo/factory/bootstrap/bounds-policy.mjs');
    const proposed = proposeBounds(target.facts, {}, tools);
    const [south, west, north, east] = CONFIG.box, reach = tools.reachFor(CONFIG.box);
    const boxes = { play: CONFIG.box, core: CONFIG.core, outline: [south - tools.OUTLINE_MARGIN, west - tools.OUTLINE_MARGIN, north + tools.OUTLINE_MARGIN, east + tools.OUTLINE_MARGIN], wide: [south - reach, west - reach, north + reach, east + reach] };
    write('runtime-boxes.json', { runtimeSha: config.runtimeSha, boxes, retained: target.metadataSources.bounds.boxes, proposed, method: 'Pinned pure bounds policy using current runtime geometry tools; retained extracts reused, no extraction rerun' });
    for (const key of ['play', 'core', 'outline', 'wide']) for (let i = 0; i < 4; i++) assert.ok(Math.abs(proposed.boxes[key][i] - target.metadataSources.bounds.boxes[key][i]) <= 1e-9, `Computed ${key} differs; HOLD`);
    assert.deepEqual(boxes, target.metadataSources.bounds.boxes, 'Current four boxes differ; HOLD, no invented re-extraction');
    if (phase === 'validate') {
      const expected = json(join(generation, 'evidence/lahore-source-expected.json'));
      assert.deepEqual(expected.extractSha256, target.extractSha256);
      assert.equal(expected.datasetSha256, config.source.pbfSha256);
      expected.countryScope = { ...expected.countryScope, directory: join(sandbox, 'boundaries/pk') };
      const { inspectFactorySourceScene, assertSourceScene } = await moduleAt(factory, 'scripts/geo/factory/source-scene.mjs');
      const scene = await inspectFactorySourceScene(app, 'lahore', join(sandbox, 'extracts/lahore'), expected);
      write('runtime-scene-source.json', { generationAppSha: config.generationAppSha, runtimeSha: config.runtimeSha, ...scene });
      assertSourceScene(scene);
      assert.ok(scene.triangles < config.limits.trianglesExclusive && scene.drawCalls <= config.limits.drawCallsInclusive, 'Explicit current runtime budget exceeded');
      write('receipt-manifest.json', { cities: [{ id: 'lahore', extract: join(sandbox, 'extracts/lahore') }] });
    } else {
      const old = json(join(generation, 'delivery/playable-africa-rollout/sources/lahore.json'));
      const current = json(join(app, 'world/playable-africa-rollout/sources/lahore.json'));
      for (const key of ['selectedPlaces', 'geometryInput', 'boxes', 'waterRecipe']) assert.deepEqual(current[key], old[key], `Protected inventory ${key} changed`);
      for (const [name, asset] of Object.entries(current.generatedAssets)) {
        const bytes = readFileSync(join(runtimeCity, name));
        assert.equal(asset.sha256, hash(bytes)); assert.equal(asset.bytes, bytes.length);
        assert.equal(asset.sha256, adapter.adaptedCityHashes[name]);
        if (!['facts.ts', 'places.ts'].includes(name)) assert.deepEqual(asset, old.generatedAssets[name], `Protected inventory asset ${name} changed`);
      }
      assert.deepEqual(Object.keys(current.generatedAssets), Object.keys(old.generatedAssets));
      assert.equal(current.admission.accepted, false);
      write('result.json', { status: 'CURRENT_RUNTIME_MACHINE_CANDIDATE', generationAppSha: config.generationAppSha, generationHeadSha: config.generation.headSha, runtimeSha: config.runtimeSha, acceptance: config.acceptance, holds: config.holds });
    }
  }
}
try { await execute(); } catch (error) {
  write('result.json', { status: 'HOLD', phase, generationAppSha: config.generationAppSha, runtimeSha: config.runtimeSha, reason: error.message, acceptance: config.acceptance, holds: config.holds });
  throw error;
}
