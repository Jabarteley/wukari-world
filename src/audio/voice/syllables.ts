// Text to a stream of soft syllables: one blip per syllable (a vowel group), or every three letters for a word with no vowel, a pause at
// a space and a longer one at a comma or full stop, a rise on a question, a lift on an exclamation. Pure: no audio, no clock.
import { VOWELS, type VoiceProfile } from './seed.ts'

export type Onset = 'plain' | 'breath' | 'stop' | 'nasal'
export interface Syllable {
  /** Start, seconds from the first syllable. */
  at: number
  dur: number
  /** Index into VOWELS. */
  vowel: number
  onset: Onset
  /** Pitch relative to the speaker's resting pitch, semitones. */
  pitch: number
  /** 0..1.4, relative loudness. */
  gain: number
  /** The first syllable of a word. */
  word: boolean
}

export const MAX_SECONDS = 5.5
export const MAX_SYLLABLES = 48
const VOWEL_LETTERS = 'aeiouy'
const BREATHY = 'shfxz', STOPS = 'bdgptkc', NASAL = 'mn'

const vowelIndex = (letter: string): number => 'aeiou'.indexOf(letter === 'y' ? 'i' : letter)

interface Chunk { letters: string; vowel: number; onset: Onset }

/** The syllable chunks of one word, from its vowel groups (a trailing silent e does not count). */
export function chunksOf(word: string): Chunk[] {
  const w = word.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!w) return []
  if (/^[0-9]+$/.test(w)) return [...w].map((d, i) => ({ letters: d, vowel: (Number(d) + i) % 5, onset: 'stop' as const }))
  const groups: { start: number; end: number; letter: string }[] = []
  for (let i = 0; i < w.length; i++) {
    if (!VOWEL_LETTERS.includes(w[i] as string)) continue
    const last = groups[groups.length - 1]
    if (last && last.end === i) { last.end = i + 1; continue }
    groups.push({ start: i, end: i + 1, letter: w[i] as string })
  }
  if (groups.length > 1) { const tail = groups[groups.length - 1] as { start: number; end: number; letter: string }; if (tail.letter === 'e' && tail.start === w.length - 1 && !'aeiouy'.includes(w[tail.start - 1] as string)) groups.pop() }
  if (!groups.length) {
    const out: Chunk[] = []
    for (let i = 0; i < w.length; i += 3) out.push({ letters: w.slice(i, i + 3), vowel: (w.charCodeAt(i) + i) % 5, onset: 'nasal' })
    return out
  }
  return groups.map((g, i) => {
    const lead = g.start > 0 ? (w[g.start - 1] as string) : ''
    const onset: Onset = BREATHY.includes(lead) ? 'breath' : STOPS.includes(lead) ? 'stop' : NASAL.includes(lead) ? 'nasal' : 'plain'
    return { letters: w.slice(i === 0 ? 0 : g.start, g.end), vowel: vowelIndex(g.letter), onset }
  })
}

/** Pauses after a word, in seconds, by the punctuation that follows it. */
function pauseAfter(token: string): number {
  const end = token.replace(/["')\]]+$/, '').slice(-1)
  if (/[.!?…]/.test(end)) return 0.34
  if (/[,;:–—-]/.test(end)) return 0.18
  return 0.065
}

/** The syllables of a line for a voice. `rate` scales the pace (1 = the voice's own). The line is cut at MAX_SECONDS / MAX_SYLLABLES. */
export function syllablesOf(text: string, voice: Pick<VoiceProfile, 'speed' | 'range' | 'lean'>, rate = 1): Syllable[] {
  const tokens = text.replace(/[\u0000-\u001f]/g, ' ').trim().split(/\s+/).filter(Boolean)
  const out: Syllable[] = []
  let clock = 0
  const beat = 1 / Math.max(2, voice.speed * rate)
  let sentenceStart = 0
  for (const token of tokens) {
    const chunks = chunksOf(token)
    const question = /\?["')\]]*$/.test(token), shout = /!["')\]]*$/.test(token)
    chunks.forEach((chunk, index) => {
      const long = index === chunks.length - 1 && /[.!?,]/.test(token.slice(-2))
      const dur = beat * (long ? 1.25 : 0.85)
      out.push({
        at: clock, dur: Math.min(0.3, dur), vowel: chunk.vowel < 0 ? (voice.lean[0] ?? 0) : chunk.vowel, onset: chunk.onset,
        // A first syllable carries the stress; the rest of a word is a little lower.
        pitch: index === 0 ? 0.8 : -0.4, gain: index === 0 ? 1 : 0.8, word: index === 0,
      })
      clock += beat
    })
    if (out.length && chunks.length) {
      const last = out[out.length - 1] as Syllable
      if (question) {
        // The last two syllables of a question climb.
        const from = Math.max(sentenceStart, out.length - 2)
        for (let i = from; i < out.length; i++) (out[i] as Syllable).pitch += (i === out.length - 1 ? 5 : 2.5) * Math.min(1, voice.range / 3)
        last.dur = Math.min(0.34, last.dur * 1.3)
      } else if (shout) {
        for (let i = Math.max(sentenceStart, out.length - 2); i < out.length; i++) { const s = out[i] as Syllable; s.gain *= 1.3; s.pitch += 2.5 }
      }
      if (/[.!?…]["')\]]*$/.test(token)) {
        // A statement settles: pitch falls across the sentence.
        const count = out.length - sentenceStart
        for (let i = sentenceStart; i < out.length && !question; i++) (out[i] as Syllable).pitch -= 2.4 * ((i - sentenceStart) / Math.max(1, count - 1))
        sentenceStart = out.length
      }
    }
    clock += pauseAfter(token)
    if (out.length >= MAX_SYLLABLES || clock > MAX_SECONDS) break
  }
  // Clip the tail: no syllable begins after the limit.
  const kept = out.filter((s, i) => i < MAX_SYLLABLES && s.at < MAX_SECONDS)
  return kept
}

/** Seconds a set of syllables takes, to the end of the last one. */
export const lengthOf = (list: readonly Syllable[]): number => list.length ? (list[list.length - 1] as Syllable).at + (list[list.length - 1] as Syllable).dur : 0
export { VOWELS }
