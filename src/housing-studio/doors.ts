import { wallsOf, type HousePlan, type PlanRoom, type PlanWall } from '../game/home-plan.ts'
import { createBatch, sceneMaterials } from '../scene/build.ts'
import type { Kit } from '../scene/kit.ts'
import { createWalkGrid, type WalkGrid, type WalkRect } from '../scene/walk-grid.ts'
import type { HousingRecipe } from './fixtures.ts'
import { recipePlan } from './fixtures.ts'
import { edge, STOREY } from './shell.ts'

export interface HousingDoor {
  readonly id: string
  readonly floor: number
  readonly x: number
  readonly z: number
  readonly width: number
  readonly open: boolean
}

interface Boundary { axis: 'x' | 'z'; line: number; start: number; end: number }
interface DoorState extends Boundary {
  floor: number
  id: string
  x: number
  z: number
  width: number
  open: boolean
  hinges: { object: import('three').Group; closed: number; swing: number }[]
  public: HousingDoor
}

function boundary(a: PlanRoom, b: PlanRoom): Boundary | null {
  const z0 = Math.max(a.y, b.y), z1 = Math.min(a.y + a.h, b.y + b.h)
  if (z1 > z0 && (a.x + a.w === b.x || b.x + b.w === a.x)) return { axis: 'z', line: a.x + a.w === b.x ? b.x : a.x, start: z0, end: z1 }
  const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w)
  if (x1 > x0 && (a.y + a.h === b.y || b.y + b.h === a.y)) return { axis: 'x', line: a.y + a.h === b.y ? b.y : a.y, start: x0, end: x1 }
  return null
}

function covered(boundary: Boundary, wall: PlanWall): [number, number] | null {
  if (boundary.axis === 'z' && wall.x0 === boundary.line && wall.x1 === boundary.line) return [Math.max(boundary.start, Math.min(wall.y0, wall.y1)), Math.min(boundary.end, Math.max(wall.y0, wall.y1))]
  if (boundary.axis === 'x' && wall.y0 === boundary.line && wall.y1 === boundary.line) return [Math.max(boundary.start, Math.min(wall.x0, wall.x1)), Math.min(boundary.end, Math.max(wall.x0, wall.x1))]
  return null
}

function openings(plan: HousePlan, floor: number): Boundary[] {
  const rooms = plan.floors[floor] ?? [], walls = wallsOf(plan, floor), found: Boundary[] = []
  for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) {
    const shared = boundary(rooms[a]!, rooms[b]!)
    if (!shared) continue
    const spans = walls.map((wall) => covered(shared, wall)).filter((span): span is [number, number] => Boolean(span && span[1] > span[0])).sort((left, right) => left[0] - right[0])
    let cursor = shared.start
    for (const [start, end] of spans) {
      if (start > cursor + 0.01) found.push({ ...shared, start: cursor, end: start })
      cursor = Math.max(cursor, end)
    }
    if (cursor < shared.end - 0.01) found.push({ ...shared, start: cursor, end: shared.end })
  }
  return found.filter((gap) => gap.end - gap.start >= 0.9)
}

const blocker = (door: Pick<DoorState, 'axis' | 'x' | 'z' | 'width'>, grow = 0): WalkRect => door.axis === 'z'
  ? [door.x - 0.18 - grow, door.z - door.width / 2 - grow, door.x + 0.18 + grow, door.z + door.width / 2 + grow]
  : [door.x - door.width / 2 - grow, door.z - 0.18 - grow, door.x + door.width / 2 + grow, door.z + 0.18 + grow]

const inside = ([x0, z0, x1, z1]: WalkRect, x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1

/** Internal door leaves and frames derived from the door gaps already cut by `wallsOf`. */
export function buildHousingDoors(kit: Kit, recipe: HousingRecipe) {
  const plan = recipePlan(recipe), tile = 10 / recipe.grid, group = new kit.THREE.Group()
  const floors = plan.floors.map(() => new kit.THREE.Group())
  group.add(...floors)
  const states: DoorState[] = [], geometries = new Set<import('three').BufferGeometry>()

  for (let floor = 0; floor < plan.floors.length; floor++) {
    const frame = createBatch(kit.THREE)
    for (const gap of openings(plan, floor)) {
      const start = edge(gap.start, recipe.grid), end = edge(gap.end, recipe.grid), width = end - start
      const x = gap.axis === 'z' ? edge(gap.line, recipe.grid) : (start + end) / 2
      const z = gap.axis === 'z' ? (start + end) / 2 : edge(gap.line, recipe.grid)
      const id = `door-${floor}-${gap.axis}-${gap.line}-${gap.start}`
      let state: DoorState
      const exposed = Object.freeze({ id, floor, x, z, width, get open() { return state.open } })
      state = { ...gap, floor, id, x, z, width, open: true, hinges: [], public: exposed }
      states.push(state)

      if (gap.axis === 'z') {
        for (const at of [start, end]) frame.box(x, floor * STOREY + 1.15, at, 0.16, 2.3, 0.16, '#665448')
        frame.box(x, floor * STOREY + 2.36, z, 0.18, 0.18, width + 0.22, '#665448')
        frame.box(x, floor * STOREY + 2.835, z, 0.12, 0.77, width, '#f1eee7', { part: 'lintel' })
      } else {
        for (const at of [start, end]) frame.box(at, floor * STOREY + 1.15, z, 0.16, 2.3, 0.16, '#665448')
        frame.box(x, floor * STOREY + 2.36, z, width + 0.22, 0.18, 0.18, '#665448')
        frame.box(x, floor * STOREY + 2.835, z, width, 0.77, 0.12, '#f1eee7', { part: 'lintel' })
      }

      const leaves = width >= tile * 1.7 ? 2 : 1, leafWidth = width / leaves
      for (let leaf = 0; leaf < leaves; leaf++) {
        const fromEnd = leaf === 1
        const hinge = new kit.THREE.Group(), panel = createBatch(kit.THREE)
        panel.box(0, floor * STOREY + 1.09, leafWidth / 2, 0.075, 2.18, leafWidth - 0.04, '#805b43')
        panel.box(0.045, floor * STOREY + 1.12, leafWidth * 0.72, 0.035, 0.07, 0.07, '#c4ad72')
        const built = panel.build(sceneMaterials(kit))
        for (const mesh of built.meshes) { hinge.add(mesh); geometries.add(mesh.geometry) }
        const along = fromEnd ? end : start
        hinge.position.set(gap.axis === 'z' ? x : along, 0, gap.axis === 'z' ? along : z)
        const closed = gap.axis === 'z' ? (fromEnd ? Math.PI : 0) : (fromEnd ? -Math.PI / 2 : Math.PI / 2)
        const swing = fromEnd ? Math.PI / 2 : -Math.PI / 2
        state.hinges.push({ object: hinge, closed, swing })
        floors[floor]!.add(hinge)
      }
    }
    const built = frame.build(sceneMaterials(kit))
    for (const mesh of built.meshes) { floors[floor]!.add(mesh); geometries.add(mesh.geometry) }
  }

  const apply = (door: DoorState) => { for (const hinge of door.hinges) hinge.object.rotation.y = hinge.closed + (door.open ? hinge.swing : 0) }
  states.forEach(apply)
  let cachedBase: WalkGrid | null = null, cachedFloor = -1, cachedClosed = '', cachedGrid: WalkGrid | null = null, disposed = false

  const nearestState = (x: number, z: number, floor: number) => {
    let nearest: DoorState | null = null, distance = 2.000001
    for (const door of states) {
      const next = Math.hypot(door.x - x, door.z - z)
      if (door.floor === floor && next < distance) { nearest = door; distance = next }
    }
    return nearest
  }

  return {
    group,
    doors: states.map((door) => door.public),
    nearest(x: number, z: number, floor: number): HousingDoor | null { return nearestState(x, z, floor)?.public ?? null },
    toggleNearest(x: number, z: number, floor: number): boolean {
      const door = nearestState(x, z, floor)
      if (!door || door.open && inside(blocker(door, 0.32), x, z)) return false
      door.open = !door.open
      apply(door)
      cachedClosed = ''
      return true
    },
    visible(floor: number, first: boolean) { floors.forEach((level, index) => { level.visible = index === floor; for (const child of level.children) if (child.userData.part === 'lintel') child.visible = first }) },
    grid(base: WalkGrid, floor: number): WalkGrid {
      const closed = states.filter((door) => door.floor === floor && !door.open)
      if (!closed.length) return base
      const key = closed.map((door) => door.id).join('|')
      if (cachedBase === base && cachedFloor === floor && cachedClosed === key && cachedGrid) return cachedGrid
      const occupied: WalkRect[] = []
      const [minX, minZ] = base.bounds
      for (let row = 0; row < base.rows; row++) for (let col = 0; col < base.cols; col++) {
        if (!base.cells[row * base.cols + col]) continue
        const x = minX + (col + 0.5) * base.cell, z = minZ + (row + 0.5) * base.cell, half = base.cell * 0.1
        occupied.push([x - half, z - half, x + half, z + half])
      }
      cachedBase = base; cachedFloor = floor; cachedClosed = key
      cachedGrid = createWalkGrid({ bounds: [...base.bounds], cell: base.cell, radius: 0, block: [...occupied, ...closed.map((door) => blocker(door, 0.2))] })
      return cachedGrid
    },
    solids(floor: number): number[][] {
      return states.filter((door) => door.floor === floor && !door.open).map((door) => {
        const [x0, z0, x1, z1] = blocker(door)
        return [x0, floor * STOREY, z0, x1, floor * STOREY + 2.25, z1]
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      geometries.forEach((geometry) => geometry.dispose())
      group.clear()
      group.removeFromParent()
    },
  }
}
