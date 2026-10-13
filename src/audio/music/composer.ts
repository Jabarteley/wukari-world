import { DEFAULT_SECTIONS, songs } from './songs.ts'
import type { MusicStyle, Song } from './types.ts'

const STYLES: readonly MusicStyle[] = ['highlife', 'palm-wine', 'juju', 'afrobeats', 'amapiano-lite', 'cape-jazz', 'bossa', 'marimba']
const ROOTS: readonly (readonly number[])[] = [
  [0, 5, 9, 7, 0, 5, 2, 7], [0, 7, 5, 0, 9, 5, 2, 7],
  [0, 9, 5, 7, 2, 5, 0, 7], [0, 5, 2, 7, 9, 5, 0, 7],
]
const CHORD = [0, 4, 7]
const PASSING = [2, 9]

function random(seed: number): () => number {
  let value = seed >>> 0
  return () => { value = (Math.imul(1664525, value) + 1013904223) >>> 0; return value / 0x100000000 }
}

/** A seed creates a complete original variation with a phrase and a related reply. */
export function composeSong(seed: number, style: MusicStyle): Song {
  const rand = random(seed ^ (STYLES.indexOf(style) + 1) * 0x9e3779b9)
  const choose = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T
  const reference = choose(songs.filter(song => song.style === style))
  const progression = choose(ROOTS).map((root, i) => i === 4 && rand() > 0.5 ? 9 : root)
  const key = choose([57, 60, 62, 64, 65, 67])
  const build = (original: readonly (number | null)[], reply: boolean): (number | null)[] => original.map((note, step) => {
    if (step % 4 === 0) return choose(CHORD)
    if (note === null) return rand() < 0.22 ? choose(PASSING) : null
    if (rand() < 0.16) return null
    if (reply && rand() < 0.4) return choose(PASSING)
    return rand() < 0.23 ? choose([...CHORD, ...PASSING]) : note
  })
  const lead = build(reference.lead, false)
  const answer = build(reference.answer, true)
  return {
    id: `generated-${style}-${seed >>> 0}`, title: `New ${style.replace('-', ' ')} tune`, style,
    tempo: Math.round(reference.tempo + (rand() - 0.5) * 12), key, progression,
    groove: Math.floor(rand() * 3), lead, answer, sections: DEFAULT_SECTIONS,
  }
}
