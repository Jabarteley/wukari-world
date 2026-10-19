/**
 * OWNER: social
 * SOCIAL GLUE, the pure rules (docs/SOCIAL-GLUE.md, Phase 8 of docs/WOW-PLAN.md): close-friends presence, stage rooms (hosted talks),
 * the gist board, group trips and marriage. The numbers, the words and the checks that need no stored state, so the server
 * (server/glue/) and the page (src/app/features/glue/) read one module. Nothing here reads a clock, a store or the DOM.
 *
 * LOCATION PRIVACY. Presence here is a place IN THE GAME (a venue, the Square, a group room, a city), read from the server's own room
 * registry. Nothing here knows, takes or returns a position of the real world.
 */

const HOUR = 3600000, DAY = 24 * HOUR

export const GLUE = Object.freeze({
  close: Object.freeze({
    /** Close friends one person may pick. */
    max: 30,
    /** People who list one viewer, kept in the viewer's index (the oldest go first). */
    viewersKept: 200,
    /** How often the HUD line asks again while the page is visible. */
    pollMs: 60000,
  }),
  talk: Object.freeze({
    titleMin: 3, titleMax: 80, aboutMax: 280,
    /** Speakers the host invites besides themself (the stage holds 6 at most: src/world-events/stage.ts). */
    speakers: 5,
    minutes: Object.freeze([30, 60, 90, 120] as const),
    /** The host may open the stage this long before the start, and until the end. */
    openEarlyMs: 15 * 60000,
    perDay: 3,
    /** Earliest and latest start, from now. */
    soonestMs: 10 * 60000, latestMs: 14 * DAY,
  }),
  board: Object.freeze({
    min: 8, max: 280, perDay: 5,
    /** Posts a reader sees; posts a board keeps. */
    perPage: 40, kept: 300,
    /** Two reports send a post back to the reviewer; one "this is about me" takes it off the board at once. */
    reportsToReview: 2,
    /** "This is about me" reports one person may make in a Lagos day (so it cannot be used to empty a board). */
    aboutMePerDay: 3,
    /** The same words twice in this long are refused; one post a minute at most. */
    repeatMs: HOUR, gapMs: 60000,
    /** Removed posts in `strikeWindowMs` that bar an author from a board for `barMs`. */
    strikes: 3, strikeWindowMs: 30 * DAY, barMs: 7 * DAY,
    reviewTries: 3,
    /** Posts end by themselves after this long: a board is today's talk, not an archive. */
    lifeMs: 7 * DAY,
  }),
  trip: Object.freeze({
    /** People on one trip, the organiser included. */
    members: 12,
    /** An invitation nobody acted on lapses. */
    openMs: DAY,
    perDay: 5,
  }),
  marriage: Object.freeze({
    /** A proposal waits this long for an answer. */
    proposalMs: 7 * DAY,
    /** After saying yes, the ceremony is held within this long or the engagement lapses. */
    engagedMs: 30 * DAY,
    /** Guests named in the ceremony line (everyone in the room sees it). */
    guestsNamed: 8,
  }),
})

// ---- close friends -----------------------------------------------------------------------------------------------------------------
/** What a close friend's line says about where someone is: a place in the game, or nothing. */
export type ClosePlace =
  | { kind: 'square' }
  | { kind: 'room' }
  | { kind: 'venue'; city: string; cityName: string; venue: string; venueName: string }
  | { kind: 'home'; city: string; cityName: string }
  | { kind: 'city'; city: string; cityName: string }

/** "Tunde is in the Square now" · "Ada is at Freedom Park" · "Bola is at home" · "Chidi is in Abuja". */
export function closeLine(name: string, place: ClosePlace): string {
  switch (place.kind) {
    case 'square': return `${name} is in the Square now`
    case 'room': return `${name} is in a group room now`
    case 'venue': return `${name} is at ${place.venueName}${place.cityName ? `, ${place.cityName}` : ''}`
    case 'home': return `${name} is at home in ${place.cityName}`
    case 'city': return `${name} is in ${place.cityName}`
  }
}
/**
 * May `viewer` be told where `sharer` is? Every condition, every time (the server asks it on each read, so turning sharing off, taking a
 * person off the list, unfriending and blocking all take effect on the next read):
 *   the sharer turned sharing on; the viewer is on the sharer's list; they are ordinary friends (both listed each other); no block either way.
 */
export function mayShare(input: { on: boolean; list: readonly string[]; viewer: string; friends: boolean; blocked: boolean }): boolean {
  return input.on === true && input.list.includes(input.viewer) && input.friends === true && input.blocked !== true
}

// ---- stage rooms (talks) ------------------------------------------------------------------------------------------------------------
export type TalkPhase = 'soon' | 'open' | 'live' | 'over'
/** Where a talk is in its life: 'open' from openEarlyMs before the start (the host may open the stage), 'live' once the stage is open. */
export function talkPhase(t: { start: number; end: number; stageOpen: boolean }, now: number): TalkPhase {
  if (now >= t.end) return 'over'
  if (t.stageOpen) return 'live'
  return now >= t.start - GLUE.talk.openEarlyMs ? 'open' : 'soon'
}
export const isTalkMinutes = (v: unknown): v is (typeof GLUE.talk.minutes)[number] => GLUE.talk.minutes.some((m) => m === v)
/** A start time a talk may have: a whole minute, not too soon and not too far. */
export function talkStartRefusal(start: unknown, now: number): string | null {
  if (typeof start !== 'number' || !Number.isFinite(start)) return 'Choose when the talk starts.'
  if (start < now + GLUE.talk.soonestMs) return 'Start the talk at least 10 minutes from now, so people get the reminder.'
  if (start > now + GLUE.talk.latestMs) return 'Plan a talk at most two weeks ahead.'
  return null
}

// ---- the gist board ------------------------------------------------------------------------------------------------------------------
/** A board's key: a community (`crew:<id>`) or a campus (`campus:unilag`). */
export type BoardKey = `crew:${string}` | 'campus:unilag'
export const CAMPUS_BOARDS = Object.freeze(['campus:unilag'] as const)
export function boardKeyOf(value: unknown): BoardKey | null {
  if (typeof value !== 'string') return null
  if ((CAMPUS_BOARDS as readonly string[]).includes(value)) return value as BoardKey
  return /^crew:[A-Za-z0-9_-]{1,40}$/.test(value) ? value as BoardKey : null
}
/** Board text: one line of words, spaces folded, at most GLUE.board.max characters. */
export const cleanGist = (value: unknown): string => (typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, GLUE.board.max) : '')

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fold = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
/**
 * THE NGL / YIK YAK LESSON: anonymous boards turned into bullying when people were named. A gist post may not name a private person.
 * Refused: any @mention, and the name of any member of the board (their whole character name, or its first word when that word has three
 * letters or more, as a whole word, any case, accents ignored) or their handle. It errs on the side of refusing: "Joy" is refused in
 * "pure joy" when a member is called Joy. The words to the author say why, without saying whose name it was.
 */
export function namesPerson(text: string, people: readonly { name: string; handle?: string | null }[]): boolean {
  if (/(^|[^\w])@[\p{L}\p{N}._]{2,}/u.test(text)) return true
  const plain = fold(text)
  for (const person of people) {
    const name = fold(person.name ?? '').replace(/\s+/g, ' ').trim()
    const words = new Set<string>()
    if (name.length >= 3) words.add(name)
    const first = name.split(' ')[0] ?? ''
    if (first.length >= 3) words.add(first)
    if (person.handle && person.handle.length >= 3) words.add(fold(person.handle))
    for (const w of words) if (new RegExp(`(^|[^\\p{L}\\p{N}])${escape(w)}($|[^\\p{L}\\p{N}])`, 'u').test(plain)) return true
  }
  return false
}
export const NAMED_REASON = 'Gist here is about things, not named people. Take out the name or @mention and try again.'
/** What the reviewer is told about a gist board (on top of its own policy). */
export const BOARD_FACTS = 'A post on an anonymous gist board of a community or campus: readers do not see who wrote it, moderators do. Adults post. Allowed: campus and community gist, questions, confessions about oneself, opinions, jokes. Not allowed: anything that identifies, mocks, rates, rumours about or threatens a particular private person (even without a name: a description, initials, a room number, "the girl in 200 level who…"), sexual content, contact details, selling. Anything aimed at a person is hide or remove.'

// ---- group trips -------------------------------------------------------------------------------------------------------------------
export type TripMode = 'danfo' | 'flight'
export const isTripMode = (v: unknown): v is TripMode => v === 'danfo' || v === 'flight'
export type TripAnswer = 'yes' | 'no' | 'waiting'
/**
 * May the organiser start the trip? Every invited person has answered (or been let go), and at least two are going. Returns the
 * reason when not, naming who is still to answer.
 */
export function tripReady(members: readonly { name: string; answer: TripAnswer }[]): string | null {
  const waiting = members.filter((m) => m.answer === 'waiting')
  if (waiting.length) return `Waiting for ${listNames(waiting.map((m) => m.name))} to answer.`
  if (members.filter((m) => m.answer === 'yes').length < 2) return 'A group trip needs at least two people going.'
  return null
}
export const listNames = (names: readonly string[]): string => (names.length <= 1 ? names[0] ?? '' : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`)
/** The trip card's words. */
export function tripCardLine(t: { mode: TripMode; fromName: string; toName: string; count: number }): string {
  return `${t.count} of us ${t.mode === 'flight' ? 'flew' : 'took a danfo'} from ${t.fromName} to ${t.toName}, together`
}

// ---- marriage ----------------------------------------------------------------------------------------------------------------------
export const RINGS = Object.freeze([['gold', 'Gold band'], ['silver', 'Silver band'], ['rose', 'Rose gold'], ['coral', 'Coral beads']] as const)
export type Ring = typeof RINGS[number][0]
export const isRing = (v: unknown): v is Ring => RINGS.some(([id]) => id === v)
export const ringLabel = (id: string): string => RINGS.find(([k]) => k === id)?.[1] ?? 'Ring'
export type MarriageState = 'proposed' | 'engaged' | 'married'
/**
 * Who may propose to whom: two people (never an AI-played character), both confirmed adults, ordinary friends, no block, neither of them
 * already married, engaged or with a proposal out. The reason when not, or null.
 */
export function proposalRefusal(p: { self: boolean; adultA: boolean; adultB: boolean; aiA: boolean; aiB: boolean; friends: boolean; blocked: boolean; takenA: boolean; takenB: boolean; nameB: string }): string | null {
  if (p.self) return 'You cannot marry yourself.'
  if (p.aiA || p.aiB) return 'Marriage is between two people. AI characters do not marry.'
  if (!p.adultA) return 'Marriage is for people confirmed as 18 or older.'
  if (!p.adultB) return `${p.nameB} cannot be asked: marriage is for people confirmed as 18 or older.`
  if (p.blocked) return `${p.nameB} is not accepting this from you.`
  if (!p.friends) return `Become friends with ${p.nameB} first.`
  if (p.takenA) return 'You are already married or engaged. End that first.'
  if (p.takenB) return `${p.nameB} is already married or engaged.`
  return null
}
/** The ceremony moment: one line everyone in the room sees. */
export function ceremonyLine(a: string, b: string, venueName: string, guests: readonly string[]): string {
  const with_ = guests.length ? ` with ${listNames(guests)} as witnesses` : ''
  return `${a} and ${b} just got married at ${venueName}${with_}. Congratulations!`
}
