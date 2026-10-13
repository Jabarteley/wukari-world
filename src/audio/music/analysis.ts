import { songBeats, songEvents } from './sequencer.ts'
import type { Instrument, Song, SongEvent } from './types.ts'

export interface SongAnalysis {
  readonly tempo: number
  readonly distinctPitches: number
  readonly notesPerBar: Readonly<Partial<Record<Instrument, number>>>
  readonly chordChangesPerEightBars: number
  readonly strongBeatChordToneShare: number
  readonly rhythmicPatterns: number
  readonly pitchHistogramDrift: number
  readonly onsetDrift: number
  readonly monotony: boolean
}

const normalise = (events: readonly SongEvent[], key: number): number[] => {
  const bins = Array.from({ length: 12 }, () => 0)
  for (const event of events) if (event.midi !== null) {
    const at = ((event.midi - key) % 12 + 12) % 12
    bins[at] = (bins[at] ?? 0) + 1
  }
  const sum = bins.reduce((a, b) => a + b, 0)
  return bins.map(value => sum ? value / sum : 0)
}
const distance = (a: readonly number[], b: readonly number[]): number => a.reduce((sum, value, i) => sum + Math.abs(value - (b[i] ?? 0)), 0) / 2
const onsets = (events: readonly SongEvent[]): Set<number> => new Set(events.filter(event => event.midi !== null && event.instrument !== 'electric-bass' && event.instrument !== 'upright-bass').map(event => Math.round((event.beat % 8) * 4)))
const jaccardDistance = (a: Set<number>, b: Set<number>): number => {
  const all = new Set([...a, ...b])
  if (!all.size) return 0
  let intersection = 0
  for (const value of a) if (b.has(value)) intersection++
  return 1 - intersection / all.size
}

export function analyzeSong(song: Song): SongAnalysis {
  const events = songEvents(song)
  const bars = songBeats(song) / 4
  const melodic = events.filter(event => event.midi !== null && event.instrument !== 'electric-bass' && event.instrument !== 'upright-bass' && event.instrument !== 'log-drum')
  const pitches = new Set(melodic.map(event => event.midi))
  const counts: Partial<Record<Instrument, number>> = {}
  for (const event of events) counts[event.instrument] = (counts[event.instrument] ?? 0) + 1
  for (const key of Object.keys(counts) as Instrument[]) counts[key] = (counts[key] ?? 0) / bars
  const strong = melodic.filter(event => event.beat % 2 === 0)
  const chordTone = strong.filter(event => {
    const root = song.key + (song.progression[event.bar % song.progression.length] ?? 0)
    const pitchClass = (((event.midi ?? 0) - root) % 12 + 12) % 12
    const third = ((song.progression[event.bar % song.progression.length] ?? 0) === 2 || (song.progression[event.bar % song.progression.length] ?? 0) === 9) ? 3 : 4
    return pitchClass === 0 || pitchClass === third || pitchClass === 7
  })
  const patterns = new Set<string>()
  for (let bar = 0; bar < bars; bar += 2) {
    const phrase = melodic.filter(event => event.bar >= bar && event.bar < bar + 2)
    patterns.add(phrase.map(event => Math.round((event.beat - bar * 4) * 4)).join(','))
  }
  const third = songBeats(song) / 3
  const first = melodic.filter(event => event.beat < third)
  const last = melodic.filter(event => event.beat >= 2 * third)
  const pitchDrift = distance(normalise(first, song.key), normalise(last, song.key))
  const onsetDrift = jaccardDistance(onsets(first), onsets(last))
  let chordChanges = 0
  for (let bar = 1; bar < 8; bar++) if (song.progression[(bar - 1) % song.progression.length] !== song.progression[bar % song.progression.length]) chordChanges++
  return {
    tempo: song.tempo, distinctPitches: pitches.size, notesPerBar: counts,
    chordChangesPerEightBars: chordChanges,
    strongBeatChordToneShare: strong.length ? chordTone.length / strong.length : 0,
    rhythmicPatterns: patterns.size, pitchHistogramDrift: pitchDrift, onsetDrift,
    monotony: pitches.size < 6 || patterns.size < 3 || pitchDrift < 0.05 || onsetDrift < 0.12,
  }
}
