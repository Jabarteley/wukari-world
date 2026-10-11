/**
 * OWNER: scenes
 * The background people of a venue scene, drawn: passers-by who walk the paths, people who sit on the seats, pairs who talk, people on the
 * phone, a far crowd, and the venue's regulars, who glance at you, shift their weight and talk to each other. The plan is plan.ts; how a
 * person is made is figure.ts, the only place.
 *
 * BATTERY RULE. A scene is drawn on demand (src/scene/motion-loop.ts). This layer moves people only inside a WINDOW: it asks for frames for
 * WINDOW_MS after it is woken (the player arrives, the quarter turns, the player taps or walks) and then lets the loop end; people stand
 * where they were. It never asks for a frame on its own. A scene on a weak device or with reduced motion is never woken: people are placed
 * once, standing. src/scene/ambient/layer.test.ts counts the frames.
 *
 * BUDGET. The layer is told what the scene has left of its 17,000 triangles and 60 draw calls and builds no more figures than fit: the far
 * crowd is dropped first, then walkers and sitters. Regulars are drawn here only while there is room for them.
 */
import type * as THREE from 'three';
import type { Kit } from '../kit.ts';
import type { AvatarGroup } from '../characters.ts';
import { newGaze, stepGaze, watch, gazing } from '../space.ts';
import type { GazeState } from '../space.ts';
import { lookAvatar } from '../avatar-rig.ts';
import { hash } from '../build.ts';
import { createPlanner, poseOf } from './plan.ts';
import type { AmbientPose, Ident, Planner, Role, Sample, Stage, Track } from './plan.ts';
import { FIGURE_COST, makeFarFigures, makeFigure } from './figure.ts';
import type { FarFigures } from './figure.ts';

/** How long the layer keeps the frame loop awake after being woken. */
export const WINDOW_MS = 12_000;
/** The most background people built as figures of their own (the far crowd is on top of this). */
export const MAX_FIGURES = 16;
/** How many of them may be the game's own full person (the rest are lean ones): they are the ones close enough to be looked at. */
export const MAX_FULL = 4;
/** The most regulars drawn as figures of their own (the rest stay in the scene's merged batch). */
export const MAX_RESIDENTS = 6;
/** Draw calls a figure takes: a full one is a solid mesh drawn twice (once for the sun's shadow) and its glow; a lean one is one mesh drawn twice. */
const FULL_CALLS = 3, LEAN_CALLS = 2;
/** The far crowd costs about this much a person, in triangles. */
const FAR_TRIANGLES = 60;

export interface Room { triangles: number; meshes: number }
export interface AmbientTag { id: string; name: string; kind: string; text: string; marker: string; colour: string; position: { x: number; y: number; z: number } }
export interface AmbientPerson { id: string; role: Role; x: number; z: number; sitting: boolean }
/** A regular standing in the scene (placed by the scene). */
export interface Resident { id: string; seed: string; x: number; z: number; ry: number }

export interface LayerOptions {
  kit: Kit
  parent: THREE.Object3D
  stage: Stage
  ident: Ident
  /** The ground height at a place (raised decks). */
  heightAt(x: number, z: number): number
  /** Where the player's avatar is now. */
  avatar(): { x: number; z: number }
  /** What the scene has left to spend, measured without this layer. */
  room(): Room
  /** The wall clock (ms): where the plan puts everyone. Tests pass their own. The window of frames is counted in the host's own frame time, not here. */
  clock?(): number
  /** The layer's tags changed (a bark came or went): the host reads them again. */
  changed?(): void
}

interface Entry {
  id: string
  seed: string
  role: Role
  resident: boolean
  lean: boolean
  holder: THREE.Group
  figures: Map<string, AvatarGroup>
  shown: AvatarGroup | null
  shownKey: string
  x: number; z: number; ry: number; placed: boolean
  ox: number; oz: number
  gaze: GazeState
  top: number
  /** Facing a partner for a talk, until the time. */
  talk: { until: number; face: number; lead: boolean } | null
}

const turn = (from: number, to: number): number => { let d = to - from; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d };

export interface AmbientLayer {
  /** Advance to the clock (or to `at`) by `dt` seconds. True while the window is open (the loop should keep drawing). */
  step(dt: number, at?: number): boolean
  /** Place everyone as the plan has them at this instant and stand them still (reduced motion, no frame loop). */
  settle(at?: number): void
  /** Open the window (the player arrived or acted, or the quarter turned). */
  wake(): boolean
  readonly awake: boolean
  readonly count: number
  /** How many times step() ran: the frame budget. */
  readonly frames: number
  setResidents(list: readonly Resident[]): string[]
  /** What the scene has left to spend changed (its own crowd did): count it again. */
  rebudget(): void
  residentTag(id: string, name: string): AmbientTag | null
  people(): AmbientPerson[]
  tags(): AmbientTag[]
  speak(id: string, text: string, ms?: number): boolean
  talk(a: string, b: string, ms?: number): boolean
  stats(): { triangles: number; meshes: number }
  /** How many full figures, lean figures and far figures the budget allows (tests and diagnostics). */
  caps(): { full: number; lean: number; far: number }
  dispose(): void
}

export function createAmbientLayer(options: LayerOptions): AmbientLayer {
  const { kit, parent, stage, ident, heightAt } = options
  const { THREE } = kit
  const clock = options.clock ?? (() => Date.now())
  const planner: Planner = createPlanner(stage, ident)
  const group = new THREE.Group()
  group.name = 'ambient'
  parent.add(group)
  const entries = new Map<string, Entry>()
  const barks = new Map<string, { text: string; timer: ReturnType<typeof setTimeout> }>()
  let far: FarFigures | null = null, farKey = ''
  let windowLeft = 0, frames = 0, disposed = false, current = clock()
  let fullCap = 0, leanCap = 0, farCap = 0
  let residents: Resident[] = []

  /**
   * What the scene has left decides how many people there can be: first the regulars (full figures), then a few full ones, then lean ones,
   * then the far crowd. Read when the layer is made, when its regulars change and when the scene's own crowd does.
   */
  function budget(): void {
    const room = options.room(), own = residents.length
    const triangles = room.triangles - own * FIGURE_COST.full, calls = room.meshes - own * FULL_CALLS
    fullCap = Math.max(0, Math.min(MAX_FULL, Math.floor(triangles / FIGURE_COST.full), Math.floor(calls / FULL_CALLS)))
    const t1 = triangles - fullCap * FIGURE_COST.full, c1 = calls - fullCap * FULL_CALLS
    leanCap = Math.max(0, Math.min(MAX_FIGURES - fullCap, Math.floor(t1 / FIGURE_COST.lean), Math.floor(c1 / LEAN_CALLS)))
    const t2 = t1 - leanCap * FIGURE_COST.lean, c2 = c1 - leanCap * LEAN_CALLS
    farCap = c2 >= 2 ? Math.max(0, Math.floor(t2 / FAR_TRIANGLES)) : 0
  }

  function enter(id: string, seed: string, role: Role, resident: boolean, lean = false): Entry {
    const holder = new THREE.Group()
    holder.name = resident ? 'ambient-resident' : 'ambient-person'
    group.add(holder)
    const entry: Entry = { id, seed, role, resident, lean, holder, figures: new Map(), shown: null, shownKey: '', x: 0, z: 0, ry: 0, placed: false, ox: 0, oz: 0, gaze: newGaze(), top: 2.9, talk: null }
    entries.set(id, entry)
    return entry
  }
  function leave(entry: Entry): void {
    for (const figure of entry.figures.values()) figure.userData.dispose()
    entry.holder.parent?.remove(entry.holder)
    entries.delete(entry.id)
    const bark = barks.get(entry.id)
    if (bark) { clearTimeout(bark.timer); barks.delete(entry.id) }
  }
  function show(entry: Entry, pose: AmbientPose, step: number, seat: number): void {
    const key = pose === 'walk' ? `walk${step}` : pose === 'sit' ? `sit${seat}` : pose
    if (key === entry.shownKey) return
    let figure = entry.figures.get(key)
    if (!figure) {
      figure = makeFigure(kit, { seed: entry.seed, pose, step, seat, lean: entry.lean })
      entry.holder.add(figure)
      entry.figures.set(key, figure)
    }
    if (entry.shown) entry.shown.visible = false
    figure.visible = true
    entry.shown = figure; entry.shownKey = key
    entry.top = figure.userData.top ?? 2.9
  }

  /** One person this frame: the pose and place the plan gives, and the small reactions to the player (a walker steps round, a stander glances). */
  function put(entry: Entry, sample: Sample, at: number, dt: number, still: boolean, player: { x: number; z: number }): boolean {
    let pose: AmbientPose = sample.walking && still ? 'stand' : sample.pose
    let face = sample.ry, moving = false
    const sitting = sample.mode === 'sit'
    if (entry.talk && at < entry.talk.until) {
      face = entry.talk.face
      pose = entry.talk.lead === (Math.floor(at / 2600) % 2 === 0) && !still ? 'wave' : 'stand'
    } else if (entry.talk) entry.talk = null
    show(entry, pose, sample.step, sample.seat)
    let x = sample.x, z = sample.z, wantX = 0, wantZ = 0
    if (sample.walking && !still) {
      const dx = x - player.x, dz = z - player.z, d = Math.hypot(dx, dz)
      if (d < 1.6 && d > 0.01) { wantX = (dx / d) * (1.6 - d) * 0.55; wantZ = (dz / d) * (1.6 - d) * 0.55 }
      moving = true
    }
    const ease = Math.min(1, dt * 7)
    entry.ox += (wantX - entry.ox) * ease; entry.oz += (wantZ - entry.oz) * ease
    x += entry.ox; z += entry.oz
    entry.ry = !entry.placed || still ? face : entry.ry + turn(entry.ry, face) * Math.min(1, dt * 9)
    let glance = 0
    if (!sample.walking && !sitting) {
      const self = { x, z }
      if (!still && (gazing(entry.gaze) || watch(entry.gaze, self, face, player))) { stepGaze(entry.gaze, dt, self, face, player, 'stranger'); moving = gazing(entry.gaze) || moving }
      glance = entry.gaze.offset
    }
    entry.placed = true; entry.x = x; entry.z = z
    const y = heightAt(x, z)
    entry.holder.position.set(x, y + (sample.walking ? Math.abs(Math.sin(at / 170 + entry.id.length)) * 0.035 : 0), z)
    entry.holder.rotation.y = entry.ry + (lookAvatar(entry.shown, glance) ? 0 : glance)
    return moving
  }

  function place(at: number, dt: number, still: boolean): boolean {
    const player = options.avatar()
    let moving = false
    for (const resident of residents) {
      const entry = entries.get(resident.id) ?? enter(resident.id, resident.seed, 'stander', true)
      const track: Pick<Track, 'seed' | 'role'> = { seed: resident.seed, role: 'stander' }
      const sample: Sample = { x: resident.x, z: resident.z, ry: resident.ry, mode: 'stand', pose: poseOf(track, { mode: 'stand' }, at), seat: 0.6, step: 0, walking: false }
      moving = put(entry, sample, at, dt, still, player) || moving
    }
    // When there is room for fewer than the plan holds, the ones kept are a mix of walkers, sitters and standers (by a hash of who they are), not all
    // of one kind. Someone already in the place keeps their kind of figure; a newcomer is full while there is a full place left, lean after.
    const sorted = planner.at(at).sort((a, b) => hash(a.track.id) - hash(b.track.id) || (a.track.id < b.track.id ? -1 : 1))
    const admitted: { track: Track; sample: Sample; lean: boolean }[] = []
    let fullUsed = 0, leanUsed = 0
    for (const item of sorted) {
      const known = entries.get(item.track.id)
      if (!known || known.resident) continue
      if (known.lean ? leanUsed < leanCap : fullUsed < fullCap) { admitted.push({ ...item, lean: known.lean }); if (known.lean) leanUsed++; else fullUsed++ }
    }
    for (const item of sorted) {
      if (entries.has(item.track.id)) continue
      if (fullUsed < fullCap) { admitted.push({ ...item, lean: false }); fullUsed++ } else if (leanUsed < leanCap) { admitted.push({ ...item, lean: true }); leanUsed++ }
    }
    const present = new Set([...admitted.map(({ track }) => track.id), ...residents.map((resident) => resident.id)])
    for (const entry of [...entries.values()]) if (!present.has(entry.id)) leave(entry)
    for (const { track, sample, lean } of admitted) {
      const entry = entries.get(track.id) ?? enter(track.id, track.seed, track.role, false, lean)
      moving = put(entry, sample, at, dt, still, player) || moving
    }
    return moving
  }

  function farFor(at: number): void {
    const list = farCap > 0 ? planner.far(at).slice(0, farCap) : []
    const k = list.map((p) => p.seed).join(',')
    if (k === farKey) return
    farKey = k
    far?.dispose(); far = null
    if (!list.length) return
    far = makeFarFigures(kit, list)
    group.add(far.group)
  }

  function sync(at: number, dt: number, still: boolean): boolean {
    current = at
    const moving = place(at, dt, still)
    farFor(at)
    return moving
  }

  budget()
  sync(clock(), 0, true)

  return {
    step(dt, at = clock()) {
      if (disposed) return false
      frames += 1
      windowLeft = Math.max(0, windowLeft - dt)
      sync(at, dt, false)
      return windowLeft > 0
    },
    settle(at = clock()) { if (!disposed) sync(at, 1, true) },
    wake() {
      if (disposed) return false
      windowLeft = WINDOW_MS / 1000
      return true
    },
    get awake() { return windowLeft > 0 },
    get count() { return entries.size },
    get frames() { return frames },
    setResidents(list) {
      residents = list.slice(0, MAX_RESIDENTS)
      budget()
      sync(clock(), 0, true)
      return residents.map((resident) => resident.id)
    },
    rebudget() { if (disposed) return; budget(); if (windowLeft <= 0) sync(current, 0, true) },
    residentTag(id, name) {
      const entry = entries.get(id)
      if (!entry?.resident) return null
      return { id, name, kind: 'npc', text: name, marker: 'dot', colour: '#58d68a', position: { x: entry.x, y: entry.holder.position.y + entry.top, z: entry.z } }
    },
    people() {
      return [...entries.values()].map((entry) => ({ id: entry.id, role: entry.role, x: entry.x, z: entry.z, sitting: entry.shownKey.startsWith('sit') }))
    },
    tags() {
      const out: AmbientTag[] = []
      for (const [id, bark] of barks) {
        const entry = entries.get(id)
        if (!entry) continue
        out.push({ id: `bark:${id}`, name: '', kind: 'bark', text: bark.text, marker: 'tag', colour: '#ffffff', position: { x: entry.x, y: entry.holder.position.y + entry.top + 0.35, z: entry.z } })
      }
      return out
    },
    speak(id, text, ms = 5_000) {
      if (disposed || !entries.has(id)) return false
      const had = barks.get(id)
      if (had) clearTimeout(had.timer)
      const timer = setTimeout(() => { barks.delete(id); options.changed?.() }, ms)
      barks.set(id, { text, timer })
      options.changed?.()
      return true
    },
    talk(a, b, ms = 8_000) {
      const first = entries.get(a), second = entries.get(b)
      if (disposed || !first || !second) return false
      const until = current + ms
      first.talk = { until, face: Math.atan2(second.x - first.x, second.z - first.z), lead: true }
      second.talk = { until, face: Math.atan2(first.x - second.x, first.z - second.z), lead: false }
      return true
    },
    caps: () => ({ full: fullCap, lean: leanCap, far: farCap }),
    stats() {
      let triangles = far?.triangles ?? 0, meshes = far ? far.group.children.length : 0
      for (const entry of entries.values()) if (entry.shown) { triangles += entry.shown.userData.triangles ?? 0; meshes += entry.shown.children.length }
      return { triangles, meshes }
    },
    dispose() {
      disposed = true
      for (const entry of [...entries.values()]) leave(entry)
      for (const bark of barks.values()) clearTimeout(bark.timer)
      barks.clear()
      far?.dispose(); far = null
      group.parent?.remove(group)
    },
  }
}
