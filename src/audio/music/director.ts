import { Band } from './sequencer.ts'
import { VoiceBudget } from './instruments.ts'
import { songs } from './songs.ts'
import { composeSong } from './composer.ts'
import { CONTEXT_STYLES, nextBar, type MusicContext } from './context.ts'
import { levelFor } from '../levels.ts'
import type { SoundSettings } from '../settings.ts'

interface Playing {
  id: string
  start: number
  end: number
  tempo: number
  out: GainNode
  close: () => void
  stop: (fade: number) => void
  fill: (until: number) => void
}
export interface MusicDeps {
  settings: () => SoundSettings
  every: (run: () => void, ms: number) => () => void
  speaking?: () => boolean
  destination?: AudioNode
}
/** One bounded audio-clock scheduler for original songs. No media downloads or render-loop work. */
export class MusicDirector {
  private readonly ctx: AudioContext
  private readonly deps: MusicDeps
  private readonly bus: GainNode
  private readonly budget = new VoiceBudget(24)
  private current: Playing | null = null
  private fading: Playing | null = null
  private fadeEnd = 0
  private context: MusicContext = 'creator'
  private pending: { at: number } | null = null
  private hidden = false
  private call = false
  private gameUntil = 0
  private duckUntil = 0
  private gainTarget = 0
  private serial = 0
  private lastId = ''
  private stopTick: (() => void) | null = null
  private disposed = false
  private readonly retiring = new Map<Playing, ReturnType<typeof setTimeout>>()

  constructor(ctx: AudioContext, deps: MusicDeps) {
    this.ctx = ctx; this.deps = deps
    this.bus = ctx.createGain(); this.bus.gain.value = 0; this.bus.connect(deps.destination ?? ctx.destination)
  }
  private allowed(): boolean { return !this.disposed && !this.hidden && this.ctx.state === 'running' && levelFor(this.deps.settings(), 'music') > 0 }
  refresh(): void {
    if (!this.allowed()) { this.silence(); return }
    this.mix()
    this.stopTick ??= this.deps.every(() => this.tick(), 50)
    if (!this.current && this.context !== 'venue') this.begin(this.ctx.currentTime + 0.08)
  }
  setContext(context: MusicContext): void {
    if (context === this.context) return
    this.context = context
    if (!this.current) { this.refresh(); return }
    this.pending = { at: nextBar(this.ctx.currentTime + 0.15, this.current.start, this.current.tempo) }
  }
  setHidden(hidden: boolean): void { this.hidden = hidden; this.refresh() }
  setCall(on: boolean): void { this.call = on; this.mix() }
  duck(seconds = 0.45): void { this.duckUntil = Math.max(this.duckUntil, this.ctx.currentTime + seconds); this.mix() }
  game(): void { this.gameUntil = this.ctx.currentTime + 8; this.mix() }
  private mix(): void {
    const t = this.ctx.currentTime
    const factor = this.call ? 0.12 : t < this.gameUntil ? 0.2 : this.deps.speaking?.() || t < this.duckUntil ? 0.25 : 1
    const target = this.allowed() ? levelFor(this.deps.settings(), 'music') * factor : 0
    if (target === this.gainTarget) return
    this.gainTarget = target
    this.bus.gain.setTargetAtTime(target, t, 0.035)
  }
  private tick(): void {
    if (!this.allowed()) { this.silence(); return }
    const now = this.ctx.currentTime
    this.mix()
    if (this.fading && now >= this.fadeEnd) { this.fading.close(); this.fading = null }
    if (this.pending && this.pending.at <= now + 0.12) {
      const at = Math.max(now, this.pending.at)
      this.pending = null; this.begin(at)
    } else if (!this.pending && this.current && now + 0.12 >= this.current.end) {
      const at = this.current.end + (this.serial % 4 === 0 ? 240 / this.current.tempo : 0)
      this.pending = { at }
      // End at a bar line; occasionally leave a bar of silence.
      if (at > this.current.end) this.current.out.gain.setTargetAtTime(0, this.current.end - 0.4, 0.08)
    }
    this.current?.fill(now + 0.18)
    this.fading?.fill(Math.min(now + 0.18, this.fadeEnd))
  }
  private begin(at: number): void {
    this.fading?.close(); this.fading = null
    const previous = this.current
    this.current = null
    if (previous && previous.end < at) previous.close()
    else if (previous) {
      this.fading = previous; this.fadeEnd = at + 0.75
      previous.out.gain.cancelScheduledValues(at)
      previous.out.gain.setValueAtTime(1, at)
      previous.out.gain.linearRampToValueAtTime(0, this.fadeEnd)
    }
    if (this.context === 'venue') return
    this.serial++
    this.current = this.generate(at)
    this.lastId = this.current.id
    this.current.out.gain.setValueAtTime(0, at)
    this.current.out.gain.linearRampToValueAtTime(1, at + 0.75)
    this.current.fill(at + 0.18)
  }
  private generate(at: number): Playing {
    const styles = CONTEXT_STYLES[this.context === 'venue' ? 'street' : this.context]
    const candidates = songs.filter(song => styles.includes(song.style) && song.id !== this.lastId)
    const style = styles[this.serial % styles.length] ?? 'highlife'
    const song = this.serial % 5 === 0 ? composeSong(this.serial * 7919, style) : candidates[this.serial % Math.max(candidates.length, 1)] ?? composeSong(this.serial, style)
    const band = new Band(this.ctx, this.bus, this.budget)
    const end = band.schedule(song, at)
    return { id: song.id, start: at, end, tempo: song.tempo, out: band.out, close: () => band.dispose(), stop: fade => band.stop(fade), fill: until => band.fill(until) }
  }
  private silence(): void {
    this.stopTick?.(); this.stopTick = null
    for (const playing of [this.current, this.fading]) if (playing) {
      playing.stop(0.035)
      this.retiring.set(playing, setTimeout(() => { playing.close(); this.retiring.delete(playing) }, 50))
    }
    this.current = null; this.fading = null; this.pending = null
    this.gainTarget = 0
  }
  dispose(): void {
    this.disposed = true; this.silence()
    for (const [playing, timer] of this.retiring) { clearTimeout(timer); playing.close() }
    this.retiring.clear(); this.bus.disconnect()
  }
}
