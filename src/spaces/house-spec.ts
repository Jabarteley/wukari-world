/**
 * OWNER: spaces
 * A HOUSE DESCRIPTION (docs/HOUSE-FROM-PHOTOS.md): what a player's own AI writes after reading photos of their real house, and what the
 * game builds from it with its own clean walls (src/spaces/world/spec-house.ts). Also what the Blender script of the house skill reads
 * (public/skills/allworld-house/scripts/build_house.py), so one description gives the same house in Blender and in the game.
 *
 * Metres, from the front-left corner of the house at ground level: x across the front (0 to width), z from the front wall to the back
 * (0 to depth), y up. The front wall is at z = 0 and faces the street. Pure: the server checks every description with `cleanHouseSpec`.
 */

export const HOUSE_SPEC = Object.freeze({
  storeys: 3, width: [3, 30] as const, depth: [3, 30] as const, storeyHeight: [2.4, 4.5] as const,
  rooms: 40, doors: 60, windows: 120, stairs: 3, name: 30,
})
export const WALLS = ['front', 'back', 'left', 'right', 'inner'] as const
export type Wall = (typeof WALLS)[number]
export const ROOFS = ['flat', 'gable', 'hip'] as const
export type RoofShape = (typeof ROOFS)[number]

export interface SpecRoom { name: string; floor: number; x: number; z: number; w: number; d: number; floorColor?: string }
/** A door or a window. On an outside wall, `at` is metres along it from its left end seen from outside; on an inner wall, (x, z) is its middle. */
export interface SpecOpening { floor: number; wall: Wall; at?: number; x?: number; z?: number; width: number; height?: number; sill?: number; main?: boolean; color?: string }
export interface SpecStairs { floor: number; x: number; z: number; w: number; d: number; up: 'x' | '-x' | 'z' | '-z' }
export interface HouseSpecV1 {
  v: 1
  name?: string
  storeys: number
  width: number
  depth: number
  storeyHeight: number
  walls: { color: string; inner?: string; trim?: string }
  roof: { shape: RoofShape; color: string; pitch?: number }
  rooms: SpecRoom[]
  doors: SpecOpening[]
  windows: SpecOpening[]
  stairs: SpecStairs[]
  extras: { porch?: boolean; fence?: boolean; gate?: boolean; balcony?: boolean }
}

export type SpecCheck = { ok: true; spec: HouseSpecV1; notes: string[] } | { ok: false; code: string; reason: string }

const HEX = /^#[0-9a-f]{6}$/i
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown, lo: number, hi: number): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(Math.min(hi, Math.max(lo, v)) * 100) / 100 : null)
const hex = (v: unknown, fallback: string): string => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback)
const oneLine = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** The length of an outside wall. */
export const wallLength = (spec: Pick<HouseSpecV1, 'width' | 'depth'>, wall: Wall): number => (wall === 'front' || wall === 'back' ? spec.width : spec.depth)

/**
 * Check a description: every number clamped into the house, every colour a hex, unknown fields dropped, and too-many lists cut.
 * It refuses only what cannot be a house; small mistakes are fixed and listed in `notes` for the player.
 */
export function cleanHouseSpec(value: unknown): SpecCheck {
  const no = (code: string, reason: string): SpecCheck => ({ ok: false, code, reason })
  if (!isRecord(value)) return no('invalid_spec', 'The house description could not be read. It must be the JSON object the skill describes.')
  if (value['v'] !== 1) return no('invalid_spec', 'The house description must say "v": 1.')
  const notes: string[] = []
  const storeys = num(value['storeys'], 1, HOUSE_SPEC.storeys), width = num(value['width'], ...HOUSE_SPEC.width), depth = num(value['depth'], ...HOUSE_SPEC.depth)
  if (storeys === null || width === null || depth === null) return no('invalid_spec', 'The house needs "storeys", "width" and "depth" as numbers (metres).')
  const floors = Math.round(storeys)
  const storeyHeight = num(value['storeyHeight'] ?? 3, ...HOUSE_SPEC.storeyHeight) ?? 3
  const walls = isRecord(value['walls']) ? value['walls'] : {}
  const roof = isRecord(value['roof']) ? value['roof'] : {}
  const shape = ROOFS.includes(roof['shape'] as RoofShape) ? roof['shape'] as RoofShape : 'flat'
  const floorOf = (v: unknown): number => Math.min(floors - 1, Math.max(0, Math.round(typeof v === 'number' ? v : 0)))
  const list = (key: string, max: number): Record<string, unknown>[] => {
    const raw = Array.isArray(value[key]) ? (value[key] as unknown[]).filter(isRecord) : []
    if (raw.length > max) notes.push(`Only the first ${max} ${key} were kept.`)
    return raw.slice(0, max)
  }
  const rooms: SpecRoom[] = []
  for (const r of list('rooms', HOUSE_SPEC.rooms)) {
    const x = num(r['x'], 0, width), z = num(r['z'], 0, depth)
    if (x === null || z === null) continue
    const w = num(r['w'], 0.8, width - x), d = num(r['d'], 0.8, depth - z)
    if (w === null || d === null || x + 0.8 > width || z + 0.8 > depth) { notes.push(`The room "${oneLine(r['name'], 20) || 'unnamed'}" did not fit the house and was left out.`); continue }
    rooms.push({ name: oneLine(r['name'], HOUSE_SPEC.name) || 'Room', floor: floorOf(r['floor']), x, z, w, d, ...(r['floorColor'] !== undefined ? { floorColor: hex(r['floorColor'], '#b08a5a') } : {}) })
  }
  const opening = (r: Record<string, unknown>, door: boolean): SpecOpening | null => {
    const wall = WALLS.includes(r['wall'] as Wall) ? r['wall'] as Wall : null
    if (!wall) return null
    const floor = floorOf(r['floor'])
    const width = num(r['width'] ?? (door ? 0.9 : 1.2), 0.4, door ? 3 : 6) ?? 1
    const height = num(r['height'] ?? (door ? 2.1 : 1.2), 0.3, storeyHeight - 0.15) ?? 1
    const sill = door ? 0 : num(r['sill'] ?? 0.9, 0, storeyHeight - height - 0.1) ?? 0.9
    const out: SpecOpening = { floor, wall, width, height, ...(door ? {} : { sill }), ...(r['color'] !== undefined ? { color: hex(r['color'], '#6b4a2b') } : {}), ...(door && r['main'] === true ? { main: true } : {}) }
    if (wall === 'inner') {
      const x = num(r['x'], 0, width_), z = num(r['z'], 0, depth)
      if (x === null || z === null) return null
      return { ...out, x, z }
    }
    const length = wallLength({ width: width_, depth }, wall)
    const at = num(r['at'], width / 2, Math.max(width / 2, length - width / 2))
    return at === null ? null : { ...out, at }
  }
  const width_ = width
  const doors = list('doors', HOUSE_SPEC.doors).map((r) => opening(r, true)).filter((o): o is SpecOpening => o !== null)
  const windows = list('windows', HOUSE_SPEC.windows).map((r) => opening(r, false)).filter((o): o is SpecOpening => o !== null)
  if (!doors.some((d) => d.wall !== 'inner' && d.floor === 0)) {
    doors.unshift({ floor: 0, wall: 'front', at: Math.round(width * 50) / 100, width: 0.9, height: 2.1, main: true })
    notes.push('No outside door was described on the ground floor: one was put in the middle of the front wall.')
  } else if (!doors.some((d) => d.main)) { const first = doors.find((d) => d.wall !== 'inner' && d.floor === 0); if (first) first.main = true }
  const stairs: SpecStairs[] = []
  for (const r of list('stairs', HOUSE_SPEC.stairs)) {
    const floor = floorOf(r['floor'])
    if (floor >= floors - 1) continue
    const x = num(r['x'], 0, width - 0.8), z = num(r['z'], 0, depth - 0.8)
    if (x === null || z === null) continue
    const w = num(r['w'] ?? 1, 0.8, width - x) ?? 1, d = num(r['d'] ?? 3, 0.8, depth - z) ?? 3
    const up = ['x', '-x', 'z', '-z'].includes(r['up'] as string) ? r['up'] as SpecStairs['up'] : (d >= w ? 'z' : 'x')
    stairs.push({ floor, x, z, w, d, up })
  }
  if (floors > 1 && !stairs.length) notes.push('Upstairs is described but no stairs: add "stairs" so people can go up.')
  const extras = isRecord(value['extras']) ? value['extras'] : {}
  const spec: HouseSpecV1 = {
    v: 1, ...(oneLine(value['name'], HOUSE_SPEC.name) ? { name: oneLine(value['name'], HOUSE_SPEC.name) } : {}),
    storeys: floors, width, depth, storeyHeight,
    walls: { color: hex(walls['color'], '#efe6d6'), ...(walls['inner'] !== undefined ? { inner: hex(walls['inner'], '#f4f1ea') } : {}), ...(walls['trim'] !== undefined ? { trim: hex(walls['trim'], '#ffffff') } : {}) },
    roof: { shape, color: hex(roof['color'], '#8a3b2a'), ...(shape !== 'flat' ? { pitch: num(roof['pitch'] ?? 30, 10, 50) ?? 30 } : {}) },
    rooms, doors, windows, stairs,
    extras: { ...(extras['porch'] === true ? { porch: true } : {}), ...(extras['fence'] === true ? { fence: true } : {}), ...(extras['gate'] === true ? { gate: true } : {}), ...(extras['balcony'] === true ? { balcony: true } : {}) },
  }
  return { ok: true, spec, notes }
}

/** Where a walker stands to come in: before the main door (beyond the fence), facing it. Yaw 0 looks towards -z. */
export function specSpawn(spec: HouseSpecV1): { x: number; z: number; yaw: number } {
  const door = spec.doors.find((d) => d.main) ?? spec.doors[0]
  // Outside the yard's fence (2.5 m out) when there is one, so the walker starts on the street side of the gate.
  const at = door?.at ?? spec.width / 2, out = spec.extras.fence ? 4 : 2.5
  if (!door || door.wall === 'front' || door.wall === 'inner') return { x: at, z: -out, yaw: Math.PI }
  if (door.wall === 'back') return { x: spec.width - at, z: spec.depth + out, yaw: 0 }
  if (door.wall === 'left') return { x: -out, z: spec.depth - at, yaw: -Math.PI / 2 }
  return { x: spec.width + out, z: at, yaw: Math.PI / 2 }
}

/** A worked example (the skill's reference shows it; the tests check it): a two-storey house with a gable roof. */
export const EXAMPLE_SPEC = {
  v: 1, name: 'Our house', storeys: 2, width: 10, depth: 8, storeyHeight: 3,
  walls: { color: '#efe2c8', inner: '#f6f3ec', trim: '#ffffff' },
  roof: { shape: 'gable', color: '#7a3424', pitch: 32 },
  rooms: [
    { name: 'Living room', floor: 0, x: 0, z: 0, w: 6, d: 5, floorColor: '#b88b5a' },
    { name: 'Kitchen', floor: 0, x: 6, z: 0, w: 4, d: 5, floorColor: '#d9d4c7' },
    { name: 'Dining', floor: 0, x: 0, z: 5, w: 10, d: 3 },
    { name: 'Bedroom', floor: 1, x: 0, z: 0, w: 5, d: 5 },
    { name: 'Bedroom 2', floor: 1, x: 5, z: 0, w: 5, d: 5 },
    { name: 'Landing', floor: 1, x: 0, z: 5, w: 10, d: 3 },
  ],
  doors: [
    { floor: 0, wall: 'front', at: 3, width: 1, main: true, color: '#5a3a22' },
    { floor: 0, wall: 'inner', x: 6, z: 2.5, width: 0.9 },
    { floor: 0, wall: 'inner', x: 3, z: 5, width: 1.2 },
    { floor: 1, wall: 'inner', x: 2.5, z: 5, width: 0.9 },
    { floor: 1, wall: 'inner', x: 7.5, z: 5, width: 0.9 },
  ],
  windows: [
    { floor: 0, wall: 'front', at: 7.5, width: 1.6 },
    { floor: 0, wall: 'back', at: 5, width: 2 },
    { floor: 1, wall: 'front', at: 2.5, width: 1.2 },
    { floor: 1, wall: 'front', at: 7.5, width: 1.2 },
    { floor: 1, wall: 'right', at: 4, width: 1 },
  ],
  stairs: [{ floor: 0, x: 8.6, z: 5.2, w: 1.2, d: 2.6, up: 'z' }],
  extras: { porch: true, fence: true, gate: true },
} as const
