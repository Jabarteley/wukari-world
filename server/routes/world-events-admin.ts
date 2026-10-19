/**
 * OWNER: world events (docs/WORLD-EVENTS.md "Editing without a release"). The same gate and audit log as every admin route.
 *   GET  /api/admin/world-events      the schedule, the built-in and added events, what is hidden, the next four weeks
 *   POST /api/admin/world-events      { action, item?, id?, room?, moderator? }
 *        schedule.save { item }       the weekly slot: { weekday 0-6 (0 = Sunday), hour, minute, minutes, warmup, off }, Lagos time
 *        event.save { item }          add an event, or replace one with the same id (a built-in id replaces the built-in)
 *        event.remove { id }          remove an added event
 *        hide { id } / show { id }    take an event (built-in or added) out of the rotation, or put it back
 *        drop                         "the admins are in town": a surprise drop in the Square now (warm-up or live only)
 *        stage.moderator { room, moderator }   name a person moderator of the open stage of a room ('' = the game runs it)
 *        stage.end { room }           end the open stage of a room
 * Each change writes one audit line; the running copy of the schedule and list is replaced after the commit.
 */
import { accountBudget, addressBudget, adminOf, countFailure, notFound } from '../admin/gate.ts';
import type { Admin } from '../admin/gate.ts';
import { audit } from '../admin/store.ts';
import { BUILT_IN, DROP_OPEN_MS, LIMITS, cleanEvent, cleanSchedule, eventList, occurrenceOf, scheduleOf } from '../../src/world-events/model.ts';
import { lagosTime } from '../../src/game/clock.ts';
import { worldEventsService } from '../world-events/service.ts';
import { stageRoom, stagesService } from '../world-events/stages.ts';
import { peekWorldEvents, worldEventsOf } from '../world-events/data.ts';
import type { WorldEventsCollection } from '../world-events/data.ts';
import type { Stage } from '../../src/world-events/stage.ts';
import type { WorldEventsAdminAction, WorldEventsAdminView } from '../../src/types/world-events.ts';
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
const ACTIONS: readonly WorldEventsAdminAction[] = ['schedule.save', 'event.save', 'event.remove', 'hide', 'show', 'drop', 'stage.moderator', 'stage.end'];
type Refused = { ok: false; code: string; reason: string };
const no = (code: string, reason: string): Refused => ({ ok: false, code, reason });

export default function worldEventsAdminRoutes(ctx: RouteContext): Record<RouteKey, RouteHandler> {
  const events = worldEventsService(ctx), stages = stagesService(ctx);
  async function enter(request: RouteRequest, write: boolean): Promise<Admin> {
    addressBudget(ctx, request);
    const admin = await ctx.store.read((db) => adminOf(ctx, db, request));
    if (!admin) { countFailure(ctx, request); throw notFound(ctx); }
    accountBudget(ctx, admin, write);
    if (write && request.strictOrigin !== true) throw Object.assign(ctx.fail(403, 'origin_required'), { reason: 'Admin changes must come from the game page.' });
    return admin;
  }
  function page(db: Db): WorldEventsAdminView {
    const stored = peekWorldEvents(db).admin, extras = events.extras(), week = lagosTime(ctx.now()).week;
    const next = [0, 1, 2, 3].map((k) => occurrenceOf(week + k, extras)).filter((item) => item !== null).map((item) => ({ week: item.week, id: item.def.id, title: item.def.title, city: item.def.city, startsAt: item.startsAt }));
    return { schedule: scheduleOf(extras), custom: eventList(stored.events, ctx.cityIds), hidden: [...(extras.hidden ?? [])], builtIn: BUILT_IN.map((item) => ({ id: item.id, title: item.title, city: item.city, goal: item.goal })), next, limits: { events: LIMITS.events } };
  }
  /** One action, inside the transaction. */
  function change(db: Db, action: WorldEventsAdminAction, body: Record<string, unknown>): { summary: string; target: string; admin?: WorldEventsCollection['admin']; stage?: [string, Stage | null] } | Refused {
    const col = worldEventsOf(ctx, db), id = typeof body.id === 'string' ? body.id.trim().toLowerCase() : '', now = ctx.now();
    const saved = (summary: string, target: string) => { col.admin.seq += 1; return { summary, target, admin: JSON.parse(JSON.stringify(col.admin)) as WorldEventsCollection['admin'] }; };
    if (action === 'schedule.save') {
      const done = cleanSchedule(body.item);
      if (!done.ok) return no('invalid_schedule', done.reason);
      col.admin.schedule = done.value;
      return saved(`schedule: ${done.value.off ? 'off' : `day ${done.value.weekday} ${done.value.hour}:${String(done.value.minute).padStart(2, '0')}, ${done.value.minutes} min, warm-up ${done.value.warmup}`}`, 'schedule');
    }
    if (action === 'event.save') {
      const done = cleanEvent(body.item, ctx.cityIds);
      if (!done.ok) return no('invalid_event', done.reason);
      const list = eventList(col.admin.events, ctx.cityIds), at = list.findIndex((item) => item.id === done.value.id);
      if (at < 0 && list.length >= LIMITS.events) return no('too_many', `At most ${LIMITS.events} events can be added.`);
      if (at < 0) list.push(done.value); else list[at] = done.value;
      col.admin.events = list;
      return saved(`event ${at < 0 ? 'added' : 'changed'}: ${done.value.id}`, done.value.id);
    }
    if (action === 'event.remove') {
      const list = eventList(col.admin.events, ctx.cityIds), kept = list.filter((item) => item.id !== id);
      if (kept.length === list.length) return no('unknown_event', 'No added event has that id.');
      col.admin.events = kept;
      return saved(`event removed: ${id}`, id);
    }
    if (action === 'hide' || action === 'show') {
      const known = [...BUILT_IN, ...eventList(col.admin.events, ctx.cityIds)].some((item) => item.id === id);
      if (!known) return no('unknown_event', 'No event has that id.');
      const hidden = col.admin.hidden.filter((item) => item !== id);
      if (action === 'hide') { if (hidden.length >= LIMITS.hidden) return no('too_many', 'Too many hidden events.'); hidden.push(id); }
      col.admin.hidden = hidden;
      return saved(`event ${action === 'hide' ? 'hidden' : 'shown'}: ${id}`, id);
    }
    if (action === 'drop') {
      const o = events.occurrence(now);
      if (!o || (o.phase !== 'warmup' && o.phase !== 'live')) return no('not_now', 'A drop can only be sent during the warm-up or the event.');
      const run = events.runFor(col, o);
      if (run.drops.length >= 12) return no('too_many', 'Twelve drops is enough for one event.');
      const drop = { id: `a${run.drops.length}`, opensAt: now, closesAt: now + DROP_OPEN_MS };
      run.drops.push(drop);
      return { summary: `drop ${drop.id} in the Square`, target: String(o.week) };
    }
    const room = stageRoom(body.room);
    if (!room) return no('invalid_room', 'Name the room of the stage.');
    const stage = col.stages[room];
    if (!stage || stage.endsAt <= now) return no('no_stage', 'There is no stage open in that room.');
    if (action === 'stage.end') { stage.endsAt = now; stage.rev += 1; return { summary: `stage ended in ${room}`, target: room, stage: [room, JSON.parse(JSON.stringify(stage)) as Stage] }; }
    const moderator = typeof body.moderator === 'string' ? body.moderator.trim() : '';
    if (moderator && ctx.checks?.adult?.(db, moderator) !== true) return no('adults_only', 'A moderator is an adult player (their public id).');
    stage.moderator = moderator || null; stage.rev += 1;
    return { summary: `stage moderator in ${room}: ${moderator || 'the game'}`, target: room, stage: [room, JSON.parse(JSON.stringify(stage)) as Stage] };
  }
  return {
    'GET /api/admin/world-events': async (request) => { await enter(request, false); return { body: await ctx.store.read((db) => page(db)), headers: NO_STORE }; },
    'POST /api/admin/world-events': async (request) => {
      const admin = await enter(request, true), body = await request.json();
      const action = ACTIONS.find((item) => item === body.action);
      if (!action) throw ctx.fail(400, 'invalid_action');
      const done = await ctx.store.transact((db) => {
        const result = change(db, action, body);
        if ('ok' in result) return result;
        audit(ctx, db, { admin: admin.accountId, adminName: admin.name, action: 'world-events', target: result.target, targetName: result.target, params: { action }, summary: result.summary, reason: '' });
        return { ok: true as const, ...result };
      });
      if (!done.ok) return { body: done, headers: NO_STORE };
      if (done.admin) events.sync(done.admin);
      if (done.stage) stages.committed(done.stage[0], done.stage[1]);
      return { body: { ok: true, summary: done.summary }, headers: NO_STORE };
    },
  };
}
