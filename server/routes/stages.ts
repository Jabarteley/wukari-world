/**
 * OWNER: social
 * Birthdays, opt-in (server/stages/birthday.ts, docs/SMALLER-FEATURES.md).
 *
 *   GET  /api/world/birthday                 { mine: { m, d, share } | null, today, friends: [names] }   needs a session; never cached
 *   POST /api/world/birthday  { m, d, share } | { clear: true }                   sets or removes the caller's own birthday; answers the same view
 * Only the caller's own record is written. Friends see a name only when that friend chose to share, and only on the day.
 */
import { peekStages, readBirthday, validDate, viewOf } from '../stages/birthday.ts';
import type { StagesCollection } from '../stages/birthday.ts';
import type { Db, RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function stagesRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  /** The caller's friends and their names, from the social record (read only). */
  const friendsOf = (db: Db, me: string): { id: string; name: string }[] => {
    const players = db.social?.players ?? {};
    return Object.keys(players[me]?.friends ?? {}).flatMap((id) => (players[id]?.friends?.[me] !== undefined ? [{ id, name: players[id]!.name }] : []));
  };
  const view = (db: Db, me: string) => viewOf(peekStages(db), me, friendsOf(db, me), ctx.now());
  return {
    'GET /api/world/birthday': async (request) => {
      const body = await ctx.store.read((db) => view(db, request.requireSession(db, { renew: false }).publicId));
      return { body, headers: { 'Cache-Control': 'no-store' } };
    },
    'POST /api/world/birthday': async (request) => {
      const input = await request.json();
      const body = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        if (!ctx.allow(`stages:${session.publicId}`, 10, 60000)) throw ctx.fail(429, 'stages_rate_limited');
        const stages = ctx.collection(db, 'stages', { v: 1, birthdays: {} }) as unknown as StagesCollection;
        if (input.clear === true) delete stages.birthdays[session.publicId];
        else {
          if (!validDate(input.m, input.d)) throw Object.assign(ctx.fail(400, 'invalid_date'), { reason: 'Choose a month and a day that exist.' });
          const kept = readBirthday({ m: input.m, d: input.d, share: input.share === true });
          if (kept) stages.birthdays[session.publicId] = kept;
        }
        return view(db, session.publicId);
      }, { durable: true });
      return { body, renew: true };
    },
  };
}
