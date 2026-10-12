import { loadCountryScope, assertCountryFacts } from './country-scope.mjs';
import { insideSandbox } from './paths.mjs';
/** One table, deterministic actual-source selection, private candidate scaffolds only. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { factsForTarget, geometryPolicy } from './inputs.mjs';
import { proposeBounds } from './bootstrap/bounds-policy.mjs';
const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--table') || !args.includes('--out'))
    throw Error('Usage: batch.mjs --table TARGETS_JSON --out NEW_PRIVATE_FOLDER');
const table = JSON.parse(readFileSync(resolve(get('--table')), 'utf8')), out = resolve(get('--out')), home = dirname(fileURLToPath(import.meta.url));
const sandbox = args.includes('--sandbox-root') ? resolve(get('--sandbox-root')) : home;
const layers = ['places', 'extras', 'water', 'landuse', 'roads'];
const PINNED_GEOMETRY_SOURCE_SHA = '7a57e756a10b35a0eec9ec5928f083580fb9e7a9';
const PINNED_GEOMETRY_TOOLS_SHA256 = '2d5a2e9cce4856aa26db2526f688602befd2e7e55abc5e25efdc1c5594350641';
const PINNED_GEOMETRY_FUNCTIONS = [
    'export const OUTLINE_MARGIN = 0.05;',
    'export const reachFor = (box: Box): number => Math.min(0.6, Math.max(0.4, 1.5 * Math.max(box[2] - box[0], box[3] - box[1]) + 0.2));',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const equal = (actual, expected) => {
    try { assert.deepStrictEqual(actual, expected); return true; }
    catch { return false; }
};
async function boundsProof(target, facts, root) {
    const failures = [], checks = {};
    const check = async (name, action) => {
        try {
            const passed = await action(), details = checks[name] ?? {};
            checks[name] = { ...details, status: passed ? 'PASS' : 'FAIL' };
        }
        catch (error) { checks[name] = { ...checks[name], status: 'FAIL', detail: error.message }; }
        if (checks[name].status !== 'PASS') failures.push(name);
    };
    const provenance = target.metadataSources ?? {}, recorded = provenance.bounds ?? {};
    let proposal;
    await check('boundsPolicyPin', () => {
        const actual = hash(readFileSync(join(home, 'bootstrap/bounds-policy.mjs')));
        checks.boundsPolicyPin = { sha256: actual, expectedSha256: provenance.boundsPolicySha256 };
        return actual === provenance.boundsPolicySha256;
    });
    await check('geometrySourcePin', () => {
        checks.geometrySourcePin = { sourceGitSHA: recorded.geometrySourceGitSHA, geometryToolsSha256: recorded.geometryToolsSha256 };
        return recorded.geometrySourceGitSHA === PINNED_GEOMETRY_SOURCE_SHA
            && recorded.geometryToolsSha256 === PINNED_GEOMETRY_TOOLS_SHA256;
    });
    await check('factSources', () => {
        const centre = provenance.centre?.sourceRecord, airport = provenance.airport?.row;
        checks.factSources = {
            centreOsmRef: provenance.centre?.osmRef,
            airportIdent: airport?.ident,
            datasetSha256: provenance.centre?.pbfSha256,
        };
        return Boolean(centre && airport)
            && provenance.centre.pbfSha256 === target.sourceJob?.datasetSha256
            && provenance.pbf?.sha256 === target.sourceJob?.datasetSha256
            && facts.centre.lon === centre.lon && facts.centre.lat === centre.lat
            && facts.airport.lon === Number(airport.longitude_deg)
            && facts.airport.lat === Number(airport.latitude_deg)
            && facts.country.idISOlower.toUpperCase() === airport.iso_country;
    });
    await check('appGeometryFunctions', () => {
        const source = readFileSync(join(root, 'scripts/geo/destination-detail/geometry-tools.ts'), 'utf8');
        const actual = [
            source.match(/export const OUTLINE_MARGIN\s*=\s*[^;]+;/)?.[0],
            source.match(/export const reachFor\s*=\s*\(box: Box\): number => [^;]+;/)?.[0],
        ];
        checks.appGeometryFunctions = { sha256: hash(Buffer.from(actual.filter(Boolean).join('\n'))) };
        return equal(actual, PINNED_GEOMETRY_FUNCTIONS);
    });
    await check('derivedBounds', async () => {
        const geometry = await import(pathToFileURL(join(root, 'scripts/geo/destination-detail/geometry-tools.ts')).href);
        proposal = proposeBounds(facts, {}, geometry);
        checks.derivedBounds = { ...checks.derivedBounds, policy: proposal.policy, boxes: proposal.boxes, airportMarginMetres: proposal.airportMarginMetres };
        return equal(recorded.policy, proposal.policy)
            && equal(recorded.boxes, proposal.boxes)
            && equal(facts.bounds, [proposal.boxes.play[1], proposal.boxes.play[0], proposal.boxes.play[3], proposal.boxes.play[2]]);
    });
    const extracts = {};
    if (!proposal) {
        await check('extracts', () => { throw Error('derived bounds are unavailable'); });
    } else {
        let placesSource;
        try { placesSource = JSON.parse(readFileSync(join(target.extractDirectory, 'places.json'), 'utf8')).source; }
        catch (error) { checks.extracts = { status: 'FAIL', detail: error.message }; failures.push('extracts'); }
        if (placesSource) {
            const coast = Array.isArray(provenance.coastlineRefsWithinWide) && provenance.coastlineRefsWithinWide.length > 0;
            const expectedRecipe = coast
                ? { kind: 'coast', wideWater: true, sea: { kind: 'coast', bandMetres: 40000 } }
                : { kind: 'inland', wideWater: false };
            const expectedBoxes = { ...proposal.boxes, water: coast ? proposal.boxes.wide : proposal.boxes.play };
            for (const layer of layers) {
                await check(`extract:${layer}`, () => {
                    const path = join(target.extractDirectory, layer + '.json'), bytes = readFileSync(path), data = JSON.parse(bytes), source = data.source;
                    const sha256 = hash(bytes), selectionBounds = layer === 'places' || layer === 'extras' ? proposal.boxes.play
                        : layer === 'water' ? expectedBoxes.water : layer === 'landuse' ? proposal.boxes.outline
                            : { major: proposal.boxes.play, namedSecondary: proposal.boxes.core };
                    const result = {
                        sha256,
                        tableSha256: target.extractSha256?.[layer],
                        producerSha256: target.sourceJob?.extractSha256?.[layer],
                        datasetSha256: source.datasetSha256,
                        pbfHeaderTimestamp: source.pbfHeaderTimestamp,
                        adapterSha256: source.adapterSha256,
                        sourceBoxesMatch: equal(source.boxes, expectedBoxes),
                        selectionBoundsMatch: equal(source.selectionBounds, selectionBounds),
                        waterRecipeMatch: equal(source.waterRecipe, expectedRecipe),
                    };
                    extracts[layer] = result;
                    return sha256 === target.extractSha256?.[layer]
                        && sha256 === target.sourceJob?.extractSha256?.[layer]
                        && source.cityId === target.id
                        && source.datasetSha256 === target.sourceJob?.datasetSha256
                        && source.datasetSha256 === provenance.pbf?.sha256
                        && source.datasetUrl === provenance.pbf?.url
                        && source.pbfHeaderTimestamp === provenance.pbf?.headerTimestamp
                        && source.adapterSha256 === target.sourceJob?.adapterSha256
                        && source.adapterSha256 === provenance.adapterSha256
                        && result.sourceBoxesMatch && result.selectionBoundsMatch && result.waterRecipeMatch;
                });
            }
        }
    }
    checks.extracts = { ...(checks.extracts ?? {}), layers: extracts };
    return { status: failures.length ? 'HOLD' : 'PASS', checks, failures };
}
insideSandbox(out, sandbox);
if (existsSync(out))
    throw Error('Use a new folder beneath factory sandbox');
mkdirSync(out);
const rows = [], contacts = [];
for (const target of table.targets) {
    const row = { id: target.id, status: 'MACHINEHOLD', errors: [], metadataReviewRequired: true, metadataSources: target.metadataSources ?? null };
    rows.push(row);
    try {
        const root = resolve(table.root), load = file => import(pathToFileURL(join(root, file)).href);
        const prior = await factsForTarget(table, target), old = geometryPolicy(table, target);
        row.boundsProof = await boundsProof(target, prior, root);
        row.bounds = row.boundsProof.status === 'PASS' ? 'derived bounds match pinned same-source extracts' : 'bounds proof failed';
        if (row.boundsProof.status !== 'PASS') row.errors.push(`bounds proof failed: ${row.boundsProof.failures.join(', ')}`);
        const raw = JSON.parse(readFileSync(join(target.extractDirectory, 'places.json'))), boxes = raw.source.boxes;
        const { loadPbfExtract } = await load('scripts/geo/destination-detail/pbf-extract.ts'), { inBox, inRing, areaRings, polygonsOf, ringArea } = await load('scripts/geo/destination-detail/geometry-tools.ts'), { waterLabelPoint } = await load('scripts/geo/destination-detail/water-label.ts');
        const ex = loadPbfExtract(target.extractDirectory, target.id, boxes), { buildDestinationContent } = await load('src/game/cities/africa/contentBuilder.ts'), { destinationVenueIds } = await load('src/game/cities/africa/types.ts');
        for (const [layer, answer] of Object.entries(ex.answers))
            if (target.extractSha256?.[layer] !== answer.sha256)
                throw Error(`Pinned table ${layer} hash mismatch`);
        const countryScope = loadCountryScope(root, target.countryScope ?? table.countryScope, prior.country.idISOlower, ex.source.datasetSha256);
        assertCountryFacts(countryScope, prior);
        row.countryScope = countryScope.receipt;
        row.countrySourceAcceptance = 'OSM_BOUNDARY_POLICY_ONLY; source-semantic review remains required';
        const [s, w, n, e] = boxes.play, facts = { ...prior, centre: prior.centre, bounds: [w, s, e, n], sourceUrl: ex.source.datasetUrl }, base = buildDestinationContent(facts, []), ids = destinationVenueIds(target.id, facts.airport.id);
        const point = el => el.type === 'node' ? [el.lon, el.lat] : [el.center.lon, el.center.lat], name = el => (el.tags?.['name:en'] ?? el.tags?.['name:fr'] ?? el.tags?.name ?? '').replace(/\s+/g, ' ').trim(), normal = x => x.normalize('NFKC').toLowerCase(), ref = el => `${el.type}/${el.id}`;
        const unique = new Map([...ex.answers.places.elements, ...ex.answers.extras.elements].map(el => [ref(el), el]));
        const closedWater = ex.answers.water.elements.filter(el => el.tags.natural === 'water' || el.tags.waterway === 'riverbank').flatMap(el => polygonsOf(areaRings(el), boxes.wide, Math.max(old.waterTolerance, .0008))).filter(p => ringArea(p[0]) * 111.32 * Math.cos(p[0][0][1] * Math.PI / 180) * 110.57 >= (old.minWaterKm2 ?? .4));
        const onWater = p => closedWater.some(poly => inRing(p, poly[0]) && !poly.slice(1).some(hole => inRing(p, hole)));
        row.countryRejected = [...unique.values()].filter(el => countryScope.classify(point(el)) !== 'inside').map(el => ({ ref: ref(el), point: point(el), classification: countryScope.classify(point(el)) }));
        const pool = [...unique.values()].filter(el => countryScope.classify(point(el)) === 'inside' && name(el) && inBox([s + .008, w + .008, n - .008, e - .008], point(el)) && !onWater(point(el)));
        const slots = { transit: t => t.railway === 'station' || t.amenity === 'bus_station' || t.public_transport === 'station', meal: t => ['restaurant', 'cafe'].includes(t.amenity), community: t => ['university', 'college', 'library', 'community_centre', 'conference_centre'].includes(t.amenity), clinic: t => ['hospital', 'clinic'].includes(t.amenity), recreation: t => t.leisure === 'park', market: t => t.amenity === 'marketplace' || t.shop === 'mall', worship: t => t.amenity === 'place_of_worship', polling: t => t.place === 'square' || t.amenity === 'townhall', government: t => ['townhall', 'courthouse', 'parliament'].includes(t.amenity) || t.office === 'government' || t.building === 'government' };
        const used = new Set(), usedNames = new Set(), choices = [], selected = [];
        const score = el => { const p = point(el), spread = selected.length ? Math.min(...selected.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))) : 0; return (el.tags.wikidata ? 20 : 0) + (el.tags.wikipedia ? 5 : 0) + Math.min(10, spread * 100); };
        const rank = items => items.filter(el => !used.has(ref(el)) && !usedNames.has(normal(name(el)))).sort((a, b) => score(b) - score(a) || ref(a).localeCompare(ref(b), 'en', { numeric: true }));
        const choose = (el, choice) => { used.add(ref(el)); usedNames.add(normal(name(el))); selected.push(point(el)); choices.push({ ...choice, ref: ref(el), line: choice.slot === 'polling' ? `${name(el)}; voting here is a fictional game activity.` : `${name(el)}, a mapped place for the game.` }); };
        for (const [slot, predicate] of Object.entries(slots)) {
            const el = rank(pool.filter(el => predicate(el.tags)))[0];
            if (!el) {
                row.errors.push(`no eligible unique source for ${slot}`);
                continue;
            }
            const venue = base.venues.find(v => v.id === ids[slot]);
            choose(el, { slot, kind: venue.kind, category: venue.category, icon: venue.icon });
        }
        const addedKind = tags => {
            if (['university', 'college'].includes(tags.amenity)) return 'quad';
            if (tags.amenity === 'place_of_worship') return 'worship';
            if (tags.leisure === 'park') return 'park';
            if (['restaurant', 'cafe'].includes(tags.amenity)) return 'buka';
            if (['hospital', 'clinic'].includes(tags.amenity)) return 'hospital';
            if (tags.amenity === 'marketplace' || tags.shop === 'mall') return 'market';
            if (tags.leisure === 'stadium' || tags.tourism === 'viewpoint') return 'viewing';
            if (tags.tourism || tags.historic) return 'walk';
            return null;
        };
        const add = element => {
            const kind = addedKind(element.tags);
            choose(element, {
                key: `osm-${element.type}-${element.id}`, kind,
                category: kind === 'buka' ? 'food' : kind === 'hospital' ? 'care' : ['market', 'quad'].includes(kind) ? 'work' : 'fun',
                icon: kind === 'buka' ? 'food' : kind === 'hospital' ? 'health' : kind === 'market' ? 'market' : kind === 'park' ? 'park' : kind === 'quad' ? 'school' : kind === 'viewing' ? 'view' : 'walk',
            });
        };
        const semanticKinds = [...new Set(pool.map(element => addedKind(element.tags)).filter(Boolean))].sort();
        const maximumPerKind = 3;
        row.eligibleKindCounts = Object.fromEntries(semanticKinds.map(kind => [kind, new Set(pool.filter(element => addedKind(element.tags) === kind).map(element => normal(name(element)))).size]));
        row.semanticPolicy = { maximumPerKind, targetPlaces: 24, minimumPlaces: 20 };
        const unavailableSemanticKinds = [];
        for (const kind of semanticKinds) {
            if (choices.some(choice => choice.kind === kind)) continue;
            const element = rank(pool.filter(element => addedKind(element.tags) === kind))[0];
            if (element) add(element);
            else unavailableSemanticKinds.push(kind);
        }
        while (choices.length < 24) {
            const element = rank(pool.filter(element => {
                const kind = addedKind(element.tags);
                return kind && choices.filter(choice => choice.kind === kind).length < maximumPerKind;
            }))[0];
            if (!element) break;
            add(element);
        }
        row.semanticCoverage = semanticKinds.map(kind => ({ kind, refs: choices.filter(choice => choice.kind === kind).map(choice => choice.ref) }));
        row.unavailableSemanticKinds = unavailableSemanticKinds;
        if (choices.length < 20)
            row.errors.push(`only ${choices.length} eligible unique named venues`);
        const names = pool.filter(el => el.type === 'node' && ['suburb', 'neighbourhood', 'quarter'].includes(el.tags.place)).sort((a, b) => (b.tags.wikidata ? 1 : 0) - (a.tags.wikidata ? 1 : 0) || ref(a).localeCompare(ref(b))).filter((el, i, all) => all.findIndex(x => normal(name(x)) === normal(name(el))) === i).slice(0, 18).map(el => ({ id: `district-${el.id}`, ref: ref(el), kind: 'neighbourhood' }));
        const waterElements = ex.answers.water.elements, coast = waterElements.some(el => el.tags.natural === 'coastline');
        let policy = { kind: coast ? 'coast' : 'inland' };
        if (!coast && raw.source.waterRecipe?.kind === 'lake') {
            const lake = waterElements.find(el => el.tags.natural === 'water' && el.tags.water === 'lake' && name(el));
            if (!lake)
                row.errors.push('lake shore extract needs a source-backed exact lake query name');
            else
                policy = { kind: 'lake', lakeName: name(lake) };
        }
        for (const el of waterElements.filter(el => name(el) && (el.tags.natural === 'water' || el.tags.waterway === 'riverbank')).sort((a, b) => ref(a).localeCompare(ref(b)))) {
            try {
                const polys = polygonsOf(areaRings(el), boxes.wide, Math.max(old.waterTolerance, .0008)).filter(p => ringArea(p[0]) * 111.32 * Math.cos(p[0][0][1] * Math.PI / 180) * 110.57 >= (old.minWaterKm2 ?? .4));
                const p = waterLabelPoint(el, polys, polys, boxes.play);
                if (inBox(boxes.play, p) && !names.some(n => n.ref === ref(el)))
                    names.push({ id: `water-${el.type}-${el.id}`, ref: ref(el), kind: 'water' });
            }
            catch { }
        }
        const config = { ...old, name: target.name, box: boxes.play, core: boxes.core, places: choices, names };
        for (const key of ['discovery', 'water', 'landuse', 'roads', 'sea', 'wideWater'])
            delete config[key];
        if (policy.kind !== 'inland') {
            config.wideWater = true;
            config.sea = { kind: policy.kind, bandMetres: raw.source.waterRecipe?.sea?.bandMetres ?? 40000 };
        }
        facts.names = { ...facts.names, area: target.name, roadHub: name(unique.get(choices.find(p => p.slot === 'transit')?.ref) ?? { tags: {} }) };
        const manifest = { root, facts, config, countryScope: countryScope.policy, countryScopeReceipt: countryScope.receipt, queryPolicy: policy, extract: { directory: target.extractDirectory, sha256: Object.fromEntries(Object.entries(ex.answers).map(([key, v]) => [key, v.sha256])) } };
        const manifestPath = join(out, `${target.id}-manifest.json`);
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
        row.manifest = manifestPath;
        row.venues = choices.length;
        row.labels = names.length;
        row.queryPolicy = policy;
        if (!row.errors.length) {
            const child = spawnSync(process.execPath, ['--experimental-strip-types', join(home, 'scaffold.mjs'), '--manifest', manifestPath, '--out', join(out, `${target.id}-stage`), '--sandbox-root', sandbox], { encoding: 'utf8' });
            let report;
            try {
                report = JSON.parse(child.stdout);
            }
            catch {
                throw Error(child.stderr || 'scaffold returned no JSON');
            }
            writeFileSync(join(out, `${target.id}-result.json`), JSON.stringify(report, null, 2));
            row.errors.push(...report.errors);
            row.sourceRoadUpperBound = report.sourceRoadUpperBound;
            row.postClipRoadCount = null;
            if (child.status === 0)
                row.status = 'PRIVATE_SCAFFOLD_ONLY';
        }
        contacts.push({ id: target.id, status: row.status, manifest: manifestPath, preview: null, needs: 'offline geometry generation, actual rendered PNG, district/scene/map/journey checks, browser acceptance' });
    }
    catch (error) {
        row.errors.push(error.message);
    }
}
writeFileSync(join(out, 'check-table.json'), JSON.stringify(rows, null, 2));
writeFileSync(join(out, 'contact-sheet-inputs.json'), JSON.stringify(contacts, null, 2));
console.log(JSON.stringify(rows, null, 2));
