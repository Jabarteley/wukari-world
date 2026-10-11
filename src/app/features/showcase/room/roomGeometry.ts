// The room models carry, on some walls, two flat sheets at the same place: the wall's own picture and a plain swatch of colour. Drawn
// together they fight for the same pixels and the wall flickers between the two. This finds the swatch sheets (the ones of the pair that
// show the smaller part of the picture for the space they cover) so the scene can leave them out. Pure arithmetic on numbers: no three.

export type V3 = readonly [number, number, number]
export type V2 = readonly [number, number]
export interface Tri { p: readonly [V3, V3, V3]; uv: readonly [V2, V2, V2] }

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const length = (a: V3): number => Math.hypot(a[0], a[1], a[2])
const uvArea = (t: Tri): number => Math.abs((t.uv[1][0] - t.uv[0][0]) * (t.uv[2][1] - t.uv[0][1]) - (t.uv[2][0] - t.uv[0][0]) * (t.uv[1][1] - t.uv[0][1])) / 2

/** A flat piece of the model: its area, the side it faces and how far its plane is from the origin. Null for a sliver. */
function plane(t: Tri): { area: number; key: string } | null {
  const n = cross(sub(t.p[1], t.p[0]), sub(t.p[2], t.p[0])), l = length(n)
  if (l < 1e-9) return null
  // Which way a sheet faces does not matter here (a model drawn from both sides shows both): the plane is the same either way round.
  const flip = n[0] < -1e-6 * l || (Math.abs(n[0]) <= 1e-6 * l && (n[1] < -1e-6 * l || (Math.abs(n[1]) <= 1e-6 * l && n[2] < 0))) ? -1 : 1
  const unit: V3 = [(flip * n[0]) / l, (flip * n[1]) / l, (flip * n[2]) / l]
  const d = unit[0] * t.p[0][0] + unit[1] * t.p[0][1] + unit[2] * t.p[0][2]
  const r = (value: number, step: number): number => Math.round(value / step)
  return { area: l / 2, key: `${r(unit[0], 0.05)},${r(unit[1], 0.05)},${r(unit[2], 0.05)}:${r(d, 0.02)}` }
}

/**
 * Indexes of the triangles to leave out: large flat pieces that share a plane with a larger-picture piece
 * and show far less of the picture for the same area (a plain swatch under a picture). Small pieces are never touched.
 */
export function coveredTriangles(tris: readonly Tri[], minArea = 1): Set<number> {
  const groups = new Map<string, { at: number; area: number; density: number }[]>()
  tris.forEach((tri, at) => {
    const flat = plane(tri)
    if (!flat || flat.area < minArea) return
    const entry = { at, area: flat.area, density: uvArea(tri) / flat.area }
    const found = groups.get(flat.key)
    if (found) found.push(entry); else groups.set(flat.key, [entry])
  })
  const out = new Set<number>()
  for (const group of groups.values()) {
    const best = Math.max(...group.map((entry) => entry.density))
    // Only where the pieces really differ: a swatch shows a small fraction of the picture a real wall piece shows.
    for (const entry of group) if (best > 0 && entry.density < best * 0.2) out.add(entry.at)
  }
  return out
}
