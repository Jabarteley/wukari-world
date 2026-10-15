/**
 * OWNER: agents (docs/AGENT-MEMORY.md)
 * THE PERSON'S OWN CONTROLS over what house agents remember about them, closeness, and partners. Registered with the agent routes (server/routes/agents.ts) and
 * therefore under /api/agents/. Every route is about the signed-in session's own record: there is no id of another person anywhere in them, and nothing here is
 * reachable by an agent key (the MCP tools never import this).
 *
 *   GET  /api/agents/memory                       { remembering, adult, partnerAt, agents: [{ id, name, role, city, remembering, facts, standing, partner, canPartner, missions }] }
 *   POST /api/agents/memory/forget   { agent?, fact?, csrf }   one fact of one agent (agent + fact), everything with one agent (agent), or with all (neither)
 *   POST /api/agents/memory/remember { agent?, on, csrf }      remembering for one agent, or (no agent) for all; off deletes the stored facts at once

 *   POST /api/agents/memory/flirt    { agent, on, csrf }       an adult says an agent may flirt with them (without being partners), or takes it back
 *   POST /api/agents/memory/partner  { agent, on, csrf }       make an agent my partner (adults only, closeness 40, one at a time) or end it (always allowed)
 * The writes need what the other agent routes need: an Origin that names this host and the anti-forgery token of the session cookie.
 */
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { agentInfo } from './runner.ts';
import * as memory from './memory.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

export function memoryRoutes(ctx: RouteContext, guard: (request: RouteRequest, body: Record<string, unknown>) => Promise<void>, limited: (request: RouteRequest, session: string) => void): Record<RouteKey, RouteHandler> {
  const adultOf = (db: Parameters<NonNullable<NonNullable<RouteContext['checks']>['adult']>>[0], id: string): boolean => ctx.checks?.adult?.(db, id) === true;
  const agentOf = (value: unknown): string | null => { if (value === undefined || value === null) return null; if (typeof value !== 'string' || !agentInfo(value)) throw ctx.fail(400, 'invalid_agent'); return value; };
  const flag = (value: unknown): boolean => { if (typeof value !== 'boolean') throw ctx.fail(400, 'invalid_flag'); return value; };
  return {
    'GET /api/agents/memory': async (request) => {
      const body = await ctx.store.read((db) => {
        const session = request.requireSession(db), now = ctx.now(), adult = adultOf(db, session.publicId);
        const view = memory.overview(db, session.publicId, now, adult);
        const agents = view.agents.flatMap((card) => {
          const who = agentInfo(card.agent);
          return who ? [{ id: card.agent, name: who.name, role: who.role, city: who.city, remembering: card.remembering, facts: card.facts, standing: card.standing, partner: card.partner, canPartner: adult && card.standing.points >= memory.PARTNER_AT, flirt: card.flirt, missions: card.missions }] : [];
        });
        return { remembering: view.remembering, adult, partnerAt: memory.PARTNER_AT, agents };
      });
      return { body, headers: NO_STORE };
    },
    'POST /api/agents/memory/forget': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const agent = agentOf(body.agent);
      if (body.fact !== undefined && (typeof body.fact !== 'string' || !agent)) throw ctx.fail(400, 'invalid_fact');
      const deleted = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(request, session.publicId);
        if (agent && typeof body.fact === 'string') return memory.forgetFact(db, session.publicId, agent, body.fact) ? 1 : 0;
        return memory.forgetAll(db, session.publicId, agent);
      });
      return { body: { ok: true, code: 'forgotten', deleted }, headers: NO_STORE, renew: true };
    },
    'POST /api/agents/memory/remember': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const agent = agentOf(body.agent), on = flag(body.on);
      await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(request, session.publicId);
        memory.setRemembering(ctx, db, session.publicId, agent, on, ctx.now());
      });
      return { body: { ok: true, code: on ? 'remembering' : 'not_remembering' }, headers: NO_STORE, renew: true };
    },
    'POST /api/agents/memory/flirt': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const agent = agentOf(body.agent), on = flag(body.on);
      if (!agent) throw ctx.fail(400, 'invalid_agent');
      const done = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(request, session.publicId);
        return memory.setFlirt(ctx, db, session.publicId, agent, on, ctx.now(), adultOf(db, session.publicId));
      });
      if (!done) throw Object.assign(ctx.fail(403, 'adults_only'), { reason: 'AI characters only flirt with players who have said they are 18 or older.' });
      return { body: { ok: true, code: on ? 'flirting_on' : 'flirting_off' }, headers: NO_STORE, renew: true };
    },
    'POST /api/agents/memory/partner': async (request) => {
      const body = await request.json();
      await guard(request, body);
      const agent = agentOf(body.agent), on = flag(body.on);
      if (!agent) throw ctx.fail(400, 'invalid_agent');
      const done = await ctx.store.transact((db) => {
        const session = request.requireSession(db, { renew: true });
        limited(request, session.publicId);
        const bae = (db.social?.players as Record<string, { bae?: string | null } | undefined> | undefined)?.[session.publicId]?.bae;
        return memory.setPartner(ctx, db, session.publicId, agent, on, ctx.now(), adultOf(db, session.publicId), typeof bae === 'string' && bae !== '');
      });
      if (!done.ok) throw Object.assign(ctx.fail(403, done.code), { reason: done.reason });
      return { body: { ok: true, code: done.partner ? 'partner' : 'not_partner' }, headers: NO_STORE, renew: true };
    },
  };
}
