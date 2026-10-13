/**
 * Explicit, audited fallbacks for a venue slot whose primary tag has no eligible source in the pool.
 * The pool handed in is already the batch's eligible pool (named, inside the country boundary, inside the play box guard,
 * not on closed water, not excluded), so a fallback keeps exactly the same name / boundary / water requirements.
 * The extractor and its adapter hash are untouched: only features already present in the extracted places/extras are used.
 * The venue itself keeps the slot's scene kind, category and icon (preflight pins them to the slot contract); the fallback
 * only changes which real OpenStreetMap feature names and places that slot, and it is written to the receipts.
 */
export const SLOT_FALLBACKS = Object.freeze({
  // Order is the order tried. A named leisure=park always wins; these are only used when the pool has none.
  recreation: Object.freeze(['garden', 'stadium', 'sports_centre', 'pitch', 'nature_reserve', 'playground'].map(value => Object.freeze({ used: `leisure=${value}`, matches: tags => tags.leisure === value }))),
  // Polling keeps scene kind 'polling', category 'civic', icon 'poll' and the line "<name>; voting here is a fictional game activity."
  // A square or town hall always wins; otherwise a named civic building from the same pool, in this order. The government slot is
  // chosen after polling and the batch drops used refs and names, so the two slots never share an element.
  polling: Object.freeze([
    { used: 'amenity=courthouse', matches: tags => tags.amenity === 'courthouse' },
    { used: 'office=government', matches: tags => tags.office === 'government' },
    { used: 'building=government', matches: tags => tags.building === 'government' },
    { used: 'building=public', matches: tags => tags.building === 'public' },
    { used: 'amenity=community_centre', matches: tags => tags.amenity === 'community_centre' },
  ].map(item => Object.freeze(item))),
});

/**
 * @param slot       slot name, such as 'recreation'
 * @param predicate  primary tag test for the slot
 * @param pool       eligible elements
 * @param rank       the batch ranking (drops used refs/names, deterministic order)
 * @param ref        element -> canonical `type/id`
 * @returns { el, slotFallback } where slotFallback is undefined for a primary match and
 *          { slot, used, ref } for a fallback; el is undefined when nothing is eligible.
 */
export function pickForSlot({ slot, predicate, pool, rank, ref }) {
  const primary = rank(pool.filter(el => predicate(el.tags)))[0];
  if (primary) return { el: primary, slotFallback: undefined };
  for (const fallback of SLOT_FALLBACKS[slot] ?? []) {
    const el = rank(pool.filter(el => fallback.matches(el.tags)))[0];
    if (el) return { el, slotFallback: { slot, used: fallback.used, ref: ref(el) } };
  }
  return { el: undefined, slotFallback: undefined };
}

/**
 * Fill every slot in order (the order matters: `rank` drops what `take` already used).
 * @param slots        { [slot]: predicate } in selection order
 * @param allowEmpty   true only for a profile that permits documented empty slots (profile.mjs `maximumEmptySlots > 0`)
 * @param emptyReason  slot -> recorded reason (profile.mjs `emptySlotReason`)
 * @param take         (slot, el, slotFallback) => void, called for each slot that has a source
 * @returns { empty: [{ slot, reason }], missing: [slot] } where `empty` is the documented empty slots and `missing` the slots left without a source
 *          when empty slots are not allowed (the caller turns those into errors).
 */
export function fillSlots({ slots, pool, rank, ref, allowEmpty, emptyReason, take }) {
  const empty = [], missing = [];
  for (const [slot, predicate] of Object.entries(slots)) {
    const { el, slotFallback } = pickForSlot({ slot, predicate, pool, rank, ref });
    if (el) take(slot, el, slotFallback);
    else if (allowEmpty) empty.push({ slot, reason: emptyReason(slot) });
    else missing.push(slot);
  }
  return { empty, missing };
}
