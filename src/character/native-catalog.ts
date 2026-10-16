/** Labels and editor presets for lazy native-character interfaces and server-authored messages. */
import {
  NATIVE_BODY_IDS, NATIVE_COMPLEXION_IDS, NATIVE_EMOTION_IDS, NATIVE_EYE_COLOR_IDS,
  NATIVE_FEATURE_LIMITS, NATIVE_GARMENT_IDS, NATIVE_HAIR_IDS, NATIVE_HAND_POSE_IDS,
  NATIVE_SHOES_IDS,
} from './native-recipe.ts'
import type { NativeFeatureDescriptor, NativeOption } from './native-recipe.ts'

const label = <Id extends string>(ids: readonly Id[], labels: readonly string[]): readonly NativeOption<Id>[] =>
  Object.freeze(ids.map((id, index) => Object.freeze({ id, label: labels[index]! })))

const FEATURE_LABELS = [
  'Nose width', 'Nose depth', 'Nose height', 'Nose tip', 'Nostril width', 'Chin width',
  'Chin height', 'Chin projection', 'Chin prominence', 'Mouth width', 'Mouth height', 'Upper lip volume',
  'Lower lip volume', 'Brow height', 'Brow angle', 'Eye aperture', 'Eye width', 'Eye corner tilt',
  'Inner eye fold', 'Upper eye fold angle', 'Face width', 'Jaw width', 'Cheekbone prominence', 'Cheek volume',
  'East Asian head shape', 'Muscle mass', 'Body weight', 'Shoulder width', 'Upper back and chest',
  'Upper arm size', 'Chest / bust size', 'Waist circumference', 'Hip circumference', 'Buttock volume', 'Thigh size',
] as const

export const NATIVE_CHARACTER_CATALOG = Object.freeze({
  schemaVersion: 2 as const,
  bodies: label(NATIVE_BODY_IDS, ['Female', 'Male']),
  hair: label(NATIVE_HAIR_IDS, ['No added hair / close scalp', 'Short 01', 'Short 02', 'Bob 01', 'Afro 01', 'Braid 01', 'Ponytail 01']),
  garments: label(NATIVE_GARMENT_IDS, ['Casual suit 01', 'Casual suit 02', 'Blouse and skirt', 'Sportsuit 01', 'Worksuit 01', 'Formal suit with tie', 'Cropped top and skirt']),
  shoes: label(NATIVE_SHOES_IDS, ['Shoes 01', 'Shoes 02', 'Shoes 03']),
  eyeColors: label(NATIVE_EYE_COLOR_IDS, ['Dark brown', 'Light brown', 'Blue', 'Green', 'Grey']),
  complexions: label(NATIVE_COMPLEXION_IDS, ['Deep', 'Medium', 'Light']),
  handPoses: label(NATIVE_HAND_POSE_IDS, ['Relaxed', 'Open', 'Fist', 'Point', 'Peace']),
  emotions: label(NATIVE_EMOTION_IDS, ['Neutral', 'Happy', 'Sad', 'Angry', 'Surprised', 'Relaxed', 'Concerned']),
  features: Object.freeze(NATIVE_FEATURE_LIMITS.map(([id, group, min, max], index): NativeFeatureDescriptor => Object.freeze({ id, label: FEATURE_LABELS[index]!, group, min, max }))),
  bodyPresets: Object.freeze([
    { id: 'neutral', label: 'Base proportions', features: {} },
    { id: 'gym', label: 'Muscular build', features: { muscle: 1, 'shoulder-width': .7, 'upper-back-chest': .65, 'upper-arm-size': .7, weight: .15, 'thigh-size': .35, waist: -.25 } },
    { id: 'fuller-bust-small-waist', label: 'Fuller chest, smaller waist', features: { 'bust-size': .85, waist: -.55, weight: -.15, hips: .1 } },
    { id: 'fuller-hips-thighs', label: 'Fuller hips and thighs', features: { 'buttock-volume': .8, 'thigh-size': .7, hips: .6, waist: -.35 } },
  ] satisfies readonly { id: string; label: string; features: Readonly<Partial<Record<string, number>>> }[]),
  appearancePresets: Object.freeze([{ id: 'east-asian-starting-point', label: 'East Asian starting point', features: { 'east-asian-head': 1 } }] satisfies readonly { id: string; label: string; features: Readonly<Partial<Record<string, number>>> }[]),
})
