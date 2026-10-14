import type { RhythmState } from './cadence.ts'
import type { SeasonState } from './season.ts'

/** Execution and ownership are independent: an agent can play a person's character. */
export type ExecutionOrigin = 'human' | 'delegated-agent' | 'agent-character' | 'system' | 'unknown'
export type CharacterOwnership = 'account' | 'guest' | 'owned-agent' | 'unclaimed-agent'
export type ProgressionEventName = 'mission_completed_v2' | 'mission_reward_earned_v2' | 'mission_reward_granted_v2'
  | 'mission_set_completed_v2' | 'mission_set_reward_granted_v2' | 'human_meaningful_day_v1' | 'achievement_earned_v1' | 'episode_completed_v1' | 'episode_memento_granted_v1' | 'rhythm_day_v1' | 'rhythm_recognition_v1'

/** Bounded operational receipt. No dialogue, credentials, coordinates or owner account id. */
export interface ProgressionEvent {
  id: string
  sequence: number
  name: ProgressionEventName
  occurredAt: number
  cityId: string
  origin: ExecutionOrigin
  earnedOrigin?: ExecutionOrigin
  ownership: CharacterOwnership
  rankingFamily: 'people' | 'agents'
  rewardId?: string
  missionId?: string
  achievementId?: string
  episodeId?: string
  scope?: 'daily' | 'weekly'
  period?: number
  cash?: number
  stars?: number
  cohort?: 'new-character' | 'existing-character'
  day?: number
  firstDay?: number
  rhythmDays?: number
  restUsed?: boolean
}

/** Server-owned, stored beside the life so it follows travel and character restoration. */
export interface CharacterProgression {
  version: 1
  startedAt: number
  cohort: 'new-character' | 'existing-character'
  sequence: number
  events: ProgressionEvent[]
  /** Last 31 meaningful human days; opening a page or collecting cash cannot stamp one. */
  humanDays: number[]
  firstHumanDay?: number
  /** Permanent optional rhythm history; independent of the bounded operational day window. */
  rhythm?: RhythmState
  season?: SeasonState
  /** Controller of the running action, retained across requests, restart and key expiry. */
  active?: { fingerprint: string; origin: ExecutionOrigin }
}
