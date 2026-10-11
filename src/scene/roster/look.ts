/**
 * Putting a roster character on a saved look, as pure functions (the creator, the quick start and the tests share them; the server
 * does its own check, src/game/systems/onboarding.ts checkLook).
 *
 * A look keeps its old fields (body, hair, outfit, fabric, skin and the colours): they are what the old figure draws where it still
 * stands in for the character, and what an older client reads. The three character fields say which character, which outfit and which
 * skin tone step. The old fields of a character are free styles (ROSTER[].as), so the server accepts them at creation and wearing a
 * character never grants a style that is sold.
 */
import { SKIN_STEPS, rosterEntry, rosterOn } from '../../game/roster.ts';
import type { RosterSex } from '../../game/roster.ts';
import type { Look, SkinId } from '../../types/life.ts';
import { SKIN_HEX, pickOf } from './map.ts';

/** The old skin swatch nearest to each skin step (index 0 is step 1), for the old figure. */
const OLD_SKIN_FOR_STEP: readonly SkinId[] = Object.freeze(SKIN_HEX.map((_, index) => `skin-${index + 2}` as SkinId));

/** Whether a look names a character that is on. */
export const hasCharacter = (look: Pick<Look, 'character'>): boolean => rosterEntry(look.character)?.on === 1;

/** `look` wearing character `id` (an outfit and a skin step of its own): body, the stand-in styles and the character fields set; accessories and layers cleared (a character is finished). */
export function withCharacter(look: Look, id: string, outfit = 0, skin = 0): Look {
  const entry = rosterEntry(id);
  if (!entry) return look;
  const step = entry.skin ? Math.max(0, Math.min(SKIN_STEPS, Math.round(skin))) : 0, index = Math.max(0, Math.min(entry.outfits - 1, Math.round(outfit)));
  const { wearables: _layers, appearance: _appearance, character: _c, characterOutfit: _o, characterSkin: _s, ...rest } = look;
  void _layers; void _appearance; void _c; void _o; void _s;
  const [hair, clothes, fabric] = entry.as;
  return {
    ...rest, body: entry.sex === 'man' ? 'man' : 'woman', hair, outfit: clothes, fabric, accessories: [],
    ...(step ? { skin: OLD_SKIN_FOR_STEP[step - 1]! } : {}),
    character: entry.id, ...(index ? { characterOutfit: index } : {}), ...(step ? { characterSkin: step } : {}),
  };
}
/** The character a look wears now (named, or read from its old fields), or null when none is on. */
export const characterOf = (look: Look): { id: string; outfit: number; skin: number } | null => pickOf(look, 'creator');
/** `look` with the character it is read as written into it (a look that names one is returned as it is). */
export function ensureCharacter(look: Look): Look {
  if (hasCharacter(look)) return look;
  const pick = pickOf(look, 'creator');
  return pick ? withCharacter(look, pick.id, pick.outfit, pick.skin) : look;
}
/** The first character that is on for a sex; a look already of that sex is returned as it is. */
export function withSex(look: Look, sex: RosterSex): Look {
  const current = characterOf(look), entry = rosterEntry(current?.id);
  if (entry?.sex === sex) return ensureCharacter(look);
  const first = rosterOn(sex)[0];
  return first ? withCharacter(look, first.id) : look;
}
/** The same character in another outfit (0 is the one it is made in). */
export function withOutfit(look: Look, outfit: number): Look {
  const current = characterOf(look);
  return current ? withCharacter(look, current.id, outfit, current.skin) : look;
}
/** The same character in another skin tone step (0 is the tone it is made in; a character without steps keeps 0). */
export function withSkinStep(look: Look, step: number): Look {
  const current = characterOf(look);
  return current ? withCharacter(look, current.id, current.outfit, step) : look;
}
/** A random character that is on (of `sex`, or either), in an outfit of its own and, for half of them that have steps, a skin step. */
export function shuffleCharacter(look: Look, random: () => number, sex?: RosterSex): Look {
  const pool = rosterOn(sex);
  const at = (n: number): number => Math.min(n - 1, Math.floor(random() * n));
  const entry = pool[at(pool.length)]!;
  return withCharacter(look, entry.id, at(entry.outfits), entry.skin && random() < 0.5 ? 1 + at(SKIN_STEPS) : 0);
}
