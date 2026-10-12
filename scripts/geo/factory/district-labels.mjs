/**
 * Neighbourhood labels for the ground (the generated map test needs five source-backed ones).
 * Primary: place=suburb|neighbourhood|quarter nodes, exactly the selection the factory always made.
 * Fallback, only when fewer than MINIMUM_LABELS primary labels exist: place=village, hamlet, locality, subdivision nodes in that
 * priority (village and hamlet are the neighbourhood unit in Laos, Kiribati, Palau; locality and subdivision are the weakest).
 * Cities that already have five primary labels therefore keep exactly their previous labels.
 * The extractor (scripts/geo/offline-extract.py PLACE_DISTRICTS / PLACE_DISTRICT_FALLBACKS) must list the same values.
 */
export const PRIMARY_DISTRICT_PLACES = Object.freeze(['suburb', 'neighbourhood', 'quarter']);
export const FALLBACK_DISTRICT_PLACES = Object.freeze(['village', 'hamlet', 'locality', 'subdivision']);
export const MINIMUM_LABELS = 5;
export const MAXIMUM_LABELS = 18;

/**
 * @param pool    eligible elements (already named, in country, inside the play box, not on water)
 * @param name    element -> display name
 * @param ref     element -> canonical `type/id`
 * @param normal  name normaliser used for de-duplication
 * @param centre  { lon, lat } of the city, used only to rank fallback labels (nearest first)
 * @returns { labels: [{id, ref, kind:'neighbourhood'}], placeTags: { [ref]: place tag }, fallback: boolean }
 */
export function districtLabels({ pool, name, ref, normal, centre }) {
    const nodes = tags => pool.filter(el => el.type === 'node' && tags.includes(el.tags.place));
    const dedupe = (items, taken = new Set()) => items.filter(el => { const key = normal(name(el)); if (taken.has(key)) return false; taken.add(key); return true; });
    const wikidata = el => (el.tags.wikidata ? 1 : 0);
    const primary = dedupe(nodes(PRIMARY_DISTRICT_PLACES).sort((a, b) => wikidata(b) - wikidata(a) || ref(a).localeCompare(ref(b)))).slice(0, MAXIMUM_LABELS);
    let chosen = primary, fallback = false;
    if (primary.length < MINIMUM_LABELS) {
        const taken = new Set(primary.map(el => normal(name(el))));
        const distance = el => Math.hypot(el.lon - centre.lon, el.lat - centre.lat);
        const tier = el => FALLBACK_DISTRICT_PLACES.indexOf(el.tags.place);
        const extra = dedupe(nodes(FALLBACK_DISTRICT_PLACES).sort((a, b) => tier(a) - tier(b) || wikidata(b) - wikidata(a) || distance(a) - distance(b) || ref(a).localeCompare(ref(b))), taken);
        chosen = [...primary, ...extra].slice(0, MAXIMUM_LABELS);
        fallback = chosen.length > primary.length;
    }
    return {
        labels: chosen.map(el => ({ id: `district-${el.id}`, ref: ref(el), kind: 'neighbourhood' })),
        placeTags: Object.fromEntries(chosen.map(el => [ref(el), el.tags.place])),
        fallback,
    };
}
