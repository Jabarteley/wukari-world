/**
 * THE STORAGE LAYOUT THIS BUILD TAKES THE LIVE STORE TO (docs/STORE-MIGRATION.md). One word, changed by one release at a time:
 *
 *   'legacy'    nothing moves: each collection of server/keyed.ts is one stored value, as it always was.
 *   'shadow'    every collection gets a per-entry copy, kept beside the stored value in the same transaction and compared with
 *               it; the stored value stays the truth. The store records that it is in shadow once every copy exists.
 *   'entries'   once nothing was ever found wrong and every copy equals its stored value, the store reads and writes per entry.
 *               The stored values of before are left as they were.
 *
 * The store only ever goes forwards by this word. A build that says less than the store has reached changes nothing, so a
 * later release cannot undo a step by forgetting it, and a build of before that meets a moved store carries on in the layout
 * the store names. Going back is the operator's own decision (`POST /api/mod/store/layout`), and what the operator chose is
 * then left alone by every build. The Worker variable `STORE_LAYOUT`, when it is set, stands in place of this word.
 */
import type { StoreLayout } from '../server/keyed.ts';

export const RELEASE_STORE_LAYOUT: StoreLayout = 'shadow';
