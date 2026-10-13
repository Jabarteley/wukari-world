export type MusicStyle = 'highlife' | 'palm-wine' | 'juju' | 'afrobeats' | 'amapiano-lite' | 'cape-jazz' | 'bossa' | 'marimba'
export type SectionKind = 'intro' | 'A' | 'B' | 'break' | 'A-prime' | 'outro'
export type Instrument = 'guitar' | 'electric-bass' | 'upright-bass' | 'keys' | 'marimba' | 'kalimba' | 'brass' | 'shaker' | 'rim' | 'kick' | 'conga' | 'talking-drum' | 'log-drum' | 'clap'

export interface Section { readonly kind: SectionKind; readonly bars: number }

/** Melody slots are eighth notes across two bars. A number is a semitone offset from that bar's chord root. */
export interface Song {
  readonly id: string
  readonly title: string
  readonly style: MusicStyle
  readonly tempo: number
  readonly key: number // MIDI root
  readonly progression: readonly number[] // chord roots as semitones above key, one per bar
  readonly groove: number // 0..2, selects a rhythm variation
  readonly lead: readonly (number | null)[] // sixteen eighth-note slots
  readonly answer: readonly (number | null)[]
  readonly sections: readonly Section[]
}

export interface SongEvent {
  readonly beat: number
  readonly duration: number // beats
  readonly instrument: Instrument
  readonly midi: number | null
  readonly velocity: number
  readonly section: SectionKind
  readonly bar: number
}
