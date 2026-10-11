// The 3D shop, the pure part: which room a kind of shop gets, where each of the twelve display slots is and how big an item card is
// there, how a long list pages, how text is wrapped for a card, and the data a room is drawn from (built from a shop's page, from a
// public address or from the seller's own record). No three, no DOM: the scene (roomScene.ts) draws what this says, and the tests
// read this file. Everything a seller wrote is kept as plain text here and only ever drawn as text (canvas) or set as a Vue text node.
import { SHOWCASE_CATEGORIES } from '../../../../types/showcase.ts'
import type { ShowcaseCategory, ShowcaseHours, ShowcaseMine, ShowcaseView } from '../../../../types/showcase.ts'
import { buyMessage, messageHref, safeLink } from '../../../../types/showcase-link.ts'

export type RoomTheme = 'fashion' | 'food' | 'electronics'
export const ROOM_THEMES: readonly RoomTheme[] = ['fashion', 'food', 'electronics']

/** Which of the three rooms a kind of shop gets. Every kind has one; services without goods get the electronics room (a repair-shop wall). */
export const THEME_OF: Readonly<Record<ShowcaseCategory, RoomTheme>> = Object.freeze({
  salon: 'fashion', tailor: 'fashion', beauty: 'fashion', crafts: 'fashion',
  food: 'food', events: 'food',
  tech: 'electronics', repair: 'electronics', photography: 'electronics', tutoring: 'electronics', cleaning: 'electronics', other: 'electronics',
})
export const themeFor = (category: unknown): RoomTheme => (typeof category === 'string' && (SHOWCASE_CATEGORIES as readonly string[]).includes(category) ? THEME_OF[category as ShowcaseCategory] : 'electronics')

// ---- the slots ------------------------------------------------------------------------------------------------------------------

/** One display place of the room model, in its own units (the room is 6 x 5 x 3.2, origin at the middle of the floor, open at +z). */
export interface SlotSpec {
  name: string
  x: number; y: number; z: number
  /** The room model's own slot size; the scene draws cards a little larger (CARD_SIZE) because the shelves are big. */
  width: number; height: number
  kind: 'shelf' | 'counter' | 'rail'
  /** 'bottom': the card stands on y; 'top': it hangs from y. */
  anchor: 'bottom' | 'top'
  /** The direction the card faces (x, y, z). */
  facing: readonly [number, number, number]
}
const shelf = (n: number, x: number, y: number, z: number, fx: number): SlotSpec => ({ name: `slot_${String(n).padStart(2, '0')}`, x, y, z, width: 0.55, height: 0.4, kind: 'shelf', anchor: 'bottom', facing: [fx, 0, 0] })
export const SLOTS: readonly SlotSpec[] = Object.freeze([
  shelf(1, -2.61, 1.0, 0.65, 1), shelf(2, -2.61, 1.0, -1.5, 1), shelf(3, -2.61, 1.65, 0.65, 1), shelf(4, -2.61, 1.65, -1.5, 1),
  shelf(5, 2.61, 1.0, 0.65, -1), shelf(6, 2.61, 1.0, -1.5, -1), shelf(7, 2.61, 1.65, 0.65, -1), shelf(8, 2.61, 1.65, -1.5, -1),
  { name: 'slot_09', x: 0.1, y: 1.0, z: -0.55, width: 0.45, height: 0.4, kind: 'counter', anchor: 'bottom', facing: [0, 0, 1] },
  { name: 'slot_10', x: 0.9, y: 1.0, z: -0.55, width: 0.45, height: 0.4, kind: 'counter', anchor: 'bottom', facing: [0, 0, 1] },
  { name: 'slot_11', x: -0.8, y: 1.95, z: -2.04, width: 0.5, height: 0.8, kind: 'rail', anchor: 'top', facing: [0, 0, 1] },
  { name: 'slot_12', x: 0.8, y: 1.95, z: -2.04, width: 0.5, height: 0.8, kind: 'rail', anchor: 'top', facing: [0, 0, 1] },
])
export const PAGE_SIZE = SLOTS.length
/** The order items fill the slots in: the counter and the rail first (they are what a visitor sees first, from the door), then the shelves, one side and the other in turn. */
export const SLOT_ORDER: readonly number[] = Object.freeze([8, 9, 10, 11, 0, 4, 1, 5, 2, 6, 3, 7])

/** What the shelves are drawn with: the card sizes in room units (the shelf slots read small against their shelves, so the cards are larger than the slots). */
export const CARD_SIZE: Readonly<Record<SlotSpec['kind'], { w: number; h: number }>> = Object.freeze({ shelf: { w: 0.5, h: 0.5 }, counter: { w: 0.5, h: 0.5 }, rail: { w: 0.54, h: 0.78 } })
/** How far a card stands out of its slot, along its facing, so it never sinks into the wall or the counter. */
const STAND_OUT = 0.07

export interface CardPlace { x: number; y: number; z: number; yaw: number; tilt: number; w: number; h: number }
/** Where a card's middle is and which way it faces: a card on a shelf or the counter stands on its slot and leans back a little; a rail card hangs from it. */
export function cardPlace(slot: SlotSpec): CardPlace {
  const { w, h } = CARD_SIZE[slot.kind]
  const [fx, , fz] = slot.facing
  const standing = slot.anchor === 'bottom'
  return { x: slot.x + fx * STAND_OUT, y: standing ? slot.y + h / 2 : slot.y - h / 2, z: slot.z + fz * STAND_OUT, yaw: Math.atan2(fx, fz), tilt: standing ? -0.1 : 0, w, h }
}

// ---- pages ----------------------------------------------------------------------------------------------------------------------

export const pageCount = (items: number): number => Math.max(1, Math.ceil(Math.max(0, items) / PAGE_SIZE))
export const clampPage = (page: number, items: number): number => Math.min(pageCount(items) - 1, Math.max(0, Math.trunc(Number.isFinite(page) ? page : 0)))
/** The items of one page, each with its slot: item `n` of the page goes to `SLOTS[SLOT_ORDER[n]]`; `index` is its number in the whole list. */
export function pageOf<T>(items: readonly T[], page: number): { item: T; slot: SlotSpec; index: number }[] {
  const at = clampPage(page, items.length) * PAGE_SIZE
  return items.slice(at, at + PAGE_SIZE).flatMap((item, n) => { const slot = SLOTS[SLOT_ORDER[n] ?? -1]; return slot ? [{ item, slot, index: at + n }] : [] })
}

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

/** A room from a shop's page (the Services app) or from a public address (`links` present: the seller's own links, released to anyone who has the address). */
export function roomFromView(view: ShowcaseView, links?: { chat: string | null; pay: string | null }, place = '', zone = 'Africa/Lagos'): RoomData {
  const photos = photosOf(view.photos)
  return {
    shopId: view.id, name: plain(view.name, 40), sign: plain(view.sign, 24), category: view.category, theme: themeFor(view.category), colours: [safeHex(view.colours[0], '#1f3a5f'), safeHex(view.colours[1], '#f1f3f5')], about: plain(view.about, 400),
    hours: view.hours.slice(0, 7), place: plain(place, 80), zone, items: itemsOf(view.serviceList, new Set(photos.map((photo) => photo.id))), photos,
    chat: links ? safeLink(links.chat) : null, pay: links ? safeLink(links.pay) : null, hasPay: links ? safeLink(links.pay) !== null : view.pay, payNotice: view.payNotice ? plain(view.payNotice, 80) : null, author: view.badge?.id ? { id: view.badge.id, name: plain(view.badge.name, 40) } : null,
    access: links ? 'direct' : 'released',
  }
}
/** The seller's own record, drafts and unapproved photos included: the preview before publishing. */
export function roomFromMine(shop: NonNullable<ShowcaseMine['shop']>, place = '', zone = 'Africa/Lagos'): RoomData {
  const photos = photosOf(shop.photos.filter((photo) => !photo.hidden))
  return {
    shopId: shop.id, name: plain(shop.name, 40), sign: plain(shop.sign, 24), category: shop.category, theme: themeFor(shop.category), colours: [safeHex(shop.colours[0], '#1f3a5f'), safeHex(shop.colours[1], '#f1f3f5')], about: plain(shop.about, 400),
    hours: shop.hours.slice(0, 7), place: plain(place, 80), zone, items: itemsOf(shop.services, new Set(photos.map((photo) => photo.id))), photos,
    chat: safeLink(shop.chat.url), pay: safeLink(shop.pay?.url), hasPay: safeLink(shop.pay?.url) !== null, payNotice: null, author: null, access: 'preview',
  }
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
export const roomLabel = (data: RoomData): string => `${data.name}: a 3D shop with ${data.items.length === 1 ? '1 item' : `${data.items.length} items`}`

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
