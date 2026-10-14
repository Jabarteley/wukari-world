import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { HOME_RIDGE, HOME_SCALE, HOME_UNIT, HOME_PITCH_X, HOME_PITCH_Z, HOUSES_PER_ESTATE, estateBox, homeGrid } from './estate-homes.ts'
import { ACTOR_HEIGHT, ACTOR_SCALE, AVATAR_HEIGHT, pieceSize } from './actor.ts'
import { buildAvatar, LOOK_OPTIONS } from '../scene/characters.ts'
import { createKit } from '../scene/kit.ts'
import type { PackEstate } from './types.ts'

test('a house of the Neighbours layer is clearly taller than the player\'s piece at its usual size (at least 1.6 times), and its unit scales with the grid', () => {
  assert.ok(HOME_RIDGE >= 1.6 * ACTOR_HEIGHT, `house ${HOME_RIDGE.toFixed(2)} against piece ${ACTOR_HEIGHT.toFixed(2)}`)
  assert.ok(HOME_RIDGE > ACTOR_HEIGHT * pieceSize(100), 'still above the piece at a middle distance (100)')
  assert.equal(HOME_RIDGE, HOME_UNIT.ridge * HOME_SCALE)
  assert.ok(Math.abs(HOME_PITCH_X / (HOME_UNIT.width * HOME_SCALE) - 2.7 / HOME_UNIT.width) < 1e-9, 'the gap between houses keeps the proportion it had')
  assert.ok(HOME_PITCH_Z > HOME_UNIT.depth * HOME_SCALE, 'houses do not touch')
})

test('AVATAR_HEIGHT is no smaller than any avatar actually drawn (every body, with the hair on)', () => {
  const kit = createKit()
  let tallest = 0
  for (const body of LOOK_OPTIONS.body) {
    const avatar = buildAvatar(kit, { body }, { pose: 'stand', seed: 'you' })
    avatar.updateMatrixWorld(true)
    tallest = Math.max(tallest, new THREE.Box3().setFromObject(avatar, true).max.y)
    avatar.userData.dispose()
  }
  assert.ok(tallest > 2 && tallest <= AVATAR_HEIGHT, `tallest ${tallest}`)
})

test('the piece: life size beside the houses up to a middle distance, and still a counter (growing, at least 4 far out) from the whole city', () => {
  for (const distance of [8, 20, 34, 45, 60, 74, 90, 100]) assert.ok(AVATAR_HEIGHT * ACTOR_SCALE * pieceSize(distance) <= HOME_RIDGE, `distance ${distance}`)
  assert.ok(pieceSize(10) >= 0.12 && pieceSize(1) === 0.12)
  assert.equal(pieceSize(62), 1)
  // From 74 out it is what it always was: distance/62, never less than 1.2, 4 at least out at the far end.
  for (const distance of [75, 120, 250, 600]) assert.ok(Math.abs(pieceSize(distance) - Math.min(distance / 62, Math.max(4, distance / 110))) < 1e-9)
  assert.ok(pieceSize(400) >= 4 && pieceSize(900) > pieceSize(400))
  for (let distance = 10; distance < 900; distance += 10) assert.ok(pieceSize(distance + 10) >= pieceSize(distance), `grows with the distance (${distance})`)
})

const estates: PackEstate[] = [
  { x: 10, z: 20, cols: 8, max: 64 }, { x: 0, z: 0, cols: 6 }, { x: 5, z: 5, cols: 4, max: 8 }, { x: -3, z: 9, cols: 1, max: 4 }, { x: 0, z: 0, cols: 12, max: 144 }, { x: 0, z: 0, cols: 2, max: 2 },
]

test('an estate of bigger houses stays inside the ground it always had; fewer are drawn when they no longer fit (never fewer than one)', () => {
  for (const [estate, count] of estates.flatMap((one) => [1, 2, 8, 30, 500].map((n) => [one, n] as const))) {
    const [x0, , x1] = estateBox(estate), [, z0, , z1] = estateBox(estate, count), grid = homeGrid(estate, count), want = Math.min(count, estate.max ?? HOUSES_PER_ESTATE)
    assert.ok(grid.cap >= 1 && grid.cap <= want && grid.cap === Math.min(want, grid.cols * grid.rows), `${JSON.stringify(estate)} (${count} homes): cap ${grid.cap}`)
    assert.ok(grid.cols <= estate.cols)
    for (let i = 0; i < grid.cap; i++) {
      const { x, z } = grid.at(i), halfX = (HOME_UNIT.width * HOME_SCALE) / 2, halfZ = (HOME_UNIT.depth * HOME_SCALE) / 2
      // Ground narrower than one house still shows the one house (or column), centred on it; otherwise the house is wholly inside.
      const overX = Math.max(0, halfX - (x1 - x0) / 2), overZ = Math.max(0, halfZ - (z1 - z0) / 2)
      assert.ok(x - halfX >= x0 - overX - 1e-9 && x + halfX <= x1 + overX + 1e-9 && z - halfZ >= z0 - overZ - 1e-9 && z + halfZ <= z1 + overZ + 1e-9, `${JSON.stringify(estate)} (${count} homes): house ${i} at ${x.toFixed(1)}, ${z.toFixed(1)} is outside the estate's box`)
    }
    // No two houses overlap.
    for (let i = 1; i < grid.cap; i++) { const a = grid.at(i - 1), b = grid.at(i); assert.ok(Math.abs(a.x - b.x) >= HOME_UNIT.width * HOME_SCALE - 1e-9 || Math.abs(a.z - b.z) >= HOME_UNIT.depth * HOME_SCALE - 1e-9) }
  }
})

test('the first Lagos-style estate (8 columns, 64 at most) shows at least four of the 8 homes of a district in its one row, from the corner the first house always had', () => {
  const estate = { x: 0, z: 0, cols: 8, max: 64 }, grid = homeGrid(estate, 8), [x0] = estateBox(estate), [, z0] = estateBox(estate, 8)
  assert.ok(grid.cap >= 4 && grid.cap <= 8, `cap ${grid.cap}`)
  const first = grid.at(0)
  assert.ok(Math.abs(first.x - (x0 + HOME_UNIT.width * HOME_SCALE / 2)) < 1e-9, 'the first house is flush with the west edge')
  assert.ok(Math.abs(first.z - (z0 + (estateBox(estate, 8)[3] - z0) / 2)) < 1e-9, 'a row on ground thinner than a house is centred on it')
  assert.ok(first.x - estate.x < 1 && first.z - estate.z < 1, 'the first house is where it was (within a house of the pack\'s x, z)')
  const last = grid.at(grid.cap - 1)
  assert.ok(grid.centre.x > first.x - 1e-9 && grid.centre.x <= last.x + 1e-9 && grid.centre.z >= first.z - 1e-9 && grid.centre.z <= last.z + 1e-9)
})
