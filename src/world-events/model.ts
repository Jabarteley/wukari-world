/**
 * OWNER: world events (docs/WORLD-EVENTS.md, WOW plan Phase 2)
 * THE WEEKLY WORLD EVENT, AS PURE FUNCTIONS. One event a week at a fixed time (Saturday 20:00, Lagos time, by default), in one city, with
 * one goal and one shared counter. The server (server/world-events/) stores the counter and decides every step; the page and the venue
 * scene read the same functions. Nothing here makes a request or reads a clock: every function takes the time.
 *
 * It is deliberately NOT under src/game/ (vite.config.ts sends everything there to the first download): the HUD chip, the Square's panel
 * and the venue scene reach it through dynamic imports only.
 *
 *   announced  from the Monday of the week until the warm-up: "Saturday 20:00: Rebuild the footbridge in Lagos"
 *   warmup     the hour before: "the admins are in town", with surprise drops in the Square
 *   live       the event: people walk, carry or answer; the bar moves
 *   done       after the end, until the next week's event is announced
 *
 * THREE GOAL KINDS, each fed by something the server sees for itself, never by a number the page sends:
 *   gather   walk to the event's venues in the city: the room module admits a person to a venue only where their stored life stands
 *            (server/ws/rooms.ts), so an arrival is a fact. One step per person per venue.
 *   deliver  carry a load: pick it up while standing in the first venue, put it down while standing in the second, at least
 *            DELIVER_MIN_MS later and within DELIVER_MAX_MS. Both ends are checked against the room the person is in.
 *   answer   answer the city's questions: the accepted answers stay on the server; a wrong answer uses the try.
 */
import { lagosDayStart, lagosTime } from '../game/clock.ts'

const MINUTE = 60000, HOUR = 3600000, DAY = 86400000

export type GoalKind = 'gather' | 'deliver' | 'answer'
export const GOAL_KINDS: readonly GoalKind[] = ['gather', 'deliver', 'answer']
export type Phase = 'announced' | 'warmup' | 'live' | 'done'

/** One question of an `answer` event. `answers` are the accepted answers, compared after `normalAnswer`. They never leave the server. */
export interface Question { id: string; q: string; answers: string[] }
/** What the city looks like for a week after the goal was reached: a label and two colours its gathering venue leans toward. */
export interface CityChangeDef { label: string; colours: [string, string] }
export interface WorldEventDef {
  /** 3 to 40 of a-z, 0-9 and '-'. A built-in id replaced by an admin's event of the same id. */
  id: string
  title: string
  blurb: string
  city: string
  goal: GoalKind
  /** Steps to fill the bar. */
  target: number
  /** gather: the venues to walk to (none: any public venue of the city). deliver: [pick up, put down]. answer: none. */
  venues: string[]
  /** answer only. */
  questions: Question[]
  change: CityChangeDef
  /** The Lagos date (YYYY-MM-DD) of the event day: the event replaces the rotation that week. Absent: it is in the rotation. */
  on?: string
}
export interface Schedule {
  /** 0 = Sunday … 6 = Saturday, Lagos time. */
  weekday: number
  hour: number
  minute: number
  /** How long the event runs. */
  minutes: number
  /** How long the warm-up before it lasts (0: none). */
  warmup: number
  /** No event at all while true. */
  off: boolean
}
/** What an admin changed, kept without a release (server/world-events/admin.ts). */
export interface WorldEventExtras { schedule?: Partial<Schedule> | null; events?: readonly WorldEventDef[]; hidden?: readonly string[] }

export const DEFAULT_SCHEDULE: Readonly<Schedule> = Object.freeze({ weekday: 6, hour: 20, minute: 0, minutes: 60, warmup: 60, off: false })
export const LIMITS = Object.freeze({
  events: 40, hidden: 40, questions: 20, answers: 8, target: [10, 100000] as const, minutes: [15, 240] as const, warmup: [0, 180] as const,
  title: 60, blurb: 160, label: 60, question: 160, answer: 60, venues: 8,
})
/** Steps one person can add to one event, all kinds together: one person can never fill the bar alone. */
export const PER_PERSON_MAX = 12
/** A load must be carried at least this long (walking takes time) and is dropped from the hands after this long. */
export const DELIVER_MIN_MS = 20000, DELIVER_MAX_MS = 20 * MINUTE
/** Warm-up drops: one every DROP_EVERY_MS from the start of the warm-up, open DROP_OPEN_MS, for the first DROP_CAPACITY people in the Square. */
export const DROP_EVERY_MS = 15 * MINUTE, DROP_OPEN_MS = 8 * MINUTE, DROP_CAPACITY = 20
/** At most this share of the bar is filled by the game's AI residents, spread evenly over the event: the bar always moves, people finish it. */
export const AI_SHARE_DEFAULT = 35, AI_SHARE_MAX = 60
/** The city keeps its change for this long after the event ends. */
export const CHANGE_MS = 7 * DAY
/** The chip shows the event from this long before the warm-up, and the result this long after the end. */
export const CHIP_BEFORE_MS = 24 * HOUR, CHIP_AFTER_MS = 3 * HOUR

const HEX = /^#[0-9a-f]{6}$/i, ID = /^[a-z0-9][a-z0-9-]{2,39}$/, VENUE = /^[a-z0-9][a-z0-9-]{0,39}$/, DATE = /^\d{4}-\d{2}-\d{2}$/
const LINKISH = /(https?:|www\.|\.[a-z]{2,4}\/|@)/i

/**
 * The built-in rotation: one a week, in order, from the Monday-started Lagos week number. An admin adds, replaces (same id) or hides any.
 * Venue ids are the cities' own (src/game/cities/<city>/); a venue a city does not have simply never sees an arrival.
 */
export const BUILT_IN: readonly WorldEventDef[] = Object.freeze([
  { id: 'lagos-footbridge', title: 'Rebuild the footbridge at Freedom Park', blurb: 'The old footbridge came down in the rain. Carry planks from the market to Freedom Park, one load at a time.', city: 'lagos', goal: 'deliver', target: 80, venues: ['market', 'park'], questions: [], change: { label: 'The new footbridge at Freedom Park', colours: ['#f0a830', '#2a9d8f'] } },
  { id: 'lagos-quiz', title: 'The great Lagos quiz', blurb: 'The city asks, everyone answers. Every right answer moves the bar.', city: 'lagos', goal: 'answer', target: 60, venues: [], questions: [
    { id: 'q1', q: 'Which lagoon does the Third Mainland Bridge cross?', answers: ['lagos lagoon', 'the lagos lagoon', 'lagos'] },
    { id: 'q2', q: 'What is the yellow minibus of Lagos called?', answers: ['danfo', 'a danfo'] },
    { id: 'q3', q: 'Which market is famous for fabrics, on Lagos Island?', answers: ['balogun', 'balogun market'] },
    { id: 'q4', q: 'What do you call a big Yoruba party with matching outfits?', answers: ['owambe', 'an owambe'] },
    { id: 'q5', q: 'Which beach in Lekki shares its name with a royal family?', answers: ['elegushi', 'elegushi beach'] },
    { id: 'q6', q: 'Freedom Park stands on the site of an old what?', answers: ['prison', 'a prison', 'colonial prison', 'broad street prison'] },
  ], change: { label: 'Quiz champions: the city is lit up for a week', colours: ['#7b2ff7', '#f7c948'] } },
  { id: 'accra-festival', title: 'Get Accra ready for the street festival', blurb: 'Bunting, drums and food stalls: walk to every corner of the city to set it up.', city: 'accra', goal: 'gather', target: 60, venues: [], questions: [], change: { label: 'Accra in festival colours', colours: ['#ce1126', '#fcd116'] } },
  { id: 'lagos-flood', title: 'Clear the flood at the beach road', blurb: 'The rain filled the road by the beach. Carry sandbags from the market to the beach.', city: 'lagos', goal: 'deliver', target: 80, venues: ['market', 'beach'], questions: [], change: { label: 'The beach road, dry again', colours: ['#1e88e5', '#ffd54f'] } },
  { id: 'nairobi-hunt', title: 'Find the lost matatu signs of Nairobi', blurb: 'The painted signs went missing all over town. Walk the city to find them.', city: 'nairobi', goal: 'gather', target: 60, venues: [], questions: [], change: { label: 'Matatu art back on every corner', colours: ['#00a651', '#ff6f00'] } },
] satisfies WorldEventDef[]).map((item) => Object.freeze(item)) as readonly WorldEventDef[]

// ---- cleaning what an admin sends ---------------------------------------------------------------------------------------
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const plain = (value: unknown, max: number): string => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '')
const whole = (value: unknown, [min, max]: readonly [number, number]): number | null => (typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max ? value : null)
/** An answer as it is compared: lower case, letters and digits, one space between words, no leading "the". */
export const normalAnswer = (text: unknown): string => (typeof text === 'string' ? text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/^the /, '') : '')

type Clean<T> = { ok: true; value: T } | { ok: false; reason: string }
export function cleanSchedule(raw: unknown): Clean<Schedule> {
  if (!record(raw)) return { ok: false, reason: 'Send a schedule.' }
  const weekday = whole(raw.weekday, [0, 6]), hour = whole(raw.hour, [0, 23]), minute = whole(raw.minute, [0, 59]), minutes = whole(raw.minutes, LIMITS.minutes), warmup = whole(raw.warmup, LIMITS.warmup)
  if (weekday === null || hour === null || minute === null) return { ok: false, reason: 'A day of the week (0 = Sunday to 6 = Saturday), an hour (0 to 23) and a minute (0 to 59), Lagos time.' }
  if (minutes === null) return { ok: false, reason: `The event lasts ${LIMITS.minutes[0]} to ${LIMITS.minutes[1]} minutes.` }
  if (warmup === null) return { ok: false, reason: `The warm-up lasts 0 to ${LIMITS.warmup[1]} minutes.` }
  return { ok: true, value: { weekday, hour, minute, minutes, warmup, off: raw.off === true } }
}
/** The schedule in force: the admin's, or the default. */
export function scheduleOf(extras: WorldEventExtras = {}): Schedule {
  const cleaned = extras.schedule ? cleanSchedule({ ...DEFAULT_SCHEDULE, ...extras.schedule }) : null
  return cleaned?.ok ? cleaned.value : { ...DEFAULT_SCHEDULE }
}

/** An event an admin sends, checked, or why not. `cities` is the list of open city ids. */
export function cleanEvent(raw: unknown, cities: readonly string[]): Clean<WorldEventDef> {
  if (!record(raw)) return { ok: false, reason: 'Send an event.' }
  const id = typeof raw.id === 'string' ? raw.id.trim().toLowerCase() : ''
  if (!ID.test(id)) return { ok: false, reason: 'The id is 3 to 40 lower-case letters, digits or dashes.' }
  const title = plain(raw.title, LIMITS.title), blurb = plain(raw.blurb, LIMITS.blurb)
  if (title.length < 3 || title.length > LIMITS.title) return { ok: false, reason: `The title is 3 to ${LIMITS.title} characters.` }
  if (blurb.length > LIMITS.blurb) return { ok: false, reason: `The blurb is at most ${LIMITS.blurb} characters.` }
  if (LINKISH.test(title) || LINKISH.test(blurb)) return { ok: false, reason: 'No links or addresses in the words.' }
  const city = typeof raw.city === 'string' ? raw.city : ''
  if (!cities.includes(city)) return { ok: false, reason: 'Choose an open city.' }
  const goal = GOAL_KINDS.find((kind) => kind === raw.goal)
  if (!goal) return { ok: false, reason: 'The goal is gather, deliver or answer.' }
  const target = whole(raw.target, LIMITS.target)
  if (target === null) return { ok: false, reason: `The target is ${LIMITS.target[0]} to ${LIMITS.target[1]} steps.` }
  const venues = Array.isArray(raw.venues) ? raw.venues.filter((item): item is string => typeof item === 'string' && VENUE.test(item) && item !== 'home').slice(0, LIMITS.venues) : []
  if (goal === 'deliver' && (venues.length !== 2 || venues[0] === venues[1])) return { ok: false, reason: 'A delivery names two different venues: where a load is picked up, then where it is put down.' }
  const questions: Question[] = []
  if (goal === 'answer') {
    const list = Array.isArray(raw.questions) ? raw.questions : []
    for (const [at, item] of list.slice(0, LIMITS.questions).entries()) {
      if (!record(item)) continue
      const q = plain(item.q, LIMITS.question), answers = (Array.isArray(item.answers) ? item.answers : []).map(normalAnswer).filter((answer) => answer.length > 0 && answer.length <= LIMITS.answer).slice(0, LIMITS.answers)
      if (q.length < 5 || q.length > LIMITS.question || !answers.length || LINKISH.test(q)) return { ok: false, reason: `Question ${at + 1} needs 5 to ${LIMITS.question} characters and at least one answer.` }
      questions.push({ id: `q${at + 1}`, q, answers: [...new Set(answers)] })
    }
    if (!questions.length) return { ok: false, reason: 'An answer event needs at least one question.' }
  }
  const change = record(raw.change) ? raw.change : {}, label = plain(change.label, LIMITS.label), colours = Array.isArray(change.colours) ? change.colours : []
  if (label.length < 3 || label.length > LIMITS.label || LINKISH.test(label)) return { ok: false, reason: `The city change needs a label of 3 to ${LIMITS.label} characters.` }
  if (colours.length !== 2 || !colours.every((colour) => typeof colour === 'string' && HEX.test(colour))) return { ok: false, reason: 'The city change needs two colours like #f0a830.' }
  const on = typeof raw.on === 'string' && raw.on ? raw.on : undefined
  if (on !== undefined && (!DATE.test(on) || Number.isNaN(Date.parse(`${on}T00:00:00Z`)))) return { ok: false, reason: 'The date is YYYY-MM-DD, or none for the rotation.' }
  return { ok: true, value: { id, title, blurb, city, goal, target, venues: goal === 'answer' ? [] : venues, questions, change: { label, colours: [String(colours[0]).toLowerCase(), String(colours[1]).toLowerCase()] }, ...(on ? { on } : {}) } }
}
/** A stored list, re-checked (damaged rows are dropped). */
export function eventList(value: unknown, cities: readonly string[]): WorldEventDef[] {
  const out: WorldEventDef[] = []
  for (const item of Array.isArray(value) ? value.slice(0, LIMITS.events) : []) { const done = cleanEvent(item, cities); if (done.ok && !out.some((row) => row.id === done.value.id)) out.push(done.value) }
  return out
}

// ---- the calendar ----------------------------------------------------------------------------------------------------------
/** The Lagos day number of the Monday of a Monday-started week (src/game/clock.ts). */
export const mondayOf = (week: number): number => 7 * week - 3
const isoDay = (day: number): string => new Date(day * DAY).toISOString().slice(0, 10)

export interface Occurrence {
  /** The Lagos week; also the id of the run the server keeps. */
  week: number
  def: WorldEventDef
  announcedAt: number
  warmupAt: number
  startsAt: number
  endsAt: number
}
/** The event of one week, or null (the schedule is off, or every event is hidden). A dated event wins; otherwise the rotation. */
export function occurrenceOf(week: number, extras: WorldEventExtras = {}): Occurrence | null {
  const schedule = scheduleOf(extras)
  if (schedule.off) return null
  const day = mondayOf(week) + ((schedule.weekday + 6) % 7), date = isoDay(day)
  const hidden = new Set(extras.hidden ?? []), custom = extras.events ?? []
  // A built-in replaced by an admin keeps its place in the rotation; added events follow the built-in ones.
  const all = [...BUILT_IN.map((item) => custom.find((own) => own.id === item.id) ?? item), ...custom.filter((own) => !BUILT_IN.some((item) => item.id === own.id))].filter((item) => !hidden.has(item.id))
  const pinned = all.find((item) => item.on === date)
  const rotation = all.filter((item) => !item.on)
  const def = pinned ?? (rotation.length ? rotation[((week % rotation.length) + rotation.length) % rotation.length] : undefined)
  if (!def) return null
  const startsAt = lagosDayStart(day) + (schedule.hour * 60 + schedule.minute) * MINUTE
  return { week, def, announcedAt: lagosDayStart(mondayOf(week)), warmupAt: startsAt - schedule.warmup * MINUTE, startsAt, endsAt: startsAt + schedule.minutes * MINUTE }
}
export function phaseOf(occurrence: Pick<Occurrence, 'warmupAt' | 'startsAt' | 'endsAt'>, now: number): Phase {
  return now < occurrence.warmupAt ? 'announced' : now < occurrence.startsAt ? 'warmup' : now < occurrence.endsAt ? 'live' : 'done'
}
/** The event that matters at `now`: last week's while it is still running (a late Sunday event), else this week's. */
export function currentOccurrence(now: number, extras: WorldEventExtras = {}): (Occurrence & { phase: Phase }) | null {
  const week = lagosTime(now).week, before = occurrenceOf(week - 1, extras)
  if (before && now < before.endsAt) return { ...before, phase: phaseOf(before, now) }
  const found = occurrenceOf(week, extras)
  return found ? { ...found, phase: phaseOf(found, now) } : null
}
/** Is the chip worth showing at `now`? From a day before the warm-up to a few hours after the end. */
export const chipShows = (occurrence: Pick<Occurrence, 'warmupAt' | 'endsAt'>, now: number): boolean => now >= occurrence.warmupAt - CHIP_BEFORE_MS && now < occurrence.endsAt + CHIP_AFTER_MS

// ---- drops, the AI helpers and the bar -------------------------------------------------------------------------------------
export interface Drop { id: string; opensAt: number; closesAt: number }
/** The warm-up's surprise drops in the Square: one every DROP_EVERY_MS from the start of the warm-up, while it lasts. */
export function dropsOf(occurrence: Pick<Occurrence, 'warmupAt' | 'startsAt'>): Drop[] {
  const out: Drop[] = []
  for (let k = 0, at = occurrence.warmupAt; at < occurrence.startsAt && k < 12; k++, at += DROP_EVERY_MS) out.push({ id: `d${k}`, opensAt: at, closesAt: Math.min(at + DROP_OPEN_MS, occurrence.startsAt) })
  return out
}
export const openDrop = (drops: readonly Drop[], now: number): Drop | null => drops.find((drop) => now >= drop.opensAt && now < drop.closesAt) ?? null

/** How many steps the AI residents have added by `now`: `share` per cent of the target, spread evenly over the live hour. */
export function aiDue(occurrence: Pick<Occurrence, 'startsAt' | 'endsAt' | 'def'>, now: number, share: number): number {
  const part = Math.max(0, Math.min(AI_SHARE_MAX, Math.floor(share))) / 100
  if (now < occurrence.startsAt || part <= 0) return 0
  const through = Math.min(1, (now - occurrence.startsAt) / Math.max(1, occurrence.endsAt - occurrence.startsAt))
  return Math.floor(occurrence.def.target * part * through)
}
/** The bar: 0 to 100, whole. */
export const percentOf = (count: number, target: number): number => (target > 0 ? Math.max(0, Math.min(100, Math.floor((count * 100) / target))) : 0)

// ---- the words: gist lines and the card --------------------------------------------------------------------------------------
const clip = (text: string): string => (text.length <= 120 ? text : `${text.slice(0, 117).trimEnd()}…`)
const plural = (n: number, one: string, many: string): string => `${n.toLocaleString('en-GB')} ${n === 1 ? one : many}`
export const lineAnnounced = (def: Pick<WorldEventDef, 'title'>, city: string, startsAt: number): string => {
  const t = lagosTime(startsAt), day = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][t.weekday]
  return clip(`This ${day} at ${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}: ${def.title} in ${city}. Everyone can help`)
}
export const lineWarmup = (def: Pick<WorldEventDef, 'title'>, city: string): string => clip(`The admins are in town: ${def.title} starts soon in ${city}`)
export const lineLive = (def: Pick<WorldEventDef, 'title'>, city: string): string => clip(`The world event has started in ${city}: ${def.title}`)
/** The closing line, which is also the share card's headline: "Lagos did it: …, 214 people and 3 AI residents helped". */
export function lineResult(def: Pick<WorldEventDef, 'title'>, city: string, facts: { people: number; ai: number; count: number; target: number; done: boolean }): string {
  const helped = `${plural(facts.people, 'person', 'people')}${facts.ai ? ` and ${plural(facts.ai, 'AI resident', 'AI residents')}` : ''} helped`
  return clip(facts.done ? `${city} did it: ${def.title}. ${helped}` : `${city} got ${percentOf(facts.count, facts.target)}% of the way: ${def.title}. ${helped}`)
}
