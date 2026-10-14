/**
 * OWNER: social
 * Places, under /api/places: the Square and the rooms of group chats. Thin adapters: every rule is in
 * server/social/places.ts (numbers and room keys: src/places/model.ts; design: docs/PLACES.md). A room's link is
 * `/r/<number>-<key>`; opening it signs nobody in. Standing in a place is the room socket's `join` with `place`.
 *
 *   GET  /api/places                              the Square's headcount and the caller's group rooms
 *   GET  /api/places/square                       the people in the caller's part of the Square
 *   GET  /api/places/room?id=                     a room, for a member or a visitor holding a pass
 *   POST /api/places/room/edit    { id, edit }    one change to the furniture (members)
 *   POST /api/places/room/link    { id, on, fresh? }   switch the link on or off, or make a new one (members)
 *   POST /api/places/room/remove  { id, player }  ask a visitor to leave (members)
 *   POST /api/places/room/peek    { token }       what a link is, for a browser with no session
 *   POST /api/places/room/enter   { token }       come in through a link, as the signed-in caller
 *
 * Every route but peek needs the device session, is rate limited per public id with the other social routes and runs in one
 * store transaction. Answers are { ok: true, code, … } or { ok: false, code, reason } (HTTP 200); malformed is 400.
 * `peek` and `enter` are also counted per address, before the link is looked at.
 */
import { HTTP_PER_MINUTE } from './social.ts';
import { socialService, MATERIAL } from '../social/service.ts';
import { placesService } from '../social/places.ts';
import { PLACES } from '../../src/places/model.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest, SessionRecord } from '../types.ts';

export default function placesRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const social = socialService(ctx), places = placesService(ctx);
  // The room module admits a socket to a place only if this says so (server/ws/rooms.ts).
  if (ctx.checks) ctx.checks.placeUntil = (db, publicId, roomId) => places.placeUntil(db, publicId, roomId);
  async function run<R extends object>(request: RouteRequest, call: (db: Db, session: SessionRecord) => R): Promise<R> {
    const result = await ctx.store.transact((db) => {
      const session = request.requireSession(db, { renew: true });
      if (!ctx.allow(`social:http:${session.publicId}`, HTTP_PER_MINUTE)) throw ctx.fail(429, 'rate_limited');
      return social.finish(db, call(db, session));
    }, { durable: (value) => request.method !== 'GET' || Reflect.get(value, MATERIAL) === true, waitForObserved: true, committed: (value) => social.committed(value) });
    return social.deliver(result) as R;
  }
  const alone = (request: RouteRequest, key: string): void => { if (!ctx.allow(`${key}:${request.ip}`, PLACES.perAddressPerMinute)) throw ctx.fail(429, 'rate_limited'); };
  /** Somebody may no longer stand in a room: the room module drops them now, not at its next look. Raised after the write is in. */
  const ended = (roomId: unknown, playerId: string | null): void => { if (typeof roomId === 'string') ctx.emit?.('place-ended', { roomId, playerId }); };

  return {
    'GET /api/places': async (request) => ({ body: await run(request, (db, session) => places.summary(db, session)), renew: true }),
    'GET /api/places/square': async (request) => ({ body: await run(request, (db, session) => places.square(db, session)), renew: true }),
    'GET /api/places/room': async (request) => ({ body: await run(request, (db, session) => places.room(db, session, request.query.get('id'))), renew: true }),
    'POST /api/places/room/edit': async (request) => { const body = await request.json(); return { body: await run(request, (db, session) => places.edit(db, session, body)), renew: true }; },
    'POST /api/places/room/link': async (request) => {
      const body = await request.json();
      const answer = await run(request, (db, session) => places.link(db, session, body));
      if (answer.ok && 'ended' in answer) ended(body.id, null);
      return { body: answer.ok ? { ok: true, code: answer.code, room: answer.room } : answer, renew: true };
    },
    'POST /api/places/room/remove': async (request) => {
      const body = await request.json();
      const answer = await run(request, (db, session) => places.remove(db, session, body));
      if (answer.ok) ended(body.id, answer.player);
      return { body: answer.ok ? { ok: true, code: answer.code, room: answer.room } : answer, renew: true };
    },
    'POST /api/places/room/peek': async (request) => {
      alone(request, 'places:peek');
      const body = await request.json();
      return { body: await ctx.store.read((db) => places.peek(db, body.token)) };
    },
    'POST /api/places/room/enter': async (request) => {
      alone(request, 'places:enter');
      const body = await request.json();
      return { body: await run(request, (db, session) => places.enter(db, session, body.token)), renew: true };
    },
  };
}
