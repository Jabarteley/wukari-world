import type { Instrument, MusicStyle, Song, Section } from './types.ts'

export const DEFAULT_SECTIONS: readonly Section[] = [
  { kind: 'intro', bars: 2 }, { kind: 'A', bars: 8 }, { kind: 'B', bars: 8 },
  { kind: 'break', bars: 4 }, { kind: 'A-prime', bars: 8 }, { kind: 'outro', bars: 2 },
]

interface Arrangement {
  readonly lead: Instrument
  readonly comp: Instrument
  readonly bass: Instrument
  readonly compBeats: readonly number[]
  readonly dance: boolean
  readonly kickOnTwo: boolean
  readonly backbeat: 'clap' | 'rim'
  readonly fill?: { readonly instrument: Instrument; readonly beat: number; readonly duration: number; readonly velocity: number; readonly octave: number }
}

/** Style and groove parts are score data; the sequencer only places their events. */
export const STYLE_ARRANGEMENTS: Readonly<Record<MusicStyle, Arrangement>> = {
  highlife: { lead: 'guitar', comp: 'brass', bass: 'electric-bass', compBeats: [1.5, 3.5], dance: false, kickOnTwo: true, backbeat: 'rim' },
  'palm-wine': { lead: 'guitar', comp: 'kalimba', bass: 'upright-bass', compBeats: [1.5, 3.5], dance: false, kickOnTwo: false, backbeat: 'rim' },
  juju: { lead: 'guitar', comp: 'marimba', bass: 'electric-bass', compBeats: [1.5, 3.5], dance: true, kickOnTwo: true, backbeat: 'clap', fill: { instrument: 'talking-drum', beat: 3.5, duration: 0.22, velocity: 0.46, octave: -12 } },
  afrobeats: { lead: 'kalimba', comp: 'guitar', bass: 'electric-bass', compBeats: [1.5, 3.5], dance: true, kickOnTwo: true, backbeat: 'clap', fill: { instrument: 'conga', beat: 3.5, duration: 0.2, velocity: 0.34, octave: -12 } },
  'amapiano-lite': { lead: 'keys', comp: 'marimba', bass: 'log-drum', compBeats: [1.5, 3.5], dance: true, kickOnTwo: true, backbeat: 'clap', fill: { instrument: 'log-drum', beat: 3.5, duration: 0.3, velocity: 0.44, octave: -24 } },
  'cape-jazz': { lead: 'keys', comp: 'brass', bass: 'upright-bass', compBeats: [1, 3], dance: false, kickOnTwo: false, backbeat: 'rim' },
  bossa: { lead: 'guitar', comp: 'keys', bass: 'upright-bass', compBeats: [1, 2.5, 3.5], dance: false, kickOnTwo: false, backbeat: 'rim' },
  marimba: { lead: 'marimba', comp: 'kalimba', bass: 'upright-bass', compBeats: [1.5, 3.5], dance: false, kickOnTwo: false, backbeat: 'rim' },
}

export const GROOVE_SHAKERS: readonly (readonly number[])[] = [
  [0.5, 1.5, 2.5, 3.5], [0.5, 1.5, 3.5], [0.5, 2, 2.5, 3.5],
]

type Motif = readonly (number | null)[]
const arrange = (motif: Motif): Motif => motif.map((note, step) => {
  if (note === null || step % 4 !== 0 || note === 0 || note === 4 || note === 7) return note
  return note === 2 ? 4 : 7
})
const S = (id: string, title: string, style: MusicStyle, tempo: number, key: number, progression: readonly number[], groove: number, lead: Motif, answer: Motif): Song =>
  ({ id, title, style, tempo, key, progression, groove, lead: arrange(lead), answer: arrange(answer), sections: DEFAULT_SECTIONS })

/** Original short tunes. Every melody has a repeating question and a different answering phrase. */
export const songs: readonly Song[] = [
  S('market-sun', 'Market Sun', 'highlife', 114, 60, [0, 5, 9, 7, 0, 5, 2, 7], 0,
    [0, null, 2, 4, 7, null, 9, 7, 4, null, 2, 0, 7, null, 4, null],
    [4, null, 7, 9, 7, 4, 2, null, 0, null, 2, 4, 7, null, 0, null]),
  S('corner-parade', 'Corner Parade', 'highlife', 120, 65, [0, 7, 5, 0, 9, 5, 2, 7], 1,
    [7, null, 9, 7, 4, 2, null, 0, 4, null, 7, 9, 7, null, 4, null],
    [0, 2, null, 4, 7, 9, 7, null, 4, null, 2, 0, 7, null, 4, null]),
  S('veranda-strings', 'Veranda Strings', 'palm-wine', 100, 62, [0, 5, 7, 0, 9, 5, 2, 7], 0,
    [0, null, 4, 2, 7, null, 4, null, 4, 2, null, 0, 7, null, 9, null],
    [7, null, 4, 2, 0, null, 2, 4, 7, null, 9, 7, 4, null, 0, null]),
  S('evening-palm', 'Evening Palm', 'palm-wine', 94, 57, [0, 7, 2, 5, 9, 2, 5, 7], 2,
    [4, null, 2, 0, 7, null, 9, 7, 4, null, 2, 4, 7, null, 0, null],
    [0, null, 2, 4, 7, 9, null, 7, 4, null, 7, 9, 7, 4, 0, null]),
  S('talking-courtyard', 'Talking Courtyard', 'juju', 111, 60, [0, 5, 2, 7, 0, 9, 5, 7], 1,
    [0, 2, null, 4, 7, null, 9, 7, 4, null, 2, 0, 7, 9, 7, null],
    [7, null, 9, 7, 4, 2, 0, null, 4, null, 7, 9, 7, null, 0, null]),
  S('open-street', 'Open Street', 'afrobeats', 116, 64, [0, 9, 5, 7, 0, 2, 5, 7], 2,
    [0, null, 4, 7, 9, null, 7, 4, 7, null, 9, 7, 4, null, 2, null],
    [4, 2, null, 0, 7, 9, null, 7, 4, null, 2, 0, 7, null, 4, null]),
  S('bright-crossing', 'Bright Crossing', 'afrobeats', 122, 62, [0, 5, 9, 7, 2, 5, 0, 7], 0,
    [7, null, 4, 2, 0, null, 2, 4, 7, null, 9, 7, 4, null, 0, null],
    [0, null, 2, 4, 7, 9, null, 7, 4, 2, null, 0, 7, null, 4, null]),
  S('soft-log', 'Soft Log', 'amapiano-lite', 118, 57, [0, 9, 5, 7, 0, 5, 2, 7], 1,
    [0, null, 4, 7, 9, null, 7, null, 4, null, 2, 0, 7, null, 4, null],
    [7, null, 9, 7, 4, null, 2, 0, 4, null, 7, 9, 7, null, 0, null]),
  S('table-by-the-bay', 'Table by the Bay', 'cape-jazz', 104, 65, [0, 5, 2, 7, 9, 5, 2, 7], 2,
    [4, null, 7, 9, 7, null, 4, 2, 0, null, 2, 4, 7, null, 4, null],
    [7, 9, null, 7, 4, 2, null, 0, 4, null, 2, 0, 7, null, 4, null]),
  S('painted-room', 'Painted Room', 'bossa', 106, 60, [0, 9, 5, 7, 0, 5, 2, 7], 0,
    [0, null, 2, 4, 7, null, 9, 7, 4, null, 2, 0, 7, null, 4, null],
    [4, null, 7, 9, 7, 4, null, 2, 0, null, 2, 4, 7, null, 0, null]),
  S('garden-steps', 'Garden Steps', 'marimba', 110, 67, [0, 5, 9, 7, 0, 2, 5, 7], 1,
    [7, null, 9, 7, 4, null, 2, 0, 4, null, 7, 9, 7, null, 4, null],
    [0, 2, null, 4, 7, 9, 7, null, 4, null, 2, 0, 7, null, 0, null]),
  S('rain-windows', 'Rain Windows', 'cape-jazz', 92, 62, [0, 5, 2, 7, 9, 5, 0, 7], 0,
    [0, null, 4, 2, 7, null, 9, 7, 4, null, 2, 0, 7, null, 4, null],
    [4, null, 7, 9, 7, null, 4, 2, 0, null, 2, 4, 7, null, 0, null]),
]
