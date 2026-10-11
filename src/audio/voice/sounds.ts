// Non-speech human sounds, each a tiny recipe: a laugh, a call across the way, a hum, a whistle, a seller's call, a crowd's cheer and a
// footstep. The vocal ones are syllable lists for the same talk voice; the whistle and the footstep are plain oscillator and noise.
import { hash, rng, semitones, type VoiceProfile } from './seed.ts'
import type { Syllable } from './syllables.ts'
import { talk, type Talk, type TalkOptions } from './talk.ts'

export type Cue = 'laugh' | 'call' | 'hum' | 'whistle' | 'seller' | 'cheer' | 'step'
export const CUES: readonly Cue[] = ['laugh', 'call', 'hum', 'whistle', 'seller', 'cheer', 'step']

const syl = (at: number, dur: number, vowel: number, pitch: number, gain: number, onset: Syllable['onset'] = 'plain'): Syllable => ({ at, dur, vowel, pitch, gain, onset, word: true })

/** "ha ha ha ha": breathy onsets, falling away. */
export function laughOf(seed: string): Syllable[] {
  const next = rng(hash(`laugh:${seed}`)), count = 3 + Math.floor(next() * 3), out: Syllable[] = []
  for (let i = 0; i < count; i++) out.push(syl(i * (0.15 + next() * 0.03), 0.1, 0, 4 - i * 1.1 + next() * 0.6, 1.1 - i * 0.12, 'breath'))
  return out
}
/** A greeting called across a space: "ay-o", the second syllable lifted. */
export function callOf(seed: string): Syllable[] {
  const next = rng(hash(`call:${seed}`)), up = 3 + next() * 3
  return [syl(0, 0.2, 1, 1, 1.2), syl(0.23, 0.38, 3, 1 + up, 1.3), syl(0.62, 0.2, 3, up - 2, 0.7)]
}
/** A hum: four soft notes of a little tune, no consonants. */
export function humOf(seed: string): Syllable[] {
  const next = rng(hash(`hum:${seed}`)), scale = [0, 2, 4, 7, 9], out: Syllable[] = []
  let at = 0
  for (let i = 0; i < 5; i++) { const dur = 0.32 + next() * 0.3; out.push(syl(at, dur, 4, (scale[Math.floor(next() * 5)] as number) - 5, 0.55, 'nasal')); at += dur + 0.04 }
  return out
}
/** A market seller's call: "oya, oya-oh", long, bright and ending high. */
export function sellerOf(seed: string): Syllable[] {
  const next = rng(hash(`seller:${seed}`)), lift = 2 + next() * 2
  return [syl(0, 0.2, 3, 0, 1.3), syl(0.22, 0.28, 0, lift + 2, 1.5), syl(0.7, 0.2, 3, lift, 1.3), syl(0.92, 0.26, 0, lift + 3, 1.5), syl(1.2, 0.5, 3, lift + 5, 1.4)]
}

/** The cue as a talk. Returns null for the cues that are not vocal. */
export function playVocal(cue: 'laugh' | 'call' | 'hum' | 'seller', ctx: BaseAudioContext, dest: AudioNode, voice: VoiceProfile, seed: string, o: TalkOptions): Talk {
  const list = cue === 'laugh' ? laughOf(seed) : cue === 'call' ? callOf(seed) : cue === 'hum' ? humOf(seed) : sellerOf(seed)
  const tuned: VoiceProfile = cue === 'hum' ? { ...voice, breath: voice.breath * 0.5, vibrato: Math.max(voice.vibrato, 0.3) } : cue === 'seller' ? { ...voice, f0: voice.f0 * 1.15, range: voice.range + 2 } : voice
  return talk(ctx, dest, tuned, list, cue === 'laugh' ? { ...o, breath: 0.35 } : o)
}

/** A cheer: several voices on one open vowel, a rise and a breathy burst. Counts as one voice for the cap. */
export function playCheer(ctx: BaseAudioContext, dest: AudioNode, voice: VoiceProfile, seed: string, o: TalkOptions): Talk[] {
  const next = rng(hash(`cheer:${seed}`)), out: Talk[] = []
  for (let i = 0; i < 4; i++) {
    const v: VoiceProfile = { ...voice, f0: voice.f0 * (0.8 + i * 0.22) * (0.98 + next() * 0.05), breath: 0.3 }
    out.push(talk(ctx, dest, v, [syl(next() * 0.12, 1.1 + next() * 0.4, i % 2 ? 3 : 0, 0, 1.1, 'breath'), syl(1.75 + next() * 0.15, 0.4, 0, 3, 0.7)].map((s, j) => j === 0 ? { ...s, pitch: 0 } : s), { ...o, gain: o.gain * 0.55, at: o.at + next() * 0.1 }))
  }
  return out
}

/** A whistle: a sine gliding between two or three notes with a little vibrato. Returns the end time. */
export function playWhistle(ctx: BaseAudioContext, dest: AudioNode, seed: string, o: Pick<TalkOptions, 'at' | 'gain' | 'pan'>): { end: number; stop(now: number): void } {
  const next = rng(hash(`whistle:${seed}`)), base = 1000 + next() * 700, t0 = Math.max(o.at, ctx.currentTime)
  const osc = ctx.createOscillator(); osc.type = 'sine'
  const env = ctx.createGain()
  const lfo = ctx.createOscillator(); lfo.frequency.value = 6; const depth = ctx.createGain(); depth.gain.value = base * 0.012
  lfo.connect(depth); depth.connect(osc.frequency)
  osc.connect(env)
  const notes = [0, 3 + Math.floor(next() * 3), 7, 3].slice(0, 3 + Math.floor(next() * 2))
  let t = t0
  osc.frequency.setValueAtTime(base * semitones(notes[0] as number), t0)
  env.gain.setValueAtTime(0.0001, t0)
  for (const note of notes) {
    const dur = 0.22 + next() * 0.18
    osc.frequency.setTargetAtTime(base * semitones(note), t, 0.03)
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.1 * o.gain, t + 0.04); env.gain.linearRampToValueAtTime(0.07 * o.gain, t + dur * 0.8); env.gain.linearRampToValueAtTime(0.0001, t + dur)
    t += dur + 0.03
  }
  let tail: AudioNode = env
  const nodes: AudioNode[] = [osc, env, lfo, depth]
  if ('createStereoPanner' in ctx) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; env.connect(p); tail = p; nodes.push(p) }
  tail.connect(dest)
  osc.start(t0); lfo.start(t0); osc.stop(t + 0.05); lfo.stop(t + 0.05)
  osc.onended = () => { for (const node of nodes) node.disconnect() }
  return { end: t, stop(now) { try { osc.stop(now + 0.05); lfo.stop(now + 0.05) } catch { /* already stopped */ } env.gain.cancelScheduledValues(now); env.gain.setTargetAtTime(0, now, 0.01) } }
}

/** One footstep: a soft low thud with a short band of noise on top, very quiet. */
export function playStep(ctx: BaseAudioContext, dest: AudioNode, noise: AudioBuffer, o: { at: number; gain: number; pan: number; pitch: number }): void {
  const t = Math.max(o.at, ctx.currentTime)
  const thud = ctx.createOscillator(); thud.type = 'sine'
  thud.frequency.setValueAtTime(130 * o.pitch, t); thud.frequency.exponentialRampToValueAtTime(60 * o.pitch, t + 0.07)
  const tick = ctx.createBufferSource(); tick.buffer = noise
  const band = ctx.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 900 * o.pitch; band.Q.value = 0.9
  const a = ctx.createGain(), b = ctx.createGain(), env = ctx.createGain()
  a.gain.value = 0.8; b.gain.value = 0.18
  thud.connect(a); a.connect(env); tick.connect(band); band.connect(b); b.connect(env)
  env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(o.gain, t + 0.006); env.gain.linearRampToValueAtTime(0.0001, t + 0.085)
  const nodes: AudioNode[] = [thud, tick, band, a, b, env]
  let tail: AudioNode = env
  if ('createStereoPanner' in ctx) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; env.connect(p); tail = p; nodes.push(p) }
  tail.connect(dest)
  thud.start(t); thud.stop(t + 0.1); tick.start(t, 0.3); tick.stop(t + 0.1)
  thud.onended = () => { for (const node of nodes) node.disconnect() }
}
