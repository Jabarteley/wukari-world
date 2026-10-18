/**
 * OWNER: admin
 * TEST SESSIONS. The release check (scripts/smoke.ts) makes one guest per open city on every release, so a store fills with sessions
 * named "Zz City 12" that are nobody. Since the `probe` flag (protocol.ts) they live fifteen minutes and are counted nowhere; this
 * module counts the ones a store still holds (old ones by name, new ones by flag) and lets a root admin remove them in bounded batches.
 *
 * COST. A count is one walk over the stored sessions (reads only). A removal is one transaction that deletes at most BATCH records
 * and writes one audit line; the admin page repeats it until none remain. Nothing is archived: a probe never lived a life anyone played.
 */
import { isProbeSession } from '../protocol.ts';
import { audit } from './store.ts';
import type { Admin } from './gate.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

export const BATCH = 500;

/** The keys of every stored probe session, newest first by expiry (so the most recent check's are removed last), at most `max`. */
function probeKeys(db: Db, max: number): string[] {
  const found: { key: string; expiresAt: number }[] = [];
  if (db.$store) db.$store.scanSessions((record, key) => { if (isProbeSession(record)) found.push({ key, expiresAt: record.expiresAt }); return false; });
  else for (const [key, record] of Object.entries(db.sessions)) if (record && isProbeSession(record)) found.push({ key, expiresAt: record.expiresAt });
  found.sort((a, b) => a.expiresAt - b.expiresAt);
  return found.slice(0, max).map((item) => item.key);
}

export function probesService(ctx: RouteContext) {
  return {
    /** How many probe sessions the store holds, how many are still live, and a few of their names. */
    count(db: Db): { count: number; live: number; sample: string[]; batch: number } {
      const now = ctx.now(), sample: string[] = [];
      let count = 0, live = 0;
      const visit = (record: SessionRecord): void => { if (!isProbeSession(record)) return; count += 1; if (record.expiresAt > now) live += 1; if (sample.length < 5) sample.push(record.name); };
      if (db.$store) db.$store.scanSessions((record) => { visit(record); return false; });
      else for (const record of Object.values(db.sessions)) if (record) visit(record);
      return { count, live, sample, batch: BATCH };
    },
    /** Delete up to BATCH probe sessions; says how many went and how many remain. One audit line per batch that removed anything. */
    remove(db: Db, admin: Admin): { ok: true; removed: number; remaining: number; summary: string } {
      const keys = probeKeys(db, BATCH);
      for (const key of keys) delete db.sessions[key];
      const remaining = Math.max(0, this.count(db).count);
      const summary = keys.length ? `Removed ${keys.length} test sessions${remaining ? `; ${remaining} remain` : ''}` : 'No test sessions to remove';
      if (keys.length) audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'test-sessions', target: '', targetName: 'test sessions', params: { removed: keys.length, remaining }, summary, reason: '' });
      return { ok: true, removed: keys.length, remaining, summary };
    },
  };
}
