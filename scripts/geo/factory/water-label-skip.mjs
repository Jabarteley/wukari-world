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
