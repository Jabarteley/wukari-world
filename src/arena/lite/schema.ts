/**
 * OWNER: spaces (lite games)
 * A LITE GAME: a small real-time game written as data, played by ONE fixed engine (./rules.ts) and drawn by ONE renderer (./draw.ts).
 * No code of the author ever runs: the definition only picks from fixed kinds, shapes, behaviours and win rules, with bounded numbers.
 * This is the instant path for player-made games (docs/SPACES.md, "Lite games"); anything the schema cannot say goes through the
 * reviewed cartridge path (docs/CARTRIDGES.md, "Player-made games").
 *
 *   { schema: 'allworld-lite', version: 1, title, hz?, seats: { min, max }, arena: { w, h }, controls: 'left-right' | 'stick',
 *     player: { size, speed, lives }, entities: [{ id, kind, shape, size, speed, behaviour, spawn, every?, max?, value?, label? }],
 *     rules: { win, points?, seconds? }, palette?: { bg, ground, player, hazard, pickup, goal, wall } }
 *
 * Pure: no DOM, no I/O. Imported by the server (validation, the engine) and by the lite screen.
 */
export const LITE_SCHEMA = 'allworld-lite' as const
export const LITE_LIMITS = Object.freeze({
  /** Characters of a definition, as JSON. */
  bytes: 8 * 1024,
  title: 40,
  label: 16,
  /** Entity kinds a definition may declare. */
  kinds: 8,
  /** Things alive at once on the field (the snapshot stays small at 8 seats). */
  alive: 16,
  seats: 8,
  /** The arena in game units: positions are whole numbers inside it. */
  arenaMin: 40,
  arenaMax: 240,
  seconds: { min: 10, max: 180 },
})
export const LITE_KINDS = ['hazard', 'pickup', 'goal', 'wall'] as const
export const LITE_SHAPES = ['circle', 'square'] as const
export const LITE_BEHAVIOURS = ['fall', 'bounce', 'chase', 'static', 'patrol'] as const
export const LITE_SPAWNS = ['top', 'random', 'edges', 'fixed'] as const
export const LITE_WINS = ['last-standing', 'most-points', 'first-to-goal', 'timer'] as const
export const LITE_CONTROLS = ['left-right', 'stick'] as const
export type LiteKind = (typeof LITE_KINDS)[number]
export type LiteShape = (typeof LITE_SHAPES)[number]
export type LiteBehaviour = (typeof LITE_BEHAVIOURS)[number]
export type LiteSpawn = (typeof LITE_SPAWNS)[number]
export type LiteWin = (typeof LITE_WINS)[number]
export type LiteControls = (typeof LITE_CONTROLS)[number]

export interface LiteEntity {
  id: string
  kind: LiteKind
  shape: LiteShape
  /** Side (or diameter) in arena units, 2–40. */
  size: number
  /** Units a tick, 0–8. */
  speed: number
  behaviour: LiteBehaviour
  spawn: LiteSpawn
  /** For `fixed`: where it stands. */
  x?: number
  y?: number
  /** Ticks between spawns (4–600). A `fixed` thing appears once at the start. */
  every?: number
  /** Most of this kind alive at once (1–16). */
  max?: number
  /** Points a pickup gives (1–100). */
  value?: number
  label?: string
}
export interface LiteGameV1 {
  schema: typeof LITE_SCHEMA
  version: 1
  title: string
  hz: number
  seats: { min: number; max: number }
  arena: { w: number; h: number }
  controls: LiteControls
  player: { size: number; speed: number; lives: number }
  entities: LiteEntity[]
  rules: { win: LiteWin; points?: number; seconds?: number }
  palette: { bg: string; ground: string; player: string; hazard: string; pickup: string; goal: string; wall: string }
}

const DEFAULT_PALETTE: LiteGameV1['palette'] = { bg: '#183b2a', ground: '#2f6b45', player: '#f2c14e', hazard: '#8b5a2b', pickup: '#3fbf7f', goal: '#ffffff', wall: '#6b6b6b' }
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const one = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === 'string' && (list as readonly string[]).includes(value)
const HEX = /^#[0-9a-fA-F]{6}$/
const WORD = /^[a-z][a-z0-9-]{0,15}$/
/** Plain words: letters, digits, spaces and a little punctuation; nothing that could be markup or a link. */
const SAFE = /^[\p{L}\p{N} .,!?'’&()-]*$/u
/** A web address in plain words (the server's text filter checks again with its full rules). */
const ADDRESS = /www\.|\b[a-z0-9-]+\.(com|net|org|ng|io|co|xyz|app|gg|me|ly|tv|info|biz|link|shop|site|online)\b/i

/** A definition read from anything, every number checked against its range; `problems` says what is wrong in plain words. */
export function readLite(value: unknown): { def: LiteGameV1 | null; problems: string[] } {
  const problems: string[] = []
  const bad = (text: string): void => { problems.push(text) }
  if (!isRecord(value)) return { def: null, problems: ['A lite game is one JSON object.'] }
  try { if (JSON.stringify(value).length > LITE_LIMITS.bytes) bad(`A lite game is at most ${LITE_LIMITS.bytes} characters.`) } catch { bad('That is not plain JSON.') }
  if (value.schema !== LITE_SCHEMA || value.version !== 1) bad(`It needs "schema": "${LITE_SCHEMA}" and "version": 1.`)
  const int = (raw: unknown, what: string, min: number, max: number, fallback?: number): number => {
    if (raw === undefined && fallback !== undefined) return fallback
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min || raw > max) { bad(`${what} must be a whole number from ${min} to ${max}.`); return fallback ?? min }
    return raw
  }
  const words = (raw: unknown, what: string, max: number, required: boolean): string => {
    if (raw === undefined && !required) return ''
    if (typeof raw !== 'string' || !raw.trim() || raw.length > max || !SAFE.test(raw) || ADDRESS.test(raw)) { bad(`${what} must be plain words, at most ${max} characters.`); return '' }
    return raw.trim()
  }
  const title = words(value.title, 'title', LITE_LIMITS.title, true)
  const hz = int(value.hz, 'hz', 10, 20, 15)
  const seats = isRecord(value.seats) ? value.seats : {}
  const min = int(seats.min, 'seats.min', 1, LITE_LIMITS.seats, 2), max = int(seats.max, 'seats.max', 1, LITE_LIMITS.seats, Math.max(2, min))
  if (max < min) bad('seats.max must be at least seats.min.')
  const arena = isRecord(value.arena) ? value.arena : {}
  const w = int(arena.w, 'arena.w', LITE_LIMITS.arenaMin, LITE_LIMITS.arenaMax, 160), h = int(arena.h, 'arena.h', LITE_LIMITS.arenaMin, LITE_LIMITS.arenaMax, 120)
  const controls = one(LITE_CONTROLS, value.controls) ? value.controls : (bad('controls must be "left-right" or "stick".'), 'left-right' as const)
  const p = isRecord(value.player) ? value.player : {}
  const player = { size: int(p.size, 'player.size', 4, 30, 10), speed: int(p.speed, 'player.speed', 1, 8, 3), lives: int(p.lives, 'player.lives', 1, 9, 3) }
  const entities: LiteEntity[] = []
  if (!Array.isArray(value.entities) || value.entities.length < 1 || value.entities.length > LITE_LIMITS.kinds) bad(`entities must list 1 to ${LITE_LIMITS.kinds} kinds of thing.`)
  const ids = new Set<string>()
  for (const [index, raw] of (Array.isArray(value.entities) ? value.entities.slice(0, LITE_LIMITS.kinds) : []).entries()) {
    const e = isRecord(raw) ? raw : {}, at = `entities[${index}]`
    const id = typeof e.id === 'string' && WORD.test(e.id) ? e.id : (bad(`${at}.id must be a short lower-case word.`), `thing${index}`)
    if (ids.has(id)) bad(`${at}.id "${id}" is used twice.`)
    ids.add(id)
    const kind = one(LITE_KINDS, e.kind) ? e.kind : (bad(`${at}.kind must be one of ${LITE_KINDS.join(', ')}.`), 'hazard' as const)
    const behaviour = one(LITE_BEHAVIOURS, e.behaviour) ? e.behaviour : (bad(`${at}.behaviour must be one of ${LITE_BEHAVIOURS.join(', ')}.`), 'static' as const)
    const spawn = one(LITE_SPAWNS, e.spawn) ? e.spawn : (bad(`${at}.spawn must be one of ${LITE_SPAWNS.join(', ')}.`), 'random' as const)
    const entity: LiteEntity = {
      id, kind, behaviour, spawn,
      shape: one(LITE_SHAPES, e.shape) ? e.shape : 'square',
      size: int(e.size, `${at}.size`, 2, 40, 8),
      speed: int(e.speed, `${at}.speed`, 0, 8, kind === 'wall' || kind === 'goal' ? 0 : 2),
      every: int(e.every, `${at}.every`, 4, 600, 30),
      max: int(e.max, `${at}.max`, 1, LITE_LIMITS.alive, 4),
      ...(kind === 'pickup' ? { value: int(e.value, `${at}.value`, 1, 100, 1) } : {}),
    }
    if (spawn === 'fixed') { entity.x = int(e.x, `${at}.x`, 0, w - 1); entity.y = int(e.y, `${at}.y`, 0, h - 1) }
    const label = words(e.label, `${at}.label`, LITE_LIMITS.label, false)
    if (label) entity.label = label
    if (kind === 'wall' && behaviour !== 'static' && behaviour !== 'patrol') bad(`${at}: a wall can only be static or patrol.`)
    entities.push(entity)
  }
  const r = isRecord(value.rules) ? value.rules : {}
  const win = one(LITE_WINS, r.win) ? r.win : (bad(`rules.win must be one of ${LITE_WINS.join(', ')}.`), 'last-standing' as const)
  const rules: LiteGameV1['rules'] = { win, seconds: int(r.seconds, 'rules.seconds', LITE_LIMITS.seconds.min, LITE_LIMITS.seconds.max, 60) }
  if (win === 'most-points') rules.points = int(r.points, 'rules.points', 1, 999, 20)
  if (win === 'first-to-goal' && !entities.some((e) => e.kind === 'goal')) bad('A first-to-goal game needs a goal among its entities.')
  if (win === 'most-points' && !entities.some((e) => e.kind === 'pickup')) bad('A most-points game needs a pickup among its entities.')
  if ((win === 'last-standing' || win === 'timer') && !entities.some((e) => e.kind === 'hazard')) bad(`A ${win} game needs a hazard among its entities.`)
  const pal = isRecord(value.palette) ? value.palette : {}
  const palette = { ...DEFAULT_PALETTE }
  for (const key of Object.keys(DEFAULT_PALETTE) as (keyof LiteGameV1['palette'])[]) {
    const colour = pal[key]
    if (colour === undefined) continue
    if (typeof colour === 'string' && HEX.test(colour)) palette[key] = colour.toLowerCase()
    else bad(`palette.${key} must be a colour like #1a2b3c.`)
  }
  if (problems.length) return { def: null, problems }
  return { def: { schema: LITE_SCHEMA, version: 1, title, hz, seats: { min, max }, arena: { w, h }, controls, player, entities, rules, palette }, problems }
}
/** True when a value is a valid lite game. */
export const validateLite = (value: unknown): string[] => readLite(value).problems
/** Every word a definition shows to other players (title and labels), for the text filter. */
export const liteWords = (def: LiteGameV1): string[] => [def.title, ...def.entities.map((e) => e.label ?? '').filter(Boolean)]
