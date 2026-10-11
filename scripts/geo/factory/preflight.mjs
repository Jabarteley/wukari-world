/** Read-only dry-run: node --experimental-strip-types preflight.mjs ROOT CITY EXTRACT_DIR */
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
export async function preflight(rootArg, city, extractArg, suppliedConfig, suppliedFacts, inventory = true) {
    if (!rootArg || !extractArg || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city ?? ''))
        throw Error('Usage: preflight.mjs ROOT CITY EXTRACT_DIR');
    const root = resolve(rootArg), load = file => import(pathToFileURL(join(root, file)).href);
    const c = suppliedConfig ?? (await load(`scripts/geo/destination-detail/${city}.ts`)).CONFIG;
    const f = suppliedFacts ?? (await load(`src/game/cities/${city}/facts.ts`)).FACTS;
    const { destinationVenueIds, validateDestinationFacts } = await load('src/game/cities/africa/types.ts');
    const { buildDestinationContent } = await load('src/game/cities/africa/contentBuilder.ts');
    const { loadPbfExtract } = await load('scripts/geo/destination-detail/pbf-extract.ts');
    const { OUTLINE_MARGIN, reachFor, inBox, areaRings, polygonsOf, ringArea, simplify } = await load('scripts/geo/destination-detail/geometry-tools.ts');
    const { waterLabelPoint } = await load('scripts/geo/destination-detail/water-label.ts');
    validateDestinationFacts(f);
    if (typeof c.name !== 'string' || !c.name.trim() || c.name !== f.name) {
        throw Error('Recipe name must match the source-backed facts name; district fallback cannot be empty');
    }
    const [s, w, n, e] = c.box, r = reachFor(c.box);
    const boxes = { play: c.box, core: c.core, outline: [s - OUTLINE_MARGIN, w - OUTLINE_MARGIN, n + OUTLINE_MARGIN, e + OUTLINE_MARGIN], wide: [s - r, w - r, n + r, e + r] };
    const extract = loadPbfExtract(resolve(extractArg), city, boxes);
    const refs = new Map([...extract.answers.places.elements, ...extract.answers.extras.elements].map(el => [`${el.type}/${el.id}`, el]));
    const errors = [], slots = new Set(), keys = new Set(), names = new Set(), selected = new Set();
    const point = el => el.type === 'node' ? [el.lon, el.lat] : [el.center.lon, el.center.lat];
    const normalize = name => name.normalize('NFKC').replace(/\s+/gu, ' ').trim().toLocaleLowerCase('en');
    const base = buildDestinationContent(f, []), ids = destinationVenueIds(city, f.airport.id);
    const places = c.places.flatMap(p => {
        const el = refs.get(p.ref);
        if (!el) {
            errors.push(`missing source ${p.ref}`);
            return [];
        }
        const original = (el.tags?.['name:en'] ?? el.tags?.['name:fr'] ?? el.tags?.name ?? '').replace(/\s+/g, ' ').trim();
        const name = p.label ?? original, [lon, lat] = point(el);
        if (!original || !name || (p.label && !original.includes(p.label)))
            errors.push(`${p.ref}: name/label not source-backed`);
        const normalized = normalize(name);
        if (names.has(normalized))
            errors.push(`duplicate normalized name ${name}`);
        names.add(normalized);
        if (selected.has(p.ref))
            errors.push(`duplicate source ${p.ref}`);
        selected.add(p.ref);
        if (Boolean(p.slot) === Boolean(p.key))
            errors.push(`${p.ref}: exactly one slot or key required`);
        if (p.slot) {
            if (!(p.slot in ids) || slots.has(p.slot))
                errors.push(`invalid/duplicate slot ${p.slot}`);
            slots.add(p.slot);
            const v = base.venues.find(v => v.id === ids[p.slot]);
            if (v?.kind !== p.kind)
                errors.push(`${p.slot}: expected kind ${v?.kind}, got ${p.kind}`);
        }
        if (p.key) {
            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.key) || keys.has(p.key))
                errors.push(`invalid/duplicate key ${p.key}`);
            keys.add(p.key);
        }
        if (!inBox([s + .008, w + .008, n - .008, e - .008], [lon, lat]))
            errors.push(`${p.ref}: fails .008-degree venue guard (atEdge needs separate review)`);
        return [{ ...p, name, lon, lat, district: c.name, osm: p.ref, accuracy: el.type === 'node' ? 'mapped-feature' : 'feature-centroid' }];
    });
    for (const slot of Object.keys(ids).filter(s => s !== 'airport'))
        if (!slots.has(slot))
            errors.push(`missing fixed slot ${slot}`);
    if (places.length < 20)
        errors.push(`only ${places.length} sourced venues`);
    const transit = places.find(p => p.slot === 'transit');
    if (f.names?.roadHub !== transit?.name)
        errors.push('roadHub differs from actual transit display name');
    const marginKm = Math.min((f.airport.lon - w) * 111.32 * Math.cos(f.airport.lat * Math.PI / 180), (e - f.airport.lon) * 111.32 * Math.cos(f.airport.lat * Math.PI / 180), (f.airport.lat - s) * 110.57, (n - f.airport.lat) * 110.57);
    if (marginKm < .9)
        errors.push(`airport clearance ${marginKm.toFixed(3)} km below .9`);
    if (JSON.stringify(f.bounds) !== JSON.stringify([w, s, e, n]))
        errors.push('facts and recipe bounds differ');
    if (!inBox(c.box, [f.centre.lon, f.centre.lat]))
        errors.push('centre outside play box');
    try {
        const content = buildDestinationContent(f, places), seen = new Set();
        for (const v of content.venues) {
            if (seen.has(v.id))
                errors.push(`duplicate final venue id ${v.id}`);
            seen.add(v.id);
        }
    }
    catch (error) {
        errors.push(error.message);
    }
    const water = new Map(extract.answers.water.elements.map(el => [`${el.type}/${el.id}`, el])), waterLabels = [];
    for (const pick of c.names.filter(p => p.kind === 'water')) {
        const el = water.get(pick.ref), polys = el ? polygonsOf(areaRings(el), boxes.wide, Math.max(c.waterTolerance, .0008)) : [];
        const kept = polys.filter(p => ringArea(p[0]) * 111.32 * Math.cos(p[0][0][1] * Math.PI / 180) * 110.57 >= (c.minWaterKm2 ?? .4));
        try {
            const labelPoint = waterLabelPoint(el, kept, kept);
            if (!inBox(c.box, labelPoint))
                errors.push(`${pick.ref}: water label outside play box`);
        }
        catch (error) {
            errors.push(`${pick.ref}: ${error.message}`);
        }
        waterLabels.push({ ref: pick.ref, retained: kept.length });
    }
    const paths = [`scripts/geo/destination-detail/${city}.ts`, ...['facts', 'index', 'content', 'map', 'places', 'geometry', 'terrain'].map(name => `src/game/cities/${city}/${name}.ts`)];
    const plan = inventory ? paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(join(root, path))).digest('hex'), owner: ['places', 'geometry', 'terrain'].some(name => path.endsWith(`/${name}.ts`)) ? 'existing offline generator' : 'scaffold' })) : [];
    const length = line => line.slice(1).reduce((sum, p, i) => sum + Math.hypot((p[0] - line[i][0]) * 111.32 * Math.cos(p[1] * Math.PI / 180), (p[1] - line[i][1]) * 110.57), 0);
    const roads = extract.answers.roads.elements.filter(el => el.type === 'way' && el.geometry && el.tags?.highway);
    const sourceRoadUpperBound = roads.filter(el => ['motorway', 'trunk'].includes(el.tags.highway) || length(simplify(el.geometry.map(p => [p.lon, p.lat]), inBox(c.core, [el.geometry[0].lon, el.geometry[0].lat]) ? c.coreTolerance : c.farTolerance)) >= c.minRoadKm).length;
    return { city, status: errors.length ? 'blocked' : 'local-preflight-only', source: extract.source, extractHashes: Object.fromEntries(Object.entries(extract.answers).map(([k, v]) => [k, v.sha256])), venues: places.length, airportMarginKm: marginKm, waterLabels, sourceRoadUpperBound, postClipRoadCount: null, eightFilePlan: plan, errors, remaining: ['source metadata review', 'outline generation and rendered district/scene checks', 'shared integration', 'browser acceptance'] };
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
    const report = await preflight(...process.argv.slice(2));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.errors.length ? 1 : 0;
}
