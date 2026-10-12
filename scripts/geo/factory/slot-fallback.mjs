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
