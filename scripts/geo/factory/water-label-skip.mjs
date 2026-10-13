/**
 * Water labels are optional: the generated map test requires five neighbourhood labels and nothing else (acceptance.mjs).
 * The app generator (scripts/geo/build-destination-detail.ts, pinned appSha) throws when a chosen water area has no interior
 * point inside the water it finally renders: "<type>/<id> has no interior point in the rendered water". batch.mjs cannot know the
 * rendered water, so the runner drops exactly that label from the staged recipe, records a warning and generates again.
 */
const PATTERN = /((?:node|way|relation)\/[1-9][0-9]*) has no interior point in the rendered water/g;

/** @returns the distinct refs the generator reported as unlabellable, in order of appearance */
export function unlabellableWaterRefs(log) {
    return [...new Set([...String(log).matchAll(PATTERN)].map(match => match[1]))];
}

/**
 * Removes the named water labels (kind 'water' only) from a scaffolded recipe (`export const CONFIG = {\n...{json},\ndiscovery: ...`).
 * @returns { text, removed } where removed lists the label entries that were dropped; text is unchanged when none matched.
 */
export function dropWaterLabels(recipeText, refs) {
    const head = 'export const CONFIG = {\n...', tail = ',\ndiscovery:';
    const start = recipeText.indexOf(head), end = recipeText.indexOf(tail, start);
    if (start < 0 || end < 0)
        return { text: recipeText, removed: [] };
    const config = JSON.parse(recipeText.slice(start + head.length, end));
    const removed = (config.names ?? []).filter(label => label.kind === 'water' && refs.includes(label.ref));
    if (!removed.length)
        return { text: recipeText, removed };
    config.names = config.names.filter(label => !removed.includes(label));
    return { text: recipeText.slice(0, start + head.length) + JSON.stringify(config, null, 2) + recipeText.slice(end), removed };
}

/**
 * The generator picks a water label's point inside the water it renders, which reaches beyond the play box (the water box is the play box plus 0.6 degrees). A label whose point
 * lies outside the play box fails the city proof ("outsideBounds": Lake Zurich 35 m past the east edge, the Tigris north of Baghdad). The label is optional, so the runner drops
 * exactly those water labels from the staged recipe and generates again, as it does for an unlabellable one.
 * @param terrainText the generated terrain.ts (its `names:` line is one JSON array)
 * @param bounds the play box as [west, south, east, north] (facts.bounds)
 * @returns the ids of the water labels whose generated point lies outside the box
 */
export function outsideWaterLabelIds(terrainText, bounds) {
    const hit = /^  names: (\[.*\]),$/m.exec(String(terrainText));
    if (!hit)
        return [];
    const [west, south, east, north] = bounds;
    return JSON.parse(hit[1]).filter(label => label.kind === 'water' && (label.lon < west || label.lon > east || label.lat < south || label.lat > north)).map(label => label.id);
}

/** Like dropWaterLabels, by label id (recipe names carry `id` and `ref`). */
export function dropWaterLabelsById(recipeText, ids) {
    const head = 'export const CONFIG = {\n...', tail = ',\ndiscovery:';
    const start = recipeText.indexOf(head), end = recipeText.indexOf(tail, start);
    if (start < 0 || end < 0)
        return { text: recipeText, removed: [] };
    const config = JSON.parse(recipeText.slice(start + head.length, end));
    return dropWaterLabels(recipeText, (config.names ?? []).filter(label => label.kind === 'water' && ids.includes(label.id)).map(label => label.ref));
}
