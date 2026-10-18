import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { startPhysics, PHYSICS } from './world/physics.ts'

/** A box mesh of size (w, h, d) whose centre is at (x, y, z). */
function boxAt(w: number, h: number, d: number, x: number, y: number, z: number): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d))
  mesh.position.set(x, y, z)
  return mesh
}
/** A room: a 10 × 10 m floor at y = 0, a wall along x = 5, and a 0.2 m kerb at z = 3. */
function room(): THREE.Group {
  const group = new THREE.Group()
  group.add(boxAt(10, 0.2, 10, 0, -0.1, 0), boxAt(0.2, 3, 10, 5, 1.5, 0), boxAt(10, 0.2, 0.5, 0, 0.1, 3.25))
  return group
}
const run = (physics: Awaited<ReturnType<typeof startPhysics>>, seconds: number, wish = { x: 0, z: 0 }) => {
  let at = { x: 0, y: 0, z: 0, grounded: false }
  const eye = new THREE.Vector3(), look = new THREE.Vector3(0, 0, -1)
  for (let i = 0; i < seconds * 60; i++) { at = physics.walk({ x: wish.x / 60, z: wish.z / 60 }, 1 / 60, false); physics.step(1 / 60, eye.set(at.x, at.y + 1.6, at.z), look) }
  return at
}

test('physics: the walker stands on the floor, is stopped by a wall and steps up a kerb', async () => {
  const physics = await startPhysics()
  physics.addStatic(room())
  physics.place({ x: 0, y: 1, z: 0 })
  const standing = run(physics, 1)
  assert.ok(Math.abs(standing.y) < 0.05, `on the floor: y ${standing.y}`)
  assert.equal(standing.grounded, true)
  const atWall = run(physics, 4, { x: 2, z: 0 })
  assert.ok(atWall.x < 5 - 0.1 - PHYSICS.radius + 0.05 && atWall.x > 4, `stopped by the wall: x ${atWall.x}`)
  physics.place({ x: 0, y: 0, z: 0 })
  const overKerb = run(physics, 3, { x: 0, z: 2 })
  assert.ok(overKerb.z > 3.6, `over the kerb: z ${overKerb.z}`)
  physics.dispose()
})

test('physics: a loose model falls, rests on the floor and can be picked up and thrown; a fixed one stays', async () => {
  const physics = await startPhysics()
  physics.addStatic(room())
  const crate = new THREE.Group(), post = new THREE.Group()
  crate.add(boxAt(0.5, 0.5, 0.5, 0, 0.25, 0))
  crate.position.set(1, 2, -2)
  post.add(boxAt(0.3, 2, 0.3, 0, 1, 0))
  post.position.set(-2, 0, -2)
  physics.setModels([{ key: 'post', object: post }], [{ key: 'crate', object: crate }])
  physics.place({ x: 1, y: 0, z: 0 })
  run(physics, 2)
  assert.ok(Math.abs(crate.position.y) < 0.05, `the crate rests on the floor: y ${crate.position.y}`)
  assert.ok(Math.abs(crate.position.x - 1) < 0.1)
  const eye = new THREE.Vector3(1, 1.6, 0), look = new THREE.Vector3(0, -0.5, -1).normalize()
  assert.equal(physics.grab(eye, look), 'crate')
  for (let i = 0; i < 30; i++) physics.step(1 / 60, eye, look)
  assert.ok(crate.position.y > 0.5, `held up: y ${crate.position.y}`)
  physics.throwHeld(new THREE.Vector3(0, 0, -1))
  assert.equal(physics.held(), null)
  for (let i = 0; i < 90; i++) physics.step(1 / 60, eye, look)
  assert.ok(crate.position.z < -2, `thrown forward: z ${crate.position.z}`)
  assert.deepEqual(post.position.toArray(), [-2, 0, -2], 'a fixed model never moves')
  // Nothing in reach behind the walker.
  assert.equal(physics.grab(eye, new THREE.Vector3(0, 0, 1)), null)
  physics.dispose()
})
