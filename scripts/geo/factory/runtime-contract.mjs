/** Execute destination geometry contracts using real source shapes; inspect generator contracts separately. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const allowed = new Set(['--source', '--generator-source', '--out']);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  if (!allowed.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]])
    throw Error('Usage: node --experimental-strip-types runtime-contract.mjs --source CLEAN_CHECKOUT --out NEW_RECEIPT.json [--generator-source CLEAN_CHECKOUT]');
  options[args[i]] = resolve(args[i + 1]);
}
if (!options['--source'] || !options['--out']) throw Error('--source and --out required');
const source = options['--source'], generatorRoot = options['--generator-source'] ?? source;
const out = options['--out'];
if (existsSync(out)) throw Error('Receipt must be new; refusing overwrite');
const hash = value => createHash('sha256').update(value).digest('hex');
const git = (root, ...parameters) => execFileSync('git', ['-C', root, ...parameters]);
const report = {
  schemaVersion: 1, status: 'HOLD', diagnostic: 'destination-runtime-contract',
  scriptSha256: hash(readFileSync(new URL(import.meta.url))),
  limitations: ['Real city shapes exercise data preservation only; no geography correctness, generation, rendering, travel, or browser acceptance is proved',
    'Generator and catalogue checks are static inspection, not execution',
    'Legacy support is detected from returned polygons, not from accepting an unknown object property'],
};

function pin(root, paths) {
  const sha = git(root, 'rev-parse', 'HEAD').toString().trim();
  const status = git(root, 'status', '--porcelain', '--untracked-files=all').toString();
  const files = {};
  for (const path of paths) {
    const committed = git(root, 'show', `${sha}:${path}`);
    const actual = readFileSync(join(root, path));
    files[path] = { committedSha256: hash(committed), actualSha256: hash(actual), bytes: actual.length };
    assert.equal(files[path].actualSha256, files[path].committedSha256, `${path}: working file differs from committed source`);
  }
  return { root, gitSHA: sha, clean: status.length === 0, files, dirtyStatus: status.trim() };
}
const runtimePaths = ['src/game/cities/africa/map.ts', 'src/game/cities/africa/types.ts',
  'src/geo/frame.ts', 'src/types/content.ts', 'src/game/cities/luanda/facts.ts',
  'src/game/cities/luanda/geometry.ts', 'src/game/cities/luanda/terrain.ts', 'vite.config.ts'];
const generatorPaths = ['scripts/geo/build-destination-detail.ts',
  'scripts/geo/destination-detail/geometry-tools.ts', 'scripts/city/build-catalogue.ts', 'vite.config.ts'];

try {
  report.runtimeSource = pin(source, runtimePaths);
  report.generatorSource = pin(generatorRoot, generatorPaths);
  assert.ok(report.runtimeSource.clean && report.generatorSource.clean, 'Clean checkouts required; untracked/dirty source rejected');
  const load = path => import(pathToFileURL(join(source, path)).href);
  const [{ createDestinationMap }, { FACTS }, { GEOMETRY }, { TERRAIN }] = await Promise.all([
    load(runtimePaths[0]), load(runtimePaths[4]), load(runtimePaths[5]), load(runtimePaths[6]),
  ]);
  assert.ok(GEOMETRY.land.length && TERRAIN.water.length, 'Luanda must supply actual nonempty land and water to distinguish legacy behavior');
  const play = [...GEOMETRY.land, ...TERRAIN.water];
  const unusedSceneModule = async () => { throw Error('Scene loading is outside this diagnostic'); };
  const modern = { land: GEOMETRY.land, playArea: play, buildings: GEOMETRY.buildings, roads: GEOMETRY.roads };
  const modernResult = await createDestinationMap(FACTS, modern, unusedSceneModule, TERRAIN).loadGeometry();
  assert.deepEqual(modernResult.playArea, play, 'Explicit playArea polygons were changed/lost');
  assert.deepEqual(modernResult.localUnits.centre, GEOMETRY.land, 'Land polygons were changed/lost');
  assert.deepEqual(modernResult.water, TERRAIN.water, 'Water polygons were changed/lost');
  report.modern = { evidence: 'executed', supported: true, fixtureCity: FACTS.id,
    landPolygons: GEOMETRY.land.length, waterPolygons: TERRAIN.water.length,
    expectedPlayPolygons: play.length, returnedPlayPolygons: modernResult.playArea.length,
    inputPlaySha256: hash(JSON.stringify(play)), returnedPlaySha256: hash(JSON.stringify(modernResult.playArea)) };
  const legacy = { land: GEOMETRY.land, playAreaFromSurfaces: true, buildings: GEOMETRY.buildings, roads: GEOMETRY.roads };
  const legacyResult = await createDestinationMap(FACTS, legacy, unusedSceneModule, TERRAIN).loadGeometry();
  const legacySupported = JSON.stringify(legacyResult.playArea) === JSON.stringify(play);
  report.legacy = { evidence: 'executed', supported: legacySupported,
    returnedPlayPolygons: legacyResult.playArea.length,
    explanation: legacySupported ? 'Runtime derives playArea from supplied land and declared water'
      : 'Runtime accepts the object but ignores playAreaFromSurfaces; returned playArea omits the supplied water polygons. A 7a57e756 legacy generator paired with this runtime is incompatible' };
  const generator = readFileSync(join(generatorRoot, generatorPaths[0]), 'utf8');
  const supportsExtract = /extractDir\s*=/.test(generator) && generator.includes("'--extract-dir'") && generator.includes('loadPbfExtract(');
  const legacyEmission = /playAreaFromSurfaces:\s*true/.test(generator);
  const explicitEmission = /playArea:\s*\$\{lonLat\(play\)\}/.test(generator);
  const compatibleEmission = legacyEmission ? legacySupported : explicitEmission && report.modern.supported;
  const catalogue = readFileSync(join(generatorRoot, 'scripts/city/build-catalogue.ts'), 'utf8');
  const vite = readFileSync(join(generatorRoot, 'vite.config.ts'), 'utf8');
  const runtimeVite = readFileSync(join(source, 'vite.config.ts'), 'utf8');
  // Parse only the regex source, never execute checkout JavaScript during static inspection.
  const matcher = runtimeVite.split('\n').find(line => line.includes('const declarations =') && line.includes('code.matchAll(/'));
  const regexText = matcher?.match(/code\.matchAll\(\/(.*)\/g\)/)?.[1];
  const modernLoader = catalogue.includes('()=>import(') && catalogue.includes('.then(m=>m.');
  const legacyLoader = catalogue.includes('async()=>(await import(');
  const sample = modernLoader ? '  ()=>import("./luanda/index.ts").then(m=>m.city),'
    : legacyLoader ? '  async()=>(await import("./luanda/index.ts")).city,' : null;
  const loaderMatches = Boolean(regexText && sample && new RegExp(regexText, 'g').test(sample));
  report.static = { evidence: 'static-source-inspection', supportsExtractDir: supportsExtract,
    geometryEmission: legacyEmission ? 'playAreaFromSurfaces' : explicitEmission ? 'explicit-playArea' : 'unknown',
    geometryRuntimeCompatible: compatibleEmission, catalogueLoaderSyntax: modernLoader ? 'promise-then' : legacyLoader ? 'async-await' : 'unknown',
    runtimeViteMatcher: regexText ?? null, representativeLoader: sample,
    catalogueMatchesRuntimeViteRegex: loaderMatches, generatorViteSha256: hash(vite), runtimeViteSha256: hash(runtimeVite) };
  assert.ok(supportsExtract, 'Generator lacks offline --extract-dir support; stop before generation');
  assert.ok(compatibleEmission, 'Generator geometry contract is unsupported by runtime; stop before generation');
  assert.ok(loaderMatches, 'Generator catalogue syntax does not match runtime Vite loader regex; stop before generation');
  report.status = 'RUNTIME_CONTRACT_COMPATIBLE';
} catch (error) {
  report.reason = error.message;
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, receipt: out, reason: report.reason ?? null }));
if (report.status === 'HOLD') process.exitCode = 1;
