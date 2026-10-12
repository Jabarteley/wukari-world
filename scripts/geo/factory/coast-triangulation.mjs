// Reads polygons (JSON: [[ring, hole...], ...]) and prints, as one JSON line, the problem of each polygon (or null): the checks a city map is held to
// (polygonCheck.ts: simple rings, holes inside; and the renderer's own ear-clipping triangulation in the map's local units).
// Usage: node --experimental-strip-types coast-triangulation.mjs <app checkout> <city id> <polygons.json>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
const [, , app, city, polygonsPath] = process.argv;
if (!app || !city || !polygonsPath) throw new Error('Usage: coast-triangulation.mjs <app checkout> <city id> <polygons.json>');
const load = path => import(pathToFileURL(join(app, path)).href);
const [{ triangulationProblem, polygonProblem }, { toLocal }, { validateDestinationFacts }, { FACTS }] = await Promise.all([
  load('src/game/cities/africa/polygonCheck.ts'), load('src/geo/frame.ts'), load('src/game/cities/africa/types.ts'), load(`src/game/cities/${city}/facts.ts`),
]);
const origin = validateDestinationFacts(FACTS).mapOrigin;
const project = point => toLocal(origin, point[0], point[1]);
const polygons = JSON.parse(readFileSync(polygonsPath, 'utf8'));
console.log(JSON.stringify(polygons.map(polygon => polygonProblem(polygon) ?? triangulationProblem(polygon, project))));
