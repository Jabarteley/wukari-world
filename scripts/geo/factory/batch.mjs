import { slotPresentation, destinationNames } from './destination-contract.mjs';
import { loadCountryScope, assertCountryFacts } from './country-scope.mjs';
import { insideSandbox } from './paths.mjs';
/** One table, deterministic actual-source selection, private candidate scaffolds only. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { factsForTarget, geometryPolicy } from './inputs.mjs';
import { fillSlots } from './slot-fallback.mjs';
import { fitCatalogueBudget, CATALOGUE_LIMIT } from './catalogue-budget.mjs';
import { districtLabels } from './district-labels.mjs';
import { profileFor, emptySlotReason } from './profile.mjs';

// Less coastline than this in the wide box is not a sea shore (mis-tagged creek or pond rings).
const MINIMUM_COASTLINE_METRES = 3000;
const args = process.argv.slice(2), get = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--table') || !args.includes('--out'))
    throw Error('Usage: batch.mjs --table TARGETS_JSON --out NEW_PRIVATE_FOLDER');
const table = JSON.parse(readFileSync(resolve(get('--table')), 'utf8')), out = resolve(get('--out')), home = dirname(fileURLToPath(import.meta.url));
const sandbox = args.includes('--sandbox-root') ? resolve(get('--sandbox-root')) : home;
insideSandbox(out, sandbox);
if (existsSync(out))
    throw Error('Use a new folder beneath factory sandbox');
mkdirSync(out);
const selectionExclusionsFor = target => {
    const exclusions = target.selectionExclusions === undefined ? [] : target.selectionExclusions;
    if (!Array.isArray(exclusions))
        throw new TypeError(`${target.id}: selectionExclusions must be an array`);
    const refs = new Set();
    for (const exclusion of exclusions) {
        if (!exclusion || typeof exclusion !== 'object' || Array.isArray(exclusion) ||
            Object.keys(exclusion).sort().join(',') !== 'reason,ref')
            throw new TypeError(`${target.id}: each selection exclusion must contain only ref and reason`);
        if (typeof exclusion.ref !== 'string' || !/^(node|way|relation)\/[1-9][0-9]*$/.test(exclusion.ref))
            throw new TypeError(`${target.id}: selection exclusion ref must be a canonical OSM element ref`);
        if (refs.has(exclusion.ref))
            throw new TypeError(`${target.id}: duplicate selection exclusion ref ${exclusion.ref}`);
        if (typeof exclusion.reason !== 'string' || !exclusion.reason.trim())
            throw new TypeError(`${target.id}: selection exclusion ${exclusion.ref} requires a non-empty reason`);
        refs.add(exclusion.ref);
    }
    return exclusions;
};
const KNOBS = JSON.parse(readFileSync(join(home, 'bootstrap', 'geometry-knobs.json'), 'utf8'));
// Per-target geometry knobs (seed.geometry, written by bootstrap/table.mjs): only the named keys replace the shared preset value, and the effective values
// are written into the recipe (CONFIG) and the selection row, so the receipt shows exactly what was applied.
const geometryKnobsFor = target => {
    if (target.geometry === undefined) return {};
    if (!target.geometry || typeof target.geometry !== 'object' || Array.isArray(target.geometry) || !Object.keys(target.geometry).length)
        throw new TypeError(`${target.id}: geometry must be a non-empty object`);
    for (const [key, value] of Object.entries(target.geometry)) {
        const spec = KNOBS.geometry[key];
        if (!spec) throw new TypeError(`${target.id}: unsupported geometry knob ${key}`);
        if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max || (spec.integer && !Number.isInteger(value)))
            throw new TypeError(`${target.id}: geometry.${key} must be a${spec.integer ? 'n integer' : ' number'} from ${spec.min} to ${spec.max}`);
    }
    return target.geometry;
};
const rows = [], contacts = [];
for (const target of table.targets) {
    const row = { id: target.id, status: 'MACHINEHOLD', errors: [], metadataReviewRequired: true, metadataSources: target.metadataSources ?? null };
    rows.push(row);
    try {
        const root = resolve(table.root), load = file => import(pathToFileURL(join(root, file)).href);
        const selectionExclusions = selectionExclusionsFor(target);
        row.selectionExclusions = selectionExclusions;
        const geometryKnobs = geometryKnobsFor(target);
        if (Object.keys(geometryKnobs).length) row.geometryKnobs = geometryKnobs;
        if (target.namesUnit !== undefined && (typeof target.namesUnit !== 'string' || !target.namesUnit.trim()))
            throw new TypeError(`${target.id}: namesUnit must be a non-empty string`);
        if (target.sceneWaterExtent !== undefined && !['play', 'reach'].includes(target.sceneWaterExtent))
            throw new TypeError(`${target.id}: sceneWaterExtent must be 'play' or 'reach'`);
        // `profile` (seed field, table-level data) sets the minimums and whether a slot may stay empty; absent means standard. See profile.mjs.
        const profile = profileFor(target.profile);
        if (target.profile !== undefined) row.profile = target.profile;
        const fitted = fitCatalogueBudget(await factsForTarget(table, target)), prior = fitted.facts, old = geometryPolicy(table, target);
        row.catalogueBytes = fitted.bytes;
        if (fitted.compacted) row.catalogueCompaction = fitted.compacted;
        if (fitted.bytes > CATALOGUE_LIMIT)
            (row.warnings ??= []).push(`catalogue row would add ${fitted.bytes} raw bytes; the app baseline limit is ${CATALOGUE_LIMIT} (scripts/city/build-catalogue.ts): needs an app change or a shorter city id`);
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
        for (const exclusion of selectionExclusions)
            if (!unique.has(exclusion.ref))
                throw new Error(`${target.id}: requested selection exclusion ${exclusion.ref} is absent from the source candidate set`);
        const excludedRefs = new Set(selectionExclusions.map(exclusion => exclusion.ref));
        const pool = [...unique.values()].filter(el => !excludedRefs.has(ref(el)) && countryScope.classify(point(el)) === 'inside' && name(el) && inBox([s + .008, w + .008, n - .008, e - .008], point(el)) && !onWater(point(el)));
        const slots = { transit: t => t.railway === 'station' || t.amenity === 'bus_station' || t.public_transport === 'station', meal: t => ['restaurant', 'cafe'].includes(t.amenity), community: t => ['university', 'college', 'library', 'community_centre', 'conference_centre'].includes(t.amenity), clinic: t => ['hospital', 'clinic'].includes(t.amenity), recreation: t => t.leisure === 'park', market: t => t.amenity === 'marketplace' || t.shop === 'mall', worship: t => t.amenity === 'place_of_worship', polling: t => t.place === 'square' || t.amenity === 'townhall', government: t => ['townhall', 'courthouse', 'parliament'].includes(t.amenity) || t.office === 'government' || t.building === 'government' };
        const used = new Set(), usedNames = new Set(), choices = [], selected = [], emptySlots = [];
        const score = el => { const p = point(el), spread = selected.length ? Math.min(...selected.map(q => Math.hypot(p[0] - q[0], p[1] - q[1]))) : 0; return (el.tags.wikidata ? 20 : 0) + (el.tags.wikipedia ? 5 : 0) + Math.min(10, spread * 100); };
        const rank = items => items.filter(el => !used.has(ref(el)) && !usedNames.has(normal(name(el)))).sort((a, b) => score(b) - score(a) || ref(a).localeCompare(ref(b), 'en', { numeric: true }));
        const choose = (el, choice) => { used.add(ref(el)); usedNames.add(normal(name(el))); selected.push(point(el)); choices.push({ ...choice, ref: ref(el), line: choice.slot === 'polling' ? `${name(el)}; voting here is a fictional game activity.` : `${name(el)}, a mapped place for the game.` }); };
        const filled = fillSlots({ slots, pool, rank, ref, allowEmpty: profile.maximumEmptySlots > 0, emptyReason: emptySlotReason, take: (slot, el, slotFallback) => {
            if (slotFallback) (row.slotFallbacks ??= []).push(slotFallback);
            choose(el, { slot, ...slotPresentation(base, ids, slot), ...(slotFallback ? { slotFallback } : {}) });
        } });
        // Only a profile that allows empty slots (microstate) may leave one: the game's fictional venue stays and the reason is recorded.
        emptySlots.push(...filled.empty);
        for (const slot of filled.missing) row.errors.push(`no eligible unique source for ${slot}`);
        if (emptySlots.length) {
            row.emptySlots = emptySlots;
            if (emptySlots.length > profile.maximumEmptySlots)
                row.errors.push(`${emptySlots.length} slots have no eligible source (${emptySlots.map(item => item.slot).join(', ')}); the ${profile.name} profile allows ${profile.maximumEmptySlots}`);
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
        const maximumPerKind = 3, relaxedCaps = [5, 6, 7, 8];
        row.eligibleKindCounts = Object.fromEntries(semanticKinds.map(kind => [kind, new Set(pool.filter(element => addedKind(element.tags) === kind).map(element => normal(name(element)))).size]));
        row.semanticPolicy = { maximumPerKind, targetPlaces: 24, minimumPlaces: profile.minimumPlaces };
        const unavailableSemanticKinds = [];
        for (const kind of semanticKinds) {
            if (choices.some(choice => choice.kind === kind)) continue;
            const element = rank(pool.filter(element => addedKind(element.tags) === kind))[0];
            if (element) add(element);
            else unavailableSemanticKinds.push(kind);
        }
        const fill = cap => {
            while (choices.length < 24) {
                const element = rank(pool.filter(element => {
                    const kind = addedKind(element.tags);
                    return kind && choices.filter(choice => choice.kind === kind).length < cap;
                }))[0];
                if (!element) break;
                add(element);
            }
        };
        fill(maximumPerKind);
        // Only when the cap leaves fewer than the venues the acceptance contract needs (PLACES.length >= the profile minimum, 20 unless a profile says otherwise; nothing there limits a kind).
        // One step at a time (5, 6, 7, 8 per kind), stopping at the first cap that reaches 20, so the smallest sufficient relaxation is used.
        for (const cap of relaxedCaps) {
            if (choices.length >= profile.minimumPlaces) break;
            fill(cap);
            row.semanticPolicy.relaxedMaximumPerKind = cap;
        }
        row.semanticCoverage = semanticKinds.map(kind => ({ kind, refs: choices.filter(choice => choice.kind === kind).map(choice => choice.ref) }));
        row.unavailableSemanticKinds = unavailableSemanticKinds;
        if (choices.length < profile.minimumPlaces)
            row.errors.push(`only ${choices.length} eligible unique named venues (the ${profile.name} profile needs ${profile.minimumPlaces})`);
        const districts = districtLabels({ pool, name, ref, normal, centre: facts.centre, minimumLabels: profile.minimumNeighbourhoodLabels, islandPlaces: profile.districtIslandPlaces }), names = [...districts.labels];
        row.districtLabelPlaceTags = districts.placeTags;
        if (districts.areaRefs.length) row.districtLabelAreaRefs = districts.areaRefs;
        if (districts.fallback) row.districtLabelFallback = 'fewer than the minimum suburb|neighbourhood|quarter nodes: village|hamlet|locality|subdivision nodes appended' + (profile.districtIslandPlaces?.length ? '; then named island|islet places (profile ' + profile.name + ')' : '') + (districts.areaRefs.length ? `; still short of five nodes, so place areas at their centre points: ${districts.areaRefs.join(', ')}` : '');
        // A coast is a shore a city can stand beside, not one mis-tagged ring: Asuncion's extract holds a single closed natural=coastline way of 976 m (the creek
        // "Zanja Soro" in landlocked Paraguay), which made the recipe a sea city and sent every dry place to the wrong side of the exact-coast stage.
        const coastlineMetres = el => (el.geometry ?? []).slice(1).reduce((sum, p, i) => sum + Math.hypot((p.lon - el.geometry[i].lon) * 111320 * Math.cos(p.lat * Math.PI / 180), (p.lat - el.geometry[i].lat) * 111320), 0);
        const waterElements = ex.answers.water.elements, coast = waterElements.filter(el => el.tags.natural === 'coastline').reduce((sum, el) => sum + coastlineMetres(el), 0) >= MINIMUM_COASTLINE_METRES;
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
        // The generated map test (acceptance.mjs) demands five source-backed neighbourhood labels; fail at selection with the exact count instead of after generation.
        const neighbourhoodLabels = names.filter(label => label.kind === 'neighbourhood').length;
        row.neighbourhoodLabels = neighbourhoodLabels;
        if (neighbourhoodLabels < profile.minimumNeighbourhoodLabels)
            row.errors.push(`only ${neighbourhoodLabels} source-backed neighbourhood labels (place=suburb|neighbourhood|quarter nodes, then village|hamlet|locality|subdivision nodes, then the same tags as way/relation areas at their centre, inside the eligible pool); ${profile.minimumNeighbourhoodLabels} are required`);
        const { seaBandMetres, ...recipeKnobs } = geometryKnobs;
        const config = { ...old, ...recipeKnobs, name: target.name, box: boxes.play, core: boxes.core, places: choices, names,
            ...(target.sceneWaterExtent === undefined ? {} : { sceneWaterExtent: target.sceneWaterExtent }),
            ...(target.profile === undefined ? {} : { profile: target.profile, emptySlots }) };
        for (const key of ['discovery', 'water', 'landuse', 'roads', 'sea', 'wideWater'])
            delete config[key];
        if (policy.kind !== 'inland') {
            config.wideWater = true;
            config.sea = { kind: policy.kind, bandMetres: seaBandMetres ?? raw.source.waterRecipe?.sea?.bandMetres ?? 40000 };
        }
        // An empty transit slot keeps the game's own transit venue, so the road hub carries that venue's fictional name.
        const genericTransitName = base.venues.find(venue => venue.id === ids.transit)?.name;
        facts.names = destinationNames(facts, target.name, choices.some(p => p.slot === 'transit') ? name(unique.get(choices.find(p => p.slot === 'transit').ref)) : genericTransitName);
        if (target.namesUnit !== undefined) facts.names = { ...facts.names, unit: target.namesUnit };
        const manifest = { root, facts, config, countryScope: countryScope.policy, countryScopeReceipt: countryScope.receipt, queryPolicy: policy, extract: { directory: target.extractDirectory, sha256: Object.fromEntries(Object.entries(ex.answers).map(([key, v]) => [key, v.sha256])) } };
        const manifestPath = join(out, `${target.id}-manifest.json`);
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), { flag: 'wx' });
        row.manifest = manifestPath;
        row.venues = choices.length;
        row.labels = names.length;
        row.queryPolicy = policy;
        row.bounds = 'pinned extract; auto-bounds/re-extraction pending';
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
