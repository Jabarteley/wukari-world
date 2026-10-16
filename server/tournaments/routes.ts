/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * THE ARENA'S ROUTES AND PAGES, served by the agents route module (server/routes/agents.ts):
 *
 *   GET  /api/agents/arena                    the signed-in person's view: their agent characters, this week's cups, challenges, badges, prizes
 *   POST /api/agents/arena/enter              { agent, cup, leave?, csrf }  enter (or leave) one of their agents in a cup
 *   POST /api/agents/arena/challenge          { agent, kind, key, csrf }    make a challenge for one of their agents: the card link back
 *   GET  /api/agents/arena/challenge/:code    a challenge as its card shows it (public)
 *   GET  /api/agents/arena/cup/:id            a cup's standings (public)
 *   GET  /api/agents/arena/now                agent matches being played now, with their watch links (public)
 *   pages /agents/join, /agents/cup/<id>, /agents/challenge/<code>, /agents/match/<id>; the league page's arena part (agentArenaForLeague)
 *
 * The write routes need what the account routes need (the caller's guard): an Origin naming this host and the session's anti-forgery token.
 * The settling runs on the server heartbeat (and before each arena call, so nothing read is stale).
 */
import type { Db, RouteContext, RouteHandler, RouteKey, RouteRequest } from '../types.ts';
import { accountOfSession } from '../admin/gate.ts';
import { agentService } from '../agents/service.ts';
import type { LeagueArena } from '../agents/pages.ts';
import { joinPageHtml } from '../agents/join.ts';
import { tournamentService, CHALLENGE_CODE, MATCH_ID } from './service.ts';
import { liveRooms } from './live.ts';
import { CUP_ID } from './book.ts';
import { cupPageHtml, challengePageHtml, matchPageHtml } from './pages.ts';
import type { ChallengePage, CupPage, MatchPage } from './pages.ts';

type Guard = (request: RouteRequest, body: Record<string, unknown>) => Promise<void>;
type Limited = (request: RouteRequest, session: string) => void;
const NO_STORE = { 'Cache-Control': 'no-store' };

export function arenaParts(ctx: RouteContext) {
  const svc = tournamentService(ctx), agents = agentService(ctx);
  const live = liveRooms(ctx, (match, replay) => { void svc.noteReplay(match, replay).catch(() => {}); });
  const origin = (): string => ctx.config.publicOrigin || '';
  /** Run the clocks, then bring the watched rooms to their matches. */
  async function beat(): Promise<void> { await svc.tick(); live.sync(await ctx.store.read((db) => svc.liveMatches(db))); }
  ctx.on?.('heartbeat', () => { void beat().catch(() => {}); });
  const watchOf = (match: string, kind: string): string | null => { if (kind !== 'arena') return `/agents/match/${match}`; const code = live.codeOf(match); return code ? `/?table=${code}` : null; };
  /** The agent `id` belongs to the signed-in account, or a refusal. */
  function ownAgent(db: Db, request: RouteRequest, id: unknown): string {
    const session = request.requireSession(db, { renew: true }), account = accountOfSession(db, session);
    if (!account) throw ctx.fail(403, 'account_required');
    const chars = agents.peek(db)?.chars;
    if (typeof id !== 'string' || !chars || !Object.hasOwn(chars, id) || chars[id]?.account !== account.id) throw Object.assign(ctx.fail(404, 'unknown_agent'), { reason: 'That is not one of your agent characters.' });
    return id;
  }
  const answer = <T extends { ok: boolean }>(out: T): { status: number; body: T } => ({ status: out.ok ? 200 : 409, body: out });
  const arenaFor = async (): Promise<LeagueArena> => {
    await beat();
    return ctx.store.read((db) => { const cups = svc.leagueCups(db); return { playing: svc.playingNow(db).map((m) => ({ label: m.label, players: m.players, in: m.in, watch: watchOf(m.match, m.kind) })), cups: cups.current, winners: cups.winners }; });
  };

  function routes(guard: Guard, limited: Limited): Record<RouteKey, RouteHandler> {
    return {
      'GET /api/agents/arena': async (request) => {
        await beat();
        return { body: await ctx.store.read((db) => { const session = request.requireSession(db), account = accountOfSession(db, session); return account ? svc.ownerView(db, account.id) : { ok: true as const, signedIn: false }; }), headers: NO_STORE };
      },
      'POST /api/agents/arena/enter': async (request) => {
        const body = await request.json();
        await guard(request, body);
        await beat();
        return { ...answer(await ctx.store.transact((db) => { const id = ownAgent(db, request, body.agent); limited(request, id); return body.leave === true ? svc.leave(db, id, body.cup) : svc.enter(db, id, body.cup); })), headers: NO_STORE, renew: true };
      },
      'POST /api/agents/arena/challenge': async (request) => {
        const body = await request.json();
        await guard(request, body);
        await beat();
        const out = await ctx.store.transact((db) => { const id = ownAgent(db, request, body.agent); limited(request, id); return svc.createChallenge(db, id, { kind: body.kind, key: body.key }); });
        return { ...answer(out.ok ? { ...out, card: `${origin()}${out.card}` } : out), headers: NO_STORE, renew: true };
      },
      'GET /api/agents/arena/challenge/:code': async (request) => {
        if (!ctx.allow(`agents:arena:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
        if (!CHALLENGE_CODE.test(request.params.code ?? '')) throw ctx.fail(404, 'unknown_challenge');
        await beat();
        const found = await ctx.store.read((db) => { const c = svc.challengeByCode(db, request.params.code); return c ? svc.challengeView(db, c) : null; });
        if (!found) throw ctx.fail(404, 'unknown_challenge');
        return { body: { ok: true, challenge: found }, headers: { 'Cache-Control': 'public, max-age=15' } };
      },
      'GET /api/agents/arena/cup/:id': async (request) => {
        if (!ctx.allow(`agents:arena:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
        if (!CUP_ID.test(request.params.id ?? '')) throw ctx.fail(404, 'unknown_cup');
        await beat();
        const cup = await ctx.store.read((db) => svc.cupDetail(db, request.params.id));
        if (!cup) throw ctx.fail(404, 'unknown_cup');
        return { body: { ok: true, cup }, headers: { 'Cache-Control': 'public, max-age=30' } };
      },
      'GET /api/agents/arena/now': async (request) => {
        if (!ctx.allow(`agents:arena:${request.ip}`, 60)) throw ctx.fail(429, 'rate_limited');
        const arena = await arenaFor();
        return { body: { ok: true, playing: arena.playing, cups: arena.cups, winners: arena.winners }, headers: { 'Cache-Control': 'public, max-age=10' } };
      },
    };
  }

  /** The arena's pages under /agents/ (null: not one of them). */
  async function page(rest: string, site: unknown): Promise<{ status: number; html: string } | null> {
    if (rest === 'join') return { status: 200, html: joinPageHtml(site) };
    const [kind, id = ''] = rest.split('/');
    if (kind === 'cup' && rest.split('/').length === 2) {
      if (!CUP_ID.test(id)) return { status: 404, html: cupPageHtml(null, site) };
      await beat();
      const cup = await ctx.store.read((db) => svc.cupDetail(db, id)) as CupPage | null;
      return { status: cup ? 200 : 404, html: cupPageHtml(cup, site) };
    }
    if (kind === 'challenge' && rest.split('/').length === 2) {
      if (!CHALLENGE_CODE.test(id)) return { status: 404, html: challengePageHtml(null, site) };
      await beat();
      const c = await ctx.store.read((db) => { const found = svc.challengeByCode(db, id); return found ? svc.challengeView(db, found) : null; }) as ChallengePage | null;
      return { status: c ? 200 : 404, html: challengePageHtml(c, site, c?.match ? watchOf(c.match, c.kind === 'game' ? (await kindOf(c.match)) : 'table') : null) };
    }
    if (kind === 'match' && rest.split('/').length === 2) {
      if (!MATCH_ID.test(id)) return { status: 404, html: matchPageHtml(null, site) };
      await beat();
      const m = await ctx.store.read((db) => svc.watch(db, id)) as MatchPage | null;
      return { status: m ? 200 : 404, html: matchPageHtml(m, site, m && m.kind === 'arena' ? watchOf(m.match, 'arena') : null) };
    }
    return null;
  }
  const kindOf = async (match: string): Promise<string> => String(((await ctx.store.read((db) => svc.watch(db, match))) as { kind?: unknown } | null)?.kind ?? 'table');

  return { routes, page, arenaFor, beat };
}
