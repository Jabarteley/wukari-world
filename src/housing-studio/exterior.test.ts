import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createKit } from '../scene/kit.ts'
import { RECIPES } from './fixtures.ts'
import { buildHousingExterior } from './exterior.ts'

test('housing exteriors block the house and boundary while preserving the route inside', () => {
  for (const recipe of RECIPES) {
    const kit = createKit(), scene = buildHousingExterior(kit, recipe), walk = scene.walk!
    assert.deepEqual(scene.group.position.toArray(), [-2.5, 0, -2.5], `${recipe.id}: compound offset`)
    assert.ok(walk.grid && walk.entrance && scene.homeDoor, `${recipe.id}: missing navigation contract`)
    assert.equal(walk.grid!.free(0, 0), false, `${recipe.id}: house footprint should block walking`)
    assert.equal(walk.grid!.free(walk.grid!.bounds[0] - 0.01, walk.entrance!.z), false, `${recipe.id}: boundary should block walking out`)
    assert.equal(walk.grid!.free(walk.entrance!.x, walk.entrance!.z), true, `${recipe.id}: entrance should be open`)
    assert.equal(walk.grid!.free(scene.homeDoor!.x, scene.homeDoor!.z), true, `${recipe.id}: door approach should be open`)
    const path = walk.grid!.path(walk.entrance!.x, walk.entrance!.z, scene.homeDoor!.x, scene.homeDoor!.z)
    const end = path?.at(-1)
    assert.ok(end && Math.hypot(end.x - scene.homeDoor!.x, end.z - scene.homeDoor!.z) < 0.01, `${recipe.id}: entrance cannot reach home door`)
    scene.dispose?.()
    kit.dispose()
  }
})

test('housing exterior door animation and disposal release owned scene geometry', () => {
  const kit = createKit(), scene = buildHousingExterior(kit, RECIPES[0]!)
  const parent = new THREE.Group()
  parent.add(scene.group)
  const disposed = new Set<THREE.BufferGeometry>()
  const owned = new Set<THREE.BufferGeometry>()
  scene.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    owned.add(object.geometry)
    object.geometry.addEventListener('dispose', () => disposed.add(object.geometry))
  })
  let doorFinished = false
  scene.beginDoor?.(() => { doorFinished = true })
  assert.equal(scene.easing, true)
  scene.stepCrowd?.(2)
  assert.equal(doorFinished, true)
  assert.equal(scene.easing, false)

  scene.dispose?.()
  scene.dispose?.()
  assert.equal(scene.group.parent, null)
  assert.equal(scene.group.children.length, 0)
  assert.equal(disposed.size, owned.size)
  kit.dispose()
})
