/**
 * OWNER: spaces
 * A SPACE BUILT IN 3D (docs/SPACES-3D.md, phase 2): the house the game keeps (src/game/home-plan.ts: rooms, inner walls with their
 * doorways, stairs; src/game/home-layout.ts: the front door and the window), its furniture, and the models players placed, in the
 * realistic look (./look.ts). 1 tile = 1 metre, one storey = 3 metres (src/spaces/layout.ts WORLD).
 *
 * Furniture with a near model in the housing library is drawn with that model (the files under src/housing-studio/assets, named here
 * as assets of this module so nothing is imported from the housing studio); the rest is built from a few shapes with physically
 * based materials. Nothing here changes the furniture: it is a view of what the game already keeps.
 */
import { FURNITURE } from '../../game/content/furniture.ts'
import { HOUSE_STYLE } from '../../game/content/world.ts'
import { footprint, doorSlot, windowSlot, plotOf } from '../../game/home-layout.ts'
import { bumpsOf, finishAt, planOf, slabOf, wallsOf, type HousePlan, type PlanWall } from '../../game/home-plan.ts'
import { WORLD } from '../layout.ts'
import { THREE, disposeTree, parseModel } from './look.ts'
import type { PlacedModel, WorldItem } from '../../types/spaces.ts'

const T = WORLD.tile, H = WORLD.storey, WALL = 2.8, THICK = 0.12, DOOR_TOP = 2.1, SILL = 0.9

/** The housing library's near models, by furniture shape. */
const NEAR: Record<string, string> = {
  sofa: new URL('../../housing-studio/assets/two-seat-sofa-near.glb', import.meta.url).href,
  bed: new URL('../../housing-studio/assets/single-bed-near.glb', import.meta.url).href,
  wardrobe: new URL('../../housing-studio/assets/wardrobe-near.glb', import.meta.url).href,
  chair: new URL('../../housing-studio/assets/dining-chair-near.glb', import.meta.url).href,
  desk: new URL('../../housing-studio/assets/dining-table-near.glb', import.meta.url).href,
  tv: new URL('../../housing-studio/assets/flat-panel-television-near.glb', import.meta.url).href,
  plant: new URL('../../housing-studio/assets/broadleaf-planter-near.glb', import.meta.url).href,
  basin: new URL('../../housing-studio/assets/knee-clearance-public-washbasin-near.glb', import.meta.url).href,
  fridge: new URL('../../housing-studio/assets/display-fridge-near.glb', import.meta.url).href,
  cooker: new URL('../../housing-studio/assets/four-burner-stove-near.glb', import.meta.url).href,
  floorlamp: new URL('../../housing-studio/assets/floor-lamp-near.glb', import.meta.url).href,
}

// ---- Materials: a few physically based surfaces with textures drawn once on a canvas (no image files to fetch). ----
function canvasTexture(size: number, draw: (g: CanvasRenderingContext2D, size: number) => void, repeat: number): InstanceType<typeof THREE.CanvasTexture> {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  draw(canvas.getContext('2d')!, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}
let seed = 7
const rand = (): number => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
function planks(g: CanvasRenderingContext2D, s: number): void {
  const rows = 8
  for (let r = 0; r < rows; r++) {
    let x = -rand() * s
    while (x < s) {
      const len = s * (0.35 + rand() * 0.4), tone = 0.82 + rand() * 0.22
      g.fillStyle = `rgb(${Math.round(150 * tone)},${Math.round(104 * tone)},${Math.round(66 * tone)})`
      g.fillRect(x, (r * s) / rows, len, s / rows)
      g.strokeStyle = 'rgba(40,25,10,0.35)'; g.lineWidth = 2; g.strokeRect(x, (r * s) / rows, len, s / rows)
      for (let i = 0; i < 6; i++) { g.strokeStyle = `rgba(70,45,20,${0.06 + rand() * 0.08})`; g.beginPath(); const y = (r + rand()) * s / rows; g.moveTo(x, y); g.bezierCurveTo(x + len / 3, y + 3, x + len * 2 / 3, y - 3, x + len, y); g.stroke() }
      x += len
    }
  }
}
function tiles(colours: readonly [string, string]) {
  return (g: CanvasRenderingContext2D, s: number): void => {
    const n = 4
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? colours[0] : colours[1]; g.fillRect((i * s) / n, (j * s) / n, s / n, s / n) }
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 3
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo((i * s) / n, 0); g.lineTo((i * s) / n, s); g.stroke(); g.beginPath(); g.moveTo(0, (i * s) / n); g.lineTo(s, (i * s) / n); g.stroke() }
  }
}
function plaster(g: CanvasRenderingContext2D, s: number): void {
  g.fillStyle = '#fff'; g.fillRect(0, 0, s, s)
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.035})`; g.fillRect(rand() * s, rand() * s, 2 + rand() * 4, 2 + rand() * 4) }
}
function grass(g: CanvasRenderingContext2D, s: number): void {
  g.fillStyle = '#5d7d3c'; g.fillRect(0, 0, s, s)
  for (let i = 0; i < 9000; i++) { const t = rand(); g.fillStyle = `rgba(${60 + t * 60},${100 + t * 60},${30 + t * 25},0.5)`; g.fillRect(rand() * s, rand() * s, 1.5, 3 + rand() * 4) }
}

export interface BuiltSpace {
  root: InstanceType<typeof THREE.Group>
  plan: HousePlan
  /** Walls and rails the walker bumps into on each floor, in metres. */
  walls(floor: number): PlanWall[]
  /** Furniture and fixed models a walker cannot pass through, on each floor: [x0, z0, x1, z1] in metres. */
  blocks(floor: number): [number, number, number, number][]
  /** Show only what is at or below `floor`; ceilings only when `inside` (first person); the roof only from the yard. */
  show(floor: number, inside: boolean, outdoors?: boolean): void
  /** Load placed models (again, after an edit); resolves when they are drawn. */
  setModels(list: readonly PlacedModel[], bytesOf: (hash: string) => Promise<ArrayBuffer | null>): Promise<void>
  /** The object drawn for a placement, to move or pick it. */
  modelObject(key: string): InstanceType<typeof THREE.Object3D> | undefined
  /** Every placement's object, for picking. */
  modelObjects(): InstanceType<typeof THREE.Object3D>[]
  /** The furniture as solid boxes, measured from what is drawn: [x0, z0, x1, z1], the floor height and how tall. */
  furnitureBoxes(): { rect: [number, number, number, number]; y: number; height: number }[]
  /** Whether a mesh is part of the house itself (walls, floors, stairs, windows, roof, yard), for physics. */
  isShell(node: InstanceType<typeof THREE.Object3D>): boolean
  /** Ground and floors, for placing a model where the player taps. */
  surfaces(): InstanceType<typeof THREE.Object3D>[]
  dispose(): void
}

export interface SpaceInput { grid: number; owned: boolean; style: Record<string, number> | null; items: readonly WorldItem[] }

export function buildSpace(input: SpaceInput, maxAnisotropy = 8): BuiltSpace {
  seed = 7
  const plot = plotOf(input.grid, input.owned)
  const plan = planOf(plot)
  const root = new THREE.Group()
  const style = input.style ?? {}
  const pick = (field: keyof typeof HOUSE_STYLE, fallback: string): string => (HOUSE_STYLE[field][style[field] ?? 0] as { hex?: string } | undefined)?.hex ?? fallback
  const wallHex = pick('wall', '#f3ead6'), doorHex = pick('door', '#6b4a2b'), glassHex = pick('windows', '#bfe0f0')

  const plasterMap = canvasTexture(256, plaster, 1)
  const owned: { dispose(): void }[] = [plasterMap]
  const material = (params: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0]) => { const m = new THREE.MeshStandardMaterial(params); owned.push(m); return m }
  const outerWall = material({ color: wallHex, roughness: 0.92, map: plasterMap })
  const innerWall = material({ color: '#f4f1ea', roughness: 0.9, map: plasterMap })
  const ceilingMat = material({ color: '#fbfaf6', roughness: 0.95 })
  const woodMap = canvasTexture(512, planks, 1)
  woodMap.anisotropy = maxAnisotropy
  owned.push(woodMap)
  const woodFloor = material({ map: woodMap, roughness: 0.55, metalness: 0 })
  const slabMat = material({ color: '#cfc8bb', roughness: 0.95 })
  const glass = new THREE.MeshPhysicalMaterial({ color: glassHex, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.22, reflectivity: 0.6, envMapIntensity: 1.4 })
  owned.push(glass)
  const frameMat = material({ color: '#ffffff', roughness: 0.4 })
  const doorMat = material({ color: doorHex, roughness: 0.55 })
  const metalMat = material({ color: '#c9c3b5', roughness: 0.3, metalness: 0.9 })
  const tileMats = new Map<string, InstanceType<typeof THREE.MeshStandardMaterial>>()
  const tileMat = (colours: readonly [string, string]) => {
    const key = colours.join()
    let found = tileMats.get(key)
    if (!found) { const map = canvasTexture(256, tiles(colours), 1); owned.push(map); found = material({ map, roughness: 0.25 }); tileMats.set(key, found) }
    return found
  }

  const geometries: { dispose(): void }[] = []
  const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); geometries.push(g); return g }
  const floors = Array.from({ length: plot.floors }, () => new THREE.Group())
  const ceilings = Array.from({ length: plot.floors }, () => new THREE.Group())
  floors.forEach((group, f) => { group.name = `floor-${f}`; root.add(group); ceilings[f]!.name = `ceiling-${f}`; root.add(ceilings[f]!) })
  const surfaces: InstanceType<typeof THREE.Object3D>[] = []
  const solid = (mesh: InstanceType<typeof THREE.Mesh>): InstanceType<typeof THREE.Mesh> => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh }

  // The yard: grass round the house, a step at the door.
  const yard = canvasTexture(512, grass, 1)
  yard.repeat.set((plot.w + 40) / 4, (plot.d + 40) / 4)
  owned.push(yard)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(plot.w + 40, plot.d + 40), material({ map: yard, roughness: 1 }))
  geometries.push(ground.geometry)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(plot.w / 2, -0.02, plot.d / 2)
  ground.receiveShadow = true
  ground.name = 'ground'
  root.add(ground)
  surfaces.push(ground)

  // Floors: each room in its own finish (wood, or the tiles of a wet room or a terrace), and the slab round a stairwell above.
  for (let f = 0; f < plot.floors; f++) {
    const y = f * H
    const base = new THREE.Mesh(box(plot.w * T + THICK * 2, 0.12, plot.d * T + THICK * 2), slabMat)
    const hole = slabOf(plan, f)
    if (!hole.length) { base.position.set((plot.w * T) / 2, y - 0.06, (plot.d * T) / 2); floors[f]!.add(solid(base)) }
    else for (const [x0, z0, x1, z1] of hole) { const part = new THREE.Mesh(box((x1 - x0) * T, 0.12, (z1 - z0) * T), slabMat); part.position.set(((x0 + x1) / 2) * T, y - 0.06, ((z0 + z1) / 2) * T); floors[f]!.add(solid(part)) }
    const well = plan.stairs.find((s) => s.floor === f - 1)
    for (const room of plan.floors[f] ?? []) {
      const finish = finishAt(plan, f, room.x, room.y)
      const mat = finish ? tileMat(finish) : woodFloor
      // Split round the stairwell so the hole stays open.
      const rects: [number, number, number, number][] = []
      if (well && well.x < room.x + room.w && well.x + well.w > room.x && well.y < room.y + room.h && well.y + well.h > room.y) {
        const cut = (a0: number, a1: number, b0: number, b1: number) => { if (a1 > a0 && b1 > b0) rects.push([a0, b0, a1, b1]) }
        cut(room.x, room.x + room.w, room.y, well.y); cut(room.x, room.x + room.w, well.y + well.h, room.y + room.h)
        cut(room.x, well.x, Math.max(room.y, well.y), Math.min(room.y + room.h, well.y + well.h)); cut(well.x + well.w, room.x + room.w, Math.max(room.y, well.y), Math.min(room.y + room.h, well.y + well.h))
      } else rects.push([room.x, room.y, room.x + room.w, room.y + room.h])
      for (const [x0, z0, x1, z1] of rects) {
        const g = new THREE.PlaneGeometry((x1 - x0) * T, (z1 - z0) * T)
        const uv = g.attributes['uv']!
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) * T / 4, uv.getY(i) * (z1 - z0) * T / 4)
        geometries.push(g)
        const floor = new THREE.Mesh(g, mat)
        floor.rotation.x = -Math.PI / 2
        floor.position.set(((x0 + x1) / 2) * T, y + 0.005, ((z0 + z1) / 2) * T)
        floor.receiveShadow = true
        floor.userData['floor'] = f
        floors[f]!.add(floor)
        surfaces.push(floor)
        const ceiling = new THREE.Mesh(g, ceilingMat)
        ceiling.rotation.x = Math.PI / 2
        ceiling.position.set(((x0 + x1) / 2) * T, y + WALL, ((z0 + z1) / 2) * T)
        ceilings[f]!.add(ceiling)
      }
    }
  }

  // Walls. A run along x or z, with openings cut as [from, to, bottom, top] (metres along the run and up from the floor).
  const run = (group: InstanceType<typeof THREE.Group>, mat: InstanceType<typeof THREE.MeshStandardMaterial>, axis: 'x' | 'z', line: number, from: number, to: number, y: number, openings: [number, number, number, number][] = []): void => {
    const piece = (a: number, b: number, bottom: number, top: number) => {
      if (b - a < 0.01 || top - bottom < 0.01) return
      const mesh = solid(new THREE.Mesh(axis === 'x' ? box(b - a, top - bottom, THICK) : box(THICK, top - bottom, b - a), mat))
      mesh.position.set(axis === 'x' ? (a + b) / 2 : line, y + (bottom + top) / 2, axis === 'x' ? line : (a + b) / 2)
      group.add(mesh)
    }
    const cuts = [...openings].sort((p, q) => p[0] - q[0])
    let at = from
    for (const [a, b, bottom, top] of cuts) { piece(at, a, 0, WALL); piece(a, b, 0, bottom); piece(a, b, top, WALL); at = b }
    piece(at, to, 0, WALL)
  }
  const windowAt = (group: InstanceType<typeof THREE.Group>, axis: 'x' | 'z', line: number, a: number, b: number, y: number): void => {
    const pane = new THREE.Mesh(axis === 'x' ? box(b - a, DOOR_TOP - SILL, 0.02) : box(0.02, DOOR_TOP - SILL, b - a), glass)
    pane.position.set(axis === 'x' ? (a + b) / 2 : line, y + (SILL + DOOR_TOP) / 2, axis === 'x' ? line : (a + b) / 2)
    group.add(pane)
    for (const [u, v, len, along] of [[a, SILL, b - a, true], [a, DOOR_TOP, b - a, true], [a, SILL, DOOR_TOP - SILL, false], [b, SILL, DOOR_TOP - SILL, false], [(a + b) / 2, SILL, DOOR_TOP - SILL, false]] as [number, number, number, boolean][]) {
      const bar = solid(new THREE.Mesh(along ? (axis === 'x' ? box(len, 0.05, 0.08) : box(0.08, 0.05, len)) : box(axis === 'x' ? 0.05 : 0.08, len, axis === 'x' ? 0.08 : 0.05), frameMat))
      const mid = along ? u + len / 2 : u
      bar.position.set(axis === 'x' ? mid : line, y + (along ? v : v + len / 2), axis === 'x' ? line : mid)
      group.add(bar)
    }
  }
  const door = doorSlot(plot.grid), window = windowSlot(plot.grid)
  for (let f = 0; f < plot.floors; f++) {
    const y = f * H, group = floors[f]!, w = plot.w * T, d = plot.d * T
    // Windows on every side, one in each room's stretch of outside wall that is long enough; the game's own window on the top wall.
    const rooms = plan.floors[f] ?? []
    const along = (edge: 'top' | 'bottom' | 'left' | 'right'): [number, number][] => rooms.flatMap((r) => {
      const touches = edge === 'top' ? r.y === 0 : edge === 'bottom' ? r.y + r.h === plot.d : edge === 'left' ? r.x === 0 : r.x + r.w === plot.w
      if (!touches) return []
      const [a, b] = edge === 'top' || edge === 'bottom' ? [r.x, r.x + r.w] : [r.y, r.y + r.h]
      return b - a >= 3 ? [[(a + b) / 2 - 0.6, (a + b) / 2 + 0.6] as [number, number]] : []
    })
    const top = along('top'), bottom = along('bottom'), left = along('left'), right = along('right')
    if (f === 0) { const own: [number, number] = [window * T + 0.1, (window + 1) * T - 0.1]; if (!top.some(([a, b]) => a < own[1] && b > own[0])) top.push(own) }
    const leftOpen: [number, number, number, number][] = left.filter(([a, b]) => f > 0 || b < door * T || a > (door + 1) * T).map(([a, b]) => [a, b, SILL, DOOR_TOP])
    if (f === 0) leftOpen.push([door * T + 0.05, (door + 1) * T - 0.05, 0, DOOR_TOP])
    run(group, outerWall, 'x', -THICK / 2, -THICK, w + THICK, y, top.map(([a, b]) => [a, b, SILL, DOOR_TOP]))
    run(group, outerWall, 'x', d + THICK / 2, -THICK, w + THICK, y, bottom.map(([a, b]) => [a, b, SILL, DOOR_TOP]))
    run(group, outerWall, 'z', -THICK / 2, 0, d, y, leftOpen)
    run(group, outerWall, 'z', w + THICK / 2, 0, d, y, right.map(([a, b]) => [a, b, SILL, DOOR_TOP]))
    for (const [a, b] of top) windowAt(group, 'x', -THICK / 2, a, b, y)
    for (const [a, b] of bottom) windowAt(group, 'x', d + THICK / 2, a, b, y)
    for (const [a, b, bottomCut] of leftOpen) if (bottomCut > 0) windowAt(group, 'z', -THICK / 2, a, b, y)
    for (const [a, b] of right) windowAt(group, 'z', w + THICK / 2, a, b, y)
    // The front door, standing open into the room.
    if (f === 0) {
      const leaf = solid(new THREE.Mesh(box(0.05, DOOR_TOP - 0.02, T - 0.12), doorMat))
      const hinge = new THREE.Group()
      hinge.name = 'door'
      hinge.position.set(0, 0, door * T + 0.06)
      leaf.position.set(0, DOOR_TOP / 2, (T - 0.12) / 2)
      hinge.rotation.y = -1.2
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), metalMat)
      geometries.push(knob.geometry)
      knob.position.set(0.05, DOOR_TOP / 2 - 0.05, T - 0.25)
      hinge.add(leaf, knob)
      group.add(hinge)
      const step = solid(new THREE.Mesh(box(0.6, 0.1, T + 0.4), slabMat))
      step.position.set(-0.4, -0.05, (door + 0.5) * T)
      group.add(step)
    }
    // Inner walls: the game's own runs, with the doorways it left open; the stair rails as low metal rails.
    const inner = wallsOf(plan, f), same = (p: PlanWall, q: PlanWall) => p.x0 === q.x0 && p.y0 === q.y0 && p.x1 === q.x1 && p.y1 === q.y1
    for (const wall of inner) {
      if (wall.y0 === wall.y1) run(group, innerWall, 'x', wall.y0 * T, wall.x0 * T, wall.x1 * T, y)
      else run(group, innerWall, 'z', wall.x0 * T, wall.y0 * T, wall.y1 * T, y)
    }
    for (const rail of bumpsOf(plan, f).filter((r) => !inner.some((w) => same(w, r)))) {
      const along = rail.y0 === rail.y1, len = (along ? rail.x1 - rail.x0 : rail.y1 - rail.y0) * T
      const bar = solid(new THREE.Mesh(along ? box(len, 0.05, 0.05) : box(0.05, 0.05, len), metalMat))
      bar.position.set(along ? ((rail.x0 + rail.x1) / 2) * T : rail.x0 * T, y + 1, along ? rail.y0 * T : ((rail.y0 + rail.y1) / 2) * T)
      group.add(bar)
      for (let i = 0; i <= Math.ceil(len / 0.5); i++) {
        const t = Math.min(len, i * 0.5), post = solid(new THREE.Mesh(box(0.03, 1, 0.03), metalMat))
        post.position.set(along ? rail.x0 * T + t : rail.x0 * T, y + 0.5, along ? rail.y0 * T : rail.y0 * T + t)
        group.add(post)
      }
    }
  }
  // The roof: a flat slab with a low parapet in the house's roof colour, seen from the yard (inside, the ceilings close the rooms).
  const roof = new THREE.Group()
  roof.name = 'roof'
  {
    const top = (plot.floors - 1) * H + WALL, w = plot.w * T, d = plot.d * T, roofMat = material({ color: pick('roof', '#a85c40'), roughness: 0.8 })
    const slab = solid(new THREE.Mesh(box(w + 0.5, 0.18, d + 0.5), roofMat))
    slab.position.set(w / 2, top + 0.09, d / 2)
    roof.add(slab)
    for (const [x, z, bw, bd] of [[w / 2, -0.25, w + 0.5, 0.1], [w / 2, d + 0.25, w + 0.5, 0.1], [-0.25, d / 2, 0.1, d + 0.5], [w + 0.25, d / 2, 0.1, d + 0.5]] as [number, number, number, number][]) {
      const lip = solid(new THREE.Mesh(box(bw, 0.35, bd), roofMat))
      lip.position.set(x, top + 0.35, z)
      roof.add(lip)
    }
  }
  root.add(roof)

  // Stairs: one flight per storey, steps rising along x in the flight's direction.
  for (const flight of plan.stairs) {
    const steps = 14, rise = H / steps, run = (flight.w * T) / steps, group = floors[flight.floor]!
    for (let i = 0; i < steps; i++) {
      const step = solid(new THREE.Mesh(box(run, rise * (i + 1), flight.h * T - 0.1), woodFloor))
      const along = flight.dir === 1 ? flight.x * T + (i + 0.5) * run : (flight.x + flight.w) * T - (i + 0.5) * run
      step.position.set(along, flight.floor * H + (rise * (i + 1)) / 2, (flight.y + flight.h / 2) * T)
      group.add(step)
    }
  }

  // Furniture.
  const furniture = Array.from({ length: plot.floors }, () => new THREE.Group())
  furniture.forEach((g, f) => { g.name = 'furniture'; floors[f]!.add(g) })
  const boxes: { rect: [number, number, number, number]; y: number; height: number }[] = []
  const blocking: [number, number, number, number][][] = Array.from({ length: plot.floors }, () => [])
  const nearCache = new Map<string, Promise<InstanceType<typeof THREE.Group> | null>>()
  const near = (url: string) => {
    let found = nearCache.get(url)
    if (!found) { found = fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null)).then((bytes) => (bytes ? parseModel(bytes, maxAnisotropy).then((m) => m.root) : null)).catch(() => null); nearCache.set(url, found) }
    return found
  }
  let gone = false
  for (const item of input.items) {
    const def = FURNITURE[item.itemId as keyof typeof FURNITURE]
    if (!def) continue
    const f = Math.min(item.floor ?? 0, plot.floors - 1), y = f * H
    const mount = new THREE.Group()
    furniture[f]!.add(mount)
    if (def.wall) {
      // On the top wall at its x (rot 0), or the left wall at its y (rot 1), as the plan drawing shows it.
      const panel = solid(new THREE.Mesh(box(0.7, 0.55, 0.04), material({ color: def.color, roughness: 0.6 })))
      if (item.rot === 1) { panel.rotation.y = Math.PI / 2; panel.position.set(0.04, y + 1.6, (item.y + 0.5) * T) }
      else panel.position.set((item.x + 0.5) * T, y + 1.6, 0.04)
      mount.add(panel)
      continue
    }
    const size = footprint(def, item.rot), w = def.w * T, d = def.h * T
    mount.position.set((item.x + size.w / 2) * T, y, (item.y + size.h / 2) * T)
    mount.rotation.y = -item.rot * Math.PI / 2
    if (!/^(mat|rug|gymmat)$/.test(def.shape)) blocking[f]!.push([item.x * T + 0.05, item.y * T + 0.05, (item.x + size.w) * T - 0.05, (item.y + size.h) * T - 0.05])
    const proxy = shapeOf(def.shape, w, d, def.color, material, box)
    mount.add(proxy)
    if (!/^(mat|rug|gymmat)$/.test(def.shape)) {
      mount.updateWorldMatrix(true, true)
      const bounds = new THREE.Box3().setFromObject(mount)
      if (bounds.max.y - y > 0.05) boxes.push({ rect: [bounds.min.x, bounds.min.z, bounds.max.x, bounds.max.z], y, height: Math.max(0.3, bounds.max.y - y) })
    }
    const url = NEAR[def.shape]
    if (url) void near(url).then((source) => {
      if (gone || !source) return
      const object = source.clone(true)
      const bounds = new THREE.Box3().setFromObject(object), extent = bounds.getSize(new THREE.Vector3())
      const fit = Math.min((w * 0.92) / Math.max(extent.x, 0.01), (d * 0.92) / Math.max(extent.z, 0.01), def.shape === 'tv' ? 1.1 / Math.max(extent.y, 0.01) : 2.2 / Math.max(extent.y, 0.01))
      object.scale.setScalar(fit)
      object.position.y = def.shape === 'tv' ? 0.5 : 0
      mount.remove(proxy)
      if (def.shape === 'tv') mount.add(shapeOf('console', w, d, '#6b4a2b', material, box))
      mount.add(object)
    })
  }

  // Players' models.
  const placed = new Map<string, InstanceType<typeof THREE.Object3D>>()
  const modelGroup = new THREE.Group()
  modelGroup.name = 'models'
  root.add(modelGroup)
  const parsed = new Map<string, Promise<{ root: InstanceType<typeof THREE.Group>; skinned: boolean; bytes: ArrayBuffer } | null>>()
  let modelBlocks: { floor: number; rect: [number, number, number, number] }[] = []

  return {
    root, plan,
    walls: (floor) => bumpsOf(plan, floor).map((w) => ({ x0: w.x0 * T, y0: w.y0 * T, x1: w.x1 * T, y1: w.y1 * T })).concat(outerWallsOf(plot.w * T, plot.d * T, floor === 0 ? [door * T, (door + 1) * T] : null)),
    blocks: (floor) => [...(blocking[floor] ?? []), ...modelBlocks.filter((b) => b.floor === floor).map((b) => b.rect)],
    show(floor, inside, outdoors = false) {
      roof.visible = outdoors
      floors.forEach((g, f) => { g.visible = outdoors || f <= floor })
      ceilings.forEach((g, f) => { g.visible = inside && f <= floor })
      modelGroup.children.forEach((child) => { child.visible = (child.userData['floor'] ?? 0) <= floor })
    },
    async setModels(list, bytesOf) {
      for (const object of placed.values()) modelGroup.remove(object)
      placed.clear()
      const blocks: typeof modelBlocks = []
      await Promise.all(list.map(async (p) => {
        let source = parsed.get(p.hash)
        if (!source) {
          source = bytesOf(p.hash).then(async (bytes) => {
            if (!bytes) return null
            const model = await parseModel(bytes.slice(0), maxAnisotropy)
            let skinned = false
            model.root.traverse((n) => { if ((n as InstanceType<typeof THREE.SkinnedMesh>).isSkinnedMesh) skinned = true })
            return { root: model.root, skinned, bytes }
          }).catch(() => null)
          parsed.set(p.hash, source)
        }
        const found = await source
        if (!found || gone) return
        // A skinned model is parsed again for each copy (a plain clone would share its skeleton).
        const object = found.skinned && [...placed.values()].some((o) => o.userData['hash'] === p.hash) ? (await parseModel(found.bytes.slice(0), maxAnisotropy)).root : found.root.clone(true)
        const holder = new THREE.Group()
        holder.add(object)
        holder.position.set(p.x, p.floor * H + p.y, p.z)
        holder.rotation.y = (p.ry * Math.PI) / 180
        holder.scale.setScalar(p.s)
        holder.userData = { key: p.k, hash: p.hash, floor: p.floor, loose: p.loose === true }
        holder.name = `model-${p.k}`
        modelGroup.add(holder)
        placed.set(p.k, holder)
        if (!p.loose && p.y < 1.5) {
          const bounds = new THREE.Box3().setFromObject(holder)
          if (bounds.max.y - p.floor * H > 0.3) blocks.push({ floor: p.floor, rect: [bounds.min.x, bounds.min.z, bounds.max.x, bounds.max.z] })
        }
      }))
      modelBlocks = blocks
    },
    modelObject: (key) => placed.get(key),
    modelObjects: () => [...placed.values()],
    furnitureBoxes: () => boxes.map((b) => ({ ...b, rect: [...b.rect] as [number, number, number, number] })),
    isShell(node) {
      // The open front door is drawn, not solid: it would close the doorway.
      for (let n: InstanceType<typeof THREE.Object3D> | null = node; n; n = n.parent) if (n.name === 'furniture' || n.name === 'models' || n.name === 'door') return false
      return true
    },
    surfaces: () => surfaces,
    dispose() {
      gone = true
      disposeTree(root)
      for (const g of geometries) g.dispose()
      for (const m of owned) m.dispose()
      void Promise.all([...nearCache.values()]).then((list) => { for (const g of list) if (g) disposeTree(g) })
      void Promise.all([...parsed.values()]).then((list) => { for (const g of list) if (g) disposeTree(g.root) })
    },
  }
}

/** The four outside walls as lines (metres), leaving the front door open on the ground floor. */
function outerWallsOf(w: number, d: number, doorGap: [number, number] | null): PlanWall[] {
  const left: PlanWall[] = doorGap ? [{ x0: 0, y0: 0, x1: 0, y1: doorGap[0] }, { x0: 0, y0: doorGap[1], x1: 0, y1: d }] : [{ x0: 0, y0: 0, x1: 0, y1: d }]
  return [{ x0: 0, y0: 0, x1: w, y1: 0 }, { x0: 0, y0: d, x1: w, y1: d }, { x0: w, y0: 0, x1: w, y1: d }, ...left]
}

type MaterialMaker = (params: ConstructorParameters<typeof THREE.MeshStandardMaterial>[0]) => InstanceType<typeof THREE.MeshStandardMaterial>
type BoxMaker = (w: number, h: number, d: number) => InstanceType<typeof THREE.BoxGeometry>
/** A piece of furniture built from boxes and cylinders, centred on its footprint (w × d metres), standing on y = 0. */
function shapeOf(shape: string, w: number, d: number, colour: string, material: MaterialMaker, box: BoxMaker): InstanceType<typeof THREE.Group> {
  const group = new THREE.Group()
  const main = material({ color: colour, roughness: 0.6 })
  const wood = material({ color: '#7a5537', roughness: 0.55 })
  const cloth = material({ color: '#e9e4da', roughness: 0.95 })
  const dark = material({ color: '#2b2f31', roughness: 0.35, metalness: 0.3 })
  const white = material({ color: '#f2f1ec', roughness: 0.3 })
  const add = (mat: InstanceType<typeof THREE.MeshStandardMaterial>, x: number, y: number, z: number, bw: number, bh: number, bd: number) => {
    const mesh = new THREE.Mesh(box(bw, bh, bd), mat)
    mesh.position.set(x, y + bh / 2, z)
    mesh.castShadow = mesh.receiveShadow = true
    group.add(mesh)
  }
  const legs = (h: number, inset = 0.06, size = 0.05) => { for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(wood, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), size, h, size) }
  switch (shape) {
    case 'mat': case 'gymmat': add(main, 0, 0, 0, w * 0.9, 0.03, d * 0.92); break
    case 'rug': add(main, 0, 0, 0, w * 0.95, 0.015, d * 0.95); break
    case 'bed': add(wood, 0, 0, 0, w * 0.96, 0.3, d * 0.96); add(cloth, 0, 0.3, 0.02, w * 0.92, 0.2, d * 0.9); add(main, 0, 0.5, d * 0.12, w * 0.92, 0.04, d * 0.62); add(white, 0, 0.5, -d * 0.36, w * 0.7, 0.12, 0.3); add(wood, 0, 0, -d * 0.48, w * 0.96, 0.95, 0.06); break
    case 'sofa': case 'bench': case 'beanbag': add(main, 0, 0.1, 0.05, w * 0.94, 0.32, d * 0.75); add(main, 0, 0.1, -d * 0.36, w * 0.94, 0.6, d * 0.2); add(main, -w * 0.44, 0.1, 0, w * 0.08, 0.45, d * 0.9); add(main, w * 0.44, 0.1, 0, w * 0.08, 0.45, d * 0.9); legs(0.1); break
    case 'chair': add(main, 0, 0.45, 0, w * 0.5, 0.05, d * 0.5); add(main, 0, 0.45, -d * 0.23, w * 0.5, 0.45, 0.04); legs(0.45, w * 0.27, 0.035); break
    case 'desk': case 'board': case 'console': add(wood, 0, 0.72, 0, w * 0.95, 0.04, d * 0.85); legs(0.72); break
    case 'shelf': case 'wardrobe': add(wood, 0, 0, 0, w * 0.92, shape === 'wardrobe' ? 2 : 1.6, d * 0.7); add(dark, 0, 0.9, d * 0.355, 0.02, 0.2, 0.02); break
    case 'fridge': case 'cooler': add(white, 0, 0, 0, w * 0.8, shape === 'fridge' ? 1.8 : 0.45, d * 0.8); break
    case 'stove': case 'cooker': add(white, 0, 0, 0, w * 0.85, 0.85, d * 0.85); add(dark, 0, 0.85, 0, w * 0.85, 0.02, d * 0.85); break
    case 'toilet': add(white, 0, 0, 0.05, 0.4, 0.42, 0.55); add(white, 0, 0.42, -0.22, 0.42, 0.4, 0.18); break
    case 'tub': add(white, 0, 0, 0, w * 0.92, 0.55, d * 0.85); break
    case 'shower': add(white, 0, 0, 0, w * 0.9, 0.06, d * 0.9); add(dark, w * 0.3, 0, -d * 0.4, 0.03, 2, 0.03); break
    case 'basin': add(white, 0, 0.8, 0, w * 0.6, 0.12, d * 0.5); add(white, 0, 0, -d * 0.1, 0.12, 0.8, 0.12); break
    case 'tv': add(wood, 0, 0, 0, w * 0.9, 0.45, d * 0.6); add(dark, 0, 0.5, -d * 0.1, w * 0.85, 0.55, 0.04); break
    case 'fan': add(dark, 0, 0, 0, 0.3, 0.04, 0.3); add(dark, 0, 0.04, 0, 0.03, 1.1, 0.03); add(white, 0, 1.1, 0, 0.45, 0.45, 0.1); break
    case 'plant': add(material({ color: '#8a5a3c', roughness: 0.8 }), 0, 0, 0, 0.35, 0.35, 0.35); add(material({ color: '#3d7a3a', roughness: 0.8 }), 0, 0.35, 0, 0.55, 0.7, 0.55); break
    case 'floorlamp': case 'lamp': case 'lantern': add(dark, 0, 0, 0, 0.25, 0.04, 0.25); add(dark, 0, 0.04, 0, 0.03, 1.4, 0.03); add(material({ color: '#f6e7c1', roughness: 0.6, emissive: '#ffd890', emissiveIntensity: 0.6 }), 0, 1.4, 0, 0.35, 0.3, 0.35); break
    case 'generator': case 'inverter': case 'drum': case 'jerrycans': case 'bucket': add(main, 0, 0, 0, w * 0.7, 0.6, d * 0.7); break
    case 'aquarium': add(wood, 0, 0, 0, w * 0.9, 0.7, d * 0.6); add(material({ color: '#7cc3e0', roughness: 0.05, transparent: true, opacity: 0.5 }), 0, 0.7, 0, w * 0.85, 0.5, d * 0.55); break
    default: add(main, 0, 0, 0, w * 0.8, 0.6, d * 0.8)
  }
  return group
}
