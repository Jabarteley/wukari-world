import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, symlinkSync, realpathSync, truncateSync, cpSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkPackage, expectedConfig, releaseMarker } from './guard-joinallworld-package.mjs';
import { checkSource, openDevProblems } from './check-joinallworld-source.mjs';
import { checkWorkflow, nodePinProblems, parseYaml } from './check-workflows.mjs';
const sha = 'a'.repeat(40);
function fixture(t, identity = { version: 1, kind: 'local' }) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'joinallworld-package-test-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'assets')); writeFileSync(join(root, 'assets/index.html'), '<!doctype html><title>Fixture</title>');
  const city = '{"version":1,"cityId":"lagos"}', dictionary = 'synthetic packed words';
  const progression = [
    ['episodes-0', '{"version":1,"kind":"episodes","order":0,"items":[]}'],
    ['journeys', '{"version":1,"kind":"journeys","order":0,"items":[],"acceptedCityIds":[],"acceptedCountryIds":[]}'],
    ['missions', '{"version":1,"kind":"missions","order":0,"value":{"definitions":[]}}'],
  ];
  const cityDigest = createHash('sha256').update(city).digest('hex'), dictionaryDigest = createHash('sha256').update(dictionary).digest('hex');
  const cityPath = `/assets/cities/lagos.${cityDigest}.json`, dictionaryPath = `/assets/words/dictionary.${dictionaryDigest}.txt`;
  const progressionPaths = progression.map(([name, bytes]) => `/assets/progression/${name}.${createHash('sha256').update(bytes).digest('hex')}.json`);
  mkdirSync(join(root, 'assets/assets/cities'), { recursive: true }); mkdirSync(join(root, 'assets/assets/words'), { recursive: true }); mkdirSync(join(root, 'assets/assets/progression'), { recursive: true });
  writeFileSync(join(root, `assets${cityPath}`), city); writeFileSync(join(root, `assets${dictionaryPath}`), dictionary);
  progression.forEach(([, bytes], index) => writeFileSync(join(root, `assets${progressionPaths[index]}`), bytes));
  const markWorker = source => releaseMarker(sha, identity) + source;
  writeFileSync(join(root, 'worker.js'), markWorker(`export const content = ${JSON.stringify([cityPath, dictionaryPath, ...progressionPaths])};`));
  writeFileSync(join(root, 'wrangler.json'), JSON.stringify(expectedConfig(sha, false)));
  const seal = () => {
    const files = [];
    function walk(path) { for (const name of readdirSync(path).sort()) { if (name === 'manifest.json') continue; const full = join(path, name), stat = statSync(full); if (stat.isDirectory()) walk(full); else files.push({ path: relative(root, full), bytes: stat.size, sha256: createHash('sha256').update(readFileSync(full)).digest('hex') }); } }
    walk(root); writeFileSync(join(root, 'manifest.json'), JSON.stringify({ sourceSha: sha, publish: false, identity, files }));
  };
  seal(); return { root, seal, cityPath, dictionaryPath, progressionPaths, markWorker };
}
test('accepts exact separate-worker package and rejects content changes', t => {
  const f = fixture(t); assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(join(f.root, 'worker.js'), 'tampered'); assert.throws(() => checkPackage(f.root, sha, false), /manifest mismatch/);
});
test('accepts hashed city JSON and refuses a resealed payload under the wrong content hash', t => {
  const f = fixture(t), bytes = '{"version":1,"cityId":"lagos"}';
  const digest = createHash('sha256').update(bytes).digest('hex');
  const dir = join(f.root, 'assets/assets/cities');
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `lagos.${digest}.json`);
  writeFileSync(path, bytes); f.seal();
  assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(path, '{"version":1,"cityId":"ibadan"}'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /City content filename hash mismatch/);
});
test('requires every content asset referenced by the sealed Worker and authenticates the dictionary', t => {
  const f = fixture(t), dictionary = 'another synthetic packed word list';
  const digest = createHash('sha256').update(dictionary).digest('hex');
  const path = `/assets/words/dictionary.${digest}.txt`;
  writeFileSync(join(f.root, 'worker.js'), f.markWorker(`export const content = ${JSON.stringify([f.cityPath, path, ...f.progressionPaths])};`)); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Missing referenced content asset/);
  rmSync(join(f.root, `assets${f.dictionaryPath}`));
  const file = join(f.root, `assets${path}`);
  writeFileSync(file, dictionary); f.seal();
  assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(file, 'wrong payload'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Content asset filename hash mismatch/);
});
test('rejects a missing referenced city payload and content files larger than 5 MiB', t => {
  const missing = fixture(t);
  rmSync(join(missing.root, `assets${missing.cityPath}`)); missing.seal();
  assert.throws(() => checkPackage(missing.root, sha, false), /Missing referenced content asset/);

  const oversized = fixture(t), file = join(oversized.root, 'assets/too-large.txt');
  writeFileSync(file, 'x'); truncateSync(file, 5 * 1024 * 1024 + 1); oversized.seal();
  assert.throws(() => checkPackage(oversized.root, sha, false), /Invalid package file/);
});
for (const [name, change] of [
  ['rebundling the sealed Worker', config => { config.no_bundle = false; }],
  ['static assets included as Worker modules', config => { config.find_additional_modules = true; }],
  ['old Worker identity', config => { config.name = 'allworld'; }],
  ['old namespace binding', config => { config.durable_objects.bindings[0].script_name = 'allworld'; }],
  ['apex route', config => { config.routes = ['joinallworld.com/*']; }],
  ['build hook', config => { config.build = { command: 'unreviewed' }; }],
  ['preview exposure', config => { config.preview_urls = true; }],
  ['unapproved public runtime', config => { config.workers_dev = true; }],
  ['extra secret binding', config => { config.vars.TOKEN = 'synthetic'; }],
]) test(`rejects ${name} even with resealed manifest`, t => {
  const f = fixture(t), config = expectedConfig(sha, false); change(config);
  writeFileSync(join(f.root, 'wrangler.json'), JSON.stringify(config)); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Unapproved deployment configuration/);
});
function glb(jsonText) {
  const json = Buffer.from(jsonText.padEnd(Math.ceil(jsonText.length / 4) * 4, ' '));
  const out = Buffer.alloc(20 + json.length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(json.length, 12); out.writeUInt32LE(0x4e4f534a, 16); json.copy(out, 20);
  return out;
}
test('accepts the two near-crowd body files and no other .bin', t => {
  const f = fixture(t); mkdirSync(join(f.root, 'assets/assets'), { recursive: true });
  writeFileSync(join(f.root, 'assets/assets/base-body-male-lod-aebd3566.bin'), Buffer.from([1, 2, 3])); f.seal();
  assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(join(f.root, 'assets/assets/other-lod-aebd3566.bin'), Buffer.from([1, 2, 3])); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Unexpected package file/);
});

test('accepts binary glTF models and rejects files only named .glb', t => {
  const f = fixture(t); mkdirSync(join(f.root, 'assets/models'));
  writeFileSync(join(f.root, 'assets/models/body-a1b2.glb'), glb('{"asset":{"version":"2.0"}}')); f.seal();
  assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(join(f.root, 'assets/models/body-a1b2.glb'), 'export default 1'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Invalid model file/);
  const truncated = glb('{"asset":{"version":"2.0"}}').subarray(0, 24); writeFileSync(join(f.root, 'assets/models/body-a1b2.glb'), truncated); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Invalid model file/);
  rmSync(join(f.root, 'assets/models/body-a1b2.glb')); writeFileSync(join(f.root, 'assets/models/body.gltf'), '{}'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Unexpected package file/);
});
test('rejects hidden, state and symlink files', t => {
  const f = fixture(t); writeFileSync(join(f.root, '.env'), 'synthetic'); assert.throws(() => checkPackage(f.root, sha, false), /Forbidden package path/); rmSync(join(f.root, '.env'));
  symlinkSync(join(f.root, 'worker.js'), join(f.root, 'assets/link.js')); assert.throws(() => checkPackage(f.root, sha, false), /Forbidden package path/);
});
test('workflow permits only the fixed guarded command', () => {
  const source = readFileSync(new URL('../.github/workflows/joinallworld-release.yml', import.meta.url), 'utf8');
  const workflow = parseYaml(source); assert.deepEqual(checkWorkflow('joinallworld-release.yml', workflow), []);
  assert.ok(checkWorkflow('other.yml', workflow).some(x => x.includes('outside the reviewed deploy job')));
  const changed = structuredClone(workflow); changed.jobs.deploy.steps.at(-1).run = 'node arbitrary-script.mjs';
  assert.ok(checkWorkflow('joinallworld-release.yml', changed).some(x => x.includes('not the guarded deploy')));
  const wrongSecret = structuredClone(workflow); wrongSecret.jobs.deploy.steps.at(-1).env.CLOUDFLARE_API_TOKEN = '${{ secrets.OTHER_TOKEN }}';
  assert.ok(checkWorkflow('joinallworld-release.yml', wrongSecret).some(x => x.includes('outside the reviewed deploy job')));
  const noMain = structuredClone(workflow); noMain.jobs.deploy.if = 'inputs.deploy';
  assert.ok(checkWorkflow('joinallworld-release.yml', noMain).some(x => x.includes('limited to refs/heads/main')));
  const suffix = structuredClone(workflow); suffix.jobs.deploy.steps.at(-1).run += '; arbitrary-command';
  assert.ok(checkWorkflow('joinallworld-release.yml', suffix).some(x => x.includes('not the guarded deploy')));
});

test('release Node pins meet the minimum numerically and still require exact supported versions', () => {
  assert.deepEqual(nodePinProblems('>=22.18.0', ['22.18.0', '22.18.1', '22.19.0', '24.19.0']), []);
  for (const pin of ['22.17.99', '22.18', '24', '24.x', '24.19.0-beta.1', '>=24.19.0', '024.19.0', '24.19.0 ', null, undefined, 24]) {
    assert.ok(nodePinProblems('>=22.18.0', [pin]).length > 0, String(pin));
  }
  assert.ok(nodePinProblems('>=22.18.1', ['22.18.0']).length > 0);
  assert.ok(nodePinProblems('>=22.18.0', ['21.99.99']).length > 0);
  assert.ok(nodePinProblems('>=22.18.0', []).length > 0);
  for (const engine of ['22.18.0', '>=22.18', '>=22.18.0 <25', '>=22.18.0-beta', undefined]) {
    assert.ok(nodePinProblems(engine, ['24.19.0']).length > 0, String(engine));
  }
});

test('source gate rejects unmerged and foreign-repository revisions', t => {
  const f = fixture(t);
  const git = args => { const result = spawnSync('git', ['-C', f.root, ...args], { encoding: 'utf8' }); assert.equal(result.status, 0, result.stderr); return result.stdout.trim(); };
  git(['init', '-b', 'main']); git(['config', 'user.name', 'Synthetic']); git(['config', 'user.email', 'synthetic@example.invalid']);
  git(['remote', 'add', 'origin', 'https://github.com/kromate/joinallworld']); git(['add', '.']); git(['commit', '-m', 'synthetic base']);
  const main = git(['rev-parse', 'HEAD']); git(['update-ref', 'refs/remotes/origin/main', main]); checkSource(f.root, main);
  git(['checkout', '-b', 'unmerged']); writeFileSync(join(f.root, 'branch.txt'), 'branch'); git(['add', '.']); git(['commit', '-m', 'synthetic unmerged']);
  const branch = git(['rev-parse', 'HEAD']); assert.throws(() => checkSource(f.root, branch), /ancestor/);
  git(['checkout', 'main']); git(['remote', 'set-url', 'origin', 'https://github.com/other/joinallworld']); assert.throws(() => checkSource(f.root, main), /Wrong source/);
});

test('deploy context rejects before invoking any executable', t => {
  const release = { version: 1, kind: 'github', runId: '123456789', runAttempt: '2' };
  const f = fixture(t, release), digest = checkPackage(f.root, sha, false);
  const guard = fileURLToPath(new URL('./guard-joinallworld-package.mjs', import.meta.url));
  const releaseEnv = { GITHUB_ACTIONS: 'true', GITHUB_RUN_ID: release.runId, GITHUB_RUN_ATTEMPT: release.runAttempt };
  for (const context of [{ GITHUB_EVENT_NAME: 'push', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'kromate/joinallworld' }, { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/other', GITHUB_REPOSITORY: 'kromate/joinallworld' }, { GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'other/repo' }]) {
    const result = spawnSync(process.execPath, [guard, 'deploy', f.root, sha, 'false', digest, '/does-not-exist'], { encoding: 'utf8', env: { PATH: process.env.PATH, ...context } });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /Deployment context rejected/);
  }
  const allowed = spawnSync(process.execPath, [guard, 'deploy', f.root, sha, 'false', digest, '/does-not-exist'], { encoding: 'utf8', env: { PATH: process.env.PATH, GITHUB_EVENT_NAME: 'workflow_dispatch', GITHUB_REF: 'refs/heads/main', GITHUB_REPOSITORY: 'kromate/joinallworld', ...releaseEnv } });
  assert.notEqual(allowed.status, 0); assert.match(allowed.stderr, /Missing protected deployment inputs/);
});

test('archive extractor rejects traversal, symlink, hardlink and oversize entries', t => {
  const f = fixture(t), unpack = fileURLToPath(new URL('./unpack-joinallworld.py', import.meta.url));
  for (const kind of ['traversal', 'symlink', 'hardlink', 'oversize']) {
    const archive = join(f.root, `${kind}.tar`), destination = join(f.root, `out-${kind}`);
    const script = `import tarfile,sys,io\nwith tarfile.open(sys.argv[1],'w') as t:\n i=tarfile.TarInfo('../escaped' if sys.argv[2]=='traversal' else 'entry')\n if sys.argv[2]=='symlink': i.type=tarfile.SYMTYPE; i.linkname='../escaped'\n if sys.argv[2]=='hardlink': i.type=tarfile.LNKTYPE; i.linkname='../escaped'\n if sys.argv[2]=='oversize': i.size=51*1024*1024\n t.addfile(i, io.BytesIO(bytes(i.size)) if i.size else None)\n`;
    assert.equal(spawnSync('python3', ['-c', script, archive, kind]).status, 0);
    const result = spawnSync('python3', [unpack, archive, destination], { encoding: 'utf8' });
    assert.notEqual(result.status, 0); assert.match(result.stderr, /Unsafe package entry|Package size limit|unexpected end/);
  }
});


test('archive extractor accepts the street-pack count and rejects excess entries or an oversize file', t => {
  const f = fixture(t), unpack = fileURLToPath(new URL('./unpack-joinallworld.py', import.meta.url));
  for (const [name, count, size, accepted] of [['streets', 8000, 0, true], ['too-many', 20001, 0, false], ['too-large', 1, 5 * 1024 * 1024 + 1, false]]) {
    const archive = join(f.root, `${name}.tar`), destination = join(f.root, name);
    const script = `import tarfile,sys,io\nwith tarfile.open(sys.argv[1],'w') as t:\n data=bytes(int(sys.argv[3]))\n for n in range(int(sys.argv[2])):\n  i=tarfile.TarInfo('assets/pack-'+str(n)+'.txt'); i.size=len(data); t.addfile(i,io.BytesIO(data))\n`;
    assert.equal(spawnSync('python3', ['-c', script, archive, String(count), String(size)]).status, 0);
    const result = spawnSync('python3', [unpack, archive, destination], { encoding: 'utf8' });
    if (accepted) assert.equal(result.status, 0, result.stderr);
    else { assert.notEqual(result.status, 0); assert.match(result.stderr, /Package size limit/); }
  }
});

// Open dev mode (server/open-dev) must never reach a release: the setting, its module and the Worker's import graph are guarded.
test('open dev mode guard: the real source is clean', () => {
  assert.deepEqual(openDevProblems(fileURLToPath(new URL('..', import.meta.url))), []);
});
test('open dev mode guard: catches the setting in production configuration and open-mode code reached from the Worker', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'joinallworld-open-dev-guard-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['deploy', 'server/open-dev', '.github/workflows', 'docs']) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, 'deploy/cloudflare-worker.ts'), "import { value } from './helper.ts';\nexport default value;\n");
  writeFileSync(join(root, 'deploy/helper.ts'), 'export const value = 1;\n');
  writeFileSync(join(root, 'docs/DEVELOPING.md'), 'Run it with ALLWORLD_OPEN_DEV=1 on your own machine.\n');
  writeFileSync(join(root, 'server/open-dev/index.ts'), 'export const x = 1;\n');
  assert.deepEqual(openDevProblems(root), []);
  for (const [file, text] of [['wrangler.jsonc', '{ "vars": { "ALLWORLD_OPEN_DEV": "1" } }'], ['.github/workflows/release.yml', 'env:\n  ALLWORLD_OPEN_DEV: 1\n'], ['.env.production', 'ALLWORLD_OPEN_DEV=1\n'], ['package.json', '{"scripts":{"start":"ALLWORLD_OPEN_DEV=1 node x"}}'], ['server/routes/core.ts', "if (env.ALLWORLD_OPEN_DEV) {}"]]) {
    mkdirSync(join(root, file, '..'), { recursive: true }); writeFileSync(join(root, file), text);
    assert.match(openDevProblems(root).join('\n'), new RegExp(file.replace(/[.]/g, '\\.')), file);
    rmSync(join(root, file));
  }
  writeFileSync(join(root, 'deploy/helper.ts'), "import './../server/open-dev/index.ts';\nexport const value = 1;\n");
  assert.match(openDevProblems(root).join('\n'), /Worker entry reaches server\/open-dev\/index\.ts/);
  assert.match(openDevProblems(root).join('\n'), /deploy\/helper\.ts imports server\/open-dev\/index\.ts/);
  writeFileSync(join(root, 'deploy/helper.ts'), "import '../server/server.ts';\n");
  assert.match(openDevProblems(root).join('\n'), /Worker entry reaches server\/server\.ts/);
});
test('open dev mode guard: a release package whose Worker carries the open-mode module is refused', t => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'worker.js'), f.markWorker('export default {fetch(){return new Response("/* allworld-open-dev-node-only */")}}')); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Open dev mode code in the release package/);
});

test('native release permits only named metadata and licence notices', t => {
  const f = fixture(t);
  const dir = join(f.root, 'assets/character-lab/models/final-pass-20261015');
  mkdirSync(dir, { recursive: true });
  const catalog = join(dir, 'catalog.json');
  writeFileSync(catalog, '{"version":1}');
  writeFileSync(join(f.root, 'assets/character-lab/THIRD_PARTY_NOTICES.md'), '# Attribution');
  f.seal(); assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  writeFileSync(catalog, '{bad'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Invalid native metadata/);
  writeFileSync(catalog, '{}');
  writeFileSync(join(dir, 'credentials.json'), '{}'); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Unexpected package file/);
});

test('exact selected native assets seal; identity, unknown models and size bounds fail closed', t => {
  const f = fixture(t);
  const source = fileURLToPath(new URL('../public/character-lab', import.meta.url));
  cpSync(source, join(f.root, 'assets/character-lab'), { recursive: true });
  f.seal(); assert.match(checkPackage(f.root, sha, false), /^[a-f0-9]{64}$/);
  const path = join(f.root, 'assets/character-lab/models/round4/female/base.glb');
  const bytes = readFileSync(path);
  assert.ok(bytes.length > 2 * 1024 * 1024 && bytes.length <= 5 * 1024 * 1024);
  writeFileSync(path, Buffer.from(bytes).fill(0, 0, 4)); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Native model identity mismatch/);
  writeFileSync(path, bytes);
  const unknown = join(f.root, 'assets/character-lab/unreviewed.glb');
  writeFileSync(unknown, bytes); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Invalid model file/);
  rmSync(unknown);
  truncateSync(path, 5 * 1024 * 1024 + 1); f.seal();
  assert.throws(() => checkPackage(f.root, sha, false), /Invalid package file/);
});
