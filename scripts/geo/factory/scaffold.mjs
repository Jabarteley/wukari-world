import { slotPresentation, destinationNames, assertDestinationOutput } from './destination-contract.mjs';
import assert from 'node:assert/strict';
import { insideSandbox } from './paths.mjs';
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { preflight } from './preflight.mjs';
const args = process.argv.slice(2), value = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--manifest') || !args.includes('--out'))
    throw Error('Usage: scaffold.mjs --manifest JSON --out NEW_PRIVATE_STAGE');
const m = JSON.parse(readFileSync(resolve(value('--manifest')), 'utf8')), root = resolve(m.root), out = resolve(value('--out'));
const privateRoot = args.includes('--sandbox-root') ? resolve(value('--sandbox-root')) : dirname(fileURLToPath(import.meta.url));
insideSandbox(out, privateRoot);
if (existsSync(out))
    throw Error('Output must be a new private folder beneath factory sandbox; never overwrite');
const load = file => import(pathToFileURL(join(root, file)).href), { buildDestinationContent } = await load('src/game/cities/africa/contentBuilder.ts'), { destinationVenueIds } = await load('src/game/cities/africa/types.ts'), q = await load('scripts/geo/destination-detail/queries.ts');
const f = m.facts, config = { ...m.config }, id = f.id, ids = destinationVenueIds(id, f.airport.id), base = buildDestinationContent(f, []);
if (!['coast', 'inland', 'lake'].includes(m.queryPolicy?.kind))
    throw Error('Unknown query policy');
if (m.queryPolicy.kind === 'lake' && (!/^[A-Za-z0-9 -]+$/.test(m.queryPolicy.lakeName ?? '') || !m.queryPolicy.lakeName.trim()))
    throw Error('Lake query needs an exact reviewed name with safe query characters');
config.places = config.places.map(p => p.slot ? { ...p, ...slotPresentation(base, ids, p.slot) } : { ...p });
if (f.names) f.names = destinationNames(f, f.names.area, f.names.roadHub);
const policy = m.queryPolicy.kind, waterName = policy === 'coast' ? 'coastWaterQuery' : policy === 'lake' ? 'lakeWaterQuery' : 'inlandWaterQuery';
if (policy === 'coast' && config.sea?.kind !== 'coast' || policy === 'lake' && config.sea?.kind !== 'lake' || policy === 'inland' && config.sea)
    throw Error('Water query policy must match reviewed sea metadata');
config.discovery = bbox => ({ places: q.placesQuery(bbox), extras: q.extrasQuery(bbox) });
config.landuse = q.landuseQuery;
config.roads = q.roadsQuery;
config.water = policy === 'lake' ? bbox => q.lakeWaterQuery(bbox, m.queryPolicy.lakeName) : q[waterName];
assertDestinationOutput(f, config.places);
const report = await preflight(root, id, m.extract.directory, config, f, false, m.countryScope);
assert.deepEqual(report.countryScope, m.countryScopeReceipt, 'country scope receipt changed since selection');
for (const layer of ['places', 'extras', 'water', 'landuse', 'roads'])
    if (m.extract.sha256?.[layer] !== report.extractHashes[layer])
        report.errors.push(`Pinned ${layer} SHA-256 does not match actual extract`);
if (report.errors.length) {
    report.status = 'blocked';
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
}
else {
    const serial = { ...config };
    for (const key of ['discovery', 'landuse', 'roads', 'water'])
        delete serial[key];
    const recipe = `import type { DetailConfig } from './config.ts'\nimport { placesQuery, extrasQuery, landuseQuery, roadsQuery, ${waterName} } from './queries.ts'\n\nexport const CONFIG = {\n...${JSON.stringify(serial, null, 2)},\ndiscovery: (bbox: string) => ({ places: placesQuery(bbox), extras: extrasQuery(bbox) }),\nlanduse: landuseQuery, roads: roadsQuery,\nwater: ${policy === 'lake' ? `(bbox: string) => lakeWaterQuery(bbox, ${JSON.stringify(m.queryPolicy.lakeName)})` : waterName},\n} satisfies DetailConfig\n`;
    const files = new Map([
        [`scripts/geo/destination-detail/${id}.ts`, recipe],
        [`src/game/cities/${id}/facts.ts`, `import type { DestinationFacts } from '../africa/types.ts'\n\nexport const FACTS = ${JSON.stringify(f, null, 2)} satisfies DestinationFacts\n`],
        [`src/game/cities/${id}/index.ts`, `import { createDestinationModule } from '../africa/module.ts'\nimport { FACTS } from './facts.ts'\nexport const city = createDestinationModule(FACTS, async () => (await import('#city-map/${id}')).CITY_MAP, async () => (await import('./content.ts')).CONTENT)\n`],
        [`src/game/cities/${id}/content.ts`, "import { buildDestinationContent } from '../africa/contentBuilder.ts'\nimport { FACTS } from './facts.ts'\nimport { PLACES } from './places.ts'\nexport const CONTENT = buildDestinationContent(FACTS, PLACES)\n"],
        [`src/game/cities/${id}/map.ts`, "import { createDestinationMap } from '../africa/map.ts'\nimport { FACTS } from './facts.ts'\nimport { GEOMETRY } from './geometry.ts'\nimport { TERRAIN } from './terrain.ts'\nexport const CITY_MAP = createDestinationMap(FACTS, GEOMETRY, async () => (await import('./index.ts')).city, TERRAIN)\n"]
    ]);
    mkdirSync(out, { recursive: false });
    try {
        for (const [path, source] of files) {
            mkdirSync(dirname(join(out, path)), { recursive: true });
            writeFileSync(join(out, path), source, { flag: 'wx' });
        }
    }
    catch (error) {
        rmSync(out, { recursive: true, force: true });
        throw error;
    }
    console.log(JSON.stringify({ ...report, status: 'private-scaffold-only', output: out, files: [...files.keys()], pendingGeneratedFiles: ['places.ts', 'geometry.ts', 'terrain.ts'], approval: 'not granted by scaffold' }, null, 2));
}
