import type { Instrument, Song, SongEvent, SectionKind } from './types.ts'
import { InstrumentBank, VoiceBudget } from './instruments.ts'
import { GROOVE_SHAKERS, STYLE_ARRANGEMENTS } from './songs.ts'

export const songBeats = (song: Song): number => song.sections.reduce((sum, section) => sum + section.bars * 4, 0)
export const songDuration = (song: Song): number => songBeats(song) * 60 / song.tempo
export const diatonicOffset = (rootOffset: number, note: number): number =>
  (rootOffset === 2 || rootOffset === 9) ? note === 4 ? 3 : note === 9 ? 10 : note : note

/** The same musical score drives browser scheduling and offline analysis. */
export function songEvents(song: Song): SongEvent[] {
  const events: SongEvent[] = []
  const arrangement = STYLE_ARRANGEMENTS[song.style]
  const add = (beat: number, duration: number, instrument: Instrument, midi: number | null, velocity: number, section: SectionKind, bar: number): void => {
    events.push({ beat, duration, instrument, midi, velocity, section, bar })
  }
  let absoluteBar = 0
  for (const section of song.sections) {
    for (let localBar = 0; localBar < section.bars; localBar++, absoluteBar++) {
      const rootOffset = song.progression[absoluteBar % song.progression.length] ?? 0
      const root = song.key + rootOffset
      const barBeat = absoluteBar * 4
      const sparse = section.kind === 'intro' || section.kind === 'break' || section.kind === 'outro'
      const motif = section.kind === 'B' || section.kind === 'break' || (section.kind === 'A-prime' && Math.floor(localBar / 2) % 2 === 1) ? song.answer : song.lead
      for (let step = 0; step < 8; step++) {
        const index = (localBar % 2) * 8 + step
        const note = motif[index]
        if (note === null || note === undefined || (sparse && step % 4 !== 0)) continue
        const prime = section.kind === 'A-prime'
        const weakVariant = prime && step % 4 !== 0
        const changed = !prime ? note : step % 4 === 0 ? (note === 0 ? 4 : note === 4 ? 7 : 0) : (note === 0 ? 2 : note === 2 ? 4 : note === 4 ? 7 : note === 7 ? 9 : 7)
        add(barBeat + step / 2 + (weakVariant ? 0.14 : 0), step % 4 === 0 ? 0.72 : 0.38, arrangement.lead, root + 12 + diatonicOffset(rootOffset, changed), step % 4 === 0 ? 0.82 : 0.66, section.kind, absoluteBar)
      }
      if (section.kind !== 'break') {
        add(barBeat, 0.62, arrangement.bass, root - 24, 0.86, section.kind, absoluteBar)
        if (!sparse) add(barBeat + 2.5, 0.36, arrangement.bass, root - 17, 0.62, section.kind, absoluteBar)
      }
      if (section.kind === 'intro' || section.kind === 'outro') continue
      if (section.kind !== 'break' || localBar % 2 === 0) for (const beat of arrangement.compBeats) {
        add(barBeat + beat, 0.32, arrangement.comp, root + diatonicOffset(rootOffset, beat < 2 ? 4 : 7), 0.42, section.kind, absoluteBar)
      }
      add(barBeat, 0.22, 'kick', null, arrangement.dance ? 0.64 : 0.46, section.kind, absoluteBar)
      if (arrangement.kickOnTwo) add(barBeat + 2, 0.2, 'kick', null, 0.42, section.kind, absoluteBar)
      if (localBar % 2 === 0) add(barBeat + 1, 0.14, arrangement.backbeat, null, 0.34, section.kind, absoluteBar)
      add(barBeat + 3, 0.14, arrangement.backbeat, null, 0.36, section.kind, absoluteBar)
      for (const beat of GROOVE_SHAKERS[song.groove] ?? GROOVE_SHAKERS[2] ?? []) {
        add(barBeat + beat, 0.1, 'shaker', null, 0.18, section.kind, absoluteBar)
      }
      const fill = arrangement.fill
      if (fill && localBar % 2 === 1) add(barBeat + fill.beat, fill.duration, fill.instrument, root + fill.octave, fill.velocity, section.kind, absoluteBar)
    }
  }
  return events.sort((a, b) => a.beat - b.beat)
}

const eventHash = (song: Song, index: number): number => {
  let hash = 2166136261
  for (const char of song.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619)
  return Math.imul(hash ^ index, 16777619) >>> 0
}

export { VoiceBudget } from './instruments.ts'

export class Band {
  readonly out: GainNode
  private readonly bank: InstrumentBank
  private readonly ctx: BaseAudioContext
  private score: SongEvent[] = []
  private song: Song | null = null
  private next = 0
  private at = 0
  private ended = false
  constructor(ctx: BaseAudioContext, destination: AudioNode, budget = new VoiceBudget(24)) {
    this.ctx = ctx
    this.out = ctx.createGain()
    this.out.gain.value = 1
    this.out.connect(destination)
    this.bank = new InstrumentBank(ctx, this.out, budget)
  }

  /** Install one score. Its first beat starts at `startAt`, and the return value is its exact end on the audio clock. */
  schedule(song: Song, startAt: number): number {
    this.bank.stop(0)
    this.score = songEvents(song)
    this.song = song
    this.next = 0
    this.at = Math.max(startAt, this.ctx.currentTime)
    this.ended = false
    this.out.gain.setValueAtTime(1, this.at)
    return this.at + songDuration(song)
  }

  fill(until: number): void {
    if (this.ended || !this.song) return
    const secondsPerBeat = 60 / this.song.tempo
    while (this.next < this.score.length) {
      const index = this.next
      const event = this.score[index]
      if (!event) break
      const swungBeat = event.beat + (event.beat % 1 === 0.5 ? 0.08 : 0)
      const hash = eventHash(this.song, index)
      const at = this.at + swungBeat * secondsPerBeat + (hash / 0xffffffff - 0.5) * 0.016
      if (at >= until) break
      this.next++
      if (at < this.ctx.currentTime - 0.05) continue
      const velocity = event.velocity * (1 + (((hash >>> 8) & 0xffff) / 65535 - 0.5) * 0.06)
      this.bank.play(event, Math.max(this.ctx.currentTime, at), event.duration * secondsPerBeat, velocity)
    }
  }

  stop(fade = 0.2): void {
    this.ended = true
    this.next = this.score.length
    const now = this.ctx.currentTime
    this.out.gain.cancelScheduledValues(now)
    this.out.gain.setValueAtTime(this.out.gain.value, now)
    this.out.gain.linearRampToValueAtTime(0, now + fade)
    this.bank.stop(fade)
  }

  dispose(): void { this.stop(0); this.bank.dispose(); this.out.disconnect() }
  get activeVoices(): number { return this.bank.activeVoices }
}
