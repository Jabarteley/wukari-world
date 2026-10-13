/**
 * OWNER: scenes
 * THE ONE PLACE A BACKGROUND PERSON IS MADE.
 *
 * Everything in the ambient layer (src/scene/ambient/layer.ts) asks this file for a figure and for nothing else, and says only WHO
 * (a seed text), WHAT POSE (stand, relax, work, wave, sit, or one of the two walking steps) and the seat height. How the body is
 * built, dressed and lit is decided here and nowhere else: when the game's new character models arrive, replace the two functions
 * below (`makeFigure`, `makeFarFigures`) and the planner, the paths, the barks and the memory keep working unchanged.
 *
 * Today's bodies are the game's own procedural people: one or two meshes each at low detail (characters.ts), and for the far crowd a
 * single merged mesh of simple shapes, about fifty triangles a person.
 */
import type * as THREE from 'three';
import { createBatch, kitResources, releaseObjects, sceneMaterials, hash } from '../build.ts';
import { buildAvatar } from '../characters.ts';
import type { AvatarGroup } from '../characters.ts';
import type { Kit } from '../kit.ts';
import type { AmbientPose } from './plan.ts';

/**
 * What a figure is asked to look like: who it is and what it is doing. `step` is which of the two walking steps. `lean` asks for the cheap
 * kind (about 200 triangles, one mesh) that a place can afford many of; the other is the game's own person (up to 600).
 */
export interface FigureSpec { seed: string; look?: unknown; pose: AmbientPose; step: number; seat: number; lean?: boolean }
/** What a figure of each kind costs at most, in triangles: the layer plans its budget with these. */
export const FIGURE_COST = Object.freeze({ full: 600, lean: 230 })

/** The non-seated poses which can share one low-detail mesh and interpolate on the GPU. */
export type MotionPose = Exclude<AmbientPose, 'sit'>

/**
 * One low-detail person whose poses are morph targets on one merged mesh. The caller owns time:
 * pose() only chooses a target, step() advances the short cross-fade, and neither asks for frames.
 */
export interface MotionFigure {
  readonly group: AvatarGroup
  pose(pose: MotionPose, stride?: number, instant?: boolean): void
  face(blink: number, speech: number): void
  step(dt: number): boolean
  settle(): void
  dispose(): void
}

export const MOTION_BLEND_SECONDS = 0.18
const WALK_PHASES = [0, 0.25, 0.5, 0.75] as const
const STILL_POSES = ['relax', 'work', 'wave'] as const satisfies readonly MotionPose[]

interface MorphFrame { name: string; pose: MotionPose; stride?: number; facial?: { blink?: number; speech?: number } }
const POSE_FRAMES: readonly MorphFrame[] = Object.freeze([
  ...WALK_PHASES.map((stride, index) => ({ name: `walk${index}`, pose: 'walk' as const, stride })),
  ...STILL_POSES.map((pose) => ({ name: pose, pose })),
])
const FACE_FRAMES: readonly MorphFrame[] = Object.freeze([
  { name: 'blink', pose: 'stand', facial: { blink: 1 } },
  { name: 'speech', pose: 'stand', facial: { speech: 1 } },
])
const MORPH_FRAMES: readonly MorphFrame[] = Object.freeze([...POSE_FRAMES, ...FACE_FRAMES])

const meshChildren = (group: AvatarGroup): THREE.Mesh[] => group.children.filter((child): child is THREE.Mesh => (child as THREE.Mesh).isMesh === true)

function sameIndex(a: THREE.BufferGeometry, b: THREE.BufferGeometry): boolean {
  const ai = a.index?.array, bi = b.index?.array
  if (!ai || !bi) return ai === bi
  if (ai.length !== bi.length) return false
  for (let i = 0; i < ai.length; i++) if (ai[i] !== bi[i]) return false
  return true
}

/**
 * Build a single merged low-detail NPC with compatible position and normal morph targets. Returns
 * null for sitting or if a future avatar shape stops sharing topology, so callers can keep using a
 * normal static figure without risking corrupt geometry.
 */
export function makeMotionFigure(kit: Kit, spec: Omit<FigureSpec, 'lean'>): MotionFigure | null {
  if (spec.pose === 'sit') return null
  const { THREE } = kit
  const base = buildAvatar(kit, spec.look, { seed: spec.seed, pose: 'stand', marker: null })
  const meshes = meshChildren(base)
  if (meshes.length !== 1) { base.userData.dispose(); return null }
  const mesh = meshes[0]!
  const geometry = mesh.geometry
  const basePosition = geometry.getAttribute('position'), baseNormal = geometry.getAttribute('normal')
  if (!basePosition || !baseNormal || basePosition.itemSize !== 3 || baseNormal.itemSize !== 3) { base.userData.dispose(); return null }

  const positionTargets: THREE.BufferAttribute[] = [], normalTargets: THREE.BufferAttribute[] = []
  for (const frame of MORPH_FRAMES) {
    const target = buildAvatar(kit, spec.look, { seed: spec.seed, pose: frame.pose, ...(frame.stride === undefined ? {} : { stride: frame.stride }), ...(frame.facial ? { facial: frame.facial } : {}), marker: null })
    const targets = meshChildren(target), targetMesh = targets[0]
    const targetPosition = targetMesh?.geometry.getAttribute('position'), targetNormal = targetMesh?.geometry.getAttribute('normal')
    const compatible = targets.length === 1 && targetPosition?.count === basePosition.count && targetNormal?.count === baseNormal.count && sameIndex(geometry, targetMesh!.geometry)
    if (!compatible) {
      target.userData.dispose()
      base.userData.dispose()
      return null
    }
    const positions = new Float32Array(basePosition.count * 3), normals = new Float32Array(baseNormal.count * 3)
    for (let i = 0; i < basePosition.count; i++) {
      const at = i * 3
      positions[at] = targetPosition!.getX(i) - basePosition.getX(i)
      positions[at + 1] = targetPosition!.getY(i) - basePosition.getY(i)
      positions[at + 2] = targetPosition!.getZ(i) - basePosition.getZ(i)
      normals[at] = targetNormal!.getX(i) - baseNormal.getX(i)
      normals[at + 1] = targetNormal!.getY(i) - baseNormal.getY(i)
      normals[at + 2] = targetNormal!.getZ(i) - baseNormal.getZ(i)
    }
    const position = new THREE.BufferAttribute(positions, 3), normal = new THREE.BufferAttribute(normals, 3)
    position.name = frame.name; normal.name = frame.name
    positionTargets.push(position); normalTargets.push(normal)
    target.userData.dispose()
  }

  geometry.morphAttributes.position = positionTargets
  geometry.morphAttributes.normal = normalTargets
  geometry.morphTargetsRelative = true
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.boundingBox?.expandByScalar(0.05)
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.05
  mesh.updateMorphTargets()
  const influences = mesh.morphTargetInfluences
  if (!influences || influences.length !== MORPH_FRAMES.length) { base.userData.dispose(); return null }

  const from = new Array<number>(POSE_FRAMES.length).fill(0)
  const target = new Array<number>(POSE_FRAMES.length).fill(0)
  const current = new Array<number>(POSE_FRAMES.length).fill(0)
  let elapsed = MOTION_BLEND_SECONDS, wanted: MotionPose = 'stand'
  const writeWeights = (values: number[], pose: MotionPose, stride = 0): void => {
    values.fill(0)
    if (pose === 'walk') {
      const cycle = (((stride % 1) + 1) % 1) * WALK_PHASES.length
      const before = Math.floor(cycle) % WALK_PHASES.length, mix = cycle - Math.floor(cycle)
      values[before] = 1 - mix
      values[(before + 1) % WALK_PHASES.length] = mix
    } else if (pose !== 'stand') {
      const index = POSE_FRAMES.findIndex((frame) => frame.name === pose)
      if (index >= 0) values[index] = 1
    }
  }
  const applyPose = (values: readonly number[]): void => { for (let i = 0; i < POSE_FRAMES.length; i++) influences[i] = values[i] ?? 0 }
  const applyFace = (blink: number, speech: number): void => {
    influences[POSE_FRAMES.length] = Math.max(0, Math.min(1, blink))
    influences[POSE_FRAMES.length + 1] = Math.max(0, Math.min(1, speech))
  }
  const snapPose = (): void => {
    elapsed = MOTION_BLEND_SECONDS
    for (let i = 0; i < target.length; i++) current[i] = from[i] = target[i]!
    applyPose(current)
  }

  const controller: MotionFigure = {
    group: base,
    pose(pose, stride = 0, instant = false) {
      if (pose !== wanted) {
        wanted = pose; elapsed = 0
        for (let i = 0; i < current.length; i++) from[i] = current[i]!
      }
      writeWeights(target, pose, stride)
      if (instant) { snapPose(); return }
      if (elapsed >= MOTION_BLEND_SECONDS) {
        for (let i = 0; i < current.length; i++) current[i] = target[i]!
        applyPose(current)
      }
    },
    face: applyFace,
    step(dt) {
      if (elapsed >= MOTION_BLEND_SECONDS) return false
      elapsed = Math.min(MOTION_BLEND_SECONDS, elapsed + Math.max(0, dt))
      const linear = elapsed / MOTION_BLEND_SECONDS, eased = linear * linear * (3 - 2 * linear)
      for (let i = 0; i < current.length; i++) current[i] = from[i]! + (target[i]! - from[i]!) * eased
      applyPose(current)
      return elapsed < MOTION_BLEND_SECONDS
    },
    settle() { snapPose(); applyFace(0, 0) },
    dispose: () => base.userData.dispose(),
  }
  controller.pose(spec.pose, spec.pose === 'walk' ? (spec.step ? 0.75 : 0.25) : 0, true)
  return controller
}

/** The figure, standing at the origin facing +z, ready to be placed by its transform. Built once per (person, pose) and reused. */
export function makeFigure(kit: Kit, spec: FigureSpec): AvatarGroup {
  if (spec.lean) return makeLeanFigure(kit, spec)
  const walking = spec.pose === 'walk'
  return buildAvatar(kit, spec.look, { seed: spec.seed, pose: walking ? 'walk' : spec.pose, ...(walking ? { stride: spec.step ? 0.75 : 0.25 } : {}), ...(spec.pose === 'sit' ? { seat: spec.seat } : {}), marker: null })
}

/** A lean person: a tapered body, a head, two legs and two arms of single tubes, posed by the angles of the limbs. One mesh. */
function makeLeanFigure(kit: Kit, spec: FigureSpec): AvatarGroup {
  const { THREE } = kit
  const h = hash(spec.seed), shirt = SHIRTS[h % SHIRTS.length] as string, trousers = TROUSERS[(h >>> 4) % TROUSERS.length] as string, skin = SKINS[(h >>> 8) % SKINS.length] as string
  const height = 0.95 + ((h >>> 12) % 12) / 100, hair = (h >>> 16) % 3 === 0 ? skin : '#1d1a19'
  const batch = createBatch(THREE)
  const limb = (x: number, y: number, z: number, length: number, radius: number, colour: string, rx: number, rz = 0): void => {
    batch.at(x, y, z, 0, () => { batch.cyl(0, -length / 2, 0, radius, length, colour, { seg: 5 }) }, rx, rz)
  }
  const sitting = spec.pose === 'sit'
  const hip = sitting ? spec.seat + 0.1 : 1.3
  const legSwing = spec.pose === 'walk' ? (spec.step ? 0.55 : -0.55) : 0
  if (sitting) {
    for (const side of [-1, 1]) {
      limb(side * 0.2, hip, 0, 0.75, 0.13, trousers, -Math.PI / 2)
      limb(side * 0.2, hip, 0.75, Math.max(0.3, hip - 0.1), 0.11, trousers, 0)
    }
  } else {
    limb(-0.2, hip, 0, 1.28, 0.15, trousers, legSwing, spec.pose === 'relax' ? -0.1 : 0)
    limb(0.2, hip, 0, 1.28, 0.15, trousers, -legSwing, spec.pose === 'relax' ? 0.16 : 0)
  }
  batch.cyl(0, hip + 0.6, 0, 0.36, 1.2, shirt, { seg: 6, top: 0.8 })
  batch.ico(0, hip + 1.45, 0, 0.26, 0.29, 0.26, skin)
  batch.ico(0, hip + 1.58, -0.02, 0.28, 0.2, 0.28, hair)
  const shoulder = hip + 1.1
  const swing = spec.pose === 'walk' ? -legSwing * 1.1 : 0
  // [left arm swing, left arm out, left elbow, right arm swing, right arm out, right elbow]
  const arms: Record<string, [number, number, number, number, number, number]> = {
    stand: [0, 0.1, -0.15, 0, -0.1, -0.15], walk: [swing, 0.06, -0.3, -swing, -0.06, -0.3], sit: [-0.7, 0.1, -0.9, -0.7, -0.1, -0.9], relax: [-0.3, 0.1, -0.7, 0.1, -0.2, -0.1],
    work: [0, 0.1, -0.15, -0.7, -0.1, -1.7], wave: [0, 0.1, -0.15, 0, -2.5, -0.5],
  }
  const [lx, lz, le, rx, rz, re] = arms[spec.pose] ?? arms.stand as [number, number, number, number, number, number]
  const sleeve = (h >>> 3) % 3 === 0 ? skin : shirt
  const arm = (side: number, swingX: number, out: number, elbow: number): void => {
    batch.at(side * 0.46, shoulder, 0, 0, () => {
      batch.cyl(0, -0.27, 0, 0.125, 0.54, sleeve, { seg: 5 })
      batch.at(0, -0.54, 0, 0, () => { batch.cyl(0, -0.25, 0, 0.1, 0.5, skin, { seg: 5 }) }, elbow)
    }, swingX, out)
  }
  arm(-1, lx, lz, le)
  arm(1, rx, rz, re)
  const built = batch.build(sceneMaterials(kit))
  const group = new THREE.Group() as AvatarGroup
  group.scale.set(height, height, height)
  const meshes: THREE.Mesh[] = built.meshes
  for (const mesh of meshes) group.add(mesh)
  const registry = kitResources(kit).disposers
  const dispose = (): void => { registry.delete(dispose); releaseObjects(meshes); group.parent?.remove(group) }
  registry.add(dispose)
  group.userData = { top: (hip + 1.8) * height, triangles: built.triangles, dispose } as AvatarGroup['userData']
  return group
}

const SHIRTS = ['#c0562f', '#2f6f8f', '#d9a441', '#5a8f4e', '#7b4b94', '#b8c2c9', '#a33a4a', '#e8e0cc', '#3f4f6b', '#d97b9b']
const TROUSERS = ['#2b2f3a', '#3d4a5c', '#5b4a3a', '#1f2a2a', '#6b6f78']
const SKINS = ['#b27a50', '#a66c45', '#8a5535', '#7a4a30', '#6b4029', '#5a3524', '#4d2c1d', '#3b2218']

export interface FarSpec { x: number; z: number; ry: number; seed: string }
export interface FarFigures { group: THREE.Group; triangles: number; dispose(): void }

/** The far crowd: figures far from the camera, so each is a tapered body and a head in one colour each, all merged into one mesh. */
export function makeFarFigures(kit: Kit, people: readonly FarSpec[]): FarFigures {
  const { THREE } = kit
  const batch = createBatch(THREE)
  for (const person of people) {
    const h = hash(person.seed), shirt = SHIRTS[h % SHIRTS.length] as string, trousers = TROUSERS[(h >>> 4) % TROUSERS.length] as string, skin = SKINS[(h >>> 8) % SKINS.length] as string
    const tall = 0.92 + ((h >>> 12) % 16) / 100
    batch.at(person.x, 0, person.z, person.ry, () => {
      batch.cyl(0, 0.55 * tall, 0, 0.3, 1.1 * tall, trousers, { seg: 5 })
      batch.cyl(0, 1.55 * tall, 0, 0.34, 1.0 * tall, shirt, { seg: 6, top: 0.26 })
      batch.ico(0, 2.28 * tall, 0, 0.25, 0.28, 0.25, skin)
    })
  }
  const built = batch.build(sceneMaterials(kit))
  const group = new THREE.Group()
  group.name = 'ambient-far'
  const meshes: THREE.Mesh[] = built.meshes
  for (const mesh of meshes) group.add(mesh)
  const registry = kitResources(kit).disposers
  const dispose = (): void => { registry.delete(dispose); releaseObjects(meshes); group.parent?.remove(group) }
  registry.add(dispose)
  return { group, triangles: built.triangles, dispose }
}
