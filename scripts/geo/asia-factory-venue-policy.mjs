import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
assert.equal(args.length, 6, 'Usage: node asia-factory-venue-policy.mjs --factory-source DIR --policy JSON --table JSON');
assert.deepEqual(args.filter((_, index) => index % 2 === 0), ['--factory-source', '--policy', '--table']);
const root = resolve(args[1]), policy = JSON.parse(readFileSync(resolve(args[3]), 'utf8')), table = JSON.parse(readFileSync(resolve(args[5]), 'utf8'));
assert.equal(policy.schemaVersion, 1);
const policyOverrides = policy.venueOverrides ?? {};
for (const target of table.targets) {
    assert.deepEqual(target.sourceVenueOverrides ?? {}, policyOverrides[target.id] ?? {}, `Unreviewed source venue overrides for ${target.id}`);
    const overrides = target.geometryOverrides ?? {};
    assert.ok(overrides && typeof overrides === 'object' && !Array.isArray(overrides), `Invalid geometry overrides for ${target.id}`);
    for (const [key, value] of Object.entries(overrides)) {
        assert.equal(key, 'farWaterTolerance', `Unsupported geometry override for ${target.id}`);
        assert.ok(typeof value === 'number' && Number.isFinite(value) && value >= 0.0008 && value <= 0.0015, `farWaterTolerance outside 0.0008..0.0015 for ${target.id}`);
    }
}
const actual = spawnSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
assert.equal(actual.status, 0); assert.equal(actual.stdout.trim(), '0786c00510f2827d6495a53fc3299f3112d0d6b4');
const file = join(root, 'scripts/geo/factory/batch.mjs'), source = readFileSync(file, 'utf8');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(digest(source), 'c81564790e70c3bb978c66e7530f0c869c0f46d5291092c440cca818a2f63b0f');
const prior = "        const pool = [...unique.values()].filter(el => countryScope.classify(point(el)) === 'inside' && name(el) && inBox([s + .008, w + .008, n - .008, e - .008], point(el)) && !onWater(point(el)));";
assert.equal(source.split(prior).length, 2, 'Expected one exact eligible-pool seam');
const replacement = `        const unavailablePlaces = [];
        const available = element => {
            const tags = element.tags ?? {}, reasons = [];
            for (const [key, values] of Object.entries(${JSON.stringify(policy.excludedStatusTags)}))
                if (values.includes(tags[key])) reasons.push(key + '=' + tags[key]);
            if (${JSON.stringify(policy.excludedAccess)}.includes(tags.access)) reasons.push('access=' + tags.access);
            const wiki = String(tags.wikipedia ?? ''), opening = wiki.lastIndexOf('('), closing = wiki.lastIndexOf(')');
            const qualifier = opening >= 0 && closing === wiki.length - 1 && closing > opening ? wiki.slice(opening + 1, closing).trim() : null;
            if (${Boolean(policy.excludeConflictingWikipediaLocality)} && qualifier && !normal(qualifier).includes(normal(target.name))) reasons.push('wikipedia-locality=' + qualifier);
            const closed = /^([0-9]{4}-[0-9]{2}-[0-9]{2})-([0-9]{4}-[0-9]{2}-[0-9]{2})\\s+off$/i.exec(tags.opening_hours ?? '');
            const snapshot = raw.source.pbfHeaderTimestamp.slice(0, 10);
            if (${Boolean(policy.excludeOpeningHoursOff)} && (String(tags.opening_hours ?? '').trim().toLowerCase() === 'off' || (closed && closed[1] <= snapshot && snapshot <= closed[2]))) reasons.push('opening_hours=off@' + snapshot);
            if (reasons.length) unavailablePlaces.push({ ref: ref(element), name: name(element), reasons });
            return reasons.length === 0;
        };
        row.unavailableSourcePlaces = unavailablePlaces;
        const pool = [...unique.values()].filter(el => countryScope.classify(point(el)) === 'inside' && name(el) && inBox([s + .008, w + .008, n - .008, e - .008], point(el)) && !onWater(point(el)) && available(el));`;
const sourceAfterAvailability = source.replace(prior, replacement);
const oldSelection = '            const el = rank(pool.filter(el => predicate(el.tags)))[0];';
assert.equal(sourceAfterAvailability.split(oldSelection).length, 2, 'Expected one exact slot selection seam');
const newSelection = `            const eligible = rank(pool.filter(el => predicate(el.tags)));
            const override = target.sourceVenueOverrides?.[slot];
            const el = override ? eligible.find(candidate => ref(candidate) === override.ref) : eligible[0];
            if (override && !el) row.errors.push('source venue override ' + override.ref + ' is not an eligible unique ' + slot + ' record in the pinned source');
            if (override && el) {
                const receipt = { slot, ref: ref(el), name: name(el), point: point(el), sourceTags: el.tags, reason: override.reason };
                (row.sourceVenueOverridesApplied ??= []).push(receipt);
            }`;
const sourceAfterSelection = sourceAfterAvailability.replace(oldSelection, newSelection);
const oldConfig = '        const config = { ...old, name: target.name, box: boxes.play, core: boxes.core, places: choices, names };';
assert.equal(sourceAfterSelection.split(oldConfig).length, 2, 'Expected one exact generated CONFIG seam');
const newConfig = `        const geometryOverrides = target.geometryOverrides ?? {};
        if (!geometryOverrides || typeof geometryOverrides !== 'object' || Array.isArray(geometryOverrides)) throw new Error('Invalid geometry overrides for ' + target.id);
        for (const [key, value] of Object.entries(geometryOverrides)) {
            if (key !== 'farWaterTolerance' || typeof value !== 'number' || !Number.isFinite(value) || value < 0.0008 || value > 0.0015)
                throw new Error('Unsupported geometry override or farWaterTolerance outside 0.0008..0.0015 for ' + target.id);
        }
        const config = { ...old, name: target.name, box: boxes.play, core: boxes.core, places: choices, names, ...geometryOverrides };`;
const patched = sourceAfterSelection.replace(oldConfig, newConfig);
const syntax = spawnSync(process.execPath, ['--check', '--input-type=module', '-'], { encoding: 'utf8', input: patched });
assert.equal(syntax.status, 0, `Patched city selector is invalid: ${syntax.stderr}`);
const dryRun = args.includes('--dry-run');
if (dryRun) assert.equal(args.at(-1), '--dry-run'); else writeFileSync(file, patched);
const sceneFile = join(root, 'scripts/geo/factory/source-scene.mjs'), sceneSource = readFileSync(sceneFile, 'utf8');
assert.equal(digest(sceneSource), '3ee12ce238c35780adbc43a2922dd92ba484b1a8e2f78fca45f63fc1a0d3656e');
const sceneReturn = '  return { sourceProblems, unknownKinds, sharedCityKinds: [...new Set(venues.map(venue => venue.definition.scene.kind).filter(kind => Object.hasOwn(CITY_KINDS, kind)))], places: PLACES.length, uniqueNames: new Set(PLACES.map(place => place.name)).size, venues: venues.length, airportMinimumBoxMarginMetres: margin, triangles: built.triangles, triangleLimit: CITY_TRIANGLE_BUDGET, drawCalls, drawCallLimit: CITY_DRAW_CALLS.value };';
assert.equal(sceneSource.split(sceneReturn).length, 2, 'Expected exact source-scene receipt seam');
const sceneReplacement = `  const triangleMeshes = [];
  built.group.traverse(child => {
    if (!Reflect.get(child, 'isMesh')) return;
    const indexCount = child.geometry.index?.count ?? child.geometry.attributes.position?.count ?? 0;
    const multiplier = Reflect.get(child, 'isInstancedMesh') ? child.count : 1;
    triangleMeshes.push({ name: child.name, visible: child.visible, triangles: indexCount / 3 * multiplier });
  });
  triangleMeshes.sort((a, b) => b.triangles - a.triangles || a.name.localeCompare(b.name));
  return { sourceProblems, unknownKinds, sharedCityKinds: [...new Set(venues.map(venue => venue.definition.scene.kind).filter(kind => Object.hasOwn(CITY_KINDS, kind)))], places: PLACES.length, uniqueNames: new Set(PLACES.map(place => place.name)).size, venues: venues.length, airportMinimumBoxMarginMetres: margin, triangles: built.triangles, triangleLimit: CITY_TRIANGLE_BUDGET, triangleMeshes, drawCalls, drawCallLimit: CITY_DRAW_CALLS.value };`;
const instrumentedScene = sceneSource.replace(sceneReturn, sceneReplacement);
const sceneSyntax = spawnSync(process.execPath, ['--check', '--input-type=module', '-'], { encoding: 'utf8', input: instrumentedScene });
assert.equal(sceneSyntax.status, 0, `Instrumented source-scene is invalid: ${sceneSyntax.stderr}`);
if (!dryRun) writeFileSync(sceneFile, instrumentedScene);
const sceneOutputSha256 = digest(instrumentedScene);
console.log(JSON.stringify({ policySha256: digest(readFileSync(resolve(args[3]))), patchedBatchSha256: digest(patched), sceneOutputSha256, baseBatchSha256: digest(source), dryRun, policy }));
