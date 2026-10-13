/**
 * City selection profiles (bootstrap/profiles.json). `standard` is every country so far and is unchanged; `microstate` is for a country whose whole
 * mapped data is smaller than a city of a large country (Monaco, Nauru, Tuvalu, Micronesia, the Maldives, the Holy See, San Marino).
 *
 * What `microstate` relaxes, and nothing else:
 *  - city node: place=city|town as always, and also village|hamlet|locality (metadata.py reads the same list; a capital or a unique name still decides);
 *  - minimum sourced places 12 (standard 20); the 24-place target and the per-kind cap steps are unchanged;
 *  - minimum 3 source-backed neighbourhood labels (standard 5), from the same place tags in the same order;
 *  - up to 4 of the 9 non-airport slots may stay EMPTY: the slot keeps the game's own fictional venue ("... (game venue)", already built by
 *    buildDestinationContent for every slot and described there as not a mapped place). The selection records the slot and the reason, the recipe carries
 *    `emptySlots`, preflight demands that the missing slots and the documented ones are the same set, and the receipts repeat it.
 * It never invents a place, never maps a feature to a kind it is not (no "any named place" fallback), and never lowers a source, country or water rule.
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

export function emptySlotReason(slot) {
  const rule = SLOT_SOURCE_RULES[slot];
  if (!rule) throw new TypeError(`unknown slot ${slot}`);
  return `no unused named ${rule} feature inside the country, the play box guard and dry land in the pinned extract; the slot keeps the game's fictional venue`;
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
