/**
 * OWNER: agents (prayers, docs/PRAYERS.md)
 * A PLAYER'S PRAYER. Players may pray if they like; a prayer is read by the people who run Allworld (the admin's Prayers page) and by nobody else.
 *
 *   GET  /api/world/pray    { notice, received, left, max }   what the panel shows BEFORE a player prays, and how many prayers are left today. Needs a session.
 *   POST /api/world/pray    { text, notice: true, venue?, clientId }   the prayer. `notice: true` says the player was shown the notice; without it the route refuses
 *                           (400 `notice_required`). 3 a day per player, 4 to 240 characters, no contact details or links. Answers { ok, message }; it never says whether
 *                           or how the prayer will be answered, and nothing about the player's life changes because they prayed.
 * A prayer is kept in the `prayers` collection (server/prayers/service.ts). Faiths are treated alike: the wording names none.
 */
import { LIMITS, NOTICE, RECEIVED } from '../prayers/model.ts';
import { prayersOf } from '../prayers/service.ts';
import type { RouteContext, RouteHandler, RouteKey } from '../types.ts';

export default function prayerRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const prayers = prayersOf(ctx);
  const left = (db: Parameters<typeof prayers.peekPrayers>[0], id: string): number => {
    const since = ctx.now() - 86400000;
    return Math.max(0, LIMITS.playerPerDay - prayers.peekPrayers(db).items.filter((item) => item.by === 'player' && item.who === id && item.at > since).length);
  };
  return {
    'GET /api/world/pray': async (request) => {
      const body = await ctx.store.read((db) => { const session = request.requireSession(db); return { notice: NOTICE, received: RECEIVED, left: left(db, session.publicId), max: LIMITS.playerPerDay }; });
      return { body, headers: { 'Cache-Control': 'no-store' } };
    },
    'POST /api/world/pray': async (request) => {
      const body = await request.json();
      if (!ctx.allow(`pray:${request.ip}`, 20, 600000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'Slow down. Try again in a few minutes.' });
      if (body.notice !== true) throw Object.assign(ctx.fail(400, 'notice_required'), { reason: NOTICE });
      ctx.onceId(body.clientId);
      const result = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        return ctx.once(db, session, { id: body.clientId as string, kind: 'world.pray', fingerprint: [body.text, body.venue] }, () => {
          const done = prayers.playerPrays(db, session, { text: body.text, venue: body.venue });
          return done.ok ? { ok: true as const, message: RECEIVED } : { ok: false as const, code: done.code, reason: done.reason };
        });
      });
      if (result.ok === false) throw Object.assign(ctx.fail(result.code === 'too_many_prayers' ? 429 : 400, result.code), { reason: result.reason });
      return { body: { ok: true, message: RECEIVED }, renew: true };
    },
  };
}
