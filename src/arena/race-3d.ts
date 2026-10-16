/**
 * OWNER: games (real-time)
 * RACE IN 3D: the same server-judged race (./race.ts) drawn with three.js on the phone, seen from behind your own car (or the leader's, for a
 * viewer). The road is one ribbon mesh built from the track's points (./race-3d-geo.ts buildRoad: asphalt, kerbs on the outside of bends,
 * the start line, boost pads), barriers and fences stand along both edges, a grandstand and pit garages by the start, trees and lamps beside
 * it, and a lagoon under the bridge. Cars are the CC0 Kenney race cars: their parts are baked into one body mesh and four wheels each, the
 * wheels roll with the car's speed and the front pair steer, and the body rolls and dives with the turning and braking. Slides raise tyre
 * smoke, a bump throws sparks and shakes the camera, and the finish is a short low angle by the line. HUD and banners are drawn over it by
 * ./race-draw.ts (drawRaceHud), so both views read the same.
 *
 * SIZE (docs/CARTRIDGES.md "3D on a phone"): about 0.1 MB of models (8 files), roughly 30,000 triangles and under 50 draw calls on the
 * busiest track, one hemisphere light and one directional light, no shadow map (a blob under each car), Lambert materials, instanced
 * barriers. A lazy chunk: the Games hub warms it (preloadRace) and the Race screen fetches it when it opens, and draws the 2D view until
 * it is ready (or for ever, without WebGL).
 */
import { THREE, Shake, FrameStats, MEDIAN_FRAMES, blobShadow, loadGlb, makeRenderer, nextLevel, ratioLadder } from './three/kit.ts'
import type { RatioState } from './three/kit.ts'
import { ASSET_VERSIONS } from './asset-versions.generated.ts'
import { newCar } from './race.ts'
import { buildTrack, nearestIndex, pointAt, ROAD_HALF } from './race-track.ts'
import type { Track, TrackId } from './race-track.ts'
import { UNIT, BODY_UNITS } from './race-units.ts'
import {
  BARRIER_LAT, DECK_DROP_M, NO_INSETS, PALETTES, alongX, bandShift, boxMesh, buildRoad, chasePose, facingZ, hash, lean, lineAlong, motionOf, obstaclePlaces,
  orbitPose, photoFinishPose, scatter, smoking, spinStep, startArea, steerAngle,
} from './race-3d-geo.ts'
import type { Insets, Place, Pose3, RoadMesh } from './race-3d-geo.ts'

export type { Insets } from './race-3d-geo.ts'
export { NO_INSETS } from './race-3d-geo.ts'

/** A model's URL with its content version (asset-versions.generated.ts): /assets/ is cached for a year, so a changed file needs a new URL. */
const versioned = (path: string): string => `${path}?v=${ASSET_VERSIONS[path] ?? 'x'}`
const KIT = '/assets/packs/kenney-racing-kit/'
export const RACE_ASSETS = Object.freeze({
  /** One car model a seat: red, orange, green, white. */
  cars: ['raceCarRed', 'raceCarOrange', 'raceCarGreen', 'raceCarWhite'].map((name) => versioned(`${KIT}${name}.glb`)),
  barrier: versioned(`${KIT}barrierWall.glb`),
  fence: versioned(`${KIT}fenceStraight.glb`),
  stand: versioned(`${KIT}grandStand.glb`),
  garage: versioned(`${KIT}pitsGarage.glb`),
  tree: versioned(`${KIT}treeLarge.glb`),
  treeSmall: versioned(`${KIT}treeSmall.glb`),
  lamp: versioned(`${KIT}lightPostModern.glb`),
  flag: versioned(`${KIT}flagCheckers.glb`),
})
const ALL_ASSETS: readonly string[] = [...RACE_ASSETS.cars, RACE_ASSETS.barrier, RACE_ASSETS.fence, RACE_ASSETS.stand, RACE_ASSETS.garage, RACE_ASSETS.tree, RACE_ASSETS.treeSmall, RACE_ASSETS.lamp, RACE_ASSETS.flag]
/** Fetch and parse the Race models ahead of the screen (the Games hub does this when it opens and when the browser is idle). */
export function preloadRace(): Promise<unknown> { return Promise.all(ALL_ASSETS.map((url) => loadGlb(url))) }

type Gltf = Awaited<ReturnType<typeof loadGlb>>

// ---- baking models -------------------------------------------------------------------------------------------------------------

/** One baked group of a model: every mesh that shares a texture (or none) merged, positions in metres in the frame asked for. */
interface Part { geometry: THREE.BufferGeometry; map: THREE.Texture | null; transparent: boolean; alphaTest: number; color: THREE.Color }
/**
 * The meshes of `root` (those `want` accepts) as a few merged geometries in the frame `frame` (default: the model as loaded): colours go
 * into a vertex-colour attribute, so a model of many flat-coloured meshes is one draw; a textured material keeps its own group.
 */
function bake(root: THREE.Object3D, frame: THREE.Matrix4, want: (mesh: THREE.Mesh) => boolean = () => true): Part[] {
  root.updateMatrixWorld(true)
  interface Acc { p: number[]; n: number[]; c: number[]; uv: number[]; i: number[]; map: THREE.Texture | null; transparent: boolean; alphaTest: number; color: THREE.Color }
  const groups = new Map<string, Acc>()
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), m = new THREE.Matrix4()
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh || !want(mesh)) return
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial
    const key = mat.map ? mat.map.uuid : 'plain'
    let acc = groups.get(key)
    if (!acc) { acc = { p: [], n: [], c: [], uv: [], i: [], map: mat.map ?? null, transparent: mat.transparent, alphaTest: mat.alphaTest, color: mat.map ? mat.color.clone() : new THREE.Color(1, 1, 1) }; groups.set(key, acc) }
    m.multiplyMatrices(frame, mesh.matrixWorld); nm.getNormalMatrix(m)
    const pos = mesh.geometry.attributes.position as THREE.BufferAttribute, nor = mesh.geometry.attributes.normal as THREE.BufferAttribute | undefined, uv = mesh.geometry.attributes.uv as THREE.BufferAttribute | undefined
    const base = acc.p.length / 3, rgb = mat.map ? new THREE.Color(1, 1, 1) : mat.color
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(m); acc.p.push(v.x, v.y, v.z)
      if (nor) { v.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize(); acc.n.push(v.x, v.y, v.z) } else acc.n.push(0, 1, 0)
      acc.c.push(rgb.r, rgb.g, rgb.b)
      if (uv) acc.uv.push(uv.getX(k), uv.getY(k)); else acc.uv.push(0, 0)
    }
    const index = mesh.geometry.index
    if (index) for (let k = 0; k < index.count; k++) acc.i.push(base + index.getX(k)); else for (let k = 0; k < pos.count; k++) acc.i.push(base + k)
  })
  return [...groups.values()].map((acc) => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(acc.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(acc.n, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(acc.c, 3))
    if (acc.map) g.setAttribute('uv', new THREE.Float32BufferAttribute(acc.uv, 2))
    g.setIndex(acc.i)
    return { geometry: g, map: acc.map, transparent: acc.transparent, alphaTest: acc.alphaTest, color: acc.color }
  })
}
const materialOf = (part: Part): THREE.MeshLambertMaterial => part.map
  ? new THREE.MeshLambertMaterial({ map: part.map, color: part.color, transparent: part.transparent, alphaTest: part.alphaTest, side: THREE.DoubleSide })
  : new THREE.MeshLambertMaterial({ vertexColors: true })
/** A model's size and the frame that stands it on the ground at the middle of its footprint. */
function groundFrame(root: THREE.Object3D): { frame: THREE.Matrix4; size: THREE.Vector3 } {
  root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3())
  return { frame: new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z), size: box.getSize(new THREE.Vector3()) }
}
const geometryOf = (mesh: RoadMesh): THREE.BufferGeometry => {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3)); g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3)); g.setAttribute('color', new THREE.BufferAttribute(mesh.colors, 3))
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1))
  return g
}

/** A prop model baked once, standing on the ground, ready to be instanced along the road. */
interface Prop { parts: Part[]; size: THREE.Vector3 }
function propOf(model: Gltf): Prop {
  const { frame, size } = groundFrame(model.scene)
  return { parts: bake(model.scene, frame), size }
}
/** Instances of a prop: one InstancedMesh a part, all given the same matrices. */
function instance(prop: Prop, places: readonly { x: number; y?: number; z: number; yaw: number; scale?: number }[], parent: THREE.Object3D): THREE.InstancedMesh[] {
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  return prop.parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, materialOf(part), Math.max(1, places.length))
    places.forEach((at, i) => { mesh.setMatrixAt(i, m.compose(p.set(at.x, at.y ?? 0, at.z), q.setFromAxisAngle(up, at.yaw), s.setScalar(at.scale ?? 1))) })
    mesh.count = places.length; mesh.instanceMatrix.needsUpdate = true; mesh.frustumCulled = false
    parent.add(mesh)
    return mesh
  })
}

/** A run of instances along the lap of which only those near the car are drawn (a long run of barriers is most of a scene's triangles). */
interface Windowed { update(arc: number): void }
function windowed(prop: Prop, places: readonly { x: number; z: number; yaw: number; scale?: number; arc: number }[], parent: THREE.Object3D, length: number, behind: number, ahead: number, sink: THREE.Material[]): Windowed {
  const meshes = instance(prop, places, parent), n = places.length
  for (const mesh of meshes) sink.push(mesh.material as THREE.Material)
  const all = new Float32Array(Math.max(1, n) * 16), m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0)
  places.forEach((at, i) => m.compose(p.set(at.x, 0, at.z), q.setFromAxisAngle(up, at.yaw), s.setScalar(at.scale ?? 1)).toArray(all, i * 16))
  let last = Infinity
  return {
    update(arc) {
      if (Math.abs(arc - last) < 60) return
      last = arc
      let k = 0
      for (let i = 0; i < n; i++) {
        let d = (places[i] as { arc: number }).arc - arc
        d -= Math.round(d / length) * length
        if (d < -behind || d > ahead) continue
        for (const mesh of meshes) (mesh.instanceMatrix.array as Float32Array).set(all.subarray(i * 16, i * 16 + 16), k * 16)
        k++
      }
      for (const mesh of meshes) { mesh.count = k; mesh.instanceMatrix.needsUpdate = true }
    },
  }
}

// ---- the cars --------------------------------------------------------------------------------------------------------------------

interface CarModel { body: Part[]; wheels: { at: THREE.Vector3; parts: Part[]; radius: number; front: boolean }[]; scale: number }
/**
 * A race car from the Kenney file: scaled so its length is the rules' body length (race-units.ts), standing on its wheels at the middle of
 * its footprint, facing +z; the body baked into one geometry and each wheel into one, centred on its axle so it can spin and steer.
 */
function carOf(model: Gltf): CarModel {
  model.scene.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model.scene), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3())
  const scale = (BODY_UNITS * UNIT) / size.z
  const frame = new THREE.Matrix4().makeScale(scale, scale, scale).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z))
  const wheelNodes: THREE.Object3D[] = []
  model.scene.traverse((node) => { if (/^wheel(Front|Back)(Left|Right)$/.test(node.name)) wheelNodes.push(node) })
  const inWheel = (mesh: THREE.Object3D): boolean => { for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (wheelNodes.includes(o)) return true; return false }
  const wheels = wheelNodes.map((node) => {
    // Bake the wheel in the car's frame, find where its axle is (its centre), then move the geometry so that point is the origin.
    const parts = bake(model.scene, frame, (mesh) => { for (let o: THREE.Object3D | null = mesh; o; o = o.parent) if (o === node) return true; return false })
    const bounds = new THREE.Box3()
    for (const part of parts) { part.geometry.computeBoundingBox(); bounds.union(part.geometry.boundingBox as THREE.Box3) }
    const at = bounds.getCenter(new THREE.Vector3())
    for (const part of parts) part.geometry.translate(-at.x, -at.y, -at.z)
    return { at, parts, radius: (bounds.max.y - bounds.min.y) / 2, front: node.name.startsWith('wheelFront') }
  })
  const body = bake(model.scene, frame, (mesh) => !inWheel(mesh))
  for (const part of body) enrich(part.geometry.attributes.color as THREE.BufferAttribute)
  return { body, wheels, scale }
}

/** The Kenney body colours are pastels: deepen the saturated ones (red, orange, green) so a car reads against sand and asphalt; greys stay as they are. */
function enrich(colors: THREE.BufferAttribute): void {
  const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 }
  for (let i = 0; i < colors.count; i++) {
    c.setRGB(colors.getX(i), colors.getY(i), colors.getZ(i)).getHSL(hsl, THREE.SRGBColorSpace)
    if (hsl.s > 0.12) { hsl.s = Math.min(1, hsl.s * 1.9); hsl.l *= 0.82; c.setHSL(hsl.h, hsl.s, hsl.l, THREE.SRGBColorSpace); colors.setXYZ(i, c.r, c.g, c.b) }
  }
}

interface CarRig {
  root: THREE.Group; lean: THREE.Group; wheels: { node: THREE.Group; radius: number; front: boolean; spin: number }[]; shadow: THREE.Mesh
  // motion state, from the drawn poses
  x: number; y: number; a: number; speed: number; slide: number; yawRate: number; steer: number; roll: number; pitch: number; lastSpeed: number; hit: boolean; boost: boolean; seen: boolean; fin: boolean
}

/** The little vehicles on the Mainland bridge, built from boxes: a yellow danfo with its black stripe, an okada with its rider. */
function danfoBoxes(): { c: [number, number, number]; s: [number, number, number]; hex: number }[] {
  return [
    { c: [0, 0.95, 0], s: [3.6, 1.5, 1.7], hex: 0xf4c20d }, { c: [0, 1.0, 0], s: [3.64, 0.26, 1.74], hex: 0x1a1a1a }, { c: [0.35, 1.55, 0], s: [2.6, 0.5, 1.66], hex: 0x6f9ec0 },
    { c: [1.2, 0.35, 0.8], s: [0.8, 0.7, 0.3], hex: 0x1d1d1f }, { c: [1.2, 0.35, -0.8], s: [0.8, 0.7, 0.3], hex: 0x1d1d1f }, { c: [-1.2, 0.35, 0.8], s: [0.8, 0.7, 0.3], hex: 0x1d1d1f }, { c: [-1.2, 0.35, -0.8], s: [0.8, 0.7, 0.3], hex: 0x1d1d1f },
  ]
}
function okadaBoxes(): { c: [number, number, number]; s: [number, number, number]; hex: number }[] {
  return [
    { c: [0.75, 0.38, 0], s: [0.76, 0.76, 0.16], hex: 0x1d1d1f }, { c: [-0.75, 0.38, 0], s: [0.76, 0.76, 0.16], hex: 0x1d1d1f }, { c: [0, 0.7, 0], s: [1.5, 0.4, 0.34], hex: 0xc9352b },
    { c: [-0.15, 1.28, 0], s: [0.4, 0.8, 0.5], hex: 0x2d6fb5 }, { c: [-0.15, 1.85, 0], s: [0.32, 0.32, 0.32], hex: 0x8a5a3c }, { c: [0.45, 1.0, 0], s: [0.15, 0.5, 0.7], hex: 0x2a2a2a },
  ]
}

// ---- smoke, dust and sparks ------------------------------------------------------------------------------------------------------

const POINT_VERTEX = `attribute float aAlpha; attribute float aSize; attribute vec3 aColor; uniform float uScale; varying float vA; varying vec3 vC;
void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = max(1.0, aSize * uScale / -mv.z); gl_Position = projectionMatrix * mv; vA = aAlpha; vC = aColor; }`
const POINT_FRAGMENT = `varying float vA; varying vec3 vC;
void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.25, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`
/** A pool of soft round particles drawn as one Points object: each fades and grows as it ages. */
class Puffs {
  readonly points: THREE.Points
  private readonly count: number
  private readonly pos: Float32Array; private readonly vel: Float32Array; private readonly col: Float32Array; private readonly alpha: Float32Array; private readonly size: Float32Array
  private readonly life: Float32Array; private readonly span: Float32Array; private readonly size0: Float32Array; private readonly grow: Float32Array; private readonly a0: Float32Array
  private readonly material: THREE.ShaderMaterial
  private next = 0
  constructor(count: number) {
    this.count = count
    this.pos = new Float32Array(count * 3).fill(-999); this.vel = new Float32Array(count * 3); this.col = new Float32Array(count * 3); this.alpha = new Float32Array(count); this.size = new Float32Array(count)
    this.life = new Float32Array(count).fill(1); this.span = new Float32Array(count).fill(1); this.size0 = new Float32Array(count); this.grow = new Float32Array(count); this.a0 = new Float32Array(count)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1))
    this.material = new THREE.ShaderMaterial({ vertexShader: POINT_VERTEX, fragmentShader: POINT_FRAGMENT, uniforms: { uScale: { value: 600 } }, transparent: true, depthWrite: false })
    this.points = new THREE.Points(g, this.material); this.points.frustumCulled = false; this.points.renderOrder = 2
  }
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, seconds: number, size: number, grow: number, rgb: number, alpha: number): void {
    const k = (this.next = (this.next + 1) % this.count)
    this.pos.set([x, y, z], k * 3); this.vel.set([vx, vy, vz], k * 3)
    this.col.set([((rgb >> 16) & 255) / 255, ((rgb >> 8) & 255) / 255, (rgb & 255) / 255], k * 3)
    this.life[k] = 0; this.span[k] = seconds; this.size0[k] = size; this.grow[k] = grow; this.a0[k] = alpha
  }
  update(dt: number, scale: number): void {
    this.material.uniforms.uScale!.value = scale
    for (let k = 0; k < this.count; k++) {
      const life = this.life[k] as number
      if (life >= 1) { this.alpha[k] = 0; continue }
      const t = life + dt / (this.span[k] as number)
      this.life[k] = t
      this.vel[k * 3 + 1] = (this.vel[k * 3 + 1] as number) * (1 - dt * 1.5)
      for (let a = 0; a < 3; a++) this.pos[k * 3 + a] = (this.pos[k * 3 + a] as number) + (this.vel[k * 3 + a] as number) * dt
      this.size[k] = (this.size0[k] as number) + (this.grow[k] as number) * t
      this.alpha[k] = t >= 1 ? 0 : (this.a0[k] as number) * (1 - t) * Math.min(1, t * 8)
    }
    for (const name of ['position', 'aAlpha', 'aSize', 'aColor']) (this.points.geometry.attributes[name] as THREE.BufferAttribute).needsUpdate = true
  }
  dispose(): void { this.points.geometry.dispose(); this.material.dispose() }
}

// ---- the view ----------------------------------------------------------------------------------------------------------------------

/** One car as the screen hands it over, in rules units (the same as race-draw's DrawCar). */
export interface ViewCar { x: number; y: number; a: number; /** rules units a tick */ v: number; fl: number; fin: boolean }
export interface RaceFrame {
  cars: readonly ViewCar[]
  /** The seat the camera follows (yours, or the leader or the one a viewer chose); -1 with no cars. */
  focus: number
  /** Your seat, or null for a viewer. */
  you: number | null
  now: number
  /** 0 countdown, 1 racing, 2 over (race.ts PHASE). */
  phase: number
  /** Seconds of the countdown left (3, 2, 1), else 0. */
  count: number
}
export interface RaceView {
  setTrack(id: TrackId): void
  draw(frame: RaceFrame): void
  /** Where each seat's car is on screen after the last draw (px in the canvas; null when behind the camera), for name labels. */
  screen: readonly ({ x: number; y: number } | null)[]
  resize(width: number, height: number, insets?: Insets): void
  stats(): ReturnType<FrameStats['read']> & { /** the pixel ratio now drawn at */ ratio: number; /** the car being followed (rules units, radians, km/h), for measurement scripts */ car: { x: number; y: number; a: number; kmh: number } | null }
  dispose(): void
}
/** Which way each baked model faces, as a turn (radians) to add to 'front towards the road' (read from the Kenney files by looking at them). */
const FRONT = { stand: 0, garage: 0, lamp: 0 }
const FLAG_OFF = 1, FLAG_HIT = 2, FLAG_BRAKE = 8, FLAG_BOOST = 16, FLAG_SPAWN = 32
const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v)
const easeStep = (t: number): number => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k) }
const lerpAngle = (a: number, b: number, t: number): number => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return a + d * t }
/** How long the low finish angle lasts, ms. */
export const PHOTO_MS = 2600

/** Make the 3D view on `canvas`, or null when WebGL or the models are not available (the screen keeps its 2D view). */
export async function createRaceView(canvas: HTMLCanvasElement, opts: { reduced: boolean }): Promise<RaceView | null> {
  const renderer = makeRenderer(canvas)
  if (!renderer) return null
  let models: Gltf[]
  try { models = await Promise.all(ALL_ASSETS.map((url) => loadGlb(url))) } catch { renderer.dispose(); return null }
  const [car0, car1, car2, car3, barrierM, fenceM, standM, garageM, treeM, treeSmallM, lampM, flagM] = models as [Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf, Gltf]

  const scene = new THREE.Scene()
  scene.background = skyTexture()
  const horizon = new THREE.Color(0xcfe3ee)
  scene.fog = new THREE.Fog(horizon, 90, 330)
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x6a6350, 1.35))
  const sun = new THREE.DirectionalLight(0xfff0d8, 1.9)
  sun.position.set(-30, 50, 20); scene.add(sun)

  // Models that do not depend on the track are baked once.
  const carModels = [car0, car1, car2, car3].map(carOf)
  const props = { barrier: propOf(barrierM), fence: propOf(fenceM), stand: propOf(standM), garage: propOf(garageM), tree: propOf(treeM), treeSmall: propOf(treeSmallM), lamp: propOf(lampM), flag: propOf(flagM) }
  const carMat = new THREE.MeshLambertMaterial({ vertexColors: true })

  // The cars: four rigs, shown as the race needs them.
  const rigs: CarRig[] = carModels.map((model) => {
    const root = new THREE.Group(), tilt = new THREE.Group(); root.add(tilt)
    for (const part of model.body) { const mesh = new THREE.Mesh(part.geometry, carMat); mesh.frustumCulled = false; tilt.add(mesh) }
    const wheels = model.wheels.map((w) => {
      const node = new THREE.Group(); node.rotation.order = 'YXZ'; node.position.copy(w.at)
      for (const part of w.parts) { const mesh = new THREE.Mesh(part.geometry, carMat); mesh.frustumCulled = false; node.add(mesh) }
      tilt.add(node)
      return { node, radius: w.radius, front: w.front, spin: 0 }
    })
    const shadow = blobShadow(2.6, 0.5); shadow.position.y = 0.045; scene.add(shadow); scene.add(root)
    root.visible = false; shadow.visible = false
    return { root, lean: tilt, wheels, shadow, x: 0, y: 0, a: 0, speed: 0, slide: 0, yawRate: 0, steer: 0, roll: 0, pitch: 0, lastSpeed: 0, hit: false, boost: false, seen: false, fin: false }
  })
  // Brake lights: eight small boxes, one draw; they go bright while braking (per-instance colour).
  const lampBox = new THREE.BoxGeometry(0.34, 0.16, 0.08)
  const lamps = new THREE.InstancedMesh(lampBox, new THREE.MeshBasicMaterial({ fog: false }), 8)
  lamps.instanceMatrix.setUsage(THREE.DynamicDrawUsage); lamps.frustumCulled = false; lamps.count = 0; scene.add(lamps)
  const puffs = new Puffs(120); scene.add(puffs.points)

  const camera = new THREE.PerspectiveCamera(60, 1, 0.4, 520)
  const shake = new Shake(opts.reduced), shakeOffset = new THREE.Vector3()
  const stats = new FrameStats()
  const ladder = ratioLadder(globalThis.devicePixelRatio || 1)
  let rung: RatioState = { level: 0, calmMs: 0 }
  const recent: number[] = []
  let sizeW = 300, sizeH = 300, snapCamera = true
  const setRung = (next: RatioState): void => {
    if (next.level !== rung.level) { renderer.setPixelRatio(ladder[next.level] as number); renderer.setSize(sizeW, sizeH, false); recent.length = 0 }
    rung = next
  }

  // The track's scenery: everything that depends on the track lives in one group that a track change throws away.
  let world: THREE.Group | null = null, track: Track | null = null, trackId: TrackId | null = null
  let windows: Windowed[] = []
  const worldMaterials: THREE.Material[] = [], worldGeometries: THREE.BufferGeometry[] = []
  function setTrack(id: TrackId): void {
    if (id === trackId) return
    if (world) { scene.remove(world); for (const g of worldGeometries) g.dispose(); for (const m of worldMaterials) m.dispose() }
    worldGeometries.length = 0; worldMaterials.length = 0; windows = []
    world = new THREE.Group(); scene.add(world)
    trackId = id; track = buildTrack(id); snapCamera = true
    const pal = PALETTES[id], t = track
    const own = <T extends THREE.BufferGeometry>(g: T): T => { worldGeometries.push(g); return g }
    const mat = <T extends THREE.Material>(m: T): T => { worldMaterials.push(m); return m }
    const w = world
    // A prop's geometry is shared by every track (it stays); the materials an instance makes go with the track.
    const inst = (prop: Prop, places: readonly { x: number; y?: number; z: number; yaw: number; scale?: number }[]): void => { for (const mesh of instance(prop, places, w)) worldMaterials.push(mesh.material as THREE.Material) }
    // The road, its shoulders and (on the bridge) the deck sides: one mesh.
    const road = new THREE.Mesh(own(geometryOf(buildRoad(t))), mat(new THREE.MeshLambertMaterial({ vertexColors: true })))
    road.frustumCulled = false; w.add(road)
    // The ground: grass or sand, or the lagoon under the bridge.
    const bounds = new THREE.Box3(); for (let i = 0; i < t.n; i++) bounds.expandByPoint(new THREE.Vector3((t.x[i] as number) * UNIT, 0, (t.y[i] as number) * UNIT))
    const centre = bounds.getCenter(new THREE.Vector3())
    const ground = new THREE.Mesh(own(new THREE.PlaneGeometry(1600, 1600)), mat(new THREE.MeshLambertMaterial({ color: pal.ground })))
    ground.rotation.x = -Math.PI / 2; ground.position.set(centre.x, pal.theme === 'bridge' ? -DECK_DROP_M - 4.4 : -0.06, centre.z); w.add(ground)
    // Barriers along both edges, and fences behind them near the start where the crowd is.
    const barrierPlaces = [...lineAlong(t, 3, -BARRIER_LAT), ...lineAlong(t, 3, BARRIER_LAT)]
    // What stands along the road is drawn only near the car: 40 m behind it and 170 m ahead.
    const near = (prop: Prop, places: Place[], yawOf: (p: Place) => number, scale = 1): void => { windows.push(windowed(prop, places.map((p) => ({ x: p.x, z: p.z, yaw: yawOf(p), scale, arc: p.arc })), w, t.length, 400, 1700, worldMaterials)) }
    near(props.barrier, barrierPlaces, (p) => alongX(p.a))
    const crowd = (list: Place[]): Place[] => list.filter((p) => Math.min(p.arc, t.length - p.arc) < 520)
    const fencePlaces = [...crowd(lineAlong(t, 3, -(BARRIER_LAT + 8))), ...crowd(lineAlong(t, 3, BARRIER_LAT + 8))]
    near(props.fence, fencePlaces, (p) => alongX(p.a))
    // The start: grandstands on the right (their fronts to the road), pit garages on the left, chequered flags either side of the line.
    const start = startArea(t)
    const faceRoad = (p: Place): number => facingZ(p.a - (p.lat > 0 ? 1 : -1) * (Math.PI / 2)) // a model's front towards the road
    inst(props.stand, start.stands.map((p) => ({ x: p.x, z: p.z, yaw: faceRoad(p) + FRONT.stand, scale: 2.2 })))
    inst(props.garage, start.garages.map((p) => ({ x: p.x, z: p.z, yaw: faceRoad(p) + FRONT.garage, scale: 1.8 })))
    inst(props.flag, [-1, 1].map((side) => { const p = pointAt(t, 0, side * (ROAD_HALF + 30)); return { x: p.x * UNIT, z: p.y * UNIT, yaw: 0, scale: 1.6 } }))
    if (pal.theme === 'land') {
      const trees = scatter(t, 70, 11)
      near(props.tree, trees.filter((_, i) => i % 3 !== 0), (p) => p.a, 1.2); near(props.treeSmall, trees.filter((_, i) => i % 3 === 0), (p) => p.a, 1.3)
    } else {
      // Bridge: lamp posts along both edges, piers under the deck, the stalled vehicles.
      const lampPlaces = [...lineAlong(t, 36, -BARRIER_LAT + 4), ...lineAlong(t, 36, BARRIER_LAT - 4)]
      near(props.lamp, lampPlaces, (p) => faceRoad(p) + FRONT.lamp, 1.5)
      const piers = lineAlong(t, 26, 0)
      const pierMesh = new THREE.InstancedMesh(own(new THREE.BoxGeometry(2.4, 5, 2.4)), mat(new THREE.MeshLambertMaterial({ color: 0x8d8d92 })), piers.length)
      const m4 = new THREE.Matrix4()
      piers.forEach((p, i) => pierMesh.setMatrixAt(i, m4.makeTranslation(p.x, -DECK_DROP_M - 2.5, p.z))); pierMesh.frustumCulled = false; w.add(pierMesh)
    }
    const obstacles = obstaclePlaces(t)
    for (const kind of ['danfo', 'okada']) {
      const list = obstacles.filter((o) => o.kind === kind)
      if (!list.length) continue
      const mesh = new THREE.InstancedMesh(own(geometryOf(boxMesh(kind === 'danfo' ? danfoBoxes() : okadaBoxes()))), mat(new THREE.MeshLambertMaterial({ vertexColors: true })), list.length)
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pp = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0)
      list.forEach((o, i) => mesh.setMatrixAt(i, m4.compose(pp.set(o.x, 0, o.z), q.setFromAxisAngle(up, alongX(o.a + (i % 2 ? 0.25 : -0.2))), one)))
      mesh.frustumCulled = false; w.add(mesh)
    }
    // The skyline across the water or the plain: dim towers on a ring far away (one draw, in the fog).
    const rnd = hash(5), towers: { c: [number, number, number]; s: [number, number, number]; hex: number }[] = []
    for (let i = 0; i < 46; i++) {
      const ang = (i / 46) * Math.PI * 2 + rnd() * 0.1, r = 360 + rnd() * 60, h = 14 + rnd() * rnd() * 70, wd = 12 + rnd() * 16
      towers.push({ c: [centre.x + Math.cos(ang) * r, h / 2 - 3, centre.z + Math.sin(ang) * r], s: [wd, h + 6, wd], hex: [0x8fa3b5, 0xa9b6c2, 0x7d8fa1, 0xb7c1c9][i % 4] as number })
    }
    w.add(new THREE.Mesh(own(geometryOf(boxMesh(towers))), mat(new THREE.MeshLambertMaterial({ vertexColors: true }))))
    for (const child of w.children) (child as THREE.Mesh).frustumCulled = false
  }

  // ---- drawing ---------------------------------------------------------------------------------------------------------
  const screen: ({ x: number; y: number } | null)[] = [null, null, null, null]
  let followed: { x: number; y: number; a: number; kmh: number } | null = null
  let last = 0, lastFocus = -1, wasFin = false, photoSince = -1, focusSeen = -2, speedS = 0, camA = 0, introS = 1, fovS = 60, camReady = false
  const posNow = new THREE.Vector3(), lookNow = new THREE.Vector3(), tmp = new THREE.Vector3()
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0)
  const lampColour = new THREE.Color()

  function placeLamps(cars: readonly ViewCar[]): void {
    let n = 0
    cars.forEach((c, seat) => {
      const rig = rigs[seat]; if (!rig || !rig.root.visible) return
      const yaw = facingZ(c.a)
      for (const side of [-1, 1]) {
        const lz = -BODY_UNITS * UNIT * 0.5 + 0.02, lx = side * 0.62
        p3.set(c.x * UNIT + lx * Math.cos(yaw) + lz * Math.sin(yaw), 0.78, c.y * UNIT - lx * Math.sin(yaw) + lz * Math.cos(yaw))
        q4.setFromAxisAngle(up, yaw)
        lamps.setMatrixAt(n, m4.compose(p3, q4, s3))
        lamps.setColorAt(n, lampColour.setHex((c.fl & FLAG_BRAKE) ? 0xff3a2a : 0x5a0c0c))
        n++
      }
    })
    lamps.count = n; lamps.instanceMatrix.needsUpdate = true; if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true
  }

  function updateCar(seat: number, c: ViewCar, dt: number, now: number): void {
    const rig = rigs[seat] as CarRig
    const jumped = rig.seen && Math.hypot(c.x - rig.x, c.y - rig.y) * UNIT > 8
    if (!rig.seen || jumped) { rig.x = c.x; rig.y = c.y; rig.a = c.a; rig.speed = 0; rig.slide = 0; rig.yawRate = 0; rig.lastSpeed = 0; rig.seen = true }
    const m = motionOf({ x: rig.x, y: rig.y, a: rig.a }, c, dt)
    const k = 1 - Math.exp(-dt / 0.09)
    // Reversing: the rules' speed is unsigned here, so the sign comes from the way the car moved against its heading.
    rig.speed += (m.speed - rig.speed) * k; rig.slide += (m.slide - rig.slide) * k; rig.yawRate += (m.yawRate - rig.yawRate) * k
    const accel = dt > 0 ? (rig.speed - rig.lastSpeed) / dt : 0
    rig.lastSpeed = rig.speed
    rig.x = c.x; rig.y = c.y; rig.a = c.a
    const target = steerAngle(rig.yawRate, rig.speed), tilt = lean(rig.speed * rig.yawRate, clamp(accel, -14, 14))
    const kt = 1 - Math.exp(-dt / 0.1)
    rig.steer += (target - rig.steer) * kt; rig.roll += (tilt.roll - rig.roll) * kt; rig.pitch += (tilt.pitch - rig.pitch) * kt
    rig.root.visible = true; rig.shadow.visible = true
    rig.root.position.set(c.x * UNIT, 0, c.y * UNIT); rig.root.rotation.y = facingZ(c.a)
    rig.lean.rotation.set(rig.pitch, 0, rig.roll)
    rig.shadow.position.set(c.x * UNIT, 0.045, c.y * UNIT); rig.shadow.rotation.z = -facingZ(c.a)
    for (const wheel of rig.wheels) {
      wheel.spin = spinStep(wheel.spin, rig.speed, dt, wheel.radius)
      wheel.node.rotation.set(wheel.spin, wheel.front ? -rig.steer : 0, 0)
    }
    // A car just put back on the road blinks.
    rig.root.visible = !(c.fl & FLAG_SPAWN) || Math.floor(now / 90) % 2 === 0
    // Smoke from the rear tyres on a slide or hard braking, dust off the road, a flame on a boost, sparks on a bump.
    const yaw = facingZ(c.a), sinY = Math.sin(yaw), cosY = Math.cos(yaw)
    const rear = (lx: number): [number, number] => [c.x * UNIT + lx * cosY - 1.3 * sinY, c.y * UNIT - lx * sinY - 1.3 * cosY]
    if (!opts.reduced && smoking({ speed: rig.speed, slide: rig.slide, yawRate: rig.yawRate }, (c.fl & FLAG_BRAKE) !== 0)) {
      for (const lx of [-0.8, 0.8]) { const [px, pz] = rear(lx); puffs.emit(px, 0.25, pz, (Math.random() - 0.5) * 0.8, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8, 0.9, 0.9, 2.2, 0xe6e6e6, 0.5) }
    }
    if (!opts.reduced && (c.fl & FLAG_OFF) && Math.abs(rig.speed) > 3 && Math.random() < 0.7) { const [px, pz] = rear((Math.random() - 0.5) * 1.6); puffs.emit(px, 0.2, pz, (Math.random() - 0.5) * 1.2, 0.8, (Math.random() - 0.5) * 1.2, 0.8, 0.8, 1.8, 0xb59a6a, 0.45) }
    const boost = (c.fl & FLAG_BOOST) !== 0
    if (boost) { const [px, pz] = rear(0); puffs.emit(px, 0.5, pz, -sinY * 3, 0.2, -cosY * 3, 0.28, 0.7, 0.9, Math.random() < 0.5 ? 0xffb43a : 0xff7a1a, 0.9) }
    const hit = (c.fl & FLAG_HIT) !== 0
    if (hit && !rig.hit) {
      for (let i = 0; i < 9; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4; puffs.emit(c.x * UNIT, 0.6, c.y * UNIT, Math.cos(a) * v, 1.5 + Math.random() * 2.5, Math.sin(a) * v, 0.45, 0.22, 0.1, 0xffd36a, 1) }
      if (!opts.reduced && seat === focusSeen) shake.kick(clamp(Math.abs(rig.speed) / 60, 0.06, 0.2))
    }
    if (boost && !rig.boost && !opts.reduced && seat === focusSeen) shake.kick(0.05)
    rig.hit = hit; rig.boost = boost
  }

  return {
    setTrack,
    screen,
    draw(f) {
      if (!track) return
      const began = performance.now(), now = f.now
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 60, frameMs = last ? now - last : 0
      last = now; stats.tick(now)
      if (frameMs > 0 && frameMs < 250) { recent.push(frameMs); if (recent.length > MEDIAN_FRAMES) recent.shift(); setRung(nextLevel(rung, ladder.length, recent)) }
      const lobby = f.cars.length === 0
      // With nobody on the grid yet (the lobby), four parked cars stand where the race will start.
      const cars: ViewCar[] = lobby ? [0, 1, 2, 3].map((seat) => { const c = newCar(track as Track, seat); return { x: c.x, y: c.y, a: c.h, v: 0, fl: 0, fin: false } }) : [...f.cars]
      const focus = lobby ? 0 : clamp(f.focus, 0, cars.length - 1)
      focusSeen = focus
      rigs.forEach((rig, seat) => { if (!cars[seat]) { rig.root.visible = false; rig.shadow.visible = false; rig.seen = false } })
      cars.forEach((c, seat) => { if (seat < rigs.length) updateCar(seat, c, dt, now) })
      placeLamps(cars)
      puffs.update(dt, (sizeH * (renderer.getPixelRatio())) / (2 * Math.tan((camera.fov * Math.PI) / 360)))
      // ---- the camera
      const target = cars[focus] as ViewCar, rig = rigs[focus] as CarRig
      const focusArc = lobby ? -130 * 1 : nearestIndex(track, target.x, target.y) * track.step
      for (const win of windows) win.update(focusArc)
      followed = { x: target.x, y: target.y, a: target.a, kmh: Math.round(Math.abs(rig.speed) * 3.6) }
      const aspect = sizeW / Math.max(1, sizeH)
      const tx = target.x * UNIT, tz = target.y * UNIT
      if (!camReady || snapCamera) { camA = target.a; speedS = Math.abs(rig.speed); camReady = true }
      speedS += (Math.abs(rig.speed) - speedS) * (1 - Math.exp(-dt / 0.35))
      camA = lerpAngle(camA, target.a, 1 - Math.exp(-dt / (f.phase === 0 ? 0.01 : 0.17)))
      introS += ((f.phase === 0 ? (f.count > 0 ? 0.35 + f.count * 0.2 : 0) : 0) - introS) * (1 - Math.exp(-dt / 0.6))
      let pose: Pose3 = lobby ? orbitPose(track, now / 1000) : chasePose(tx, tz, camA, speedS, aspect, introS)
      // The photo finish: when the car being followed crosses the line, a low angle by the line for a moment.
      if (!lobby) {
        if (focus !== lastFocus) { lastFocus = focus; wasFin = target.fin }
        else if (target.fin && !wasFin && f.phase === 1 && photoSince === -1) photoSince = now
        if (!target.fin) photoSince = -1
        wasFin = target.fin
        if (photoSince >= 0) {
          const e = now - photoSince, weight = Math.min(easeStep(e / 260), easeStep((PHOTO_MS - e) / 600))
          if (e > PHOTO_MS) photoSince = -2
          else {
            const shot = photoFinishPose(track, tx, tz)
            pose = { pos: pose.pos.map((v, i) => v + ((shot.pos[i] as number) - v) * weight) as Pose3['pos'], look: pose.look.map((v, i) => v + ((shot.look[i] as number) - v) * weight) as Pose3['look'], fov: pose.fov + (shot.fov - pose.fov) * weight }
          }
        }
      }
      if (snapCamera) { fovS = pose.fov; posNow.set(...pose.pos); lookNow.set(...pose.look); snapCamera = false }
      fovS += (pose.fov - fovS) * (1 - Math.exp(-dt / 0.2))
      posNow.set(...pose.pos); lookNow.copy(tmp.set(...pose.look))
      camera.position.copy(posNow).add(shake.offset(dt, shakeOffset))
      camera.fov = fovS
      camera.lookAt(lookNow)
      camera.updateProjectionMatrix(); camera.updateMatrixWorld(true)
      cars.forEach((c, seat) => {
        if (seat >= rigs.length) return
        p3.set(c.x * UNIT, 2.3, c.y * UNIT).project(camera)
        screen[seat] = p3.z > 1 || p3.z < -1 ? null : { x: ((p3.x + 1) / 2) * sizeW, y: ((1 - p3.y) / 2) * sizeH }
      })
      renderer.render(scene, camera)
      stats.cpu(performance.now() - began)
    },
    resize(width, height, insets = NO_INSETS) {
      sizeW = width; sizeH = height
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height)
      const shift = bandShift(width, height, insets)
      camera.setViewOffset(width, height, -shift.x, -shift.y, width, height) // slides the picture so the car and the road ahead centre in the free band
      camera.updateProjectionMatrix()
      snapCamera = true
    },
    stats: () => ({ ...stats.read(renderer), ratio: ladder[rung.level] as number, car: followed }),
    dispose() {
      for (const g of worldGeometries) g.dispose()
      for (const m of worldMaterials) m.dispose()
      for (const rig of rigs) { rig.shadow.geometry.dispose(); (rig.shadow.material as THREE.Material).dispose() }
      puffs.dispose(); lamps.geometry.dispose(); (lamps.material as THREE.Material).dispose(); carMat.dispose()
      renderer.dispose()
    },
  }
}

/** A day sky: a vertical gradient drawn once into a small texture. */
function skyTexture(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 2; c.height = 256
  const g = c.getContext('2d') as CanvasRenderingContext2D
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, '#3f86d6'); grad.addColorStop(0.55, '#9cc8ec'); grad.addColorStop(1, '#cfe3ee')
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256)
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

