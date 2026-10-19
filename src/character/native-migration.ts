/** Deterministic legacy-look and unrecorded-crowd materialization for lazy renderers and playing hosts. */
import { NATIVE_BODY_IDS, NATIVE_FEATURE_LIMITS, normalizeNativeRecipe } from './native-recipe.ts'
import type { NativeBodyId, NativeCharacterRecipeV2, NativeEmotionId, NativeGarmentId, NativeHairId } from './native-recipe.ts'

/** Small same-source pool for unrecorded crowds; it never expands asset downloads by region. */
export const NATIVE_CROWD_DEFAULTS = Object.freeze({
  female: Object.freeze({ body: 'female' as const, hair: 'short01' as const, garment: 'female-casual-01' as const, shoes: 'shoes01' as const, eyeColor: 'brown' as const, complexion: 'deep' as const }),
  male: Object.freeze({ body: 'male' as const, hair: 'short01' as const, garment: 'female-casual-01' as const, shoes: 'shoes01' as const, eyeColor: 'brown' as const, complexion: 'deep' as const }),
})

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const hex = (value: unknown, fallback = '#ffffff'): string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
const emptyFeatures = (): Record<string, number> => Object.fromEntries(NATIVE_FEATURE_LIMITS.map(([id]) => [id, 0]))
function hash(value: unknown): number {
  let result = 2166136261
  for (const char of String(value ?? 'allworld-character')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619) }
  return result >>> 0
}
const seeded = <Id extends string>(list: readonly Id[], seed: unknown, part: string): Id => list[hash(`${String(seed)}:${part}`) % list.length]!

export const SKIN: Record<string, string> = { 'skin-1': '#e0ac7e', 'skin-2': '#c98e62', 'skin-3': '#b0764c', 'skin-4': '#96603c', 'skin-5': '#7a4a2c', 'skin-6': '#5e3620', 'skin-7': '#3f2416' }
export const HAIR_COLOR: Record<string, string> = { black: '#15110f', 'soft-black': '#2a211d', 'dark-brown': '#3d2a1e', brown: '#5b3a24', auburn: '#8a3b22', blonde: '#d9b45f', purple: '#7b4bb0' }
const HAIR_MIGRATION: Record<string, NativeHairId> = { 'low-cut': 'short01', lowcut: 'short01', classic: 'short02', bald: 'none', fade: 'short01', afro: 'afro01', braids: 'braid01', cornrows: 'braid01', twists: 'braid01', locs: 'braid01', 'bantu-knots': 'afro01', curls: 'afro01', ponytail: 'ponytail01', bun: 'ponytail01', long: 'bob01', gele: 'none' }
const OUTFIT_MIGRATION: Record<string, NativeGarmentId> = { casual: 'female-casual-01', office: 'formal-suit-01', owambe: 'female-elegant-01', 'site-work': 'male-worksuit-01', sitework: 'male-worksuit-01', jersey: 'female-sport-01', hoodie: 'female-sport-01', chill: 'female-casual-02', kaftan: 'formal-suit-01', gown: 'female-elegant-01', agbada: 'formal-suit-01' }

/** Materialize a complete region-independent recipe. A saved native recipe always wins unchanged after normalization. Legacy skin and hair colour carry over, while garments start with their source atlas instead of inheriting unsupported fabric swatches. */
export function nativeRecipeForLook(look: unknown, seed: unknown = 'joinallworld'): NativeCharacterRecipeV2 {
  const source = record(look)
  if (source.native !== undefined) return normalizeNativeRecipe(source.native)
  if (source.schema === 'allworld-character') return normalizeNativeRecipe(source)
  const body: NativeBodyId = source.body === 'man' || source.body === 'male' ? 'male' : source.body === 'woman' || source.body === 'female' ? 'female' : seeded(NATIVE_BODY_IDS, seed, 'body')
  const crowdDefault = NATIVE_CROWD_DEFAULTS[body]
  const unrecorded = !Object.keys(source).length
  const seededColor = (values: readonly string[], part: string): string => values[hash(`${String(seed)}:${part}`) % values.length]!
  const skin = unrecorded ? seededColor(['#c98e62', '#b0764c', '#96603c', '#7a4a2c', '#5e3620', '#3f2416'], 'skin') : hex(SKIN[String(source.skin)] ?? source.skin, '#96603c')
  const features = emptyFeatures()
  if (unrecorded) Object.assign(features, {
    'nose-width': ((hash(`${String(seed)}:nose`) % 401) / 1000) - .2,
    'chin-width': ((hash(`${String(seed)}:chin`) % 401) / 1000) - .2,
    'face-width': ((hash(`${String(seed)}:face`) % 301) / 1000) - .15,
    weight: ((hash(`${String(seed)}:weight`) % 501) / 1000) - .25,
  })
  if (source.face === 'round') Object.assign(features, { 'face-width': .3, 'cheek-volume': .25, 'chin-height': -.1 })
  if (source.face === 'long') Object.assign(features, { 'face-width': -.25, 'jaw-width': -.15, 'chin-height': .3 })
  const legacyAppearance = record(source.appearance)
  if (legacyAppearance.build === 'slim') Object.assign(features, { weight: -.45, waist: -.15 })
  if (legacyAppearance.build === 'broad') Object.assign(features, { weight: .45, 'shoulder-width': .3, 'upper-back-chest': .2 })
  const emotion: NativeEmotionId = source.expression === 'neutral' ? 'neutral' : 'happy'
  return normalizeNativeRecipe({
    schema: 'allworld-character', version: 2,
    appearance: {
      version: 2, body,
      hair: HAIR_MIGRATION[String(source.hair)] ?? crowdDefault.hair,
      garments: [OUTFIT_MIGRATION[String(source.outfit)] ?? crowdDefault.garment],
      shoes: crowdDefault.shoes, eyeColor: crowdDefault.eyeColor,
      complexion: skin === '#e0ac7e' || skin === '#c98e62' ? 'light' : skin === '#b0764c' || skin === '#96603c' ? 'medium' : 'deep',
      height: legacyAppearance.height === 'short' ? .94 : legacyAppearance.height === 'tall' ? 1.06 : 1,
      features,
      colors: { skin,
        hair: unrecorded ? seededColor(['#15110f', '#2a211d', '#3d2a1e'], 'hair-color') : hex(HAIR_COLOR[String(source.hairColor)] ?? source.hairColor, '#15110f'),
        upper: unrecorded ? seededColor(['#3b6fd4', '#3f9a5f', '#c8443a', '#2c9c9a', '#243a6b'], 'upper') : '#ffffff',
        lower: unrecorded ? seededColor(['#243a6b', '#354b67', '#344a42', '#48545c'], 'lower') : '#ffffff',
        shoes: unrecorded ? seededColor(['#ffffff', '#2a211d', '#48545c'], 'shoes-color') : '#ffffff' },
      handPose: 'relaxed',
    }, emotion, emotionStrength: source.expression === 'grin' ? .95 : source.expression === 'smile' ? .55 : .7,
  })
}
