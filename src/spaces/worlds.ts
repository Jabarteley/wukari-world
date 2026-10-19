/**
 * OWNER: spaces
 * WORLDS (docs/WORLDS.md): a space a player makes from nothing — open ground of a chosen size and surface, their own models, their
 * own script — that friends reach by a link and anyone may browse when it is open to everyone. Pure: the server checks what a
 * player sends with these, the app shows the same words, the 3D screen reads the same sizes.
 */

/** The sizes a world may be, in metres across (a world is square). */
export const WORLD_SIZES = Object.freeze({
  small: { label: 'Small', line: 'A garden: 24 m across', metres: 24 },
  big: { label: 'Big', line: 'A field: 48 m across', metres: 48 },
  huge: { label: 'Huge', line: 'A park: 80 m across', metres: 80 },
})
export type WorldSize = keyof typeof WORLD_SIZES

/** The ground a world stands on: the look of its surface, and the sky above. */
export const WORLD_GROUNDS = Object.freeze({
  grass: { label: 'Grass', sky: '#a9c7de' },
  sand: { label: 'Sand', sky: '#c9d7e6' },
  stone: { label: 'Stone', sky: '#b8c6d2' },
  snow: { label: 'Snow', sky: '#d6e1ea' },
  night: { label: 'Night', sky: '#1a2233' },
})
export type WorldGround = keyof typeof WORLD_GROUNDS

/** Who may come in. */
export const WORLD_OPEN = Object.freeze({
  everyone: { label: 'Everyone', line: 'Listed for all to find and join' },
  link: { label: 'By link only', line: 'Only people you send the link' },
})
export type WorldOpen = keyof typeof WORLD_OPEN

/** What is allowed in one space, by its kind: a world may be detailed and heavy, a home or a room stays light. */
export const SPACE_LIMITS_BY_KIND = Object.freeze({
  home: { placements: 40, triangles: 1_200_000 },
  room: { placements: 40, triangles: 1_200_000 },
  world: { placements: 120, triangles: 4_000_000 },
})
export type SpaceKind = keyof typeof SPACE_LIMITS_BY_KIND

export const WORLDS = Object.freeze({
  /** Worlds one player may keep. */
  perPlayer: 12,
  name: 40,
  blurb: 140,
  /** A cover picture: WebP only, drawn by the maker's own device from the world itself. */
  coverBytes: 240_000,
  coverWidth: 640,
  coverHeight: 360,
  /** Lists answer at most this many. */
  list: 40,
})

export interface WorldInput { name: string; blurb: string; size: WorldSize; ground: WorldGround; open: WorldOpen }
export type WorldCheck = { ok: true; world: WorldInput } | { ok: false; code: string; reason: string }

const oneLine = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const keyOf = <T extends object>(value: unknown, table: T, fallback: keyof T): keyof T => (typeof value === 'string' && Object.hasOwn(table, value) ? value as keyof T : fallback)

/** What a player asked for, with every field made safe. `was`: the world as it is when changing one (fields left out keep their value). */
export function cleanWorld(value: unknown, was?: WorldInput): WorldCheck {
  const no = (code: string, reason: string): WorldCheck => ({ ok: false, code, reason })
  if (!value || typeof value !== 'object') return no('invalid_world', 'The world could not be read.')
  const r = value as Record<string, unknown>
  const name = r['name'] === undefined && was ? was.name : oneLine(r['name'], WORLDS.name)
  if (name.length < 2) return no('invalid_name', 'Give your world a name of at least two letters.')
  const blurb = r['blurb'] === undefined && was ? was.blurb : oneLine(r['blurb'], WORLDS.blurb)
  const size = r['size'] === undefined && was ? was.size : keyOf(r['size'], WORLD_SIZES, 'small')
  const ground = r['ground'] === undefined && was ? was.ground : keyOf(r['ground'], WORLD_GROUNDS, 'grass')
  const open = r['open'] === undefined && was ? was.open : keyOf(r['open'], WORLD_OPEN, 'link')
  return { ok: true, world: { name, blurb, size, ground, open } }
}

/** The plot of a world: its size across and down, one floor. */
export const worldPlot = (size: WorldSize): { w: number; d: number; floors: number } => ({ w: WORLD_SIZES[size].metres, d: WORLD_SIZES[size].metres, floors: 1 })

/** A world's id: `w` and twelve letters or digits (unguessable enough for a link-only world). */
export const WORLD_ID = /^w[0-9a-z]{12}$/
export const isWorldId = (value: unknown): value is string => typeof value === 'string' && WORLD_ID.test(value)

/** The link to a world, as the share sheet sends it. The page reads one on landing in the first download (src/quick-start/model.ts linkParts). */
export const worldLinkPath = (id: string): string => `/w/${id}`
export const worldLinkFrom = (pathname: unknown): string | null => /^\/w\/(w[0-9a-z]{12})\b/.exec(String(pathname ?? ''))?.[1] ?? null

/** A WebP file, by its first bytes (RIFF····WEBP); the cover is never decoded on the server. */
export function isWebp(bytes: Uint8Array): boolean {
  return bytes.length > 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
}

/** One line under a world's name in a list: who made it and how it is doing. */
export function worldLine(world: { by: { name: string }; here: number; visits: number; mine: boolean; open: WorldOpen }): string {
  const who = world.mine ? (world.open === 'everyone' ? 'Yours · open to everyone' : 'Yours · by link') : `By ${world.by.name}`
  if (world.here > 0) return `${who} · ${world.here} here now`
  if (world.visits > 0) return `${who} · ${world.visits.toLocaleString('en')} visit${world.visits === 1 ? '' : 's'}`
  return who
}
