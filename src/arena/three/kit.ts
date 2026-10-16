/**
 * OWNER: games (real-time)
 * THE ARENA'S 3D KIT: what every polished cartridge needs to draw with three.js on a cheap phone (docs/CARTRIDGES.md, "3D").
 * A lazy chunk with the game screens (three itself is the scene's own lazy chunk): nothing here is in the first download.
 *
 * BUDGET (RESEARCH.md): under 60,000-100,000 triangles and 60 draw calls a screen, 1K textures, one light, no shadow maps (a blob
 * under each body instead), a pixel ratio of at most 1.5, and Lambert materials (the packs' baked atlases keep their look).
 * `ratioLadder`/`nextLevel` keep a slow phone smooth by drawing fewer pixels; `stats()` says what a frame cost, so a throttled profile can be measured and recorded (STATUS.md).
 */
import * as THREE from 'three'
import type { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export { THREE }
export const MAX_PIXEL_RATIO = 1.5

/** The pixel ratios a game steps down through when its frames run long (the first is the most it ever draws at). */
export const RATIO_STEPS: readonly number[] = Object.freeze([1.5, 1.25, 1, 0.85])
/** A median frame time over this many ms steps the ratio down; under CALM_MS for CALM_FOR_MS it steps back up one. */
// CALM_MS is just above a 60 Hz frame (16.7 ms): a phone keeping up with its screen for 5 s earns its resolution back.
export const SLOW_MS = 22, CALM_MS = 18, CALM_FOR_MS = 5000, MEDIAN_FRAMES = 60
/** A phone that is far too slow (a median over this in the last QUICK_FRAMES) steps down without waiting for a full minute of frames. */
export const QUICK_FRAMES = 15, QUICK_MS = 66

/** The ratios for a screen of this device pixel ratio, best first: it starts at min(device ratio, 1.5) and steps down from there. */
export function ratioLadder(device: number): number[] {
  const start = Math.min(MAX_PIXEL_RATIO, Math.max(0.5, device || 1))
  return [start, ...RATIO_STEPS.filter((r) => r < start)]
}

const median = (list: readonly number[]): number => { const t = [...list].sort((a, b) => a - b); return t[Math.floor(t.length / 2)] ?? 0 }
export interface RatioState { /** Index into the ladder: 0 is the sharpest. */ level: number; /** How long the medians have been calm, ms. */ calmMs: number }
/**
 * The next level, pure. `recent` is the latest frame times in ms (the last MEDIAN_FRAMES are judged; fewer than that change nothing).
 * A median over SLOW_MS steps down one level at once (over QUICK_MS in just QUICK_FRAMES frames too); a median under CALM_MS for CALM_FOR_MS steps back up one; never past the ends.
 * The caller starts counting frames afresh after a change, so the new level is judged on its own frames.
 */
export function nextLevel(state: RatioState, levels: number, recent: readonly number[]): RatioState {
  if (recent.length >= QUICK_FRAMES && median(recent.slice(-QUICK_FRAMES)) > QUICK_MS) return { level: Math.min(levels - 1, state.level + 1), calmMs: 0 }
  if (recent.length < MEDIAN_FRAMES) return state
  const m = median(recent.slice(-MEDIAN_FRAMES)), last = recent[recent.length - 1] ?? 0
  if (m > SLOW_MS) return { level: Math.min(levels - 1, state.level + 1), calmMs: 0 }
  if (m >= CALM_MS) return { level: state.level, calmMs: 0 }
  const calmMs = state.calmMs + last
  return calmMs >= CALM_FOR_MS ? { level: Math.max(0, state.level - 1), calmMs: 0 } : { level: state.level, calmMs }
}

/** A WebGL renderer for a game canvas, or null when the browser has no WebGL (the screen falls back to its 2D view). */
export function makeRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer | null {
  try {
    const start = ratioLadder(globalThis.devicePixelRatio || 1)[0] as number
    // Smoothing edges costs a cheap phone's fill rate: only a sharp screen that starts above 1 gets it.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: start > 1 && (globalThis.devicePixelRatio ?? 1) < 2, alpha: false, powerPreference: 'high-performance', stencil: false })
    renderer.setPixelRatio(start)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = false
    return renderer
  } catch { return null }
}

// The loader and the meshopt decoder are reached by dynamic import, as src/scene/models/gltf-source.ts does: they then stay in the chunk
// the world's characters already load, instead of becoming a chunk of their own that the first download's preload lists would name.
let loader: Promise<GLTFLoader> | null = null
const cache = new Map<string, Promise<GLTF>>()
/** A GLB, fetched once a visit (meshopt, quantised meshes and WebP textures as the packs ship them). */
export function loadGlb(url: string): Promise<GLTF> {
  loader ??= Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]).then(([gltf, meshopt]) => new gltf.GLTFLoader().setMeshoptDecoder(meshopt.MeshoptDecoder))
  let found = cache.get(url)
  if (!found) { found = loader.then((l) => l.loadAsync(url)); cache.set(url, found); found.catch(() => cache.delete(url)) }
  return found
}

/**
 * A rigged model cloned with its own skeleton (what three's SkeletonUtils.clone does), written here so the game's other chunks keep
 * their shape: importing that module from a game made it a chunk of its own, which the first download's preload lists then named.
 */
export function cloneSkinned(source: THREE.Object3D): THREE.Object3D {
  const copy = source.clone(true)
  const bonesOf = new Map<THREE.Object3D, THREE.Object3D>()
  const walk = (a: THREE.Object3D, b: THREE.Object3D): void => { bonesOf.set(a, b); a.children.forEach((child, i) => { const twin = b.children[i]; if (twin) walk(child, twin) }) }
  walk(source, copy)
  copy.traverse((node) => {
    const mesh = node as THREE.SkinnedMesh
    if (!mesh.isSkinnedMesh) return
    const original = [...bonesOf.entries()].find(([, b]) => b === mesh)?.[0] as THREE.SkinnedMesh | undefined
    if (!original) return
    const bones = original.skeleton.bones.map((bone) => bonesOf.get(bone) as THREE.Bone)
    mesh.bind(new THREE.Skeleton(bones, original.skeleton.boneInverses), original.bindMatrix)
  })
  return copy
}

/** Swap every standard material for a Lambert one with the same texture and colour: cheaper per pixel, the same baked look. */
export function lambertise(root: THREE.Object3D, tint?: THREE.ColorRepresentation): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    const swap = (m: THREE.Material): THREE.Material => {
      const std = m as THREE.MeshStandardMaterial
      const next = new THREE.MeshLambertMaterial({ map: std.map ?? null, color: std.color ? std.color.clone() : new THREE.Color(0xffffff), side: std.side, transparent: std.transparent, alphaTest: std.alphaTest })
      if (tint !== undefined) next.color.multiply(new THREE.Color(tint))
      return next
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
    mesh.frustumCulled = false
  })
}

let blobTexture: THREE.Texture | null = null
/** A soft round shadow on the floor: one textured quad, no shadow map. */
export function blobShadow(radius: number, opacity = 0.45): THREE.Mesh {
  if (!blobTexture) {
    const c = document.createElement('canvas'); c.width = c.height = 64
    const g = c.getContext('2d') as CanvasRenderingContext2D
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31)
    grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64)
    blobTexture = new THREE.CanvasTexture(c)
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: blobTexture, transparent: true, opacity, depthWrite: false }))
  mesh.rotation.x = -Math.PI / 2
  mesh.renderOrder = 1
  return mesh
}

/** A camera shake that decays: `kick(strength)` on an impact, `offset(dt)` each frame. Off when the player asked for less motion. */
export class Shake {
  private amount = 0
  readonly reduced: boolean
  constructor(reduced: boolean) { this.reduced = reduced }
  kick(strength: number): void { if (!this.reduced) this.amount = Math.min(0.35, this.amount + strength) }
  offset(dtSeconds: number, out: THREE.Vector3): THREE.Vector3 {
    this.amount *= Math.pow(0.0025, dtSeconds)
    const a = this.amount
    return out.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a * 0.7, 0)
  }
}

/** Frame timing for measurement: the median and 95th percentile of the last frames, in ms, and what the GPU was asked. */
export class FrameStats {
  private readonly times: number[] = []
  private readonly work: number[] = []
  private last = 0
  /** What one frame's own code cost (ms): updating and submitting the scene, without waiting for the GPU. */
  cpu(ms: number): void { this.work.push(ms); if (this.work.length > 600) this.work.shift() }
  tick(now: number): void { if (this.last) { this.times.push(now - this.last); if (this.times.length > 600) this.times.shift() } this.last = now }
  read(renderer: THREE.WebGLRenderer | null): { frames: number; median: number; p95: number; cpuMedian: number; cpuP95: number; calls: number; triangles: number } {
    const at = (list: number[], p: number): number => { const t = [...list].sort((a, b) => a - b); return Math.round((t[Math.min(t.length - 1, Math.floor(t.length * p))] ?? 0) * 10) / 10 }
    return { frames: this.times.length, median: at(this.times, 0.5), p95: at(this.times, 0.95), cpuMedian: at(this.work, 0.5), cpuP95: at(this.work, 0.95), calls: renderer?.info.render.calls ?? 0, triangles: renderer?.info.render.triangles ?? 0 }
  }
}

/**
 * Free what a screen made when it closes: its own materials. Geometry and textures of loaded models are shared with the cache
 * (a clone shares them), so a second visit draws at once; they are small and stay for the visit.
 */
export function disposeScene(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose()
  })
}
