import assert from 'node:assert/strict'
import test from 'node:test'
import { HOUSE_STYLE, STYLE_FIELDS } from '../game/content/world.ts'
import { FURNITURE } from '../game/content/furniture.ts'
import { cellsOf, checkPlacement, doorSlot, fitInto, footprint } from '../game/home-layout.ts'
import { bumpsOf, planRule, stairSpot, stairwellOf } from '../game/home-plan.ts'
import { createWalkGrid, type WalkGrid, type WalkPoint, type WalkRect } from '../scene/walk-grid.ts'
import type { PlacedItem } from '../types/life.ts'
import { RECIPES, recipePlan, recipePlot, type HousingRecipe } from './fixtures.ts'

const floorOf = (item: PlacedItem): number => item.floor ?? 0

function walkGrids(recipe: HousingRecipe): WalkGrid[] {
  const plot = recipePlot(recipe), plan = recipePlan(recipe), inset = 0.1, rail = 0.05
  const solids = recipe.items.flatMap((item) => {
    const def = FURNITURE[item.itemId]
    if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat') return []
    const size = footprint(def, item.rot)
    return [{ floor: floorOf(item), rect: [item.x + inset, item.y + inset, item.x + size.w - inset, item.y + size.h - inset] as WalkRect }]
  })
  return plan.floors.map((_, floor) => {
    const block = solids.filter((solid) => solid.floor === floor).map((solid) => solid.rect)
    for (const wall of bumpsOf(plan, floor)) block.push([wall.x0 - rail, wall.y0 - rail, wall.x1 + rail, wall.y1 + rail])
    return createWalkGrid({ bounds: [0.22, 0.22, plot.w - 0.15, plot.d - 0.15], block, cell: 0.25, radius: 0.22 })
  })
}

const reached = (grid: WalkGrid, start: WalkPoint, goal: WalkPoint): boolean => {
  const exact = grid.free(goal.x, goal.z) ? goal : grid.nearest(goal.x, goal.z)
  if (!exact) return false
  const path = grid.path(start.x, start.z, exact.x, exact.z)
  const end = path?.at(-1)
  return Boolean(end && Math.hypot(end.x - exact.x, end.z - exact.z) < 0.01)
}

test('housing recipes use valid styles, catalogue furniture and placement rules', () => {
  assert.deepEqual(RECIPES.map(({ id, grid }) => [id, grid]), [
    ['lagos-duplex', 12],
    ['lagos-two-room-apartment', 8],
    ['lagos-two-bedroom-apartment', 10],
    ['abuja-mansion', 14],
  ])
  assert.equal(new Set(RECIPES.map(({ id }) => id)).size, RECIPES.length)

  for (const recipe of RECIPES) {
    for (const field of STYLE_FIELDS) assert.ok(HOUSE_STYLE[field][recipe.style[field]], `${recipe.id}: invalid ${field}`)
    const plot = recipePlot(recipe), rule = planRule(recipePlan(recipe)), placed: PlacedItem[] = []
    for (const item of recipe.items) {
      const def = FURNITURE[item.itemId]
      assert.ok(def, `${recipe.id}: missing catalogue item ${item.itemId}`)
      assert.equal(rule(floorOf(item), cellsOf(def, item.x, item.y, item.rot)), null, `${recipe.id}/${item.id}: plan rule`)
      assert.equal(checkPlacement(plot, placed, def, item.x, item.y, item.rot, null, floorOf(item)), null, `${recipe.id}/${item.id}: placement`)
      placed.push(item)
    }
  }
})

test('legacy items without floor remain on the ground floor', () => {
  for (const recipe of RECIPES) {
    const ground = recipe.items.filter((item) => floorOf(item) === 0)
    assert.ok(ground.length > 0, `${recipe.id}: no ground-floor furnishings`)
    assert.ok(ground.every((item) => item.floor === undefined), `${recipe.id}: ground floor should use the legacy omitted floor`)
    const fitted = fitInto(recipePlot(recipe), recipe.items)
    assert.deepEqual(fitted.stored, [], `${recipe.id}: valid fixture should not move to storage`)
    assert.deepEqual(fitted.items, recipe.items, `${recipe.id}: legacy ground-floor default should round-trip`)
  }
})

test('furnished recipes keep every room and staircase reachable', () => {
  for (const recipe of RECIPES) {
    const plan = recipePlan(recipe), grids = walkGrids(recipe)
    for (let floor = 0; floor < plan.floors.length; floor++) {
      const incoming = stairwellOf(plan, floor)
      const originAt = incoming ? stairSpot(incoming, 1) : { x: 0.5, y: doorSlot(recipe.grid) + 0.5 }
      const origin = grids[floor]!.nearest(originAt.x, originAt.y)
      assert.ok(origin, `${recipe.id}/floor ${floor}: no walkable entrance`)

      for (const room of plan.floors[floor]!) {
        let accessible = false
        for (let y = room.y + 0.5; y < room.y + room.h && !accessible; y += 1) {
          for (let x = room.x + 0.5; x < room.x + room.w && !accessible; x += 1) {
            if (grids[floor]!.free(x, y) && reached(grids[floor]!, origin!, { x, z: y })) accessible = true
          }
        }
        assert.ok(accessible, `${recipe.id}/floor ${floor}: ${room.label} has no route`)
      }

      const outgoing = plan.stairs.find((flight) => flight.floor === floor)
      if (outgoing) {
        const foot = stairSpot(outgoing, 0)
        assert.ok(reached(grids[floor]!, origin!, { x: foot.x, z: foot.y }), `${recipe.id}/floor ${floor}: staircase foot has no route`)
      }
    }
  }
})
