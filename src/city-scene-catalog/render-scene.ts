import type { Group } from 'three'
import type { Lighting, SceneCamera, Colour } from '../scene/types.ts'

export interface RenderScene {
  kind: string
  group: Group
  camera: SceneCamera
  readonly background: Colour
  readonly sky: [Colour, Colour]
  readonly anchors: Record<string, unknown>
  lighting(): Lighting
  look(x: number, z: number): boolean
  stats(): { meshes: number }
  onAmbient?: ((ready: boolean) => void) | null
  target?(): [number, number, number]
  locations?: readonly { id: string; label: string }[]
  selectLocation?(id: string): boolean
  dispose(): void
}
