import type { Db } from './types.ts';

/** Pending work survives restart; completed receipts carry no actor manifest. */
export function actorErasurePending(db: Db, actor: string): boolean {
  const root = db.playerErasure;
  if (!root || typeof root !== 'object' || !('jobs' in root) || !root.jobs || typeof root.jobs !== 'object') return false;
  return Object.values(root.jobs).some(job => job && typeof job === 'object' && job.state === 'pending' && Array.isArray(job.actors) && job.actors.includes(actor));
}
