import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { createKit } from '../scene/kit.ts'
import { RECIPES } from './fixtures.ts'
import { buildHousingExterior } from './exterior.ts'
import { withHousingFrontDoor } from './front-door.ts'

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
  const kit = createKit(), state = { open: false }, scene = withHousingFrontDoor(buildHousingExterior(kit, RECIPES[0]!), state)
  const parent = new THREE.Group()
  parent.add(scene.group)
  const disposed = new Set<THREE.BufferGeometry>()
  const owned = new Set<THREE.BufferGeometry>()
  scene.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    owned.add(object.geometry)
    object.geometry.addEventListener('dispose', () => disposed.add(object.geometry))
  })
  const leaf = scene.group.getObjectByName('home-door-leaf')!
  const position = scene.walk!.avatar.position.clone()
  assert.equal(scene.frontDoor.toggle(), true)
  assert.equal(state.open, true)
  assert.equal(leaf.rotation.y, -Math.PI / 2)
  scene.look!(0, 0)
  assert.equal(leaf.rotation.y, -Math.PI / 2)
  assert.ok(scene.walk!.avatar.position.equals(position), 'manual front door does not move the exterior avatar')
  scene.walk!.avatar.position.set(leaf.position.x, 0, leaf.position.z + 0.2)
  assert.equal(scene.frontDoor.toggle(), false, 'manual front door cannot close through the avatar')
  scene.walk!.avatar.position.copy(position)
  assert.equal(scene.frontDoor.toggle(), true)
  assert.equal(leaf.rotation.y, 0)
  let doorFinished = false
  scene.beginDoor?.(() => { doorFinished = true })
  assert.equal(scene.easing, true)
  assert.equal(scene.frontDoor.busy, true)
  assert.equal(scene.frontDoor.toggle(), false, 'manual control yields during the real entry animation')
  scene.stepCrowd?.(2)
  assert.equal(doorFinished, true)
  assert.equal(scene.easing, false)
  assert.equal(scene.frontDoor.busy, false)
  assert.equal(state.open, false)
  assert.equal(leaf.rotation.y, 0)

  scene.dispose?.()
  scene.dispose?.()
  assert.equal(scene.group.parent, null)
  assert.equal(scene.group.children.length, 0)
  assert.equal(disposed.size, owned.size)
  kit.dispose()
})
