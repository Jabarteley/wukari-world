import { loadCountryScope } from './country-scope.mjs';
import { writeReviewPage } from './gallery.mjs';
import { machineFailed, contactSheetInputs } from './report.mjs';
import { insideSandbox, remapTable } from './paths.mjs';
/** Plan by default. Execution requires a marked disposable clone; no live approval. */
import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync, copyFileSync, statSync, realpathSync, readdirSync, renameSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { ensureAcceptance } from './acceptance.mjs';
import { ladderNeeded, oversizedFiles, rungOutcome, walkRungs, FILE_LIMIT_BYTES, rungArguments, attemptRecord, ladderRecord, validateWaterBudgetLadder } from './water-ladder.mjs';
import { dropWaterLabels, dropWaterLabelsById, outsideWaterLabelIds, unlabellableWaterRefs } from './water-label-skip.mjs';
import { AUTO_RETRY_CLASSES, applyChange, planSceneBudget, planWetPlaces, wetAnchorsFromExactCoastLog, wetPlacesFromProofs, anchorGuard, afterRecord, catalogueRecord } from './auto-retry.mjs';
const a = process.argv.slice(2), get = k => a[a.indexOf(k) + 1], home = dirname(fileURLToPath(import.meta.url));
if (!['--table', '--workspace', '--outdir'].every(k => a.includes(k)))
    throw Error('Usage: runner.mjs --table JSON --workspace DISPOSABLE_CLONE --outdir PRIVATE_EVIDENCE [--plan|--execute] [--no-auto-retry]');
const tablePath = resolve(get('--table')), rawTable = JSON.parse(readFileSync(tablePath)), table = a.includes('--source') && a.includes('--extract-root') ? remapTable(rawTable, get('--source'), get('--extract-root'), a.includes('--boundary-root') ? get('--boundary-root') : undefined) : rawTable, workspace = resolve(get('--workspace')), out = resolve(get('--outdir')), execute = a.includes('--execute');
const sandbox = a.includes('--sandbox-root') ? resolve(get('--sandbox-root')) : home;
insideSandbox(out, sandbox);
const hash = bytes => createHash('sha256').update(bytes).digest('hex'), readhash = path => hash(readFileSync(path));
const shared = ['scripts/geo/build-destination-detail.ts', 'scripts/geo/destination-detail/geometry-tools.ts', 'scripts/geo/destination-detail/pbf-extract.ts', 'scripts/geo/destination-detail/queries.ts', 'scripts/geo/destination-detail/water-label.ts', 'scripts/city/build-catalogue.ts', 'src/game/cities/africa/contentBuilder.ts', 'src/game/cities/africa/types.ts', 'src/game/cities/africa/map.ts', 'src/game/cities/africa/module.ts', 'src/game/cities/cityContractTest.test.ts', 'package.json', 'package-lock.json'];
const tools = ['batch.mjs', 'scaffold.mjs', 'preflight.mjs', 'runner.mjs', 'inputs.mjs', 'acceptance.mjs', 'journey-template.ts', 'paths.mjs', 'report.mjs', 'source-scene.mjs', 'gallery.mjs', 'country-scope.mjs', 'destination-contract.mjs', 'exact-coastwater.py', 'coast-triangulation.mjs', 'slot-fallback.mjs', 'catalogue-budget.mjs', 'district-labels.mjs', 'coast-near-play.mjs', 'water-label-skip.mjs', 'bootstrap/geometry-knobs.json', 'profile.mjs', 'bootstrap/profiles.json', 'water-ladder.mjs', 'auto-retry.mjs', 'road-requirement.mjs'].map(n => join(home, n));
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
const cityPlan = table.targets.map(t => ({ id: t.id, scaffoldFiles: ['facts', 'index', 'content', 'map'].map(n => `src/game/cities/${t.id}/${n}.ts`).concat(`scripts/geo/destination-detail/${t.id}.ts`), generatedFiles: ['places', 'geometry', 'terrain'].map(n => `src/game/cities/${t.id}/${n}.ts`), generation: command('scripts/geo/build-destination-detail.ts', t.id, '--extract-dir', t.extractDirectory, '--country-boundary', join(loadCountryScope(table.root, t.countryScope ?? table.countryScope, t.country, t.sourceJob?.datasetSha256).policy.directory, 'boundary.geojson')), exactCoast: ['python3', join(home, 'exact-coastwater.py'), '--city-directory', join(workspace, 'src/game/cities', t.id), '--recipe', join(workspace, 'scripts/geo/destination-detail', `${t.id}.ts`), '--extract-dir', t.extractDirectory, '--country-boundary', join(loadCountryScope(table.root, t.countryScope ?? table.countryScope, t.country, t.sourceJob?.datasetSha256).policy.directory, 'boundary.geojson'), '--report', join(out, t.id, 'coast-water.json')], acceptance: command('--test', '--test-concurrency=1', `src/game/cities/${t.id}/map.test.ts`, `src/game/cities/${t.id}/journey.test.ts`), proofs: Object.fromEntries(['ground', 'city'].map(view => [view, command(proof, '--worktree', workspace, '--city', t.id, '--outdir', join(out, t.id, 'proof', view), '--view', view, ...(t.profile === undefined ? [] : ['--profile', t.profile]))])), sourceScene: command('--import', './scripts/node-scene-css.ts', join(home, 'source-scene.mjs'), '--workspace', workspace, '--city', t.id, '--extract-dir', t.extractDirectory, '--expected', join(out, `${t.id}-source-expected.json`), '--out', join(out, t.id, 'proof', 'scene-source.json')), genericAcceptance: 'emit proven map/journey wrappers only when absent; preserve existing stricter files', holds: ['metadata coordinates need primary record review', 'auto-bounds/re-extraction unverified; pinned boxes preserved', 'rendered visual and browser acceptance pending'] }));
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
// Per city: the target the attempt runs (a retry replaces it with a copy carrying the one approved table edit), the selection folder its scaffold comes from, and the record of
// every automatic change (autoRetries, see auto-retry.mjs). The first attempt is exactly what the runner always did.
const contexts = new Map(cityPlan.map(c => [c.id, { target: table.targets.find(target => target.id === c.id), selDir: join(out, 'selection'), autoRetries: [] }]));
const readJsonIf = path => existsSync(path) ? JSON.parse(readFileSync(path)) : null;
// Selection scaffold -> generated geometry for one city (the first loop of the original runner, unchanged apart from reading the scaffold from `selDir`).
const generateCity = (c, selection, selDir, ctx) => {
    const chosen = selection.find(r => r.id === c.id), row = { id: c.id, status: 'HOLD', reasons: [...c.holds], machineStages: {} };
    if (chosen?.status !== 'PRIVATE_SCAFFOLD_ONLY') {
        row.reasons.push(...(chosen?.errors ?? ['selection missing']));
        return row;
    }
    const compaction = catalogueRecord(chosen.catalogueCompaction);
    if (compaction && !ctx.autoRetries.some(entry => entry.class === 'catalogue-row')) ctx.autoRetries.push(compaction);
    try {
        ensureAcceptance(workspace, c.id, join(home, 'journey-template.ts'), { profile: chosen.profile, emptySlots: chosen.emptySlots });
        for (const path of c.scaffoldFiles) {
            const dest = join(workspace, path);
            mkdirSync(dirname(dest), { recursive: true });
            cpSync(join(selDir, `${c.id}-stage`, path), dest);
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
            const bounds = JSON.parse(readFileSync(join(selDir, `${c.id}-manifest.json`))).facts.bounds;
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
    return row;
};
for (const c of cityPlan)
    rows.push(generateCity(c, selected, join(out, 'selection'), contexts.get(c.id)));
const catalogue = run('catalogue', plan.catalogueOnce, ['catalogue', 'loaders', 'routes'].map(n => join(workspace, `src/game/cities/${n}.generated.ts`)));
// Exact coast -> source scene (with the optional budget ladder) -> acceptance -> proofs -> receipt for one city (the second loop of the original runner, unchanged apart from `ctx`).
const finishCity = (row, ctx) => {
    const c = cityPlan.find(c => c.id === row.id);
    const target = ctx.target, selDir = ctx.selDir;
    // Target `waterBudgetLadder: true` (off otherwise): keep the generated terrain and geometry that the exact-coast stage replaces, so a coarser shore can be tried (see water-ladder.mjs).
    const ladderOn = validateWaterBudgetLadder(target.waterBudgetLadder, row.id), cityFiles = ['terrain', 'geometry'].map(n => join(workspace, `src/game/cities/${row.id}/${n}.ts`));
    const keep = (name, files) => { mkdirSync(join(out, row.id, name), { recursive: true }); for (const f of files) copyFileSync(f, join(out, row.id, name, f.split('/').at(-1))); };
    const restore = name => { for (const f of cityFiles) copyFileSync(join(out, row.id, name, f.split('/').at(-1)), f); };
    if (ladderOn && !existsSync(join(out, row.id, 'pre-exact', 'terrain.ts'))) keep('pre-exact', cityFiles);
    // Exact directed source coast (land on the left of every OSM coastline way) replaces the grid flood-fill sea; inland cities report not-applicable.
    row.machineStages.exactCoast = run(`${row.id}/exact-coast`, c.exactCoast, [join(workspace, `src/game/cities/${row.id}/terrain.ts`), join(out, row.id, 'coast-water.json')]);
    if (!row.machineStages.exactCoast) { row.reasons.push('exact source-coast geometry failed or was not applicable'); return; }
    const selectionManifest = JSON.parse(readFileSync(join(selDir, `${row.id}-manifest.json`)));
    writeFileSync(join(out, `${row.id}-source-expected.json`), JSON.stringify({ ...(target.sourceJob ?? { extractSha256: target.extractSha256 }), countryScope: selectionManifest.countryScope, countryScopeReceipt: selectionManifest.countryScopeReceipt }));
    row.machineStages.sourceScene = run(`${row.id}/source-scene`, c.sourceScene, [join(out, row.id, 'proof', 'scene-source.json')]);
    // The ladder also runs when the scene proof passed but a delivered geometry.ts or terrain.ts is at or over the per-file byte limit (assemble-release.mjs enforces it later).
    const fileSizes = () => ({ geometry: statSync(cityFiles[1]).size, terrain: statSync(cityFiles[0]).size });
    if (ladderOn) {
        const readJson = path => existsSync(path) ? JSON.parse(readFileSync(path)) : null, coastReport = join(out, row.id, 'coast-water.json'), scenePath = join(out, row.id, 'proof', 'scene-source.json');
        const first = readJson(coastReport), firstScene = readJson(scenePath), firstSizes = fileSizes(), attempts = [], firstPassed = row.machineStages.sourceScene === true;
        if (first?.status === 'passed' && first.simplification && ladderNeeded({ sceneProved: firstPassed, scene: firstScene, sizes: firstSizes })) {
            copyFileSync(coastReport, join(out, row.id, 'coast-water-rung-0.json'));
            copyFileSync(scenePath, join(out, row.id, 'proof', 'scene-source-rung-0.json'));
            keep('rung-0', cityFiles);
            attempts.push(attemptRecord({ rung: 0, toleranceDegrees: first.simplification.toleranceDegrees, report: first, scene: firstScene, sizes: firstSizes, outcome: rungOutcome({ passed: firstPassed, scene: firstScene, sizes: firstSizes }) }));
            const { accepted, lastGood } = walkRungs({ toleranceDegrees: first.simplification.toleranceDegrees, step: (rung, number) => {
                restore('pre-exact');
                const reportPath = join(out, row.id, `coast-water-rung-${number}.json`), at = c.exactCoast.indexOf('--report');
                const command = [...c.exactCoast.slice(0, at + 1), reportPath, ...c.exactCoast.slice(at + 2), ...rungArguments(rung)];
                if (!run(`${row.id}/exact-coast-rung-${number}`, command, [cityFiles[0], reportPath])) {
                    const log = join(out, `${row.id}-exact-coast-rung-${number}.log`);
                    attempts.push(attemptRecord({ rung: number, toleranceDegrees: rung, outcome: 'infeasible', reason: (existsSync(log) ? readFileSync(log, 'utf8') : '').trim().split('\n').at(-1)?.slice(0, 600) ?? 'exact-coast stage failed' }));
                    return { outcome: 'infeasible' };
                }
                const rungReport = readJson(reportPath), sizes = fileSizes();
                keep(`rung-${number}`, cityFiles);
                const passed = run(`${row.id}/source-scene-rung-${number}`, c.sourceScene, [scenePath]);
                const scene = readJson(scenePath), outcome = rungOutcome({ passed, scene, sizes });
                copyFileSync(scenePath, join(out, row.id, 'proof', `scene-source-rung-${number}.json`));
                attempts.push(attemptRecord({ rung: number, toleranceDegrees: rung, report: rungReport, scene, sizes, outcome }));
                return { outcome };
            } });
            // The accepted rung (or, when none fits, the standard attempt) is what the later stages see; the report that carries it is the canonical coast-water.json.
            const finalNumber = accepted ? lastGood : 0;
            restore(`rung-${finalNumber}`);
            if (!accepted) copyFileSync(join(out, row.id, 'proof', 'scene-source-rung-0.json'), scenePath);
            const finalReport = readJson(join(out, row.id, `coast-water-rung-${finalNumber}.json`));
            finalReport.toleranceLadder = { ...(finalReport.toleranceLadder ?? {}), ...ladderRecord({ attempts, accepted }) };
            writeFileSync(coastReport, JSON.stringify(finalReport, null, 2));
            row.waterBudgetLadder = finalReport.toleranceLadder;
            row.machineStages.sourceScene = accepted;
            const over = oversizedFiles(firstSizes), why = over.length ? `${over.map(f => `${f.file} ${f.bytes} bytes`).join(', ')} at or over ${FILE_LIMIT_BYTES}` : `${attempts[0].triangles} of ${attempts[0].triangleLimit} triangles`;
            (row.warnings ??= []).push(accepted
                ? `water budget ladder: the standard shore overflowed the scene budget or the file limit (${why}); accepted rung ${finalNumber} (about ${attempts.at(-1).toleranceMetresApprox} m, play-water area error ${attempts.at(-1).playWaterAreaFraction}, ${attempts.at(-1).triangles} triangles, geometry.ts ${attempts.at(-1).geometryBytes} bytes, terrain.ts ${attempts.at(-1).terrainBytes} bytes)`
                : `water budget ladder exhausted: ${attempts.map(a => `rung ${a.rung} ${a.outcome}${a.triangles ? ` ${a.triangles} triangles` : ''}${a.geometryBytes !== undefined ? ` geometry.ts ${a.geometryBytes} terrain.ts ${a.terrainBytes} bytes` : ''}`).join(', ')}`);
            if (!accepted && (over.length || attempts.some(a => a.outcome === 'over-bytes')))
                row.reasons.push(`water budget ladder exhausted with geometry.ts or terrain.ts at or over ${FILE_LIMIT_BYTES} bytes: ${attempts.map(a => `rung ${a.rung} geometry.ts ${a.geometryBytes ?? 'n/a'} terrain.ts ${a.terrainBytes ?? 'n/a'}`).join('; ')}`);
        }
    }
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
    const t = ctx.target, manifest = join(out, `${row.id}-receipt-manifest.json`);
    // The attempt that follows an automatic retry: its outcome (everything but the receipt itself) goes into the receipt beside the change.
    for (const entry of ctx.autoRetries) if (entry.after === undefined) entry.after = afterRecord(row.machineStages, readJsonIf(join(out, row.id, 'proof', 'scene-source.json')));
    writeFileSync(manifest, JSON.stringify({ cities: [{ id: row.id, extract: t.extractDirectory, ...(t.sourceJob?.sourceInputs ? { sourceInputs: t.sourceJob.sourceInputs } : {}), ...(ctx.autoRetries.length ? { autoRetries: ctx.autoRetries } : {}) }] }));
    row.machineStages.receipt = run(`${row.id}/receipt`, command(receipt, workspace, manifest, table.receiptRoot ?? 'world/playable-africa-rollout'));
    if (!row.machineStages.receipt)
        row.reasons.push('receipt creation failed');
};
const annotate = (row, ctx) => { if (ctx.autoRetries.length) row.autoRetries = ctx.autoRetries; };
for (const row of rows) {
    if (!row.machineStages.generation)
        continue;
    finishCity(row, contexts.get(row.id));
}
for (const row of rows) annotate(row, contexts.get(row.id));

// Automatic recovery (auto-retry.mjs): a city that failed in a class whose fix is already approved is run once more through the same stages with that one table edit
// (a copy of its target; the table file is never changed). Any other failure stays a HOLD with its own message. Each retry is recorded in `autoRetries` (row and receipt).
const autoRetryOn = !a.includes('--no-auto-retry');
const runLabel = process.env.GITHUB_RUN_ID ? `run ${process.env.GITHUB_RUN_ID}` : `local ${identity.slice(0, 8)}`;
const guardFor = ctx => { const manifest = JSON.parse(readFileSync(join(ctx.selDir, `${ctx.target.id}-manifest.json`))); return anchorGuard({ target: ctx.target, config: manifest.config, facts: manifest.facts }); };
const classifyRetry = async (row, ctx) => {
    const id = row.id, used = ctx.autoRetries.map(entry => entry.class), stages = row.machineStages;
    if (stages.generation !== true) return null;
    if (stages.exactCoast === false) {
        const log = join(out, `${id}-exact-coast.log`);
        return planWetPlaces({ target: ctx.target, stage: 'exactCoast', wet: wetAnchorsFromExactCoastLog(existsSync(log) ? readFileSync(log, 'utf8') : ''), guard: guardFor(ctx), run: runLabel, used });
    }
    if (stages.sourceScene === false)
        return planSceneBudget({ target: ctx.target, scene: readJsonIf(join(out, id, 'proof', 'scene-source.json')), used });
    if ((stages.proofGround === false || stages.proofCity === false) && stages.acceptance === true) {
        const failing = [['proofGround', 'ground'], ['proofCity', 'city']].filter(([stage]) => stages[stage] === false);
        const proofs = failing.map(([, view]) => readJsonIf(join(out, id, 'proof', view, `${id}-proof.json`)));
        if (proofs.some(proof => !proof)) return null;
        const placesPath = join(workspace, 'src/game/cities', id, 'places.ts');
        const { PLACES } = await import(pathToFileURL(placesPath).href + `?attempt=${used.length}`);
        return planWetPlaces({ target: ctx.target, stage: failing[0][0], wet: wetPlacesFromProofs(proofs, PLACES), guard: guardFor(ctx), run: runLabel, used });
    }
    return null;
};
// Move the attempt's evidence aside (it stays in the artifact under auto-retry/) so the retry writes the canonical files and step-cache entries afresh.
const archiveAttempt = (id, folder) => {
    mkdirSync(folder, { recursive: true });
    const names = new Set([`${id}-source-expected.json`, `${id}-receipt-manifest.json`, ...Object.keys(cache.steps).filter(key => key.startsWith(`${id}/`)).map(key => key.replaceAll('/', '-') + '.log'), ...readdirSync(out).filter(name => new RegExp(`^${id}-generation-attempt-[0-9]+\\.log$`).test(name))]);
    for (const name of names) if (existsSync(join(out, name))) renameSync(join(out, name), join(folder, name));
    if (existsSync(join(out, id))) renameSync(join(out, id), join(folder, id));
    for (const key of Object.keys(cache.steps)) if (key.startsWith(`${id}/`)) delete cache.steps[key];
    writeFileSync(cachePath, JSON.stringify(cache, null, 2));
};
const retryCity = (row, ctx, planned) => {
    const id = row.id, c = cityPlan.find(city => city.id === id), number = ctx.autoRetries.filter(entry => AUTO_RETRY_CLASSES.includes(entry.class)).length + 1, folder = join(out, 'auto-retry', `${id}-${number}`);
    archiveAttempt(id, join(folder, 'previous-attempt'));
    const entry = { ...planned };
    ctx.target = applyChange(ctx.target, planned);
    ctx.autoRetries.push(entry);
    ctx.selDir = join(folder, 'selection');
    const retryTable = join(folder, 'execution-table.json');
    writeFileSync(retryTable, JSON.stringify({ ...table, root: table.root, targets: [ctx.target] }, null, 2));
    const selectionOk = run(`${id}/auto-retry-${number}-selection`, command(join(home, 'batch.mjs'), '--table', retryTable, '--out', ctx.selDir, '--sandbox-root', sandbox), [join(ctx.selDir, 'check-table.json')]);
    const next = selectionOk ? generateCity(c, JSON.parse(readFileSync(join(ctx.selDir, 'check-table.json'))), ctx.selDir, ctx) : { id, status: 'HOLD', reasons: [...c.holds, 'auto-retry selection failed; inspect the selection log'], machineStages: {} };
    if (next.machineStages.generation) finishCity(next, ctx);
    entry.after = afterRecord(next.machineStages, readJsonIf(join(out, id, 'proof', 'scene-source.json')));
    for (const done of ctx.autoRetries)
        if (AUTO_RETRY_CLASSES.includes(done.class)) (next.warnings ??= []).push(`auto-retry ${done.class}: ${JSON.stringify(done.change)}; ${done.after?.passed ? 'the machine stages passed after it' : 'the machine stages still failed after it'}`);
    annotate(next, ctx);
    return next;
};
if (autoRetryOn)
    for (let at = 0; at < rows.length; at += 1) {
        const ctx = contexts.get(rows[at].id);
        for (;;) {
            if (!machineFailed(true, [rows[at]])) break;
            const planned = await classifyRetry(rows[at], ctx);
            if (!planned) break;
            rows[at] = retryCity(rows[at], ctx, planned);
        }
    }
const failed = machineFailed(catalogue, rows);
writeFileSync(join(out, 'contact-sheet-inputs.json'), JSON.stringify(contactSheetInputs(out, rows), null, 2));
writeFileSync(join(out, 'machine-holds.json'), JSON.stringify({ identity, catalogue, machineFailed: failed, rows }, null, 2));
writeReviewPage(out, rows);
console.log(JSON.stringify({ identity, rows, receiptRoot: join(workspace, table.receiptRoot ?? 'world/playable-africa-rollout'), approval: 'none' }, null, 2));

process.exitCode = failed ? 1 : 0;
