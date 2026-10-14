import type { ExecutionOrigin } from './progression.ts'

export const ACHIEVEMENT_IDS = ['wayfinder', 'familiar-face', 'first-shift', 'home-maker', 'table-regular', 'curious-mind'] as const
export type AchievementId = typeof ACHIEVEMENT_IDS[number]
export type AchievementPath = 'exploration' | 'belonging' | 'work' | 'creation' | 'play' | 'learning'
export interface AchievementReceipt {
  id: AchievementId
  version: 1
  earnedAt: number
  cityId: string
  origins: ExecutionOrigin[]
}
export interface AchievementProgress { n: number; marks: string[]; origins: ExecutionOrigin[] }
export interface AchievementState {
  version: 1
  trackingSince: number
  progress: Partial<Record<AchievementId, AchievementProgress>>
  earned: Partial<Record<AchievementId, AchievementReceipt>>
  pinned: AchievementId[]
  displayed: AchievementId | null
}
export interface AchievementDefinition {
  id: AchievementId
  version: 1
  path: AchievementPath
  title: string
  description: string
  target: number
  icon: string
  reward: string
  scope: 'character'
  assistance: 'allowed-and-recorded'
  retirement: 'earned-receipts-remain'
  next: { open: string | null; go: [string, string?] | null }
}
export interface AchievementRow extends AchievementDefinition {
  progress: number
  earnedAt: number | null
  earnedCity: string | null
  origins: ExecutionOrigin[]
  pinned: boolean
  displayed: boolean
}
export interface AchievementsView {
  trackingSince: number
  earnedCount: number
  pinned: AchievementId[]
  displayed: AchievementId | null
  rows: AchievementRow[]
}
export interface AchievementActionMap {
  /** Pin up to three earned permanent achievement badges on this character's passport. */
  'achievements.pin': { payload: { ids: AchievementId[] }; ok: 'pinned'; fail: 'invalid_selection' | 'not_earned' }
  /** Choose or clear an earned achievement plaque while at your own home. */
  'achievements.display': { payload: { id: AchievementId | null }; ok: 'displayed' | 'cleared'; fail: 'invalid_selection' | 'not_earned' | 'not_home' }
}
export const ACHIEVEMENT_ACTION_TYPES = ['achievements.pin', 'achievements.display'] as const
