/**
 * OWNER: spaces
 * THE SPACE PLAN: one home or group room written as data, the contract every way of making a space shares (the AI designer of
 * server/spaces/design.ts, the Import box of the design sheet, the Allworld skill for Claude in skills/allworld-spaces/ and the
 * agent tool import_space). Pure: no DOM, no three, no I/O. Design: docs/SPACES.md.
 *
 *   { schema: 'allworld-space', version: 1, target: 'home' | 'room', tier?, style?, title?, notes?, items: [{ itemId, x, y, rot, floor? }] }
 *
 * A plan is only a wish. It never executes and it never touches geometry: every piece is checked by the placement rules of a real
 * home (src/game/home-layout.ts with the plan's rooms from src/game/home-plan.ts), in order, and a piece that cannot stand where it
 * was asked is moved to the nearest free spot on its floor or left out, with a plain line saying so (fitSpacePlan). Applying it buys
 * through the ordinary furniture actions (server/spaces/apply.ts), so cash, MAX_PLACED and every shop rule hold as they always do.
 *
 * ON THE WIRE a plan is sent packed (packPlan): the items as [itemId, x, y, rot, floor] tuples, so a full 160-piece house stays under
 * the 8 KB request limit of the server. normalizeSpacePlan reads both forms.
 *
 * Nothing here is under src/game, so none of it is in the first download.
 */
import { FURNITURE } from '../game/content/furniture.ts'
import { HOUSE_STYLE, HOUSE_TIERS, STYLE_FIELDS, TIER_ORDER } from '../game/content/world.ts'
import { checkPlacement, doorSlot, frontDoorBlocked, normalise, plotOf, windowSlot, type Plot } from '../game/home-layout.ts'
import { ruledPlot, planOf } from '../game/home-plan.ts'
import type { FurnitureId, HouseStyle, HouseTierId, PlacedItem } from '../types/life.ts'
import type { FurnitureDefinition } from '../types/content.ts'

export const SPACE_PLAN_SCHEMA = 'allworld-space' as const
export const SPACE_PLAN_VERSION = 1 as const
export const SPACE_TARGETS = ['home', 'room'] as const
/** Pieces a home holds: MAX_PLACED of src/game/home-layout.ts, written here so the page's engine chunk exports nothing new for this lazy
 * module (plan.test.ts asserts the two are equal). */
export const MAX_PLACED = 160
export type SpaceTarget = (typeof SPACE_TARGETS)[number]

export const SPACE_LIMITS = Object.freeze({
  /** Characters of a plan's title (it passes the text filter before anyone else reads it). */
  title: 80,
  /** Characters of the model's own notes (never shown to anyone else; dropped on import). */
  notes: 400,
  /** Characters of a pasted plan the Import box reads. */
  pasted: 32 * 1024,
  /** Characters of a player's description. */
  prompt: 500,
  /** Pieces in a group room (src/places/model.ts PLACES.roomItems). */
  roomItems: 60,
  /** A group room's side in tiles (PLACES.roomGrid). */
  roomGrid: 10,
})

export interface SpacePlanItem { itemId: FurnitureId; x: number; y: number; rot: number; floor?: number }
export interface SpacePlanV1 {
  schema: typeof SPACE_PLAN_SCHEMA
  version: typeof SPACE_PLAN_VERSION
  /** 'home' places into the player's saved home; 'room' into a group room (10 × 10, one floor, free furniture). */
  target: SpaceTarget
  /** The house size the plan was drawn for. Applying to another size re-fits it. */
  tier?: HouseTierId
  /** Indexes into HOUSE_STYLE (the look of the house). Ignored for a room. */
  style?: Partial<HouseStyle>
  /** One line shown on the card and the share. */
  title?: string
  /** The designer's own notes on its choices; never shown to other players. */
  notes?: string
  items: SpacePlanItem[]
}
/** Why a piece moved or was left out, in words a player reads. */
export interface SpaceProblem { index: number; itemId: string; code: 'unknown_item' | 'moved' | 'left_out' | 'too_many'; reason: string }
export type PackedItem = [itemId: string, x: number, y: number, rot: number, floor?: number]
export interface PackedPlan { v: 1; target: SpaceTarget; tier?: HouseTierId; style?: Partial<HouseStyle>; title?: string; items: PackedItem[] }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const whole = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value)
const isTier = (value: unknown): value is HouseTierId => typeof value === 'string' && Object.hasOwn(HOUSE_TIERS, value)
const isTarget = (value: unknown): value is SpaceTarget => value === 'home' || value === 'room'
const isItemId = (value: unknown): value is FurnitureId => typeof value === 'string' && Object.hasOwn(FURNITURE, value)
/** The catalogue entry of an id already known to be in it. */
const defOf = (id: FurnitureId): FurnitureDefinition => FURNITURE[id]!
/** One line: control characters and runs of spaces become one space, cut to `max`. */
export const oneLine = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')

/** The style fields a plan names, each a valid index; the rest are left to the house's own look. */
export function cleanPartialStyle(value: unknown): Partial<HouseStyle> | undefined {
  if (!isRecord(value)) return undefined
  const style: Partial<HouseStyle> = {}
  for (const field of STYLE_FIELDS) {
    const raw = value[field]
    if (whole(raw) && raw >= 0 && raw < HOUSE_STYLE[field].length) style[field] = raw
  }
  return Object.keys(style).length ? style : undefined
}

/**
 * A plan from anything (a model's answer, a pasted text's JSON, a packed request), or null when it is not one. Unknown keys are dropped,
 * numbers must be whole, a piece the catalogue does not have is left out and named in `problems`. A plan without `target` takes
 * `fallback` (the target the caller is designing for). Never throws.
 */
export function normalizeSpacePlan(value: unknown, problems: SpaceProblem[] = [], fallback?: SpaceTarget): SpacePlanV1 | null {
  if (!isRecord(value)) return null
  if (value.schema !== undefined && value.schema !== SPACE_PLAN_SCHEMA) return null
  const version = value.version ?? value.v
  if (version !== undefined && version !== SPACE_PLAN_VERSION) return null
  const target = isTarget(value.target) ? value.target : fallback
  if (!target || !Array.isArray(value.items)) return null
  const cap = target === 'room' ? SPACE_LIMITS.roomItems : MAX_PLACED
  const items: SpacePlanItem[] = []
  value.items.forEach((raw: unknown, index: number) => {
    const entry = Array.isArray(raw) ? { itemId: raw[0], x: raw[1], y: raw[2], rot: raw[3] ?? 0, floor: raw[4] } : isRecord(raw) ? { itemId: raw.itemId ?? raw.item ?? raw.id, x: raw.x, y: raw.y, rot: raw.rot ?? 0, floor: raw.floor } : null
    if (!entry) return
    if (!isItemId(entry.itemId)) { problems.push({ index, itemId: String(entry.itemId).slice(0, 40), code: 'unknown_item', reason: `“${String(entry.itemId).slice(0, 40)}” is not in the furniture catalogue, so it was left out.` }); return }
    if (!whole(entry.x) || !whole(entry.y) || !whole(entry.rot) || Math.abs(entry.x) > 99 || Math.abs(entry.y) > 99) { problems.push({ index, itemId: entry.itemId, code: 'left_out', reason: `${defOf(entry.itemId).label} had no proper position, so it was left out.` }); return }
    if (items.length >= cap) { problems.push({ index, itemId: entry.itemId, code: 'too_many', reason: `A ${target === 'room' ? 'room' : 'home'} holds at most ${cap} pieces; ${defOf(entry.itemId).label} was left out.` }); return }
    const floor = whole(entry.floor) && entry.floor > 0 && entry.floor < 3 ? entry.floor : 0
    items.push({ itemId: entry.itemId, x: entry.x, y: entry.y, rot: ((entry.rot % 4) + 4) % 4, ...(floor ? { floor } : {}) })
  })
  const plan: SpacePlanV1 = { schema: SPACE_PLAN_SCHEMA, version: SPACE_PLAN_VERSION, target, items }
  if (target === 'home' && isTier(value.tier)) plan.tier = value.tier
  const style = target === 'home' ? cleanPartialStyle(value.style) : undefined
  if (style) plan.style = style
  const title = oneLine(value.title, SPACE_LIMITS.title)
  if (title) plan.title = title
  const notes = oneLine(value.notes, SPACE_LIMITS.notes)
  if (notes) plan.notes = notes
  return plan
}

/** The plan as it travels in a request: tuples, no notes. */
export function packPlan(plan: SpacePlanV1): PackedPlan {
  return {
    v: 1, target: plan.target, ...(plan.tier ? { tier: plan.tier } : {}), ...(plan.style ? { style: plan.style } : {}), ...(plan.title ? { title: plan.title } : {}),
    items: plan.items.map((item) => (item.floor ? [item.itemId, item.x, item.y, item.rot, item.floor] : [item.itemId, item.x, item.y, item.rot])),
  }
}

/** The first JSON object in a text (a model's answer may wrap it in words or a code fence), parsed, or undefined. */
export function firstJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) return undefined
  let depth = 0, quoted = false, escaped = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue }
    if (c === '"') quoted = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) { try { return JSON.parse(text.slice(start, i + 1)) } catch { return undefined } }
  }
  return undefined
}

// ---- where a plan goes ----------------------------------------------------------------------------------------------------
/** The plot of a house of `tier` (owned; the starter is one room), with its rooms' walls and stairs as placement rules. */
export const tierPlot = (tier: HouseTierId): Plot => ruledPlot(plotOf(HOUSE_TIERS[tier].grid, tier !== 'starter'))
/** A group room: grid × grid, one floor. */
export const roomPlot = (): Plot => plotOf(SPACE_LIMITS.roomGrid)

/** The rooms of a plot in words, for a designer: "floor 0: Parlour x0–9 y0–9; Bedroom x10–14 y0–4 …". */
export function describePlot(plot: Plot): string[] {
  const plan = planOf(plot)
  const lines = [`Plot ${plot.w} wide (x 0–${plot.w - 1}) by ${plot.d} deep (y 0–${plot.d - 1}), ${plot.floors} floor${plot.floors > 1 ? 's' : ''}. Front door on the side wall at x 0, y ${doorSlot(plot.grid)}; window on the back wall at x ${windowSlot(plot.grid)}.`]
  plan.floors.forEach((rooms, floor) => {
    if (rooms.length) lines.push(`Floor ${floor}: ${rooms.map((room) => `${room.label} x${room.x}–${room.x + room.w - 1} y${room.y}–${room.y + room.h - 1}`).join('; ')}.`)
  })
  for (const flight of plan.stairs) lines.push(`Stairs from floor ${flight.floor} at x${flight.x}–${flight.x + flight.w - 1} y${flight.y}–${flight.y + flight.h - 1}: keep them and one tile at each end clear.`)
  return lines
}

// ---- fitting a plan into a real plot --------------------------------------------------------------------------------------
export interface FitResult {
  /** The pieces as they will stand, ids `f1…` in plan order (apply gives them the home's own ids). */
  items: PlacedItem[]
  problems: SpaceProblem[]
  /** Catalogue price of every piece placed (before what the player already owns). */
  cost: number
}
const where = (def: { wall?: boolean }, at: { x: number; y: number; rot: number }): string => (def.wall ? `${at.rot === 0 ? 'back' : 'side'} wall slot ${at.rot === 0 ? at.x : at.y}` : `x ${at.x}, y ${at.y}`)

/** Why a piece cannot stand at a position of a plot holding `items`, or null. The same checks as buying it there (systems/home.ts placeable). */
function refusal(plot: Plot, items: readonly PlacedItem[], itemId: FurnitureId, x: number, y: number, rot: number, floor: number): string | null {
  const def = defOf(itemId), at = normalise(def, x, y, rot)
  if (!at) return 'Choose a tile inside your room.'
  return (frontDoorBlocked(plot.grid, def, at, floor) ?? checkPlacement(plot, items, def, at.x, at.y, at.rot, null, floor))?.reason ?? null
}

/** The free spot nearest to (x, y) on a floor (walls: the nearest free slot), or null when the floor has none. */
function nearestSpot(plot: Plot, items: readonly PlacedItem[], itemId: FurnitureId, x: number, y: number, rot: number, floor: number): { x: number; y: number; rot: number } | null {
  const def = defOf(itemId)
  let best: { x: number; y: number; rot: number } | null = null, bestDistance = Infinity
  const consider = (cx: number, cy: number, crot: number): void => {
    const distance = Math.abs(cx - x) + Math.abs(cy - y) + (crot === rot ? 0 : 0.5)
    if (distance < bestDistance && !refusal(plot, items, itemId, cx, cy, crot, floor)) { best = { x: cx, y: cy, rot: crot }; bestDistance = distance }
  }
  if (def.wall) {
    for (let slot = 0; slot < plot.w; slot++) consider(slot, 0, 0)
    for (let slot = 0; slot < plot.d; slot++) consider(0, slot, 1)
    return best
  }
  for (const r of def.w === def.h ? [0] : [rot % 2, (rot + 1) % 2]) for (let cy = 0; cy < plot.d; cy++) for (let cx = 0; cx < plot.w; cx++) consider(cx, cy, r)
  return best
}

/**
 * Fit a plan into a plot, piece by piece in plan order: a piece that can stand where it was asked stays; otherwise it takes the
 * nearest free spot on its floor (`moved`), otherwise it is left out (`left_out`). `repair: false` only checks (nothing moves).
 * Deterministic: the same plan and plot give the same answer, on the server and in the page.
 */
export interface FitOptions {
  /** false: only check (nothing moves). */
  repair?: boolean
  /** Most pieces. */
  limit?: number
  /** What a piece costs the scene (triangles), and how much a floor may carry: a piece past it is left out (server/spaces/weight.ts). */
  weigh?: (itemId: FurnitureId) => number
  allowance?: number
}
export function fitSpacePlan(plan: SpacePlanV1, plot: Plot, { repair = true, limit = plan.target === 'room' ? SPACE_LIMITS.roomItems : MAX_PLACED, weigh, allowance = Infinity }: FitOptions = {}): FitResult {
  const items: PlacedItem[] = [], problems: SpaceProblem[] = [], load = [0, 0, 0]
  let cost = 0
  plan.items.forEach((wanted, index) => {
    const def = FURNITURE[wanted.itemId]
    if (!def) return
    if (items.length >= limit) { problems.push({ index, itemId: wanted.itemId, code: 'too_many', reason: `There is room for ${limit} pieces; ${def.label} was left out.` }); return }
    const floor = (wanted.floor ?? 0) < plot.floors ? wanted.floor ?? 0 : 0
    const weight = weigh?.(wanted.itemId) ?? 0
    if (load[floor]! + weight > allowance) { problems.push({ index, itemId: wanted.itemId, code: 'too_many', reason: `${def.label} was left out: that floor is full enough to stay smooth on a phone.` }); return }
    const asked = normalise(def, wanted.x, wanted.y, wanted.rot)
    const why = asked ? refusal(plot, items, wanted.itemId, asked.x, asked.y, asked.rot, floor) : 'no position'
    let at = asked && !why ? asked : null
    if (!at && repair) {
      at = nearestSpot(plot, items, wanted.itemId, wanted.x, wanted.y, wanted.rot, floor)
      if (at) problems.push({ index, itemId: wanted.itemId, code: 'moved', reason: `${def.label} moved to ${where(def, at)}${floor ? ` upstairs` : ''}: ${why ?? 'its spot was taken'}` })
    }
    if (!at) { problems.push({ index, itemId: wanted.itemId, code: 'left_out', reason: `${def.label} was left out: ${why ?? 'there is no free spot on its floor.'}` }); return }
    items.push({ id: `f${items.length + 1}`, itemId: wanted.itemId, x: at.x, y: at.y, rot: at.rot, ...(floor ? { floor } : {}) })
    load[floor] = load[floor]! + weight
    cost += def.price
  })
  return { items, problems, cost }
}
/** Check only: what fits where it was asked. */
export const validateSpacePlan = (plan: SpacePlanV1, plot: Plot, options: FitOptions = {}): FitResult => fitSpacePlan(plan, plot, { ...options, repair: false })
/** Check and move what does not fit to the nearest free spot. */
export const repairSpacePlan = (plan: SpacePlanV1, plot: Plot, options: FitOptions = {}): FitResult => fitSpacePlan(plan, plot, { ...options, repair: true })

/** The plan with its pieces where they will stand (after fitting), keeping title, style and tier. */
export const fittedPlan = (plan: SpacePlanV1, fit: FitResult): SpacePlanV1 => ({ ...plan, items: fit.items.map(({ itemId, x, y, rot, floor }) => ({ itemId, x, y, rot, ...(floor ? { floor } : {}) })) })

// ---- a brief: pieces by room, laid out by code ----------------------------------------------------------------------------
/**
 * A BRIEF is what the in-game designer answers: which pieces go in which named room, no positions. Positions are the hard part for a
 * language model (it spends most of its time on them and still gets some wrong); here they are chosen by code, inside the walls of the
 * room the model named: big pieces against the room's walls, a rug in its middle, wall pieces on the plot's walls within the room's span.
 */
export interface SpaceBrief { title?: string; style?: Partial<HouseStyle>; rooms: { room: string; items: string[] }[] }
const KEEP_CLEAR_SHAPES = new Set(['rug'])

/** A brief from a model's answer (`{ title?, style?, rooms: [{ room, items: [id…] }] }`), or null. */
export function readBrief(value: unknown): SpaceBrief | null {
  if (!isRecord(value) || !Array.isArray(value.rooms)) return null
  const rooms: SpaceBrief['rooms'] = []
  for (const raw of value.rooms.slice(0, 24)) {
    if (!isRecord(raw) || !Array.isArray(raw.items)) continue
    rooms.push({ room: oneLine(raw.room ?? raw.name, 40), items: raw.items.slice(0, MAX_PLACED).map((id: unknown) => String(id).slice(0, 40)) })
  }
  const brief: SpaceBrief = { rooms }
  const title = oneLine(value.title, SPACE_LIMITS.title)
  if (title) brief.title = title
  const style = cleanPartialStyle(value.style)
  if (style) brief.style = style
  return brief
}

/**
 * Lay a brief out in a plot. `keep` are pieces already standing that stay where they are (they are placed first). A piece of a room the
 * plot does not have goes to the first room of the ground floor with space; a piece the catalogue does not have is named in `problems`.
 */
export function layoutBrief(brief: SpaceBrief, plot: Plot, target: SpaceTarget, problems: SpaceProblem[] = [], keep: readonly PlacedItem[] = []): SpacePlanV1 {
  const plan = planOf(plot)
  const rooms = plan.floors.flatMap((list, floor) => list.map((room) => ({ ...room, floor })))
  const cap = target === 'room' ? SPACE_LIMITS.roomItems : MAX_PLACED
  const placed: PlacedItem[] = []
  for (const item of keep) {
    if (placed.length >= cap || !FURNITURE[item.itemId] || refusal(plot, placed, item.itemId, item.x, item.y, item.rot, item.floor ?? 0)) continue
    placed.push({ ...item, id: `f${placed.length + 1}` })
  }
  const kept = placed.length
  const byLabel = (label: string) => rooms.find((room) => room.label.toLowerCase() === label.toLowerCase()) ?? rooms.find((room) => label && room.label.toLowerCase().includes(label.toLowerCase()))
  let index = 0
  for (const group of brief.rooms) {
    const home = byLabel(group.room)
    for (const id of group.items) {
      index++
      if (!isItemId(id)) { problems.push({ index, itemId: id, code: 'unknown_item', reason: `“${id}” is not in the furniture catalogue, so it was left out.` }); continue }
      const def = defOf(id)
      if (placed.length >= cap) { problems.push({ index, itemId: id, code: 'too_many', reason: `There is room for ${cap} pieces; ${def.label} was left out.` }); continue }
      const order = home ? [home, ...rooms.filter((room) => room !== home)] : rooms
      let spot: { x: number; y: number; rot: number; floor: number } | null = null
      for (const room of order) { spot = spotInRoom(plot, placed, id, room); if (spot) break }
      if (!spot) { problems.push({ index, itemId: id, code: 'left_out', reason: `${def.label} was left out: there is no free spot for it.` }); continue }
      placed.push({ id: `f${placed.length + 1}`, itemId: id, x: spot.x, y: spot.y, rot: spot.rot, ...(spot.floor ? { floor: spot.floor } : {}) })
    }
  }
  const out: SpacePlanV1 = { schema: SPACE_PLAN_SCHEMA, version: SPACE_PLAN_VERSION, target, items: placed.map(({ itemId, x, y, rot, floor }) => ({ itemId, x, y, rot, ...(floor ? { floor } : {}) })) }
  if (brief.title) out.title = brief.title
  if (target === 'home' && brief.style) out.style = brief.style
  if (kept && !brief.rooms.length) out.items = out.items.slice(0, kept)
  return out
}

/** The best free spot for a piece inside a room: against its walls (a rug: its middle), back corner first. */
function spotInRoom(plot: Plot, placed: readonly PlacedItem[], itemId: FurnitureId, room: { x: number; y: number; w: number; h: number; floor: number }): { x: number; y: number; rot: number; floor: number } | null {
  const def = defOf(itemId), floor = room.floor
  if (def.wall) {
    if (room.y === 0) for (let slot = room.x; slot < room.x + room.w; slot++) if (!refusal(plot, placed, itemId, slot, 0, 0, floor)) return { x: slot, y: 0, rot: 0, floor }
    if (room.x === 0) for (let slot = room.y; slot < room.y + room.h; slot++) if (!refusal(plot, placed, itemId, 0, slot, 1, floor)) return { x: 0, y: slot, rot: 1, floor }
    return null
  }
  const middle = KEEP_CLEAR_SHAPES.has(def.shape)
  const cx = room.x + room.w / 2, cy = room.y + room.h / 2
  let best: { x: number; y: number; rot: number; floor: number } | null = null, bestScore = Infinity
  for (const rot of def.w === def.h ? [0] : [0, 1]) {
    const w = rot ? def.h : def.w, h = rot ? def.w : def.h
    for (let y = room.y; y + h <= room.y + room.h; y++) for (let x = room.x; x + w <= room.x + room.w; x++) {
      const edge = Math.min(x - room.x, y - room.y, room.x + room.w - (x + w), room.y + room.h - (y + h))
      const score = middle ? Math.abs(x + w / 2 - cx) + Math.abs(y + h / 2 - cy) : edge * 100 + (y - room.y) + (x - room.x) * 0.5 + rot * 0.1
      if (score < bestScore && !refusal(plot, placed, itemId, x, y, rot, floor)) { best = { x, y, rot, floor }; bestScore = score }
    }
  }
  return best
}

// ---- what applying it costs ----------------------------------------------------------------------------------------------
export interface SpaceDiff {
  /** Pieces to buy, by catalogue id, with their count. */
  buy: Partial<Record<FurnitureId, number>>
  /** Pieces the player already owns (placed or stored) that the plan reuses. */
  reuse: Partial<Record<FurnitureId, number>>
  /** Pieces now placed that the plan does not use: they go to storage (nothing is sold). */
  store: Partial<Record<FurnitureId, number>>
  /** Catalogue price of what must be bought. */
  cost: number
}
const counts = (ids: readonly FurnitureId[]): Map<FurnitureId, number> => { const map = new Map<FurnitureId, number>(); for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1); return map }

/** What a home needs to become the plan: owned pieces (placed or stored) are reused first, the rest is bought; nothing is sold. */
export function spacePlanDiff(placed: readonly PlacedItem[], storage: Readonly<Partial<Record<FurnitureId, number>>>, planItems: readonly { itemId: FurnitureId }[]): SpaceDiff {
  const want = counts(planItems.map((item) => item.itemId)), have = counts(placed.map((item) => item.itemId))
  for (const [id, n] of Object.entries(storage)) if (isItemId(id) && whole(n) && n > 0) have.set(id, (have.get(id) ?? 0) + n)
  const diff: SpaceDiff = { buy: {}, reuse: {}, store: {}, cost: 0 }
  for (const [id, n] of want) {
    const owned = Math.min(n, have.get(id) ?? 0)
    if (owned) diff.reuse[id] = owned
    if (n > owned) { diff.buy[id] = n - owned; diff.cost += (n - owned) * defOf(id).price }
  }
  const placedCount = counts(placed.map((item) => item.itemId))
  for (const [id, n] of placedCount) { const spare = n - (want.get(id) ?? 0); if (spare > 0) diff.store[id] = spare }
  return diff
}

/** The cost of the look a plan asks for, from the house's current look (only fields that change to a priced option cost). */
export function stylePriceOf(current: HouseStyle, wanted: Partial<HouseStyle> | undefined): number {
  let total = 0
  for (const field of STYLE_FIELDS) { const to = wanted?.[field]; if (to !== undefined && to !== current[field]) total += HOUSE_STYLE[field][to]?.price ?? 0 }
  return total
}

/** The tiers in order, for prompts and pickers. */
export const SPACE_TIERS: readonly HouseTierId[] = TIER_ORDER
