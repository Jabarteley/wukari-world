// The fixed roster: twelve whole characters, each with its garments (colour rows), the print row it takes, and its look name.
export interface Look { id: string; sex: 'male' | 'female'; name: string; blurb: string; dot: string; outfits: string[]; skinSteps: boolean }
export const LOOKS: Look[] = [
  { id: 'm1', sex: 'male', name: 'T-shirt and jeans', blurb: 'Twenties, fade', dot: '#e8e8e4', outfits: [], skinSteps: true },
  { id: 'm2', sex: 'male', name: 'Senator', blurb: 'Thirties, low cut and beard', dot: '#e6dcc4', outfits: [], skinSteps: true },
  { id: 'm3', sex: 'male', name: 'Agbada', blurb: 'Forties, bald and beard', dot: '#2b3f8a', outfits: [], skinSteps: true },
  { id: 'm4', sex: 'male', name: 'Hoodie and joggers', blurb: 'Twenties, short locs', dot: '#8a8d92', outfits: [], skinSteps: true },
  { id: 'm5', sex: 'male', name: 'Shirt and trousers', blurb: 'Fifties, grey hair', dot: '#8ab0d8', outfits: [], skinSteps: true },
  { id: 'm6', sex: 'male', name: 'Ankara shirt and chinos', blurb: 'Thirties, red cap', dot: '#c8452f', outfits: [], skinSteps: true },
  { id: 'w1', sex: 'female', name: 'Ankara wrapper and blouse', blurb: 'Twenties, long braids', dot: '#3b3a9a', outfits: [], skinSteps: true },
  { id: 'w2', sex: 'female', name: 'Aso-ebi', blurb: 'Thirties, lace gown and gele', dot: '#1f7a4f', outfits: [], skinSteps: true },
  { id: 'w3', sex: 'female', name: 'Crop top and jeans', blurb: 'Twenties, natural afro', dot: '#d4a21f', outfits: [], skinSteps: true },
  { id: 'w4', sex: 'female', name: 'Two-piece', blurb: 'Forties, low cut', dot: '#1f2b44', outfits: [], skinSteps: true },
  { id: 'w5', sex: 'female', name: 'Iro and buba', blurb: 'Thirties, low bun', dot: '#6e2a35', outfits: [], skinSteps: true },
  { id: 'w6', sex: 'female', name: 'Bubu', blurb: 'Fifties, headscarf', dot: '#3a9a4a', outfits: [], skinSteps: true },
];
export const SKIN_TONES = ['#c48f66', '#a8704a', '#8a5a38', '#6e4429', '#523320', '#3a2317'];
export const SKIN_NAMES = ['Light brown', 'Golden brown', 'Medium brown', 'Deep brown', 'Dark', 'Very dark'];
export const OUTFIT_NAMES: Record<string, string[]> = {};
export const COLOURS = ['#f1efe8', '#e6dcc4', '#1f2b44', '#3f72c4', '#6e2a35', '#5a6a3a', '#7a5a3c', '#2b2b2f', '#2f6e68', '#c88a1d', '#9a2e2a', '#6a3f8f'];
export const COLOUR_NAMES = ['White', 'Cream', 'Indigo', 'Blue', 'Wine', 'Olive', 'Earth brown', 'Charcoal', 'Teal', 'Mustard', 'Brick red', 'Purple'];
export const PRINTS: { file: string; name: string }[] = [{ file: 'a', name: 'Ankara' }, { file: 'b', name: 'Wax fan' }, { file: 'c', name: 'Bold green' }, { file: 'd', name: 'Red stripe' }, { file: 'f', name: 'Adire' }];
export function rng(seed: number): () => number { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
