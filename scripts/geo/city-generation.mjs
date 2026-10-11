#!/usr/bin/env node
/** Generate one city from pinned extracts and return evidence for an external importer. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LABELS = ['places', 'extras', 'water', 'landuse', 'roads'];
const SHA = /^[0-9a-f]{40}$/;
const HASH = /^[0-9a-f]{64}$/;
const CITY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const write = (file, value) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
const git = (app, args) => execFileSync('git', ['-C', app, ...args], { encoding: 'utf8' }).trim();
const moduleAt = (app, path) => import(pathToFileURL(join(app, path)).href);

function job(value) {
  assert.ok(value && CITY.test(value.city), 'city must be a kebab-case id');
  assert.ok(Number.isSafeInteger(value.sourceRunId) && value.sourceRunId > 0, `${value.city}: sourceRunId must be a positive integer`);
  assert.ok(typeof value.sourceArtifact === 'string' && /^[A-Za-z0-9._-]+$/.test(value.sourceArtifact), `${value.city}: invalid sourceArtifact`);
  assert.ok(SHA.test(value.sourceSha), `${value.city}: sourceSha must pin the artifact producer commit`);
  assert.ok(HASH.test(value.datasetSha256) && HASH.test(value.adapterSha256), `${value.city}: dataset and adapter SHA-256 pins are required`);
  for (const label of LABELS) assert.ok(HASH.test(value.extractSha256?.[label]), `${value.city}: ${label} extract hash is required`);
  if (value.coastSupplement !== undefined) {
    const coast = value.coastSupplement;
    assert.ok(coast && typeof coast === 'object' && !Array.isArray(coast), `${value.city}: invalid coastSupplement`);
    assert.ok(typeof coast.sourceArtifact === 'string' && /^[A-Za-z0-9._-]+$/.test(coast.sourceArtifact), `${value.city}: invalid supplement artifact`);
    assert.ok(typeof coast.city === 'string' && CITY.test(coast.city), `${value.city}: invalid supplement city`);
    assert.ok(HASH.test(coast.waterSha256), `${value.city}: supplement water hash is required`);
    for (const label of LABELS) assert.ok(HASH.test(coast.primaryExtractSha256?.[label]), `${value.city}: original primary ${label} hash is required`);
    const hasRun = coast.sourceRunId !== undefined, hasSha = coast.sourceSha !== undefined;
    assert.equal(hasRun, hasSha, `${value.city}: supplement sourceRunId and sourceSha must be paired`);
    if (hasRun) {
      assert.ok(Number.isSafeInteger(coast.sourceRunId) && coast.sourceRunId > 0, `${value.city}: invalid supplement sourceRunId`);
      assert.ok(SHA.test(coast.sourceSha), `${value.city}: invalid supplement sourceSha`);
    }
  }
  return value;
}

function matrix(file) {
  const batch = json(file);
  assert.equal(batch.schemaVersion, 1, 'generation batch schemaVersion must be 1');
  assert.ok(Array.isArray(batch.cities), 'generation batch needs cities[]');
  assert.ok(batch.cities.length === 0 || SHA.test(batch.appSha), 'nonempty cities need an exact appSha');
  assert.ok(batch.appSha === '' || SHA.test(batch.appSha), 'appSha must be empty or a full lowercase commit SHA');
  const jobs = batch.cities.map(job);
  assert.equal(new Set(jobs.map(item => item.city)).size, jobs.length, 'duplicate city jobs');
  const result = { appSha: batch.appSha, matrix: jobs };
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `app_sha=${batch.appSha}\nmatrix=${JSON.stringify(jobs)}\n`, { flag: 'a' });
  }
  console.log(JSON.stringify(result));
}

async function sourceRun(item, out) {
  const repository = process.env.GITHUB_REPOSITORY;
  assert.ok(repository && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'missing repository');
  const verify = async (producer, receipt) => {
    const endpoint = `${process.env.GITHUB_API_URL ?? 'https://api.github.com'}/repos/${repository}/actions/runs/${producer.sourceRunId}`;
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    assert.ok(response.ok, `source run lookup failed: HTTP ${response.status}`);
    const run = await response.json();
    assert.equal(run.head_sha, producer.sourceSha, 'source run producer SHA mismatch');
    assert.equal(run.status, 'completed', 'source run has not completed');
    assert.equal(run.repository?.full_name, repository, 'source run repository mismatch');
    const record = { repository, runId: run.id, sourceSha: run.head_sha, status: run.status, conclusion: run.conclusion, url: run.html_url, artifact: producer.sourceArtifact };
    write(join(out, receipt), record);
    console.log(JSON.stringify(record));
    return record;
  };
  // A country matrix can fail while another country's hash-pinned artifact is valid.
  const record = await verify(item, 'input/source-run.json');
  if (item.coastSupplement) {
    const coast = item.coastSupplement;
    const producer = { sourceArtifact: coast.sourceArtifact, sourceRunId: coast.sourceRunId ?? item.sourceRunId, sourceSha: coast.sourceSha ?? item.sourceSha };
    await verify(producer, 'input/coast-supplement-source-run.json');
    record.coastSupplement = { ...coast, sourceRunId: producer.sourceRunId, sourceSha: producer.sourceSha };
    write(join(out, 'input/source-run.json'), record);
  }
}

function mergeCoastline(item) {
  assert.ok(item.coastSupplement, 'coastSupplement is required for --merge-coastline');
  const root = resolve(process.env.EXTRACT_ROOT), supplementRoot = resolve(process.env.COAST_SUPPLEMENT_ROOT), mergedRoot = resolve(process.env.MERGED_EXTRACT_ROOT);
  const manifest = join(resolve(process.env.OUT_DIR), 'input/coast-supplement-pins.json');
  write(manifest, { primary: item.coastSupplement.primaryExtractSha256, supplement: item.coastSupplement.waterSha256 });
  execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'merge-coastline-extract.mjs'), '--primary', join(root, item.city), '--supplement', join(supplementRoot, item.coastSupplement.city, 'water.json'), '--out', join(mergedRoot, item.city), '--manifest', manifest], { stdio: 'inherit' });
}

function changedFiles(app) {
  return [...new Set([
    ...git(app, ['diff', '--name-only', 'HEAD']).split('\n'),
    ...git(app, ['ls-files', '--others', '--exclude-standard']).split('\n'),
  ].filter(Boolean))];
}

function filesUnder(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).flatMap(entry => {
    const relative = join(prefix, entry.name);
    assert.ok(!entry.isSymbolicLink(), `unexpected symlink: ${relative}`);
    return entry.isDirectory() ? filesUnder(root, relative) : [{ path: relative, bytes: readFileSync(join(root, relative)).length, sha256: hash(join(root, relative)) }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}

async function generate(item, appSha, app, extractRoot, out) {
  assert.ok(SHA.test(appSha), 'APP_SHA must be pinned');
  assert.ok(SHA.test(process.env.TOOL_SHA), 'TOOL_SHA must be pinned');
  assert.equal(git(app, ['rev-parse', 'HEAD']), appSha, 'application checkout SHA mismatch');
  assert.deepEqual(changedFiles(app), [], 'application checkout is not clean');
  const relativeCity = `src/game/cities/${item.city}`;
  const cityDir = join(app, relativeCity);
  const recipeFile = join(app, `scripts/geo/destination-detail/${item.city}.ts`);
  const factsFile = join(cityDir, 'facts.ts');
  const extractDir = join(extractRoot, item.city);
  const allowed = new Set(['geometry.ts', 'places.ts', 'terrain.ts'].map(file => `${relativeCity}/${file}`));
  const result = { schemaVersion: 1, status: 'running', city: item.city, appSha, toolSha: process.env.TOOL_SHA, sourceRunId: item.sourceRunId, sourceArtifact: item.sourceArtifact, sourceSha: item.sourceSha, expected: item, stages: [], inputHashes: {}, counts: {} };
  mkdirSync(join(out, 'logs'), { recursive: true });
  mkdirSync(join(out, 'input/extract'), { recursive: true });
  write(join(out, 'result.json'), result);
  const stage = (name, args) => {
    const start = Date.now();
    const run = spawnSync(process.execPath, args, { cwd: app, encoding: 'utf8', timeout: 25 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
    const log = (run.stdout ?? '') + (run.stderr ?? '') + (run.error ? `\n${run.error.message}\n` : '');
    writeFileSync(join(out, 'logs', `${name}.log`), log);
    result.stages.push({ name, command: ['node', ...args], exitCode: run.status, signal: run.signal, elapsedMs: Date.now() - start });
    if (name === 'focused-tests') result.counts.tests = Object.fromEntries(['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo'].map(key => [key, Number(log.match(new RegExp(`^# ${key} (\\d+)$`, 'm'))?.[1] ?? 0)]));
    process.stdout.write(log);
    assert.equal(run.status, 0, `${name} failed; inspect logs/${name}.log`);
    return log;
  };
  try {
    for (const file of [recipeFile, factsFile, join(cityDir, 'map.test.ts'), join(cityDir, 'journey.test.ts'), join(app, 'scripts/geo/destination-detail/pbf-extract.ts')]) assert.ok(existsSync(file), `pinned app lacks ${file}`);
    assert.ok(readFileSync(join(app, 'scripts/geo/build-destination-detail.ts'), 'utf8').includes('--extract-dir'), 'pinned generator lacks the offline extract path');
    result.inputHashes = { recipe: hash(recipeFile), facts: hash(factsFile), generator: hash(join(app, 'scripts/geo/build-destination-detail.ts')), packageLock: hash(join(app, 'package-lock.json')), extracts: {} };
    cpSync(recipeFile, join(out, 'input/recipe.ts'));
    cpSync(factsFile, join(out, 'input/facts.ts'));
    for (const label of LABELS) {
      const file = join(extractDir, `${label}.json`);
      const actual = hash(file);
      assert.equal(actual, item.extractSha256[label], `${label} extract SHA-256 mismatch`);
      const layer = json(file);
      assert.equal(layer.source?.datasetSha256, item.datasetSha256, `${label} dataset mismatch`);
      assert.equal(layer.source?.adapterSha256, item.adapterSha256, `${label} adapter mismatch`);
      result.inputHashes.extracts[label] = actual;
      result.counts.extracts ??= {};
      result.counts.extracts[label] = layer.elements?.length;
      cpSync(file, join(out, `input/extract/${label}.json`));
    }
    const [{ CONFIG }, { FACTS }, tools, { loadPbfExtract }, registry] = await Promise.all([
      moduleAt(app, `scripts/geo/destination-detail/${item.city}.ts`), moduleAt(app, `${relativeCity}/facts.ts`),
      moduleAt(app, 'scripts/geo/destination-detail/geometry-tools.ts'), moduleAt(app, 'scripts/geo/destination-detail/pbf-extract.ts'), moduleAt(app, 'src/game/cities/registry.ts'),
    ]);
    assert.equal(FACTS.id, item.city, 'facts city mismatch');
    assert.ok(registry.isKnownCityId(item.city) && registry.isOpenCityId(item.city), 'city must already be open in the real pinned registry');
    const [south, west, north, east] = CONFIG.box, reach = tools.reachFor(CONFIG.box);
    const bundle = loadPbfExtract(extractDir, item.city, { play: CONFIG.box, core: CONFIG.core, outline: [south - tools.OUTLINE_MARGIN, west - tools.OUTLINE_MARGIN, north + tools.OUTLINE_MARGIN, east + tools.OUTLINE_MARGIN], wide: [south - reach, west - reach, north + reach, east + reach] });
    result.source = bundle.source;
    const nodeArgs = ['--experimental-strip-types', '--import', './scripts/node-scene-css.ts'];
    stage('generate', ['--experimental-strip-types', 'scripts/geo/build-destination-detail.ts', item.city, '--extract-dir', extractDir]);
    stage('focused-tests', [...nodeArgs, '--test', '--test-reporter=tap', '--test-concurrency=1', `${relativeCity}/map.test.ts`, `${relativeCity}/journey.test.ts`]);
    assert.ok(result.counts.tests.tests > 0 && result.counts.tests.fail === 0, 'focused tests have no passing test receipt');
    const proofScript = join(dirname(fileURLToPath(import.meta.url)), 'city-generation-proof.mjs');
    for (const view of ['ground', 'city']) {
      stage(`flat-${view}`, [...nodeArgs, proofScript, '--worktree', app, '--city', item.city, '--outdir', join(out, 'proof', view), '--view', view]);
      const png = readFileSync(join(out, 'proof', view, `${item.city}-flat.png`));
      assert.ok(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), `${view} PNG signature mismatch`);
      assert.ok(png.readUInt32BE(16) === 1600 && png.readUInt32BE(20) === 1100, `${view} PNG dimensions mismatch`);
    }
    const [{ city }, { PLACES }, { KINDS }, { CITY_KINDS }, { buildCity, CITY_TRIANGLE_BUDGET }, { buildNetwork }, { createKit }, { CITY_DRAW_CALLS }] = await Promise.all([
      moduleAt(app, `${relativeCity}/index.ts`), moduleAt(app, `${relativeCity}/places.ts`), moduleAt(app, 'src/scene/venue-scenes.ts'), moduleAt(app, 'src/scene/city-scenes.ts'), moduleAt(app, 'src/map3d/city-build.ts'), moduleAt(app, 'src/map3d/roads.ts'), moduleAt(app, 'src/scene/kit.ts'), moduleAt(app, 'src/budgets.ts'),
    ]);
    const sourceElements = new Map([...bundle.answers.places.elements, ...bundle.answers.extras.elements].map(element => [`${element.type}/${element.id}`, element]));
    const sourceProblems = [];
    for (const place of PLACES) {
      const element = sourceElements.get(place.osm), choice = CONFIG.places.find(candidate => candidate.ref === place.osm);
      if (!element || !choice) { sourceProblems.push({ ref: place.osm, problem: 'missing source or recipe reference' }); continue; }
      const expectedName = choice.label ?? (element.tags['name:en'] ?? element.tags['name:fr'] ?? element.tags.name ?? '').replace(/\s+/g, ' ').trim();
      const point = element.type === 'node' ? element : element.center;
      if (place.name !== expectedName || !point || Math.abs(place.lon - point.lon) > 0.00000051 || Math.abs(place.lat - point.lat) > 0.00000051) sourceProblems.push({ ref: place.osm, problem: 'name or point mismatch' });
    }
    const content = await registry.loadCityContent(item.city);
    const venues = content.venues.filter(venue => venue.id !== 'home');
    const unknownKinds = venues.filter(venue => !KINDS.includes(venue.definition.scene.kind)).map(venue => ({ id: venue.id, kind: venue.definition.scene.kind }));
    const pack = await (await city.loadMap()).loadScene();
    const built = buildCity(createKit(), pack, buildNetwork(pack), { venues: {}, soon: {} });
    const drawCalls = built.group.children.filter(child => Reflect.get(child, 'isMesh') === true).length;
    const [factsWest, factsSouth, factsEast, factsNorth] = FACTS.bounds;
    const margin = Math.min((FACTS.airport.lon - factsWest) * 111320 * Math.cos(FACTS.airport.lat * Math.PI / 180), (factsEast - FACTS.airport.lon) * 111320 * Math.cos(FACTS.airport.lat * Math.PI / 180), (FACTS.airport.lat - factsSouth) * 111320, (factsNorth - FACTS.airport.lat) * 111320);
    const scene = { sourceProblems, unknownKinds, sharedCityKinds: [...new Set(venues.map(venue => venue.definition.scene.kind).filter(kind => Object.hasOwn(CITY_KINDS, kind)))], places: PLACES.length, uniqueNames: new Set(PLACES.map(place => place.name)).size, venues: venues.length, airportMinimumBoxMarginMetres: margin, triangles: built.triangles, triangleLimit: CITY_TRIANGLE_BUDGET, drawCalls, drawCallLimit: CITY_DRAW_CALLS.value };
    write(join(out, 'proof/scene-source.json'), scene);
    result.counts.scene = scene;
    for (const view of ['ground', 'city']) result.counts[view] = json(join(out, 'proof', view, `${item.city}-proof.json`));
    assert.ok(!sourceProblems.length && !unknownKinds.length, 'source reference or scene-kind proof failed');
    assert.ok(PLACES.length >= 20 && margin >= 900, 'places or airport margin below city acceptance bar');
    assert.ok(built.triangles < CITY_TRIANGLE_BUDGET && drawCalls <= CITY_DRAW_CALLS.value, 'scene budget exceeded');
    result.status = 'passed';
  } catch (error) {
    result.status = 'failed';
    result.error = error.message;
    throw error;
  } finally {
    const changes = changedFiles(app);
    result.changedFiles = changes;
    const invalid = changes.filter(file => !allowed.has(file));
    if (invalid.length) { result.status = 'failed'; result.error = `writes outside generated city files: ${invalid.join(', ')}`; }
    if (existsSync(cityDir)) {
      cpSync(cityDir, join(out, 'city', item.city), { recursive: true });
      result.generatedFiles = filesUnder(join(out, 'city', item.city));
    }
    if (existsSync(join(out, 'proof'))) result.proofFiles = filesUnder(join(out, 'proof'));
    write(join(out, 'result.json'), result);
    assert.ok(!invalid.length, result.error);
  }
  console.log(JSON.stringify({ city: item.city, status: result.status, out, counts: result.counts.tests, generatedFiles: result.generatedFiles.length }));
}

const [mode, file] = process.argv.slice(2);
if (mode === '--matrix') matrix(file ?? 'scripts/geo/city-generation-batch.json');
else if (mode === '--source-run') await sourceRun(job(JSON.parse(process.env.JOB_JSON)), resolve(process.env.OUT_DIR));
else if (mode === '--merge-coastline') mergeCoastline(job(JSON.parse(process.env.JOB_JSON)));
else if (mode === '--run') await generate(job(JSON.parse(process.env.JOB_JSON)), process.env.APP_SHA, resolve(process.env.APP_DIR), resolve(process.env.EXTRACT_ROOT), resolve(process.env.OUT_DIR));
else throw new Error('Usage: city-generation.mjs --matrix [batch.json] | --source-run | --merge-coastline | --run');
