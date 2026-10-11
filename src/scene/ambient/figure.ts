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

/** What a figure is asked to look like: who it is and what it is doing. `step` is which of the two walking steps. */
export interface FigureSpec { seed: string; pose: AmbientPose; step: number; seat: number }

/** The figure, standing at the origin facing +z, ready to be placed by its transform. Built once per (person, pose) and reused. */
export function makeFigure(kit: Kit, spec: FigureSpec): AvatarGroup {
  const walking = spec.pose === 'walk'
  return buildAvatar(kit, null, { seed: spec.seed, pose: walking ? 'walk' : spec.pose, ...(walking ? { stride: spec.step ? 0.75 : 0.25 } : {}), ...(spec.pose === 'sit' ? { seat: spec.seat } : {}), marker: null })
}

const SHIRTS = ['#c0562f', '#2f6f8f', '#d9a441', '#5a8f4e', '#7b4b94', '#b8c2c9', '#a33a4a', '#e8e0cc', '#3f4f6b', '#d97b9b']
const TROUSERS = ['#2b2f3a', '#3d4a5c', '#5b4a3a', '#1f2a2a', '#6b6f78']
const SKINS = ['#f1c9a0', '#cf9a6e', '#a66c45', '#8a5535', '#6b4029', '#4d2c1d', '#3b2218']

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
