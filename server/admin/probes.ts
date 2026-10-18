/**
 * OWNER: admin
 * TEST SESSIONS. The release check (scripts/smoke.ts) makes one guest per open city on every release, so a store fills with sessions
 * named "Zz City 12" that are nobody. Since the `probe` flag (protocol.ts) they live fifteen minutes and are counted nowhere; this
 * module counts the ones a store still holds (old ones by name, new ones by flag) and lets a root admin remove them in bounded batches.
 * The release continuity check's "Release Check A/B" identities are listed too; the pair it used in the last three days is kept.
 *
 * COST. A count is one walk over the stored sessions (reads only). A removal is one transaction that deletes at most BATCH records
 * and writes one audit line; the admin page repeats it until none remain. Nothing is archived: a probe never lived a life anyone played.
 */
import { CHECK_NAME, isProbeSession, ttlFor } from '../protocol.ts';
import { audit } from './store.ts';
import type { Admin } from './gate.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

export const BATCH = 500;
/** A continuity identity used this recently is the one the next release check will read: removal leaves it alone. */
export const KEEP_CHECK_MS = 3 * 86400000;

export function probesService(ctx: RouteContext) {
  /** A continuity identity seen in the last KEEP_CHECK_MS: still in use by the release check, so never removed. */
  const kept = (record: SessionRecord): boolean => CHECK_NAME.test(record.name) && record.expiresAt - ttlFor(record, ctx.config.sessionTtlMs) > ctx.now() - KEEP_CHECK_MS;
  const removable = (record: SessionRecord): boolean => isProbeSession(record) && !kept(record);
  /** The keys of removable probe sessions, oldest expiry first, at most `max`. */
  function probeKeys(db: Db, max: number): string[] {
  const found: { key: string; expiresAt: number }[] = [];
  if (db.$store) db.$store.scanSessions((record, key) => { if (removable(record)) found.push({ key, expiresAt: record.expiresAt }); return false; });
  else for (const [key, record] of Object.entries(db.sessions)) if (record && removable(record)) found.push({ key, expiresAt: record.expiresAt });
  found.sort((a, b) => a.expiresAt - b.expiresAt);
  return found.slice(0, max).map((item) => item.key);
  }
  return {
    /** How many probe sessions the store holds, how many are still live, and a few of their names. */
    count(db: Db): { count: number; live: number; kept: number; sample: string[]; batch: number } {
      const now = ctx.now(), sample: string[] = [];
      let count = 0, live = 0, keep = 0;
      const visit = (record: SessionRecord): void => { if (!isProbeSession(record)) return; if (kept(record)) { keep += 1; return; } count += 1; if (record.expiresAt > now) live += 1; if (sample.length < 5) sample.push(record.name); };
      if (db.$store) db.$store.scanSessions((record) => { visit(record); return false; });
      else for (const record of Object.values(db.sessions)) if (record) visit(record);
      return { count, live, kept: keep, sample, batch: BATCH };
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
