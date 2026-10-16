/**
 * OWNER: games (real-time)
 * THE PLAYERS' OWN CHARACTERS ON THE PITCH: each footballer is a native actor (the world's CC0 MakeHuman body, hair, outfit and shoes,
 * dressed from a seat's public look, the shirt in the team's colour) whose skeleton is driven only by our own football clips
 * (scripts/assets/blender/native-football-clips.py). The native system's own locomotion is never run for it. This module is the part that
 * does not need a screen: the clip names and times, which clip mix a speed asks for, the team kit, the budget rule, and `ActionMix`, the
 * small blender the 3D view drives each frame (locomotion cycles that share one stride phase, then one state clip on top: a kick, a tackle,
 * a dive...). A lazy chunk beside football-3d.ts; the native runtime is reached through fight-native.ts and so through the module the
 * world already loads.
 */
import { THREE } from './three/kit.ts'
import { boneTrackName } from './fight-native.ts'
import { nativeFightersAllowed } from './native-look.ts'
import type { NativeAppearanceV2 } from '../character/native-recipe.ts'

export { spawnNativeFighter, warmNative } from './fight-native.ts'

/** Whether this phone draws the players' own characters (enough memory and cores, WebGL 2); otherwise the blocky players. */
export function nativeAllowedHere(): boolean {
  const nav = (globalThis.navigator ?? {}) as { deviceMemory?: number; hardwareConcurrency?: number }
  let webgl2 = false
  try { webgl2 = !!document.createElement('canvas').getContext('webgl2') } catch { webgl2 = false }
  return nativeFightersAllowed({ ...(nav.deviceMemory !== undefined ? { deviceMemory: nav.deviceMemory } : {}), ...(nav.hardwareConcurrency !== undefined ? { hardwareConcurrency: nav.hardwareConcurrency } : {}), webgl2 })
}

/** A few seconds to get the real characters; after that the blocky ones stay (`globalThis.allworldFootballNativeWaitMs` overrides it, for measuring on a slow dev machine). */
export const NATIVE_WAIT_MS = 8000
/** The screen's triangles above which the whole match uses the blocky players (the owner's phone budget is 60,000 to 100,000). */
export const NATIVE_TRIANGLES_MAX = 90_000
/** The native actor's own height at height 1, and the height the footballers are drawn at (metres). */
export const NATIVE_HEIGHT = 1.8
export const FOOTBALLER_HEIGHT = 1.75

/** Every clip of the clips file, by the name the script gives it. */
export const CLIP_LIST = ['idle', 'walk', 'jog', 'sprint', 'dribble', 'kick', 'pass', 'tackle', 'stumble', 'celebrate', 'dejected',
  'keeper-ready', 'keeper-dive-left', 'keeper-dive-right', 'keeper-catch'] as const
export type NativeClip = typeof CLIP_LIST[number]

/** When things happen in the clips, seconds (the script's KICK_WIND, KICK_HIT, PASS_WIND, PASS_HIT, DIVE_GO). */
export const TIMES = Object.freeze({ kickWind: 0.30, kickHit: 0.38, passWind: 0.18, passHit: 0.24, diveGo: 0.50 })
/**
 * Ground speed each locomotion cycle is for, and how long one cycle is (the script prints the speeds when it runs), so a cycle covers
 * `speed x seconds` metres: one cycle of a clip moves the player STRIDE metres.
 */
export const STRIDE: Readonly<Record<'walk' | 'jog' | 'sprint' | 'dribble', number>> = Object.freeze({ walk: 1.30 * 0.85, jog: 2.42 * 0.70, sprint: 5.67 * 0.47, dribble: 3.30 * 0.62 })
export type Loco = keyof typeof STRIDE | 'idle'
/** The speeds (metres a second) at which a clip is the whole picture; between two of them the two blend. */
const ANCHORS: readonly [Loco, number][] = [['idle', 0], ['walk', 1.3], ['jog', 2.8], ['sprint', 5.0]]

/** The weights of the locomotion clips for a speed, summing to 1. With the ball at his feet a player dribbles instead of jogging or sprinting. */
export function locoWeights(speed: number, carrying: boolean): Record<Loco, number> {
  const w: Record<Loco, number> = { idle: 0, walk: 0, jog: 0, sprint: 0, dribble: 0 }
  const s = Math.max(0, speed)
  let i = 0
  while (i < ANCHORS.length - 2 && s > (ANCHORS[i + 1] as [Loco, number])[1]) i += 1
  const [a, sa] = ANCHORS[i] as [Loco, number], [b, sb] = ANCHORS[i + 1] as [Loco, number]
  const k = Math.min(1, Math.max(0, (s - sa) / (sb - sa)))
  // below a quarter of a metre a second he stands: no creeping feet
  const eased = k * k * (3 - 2 * k)
  w[a] += 1 - eased; w[b] += eased
  if (carrying) { w.dribble = w.jog + w.sprint; w.jog = 0; w.sprint = 0 }
  return w
}
/** Cycles a second the locomotion clips should run at to keep the feet on the ground at `speed` for these weights. */
export function cadence(speed: number, w: Record<Loco, number>): number {
  let metres = 0, weight = 0
  for (const k of ['walk', 'jog', 'sprint', 'dribble'] as const) { metres += w[k] * STRIDE[k]; weight += w[k] }
  return weight > 0.01 && speed > 0.05 ? speed / (metres / weight) : 0
}

/** The shirt colours of the two teams and of the keepers. */
export const KIT = Object.freeze({ team: ['#24a84a', '#f2c418'] as const, keeper: '#8a4fd0', shorts: ['#f4f4ee', '#2a2f3a'] as const })
/** A look in a team's kit: his own body, hair, face and shoes, the shirt in the team's colour and shorts in a plain one. */
export function kitLook(look: NativeAppearanceV2, team: number, keeper = false): NativeAppearanceV2 {
  return { ...look, colors: { ...look.colors, upper: keeper ? KIT.keeper : KIT.team[team & 1] as string, lower: KIT.shorts[team & 1] as string } }
}

/** The clips of one body out of the clips file, by their own names. */
export function clipsFor(animations: readonly THREE.AnimationClip[], body: string, bones: ReadonlySet<string>): THREE.AnimationClip[] {
  const out: THREE.AnimationClip[] = []
  for (const clip of animations) {
    const dot = clip.name.lastIndexOf('.')
    if (dot < 0 || clip.name.slice(dot + 1) !== body) continue
    const name = clip.name.slice(0, dot)
    if (!(CLIP_LIST as readonly string[]).includes(name)) continue
    const copy = clip.clone(); copy.name = name
    for (const track of copy.tracks) track.name = boneTrackName(track.name, bones)
    out.push(copy)
  }
  return out
}

/** Triangles in an object, for the screen's budget. */
export function trianglesOf(root: THREE.Object3D): number {
  let n = 0
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh || !mesh.visible) return
    const g = mesh.geometry
    n += (g.index ? g.index.count : g.attributes.position?.count ?? 0) / 3
  })
  return Math.round(n)
}
/** Whether `actors` native actors of about `each` triangles fit the screen's budget (with the pitch, stands and the blocky keepers: about 15,000). */
export const withinBudget = (each: number, actors: number): boolean => each * actors + 15_000 <= NATIVE_TRIANGLES_MAX

/** The state clips: played over the locomotion until they end (or the game drops them). */
export interface StateSpec { clip: NativeClip; loop: boolean; rate: number }

/**
 * Drives one actor's clips. Every action is paused and given its time here, so the locomotion cycles can share one stride phase (a jog
 * blends into a sprint without the feet crossing) and a kick can wait at its wind-up, a dive follow how far the keeper has gone. One state
 * clip at a time sits over the locomotion (weights are kept summing to 1: a mixer given less blends towards the bind pose).
 */
export class ActionMix {
  readonly actions = new Map<string, THREE.AnimationAction>()
  private weight = new Map<string, number>()
  private time = new Map<string, number>()
  private phase = 0
  /** The state clip and the time in it (seconds), or null. */
  state: StateSpec | null = null
  stateTime = 0
  /** Hold the state clip at `stateTime` (a wind-up, a scrubbed dive) instead of letting it run. */
  hold = false
  /** Fade into the state clip at this rate (a second's worth of weight per 1/rate s). */
  fadeIn = 16

  readonly mixer: THREE.AnimationMixer
  constructor(mixer: THREE.AnimationMixer, clips: readonly THREE.AnimationClip[]) {
    this.mixer = mixer
    for (const clip of clips) {
      const action = mixer.clipAction(clip)
      action.setLoop(THREE.LoopRepeat, Infinity); action.timeScale = 0; action.enabled = true; action.setEffectiveWeight(0); action.play()
      this.actions.set(clip.name, action); this.weight.set(clip.name, 0); this.time.set(clip.name, 0)
    }
    this.weight.set('idle', 1)
  }
  has(clip: string): boolean { return this.actions.has(clip) }
  duration(clip: string): number { return this.actions.get(clip)?.getClip().duration ?? 0 }
  /** Start (or change) the state clip. The same clip while it plays is left alone unless `restart`. */
  start(spec: StateSpec | null, at = 0, restart = false): void {
    if (spec && !this.actions.has(spec.clip)) spec = null
    if (spec?.clip === this.state?.clip && !restart) { if (spec) this.state = spec; return }
    this.state = spec; this.stateTime = at; this.hold = false
  }
  /** Whether the state clip has played to its end. */
  finished(): boolean { return !!this.state && !this.state.loop && this.stateTime >= this.duration(this.state.clip) - 1e-3 }
  update(dt: number, speed: number, carrying: boolean): void {
    const lw = locoWeights(speed, carrying)
    this.phase = (this.phase + dt * cadence(speed, lw)) % 1
    if (this.state && !this.hold) {
      const d = this.duration(this.state.clip)
      this.stateTime += dt * this.state.rate
      if (this.state.loop) this.stateTime %= d || 1; else this.stateTime = Math.min(d, this.stateTime)
    }
    const active = this.state?.clip
    let total = 0
    for (const [clip] of this.actions) {
      const loco = clip in lw
      const target = clip === active ? 1 : loco ? (active ? 0 : lw[clip as Loco]) : 0
      const rate = clip === active ? this.fadeIn : 9
      const cur = this.weight.get(clip) as number
      const next = cur + (target - cur) * (1 - Math.exp(-rate * dt))
      this.weight.set(clip, next < 0.002 && target === 0 ? 0 : next)
      total += this.weight.get(clip) as number
    }
    if (total < 1e-4) { this.weight.set('idle', 1); total = 1 }
    for (const [clip, action] of this.actions) {
      action.setEffectiveWeight((this.weight.get(clip) as number) / total)
      const d = action.getClip().duration
      let t: number
      if (clip === active) t = Math.min(d, this.stateTime)
      else if (clip === 'walk' || clip === 'jog' || clip === 'sprint' || clip === 'dribble') t = this.phase * d
      else { t = ((this.time.get(clip) as number) + dt) % (d || 1); this.time.set(clip, t) }
      action.time = t
    }
    this.mixer.update(0)
  }
}
