/**
 * A check of the polygons a city map draws (water, land, play area): a polygon is an outer ring followed by its holes, each ring closed
 * (first point repeated), longitude then latitude. The renderer cuts a polygon into triangles; a ring that crosses itself, a hole that
 * crosses or touches its outer ring, a repeated vertex or a non-finite coordinate makes those triangles overlap and draws black streaks
 * across the map. The generators (scripts/geo/build-destination-detail.ts) use this to choose a safe simplification and a test runs it
 * on every generated city.
 */
import { ShapeUtils, Vector2 } from 'three'

export type Pt = readonly [number, number]
export type Poly = readonly (readonly Pt[])[]

const cross = (a: Pt, b: Pt, c: Pt): number => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
const same = (a: Pt, b: Pt): boolean => a[0] === b[0] && a[1] === b[1]

/** Signed area (positive when the ring runs counter-clockwise). */
export function signedArea(ring: readonly Pt[]): number {
  let sum = 0
  for (let i = 1; i < ring.length; i++) sum += ring[i - 1]![0] * ring[i]![1] - ring[i]![0] * ring[i - 1]![1]
  return sum / 2
}

function pointInRing(p: Pt, ring: readonly Pt[]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!, b = ring[j]!
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside
  }
  return inside
}

interface Seg { ring: number; index: number; a: Pt; b: Pt }

/** Why a polygon is not safe to triangulate, or null when it is. */
export function polygonProblem(poly: Poly): string | null {
  if (!poly.length) return 'no rings'
  const segs: Seg[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let r = 0; r < poly.length; r++) {
    const ring = poly[r]!
    if (ring.length < 4) return `ring ${r} has under four points`
    if (!same(ring[0]!, ring.at(-1)!)) return `ring ${r} is not closed`
    const seen = new Set<string>()
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!
      if (!Number.isFinite(p[0]) || !Number.isFinite(p[1])) return `ring ${r} has a coordinate that is not a number`
      if (i < ring.length - 1) {
        const key = `${p[0]},${p[1]}`
        if (seen.has(key)) return `ring ${r} repeats the vertex ${key}`
        seen.add(key)
      }
      minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1])
      if (i > 0) segs.push({ ring: r, index: i - 1, a: ring[i - 1]!, b: p })
    }
    if (signedArea(ring) === 0) return `ring ${r} has no area`
  }
  // A grid of segments, so only neighbours are compared.
  const side = Math.max(1, Math.min(512, Math.round(Math.sqrt(segs.length))))
  const w = (maxX - minX) || 1, h = (maxY - minY) || 1
  const cells = new Map<number, number[]>()
  const cellOf = (x: number, y: number): [number, number] => [Math.min(side - 1, Math.floor(((x - minX) / w) * side)), Math.min(side - 1, Math.floor(((y - minY) / h) * side))]
  segs.forEach((s, id) => {
    const [x0, y0] = cellOf(Math.min(s.a[0], s.b[0]), Math.min(s.a[1], s.b[1])), [x1, y1] = cellOf(Math.max(s.a[0], s.b[0]), Math.max(s.a[1], s.b[1]))
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const k = y * side + x, list = cells.get(k); if (list) list.push(id); else cells.set(k, [id]) }
  })
  const lengths = poly.map((ring) => ring.length - 1)
  for (const list of cells.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const s = segs[list[i]!]!, t = segs[list[j]!]!
      if (s.ring === t.ring) {
        const gap = Math.abs(s.index - t.index)
        if (gap === 1 || gap === lengths[s.ring]! - 1) continue
      }
      const d1 = cross(t.a, t.b, s.a), d2 = cross(t.a, t.b, s.b), d3 = cross(s.a, s.b, t.a), d4 = cross(s.a, s.b, t.b)
      if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return `rings ${s.ring} and ${t.ring} cross`
      // A vertex of one ring lying on a segment of another (a touch) also breaks the triangulation.
      if (s.ring !== t.ring || Math.abs(s.index - t.index) > 1) {
        const onSeg = (p: Pt, a: Pt, b: Pt): boolean => cross(a, b, p) === 0 && Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1])
        if (onSeg(s.a, t.a, t.b) || onSeg(s.b, t.a, t.b) || onSeg(t.a, s.a, s.b) || onSeg(t.b, s.a, s.b)) return `rings ${s.ring} and ${t.ring} touch`
      }
    }
  }
  const outer = poly[0]!, outerSign = Math.sign(signedArea(outer))
  for (let r = 1; r < poly.length; r++) {
    if (Math.sign(signedArea(poly[r]!)) === outerSign) return `hole ${r} runs the same way as its outer ring`
    if (!pointInRing(poly[r]![0]!, outer)) return `hole ${r} is not inside its outer ring`
    if (Math.abs(signedArea(poly[r]!)) >= Math.abs(signedArea(outer))) return `hole ${r} is not smaller than its outer ring`
  }
  return null
}

/** The first problem among a list of polygons, with its index, or null. */
export function firstPolygonProblem(polys: readonly Poly[]): string | null {
  for (let i = 0; i < polys.length; i++) { const problem = polygonProblem(polys[i]!); if (problem) return `polygon ${i}: ${problem}` }
  return null
}

/**
 * The renderer cuts a polygon into triangles with three.js's ear clipping, which can go wrong on a long, thin, many-sided shore even when the
 * polygon is simple (triangles that overlap or reach across land: a stripe of the wrong colour across the map). This cuts the polygon the same
 * way and compares the triangles' total area with the polygon's: a problem is named when they differ by more than half a percent.
 */
export function triangulationProblem(poly: Poly, project: (p: Pt) => Pt = (p) => p): string | null {
  // `project` maps a point to the map's own units, where the renderer cuts it (the shape of a failure depends on the coordinates).
  const open = (ring: readonly Pt[]): Vector2[] => ring.slice(0, -1).map((p) => { const [x, y] = project(p); return new Vector2(x, y) })
  const rings = poly.map(open)
  const triangles = ShapeUtils.triangulateShape(rings[0]!, rings.slice(1))
  const all = rings.flat()
  let sum = 0
  for (const [a, b, c] of triangles) { const p = all[a!]!, q = all[b!]!, r = all[c!]!; sum += Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) / 2 }
  const flat = (ring: readonly Pt[]): Pt[] => ring.map(project)
  const area = Math.abs(signedArea(flat(poly[0]!))) - poly.slice(1).reduce((s, hole) => s + Math.abs(signedArea(flat(hole))), 0)
  return Math.abs(sum - area) > Math.max(area * 0.005, 1e-12) ? `the triangles cover ${sum} where the polygon is ${area}` : null
}

/** The first polygon the renderer would not triangulate faithfully, with its index, or null. */
export function firstTriangulationProblem(polys: readonly Poly[], project?: (p: Pt) => Pt): string | null {
  for (let i = 0; i < polys.length; i++) { const problem = triangulationProblem(polys[i]!, project); if (problem) return `polygon ${i}: ${problem}` }
  return null
}
