/**
 * OWNER: scenes
 * How many people a place holds at a given hour, in a given sky (pure: no THREE, no DOM, no clock of its own).
 *
 * A place is busy when people go there: a market in the morning, a bar at night, a park at the cool ends of the day. Each venue kind has
 * a curve of the Lagos hour (0 … 1) and four ceilings (people walking through, people sitting, people standing about, a far crowd that only
 * fills the background). The count is the ceiling times the curve, then times a weather factor (people in the open go home when it rains;
 * a covered or indoor place holds on). The numbers are original beta values written to feel right, not measured.
 */

/** [Lagos hour 0 … 24, how busy 0 … 1]; read with straight lines between the points, wrapping at midnight. */
export type Curve = readonly (readonly [hour: number, level: number])[]

const MORNING_MARKET: Curve = [[0, 0], [5, 0.02], [7, 0.45], [9, 0.9], [11, 1], [13, 0.85], [16, 0.6], [18, 0.3], [20, 0.1], [22, 0.04], [24, 0]]
const NIGHT_OUT: Curve = [[0, 0.8], [2, 0.4], [4, 0.1], [10, 0.08], [15, 0.15], [18, 0.5], [20, 0.85], [22, 1], [24, 0.8]]
const MEALS: Curve = [[0, 0.05], [6, 0.35], [8, 0.7], [10, 0.3], [12, 0.8], [14, 1], [16, 0.4], [18, 0.6], [20, 0.95], [22, 0.5], [24, 0.05]]
const COOL_ENDS: Curve = [[0, 0.03], [5, 0.25], [6.5, 0.8], [8, 0.65], [11, 0.25], [14, 0.2], [16, 0.5], [18, 0.95], [19.5, 0.8], [21, 0.3], [23, 0.06], [24, 0.03]]
const WORKDAY: Curve = [[0, 0], [7, 0.1], [8.5, 0.8], [11, 1], [13, 0.7], [15, 0.95], [17, 0.6], [18.5, 0.15], [24, 0]]
const FOOTBALL: Curve = [[0, 0.15], [9, 0.1], [14, 0.4], [16, 0.75], [18.5, 1], [21, 0.95], [23, 0.45], [24, 0.15]]
const WORSHIP: Curve = [[0, 0], [6, 0.15], [8, 0.9], [10, 1], [12, 0.3], [16, 0.15], [18, 0.5], [20, 0.25], [24, 0]]
const FLAT_DAY: Curve = [[0, 0.05], [6, 0.3], [9, 0.8], [14, 0.9], [18, 0.7], [21, 0.25], [24, 0.05]]
const ALL_DAY: Curve = [[0, 0.3], [5, 0.3], [8, 0.8], [12, 1], [18, 0.9], [22, 0.5], [24, 0.3]]

export type Tier = 'full' | 'light' | 'off'
export type Cover = 'open' | 'covered' | 'inside'

export interface Profile {
  curve: Curve
  walkers: number
  sitters: number
  standers: number
  far: number
  /** Where the people stand: in the weather, under sheets and umbrellas, or indoors. */
  cover: Cover
}

const p = (curve: Curve, walkers: number, sitters: number, standers: number, far: number, cover: Cover): Profile => ({ curve, walkers, sitters, standers, far, cover })

/** One profile per scene kind. A kind that is not listed uses `generic`. */
export const PROFILES: Readonly<Record<string, Profile>> = Object.freeze({
  market: p(MORNING_MARKET, 8, 2, 4, 14, 'covered'),
  park: p(COOL_ENDS, 6, 4, 3, 10, 'open'),
  walk: p(COOL_ENDS, 6, 2, 3, 8, 'open'),
  beach: p(COOL_ENDS, 5, 4, 3, 10, 'open'),
  lakeside: p(COOL_ENDS, 5, 4, 3, 8, 'open'),
  hilltop: p(COOL_ENDS, 3, 3, 2, 6, 'open'),
  buka: p(MEALS, 3, 5, 3, 6, 'covered'),
  club: p(NIGHT_OUT, 3, 4, 4, 12, 'inside'),
  rooftop: p(NIGHT_OUT, 2, 4, 3, 8, 'open'),
  viewing: p(FOOTBALL, 2, 6, 4, 14, 'covered'),
  hub: p(WORKDAY, 8, 3, 5, 12, 'covered'),
  airport: p(ALL_DAY, 7, 4, 4, 12, 'inside'),
  office: p(WORKDAY, 4, 3, 2, 4, 'inside'),
  statehouse: p(WORKDAY, 5, 2, 3, 8, 'open'),
  police: p(WORKDAY, 3, 2, 2, 4, 'inside'),
  hospital: p(FLAT_DAY, 4, 5, 2, 6, 'inside'),
  mall: p(FLAT_DAY, 7, 3, 4, 12, 'inside'),
  gym: p(COOL_ENDS, 3, 2, 3, 4, 'inside'),
  salon: p(FLAT_DAY, 2, 4, 2, 3, 'inside'),
  worship: p(WORSHIP, 3, 6, 3, 10, 'inside'),
  shrine: p(WORSHIP, 2, 3, 2, 4, 'open'),
  radio: p(WORKDAY, 2, 2, 2, 2, 'inside'),
  polling: p(FLAT_DAY, 4, 2, 4, 8, 'open'),
  refinery: p(WORKDAY, 3, 1, 2, 4, 'open'),
  quad: p(WORKDAY, 6, 4, 3, 10, 'open'),
  generic: p(FLAT_DAY, 4, 3, 2, 6, 'open'),
})

export const profileOf = (kind: string): Profile => PROFILES[kind] ?? PROFILES.generic!

/** The curve at an hour (any real number: it wraps round the 24-hour clock). */
export function levelAt(curve: Curve, hour: number): number {
  const h = ((Number.isFinite(hour) ? hour : 0) % 24 + 24) % 24
  for (let i = 1; i < curve.length; i++) {
    const [h1, v1] = curve[i]!, [h0, v0] = curve[i - 1]!
    if (h <= h1) return h1 === h0 ? v1 : v0 + ((v1 - v0) * (h - h0)) / (h1 - h0)
  }
  return curve[curve.length - 1]![1]
}

/** How much of a place's people stay when it rains. */
const WEATHER: Readonly<Record<Cover, number>> = Object.freeze({ open: 0.35, covered: 0.8, inside: 1.05 })

/** What a tier may show at most (a weak phone: a few walkers and nothing far; off: nobody). */
export const TIER_CAPS: Readonly<Record<Tier, { walkers: number; sitters: number; standers: number; far: number }>> = Object.freeze({
  full: { walkers: 8, sitters: 6, standers: 5, far: 14 },
  light: { walkers: 3, sitters: 3, standers: 2, far: 0 },
  off: { walkers: 0, sitters: 0, standers: 0, far: 0 },
})

export interface Mix { walkers: number; sitters: number; standers: number; far: number; level: number }

/** The people of a place at a Lagos hour. `hour` may carry a fraction (10.5 = half past ten). */
export function densityFor(kind: string, hour: number, raining: boolean, tier: Tier = 'full'): Mix {
  const profile = profileOf(kind), caps = TIER_CAPS[tier];
  const level = Math.max(0, Math.min(1, levelAt(profile.curve, hour) * (raining ? WEATHER[profile.cover] : 1)))
  const count = (ceiling: number, cap: number): number => Math.min(cap, Math.round(ceiling * level))
  // A place that is open at all is never wholly empty at its busiest hours: one person at least when it is above a fifth busy.
  const least = (value: number, cap: number): number => (level >= 0.2 && cap > 0 ? Math.max(1, value) : value)
  return {
    walkers: least(count(profile.walkers, caps.walkers), caps.walkers),
    sitters: least(count(profile.sitters, caps.sitters), caps.sitters),
    standers: least(count(profile.standers, caps.standers), caps.standers),
    far: count(profile.far, caps.far),
    level,
  }
}
