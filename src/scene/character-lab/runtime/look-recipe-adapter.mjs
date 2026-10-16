// @ts-nocheck -- Vendored lab runtime; typed integration boundary is foreground-characters.d.mts.
// Local integration mapping. Original game Look remains authoritative; fidelity reports unsupported presentation.
// Pure data mapping between the existing app's discrete `Look` (src/types/life.ts:666, ids from src/game/content/traits.ts APPEARANCE)
// and this lab's continuous `allworld-character` v2 recipe (characters.js normalizeAppearance). Appearance never reads country/city.
// Every mapping entry carries `fidelity`: 'exact' | 'approx' | 'none' so a reviewer can see what the lab cannot yet express.

export const BODY = { woman: 'female', man: 'male' };

// app hair id -> lab catalog hair id (assets/catalog.json: none, short01, short02, bob01, afro01, braid01, ponytail01)
export const HAIR = {
  'low-cut': ['short01', 'approx'], classic: ['short02', 'approx'], bald: ['none', 'exact'], fade: ['short01', 'approx'],
  afro: ['afro01', 'exact'], braids: ['braid01', 'exact'], cornrows: ['braid01', 'approx'], twists: ['braid01', 'approx'],
  locs: ['braid01', 'approx'], 'bantu-knots': ['afro01', 'approx'], curls: ['afro01', 'approx'],
  ponytail: ['ponytail01', 'exact'], bun: ['ponytail01', 'approx'], long: ['bob01', 'approx'], gele: ['none', 'approx'], // gele is a head wearable in the app
};

// app outfit id (by body) -> lab garment id. The lab has 7 one-piece-or-set garments; most app outfits have no equivalent mesh yet.
export const OUTFIT = {
  woman: { casual: ['female-casual-01', 'approx'], office: ['formal-suit-01', 'approx'], owambe: ['female-elegant-01', 'approx'], 'site-work': ['male-worksuit-01', 'approx'], jersey: ['female-sport-01', 'approx'], kaftan: ['female-elegant-01', 'approx'], gown: ['female-elegant-01', 'approx'] },
  man: { casual: ['female-casual-02', 'approx'], hoodie: ['female-sport-01', 'approx'], office: ['formal-suit-01', 'approx'], chill: ['female-casual-01', 'approx'], 'site-work': ['male-worksuit-01', 'approx'], jersey: ['female-sport-01', 'approx'], kaftan: ['formal-suit-01', 'approx'], agbada: ['formal-suit-01', 'approx'] },
};

// app fabric patterns (ankara/adire/aso-oke) have no lab texture path: colour only. Documented gap.
export const FABRIC_FIDELITY = { plain: 'exact', ankara: 'none', adire: 'none', 'aso-oke': 'none' };

export const SKIN_HEX = { 'skin-1': '#e0ac7e', 'skin-2': '#c98e62', 'skin-3': '#b0764c', 'skin-4': '#96603c', 'skin-5': '#7a4a2c', 'skin-6': '#5e3620', 'skin-7': '#3f2416' };
export const HAIR_HEX = { black: '#15110f', 'soft-black': '#2a211d', 'dark-brown': '#3d2a1e', brown: '#5b3a24', auburn: '#8a3b22', blonde: '#d9b45f', purple: '#7b4bb0' };
export const OUTFIT_HEX = { blue: '#3b6fd4', green: '#3f9a5f', red: '#c8443a', orange: '#e58a2f', violet: '#7c55c7', pink: '#e07aa6', teal: '#2c9c9a', navy: '#243a6b', cream: '#f1e6cf', gold: '#d4a72c' };

// Face id / expression id (optional on a Look; defaults oval / smile are never stored). Values stay inside the lab's -1..1 feature range.
export const FACE_FEATURES = { oval: {}, round: { 'face-width': 0.35, 'cheek-volume': 0.25, 'chin-height': -0.1 }, long: { 'face-width': -0.25, 'jaw-width': -0.15, 'chin-height': 0.3 } };
export const EXPRESSION = { smile: ['happy', 0.55], neutral: ['neutral', 0.7], grin: ['happy', 0.95] };
// Cosmetic appearance extension (src/types/avatar.ts AvatarAppearance). Height is the lab uniform 0.85..1.15 scale; the app's own is 0.94/1.0/1.06.
export const HEIGHT = { short: 0.94, average: 1, tall: 1.06 };
export const BUILD_FEATURES = { slim: { weight: -0.45, 'waist': -0.15 }, average: {}, broad: { weight: 0.45, 'shoulder-width': 0.3, 'upper-back-chest': 0.2 } };
// ageAppearance has NO lab morph yet (app rewrites face positions on the CPU, src/scene/body/appearance.ts:127). Documented gap.

const luma = hex => { const n = parseInt(hex.slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };

/** App Look -> lab recipe v2 plus a per-field fidelity report. Unknown ids fall back to the lab defaults and are reported as 'none'. */
const color = (value, palette, fallback) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : palette[value] || fallback;

export function lookToRecipe(look = {}) {
  const report = {}, body = BODY[look.body] || 'female';
  const hairId = look.hair === 'lowcut' ? 'low-cut' : look.hair;
  const outfitId = look.outfit === 'sitework' ? 'site-work' : look.outfit;
  const [hair, hf] = HAIR[hairId] || ['short01', 'none']; report.hair = hf;
  const [garment, of] = (OUTFIT[look.body] || OUTFIT.woman)[outfitId] || ['female-casual-01', 'none']; report.outfit = of;
  report.fabric = FABRIC_FIDELITY[look.fabric] || 'none';
  const skin = color(look.skin, SKIN_HEX, SKIN_HEX['skin-4']);
  const features = { ...(FACE_FEATURES[look.face || 'oval'] || {}), ...(BUILD_FEATURES[look.appearance?.build || 'average'] || {}) };
  report.face = look.face && !FACE_FEATURES[look.face] ? 'none' : 'approx';
  report.accessories = look.accessories?.length ? 'none' : 'exact'; // lab catalog has no accessory/wearable meshes
  report.wearables = look.wearables?.length ? 'none' : 'exact'; // app wearables are bound to the app's 23-bone body, not the lab's 53-bone rig
  report.ageAppearance = look.appearance?.ageAppearance && look.appearance.ageAppearance !== 'adult' ? 'none' : 'exact';
  const [emotion, emotionStrength] = EXPRESSION[look.expression || 'smile'] || EXPRESSION.smile;
  return {
    recipe: {
      schema: 'allworld-character', version: 2,
      appearance: {
        version: 2, body, hair, garments: [garment], shoes: 'shoes01', eyeColor: 'brown',
        complexion: luma(skin) > 0.5 ? 'medium' : 'deep', // lab ships deep/medium/light bases; the app's 7 swatches sit in medium..deep; tint carries the exact hex
        height: HEIGHT[look.appearance?.height || 'average'] || 1, features,
        colors: { skin, hair: color(look.hairColor, HAIR_HEX, '#15110f'), upper: color(look.outfitColor, OUTFIT_HEX, '#ffffff'), lower: color(look.bottomsColor, OUTFIT_HEX, '#ffffff'), shoes: '#ffffff' },
        handPose: 'relaxed',
      },
      emotion, emotionStrength,
    },
    fidelity: report,
  };
}

/** Server-side validator sketch for a persisted `look.character` extension: closed ids, clamped numbers, no unknown keys, size bounded. */
export function validateCharacterExtension(value, catalog) {
  const errors = [];
  if (value?.schema !== 'allworld-character' || value.version !== 2) errors.push('schema/version');
  const a = value?.appearance || {};
  const has = (list, id) => list.some(x => x.id === id);
  if (!['female', 'male'].includes(a.body)) errors.push('body');
  if (!has(catalog.hair, a.hair)) errors.push('hair');
  if (!Array.isArray(a.garments) || a.garments.length < 1 || a.garments.length > 2 || !a.garments.every(id => has(catalog.garments, id))) errors.push('garments');
  if (!has(catalog.shoes, a.shoes)) errors.push('shoes');
  if (!has(catalog.eyeColors, a.eyeColor)) errors.push('eyeColor');
  if (!(a.height >= 0.85 && a.height <= 1.15)) errors.push('height');
  const ids = new Set(catalog.features.map(f => f.id));
  for (const [k, v] of Object.entries(a.features || {})) if (!ids.has(k) || !(v >= -1 && v <= 1)) errors.push('feature:' + k);
  for (const [k, v] of Object.entries(a.colors || {})) if (!['skin', 'hair', 'upper', 'lower', 'shoes'].includes(k) || !/^#[0-9a-f]{6}$/i.test(v)) errors.push('color:' + k);
  if (JSON.stringify(value).length > 2048) errors.push('size');
  return { ok: errors.length === 0, errors };
}
