/**
 * Which roster character (src/game/roster.ts) a person wears. Pure: no Three.js, no assets, no DOM, so a test, the server-free
 * client, a 2D portrait and the figure loader all read it the same way.
 *
 *   pickOf(look, seed)    a look as it is saved. A look that names a character (and that character is on) wears it. Every other
 *                         look (all saves from before the roster, and a character that was switched off) is read as the nearest
 *                         character that is on, WITHOUT changing the stored look: body → sex, then outfit, fabric, hair and
 *                         accessories score each candidate (TABLE below), then the old skin tone → the nearest skin step.
 *   seededPick(seed)      a person with no look: the same seed always gives the same character, outfit and skin step.
 *   regularPick(npc)      a regular: the description they already have (a look field, their emoji, their name's honorific, their
 *                         age) chooses the sex and the age of the character; the id chooses among the fitting ones.
 *
 * Ids are compared with everything but letters and digits removed ('low-cut' and 'lowcut', 'aso-oke' and 'asooke' are one).
 */
import { SKIN_STEPS, rosterEntry, rosterOn } from '../game/roster.ts';
import type { RosterEntry, RosterSex } from '../game/roster.ts';

export interface RosterPick { id: string; outfit: number; skin: number }

/** The words of an old look that make a character the nearest one, with how strongly. A character that is off is left out of the contest. */
interface Words { outfit?: Record<string, number>; fabric?: Record<string, number>; hair?: Record<string, number>; accessory?: Record<string, number> }
export const TABLE: Readonly<Record<string, Words>> = Object.freeze({
  m1: { outfit: { casual: 8, jersey: 4, chill: 4, sitework: 3 }, hair: { fade: 3, curls: 3, lowcut: 2 }, fabric: { plain: 1 } },
  m2: { outfit: { kaftan: 8, office: 4, agbada: 4 }, hair: { lowcut: 3, classic: 1 }, fabric: { plain: 1, asooke: 2 } },
  m3: { outfit: { agbada: 9, kaftan: 3 }, hair: { bald: 4 }, fabric: { asooke: 3, adire: 2 } },
  m4: { outfit: { hoodie: 9, chill: 5, jersey: 5 }, hair: { locs: 4, twists: 2, braids: 2, cornrows: 2, afro: 1 } },
  m5: { outfit: { office: 8, sitework: 2 }, hair: { classic: 3, bald: 1 }, fabric: { plain: 1 } },
  m6: { outfit: { casual: 2, office: 2 }, fabric: { ankara: 8, adire: 6, asooke: 4 }, accessory: { fila: 9, cap: 1 }, hair: { lowcut: 1 } },
  w1: { outfit: { casual: 3, owambe: 3 }, fabric: { ankara: 6, adire: 4 }, hair: { braids: 4, long: 2, cornrows: 2, twists: 2 } },
  w2: { outfit: { owambe: 8, gown: 6 }, fabric: { asooke: 5 }, hair: { gele: 5 }, accessory: { headwrap: 3 } },
  w3: { outfit: { casual: 8, jersey: 5, sitework: 3 }, hair: { afro: 4, curls: 3, bantuknots: 3, twists: 2 }, fabric: { plain: 1 } },
  w4: { outfit: { office: 8 }, hair: { lowcut: 3, classic: 2, ponytail: 1 }, fabric: { plain: 1 } },
  w5: { outfit: { kaftan: 3, owambe: 5 }, hair: { bun: 5 }, fabric: { adire: 4, ankara: 2 } },
  w6: { outfit: { kaftan: 8, gown: 3, chill: 3 }, accessory: { headwrap: 5 }, hair: { classic: 2 } },
});

/** The skin tones of the roster's steps 1 to 6 (sRGB), in order. */
export const SKIN_HEX = Object.freeze(['#c48f66', '#a8704a', '#8a5a38', '#6e4429', '#523320', '#3a2317']);
export const SKIN_NAMES = Object.freeze(['Light brown', 'Golden brown', 'Medium brown', 'Deep brown', 'Dark', 'Very dark']);
/** The swatches of the old creator (content/traits.ts APPEARANCE.skin), for reading a look saved with one. */
const OLD_SKIN: Readonly<Record<string, string>> = Object.freeze({
  'skin-1': '#e0ac7e', 'skin-2': '#c98e62', 'skin-3': '#b0764c', 'skin-4': '#96603c', 'skin-5': '#7a4a2c', 'skin-6': '#5e3620', 'skin-7': '#3f2416',
});

const flat = (value: unknown): string => (typeof value === 'string' ? value.toLowerCase().replace(/[^a-z0-9]/g, '') : '');
/** FNV-1a over the text: a stable number for a seed. */
export function seedNumber(seed: unknown): number {
  const text = String(seed ?? 'allworld');
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const parts = (n: number, size: number): number => Math.floor(n / size);

const hexRgb = (hex: string): [number, number, number] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number];
/** The skin step (1 to 6) whose tone is nearest to a colour, as a swatch id ('skin-3') or a hex. 0 when it cannot be read. */
export function skinStepOf(skin: unknown): number {
  const raw = typeof skin === 'string' ? skin.trim().toLowerCase() : '';
  const hex = OLD_SKIN[raw] ?? (/^#[0-9a-f]{6}$/.test(raw) ? raw : null);
  if (!hex) return 0;
  const [r, g, b] = hexRgb(hex);
  let best = 1, bestDistance = Infinity;
  SKIN_HEX.forEach((candidate, index) => {
    const [cr, cg, cb] = hexRgb(candidate), distance = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (distance < bestDistance) { bestDistance = distance; best = index + 1; }
  });
  return best;
}

const sexOf = (body: unknown): RosterSex | null => {
  const word = flat(body);
  return word === 'man' || word === 'male' ? 'man' : word === 'woman' || word === 'female' ? 'woman' : null;
};
const withSkin = (entry: RosterEntry, outfit: number, skin: number): RosterPick => ({ id: entry.id, outfit, skin: entry.skin ? skin : 0 });

/** The nearest character that is on to the words of an old look. */
function nearest(sex: RosterSex, look: Record<string, unknown>): RosterEntry | null {
  const candidates = rosterOn(sex);
  if (!candidates.length) return null;
  const outfit = flat(look.outfit), fabric = flat(look.fabric), hair = flat(look.hair ?? look.hairstyle);
  const worn = Array.isArray(look.accessories) ? look.accessories.map(flat) : [];
  let best = candidates[0]!, bestScore = -1;
  for (const entry of candidates) {
    const words = TABLE[entry.id] ?? {};
    const score = (words.outfit?.[outfit] ?? 0) + (words.fabric?.[fabric] ?? 0) + (words.hair?.[hair] ?? 0) + worn.reduce((sum, id) => sum + (words.accessory?.[id] ?? 0), 0);
    if (score > bestScore) { best = entry; bestScore = score; }
  }
  return best;
}

/** A person with no look, or none that can be read: a character, an outfit and a skin step from the seed alone. */
export function seededPick(seed: unknown, sex?: RosterSex | null, among?: readonly RosterEntry[]): RosterPick | null {
  const n = seedNumber(seed), side = sex ?? (n % 2 ? 'man' : 'woman');
  const pool = among?.length ? among : rosterOn(side);
  if (!pool.length) return sex ? seededPick(seed, null) : null;
  const entry = pool[parts(n, 2) % pool.length]!;
  return withSkin(entry, parts(n, 97) % entry.outfits, entry.skin && parts(n, 389) % 3 === 0 ? 1 + parts(n, 1553) % SKIN_STEPS : 0);
}

/**
 * The character a saved look wears, in the outfit and skin step it has. `seed` is the person's public id (it decides what a look
 * with no body would be). Null only when no character is on at all.
 */
export function pickOf(look: unknown, seed: unknown): RosterPick | null {
  const source: Record<string, unknown> = look && typeof look === 'object' && !Array.isArray(look) ? look as Record<string, unknown> : {};
  const sex = sexOf(source.body ?? source.gender);
  const named = rosterEntry(source.character);
  if (named && named.on === 1 && (!sex || named.sex === sex)) {
    const outfit = source.characterOutfit, skin = source.characterSkin;
    return {
      id: named.id,
      outfit: typeof outfit === 'number' && Number.isInteger(outfit) && outfit >= 0 && outfit < named.outfits ? outfit : 0,
      skin: named.skin && typeof skin === 'number' && Number.isInteger(skin) && skin >= 0 && skin <= SKIN_STEPS ? skin : 0,
    };
  }
  if (!sex) return seededPick(seed ?? source.seed ?? source.id);
  const entry = nearest(sex, source);
  if (!entry) return null;
  // A look that named a character that is off keeps its own outfit and skin step choices where they are in range.
  return withSkin(entry, 0, skinStepOf(source.skin ?? source.skinTone));
}

/** What the game knows of a regular. */
export interface Regular { id: string; name?: string; role?: string; emoji?: string; age?: string; look?: unknown }
const WOMEN = /\b(mama|mummy|iya|auntie|aunty|mrs|madam|sister|queen|lady|nana|madam)\b/i;
const MEN = /\b(baba|oga|alhaji|mr|coach|brother|chief|pastor|imam|papa|daddy|uncle|officer|dr)\b/i;
/** The sex a regular's description gives (the look's body, then the emoji, then the honorific in the name), or null. */
export function regularSex(npc: Regular): RosterSex | null {
  const fromLook = sexOf(npc.look && typeof npc.look === 'object' ? (npc.look as { body?: unknown }).body : undefined);
  if (fromLook) return fromLook;
  const emoji = npc.emoji ?? '';
  if (/[\u{1F469}\u{1F475}\u{1F9D5}\u{1F483}\u{1F930}]|‍♀/u.test(emoji)) return 'woman';
  if (/[\u{1F468}\u{1F474}\u{1F9D4}\u{1F57A}]|‍♂/u.test(emoji)) return 'man';
  const name = npc.name ?? '';
  if (WOMEN.test(name)) return 'woman';
  if (MEN.test(name)) return 'man';
  return null;
}
/** The older characters for an elder, the younger for a young regular (the manifest order is the order the characters were made in). */
const AGE: Readonly<Record<string, { elder: string[]; young: string[] }>> = Object.freeze({
  man: { elder: ['m5', 'm3', 'm2'], young: ['m1', 'm4', 'm6'] },
  woman: { elder: ['w6', 'w4', 'w5'], young: ['w1', 'w3'] },
});
/** A regular's character: the same one every time for the same regular. */
export function regularPick(npc: Regular): RosterPick | null {
  if (npc.look && typeof npc.look === 'object' && (npc.look as { character?: unknown }).character) {
    const direct = pickOf(npc.look, npc.id);
    if (direct) return direct;
  }
  const sex = regularSex(npc) ?? (seedNumber(npc.id) % 2 ? 'man' : 'woman');
  const wanted = npc.age === 'elder' ? AGE[sex]!.elder : npc.age === 'young' ? AGE[sex]!.young : null;
  const fitting = wanted ? rosterOn(sex).filter((entry) => wanted.includes(entry.id)) : [];
  return seededPick(npc.id, sex, fitting.length ? fitting : undefined);
}
