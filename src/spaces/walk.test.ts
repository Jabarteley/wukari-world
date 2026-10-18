import test from 'node:test'
import assert from 'node:assert/strict'
import { plotOf, doorSlot } from '../game/home-layout.ts'
import { bumpsOf, planOf } from '../game/home-plan.ts'
import { heightAt, moveOf, step, WALKER, type Ground, type Walker } from './world/walk.ts'
import { WORLD } from './layout.ts'

/** The ground of an owned house of this grid, as the 3D screen builds it (src/spaces/world/space.ts walls/blocks). */
function groundOf(grid: number, blocks: [number, number, number, number][] = []): Ground {
  const plot = plotOf(grid, true), plan = planOf(plot), door = doorSlot(grid)
  const outer = (floor: number) => [{ x0: 0, y0: 0, x1: plot.w, y1: 0 }, { x0: 0, y0: plot.d, x1: plot.w, y1: plot.d }, { x0: plot.w, y0: 0, x1: plot.w, y1: plot.d },
    ...(floor === 0 ? [{ x0: 0, y0: 0, x1: 0, y1: door }, { x0: 0, y0: door + 1, x1: 0, y1: plot.d }] : [{ x0: 0, y0: 0, x1: 0, y1: plot.d }])]
  return { walls: (f) => [...bumpsOf(plan, f), ...outer(f)], blocks: (f) => (f === 0 ? blocks : []), stairs: plan.stairs, bounds: [-6, -6, plot.w + 6, plot.d + 6], floors: plot.floors }
}
const at = (x: number, z: number, floor = 0): Walker => ({ x, z, y: floor * WORLD.storey, floor, yaw: 0, pitch: 0 })

test('walk: an outside wall stops the walker, sliding along it', () => {
  const ground = groundOf(8)
  const after = step(ground, at(2, 0.6), 0, -2)
  assert.ok(after.z >= WALKER.radius - 1e-6, `z ${after.z}`)
  const slide = step(ground, at(2, 0.4), 1, -1)
  assert.ok(slide.x > 2.5, 'slides along the wall')
})

test('walk: the front door lets the walker out into the yard; the wall beside it does not', () => {
  const grid = 8, door = doorSlot(grid), ground = groundOf(grid)
  const out = step(ground, at(1, door + 0.5), -3, 0)
  assert.ok(out.x < -1, `through the door: x ${out.x}`)
  const blocked = step(ground, at(1, 1.5), -3, 0)
  assert.ok(blocked.x >= WALKER.radius - 1e-6, `wall: x ${blocked.x}`)
})

test('walk: furniture is solid', () => {
  const ground = groundOf(8, [[3, 3, 5, 4]])
  const after = step(ground, at(2, 3.5), 3, 0)
  assert.ok(after.x < 3, `x ${after.x}`)
})

test('walk: climbing the stairs of a duplex takes the walker to the first floor and back', () => {
  const ground = groundOf(12)
  const flight = ground.stairs[0]!
  assert.equal(flight.floor, 0)
  const zMid = flight.y + flight.h / 2
  // Stand at the foot of the flight and walk up it.
  const footX = flight.dir === 1 ? flight.x + 0.2 : flight.x + flight.w - 0.2
  const headX = flight.dir === 1 ? flight.x + flight.w - 0.1 : flight.x + 0.1
  assert.ok(heightAt(ground, 0, footX, zMid) < 0.5)
  let walker = at(footX, zMid)
  const dir = Math.sign(headX - footX)
  for (let i = 0; i < 40 && walker.floor === 0; i++) walker = step(ground, walker, dir * 0.2, 0)
  assert.equal(walker.floor, 1, `reached floor 1 at y ${walker.y}`)
  assert.ok(walker.y > WORLD.storey * 0.5)
  for (let i = 0; i < 60 && walker.floor === 1; i++) walker = step(ground, walker, -dir * 0.2, 0)
  assert.equal(walker.floor, 0, 'and back down')
})

test('walk: the joystick moves along where the walker faces', () => {
  const forward = moveOf(0, 1, 0, 2, 0.5)
  assert.ok(Math.abs(forward.dx) < 1e-9 && Math.abs(forward.dz + 1) < 1e-9)
  const right = moveOf(0, 0, 1, 2, 0.5)
  assert.ok(Math.abs(right.dx - 1) < 1e-9)
  assert.deepEqual(moveOf(1, 0.01, 0, 2, 1), { dx: 0, dz: 0 })
})
