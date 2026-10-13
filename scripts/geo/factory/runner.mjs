import { loadCountryScope } from './country-scope.mjs';
import { writeReviewPage } from './gallery.mjs';
import { machineFailed, contactSheetInputs } from './report.mjs';
import { insideSandbox, remapTable } from './paths.mjs';
/** Plan by default. Execution requires a marked disposable clone; no live approval. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync, realpathSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ensureAcceptance } from './acceptance.mjs';
import { dropWaterLabels, dropWaterLabelsById, outsideWaterLabelIds, unlabellableWaterRefs } from './water-label-skip.mjs';
const a = process.argv.slice(2), get = k => a[a.indexOf(k) + 1], home = dirname(fileURLToPath(import.meta.url));
if (!['--table', '--workspace', '--outdir'].every(k => a.includes(k)))
    throw Error('Usage: runner.mjs --table JSON --workspace DISPOSABLE_CLONE --outdir PRIVATE_EVIDENCE [--plan|--execute]');
const tablePath = resolve(get('--table')), rawTable = JSON.parse(readFileSync(tablePath)), table = a.includes('--source') && a.includes('--extract-root') ? remapTable(rawTable, get('--source'), get('--extract-root'), a.includes('--boundary-root') ? get('--boundary-root') : undefined) : rawTable, workspace = resolve(get('--workspace')), out = resolve(get('--outdir')), execute = a.includes('--execute');
const sandbox = a.includes('--sandbox-root') ? resolve(get('--sandbox-root')) : home;
insideSandbox(out, sandbox);
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), readhash = path => hash(readFileSync(path));
const shared = ['scripts/geo/build-destination-detail.ts', 'scripts/geo/destination-detail/geometry-tools.ts', 'scripts/geo/destination-detail/pbf-extract.ts', 'scripts/geo/destination-detail/queries.ts', 'scripts/geo/destination-detail/water-label.ts', 'scripts/city/build-catalogue.ts', 'src/game/cities/africa/contentBuilder.ts', 'src/game/cities/africa/types.ts', 'src/game/cities/africa/map.ts', 'src/game/cities/africa/module.ts', 'src/game/cities/cityContractTest.test.ts', 'package.json', 'package-lock.json'];
const tools = ['batch.mjs', 'scaffold.mjs', 'preflight.mjs', 'runner.mjs', 'inputs.mjs', 'acceptance.mjs', 'journey-template.ts', 'paths.mjs', 'report.mjs', 'source-scene.mjs', 'gallery.mjs', 'country-scope.mjs', 'destination-contract.mjs', 'exact-coastwater.py', 'coast-triangulation.mjs', 'slot-fallback.mjs', 'catalogue-budget.mjs', 'district-labels.mjs', 'water-label-skip.mjs', 'bootstrap/geometry-knobs.json', 'profile.mjs', 'bootstrap/profiles.json'].map(n => join(home, n));
if (!a.includes('--proof-helper') || !a.includes('--receipt-helper')) throw Error('Explicit --proof-helper and --receipt-helper are required');
const proof = resolve(get('--proof-helper')), receipt = resolve(get('--receipt-helper'));
tools.push(proof, receipt);
function dependencyTree(root) {
    const entries = [];
    function visit(relative) {
        const path = join(root, relative);
        if (!existsSync(path))
            return;
        for (const item of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const child = relative + '/' + item.name;
            if (item.isDirectory())
                visit(child);
            else if (item.isFile())
                entries.push([child, readhash(join(root, child))]);
        }
    }
    visit('src');
    visit('scripts');
    for (const path of ['package.json', 'package-lock.json'])
        if (existsSync(join(root, path)))
            entries.push([path, readhash(join(root, path))]);
    return { sha256: hash(JSON.stringify(entries)), files: entries.length };
}
const sourceGit = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: table.root, encoding: 'utf8' });
if (sourceGit.status !== 0)
    throw Error('Source baseline must have a known Git SHA');
if (table.expectedSourceGitSHA && table.expectedSourceGitSHA !== sourceGit.stdout.trim()) throw Error('Source baseline Git SHA differs from packaged table pin');
const sourceStatus = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'src', 'scripts', 'package.json', 'package-lock.json'], { cwd: table.root, encoding: 'utf8' });
if (sourceStatus.status !== 0) throw Error('Cannot establish source baseline cleanliness');
const sourceDirty = Boolean(sourceStatus.stdout.trim());
if (execute && sourceDirty) throw Error('Dirty source baseline cannot execute; use the exact clean committed checkout');
const proofRoot = a.includes('--helper-root') ? resolve(get('--helper-root')) : table.root;
const pins = {
    table: readhash(tablePath),
    sourceGitSHA: sourceGit.stdout.trim(),
    sourceWorkingTreeClean: !sourceDirty,
    sourceDependencyTree: dependencyTree(table.root),
    helperDependencyTree: dependencyTree(proofRoot),
    tools: Object.fromEntries(tools.map(path => [path === proof ? 'city-generation-proof.mjs' : path === receipt ? 'integrate-city-receipts.mjs' : path.slice(home.length + 1), readhash(path)])),
    cityInputs: Object.fromEntries(table.targets.map(target => [target.id, {
            metadata: target.facts ? hash(JSON.stringify({ facts: target.facts, metadataSources: target.metadataSources })) : readhash(join(table.root, target.factsRecordRef)),
            extract: target.extractSha256,
            countryScope: loadCountryScope(table.root, target.countryScope ?? table.countryScope, target.country, target.sourceJob?.datasetSha256).receipt,
            geometryPreset: target.geometryPreset ?? table.geometryPreset ?? 'standard',
        }])),
};
for (const t of table.targets)
    for (const layer of ['places', 'extras', 'water', 'landuse', 'roads'])
        if (readhash(join(t.extractDirectory, layer + '.json')) !== t.extractSha256?.[layer])
            throw Error(`${t.id}: actual extract ${layer} hash mismatch`);
const identity = hash(JSON.stringify(pins)), node = process.execPath, command = (...args) => [node, '--experimental-strip-types', ...args];
const cityPlan = table.targets.map(t => ({ id: t.id, scaffoldFiles: ['facts', 'index', 'content', 'map'].map(n => `src/game/cities/${t.id}/${n}.ts`).concat(`scripts/geo/destination-detail/${t.id}.ts`), generatedFiles: ['places', 'geometry', 'terrain'].map(n => `src/game/cities/${t.id}/${n}.ts`), generation: command('scripts/geo/build-destination-detail.ts', t.id, '--extract-dir', t.extractDirectory, '--country-boundary', join(loadCountryScope(table.root, t.countryScope ?? table.countryScope, t.country, t.sourceJob?.datasetSha256).policy.directory, 'boundary.geojson')), exactCoast: ['python3', join(home, 'exact-coastwater.py'), '--city-directory', join(workspace, 'src/game/cities', t.id), '--recipe', join(workspace, 'scripts/geo/destination-detail', `${t.id}.ts`), '--extract-dir', t.extractDirectory, '--country-boundary', join(loadCountryScope(table.root, t.countryScope ?? table.countryScope, t.country, t.sourceJob?.datasetSha256).policy.directory, 'boundary.geojson'), '--report', join(out, t.id, 'coast-water.json')], acceptance: command('--test', '--test-concurrency=1', `src/game/cities/${t.id}/map.test.ts`, `src/game/cities/${t.id}/journey.test.ts`), proofs: Object.fromEntries(['ground', 'city'].map(view => [view, command(proof, '--worktree', workspace, '--city', t.id, '--outdir', join(out, t.id, 'proof', view), '--view', view)])), sourceScene: command('--import', './scripts/node-scene-css.ts', join(home, 'source-scene.mjs'), '--workspace', workspace, '--city', t.id, '--extract-dir', t.extractDirectory, '--expected', join(out, `${t.id}-source-expected.json`), '--out', join(out, t.id, 'proof', 'scene-source.json')), genericAcceptance: 'emit proven map/journey wrappers only when absent; preserve existing stricter files', holds: ['metadata coordinates need primary record review', 'auto-bounds/re-extraction unverified; pinned boxes preserved', 'rendered visual and browser acceptance pending'] }));
const plan = { mode: execute ? 'execute' : 'plan', identity, pins, workspace, selection: command(join(home, 'batch.mjs'), '--table', join(out, 'execution-table.json'), '--out', join(out, 'selection'), '--sandbox-root', sandbox), cities: cityPlan, catalogueOnce: command('scripts/city/build-catalogue.ts'), receipts: command(receipt, workspace, 'PER_CITY_PRIVATE_RECEIPT_MANIFEST', table.receiptRoot ?? 'world/playable-africa-rollout'), cloudNeeds: ['clean committed source baseline plus separately marked disposable clone', 'Node strip-types runtime and repository dependencies', 'pinned five-layer extracts reachable at table paths', 'existing Linux proof helper needs rsvg-convert on Linux or sips on macOS', 'generic map/journey wrappers emitted only when absent; preserve stricter existing tests', 'metadata/visual/browser review after machine artifacts'] };
mkdirSync(out, { recursive: true });
const planPath = join(out, 'plan.json');
if (existsSync(planPath)) {
    const old = JSON.parse(readFileSync(planPath));
    if (old.identity !== identity)
        throw Error('Inputs/tools changed: use fresh outdir; no cross-identity resume');
}
writeFileSync(planPath, JSON.stringify(plan, null, 2));
if (!execute) {
    console.log(JSON.stringify({ mode: 'plan', identity, cities: cityPlan.map(c => c.id), plan: planPath, cloudNeeds: plan.cloudNeeds }, null, 2));
    process.exit(0);
}
if (realpathSync(workspace) === realpathSync(table.root) || !existsSync(join(workspace, '.factory-disposable.json')) || JSON.parse(readFileSync(join(workspace, '.factory-disposable.json'))).disposable !== true)
    throw Error('Execute requires a separately cloned, explicitly marked disposable workspace');
const cachePath = join(out, 'step-cache.json'), cache = existsSync(cachePath) ? JSON.parse(readFileSync(cachePath)) : { identity, steps: {} };
if (cache.identity !== identity)
    throw Error('Cache identity mismatch');
const run = (key, cmd, outputs = []) => {
    const previous = cache.steps[key];
    if (previous?.ok && outputs.length && outputs.every(p => existsSync(p) && previous.outputs[p] === readhash(p)))
        return true;
    const result = spawnSync(cmd[0], cmd.slice(1), { cwd: workspace, encoding: 'utf8', timeout: 900000, maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(join(out, key.replaceAll('/', '-') + '.log'), (result.stdout ?? '') + (result.stderr ?? ''));
    const ok = result.status === 0 && !result.error;
    cache.steps[key] = { ok, code: result.status, error: result.error?.message, outputs: ok ? Object.fromEntries(outputs.filter(existsSync).map(p => [p, readhash(p)])) : {} };
    writeFileSync(cachePath, JSON.stringify(cache, null, 2));
    return ok;
};
const executionTable = { ...table, root: table.root };
writeFileSync(join(out, 'execution-table.json'), JSON.stringify(executionTable, null, 2));
if (!existsSync(join(out, 'selection/check-table.json')) && !run('selection', plan.selection, [join(out, 'selection/check-table.json')]))
    throw Error('Selection failed; inspect selection.log');
const selected = JSON.parse(readFileSync(join(out, 'selection/check-table.json'))), rows = [];
const selectionFiles = [join(out, 'selection/check-table.json'), ...selected.flatMap(r => r.manifest ? [r.manifest, ...(r.status === 'PRIVATE_SCAFFOLD_ONLY' ? ['facts', 'index', 'content', 'map'].map(n => join(out, 'selection', `${r.id}-stage`, `src/game/cities/${r.id}/${n}.ts`)).concat(join(out, 'selection', `${r.id}-stage`, `scripts/geo/destination-detail/${r.id}.ts`)) : [])] : [])];
const selectionHashes = Object.fromEntries(selectionFiles.map(p => [p, readhash(p)]));
if (cache.selectionHashes && JSON.stringify(cache.selectionHashes) !== JSON.stringify(selectionHashes))
    throw Error('Private selection artifacts changed: refuse cache reuse');
cache.selectionHashes = selectionHashes;
writeFileSync(cachePath, JSON.stringify(cache, null, 2));
for (const c of cityPlan) {
    const chosen = selected.find(r => r.id === c.id), row = { id: c.id, status: 'HOLD', reasons: [...c.holds], machineStages: {} };
    rows.push(row);
    if (chosen?.status !== 'PRIVATE_SCAFFOLD_ONLY') {
        row.reasons.push(...(chosen?.errors ?? ['selection missing']));
        continue;
    }
    try {
        ensureAcceptance(workspace, c.id, join(home, 'journey-template.ts'), { profile: chosen.profile, emptySlots: chosen.emptySlots });
        for (const path of c.scaffoldFiles) {
            const dest = join(workspace, path);
            mkdirSync(dirname(dest), { recursive: true });
            cpSync(join(out, 'selection', `${c.id}-stage`, path), dest);
        }
        row.machineStages.generation = run(`${c.id}/generation`, c.generation, c.generatedFiles.map(p => join(workspace, p)));
        // A named water label with no interior point in the rendered water is optional: drop exactly that label, record it, generate again (at most three times).
        for (let attempt = 1; !row.machineStages.generation && attempt <= 3; attempt += 1) {
            const logPath = join(out, `${c.id}-generation.log`), recipePath = join(workspace, `scripts/geo/destination-detail/${c.id}.ts`);
            const dropped = existsSync(logPath) ? dropWaterLabels(readFileSync(recipePath, 'utf8'), unlabellableWaterRefs(readFileSync(logPath, 'utf8'))) : { removed: [] };
            if (!dropped.removed.length)
                break;
            writeFileSync(recipePath, dropped.text);
            copyFileSync(logPath, join(out, `${c.id}-generation-attempt-${attempt}.log`));
            (row.warnings ??= []).push(...dropped.removed.map(label => `water label ${label.ref} skipped: no interior point in the rendered water (generator error; the label is optional)`));
            (row.skippedWaterLabels ??= []).push(...dropped.removed.map(label => label.ref));
            row.machineStages.generation = run(`${c.id}/generation`, c.generation, c.generatedFiles.map(p => join(workspace, p)));
        }
        // A water label the generator placed outside the play box would fail the city proof (outsideBounds): drop exactly that optional label and generate again (at most twice).
        for (let attempt = 1; row.machineStages.generation && attempt <= 2; attempt += 1) {
            const recipePath = join(workspace, `scripts/geo/destination-detail/${c.id}.ts`), terrainPath = join(workspace, `src/game/cities/${c.id}/terrain.ts`);
            const bounds = JSON.parse(readFileSync(join(out, 'selection', `${c.id}-manifest.json`))).facts.bounds;
            const dropped = dropWaterLabelsById(readFileSync(recipePath, 'utf8'), outsideWaterLabelIds(readFileSync(terrainPath, 'utf8'), bounds));
            if (!dropped.removed.length)
                break;
            writeFileSync(recipePath, dropped.text);
            (row.warnings ??= []).push(...dropped.removed.map(label => `water label ${label.ref} skipped: generated outside the play box (the label is optional)`));
            (row.skippedWaterLabels ??= []).push(...dropped.removed.map(label => label.ref));
            delete cache.steps[`${c.id}/generation`];
            row.machineStages.generation = run(`${c.id}/generation`, c.generation, c.generatedFiles.map(p => join(workspace, p)));
        }
        if (!row.machineStages.generation)
            row.reasons.push('geometry generation failed');
    }
    catch (error) {
        row.reasons.push(error.message);
    }
}
const catalogue = run('catalogue', plan.catalogueOnce, ['catalogue', 'loaders', 'routes'].map(n => join(workspace, `src/game/cities/${n}.generated.ts`)));
for (const row of rows) {
    if (!row.machineStages.generation)
        continue;
    const c = cityPlan.find(c => c.id === row.id);
    const target = table.targets.find(target => target.id === row.id);
    // Exact directed source coast (land on the left of every OSM coastline way) replaces the grid flood-fill sea; inland cities report not-applicable.
    row.machineStages.exactCoast = run(`${row.id}/exact-coast`, c.exactCoast, [join(workspace, `src/game/cities/${row.id}/terrain.ts`), join(out, row.id, 'coast-water.json')]);
    if (!row.machineStages.exactCoast) { row.reasons.push('exact source-coast geometry failed or was not applicable'); continue; }
    const selectionManifest = JSON.parse(readFileSync(join(out, 'selection', `${row.id}-manifest.json`)));
    writeFileSync(join(out, `${row.id}-source-expected.json`), JSON.stringify({ ...(target.sourceJob ?? { extractSha256: target.extractSha256 }), countryScope: selectionManifest.countryScope, countryScopeReceipt: selectionManifest.countryScopeReceipt }));
    row.machineStages.sourceScene = run(`${row.id}/source-scene`, c.sourceScene, [join(out, row.id, 'proof', 'scene-source.json')]);
    if (!row.machineStages.sourceScene) row.reasons.push('source/name/point/scene-kind/budget proof incomplete or failed');
    if (!catalogue)
        row.reasons.push('shared catalogue failed');
    row.machineStages.acceptance = run(`${row.id}/acceptance`, c.acceptance);
    for (const view of ['ground', 'city']) {
        const stage = view === 'ground' ? 'proofGround' : 'proofCity';
        row.machineStages[stage] = run(`${row.id}/proof-${view}`, c.proofs[view], [join(out, row.id, 'proof', view, `${row.id}-flat.png`), join(out, row.id, 'proof', view, `${row.id}-proof.json`)]);
    }
    row.machineStages.proof = row.machineStages.proofGround && row.machineStages.proofCity;
    if (!row.machineStages.acceptance)
        row.reasons.push('map/journey acceptance incomplete or failed');
    if (!row.machineStages.proof)
        row.reasons.push('source/geometry/PNG proof incomplete or failed');
    const t = table.targets.find(t => t.id === row.id), manifest = join(out, `${row.id}-receipt-manifest.json`);
    writeFileSync(manifest, JSON.stringify({ cities: [{ id: row.id, extract: t.extractDirectory, ...(t.sourceJob?.sourceInputs ? { sourceInputs: t.sourceJob.sourceInputs } : {}) }] }));
    row.machineStages.receipt = run(`${row.id}/receipt`, command(receipt, workspace, manifest, table.receiptRoot ?? 'world/playable-africa-rollout'));
    if (!row.machineStages.receipt)
        row.reasons.push('receipt creation failed');
}
const failed = machineFailed(catalogue, rows);
writeFileSync(join(out, 'contact-sheet-inputs.json'), JSON.stringify(contactSheetInputs(out, rows), null, 2));
writeFileSync(join(out, 'machine-holds.json'), JSON.stringify({ identity, catalogue, machineFailed: failed, rows }, null, 2));
writeReviewPage(out, rows);
console.log(JSON.stringify({ identity, rows, receiptRoot: join(workspace, table.receiptRoot ?? 'world/playable-africa-rollout'), approval: 'none' }, null, 2));

process.exitCode = failed ? 1 : 0;
