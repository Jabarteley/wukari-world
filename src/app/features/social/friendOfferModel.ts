// Friendship after shared play: WHEN the one compact "add as friend / small gift / invite" card is shown, and the words on it. Pure, so it is
// tested without a browser. The server decides WHO may be offered after a table game (server/social/friend-offers.ts: not friends, not
// blocked either way, not yourself) and sends that list with the result; after five minutes together in room voice the browser finds the
// people itself and asks the server's profile before showing a card. Either way the friend request, the gift and the invitation are
// checked by their own routes as ever: this file only keeps the card from being shown twice.
//
//   once per pair per game     a game's card is shown for its match id once; a reconnect that sends the same result again shows nothing
//   not now                    dismissing a card (or pressing "Not now") keeps that person off every card for a day
//   once per pair per day      the voice offer, however long two people stay
//   five minutes in voice      FriendTimer: both in the voice circle without a break
import type { FriendOffer } from '../../../types/growth.ts'
import { money } from '../../ui/format.ts'

export const DAY_MS = 86400000
/** How long two people are in the same voice circle before the voice offer. */
export const VOICE_TOGETHER_MS = 5 * 60000
/** The small gift on the card: game naira, inside the gift rule (src/game/content/npcs.ts TRANSFER_LIMITS: ₦100 to ₦5,000). */
export const GIFT_AMOUNT = 200
const KEEP = 40

/** What this browser remembers (localStorage, nothing sent anywhere): games already offered, people told "not now", people offered after voice. */
export interface OfferMemory { shown: string[]; notNow: Record<string, number>; voice: Record<string, number> }
export const freshMemory = (): OfferMemory => ({ shown: [], notNow: {}, voice: {} })
const numbers = (value: unknown): Record<string, number> => (value !== null && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))) : {})
/** A memory read back from storage (anything may be in there): only what is the right shape is kept, and only the newest of each. */
export function cleanMemory(raw: unknown, now: number): OfferMemory {
  const from = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const recent = (list: Record<string, number>): Record<string, number> => Object.fromEntries(Object.entries(list).filter(([, at]) => now - at < DAY_MS).sort((a, b) => b[1] - a[1]).slice(0, KEEP));
  return { shown: Array.isArray(from.shown) ? from.shown.filter((item): item is string => typeof item === 'string').slice(-KEEP) : [], notNow: recent(numbers(from.notNow)), voice: recent(numbers(from.voice)) };
}

/** The people of a finished game to put on a card: none if this game's card was already shown, and nobody who was told "not now" in the last day. */
export function tableCard(memory: OfferMemory, offers: { match: string; people: readonly FriendOffer[] } | null | undefined, now: number): FriendOffer[] {
  if (!offers || memory.shown.includes(offers.match)) return [];
  return offers.people.filter((person) => !(now - (memory.notNow[person.id] ?? -Infinity) < DAY_MS));
}
/** The card for this game was put up. */
export function markGameShown(memory: OfferMemory, match: string): void { if (!memory.shown.includes(match)) memory.shown = [...memory.shown, match].slice(-KEEP); }
/** "Not now" (or closing the card) for these people: not offered again for a day. */
export function markNotNow(memory: OfferMemory, ids: readonly string[], now: number): void { for (const id of ids) memory.notNow[id] = now; }
/** The voice offer for these people was put up: not again today. */
export function markVoiceShown(memory: OfferMemory, ids: readonly string[], now: number): void { for (const id of ids) memory.voice[id] = now; }
/** May this person be offered after voice now: not offered after voice in the last day, and not told "not now" in the last day. */
export const voiceDue = (memory: OfferMemory, id: string, now: number): boolean => !(now - (memory.voice[id] ?? -Infinity) < DAY_MS) && !(now - (memory.notNow[id] ?? -Infinity) < DAY_MS);

/**
 * Who has been in the voice circle with the player for five minutes without a break. Call `note` on every look with who is in voice now
 * (while the player is themselves in voice; otherwise with an empty list). Someone who left starts again when they return.
 */
export class FriendTimer {
  private since = new Map<string, number>();
  /** The ids that have just reached five minutes together (each is returned once, then forgotten until they leave and return). */
  note(now: number, inVoice: readonly string[]): string[] {
    const here = new Set(inVoice), ready: string[] = [];
    for (const id of [...this.since.keys()]) if (!here.has(id)) this.since.delete(id);
    for (const id of here) {
      const began = this.since.get(id);
      if (began === undefined) this.since.set(id, now);
      else if (began !== Infinity && now - began >= VOICE_TOGETHER_MS) { ready.push(id); this.since.set(id, Infinity); }
    }
    return ready;
  }
}

// ---- words ---------------------------------------------------------------------------------------------

export const CARD_TITLE = { table: 'Good game', voice: 'Nice talking' } as const;
/** "Ada and Bola", "Ada, Bola and 1 more". */
export function namesOf(people: readonly Pick<FriendOffer, 'name'>[]): string {
  const names = people.map((person) => person.name);
  return names.length <= 2 ? names.join(' and ') : `${names.slice(0, 2).join(', ')} and ${names.length - 2} more`;
}
export const cardLine = (source: 'table' | 'voice', people: readonly Pick<FriendOffer, 'name'>[]): string => (source === 'table' ? `You played with ${namesOf(people)}. Stay in touch?` : `You have been talking with ${namesOf(people)}. Stay in touch?`);
export const LATER = 'Gifts and room invitations open once you are friends.';
export const giftLabel = (amount: number): string => `Send ${money(amount)}`;
/** What the row says after Add as friend. */
export const addedLine = (code: string): string => (code === 'accepted' || code === 'already_friends' ? 'You are friends' : 'Request sent');
/** An AI-played character may be offered like anyone, always with its mark; the card says so in words too. */
export const AI_NOTE = 'AI-played';
/** The ladder, as information: what closeness brings (the gates are in the server: friends only for gifts and home visits; Bae from 40 points). */
export const LADDER: readonly { tier: string; brings: string }[] = [
  { tier: 'Everyone', brings: 'say hello, chat a little, ring if they allow it' },
  { tier: 'Friends', brings: 'chat freely, send gifts, ask to visit their home' },
  { tier: 'Paddy Mi', brings: 'ask to be their Bae' },
];

/** "Thanks and gifts" on a profile: counts only, never an amount. */
export const thanksLine = (thanks: { given: number; got: number }): string => `Thanks and gifts: gave ${thanks.given}, got ${thanks.got}.`
/** One line of the recent list: "Gave Ada a gift" / "Got a gift from Ada". */
export const thanksItem = (item: { dir: 'gave' | 'got'; name: string }): string => (item.dir === 'gave' ? `Gave ${item.name} a gift` : `Got a gift from ${item.name}`)
/** The ladder as one sentence under the closeness bar. */
export const ladderLine = (): string => LADDER.map((rung) => `${rung.tier}: ${rung.brings}`).join(' · ')
