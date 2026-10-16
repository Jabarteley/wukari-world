/**
 * OWNER: social
 * CLANS on the server (rules: src/clans/clan.ts; docs/CLANS.md). Every method runs inside a store transaction, takes the caller's session
 * and answers { ok: true, code, … } or { ok: false, code, reason }; pushes ride on `push` for server/social to deliver after the commit.
 *
 * A clan owns a CLAN ROOM: a group conversation (social.convs, `clan: <clan id>`) that the clan service fills and empties, so the usual
 * chat rules apply to it unchanged (text filter, mutes, blocks, the AI rules, pictures settings). The group controls refuse a clan room
 * (server/social/service.ts groupUpdate). Joining needs no friendship (the code is the invitation); under-18s may join, agents may join
 * and always carry the AI mark, but an agent never leads, creates or inherits a clan and wins no war prize.
 */
import { lagosTime } from '../../src/game/clock.ts';
import { WAR } from '../../src/clans/war.ts';
import { CLAN, COLOURS, cleanClanName, cleanCode, codeFrom, colourOf, joinBlock, kickBlock, nameKey, roleChange, roleOf, withoutMember } from '../../src/clans/clan.ts';
import { socialService } from '../social/service.ts';
import { characterCity } from '../character.ts';
import { clansOf, peekClans } from './data.ts';
import { cityName, ladderService } from './ladder.ts';
import type { ClanRecord, ClansCollection, PlayerRecord } from './data.ts';
import type { PushList } from '../social/service.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';

const no = <C extends string>(code: C, reason: string) => ({ ok: false as const, code, reason });
const yes = <C extends string, const E extends object = object>(code: C, extra?: E) => ({ ok: true as const, code, ...extra }) as { ok: true; code: C } & E;
const isRecord = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const services = new WeakMap<RouteContext, ReturnType<typeof build>>();
export function clanService(ctx: RouteContext): ReturnType<typeof build> {
  let found = services.get(ctx);
  if (!found) services.set(ctx, found = build(ctx));
  return found;
}

function build(ctx: RouteContext) {
  const social = socialService(ctx), kit = social.kit, ladder = ladderService(ctx);
  const bad = (code: string) => ctx.fail(400, code);
  const now = (): number => ctx.now();

  function freshCode(c: ClansCollection): string | null {
    for (let tries = 0; tries < 8; tries++) {
      const bytes = [...ctx.randomId().replace(/-/g, '')].slice(0, 12).map((ch) => parseInt(ch, 16));
      const code = codeFrom([0, 2, 4, 6, 8, 10].map((i) => (bytes[i] ?? 0) * 16 + (bytes[i + 1] ?? 0)));
      if (!Object.hasOwn(c.codes, code)) return code;
    }
    return null;
  }
  const homeOf = (session: SessionRecord): string => session.homeCity?.city ?? characterCity(session) ?? ctx.cityIds[0] ?? 'lagos';
  const isAgent = (session: SessionRecord): boolean => session.agent?.char === true;
  /** A line in the clan room. */
  function say(s: ReturnType<typeof kit.col>, clan: ClanRecord, text: string, push: PushList): void {
    const conv = s.convs[clan.room];
    if (conv) kit.fanOut(s, conv, kit.append(s, conv, null, text, null, true), push, null);
  }
  const playerOf = (c: ClansCollection, id: string, session: SessionRecord): PlayerRecord => {
    const rec = (c.players[id] ||= { name: session.name, city: homeOf(session), season: 0, g: {}, day: 0, best: {}, pairs: {}, wk: 0, wp: 0, wg: {}, plays: 0, seen: [] });
    rec.name = session.name; if (isAgent(session)) rec.ai = 1; else delete rec.ai;
    return rec;
  };
  const myClan = (c: ClansCollection, id: string): ClanRecord | undefined => { const key = c.players[id]?.clan; return key ? c.clans[key] : undefined; };
  /** Take a person out of the clan room and the clan's books; the clan itself ends when nobody can lead it. */
  function remove(db: Db, c: ClansCollection, clan: ClanRecord, id: string, kickUntil: number | undefined, push: PushList, text: string): void {
    const s = kit.col(db), agents = new Set(clan.members.filter((m) => c.players[m]?.ai));
    const next = withoutMember(clan, id, agents, kickUntil);
    const rec = c.players[id]; if (rec) { delete rec.clan; delete rec.joined; }
    const conv = s.convs[clan.room];
    if (!next) {
      for (const m of clan.members) { const r = c.players[m]; if (r) { delete r.clan; delete r.joined; } }
      if (conv) { for (const m of [...conv.members]) kit.leaveConv(s, conv, m, true); for (const m of clan.members) push.push([m, { type: 'social-sync' }]); }
      delete c.names[nameKey(clan.name)]; delete c.codes[clan.code]; delete c.clans[clan.id];
      return;
    }
    if (conv) { kit.leaveConv(s, conv, id, true); if (s.convs[clan.room]) conv.owner = next.leader; }
    clan.leader = next.leader; clan.deputies = next.deputies; clan.members = next.members; if (next.kicked && Object.keys(next.kicked).length) clan.kicked = next.kicked;
    if (clan.wk) delete clan.wk.s[id];
    push.push([id, { type: 'social-sync' }]);
    say(s, clan, text, push);
  }

  /** The clan as one of its members (or a visitor with the code) sees it. */
  function view(db: Db, c: ClansCollection, clan: ClanRecord, viewer: string | null) {
    const s = kit.col(db), role = viewer ? roleOf(clan, viewer) : null, member = role !== null, tm = lagosTime(now());
    const colour = colourOf(clan.colour) ?? COLOURS[0]!;
    const base = { id: clan.id, name: clan.name, colour: colour.id, hex: colour.hex, city: clan.city, cityName: cityName(clan.city), size: clan.members.length, cap: ladder.clanCap(), leader: s.players[clan.leader]?.name ?? 'Leader' };
    if (!member) return base;
    const wk = clan.wk && clan.wk.n === tm.week ? clan.wk : null, opp = wk?.vs ? c.clans[wk.vs] : undefined;
    const members = clan.members.map((m) => ({ id: m, name: s.players[m]?.name ?? c.players[m]?.name ?? 'Player', role: roleOf(clan, m) as string, ...(c.players[m]?.ai ? { ai: true } : {}), pts: Math.max(0, wk?.s[m] ?? 0) }));
    return { ...base, code: clan.code, role: role as string, room: clan.room, rating: clan.rating, members, deputies: clan.deputies.length,
      war: wk ? { week: wk.n, vs: opp ? { name: opp.name, size: opp.members.length, colour: opp.colour } : null, mine: wk ? members.filter((x) => !x.ai).map((x) => x.pts) : [] } : null,
      last: clan.last ? { ...clan.last, prize: clan.last.prize && viewer && clan.last.prize.ids.includes(viewer) && c.players[viewer]?.prize !== clan.last.n ? clan.last.prize.amount : 0 } : null };
  }
  function checkWar(c: ClansCollection, clan: ClanRecord): void { ladder.enrol(c, clan, lagosTime(now()).week); }

  return {
    view,
    isAgent,
    /** The caller's clan (or null) and the choices the create form offers. */
    mine(db: Db, session: SessionRecord) {
      const { s, id } = kit.enter(db, session); void s;
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (clan) checkWar(c, clan);
      return yes('mine', { clan: clan ? view(db, c, clan, id) : null, colours: COLOURS, cap: ladder.clanCap(), homeCity: homeOf(session), canCreate: !isAgent(session) });
    },
    /** What a code is, before joining: public facts only. */
    preview(db: Db, code: unknown) {
      const clean = cleanCode(code); if (!clean) throw bad('invalid_code');
      const c = peekClans(db), clan = c && Object.hasOwn(c.codes, clean) ? c.clans[c.codes[clean]!] : undefined;
      return clan && c ? yes('preview', { clan: view(db, c, clan, null) }) : no('unknown_code', 'No clan has that code.');
    },
    create(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      ctx.onceId(body.clientId);
      const name = cleanClanName(body.name), colour = colourOf(body.colour);
      if (!name) throw bad('invalid_clan_name');
      if (!colour) throw bad('invalid_colour');
      const city = body.city === undefined ? null : typeof body.city === 'string' && ctx.cityIds.some((x) => x === body.city) ? body.city : undefined;
      if (city === undefined) throw bad('invalid_city');
      const { s, p, id } = kit.enter(db, session), push: PushList = [];
      const out = ctx.once(db, session, { id: body.clientId, kind: 'clan.create', fingerprint: [name, colour.id, city] }, () => {
        const refused = kit.mutedRefusal(id) ?? kit.screened(name, 'A clan name', true);
        if (refused) return refused;
        if (isAgent(session)) return no('agent_role', 'An AI-played character can join a clan but not start one.');
        const c = clansOf(ctx, db);
        if (c.players[id]?.clan) return no('already_in_clan', 'You are already in a clan. Leave it first.');
        if (Object.hasOwn(c.names, nameKey(name))) return no('name_taken', 'A clan already has that name.');
        if (!ctx.allow(`clans:create:${id}`, CLAN.createPerDay, 86400000)) return no('rate_limited', 'You have made clans today already. Try tomorrow.');
        const code = freshCode(c); if (!code) return no('busy', 'Try again in a moment.');
        const clanId = `c${c.meta.seq = (c.meta.seq ?? 0) + 1}`, t = now();
        const conv = s.convs[`g.${++s.seq}`] = { id: `g.${s.seq}`, kind: 'group', name, owner: id, creator: id, members: [id], seq: 0, created: t, messages: [], pinScope: ctx.randomId(), clan: clanId };
        kit.index(s, id, conv);
        kit.fanOut(s, conv, kit.append(s, conv, null, `${p.name} started the clan “${name}”.`, null, true), push, id);
        c.clans[clanId] = { id: clanId, name, colour: colour.id, city: city ?? homeOf(session), code, at: t, leader: id, deputies: [], members: [id], room: conv.id, rating: WAR.startRating };
        c.names[nameKey(name)] = clanId; c.codes[code] = clanId;
        const rec = playerOf(c, id, session); rec.clan = clanId; rec.joined = t;
        return yes('created', { clan: clanId });
      });
      if (!out.ok) return out;
      const c = clansOf(ctx, db), clan = c.clans[out.clan];
      return clan ? yes('created', { clan: view(db, c, clan, id), ...(out.duplicate ? { duplicate: true } : { push }) }) : no('unknown_clan', 'That clan is gone.');
    },
    join(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const code = cleanCode(body.code); if (!code) throw bad('invalid_code');
      const { s, p, id } = kit.enter(db, session), push: PushList = [];
      if (!ctx.allow(`clans:join:${id}`, CLAN.joinPerHour, 3600000)) return no('rate_limited', 'You tried many codes. Wait a little.');
      const c = clansOf(ctx, db), clan = Object.hasOwn(c.codes, code) ? c.clans[c.codes[code]!] : undefined;
      if (!clan) return no('unknown_code', 'No clan has that code.');
      const rec = playerOf(c, id, session);
      const why = joinBlock(clan, { id, agent: isAgent(session) }, rec.clan !== undefined && c.clans[rec.clan] !== undefined, now(), ladder.clanCap());
      if (why) return no(why.code, why.reason);
      const conv = s.convs[clan.room];
      clan.members.push(id); rec.clan = clan.id; rec.joined = now();
      if (conv) { conv.members.push(id); kit.index(s, id, conv); }
      say(s, clan, `${p.name} joined the clan.`, push);
      return yes('joined', { clan: view(db, c, clan, id), push });
    },
    leave(db: Db, session: SessionRecord) {
      const { p, id } = kit.enter(db, session), push: PushList = [];
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (!clan) return yes('left', { clan: null, duplicate: true as const });
      remove(db, c, clan, id, undefined, push, `${p.name} left the clan.`);
      return yes('left', { clan: null, push });
    },
    kick(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const target = typeof body.id === 'string' && UUID.test(body.id) ? body.id.toLowerCase() : null; if (!target) throw bad('invalid_player');
      const { s, id } = kit.enter(db, session), push: PushList = [];
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (!clan) return no('no_clan', 'You are not in a clan.');
      const why = kickBlock(clan, id, target); if (why) return no(why.code, why.reason);
      const name = s.players[target]?.name ?? 'A member';
      remove(db, c, clan, target, now() + CLAN.kickBanMs, push, `${name} was removed from the clan.`);
      return yes('kicked', { clan: view(db, c, clan, id), push });
    },
    role(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const target = typeof body.id === 'string' && UUID.test(body.id) ? body.id.toLowerCase() : null; if (!target) throw bad('invalid_player');
      const role = body.role === 'deputy' || body.role === 'member' || body.role === 'leader' ? body.role : null; if (!role) throw bad('invalid_role');
      const { s, id } = kit.enter(db, session), push: PushList = [];
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (!clan) return no('no_clan', 'You are not in a clan.');
      const next = roleChange(clan, id, target, role, c.players[target]?.ai === 1);
      if (!next.ok) return no(next.code, next.reason);
      clan.leader = next.clan.leader; clan.deputies = next.clan.deputies;
      const conv = s.convs[clan.room]; if (conv) conv.owner = clan.leader;
      const name = s.players[target]?.name ?? 'A member';
      say(s, clan, role === 'leader' ? `${name} now leads the clan.` : role === 'deputy' ? `${name} is now a deputy.` : `${name} is a member again.`, push);
      return yes('role', { clan: view(db, c, clan, id), push });
    },
    edit(db: Db, session: SessionRecord, body: Record<string, unknown>) {
      const { s, id } = kit.enter(db, session), push: PushList = [];
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (!clan) return no('no_clan', 'You are not in a clan.');
      if (clan.leader !== id) return no('leader_only', 'Only the clan leader can do that.');
      if (body.name !== undefined) {
        const name = cleanClanName(body.name); if (!name) throw bad('invalid_clan_name');
        const refused = kit.mutedRefusal(id) ?? kit.screened(name, 'A clan name', true); if (refused) return refused;
        if (nameKey(name) !== nameKey(clan.name)) { if (Object.hasOwn(c.names, nameKey(name))) return no('name_taken', 'A clan already has that name.'); delete c.names[nameKey(clan.name)]; c.names[nameKey(name)] = clan.id; }
        clan.name = name; const conv = s.convs[clan.room]; if (conv) conv.name = name;
      }
      if (body.colour !== undefined) { const colour = colourOf(body.colour); if (!colour) throw bad('invalid_colour'); clan.colour = colour.id; }
      if (body.city !== undefined) { if (typeof body.city !== 'string' || !ctx.cityIds.some((x) => x === body.city)) throw bad('invalid_city'); clan.city = body.city; }
      say(s, clan, 'The clan details were updated.', push);
      return yes('edited', { clan: view(db, c, clan, id), push });
    },
    /** Replace the invite code (the old one stops working). Leader or a deputy. */
    newCode(db: Db, session: SessionRecord) {
      const { id } = kit.enter(db, session);
      const c = clansOf(ctx, db), clan = myClan(c, id);
      if (!clan) return no('no_clan', 'You are not in a clan.');
      if (roleOf(clan, id) === 'member') return no('leader_only', 'Only the leader or a deputy can do that.');
      if (!ctx.allow(`clans:code:${id}`, 6, 3600000)) return no('rate_limited', 'Wait a little before changing the code again.');
      const code = freshCode(c); if (!code) return no('busy', 'Try again in a moment.');
      delete c.codes[clan.code]; clan.code = code; c.codes[code] = clan.id;
      return yes('code', { clan: view(db, c, clan, id) });
    },
    /** Claim the last war's prize: game money, once, paid by the wallet's server-only credit (its own balance limit applies). */
    prize(db: Db, session: SessionRecord, city: string) {
      const { id } = kit.enter(db, session);
      const c = clansOf(ctx, db), clan = myClan(c, id), rec = c.players[id];
      if (!clan || !rec) return no('no_clan', 'You are not in a clan.');
      if (isAgent(session)) return no('agent_role', 'AI-played characters are not paid prizes.');
      const last = clan.last;
      if (!last?.prize || !last.prize.ids.includes(id)) return no('no_prize', 'There is no prize for you.');
      if (rec.prize === last.n) return yes('claimed', { amount: 0, duplicate: true as const });
      const life = ctx.settle(session, city);
      const result = ctx.act(life, { type: 'wallet.bonus', payload: { amount: last.prize.amount, reason: `Clan war prize: ${clan.name}` }, cityId: city, stateGuard: 'The prize marker on the clan player record is written in this same transaction' });
      if (!result.ok) return no(result.code, result.reason ?? 'The prize could not be paid right now.');
      rec.prize = last.n;
      return yes('claimed', { amount: last.prize.amount });
    },
  };
}
