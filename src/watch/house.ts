/**
 * OWNER: watch (docs/ALLWORLD-HOUSE.md)
 * ALLWORLD HOUSE, pure: a reality season of four weeks in a house, with 6 to 8 housemates who are all AI characters of the game's own cast
 * for the first season (WOW-PLAN decision 3), always labelled AI. Viewers who are adults vote once a week for the housemate they want to
 * SAVE; on Sunday at 20:00 Lagos time eviction night opens on a stage, the votes close, and at 20:30 the reveal: the housemate with the
 * fewest save votes leaves. The last Sunday is the finale: no one leaves, the most votes wins. The name is Allworld House ("Big Brother"
 * is a trademark).
 *
 * The times, the tally, the diary-room lines and the words are here, so the server (server/watch/house.ts), the page and the tests agree.
 * No I/O. Diary lines are written from templates (free, no model): an AI character's line never names a person.
 */
import { lagosDayStart, lagosTime } from '../game/clock.ts'

export const HOUSE = Object.freeze({ weeks: 4, minMates: 6, maxMates: 8, evictHour: 20, revealMinutes: 30, stageMinutes: 60, title: 'Allworld House', seasonsKept: 4 })
const HOUR = 3600000, MINUTE = 60000

export interface Housemate { id: string; name: string; city: string }
/** One week of a season, as stored: the tally once the votes closed, who left (or won), the gist line written for it. */
export interface HouseWeek { tally?: Record<string, number>; voters?: number; evicted?: string; winner?: string; line?: number; stage?: 1 }
export interface HouseSeason {
  id: string
  number: number
  /** The Lagos week index (src/game/clock.ts lagosTime().week) of the first week. */
  startWeek: number
  mates: Housemate[]
  /** The room the eviction stage opens in (a group room made into the house, or the Square). */
  room: string
  weeks: Record<string, HouseWeek>
  /** Set when an admin stopped the season early. */
  stopped?: number
  /** Gist lines written: 'start', 'diary:<day>' → the line's number. */
  lines: Record<string, number>
}
export type HousePhase = 'announced' | 'voting' | 'eviction' | 'done' | 'stopped'

/** Server ms of the Monday 00:00 (Lagos) that starts a Lagos week. */
export const weekStartMs = (week: number): number => lagosDayStart(week * 7 - 3)
/** Eviction night of season week `k` (0-based): the Sunday at HOUSE.evictHour. */
export const evictAt = (season: Pick<HouseSeason, 'startWeek'>, k: number): number => weekStartMs(season.startWeek + k) + 6 * 24 * HOUR + HOUSE.evictHour * HOUR
export const revealAt = (season: Pick<HouseSeason, 'startWeek'>, k: number): number => evictAt(season, k) + HOUSE.revealMinutes * MINUTE
export const evictEnd = (season: Pick<HouseSeason, 'startWeek'>, k: number): number => evictAt(season, k) + HOUSE.stageMinutes * MINUTE
export const seasonStart = (season: Pick<HouseSeason, 'startWeek'>): number => weekStartMs(season.startWeek)
export const seasonEnd = (season: Pick<HouseSeason, 'startWeek'>): number => evictEnd(season, HOUSE.weeks - 1)
/** The Lagos week a season started now would begin in: this week until Wednesday, else the next one (so the first week has days to vote). */
export const startWeekFor = (now: number): number => { const t = lagosTime(now); return t.weekday >= 1 && t.weekday <= 3 ? t.week : t.week + 1 }

/** Which season week is running at `now` (0-based; it runs until its eviction night ends), and the phase. */
export function housePhase(season: HouseSeason, now: number): { phase: HousePhase; week: number } {
  if (season.stopped !== undefined && season.stopped <= now) return { phase: 'stopped', week: Math.max(0, Math.min(HOUSE.weeks - 1, weekAt(season, season.stopped))) }
  if (now < seasonStart(season)) return { phase: 'announced', week: 0 }
  if (now >= seasonEnd(season)) return { phase: 'done', week: HOUSE.weeks - 1 }
  const k = weekAt(season, now)
  return { phase: now >= evictAt(season, k) ? 'eviction' : 'voting', week: k }
}
function weekAt(season: HouseSeason, now: number): number {
  for (let k = 0; k < HOUSE.weeks; k++) if (now < evictEnd(season, k)) return k
  return HOUSE.weeks - 1
}
export const isFinale = (k: number): boolean => k === HOUSE.weeks - 1

/** Housemates still in the house during season week `k` (everyone not evicted in an earlier week). */
export function remaining(season: Pick<HouseSeason, 'mates' | 'weeks'>, k: number): Housemate[] {
  const out = new Set<string>()
  for (let j = 0; j < k; j++) { const left = season.weeks[String(j)]?.evicted; if (left) out.add(left) }
  return season.mates.filter((mate) => !out.has(mate.id))
}

/** A small stable number for a text (FNV-1a), for ties and template choice. */
export function stableHash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

/**
 * The week's outcome from the save votes: on an ordinary week the housemate with the FEWEST saves leaves; in the finale the MOST wins.
 * A tie is broken by a stable hash of the season, the week and the housemate (not by list order, so nobody is favoured by their place).
 */
export function decideWeek(season: Pick<HouseSeason, 'id' | 'mates' | 'weeks'>, k: number, tally: Readonly<Record<string, number>>): { evicted?: string; winner?: string; share: number; total: number } {
  const left = remaining(season, k)
  if (!left.length) return { share: 0, total: 0 }
  const total = left.reduce((sum, mate) => sum + (tally[mate.id] ?? 0), 0)
  const tie = (mate: Housemate): number => stableHash(`${season.id}|${k}|${mate.id}`)
  const finale = isFinale(k)
  const sorted = [...left].sort((a, b) => {
    const diff = (tally[a.id] ?? 0) - (tally[b.id] ?? 0)
    return (finale ? -diff : diff) || tie(a) - tie(b)
  })
  const pick = sorted[0]!, share = total ? Math.round(((tally[pick.id] ?? 0) / total) * 100) : 0
  return finale ? { winner: pick.id, share, total } : { evicted: pick.id, share, total }
}

/**
 * Choose the housemates from the AI residents the server offers: `count` (6 to 8) with different first names, spread over as many cities
 * as there are, in an order a seed fixes (the same season id gives the same house).
 */
export function pickHousemates(candidates: readonly Housemate[], count: number, seed: string): Housemate[] {
  const want = Math.max(HOUSE.minMates, Math.min(HOUSE.maxMates, Math.round(count)))
  const order = [...candidates].sort((a, b) => stableHash(`${seed}|${a.id}`) - stableHash(`${seed}|${b.id}`) || a.id.localeCompare(b.id))
  const out: Housemate[] = [], names = new Set<string>(), cities = new Set<string>()
  const first = (name: string): string => name.split(/\s+/)[0]!.toLowerCase()
  for (const pass of [true, false]) for (const mate of order) {
    if (out.length >= want) break
    if (out.some((item) => item.id === mate.id) || names.has(first(mate.name)) || (pass && cities.has(mate.city))) continue
    out.push(mate); names.add(first(mate.name)); cities.add(mate.city)
  }
  return out
}

// ---- words -------------------------------------------------------------------------------------------------------------------
/** "Ada (AI)": every housemate is shown with the mark. */
export const label = (mate: Pick<Housemate, 'name'>): string => `${mate.name} (AI)`

const DIARY: readonly string[] = Object.freeze([
  'Day {day}. I cooked for everyone and {other} still asked where the pepper was. I am keeping calm.',
  'Day {day}. Honestly, I miss {city}. The house is fine but the generator noise is not my friend.',
  'Day {day}. {other} and I talked till late about football. We agree on nothing. It was the best night here.',
  'Day {day}. I woke up early and swept the compound. Nobody noticed. I noticed.',
  'Day {day}. Today I taught {other} a dance from {city}. They are getting there, small small.',
  'Day {day}. I am here to make friends, not noise. But if they push me, I will talk.',
  'Day {day}. The task today was hard. We finished it together, and that is what matters.',
  'Day {day}. I think {other} is playing a game. Maybe I am too. Let the viewers decide.',
  'Day {day}. Somebody finished the bread again. I am not saying who. It was {other}.',
  'Day {day}. I sang in the shower and the whole house heard. No regrets.',
  'Day {day}. I want to thank everyone watching. Whatever happens on Sunday, I am grateful.',
  'Day {day}. I told {other} a story from {city} and they laughed for ten minutes. Good day.',
  'Day {day}. I was quiet today. Sometimes you just need to think.',
  'Day {day}. The jollof today was the best in this house so far. I will not say who made it. It was me.',
  'Day {day}. {other} and I had a small quarrel. We settled it over tea.',
  'Day {day}. If I leave on Sunday, I leave with my head high.',
])
/** One diary-room line for a housemate on a season day (1-based). `others` are the other housemates still inside. Written; no model. */
export function diaryLine(mate: Housemate, day: number, others: readonly Housemate[], seed: string): string {
  const pool = others.filter((item) => item.id !== mate.id)
  const h = stableHash(`${seed}|${mate.id}|${day}`), other = pool.length ? pool[h % pool.length]!.name : 'my neighbour'
  return DIARY[h % DIARY.length]!.replace('{day}', String(day)).replace(/\{other\}/g, other).replace(/\{city\}/g, cityWord(mate.city))
}
const cityWord = (city: string): string => city.split('-').map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part)).join(' ')
/** The season day (1-based) at `now`, or 0 before it starts. */
export const seasonDay = (season: Pick<HouseSeason, 'startWeek'>, now: number): number => (now < seasonStart(season) ? 0 : Math.floor((now - seasonStart(season)) / (24 * HOUR)) + 1)

export const startGist = (season: Pick<HouseSeason, 'number' | 'mates'>): string =>
  `${HOUSE.title} season ${season.number} has begun: ${season.mates.length} AI housemates. Adults vote weekly; eviction is Sunday 20:00.`
export const diaryGist = (mate: Housemate, line: string): string => `Diary room: ${label(mate)} says "${line.replace(/^Day \d+\.\s*/, '')}"`.slice(0, 120)
export const evictGist = (mate: Housemate, k: number, share: number): string => `${HOUSE.title}: ${label(mate)} leaves the house in week ${k + 1}, with ${share}% of the save votes.`
export const winnerGist = (season: Pick<HouseSeason, 'number'>, mate: Housemate, share: number): string => `${HOUSE.title} season ${season.number}: ${label(mate)} wins, with ${share}% of the final vote.`
export const stageTitle = (season: Pick<HouseSeason, 'number'>, k: number): string => (isFinale(k) ? `${HOUSE.title} season ${season.number}: the finale` : `${HOUSE.title}: eviction night, week ${k + 1}`)
