import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanHouseSpec, EXAMPLE_SPEC, specSpawn } from './house-spec.ts'

test('the worked example is a valid house and keeps every part', () => {
  const checked = cleanHouseSpec(EXAMPLE_SPEC)
  assert.equal(checked.ok, true)
  if (!checked.ok) return
  assert.deepEqual(checked.notes, [])
  assert.equal(checked.spec.rooms.length, 6)
  assert.equal(checked.spec.doors.length, 5)
  assert.equal(checked.spec.windows.length, 5)
  assert.equal(checked.spec.stairs.length, 1)
  assert.equal(checked.spec.roof.shape, 'gable')
  assert.deepEqual(specSpawn(checked.spec), { x: 3, z: -4, yaw: Math.PI }, 'beyond the fence')
})

test('a description is clamped, fixed where it can be, and refused only when it cannot be a house', () => {
  assert.equal(cleanHouseSpec(null).ok, false)
  assert.equal(cleanHouseSpec({ v: 2 }).ok, false)
  assert.equal(cleanHouseSpec({ v: 1, storeys: 1 }).ok, false)
  const fixed = cleanHouseSpec({ v: 1, storeys: 9, width: 100, depth: 1, walls: { color: 'red' }, roof: { shape: 'dome' }, rooms: [{ name: '<b>Hall</b>', x: 0, z: 0, w: 99, d: 99 }, { name: 'Ghost', x: 50, z: 50, w: 2, d: 2 }], doors: [], windows: [{ wall: 'roof' }] })
  assert.equal(fixed.ok, true)
  if (!fixed.ok) return
  assert.deepEqual([fixed.spec.storeys, fixed.spec.width, fixed.spec.depth], [3, 30, 3])
  assert.equal(fixed.spec.walls.color, '#efe6d6')
  assert.equal(fixed.spec.roof.shape, 'flat')
  assert.ok(!/[<>]/.test(fixed.spec.rooms[0]!.name), 'no markup in a room name')
  assert.equal(fixed.spec.rooms[0]?.w, 30)
  assert.equal(fixed.spec.windows.length, 0, 'a window on no known wall is dropped')
  assert.equal(fixed.spec.doors[0]?.main, true, 'a front door is added')
  assert.ok(fixed.notes.some((n) => /front wall/.test(n)))
  assert.ok(fixed.notes.some((n) => /stairs/.test(n)))
})
