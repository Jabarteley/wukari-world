// Runs inside a headless browser page: renders a job (some lines, scene notes and an optional place's ambience) offline through the
// game's own synth and mix, and hands back the stereo samples with their loudness and how many voices sounded at once.
// Bundled and driven by run.ts; never shipped with the game.
/// <reference lib="dom" />
import { Director, type Deps } from '../../src/audio/director.ts'
import { RECIPES } from '../../src/audio/data.ts'
import { Synth } from '../../src/audio/synth.ts'
import { levelFor } from '../../src/audio/levels.ts'
import { SOUND_DEFAULTS } from '../../src/audio/settings.ts'
import { Voices } from '../../src/audio/voice/index.ts'
import { rng } from '../../src/audio/voice/seed.ts'
import type { Planned } from '../../src/audio/voice/cues.ts'
import type { HeardLine, SceneNote } from '../../src/audio/voice/types.ts'

interface Job {
  rate: number
  seconds: number
  scape?: string
  night?: boolean
  avatar: { x: number; z: number }
  lines: ({ t: number } & HeardLine)[]
  scenes: ({ t: number } & SceneNote)[]
  /** A recipe of the game's own to play at 0, for a level to compare the voices with. */
  recipe?: string
  cues?: ({ t: number } & Planned)[]
  /** The cue planner's chance: 0.02 passes every roll (the densest a place can be). */
  chance?: number
  seed?: number
}
interface Saw { start: number; stop: number }

const b64 = (data: Float32Array): string => {
  const pcm = new Int16Array(data.length)
  for (let i = 0; i < data.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, data[i] as number)) * 32767)
  let text = ''
  const bytes = new Uint8Array(pcm.buffer)
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(text)
}

async function render(job: Job): Promise<unknown> {
  const off = new OfflineAudioContext(2, Math.ceil(job.rate * job.seconds), job.rate)
  const saws: Saw[] = []
  let counting = false
  const create = off.createOscillator.bind(off)
  off.createOscillator = (): OscillatorNode => {
    const osc = create()
    if (!counting) return osc
    const rec: Saw = { start: 0, stop: 0 }
    const start = osc.start.bind(osc), stop = osc.stop.bind(osc)
    osc.start = (t?: number): void => { rec.start = t ?? 0; start(t) }
    osc.stop = (t?: number): void => { rec.stop = t ?? 0; stop(t) }
    saws.push(rec)
    ;(rec as Saw & { osc: OscillatorNode }).osc = osc
    return osc
  }
  const deps: Deps = { settings: () => SOUND_DEFAULTS, soundOf: () => undefined, kindOf: () => '', now: () => 0, every: () => () => undefined, after: () => () => undefined, live: false }
  let synth: Synth
  let director: Director | null = null
  if (job.scape) { director = new Director(off, deps); synth = director.synth; director.preview(job.scape, job.night === true); director.prime(job.seconds) }
  else { synth = new Synth(off, RECIPES); synth.setLevels(levelFor(SOUND_DEFAULTS, 'effects'), levelFor(SOUND_DEFAULTS, 'ambience')) }
  if (job.recipe) synth.play(job.recipe)
  const chance = job.chance ?? 0.02
  const draw = job.seed !== undefined ? rng(job.seed) : () => chance
  const voices = new Voices(off, synth.fx, synth.noiseBuffer('white'), { settings: () => SOUND_DEFAULTS, speech: null, hidden: () => false, live: () => true, rand: draw })
  voices.setAvatar(job.avatar.x, job.avatar.z)
  const events: { t: number; run: () => void }[] = [
    ...job.lines.map(line => ({ t: line.t, run: () => voices.hear(line) })),
    ...job.scenes.map(note => ({ t: note.t, run: () => voices.scene(note) })),
    ...(job.cues ?? []).map(cue => ({ t: cue.t, run: () => voices.play(cue) })),
  ].sort((a, b) => a.t - b.t)
  const quantum = 128 / job.rate
  const times = new Map<number, (() => void)[]>()
  for (const event of events) { const t = Math.round(event.t / quantum) * quantum; times.set(t, [...(times.get(t) ?? []), event.run]) }
  const fire = (runs: (() => void)[]): void => { counting = true; for (const run of runs) run(); counting = false }
  if (times.has(0)) fire(times.get(0) as (() => void)[])
  const waits: Promise<void>[] = []
  for (const [t, runs] of times) if (t > 0) waits.push(off.suspend(t).then(() => { fire(runs); void off.resume() }))
  const done = await off.startRendering()
  void waits
  const left = done.getChannelData(0).slice(), right = done.getChannelData(1).slice()
  let peak = 0, sum = 0
  for (let i = 0; i < left.length; i++) { peak = Math.max(peak, Math.abs(left[i] as number), Math.abs(right[i] as number)); sum += (left[i] as number) ** 2 + (right[i] as number) ** 2 }
  // Overlap of the talk sources (sawtooth only, minus their release tail), sampled every 10 ms.
  const talk = (saws as (Saw & { osc: OscillatorNode })[]).filter(s => s.osc.type === 'sawtooth')
  let overlap = 0
  for (let t = 0; t < job.seconds; t += 0.01) overlap = Math.max(overlap, talk.filter(s => t >= s.start && t < s.stop - 0.05).length)
  return { rate: job.rate, left: b64(left), right: b64(right), peak, rms: Math.sqrt(sum / (left.length * 2)), stats: voices.stats, talkOverlap: overlap, sources: talk.length }
}
;(window as unknown as { __render: typeof render }).__render = render
