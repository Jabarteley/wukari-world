import type { AchievementId, AchievementPath } from './achievements.ts'
import type { ExecutionOrigin } from './progression.ts'
import type { HostErrorCode, Ok } from './protocol.ts'

export type PublicCharacterKind = 'human' | 'agent'
export type PublicHistoryKind = 'achievement' | 'story' | 'project' | 'collection'

export interface PublicAchievement {
  id: AchievementId
  title: string
  path: AchievementPath
  icon: string
  earnedAt: number
  origins: ExecutionOrigin[]
  pinned: boolean
}

export interface PublicHistoryEntry {
  kind: PublicHistoryKind
  id: string
  title: string
  earnedAt: number
  origins: ExecutionOrigin[]
  memento?: { title: string; description: string; icon: string }
}

export interface PublicCharacterProfile {
  version: 1
  id: string
  name: string
  kind: PublicCharacterKind
  path: string
  achievements: PublicAchievement[]
  counts: { achievements: number; stories: number; projects: number; collections: number }
  history: PublicHistoryEntry[]
  next: string | null
}

export interface PublicProfileHttpRoutes {
  'GET /api/profiles/:id': {
    params: { id: string }
    query: { after?: string }
    response: Ok<{ profile: PublicCharacterProfile }>
    errors: HostErrorCode | 'rate_limited' | 'profile_unavailable' | 'invalid_profile_cursor'
  }
}
