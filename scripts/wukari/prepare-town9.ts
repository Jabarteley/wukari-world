/** Bounded selection from the already validated local dataset, not a new import. */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { contains, indexNodes, toWorld, wayPositions, type Dataset, type Position } from '../../src/wukari/geography.ts';
import { canStand, lineDistance, type Feature, type Study } from '../../src/wukari/play/model.ts';
import { roadSurfaces } from '../../src/wukari/play/roads.ts';
const source = readFileSync('.cache/wukari/local-pbf-import-20261020/dataset.json');
const sha = createHash('sha256').update(source).digest('hex');
if (sha !== '9dece439bd87b8f4883d7e42f3704275bf1102f98310d6e0cb09b181e3398750')
    throw Error('Local dataset differs from pinned validated aggregate');
const data = JSON.parse(source.toString()) as Dataset, nodes = indexNodes(data.osm.elements);
const nodeId = 1965491008, node = nodes.get(nodeId)!;
if (!node?.lon || !node.lat)
    throw Error('Original junction missing');
const origin: Position = [node.lon, node.lat], halfSize = 850;
if (!contains(data.extents.lga.feature.geometry, origin))
    throw Error('Outside Wukari LGA');
const features: Feature[] = [], omittedRoads: number[] = [];
for (const e of data.osm.elements) {
    if (e.type !== 'way' || (!e.tags?.highway && (!e.tags?.building || e.tags.building === 'no')))
        continue;
    const coordinates = wayPositions(e, data.osm.elements, nodes);
    if (!coordinates)
        continue;
    const points = coordinates.map(p => toWorld(origin, p));
    if (!points.every(p => Math.abs(p.x) <= halfSize && Math.abs(p.z) <= halfSize)) {
        if (e.tags?.highway && points.some(p => Math.abs(p.x) <= halfSize && Math.abs(p.z) <= halfSize))
            omittedRoads.push(e.id);
        continue;
    }
    features.push({ id: e.id, nodes: e.nodes!, tags: e.tags ?? {}, coordinates, points, version: e.version, timestamp: e.timestamp, distanceM: lineDistance({ x: 0, z: 0 }, points), association: 'nearby-only; FUW ownership unverified' });
}
const roads = features.filter(f => f.tags.highway), buildings = features.filter(f => f.tags.building && f.tags.building !== 'no');
const adjacency = new Map<number, Set<number>>();
for (const r of roads)
    for (let i = 1; i < r.nodes.length; i++) {
        const a = r.nodes[i - 1]!, b = r.nodes[i]!;
        if (!adjacency.has(a))
            adjacency.set(a, new Set());
        if (!adjacency.has(b))
            adjacency.set(b, new Set());
        adjacency.get(a)!.add(b);
        adjacency.get(b)!.add(a);
    }
const components = new Map<number, number>();
let count = 0;
for (const n of adjacency.keys()) {
    if (components.has(n))
        continue;
    const queue = [n];
    components.set(n, ++count);
    while (queue.length)
        for (const next of adjacency.get(queue.pop()!) ?? [])
            if (!components.has(next)) {
                components.set(next, count);
                queue.push(next);
            }
}
roads.forEach(r => r.component = components.get(r.nodes[0]!));
const evidence = JSON.parse(readFileSync('data/wukari/phase7/sources.json', 'utf8'));
const surfaces = roadSurfaces({ roads, buildings });
const study: Study = { schemaVersion: 1, id: 'town', title: 'Wukari / F242 vicinity', origin, halfSize, roads, buildings, sources: evidence.sources, candidates: [], roadSurface: surfaces.pieces, roadConflicts: surfaces.conflicts,
    spawn: { point: toWorld(origin, origin), nodeId, roadId: 185860473, eligible: true, review: 'Owner-authorized simulation-only spawn reviewed at an original shared-reference junction; no mapped restrictive tags, bridge/tunnel/ford; building clearance and surface clearance checked. Physical/legal/public access, traffic and safety unverified.' },
    coverage: { roads: roads.length, buildings: buildings.length, components: count, sourceSha256: sha, policy: 'Complete original ways inside a 1.7 km square around original junction node 1965491008. Source records unchanged; crossing ways still omitted and inventoried. Display window, not a legal boundary.' } };
const approach = roads.find(r => r.id === 181916655)!, approachIndex = approach.nodes.indexOf(4699508439);
if (!approach || approachIndex < 0 || !canStand(approach.points[approachIndex]!, study))
    throw Error('F242 approach fails simulation review');
study.spawn = { point: { ...approach.points[approachIndex]! }, nodeId: approach.nodes[approachIndex]!, roadId: approach.id, eligible: true, review: 'Original F242 junction node4699508439, source way181916655; connected to residential way476347716, with 44 mapped footprints within100m. Reviewed virtual building/surface clearance and mapped restrictions. Simulation-only: real-world access, traffic and physical safety unverified.' };
if ((adjacency.get(nodeId)?.size ?? 0) < 3 || !canStand(study.spawn!.point, study))
    throw Error('Junction spawn failed simulation review');
mkdirSync('data/wukari/phase9', { recursive: true });
writeFileSync('data/wukari/phase9/town9.json', JSON.stringify(study) + '\n');
const placeNodes = data.osm.elements.filter(e => e.type === 'node' && e.tags?.place && e.tags?.name && e.lon && e.lat && Math.abs(e.lon - origin[0]) < .03 && Math.abs(e.lat - origin[1]) < .03).map(e => ({ id: 'node/' + e.id, name: e.tags!.name, position: [e.lon, e.lat], point: toWorld(origin, [e.lon!, e.lat!]), confidence: 'OSM source-backed; not field verified', url: 'https://www.openstreetmap.org/node/' + e.id }));
const namedRoads = roads.filter(r => r.tags.name).map(r => ({ id: 'way/' + r.id, name: r.tags.name, position: r.coordinates[0], point: r.points[0], confidence: 'OSM road name; not field verified', url: 'https://www.openstreetmap.org/way/' + r.id }));
const fuw = { id: 'fuw-review', name: 'Federal University Wukari', position: evidence.candidateLocation, point: toWorld(origin, evidence.candidateLocation), confidence: 'Approximate historical research location; gate, boundary and access unknown', url: evidence.sources[0].url, review: true };
writeFileSync('data/wukari/phase9/places9.json', JSON.stringify({ origin, places: [...placeNodes, ...namedRoads, fuw], sources: evidence.sources, disclosure: 'OSM footprints/centerlines are source-backed; architectural finishes, building dimensions, anonymous shop facades, traffic and unmapped street furniture are illustrative. No invented real-world business names. F242 names are OSM tags; FUW is not a surveyed campus.' }, null, 2) + '\n');
console.log(JSON.stringify({ roads: roads.length, buildings: buildings.length, names: namedRoads.map(r => r.id), conflicts: surfaces.conflicts.length, origin }));
