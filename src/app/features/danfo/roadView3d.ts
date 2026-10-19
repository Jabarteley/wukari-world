// The 3D road view of a danfo run (docs/DANFO.md): the game's own procedural vehicles (src/models/vehicles) on a three-lane road with
// pavements, buildings, bus stops with people waiting, potholes and the barrier at the end, seen from behind the bus. It draws the same
// RoadSnapshot as the 2D lanes; three and the vehicle builders load only when this view is chosen (its own lazy chunk).
import type { Group, InstancedMesh, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import type { RoadSnapshot } from './runModel.ts'
import type { LaneLook } from './laneView.ts'
import { BUS_LENGTH, CAR_LENGTH } from '../../../danfo/drive.ts'
import type { TrafficKind } from '../../../danfo/drive.ts'
import type { VehicleModel, VehicleType } from '../../../models/vehicles/index.ts'

export interface RoadView3D {
  draw(snap: RoadSnapshot, look: LaneLook, steer: number): void
  resize(width: number, height: number): void
  dispose(): void
}

const LANE_W = 3.4, WALK = 3, BLOCK = 14, AHEAD = 190, BEHIND = 30
const MODEL: Readonly<Record<TrafficKind, VehicleType>> = { saloon: 'sedan', keke: 'keke', okada: 'okada', danfo: 'danfo', truck: 'tanker' }
const POOL: Readonly<Record<TrafficKind, number>> = { saloon: 8, keke: 4, okada: 4, danfo: 4, truck: 2 }
const SALOONS = ['#2d5b8a', '#b33a3a', '#e6e6e6', '#3a3a3a', '#7a8b99', '#1f6f5c', '#c9a227', '#5b3a8a']
const BUILDINGS = [0xe8d3b0, 0xcfe0e6, 0xf0c9a8, 0xd6d1e8, 0xf2e4a6, 0xb9d8c2, 0xe9b8b0, 0xc9c2b4]
const hash = (n: number): number => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; return (x >>> 0) / 4294967296 }

/** Builds the scene on `canvas`. Throws when WebGL is not available (the caller falls back to the lanes). */
export async function createRoadView3D(canvas: HTMLCanvasElement, options: { keepLeft: boolean; stops: readonly number[]; end: number; potholes: readonly { d: number; lane: number }[]; body: string; stripe: string; sign: string }): Promise<RoadView3D> {
  const THREE = await import('three')
  const { buildVehicle, poseVehicle } = await import('../../../models/vehicles/index.ts')
  const renderer: WebGLRenderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 1.5))
  const scene: Scene = new THREE.Scene()
  scene.background = new THREE.Color('#bfe0ef')
  scene.fog = new THREE.Fog('#bfe0ef', 70, AHEAD)
  const camera: PerspectiveCamera = new THREE.PerspectiveCamera(58, 1, 0.3, AHEAD + 40)
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a5a, 1.7))
  const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(-20, 40, 10); scene.add(sun)
  const owned: { dispose(): void }[] = []
  const keep = <T extends { dispose(): void }>(item: T): T => { owned.push(item); return item }
  const matte = (color: number | string) => keep(new THREE.MeshLambertMaterial({ color }))
  const box = keep(new THREE.BoxGeometry(1, 1, 1))
  const kerbSide = options.keepLeft ? 1 : -1
  const laneX = (lane: number): number => kerbSide * (1 - lane) * LANE_W
  const road = LANE_W * 3

  // The ground, the road and the pavements move with the bus (they look the same everywhere); the lane dashes are an instanced strip
  // moved in whole dash steps, so they stand still on the road.
  const strip: Group = new THREE.Group(); scene.add(strip)
  const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(400, AHEAD + BEHIND + 80)), matte('#cbb68b')); ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.02, (AHEAD - BEHIND) / 2); strip.add(ground)
  const tarmac = new THREE.Mesh(keep(new THREE.PlaneGeometry(road, AHEAD + BEHIND + 80)), matte('#44494f')); tarmac.rotation.x = -Math.PI / 2; tarmac.position.set(0, 0, (AHEAD - BEHIND) / 2); strip.add(tarmac)
  for (const side of [-1, 1]) {
    const walk = new THREE.Mesh(box, matte('#b9b3a8')); walk.scale.set(WALK, 0.18, AHEAD + BEHIND + 80); walk.position.set(side * (road / 2 + WALK / 2), 0.09, (AHEAD - BEHIND) / 2); strip.add(walk)
  }
  const dashes: InstancedMesh = new THREE.InstancedMesh(box, matte('#f4f4f4'), 2 * 30); scene.add(dashes)
  const matrix = new THREE.Matrix4(), quaternion = new THREE.Quaternion(), scale = new THREE.Vector3(), place = new THREE.Vector3(), colour = new THREE.Color()
  const set = (mesh: InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sy: number, sz: number): void => {
    mesh.setMatrixAt(i, matrix.compose(place.set(x, y, z), quaternion, scale.set(sx, sy, sz)))
  }
  // Buildings: a block every 14 m on each side, the same block at the same place whenever it comes into view.
  const blocks: InstancedMesh = new THREE.InstancedMesh(box, keep(new THREE.MeshLambertMaterial()), 2 * Math.ceil((AHEAD + BEHIND) / BLOCK + 2)); scene.add(blocks)
  for (let i = 0; i < blocks.count; i++) blocks.setColorAt(i, colour.set(BUILDINGS[i % BUILDINGS.length]!))

  // The stops: a shelter, a yellow bay on the kerb lane, and people waiting (up to eight each).
  const kerbEdge = kerbSide * (road / 2 + WALK / 2)
  const people: InstancedMesh = new THREE.InstancedMesh(box, matte('#6d4c41'), Math.max(1, options.stops.length * 8)); scene.add(people)
  for (let i = 0; i < people.count; i++) people.setColorAt(i, colour.set([0x7b3f00, 0x1e88e5, 0xd81b60, 0x43a047, 0xfdd835, 0x5d4037][i % 6]!))
  for (let i = 1; i < options.stops.length; i++) {
    const at = options.stops[i]!, shelter = new THREE.Group()
    const roof = new THREE.Mesh(box, matte('#f4c20d')); roof.scale.set(WALK * 0.9, 0.12, 4); roof.position.set(0, 2.6, 0); shelter.add(roof)
    for (const z of [-1.8, 1.8]) { const post = new THREE.Mesh(box, matte('#37474f')); post.scale.set(0.12, 2.6, 0.12); post.position.set(kerbSide * WALK * 0.35, 1.3, z); shelter.add(post) }
    const bay = new THREE.Mesh(box, keep(new THREE.MeshLambertMaterial({ color: '#f4c20d', transparent: true, opacity: 0.35 }))); bay.scale.set(LANE_W * 0.95, 0.02, 36); bay.position.set(laneX(0) - kerbEdge, 0.02, -10); shelter.add(bay)
    shelter.position.set(kerbEdge, 0, at); scene.add(shelter)
  }
  const holes: InstancedMesh = new THREE.InstancedMesh(keep(new THREE.CylinderGeometry(1, 1, 0.03, 10)), matte('#202326'), Math.max(1, options.potholes.length)); scene.add(holes)
  set(holes, 0, 0, -5, 0, 0, 0, 0)
  options.potholes.forEach((hole, i) => set(holes, i, laneX(hole.lane), 0.02, hole.d, 0.7, 1, 1.1))
  for (let k = 0; k < 6; k++) { const bar = new THREE.Mesh(box, matte(k % 2 ? '#ffffff' : '#d32f2f')); bar.scale.set(road / 6, 1, 0.4); bar.position.set(-road / 2 + road / 12 + (road / 6) * k, 0.5, options.end + 1); scene.add(bar) }

  // The vehicles: the bus, and a small pool of each kind of traffic that is moved to the cars near the bus.
  const vehicles: VehicleModel[] = []
  const bus = buildVehicle('danfo', { detail: 'street', color: options.body, stripe: options.stripe, route: options.sign.toUpperCase().slice(0, 14) })
  vehicles.push(bus); scene.add(bus.object3D)
  const pools: Record<TrafficKind, VehicleModel[]> = { saloon: [], keke: [], okada: [], danfo: [], truck: [] }
  for (const kind of Object.keys(POOL) as TrafficKind[]) for (let n = 0; n < POOL[kind]; n++) {
    const model = buildVehicle(MODEL[kind], { detail: 'street', ...(kind === 'saloon' ? { color: SALOONS[n % SALOONS.length]! } : {}) })
    model.object3D.visible = false; vehicles.push(model); pools[kind].push(model); scene.add(model.object3D)
  }

  return {
    draw(snap, look, steer) {
      const d = snap.d
      strip.position.z = d
      for (let i = 0; i < dashes.count; i++) {
        const lineIndex = i % 2, n = Math.floor(i / 2), z = (Math.floor((d - BEHIND) / 8) + n) * 8
        set(dashes, i, (lineIndex ? 0.5 : -0.5) * LANE_W, 0.01, z, 0.18, 0.02, 3.5)
      }
      dashes.instanceMatrix.needsUpdate = true
      const first = Math.floor((d - BEHIND) / BLOCK)
      for (let i = 0; i < blocks.count; i++) {
        const side = i % 2 ? 1 : -1, n = first + Math.floor(i / 2), r = hash(n * 2 + (side > 0 ? 1 : 0)), tall = 4 + r * 12, deep = 6 + r * 6
        set(blocks, i, side * (road / 2 + WALK + 1 + deep / 2), tall / 2, n * BLOCK + 6, deep, tall, BLOCK - 3)
        blocks.setColorAt(i, colour.set(BUILDINGS[Math.floor(r * BUILDINGS.length)]!))
      }
      blocks.instanceMatrix.needsUpdate = true
      if (blocks.instanceColor) blocks.instanceColor.needsUpdate = true
      // People at the stops: as many as are still waiting (none once the stop is served or passed). A pothole stays where it is.
      let p = 0
      for (let i = 1; i < options.stops.length; i++) for (let k = 0; k < 8; k++, p++) {
        const show = k < (look.waiting[i] ?? 0)
        set(people, p, kerbEdge + kerbSide * (0.4 - (k % 2) * 0.8), show ? 0.85 : -5, options.stops[i]! - 1 - k * 0.7, 0.45, 1.7, 0.35)
      }
      people.instanceMatrix.needsUpdate = true
      // Traffic: each kind's pool takes the nearest cars of that kind.
      const used: Record<TrafficKind, number> = { saloon: 0, keke: 0, okada: 0, danfo: 0, truck: 0 }
      for (const car of snap.cars) {
        if (car.d < d - BEHIND || car.d > d + AHEAD) continue
        const model = pools[car.kind][used[car.kind]]
        if (!model) continue
        used[car.kind]++
        model.object3D.visible = true
        model.object3D.position.set(laneX(car.lane), 0, car.d + CAR_LENGTH[car.kind] / 2)
        poseVehicle(model, { distance: car.d })
      }
      for (const kind of Object.keys(pools) as TrafficKind[]) for (let n = used[kind]; n < pools[kind].length; n++) pools[kind][n]!.object3D.visible = false
      const x = laneX(snap.lane)
      bus.object3D.position.set(x, 0, d - BUS_LENGTH / 2)
      bus.object3D.rotation.y = -steer * kerbSide * 0.06 * Math.min(1, snap.speed / 6)
      poseVehicle(bus, { distance: d, brake: look.braking, steering: steer * 0.4, door: snap.boardingMs > 0 ? 1 : 0 })
      // Behind and above the bus, high enough to see the stop bay and the traffic ahead over its roof.
      camera.position.set(x * 0.8, 7.4, d - 16)
      camera.lookAt(x * 0.5, 1.2, d + 24)
      camera.fov = 56 + Math.min(8, snap.speed * 0.35); camera.updateProjectionMatrix()
      renderer.render(scene, camera)
    },
    resize(width, height) {
      renderer.setSize(width, height, false)
      camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix()
    },
    dispose() {
      for (const model of vehicles) model.userData.dispose()
      for (const item of owned) item.dispose()
      for (const mesh of [dashes, blocks, people, holes]) mesh.dispose()
      renderer.dispose()
    },
  }
}
