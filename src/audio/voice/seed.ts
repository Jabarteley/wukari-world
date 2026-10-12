// A voice from a seed: the same speaker always sounds like themselves, and two people nearby do not sound alike. The seed is a string
// (a regular's id, a player's public id, or the voice seed the server puts on a line). Nothing here touches the audio graph.

export type Build = 'man' | 'woman' | 'elder' | 'youth'
export interface VoiceProfile {
  build: Build
  /** Resting pitch, Hz. */
  f0: number
  /** How far the pitch wanders around it while talking, in semitones either way. */
  range: number
  /** Syllables a second at a steady pace. */
  speed: number
  /** 0..1 share of breath noise in the tone. */
  breath: number
  /** Vocal tract length factor: scales every formant (smaller heads, higher formants). */
  tract: number
  /** Vowels this person leans on, indices into VOWELS. */
  lean: readonly number[]
  /** Vibrato depth in semitones (an elder wavers a little). */
  vibrato: number
  /** Brightness of the tone, the cutoff of the source's own lowpass, Hz. */
  bright: number
  /** Pan the voice rests on when nothing else says where it is, -1..1. */
  home: number
}

/** [F1, F2, F3] of a, e, i, o, u in Hz for an average adult male tract. */
export const VOWELS: readonly (readonly [number, number, number])[] = [
  [730, 1090, 2440], [530, 1840, 2480], [270, 2290, 3010], [570, 840, 2410], [300, 870, 2240],
]

/** FNV-1a, 32 bits. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}
/** A small seeded generator (mulberry32): the next number in [0, 1) each call. */
export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Who a seed is, when nobody says: about a third each of men and women, then youths and elders. */
export function buildOf(seed: string): Build {
  const r = rng(hash(`build:${seed}`))()
  return r < 0.36 ? 'man' : r < 0.72 ? 'woman' : r < 0.86 ? 'youth' : 'elder'
}

/** The profile of a seed. A hint (a regular known to be an elder, say) overrides the build the seed would give. */
export function profileOf(seed: string, hint?: Build): VoiceProfile {
  const next = rng(hash(`voice:${seed}`))
  const build = hint ?? buildOf(seed)
  const woman = build === 'woman' || ((build === 'elder' || build === 'youth') && next() < 0.5)
  const between = (lo: number, hi: number): number => lo + next() * (hi - lo)
  let f0 = woman ? between(165, 260) : between(85, 150)
  let speed = between(6, 10.5), range = between(2.5, 5.5), breath = between(0.03, 0.22), tract = woman ? between(1.08, 1.26) : between(0.9, 1.1)
  let vibrato = 0, bright = between(2200, 4200)
  if (build === 'youth') { f0 *= between(1.1, 1.3); speed *= 1.15; range += 1; tract *= 1.05; bright += 300 }
  if (build === 'elder') { f0 *= woman ? between(0.84, 0.94) : between(0.9, 1.0); speed *= 0.78; range *= 0.7; breath += 0.1; vibrato = between(0.25, 0.6); bright -= 500 }
  const lean = [Math.floor(next() * 5), Math.floor(next() * 5)]
  return { build, f0, range, speed, breath, tract, lean, vibrato, bright, home: between(-0.5, 0.5) }
}

/** The semitone ratio. */
export const semitones = (n: number): number => Math.pow(2, n / 12)
