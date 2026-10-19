/**
 * OWNER: spaces
 * WHERE PLAYERS' MODELS STAND IN A SPACE (docs/SPACES-3D.md, phase 2): a list of placements kept beside the space, never inside
 * the life or the group room, so the furniture rules are untouched. Pure: the server checks every saved layout with
 * `cleanLayout`, the 3D screen reads the same shapes.
 *
 * Units are metres from the plot's top-left corner (1 tile = 1 metre in the 3D view): x across, z down the plot, y up from the
 * floor the model stands on. `ry` is the turn in degrees, `s` a uniform scale.
 */

export const WORLD = Object.freeze({
  /** One furniture tile in the 3D view, in metres. */
  tile: 1,
  /** One storey, floor to floor, in metres. */
  storey: 3,
  /** Placements in one space. */
  placements: 40,
  /** Triangles of all placed models together (a model placed twice counts twice). */
  triangles: 1_200_000,
  scale: [0.05, 20] as const,
  /** How far outside the plot a model may stand (a tree in the yard, a car at the gate). */
  margin: 6,
  /** How high above its floor a model may hang. */
  lift: 12,
})

export interface Placement {
  /** This placement's own key (the same model can stand in a space many times). */
  k: string
  /** The model: its id, its owner and its bytes' hash (what the screen fetches). */
  m: string
  by: string
  hash: string
  x: number
  y: number
  z: number
  ry: number
  s: number
  floor: number
  /** Physics (phase 3): a loose model falls, rolls and can be pushed; otherwise it is fixed in place. */
  loose?: true
}
export interface SpaceLayout { models: Placement[]; at: number; by: string }

const KEY = /^[a-z0-9]{1,12}$/
const MODEL = /^m[0-9a-z]{9}$/
const HASH = /^[0-9a-f]{64}$/
const UUIDISH = /^[0-9a-f-]{36}$/
const num = (value: unknown, min: number, max: number): number | null => (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? Math.round(value * 1000) / 1000 : null)

/** The plot in metres: width (x), depth (z) and floors. */
export interface PlotSize { w: number; d: number; floors: number }

/** A model a player may place: the server's facts about it. */
export interface PlaceableModel { id: string; by: string; hash: string; triangles: number; hidden?: boolean }

export type LayoutCheck = { ok: true; models: Placement[]; triangles: number } | { ok: false; code: string; reason: string }

/**
 * Check a layout someone wants to save. `placeable(by, id)` answers what the server knows about a model (or null when it is gone);
 * `mayUse(by)` whether this editor may place that owner's models here (their own, or ones already in this space).
 */
export function cleanLayout(value: unknown, plot: PlotSize, placeable: (by: string, id: string) => PlaceableModel | null, mayUse: (by: string, id: string) => boolean, limits: { placements: number; triangles: number } = WORLD): LayoutCheck {
  const no = (code: string, reason: string): LayoutCheck => ({ ok: false, code, reason })
  if (!Array.isArray(value)) return no('invalid_layout', 'The layout could not be read.')
  if (value.length > limits.placements) return no('too_many', `A space holds at most ${limits.placements} of your models.`)
  const models: Placement[] = []
  const keys = new Set<string>()
  let triangles = 0
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return no('invalid_layout', 'The layout could not be read.')
    const r = raw as Record<string, unknown>
    const k = typeof r['k'] === 'string' && KEY.test(r['k']) ? r['k'] : null
    const m = typeof r['m'] === 'string' && MODEL.test(r['m']) ? r['m'] : null
    const by = typeof r['by'] === 'string' && UUIDISH.test(r['by']) ? r['by'] : null
    if (!k || !m || !by || keys.has(k)) return no('invalid_layout', 'The layout could not be read.')
    keys.add(k)
    const model = placeable(by, m)
    if (!model || model.hidden) return no('unknown_model', 'One of these models is gone or hidden. Remove it and save again.')
    if (!mayUse(by, m)) return no('not_yours', 'You can place only your own models.')
    const floor = typeof r['floor'] === 'number' && Number.isInteger(r['floor']) && r['floor'] >= 0 && r['floor'] < plot.floors ? r['floor'] : null
    const x = num(r['x'], -WORLD.margin, plot.w + WORLD.margin), z = num(r['z'], -WORLD.margin, plot.d + WORLD.margin)
    const y = num(r['y'], -1, WORLD.lift), ry = num(r['ry'], -3600, 3600), s = num(r['s'], WORLD.scale[0], WORLD.scale[1])
    if (floor === null || x === null || z === null || y === null || ry === null || s === null) return no('out_of_bounds', 'A model is outside the space or sized past the limits. Move it back and save again.')
    if (HASH.test(model.hash) === false) return no('unknown_model', 'One of these models is gone. Remove it and save again.')
    triangles += model.triangles
    models.push({ k, m, by, hash: model.hash, x, y, z, ry: ((ry % 360) + 360) % 360, s, floor, ...(r['loose'] === true ? { loose: true as const } : {}) })
  }
  if (triangles > limits.triangles) return no('too_heavy', `These models add up to ${triangles.toLocaleString('en')} triangles. A space can show ${limits.triangles.toLocaleString('en')}: remove some or use lighter models.`)
  return { ok: true, models, triangles }
}

/** A short key for a new placement. */
export const placementKey = (n: number): string => `p${(n % 0xfffffff).toString(36)}`
