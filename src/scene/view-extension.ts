import type * as THREE from 'three'
import type { ThreeModule } from './types.ts'
import type { HostScene, HostWalk, SceneTag } from '../venue-world.ts'
import type { createWalker } from './movement.ts'
import type { SceneThing, WalkSpot } from './types.ts'
import type { LifeState } from '../types/life.ts'

export interface ViewTarget {
  id: string
  kind: 'spot' | 'object' | 'person' | 'table' | 'home-door' | 'neighbour-door' | 'street-gate' | 'street-door'
  label: string
  x: number
  y: number
  z: number
}

/** Scene coordinates stay with the host; the view owns only presentation and look input. */
export interface TelevisionScreen { id: string; x: number; y: number; z: number; ry: number; width: number; height: number }

export interface SceneViewContext {
  readonly screens: readonly TelevisionScreen[]
  readonly weakDevice: boolean
  THREE: ThreeModule
  container: HTMLElement
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  readonly scene: THREE.Object3D | null
  readonly bodies: readonly (THREE.Object3D | null)[]
  readonly x: number
  readonly y: number
  readonly z: number
  readonly facing: number
  readonly scale: number
  readonly pose: string
  readonly seat: number | undefined
  readonly moving: boolean
  readonly phase: number
  readonly enabled: boolean
  readonly canAct: boolean
  readonly location: string | null
  readonly activity: { kind?: string; id?: string } | null
  readonly solids: readonly number[][]
  targets(): ViewTarget[]
  activate(target: ViewTarget): void
  refresh(): void
  release(): void
}

export interface SceneViewExtension {
  /** The existing walker measures forward opposite the orbit camera's azimuth. */
  readonly inputEnabled: boolean
  readonly azimuth: number
  render(): void
  dispose(): void
}
/** Raw venue owners cross the lazy boundary; target and camera adaptation loads with the view. */
export interface VenueViewSource {
  THREE: ThreeModule
  container: HTMLElement
  camera: THREE.PerspectiveCamera
  canvas: HTMLCanvasElement
  walker: ReturnType<typeof createWalker>
  read(): {
    current: HostScene | null
    walk: HostWalk | null
    state: LifeState | null
    body: THREE.Object3D | null
    y: number
    phase: number
    rest: { pose: string; seat?: number | undefined } | null
    mode: string
    locked: boolean
    location: string | null
    weakDevice: boolean
    spots: WalkSpot[]
    things: SceneThing[]
    tags: { id: string; text?: string | undefined }[]
  }
  actions: {
    spot(id: string): void
    object(id: string): void
    home?: (() => void) | undefined
    neighbour?: ((id: string) => void) | undefined
    street?: (() => void) | undefined
    tag?: ((tag: SceneTag) => void) | undefined
  }
  refresh(): void
  release(): void
}
export type SceneViewSource = SceneViewContext | VenueViewSource
export type SceneViewFactory = (source: SceneViewSource) => SceneViewExtension
