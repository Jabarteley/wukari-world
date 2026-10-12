// When a place makes a human sound that is not speech. A planner over what the people are doing (who walks, who sits, who just spoke):
// pure and seeded from the caller's generator, so a test can say what it plans. It is rate-limited so a place murmurs rather than
// chatters: at most one vocal cue every eight seconds, and each kind has its own cooldown.
import type { Cue } from './sounds.ts'
import { distanceOf } from './spatial.ts'

export interface Person { id: string; role: string; x: number; z: number; sitting: boolean }
export interface SceneView { kind: string; people: readonly Person[]; avatar: { x: number; z: number }; now: number }
export interface Planned { cue: Cue; id: string; x: number; z: number; /** Seconds from now. */ in: number }

/** Minimum seconds between two vocal cues anywhere in the place. */
export const VOCAL_GAP = 8
const COOLDOWN: Readonly<Record<Exclude<Cue, 'step'>, number>> = { laugh: 30, call: 40, hum: 70, whistle: 90, seller: 25, cheer: 20 }
const OUTDOOR = new Set(['park', 'walk', 'market', 'rooftop', 'mall', 'worship', 'viewing'])
/** Seconds of footsteps planned per look, and the pace of a walk in steps a second. */
export const STEP_SPAN = 4.2
export const STEP_RATE = 1.9
const NEAREST_WALKERS = 2
const STEP_REACH = 16

export class CuePlanner {
  private readonly last = new Map<string, number>()
  private lastVocal = -Infinity
  private readonly seen = new Map<string, { x: number; z: number }>()
  private readonly rand: () => number
  constructor(rand: () => number = Math.random) { this.rand = rand }

  reset(): void { this.last.clear(); this.seen.clear(); this.lastVocal = -Infinity }

  private ready(cue: Exclude<Cue, 'step'>, now: number): boolean {
    return now - this.lastVocal >= VOCAL_GAP && now - (this.last.get(cue) ?? -Infinity) >= COOLDOWN[cue]
  }
  private take(cue: Exclude<Cue, 'step'>, now: number): void { this.last.set(cue, now); this.lastVocal = now }

  /** A line was spoken in the place: a reply may bring a laugh, and a goal at the viewing centre brings a cheer. */
  onLine(view: SceneView, speaker: { id: string; x: number; z: number }, text: string, reply: boolean): Planned[] {
    const out: Planned[] = []
    if (view.kind === 'viewing' && /\bgoal+\b/i.test(text) && this.ready('cheer', view.now)) {
      this.take('cheer', view.now)
      out.push({ cue: 'cheer', id: speaker.id, x: speaker.x, z: speaker.z, in: 0.5 })
    } else if (reply && this.ready('laugh', view.now) && this.rand() < 0.3) {
      this.take('laugh', view.now)
      const other = view.people.find(p => p.id !== speaker.id && distanceOf(p, speaker) < 6) ?? speaker
      out.push({ cue: 'laugh', id: other.id, x: other.x, z: other.z, in: 1.1 + this.rand() * 0.8 })
    }
    return out
  }

  /** Look at the people (every few seconds) and plan what the place does next. */
  look(view: SceneView): Planned[] {
    const out: Planned[] = []
    const { people, avatar } = view
    const walkers = people.filter(p => p.role === 'walker' && !p.sitting)
    // Footsteps: the nearest walkers who moved since the last look.
    const moving = walkers.filter(p => { const was = this.seen.get(p.id); return was !== undefined && distanceOf(was, p) > 0.4 })
    for (const p of people) this.seen.set(p.id, { x: p.x, z: p.z })
    const near = moving.map(p => ({ p, d: distanceOf(p, avatar) })).filter(item => item.d < STEP_REACH).sort((a, b) => a.d - b.d).slice(0, NEAREST_WALKERS)
    for (const { p } of near) {
      for (let t = this.rand() * 0.4; t < STEP_SPAN; t += 1 / STEP_RATE) out.push({ cue: 'step', id: p.id, x: p.x, z: p.z, in: t })
    }
    // One vocal cue at most per look.
    const vocal = this.vocal(view, walkers)
    if (vocal) out.push(vocal)
    return out
  }

  private vocal(view: SceneView, walkers: readonly Person[]): Planned | null {
    const { people, now, kind } = view
    if (now - this.lastVocal < VOCAL_GAP) return null
    if (kind === 'market' && this.ready('seller', now) && this.rand() < 0.1) {
      const stander = people.find(p => (p.role === 'stander' || p.role === 'caller') && !p.sitting)
      if (stander) { this.take('seller', now); return { cue: 'seller', id: stander.id, x: stander.x, z: stander.z, in: 0.3 } }
    }
    if (this.ready('call', now) && this.rand() < 0.15) {
      for (const a of walkers) for (const b of walkers) if (a.id < b.id && distanceOf(a, b) < 4.5) { this.take('call', now); return { cue: 'call', id: a.id, x: a.x, z: a.z, in: 0.4 } }
    }
    if (this.ready('hum', now) && this.rand() < 0.06) {
      const alone = people.find(p => p.sitting && !people.some(q => q.id !== p.id && distanceOf(p, q) < 2.5))
      if (alone) { this.take('hum', now); return { cue: 'hum', id: alone.id, x: alone.x, z: alone.z, in: 0.3 } }
    }
    if (OUTDOOR.has(kind) && this.ready('whistle', now) && this.rand() < 0.03) {
      const walker = walkers[Math.floor(this.rand() * walkers.length)]
      if (walker) { this.take('whistle', now); return { cue: 'whistle', id: walker.id, x: walker.x, z: walker.z, in: 0.3 } }
    }
    return null
  }
}
