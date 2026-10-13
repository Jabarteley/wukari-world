/**
 * Neighbourhood labels for the ground (the generated map test needs five source-backed ones).
 * Primary: place=suburb|neighbourhood|quarter nodes, exactly the selection the factory always made.
 * Fallback, only when fewer than MINIMUM_LABELS primary labels exist: place=village, hamlet, locality, subdivision nodes in that
 * priority (village and hamlet are the neighbourhood unit in Laos, Kiribati, Palau; locality and subdivision are the weakest).
 * Still short (Nassau: three nodes, but its named neighbourhoods and housing estates are mapped as areas): place=neighbourhood|quarter|suburb areas,
 * then village|hamlet|locality|subdivision areas, taken at the centre point the extract records for the area (the same point every other
 * way/relation place of the factory uses), after every node, nearest to the city first.
 * Cities that already have five primary labels therefore keep exactly their previous labels.
 * The extractor (scripts/geo/offline-extract.py PLACE_DISTRICTS / PLACE_DISTRICT_FALLBACKS) must list the same values.
 */
export const PRIMARY_DISTRICT_PLACES = Object.freeze(['suburb', 'neighbourhood', 'quarter']);
export const FALLBACK_DISTRICT_PLACES = Object.freeze(['village', 'hamlet', 'locality', 'subdivision']);
export const ISLAND_PLACES = Object.freeze(['island', 'islet']);
export const MINIMUM_LABELS = 5;
export const MAXIMUM_LABELS = 18;

/**
 * @param pool    eligible elements (already named, in country, inside the play box, not on water)
 * @param name    element -> display name
 * @param ref     element -> canonical `type/id`
 * @param normal  name normaliser used for de-duplication
 * @param centre  { lon, lat } of the city, used only to rank fallback labels (nearest first)
 * @param minimumLabels  the profile's minimum (standard 5, microstate 3); the fallback tiers start only below it
 * @param islandPlaces   profile `districtIslandPlaces` (microstate: island, islet; standard: none). Named islands (nodes, or ways/relations at their centre) of the play box are used only
 *                       after every suburb|neighbourhood|quarter and village|hamlet|locality|subdivision node and still short of the minimum, nearest to the city first,
 *                       before way/relation areas of the ordinary tags. A standard city never passes them, so its labels are exactly as before.
 * @returns { labels: [{id, ref, kind:'neighbourhood'}], placeTags: { [ref]: place tag }, fallback: boolean, areaRefs: string[] }
 */
export function districtLabels({ pool, name, ref, normal, centre, minimumLabels = MINIMUM_LABELS, islandPlaces = [] }) {
    const nodes = tags => pool.filter(el => el.type === 'node' && tags.includes(el.tags.place));
    const areas = tags => pool.filter(el => el.type !== 'node' && el.center && tags.includes(el.tags.place));
    const lonLat = el => (el.type === 'node' ? el : el.center);
    const dedupe = (items, taken = new Set()) => items.filter(el => { const key = normal(name(el)); if (taken.has(key)) return false; taken.add(key); return true; });
    const wikidata = el => (el.tags.wikidata ? 1 : 0);
    const primary = dedupe(nodes(PRIMARY_DISTRICT_PLACES).sort((a, b) => wikidata(b) - wikidata(a) || ref(a).localeCompare(ref(b)))).slice(0, MAXIMUM_LABELS);
    let chosen = primary, fallback = false;
    if (primary.length < minimumLabels) {
        const taken = new Set(primary.map(el => normal(name(el))));
        const distance = el => Math.hypot(lonLat(el).lon - centre.lon, lonLat(el).lat - centre.lat);
        const tier = el => FALLBACK_DISTRICT_PLACES.indexOf(el.tags.place);
        const extra = dedupe(nodes(FALLBACK_DISTRICT_PLACES).sort((a, b) => tier(a) - tier(b) || wikidata(b) - wikidata(a) || distance(a) - distance(b) || ref(a).localeCompare(ref(b))), taken);
        chosen = [...primary, ...extra].slice(0, MAXIMUM_LABELS);
        if (chosen.length < minimumLabels && islandPlaces.length) {
            const taken1 = new Set(chosen.map(el => normal(name(el))));
            const islands = dedupe(pool.filter(el => islandPlaces.includes(el.tags.place) && (el.type === 'node' || el.center))
                .sort((a, b) => wikidata(b) - wikidata(a) || distance(a) - distance(b) || ref(a).localeCompare(ref(b))), taken1);
            chosen = [...chosen, ...islands].slice(0, MAXIMUM_LABELS);
        }
        if (chosen.length < minimumLabels) {
            // Areas only after every node, and never more than the minimum is topped up: primary tags first, then the fallback tags in tier order, nearest first.
            const areaTier = el => (PRIMARY_DISTRICT_PLACES.includes(el.tags.place) ? -1 : tier(el));
            const taken2 = new Set(chosen.map(el => normal(name(el))));
            const more = dedupe(areas([...PRIMARY_DISTRICT_PLACES, ...FALLBACK_DISTRICT_PLACES]).sort((a, b) => areaTier(a) - areaTier(b) || wikidata(b) - wikidata(a) || distance(a) - distance(b) || ref(a).localeCompare(ref(b))), taken2);
            chosen = [...chosen, ...more].slice(0, minimumLabels);
        }
        fallback = chosen.length > primary.length;
    }
    return {
        labels: chosen.map(el => ({ id: `district-${el.id}`, ref: ref(el), kind: 'neighbourhood' })),
        placeTags: Object.fromEntries(chosen.map(el => [ref(el), el.tags.place])),
        fallback,
        // way/relation places that topped the list up (empty unless the nodes were fewer than MINIMUM_LABELS): the receipt and check table show these OSM refs.
        areaRefs: chosen.filter(el => el.type !== 'node').map(el => ref(el)),
    };
}
