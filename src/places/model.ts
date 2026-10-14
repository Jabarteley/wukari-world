/**
 * OWNER: social
 * PLACES: rooms a player stands in without their life moving. The numbers, the room keys and the words that need no stored
 * state, as pure functions, so the server (server/social/places.ts, server/ws/rooms.ts) and the page
 * (src/app/features/places) read one module. What is stored and how it is checked is written at the top of
 * server/social/places.ts; the design is docs/PLACES.md.
 *
 *   The Square     one room for the whole world. Anyone who has tapped Play may stand in it. It is split into groups of
 *                  bounded size like any public venue, so it stays readable however many people are online.
 *   A group room   the room of one group chat. Its members come in and furnish it together; anyone holding the room's link
 *                  comes in as a visitor while the link is on.
 *
 * A place is not a venue of any city: a life is never "at" one, no fare is paid to reach one and nothing a life owns changes
 * there. Room keys start with the pseudo-city `world`, an id no city of the catalogue has.
 *
 * Nothing here is under src/game, so none of it is in the first download.
 */
import { FURNITURE } from '../game/content/furniture.ts'
import { DEFAULT_STYLE } from '../game/content/world.ts'
import { checkPlacement, findFreeSpot, normalise, plotOf } from '../game/home-layout.ts'
import type { FurnitureId, HouseStyle, PlacedItem } from '../types/life.ts'

const HOUR = 3600000

export const PLACES = Object.freeze({
  /** The pseudo-city of every place's room key. */
  city: 'world',
  squareVenue: 'square',
  roomVenue: 'room',
  /** A group room is this many floor tiles on a side. */
  roomGrid: 10,
  /** Objects one room holds. */
  roomItems: 60,
  /** People standing in one group room at once, members and visitors together. */
  roomPresent: 16,
  /** A visitor's pass (they came in by the link) lasts this long after they last came in. */
  passHours: 24,
  /** Passes one room keeps; the oldest go first. */
  passes: 60,
  /** A visitor a member asked to leave cannot come back by the link for this long. */
  barredHours: 24,
  /** Tries per address per minute at a room link. */
  perAddressPerMinute: 20,
  /** Changes to one room's furniture by one member in a minute. */
  editsPerMinute: 40,
})
export const PLACES_MS = Object.freeze({ pass: PLACES.passHours * HOUR, barred: PLACES.barredHours * HOUR })

/** The Square's room key. */
export const SQUARE_ROOM = `${PLACES.city}:${PLACES.squareVenue}`
/** A group conversation's id (`g.<number>`), the only id a group room has. */
export const ROOM_ID = /^g\.[1-9]\d{0,14}$/
export const isRoomId = (value: unknown): value is string => typeof value === 'string' && ROOM_ID.test(value)
export const roomKeyOf = (roomId: string): string => `${PLACES.city}:${PLACES.roomVenue}:${roomId}`

export type PlaceRef = { kind: 'square' } | { kind: 'room'; id: string }
/** Which place a room key names, or null for a venue, a home or a street. */
export function placeOfRoom(room: string | null | undefined): PlaceRef | null {
  if (!room) return null
  const [city, venue, id] = room.split(':')
  if (city !== PLACES.city) return null
  if (venue === PLACES.squareVenue && id === undefined) return { kind: 'square' }
  return venue === PLACES.roomVenue && isRoomId(id) ? { kind: 'room', id } : null
}

// ---- the link of a group room: /r/<group number>-<key> ------------------------------------------------------------------
/** The key is 22 url-safe characters of randomness, stored with the room; the number only says which room to look at. */
const LINK = /^([1-9]\d{0,14})-([A-Za-z0-9_-]{22})$/
export const roomLinkPath = (roomId: string, key: string): string => `/r/${roomId.slice(2)}-${key}`
export function readRoomLink(token: unknown): { roomId: string; key: string } | null {
  const found = typeof token === 'string' ? LINK.exec(token) : null
  return found ? { roomId: `g.${found[1]}`, key: found[2]! } : null
}
/** The token of a page address that is a room link, or null. */
export const roomTokenOf = (pathname: string): string | null => { const found = /^\/r\/([^/?#]+)\/?$/.exec(pathname); return found && readRoomLink(found[1]) ? found[1]! : null }

// ---- the furniture of a group room ---------------------------------------------------------------------------------------
/** A piece's id in a room: chosen by the page that adds it, so a repeated request adds it once. */
export const ROOM_ITEM_ID = /^p[0-9a-z]{8,24}$/
export const roomPlot = () => plotOf(PLACES.roomGrid)
export const roomStyle = (): HouseStyle => ({ ...DEFAULT_STYLE })

/** What a new room starts with: somewhere to sit, something to look at. Placed by the same rule as everything added later. */
const STARTER: readonly FurnitureId[] = ['family-sofa', 'centre-rug', 'plastic-chair', 'plastic-chair', 'radio-stool', 'potted-plant', 'ludo-board']
export function starterRoomItems(): PlacedItem[] {
  const items: PlacedItem[] = [], plot = roomPlot()
  STARTER.forEach((itemId, index) => {
    const def = FURNITURE[itemId], at = def ? findFreeSpot(plot, items, def) : null
    if (def && at) items.push({ id: `pstarter${String(index).padStart(2, '0')}`, itemId, x: at.x, y: at.y, rot: at.rot })
  })
  return items
}

export type RoomEdit =
  | { op: 'add'; id: string; itemId: FurnitureId; x?: number; y?: number; rot?: number }
  | { op: 'move'; id: string; x: number; y: number; rot: number }
  | { op: 'remove'; id: string }
export type RoomEditRefusal = { code: 'unknown_item' | 'unknown_piece' | 'room_full' | 'no_space' | 'invalid_placement'; reason: string }

/**
 * Apply one change to a room's furniture. Pure: the same list in gives the same list out. A repeated `add` of a piece that is
 * already there, and a repeated `remove` of one that is gone, change nothing and are not refusals (`same`).
 */
export function editRoom(items: readonly PlacedItem[], edit: RoomEdit): { items: PlacedItem[]; same: boolean } | RoomEditRefusal {
  const plot = roomPlot()
  if (edit.op === 'remove') {
    const kept = items.filter((item) => item.id !== edit.id)
    return { items: kept, same: kept.length === items.length }
  }
  if (edit.op === 'add') {
    const def = Object.hasOwn(FURNITURE, edit.itemId) ? FURNITURE[edit.itemId] : undefined
    if (!def) return { code: 'unknown_item', reason: 'That object is not in the catalogue.' }
    const there = items.find((item) => item.id === edit.id)
    if (there) return there.itemId === edit.itemId ? { items: [...items], same: true } : { code: 'invalid_placement', reason: 'That piece is already in the room as something else.' }
    if (items.length >= PLACES.roomItems) return { code: 'room_full', reason: `This room already holds ${PLACES.roomItems} objects. Take one out first.` }
    const asked = edit.x === undefined ? null : normalise(def, edit.x, edit.y, edit.rot ?? 0)
    const at = asked && !checkPlacement(plot, items, def, asked.x, asked.y, asked.rot) ? asked : findFreeSpot(plot, items, def)
    if (!at) return { code: 'no_space', reason: `There is no room left for the ${def.label}. Move or take out something first.` }
    return { items: [...items, { id: edit.id, itemId: edit.itemId, x: at.x, y: at.y, rot: at.rot }], same: false }
  }
  const piece = items.find((item) => item.id === edit.id)
  const def = piece ? FURNITURE[piece.itemId] : undefined
  if (!piece || !def) return { code: 'unknown_piece', reason: 'That piece is no longer in the room.' }
  const at = normalise(def, edit.x, edit.y, edit.rot)
  if (!at) return { code: 'invalid_placement', reason: 'It cannot go there.' }
  if (piece.x === at.x && piece.y === at.y && piece.rot === at.rot) return { items: [...items], same: true }
  const blocked = checkPlacement(plot, items, def, at.x, at.y, at.rot, piece.id)
  if (blocked) return { code: 'invalid_placement', reason: blocked.reason }
  return { items: items.map((item) => (item.id === piece.id ? { ...item, x: at.x, y: at.y, rot: at.rot } : item)), same: false }
}

// ---- services: what an AI agent says it does in a place (server/agents/services.ts) ----------------------------------------
export const SERVICE_KINDS = Object.freeze(['quiz', 'guide', 'shop', 'translate', 'games', 'help', 'other'] as const)
export type ServiceKind = (typeof SERVICE_KINDS)[number]
export const isServiceKind = (value: unknown): value is ServiceKind => SERVICE_KINDS.some((kind) => kind === value)
export const SERVICE = Object.freeze({ title: 40, about: 160, listed: 100 })
export const SERVICE_WORDS: Readonly<Record<ServiceKind, string>> = Object.freeze({ quiz: 'Quiz host', guide: 'Guide', shop: 'Shop counter', translate: 'Translator', games: 'Games host', help: 'Helper', other: 'Service' })
