/**
 * OWNER: world events (docs/WORLD-EVENTS.md)
 * The weekly world event, stage mode and election night. Thin adapters: the rules are src/world-events/, the engine server/world-events/.
 *
 *   GET  /api/world/event                         PUBLIC, cached 5 s: the week's event, its bar, its AI helpers, the open drop, the cities that look different
 *   GET  /api/world/event/me                      the caller's steps, badge, load, answered questions and badges
 *   POST /api/world/event/step  { op, question?, answer? }   pickup | drop | answer | grab: every one checked by the server (never a number)
 *   GET  /api/world/stage?room=                   the stage open in a room, as the caller sees it, and whether they may open one
 *   POST /api/world/stage       { room, op, … }   open | hand | unhand | invite | seat | down | ask | upvote | pick | dismiss | end
 *   GET  /api/world/election-night?city=          the results board of the caller's seats, the debates, the speeches
 *   POST /api/world/election-night/speech  { city, scope, text }   the winner's speech to the Square, once
 *   POST /api/world/election-night/card    { city, scope }         the result's gist line (written once), for the share card
 *
 * Answers are { ok: true, … } or { ok: false, code, reason } (HTTP 200); malformed is 400. Writes are rate limited per player.
 */
import { addressBucket } from '../host-context.ts';
import { adminOf } from '../admin/gate.ts';
import { STAGE } from '../../src/world-events/stage.ts';
import type { StageOp } from '../../src/world-events/stage.ts';
import { worldEventsService } from '../world-events/service.ts';
import { stageRoom, stagesService } from '../world-events/stages.ts';
import { nightService } from '../world-events/night.ts';
import { worldEventsOf } from '../world-events/data.ts';
import type { EventStepOp } from '../../src/types/world-events.ts';
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';

const STEP_OPS: readonly EventStepOp[] = ['pickup', 'drop', 'answer', 'grab'];
export default function worldEventRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const events = worldEventsService(ctx), stages = stagesService(ctx), night = nightService(ctx);
  ctx.startup?.push(events.load(), stages.load());
  const limited = (key: string, count: number): void => { if (!ctx.allow(key, count, 60000)) throw Object.assign(ctx.fail(429, 'rate_limited'), { reason: 'You are doing that too quickly. Wait a moment.' }); };
  const cityOf = (value: unknown): string => { const city = ctx.cityIds.find((id) => id === value); if (!city) throw ctx.fail(400, 'invalid_city'); return city; };
  const roomOf = (value: unknown): string => { const room = stageRoom(value); if (!room) throw ctx.fail(400, 'invalid_room'); return room; };
  const isAdmin = (request: RouteRequest, db: Parameters<typeof adminOf>[1]): boolean => { try { return adminOf(ctx, db, request) !== null; } catch { return false; } };

  return {
    'GET /api/world/event': async (request) => {
      limited(`world-event:${addressBucket(request.ip)}`, 120);
      return { body: await ctx.store.read((db) => events.view(db, ctx.now())), headers: { 'Cache-Control': 'public, max-age=5' } };
    },
    'GET /api/world/event/me': async (request) => ({ body: await ctx.store.read((db) => { const session = request.requireSession(db); return events.mine(db, session.publicId, ctx.now()); }), headers: { 'Cache-Control': 'no-store' } }),
    'POST /api/world/event/step': async (request) => {
      const body = await request.json(), op = STEP_OPS.find((item) => item === body.op);
      if (!op) throw ctx.fail(400, 'invalid_op');
      const answer = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(`world-event-step:${session.publicId}`, 30);
        const done = events.step(db, session, op, body, ctx.now());
        return { ...done, ...(done.ok ? {} : { count: 0 }), mine: events.mine(db, session.publicId, ctx.now()) };
      });
      return { body: answer, renew: true };
    },

    'GET /api/world/stage': async (request) => {
      const room = roomOf(request.query.get('room'));
      return { body: await ctx.store.read((db) => { const session = request.requireSession(db); return { stage: stages.view(db, room, session.publicId), canOpen: stages.canOpen(db, room, session.publicId, isAdmin(request, db)) }; }), headers: { 'Cache-Control': 'no-store' } };
    },
    'POST /api/world/stage': async (request) => {
      const body = await request.json(), room = roomOf(body.room), op = typeof body.op === 'string' ? body.op : '';
      const answer = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(`world-stage:${session.publicId}`, 40);
        const admin = isAdmin(request, db);
        if (op === 'open') {
          if (!stages.canOpen(db, room, session.publicId, admin)) return { ok: false as const, code: 'not_allowed', reason: 'Only an admin, or an adult member of this group in its room, can open a stage here.' };
          if (stages.live(room)) return { ok: false as const, code: 'stage_open', reason: 'A stage is already open here.' };
          const title = typeof body.title === 'string' ? body.title.replace(/\s+/g, ' ').trim().slice(0, STAGE.titleMax) : '';
          if (title.length < 3) return { ok: false as const, code: 'invalid_title', reason: 'Give the stage a title of at least 3 characters.' };
          const stage = stages.open(db, room, { kind: 'talk', title, minutes: typeof body.minutes === 'number' ? body.minutes : 60, moderator: session.publicId });
          return { ok: true as const, stage: JSON.parse(JSON.stringify(stage)) as typeof stage, viewer: session.publicId };
        }
        const done = stages.act(db, session, room, op as StageOp, body, admin);
        return done.ok ? { ok: true as const, stage: JSON.parse(JSON.stringify(done.stage)) as typeof done.stage, viewer: session.publicId } : done;
      });
      if (!answer.ok) return { body: answer, renew: true };
      stages.committed(room, answer.stage);
      return { body: { ok: true, stage: await ctx.store.read((db) => stages.view(db, room, answer.viewer)) }, renew: true };
    },

    'GET /api/world/election-night': async (request) => {
      const city = cityOf(request.query.get('city'));
      return { body: await ctx.store.read((db) => { const session = request.requireSession(db); return night.view(db, city, ctx.now(), session.publicId); }), headers: { 'Cache-Control': 'no-store' } };
    },
    'POST /api/world/election-night/speech': async (request) => {
      const body = await request.json(), city = cityOf(body.city);
      if (!night.validScope(body.scope)) throw ctx.fail(400, 'invalid_scope');
      const scope = body.scope;
      const answer = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(`world-speech:${session.publicId}`, 10);
        const done = night.speech(db, session, city, scope, body.text, ctx.now());
        return done.ok ? { ...done, stageNow: JSON.parse(JSON.stringify(worldEventsOf(ctx, db).stages['world:square'] ?? null)) } : done;
      });
      if (!answer.ok) return { body: answer, renew: true };
      night.broadcast(answer.frame);
      if (answer.stage) stages.committed('world:square', answer.stageNow);
      return { body: { ok: true, code: 'spoken' }, renew: true };
    },
    'POST /api/world/election-night/card': async (request) => {
      const body = await request.json(), city = cityOf(body.city);
      if (!night.validScope(body.scope)) throw ctx.fail(400, 'invalid_scope');
      const scope = body.scope;
      const answer = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(`world-card:${session.publicId}`, 20);
        const done = night.card(db, city, scope, ctx.now());
        return done ? { ok: true as const, ...done } : { ok: false as const, code: 'no_result', reason: 'There is no result to share for that seat yet.' };
      });
      return { body: answer, renew: true };
    },
  };
}
