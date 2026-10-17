/**
 * Fresh progression slices and the small browser stand-ins used before the authored progression pack is requested.
 * A stand-in accepts only an absent slice or the exact empty shape produced by its real system. Anything else needs the
 * real sanitizer first, so saved badges, episode receipts, project proofs and unknown future fields are never discarded.
 */
import type { AchievementsView } from '../types/achievements.ts'
import type { EpisodeState, EpisodesView } from '../types/episodes.ts'
import type { ProjectsState, ProjectsView } from '../types/projects.ts'
import type { StoryState, StoryView } from '../types/story.ts'
import type { LifeContext, LifeState, SystemDefinition } from '../types/index.ts'

export const PROGRESSION_SYSTEM_IDS = ['achievements', 'episodes', 'projects', 'story'] as const
type ProgressionSystemId = typeof PROGRESSION_SYSTEM_IDS[number]

const record = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

const own = (value: Record<string, unknown>, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor?.enumerable && Object.hasOwn(descriptor, 'value') ? descriptor.value : undefined
}

const hasOnly = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && actual.every(key => keys.includes(key))
}

const emptyRecord = (value: unknown): boolean => record(value) && Object.keys(value).length === 0
const emptyArray = (value: unknown): boolean => Array.isArray(value) && value.length === 0
const validTrackingSince = (value: unknown, now: number): value is number => typeof value === 'number'
  && Number.isSafeInteger(value) && (value > 0 ? value <= now : value === 0 && now === 0)

function freshAchievementSlice(value: unknown, now: number): boolean {
  if (value === undefined || value === null) return true
  return record(value) && hasOnly(value, ['version', 'trackingSince', 'progress', 'earned', 'pinned', 'displayed'])
    && own(value, 'version') === 1 && validTrackingSince(own(value, 'trackingSince'), now)
    && emptyRecord(own(value, 'progress')) && emptyRecord(own(value, 'earned'))
    && emptyArray(own(value, 'pinned')) && own(value, 'displayed') === null
}

function freshEpisodeSlice(value: unknown, now: number): boolean {
  if (value === undefined || value === null) return true
  return record(value) && hasOnly(value, ['version', 'trackingSince', 'runs', 'mementos'])
    && own(value, 'version') === 1 && validTrackingSince(own(value, 'trackingSince'), now)
    && emptyRecord(own(value, 'runs')) && emptyRecord(own(value, 'mementos'))
}

function freshProjectSlice(value: unknown, now: number): boolean {
  if (value === undefined || value === null) return true
  return record(value) && hasOnly(value, ['version', 'trackingSince', 'proofs', 'mementos'])
    && own(value, 'version') === 2 && validTrackingSince(own(value, 'trackingSince'), now)
    && emptyRecord(own(value, 'proofs')) && emptyRecord(own(value, 'mementos'))
}

function freshStorySlice(value: unknown, now: number): boolean {
  if (value === undefined || value === null) return true
  return record(value) && hasOnly(value, ['version', 'trackingSince', 'mode', 'start', 'cities', 'helped'])
    && own(value, 'version') === 1 && validTrackingSince(own(value, 'trackingSince'), now)
    && own(value, 'mode') === 'free' && own(value, 'start') === null && emptyRecord(own(value, 'cities')) && emptyArray(own(value, 'helped'))
}

const freshReaders = {
  achievements: freshAchievementSlice,
  episodes: freshEpisodeSlice,
  projects: freshProjectSlice,
  story: freshStorySlice,
} satisfies Record<ProgressionSystemId, (value: unknown, now: number) => boolean>

function snapshotTime(raw: Record<string, unknown>): number | null {
  const value = own(raw, 't')
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null
}

/** True when a raw life holds progression data that only the full authored pack may rebuild. */
export function needsProgressionRules(raw: unknown): boolean {
  try {
    if (!record(raw)) return false
    const missions = own(raw, 'missions')
    if (record(missions) && ['daily', 'weekly', 'pending', 'grants'].some(key => {
      const rows = own(missions, key)
      return Array.isArray(rows) && rows.some(row => record(row) && typeof row.id === 'string' && /^[dw]-local-/.test(row.id))
    })) return true
    const now = snapshotTime(raw)
    return PROGRESSION_SYSTEM_IDS.some(id => {
      const value = own(raw, id)
      if (value === undefined || value === null) return false
      return now === null || !freshReaders[id](value, now)
    })
  } catch { return true }
}

export class ProgressionNotLoaded extends Error {
  constructor(key: string) {
    super(`The life holds progression state (${key}) and its rules are not loaded: fetch src/game/progression-gate.ts first.`)
    this.name = 'ProgressionNotLoaded'
  }
}

function slice<K extends ProgressionSystemId>(input: Record<string, unknown>, key: K, ctx: LifeContext, state: LifeState): { trackingSince: number } {
  const now = ctx.now || state.t
  const saved = own(input, key)
  if (!freshReaders[key](saved, now)) throw new ProgressionNotLoaded(key)
  return { trackingSince: record(saved) ? own(saved, 'trackingSince') as number : now }
}

const achievementStandIn = {
  id: 'achievements', stateKeys: ['achievements'],
  sanitize(input, state, ctx) {
    const { trackingSince } = slice(input, 'achievements', ctx, state)
    state.achievements = { version: 1, trackingSince, progress: {}, earned: {}, pinned: [], displayed: null }
  },
  view(state): AchievementsView {
    return { trackingSince: state.achievements.trackingSince, earnedCount: 0, pinned: [], displayed: null, rows: [] }
  },
} satisfies SystemDefinition<'achievements'>

const episodeStandIn = {
  id: 'episodes', stateKeys: ['episodes'],
  sanitize(input, state, ctx) {
    const { trackingSince } = slice(input, 'episodes', ctx, state)
    const episodes: EpisodeState = { version: 1, trackingSince, runs: {}, mementos: {} }
    state.episodes = episodes
  },
  view(state): EpisodesView { return { trackingSince: state.episodes.trackingSince, mementos: [], rows: [] } },
} satisfies SystemDefinition<'episodes'>

const projectStandIn = {
  id: 'projects', stateKeys: ['projects'],
  sanitize(input, state, ctx) {
    const { trackingSince } = slice(input, 'projects', ctx, state)
    const projects: ProjectsState = { version: 2, trackingSince, proofs: {}, mementos: {} }
    state.projects = projects
  },
  view(state): ProjectsView { return { trackingSince: state.projects.trackingSince, mementos: [] } },
} satisfies SystemDefinition<'projects'>

const storyStandIn = {
  id: 'story', stateKeys: ['story'],
  sanitize(input, state, ctx) {
    const { trackingSince } = slice(input, 'story', ctx, state)
    const story: StoryState = { version: 1, trackingSince, mode: 'free', start: null, cities: {}, helped: [] }
    state.story = story
  },
  view(state, ctx): StoryView {
    return {
      enabled: false, mode: 'free', cityId: ctx.cityId, start: null, chapter: 0, chapterLabel: 'Arrive', nextStep: '',
      progress: { missions: 0, venues: 0 }, signature: { kind: 'haggle', label: '', description: '', venue: null }, cities: [], venues: [],
    }
  },
} satisfies SystemDefinition<'story'>

export const PROGRESSION_STAND_INS: SystemDefinition<string>[] = [achievementStandIn, episodeStandIn, projectStandIn, storyStandIn]
