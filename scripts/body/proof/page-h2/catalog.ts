// What the creator offers: which part files exist, and the palettes. The game's creator would read the same lists from its own data.
import type { Look } from './parts.ts';

export interface HeadEntry { id: string; label: string }
export interface OutfitEntry { id: string; label: string; prints: number; tintTop: boolean; tintBottom: boolean }
export const HEADS: Record<'male' | 'female', HeadEntry[]> = {
  male: [{ id: 'm2-head', label: 'Face A' }, { id: 'm3-head', label: 'Face B' }, { id: 'm1-head', label: 'Face C' }],
  female: [{ id: 'w2-head', label: 'Face A' }, { id: 'w3-head', label: 'Face B' }, { id: 'w1-head', label: 'Face C' }],
};
export const OUTFITS: Record<'male' | 'female', OutfitEntry[]> = {
  male: [{ id: 'm2-body', label: 'T-shirt and jeans', prints: 0, tintTop: true, tintBottom: true }, { id: 'm1-body', label: 'Kaftan set', prints: 0, tintTop: true, tintBottom: true }, { id: 'm3-body', label: 'Print shirt', prints: 3, tintTop: false, tintBottom: true }],
  female: [{ id: 'w2-body', label: 'Top and jeans', prints: 0, tintTop: true, tintBottom: true }, { id: 'w3-body', label: 'Long gown', prints: 0, tintTop: true, tintBottom: false }, { id: 'w1-body', label: 'Ankara wrapper', prints: 3, tintTop: false, tintBottom: false }],
};
export const SKIN_TONES = ['#c48f66', '#a8704a', '#8a5a38', '#6e4429', '#523320', '#3a2317'];
export const SKIN_NAMES = ['Light brown', 'Golden brown', 'Medium brown', 'Deep brown', 'Dark', 'Very dark'];
export const HAIR_COLOURS = ['#14100e', '#2b1d14', '#4a2e1c', '#6b3a1f', '#8e8a84', '#c9b27a'];
export const CLOTH_COLOURS = ['#f1efe8', '#1f2b44', '#2f6e68', '#9a2e2a', '#c88a1d', '#4f7d3a', '#6a3f8f', '#2b2b2f'];
export const SHOE_COLOURS = ['#f4f4f0', '#2b2b2f', '#6b3d1f', '#9a2e2a', '#1f2b44'];
export const MOODS = ['neutral', 'happy', 'uneasy'] as const;

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = <T>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)]!;

/** A random draw from the parts: the same function the game would use for people in a crowd. */
export function randomLook(sex: 'male' | 'female', r: () => number): Look {
  const out = pick(r, OUTFITS[sex]);
  const hairs = sex === 'male' ? ['low', 'low', 'fade', 'fade', 'afro', 'cornrows', 'locs', 'none'] : ['afro', 'puff', 'cornrows', 'braids', 'braids', 'locs', 'low', 'puff'];
  let hair = pick(r, hairs), wear = 'none';
  if (sex === 'female' && r() < 0.2) wear = pick(r, ['gele', 'scarf']);
  if (sex === 'male' && r() < 0.18) wear = 'fila';
  if (sex === 'female' && wear !== 'none' && hair === 'braids') hair = 'low';
  return {
    sex, head: pick(r, HEADS[sex]).id, body: out.id, print: out.prints ? 1 + Math.floor(r() * out.prints) : 0, skin: pick(r, SKIN_TONES),
    top: pick(r, CLOTH_COLOURS), bottom: pick(r, CLOTH_COLOURS), shoes: pick(r, SHOE_COLOURS), hair, hairColor: pick(r, HAIR_COLOURS), headwear: wear,
    headwearColor: pick(r, ['#e9e2cf', '#1f2b44', '#9a2e2a', '#2f6e68', '#c88a1d', '#6a3f8f']), height: 0.95 + r() * 0.1, build: -0.6 + r() * 1.6, jaw: r() * 0.8 - 0.2, headSize: 0.97 + r() * 0.06,
  };
}
