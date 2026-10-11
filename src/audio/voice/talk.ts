// The talk sound: a stream of soft vowel-like syllables on the audio clock. One glottal-ish source (a sawtooth with its own lowpass, a
// little vibrato, a share of breath noise) runs through three band-pass formants whose centres glide from vowel to vowel; one gain
// envelope shapes each syllable. Everything is scheduled up front on the context's clock (no timers, no render loop), so a line is one
// small graph that ends itself.
import { VOWELS, semitones, type VoiceProfile } from './seed.ts'
import { lengthOf, type Syllable } from './syllables.ts'

export interface TalkOptions {
  /** Context time to begin. */
  at: number
  /** 0..1 level from the distance. */
  gain: number
  /** -1..1. */
  pan: number
  /** Lowpass in Hz from the distance. */
  cutoff: number
  /** A noise buffer for breath. */
  noise: AudioBuffer
  /** Extra breath over the voice's own (a laugh, a sigh), 0..1. */
  breath?: number
}
export interface Talk {
  /** Context time the last syllable ends. */
  end: number
  /** Fade out now. */
  stop(now: number): void
}

/** Peak of a full-level syllable before the voice bus. Three voices at full level stay far under the ceiling. */
export const TALK_PEAK = 1
const FLOOR = 0.0001
/** Formant bandwidth: Q of the three band-passes and how much of each is let through. */
const FORMANTS = [{ q: 5, g: 1 }, { q: 7, g: 0.6 }, { q: 9, g: 0.32 }] as const

export function talk(ctx: BaseAudioContext, dest: AudioNode, voice: VoiceProfile, list: readonly Syllable[], o: TalkOptions): Talk {
  const t0 = Math.max(o.at, ctx.currentTime)
  const end = t0 + lengthOf(list) + 0.06
  const nodes: AudioNode[] = [], sources: AudioScheduledSourceNode[] = []

  const osc = ctx.createOscillator(); osc.type = 'sawtooth'
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = voice.bright; warm.Q.value = 0.5
  const tone = ctx.createGain(); tone.gain.value = 1 - Math.min(0.5, voice.breath)
  osc.connect(warm); warm.connect(tone)
  const sum = ctx.createGain(); sum.gain.value = 0.55
  tone.connect(sum)
  nodes.push(osc, warm, tone, sum); sources.push(osc)

  const breath = Math.min(1, voice.breath + (o.breath ?? 0))
  const hiss = ctx.createBufferSource(); hiss.buffer = o.noise; hiss.loop = true
  const puff = ctx.createGain(); puff.gain.value = 0.9 * breath
  hiss.connect(puff); puff.connect(sum)
  nodes.push(hiss, puff); sources.push(hiss)

  if (voice.vibrato > 0) {
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2
    const depth = ctx.createGain(); depth.gain.value = voice.f0 * (semitones(voice.vibrato) - 1)
    lfo.connect(depth); depth.connect(osc.frequency); lfo.start(t0); lfo.stop(end + 0.05)
    nodes.push(lfo, depth); sources.push(lfo)
  }

  const env = ctx.createGain()
  env.gain.setValueAtTime(0, t0)
  const bands = FORMANTS.map(f => {
    const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.Q.value = f.q
    const level = ctx.createGain(); level.gain.value = f.g
    sum.connect(band); band.connect(level); level.connect(env)
    nodes.push(band, level)
    return band
  })
  const lowpass = ctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = o.cutoff; lowpass.Q.value = 0.4
  env.connect(lowpass); nodes.push(env, lowpass)
  let tail: AudioNode = lowpass
  if ('createStereoPanner' in ctx) {
    const panner = ctx.createStereoPanner(); panner.pan.value = o.pan
    lowpass.connect(panner); tail = panner; nodes.push(panner)
  }
  tail.connect(dest)

  // A higher voice puts fewer harmonics in each formant and would be louder: level them out.
  const level = Math.min(1.4, Math.max(0.55, Math.pow(120 / voice.f0, 0.5)))
  const first = list[0]
  osc.frequency.setValueAtTime(voice.f0 * semitones(first?.pitch ?? 0), t0)
  bands.forEach((band, i) => band.frequency.setValueAtTime(((VOWELS[first?.vowel ?? 0] as readonly number[])[i] as number) * voice.tract, t0))
  puff.gain.setValueAtTime(0.9 * breath, t0)
  for (const syl of list) {
    const t = t0 + syl.at, stop = t + syl.dur
    // A hint of life: no two syllables of a word land on exactly the same pitch.
    osc.frequency.setTargetAtTime(voice.f0 * semitones(syl.pitch + Math.sin(syl.at * 7.3) * voice.range * 0.18), t, 0.025)
    const vowel = VOWELS[syl.vowel] as readonly number[]
    bands.forEach((band, i) => band.frequency.setTargetAtTime((vowel[i] as number) * voice.tract, t, 0.02))
    const attack = syl.onset === 'stop' ? 0.006 : syl.onset === 'nasal' ? 0.035 : 0.022
    const peak = Math.max(FLOOR * 2, TALK_PEAK * level * o.gain * syl.gain * (syl.onset === 'nasal' ? 0.8 : 1))
    env.gain.setValueAtTime(FLOOR, t)
    env.gain.linearRampToValueAtTime(peak, t + attack)
    env.gain.linearRampToValueAtTime(peak * 0.75, t + syl.dur * 0.65)
    env.gain.linearRampToValueAtTime(FLOOR, stop)
    if (syl.onset === 'breath') { puff.gain.setValueAtTime(Math.min(1.4, 0.9 * breath + 0.7), t); puff.gain.setTargetAtTime(0.9 * breath, t + 0.02, 0.03) }
  }
  osc.start(t0); osc.stop(end + 0.05)
  hiss.start(t0, 0.2 + (voice.f0 % 1) * 3); hiss.stop(end + 0.05)

  let live = sources.length
  const done = (): void => { if (--live <= 0) for (const node of nodes) node.disconnect() }
  for (const source of sources) source.onended = done
  return {
    end,
    stop(now) {
      env.gain.cancelScheduledValues(now); env.gain.setTargetAtTime(0, now, 0.012)
      for (const source of sources) { try { source.stop(now + 0.06) } catch { /* already stopped */ } }
    },
  }
}
