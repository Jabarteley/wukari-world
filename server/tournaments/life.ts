/**
 * LIFE CUPS: what only Allworld can measure (docs/AGENT-ARENA.md). Each figure is read from the game's own records, never from anything an
 * agent reports, and a cup counts the CHANGE since the agent entered (`base`), so every agent starts from nothing:
 *
 *   stall      the shop's lifetime takings (business record), less sales to the owner's own other characters or to a shared device
 *   friends    new friendships since entering, each with a real, different account (see `realFriend`)
 *   missions   missions collected (the life's own lifetime count)
 *   office     seats held now on the agents' ballot, less the seats held when entering
 *
 * RULES AGAINST GAMING (what is stopped, and what is not, are listed in docs/AGENT-ARENA.md): a friend counts once per account; the friend must
 * be signed in with an account at least a day old, not an agent character, not the owner, not on a device the owner has used; takings from the
 * owner's other characters are taken off. NOT stopped: two different people agreeing to trade at each other's stalls (the stall rules cap what
 * one buyer may spend, ₦5,000 a shop a day, ₦8,000 a day in all) or to befriend each other's agents.
 */
import { sha256Hex } from '../../src/game/util.ts';
import { businessVenue, shopAt } from '../../src/game/business-model.ts';
import { accountOfSession } from '../admin/gate.ts';
import { characterCity } from '../character.ts';
import type { Db, RouteContext, SessionRecord } from '../types.ts';
import type { AgentsCollection } from '../agents/service.ts';
import { DAY_MS, bookOf } from './book.ts';
import type { Entrant, LifeCategory } from './book.ts';

type Json = Record<string, unknown>;
const isObject = (value: unknown): value is Json => value !== null && typeof value === 'object' && !Array.isArray(value);

/** The one-way key of the person behind an agent: equal keys mean the same owner. */
export const ownerKeyOf = (account: string): string => sha256Hex(`allworld-arena-owner-v1|${account}`);

/** The owning account of a character: an agent character's owner, or the account a person's character belongs to. '' when there is none. */
export function accountOf(ctx: Pick<RouteContext, 'core'>, db: Db, id: string): string {
  const agents = db.agents as AgentsCollection | undefined;
  const char = isObject(agents?.chars) ? agents?.chars[id] : undefined;
  if (char?.account) return char.account;
  const session = ctx.core.sessionByPublicId(db, id);
  return session ? accountOfSession(db, session)?.id ?? '' : '';
}
/** The device hashes a character (and, for an agent, its owner's own character) has used. */
function devicesOf(ctx: Pick<RouteContext, 'core'>, db: Db, id: string): string[] {
  const players = db.growth?.players, account = accountOf(ctx, db, id), owner = account ? db.accounts?.[account]?.publicId : undefined;
  return [...(players?.[id]?.devices ?? []), ...(owner ? players?.[owner]?.devices ?? [] : [])];
}
/** Are two characters one person's, by account or by a device? */
export function related(ctx: Pick<RouteContext, 'core'>, db: Db, a: string, b: string): boolean {
  if (a === b) return true;
  const x = accountOf(ctx, db, a), y = accountOf(ctx, db, b);
  if (x && y && x === y) return true;
  const mine = new Set(devicesOf(ctx, db, a));
  return mine.size > 0 && devicesOf(ctx, db, b).some((hash) => mine.has(hash));
}

/** The friends an agent made since `since`, each a real different account (one per account). */
export function realFriends(ctx: Pick<RouteContext, 'core'>, db: Db, id: string, since: number, now: number): string[] {
  const players = (db.social as unknown as { players?: Record<string, { friends?: Record<string, number> } | undefined> } | undefined)?.players;
  const mine = players?.[id]?.friends ?? {}, seen = new Set<string>(), found: string[] = [], me = accountOf(ctx, db, id);
  for (const [friend, at] of Object.entries(mine)) {
    if (typeof at !== 'number' || at < since) continue;
    const session = ctx.core.sessionByPublicId(db, friend);
    const account = session && !session.agent ? accountOfSession(db, session) : undefined;
    if (!account || account.id === me || seen.has(account.id)) continue;
    if (account.createdAt > now - DAY_MS) continue;
    if (related(ctx, db, id, friend)) continue;
    seen.add(account.id); found.push(friend);
  }
  return found;
}

/** The seats a character holds now on the agents' ballot. */
export type Holders = (db: Db) => Map<string, number>;

/** The lifetime figure for a category, now. The cup's score is this minus the figure when the agent entered (and minus `self` for a stall). */
export function figure(ctx: Pick<RouteContext, 'core'>, db: Db, category: LifeCategory, id: string, now: number, holders: Holders, since = 0): number {
  switch (category) {
    case 'stall': {
      const shop = db.business?.shops?.[id];
      if (!isObject(shop) || !isObject(shop.total)) return 0;
      const at = shopAt(shop as never, now, businessVenue(shop.city, shop.venue));
      return Math.max(0, at.total.takings);
    }
    case 'friends': return realFriends(ctx, db, id, since, now).length;
    case 'missions': {
      const session = ctx.core.sessionByPublicId(db, id) as SessionRecord | undefined;
      const city = session ? characterCity(session) : null;
      return Math.max(0, session && city ? session.cities?.[city]?.state?.missions?.claimed ?? 0 : 0);
    }
    case 'office': return holders(db).get(id) ?? 0;
  }
}
/** An entrant's score in a life cup: the change since entering. Friends are counted from the entry time, so their base is 0. */
export function scoreOf(ctx: Pick<RouteContext, 'core'>, db: Db, category: LifeCategory, entrant: Entrant, now: number, holders: Holders): number {
  const value = figure(ctx, db, category, entrant.id, now, holders, entrant.enteredAt);
  return Math.max(0, category === 'friends' ? value : value - entrant.base - (category === 'stall' ? entrant.self : 0));
}

/**
 * Called by the stall's sale code, inside its transaction, when a PLAYER bought from a stall: if the stall's owner is in a stall cup this week
 * and the buyer is one of the owner's own characters (or shares a device with them), the sale is written off against the entry.
 */
export function noteShopSale(ctx: Pick<RouteContext, 'core'>, db: Db, owner: string, buyer: string, amount: number): void {
  const agents = db.agents as AgentsCollection | undefined;
  if (!agents?.arena || !Number.isSafeInteger(amount) || amount <= 0) return;
  const book = bookOf(agents);
  for (const cup of Object.values(book.cups)) {
    if (cup.status === 'settled' || cup.status === 'void' || cup.key !== 'life-stall') continue;
    const entry = cup.entrants.find((item) => item.id === owner);
    if (entry && related(ctx, db, owner, buyer)) entry.self += amount;
  }
}
