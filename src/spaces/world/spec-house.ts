// A house built from a house description (src/spaces/house-spec.ts; docs/HOUSE-FROM-PHOTOS.md): the one a player's own AI wrote from
// photos of their real house. Clean walls with the doors and windows where the description puts them, a floor per room in its colour,
// ceilings, stairs, a flat, gable or hip roof, and a porch, a fence and a gate when asked. Metres: x across the front, z from the front
// wall back, y up; the front wall is at z = 0. Walls and floors are solid to the physics, as the game's own house is.
import type { HouseSpecV1, SpecOpening } from '../house-spec.ts'
import type { PlanWall } from '../../game/home-plan.ts'
import { THREE } from './look.ts'

type Group = InstanceType<typeof THREE.Group>
type Object3D = InstanceType<typeof THREE.Object3D>
type Mat = InstanceType<typeof THREE.MeshStandardMaterial>

export interface SpecBuilt {
  floors: Group[]
  ceilings: Group[]
  roof: Group
  surfaces: Object3D[]
  /** Walls a walker bumps into on each floor (doorways left open), in metres; y is z. */
  walls: PlanWall[][]
  dispose(): void
}

const OUTER = 0.16, INNER = 0.1, SLAB = 0.12
type Rect = [x0: number, z0: number, x1: number, z1: number]
/** `rect` with `hole` cut out of it, as up to four rectangles. */
function minus(rect: Rect, hole: Rect | null): Rect[] {
  if (!hole) return [rect]
  const [x0, z0, x1, z1] = rect, [hx0, hz0, hx1, hz1] = hole
  if (hx1 <= x0 || hx0 >= x1 || hz1 <= z0 || hz0 >= z1) return [rect]
  const out: Rect[] = []
  const push = (r: Rect): void => { if (r[2] - r[0] > 0.01 && r[3] - r[1] > 0.01) out.push(r) }
  push([x0, z0, x1, Math.max(z0, hz0)]); push([x0, Math.min(z1, hz1), x1, z1])
  push([x0, Math.max(z0, hz0), Math.max(x0, hx0), Math.min(z1, hz1)]); push([Math.min(x1, hx1), Math.max(z0, hz0), x1, Math.min(z1, hz1)])
  return out
}
/** Overlapping intervals on one line, joined. */
function union(list: [number, number][]): [number, number][] {
  const sorted = [...list].sort((a, b) => a[0] - b[0]), out: [number, number][] = []
  for (const [a, b] of sorted) { const last = out[out.length - 1]; if (last && a <= last[1] + 0.01) last[1] = Math.max(last[1], b); else out.push([a, b]) }
  return out
}

export function buildSpecHouse(spec: HouseSpecV1, maxAnisotropy = 8): SpecBuilt {
  const W = spec.width, D = spec.depth, H = spec.storeyHeight, WALL = H - SLAB
  const disposables: { dispose(): void }[] = []
  const mat = (color: string, roughness = 0.85, extra: Record<string, unknown> = {}): Mat => { const m = new THREE.MeshStandardMaterial({ color, roughness, ...extra }); disposables.push(m); return m }
  const box = (w: number, h: number, d: number) => { const g = new THREE.BoxGeometry(w, h, d); disposables.push(g); return g }
  const outer = mat(spec.walls.color, 0.92), inner = mat(spec.walls.inner ?? '#f4f1ea', 0.9), trim = mat(spec.walls.trim ?? '#ffffff', 0.45)
  const slab = mat('#cfc8bb', 0.95), ceiling = mat('#fbfaf6', 0.95), wood = mat('#b08a5a', 0.6), roofMat = mat(spec.roof.color, 0.8)
  const glass = new THREE.MeshPhysicalMaterial({ color: '#bfe0f0', roughness: 0.04, transparent: true, opacity: 0.25, envMapIntensity: 1.4 }); disposables.push(glass)
  const floorMats = new Map<string, Mat>()
  const floorMat = (hex: string | undefined): Mat => { if (!hex) return wood; let m = floorMats.get(hex); if (!m) { m = mat(hex, 0.55); floorMats.set(hex, m) } return m }
  const solid = <T extends Object3D>(o: T): T => { (o as unknown as { castShadow: boolean; receiveShadow: boolean }).castShadow = true; (o as unknown as { receiveShadow: boolean }).receiveShadow = true; return o }
  const floors = Array.from({ length: spec.storeys }, () => new THREE.Group())
  const ceilings = Array.from({ length: spec.storeys }, () => new THREE.Group())
  const roof = new THREE.Group()
  const surfaces: Object3D[] = []
  const walls: PlanWall[][] = Array.from({ length: spec.storeys }, () => [])

  /** A wall along x (at z = line) or along z (at x = line), from `from` to `to`, with openings [a, b, bottom, top]. */
  const run = (group: Group, m: Mat, axis: 'x' | 'z', line: number, from: number, to: number, y: number, thick: number, openings: [number, number, number, number][]): void => {
    const piece = (a: number, b: number, bottom: number, top: number): void => {
      if (b - a < 0.01 || top - bottom < 0.01) return
      const mesh = solid(new THREE.Mesh(axis === 'x' ? box(b - a, top - bottom, thick) : box(thick, top - bottom, b - a), m))
      mesh.position.set(axis === 'x' ? (a + b) / 2 : line, y + (bottom + top) / 2, axis === 'x' ? line : (a + b) / 2)
      group.add(mesh)
    }
    let at = from
    for (const [a, b, bottom, top] of [...openings].sort((p, q) => p[0] - q[0])) {
      const ca = Math.max(from, a), cb = Math.min(to, b)
      if (cb <= ca) continue
      piece(at, ca, 0, WALL); piece(ca, cb, 0, bottom); piece(ca, cb, top, WALL); at = cb
    }
    piece(at, to, 0, WALL)
  }
  /** The collision line of a wall, broken at doorways. */
  const bump = (f: number, axis: 'x' | 'z', line: number, from: number, to: number, gaps: [number, number][]): void => {
    let at = from
    for (const [a, b] of union(gaps)) { if (a > at) walls[f]!.push(axis === 'x' ? { x0: at, y0: line, x1: a, y1: line } : { x0: line, y0: at, x1: line, y1: a }); at = Math.max(at, b) }
    if (to > at) walls[f]!.push(axis === 'x' ? { x0: at, y0: line, x1: to, y1: line } : { x0: line, y0: at, x1: line, y1: to })
  }
  const pane = (group: Group, axis: 'x' | 'z', line: number, a: number, b: number, bottom: number, top: number, y: number): void => {
    const g = new THREE.Mesh(axis === 'x' ? box(b - a, top - bottom, 0.02) : box(0.02, top - bottom, b - a), glass)
    g.position.set(axis === 'x' ? (a + b) / 2 : line, y + (bottom + top) / 2, axis === 'x' ? line : (a + b) / 2)
    group.add(g)
    for (const [u, v, len, along] of [[a, bottom, b - a, true], [a, top, b - a, true], [a, bottom, top - bottom, false], [b, bottom, top - bottom, false]] as [number, number, number, boolean][]) {
      const bar = solid(new THREE.Mesh(along ? (axis === 'x' ? box(len, 0.06, 0.1) : box(0.1, 0.06, len)) : (axis === 'x' ? box(0.06, len, 0.1) : box(0.1, len, 0.06)), trim))
      const mid = along ? u + len / 2 : u
      bar.position.set(axis === 'x' ? mid : line, y + (along ? v : v + len / 2), axis === 'x' ? line : mid)
      group.add(bar)
    }
  }

  // Where an outside opening sits: its wall's line and axis, and its span along the wall.
  const placeOf = (o: SpecOpening): { axis: 'x' | 'z'; line: number; a: number; b: number } | null => {
    if (o.wall === 'inner' || o.at === undefined) return null
    const a = o.at - o.width / 2, b = o.at + o.width / 2
    if (o.wall === 'front') return { axis: 'x', line: 0, a, b }
    if (o.wall === 'back') return { axis: 'x', line: D, a, b }
    if (o.wall === 'left') return { axis: 'z', line: 0, a, b }
    return { axis: 'z', line: W, a, b }
  }
  const wellAbove = (f: number): Rect | null => { const s = spec.stairs.find((st) => st.floor === f - 1); return s ? [s.x, s.z, s.x + s.w, s.z + s.d] : null }

  for (let f = 0; f < spec.storeys; f++) {
    const y = f * H, group = floors[f]!, hole = wellAbove(f)
    // The slab under this floor, with the stairwell from below left open.
    for (const [x0, z0, x1, z1] of minus([-OUTER, -OUTER, W + OUTER, D + OUTER], hole)) {
      const s = solid(new THREE.Mesh(box(x1 - x0, SLAB, z1 - z0), slab)); s.position.set((x0 + x1) / 2, y - SLAB / 2, (z0 + z1) / 2); group.add(s)
    }
    // A floor per room in its colour (the whole footprint when no room is described), and the ceiling over it.
    const rooms = spec.rooms.filter((r) => r.floor === f)
    const rects = rooms.length ? rooms.map((r) => ({ rect: [r.x, r.z, r.x + r.w, r.z + r.d] as Rect, color: r.floorColor })) : [{ rect: [0, 0, W, D] as Rect, color: undefined }]
    for (const { rect, color } of rects) for (const [x0, z0, x1, z1] of minus(rect, hole)) {
      const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); disposables.push(g)
      const floor = new THREE.Mesh(g, floorMat(color)); floor.rotation.x = -Math.PI / 2; floor.position.set((x0 + x1) / 2, y + 0.005, (z0 + z1) / 2)
      floor.receiveShadow = true; floor.userData['floor'] = f; group.add(floor); surfaces.push(floor)
      const top = new THREE.Mesh(g, ceiling); top.rotation.x = Math.PI / 2; top.position.set((x0 + x1) / 2, y + WALL - 0.002, (z0 + z1) / 2); ceilings[f]!.add(top)
    }
    // Outside walls with their doors and windows.
    const sides: { wall: SpecOpening['wall']; axis: 'x' | 'z'; line: number; from: number; to: number }[] = [
      { wall: 'front', axis: 'x', line: -OUTER / 2, from: -OUTER, to: W + OUTER }, { wall: 'back', axis: 'x', line: D + OUTER / 2, from: -OUTER, to: W + OUTER },
      { wall: 'left', axis: 'z', line: -OUTER / 2, from: 0, to: D }, { wall: 'right', axis: 'z', line: W + OUTER / 2, from: 0, to: D },
    ]
    for (const side of sides) {
      const openings: [number, number, number, number][] = [], gaps: [number, number][] = []
      for (const d of spec.doors.filter((o) => o.floor === f && o.wall === side.wall)) { const p = placeOf(d)!; openings.push([p.a, p.b, 0, d.height ?? 2.1]); gaps.push([p.a, p.b]) }
      for (const w of spec.windows.filter((o) => o.floor === f && o.wall === side.wall)) { const p = placeOf(w)!; const bottom = w.sill ?? 0.9, top = bottom + (w.height ?? 1.2); openings.push([p.a, p.b, bottom, top]); pane(group, side.axis, side.line, p.a, p.b, bottom, top, y) }
      run(group, outer, side.axis, side.line, side.from, side.to, y, OUTER, openings)
      bump(f, side.axis, side.axis === 'x' ? (side.wall === 'front' ? 0 : D) : (side.wall === 'left' ? 0 : W), 0, side.axis === 'x' ? W : D, gaps)
    }
    // The main door, standing open into the house.
    const main = f === 0 ? spec.doors.find((d) => d.main && d.wall !== 'inner') : undefined
    const mp = main ? placeOf(main) : null
    if (main && mp) {
      const leafW = mp.b - mp.a - 0.06, leaf = solid(new THREE.Mesh(mp.axis === 'x' ? box(leafW, (main.height ?? 2.1) - 0.02, 0.05) : box(0.05, (main.height ?? 2.1) - 0.02, leafW), mat(main.color ?? '#6b4a2b', 0.55)))
      const hinge = new THREE.Group(); hinge.name = 'door'
      if (mp.axis === 'x') { hinge.position.set(mp.a + 0.03, 0, mp.line === 0 ? 0 : D); leaf.position.set(leafW / 2, (main.height ?? 2.1) / 2, 0); hinge.rotation.y = mp.line === 0 ? -1.2 : 1.2 }
      else { hinge.position.set(mp.line === 0 ? 0 : W, 0, mp.a + 0.03); leaf.position.set(0, (main.height ?? 2.1) / 2, leafW / 2); hinge.rotation.y = mp.line === 0 ? 1.2 : -1.2 }
      hinge.add(leaf); group.add(hinge)
    }
    // Inner walls: every room edge inside the house, joined, with the inner doors cut through.
    const along = new Map<number, [number, number][]>(), across = new Map<number, [number, number][]>()
    const key = (v: number): number => Math.round(v * 20) / 20
    const inside = (v: number, max: number): boolean => v > 0.05 && v < max - 0.05
    for (const r of rooms) {
      for (const z of [r.z, r.z + r.d]) if (inside(z, D)) { const k = key(z); along.set(k, [...(along.get(k) ?? []), [r.x, r.x + r.w]]) }
      for (const x of [r.x, r.x + r.w]) if (inside(x, W)) { const k = key(x); across.set(k, [...(across.get(k) ?? []), [r.z, r.z + r.d]]) }
    }
    const innerDoors = spec.doors.filter((d) => d.floor === f && d.wall === 'inner' && d.x !== undefined && d.z !== undefined)
    for (const [z, list] of along) for (const [a, b] of union(list)) {
      const cut = innerDoors.filter((d) => Math.abs(d.z! - z) < 0.4 && d.x! > a && d.x! < b).map((d) => [d.x! - d.width / 2, d.x! + d.width / 2, 0, d.height ?? 2.1] as [number, number, number, number])
      run(group, inner, 'x', z, a, b, y, INNER, cut); bump(f, 'x', z, a, b, cut.map(([p, q]) => [p, q]))
    }
    for (const [x, list] of across) for (const [a, b] of union(list)) {
      const cut = innerDoors.filter((d) => Math.abs(d.x! - x) < 0.4 && d.z! > a && d.z! < b).map((d) => [d.z! - d.width / 2, d.z! + d.width / 2, 0, d.height ?? 2.1] as [number, number, number, number])
      run(group, inner, 'z', x, a, b, y, INNER, cut); bump(f, 'z', x, a, b, cut.map(([p, q]) => [p, q]))
    }
  }

  // Stairs: fourteen steps rising one storey in the direction they go up.
  for (const st of spec.stairs) {
    const steps = 14, rise = H / steps, group = floors[st.floor]!, alongZ = st.up === 'z' || st.up === '-z', length = alongZ ? st.d : st.w, run = length / steps
    for (let i = 0; i < steps; i++) {
      const tread = solid(new THREE.Mesh(alongZ ? box(st.w, rise * (i + 1), run) : box(run, rise * (i + 1), st.d), wood))
      const forward = st.up === 'z' || st.up === 'x' ? i : steps - 1 - i
      if (alongZ) tread.position.set(st.x + st.w / 2, st.floor * H + (rise * (i + 1)) / 2, st.z + (forward + 0.5) * run)
      else tread.position.set(st.x + (forward + 0.5) * run, st.floor * H + (rise * (i + 1)) / 2, st.z + st.d / 2)
      group.add(tread)
    }
  }

  // The roof, seen from the yard (inside, the ceilings close the rooms).
  roof.name = 'roof'
  {
    const top = spec.storeys * H, over = 0.35, w = W + over * 2, d = D + over * 2
    const deck = solid(new THREE.Mesh(box(w, 0.18, d), roofMat)); deck.position.set(W / 2, top + 0.09, D / 2); roof.add(deck)
    if (spec.roof.shape === 'flat') {
      for (const [x, z, bw, bd] of [[W / 2, -over, w, 0.12], [W / 2, D + over, w, 0.12], [-over, D / 2, 0.12, d], [W + over, D / 2, 0.12, d]] as [number, number, number, number][]) { const lip = solid(new THREE.Mesh(box(bw, 0.4, bd), roofMat)); lip.position.set(x, top + 0.38, z); roof.add(lip) }
    } else {
      const pitch = ((spec.roof.pitch ?? 30) * Math.PI) / 180
      if (spec.roof.shape === 'hip') {
        const rise = (Math.min(w, d) / 2) * Math.tan(pitch)
        const cone = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); disposables.push(cone)
        const hip = solid(new THREE.Mesh(cone, roofMat)); hip.rotation.y = Math.PI / 4; hip.scale.set(w, rise, d); hip.position.set(W / 2, top + 0.18 + rise / 2, D / 2); roof.add(hip)
      } else {
        // A gable: the ridge runs along the longer side; two sloped planes and the two triangular ends in the wall colour.
        const ridgeX = W >= D, span = ridgeX ? d : w, length = ridgeX ? w : d, rise = (span / 2) * Math.tan(pitch), slope = Math.hypot(span / 2, rise)
        for (const side of [-1, 1]) {
          const plane = solid(new THREE.Mesh(ridgeX ? box(length, 0.14, slope) : box(slope, 0.14, length), roofMat))
          if (ridgeX) { plane.rotation.x = side * pitch; plane.position.set(W / 2, top + 0.18 + rise / 2, D / 2 + (side * span) / 4) }
          else { plane.rotation.z = -side * pitch; plane.position.set(W / 2 + (side * span) / 4, top + 0.18 + rise / 2, D / 2) }
          roof.add(plane)
        }
        // The triangular ends, in the wall colour, kept under the roof planes (their slope is a little steeper than the planes').
        const endMat = mat(spec.walls.color, 0.92, { side: THREE.DoubleSide }), base = top + 0.18, apex = base + rise - 0.08
        const tri = (points: number[]): void => {
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); g.computeVertexNormals(); disposables.push(g)
          roof.add(solid(new THREE.Mesh(g, endMat)))
        }
        if (ridgeX) for (const x of [0, W]) tri([x, base, 0, x, base, D, x, apex, D / 2])
        else for (const z of [0, D]) tri([0, base, z, W, base, z, W / 2, apex, z])
      }
    }
  }

  // A porch at the main door, a fence round the yard with its gap at the path, a gate in it, a balcony over the front.
  const ground = floors[0]!, mainDoor = spec.doors.find((d) => d.main && d.wall === 'front')
  if (spec.extras.porch && mainDoor?.at !== undefined) {
    const at = mainDoor.at, deck = solid(new THREE.Mesh(box(2.6, 0.15, 1.8), slab)); deck.position.set(at, 0.075, -0.9); ground.add(deck)
    const canopy = solid(new THREE.Mesh(box(2.8, 0.12, 2), roofMat)); canopy.position.set(at, 2.55, -0.9); ground.add(canopy)
    for (const dx of [-1.2, 1.2]) { const post = solid(new THREE.Mesh(box(0.12, 2.5, 0.12), trim)); post.position.set(at + dx, 1.25, -1.7); ground.add(post) }
  }
  if (spec.extras.fence) {
    const m = 2.5, x0 = -m, z0 = -m, x1 = W + m, z1 = D + m, fenceMat = mat('#d8d2c4', 0.8)
    const gate = mainDoor?.at !== undefined ? [mainDoor.at - 0.8, mainDoor.at + 0.8] as const : null
    const span = (ax: 'x' | 'z', line: number, a: number, b: number): void => {
      if (b - a < 0.05) return
      const rail = solid(new THREE.Mesh(ax === 'x' ? box(b - a, 0.08, 0.06) : box(0.06, 0.08, b - a), fenceMat))
      for (const h of [0.45, 1]) { const r = rail.clone(); r.position.set(ax === 'x' ? (a + b) / 2 : line, h, ax === 'x' ? line : (a + b) / 2); ground.add(r) }
      for (let t = a; t <= b + 0.01; t += 1.5) { const post = solid(new THREE.Mesh(box(0.1, 1.15, 0.1), fenceMat)); post.position.set(ax === 'x' ? Math.min(t, b) : line, 0.575, ax === 'x' ? line : Math.min(t, b)); ground.add(post) }
      walls[0]!.push(ax === 'x' ? { x0: a, y0: line, x1: b, y1: line } : { x0: line, y0: a, x1: line, y1: b })
    }
    if (gate) { span('x', z0, x0, gate[0]); span('x', z0, gate[1], x1) } else span('x', z0, x0, x1)
    span('x', z1, x0, x1); span('z', x0, z0, z1); span('z', x1, z0, z1)
    if (gate && spec.extras.gate) { const leaf = solid(new THREE.Mesh(box(1.6, 1, 0.05), mat('#3b3f45', 0.4, { metalness: 0.6 }))); const hinge = new THREE.Group(); hinge.position.set(gate[0], 0.05, z0); leaf.position.set(0.8, 0.5, 0); hinge.add(leaf); hinge.rotation.y = 1.3; ground.add(hinge) }
  }
  if (spec.extras.balcony && spec.storeys > 1) {
    const bw = Math.min(4, W - 1), y = H, deck = solid(new THREE.Mesh(box(bw, SLAB, 1.3), slab)); deck.position.set(W / 2, y - SLAB / 2, -0.65); floors[1]!.add(deck)
    const rail = solid(new THREE.Mesh(box(bw, 0.06, 0.06), trim)); rail.position.set(W / 2, y + 1, -1.28); floors[1]!.add(rail)
    walls[1]!.push({ x0: W / 2 - bw / 2, y0: -1.3, x1: W / 2 + bw / 2, y1: -1.3 })
  }
  void maxAnisotropy
  return { floors, ceilings, roof, surfaces, walls, dispose() { for (const d of disposables) d.dispose() } }
}
