/**
 * OWNER: agents (house agents, docs/HOUSE-AGENTS.md)
 * THE CAST: who the house agents are, where they work and when. Authored data, no real people's names. Portable (no Node imports).
 *
 *   castOf(cityId) → the specs for a city, best first: Lagos has its own six; every other city gets the two of its country's fallback cast
 *                    (a seller and a guide), put in the city's own venues (a market, then the first venue).
 *   How many of them stand in a city is a setting (runner.ts): the first N of this list. The order is therefore the order of importance:
 *   seller, guide, marketer, then the rest.
 *
 * Hours are Lagos time, like every opening hour in the game (src/game/clock.ts).
 */
import { cachedCityContent, cityRules } from '../../src/game/cities/index.ts';
import { countryOfCity } from '../moderation/ai-intercept.ts';
import type { ItemInput } from './haggle.ts';
import { BUSINESS_PRODUCTS } from '../../src/game/content/business.ts';

export type Role = 'seller' | 'guide' | 'marketer' | 'mission' | 'quiz';
export const ROLES: readonly Role[] = ['seller', 'guide', 'marketer', 'mission', 'quiz'];

/** The looks in the game's own vocabulary (src/game/systems/onboarding.ts `checkLook`); the test checks every one. */
export const HOUSE_LOOKS = Object.freeze({
  mama: { body: 'woman', hair: 'gele', outfit: 'owambe', fabric: 'ankara', skin: 'skin-5', hairColor: 'black', outfitColor: 'orange', bottomsColor: 'green', accessories: ['earrings'] },
  auntie: { body: 'woman', hair: 'bun', outfit: 'casual', fabric: 'adire', skin: 'skin-4', hairColor: 'soft-black', outfitColor: 'blue', bottomsColor: 'navy', accessories: ['earrings'] },
  sis: { body: 'woman', hair: 'bun', outfit: 'casual', fabric: 'plain', skin: 'skin-5', hairColor: 'black', outfitColor: 'teal', bottomsColor: 'navy' },
  bro: { body: 'man', hair: 'locs', outfit: 'casual', fabric: 'plain', skin: 'skin-5', hairColor: 'black', outfitColor: 'teal', bottomsColor: 'navy', accessories: ['glasses'] },
  elder: { body: 'man', hair: 'low-cut', outfit: 'kaftan', fabric: 'aso-oke', skin: 'skin-6', hairColor: 'soft-black', outfitColor: 'cream', bottomsColor: 'cream', accessories: ['fila'] },
  youth: { body: 'man', hair: 'low-cut', outfit: 'casual', fabric: 'plain', skin: 'skin-4', hairColor: 'soft-black', outfitColor: 'blue', bottomsColor: 'navy' },
} as const);
export type HouseLook = keyof typeof HOUSE_LOOKS;

export interface Spec {
  /** Stable key, part of the agent's id. */
  key: string
  name: string
  role: Role
  look: HouseLook
  /** Working hours, Lagos time. */
  hours: { open: number; close: number }
  /** Venue ids in order of preference; the first that exists in the city is the post. */
  post: readonly string[]
  /** Where a seller goes for stock before opening ('go to the market'); the post when absent. */
  market?: readonly string[]
  /** Where lunch is eaten; the agent is away for the hour when absent. */
  eatery?: readonly string[]
  /** For a seller: ids of src/game/content/business.ts products, and the least share of the list price each goes down to. */
  items?: readonly { id: string; floorShare?: number }[]
  /** One sentence for the model's role card and the written greeting. */
  card: string
  /** How the character talks: 'pidgin' leans on Nigerian Pidgin in written lines, 'plain' is simple English. */
  voice: 'pidgin' | 'plain'
}

const FABRIC = [{ id: 'ankara', floorShare: 0.85 }, { id: 'adire', floorShare: 0.85 }, { id: 'aso-oke', floorShare: 0.9 }] as const;
const CRAFTS = [{ id: 'basket', floorShare: 0.85 }, { id: 'cap', floorShare: 0.85 }, { id: 'clay-pot', floorShare: 0.9 }] as const;
const FOOD = [{ id: 'local-plate', floorShare: 0.9 }, { id: 'jollof', floorShare: 0.9 }, { id: 'puff-puff', floorShare: 0.9 }] as const;

const LAGOS: readonly Spec[] = Object.freeze([
  { key: 'tolani', name: 'Mama Tolani', role: 'seller', look: 'mama', hours: { open: 9, close: 18 }, post: ['market'], market: ['market'], eatery: ['amala-shitta'], items: FABRIC, voice: 'pidgin',
    card: 'You run a cloth stall in the Lagos market: ankara, adire and aso-oke. You are warm, quick and love a good bargain, but you never sell below your floor.' },
  { key: 'tunji', name: 'Tunji', role: 'guide', look: 'bro', hours: { open: 8, close: 20 }, post: ['park'], eatery: ['amala-shitta'], voice: 'plain',
    card: 'You welcome people to Lagos at Freedom Park and tell them where things are, what is open and how to get around.' },
  { key: 'kofo', name: 'Kofo', role: 'marketer', look: 'auntie', hours: { open: 16, close: 22 }, post: ['park'], eatery: ['amala-shitta'], voice: 'plain',
    card: 'You tell people what is happening tonight in the city and invite them to join in.' },
  { key: 'dayo', name: 'Bro Dayo', role: 'seller', look: 'youth', hours: { open: 11, close: 21 }, post: ['amala-shitta'], market: ['market'], items: FOOD, voice: 'pidgin',
    card: 'You sell plates of food at the amala spot. You are friendly and fair, and you never go below your floor.' },
  { key: 'chinwe', name: 'Aunty Chinwe', role: 'quiz', look: 'sis', hours: { open: 17, close: 21 }, post: ['library'], eatery: ['amala-shitta'], voice: 'plain',
    card: 'You host a short quiz at the library in the evening and cheer everyone on.' },
  { key: 'ade', name: 'Baba Ade', role: 'mission', look: 'elder', hours: { open: 10, close: 17 }, post: ['cchub'], eatery: ['amala-shitta'], voice: 'pidgin',
    card: 'You give out small tasks around the city to people who want to help: a greeting to carry, a friend to bring. You are warm, brief and grateful.' },
]);

const GENERIC: Readonly<Record<string, readonly [Spec, Spec]>> = Object.freeze({
  ng: [
    { key: 'nkechi', name: 'Mama Nkechi', role: 'seller', look: 'mama', hours: { open: 9, close: 18 }, post: ['market', 'main-market'], items: FABRIC, voice: 'pidgin', card: 'You run a cloth stall in the market. You are warm and love a bargain, but you never sell below your floor.' },
    { key: 'chike', name: 'Chike', role: 'guide', look: 'youth', hours: { open: 8, close: 20 }, post: ['park', 'square'], voice: 'pidgin', card: 'You welcome visitors and tell them where things are in town.' },
  ],
  gh: [
    { key: 'efua', name: 'Auntie Efua', role: 'seller', look: 'auntie', hours: { open: 9, close: 18 }, post: ['market', 'main-market'], items: CRAFTS, voice: 'plain', card: 'You run a crafts stall in the market. You are cheerful and fair, and you never sell below your floor.' },
    { key: 'kojo', name: 'Kojo', role: 'guide', look: 'bro', hours: { open: 8, close: 20 }, post: ['park', 'square'], voice: 'plain', card: 'You welcome visitors and tell them where things are in town.' },
  ],
  ke: [
    { key: 'wanjiru', name: 'Mama Wanjiru', role: 'seller', look: 'mama', hours: { open: 9, close: 18 }, post: ['market', 'main-market'], items: CRAFTS, voice: 'plain', card: 'You run a crafts stall in the market. You are kind and fair, and you never sell below your floor.' },
    { key: 'otieno', name: 'Otieno', role: 'guide', look: 'youth', hours: { open: 8, close: 20 }, post: ['park', 'square'], voice: 'plain', card: 'You welcome visitors and tell them where things are in town.' },
  ],
  za: [
    { key: 'thandi', name: 'Sis Thandi', role: 'seller', look: 'sis', hours: { open: 9, close: 18 }, post: ['market', 'main-market'], items: CRAFTS, voice: 'plain', card: 'You run a crafts stall in the market. You are friendly and fair, and you never sell below your floor.' },
    { key: 'sipho', name: 'Sipho', role: 'guide', look: 'bro', hours: { open: 8, close: 20 }, post: ['park', 'square'], voice: 'plain', card: 'You welcome visitors and tell them where things are in town.' },
  ],
  world: [
    { key: 'rosa', name: 'Auntie Rosa', role: 'seller', look: 'auntie', hours: { open: 9, close: 18 }, post: ['market', 'main-market'], items: CRAFTS, voice: 'plain', card: 'You run a crafts stall in the market. You are friendly and fair, and you never sell below your floor.' },
    { key: 'maya', name: 'Maya', role: 'guide', look: 'sis', hours: { open: 8, close: 20 }, post: ['park', 'square'], voice: 'plain', card: 'You welcome visitors and tell them where things are in town.' },
  ],
});

/** Cities with a cast of their own, which stand in the city whether or not anyone is there: the busy ones. */
export const AUTHORED_CITIES: readonly string[] = Object.freeze(['lagos']);

/** The specs of a city, best first. Empty for a city that is not open. */
export function castOf(cityId: string): readonly Spec[] {
  if (cityId === 'lagos') return LAGOS;
  if (!cityRules(cityId)) return [];
  const country = countryOfCity(cityId) ?? 'world';
  return GENERIC[country] ?? GENERIC['world']!;
}

/** The venue a spec works in, in this city: its first preference that exists, else (for a seller) a market, else the first venue; null if the city has none loaded. */
export function venueFor(cityId: string, prefs: readonly string[] | undefined, role: Role): string | null {
  const content = cachedCityContent(cityId);
  const venues = content?.venues ?? [];
  const has = (id: string): boolean => venues.some((venue) => venue.id === id);
  for (const id of prefs ?? []) if (has(id)) return id;
  if (cityId === 'lagos' && prefs?.length) return prefs[0] ?? null; // authored for Lagos: trust the table even before the content is read
  if (role === 'seller') { const market = Object.keys(content?.business?.markets ?? {}).find(has); if (market) return market; }
  const usable = venues.filter((venue) => venue.id !== 'home' && venue.id !== 'neighbourhood');
  return usable[0]?.id ?? null;
}

/** The priced-item inputs of a seller: only products that exist in the game's own product table. */
export function itemsOf(spec: Spec): ItemInput[] {
  const out: ItemInput[] = [];
  for (const entry of spec.items ?? []) {
    const product = BUSINESS_PRODUCTS.get(entry.id);
    if (product) out.push({ id: product.id, label: product.label, base: product.base, ...(entry.floorShare !== undefined ? { floorShare: entry.floorShare } : {}) });
  }
  return out;
}
