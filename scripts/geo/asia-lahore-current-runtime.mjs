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
    write('transfer.json', { generationAppSha: config.generationAppSha, generationHeadSha: pin.headSha, runtimeSha: config.runtimeSha, factorySha: config.factorySha, artifact: pin, cityHashes: tree(retainedCity), recipeSha256: hash(readFileSync(retainedRecipe)), acceptance: config.acceptance, holds: config.holds });
  } else {
    assert.equal(command('git', ['rev-parse', 'HEAD'], app).trim(), config.runtimeSha);
    assert.deepEqual(tree(runtimeCity), tree(retainedCity), 'Transferred city bytes changed');
    assert.deepEqual(readFileSync(runtimeRecipe), readFileSync(retainedRecipe), 'Transferred recipe bytes changed');
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
      for (const key of ['selectedPlaces', 'generatedAssets', 'geometryInput', 'boxes', 'waterRecipe']) assert.deepEqual(current[key], old[key], `Protected inventory ${key} changed`);
      assert.equal(current.admission.accepted, false);
      write('result.json', { status: 'CURRENT_RUNTIME_MACHINE_CANDIDATE', generationAppSha: config.generationAppSha, generationHeadSha: config.generation.headSha, runtimeSha: config.runtimeSha, acceptance: config.acceptance, holds: config.holds });
    }
  }
}
try { await execute(); } catch (error) {
  write('result.json', { status: 'HOLD', phase, generationAppSha: config.generationAppSha, runtimeSha: config.runtimeSha, reason: error.message, acceptance: config.acceptance, holds: config.holds });
  throw error;
}
