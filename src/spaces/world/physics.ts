/**
 * OWNER: spaces
 * PHYSICS IN A SPACE (docs/SPACES-3D.md, phase 3): Rapier (Apache-2.0), loaded only when the 3D space screen opens.
 *
 *  - The house is solid as drawn: every wall, floor, step, rail, window and roof mesh becomes a fixed collider of the same shape.
 *  - Furniture is a solid box over its footprint; a player's fixed model is solid in the shape of its convex hull, or exactly as
 *    drawn when its root is named `allworld_solid` (a place made from a photo: docs/WORLDS.md, phase 8), in the shape of its
 *    `allworld_collider` node when it has one.
 *  - A model marked loose is a dynamic body (its convex hull, wood-like density): it falls, rolls, stacks, is pushed by the walker
 *    and can be picked up and thrown.
 *  - The walker is a capsule moved by Rapier's character controller: it slides along walls, steps up stairs and kerbs, follows
 *    slopes and falls under gravity. A jump is a push upwards.
 *
 * The physics never decides anything the server keeps: where models stand is the saved layout; a loose model starts there each
 * time the space opens.
 */
import type RAPIER_NS from '@dimforge/rapier3d-compat'
import { THREE } from './look.ts'

type Rapier = typeof RAPIER_NS
type Object3D = InstanceType<typeof THREE.Object3D>
type Vector3 = InstanceType<typeof THREE.Vector3>

export const PHYSICS = Object.freeze({ gravity: 9.81, radius: 0.28, halfHeight: 0.55, step: 0.32, jump: 4.6, density: 350, throwSpeed: 7, reach: 2.4, hold: 1.3, hullPoints: 1500 })

let loading: Promise<Rapier> | null = null
/** Rapier, initialised once (its WebAssembly is inside the module: one lazy download). */
export function loadRapier(): Promise<Rapier> {
  loading ??= import('@dimforge/rapier3d-compat').then(async (module) => { const R = module.default; await R.init(); return R })
  return loading
}

/** Every vertex of `root`'s meshes, in the frame of `frame` (or the world), at most `max` of them, evenly picked. */
function pointsOf(root: Object3D, frame: Object3D | null, max: number, scale = 1): Float32Array {
  const out: number[] = []
  const inverse = frame ? new THREE.Matrix4().copy(frame.matrixWorld).invert() : new THREE.Matrix4()
  const m = new THREE.Matrix4(), v = new THREE.Vector3()
  let total = 0
  root.traverse((n) => { const mesh = n as InstanceType<typeof THREE.Mesh>; if (mesh.isMesh) total += mesh.geometry.attributes['position']?.count ?? 0 })
  const stride = Math.max(1, Math.ceil(total / max))
  root.updateWorldMatrix(true, true)
  root.traverse((n) => {
    const mesh = n as InstanceType<typeof THREE.Mesh>
    const position = mesh.isMesh ? mesh.geometry.attributes['position'] : undefined
    if (!position) return
    m.multiplyMatrices(inverse, mesh.matrixWorld)
    for (let i = 0; i < position.count; i += stride) {
      v.fromBufferAttribute(position, i).applyMatrix4(m).multiplyScalar(scale)
      out.push(v.x, v.y, v.z)
    }
  })
  return new Float32Array(out)
}

/** Every triangle of `root`'s meshes, in the frame of `frame` at `scale`: a solid model's exact shape (src/spaces/photo/glb-write.ts). */
function trianglesOf(root: Object3D, frame: Object3D, scale: number): { vertices: Float32Array; index: Uint32Array } {
  const vertices: number[] = [], index: number[] = []
  const inverse = new THREE.Matrix4().copy(frame.matrixWorld).invert(), m = new THREE.Matrix4(), v = new THREE.Vector3()
  root.updateWorldMatrix(true, true)
  root.traverse((n) => {
    const mesh = n as InstanceType<typeof THREE.Mesh>
    const position = mesh.isMesh ? mesh.geometry.attributes['position'] : undefined
    if (!position) return
    const base = vertices.length / 3
    m.multiplyMatrices(inverse, mesh.matrixWorld)
    for (let i = 0; i < position.count; i++) { v.fromBufferAttribute(position, i).applyMatrix4(m).multiplyScalar(scale); vertices.push(v.x, v.y, v.z) }
    const order = mesh.geometry.index
    if (order) for (let i = 0; i < order.count; i++) index.push(base + order.getX(i))
    else for (let i = 0; i < position.count; i++) index.push(base + i)
  })
  return { vertices: new Float32Array(vertices), index: new Uint32Array(index) }
}

export interface Loose { key: string; object: Object3D }
export interface Physics {
  /** Make these meshes (the house) solid, exactly as drawn. */
  addStatic(root: Object3D, skip?: (node: Object3D) => boolean): void
  /** Furniture boxes: [x0, z0, x1, z1] on a floor at height `y`, `height` metres tall. */
  addBoxes(boxes: readonly { rect: readonly [number, number, number, number]; y: number; height: number }[]): void
  /** Players' models: fixed ones solid in their hull (moved only by a script), loose ones free. Replaces the models set before. */
  setModels(fixed: readonly Loose[], loose: readonly Loose[]): void
  /** A script moved or turned a model: a fixed one goes there smoothly, a loose one is put there. */
  moveModel(key: string, object: Object3D): void
  /** A script pushed a loose model (metres a second, added to how it moves). */
  pushModel(key: string, velocity: { x: number; y: number; z: number }): void
  /** A script hid or showed a model: a hidden one is not solid. */
  showModel(key: string, on: boolean): void
  /** Move the walker by a wish (metres this frame, horizontal) and gravity; answers where its feet are. */
  walk(wish: { x: number; z: number }, dt: number, jump: boolean): { x: number; y: number; z: number; grounded: boolean }
  /** Put the walker's feet here (start, or after a fall out of the world). */
  place(feet: { x: number; y: number; z: number }): void
  /** Pick up the nearest loose model in front of the eye, or drop the one held. Answers the key held now. */
  grab(eye: Vector3, look: Vector3): string | null
  /** Throw the held model along `look`. */
  throwHeld(look: Vector3): void
  held(): string | null
  /** Advance the world and move loose models' drawings to their bodies. */
  step(dt: number, eye: Vector3, look: Vector3): void
  dispose(): void
}

export async function startPhysics(): Promise<Physics> {
  const R = await loadRapier()
  const world = new R.World({ x: 0, y: -PHYSICS.gravity, z: 0 })
  world.timestep = 1 / 60
  const statics: InstanceType<Rapier['RigidBody']>[] = []
  const fixedBody = (): InstanceType<Rapier['RigidBody']> => { const body = world.createRigidBody(R.RigidBodyDesc.fixed()); statics.push(body); return body }

  // The walker: a capsule on a kinematic body, moved by the character controller.
  const capsuleBody = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(0, PHYSICS.halfHeight + PHYSICS.radius, 0))
  const capsule = world.createCollider(R.ColliderDesc.capsule(PHYSICS.halfHeight, PHYSICS.radius).setFriction(0.2), capsuleBody)
  const controller = world.createCharacterController(0.02)
  controller.enableAutostep(PHYSICS.step, 0.15, false)
  controller.enableSnapToGround(0.3)
  controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180)
  controller.setMinSlopeSlideAngle((60 * Math.PI) / 180)
  controller.setApplyImpulsesToDynamicBodies(true)
  controller.setCharacterMass(70)
  let vy = 0, grounded = false

  let modelBodies: InstanceType<Rapier['RigidBody']>[] = []
  const loose = new Map<string, { body: InstanceType<Rapier['RigidBody']>; object: Object3D }>()
  const fixedModels = new Map<string, InstanceType<Rapier['RigidBody']>>()
  let holding: string | null = null
  let acc = 0

  return {
    addStatic(root, skip) {
      root.updateWorldMatrix(true, true)
      const body = fixedBody()
      const v = new THREE.Vector3()
      root.traverse((node) => {
        if (skip?.(node)) return
        const mesh = node as InstanceType<typeof THREE.Mesh>
        if (!mesh.isMesh || !mesh.geometry.attributes['position']) return
        const geometry = mesh.geometry, position = geometry.attributes['position']!
        const vertices = new Float32Array(position.count * 3)
        for (let i = 0; i < position.count; i++) { v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld); vertices.set([v.x, v.y, v.z], i * 3) }
        const index = geometry.index ? new Uint32Array(geometry.index.array) : Uint32Array.from({ length: position.count }, (_, i) => i)
        world.createCollider(R.ColliderDesc.trimesh(vertices, index).setFriction(0.8), body)
      })
    },
    addBoxes(boxes) {
      const body = fixedBody()
      for (const { rect: [x0, z0, x1, z1], y, height } of boxes) {
        world.createCollider(R.ColliderDesc.cuboid((x1 - x0) / 2, height / 2, (z1 - z0) / 2).setTranslation((x0 + x1) / 2, y + height / 2, (z0 + z1) / 2).setFriction(0.7), body)
      }
    },
    setModels(fixed, list) {
      for (const body of modelBodies) world.removeRigidBody(body)
      modelBodies = []
      loose.clear()
      fixedModels.clear()
      holding = null
      for (const { key, object } of fixed) {
        object.updateWorldMatrix(true, true)
        // In the model's own frame, on a body that only a script moves (kinematic: it pushes what it meets, nothing pushes it).
        // A model that says it is solid (a place made from a photo) is solid as drawn: its hull would fill the whole scene. The walker
        // must not catch on the seams between its triangles.
        const solid = object.userData['solid'] === true ? trianglesOf(object.getObjectByName('allworld_collider') ?? object, object, object.scale.x) : null
        const hull = solid ? (solid.index.length ? R.ColliderDesc.trimesh(solid.vertices, solid.index, R.TriMeshFlags.FIX_INTERNAL_EDGES) : null) : R.ColliderDesc.convexHull(pointsOf(object, object, PHYSICS.hullPoints, object.scale.x))
        if (!hull) continue
        const q = object.quaternion
        const body = world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(object.position.x, object.position.y, object.position.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }))
        world.createCollider(hull.setFriction(0.7), body)
        modelBodies.push(body)
        fixedModels.set(key, body)
      }
      for (const { key, object } of list) {
        object.updateWorldMatrix(true, true)
        // The hull in the model's own frame, at its scale: the body carries its position and turn.
        const scale = object.scale.x
        const hull = R.ColliderDesc.convexHull(pointsOf(object, object, PHYSICS.hullPoints, scale))
        if (!hull) continue
        const q = object.quaternion
        const body = world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(object.position.x, object.position.y + 0.01, object.position.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }).setLinearDamping(0.05).setAngularDamping(0.2).setCcdEnabled(true))
        world.createCollider(hull.setDensity(PHYSICS.density).setFriction(0.6).setRestitution(0.25), body)
        modelBodies.push(body)
        loose.set(key, { body, object })
      }
    },
    walk(wish, dt, jump) {
      if (jump && grounded) vy = PHYSICS.jump
      vy = Math.max(-30, vy - PHYSICS.gravity * dt)
      controller.computeColliderMovement(capsule, { x: wish.x, y: vy * dt, z: wish.z }, R.QueryFilterFlags.EXCLUDE_SENSORS, undefined, (c) => {
        const parent = c.parent()
        return !(holding && parent && loose.get(holding)?.body.handle === parent.handle)
      })
      const move = controller.computedMovement()
      grounded = controller.computedGrounded()
      if (grounded && vy < 0) vy = 0
      const at = capsuleBody.translation()
      const next = { x: at.x + move.x, y: at.y + move.y, z: at.z + move.z }
      capsuleBody.setNextKinematicTranslation(next)
      return { x: next.x, y: next.y - PHYSICS.halfHeight - PHYSICS.radius, z: next.z, grounded }
    },
    place(feet) { capsuleBody.setTranslation({ x: feet.x, y: feet.y + PHYSICS.halfHeight + PHYSICS.radius + 0.02, z: feet.z }, true); vy = 0 },
    grab(eye, look) {
      if (holding) {
        loose.get(holding)?.body.setBodyType(R.RigidBodyType.Dynamic, true)
        holding = null
        return null
      }
      let best: { key: string; score: number } | null = null
      for (const [key, { body }] of loose) {
        const p = body.translation()
        const to = new THREE.Vector3(p.x - eye.x, p.y - eye.y, p.z - eye.z)
        const dist = to.length()
        if (dist > PHYSICS.reach + 1) continue
        const facing = to.normalize().dot(look)
        if (facing < 0.3) continue
        const score = dist - facing
        if (!best || score < best.score) best = { key, score }
      }
      if (!best) return null
      loose.get(best.key)!.body.setBodyType(R.RigidBodyType.KinematicPositionBased, true)
      holding = best.key
      return holding
    },
    throwHeld(look) {
      const held = holding ? loose.get(holding) : undefined
      if (!held) return
      held.body.setBodyType(R.RigidBodyType.Dynamic, true)
      const mass = held.body.mass()
      held.body.applyImpulse({ x: look.x * PHYSICS.throwSpeed * mass, y: (look.y + 0.25) * PHYSICS.throwSpeed * mass, z: look.z * PHYSICS.throwSpeed * mass }, true)
      holding = null
    },
    held: () => holding,
    moveModel(key, object) {
      const q = object.quaternion, p = object.position
      const fixedBody = fixedModels.get(key)
      if (fixedBody) { fixedBody.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z }); fixedBody.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w }); return }
      const free = loose.get(key)
      if (!free || holding === key) return
      free.body.setTranslation({ x: p.x, y: p.y, z: p.z }, true)
      free.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true)
      free.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    },
    pushModel(key, v) {
      const free = loose.get(key)
      if (!free || holding === key) return
      const now = free.body.linvel()
      free.body.setLinvel({ x: now.x + v.x, y: now.y + v.y, z: now.z + v.z }, true)
    },
    showModel(key, on) {
      const body = fixedModels.get(key) ?? loose.get(key)?.body
      if (body) body.setEnabled(on)
    },
    step(dt, eye, look) {
      const held = holding ? loose.get(holding) : undefined
      if (held) held.body.setNextKinematicTranslation({ x: eye.x + look.x * PHYSICS.hold, y: eye.y + look.y * PHYSICS.hold - 0.25, z: eye.z + look.z * PHYSICS.hold })
      // Fixed steps, at most four a frame, so a slow phone slows the world down rather than letting it explode.
      acc = Math.min(acc + dt, world.timestep * 4)
      while (acc >= world.timestep) { world.step(); acc -= world.timestep }
      for (const { body, object } of loose.values()) {
        const p = body.translation(), q = body.rotation()
        object.position.set(p.x, p.y, p.z)
        object.quaternion.set(q.x, q.y, q.z, q.w)
        // Fallen out of the world (thrown over the fence): back where it started is not known here, so it rests on the ground.
        if (p.y < -20) { body.setTranslation({ x: p.x, y: 2, z: p.z }, true); body.setLinvel({ x: 0, y: 0, z: 0 }, true) }
      }
    },
    dispose() { world.free() },
  }
}
