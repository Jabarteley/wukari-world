import {
  RHYTHM_RECOGNITION_IDS,
  type DailyMilestonePoints,
  type DailyMilestonesView,
  type RhythmAdvanceOptions,
  type RhythmAdvanceResult,
  type RhythmRecognitionDay,
  type RhythmRecognitionId,
  type RhythmRecognitionReceipt,
  type RhythmState,
  type RhythmView,
  type RhythmViewStatus,
} from '../types/cadence.ts'

const MAX_ACTIVE_DAYS = 1_000_000
const MAX_LAGOS_DAY = 10_000_000
const MAX_VERIFIED_OUTAGE_DAYS = 62

const RECOGNITION_DAYS: Readonly<Record<RhythmRecognitionId, RhythmRecognitionDay>> = Object.freeze({
  'three-day-ribbon': 3,
  'seven-day-badge': 7,
  'fourteen-day-display': 14,
  'thirty-day-title': 30,
})

const DAILY_MILESTONES = [20, 40, 60] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const boundedInteger = (value: unknown, maximum: number): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? Math.min(value, maximum)
    : 0

const lagosDay = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= MAX_LAGOS_DAY
    ? value
    : null

const cloneRecognition = (
  recognition: RhythmState['recognition'],
): RhythmState['recognition'] => {
  const result: RhythmState['recognition'] = {}
  for (const id of RHYTHM_RECOGNITION_IDS) {
    const receipt = recognition[id]
    if (receipt) result[id] = { ...receipt }
  }
  return result
}

export function createRhythmState(): RhythmState {
  return {
    version: 1,
    optedIn: false,
    current: 0,
    best: 0,
    lifetime: 0,
    lastActiveDay: null,
    restDaysHeld: 0,
    activeSinceRestGrant: 0,
    recognition: {},
  }
}

/** Normalize untrusted or legacy saved data into a small, internally coherent state. */
export function sanitizeRhythmState(value: unknown): RhythmState {
  if (!isRecord(value)) return createRhythmState()

  const lifetime = boundedInteger(value.lifetime, MAX_ACTIVE_DAYS)
  const current = Math.min(boundedInteger(value.current, MAX_ACTIVE_DAYS), lifetime)
  const best = Math.min(
    Math.max(boundedInteger(value.best, MAX_ACTIVE_DAYS), current),
    lifetime,
  )
  const lastActiveDay = lagosDay(value.lastActiveDay)
  const recognition: RhythmState['recognition'] = {}

  if (isRecord(value.recognition)) {
    for (const id of RHYTHM_RECOGNITION_IDS) {
      const candidate = value.recognition[id]
      const activeDays = RECOGNITION_DAYS[id]
      if (!isRecord(candidate) || candidate.id !== id || candidate.activeDays !== activeDays || best < activeDays) continue
      const earnedDay = lagosDay(candidate.earnedDay)
      if (earnedDay === null || lastActiveDay === null || earnedDay > lastActiveDay) continue
      recognition[id] = { id, activeDays, earnedDay }
    }
  }

  return {
    version: 1,
    optedIn: value.optedIn === true,
    current: lastActiveDay === null ? 0 : current,
    best,
    lifetime,
    lastActiveDay,
    restDaysHeld: value.restDaysHeld === 1 ? 1 : 0,
    activeSinceRestGrant: Math.min(boundedInteger(value.activeSinceRestGrant, 3), 3),
    recognition,
  }
}

/** Enrollment is a setting change only. It never grants a day, a rest day, or recognition. */
export function setRhythmOptIn(value: unknown, optedIn: boolean): RhythmState {
  return { ...sanitizeRhythmState(value), optedIn: optedIn === true }
}

function verifiedOutageSet(options: RhythmAdvanceOptions | undefined): Set<number> {
  const result = new Set<number>()
  if (!Array.isArray(options?.verifiedOutageDays)) return result
  for (const value of options.verifiedOutageDays) {
    const day = lagosDay(value)
    if (day !== null) result.add(day)
    if (result.size >= MAX_VERIFIED_OUTAGE_DAYS) break
  }
  return result
}

function uncoveredMissedDays(
  lastActiveDay: number,
  day: number,
  options: RhythmAdvanceOptions | undefined,
): number {
  const rawMissedDays = day - lastActiveDay - 1
  if (rawMissedDays <= 0) return 0
  let outageDays = 0
  for (const outageDay of verifiedOutageSet(options)) {
    if (outageDay > lastActiveDay && outageDay < day) outageDays += 1
  }
  return Math.max(0, rawMissedDays - outageDays)
}

function addRecognition(
  recognition: RhythmState['recognition'],
  best: number,
  earnedDay: number,
): RhythmRecognitionReceipt[] {
  const added: RhythmRecognitionReceipt[] = []
  for (const id of RHYTHM_RECOGNITION_IDS) {
    const activeDays = RECOGNITION_DAYS[id]
    if (recognition[id] || best < activeDays) continue
    const receipt: RhythmRecognitionReceipt = { id, activeDays, earnedDay }
    recognition[id] = receipt
    added.push(receipt)
  }
  return added
}

/**
 * Advance after the server has validated and deduplicated a meaningful human action.
 * `day` is a Lagos day index. Opening the app, opting in, or an autonomous action must
 * never call this transition.
 */
export function advanceRhythm(
  value: unknown,
  dayValue: number,
  options?: RhythmAdvanceOptions,
): RhythmAdvanceResult {
  const state = sanitizeRhythmState(value)
  const day = lagosDay(dayValue)
  if (!state.optedIn) return noAdvance(state, 'disabled', day ?? 0)
  if (day === null) return noAdvance(state, 'clock_rollback', 0)
  if (state.lastActiveDay !== null && day === state.lastActiveDay) return noAdvance(state, 'already_recorded', day)
  if (state.lastActiveDay !== null && day < state.lastActiveDay) return noAdvance(state, 'clock_rollback', day)

  const missedDays = state.lastActiveDay === null
    ? 0
    : uncoveredMissedDays(state.lastActiveDay, day, options)
  const firstActiveDay = state.lastActiveDay === null
  const restUsed = !firstActiveDay && missedDays === 1 && state.restDaysHeld === 1
  const chainContinued = !firstActiveDay && (missedDays === 0 || restUsed)
  const current = chainContinued ? Math.min(MAX_ACTIVE_DAYS, state.current + 1) : 1
  const best = Math.min(MAX_ACTIVE_DAYS, Math.max(state.best, current))
  const lifetime = Math.min(MAX_ACTIVE_DAYS, state.lifetime + 1)
  let restDaysHeld: 0 | 1 = restUsed ? 0 : state.restDaysHeld
  let activeSinceRestGrant = Math.min(3, state.activeSinceRestGrant + 1)
  let restGranted = false

  if (state.activeSinceRestGrant + 1 >= 4) {
    if (restDaysHeld === 0) {
      restDaysHeld = 1
      activeSinceRestGrant = 0
      restGranted = true
    } else {
      // Keep at most three days of progress while one rest day is already held.
      activeSinceRestGrant = 3
    }
  }

  const recognition = cloneRecognition(state.recognition)
  const newlyRecognized = addRecognition(recognition, best, day)
  const nextState: RhythmState = {
    ...state,
    current,
    best,
    lifetime,
    lastActiveDay: day,
    restDaysHeld,
    activeSinceRestGrant,
    recognition,
  }

  return {
    state: nextState,
    status: 'recorded',
    day,
    counted: true,
    chainContinued,
    restUsed,
    restGranted,
    uncoveredMissedDays: missedDays,
    newlyRecognized,
  }
}

function noAdvance(
  state: RhythmState,
  status: Exclude<RhythmAdvanceResult['status'], 'recorded'>,
  day: number,
): RhythmAdvanceResult {
  return {
    state,
    status,
    day,
    counted: false,
    chainContinued: false,
    restUsed: false,
    restGranted: false,
    uncoveredMissedDays: 0,
    newlyRecognized: [],
  }
}

function viewStatus(
  state: RhythmState,
  today: number,
  missedDays: number,
): RhythmViewStatus {
  if (!state.optedIn) return 'disabled'
  if (state.lastActiveDay === null) return 'not_started'
  if (today < state.lastActiveDay) return 'clock_rollback'
  if (today === state.lastActiveDay) return 'active_today'
  if (missedDays === 0) return 'awaiting_today'
  if (missedDays === 1 && state.restDaysHeld === 1) return 'rest_available'
  return 'expired'
}

/** Derive what the player should see without consuming rest or rewriting an expired chain. */
export function viewRhythm(
  value: unknown,
  todayValue: number,
  options?: RhythmAdvanceOptions,
): RhythmView {
  const state = sanitizeRhythmState(value)
  const today = lagosDay(todayValue) ?? 0
  const missedDays = state.lastActiveDay === null || today <= state.lastActiveDay
    ? 0
    : uncoveredMissedDays(state.lastActiveDay, today, options)
  const status = viewStatus(state, today, missedDays)
  const recognition = RHYTHM_RECOGNITION_IDS.flatMap((id) => {
    const receipt = state.recognition[id]
    return receipt ? [{ ...receipt }] : []
  })
  const next = RHYTHM_RECOGNITION_IDS.find((id) => !state.recognition[id])

  return {
    optedIn: state.optedIn,
    today,
    status,
    current: status === 'expired' ? 0 : state.current,
    savedCurrent: state.current,
    best: state.best,
    lifetime: state.lifetime,
    lastActiveDay: state.lastActiveDay,
    restDaysHeld: state.restDaysHeld,
    activeSinceRestGrant: state.activeSinceRestGrant,
    uncoveredMissedDays: missedDays,
    recognition,
    nextRecognition: next ? { id: next, activeDays: RECOGNITION_DAYS[next] } : null,
    timezone: 'Africa/Lagos (UTC+1)',
    resetCopy: 'A meaningful day resets at midnight in Lagos (UTC+1).',
    restCopy: 'One free rest day is earned after four active days, held one at a time, and used automatically for one missed day. Rest never counts as an active day.',
    outageCopy: 'Outages do not change your rhythm automatically. Only operator-verified Lagos outage days preserve the chain, and there is no paid streak repair.',
  }
}

/** A display counter only: this creates no grant, balance, receipt, or claim. */
export function getDailyMilestones(completedValue: number): DailyMilestonesView {
  const completed = Math.min(3, boundedInteger(completedValue, 3)) as 0 | 1 | 2 | 3
  const displayPoints = (completed * 20) as 0 | DailyMilestonePoints
  const milestones: DailyMilestonesView['milestones'] = [
    { points: 20, reached: displayPoints >= 20 },
    { points: 40, reached: displayPoints >= 40 },
    { points: 60, reached: displayPoints >= 60 },
  ]
  const nextMilestone = DAILY_MILESTONES.find((points) => points > displayPoints) ?? null
  return { completedCount: completed, displayPoints, nextMilestone, milestones, kind: 'display-only' }
}
