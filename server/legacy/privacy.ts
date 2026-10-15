/**
 * OWNER: world
 * LEGACY AND PRIVACY (docs/LEGACY.md section 3): what an account's deletion removes and its export shows of the `legacy` collection.
 * Deleting a character's data removes its open offers (both ways: an offer to or from it), its last-hand-over times and its lines in the
 * short record of finished hand-overs. Pure over the db; runs inside the caller's transaction. Portable.
 */
import { peekLegacy } from './data.ts';
import type { Db } from '../types.ts';

/** Remove everything the collection holds about these public ids. A db without the collection is left alone. */
export function eraseLegacy(db: Db, ids: readonly string[]): void {
  if (!ids.length || !db.legacy) return;
  const gone = new Set(ids), d = peekLegacy(db), stored = db.legacy as unknown as { offers: object; done: object; people: object };
  stored.offers = Object.fromEntries(Object.entries(d.offers).filter(([, offer]) => !gone.has(offer.from) && !gone.has(offer.to)));
  stored.done = d.done.filter((line) => !gone.has(line.from) && !gone.has(line.to));
  stored.people = Object.fromEntries(Object.entries(d.people).filter(([id]) => !gone.has(id)));
}

/** What the owner of these characters may see: the finished hand-overs and the offers waiting, with no other person's id. */
export function exportLegacy(db: Db, ids: readonly string[]): { offers: unknown[]; done: unknown[] } {
  const mine = new Set(ids), d = peekLegacy(db);
  return {
    offers: Object.values(d.offers).filter((o) => mine.has(o.from) || mine.has(o.to)).map((o) => ({ id: o.id, direction: mine.has(o.from) ? 'given' : 'received', at: o.at, expires: o.expires })),
    done: d.done.filter((l) => mine.has(l.from) || mine.has(l.to)).map((l) => ({ id: l.id, kind: l.kind, result: l.result, at: l.at, direction: mine.has(l.from) ? 'given' : 'received' })),
  };
}
