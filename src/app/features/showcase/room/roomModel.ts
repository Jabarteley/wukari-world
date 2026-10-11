// The 3D shop, the pure part: which room a kind of shop gets, where each of the twelve display slots is and how big an item card is
// there, how a long list pages, how text is wrapped for a card, and the data a room is drawn from (built from a shop's page, from a
// public address or from the seller's own record). No three, no DOM: the scene (roomScene.ts) draws what this says, and the tests
// read this file. Everything a seller wrote is kept as plain text here and only ever drawn as text (canvas) or set as a Vue text node.
import { SHOWCASE_CATEGORIES } from '../../../../types/showcase.ts'
import type { ShowcaseCategory, ShowcaseHours, ShowcaseMine, ShowcaseView } from '../../../../types/showcase.ts'
import { VERIFIED_TIERS } from '../../../../game/trust/index.ts'
import { buyMessage, messageHref, safeLink } from '../../../../types/showcase-link.ts'

/** Goods shops (shelves, a counter, a rail) get one of three fittings colourings; service shops get the office. */
export type RoomTheme = 'fashion' | 'food' | 'electronics'
export const ROOM_THEMES: readonly RoomTheme[] = ['fashion', 'food', 'electronics']
export const THEME_OF: Readonly<Record<ShowcaseCategory, RoomTheme>> = Object.freeze({
  salon: 'fashion', tailor: 'fashion', beauty: 'fashion', crafts: 'fashion',
  food: 'food', events: 'food',
  tech: 'electronics', repair: 'electronics', photography: 'electronics', tutoring: 'electronics', cleaning: 'electronics', other: 'electronics',
})
export const themeFor = (category: unknown): RoomTheme => (typeof category === 'string' && (SHOWCASE_CATEGORIES as readonly string[]).includes(category) ? THEME_OF[category as ShowcaseCategory] : 'electronics')

// ---- goods or service ---------------------------------------------------------------------------------------------------------

/** 'goods': a shop with shelves, a counter and a rail. 'service': an office or studio with a reception desk and a service menu. */
export type RoomKind = 'goods' | 'service'
/** What each kind of shop is before its items are looked at. */
export const KIND_OF: Readonly<Record<ShowcaseCategory, RoomKind>> = Object.freeze({
  salon: 'service', photography: 'service', repair: 'service', tutoring: 'service', cleaning: 'service', events: 'service',
  tailor: 'service', beauty: 'service', tech: 'service',
  food: 'goods', crafts: 'goods', other: 'goods',
})
/** Kinds that can be either: their items decide (see `roomKindFor`). The rest are always what `KIND_OF` says. */
export const MIXED: ReadonlySet<ShowcaseCategory> = new Set<ShowcaseCategory>(['tailor', 'beauty', 'tech', 'other'])
/** Words that say an item is a piece of someone's time: a length of time, a session, an appointment, a lesson. */
const TIMED = /\b(\d+\s*(?:min|mins|minute|minutes|hr|hrs|hour|hours|day|days)|per\s+hour|an?\s+hour|half\s+an?\s+hour|session|appointment|lesson|class|consultation|booking|visit)\b/i
export const looksTimed = (item: { name: string; note: string }): boolean => TIMED.test(`${item.name} ${item.note}`)
/** The room a shop gets: a kind that cannot be mixed is what it is; a mixed kind with items is a service when half of them are priced by time or marked as services, else goods; with no items it is its default. */
export function roomKindFor(category: unknown, items: readonly { name: string; note: string }[] = []): RoomKind {
  const known = typeof category === 'string' && (SHOWCASE_CATEGORIES as readonly string[]).includes(category) ? (category as ShowcaseCategory) : 'other'
  if (!MIXED.has(known) || items.length === 0) return KIND_OF[known]
  return items.filter(looksTimed).length * 2 >= items.length ? 'service' : 'goods'
}

// ---- the goods room: where each of the twelve items goes ----------------------------------------------------------------------------

/** One place for one item, in room units (the room is 6 x 5 x 3.2, the middle of the floor is the origin, the open front is at +z, the back wall at z = -2.5). */
export interface GoodsSlot {
  name: string
  kind: 'shelf' | 'counter' | 'rail'
  /** The middle of the panel across the room. */
  x: number
  /** Shelf and counter: the top of the board the panel stands on. Rail: where it hangs from. */
  y: number
  z: number
  w: number
  h: number
}
const PANEL = Object.freeze({ shelf: { w: 0.5, h: 0.5 }, counter: { w: 0.42, h: 0.46 }, rail: { w: 0.46, h: 0.52 } })
/** The two shelf units on the back wall, either side of the counter; two columns of panels, two boards (eye level first). */
export const SHELF_UNITS = Object.freeze({ left: -2.25, right: 2.25, width: 1.4, pitch: 0.62, boards: [1.7, 1.0] as readonly number[], depth: 0.36, thickness: 0.16 })
const slot = (name: string, kind: GoodsSlot['kind'], x: number, y: number, z: number): GoodsSlot => ({ name, kind, x, y, z, ...PANEL[kind] })
/** In the order items fill them: the two counter easels, the shelves both sides the entry view can see (eye-level board first, both units in turn), then the rail. */
export const SLOTS: readonly GoodsSlot[] = Object.freeze((() => {
  const out: GoodsSlot[] = [slot('counter_1', 'counter', 0.47, 1.06, -0.62), slot('counter_2', 'counter', 0.95, 1.06, -0.62)]
  for (const [row, y] of SHELF_UNITS.boards.entries()) for (const col of [-1, 1]) for (const side of [SHELF_UNITS.left, SHELF_UNITS.right]) out.push(slot(`shelf_${side < 0 ? 'l' : 'r'}${row + 1}${col < 0 ? 'a' : 'b'}`, 'shelf', side + (col * SHELF_UNITS.pitch) / 2, y, -2.3))
  out.push(slot('rail_1', 'rail', -1.1, 2.2, -2.3), slot('rail_2', 'rail', 1.1, 2.2, -2.3))
  return out
})())
export const PAGE_SIZE = SLOTS.length
/** Where the shopkeeper stands, and how far to each side of that nothing is hung or stood. */
export const KEEPER = Object.freeze({ x: -0.05, z: -1.3, clear: 0.3 })
/** The height of the ledge an easel panel leans on. */
export const EASEL_LEDGE = 0.1
/** How far a panel on a shelf or an easel leans back. */
export const LEAN = -0.12

export interface Placement { x: number; y: number; z: number; tilt: number; w: number; h: number; label: { x: number; y: number; z: number; w: number; h: number } | null }
/** The middle of a panel, how far it leans, and where the small price label under it goes (on the front edge of its shelf board or its easel ledge). A rail panel hangs straight and has no label. */
export function placementOf(spot: GoodsSlot): Placement {
  const { w, h } = spot
  if (spot.kind === 'rail') return { x: spot.x, y: spot.y - 0.08 - h / 2, z: spot.z, tilt: 0, w, h, label: null }
  const lift = (h / 2) * Math.cos(LEAN)
  // an easel: a low ledge on the counter, the panel leaning on it, the label on the ledge's front edge
  if (spot.kind === 'counter') return { x: spot.x, y: spot.y + EASEL_LEDGE + lift, z: spot.z, tilt: LEAN, w, h, label: { x: spot.x, y: spot.y + EASEL_LEDGE / 2, z: spot.z + 0.097, w: 0.4, h: 0.08 } }
  return { x: spot.x, y: spot.y + lift, z: spot.z + 0.02, tilt: LEAN, w, h, label: { x: spot.x, y: spot.y - SHELF_UNITS.thickness / 2, z: -2.5 + SHELF_UNITS.depth + 0.004, w: 0.5, h: 0.13 } }
}

// ---- the office: the service menu board ----------------------------------------------------------------------------------------------

/** Services on one page of the menu board. */
export const MENU_LINES = 6
/** The board's size on the wall, and where it hangs. */
export const MENU_BOARD = Object.freeze({ w: 2.6, h: 1.56, x: 1.45, y: 1.72, z: -2.47 })
/** The rows of the board, as fractions of its height from the top: the header, each line, the footer with the page arrows. */
export const MENU_ROWS = Object.freeze({ header: 0.15, first: 0.17, pitch: 0.118, line: 0.108, footer: 0.89 })
export const menuPages = (items: number): number => Math.max(1, Math.ceil(Math.max(0, items) / MENU_LINES))
/** The services on a page of the board with the row each is drawn in. */
export function menuPageOf<T>(items: readonly T[], page: number): { item: T; index: number; row: number }[] {
  const at = Math.min(menuPages(items.length) - 1, Math.max(0, Math.trunc(Number.isFinite(page) ? page : 0))) * MENU_LINES
  return items.slice(at, at + MENU_LINES).map((item, row) => ({ item, index: at + row, row }))
}
/** What a tap on the board at (u, v), each from 0 to 1 (v from the top), lands on: a service, a page arrow, or nothing. */
export function menuHit(u: number, v: number, onPage: number, page: number, pages: number): { kind: 'item'; row: number } | { kind: 'page'; step: 1 | -1 } | null {
  if (v >= MENU_ROWS.footer && pages > 1) { if (u < 0.5 && page > 0) return { kind: 'page', step: -1 }; if (u >= 0.5 && page < pages - 1) return { kind: 'page', step: 1 }; return null }
  const row = Math.floor((v - MENU_ROWS.first + (MENU_ROWS.pitch - MENU_ROWS.line) / 2) / MENU_ROWS.pitch)
  const top = MENU_ROWS.first + row * MENU_ROWS.pitch
  return row >= 0 && row < onPage && v >= top - 0.005 && v <= top + MENU_ROWS.pitch ? { kind: 'item', row } : null
}

// ---- pages ----------------------------------------------------------------------------------------------------------------------

export const pageCount = (items: number, size = PAGE_SIZE): number => Math.max(1, Math.ceil(Math.max(0, items) / size))
export const clampPage = (page: number, items: number, size = PAGE_SIZE): number => Math.min(pageCount(items, size) - 1, Math.max(0, Math.trunc(Number.isFinite(page) ? page : 0)))
/** The items of one page of a goods room, each with its place: item `n` of the page goes to `SLOTS[n]`; `index` is its number in the whole list. */
export function pageOf<T>(items: readonly T[], page: number): { item: T; slot: GoodsSlot; index: number }[] {
  const at = clampPage(page, items.length) * PAGE_SIZE
  return items.slice(at, at + PAGE_SIZE).flatMap((item, n) => { const spot = SLOTS[n]; return spot ? [{ item, slot: spot, index: at + n }] : [] })
}
/** How many items a page holds in each kind of room. */
export const pageSizeOf = (kind: RoomKind): number => (kind === 'service' ? MENU_LINES : PAGE_SIZE)

// ---- text and colour ------------------------------------------------------------------------------------------------------------

/** A seller's words as plain text: control characters and line breaks are dropped, the length is cut. It is only ever drawn as text. */
export function plain(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim() : ''
  const letters = Array.from(text)
  return letters.length <= max ? text : `${letters.slice(0, Math.max(0, max - 1)).join('').trimEnd()}…`
}
/** The first letter of an item or shop name, upper case, for the placeholder tile; '·' when there is none. */
export const initialOf = (name: string): string => { const first = Array.from(name.trim()).find((char) => /[\p{L}\p{N}]/u.test(char)); return first ? first.toUpperCase() : '·' }

/** Break `text` into at most `maxLines` lines no wider than `maxWidth` by `measure`; a word too wide for a line is cut with an ellipsis; what does not fit ends the last line with one. */
export function wrapLines(text: string, maxWidth: number, maxLines: number, measure: (line: string) => number): string[] {
  const fit = (value: string): string => { let part = value.replace(/…$/, ''); while (part && measure(`${part}…`) > maxWidth) part = Array.from(part).slice(0, -1).join(''); return `${part.trimEnd()}…` }
  const lines: string[] = []
  let line = '', more = false
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = measure(raw) > maxWidth ? fit(raw) : raw
    const joined = line ? `${line} ${word}` : word
    if (measure(joined) <= maxWidth) { line = joined; continue }
    lines.push(line)
    if (lines.length >= maxLines) { more = true; line = ''; break }
    line = word
  }
  if (line) lines.push(line)
  if (more && lines.length) lines[lines.length - 1] = fit(lines[lines.length - 1] ?? '')
  return lines.slice(0, maxLines)
}

const HEX = /^#[0-9a-f]{6}$/i
export const safeHex = (value: unknown, fallback: string): string => (typeof value === 'string' && HEX.test(value) ? value.toLowerCase() : fallback)
const channels = (hex: string): [number, number, number] => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)) as [number, number, number]
/** `a` moved `t` (0 to 1) of the way to `b`, as '#rrggbb'. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(safeHex(a, '#808080')), [br, bg, bb] = channels(safeHex(b, '#808080'))
  const f = Math.min(1, Math.max(0, t)), part = (x: number, y: number): string => Math.round(x + (y - x) * f).toString(16).padStart(2, '0')
  return `#${part(ar, br)}${part(ag, bg)}${part(ab, bb)}`
}

/** What the room is tinted with: the walls take a soft share of the shop's main colour, the trim and the sign its full colours. */
export interface RoomColours { wall: string; sign: string; signInk: string; accent: string; tile: string; tileInk: string; label: string; labelInk: string }
export function roomColours(colours: readonly [string, string]): RoomColours {
  const main = safeHex(colours[0], '#1f3a5f'), second = safeHex(colours[1], '#f1f3f5')
  const ink = (on: string): string => (luminance(on) > 0.4 ? '#14181c' : '#ffffff')
  const tile = mixHex(main, '#ffffff', 0.18)
  return { wall: mixHex('#ffffff', main, 0.32), sign: main, signInk: ink(main), accent: second, tile, tileInk: ink(tile), label: mixHex(second, '#ffffff', 0.55), labelInk: '#1d2330' }
}
function luminance(hex: string): number {
  const [r, g, b] = channels(safeHex(hex, '#000000')).map((c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// ---- the data a room is drawn from ----------------------------------------------------------------------------------------------

export interface RoomItem { name: string; priceNaira: number; note: string; photo: string | null }
export interface RoomPhoto { id: string; caption: string }
export interface RoomData {
  /** The shop's id: used only to ask for a link or to file a report. It is never drawn. */
  shopId: string
  name: string
  sign: string
  category: ShowcaseCategory
  theme: RoomTheme
  kind: RoomKind
  /** The trust badge's words ("Phone checked") when the seller has one worth showing, else null. */
  checked: string | null
  /** Salon and beauty offices get a styling chair and a mirror in place of the visitor chairs. */
  styling: boolean
  colours: [string, string]
  about: string
  hours: (ShowcaseHours | null)[]
  /** The market and city in words, or ''. */
  place: string
  zone: string
  items: RoomItem[]
  photos: RoomPhoto[]
  /** The seller's own chat and pay links, already checked, when this room was opened from the shop's public address (or by the seller). Otherwise null. */
  chat: string | null
  pay: string | null
  hasPay: boolean
  payNotice: string | null
  /** Who runs the shop, for the report and the "leaving" sheet; never drawn. */
  author: { id: string; name: string } | null
  /** 'direct': the links are here. 'released': they come from the server one at a time, for a signed-in adult. 'preview': the seller looking at their own shop. */
  access: 'direct' | 'released' | 'preview'
}

/** A photo address, only for an id the game's own photo store makes (32 hex letters); anything else is not a picture. */
export const ROOM_PHOTO_ID = /^[0-9a-f]{32}$/
export const roomPhotoUrl = (id: unknown): string | null => (typeof id === 'string' && ROOM_PHOTO_ID.test(id) ? `/api/showcase/photo/${id}` : null)

const photosOf = (list: readonly { id: string; caption?: string | undefined }[]): RoomPhoto[] => list.flatMap((photo) => (roomPhotoUrl(photo.id) ? [{ id: photo.id, caption: plain(photo.caption, 60) }] : []))
function itemsOf(list: readonly { label: string; priceNaira: number; note: string; photo?: string | undefined }[], shown: ReadonlySet<string>): RoomItem[] {
  return list.map((item) => ({ name: plain(item.label, 40), priceNaira: Number.isFinite(item.priceNaira) && item.priceNaira > 0 ? Math.trunc(item.priceNaira) : 0, note: plain(item.note, 80), photo: item.photo && shown.has(item.photo) && roomPhotoUrl(item.photo) ? item.photo : null })).filter((item) => item.name !== '')
}

/** The room's kind is decided last, from the items it was given. */
const withKind = (data: RoomData): RoomData => ({ ...data, kind: roomKindFor(data.category, data.items) })

/** A room from a shop's page (the Services app) or from a public address (`links` present: the seller's own links, released to anyone who has the address). */
export function roomFromView(view: ShowcaseView, links?: { chat: string | null; pay: string | null }, place = '', zone = 'Africa/Lagos'): RoomData {
  const photos = photosOf(view.photos)
  return withKind({
    shopId: view.id, name: plain(view.name, 40), sign: plain(view.sign, 24), category: view.category, theme: themeFor(view.category), kind: 'goods', checked: view.badge && (VERIFIED_TIERS as readonly string[]).includes(view.badge.tier) ? plain(view.badge.label, 30) : null, styling: view.category === 'salon' || view.category === 'beauty', colours: [safeHex(view.colours[0], '#1f3a5f'), safeHex(view.colours[1], '#f1f3f5')], about: plain(view.about, 400),
    hours: view.hours.slice(0, 7), place: plain(place, 80), zone, items: itemsOf(view.serviceList, new Set(photos.map((photo) => photo.id))), photos,
    chat: links ? safeLink(links.chat) : null, pay: links ? safeLink(links.pay) : null, hasPay: links ? safeLink(links.pay) !== null : view.pay, payNotice: view.payNotice ? plain(view.payNotice, 80) : null, author: view.badge?.id ? { id: view.badge.id, name: plain(view.badge.name, 40) } : null,
    access: links ? 'direct' : 'released',
  })
}
/** The seller's own record, drafts and unapproved photos included: the preview before publishing. */
export function roomFromMine(shop: NonNullable<ShowcaseMine['shop']>, place = '', zone = 'Africa/Lagos'): RoomData {
  const photos = photosOf(shop.photos.filter((photo) => !photo.hidden))
  return withKind({
    shopId: shop.id, name: plain(shop.name, 40), sign: plain(shop.sign, 24), category: shop.category, theme: themeFor(shop.category), kind: 'goods', checked: null, styling: shop.category === 'salon' || shop.category === 'beauty', colours: [safeHex(shop.colours[0], '#1f3a5f'), safeHex(shop.colours[1], '#f1f3f5')], about: plain(shop.about, 400),
    hours: shop.hours.slice(0, 7), place: plain(place, 80), zone, items: itemsOf(shop.services, new Set(photos.map((photo) => photo.id))), photos,
    chat: safeLink(shop.chat.url), pay: safeLink(shop.pay?.url), hasPay: safeLink(shop.pay?.url) !== null, payNotice: null, author: null, access: 'preview',
  })
}

/** The address "Message the seller" opens, with the first words filled in (about an item, or about the shop). Null when there is no usable link here. */
export function messageLink(data: RoomData, item?: RoomItem | null): string | null {
  if (!data.chat) return null
  const about = item ? { label: item.name, priceNaira: item.priceNaira } : null
  return messageHref(data.chat, buyMessage(data.name, about), `${data.name}${item ? `: ${item.name}` : ''}`)
}
export const payLink = (data: RoomData): string | null => safeLink(data.pay)

/** The line the room always says: nothing is bought or held here. */
export const DEAL_LINE = 'You deal directly with the seller. Allworld takes no orders and never holds or moves your money.'
/** What the room is called by a screen reader. */
export const roomLabel = (data: RoomData): string => `${data.name}: a 3D ${data.kind === 'service' ? 'office' : 'shop'} with ${data.items.length === 1 ? (data.kind === 'service' ? '1 service' : '1 item') : `${data.items.length} ${data.kind === 'service' ? 'services' : 'items'}`}`

// ---- how a visitor arrived: where Step inside leads -----------------------------------------------------------------------------

/** How a room is asked for. */
export type RoomRequest = { by: 'token'; token: string } | { by: 'id'; id: string } | { by: 'mine' }
/** The entry link and the Services app both send an id or a token; nothing else is accepted. */
export function roomRequest(value: unknown): RoomRequest | null {
  if (typeof value !== 'object' || value === null) return null
  const found = value as { token?: unknown; id?: unknown; mine?: unknown }
  if (found.mine === true) return { by: 'mine' }
  if (typeof found.token === 'string' && /^[a-hjkmnp-z2-9]{8}$/.test(found.token)) return { by: 'token', token: found.token }
  if (typeof found.id === 'string' && /^SC-\d{1,16}$/.test(found.id)) return { by: 'id', id: found.id }
  return null
}
