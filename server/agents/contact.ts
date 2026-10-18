/**
 * OWNER: agents (AI agents as contacts, docs/RESIDENTS.md "Contact")
 * THE AI AGENTS ONLINE, AND A PRIVATE CHAT WITH ONE. The top bar counts the AI agents present now (server/pulse.ts `ai`); these routes let a person see them and
 * reach them as they would a person: a list, and a one-to-one chat. A call is the call screen (server/house/call-routes.ts), a visit is the map's trip to where they stand.
 *
 *   GET  /api/agents/online?city=&q=&id=    the AI agents standing in a place now. `city`: everyone in that city (and the count in every other city); `q`: a name
 *                                           search over all of them (at most SEARCH_MAX); `id`: that one agent, or `agent: null`, with where it is even when not standing.
 *   POST /api/agents/talk  { agent, text, history?, csrf }   one answer from a resident or a house agent, as text. Nothing is stored here: the person's phone keeps
 *                                           the conversation and sends its last lines back (`history`, at most HISTORY lines) so the answer follows it.
 *
 * WHO IS LISTED: the virtual members of venues (agentRoom: residents `resident.<city>.<key>`, house agents `house.<city>.<key>`, and characters an agent plays
 * through its key without a socket) and the sockets of characters an agent is driving now. A character an agent plays is a player: its card, Messages and calls
 * are a player's, so it is listed (`kind: 'character'`) but not answered here.
 * BEFORE AN AGENT SEES A LINE the game reads it (server/moderation/ai-intercept.ts): words of danger are answered with help lines, a sincere "are you an AI?" by the game.
 * LIMITS: 20 lines a minute per person and 240 a minute in all; the residents' and house agents' own budgets and daily caps still apply behind them.
 * Portable: no Node imports.
 */
import { aiAnswer, asksIfAi, countryOfCity, crisisWords, helpText } from '../moderation/ai-intercept.ts';
import { cityName } from '../../src/game/cities/registry.ts';
import { venueLabel } from '../../src/game/content/venues.ts';
import { PLACES } from '../../src/places/model.ts';
import { agentInfo, houseService } from '../house/runner.ts';
import { residentService } from '../residents/resident.ts';
import type { RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };
export const SEARCH_MAX = 50, CITY_MAX = 200, HISTORY = 6, TEXT_MAX = 300;
const OPEN = 1;

export type AgentKind = 'resident' | 'house' | 'character';
/** One AI agent as the list shows it. `venue` is a venue id of `city` (or `square`, the Square of no city). */
export interface OnlineAgent { id: string; name: string; kind: AgentKind; city: string; cityName: string; venue: string | null; place: string | null; doing: string | null; look: unknown }

export const kindOf = (id: string): AgentKind => (id.startsWith('resident.') ? 'resident' : id.startsWith('house.') ? 'house' : 'character');
/** `lagos:market` → { city: 'lagos', venue: 'market' }; a home, a street or a group room (more parts) has no venue to go to. */
export function placeOf(room: string): { city: string; venue: string | null } {
  const parts = room.split(':'), [city = '', venue = ''] = parts;
  return { city, venue: parts.length === 2 && venue && venue !== 'home' ? venue : null };
}
const placeName = (city: string, venue: string | null): string | null => (!venue ? null : city === PLACES.city ? 'the Square' : venueLabel(venue, city));
const clean = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** Everyone the pulse counts as an AI agent now, each once. */
export function onlineAgents(ctx: RouteContext): OnlineAgent[] {
  const found = new Map<string, OnlineAgent>();
  const add = (id: string, name: string, room: string, doing: string | null, look: unknown): void => {
    if (!id || found.has(id)) return;
    const { city, venue } = placeOf(room);
    if (!city) return;
    found.set(id, { id, name, kind: kindOf(id), city, cityName: city === PLACES.city ? 'Allworld' : cityName(city) ?? city, venue, place: placeName(city, venue), doing, look });
  };
  const rooms = ctx.checks?.agentRoom;
  for (const room of new Set(rooms?.rooms?.() ?? [])) for (const member of rooms?.members(room) ?? []) add(member.id, member.name, room, member.doing, member.look);
  for (const ws of ctx.core?.sockets?.() ?? []) {
    if (ws.readyState !== OPEN || ws.expiresAt <= ctx.now() || ws.session?.agent !== true || typeof ws.room !== 'string') continue;
    add(ws.session.id, ws.session.name, ws.room, null, null);
  }
  return [...found.values()];
}

const order = (a: OnlineAgent, b: OnlineAgent): number => a.name.localeCompare(b.name);

export function contactRoutes(ctx: RouteContext, guard: (request: RouteRequest, body: Record<string, unknown>) => Promise<void>): Record<RouteKey, RouteHandler> {
  const who = (request: RouteRequest): Promise<{ id: string; name: string }> => ctx.store.read((db) => { const session = request.requireSession(db); return { id: session.publicId, name: session.name }; });
  return {
    'GET /api/agents/online': async (request) => {
      const me = await who(request);
      if (!ctx.allow(`agents:online:${me.id}`, 30)) throw ctx.fail(429, 'rate_limited');
      const everyone = onlineAgents(ctx);
      const id = clean(request.query.get('id'), 120);
      if (id) {
        const standing = everyone.find((agent) => agent.id === id) ?? null;
        if (standing || !id.startsWith('resident.')) return { body: { ok: true, agent: standing, awake: standing !== null }, headers: NO_STORE };
        // A resident who is not standing anywhere (asleep, or between places) can still be written to.
        const where = residentService(ctx).whereIs(id);
        const agent: OnlineAgent | null = where ? { id, name: where.name, kind: 'resident', city: where.city, cityName: cityName(where.city) ?? where.city, venue: null, place: null, doing: where.doing, look: null } : null;
        return { body: { ok: true, agent, awake: where?.awake ?? false }, headers: NO_STORE };
      }
      const q = clean(request.query.get('q'), 40).toLowerCase();
      if (q.length >= 2) return { body: { ok: true, total: everyone.length, agents: everyone.filter((agent) => agent.name.toLowerCase().includes(q)).sort(order).slice(0, SEARCH_MAX) }, headers: NO_STORE };
      const city = clean(request.query.get('city'), 60);
      const cities: Record<string, number> = {};
      for (const agent of everyone) cities[agent.city] = (cities[agent.city] ?? 0) + 1;
      const here = city ? everyone.filter((agent) => agent.city === city).sort(order).slice(0, CITY_MAX) : [];
      return { body: { ok: true, total: everyone.length, city: city || null, agents: here, cities }, headers: NO_STORE };
    },
    'POST /api/agents/talk': async (request) => {
      const body = await request.json(16000);
      await guard(request, body);
      const me = await who(request);
      if (!ctx.allow(`agents:talk:${me.id}`, 20) || !ctx.allow('agents:talk:all', 240)) throw ctx.fail(429, 'rate_limited');
      const agent = clean(body.agent, 120), text = clean(body.text, TEXT_MAX);
      if (!text) throw ctx.fail(400, 'invalid_text');
      // The phone's lines are { me: true } for the person; the resident's prompt reads `me` as the resident itself.
      const history = (Array.isArray(body.history) ? body.history : []).slice(-HISTORY).flatMap((line: unknown) => {
        const said = typeof line === 'object' && line !== null ? clean(Reflect.get(line, 'text'), 200) : '';
        return said ? [{ me: Reflect.get(line as object, 'me') !== true, text: said }] : [];
      });
      const house = agentInfo(agent), resident = agent.startsWith('resident.') ? residentService(ctx).whereIs(agent) : null;
      if (!house && !resident) throw ctx.fail(400, 'invalid_agent');
      const name = house?.name ?? resident!.name, city = house?.city ?? resident!.city;
      const out = (reply: string, extra: Record<string, unknown> = {}) => ({ body: { ok: true, name, text: reply, ...extra }, headers: NO_STORE });
      if (crisisWords(text)) return out(helpText(countryOfCity(city)), { help: true });
      if (asksIfAi(text)) return out(aiAnswer([name]), { game: true });
      if (house) {
        const answered = await houseService(ctx).answerCall(agent, me, text);
        return out(answered?.text ?? 'I am here. Say that again?');
      }
      const answered = await residentService(ctx).answerDirect(agent, me, text, history);
      if (!answered) throw Object.assign(ctx.fail(503, 'agent_unavailable'), { reason: `${name.split(' ')[0]} cannot answer right now. Try again later.` });
      return out(answered.text, answered.asleep ? { asleep: true } : {});
    },
  };
}
