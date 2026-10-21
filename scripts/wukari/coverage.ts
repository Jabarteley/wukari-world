/** Reproducible import counts, node-reference connectivity and explicit unknown campus coverage. */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseOsm, wayPositions, indexNodes, type Dataset } from '../../src/wukari/geography.ts';
import { sha256 } from './offline.ts';
export function coverage(dataset: Dataset) {
    const { elements } = parseOsm({ version: 0.6, elements: dataset.osm.elements });
    const nodes = indexNodes(elements);
    const ways = elements.filter(e => e.type === 'way'), complete = ways.filter(w => wayPositions(w, elements, nodes) !== null), roads = complete.filter(w => w.tags?.highway), buildings = complete.filter(w => w.tags?.building && w.tags.building !== 'no');
    const graph = new Map<number, Set<number>>();
    for (const road of roads)
        for (let i = 1; i < (road.nodes?.length ?? 0); i++) {
            const a = road.nodes![i - 1]!, b = road.nodes![i]!;
            if (!graph.has(a))
                graph.set(a, new Set());
            if (!graph.has(b))
                graph.set(b, new Set());
            graph.get(a)!.add(b);
            graph.get(b)!.add(a);
        }
    const seen = new Set<number>();
    let components = 0;
    for (const node of graph.keys()) {
        if (seen.has(node))
            continue;
        components++;
        const queue = [node];
        seen.add(node);
        while (queue.length) {
            for (const next of graph.get(queue.pop()!) ?? []) {
                if (!seen.has(next)) {
                    seen.add(next);
                    queue.push(next);
                }
            }
        }
    }
    const landmarkElements = elements.filter(e => e.tags?.name && (e.tags.amenity || e.tags.tourism || e.tags.leisure || e.tags.historic));
    return { schemaVersion: 1, mode: dataset.mode, importedRoads: roads.length, importedBuildingFootprints: buildings.length, sourceBackedNamedLandmarkRecords: dataset.mode === 'source-data' ? landmarkElements.length : null, fieldVerifiedFeatures: 0, campusLandmarks: dataset.extents.campus.status === 'unknown' ? null : 'requires-spatial-and-identity-review', campusBoundary: dataset.extents.campus.status, roadConnectivity: { nodes: graph.size, components: graph.size ? components : null, basis: 'shared original OSM node references; geometric crossings do not imply junctions', walkability: 'not-assessed; access, crossings, bridges, surfaces and safe spawn require review' }, estimatedCampusCoveragePercent: null, incompleteWays: ways.length - complete.length, unassembledRelations: elements.filter(e => e.type === 'relation').length, elevation: 'unavailable', campusPlayable: false };
}
export function report(datasetPath: string): string {
    const bytes = readFileSync(datasetPath), dataset = JSON.parse(bytes.toString()) as Dataset & {
        provenance?: unknown;
    };
    if (dataset.mode !== 'source-data')
        throw new Error('FUW source coverage report refuses synthetic fixtures');
    const c = coverage(dataset);
    return `# FUW geographic coverage report\n\nGenerated from exact dataset SHA-256: \`${sha256(bytes)}\`. Counts describe imported source records, not independently surveyed coverage.\n\n| Measure | Result |\n| --- | --- |\n| Imported roads / footpaths | ${c.importedRoads} |\n| Imported building footprints | ${c.importedBuildingFootprints} |\n| Source-backed named landmark records (whole extract) | ${c.sourceBackedNamedLandmarkRecords} |\n| Campus landmark assignment | ${c.campusLandmarks ?? 'Unknown: no campus extent or corroborated campus feature selection'} |\n| Independently field-verified features | 0 |\n| Campus boundary | ${c.campusBoundary} |\n| Road graph nodes / components | ${c.roadConnectivity.nodes} / ${c.roadConnectivity.components ?? 'unknown (no imported roads)'} |\n| Estimated campus geographic coverage | Unknown; no supported denominator |\n| Incomplete ways / unassembled relations | ${c.incompleteWays} / ${c.unassembledRelations} |\n| Elevation / playable campus | Unavailable / no |\n\nConnectivity uses original shared OSM node references, not visual intersections or proximity. It does not establish public access, pedestrian connectivity or a safe spawn. Named records may describe the same landmark; counts are not unique real-world venues. Imported non-campus features must not be advertised as FUW.\n\n## Sources, licenses and hashes\n\nOriginal provenance is preserved below. OSM records are source-backed, not field-verified. The administrative boundary is Wukari LGA, not a campus extent.\n\n\`\`\`json\n${JSON.stringify(dataset.provenance ?? null, null, 2)}\n\`\`\`\n\n## Missing input and next action\n\nA licensed FUW-area extract with complete original nodes/ways, actual source URL/query, retrieval time, original bytes and hashes is required. Campus boundary may remain unknown; independently corroborated campus-area roads/buildings can be reviewed separately. No road/building geometry or coordinates may be guessed. Public access, safe ground/spawn, terrain, building heights, campus scope and independent verification remain unestablished. Use DATA_TRANSFER.md to prepare, transfer and import the source, then regenerate this report and review coverage before enabling gameplay.\n`;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const args = process.argv.slice(2);
    if (args.length !== 2)
        throw new Error('Usage: node scripts/wukari/coverage.ts DATASET_JSON NEW_REPORT_MD');
    writeFileSync(args[1]!, report(args[0]!), { flag: 'wx' });
}
