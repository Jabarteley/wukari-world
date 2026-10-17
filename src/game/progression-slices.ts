/**
 * Fresh progression slices and the small browser stand-ins used before the authored progression pack is requested.
 * A stand-in accepts only an absent slice or the exact empty shape produced by its real system. Anything else needs the
 * real sanitizer first, so saved badges, episode receipts, project proofs and unknown future fields are never discarded.
 */
import type { AchievementsView } from '../types/achievements.ts'
import type { EpisodesView } from '../types/episodes.ts'
import type { ProjectsView } from '../types/projects.ts'
import type { StoryView } from '../types/story.ts'
import type { LifeContext, LifeState, SystemDefinition } from '../types/index.ts'
import { plainRecord as record, ownValue as own } from './snapshot-fields.ts'

export const PROGRESSION_SYSTEM_IDS = ['achievements', 'episodes', 'projects', 'story'] as const
type ProgressionSystemId = typeof PROGRESSION_SYSTEM_IDS[number]

const emptyRecord = (value: unknown): boolean => record(value) && Object.keys(value).length === 0
const validTrackingSince = (value: unknown, now: number): value is number => typeof value === 'number'
  && Number.isSafeInteger(value) && (value > 0 ? value <= now : value === 0 && now === 0)

const FRESH = {
  achievements: () => ({ version: 1, progress: {}, earned: {}, pinned: [], displayed: null }),
  episodes: () => ({ version: 1, runs: {}, mementos: {} }),
  projects: () => ({ version: 2, proofs: {}, mementos: {} }),
  story: () => ({ version: 1, mode: 'free', start: null, cities: {}, helped: [] }),
} satisfies { [K in ProgressionSystemId]: () => Omit<LifeState[K], 'trackingSince'> }

function freshSlice(key: ProgressionSystemId, value: unknown, now: number): boolean {
  if (value === undefined || value === null) return true
  const fields = Object.entries(FRESH[key]())
  return record(value) && Object.keys(value).length === fields.length + 1
    && validTrackingSince(own(value, 'trackingSince'), now) && fields.every(([name, expected]) => {
      const actual = own(value, name)
      return Array.isArray(expected) ? Array.isArray(actual) && actual.length === 0
        : expected !== null && typeof expected === 'object' ? emptyRecord(actual) : actual === expected
    })
}

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
      return now === null || !freshSlice(id, value, now)
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
  if (!freshSlice(key, saved, now)) throw new ProgressionNotLoaded(key)
  return { trackingSince: record(saved) ? own(saved, 'trackingSince') as number : now }
}

function putSlice<K extends ProgressionSystemId>(state: LifeState, key: K, value: LifeState[K]): void { state[key] = value }

function standIn(id: ProgressionSystemId, view: NonNullable<SystemDefinition<string>['view']>): SystemDefinition<string> {
  return { id, stateKeys: [id], sanitize(input, state, ctx) {
    const { trackingSince } = slice(input, id, ctx, state)
    putSlice(state, id, { ...FRESH[id](), trackingSince })
  }, view }
}

const achievementStandIn = standIn('achievements', (state): AchievementsView => ({ trackingSince: state.achievements.trackingSince, earnedCount: 0, pinned: [], displayed: null, rows: [] }))
const episodeStandIn = standIn('episodes', (state): EpisodesView => ({ trackingSince: state.episodes.trackingSince, mementos: [], rows: [] }))
const projectStandIn = standIn('projects', (state): ProjectsView => ({ trackingSince: state.projects.trackingSince, mementos: [] }))
const storyStandIn = standIn('story', (): StoryView => ({ enabled: false }))

export const PROGRESSION_STAND_INS: SystemDefinition<string>[] = [achievementStandIn, episodeStandIn, projectStandIn, storyStandIn]
