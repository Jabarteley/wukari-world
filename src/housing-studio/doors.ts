import { bumpsOf, stairSpot, stairwellOf, wallsOf, type HousePlan, type PlanRoom, type PlanWall } from '../game/home-plan.ts'
import { FURNITURE } from '../game/content/furniture.ts'
import { doorSlot, footprint } from '../game/home-layout.ts'
import { createBatch, sceneMaterials } from '../scene/build.ts'
import type { Kit } from '../scene/kit.ts'
import { createWalkGrid, type WalkGrid, type WalkRect } from '../scene/walk-grid.ts'
import type { HousingRecipe } from './fixtures.ts'
import { recipePlan } from './fixtures.ts'
import { edge, STOREY } from './shell.ts'

export interface HousingDoor {
  readonly id: string
  readonly label: string
  readonly floor: number
  readonly x: number
  readonly z: number
  readonly width: number
  readonly clear: boolean
  readonly closedBounds: readonly [number, number, number, number]
  readonly openBounds: readonly [number, number, number, number]
  readonly sweepBounds: readonly [number, number, number, number]
  readonly open: boolean
}

interface Boundary { axis: 'x' | 'z'; line: number; start: number; end: number }
interface Opening extends Boundary { rooms: readonly [number, number] }
interface Barrier extends Boundary { floor: number; x: number; z: number; width: number }
interface DoorState extends Boundary {
  floor: number
  id: string
  label: string
  x: number
  z: number
  width: number
  clear: boolean
  closedBounds: WalkRect
  openBounds: WalkRect
  sweepBounds: WalkRect
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

function openings(plan: HousePlan, floor: number): Opening[] {
  const rooms = plan.floors[floor] ?? [], walls = wallsOf(plan, floor), found: Opening[] = []
  for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) {
    const shared = boundary(rooms[a]!, rooms[b]!)
    if (!shared) continue
    const spans = walls.map((wall) => covered(shared, wall)).filter((span): span is [number, number] => Boolean(span && span[1] > span[0])).sort((left, right) => left[0] - right[0])
    let cursor = shared.start
    for (const [start, end] of spans) {
      if (start > cursor + 0.01) found.push({ ...shared, start: cursor, end: start, rooms: [a, b] })
      cursor = Math.max(cursor, end)
    }
    if (cursor < shared.end - 0.01) found.push({ ...shared, start: cursor, end: shared.end, rooms: [a, b] })
  }
  return found.filter((gap) => gap.end - gap.start >= 0.9)
}

const privateRoom = (label: string) => /bedroom|second room|\bbq\b|bath|toilet/i.test(label)
const accessScore = (label: string) => /hall|landing|parlour|living|lounge|dining|^room$/i.test(label) ? 0 : /kitchen/i.test(label) ? 1 : 2

function sourceGrid(recipe: HousingRecipe, plan: HousePlan, floor: number): WalkGrid {
  const tile = 10 / recipe.grid, inset = tile * 0.1, rail = 0.05, block: WalkRect[] = []
  for (const item of recipe.items) {
    const def = FURNITURE[item.itemId]
    if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat' || (item.floor ?? 0) !== floor) continue
    const size = footprint(def, item.rot)
    block.push([edge(item.x, recipe.grid) + inset, edge(item.y, recipe.grid) + inset, edge(item.x + size.w, recipe.grid) - inset, edge(item.y + size.h, recipe.grid) - inset])
  }
  for (const wall of bumpsOf(plan, floor)) block.push([edge(wall.x0, recipe.grid) - rail, edge(wall.y0, recipe.grid) - rail, edge(wall.x1, recipe.grid) + rail, edge(wall.y1, recipe.grid) + rail])
  return createWalkGrid({ bounds: [edge(0, recipe.grid) + 0.22, edge(0, recipe.grid) + 0.22, edge(plan.plot.w, recipe.grid) - 0.15, edge(plan.plot.d, recipe.grid) - 0.15], block, cell: 0.25, radius: Math.min(0.3, tile * 0.22) })
}

/** Seal only entrances whose removal preserves every furnished room and stair route. */
function privacyPlan(recipe: HousingRecipe, plan: HousePlan, floor: number): { doors: Opening[]; sealed: Opening[] } {
  const rooms = plan.floors[floor] ?? [], base = sourceGrid(recipe, plan, floor)
  const incoming = stairwellOf(plan, floor), access = incoming ? stairSpot(incoming, 1) : { x: 0.5, y: doorSlot(recipe.grid) + 0.5 }
  const privacy = openings(plan, floor).filter(gap => gap.rooms.some(room => privateRoom(rooms[room]!.label)))
  const score = (gap: Opening) => {
    const publicRoom = gap.rooms.find(room => !privateRoom(rooms[room]!.label))
    return publicRoom === undefined ? 10 : accessScore(rooms[publicRoom]!.label)
  }
  const distance = (gap: Opening) => gap.axis === 'z'
    ? Math.hypot(gap.line - access.x, (gap.start + gap.end) / 2 - access.y)
    : Math.hypot((gap.start + gap.end) / 2 - access.x, gap.line - access.y)
  // Try the least useful entrances first, retaining short routes from halls where possible.
  const candidates = [...privacy].sort((a, b) => score(b) - score(a) || distance(b) - distance(a))
  const sealed: Opening[] = []
  function reachable(gaps: Opening[]) {
    const blocks = gaps.map(gap => {
      const start = edge(gap.start, recipe.grid), end = edge(gap.end, recipe.grid)
      return blocker({ axis: gap.axis, x: gap.axis === 'z' ? edge(gap.line, recipe.grid) : (start + end) / 2,
        z: gap.axis === 'z' ? (start + end) / 2 : edge(gap.line, recipe.grid), width: end - start }, 0.2)
    })
    const grid = createWalkGrid({ bounds: [...base.bounds], cell: base.cell, radius: 0, block: blocks })
    for (let index = 0; index < base.cells.length; index++) if (base.cells[index]) grid.cells[index] = 1
    const origin = grid.nearest(edge(access.x, recipe.grid), edge(access.y, recipe.grid))
    if (!origin) return false
    const reaches = (x: number, z: number) => {
      if (!grid.free(x, z)) return false
      const end = grid.path(origin.x, origin.z, x, z)?.at(-1)
      return Boolean(end && Math.hypot(end.x - x, end.z - z) < 0.01)
    }
    for (const room of rooms) {
      let found = false
      for (let y = room.y + 0.5; y < room.y + room.h && !found; y++)
        for (let x = room.x + 0.5; x < room.x + room.w && !found; x++) found = reaches(edge(x, recipe.grid), edge(y, recipe.grid))
      if (!found) return false
    }
    const outgoing = plan.stairs.find(flight => flight.floor === floor)
    if (outgoing) {
      const foot = stairSpot(outgoing, 0)
      if (!reaches(edge(foot.x, recipe.grid), edge(foot.y, recipe.grid))) return false
    }
    return true
  }
  for (const gap of candidates) if (reachable([...sealed, gap])) sealed.push(gap)
  return { doors: privacy.filter(gap => !sealed.includes(gap)), sealed }
}

const blocker = (door: Pick<Barrier, 'axis' | 'x' | 'z' | 'width'>, grow = 0): WalkRect => door.axis === 'z'
  ? [door.x - 0.18 - grow, door.z - door.width / 2 - grow, door.x + 0.18 + grow, door.z + door.width / 2 + grow]
  : [door.x - door.width / 2 - grow, door.z - 0.18 - grow, door.x + door.width / 2 + grow, door.z + 0.18 + grow]

const visualWallBounds = (wall: Barrier): WalkRect => wall.axis === 'z'
  ? [wall.x - 0.06, wall.z - wall.width / 2, wall.x + 0.06, wall.z + wall.width / 2]
  : [wall.x - wall.width / 2, wall.z - 0.06, wall.x + wall.width / 2, wall.z + 0.06]

const inside = ([x0, z0, x1, z1]: WalkRect, x: number, z: number) => x >= x0 && x <= x1 && z >= z0 && z <= z1
const growRect = ([x0, z0, x1, z1]: readonly number[], grow: number): WalkRect => [x0! - grow, z0! - grow, x1! + grow, z1! + grow]
const overlaps = (a: readonly number[], b: readonly number[], pad = 0) => a[0]! < b[2]! - pad && a[2]! > b[0]! + pad && a[1]! < b[3]! - pad && a[3]! > b[1]! + pad
const union = (rects: readonly WalkRect[]): WalkRect => [
  Math.min(...rects.map(rect => rect[0])), Math.min(...rects.map(rect => rect[1])),
  Math.max(...rects.map(rect => rect[2])), Math.max(...rects.map(rect => rect[3])),
]

function leafBounds(x: number, z: number, angle: number, width: number, trim = 0): WalkRect {
  const from = Math.min(trim, width / 3), to = Math.max(from, width - 0.04), half = 0.045
  const ax = x + Math.sin(angle) * from, az = z + Math.cos(angle) * from
  const bx = x + Math.sin(angle) * to, bz = z + Math.cos(angle) * to
  return [Math.min(ax, bx) - half, Math.min(az, bz) - half, Math.max(ax, bx) + half, Math.max(az, bz) + half]
}

interface DoorChoice {
  apertureStart: number
  apertureEnd: number
  hingeX: number
  hingeZ: number
  closed: number
  swing: number
  closedBounds: WalkRect
  openBounds: WalkRect
  sweepBounds: WalkRect
  clear: boolean
  collisions: number
}

function chooseDoor(gap: Opening, recipe: HousingRecipe, obstacles: readonly WalkRect[]): DoorChoice {
  const gapStart = edge(gap.start, recipe.grid), gapEnd = edge(gap.end, recipe.grid)
  const width = Math.min(0.9, gapEnd - gapStart), choices: DoorChoice[] = []
  for (const side of ['start', 'end'] as const) {
    const apertureStart = side === 'start' ? gapStart : gapEnd - width, apertureEnd = apertureStart + width
    const hingeAlong = side === 'start' ? apertureStart : apertureEnd
    const hingeX = gap.axis === 'z' ? edge(gap.line, recipe.grid) : hingeAlong
    const hingeZ = gap.axis === 'z' ? hingeAlong : edge(gap.line, recipe.grid)
    const closed = gap.axis === 'z' ? (side === 'start' ? 0 : Math.PI) : (side === 'start' ? Math.PI / 2 : -Math.PI / 2)
    for (const swing of [-Math.PI / 2, Math.PI / 2]) {
      // The hinge is intentionally mounted into its jamb; ignore that first 18 cm while
      // checking the moving panel against the surrounding room.
      const samples = Array.from({ length: 9 }, (_, index) => leafBounds(hingeX, hingeZ, closed + swing * index / 8, width, 0.18))
      const collisions = obstacles.reduce((count, obstacle) => count + (samples.some(rect => overlaps(rect, obstacle, 0.01)) ? 1 : 0), 0)
      const closedBounds = leafBounds(hingeX, hingeZ, closed, width), openBounds = leafBounds(hingeX, hingeZ, closed + swing, width)
      choices.push({ apertureStart, apertureEnd, hingeX, hingeZ, closed, swing, closedBounds, openBounds,
        sweepBounds: union(Array.from({ length: 17 }, (_, index) => leafBounds(hingeX, hingeZ, closed + swing * index / 16, width))), clear: collisions === 0, collisions })
    }
  }
  return choices.sort((a, b) => a.collisions - b.collisions || (a.clear === b.clear ? 0 : a.clear ? -1 : 1))[0]!
}

function barrierOf(gap: Opening, floor: number, recipe: HousingRecipe, start = edge(gap.start, recipe.grid), end = edge(gap.end, recipe.grid)): Barrier {
  return { ...gap, floor, x: gap.axis === 'z' ? edge(gap.line, recipe.grid) : (start + end) / 2,
    z: gap.axis === 'z' ? (start + end) / 2 : edge(gap.line, recipe.grid), width: end - start }
}

function physicalObstacles(recipe: HousingRecipe, plan: HousePlan, floor: number): WalkRect[] {
  const block: WalkRect[] = []
  for (const item of recipe.items) {
    const def = FURNITURE[item.itemId]
    if (!def || def.wall || def.shape === 'rug' || def.shape === 'mat' || (item.floor ?? 0) !== floor) continue
    const size = footprint(def, item.rot)
    block.push(growRect([edge(item.x, recipe.grid), edge(item.y, recipe.grid), edge(item.x + size.w, recipe.grid), edge(item.y + size.h, recipe.grid)], 0.04))
  }
  for (const wall of bumpsOf(plan, floor)) block.push(growRect([edge(wall.x0, recipe.grid), edge(wall.y0, recipe.grid), edge(wall.x1, recipe.grid), edge(wall.y1, recipe.grid)], 0.06))
  return block
}

/** Internal door leaves and frames derived from the door gaps already cut by `wallsOf`. */
export function buildHousingDoors(kit: Kit, recipe: HousingRecipe) {
  const plan = recipePlan(recipe), group = new kit.THREE.Group()
  const floors = plan.floors.map(() => new kit.THREE.Group())
  group.add(...floors)
  const states: DoorState[] = [], sealed: Barrier[] = [], geometries = new Set<import('three').BufferGeometry>()

  for (let floor = 0; floor < plan.floors.length; floor++) {
    const frame = createBatch(kit.THREE), privacy = privacyPlan(recipe, plan, floor), obstacles = physicalObstacles(recipe, plan, floor)
    const drawWall = (wall: Barrier) => {
      const low = 0.85, upper = STOREY - low
      if (wall.axis === 'z') {
        frame.box(wall.x, floor * STOREY + low / 2, wall.z, 0.12, low, wall.width, '#f1eee7')
        frame.box(wall.x, floor * STOREY + low + upper / 2, wall.z, 0.12, upper, wall.width, '#f1eee7', { part: 'lintel' })
      } else {
        frame.box(wall.x, floor * STOREY + low / 2, wall.z, wall.width, low, 0.12, '#f1eee7')
        frame.box(wall.x, floor * STOREY + low + upper / 2, wall.z, wall.width, upper, 0.12, '#f1eee7', { part: 'lintel' })
      }
    }
    for (const gap of privacy.sealed) {
      const wall = barrierOf(gap, floor, recipe)
      sealed.push(wall); drawWall(wall); obstacles.push(blocker(wall, 0.04))
    }
    for (const gap of privacy.doors) {
      const labels = gap.rooms.map((room) => plan.floors[floor]![room]!.label).filter(privateRoom)
      const label = [...new Set(labels)].join(' / ')
      const gapStart = edge(gap.start, recipe.grid), gapEnd = edge(gap.end, recipe.grid), choice = chooseDoor(gap, recipe, obstacles)
      const width = choice.apertureEnd - choice.apertureStart
      const x = gap.axis === 'z' ? edge(gap.line, recipe.grid) : (choice.apertureStart + choice.apertureEnd) / 2
      const z = gap.axis === 'z' ? (choice.apertureStart + choice.apertureEnd) / 2 : edge(gap.line, recipe.grid)
      const id = `door-${floor}-${gap.axis}-${gap.line}-${gap.start}`
      let state: DoorState
      const closedBounds = Object.freeze([...choice.closedBounds]) as HousingDoor['closedBounds']
      const openBounds = Object.freeze([...choice.openBounds]) as HousingDoor['openBounds']
      const sweepBounds = Object.freeze([...choice.sweepBounds]) as HousingDoor['sweepBounds']
      const exposed = Object.freeze({ id, label, floor, x, z, width, clear: choice.clear, closedBounds, openBounds, sweepBounds, get open() { return state.open } })
      state = { ...gap, floor, id, label, x, z, width, clear: choice.clear, closedBounds: [...choice.closedBounds], openBounds: [...choice.openBounds],
        sweepBounds: [...choice.sweepBounds], open: true, hinges: [], public: exposed }
      states.push(state)

      for (const [start, end] of [[gapStart, choice.apertureStart], [choice.apertureEnd, gapEnd]] as const) {
        if (end - start < 0.02) continue
        const wall = barrierOf(gap, floor, recipe, start, end)
        sealed.push(wall); drawWall(wall); obstacles.push(blocker(wall, 0.04))
      }
      obstacles.push(growRect(choice.sweepBounds, 0.04))

      if (gap.axis === 'z') {
        for (const at of [choice.apertureStart, choice.apertureEnd]) frame.box(x, floor * STOREY + 1.15, at, 0.16, 2.3, 0.16, '#665448')
        frame.box(x, floor * STOREY + 2.36, z, 0.18, 0.18, width + 0.22, '#665448')
        frame.box(x, floor * STOREY + 2.835, z, 0.12, 0.77, width, '#f1eee7', { part: 'lintel' })
      } else {
        for (const at of [choice.apertureStart, choice.apertureEnd]) frame.box(at, floor * STOREY + 1.15, z, 0.16, 2.3, 0.16, '#665448')
        frame.box(x, floor * STOREY + 2.36, z, width + 0.22, 0.18, 0.18, '#665448')
        frame.box(x, floor * STOREY + 2.835, z, width, 0.77, 0.12, '#f1eee7', { part: 'lintel' })
      }

      const hinge = new kit.THREE.Group(), panel = createBatch(kit.THREE)
      hinge.userData.doorId = id
      panel.box(0, floor * STOREY + 1.09, width / 2, 0.075, 2.18, width - 0.04, '#805b43')
      panel.box(0.045, floor * STOREY + 1.12, width * 0.72, 0.035, 0.07, 0.07, '#c4ad72')
      const built = panel.build(sceneMaterials(kit))
      for (const mesh of built.meshes) { hinge.add(mesh); geometries.add(mesh.geometry) }
      hinge.position.set(choice.hingeX, 0, choice.hingeZ)
      state.hinges.push({ object: hinge, closed: choice.closed, swing: choice.swing })
      floors[floor]!.add(hinge)
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
    clearanceFailures: states.filter((door) => !door.clear).map((door) => door.id),
    nearest(x: number, z: number, floor: number): HousingDoor | null { return nearestState(x, z, floor)?.public ?? null },
    toggleNearest(x: number, z: number, floor: number): boolean {
      const door = nearestState(x, z, floor)
      if (!door || inside(growRect(door.sweepBounds, 0.32), x, z)) return false
      door.open = !door.open
      apply(door)
      cachedGrid = null
      return true
    },
    visible(floor: number, first: boolean) { floors.forEach((level, index) => { level.visible = index === floor; for (const child of level.children) if (child.userData.part === 'lintel') child.visible = first }) },
    grid(base: WalkGrid, floor: number): WalkGrid {
      const doors = states.filter((door) => door.floor === floor)
      const walls = sealed.filter((wall) => wall.floor === floor)
      if (!walls.length && !doors.length) return base
      const key = doors.map((door) => `${door.id}:${door.open ? 1 : 0}`).join('|')
      if (cachedBase === base && cachedFloor === floor && cachedClosed === key && cachedGrid) return cachedGrid
      cachedBase = base; cachedFloor = floor; cachedClosed = key
      cachedGrid = createWalkGrid({ bounds: [...base.bounds], cell: base.cell, radius: 0,
        block: [...walls.map((item) => blocker(item, 0.2)), ...doors.map((door) => growRect(door.open ? door.openBounds : door.closedBounds, 0.2))] })
      for (let index = 0; index < base.cells.length; index++) if (base.cells[index]) cachedGrid.cells[index] = 1
      return cachedGrid
    },
    solids(floor: number): number[][] {
      return [
        ...sealed.filter((wall) => wall.floor === floor).map((item) => ({ item, height: STOREY })),
        ...states.filter((door) => door.floor === floor).map((door) => ({ bounds: door.open ? door.openBounds : door.closedBounds, height: 2.18 })),
      ].map((entry) => {
        const [x0, z0, x1, z1] = 'bounds' in entry ? entry.bounds : visualWallBounds(entry.item)
        const height = entry.height
        return [x0, floor * STOREY, z0, x1, floor * STOREY + height, z1]
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
