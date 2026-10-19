/**
 * OWNER: spaces
 * A PHOTO AS A PLACE (docs/WORLDS.md, phase 8): a depth map of one photo becomes a surface you can walk on and into.
 *
 * The depth model (Depth Anything V2 Small) answers relative inverse depth: near is large, far is small, with an unknown scale and
 * shift. Here, with nothing but the numbers:
 *  1. The shift is chosen so the bottom of the picture (usually the floor or the street) is flattest: a plane through it.
 *  2. That plane becomes the ground: the scene is turned so it is level and moved so it lies at y = 0.
 *  3. The scale makes the camera stand at eye height above it, so a room is the size of a room.
 *  4. Anything further than PHOTO.far is pulled in to it along its ray: the sky becomes a backdrop.
 *  5. A grid of the depth map becomes triangles, all joined: where something stands in front of something else the surface
 *     stretches between them. Seen from where the photo was taken the stretch is edge-on; a hole there would show the world's own
 *     ground through the furniture, and the stretch is a wall that keeps visitors out of what the photo never saw.
 *
 * The camera's spot on the ground is the model's origin, looking down -Z. Pure: no DOM, no three.js; tested in Node.
 */

export const PHOTO = Object.freeze({
  /** Metres from the ground to the eye of whoever took the photo. */
  eye: 1.55,
  /** The longer side of the picture spans this many degrees (a phone's main camera). */
  fovLong: 68,
  /** Nothing is further than this, in metres: the sky and far buildings become a backdrop here. */
  far: 55,
  /** Grid points along the picture's longer side: the surface you see. */
  grid: 220,
  /** Grid points along the longer side of the surface you walk on: coarser and smoothed. */
  solidGrid: 72,
  /** Metres: a point this close to the fitted ground is put on it. */
  flat: 0.12,
  /** The ground sits a little above the world's own ground, so the two never flicker. */
  lift: 0.03,
  /** The steepest a fitted ground may lean, in degrees, before the photo is taken as level instead. */
  maxTilt: 35,
})

export interface DepthMap {
  /** Inverse depth, row by row from the top, `width * height` values. */
  values: Float32Array
  width: number
  height: number
}

export interface PhotoMesh {
  /** x, y, z per vertex, metres; the camera's foot at the origin, looking down -Z. */
  positions: Float32Array
  /** u, v per vertex, from the picture's top-left. */
  uvs: Float32Array
  indices: Uint32Array
  triangles: number
  /** What blocks a visitor: the triangles of a coarser, smoothed grid that are not flat on the ground (the 3D view draws the
   *  fine grid and collides with this; visitors walk on the world's own ground under the photo's). */
  solid: { positions: Float32Array; indices: Uint32Array }
  /** How the ground was found: `fitted` from the picture, `level` assumed when the picture shows no clear ground. */
  ground: 'fitted' | 'level'
  /** Where to start: on the ground at the near edge of what the photo shows (the camera never sees the floor under itself). */
  start: [number, number]
  /** The scene's extent, metres: x from min to max, z from min (far) to max (near). */
  min: [number, number, number]
  max: [number, number, number]
}

type V3 = [number, number, number]

/** The value at fractional (x, y) of the map, bilinear. */
function sample(map: DepthMap, x: number, y: number): number {
  const { width: w, height: h, values } = map
  const fx = Math.min(Math.max(x, 0), w - 1), fy = Math.min(Math.max(y, 0), h - 1)
  const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1)
  const tx = fx - x0, ty = fy - y0
  const a = values[y0 * w + x0]!, b = values[y0 * w + x1]!, c = values[y1 * w + x0]!, d = values[y1 * w + x1]!
  return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty
}

/** The map scaled to 0..1 between its 1st and 99th percentiles (a few wild pixels do not set the range). */
export function normalise(map: DepthMap): DepthMap {
  const sorted = Float32Array.from(map.values).sort()
  const lo = sorted[Math.floor(sorted.length * 0.01)] ?? 0, hi = sorted[Math.floor(sorted.length * 0.99)] ?? 1
  const span = hi - lo > 1e-6 ? hi - lo : 1
  const values = new Float32Array(map.values.length)
  for (let i = 0; i < values.length; i++) values[i] = Math.min(1, Math.max(0, (map.values[i]! - lo) / span))
  return { values, width: map.width, height: map.height }
}

/** A point of the picture at (u, v) in 0..1, at depth z, in the camera's frame (y up, looking down -Z). */
function unproject(u: number, v: number, z: number, aspect: number, tanHalf: number): V3 {
  // tanHalf is for the longer side; the shorter one is narrower by the aspect.
  const tx = aspect >= 1 ? tanHalf : tanHalf * aspect, ty = aspect >= 1 ? tanHalf / aspect : tanHalf
  return [(u * 2 - 1) * tx * z, -(v * 2 - 1) * ty * z, -z]
}

/** The least-squares plane y = a·x + b·z + c through most of the points. Null when it is degenerate. */
export function fitGround(points: readonly V3[]): { a: number; b: number; c: number; spread: number } | null {
  const solve = (list: readonly V3[]): { a: number; b: number; c: number } | null => {
    let sxx = 0, sxz = 0, szz = 0, sx = 0, sz = 0, sxy = 0, szy = 0, sy = 0
    const n = list.length
    for (const [x, y, z] of list) { sxx += x * x; sxz += x * z; szz += z * z; sx += x; sz += z; sxy += x * y; szy += z * y; sy += y }
    // Normal equations, 3×3, by Cramer's rule.
    const m = [[sxx, sxz, sx], [sxz, szz, sz], [sx, sz, n]], r = [sxy, szy, sy]
    const det = (q: number[][]): number => q[0]![0]! * (q[1]![1]! * q[2]![2]! - q[1]![2]! * q[2]![1]!) - q[0]![1]! * (q[1]![0]! * q[2]![2]! - q[1]![2]! * q[2]![0]!) + q[0]![2]! * (q[1]![0]! * q[2]![1]! - q[1]![1]! * q[2]![0]!)
    const d = det(m)
    if (!Number.isFinite(d) || Math.abs(d) < 1e-12) return null
    const col = (i: number): number[][] => m.map((row, k) => row.map((value, j) => (j === i ? r[k]! : value)))
    return { a: det(col(0)) / d, b: det(col(1)) / d, c: det(col(2)) / d }
  }
  if (points.length < 12) return null
  const off = (p: V3, f: { a: number; b: number; c: number }): number => Math.abs(p[1] - (f.a * p[0] + f.b * p[2] + f.c))
  // Refitted three times, each time without the points furthest from it (a chair or a car standing on the ground).
  let fit = solve(points), kept: readonly V3[] = points
  for (const share of [0.75, 0.6, 0.5]) {
    if (!fit) return null
    const from = fit
    kept = [...points].sort((p, q) => off(p, from) - off(q, from)).slice(0, Math.ceil(points.length * share))
    fit = solve(kept)
  }
  if (!fit) return null
  const residuals = kept.map((p) => off(p, fit)).sort((x, y) => x - y)
  return { ...fit, spread: residuals[Math.floor(residuals.length / 2)] ?? 0 }
}

/** Rotation taking unit vector `from` onto +Y (Rodrigues), as a function on points. */
function levelBy(from: V3): (p: V3) => V3 {
  const [x, y, z] = from
  // Axis = from × up, angle = acos(from · up).
  const ax = -z, az = x, s = Math.hypot(ax, az), c = y
  if (s < 1e-9) return c > 0 ? (p) => p : (p) => [p[0], -p[1], -p[2]]
  const kx = ax / s, kz = az / s
  return ([px, py, pz]) => {
    // v·cos + (k×v)·sin + k(k·v)(1−cos), with k = (kx, 0, kz).
    const kv = kx * px + kz * pz
    const cx = -kz * py, cy = kz * px - kx * pz, cz = kx * py
    return [px * c + cx * s + kx * kv * (1 - c), py * c + cy * s, pz * c + cz * s + kz * kv * (1 - c)]
  }
}

/** The shifts tried for inverse depth: small ones make far things much further than near ones. */
const SHIFTS = Array.from({ length: 16 }, (_, i) => 0.02 * Math.pow(1.4, i))

/** The photo's depth map, as a surface to walk on: see the top of the file. `fovLong`: degrees across the longer side, from the photo's EXIF when it says. */
export function photoMesh(raw: DepthMap, aspect: number, fovLong: number = PHOTO.fovLong): PhotoMesh {
  const map = normalise(raw)
  const tanHalf = Math.tan(((Math.min(120, Math.max(30, fovLong)) / 2) * Math.PI) / 180)
  const depthAt = (n: number, shift: number): number => 1 / (n + shift)

  // 1. The bottom quarter of the picture, its middle four fifths across: where the ground usually is.
  const probe: { u: number; v: number; n: number }[] = []
  for (let j = 0; j < 14; j++) for (let i = 0; i < 24; i++) {
    const u = 0.1 + (0.8 * (i + 0.5)) / 24, v = 0.75 + (0.24 * (j + 0.5)) / 14
    probe.push({ u, v, n: sample(map, u * (map.width - 1), v * (map.height - 1)) })
  }
  // A floor's inverse depth is linear down the picture, so the floor comes out flat at every shift, only leaning more or less
  // towards the camera. The shift is the one that makes it level front to back: photos are taken about level. Its sideways lean
  // (a phone held a little crooked) is kept, and levelled below.
  type Tried = { shift: number; fit: NonNullable<ReturnType<typeof fitGround>>; flat: number; pitch: number }
  const attempt = (shift: number): Tried | null => {
    const points = probe.map(({ u, v, n }) => unproject(u, v, depthAt(n, shift), aspect, tanHalf))
    const fit = fitGround(points)
    if (!fit || !(fit.c < 0)) return null
    // Flatness against the distance to it: the same at any scale.
    return { shift, fit, flat: fit.spread / Math.abs(fit.c), pitch: Math.abs(fit.b) }
  }
  const flatEnough = (t: Tried | null): t is Tried => t !== null && t.flat < 0.05 && Math.abs(t.fit.a) < Math.tan((PHOTO.maxTilt * Math.PI) / 180)
  let best: Tried | null = null
  for (const shift of SHIFTS) { const tried = attempt(shift); if (flatEnough(tried) && (!best || tried.pitch < best.pitch)) best = tried }
  if (best) {
    // Then closer, between the neighbours of the best (golden section on a log scale).
    let lo = Math.log(best.shift / 1.4), hi = Math.log(best.shift * 1.4)
    const pitchAt = (x: number): number => { const t = attempt(Math.exp(x)); return flatEnough(t) ? t.pitch : Infinity }
    for (let i = 0; i < 24; i++) {
      const m1 = hi - (hi - lo) / 1.618, m2 = lo + (hi - lo) / 1.618
      if (pitchAt(m1) < pitchAt(m2)) hi = m2; else lo = m1
    }
    const refined = attempt(Math.exp((lo + hi) / 2))
    if (flatEnough(refined) && refined.pitch <= best.pitch) best = refined
  }
  // 2. The ground's upward normal, and how far below the eye it is.
  let shift = 0.25, ground: PhotoMesh['ground'] = 'level', up: V3 = [0, 1, 0], height = 0
  if (best) {
    const { a, b, c } = best.fit
    const len = Math.hypot(a, 1, b), normal: V3 = [-a / len, 1 / len, -b / len]
    const tilt = (Math.acos(Math.min(1, normal[1])) * 180) / Math.PI
    if (tilt <= PHOTO.maxTilt) { shift = best.shift; up = normal; height = Math.abs(c) / len; ground = 'fitted' }
  }
  if (ground === 'level') {
    // No clear ground: level, and the median of the picture three metres away.
    const sorted = Float32Array.from(map.values).sort()
    height = depthAt(sorted[Math.floor(sorted.length / 2)] ?? 0.5, shift) * (PHOTO.eye / 3)
  }
  // 3. Metres: the eye is PHOTO.eye above the ground.
  const scale = PHOTO.eye / height
  const level = levelBy(up)

  // 4 and 5. The grid: one fine to see, one coarse and smoothed to walk on.
  const grid = (long: number, from: DepthMap): { positions: Float32Array; uvs: Float32Array; indices: Uint32Array; cols: number; rows: number } => {
    const cols = aspect >= 1 ? long : Math.max(8, Math.round(long * aspect))
    const rows = aspect >= 1 ? Math.max(8, Math.round(long / aspect)) : long
    const positions = new Float32Array(cols * rows * 3), uvs = new Float32Array(cols * rows * 2)
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const u = q / (cols - 1), v = r / (rows - 1), k = r * cols + q
      const n = sample(from, u * (from.width - 1), v * (from.height - 1))
      let p = unproject(u, v, depthAt(n, shift) * scale, aspect, tanHalf)
      const distance = Math.hypot(p[0], p[1], p[2])
      if (distance > PHOTO.far) p = [p[0] * (PHOTO.far / distance), p[1] * (PHOTO.far / distance), p[2] * (PHOTO.far / distance)]
      const [x, y, z] = level(p)
      // What is within a hand of the ground is the ground: flat, so the noise of the depth model is not a field of little steps.
      // Nothing is below it (a dip is noise, or a step down the photo cannot show): visitors walk on the world's own ground.
      const height = y + PHOTO.eye
      positions.set([x, Math.max(0, ground === 'fitted' && Math.abs(height) < PHOTO.flat ? 0 : height) + PHOTO.lift, z], k * 3)
      uvs.set([u, v], k * 2)
    }
    const indices = new Uint32Array((rows - 1) * (cols - 1) * 6)
    let at = 0
    for (let r = 0; r < rows - 1; r++) for (let q = 0; q < cols - 1; q++) {
      const a = r * cols + q, b = a + 1, c = a + cols, d = c + 1
      // Wound so the faces look back at the camera.
      indices.set([a, c, b, b, c, d], at); at += 6
    }
    return { positions, uvs, indices, cols, rows }
  }
  const fine = grid(PHOTO.grid, map), coarse = grid(PHOTO.solidGrid, blur(map, 2))
  // What stands in the way: every triangle of the coarse grid that is not flat on the ground (the ground is the world's own).
  const onGround = Math.fround(PHOTO.lift), standsUp = (i: number): boolean => coarse.positions[i * 3 + 1]! !== onGround
  const blocking: number[] = []
  for (let t = 0; t < coarse.indices.length; t += 3) {
    const a = coarse.indices[t]!, b = coarse.indices[t + 1]!, c = coarse.indices[t + 2]!
    if (standsUp(a) || standsUp(b) || standsUp(c)) blocking.push(a, b, c)
  }
  // One more point, unused by any triangle, at the world's ground under the camera: the 3D view stands a model on its lowest
  // point, and this keeps the photo's ground just above the world's (they would flicker in the same plane).
  const solidPositions = new Float32Array(coarse.positions.length + 3)
  solidPositions.set(coarse.positions)
  const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity]
  for (let k = 0; k < fine.positions.length; k += 3) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, fine.positions[k + i]!); max[i] = Math.max(max[i]!, fine.positions[k + i]!) }
  // The middle of the bottom row is the nearest ground the photo shows; start half a metre onto it.
  const bottom = ((fine.rows - 1) * fine.cols + Math.floor(fine.cols / 2)) * 3
  const nearZ = Math.min(-0.5, fine.positions[bottom + 2]! - 0.5)
  const start: [number, number] = ground === 'fitted' ? [fine.positions[bottom]!, nearZ] : [0, 0]
  return {
    positions: fine.positions, uvs: fine.uvs, indices: fine.indices, triangles: fine.indices.length / 3,
    solid: { positions: solidPositions, indices: Uint32Array.from(blocking) }, ground, start, min, max,
  }
}

/** The map, each value the mean of its neighbours `radius` around (twice, a near-Gaussian): the walkable surface is smooth. */
function blur(map: DepthMap, radius: number): DepthMap {
  const { width: w, height: h } = map
  let from = map.values
  for (let pass = 0; pass < 2; pass++) {
    const across = new Float32Array(w * h), out = new Float32Array(w * h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, count = 0
      for (let d = -radius; d <= radius; d++) { const xx = x + d; if (xx >= 0 && xx < w) { sum += from[y * w + xx]!; count++ } }
      across[y * w + x] = sum / count
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let sum = 0, count = 0
      for (let d = -radius; d <= radius; d++) { const yy = y + d; if (yy >= 0 && yy < h) { sum += across[yy * w + x]!; count++ } }
      out[y * w + x] = sum / count
    }
    from = out
  }
  return { values: from, width: w, height: h }
}
