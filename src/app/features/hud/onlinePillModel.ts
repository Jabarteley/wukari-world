// The online pill, as pure functions: how a count is shortened, what the pill says to a screen
// reader, what the tooltip says, which colour the dot is, and the few steps a number takes when
// it changes. Nothing here touches the page.

/** A poll that has not succeeded for this long, or has failed, makes the numbers stale. */
export const STALE_MS = 75000
/** How often the numbers are asked for while the page is visible. */
export const POLL_MS = 30000

export type PulseTone = 'live' | 'stale'

/** What GET /api/world/pulse answers (server/pulse.ts). */
export interface PulseNumbers { online: number; visits: number; /** Distinct players seen today (0 from a server that does not say). */ today?: number; cities: Record<string, number>; /** AI agents present now, counted apart from the people. */ ai?: number; /** The same agents by city. */ aiCities?: Record<string, number> }

const whole = (value: number): number => (Number.isFinite(value) && value > 0 ? Math.floor(value) : 0)
const trim = (value: number): string => String(value).replace(/\.0$/, '')

/**
 * 999 → "999", 1234 → "1.2k", 4200 → "4.2k", 12500 → "12k", 1250000 → "1.2M". Rounded down, never up, so the
 * shortened number never says more than the real one.
 */
export function compactCount(value: number): string {
  const n = whole(value)
  if (n < 1000) return String(n)
  if (n < 10000) return `${trim(Math.floor(n / 100) / 10)}k`
  if (n < 1000000) return `${Math.floor(n / 1000)}k`
  if (n < 10000000) return `${trim(Math.floor(n / 100000) / 10)}M`
  return `${Math.floor(n / 1000000)}M`
}

/** The exact value with thousands separators: 4210 → "4,210". */
export const exactCount = (value: number): string => whole(value).toLocaleString('en-US')

const noun = (n: number, one: string, many: string): string => (whole(n) === 1 ? one : many)

/** Players online in one city, or null when the answer does not carry that city (then only the world count is known). */
export function onlineIn(numbers: PulseNumbers, cityId: string | null | undefined): number | null {
  if (!cityId) return null
  const here = numbers.cities[cityId]
  return typeof here === 'number' ? whole(here) : null
}

/**
 * What the pill is built from. The pill counts everyone online, people and AI agents together (`world`, `here`), and keeps the
 * split for the sheet and the label. The reader is online themselves, so no count of people is ever 0: the world's people are at
 * least 1, the city's people at least 1 and never more than the world's. `today` is never below the people online (they have all
 * played today). `alone` means no other person is online (agents may be); `solo` means nobody else at all, people or agents.
 */
export interface OnlineView {
  world: number; here: number | null; today: number; alone: boolean; solo: boolean
  people: number; agents: number; peopleHere: number | null; agentsHere: number | null
}
export function onlineView(numbers: PulseNumbers, cityId: string | null | undefined): OnlineView {
  const people = Math.max(1, whole(numbers.online)), agents = whole(numbers.ai ?? 0)
  const city = onlineIn(numbers, cityId)
  const peopleHere = city === null ? null : Math.min(people, Math.max(1, city))
  const agentsHere = city === null || !cityId ? null : Math.min(agents, whole(numbers.aiCities?.[cityId] ?? 0))
  return {
    world: people + agents, here: peopleHere === null ? null : peopleHere + (agentsHere ?? 0), today: Math.max(people, whole(numbers.today ?? 0)),
    alone: people === 1, solo: people === 1 && agents === 0, people, agents, peopleHere, agentsHere,
  }
}

/** "12 people · 25 AI agents", "1 person · 1 AI agent", "3 people · no AI agents". */
export function splitLine(people: number, agents: number): string {
  const p = whole(people), a = whole(agents)
  return `${exactCount(p)} ${noun(p, 'person', 'people')} · ${a ? `${exactCount(a)} ${noun(a, 'AI agent', 'AI agents')}` : 'no AI agents'}`
}

/** What stands in the pill instead of a bare "1" when the reader is the only one online: a true line, and the way to change it. */
export function aloneLine(view: Pick<OnlineView, 'today'>): { long: string; short: string } {
  return view.today >= 2 ? { long: `${compactCount(view.today)} played today`, short: `${compactCount(view.today)} today` } : { long: "You're first here", short: 'First here' }
}

/** The label read aloud: "37 online in Allworld: 12 people · 25 AI agents, 6 here. 4,210 visits in total. Open who is online." Both numbers, always. */
export function pulseAria(numbers: PulseNumbers, tone: PulseTone = 'live', cityId?: string | null): string {
  const view = onlineView(numbers, cityId), visits = `${exactCount(numbers.visits)} ${noun(numbers.visits, 'visit', 'visits')} in total`
  const state = tone === 'stale' ? ' These numbers may be out of date.' : ''
  if (view.solo) return `You are the only one online right now. ${exactCount(view.today)} ${noun(view.today, 'player', 'players')} today. ${visits}.${state} Invite a friend.`
  return `${exactCount(view.world)} online in Allworld: ${splitLine(view.people, view.agents)}${view.here === null ? '' : `, ${exactCount(view.here)} here`}. ${visits}.${state} Open who is online.`
}

/** The tooltip: the exact values. Visits are always for the whole game, and it says so. */
export function pulseTitle(numbers: PulseNumbers, tone: PulseTone = 'live', cityId?: string | null): string {
  const view = onlineView(numbers, cityId)
  const stale = tone === 'stale' ? ' (not up to date)' : ''
  const visits = `${exactCount(numbers.visits)} visits in total across all of Allworld`
  if (view.solo) return `You are the only one online right now · ${exactCount(view.today)} ${noun(view.today, 'player', 'players')} today · ${visits}${stale}`
  return `${exactCount(view.world)} online in Allworld (${splitLine(view.people, view.agents)})${view.here === null ? '' : ` · ${exactCount(view.here)} here`} · ${visits}${stale}`
}

/** Green while the last answer is recent; amber when the last request failed or nothing has come for a while. */
export function pulseTone(input: { failing: boolean; at: number | null; now: number }): PulseTone {
  if (input.failing || input.at === null) return 'stale'
  return input.now - input.at > STALE_MS ? 'stale' : 'live'
}

/**
 * The values a number passes through on its way from one to the other: at most `steps`, ending on the target,
 * the first already moved. Nothing to animate (the same number, or a first value, or `steps` of 0) gives just the target.
 */
export function easeSteps(from: number | null, to: number, steps = 6): number[] {
  const target = whole(to)
  if (from === null || steps < 1 || whole(from) === target) return [target]
  const start = whole(from), out: number[] = []
  for (let i = 1; i <= steps; i += 1) {
    const t = 1 - (1 - i / steps) ** 3
    out.push(i === steps ? target : Math.round(start + (target - start) * t))
  }
  return out.filter((value, i) => value !== start && (i === 0 || value !== out[i - 1]))
}
