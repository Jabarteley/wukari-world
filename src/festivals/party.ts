/**
 * OWNER: social
 * OWAMBE PARTIES: a host throws a party in their own home (a visit, server/social/visit.ts) and picks a dress code, an aso-ebi
 * colour. The host may name one guest MC and one guest DJ; the guests see those labels beside the names. Anyone inside may
 * "spray": a small moment in the house chat, no money moves (the Square's spraying, systems/events.ts, stays the only place money is
 * sprayed, and that is game money only). The rules are here, pure, for the server (server/social/party.ts), the panel and the tests.
 *
 * HOOKS, not built yet: the DJ role is a label until the game has a music selector for a room (the DJ would pick it then); the
 * gist ledger (Phase 8) may one day note a big party.
 *
 * UPGRADED (WOW-PLAN Phase 7, docs/FESTIVALS.md): in the 3D home every guest and the host wear the party's aso-ebi colour while it is on
 * (cosmetic, only in this house, nothing bought or saved: `asoEbiLook`); a jollof table stands in the room; a spray sends naira notes
 * flying in the scene (`noteBurst`, a picture only: the home party's spray stays a counted cheer, no money moves); and at the end the
 * host (or anyone inside) makes a "who came" card from the names of everyone who came (`came`, `whoCameWords`).
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
export const PARTY = Object.freeze({ title: 40, minutes: 120, sprayPerGuest: 5, sprayEveryMs: 4000, roles: ['mc', 'dj'] as const, cameMax: 30 });
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
export interface PartyRecord { title: string; colour: string; startedAt: number; until: number; mc?: string; dj?: string; sprays: number; sprayed?: Record<string, number>; /** Everyone who came in while it was on (public ids, the first PARTY.cameMax). */ came?: string[] }
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

/** Note that these people came (a guest let in, anyone who sprayed or was named): kept once each, the first PARTY.cameMax. */
export function noteCame(party: PartyRecord, ...ids: string[]): void {
  const list = (party.came ||= []);
  for (const id of ids) if (id && !list.includes(id) && list.length < PARTY.cameMax) list.push(id);
}

/** The party as `viewer` sees it. `inside` answers a guest id with their card, or null when they have left (a role then lapses); `name` gives anyone's shown name, for the "who came" list. */
export function partyView(party: PartyRecord, viewer: string, inside: (id: string) => PlayerRef | null, name?: (id: string) => string): PartyView {
  const colour = colourOf(party.colour) ?? COLOURS[0]!;
  return { title: party.title, colour: { ...colour }, until: party.until, mc: party.mc ? inside(party.mc) : null, dj: party.dj ? inside(party.dj) : null, sprays: party.sprays, sprayLeft: Math.max(0, PARTY.sprayPerGuest - (party.sprayed?.[viewer] ?? 0)),
    ...(name ? { came: (party.came ?? []).map(name).filter(Boolean).slice(0, PARTY.cameMax) } : {}) };
}

// ---- the upgrade: dressed guests, flying notes, the "who came" card -----------------------------------------------------------------
/**
 * A look in the party's aso-ebi: the top in the party colour, in aso-oke cloth. Everything else (body, hair, skin, the bottoms) stays the
 * person's own. Cosmetic and local: only the scene of this house draws it, nothing is bought or saved. `look` is any look object (or a
 * normalised one); the scene normalises the result as usual.
 */
export function asoEbiLook<T extends object>(look: T, hex: string): T & { outfitColor: string; fabric: 'asooke' } {
  return { ...look, outfitColor: /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : COLOURS[0]!.hex, fabric: 'asooke' };
}

/** Naira notes in a spray: how many, how long they fly, their colours (the green, brown and pink of the notes, not any one denomination). */
export const NOTES = Object.freeze({ count: 16, seconds: 2.4, colours: ['#7aa66b', '#b38b5d', '#d98ba5', '#6f9fb0'] as const, rise: 2.2, spread: 1.4 });
export interface Note { x: number; z: number; vx: number; vy: number; vz: number; spin: number; colour: string; delay: number }
/** The notes of one spray, from a seed (the same seed, the same flight). Positions are relative to where the spray starts, in metres. */
export function noteBurst(seed: number, count: number = NOTES.count): Note[] {
  let s = (seed >>> 0) || 1
  const rand = (): number => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 };
  return Array.from({ length: Math.max(0, Math.min(40, count)) }, (_, i) => {
    const angle = rand() * Math.PI * 2, speed = 0.4 + rand() * NOTES.spread;
    return { x: (rand() - 0.5) * 0.4, z: (rand() - 0.5) * 0.4, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: NOTES.rise * (0.7 + rand() * 0.6), spin: (rand() - 0.5) * 12, colour: NOTES.colours[i % NOTES.colours.length]!, delay: rand() * 0.35 };
  });
}
/** Where a note is `t` seconds after the spray (it rises, slows, drifts down and settles on the floor), or null before its delay. */
export function noteAt(note: Note, t: number): { x: number; y: number; z: number; turn: number } | null {
  const u = t - note.delay;
  if (u < 0) return null;
  const drag = Math.min(u, 1.2), fall = Math.max(0, u - 0.5);
  const y = Math.max(0.02, 1.4 + note.vy * drag - 0.9 * drag * drag - 0.35 * fall * fall);
  return { x: note.x + note.vx * drag, y, z: note.z + note.vz * drag, turn: note.spin * u };
}

/** The words of the "who came" card: a headline, a line of facts and up to twelve names (the rest counted). */
export function whoCameWords(party: Pick<PartyView, 'title' | 'colour' | 'sprays'> & { came?: string[] }, host: string): { headline: string; facts: string; names: string[]; more: number } {
  const came = (party.came ?? []).filter((name) => name && name !== host), shown = came.slice(0, 12);
  return { headline: party.title, facts: `${host}'s owambe · ${came.length} came · ${party.sprays} ${party.sprays === 1 ? 'spray' : 'sprays'} · ${party.colour.label} aso-ebi`, names: shown, more: came.length - shown.length };
}
