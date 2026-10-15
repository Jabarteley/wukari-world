import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { bumpsOf } from '../game/home-plan.ts'
import { createKit } from '../scene/kit.ts'
import { createWalkGrid, type WalkGrid, type WalkPoint, type WalkRect } from '../scene/walk-grid.ts'
import { buildHousingDoors, type HousingDoor } from './doors.ts'
import { RECIPES, recipePlan } from './fixtures.ts'
import { edge } from './shell.ts'

const recipe = RECIPES[0]!

function baseGrid(floor: number): WalkGrid {
  const plan = recipePlan(recipe), rail = 0.05
  const block = bumpsOf(plan, floor).map((wall): WalkRect => [
    edge(wall.x0, recipe.grid) - rail, edge(wall.y0, recipe.grid) - rail,
    edge(wall.x1, recipe.grid) + rail, edge(wall.y1, recipe.grid) + rail,
  ])
  return createWalkGrid({
    bounds: [edge(0, recipe.grid) + 0.22, edge(0, recipe.grid) + 0.22, edge(plan.plot.w, recipe.grid) - 0.15, edge(plan.plot.d, recipe.grid) - 0.15],
    block, cell: 0.25, radius: 0.22,
  })
}

function arrived(grid: WalkGrid, start: WalkPoint, goal: WalkPoint): boolean {
  const end = grid.path(start.x, start.z, goal.x, goal.z)?.at(-1)
  return Boolean(end && Math.hypot(end.x - goal.x, end.z - goal.z) < 0.01)
}

function safeToggle(doors: ReturnType<typeof buildHousingDoors>, door: HousingDoor): boolean {
  for (let step = 0; step < 24; step++) {
    const angle = step / 24 * Math.PI * 2, x = door.x + Math.cos(angle) * 1.85, z = door.z + Math.sin(angle) * 1.85
    if (doors.nearest(x, z, door.floor)?.id === door.id && doors.toggleNearest(x, z, door.floor)) return true
  }
  return false
}

test('internal doors close and reopen existing plan routes without replacing the base grid', () => {
  const kit = createKit(), source = JSON.stringify(recipe.items), doors = buildHousingDoors(kit, recipe), base = baseGrid(0)
  try {
    assert.ok(doors.doors.length > 0)
    assert.ok(doors.doors.every((door) => door.open))
    assert.equal(doors.grid(base, 0), base, 'all doors begin open, preserving the Home grid identity')
    assert.equal(doors.toggleNearest(doors.doors[0]!.x, doors.doors[0]!.z, 0), false, 'a door cannot close through the avatar')
    assert.equal(doors.doors[0]!.open, true)

    const plan = recipePlan(recipe), parlour = plan.floors[0]![0]!, dining = plan.floors[0]![1]!
    const start = base.nearest(edge(parlour.x + parlour.w / 2, recipe.grid), edge(parlour.y + parlour.h / 2, recipe.grid))!
    const goal = base.nearest(edge(dining.x + dining.w / 2, recipe.grid), edge(dining.y + dining.h / 2, recipe.grid))!
    assert.ok(arrived(base, start, goal), 'the original open plan connects the rooms')

    const ground = doors.doors.filter((door) => door.floor === 0)
    for (const door of ground) assert.ok(safeToggle(doors, door), `${door.id}: no safe nearby interaction point`)
    assert.ok(ground.every((door) => !door.open))
    const closed = doors.grid(base, 0)
    assert.notEqual(closed, base)
    assert.equal(doors.grid(base, 0), closed, 'unchanged door state reuses the projected grid')
    for (let index = 0; index < base.cells.length; index++) if (base.cells[index]) assert.equal(closed.cells[index], 1, `base obstacle ${index} was lost`)
    assert.equal(arrived(closed, start, goal), false, 'closed doors prevent pathfinding between rooms')
    assert.equal(doors.solids(0).length, ground.length)

    for (const door of ground) assert.equal(doors.toggleNearest(door.x, door.z, door.floor), true)
    assert.ok(ground.every((door) => door.open))
    assert.equal(doors.grid(base, 0), base, 'reopening restores the exact base grid')
    assert.ok(arrived(base, start, goal))
    assert.equal(doors.solids(0).length, 0)
    assert.equal(JSON.stringify(recipe.items), source)
  } finally {
    doors.dispose()
    kit.dispose()
  }
})

test('internal door visibility follows the current floor and disposal releases geometry', () => {
  const kit = createKit(), doors = buildHousingDoors(kit, recipe), parent = new THREE.Group()
  parent.add(doors.group)
  assert.equal(doors.group.children.length, recipePlan(recipe).floors.length)
  doors.visible(0, false)
  assert.deepEqual(doors.group.children.map((floor) => floor.visible), [true, false])
  doors.visible(1, true)
  assert.deepEqual(doors.group.children.map((floor) => floor.visible), [false, true])

  const geometries = new Set<THREE.BufferGeometry>(), disposed = new Set<THREE.BufferGeometry>()
  doors.group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    geometries.add(object.geometry)
    object.geometry.addEventListener('dispose', () => disposed.add(object.geometry))
  })
  doors.dispose()
  doors.dispose()
  assert.equal(doors.group.parent, null)
  assert.equal(doors.group.children.length, 0)
  assert.equal(disposed.size, geometries.size)
  kit.dispose()
})
