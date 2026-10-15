import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
// One shared policy. Bound boxes come from the pinned extract, never guessed.
export const GEOMETRY_PRESETS = {
    standard: {
        cell: 0.004, grow: 2, split: 12, shore: 0, minHole: 40,
        minRoadKm: 0.7, maxRoads: 700, roadMarginDegrees: 0.004,
        surround: '#bcd596', outlineTolerance: 0.0003,
        waterTolerance: 0.0003, farTolerance: 0.0008, coreTolerance: 0.0004,
        boundaryNote: 'mapped built-up land use within the pinned source box',
        terrainNote: 'source-mapped water areas, main roads and recorded place labels',
        source: 'OpenStreetMap contributors via Geofabrik PBF',
    },
};
// A seed with a one-sided play box extent (playBox.westKm/eastKm/southKm/northKm, recorded in the source run's bounds policy) meets a neighbour on that
// edge, so exact-coastwater.py cuts its land and play area at the play box (the generator traces land 0.05 degrees beyond it). Others: no recipe change.
export const playAreaWithinBox = target => ['westKm', 'eastKm', 'southKm', 'northKm'].some(key => target?.metadataSources?.bounds?.policy?.[key] !== undefined);
export async function factsForTarget(table, target) {
    if (target.facts) {
        if (target.facts.id !== target.id || target.facts.name !== target.name
            || target.facts.country.idISOlower !== target.country) {
            throw Error('Embedded facts disagree with target identity');
        }
        // An outpost names its mapped gateway node instead of an airport row (bootstrap/metadata-batch.py).
        if (!target.metadataSources?.centre || !(target.metadataSources?.airport || target.metadataSources?.gateway)) {
            throw Error('Embedded metadata needs explicit source references for centre and airport (or gateway)');
        }
        return structuredClone(target.facts);
    }
    if (!target.factsRecordRef)
        throw Error('Provide embedded facts; factsRecordRef is migration-only');
    const { FACTS } = await import(pathToFileURL(join(resolve(table.root), target.factsRecordRef)).href);
    return structuredClone(FACTS);
}
export function geometryPolicy(table, target) {
    const policy = GEOMETRY_PRESETS[target.geometryPreset ?? table.geometryPreset ?? 'standard'];
    if (!policy)
        throw Error('Unknown shared geometry preset');
    return structuredClone(policy);
}
