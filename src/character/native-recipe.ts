/** Pure, shared contract for the native 53-bone character. No renderer, DOM or city dependency. */

export type NativeBodyId = 'female' | 'male'
export type NativeHairId = 'none' | 'short01' | 'short02' | 'bob01' | 'afro01' | 'braid01' | 'ponytail01'
export type NativeGarmentId = 'female-casual-01' | 'female-casual-02' | 'female-elegant-01' | 'female-sport-01' | 'male-worksuit-01' | 'formal-suit-01' | 'fitted-skirt-01'
export type NativeShoesId = 'shoes01' | 'shoes02' | 'shoes03'
export type NativeEyeColorId = 'brown' | 'brown-light' | 'blue' | 'green' | 'grey'
export type NativeComplexionId = 'deep' | 'medium' | 'light'
export type NativeHandPoseId = 'relaxed' | 'open' | 'fist' | 'point' | 'peace'
export type NativeEmotionId = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'relaxed' | 'concerned'
export type NativeColorField = 'skin' | 'hair' | 'upper' | 'lower' | 'shoes'

export interface NativeFeatureDescriptor { readonly id: string; readonly label: string; readonly group: 'face' | 'body'; readonly min: number; readonly max: number }
export interface NativeOption<Id extends string = string> { readonly id: Id; readonly label: string }
export interface NativeAppearanceV2 {
  version: 2
  body: NativeBodyId
  hair: NativeHairId
  garments: NativeGarmentId[]
  shoes: NativeShoesId
  eyeColor: NativeEyeColorId
  complexion: NativeComplexionId
  height: number
  features: Record<string, number>
  colors: Record<NativeColorField, string>
  handPose: NativeHandPoseId
}
export interface NativeCharacterRecipeV2 {
  schema: 'allworld-character'
  version: 2
  appearance: NativeAppearanceV2
  emotion: NativeEmotionId
  emotionStrength: number
}

export const NATIVE_BODY_IDS = Object.freeze(['female', 'male'] as const)
export const NATIVE_HAIR_IDS = Object.freeze(['none', 'short01', 'short02', 'bob01', 'afro01', 'braid01', 'ponytail01'] as const)
export const NATIVE_GARMENT_IDS = Object.freeze(['female-casual-01', 'female-casual-02', 'female-elegant-01', 'female-sport-01', 'male-worksuit-01', 'formal-suit-01', 'fitted-skirt-01'] as const)
export const NATIVE_SHOES_IDS = Object.freeze(['shoes01', 'shoes02', 'shoes03'] as const)
export const NATIVE_EYE_COLOR_IDS = Object.freeze(['brown', 'brown-light', 'blue', 'green', 'grey'] as const)
export const NATIVE_COMPLEXION_IDS = Object.freeze(['deep', 'medium', 'light'] as const)
export const NATIVE_HAND_POSE_IDS = Object.freeze(['relaxed', 'open', 'fist', 'point', 'peace'] as const)
export const NATIVE_EMOTION_IDS = Object.freeze(['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed', 'concerned'] as const)

export type NativeFeatureLimit = readonly [id: string, group: 'face' | 'body', min: number, max: number]
export const NATIVE_FEATURE_LIMITS: readonly NativeFeatureLimit[] = Object.freeze([
  ['nose-width', 'face', -1, 1], ['nose-depth', 'face', -.8, .8], ['nose-height', 'face', -.8, .8],
  ['nose-tip', 'face', -.7, .7], ['nostril-width', 'face', -.8, .8], ['chin-width', 'face', -.8, .8],
  ['chin-height', 'face', -.7, .7], ['chin-prognathism', 'face', -.7, .7], ['chin-prominence', 'face', -.7, .7],
  ['mouth-width', 'face', -.7, .7], ['mouth-height', 'face', -.65, .65], ['upper-lip-volume', 'face', -.8, .8],
  ['lower-lip-volume', 'face', -.8, .8], ['brow-height', 'face', -.65, .65], ['brow-angle', 'face', -.65, .65],
  ['eye-aperture', 'face', -.35, .45], ['eye-width', 'face', -.25, .25], ['eye-slant', 'face', -.35, .35],
  ['inner-eye-fold', 'face', -.45, .45], ['eye-fold-angle', 'face', -.35, .35], ['face-width', 'face', -.3, .3],
  ['jaw-width', 'face', -.35, .35], ['cheekbones', 'face', -.4, .4], ['cheek-volume', 'face', -.4, .4],
  ['east-asian-head', 'face', 0, 1], ['muscle', 'body', -1, 1], ['weight', 'body', -1, 1],
  ['shoulder-width', 'body', -1, 1], ['upper-back-chest', 'body', -1, 1], ['upper-arm-size', 'body', -1, 1],
  ['bust-size', 'body', -1, 1], ['waist', 'body', -1, 1], ['hips', 'body', -1, 1],
  ['buttock-volume', 'body', -1, 1], ['thigh-size', 'body', -1, 1],
] as const)

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}
const hex = (value: unknown, fallback = '#ffffff'): string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
const choose = <Id extends string>(list: readonly Id[], value: unknown, fallback: Id): Id => list.includes(value as Id) ? value as Id : fallback

const emptyFeatures = (): Record<string, number> => Object.fromEntries(NATIVE_FEATURE_LIMITS.map(([id]) => [id, 0]))

export const DEFAULT_NATIVE_RECIPE: Readonly<NativeCharacterRecipeV2> = Object.freeze({
  schema: 'allworld-character', version: 2,
  appearance: Object.freeze({
    version: 2, body: 'female', hair: 'short01', garments: Object.freeze(['female-casual-01']) as unknown as NativeGarmentId[], shoes: 'shoes01', eyeColor: 'brown', complexion: 'deep', height: 1,
    features: Object.freeze(emptyFeatures()), colors: Object.freeze({ skin: '#ffffff', hair: '#ffffff', upper: '#ffffff', lower: '#ffffff', shoes: '#ffffff' }), handPose: 'relaxed',
  }),
  emotion: 'neutral', emotionStrength: .7,
})

export type NativeWardrobeKind = 'native-hair' | 'native-garment' | 'native-shoes'
export const NATIVE_STARTER_ITEMS: readonly string[] = Object.freeze(['none', 'short01', 'female-casual-01', 'shoes01'])

/** Canonicalize partial or untrusted recipe input to the complete native v2 shape. */
export function normalizeNativeRecipe(value: unknown): NativeCharacterRecipeV2 {
  const outer = record(value), appearance = record(outer.appearance), featuresIn = record(appearance.features), colorsIn = record(appearance.colors)
  const features = Object.fromEntries(NATIVE_FEATURE_LIMITS.map(([id, , min, max]) => [id, clamp(featuresIn[id], min, max, 0)]))
  const garments = Array.isArray(appearance.garments) ? [...new Set(appearance.garments)].filter((id): id is NativeGarmentId => NATIVE_GARMENT_IDS.includes(id as NativeGarmentId)).slice(0, 1) : []
  return {
    schema: 'allworld-character', version: 2,
    appearance: {
      version: 2,
      body: choose(NATIVE_BODY_IDS, appearance.body, 'female'),
      hair: choose(NATIVE_HAIR_IDS, appearance.hair, 'short01'),
      garments: garments.length ? garments : ['female-casual-01'],
      shoes: choose(NATIVE_SHOES_IDS, appearance.shoes, 'shoes01'),
      eyeColor: choose(NATIVE_EYE_COLOR_IDS, appearance.eyeColor, 'brown'),
      complexion: choose(NATIVE_COMPLEXION_IDS, appearance.complexion, 'deep'),
      height: clamp(appearance.height, .85, 1.15, 1), features,
      colors: { skin: hex(colorsIn.skin), hair: hex(colorsIn.hair), upper: hex(colorsIn.upper), lower: hex(colorsIn.lower), shoes: hex(colorsIn.shoes) },
      handPose: choose(NATIVE_HAND_POSE_IDS, appearance.handPose, 'relaxed'),
    },
    emotion: choose(NATIVE_EMOTION_IDS, outer.emotion, 'neutral'),
    emotionStrength: clamp(outer.emotionStrength, 0, 1, .7),
  }
}

export type NativeRecipeValidation = { ok: true; recipe: NativeCharacterRecipeV2 } | { ok: false; reason: string }

/** Validate without silently replacing any native choice. */
export function validateNativeRecipe(value: unknown): NativeRecipeValidation {
  const outer = record(value), appearance = record(outer.appearance), features = record(appearance.features), colors = record(appearance.colors)
  if (outer.schema !== 'allworld-character' || outer.version !== 2 || appearance.version !== 2) return { ok: false, reason: 'Use an Allworld character recipe, version 2.' }
  const membership: [readonly string[], unknown, string][] = [
    [NATIVE_BODY_IDS, appearance.body, 'body'], [NATIVE_HAIR_IDS, appearance.hair, 'hair'],
    [NATIVE_SHOES_IDS, appearance.shoes, 'shoes'], [NATIVE_EYE_COLOR_IDS, appearance.eyeColor, 'eye colour'],
    [NATIVE_COMPLEXION_IDS, appearance.complexion, 'complexion'], [NATIVE_HAND_POSE_IDS, appearance.handPose, 'hand pose'],
    [NATIVE_EMOTION_IDS, outer.emotion, 'emotion'],
  ]
  for (const [list, selected, label] of membership) if (typeof selected !== 'string' || !list.includes(selected)) return { ok: false, reason: `Choose a supported native ${label}.` }
  const garments = Array.isArray(appearance.garments) ? appearance.garments : []
  if (garments.length !== 1 || !NATIVE_GARMENT_IDS.includes(garments[0] as NativeGarmentId)) return { ok: false, reason: 'Choose one supported native outfit.' }
  if (typeof appearance.height !== 'number' || !Number.isFinite(appearance.height) || appearance.height < .85 || appearance.height > 1.15) return { ok: false, reason: 'Choose a height from 0.85 to 1.15.' }
  if (typeof outer.emotionStrength !== 'number' || !Number.isFinite(outer.emotionStrength) || outer.emotionStrength < 0 || outer.emotionStrength > 1) return { ok: false, reason: 'Choose an emotion strength from 0 to 1.' }
  const expectedFeatures = new Set(NATIVE_FEATURE_LIMITS.map(([id]) => id))
  if (Object.keys(features).length !== expectedFeatures.size || Object.keys(features).some((id) => !expectedFeatures.has(id))) return { ok: false, reason: 'Keep every supported native face and body control in the recipe.' }
  for (const [id, , min, max] of NATIVE_FEATURE_LIMITS) if (typeof features[id] !== 'number' || !Number.isFinite(features[id]) || Number(features[id]) < min || Number(features[id]) > max) return { ok: false, reason: `Choose ${(id[0] ?? '').toUpperCase()}${id.slice(1).replaceAll('-', ' ')} from ${min} to ${max}.` }
  const colorKeys: NativeColorField[] = ['skin', 'hair', 'upper', 'lower', 'shoes']
  if (Object.keys(colors).length !== colorKeys.length || colorKeys.some((key) => !/^#[0-9a-f]{6}$/i.test(String(colors[key] ?? '')))) return { ok: false, reason: 'Choose five native colours as six-digit hex values.' }
  return { ok: true, recipe: normalizeNativeRecipe(value) }
}

/** Replace only native fields; compatibility fields cannot overwrite the authoritative recipe. */
export function withNativeRecipe(look: unknown, recipe: unknown): Record<string, unknown> & { native: NativeCharacterRecipeV2 } {
  return { ...record(look), native: normalizeNativeRecipe(recipe) }
}
