import assert from 'node:assert/strict'
import test from 'node:test'
import * as THREE from 'three'
import { FURNITURE } from '../game/content/furniture.ts'
import { doorSlot, footprint } from '../game/home-layout.ts'
import { bumpsOf, stairSpot, stairwellOf } from '../game/home-plan.ts'
import { createKit } from '../scene/kit.ts'
import { createWalkGrid, type WalkGrid, type WalkPoint, type WalkRect } from '../scene/walk-grid.ts'
import { buildHousingDoors, type HousingDoor } from './doors.ts'
import { RECIPES, recipePlan } from './fixtures.ts'
import { edge } from './shell.ts'

const recipe = RECIPES[0]!

function baseGrid(forRecipe: typeof recipe, floor: number): WalkGrid {
  const plan = recipePlan(forRecipe), rail = 0.05, tile = 10 / forRecipe.grid, inset = tile * 0.1
  const block = forRecipe.items.flatMap((item): WalkRect[] => {
    const def = FURNITURE[item.itemId]
    if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat' || (item.floor ?? 0) !== floor) return []
    const size = footprint(def, item.rot)
    return [[edge(item.x, forRecipe.grid) + inset, edge(item.y, forRecipe.grid) + inset, edge(item.x + size.w, forRecipe.grid) - inset, edge(item.y + size.h, forRecipe.grid) - inset]]
  })
  for (const wall of bumpsOf(plan, floor)) block.push([
    edge(wall.x0, forRecipe.grid) - rail, edge(wall.y0, forRecipe.grid) - rail,
    edge(wall.x1, forRecipe.grid) + rail, edge(wall.y1, forRecipe.grid) + rail,
  ])
  return createWalkGrid({
    bounds: [edge(0, forRecipe.grid) + 0.22, edge(0, forRecipe.grid) + 0.22, edge(plan.plot.w, forRecipe.grid) - 0.15, edge(plan.plot.d, forRecipe.grid) - 0.15],
    block, cell: 0.25, radius: Math.min(0.3, tile * 0.22),
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

function crossing(grid: WalkGrid, door: HousingDoor): [WalkPoint, WalkPoint] | null {
  const candidates: [WalkPoint, WalkPoint][] = [
    [{ x: door.x - 0.7, z: door.z }, { x: door.x + 0.7, z: door.z }],
    [{ x: door.x, z: door.z - 0.7 }, { x: door.x, z: door.z + 0.7 }],
  ]
  return candidates.find(([from, to]) => grid.free(from.x, from.z) && grid.free(to.x, to.z) && grid.clearLine(from.x, from.z, to.x, to.z)) ?? null
}

const privateRoom = (label: string) => /bedroom|second room|\bbq\b|bath|toilet/i.test(label)

test('each recipe keeps a connected set of privacy doors and seals redundant gaps', () => {
  const expected = new Map([
    ['lagos-duplex', { rooms: 10, privateRooms: 4, doors: 4, sealed: 4 }],
    ['lagos-two-room-apartment', { rooms: 3, privateRooms: 2, doors: 2, sealed: 1 }],
    ['lagos-two-bedroom-apartment', { rooms: 6, privateRooms: 3, doors: 4, sealed: 3 }],
    ['abuja-mansion', { rooms: 12, privateRooms: 4, doors: 6, sealed: 3 }],
  ])
  for (const recipe of RECIPES) {
    const kit = createKit(), built = buildHousingDoors(kit, recipe), plan = recipePlan(recipe), tile = 10 / recipe.grid
    try {
      const rooms = plan.floors.flatMap((floor, level) => floor.map((room) => ({ ...room, level })))
      const privacyRooms = rooms.filter((room) => privateRoom(room.label))
      const sealed = plan.floors.reduce((count, _, floor) => count + built.solids(floor).length, 0)
      assert.deepEqual({ rooms: rooms.length, privateRooms: privacyRooms.length, doors: built.doors.length, sealed }, expected.get(recipe.id), recipe.id)
      for (const room of privacyRooms) {
        const touching = built.doors.filter((door) => {
          if (door.floor !== room.level) return false
          const x = (door.x + 5) / tile, y = (door.z + 5) / tile, epsilon = 0.01
          return ((Math.abs(x - room.x) < epsilon || Math.abs(x - room.x - room.w) < epsilon) && y >= room.y && y <= room.y + room.h)
            || ((Math.abs(y - room.y) < epsilon || Math.abs(y - room.y - room.h) < epsilon) && x >= room.x && x <= room.x + room.w)
        })
        assert.ok(touching.length > 0, `${recipe.id}/${room.label}: expected a door at every privacy entrance`)
      }
      for (const door of built.doors) {
        const touchingPrivacy = privacyRooms.filter((room) => {
          if (door.floor !== room.level) return false
          const x = (door.x + 5) / tile, y = (door.z + 5) / tile, epsilon = 0.01
          return ((Math.abs(x - room.x) < epsilon || Math.abs(x - room.x - room.w) < epsilon) && y >= room.y && y <= room.y + room.h)
            || ((Math.abs(y - room.y) < epsilon || Math.abs(y - room.y - room.h) < epsilon) && x >= room.x && x <= room.x + room.w)
        })
        assert.ok(touchingPrivacy.length > 0, `${recipe.id}/${door.id}: social-only openings must remain unframed`)
        assert.equal(door.label, touchingPrivacy.map((room) => room.label).join(' / '), `${recipe.id}/${door.id}: interaction label`)
      }
      for (let floor = 0; floor < plan.floors.length; floor++) {
        const hinges = built.group.children[floor]!.children.filter((child) => child instanceof THREE.Group)
        assert.equal(hinges.length, built.doors.filter((door) => door.floor === floor).length, `${recipe.id}/floor ${floor}: doors should use one leaf each`)
        const grid = built.grid(baseGrid(recipe, floor), floor), floorRooms = plan.floors[floor]!
        const incoming = stairwellOf(plan, floor), originAt = incoming ? stairSpot(incoming, 1) : { x: 0.5, y: doorSlot(recipe.grid) + 0.5 }
        const origin = grid.nearest(edge(originAt.x, recipe.grid), edge(originAt.y, recipe.grid))
        assert.ok(origin, `${recipe.id}/floor ${floor}: no furnished entrance`)
        for (const room of floorRooms) {
          let reachable = false
          for (let y = room.y + 0.5; y < room.y + room.h && !reachable; y++) for (let x = room.x + 0.5; x < room.x + room.w && !reachable; x++) {
            const goal = { x: edge(x, recipe.grid), z: edge(y, recipe.grid) }
            if (grid.free(goal.x, goal.z) && arrived(grid, origin!, goal)) reachable = true
          }
          assert.ok(reachable, `${recipe.id}/floor ${floor}/${room.label}: sealed gaps preserve furnished room reachability`)
        }
        const outgoing = plan.stairs.find((flight) => flight.floor === floor)
        if (outgoing) {
          const foot = stairSpot(outgoing, 0)
          assert.ok(arrived(grid, origin!, { x: edge(foot.x, recipe.grid), z: edge(foot.y, recipe.grid) }), `${recipe.id}/floor ${floor}: staircase remains reachable`)
        }
      }
    } finally { built.dispose(); kit.dispose() }
  }
})

test('internal doors close and reopen existing plan routes without replacing the base grid', () => {
  const kit = createKit(), source = JSON.stringify(recipe.items), doors = buildHousingDoors(kit, recipe), base = baseGrid(recipe, 0)
  try {
    assert.ok(doors.doors.length > 0)
    assert.ok(doors.doors.every((door) => door.open))
    const open = doors.grid(base, 0)
    assert.notEqual(open, base, 'sealed redundant openings augment the Home grid')
    assert.equal(doors.grid(base, 0), open, 'unchanged open state reuses the projected grid')
    for (let index = 0; index < base.cells.length; index++) if (base.cells[index]) assert.equal(open.cells[index], 1, `base obstacle ${index} was lost`)
    assert.equal(doors.toggleNearest(doors.doors[0]!.x, doors.doors[0]!.z, 0), false, 'a door cannot close through the avatar')
    assert.equal(doors.doors[0]!.open, true)

    const plan = recipePlan(recipe), parlour = plan.floors[0]![0]!, dining = plan.floors[0]![1]!
    const start = base.nearest(edge(parlour.x + parlour.w / 2, recipe.grid), edge(parlour.y + parlour.h / 2, recipe.grid))!
    const goal = base.nearest(edge(dining.x + dining.w / 2, recipe.grid), edge(dining.y + dining.h / 2, recipe.grid))!
    assert.ok(arrived(base, start, goal), 'the original open plan connects the rooms')

    const candidate = doors.doors.filter((entry) => entry.floor === 0).map((door) => ({ door, through: crossing(open, door) })).find((entry) => entry.through)
    const door = candidate!.door, through = candidate!.through
    assert.ok(through, 'the retained privacy doorway starts passable')
    assert.equal(doors.nearest(5, -2.5, 0), null, 'the parlour/dining plan gap remains an unframed passage')
    assert.equal(open.free(5, -2.5), true)
    assert.equal(open.clearLine(4.3, -2.5, 5.7, -2.5), true)

    const ground = doors.doors.filter((door) => door.floor === 0)
    for (const door of ground) assert.ok(safeToggle(doors, door), `${door.id}: no safe nearby interaction point`)
    assert.ok(ground.every((door) => !door.open))
    const closed = doors.grid(base, 0)
    assert.notEqual(closed, base)
    assert.equal(doors.grid(base, 0), closed, 'unchanged door state reuses the projected grid')
    for (let index = 0; index < base.cells.length; index++) if (base.cells[index]) assert.equal(closed.cells[index], 1, `base obstacle ${index} was lost`)
    assert.equal(closed.clearLine(through![0].x, through![0].z, through![1].x, through![1].z), false, 'the retained privacy door blocks its own opening')
    assert.ok(arrived(closed, start, goal), 'closing a privacy door does not block unrelated social passages')
    const sealed = doors.solids(0).length - ground.length
    assert.ok(sealed > 0)

    for (const door of ground) assert.equal(doors.toggleNearest(door.x, door.z, door.floor), true)
    assert.ok(ground.every((door) => door.open))
    assert.equal(doors.grid(base, 0).clearLine(through![0].x, through![0].z, through![1].x, through![1].z), true)
    assert.ok(arrived(doors.grid(base, 0), start, goal))
    assert.equal(doors.solids(0).length, sealed)
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
