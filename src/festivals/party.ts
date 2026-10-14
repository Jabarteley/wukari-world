/**
 * OWNER: social
 * OWAMBE PARTIES: a host throws a party in their own home (a visit, server/social/visit.ts) and picks a dress code, an aso-ebi
 * colour. The host may name one guest MC and one guest DJ; the guests see those labels beside the names. Anyone inside may
 * "spray": a small moment in the house chat, no money moves (the Square's spraying, systems/events.ts, stays the only place money is
 * sprayed, and that is game money only). The rules are here, pure, for the server (server/social/party.ts), the panel and the tests.
 *
 * HOOKS, not built yet: the DJ role is a label until the game has a music selector for a room (the DJ would pick it then); the
 * gist ledger (Phase 8) may one day note a big party.
 */

import type { PlayerRef } from '../types/protocol.ts';
import type { PartyView } from '../types/social.ts';

export interface Colour { id: string; label: string; hex: string }
/** Aso-ebi colours: bright, easy to tell apart, none with a meaning for one group. */
export const COLOURS: readonly Colour[] = Object.freeze([
  { id: 'green', label: 'Green', hex: '#1b8a5a' }, { id: 'gold', label: 'Gold', hex: '#d9a21b' }, { id: 'royal', label: 'Royal blue', hex: '#2a52be' },
  { id: 'red', label: 'Red', hex: '#c8302f' }, { id: 'purple', label: 'Purple', hex: '#7b3fa0' }, { id: 'pink', label: 'Pink', hex: '#d6628f' },
  { id: 'teal', label: 'Teal', hex: '#1c9aa0' }, { id: 'orange', label: 'Orange', hex: '#e8772e' }, { id: 'white', label: 'White', hex: '#f1ede4' },
  { id: 'black', label: 'Black', hex: '#2b2b2f' },
]);
export const PARTY = Object.freeze({ title: 40, minutes: 120, sprayPerGuest: 5, sprayEveryMs: 4000, roles: ['mc', 'dj'] as const });
export type PartyRole = (typeof PARTY.roles)[number];
export const ROLE_LABEL: Readonly<Record<PartyRole, string>> = Object.freeze({ mc: 'MC', dj: 'DJ' });

export const colourOf = (id: unknown): Colour | null => COLOURS.find((item) => item.id === id) ?? null;
export const isRole = (value: unknown): value is PartyRole => PARTY.roles.includes(value as PartyRole);
/** A party title: plain text, or the default. */
export function cleanTitle(value: unknown, fallback = 'Owambe at my place'): string | null {
  if (value === undefined || value === null || value === '') return fallback;
  const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
  return text.length >= 2 && text.length <= PARTY.title && !/[\u0000-\u001f\u007f<>]/.test(text) && !/https?:|www\./i.test(text) ? text : null;
}

/** What is stored on a house (server/types.ts HouseRecord.party). */
export interface PartyRecord { title: string; colour: string; startedAt: number; until: number; mc?: string; dj?: string; sprays: number; sprayed?: Record<string, number> }
/** Is the party still on? */
export const partyOn = (party: PartyRecord | undefined, now: number): party is PartyRecord => party !== undefined && party.until > now;

/**
 * Who holds a role after the host names `guest` for `role` (null clears it). A guest holds one role at a time: naming them for the
 * other role takes the first away. Only people inside can be named. Returns the new { mc, dj } or a reason.
 */
export function assignRole(party: Pick<PartyRecord, 'mc' | 'dj'>, role: PartyRole, guest: string | null, inside: readonly string[]): { mc?: string; dj?: string } | { reason: string } {
  const next: { mc?: string; dj?: string } = { ...(party.mc ? { mc: party.mc } : {}), ...(party.dj ? { dj: party.dj } : {}) };
  if (guest === null) { delete next[role]; return next; }
  if (!inside.includes(guest)) return { reason: 'They need to be inside to be the ' + ROLE_LABEL[role] + '.' };
  for (const other of PARTY.roles) if (next[other] === guest) delete next[other];
  next[role] = guest;
  return next;
}
/** May this person spray now? Counted per guest per party; the spacing (PARTY.sprayEveryMs) is the server's rate limit. */
export function maySpray(party: PartyRecord, who: string, now: number): { ok: true } | { ok: false; reason: string } {
  if (!partyOn(party, now)) return { ok: false, reason: 'The party is over.' };
  if ((party.sprayed?.[who] ?? 0) >= PARTY.sprayPerGuest) return { ok: false, reason: `You have sprayed ${PARTY.sprayPerGuest} times. Let the others have a turn.` };
  return { ok: true };
}

/** The party as `viewer` sees it. `inside` answers a guest id with their card, or null when they have left (a role then lapses). */
export function partyView(party: PartyRecord, viewer: string, inside: (id: string) => PlayerRef | null): PartyView {
  const colour = colourOf(party.colour) ?? COLOURS[0]!;
  return { title: party.title, colour: { ...colour }, until: party.until, mc: party.mc ? inside(party.mc) : null, dj: party.dj ? inside(party.dj) : null, sprays: party.sprays, sprayLeft: Math.max(0, PARTY.sprayPerGuest - (party.sprayed?.[viewer] ?? 0)) };
}
