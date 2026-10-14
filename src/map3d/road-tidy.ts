/**
 * OWNER: world
 * Tidy a city's source road rows before they are smoothed and drawn (src/map3d/roads.ts, city-build.ts).
 * The generated rows are single OpenStreetMap ways: a main road arrives as many short pieces, dual
 * carriageways as two ribbons a few metres apart, and pieces whose ends miss each other by 10–100 m after
 * simplification and quantisation. Drawn one by one, that reads as stubs, gaps, doubled kerbs and kinks.
 *
 *   tidyRoads(roads, options?) → roads
 *     1. drops a road that runs within `twin` of a bigger one along nearly all its length (the other carriageway);
 *     2. snaps every road end to another road within `snap`: onto its end, or onto its line with a new vertex there;
 *     3. joins roads of one class that meet end to end and nothing else, so each is one smooth ribbon;
 *     4. drops short stubs with a loose end, and short pieces loose at both ends.
 * Bridges are kept as they are (their ends still take the roads that reach them). Pure and deterministic;
 * units are map units (100 m); a few milliseconds for a city of 700 rows.
 */
import type { PackRoad, Point2 } from './types.ts'

export interface TidyOptions { snap?: number; twin?: number; stub?: number }

type Line = { road: PackRoad; points: Point2[]; length: number; gone?: boolean; box: [number, number, number, number] }
const CELL = 2
const lengthOf = (points: readonly Point2[]) => { let sum = 0; for (let i = 1; i < points.length; i++) sum += Math.hypot(points[i]![0] - points[i - 1]![0], points[i]![1] - points[i - 1]![1]); return sum }
const rank = (road: PackRoad) => (road.trunk ? 2 : road.major ? 1 : 0)
const same = (a: Point2, b: Point2) => a[0] === b[0] && a[1] === b[1]
const keyOf = (p: Point2) => `${p[0]},${p[1]}`
const boxOf = (points: readonly Point2[]): Line['box'] => {
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity
  for (const [x, z] of points) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z }
  return [x0, z0, x1, z1]
}
const within = (p: Point2, box: Line['box'], margin: number) => p[0] >= box[0] - margin && p[0] <= box[2] + margin && p[1] >= box[1] - margin && p[1] <= box[3] + margin
/** True where the road at b turns back on itself (more than about 110 degrees) between a→b and b→c. */
const hairpin = (a: Point2, b: Point2, c: Point2) => (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]) < -0.35 * Math.hypot(b[0] - a[0], b[1] - a[1]) * Math.hypot(c[0] - b[0], c[1] - b[1])
/** Nearest point on a→b to p, and how far along (0–1). */
function near(p: Point2, a: Point2, b: Point2): { t: number; x: number; z: number; d: number } {
  const dx = b[0] - a[0], dz = b[1] - a[1], span = dx * dx + dz * dz || 1
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / span)), x = a[0] + dx * t, z = a[1] + dz * t
  return { t, x, z, d: Math.hypot(p[0] - x, p[1] - z) }
}

export function tidyRoads(input: readonly PackRoad[], { snap = 1, twin = 0.35, stub = 2.5 }: TidyOptions = {}): PackRoad[] {
  // Clean: no repeated vertices.
  let lines: Line[] = input.map(road => {
    const points = road.points.filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1]![0], p[1] - all[i - 1]![1]) > 0.02).map((p): Point2 => [p[0], p[1]])
    return { road, points, length: lengthOf(points), box: boxOf(points) }
  }).filter(line => line.points.length > 1)
  const ground = (line: Line) => !line.road.bridge
  const byId = (a: Line, b: Line) => (a.road.id < b.road.id ? -1 : a.road.id > b.road.id ? 1 : 0)

  // 1. The other carriageway: a road that lies within `twin` of a bigger (or longer) kept road along 85% of its length is drawn by that road.
  const cells = new Map<number, Point2[][]>()
  const cellKey = (x: number, z: number) => x * 65536 + z
  const index = (line: Line) => {
    for (let i = 1; i < line.points.length; i++) {
      // The cells along the segment (a sample every half cell); a question looks at the 3 × 3 cells round it, so none is missed.
      const a = line.points[i - 1]!, b = line.points[i]!, segment = [a, b], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (CELL / 2))
      let last = NaN
      for (let s = 0; s <= n; s++) {
        const k = cellKey(Math.floor((a[0] + (b[0] - a[0]) * s / (n || 1)) / CELL), Math.floor((a[1] + (b[1] - a[1]) * s / (n || 1)) / CELL))
        if (k === last) continue
        last = k
        const list = cells.get(k); if (list) list.push(segment); else cells.set(k, [segment])
      }
    }
  }
  const covered = (p: Point2) => {
    const cx = Math.floor(p[0] / CELL), cz = Math.floor(p[1] / CELL)
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) for (const [a, b] of cells.get(cellKey(x, z)) ?? []) if (near(p, a!, b!).d < twin) return true
    return false
  }
  for (const line of [...lines].sort((a, b) => rank(b.road) - rank(a.road) || b.length - a.length || byId(a, b))) {
    if (ground(line)) {
      let samples = 0, hits = 0
      for (let i = 1; i < line.points.length; i++) {
        const a = line.points[i - 1]!, b = line.points[i]!, n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])))
        for (let s = 0; s < n; s++) { samples++; if (covered([a[0] + (b[0] - a[0]) * (s + 0.5) / n, a[1] + (b[1] - a[1]) * (s + 0.5) / n])) hits++ }
      }
      if (hits >= samples * 0.85) { line.gone = true; continue }
    }
    if (!line.road.bridge) index(line)
  }
  lines = lines.filter(line => !line.gone)

  // 2. Snap the ends: onto another road's end when one is within reach, else onto its line (a T-junction, with a vertex added there).
  const join = (line: Line, end: 0 | 1) => {
    const p = end ? line.points[line.points.length - 1]! : line.points[0]!
    const others = lines.filter(other => other !== line && within(p, other.box, snap))
    if (others.some(other => other.points.some(q => same(q, p)))) return // already on another road
    let best: { line: Line; i: number; at: Point2; d: number; vertex: boolean } | null = null
    for (const other of others) for (const q of [other.points[0]!, other.points[other.points.length - 1]!]) {
      const d = Math.hypot(q[0] - p[0], q[1] - p[1])
      if (d <= snap && (!best || d < best.d)) best = { line: other, i: -1, at: q, d, vertex: true }
    }
    if (!best) for (const other of others) for (let i = 1; i < other.points.length; i++) {
      const hit = near(p, other.points[i - 1]!, other.points[i]!)
      if (hit.d > snap || (best && hit.d >= best.d)) continue
      // Within a hair of a vertex, that vertex: no sliver of a segment.
      const a = other.points[i - 1]!, b = other.points[i]!, onA = Math.hypot(hit.x - a[0], hit.z - a[1]) < 0.05, onB = !onA && Math.hypot(hit.x - b[0], hit.z - b[1]) < 0.05
      best = { line: other, i, at: onA ? a : onB ? b : [hit.x, hit.z], d: hit.d, vertex: onA || onB }
    }
    if (!best) return
    if (!best.vertex) {
      if (best.line.road.bridge) return // a bridge deck takes no new vertex: the road stops where it is
      best.line.points.splice(best.i, 0, best.at)
    }
    const points = end ? line.points.reverse() : line.points
    points[0] = best.at
    // The moved end must not fold the road back on itself: the vertex next to it goes instead.
    while (points.length > 2 && hairpin(points[0]!, points[1]!, points[2]!)) points.splice(1, 1)
    if (end) points.reverse()
    line.box = boxOf(line.points)
  }
  for (const line of [...lines].sort((a, b) => rank(a.road) - rank(b.road) || a.length - b.length || byId(a, b))) if (ground(line)) { join(line, 0); join(line, 1) }
  for (const line of lines) line.length = lengthOf(line.points)

  // Every vertex key: the road ends there, and how many roads pass through it.
  const census = () => {
    const ends = new Map<string, Line[]>(), through = new Set<string>()
    for (const line of lines) line.points.forEach((p, i) => {
      const k = keyOf(p)
      if (i === 0 || i === line.points.length - 1) { const list = ends.get(k); if (list) list.push(line); else ends.set(k, [line]) } else through.add(k)
    })
    return { ends, through }
  }

  // 3. Join roads of one class that meet end to end and nothing else: walk each chain once.
  const merge = () => {
    const { ends, through } = census(), used = new Set<Line>()
    /** The road that carries on from the end `p` of the chain, where `q` is the chain's vertex before `p`; not one that turns straight back. */
    const next = (line: Line, p: Point2, q: Point2): Line | null => {
      const k = keyOf(p), list = ends.get(k)
      if (!list || list.length !== 2 || through.has(k)) return null
      const other = list[0] === line ? list[1]! : list[0]!
      if (other === line || used.has(other) || !ground(other) || rank(other.road) !== rank(line.road)) return null
      const on = same(other.points[0]!, p) ? other.points[1]! : other.points[other.points.length - 2]!
      return hairpin(q, p, on) ? null : other
    }
    const out: Line[] = []
    for (const line of [...lines].sort(byId)) {
      if (used.has(line)) continue
      used.add(line)
      if (!ground(line)) { out.push(line); continue }
      let points = line.points, chain = [line]
      for (let other = next(line, points[points.length - 1]!, points[points.length - 2]!); other; other = next(other, points[points.length - 1]!, points[points.length - 2]!)) {
        used.add(other); chain.push(other)
        points = [...points, ...(same(other.points[0]!, points[points.length - 1]!) ? other.points : [...other.points].reverse()).slice(1)]
      }
      for (let other = next(line, points[0]!, points[1]!); other; other = next(other, points[0]!, points[1]!)) {
        used.add(other); chain.push(other)
        points = [...(same(other.points[other.points.length - 1]!, points[0]!) ? other.points : [...other.points].reverse()), ...points.slice(1)]
      }
      // The longest piece names the joined road.
      const lead = chain.reduce((a, b) => (b.length > a.length ? b : a))
      out.push({ road: lead.road, points, length: lengthOf(points), box: boxOf(points) })
    }
    lines = out
  }
  merge()

  // 4. Stubs: short and loose at one end, or not much longer and loose at both.
  for (let pass = 0; pass < 2; pass++) {
    const { ends, through } = census()
    const loose = (p: Point2) => (ends.get(keyOf(p))?.length ?? 0) < 2 && !through.has(keyOf(p))
    lines = lines.filter(line => {
      if (!ground(line)) return true
      const free = Number(loose(line.points[0]!)) + Number(loose(line.points[line.points.length - 1]!))
      return !((free && line.length < stub) || (free === 2 && line.length < stub * 2))
    })
    merge()
  }
  return lines.map(line => ({ ...line.road, points: line.points }))
}
