// The voices of a place: talk sounds for every line that appears in a bubble or a chat, the optional spoken words, and the sparse human
// sounds of the people (a laugh, a call, a hum, footsteps). Built on the audio engine's synth (its effects bus and noise) and loaded
// as a chunk of its own after the first tap. Timing is on the audio clock; nothing here owns a timer or a render loop.
import type { SoundSettings } from '../settings.ts'
import { Cap, MAX_VOICES } from './cap.ts'
import { CuePlanner, type Planned, type SceneView } from './cues.ts'
import { modeOf } from './mode.ts'
import { hash, profileOf, rng, type VoiceProfile } from './seed.ts'
import { playCheer, playStep, playVocal, playWhistle } from './sounds.ts'
import { cutoffAt, distanceOf, gainAt, panFromOffset, panOf } from './spatial.ts'
import { browserSpeech, Speech } from './speech.ts'
import { syllablesOf, lengthOf } from './syllables.ts'
import { talk, type Talk } from './talk.ts'
import type { HeardLine, SceneNote } from './types.ts'

/** Level of the whole voice bus into the effects bus. Interface sounds stay louder (they play at 1.0 there). */
export const VOICE_BUS = 0.8
/** Distance assumed for a line that has no place (a chat line from someone in the room). */
export const UNPLACED = 6
/** Only a speaker this near is read aloud by the device's own voice. */
export const SPEECH_REACH = 8
/** Footsteps are felt, not heard. */
export const STEP_LEVEL = 0.055

export interface Deps {
  settings: () => SoundSettings
  speech: Speech | null
  hidden: () => boolean
  rand?: () => number
  /** Whether the context is running (an offline render is always live). */
  live?: () => boolean
}

interface Sounding { talk: Talk[]; until: number }

export class Voices {
  readonly bus: GainNode
  readonly cap = new Cap()
  readonly planner: CuePlanner
  /** Counters for tests and the measurements. */
  stats = { lines: 0, talked: 0, spoken: 0, dropped: 0, cues: 0, steps: 0, peakVoices: 0 }
  private readonly ctx: BaseAudioContext
  private readonly noise: AudioBuffer
  private readonly deps: Deps
  private readonly sounding = new Map<string, Sounding>()
  private avatar: { x: number; z: number } | null = null
  private kind = ''
  private country = 'ng'
  private people: SceneNote['people'] = []
  private ended = false
  private greeted = false

  constructor(ctx: BaseAudioContext, into: AudioNode, noise: AudioBuffer, deps: Deps) {
    this.ctx = ctx; this.noise = noise; this.deps = deps
    this.bus = ctx.createGain(); this.bus.gain.value = VOICE_BUS
    this.bus.connect(into)
    this.planner = new CuePlanner(deps.rand ?? Math.random)
  }

  private mode() { return modeOf(this.deps.settings(), this.deps.speech?.available() ?? false) }
  private now(): number { return this.ctx.currentTime }
  private audible(): boolean { return !this.ended && !this.deps.hidden() && (this.deps.live ? this.deps.live() : this.ctx.state === 'running') }

  setAvatar(x: number, z: number): void { this.avatar = { x, z } }

  private where(at: { x?: number; z?: number; screenX?: number; distance?: number }, profile: VoiceProfile): { distance: number; pan: number } {
    const known = at.x !== undefined && at.z !== undefined && this.avatar
    const distance = at.distance !== undefined ? at.distance : known ? distanceOf({ x: at.x as number, z: at.z as number }, this.avatar as { x: number; z: number }) : UNPLACED
    const pan = at.screenX !== undefined ? panOf(at.screenX) : known ? panFromOffset((at.x as number) - (this.avatar as { x: number }).x) : profile.home * 0.6
    return { distance, pan }
  }

  /** One line has appeared. */
  hear(line: HeardLine): void {
    this.stats.lines++
    const mode = this.mode()
    if (!mode.sounds || !this.audible() || !line.text.trim()) return
    if (line.country) { this.country = line.country; if (this.deps.speech) this.deps.speech.country = line.country }
    if (line.place) this.kind = line.place
    const profile = profileOf(line.seed ?? line.id, line.build)
    const { distance, pan } = this.where(line, profile)
    const now = this.now(), list = syllablesOf(line.text, profile)
    this.purge(now)
    if (!list.length) return
    const until = now + lengthOf(list) + 0.1
    const level = gainAt(distance)
    // Spoken words: only the nearest of the voices that sound, and only when the device has a voice of its own.
    const nearest = this.cap.live(now).every(item => item.id === line.id || distance <= item.distance)
    if (mode.speech && (line.kind === 'companion' || line.speakable === true || (nearest && distance <= SPEECH_REACH)) && this.deps.speech?.say(line.text, profile, this.deps.settings().master * (0.55 + 0.45 * level))) {
      this.stats.spoken++
      this.after(line, now)
      return
    }
    const verdict = this.cap.admit(line.id, distance, now, until)
    if (!verdict.ok) { this.stats.dropped++; return }
    if (verdict.evict) this.fade(verdict.evict)
    this.stats.peakVoices = Math.max(this.stats.peakVoices, this.cap.count(now))
    const made = talk(this.ctx, this.bus, profile, list, { at: now + 0.02, gain: level, pan, cutoff: cutoffAt(distance), noise: this.noise })
    this.sounding.set(line.id, { talk: [made], until })
    this.stats.talked++
    this.after(line, now)
  }

  /** A laugh or a cheer that a line brings. */
  private after(line: HeardLine, now: number): void {
    const spot = line.x !== undefined && line.z !== undefined ? { x: line.x, z: line.z } : (this.avatar ?? { x: 0, z: 0 })
    const planned = this.planner.onLine(this.view(now), { id: line.id, ...spot }, line.text, line.reply === true)
    for (const item of planned) this.play(item)
  }

  private view(now: number): SceneView {
    return { kind: this.kind, people: this.people, avatar: this.avatar ?? { x: 0, z: 0 }, now }
  }

  /** The people of the place, every few seconds. */
  scene(note: SceneNote): void {
    if (note.country) { this.country = note.country; if (this.deps.speech) this.deps.speech.country = note.country }
    this.kind = note.kind; this.people = note.people
    if (!this.mode().sounds || !this.audible()) return
    // A regular standing near calls a greeting when the player has just come in.
    if (!this.greeted && this.avatar) {
      this.greeted = true
      const avatar = this.avatar
      const near = note.people.filter(p => p.id.startsWith('npc:') && distanceOf(p, avatar) < 9).sort((a, b) => distanceOf(a, avatar) - distanceOf(b, avatar))[0]
      if (near) this.play({ cue: 'call', id: near.id, x: near.x, z: near.z, in: 0.8 })
    }
    for (const item of this.planner.look(this.view(this.now()))) this.play(item)
  }

  /** Make one planned human sound (the planner's, or a test's). */
  play(item: Planned): void {
    if (!this.audible()) return
    const now = this.now(), at = now + item.in
    const profile = profileOf(item.id)
    const { distance, pan } = this.where(item, profile)
    const level = gainAt(distance)
    this.stats.cues++
    if (item.cue === 'step') {
      this.stats.steps++
      playStep(this.ctx, this.bus, this.noise, { at, gain: STEP_LEVEL * level, pan, pitch: 0.8 + rng(hash(item.id))() * 0.5 })
      return
    }
    const key = `cue:${item.cue}:${item.id}`
    const length = item.cue === 'cheer' ? 2.2 : item.cue === 'hum' ? 2.4 : item.cue === 'seller' ? 1.8 : item.cue === 'whistle' ? 1.2 : 0.9
    const verdict = this.cap.admit(key, distance, now, at + length)
    if (!verdict.ok) { this.stats.dropped++; return }
    if (verdict.evict && verdict.evict !== key) this.fade(verdict.evict)
    this.stats.peakVoices = Math.max(this.stats.peakVoices, this.cap.count(now))
    const base = { at, gain: level, pan, cutoff: cutoffAt(distance), noise: this.noise }
    let made: Talk[]
    if (item.cue === 'cheer') made = playCheer(this.ctx, this.bus, profile, item.id, { ...base, gain: level * 0.9 })
    else if (item.cue === 'whistle') made = [playWhistle(this.ctx, this.bus, item.id, base)]
    else made = [playVocal(item.cue, this.ctx, this.bus, profile, item.id, { ...base, gain: level * (item.cue === 'hum' ? 0.9 : item.cue === 'laugh' ? 0.8 : item.cue === 'seller' ? 0.7 : 1) })]
    this.sounding.set(key, { talk: made, until: at + length })
  }

  private purge(now: number): void { for (const [id, item] of this.sounding) if (item.until < now) this.sounding.delete(id) }

  private fade(id: string): void {
    const item = this.sounding.get(id)
    if (!item) return
    for (const t of item.talk) t.stop(this.now())
    this.sounding.delete(id)
  }

  /** The scene changed: every voice and spoken line stops, and the planner forgets the place. */
  stop(): void {
    for (const id of [...this.sounding.keys()]) this.fade(id)
    this.cap.clear(); this.planner.reset(); this.people = []; this.kind = ''; this.greeted = false
    this.deps.speech?.cancel()
  }
  setHidden(on: boolean): void { if (on) this.stop() }
  /** The setting changed. */
  applySettings(): void { const mode = this.mode(); if (!mode.sounds) this.stop(); else if (!mode.speech) this.deps.speech?.cancel() }
  /** Tear the voices down with the scene: stop, then cut the bus. */
  dispose(): void { this.stop(); this.ended = true; try { this.bus.disconnect() } catch { /* already cut */ } }
}

export { MAX_VOICES }

/** The browser's speech layer for the engine, or null when the page has none. */
export function createSpeech(): { speech: Speech; onVoices: (run: () => void) => () => void } | null {
  const found = browserSpeech()
  if (!found) return null
  const speech = new Speech({
    api: found.api, utter: found.utter, hidden: () => globalThis.document?.hidden === true,
    after: (run, ms) => { const id = setTimeout(run, ms); return () => clearTimeout(id) }, now: () => Date.now(),
  })
  return { speech, onVoices: found.onVoices }
}
