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
 * kind (about 150 triangles, one mesh) that a place can afford many of; the other is the game's own person (up to 600).
 */
export interface FigureSpec { seed: string; pose: AmbientPose; step: number; seat: number; lean?: boolean }
/** What a figure of each kind costs at most, in triangles: the layer plans its budget with these. */
export const FIGURE_COST = Object.freeze({ full: 450, lean: 170 })

/** The figure, standing at the origin facing +z, ready to be placed by its transform. Built once per (person, pose) and reused. */
export function makeFigure(kit: Kit, spec: FigureSpec): AvatarGroup {
  if (spec.lean) return makeLeanFigure(kit, spec)
  const walking = spec.pose === 'walk'
  return buildAvatar(kit, null, { seed: spec.seed, pose: walking ? 'walk' : spec.pose, ...(walking ? { stride: spec.step ? 0.75 : 0.25 } : {}), ...(spec.pose === 'sit' ? { seat: spec.seat } : {}), marker: null })
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
    limb(-0.2, hip, 0, 1.28, 0.13, trousers, legSwing, spec.pose === 'relax' ? -0.1 : 0)
    limb(0.2, hip, 0, 1.28, 0.13, trousers, -legSwing, spec.pose === 'relax' ? 0.16 : 0)
  }
  batch.cyl(0, hip + 0.6, 0, 0.36, 1.2, shirt, { seg: 6, top: 0.8 })
  batch.ico(0, hip + 1.45, 0, 0.26, 0.29, 0.26, skin)
  batch.ico(0, hip + 1.58, -0.02, 0.28, 0.2, 0.28, hair)
  const shoulder = hip + 1.1
  const swing = spec.pose === 'walk' ? -legSwing * 1.1 : 0
  const arms: Record<string, [number, number, number, number]> = {
    stand: [0, 0.12, 0, -0.12], walk: [swing, 0.08, -swing, -0.08], sit: [-0.5, 0.1, -0.5, -0.1], relax: [-0.25, 0.1, 0.1, -0.2],
    work: [0, 0.12, -1.35, -0.12], wave: [0, 0.12, 0, -2.7],
  }
  const [lx, lz, rx, rz] = arms[spec.pose] ?? arms.stand as [number, number, number, number]
  limb(-0.45, shoulder, 0, 1.05, 0.1, skin, lx, lz)
  limb(0.45, shoulder, 0, 1.05, 0.1, skin, rx, rz)
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
