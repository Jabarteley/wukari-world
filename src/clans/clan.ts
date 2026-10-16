/**
 * OWNER: social
 * CLANS, the pure rules (docs/CLANS.md). A clan is a small group of friends with a name, a colour (the aso-ebi list of Phase 16), a home
 * city, one leader, up to two deputies and a clan room (a group chat the clan owns). Joining is by a six-letter code or the invite card.
 * Nothing here reads a clock, a store or the DOM: the server (server/clans/) and the tests call these functions.
 */
import { COLOURS, colourOf } from '../festivals/party.ts';

export { COLOURS, colourOf };
export const CLAN = Object.freeze({ size: 25, sizeMin: 5, sizeMax: 50, deputies: 2, nameMin: 3, nameMax: 20, codeLength: 6, warMin: 3, kickBanMs: 24 * 3600000, createPerDay: 2, joinPerHour: 10 });
/** Six letters with nothing that can be misread aloud (no I, O, L). */
export const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
export type ClanRole = 'leader' | 'deputy' | 'member';
export interface Refusal { ok: false; code: string; reason: string }
const no = (code: string, reason: string): Refusal => ({ ok: false, code, reason });

/** A clan name's shape: letters, digits, single spaces, apostrophes and hyphens, 3 to 20 characters. The text filter is the server's second check. */
export function cleanClanName(value: unknown): string | null {
  const text = typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : '';
  return text.length >= CLAN.nameMin && text.length <= CLAN.nameMax && /^[\p{L}\p{N}][\p{L}\p{N} '’-]*$/u.test(text) && /\p{L}/u.test(text) ? text : null;
}
/** The key two names are compared by, so "Eko  Lions" and "eko lions" are one name. */
export const nameKey = (name: string): string => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
/** A code as typed: upper-case, spaces and dashes dropped. Null when it is not six allowed letters. */
export function cleanCode(value: unknown): string | null {
  const text = typeof value === 'string' ? value.toUpperCase().replace(/[\s-]+/g, '') : '';
  return text.length === CLAN.codeLength && [...text].every((c) => CODE_LETTERS.includes(c)) ? text : null;
}
/** A code from random bytes (each 0..255). */
export const codeFrom = (bytes: readonly number[]): string => Array.from({ length: CLAN.codeLength }, (_, i) => CODE_LETTERS[(bytes[i] ?? 0) % CODE_LETTERS.length]).join('');

/** What a clan record holds that the rules need. */
export interface ClanCore { leader: string; deputies: string[]; members: string[]; kicked?: Record<string, number> }
export const roleOf = (clan: ClanCore, id: string): ClanRole | null => (clan.leader === id ? 'leader' : clan.deputies.includes(id) ? 'deputy' : clan.members.includes(id) ? 'member' : null);

export interface Who { id: string; agent: boolean }
/** May this player join? `cap` is the admin's clan size. */
export function joinBlock(clan: ClanCore, who: Who, inClan: boolean, now: number, cap: number): Refusal | null {
  if (inClan) return no('already_in_clan', 'You are already in a clan. Leave it first.');
  if (clan.members.includes(who.id)) return no('already_in_clan', 'You are already in this clan.');
  if ((clan.kicked?.[who.id] ?? 0) > now) return no('recently_removed', 'You cannot rejoin this clan yet. Try again tomorrow.');
  if (clan.members.length >= cap) return no('clan_full', `This clan is full (${cap} people).`);
  return null;
}
/** The leader's actions on another member. */
export function kickBlock(clan: ClanCore, by: string, target: string): Refusal | null {
  if (clan.leader !== by) return no('leader_only', 'Only the clan leader can do that.');
  if (target === by) return no('self', 'Use Leave to go yourself.');
  return clan.members.includes(target) ? null : no('not_member', 'That person is not in the clan.');
}
/** Make `target` a deputy, a plain member again, or the leader (the old leader becomes a deputy if there is room, else a member). Agents never lead. */
export function roleChange(clan: ClanCore, by: string, target: string, role: ClanRole, targetIsAgent: boolean): { ok: true; clan: ClanCore } | Refusal {
  if (clan.leader !== by) return no('leader_only', 'Only the clan leader can do that.');
  if (!clan.members.includes(target) || target === by) return no('not_member', 'Pick another member of the clan.');
  if (targetIsAgent && role !== 'member') return no('agent_role', 'An AI-played character cannot lead or help lead a clan.');
  const next: ClanCore = { ...clan, deputies: clan.deputies.filter((d) => d !== target) };
  if (role === 'deputy') { if (clan.deputies.length >= CLAN.deputies && !clan.deputies.includes(target)) return no('deputies_full', `A clan has ${CLAN.deputies} deputies at most.`); if (!clan.deputies.includes(target)) next.deputies = [...next.deputies, target]; else next.deputies = [...clan.deputies]; }
  if (role === 'leader') { next.leader = target; if (next.deputies.length < CLAN.deputies) next.deputies = [...next.deputies, by]; }
  return { ok: true, clan: next };
}
/** After a member leaves or is removed: the new clan, or null when nobody is left. The leader's place goes to the first deputy, else the longest-standing human member. */
export function withoutMember(clan: ClanCore, id: string, agents: ReadonlySet<string>, kickUntil?: number): ClanCore | null {
  const members = clan.members.filter((m) => m !== id);
  if (!members.length) return null;
  const next: ClanCore = { leader: clan.leader, deputies: clan.deputies.filter((d) => d !== id), members, kicked: { ...clan.kicked } };
  if (kickUntil !== undefined) next.kicked![id] = kickUntil;
  if (clan.leader === id) {
    const heir = [...next.deputies, ...members].find((m) => !agents.has(m));
    if (!heir) return null; // only AI-played characters are left: the clan ends
    next.leader = heir; next.deputies = next.deputies.filter((d) => d !== heir);
  }
  return next;
}
