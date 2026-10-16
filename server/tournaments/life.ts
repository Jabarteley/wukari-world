/**
 * OWNER: agents (the agent arena, docs/AGENT-ARENA.md)
 * LIFE CUPS: what only Allworld can measure. Each figure is read from the game's own records, never from anything an agent reports, and a cup
 * counts what happened AFTER the agent entered, so every agent starts from nothing:
 *
 *   stall      takings from PEOPLE at the agent's stall since entering, counted at the sale (noteShopSale, called by server/business/service.ts)
 *   friends    new friendships since entering, each with a real person on a different account (realFriends)
 *   missions   missions collected since entering (the lives' own lifetime counts, every city added up)
 *   office     seats held on the agents' ballot now, less the seats held when entering
 *
 * RULES AGAINST GAMING (what is stopped and what is not is listed in docs/AGENT-ARENA.md). A buyer or a friend counts only when it is a person:
 * a character with an account at least a day old, not an agent character and not played by an agent key now, not the owner's own, sharing no
 * device with the agent or its owner. A friend counts once per account. NOT stopped: two different people agreeing to buy at each other's agents'
 * stalls (the stall rules cap one buyer at ₦5,000 a stall a day) or to befriend each other's agents.
 */
import { sha256Hex } from '../../src/game/util.ts';
import { accountOfSession } from '../admin/gate.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import type { AgentsCollection } from '../agents/service.ts';
import { DAY_MS, peekBook, weekOf } from './book.ts';
import type { Entrant, LifeCategory } from './book.ts';

type Json = Record<string, unknown>;
type Core = Pick<RouteContext, 'core'>;
const isObject = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);

/** The one-way key of the person behind an agent: equal keys mean the same owner. */
export const ownerKeyOf = (account: string): string => sha256Hex(`allworld-arena-owner-v1|${account}`).slice(0, 32);

/** The owning account of a character: an agent character's owner, or the account a person's character belongs to. '' when there is none. */
export function accountOf(ctx: Core, db: Db, id: string): string {
  const agents = db.agents as AgentsCollection | undefined;
  const char = isObject(agents?.chars) && Object.hasOwn(agents.chars, id) ? agents.chars[id] : undefined;
  if (char) return char.account;
  const session = ctx.core.sessionByPublicId(db, id);
  return session ? accountOfSession(db, session)?.id ?? '' : '';
}
/** The device hashes a character, and the character its owner plays, have used. */
function devicesOf(ctx: Core, db: Db, id: string): string[] {
  const players = db.growth?.players, account = accountOf(ctx, db, id), owner = account ? db.accounts?.[account]?.publicId : undefined;
  return [...(players?.[id]?.devices ?? []), ...(owner && owner !== id ? players?.[owner]?.devices ?? [] : [])];
}
/** Are two characters one person's, by account or by a device? */
export function related(ctx: Core, db: Db, a: string, b: string): boolean {
  if (a === b) return true;
  const x = accountOf(ctx, db, a), y = accountOf(ctx, db, b);
  if (x && y && x === y) return true;
  const mine = new Set(devicesOf(ctx, db, a));
  return mine.size > 0 && devicesOf(ctx, db, b).some((hash) => mine.has(hash));
}
/** The account of `id` when it is a PERSON who may count for `agent` (see the header), else null. */
export function personFor(ctx: Core, db: Db, agent: string, id: string, now: number): string | null {
  const session = ctx.core.sessionByPublicId(db, id) as SessionRecord | undefined;
  if (!session || session.agent) return null;
  const agents = db.agents as AgentsCollection | undefined;
  if (isObject(agents?.chars) && Object.hasOwn(agents.chars, id)) return null;
  const account = accountOfSession(db, session);
  if (!account || account.createdAt > now - DAY_MS || account.id === accountOf(ctx, db, agent)) return null;
  return related(ctx, db, agent, id) ? null : account.id;
}

/** The friends an agent made from `since` until `until`, each a real person on a different account (one per account). */
export function realFriends(ctx: Core, db: Db, id: string, since: number, now: number, until = now): string[] {
  const players = (db.social as unknown as { players?: Record<string, { friends?: Record<string, number> } | undefined> } | undefined)?.players;
  const mine = players?.[id]?.friends ?? {}, seen = new Set<string>(), found: string[] = [];
  for (const [friend, at] of Object.entries(mine)) {
    if (typeof at !== 'number' || at < since || at > until) continue;
    const account = personFor(ctx, db, id, friend, now);
    if (!account || seen.has(account)) continue;
    seen.add(account); found.push(friend);
  }
  return found;
}

/** The seats each character holds now on the agents' ballot. */
export type Holders = (db: Db) => Map<string, number>;

/** Missions collected in all of a character's cities. */
function missionsOf(ctx: Core, db: Db, id: string): number {
  const session = ctx.core.sessionByPublicId(db, id) as SessionRecord | undefined;
  let total = 0;
  for (const city of Object.values(session?.cities ?? {})) { const n = city?.state?.missions?.claimed; if (typeof n === 'number' && Number.isSafeInteger(n) && n > 0) total += n; }
  return total;
}

/** The figure a contest starts from (`base`): a lifetime count for missions and offices; nothing for friends and stalls, which count from the entry. */
export function baseOf(ctx: Core, db: Db, category: LifeCategory, id: string, holders: Holders): number {
  if (category === 'missions') return missionsOf(ctx, db, id);
  if (category === 'office') return holders(db).get(id) ?? 0;
  return 0;
}
/** Categories whose records carry no time, so a late settlement reads the score taken before the end instead. */
export const SNAPPED: readonly LifeCategory[] = ['missions', 'office'];
/** An entrant's score: what happened from entering until `until` (friends and stall takings carry their time; missions and offices are read now). */
export function scoreOf(ctx: Core, db: Db, category: LifeCategory, entrant: Pick<Entrant, 'id' | 'enteredAt' | 'base' | 'people'>, now: number, holders: Holders, until = now): number {
  switch (category) {
    case 'stall': return Math.max(0, entrant.people);
    case 'friends': return realFriends(ctx, db, entrant.id, entrant.enteredAt, now, until).length;
    case 'missions': return Math.max(0, missionsOf(ctx, db, entrant.id) - entrant.base);
    case 'office': return Math.max(0, (holders(db).get(entrant.id) ?? 0) - entrant.base);
  }
}

/**
 * A PERSON's purchase at a stall (server/business/service.ts, inside its transaction, after the sale): when the stall's owner is in a stall cup
 * still running, or in a stall challenge still running, and the buyer counts as a person for it, the amount is added to its takings from people.
 */
export function noteShopSale(ctx: Pick<RouteContext, 'core' | 'now'>, db: Db, owner: string, buyer: string, amount: number): void {
  const book = peekBook(db);
  if (!book || !Number.isSafeInteger(amount) || amount <= 0) return;
  const now = ctx.now();
  let person: string | null | undefined;
  const counts = (): boolean => (person === undefined ? (person = personFor(ctx, db, owner, buyer, now)) : person) !== null;
  for (const cup of Object.values(book.cups)) {
    if ((cup.status !== 'open' && cup.status !== 'running') || cup.key !== 'life-stall' || now >= weekOf(cup.week).end) continue;
    const entry = cup.entrants.find((item) => item.id === owner);
    if (entry && counts()) entry.people += amount;
  }
  for (const c of Object.values(book.challenges)) {
    if (c.status !== 'playing' || c.key !== 'stall' || !c.life || !c.to || now >= c.life.end) continue;
    const side = c.from.id === owner ? 0 : c.to.id === owner ? 1 : null;
    if (side !== null && counts()) c.life.people[side] += amount;
  }
}
