import type { CityId, TimedId, HostErrorCode, SessionErrorCode, StorageErrorCode } from './protocol.ts'
import type { JourneyCollectionView } from './journeys.ts'
import type { SeasonView } from './season.ts'

export const RHYTHM_RECOGNITION_IDS = [
  'three-day-ribbon',
  'seven-day-badge',
  'fourteen-day-display',
  'thirty-day-title',
] as const

export type RhythmRecognitionId = typeof RHYTHM_RECOGNITION_IDS[number]
export type RhythmRecognitionDay = 3 | 7 | 14 | 30
export type RestDaysHeld = 0 | 1

export interface RhythmRecognitionReceipt {
  id: RhythmRecognitionId
  activeDays: RhythmRecognitionDay
  /** Lagos day index on which this recognition was first earned. */
  earnedDay: number
}

/** Character-scoped, server-owned state for the optional meaningful-day rhythm. */
export interface RhythmState {
  version: 1
  optedIn: boolean
  current: number
  best: number
  lifetime: number
  lastActiveDay: number | null
  restDaysHeld: RestDaysHeld
  /** Actual active days since the last rest-day grant; always 0–3. */
  activeSinceRestGrant: number
  recognition: Partial<Record<RhythmRecognitionId, RhythmRecognitionReceipt>>
}

export interface RhythmAdvanceOptions {
  /** Trusted operator-wide outage dates, expressed as Lagos day indices. */
  verifiedOutageDays?: readonly number[]
}

export type RhythmAdvanceStatus = 'recorded' | 'disabled' | 'already_recorded' | 'clock_rollback'

export interface RhythmAdvanceResult {
  state: RhythmState
  status: RhythmAdvanceStatus
  day: number
  counted: boolean
  chainContinued: boolean
  restUsed: boolean
  restGranted: boolean
  uncoveredMissedDays: number
  newlyRecognized: RhythmRecognitionReceipt[]
}

export type RhythmViewStatus =
  | 'disabled'
  | 'not_started'
  | 'active_today'
  | 'awaiting_today'
  | 'rest_available'
  | 'expired'
  | 'clock_rollback'

export interface RhythmView {
  optedIn: boolean
  today: number
  status: RhythmViewStatus
  /** The chain that is still valid at `today`; zero when the saved chain has expired. */
  current: number
  savedCurrent: number
  best: number
  lifetime: number
  lastActiveDay: number | null
  restDaysHeld: RestDaysHeld
  activeSinceRestGrant: number
  uncoveredMissedDays: number
  recognition: RhythmRecognitionReceipt[]
  nextRecognition: { id: RhythmRecognitionId; activeDays: RhythmRecognitionDay } | null
  timezone: 'Africa/Lagos (UTC+1)'
  resetCopy: string
  restCopy: string
  outageCopy: string
}

export type DailyMilestonePoints = 20 | 40 | 60

export interface DailyMilestone {
  points: DailyMilestonePoints
  reached: boolean
}

export interface DailyMilestonesView {
  completedCount: 0 | 1 | 2 | 3
  displayPoints: 0 | DailyMilestonePoints
  nextMilestone: DailyMilestonePoints | null
  milestones: [DailyMilestone, DailyMilestone, DailyMilestone]
  kind: 'display-only'
}

export interface RetentionView {
  flags: { dailyMilestones: boolean; rhythm: boolean }
  rhythm: RhythmView
  milestones: DailyMilestonesView | null
  collections: JourneyCollectionView[]
  season: SeasonView | null
}

export interface RetentionHttpRoutes {
  'GET /api/retention': { response: RetentionView; errors: HostErrorCode | SessionErrorCode | StorageErrorCode }
  'POST /api/retention/rhythm': {
    body: { cityId: CityId; actionId: TimedId; optedIn: boolean }
    response: { ok: true; code: 'saved'; duplicate?: true }
    errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'invalid_city' | 'invalid_setting' | 'human_required' | 'rhythm_unavailable'
  }
  'POST /api/retention/season': {
    body: { cityId: CityId; actionId: TimedId } & ({ op: 'join' | 'claim' } | { op: 'reminder'; reminder: string | null })
    response: { ok: true; code: 'saved'; duplicate?: true }
    errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'invalid_city' | 'invalid_setting' | 'human_required' | 'season_unavailable' | 'season_closed' | 'season_not_ready'
  }
}
