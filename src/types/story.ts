import type { WorldCityId } from './life.ts'

export type StoryMode = 'free' | 'story'
export type StoryChapter = 0 | 1 | 2 | 3 | 4
export type StoryHelpKind = 'second-answer' | 'two-seat' | 'errand'
export type StorySignatureKind = 'haggle' | 'tables' | 'arena-race' | 'arena-fight' | 'arena-football' | 'business' | 'festival' | 'politics' | 'clan'

export interface StoryRootsReceipt {
  id: string
  kind: StoryHelpKind
  completedAt: number
  missionRewardId?: string
}

export interface StoryHelpedReceipt {
  id: string
  city: WorldCityId
  completedAt: number
}

export interface StoryCityReceipts {
  missions: string[]
  venues: string[]
  roots?: StoryRootsReceipt
}

export interface StoryHelperSession {
  session: string
  host: string
  kind: StoryHelpKind
  city: WorldCityId
  venue: string
  from: { city: WorldCityId; venue: string; spot: string | null }
  until: number
}

export interface StoryState {
  version: 1
  trackingSince: number
  mode: StoryMode
  start: WorldCityId | null
  cities: Partial<Record<WorldCityId, StoryCityReceipts>>
  helped: StoryHelpedReceipt[]
  helper?: StoryHelperSession
}

export interface StorySignatureView {
  kind: StorySignatureKind
  label: string
  description: string
  venue: string | null
}

export interface StoryView {
  enabled: boolean
  mode: StoryMode
  cityId: string
  start: string | null
  chapter: StoryChapter
  chapterLabel: string
  nextStep: string
  progress: { missions: number; venues: number }
  signature: StorySignatureView
  cities: Array<{ id: string; label: string; chapter: StoryChapter; unlocked: boolean }>
  venues: Array<{ id: string; label: string; chapter: StoryChapter; locked: boolean; reason: string | null }>
}

export interface StoryActionMap {
  'story.mode': { payload: { mode: StoryMode }; ok: 'mode_set'; fail: 'invalid_story_mode' | 'story_disabled' }
  'story.help.enter': {
    payload: { session: string; host: string; kind: StoryHelpKind; city: WorldCityId; venue: string; until: number }
    ok: 'help_entered'
    fail: 'invalid_help_session' | 'help_session_expired' | 'busy' | 'invalid_place' | 'story_help_unavailable'
    serverOnly: true
  }
  'story.help.leave': {
    payload: { session: string }
    ok: 'help_left' | 'help_inactive'
    fail: 'invalid_help_session'
    serverOnly: true
  }
  'story.roots.reward': {
    payload: { id: string; kind: StoryHelpKind; city: WorldCityId; completedAt: number; missionRewardId?: string }
    ok: 'roots_recorded' | 'already_recorded'
    fail: 'invalid_help_receipt' | 'help_session_required'
    serverOnly: true
  }
  'story.help.reward': {
    payload: { id: string; city: WorldCityId; completedAt: number }
    ok: 'help_rewarded' | 'already_rewarded'
    fail: 'invalid_help_receipt' | 'help_session_required'
    serverOnly: true
  }
}

export const STORY_ACTION_TYPES = [
  'story.mode', 'story.help.enter', 'story.help.leave', 'story.roots.reward', 'story.help.reward',
] as const satisfies readonly (keyof StoryActionMap)[]

export const STORY_SERVER_ACTION_TYPES = [
  'story.help.enter', 'story.help.leave', 'story.roots.reward', 'story.help.reward',
] as const satisfies readonly (keyof StoryActionMap)[]
