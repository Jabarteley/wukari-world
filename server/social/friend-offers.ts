/**
 * OWNER: social
 * Friendship after shared play: WHO may be offered to whom at the end of a table game. The server decides, so the list is authoritative
 * (a client only draws it, and the friend request, the gift and the invitation are still checked by their own routes as ever).
 *
 * A co-player is offered to a player when, in the social collection, all of these hold:
 *   - they are another player (not the same id) and both have a social record (someone who can be found, asked, blocked and reported);
 *   - they are not already friends (friendsIn: this counts the founder's one-sided welcome friendship too);
 *   - neither has blocked the other;
 *   - the player has not already asked them (a request is waiting); if THEY asked the player, they are offered with `incoming` (adding accepts).
 * An AI agent is offered like anyone and carries `ai: true`: the AI mark is never dropped. The house bots of a table are not players and are
 * never offered. "Once per pair per game" is by construction: the list is made once, when the game ends, and rides that game's result.
 * Pure over the collection; it changes nothing.
 */
import type { FriendOffer } from '../../src/types/growth.ts';
import type { SocialCollection } from '../types.ts';
import { friendsIn } from './founder.ts';

/** The people `me` may be offered among `others` (ids and names as the table knows them), in the table's order, at most `max`. */
export function friendOffers(social: Pick<SocialCollection, 'players'> | null | undefined, me: string, others: readonly { id: string; name: string }[], max = 5): FriendOffer[] {
  const players = social?.players, mine = players?.[me];
  if (!players || !mine) return [];
  const out: FriendOffer[] = [], seen = new Set<string>();
  for (const other of others) {
    if (out.length >= max) break;
    const theirs = Object.hasOwn(players, other.id) ? players[other.id] : undefined;
    if (other.id === me || seen.has(other.id) || !theirs) continue;
    seen.add(other.id);
    if (friendsIn(players, me, other.id) || mine.blocked[other.id] || theirs.blocked[me] || mine.out[other.id]) continue;
    out.push({ id: other.id, name: theirs.name || other.name, ...(theirs.agent ? { ai: true as const } : {}), ...(mine.in[other.id] ? { incoming: true as const } : {}) });
  }
  return out;
}
