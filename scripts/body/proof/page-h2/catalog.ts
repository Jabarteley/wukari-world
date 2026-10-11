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
export const SKIN_TONES = ['#b4784f', '#9a6342', '#82502f', '#6a3f27', '#52301f', '#3a2218'];
export const SKIN_NAMES = ['Light brown', 'Golden brown', 'Medium brown', 'Deep brown', 'Dark', 'Very dark'];
/** Natural colours first; the player may pick any, a crowd draws the natural ones. */
export const NATURAL_HAIR = ['#14100e', '#1d1612', '#2b1d14', '#3b2a1e'];
export const GREY_HAIR = ['#8e8a84', '#b4b0a8'];
export const BRIGHT_HAIR = ['#8c3b22', '#c9b27a', '#7a2f4f', '#2f5f8a'];
export const HAIR_COLOURS = [...NATURAL_HAIR, ...GREY_HAIR, ...BRIGHT_HAIR];
export const CLOTH_COLOURS = ['#f1efe8', '#e6dcc4', '#1f2b44', '#2f3f5f', '#6e2a35', '#5a6a3a', '#7a5a3c', '#2b2b2f', '#2f6e68', '#c88a1d', '#9a2e2a', '#6a3f8f'];
export const SHOE_COLOURS = ['#f4f4f0', '#2b2b2f', '#6b3d1f', '#9a2e2a', '#1f2b44'];
export const WEAR_COLOURS = ['#e9e2cf', '#1f2b44', '#6e2a35', '#2f6e68', '#c88a1d', '#6a3f8f'];
export const MOODS = ['neutral', 'happy', 'uneasy'] as const;

type Combo = { top?: string; bottom?: string; shoes: string };
/** Coordinated colourings per outfit, drawn from what people wear in a West African city: whites and creams, indigo and navy, wine, olive, earth tones, with ankara as the bright note. */
export const COMBOS: Record<string, Combo[]> = {
  'm2-body': [{ top: '#f1efe8', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#e6dcc4', bottom: '#2b2b2f', shoes: '#6b3d1f' }, { top: '#1f2b44', bottom: '#7a5a3c', shoes: '#6b3d1f' }, { top: '#5a6a3a', bottom: '#2b2b2f', shoes: '#2b2b2f' },
    { top: '#6e2a35', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#f1efe8', bottom: '#7a5a3c', shoes: '#6b3d1f' }, { top: '#2f3f5f', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#7a5a3c', bottom: '#2b2b2f', shoes: '#2b2b2f' }, { top: '#2f6e68', bottom: '#2b2b2f', shoes: '#f4f4f0' }],
  'm1-body': [{ top: '#f1efe8', bottom: '#f1efe8', shoes: '#6b3d1f' }, { top: '#e6dcc4', bottom: '#e6dcc4', shoes: '#6b3d1f' }, { top: '#1f2b44', bottom: '#1f2b44', shoes: '#2b2b2f' }, { top: '#6e2a35', bottom: '#6e2a35', shoes: '#2b2b2f' },
    { top: '#5a6a3a', bottom: '#5a6a3a', shoes: '#6b3d1f' }, { top: '#2f3f5f', bottom: '#2f3f5f', shoes: '#2b2b2f' }, { top: '#7a5a3c', bottom: '#7a5a3c', shoes: '#6b3d1f' }, { top: '#2b2b2f', bottom: '#2b2b2f', shoes: '#2b2b2f' }, { top: '#e6dcc4', bottom: '#2f3f5f', shoes: '#6b3d1f' }],
  'm3-body': [{ bottom: '#2b2b2f', shoes: '#6b3d1f' }, { bottom: '#2f3f5f', shoes: '#2b2b2f' }, { bottom: '#e6dcc4', shoes: '#6b3d1f' }, { bottom: '#7a5a3c', shoes: '#2b2b2f' }, { bottom: '#5a6a3a', shoes: '#6b3d1f' }, { bottom: '#f1efe8', shoes: '#f4f4f0' }, { bottom: '#1f2b44', shoes: '#2b2b2f' }, { bottom: '#3a3a40', shoes: '#6b3d1f' }],
  'w2-body': [{ top: '#e6dcc4', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#c88a1d', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#5a6a3a', bottom: '#2b2b2f', shoes: '#2b2b2f' }, { top: '#6e2a35', bottom: '#2b2b2f', shoes: '#2b2b2f' },
    { top: '#f1efe8', bottom: '#1f2b44', shoes: '#6b3d1f' }, { top: '#1f2b44', bottom: '#7a5a3c', shoes: '#6b3d1f' }, { top: '#9a4a2e', bottom: '#2f3f5f', shoes: '#f4f4f0' }, { top: '#2f6e68', bottom: '#2b2b2f', shoes: '#2b2b2f' }, { top: '#f1efe8', bottom: '#2b2b2f', shoes: '#f4f4f0' }],
  'w3-body': [{ top: '#6e2a35', shoes: '#2b2b2f' }, { top: '#5a6a3a', shoes: '#2b2b2f' }, { top: '#1f2b44', shoes: '#2b2b2f' }, { top: '#2f6e68', shoes: '#2b2b2f' }, { top: '#e6dcc4', shoes: '#6b3d1f' }, { top: '#9a4a2e', shoes: '#6b3d1f' }, { top: '#c88a1d', shoes: '#6b3d1f' }, { top: '#2b2b2f', shoes: '#2b2b2f' }, { top: '#6a3f8f', shoes: '#2b2b2f' }],
  'w1-body': [{ shoes: '#6b3d1f' }, { shoes: '#2b2b2f' }, { shoes: '#6b3d1f' }, { shoes: '#f4f4f0' }],
};
/** The default adult proportions: a head size and a shoulder width for each sex. */
export const PROPORTIONS: Record<'male' | 'female', { headSize: number; shoulders: number }> = { male: { headSize: 0.92, shoulders: 1.09 }, female: { headSize: 0.95, shoulders: 1.05 } };

export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
const pick = <T>(r: () => number, a: readonly T[]): T => a[Math.floor(r() * a.length)]!;

/** A random draw from the parts: curated colours, natural hair, skin spread evenly; the same function the game would use for people in a crowd. */
export function randomLook(sex: 'male' | 'female', r: () => number, opts: { bright?: number } = {}): Look {
  const out = pick(r, OUTFITS[sex]);
  const hairs = sex === 'male' ? ['low', 'low', 'fade', 'fade', 'lineup', 'afro', 'cornrows', 'locs', 'none'] : ['afro', 'puff', 'cornrows', 'braids', 'braids', 'locs', 'low', 'puff', 'braids'];
  let hair = pick(r, hairs), wear = 'none';
  if (sex === 'female' && r() < 0.2) wear = pick(r, ['gele', 'scarf']);
  if (sex === 'male' && r() < 0.15) wear = 'fila';
  if (wear === 'gele' || wear === 'scarf') hair = 'none';
  const headId = pick(r, HEADS[sex]).id, older = headId === 'm3-head' || headId === 'w3-head';
  const bright = r() < (opts.bright ?? 0.04);
  const hairColor = bright ? pick(r, BRIGHT_HAIR) : older && r() < 0.5 ? pick(r, GREY_HAIR) : pick(r, NATURAL_HAIR);
  const combo = pick(r, COMBOS[out.id]!);
  const pr = PROPORTIONS[sex];
  return {
    sex, head: headId, body: out.id, print: out.prints ? 1 + Math.floor(r() * out.prints) : 0, skin: SKIN_TONES[Math.floor(r() * SKIN_TONES.length)]!,
    top: combo.top, bottom: combo.bottom, shoes: combo.shoes, hair, hairColor, headwear: wear, headwearColor: pick(r, WEAR_COLOURS),
    height: 0.96 + r() * 0.08, build: -0.5 + r() * 1.2, jaw: r() * 0.7 - 0.1, headSize: pr.headSize + (r() - 0.5) * 0.04,
  };
}
