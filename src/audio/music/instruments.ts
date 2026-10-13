import type { Instrument, SongEvent } from './types.ts'

interface Reservation { start: number; end: number }

/** Shared by overlapping bands, so crossfades obey one global music voice limit. */
export class VoiceBudget {
  private readonly voices = new Set<Reservation>()
  readonly max: number
  constructor(max = 24) { this.max = max }
  reserve(start: number, end: number): Reservation | null {
    let overlap = 0
    for (const voice of this.voices) if (voice.start < end && voice.end > start) overlap++
    if (overlap >= this.max) return null
    const reservation = { start, end }
    this.voices.add(reservation)
    return reservation
  }
  release(voice: Reservation): void { this.voices.delete(voice) }
  count(now: number): number { let total = 0; for (const voice of this.voices) if (voice.start <= now && voice.end > now) total++; return total }
}

interface PlayedVoice { readonly reservation: Reservation; readonly sources: AudioScheduledSourceNode[]; readonly nodes: AudioNode[]; readonly start: number; readonly end: number }
const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12)
const FLOOR = 0.0001

/** Small one-shot physical-ish timbres; all percussion noise is a short finite burst. */
export class InstrumentBank {
  private readonly voices = new Set<PlayedVoice>()
  private readonly noise: AudioBuffer
  private readonly ctx: BaseAudioContext
  private readonly destination: AudioNode
  private readonly budget: VoiceBudget
  private readonly room: AudioNode[]
  private readonly roomInput: GainNode
  private readonly mix: GainNode
  constructor(ctx: BaseAudioContext, destination: AudioNode, budget: VoiceBudget) {
    this.ctx = ctx; this.destination = destination; this.budget = budget
    this.mix = ctx.createGain(); this.mix.gain.value = 2.4
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -10; comp.knee.value = 3; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.12
    this.mix.connect(comp); comp.connect(destination)
    this.roomInput = ctx.createGain(); this.roomInput.gain.value = 0.12
    const delay = ctx.createDelay(0.2); delay.delayTime.value = 0.083
    const dark = ctx.createBiquadFilter(); dark.type = 'lowpass'; dark.frequency.value = 2100
    const feedback = ctx.createGain(); feedback.gain.value = 0.17
    const wet = ctx.createGain(); wet.gain.value = 0.22
    this.roomInput.connect(delay); delay.connect(dark); dark.connect(feedback); feedback.connect(delay); dark.connect(wet); wet.connect(this.mix)
    this.room = [this.roomInput, delay, dark, feedback, wet, this.mix, comp]
    const length = Math.ceil(ctx.sampleRate * 0.18)
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    let value = 0x12345678
    for (let i = 0; i < length; i++) { value ^= value << 13; value ^= value >>> 17; value ^= value << 5; data[i] = ((value >>> 0) / 0x80000000 - 1) * (1 - i / length) }
  }

  get activeVoices(): number { return this.budget.count(this.ctx.currentTime) }

  play(event: SongEvent, at: number, duration: number, velocity = event.velocity): boolean {
    const kind = event.instrument
    const percussive = kind === 'shaker' || kind === 'rim' || kind === 'kick' || kind === 'conga' || kind === 'talking-drum' || kind === 'clap' || kind === 'log-drum'
    const decay = percussive ? Math.min(0.34, duration) : Math.min(0.75, duration)
    const end = at + Math.max(0.07, decay) + 0.03
    const reservation = this.budget.reserve(at, end)
    if (!reservation) return false
    const nodes: AudioNode[] = [], sources: AudioScheduledSourceNode[] = []
    const pitch = midiHz(event.midi ?? 48)
    const vel = velocity
    const output = this.ctx.createGain(); nodes.push(output)
    output.gain.value = 0.18 * vel
    output.connect(this.mix)
    output.connect(this.roomInput)
    const tone = (wave: OscillatorType, ratio: number, amount: number, sustain: number, attack = 0.004, filterHz?: number, bend = 1, fm?: readonly [number, number]): void => {
      const oscillator = this.ctx.createOscillator()
      oscillator.type = wave
      oscillator.frequency.setValueAtTime(pitch * ratio * bend, at)
      if (bend !== 1) oscillator.frequency.exponentialRampToValueAtTime(pitch * ratio, at + Math.min(0.16, sustain))
      let last: AudioNode = oscillator
      nodes.push(oscillator); sources.push(oscillator)
      if (fm) {
        const modulator = this.ctx.createOscillator(), depth = this.ctx.createGain()
        modulator.type = 'sine'; modulator.frequency.value = pitch * ratio * fm[0]
        const peak = pitch * ratio * fm[1]
        depth.gain.setValueAtTime(peak, at)
        depth.gain.exponentialRampToValueAtTime(Math.max(0.001, peak * 0.06), at + Math.min(0.12, sustain * 0.45))
        depth.gain.linearRampToValueAtTime(0, at + sustain)
        modulator.connect(depth); depth.connect(oscillator.frequency)
        modulator.start(at); modulator.stop(at + sustain + 0.02)
        nodes.push(modulator, depth); sources.push(modulator)
      }
      if (filterHz) { const filter = this.ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterHz; filter.Q.value = 0.7; last.connect(filter); last = filter; nodes.push(filter) }
      const envelope = this.ctx.createGain(); nodes.push(envelope)
      envelope.gain.setValueAtTime(FLOOR, at)
      envelope.gain.linearRampToValueAtTime(amount, at + attack)
      if (!percussive) {
        const body = kind === 'guitar' ? 0.32 : kind === 'electric-bass' || kind === 'upright-bass' ? 0.58 : 0.43
        envelope.gain.linearRampToValueAtTime(amount * body, at + sustain * 0.72)
      }
      envelope.gain.exponentialRampToValueAtTime(FLOOR, at + sustain)
      last.connect(envelope); envelope.connect(output)
      oscillator.start(at); oscillator.stop(at + sustain + 0.02)
    }
    const burst = (amount: number, length: number, highpass: number, offset = 0): void => {
      const start = at + offset
      const source = this.ctx.createBufferSource(); source.buffer = this.noise
      const filter = this.ctx.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = highpass
      const envelope = this.ctx.createGain()
      envelope.gain.setValueAtTime(FLOOR, start)
      envelope.gain.linearRampToValueAtTime(amount, start + 0.002)
      envelope.gain.exponentialRampToValueAtTime(FLOOR, start + length)
      source.connect(filter); filter.connect(envelope); envelope.connect(output)
      source.start(start); source.stop(start + length + 0.005)
      sources.push(source); nodes.push(source, filter, envelope)
    }
    switch (kind) {
      case 'guitar':
        // A brief string-like FM bite falls into a filtered wooden body.
        tone('triangle', 1, 0.82, decay, 0.003, 3300, 1, [2.01, 0.18])
        tone('sine', 3, 0.08, decay * 0.25)
        break
      case 'electric-bass':
        tone('sine', 1, 0.9, decay, 0.008)
        tone('triangle', 2, 0.13, decay * 0.55, 0.004, 900)
        break
      case 'upright-bass':
        tone('triangle', 1, 0.8, decay, 0.014, 1100)
        tone('sine', 2, 0.14, decay * 0.25)
        break
      case 'keys':
        // A soft tine excitation decays into a warm Rhodes-like body.
        tone('sine', 1, 0.73, decay, 0.006, 2500, 1, [2, 0.25])
        tone('sine', 3, 0.09, decay * 0.38, 0.002)
        break
      case 'marimba':
        tone('sine', 1, 0.85, decay, 0.002)
        tone('sine', 4, 0.22, decay * 0.22, 0.002)
        break
      case 'kalimba':
        tone('sine', 1, 0.72, decay, 0.002)
        tone('sine', 2.95, 0.23, decay * 0.48, 0.002)
        break
      case 'brass':
        tone('sawtooth', 1, 0.36, decay * 0.8, 0.025, 1800)
        tone('sawtooth', 1.005, 0.22, decay * 0.8, 0.03, 1300)
        break
      case 'kick':
        tone('sine', 0.35, 0.88, 0.19, 0.002, undefined, 2.2)
        break
      case 'log-drum':
        tone('sine', 1, 0.9, Math.min(0.33, decay), 0.002, undefined, 1.7)
        tone('triangle', 2, 0.16, 0.08)
        break
      case 'conga':
        tone('sine', 1.7, 0.62, 0.2, 0.002, undefined, 1.4)
        burst(0.12, 0.035, 700)
        break
      case 'talking-drum':
        tone('triangle', 2, 0.57, 0.24, 0.004, 1500, 1.5)
        tone('sine', 3, 0.13, 0.12)
        break
      case 'rim':
        tone('triangle', 8, 0.4, 0.065, 0.002, 3500)
        burst(0.12, 0.025, 2500)
        break
      case 'shaker':
        burst(0.28, 0.055, 3700)
        break
      case 'clap':
        burst(0.19, 0.038, 1400)
        burst(0.14, 0.035, 1400, 0.022)
        burst(0.12, 0.05, 1400, 0.046)
        break
      default: {
        const exhaustive: never = kind
        return exhaustive
      }
    }
    const voice: PlayedVoice = { reservation, sources, nodes, start: at, end }
    this.voices.add(voice)
    let remaining = sources.length
    for (const source of sources) source.onended = () => {
      remaining--
      if (remaining !== 0) return
      this.voices.delete(voice); this.budget.release(reservation)
      for (const node of nodes) node.disconnect()
    }
    return true
  }

  stop(fade: number): void {
    const now = this.ctx.currentTime
    for (const voice of this.voices) {
      const when = Math.max(now + fade, voice.start + 0.001)
      for (const source of voice.sources) { try { source.stop(when) } catch { /* source already ended */ } }
      this.budget.release(voice.reservation)
    }
    this.voices.clear()
  }
  dispose(): void { this.stop(0); for (const node of this.room) node.disconnect() }
}
