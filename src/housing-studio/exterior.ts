import { doorSlot } from '../game/home-layout.ts'
import { createBatch, sceneMaterials } from '../scene/build.ts'
import type { Kit } from '../scene/kit.ts'
import { createHingedHomeDoor } from '../scene/smart-objects/door.ts'
import { createWalkGrid, type WalkCircle, type WalkRect } from '../scene/walk-grid.ts'
import type { HostRest, HostScene, HostWalk } from '../venue-world.ts'
import { recipePlot, type HousingRecipe } from './fixtures.ts'
import { buildHousingShell, edge, STOREY } from './shell.ts'

const HOUSE_MIN = -5
const DOOR_X = -5.6

interface ExteriorPlan {
  bounds: WalkRect
  house: WalkRect
  entrance: { x: number; y: number; z: number; ry: number }
  doorZ: number
  blocks: (WalkRect | WalkCircle)[]
  solids: number[][]
}

function exteriorPlan(recipe: HousingRecipe): ExteriorPlan {
  const tile = 10 / recipe.grid, plot = recipePlot(recipe)
  const houseX = HOUSE_MIN + plot.w * tile, houseZ = HOUSE_MIN + plot.d * tile
  const minX = -12.5, minZ = -7, maxX = houseX + 2.25, maxZ = houseZ + 4
  const doorZ = edge(doorSlot(recipe.grid) + 0.5, recipe.grid)
  const gateX = minX + 2.4
  const house: WalkRect = [HOUSE_MIN, HOUSE_MIN, houseX, houseZ]
  const trees: WalkCircle[] = [[houseX + 1.15, houseZ - 1.5, 0.42], [minX + 1.2, minZ + 1.25, 0.38]]
  const wallTop = 1.28
  return {
    bounds: [minX + 0.28, minZ + 0.28, maxX - 0.28, maxZ - 0.28],
    house,
    entrance: { x: gateX, y: 0, z: maxZ - 0.65, ry: Math.PI },
    doorZ,
    blocks: [house, ...trees],
    solids: [
      [house[0], 0, house[1], house[2], plot.floors * STOREY + 0.35, house[3]],
      [minX - 0.11, 0, minZ, maxX + 0.11, wallTop, minZ + 0.22],
      [minX, 0, minZ, minX + 0.22, wallTop, maxZ],
      [maxX - 0.22, 0, minZ, maxX, wallTop, maxZ],
      [minX, 0, maxZ - 0.22, gateX - 1.55, wallTop, maxZ],
      [gateX + 1.55, 0, maxZ - 0.22, maxX, wallTop, maxZ],
      ...trees.map(([x, z, radius]) => [x - radius, 0, z - radius, x + radius, 2.6, z + radius]),
    ],
  }
}

/** A walkable compound around the studio shell. The host retains all avatar and navigation authority. */
export function buildHousingExterior(kit: Kit, recipe: HousingRecipe): HostScene {
  const { THREE } = kit, group = new THREE.Group(), avatar = new THREE.Group()
  group.position.set(-2.5, 0, -2.5)
  const shell = buildHousingShell(kit, recipe), plan = exteriorPlan(recipe)
  shell.visible(0, false, true)
  group.add(shell.group, avatar)

  const b = createBatch(THREE), [minX, minZ, maxX, maxZ] = plan.bounds
  const outer = [minX - 0.28, minZ - 0.28, maxX + 0.28, maxZ + 0.28] as const
  const houseX = plan.house[2], houseZ = plan.house[3], gateX = plan.entrance.x
  const mansion = recipe.grid === 14
  b.box((outer[0] + outer[2]) / 2, -0.11, (outer[1] + outer[3]) / 2, outer[2] - outer[0], 0.22, outer[3] - outer[1], '#8f9c78')
  b.box((minX + HOUSE_MIN) / 2, 0.025, (minZ + maxZ) / 2, HOUSE_MIN - minX, 0.05, maxZ - minZ, '#d7d0c2')
  b.box((minX + HOUSE_MIN) / 2, 0.055, (plan.doorZ + maxZ) / 2, 1.45, 0.08, maxZ - plan.doorZ, '#b9ad99')

  const wall = (x: number, z: number, w: number, d: number) => b.box(x, 0.64, z, w, 1.28, d, '#d8d1c4')
  wall((outer[0] + outer[2]) / 2, outer[1], outer[2] - outer[0], 0.22)
  wall(outer[0], (outer[1] + outer[3]) / 2, 0.22, outer[3] - outer[1])
  wall(outer[2], (outer[1] + outer[3]) / 2, 0.22, outer[3] - outer[1])
  wall((outer[0] + gateX - 1.55) / 2, outer[3], gateX - 1.55 - outer[0], 0.22)
  wall((gateX + 1.55 + outer[2]) / 2, outer[3], outer[2] - gateX - 1.55, 0.22)
  for (const x of [gateX - 1.55, gateX + 1.55]) b.box(x, 1.05, outer[3], 0.42, 2.1, 0.42, '#c5bba8')
  for (let i = -2; i <= 2; i++) b.box(gateX + i * 0.48, 0.77, outer[3], 0.035, 1.38, 0.05, '#353b39')

  for (const [x, z, radius] of [[houseX + 1.15, houseZ - 1.5, 0.42], [minX + 1.2, minZ + 1.25, 0.38]] as const) {
    b.cyl(x, 0.58, z, radius * 0.28, 1.16, '#78614b', { seg: 7 })
    b.ico(x, 1.75, z, radius * 1.65, 1.25, radius * 1.65, '#51734d')
  }
  for (let z = minZ + 2.5; z < maxZ - 2; z += 2.2) b.ico(minX + 0.72, 0.62, z, 0.48, 0.62, 0.48, '#607f54')

  const roofY = recipePlot(recipe).floors * STOREY + 0.1
  b.box((HOUSE_MIN + houseX) / 2, roofY, (HOUSE_MIN + houseZ) / 2, houseX - HOUSE_MIN + 0.55, 0.22, houseZ - HOUSE_MIN + 0.55, '#d5d0c7')
  if (mansion) {
    b.box(HOUSE_MIN - 0.48, STOREY + 0.15, plan.doorZ - 1.3, 1.15, 0.22, 4.5, '#3b4140')
    b.box(HOUSE_MIN - 0.92, STOREY / 2, plan.doorZ - 2.95, 0.18, STOREY, 0.18, '#725442')
  } else {
    b.box(HOUSE_MIN - 0.48, 2.65, plan.doorZ, 1.15, 0.18, 2.05, '#3b4140')
  }
  for (const z of [plan.doorZ - 0.72, plan.doorZ + 0.72]) b.box(HOUSE_MIN - 0.16, 1.45, z, 0.18, 2.9, 0.12, '#725442')

  const built = b.build(sceneMaterials(kit))
  group.add(...built.meshes)
  const hinge = createHingedHomeDoor(kit, { x: HOUSE_MIN, z: plan.doorZ, width: Math.min(10 / recipe.grid * 0.86, 1.5), height: 2.3 })
  group.add(hinge.object)
  const grid = createWalkGrid({ bounds: plan.bounds, block: plan.blocks, cell: 0.25, radius: 0.32, entrance: [plan.entrance.x, plan.entrance.z, plan.entrance.ry] })
  const rest = (): HostRest => ({ spot: null, ...plan.entrance, pose: 'stand', busy: false, leaving: false, fixed: false, approach: null, steps: [] })
  const walk: HostWalk = {
    grid, entrance: plan.entrance, open: true, scale: 10 / recipe.grid * 0.72,
    centre: [(minX + maxX) / 2, 1, (minZ + maxZ) / 2], avatar,
    drive() {}, rest, spots: () => [], things: () => [], people: () => [], solids: plan.solids,
    move(x, y, z, ry) { avatar.position.set(x, y, z); avatar.rotation.y = ry },
    pose() { return false }, gait() { return false }, heightAt() { return 0 }, near() { return false }, goal() { return false },
  }
  let disposed = false
  return {
    group, walk, ground: '#8f9c78', background: '#c7d8da', sky: ['#d8e2df', '#8fb2c5'],
    camera: { landscape: [24, 18, 25], portrait: [19, 21, 27], start: 1.1 },
    homeDoor: { x: DOOR_X, y: 0.03, z: plan.doorZ, ry: Math.PI / 2, direction: 'inside' },
    tags: () => [{ id: 'home-door', kind: 'home-door', name: 'Go inside', text: 'Go inside', marker: 'tag', position: { x: DOOR_X, y: 1.55, z: plan.doorZ } }],
    beginDoor(done) { hinge.begin(done, 1.4) },
    get easing() { return hinge.easing },
    stepCrowd(dt) { return hinge.step(dt) },
    settleCrowd() { hinge.settle() },
    dispose() {
      if (disposed) return
      disposed = true
      hinge.dispose()
      shell.dispose()
      for (const mesh of built.meshes) mesh.geometry.dispose()
      group.clear()
      group.removeFromParent()
    },
  }
}
