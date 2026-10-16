/**
 * OWNER: games (real-time)
 * A PLAYER'S NATIVE LOOK AT THE FIGHT TABLE: the public part of their character (body, hair, outfit, shoes, eyes, complexion, height,
 * five colours and the few face and body sliders that are not zero) in a short form that rides on a seat (`nat`, optional, cosmetic).
 * The server only checks and trims it (`unpackNativeLook` then `packNativeLook`); the 3D view dresses the fighter from it. A seat without
 * one (the computer, an older client) gets a varied default from its name (`defaultNativeLook`). Pure: no DOM, no three.js.
 */
import { NATIVE_BODY_IDS, NATIVE_FEATURE_LIMITS, normalizeNativeRecipe } from '../character/native-recipe.ts'
import type { NativeAppearanceV2 } from '../character/native-recipe.ts'
import type { ArenaNative } from '../types/arena.ts'

/** The biggest a packed look may be, in characters of JSON (about 130 to 400 in practice). */
export const NATIVE_LOOK_MAX = 900

const round = (n: number): number => Math.round(n * 100) / 100
const hex6 = (value: string): string => value.replace('#', '').toLowerCase()

/** The short form of an appearance. */
export function packNativeLook(a: NativeAppearanceV2): ArenaNative {
  const f: Record<string, number> = {}
  for (const [id, , min, max] of NATIVE_FEATURE_LIMITS) {
    const v = round(Math.min(max, Math.max(min, Number(a.features[id]) || 0)))
    if (v !== 0) f[id] = v
  }
  const c = a.colors
  return { b: a.body, h: a.hair, g: a.garments[0] ?? '', s: a.shoes, e: a.eyeColor, c: a.complexion, t: round(a.height), k: [c.skin, c.hair, c.upper, c.lower, c.shoes].map(hex6), ...(Object.keys(f).length ? { f } : {}) }
}

/** An appearance from untrusted input, or null when it is not a look this game knows. Unknown ids and out-of-range numbers are refused, not repaired. */
export function unpackNativeLook(value: unknown): NativeAppearanceV2 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const v = value as Record<string, unknown>
  if (JSON.stringify(value).length > NATIVE_LOOK_MAX) return null
  if (typeof v.b !== 'string' || !NATIVE_BODY_IDS.includes(v.b as 'male') || !Array.isArray(v.k) || v.k.length !== 5) return null
  if (!v.k.every((x) => typeof x === 'string' && /^[0-9a-f]{6}$/.test(x))) return null
  if (typeof v.t !== 'number' || !(v.t >= 0.85 && v.t <= 1.15)) return null
  const features: Record<string, number> = {}
  const f = v.f && typeof v.f === 'object' && !Array.isArray(v.f) ? v.f as Record<string, unknown> : {}
  for (const key of Object.keys(f)) {
    const limit = NATIVE_FEATURE_LIMITS.find((l) => l[0] === key)
    const n = f[key]
    if (!limit || typeof n !== 'number' || !(n >= limit[2] && n <= limit[3])) return null
    features[key] = n
  }
  const k = v.k as string[]
  const recipe = normalizeNativeRecipe({
    schema: 'allworld-character', version: 2,
    appearance: { version: 2, body: v.b, hair: v.h, garments: [v.g], shoes: v.s, eyeColor: v.e, complexion: v.c, height: v.t, features,
      colors: { skin: '#' + k[0], hair: '#' + k[1], upper: '#' + k[2], lower: '#' + k[3], shoes: '#' + k[4] } },
  })
  const a = recipe.appearance
  // normalize replaces an unknown id by a default: a look that changed under it is not the one that was sent.
  if (a.hair !== v.h || a.garments[0] !== v.g || a.shoes !== v.s || a.eyeColor !== v.e || a.complexion !== v.c) return null
  return a
}

/** The look the server keeps: valid, short and in canonical form, or undefined. */
export function cleanNativeLook(value: unknown): ArenaNative | undefined {
  const a = unpackNativeLook(value)
  return a ? packNativeLook(a) : undefined
}

// The world's own crowd is dressed from these pieces (NATIVE_CROWD_DEFAULTS in the character module), so they are on the phone already:
// a seat without a look of its own (the computer, an older client) gets them, varied by colour, height and a few sliders, and never costs a download.
const SKINS = ['#7a4a2c', '#96603c', '#5e3620', '#b0764c', '#3f2416', '#c98e62']
const UPPERS = ['#e8553d', '#2f80ed', '#e8a643', '#4cae6a', '#8a5bd0', '#e9e4d8', '#c0392b', '#16a085']
const LOWERS = ['#27314f', '#3b2a2a', '#2d3a2f', '#4a4a52']
const HAIRS = ['#15110f', '#2a211d', '#3d2a1e', '#5b3a24']
const hash = (text: string): number => { let h = 2166136261; for (const ch of text) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }

/**
 * A varied look for a seat that has none: the same name and seat always give the same fighter. `body` is the other fighter's body when
 * known (its files are on the phone for sure); otherwise one of the two crowd bodies. Only the crowd's pieces are used.
 */
export function defaultNativeLook(name: string, seat: number, body?: NativeAppearanceV2['body']): NativeAppearanceV2 {
  const h = hash(`${name}:${seat}`)
  const pick = <T,>(list: readonly T[], shift: number): T => list[(h >>> shift) % list.length] as T
  const slider = (shift: number, span: number): number => Math.round((((h >>> shift) % 1000) / 1000 - 0.5) * span * 100) / 100
  return normalizeNativeRecipe({
    schema: 'allworld-character', version: 2,
    appearance: { version: 2, body: body ?? (h & 1 ? 'male' : 'female'), hair: 'short01', garments: ['female-casual-01'], shoes: 'shoes01', eyeColor: 'brown', complexion: 'deep',
      height: 1 + (((h >>> 11) % 9) - 4) * 0.01,
      features: { muscle: 0.2 + slider(2, 0.5), weight: slider(5, 0.5), 'nose-width': slider(8, 0.4), 'chin-width': slider(14, 0.4), 'face-width': slider(17, 0.3) },
      colors: { skin: pick(SKINS, 3), hair: pick(HAIRS, 13), upper: pick(UPPERS, 7), lower: pick(LOWERS, 9), shoes: '#ffffff' } },
  }).appearance
}

/** Whether a phone may draw the real characters: enough memory and cores, and WebGL 2. Otherwise the stylised fighters are used. */
export function nativeFightersAllowed(env: { deviceMemory?: number; hardwareConcurrency?: number; webgl2: boolean }): boolean {
  if (!env.webgl2) return false
  if (env.deviceMemory !== undefined && env.deviceMemory < 3) return false
  if (env.hardwareConcurrency !== undefined && env.hardwareConcurrency < 4) return false
  return true
}
