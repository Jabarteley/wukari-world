/**
 * City selection profiles (bootstrap/profiles.json). `standard` is every country so far and is unchanged; `microstate` is for a country whose whole
 * mapped data is smaller than a city of a large country (Monaco, Nauru, Tuvalu, Micronesia, the Maldives, the Holy See, San Marino).
 *
 * What `microstate` relaxes, and nothing else:
 *  - city node: place=city|town as always, and also village|hamlet|locality (metadata.py reads the same list; a capital or a unique name still decides);
 *  - minimum sourced places 12 (standard 20); the 24-place target and the per-kind cap steps are unchanged;
 *  - minimum 3 source-backed neighbourhood labels (standard 5), from the same place tags in the same order;
 *  - up to 5 of the 9 non-airport slots may stay EMPTY: the slot keeps the game's own fictional venue ("... (game venue)", already built by
 *    buildDestinationContent for every slot and described there as not a mapped place). The selection records the slot and the reason, the recipe carries
 *    `emptySlots`, preflight demands that the missing slots and the documented ones are the same set, and the receipts repeat it.
 * It never invents a place, never maps a feature to a kind it is not (no "any named place" fallback), and never lowers a source, country or water rule.
 *
 * `outpost` and `wilderness` (OUTPOST-PLAN 13 Oct 2026: research stations, a few houses on a remote island, a glacier, a reef):
 *  - up to all 9 slots may stay empty; outpost needs 3 sourced places and 2 labels, wilderness 0 places and 2 labels (its labels are natural names:
 *    peaks, passes, glaciers, capes, reefs; profiles.json `districtNaturalLabels`);
 *  - the extractor adds the profile-only place filters (post office, hut, research site, historic, ferry; wilderness: natural names), takes the road
 *    ladder down to tracks, and needs no road at all (`extraction.allowNoRoads`);
 *  - `slotExtras` lets a ferry terminal fill transit and a research station fill community (outpost only); the standard slot rules are unchanged;
 *  - military=*, landuse=military and aeroway=* are never selected, labelled or drawn (`extraction.excludeSensitive`);
 *  - the hub may be a mapped `gateway` node instead of an airport row, and travel is restricted to authored `links` (the app adds the Lagos connection).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROFILES = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'bootstrap', 'profiles.json'), 'utf8')).profiles;
export const PROFILE_NAMES = Object.freeze(Object.keys(PROFILES).filter(name => name !== 'standard'));

/** Rules for a seed/target `profile` value (undefined means standard). Throws on an unknown name. */
export function profileFor(name) {
  const key = name === undefined ? 'standard' : name;
  if (key === 'standard' && name !== undefined) throw new TypeError("profile 'standard' is the default; leave `profile` out");
  if (!Object.hasOwn(PROFILES, key)) throw new TypeError(`unknown profile ${JSON.stringify(name)}; allowed: ${PROFILE_NAMES.join(', ')}`);
  return Object.freeze({ name: key, ...PROFILES[key] });
}

/** Why a slot is empty, in the words the receipts keep; derived from the slot's own source rule, never free text. */
export const SLOT_SOURCE_RULES = Object.freeze({
  transit: 'railway=station, amenity=bus_station or public_transport=station',
  meal: 'amenity=restaurant or amenity=cafe',
  community: 'amenity=university, college, library, community_centre or conference_centre',
  clinic: 'amenity=hospital or amenity=clinic',
  recreation: 'leisure=park, or the audited fallbacks (garden, stadium, sports_centre, pitch, nature_reserve, playground)',
  market: 'amenity=marketplace or shop=mall',
  worship: 'amenity=place_of_worship',
  polling: 'place=square, amenity=townhall, or the audited fallbacks (courthouse, office=government, building=government, building=public, community_centre)',
  government: 'amenity=townhall, courthouse or parliament, office=government or building=government',
});

export function emptySlotReason(slot, profile) {
  const rule = SLOT_SOURCE_RULES[slot];
  if (!rule) throw new TypeError(`unknown slot ${slot}`);
  const extras = profile === undefined ? [] : profileFor(profile).slotExtras?.[slot] ?? [];
  return `no unused named ${rule}${extras.length ? ` (or ${extras.join(' or ')})` : ''} feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue`;
}

/** `key=value` of profiles.json slotExtras as a tag predicate. */
const tagTest = text => {
  const match = /^([a-z_:]+)=([a-z_]+)$/.exec(text);
  if (!match) throw new TypeError(`invalid slot extra ${text}`);
  return tags => tags[match[1]] === match[2];
};

/** The slot predicates of a profile: the standard ones, each widened by the profile's `slotExtras` (outpost: ferry terminal for transit, research for community). */
export function slotPredicatesFor(profile, slots) {
  const extras = profileFor(profile).slotExtras ?? {};
  for (const slot of Object.keys(extras)) if (!(slot in slots)) throw new TypeError(`slotExtras names unknown slot ${slot}`);
  return Object.fromEntries(Object.entries(slots).map(([slot, test]) => {
    const more = (extras[slot] ?? []).map(tagTest);
    return [slot, more.length ? tags => test(tags) || more.some(extra => extra(tags)) : test];
  }));
}

/** Military and aviation features are never selected, labelled or drawn for a profile with `extraction.excludeSensitive` (offline-extract.py `sensitive`). */
export const sensitiveTags = tags => 'military' in tags || tags.landuse === 'military' || 'aeroway' in tags;
export const excludesSensitive = profile => profileFor(profile).extraction?.excludeSensitive === true;
/** A profile city may have no mapped road at all (the generated map test then does not demand one). */
export const allowsNoRoads = profile => profileFor(profile).extraction?.allowNoRoads === true;

/** The kind of an added venue from the profile-only place filters (outpost): a post office, hut, research site or ferry terminal is a place to look around. */
export function profileAddedKind(tags, profile) {
  const places = profileFor(profile).extraction?.extraPlaces ?? [];
  if (places.includes('post_office') && tags.amenity === 'post_office') return 'walk';
  if (places.includes('research') && (tags.office === 'research' || tags.amenity === 'research_institute')) return 'walk';
  if (places.includes('ferry') && tags.amenity === 'ferry_terminal') return 'walk';
  if (places.includes('hut') && ['wilderness_hut', 'alpine_hut'].includes(tags.tourism)) return 'walk';
  return null;
}

/**
 * Check a recipe's emptySlots against the slots that really are missing from the places.
 * @returns string[] of problems (empty = consistent)
 */
export function emptySlotProblems({ profile, emptySlots, missingSlots, knownSlots }) {
  const problems = [];
  const rules = profileFor(profile);
  const documented = emptySlots ?? [];
  if (profile === undefined) {
    if (documented.length) problems.push('emptySlots is only allowed with a profile that permits them');
    return problems;
  }
  if (!Array.isArray(documented)) return ['emptySlots must be an array'];
  const seen = new Set();
  for (const entry of documented) {
    if (!entry || typeof entry !== 'object' || Object.keys(entry).sort().join(',') !== 'reason,slot') { problems.push('each emptySlots entry needs exactly slot and reason'); continue; }
    if (!knownSlots.includes(entry.slot) || entry.slot === 'airport') problems.push(`emptySlots names unknown slot ${entry.slot}`);
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20) problems.push(`empty slot ${entry.slot} needs a written reason`);
    if (seen.has(entry.slot)) problems.push(`empty slot ${entry.slot} listed twice`);
    seen.add(entry.slot);
  }
  for (const slot of missingSlots) if (!seen.has(slot)) problems.push(`missing fixed slot ${slot} is not a documented empty slot`);
  for (const slot of seen) if (!missingSlots.includes(slot)) problems.push(`slot ${slot} is documented empty but has a source`);
  if (seen.size > rules.maximumEmptySlots) problems.push(`${seen.size} empty slots exceed the ${profile} maximum of ${rules.maximumEmptySlots}`);
  return problems;
}

/**
 * Authored links of an outpost (profiles with `authoredLinks`): every `to` must be an open city of the app catalogue; the whole great-circle km
 * between the two atlas points and the other city's name are written into the facts with generatedLinkPolicy 'authored-only'. The app applies the
 * fare rule (src/game/cities/generatedLinks.ts charterFare, shipFare) and adds the Lagos connection.
 */
export function authoredLinkFacts(facts, links, catalogue, greatCircleKm) {
  if (!Array.isArray(links) || links.length < 2 || links.length > 4) throw new TypeError(`${facts.id}: an outpost needs 2 to 4 authored links`);
  const seen = new Set();
  return links.map(link => {
    const city = catalogue.find(entry => entry.id === link.to && entry.open);
    if (!city || city.id === 'lagos' || city.id === facts.id) throw new TypeError(`${facts.id}: authored link ${link.to} is not another open city of the app catalogue (Lagos is added by the app)`);
    if (!['charter', 'ship', 'overland'].includes(link.kind)) throw new TypeError(`${facts.id}: authored link kind ${link.kind}`);
    if (seen.has(`${link.to}|${link.kind}`)) throw new TypeError(`${facts.id}: authored link ${link.to} ${link.kind} listed twice`);
    seen.add(`${link.to}|${link.kind}`);
    return { to: city.id, name: city.name, kind: link.kind, km: Math.round(greatCircleKm(city, facts.centre)) };
  });
}
