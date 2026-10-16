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

const options = <Id extends string>(entries: readonly (readonly [Id, string])[]): readonly NativeOption<Id>[] => Object.freeze(entries.map(([id, label]) => Object.freeze({ id, label })))

const FACE_FEATURES: readonly NativeFeatureDescriptor[] = [
  ['nose-width', 'Nose width', -1, 1], ['nose-depth', 'Nose depth', -.8, .8], ['nose-height', 'Nose height', -.8, .8],
  ['nose-tip', 'Nose tip', -.7, .7], ['nostril-width', 'Nostril width', -.8, .8], ['chin-width', 'Chin width', -.8, .8],
  ['chin-height', 'Chin height', -.7, .7], ['chin-prognathism', 'Chin projection', -.7, .7], ['chin-prominence', 'Chin prominence', -.7, .7],
  ['mouth-width', 'Mouth width', -.7, .7], ['mouth-height', 'Mouth height', -.65, .65], ['upper-lip-volume', 'Upper lip volume', -.8, .8],
  ['lower-lip-volume', 'Lower lip volume', -.8, .8], ['brow-height', 'Brow height', -.65, .65], ['brow-angle', 'Brow angle', -.65, .65],
  ['eye-aperture', 'Eye aperture', -.35, .45], ['eye-width', 'Eye width', -.25, .25], ['eye-slant', 'Eye corner tilt', -.35, .35],
  ['inner-eye-fold', 'Inner eye fold', -.45, .45], ['eye-fold-angle', 'Upper eye fold angle', -.35, .35], ['face-width', 'Face width', -.3, .3],
  ['jaw-width', 'Jaw width', -.35, .35], ['cheekbones', 'Cheekbone prominence', -.4, .4], ['cheek-volume', 'Cheek volume', -.4, .4],
  ['east-asian-head', 'East Asian head shape', 0, 1],
].map(([id, label, min, max]) => Object.freeze({ id: String(id), label: String(label), group: 'face' as const, min: Number(min), max: Number(max) }))

const BODY_FEATURES: readonly NativeFeatureDescriptor[] = ([
  ['muscle', 'Muscle mass'], ['weight', 'Body weight'], ['shoulder-width', 'Shoulder width'], ['upper-back-chest', 'Upper back and chest'],
  ['upper-arm-size', 'Upper arm size'], ['bust-size', 'Chest / bust size'], ['waist', 'Waist circumference'], ['hips', 'Hip circumference'],
  ['buttock-volume', 'Buttock volume'], ['thigh-size', 'Thigh size'],
] as const).map(([id, label]) => Object.freeze({ id, label, group: 'body' as const, min: -1, max: 1 }))

export const NATIVE_CHARACTER_CATALOG = Object.freeze({
  schemaVersion: 2 as const,
  bodies: options<NativeBodyId>([['female', 'Female'], ['male', 'Male']]),
  hair: options<NativeHairId>([['none', 'No added hair / close scalp'], ['short01', 'Short 01'], ['short02', 'Short 02'], ['bob01', 'Bob 01'], ['afro01', 'Afro 01'], ['braid01', 'Braid 01'], ['ponytail01', 'Ponytail 01']]),
  garments: options<NativeGarmentId>([['female-casual-01', 'Casual suit 01'], ['female-casual-02', 'Casual suit 02'], ['female-elegant-01', 'Blouse and skirt'], ['female-sport-01', 'Sportsuit 01'], ['male-worksuit-01', 'Worksuit 01'], ['formal-suit-01', 'Formal suit with tie'], ['fitted-skirt-01', 'Cropped top and skirt']]),
  shoes: options<NativeShoesId>([['shoes01', 'Shoes 01'], ['shoes02', 'Shoes 02'], ['shoes03', 'Shoes 03']]),
  eyeColors: options<NativeEyeColorId>([['brown', 'Dark brown'], ['brown-light', 'Light brown'], ['blue', 'Blue'], ['green', 'Green'], ['grey', 'Grey']]),
  complexions: options<NativeComplexionId>([['deep', 'Deep'], ['medium', 'Medium'], ['light', 'Light']]),
  handPoses: options<NativeHandPoseId>([['relaxed', 'Relaxed'], ['open', 'Open'], ['fist', 'Fist'], ['point', 'Point'], ['peace', 'Peace']]),
  emotions: options<NativeEmotionId>([['neutral', 'Neutral'], ['happy', 'Happy'], ['sad', 'Sad'], ['angry', 'Angry'], ['surprised', 'Surprised'], ['relaxed', 'Relaxed'], ['concerned', 'Concerned']]),
  features: Object.freeze([...FACE_FEATURES, ...BODY_FEATURES]),
  bodyPresets: Object.freeze([
    { id: 'neutral', label: 'Base proportions', features: {} },
    { id: 'gym', label: 'Muscular build', features: { muscle: 1, 'shoulder-width': .7, 'upper-back-chest': .65, 'upper-arm-size': .7, weight: .15, 'thigh-size': .35, waist: -.25 } },
    { id: 'fuller-bust-small-waist', label: 'Fuller chest, smaller waist', features: { 'bust-size': .85, waist: -.55, weight: -.15, hips: .1 } },
    { id: 'fuller-hips-thighs', label: 'Fuller hips and thighs', features: { 'buttock-volume': .8, 'thigh-size': .7, hips: .6, waist: -.35 } },
  ] satisfies readonly { id: string; label: string; features: Readonly<Partial<Record<string, number>>> }[]),
  appearancePresets: Object.freeze([{ id: 'east-asian-starting-point', label: 'East Asian starting point', features: { 'east-asian-head': 1 } }] satisfies readonly { id: string; label: string; features: Readonly<Partial<Record<string, number>>> }[]),
})

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback
}
const hex = (value: unknown, fallback = '#ffffff'): string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback
const choose = <Id extends string>(list: readonly NativeOption<Id>[], value: unknown, fallback: Id): Id => list.some((item) => item.id === value) ? value as Id : fallback

const emptyFeatures = (): Record<string, number> => Object.fromEntries(NATIVE_CHARACTER_CATALOG.features.map((feature) => [feature.id, 0]))

export const DEFAULT_NATIVE_RECIPE: Readonly<NativeCharacterRecipeV2> = Object.freeze({
  schema: 'allworld-character', version: 2,
  appearance: Object.freeze({
    version: 2, body: 'female', hair: 'short01', garments: Object.freeze(['female-casual-01']) as unknown as NativeGarmentId[], shoes: 'shoes01', eyeColor: 'brown', complexion: 'deep', height: 1,
    features: Object.freeze(emptyFeatures()), colors: Object.freeze({ skin: '#ffffff', hair: '#ffffff', upper: '#ffffff', lower: '#ffffff', shoes: '#ffffff' }), handPose: 'relaxed',
  }),
  emotion: 'neutral', emotionStrength: .7,
})

/** Small same-source pool for unrecorded crowds; it never expands asset downloads by region. */
export const NATIVE_CROWD_DEFAULTS = Object.freeze({
  female: Object.freeze({ body: 'female' as const, hair: 'short01' as const, garment: 'female-casual-01' as const, shoes: 'shoes01' as const, eyeColor: 'brown' as const, complexion: 'deep' as const }),
  male: Object.freeze({ body: 'male' as const, hair: 'short01' as const, garment: 'female-casual-01' as const, shoes: 'shoes01' as const, eyeColor: 'brown' as const, complexion: 'deep' as const }),
})

export type NativeWardrobeKind = 'native-hair' | 'native-garment' | 'native-shoes'
export const NATIVE_STARTER_ITEMS: readonly string[] = Object.freeze(['none', 'short01', 'female-casual-01', 'shoes01'])
export const NATIVE_BOUTIQUE_PRICES: Readonly<Record<NativeWardrobeKind, Readonly<Record<string, number>>>> = Object.freeze({
  'native-hair': Object.freeze({ none: 0, short01: 0, short02: 2500, bob01: 2000, afro01: 2500, braid01: 3500, ponytail01: 2000 }),
  'native-garment': Object.freeze({ 'female-casual-01': 0, 'female-casual-02': 4000, 'female-elegant-01': 8000, 'female-sport-01': 5000, 'male-worksuit-01': 5000, 'formal-suit-01': 8000, 'fitted-skirt-01': 7000 }),
  'native-shoes': Object.freeze({ shoes01: 0, shoes02: 1000, shoes03: 1500 }),
})

/** Canonicalize partial or untrusted recipe input to the complete native v2 shape. */
export function normalizeNativeRecipe(value: unknown): NativeCharacterRecipeV2 {
  const outer = record(value), appearance = record(outer.appearance), featuresIn = record(appearance.features), colorsIn = record(appearance.colors)
  const features = Object.fromEntries(NATIVE_CHARACTER_CATALOG.features.map((feature) => [feature.id, clamp(featuresIn[feature.id], feature.min, feature.max, 0)]))
  const garments = Array.isArray(appearance.garments) ? [...new Set(appearance.garments)].filter((id): id is NativeGarmentId => NATIVE_CHARACTER_CATALOG.garments.some((item) => item.id === id)).slice(0, 1) : []
  return {
    schema: 'allworld-character', version: 2,
    appearance: {
      version: 2,
      body: choose(NATIVE_CHARACTER_CATALOG.bodies, appearance.body, 'female'),
      hair: choose(NATIVE_CHARACTER_CATALOG.hair, appearance.hair, 'short01'),
      garments: garments.length ? garments : ['female-casual-01'],
      shoes: choose(NATIVE_CHARACTER_CATALOG.shoes, appearance.shoes, 'shoes01'),
      eyeColor: choose(NATIVE_CHARACTER_CATALOG.eyeColors, appearance.eyeColor, 'brown'),
      complexion: choose(NATIVE_CHARACTER_CATALOG.complexions, appearance.complexion, 'deep'),
      height: clamp(appearance.height, .85, 1.15, 1), features,
      colors: { skin: hex(colorsIn.skin), hair: hex(colorsIn.hair), upper: hex(colorsIn.upper), lower: hex(colorsIn.lower), shoes: hex(colorsIn.shoes) },
      handPose: choose(NATIVE_CHARACTER_CATALOG.handPoses, appearance.handPose, 'relaxed'),
    },
    emotion: choose(NATIVE_CHARACTER_CATALOG.emotions, outer.emotion, 'neutral'),
    emotionStrength: clamp(outer.emotionStrength, 0, 1, .7),
  }
}

export type NativeRecipeValidation = { ok: true; recipe: NativeCharacterRecipeV2 } | { ok: false; reason: string }

/** Validate without silently replacing any native choice. */
export function validateNativeRecipe(value: unknown): NativeRecipeValidation {
  const outer = record(value), appearance = record(outer.appearance), features = record(appearance.features), colors = record(appearance.colors)
  if (outer.schema !== 'allworld-character' || outer.version !== 2 || appearance.version !== 2) return { ok: false, reason: 'Use an Allworld character recipe, version 2.' }
  const membership: [readonly NativeOption[], unknown, string][] = [
    [NATIVE_CHARACTER_CATALOG.bodies, appearance.body, 'body'], [NATIVE_CHARACTER_CATALOG.hair, appearance.hair, 'hair'],
    [NATIVE_CHARACTER_CATALOG.shoes, appearance.shoes, 'shoes'], [NATIVE_CHARACTER_CATALOG.eyeColors, appearance.eyeColor, 'eye colour'],
    [NATIVE_CHARACTER_CATALOG.complexions, appearance.complexion, 'complexion'], [NATIVE_CHARACTER_CATALOG.handPoses, appearance.handPose, 'hand pose'],
    [NATIVE_CHARACTER_CATALOG.emotions, outer.emotion, 'emotion'],
  ]
  for (const [list, selected, label] of membership) if (!list.some((item) => item.id === selected)) return { ok: false, reason: `Choose a supported native ${label}.` }
  const garments = Array.isArray(appearance.garments) ? appearance.garments : []
  if (garments.length !== 1 || !NATIVE_CHARACTER_CATALOG.garments.some((item) => item.id === garments[0])) return { ok: false, reason: 'Choose one supported native outfit.' }
  if (typeof appearance.height !== 'number' || !Number.isFinite(appearance.height) || appearance.height < .85 || appearance.height > 1.15) return { ok: false, reason: 'Choose a height from 0.85 to 1.15.' }
  if (typeof outer.emotionStrength !== 'number' || !Number.isFinite(outer.emotionStrength) || outer.emotionStrength < 0 || outer.emotionStrength > 1) return { ok: false, reason: 'Choose an emotion strength from 0 to 1.' }
  const expectedFeatures = new Set(NATIVE_CHARACTER_CATALOG.features.map((item) => item.id))
  if (Object.keys(features).length !== expectedFeatures.size || Object.keys(features).some((id) => !expectedFeatures.has(id))) return { ok: false, reason: 'Keep every supported native face and body control in the recipe.' }
  for (const feature of NATIVE_CHARACTER_CATALOG.features) if (typeof features[feature.id] !== 'number' || !Number.isFinite(features[feature.id]) || Number(features[feature.id]) < feature.min || Number(features[feature.id]) > feature.max) return { ok: false, reason: `Choose ${feature.label} from ${feature.min} to ${feature.max}.` }
  const colorKeys: NativeColorField[] = ['skin', 'hair', 'upper', 'lower', 'shoes']
  if (Object.keys(colors).length !== colorKeys.length || colorKeys.some((key) => !/^#[0-9a-f]{6}$/i.test(String(colors[key] ?? '')))) return { ok: false, reason: 'Choose five native colours as six-digit hex values.' }
  return { ok: true, recipe: normalizeNativeRecipe(value) }
}

function hash(value: unknown): number {
  let result = 2166136261
  for (const char of String(value ?? 'allworld-character')) { result ^= char.charCodeAt(0); result = Math.imul(result, 16777619) }
  return result >>> 0
}
const seeded = <Id extends string>(list: readonly NativeOption<Id>[], seed: unknown, part: string): Id => list[hash(`${String(seed)}:${part}`) % list.length]!.id

const SKIN: Record<string, string> = { 'skin-1': '#e0ac7e', 'skin-2': '#c98e62', 'skin-3': '#b0764c', 'skin-4': '#96603c', 'skin-5': '#7a4a2c', 'skin-6': '#5e3620', 'skin-7': '#3f2416' }
const HAIR_COLOR: Record<string, string> = { black: '#15110f', 'soft-black': '#2a211d', 'dark-brown': '#3d2a1e', brown: '#5b3a24', auburn: '#8a3b22', blonde: '#d9b45f', purple: '#7b4bb0' }
const HAIR_MIGRATION: Record<string, NativeHairId> = { 'low-cut': 'short01', lowcut: 'short01', classic: 'short02', bald: 'none', fade: 'short01', afro: 'afro01', braids: 'braid01', cornrows: 'braid01', twists: 'braid01', locs: 'braid01', 'bantu-knots': 'afro01', curls: 'afro01', ponytail: 'ponytail01', bun: 'ponytail01', long: 'bob01', gele: 'none' }
const OUTFIT_MIGRATION: Record<string, NativeGarmentId> = { casual: 'female-casual-01', office: 'formal-suit-01', owambe: 'female-elegant-01', 'site-work': 'male-worksuit-01', sitework: 'male-worksuit-01', jersey: 'female-sport-01', hoodie: 'female-sport-01', chill: 'female-casual-02', kaftan: 'formal-suit-01', gown: 'female-elegant-01', agbada: 'formal-suit-01' }

/** Materialize a complete region-independent recipe. A saved native recipe always wins unchanged after normalization. Legacy skin and hair colour carry over, while garments start with their source atlas instead of inheriting unsupported fabric swatches. */
export function nativeRecipeForLook(look: unknown, seed: unknown = 'joinallworld'): NativeCharacterRecipeV2 {
  const source = record(look)
  if (source.native !== undefined) return normalizeNativeRecipe(source.native)
  if (source.schema === 'allworld-character') return normalizeNativeRecipe(source)
  const body: NativeBodyId = source.body === 'man' || source.body === 'male' ? 'male' : source.body === 'woman' || source.body === 'female' ? 'female' : seeded(NATIVE_CHARACTER_CATALOG.bodies, seed, 'body')
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

/** Replace only native fields; compatibility fields cannot overwrite the authoritative recipe. */
export function withNativeRecipe(look: unknown, recipe: unknown): Record<string, unknown> & { native: NativeCharacterRecipeV2 } {
  return { ...record(look), native: normalizeNativeRecipe(recipe) }
}
