import { ACHIEVEMENTS } from '../src/game/content/achievements.ts'
import { episodeByMemento } from '../src/game/content/episodes.ts'
import { PROJECTS } from '../src/game/content/projects.ts'
import { journeyCollections } from '../src/game/journeys.ts'
import type { LifeState } from '../src/types/life.ts'
import type { ExecutionOrigin } from '../src/types/progression.ts'
import type { PublicAchievement, PublicCharacterProfile, PublicHistoryEntry, PublicHistoryKind } from '../src/types/public-profile.ts'
import { characterCity } from './character.ts'
import { UUID_PATTERN } from './protocol.ts'
import type { Db, RouteContext, SessionRecord } from './types.ts'

const PAGE_SIZE = 30
const CURSOR_MAX = 512
const ORIGINS: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown']
const HISTORY_KINDS: readonly PublicHistoryKind[] = ['achievement', 'story', 'project', 'collection']

interface CursorTuple { earnedAt: number; kind: PublicHistoryKind; id: string }
export type PublicProfileRead =
  | { ok: true; profile: PublicCharacterProfile }
  | { ok: false; code: 'profile_unavailable' | 'invalid_profile_cursor' }

const validStamp = (value: unknown, state: LifeState): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= state.t

const originsOf = (value: unknown): ExecutionOrigin[] => {
  const values: unknown[] = Array.isArray(value) ? value : []
  return ORIGINS.filter(origin => values.includes(origin))
}

const historyOrder = (a: PublicHistoryEntry, b: PublicHistoryEntry): number =>
  b.earnedAt - a.earnedAt || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id)

const sameTuple = (entry: PublicHistoryEntry, cursor: CursorTuple): boolean =>
  entry.earnedAt === cursor.earnedAt && entry.kind === cursor.kind && entry.id === cursor.id

const encodeCursor = (entry: PublicHistoryEntry): string =>
  `1:${entry.earnedAt}:${entry.kind}:${encodeURIComponent(entry.id)}`

function parseCursor(value: string | null): CursorTuple | null | false {
  if (value === null) return null
  if (!value || value.length > CURSOR_MAX) return false
  const match = /^1:([1-9][0-9]{0,15}):(achievement|story|project|collection):(.{1,400})$/.exec(value)
  if (!match) return false
  const earnedAt = Number(match[1]), rawId = match[3] ?? ''
  if (!Number.isSafeInteger(earnedAt)) return false
  let id = ''
  try { id = decodeURIComponent(rawId) } catch { return false }
  if (!id || id.length > 240 || encodeURIComponent(id) !== rawId || /[\u0000-\u001f\u007f]/.test(id)) return false
  const kind = HISTORY_KINDS.find(item => item === match[2])
  return kind ? { earnedAt, kind, id } : false
}

function achievementRows(state: LifeState): { achievements: PublicAchievement[]; history: PublicHistoryEntry[] } {
  const achievements: PublicAchievement[] = []
  const history: PublicHistoryEntry[] = []
  for (const definition of ACHIEVEMENTS) {
    const receipt = state.achievements?.earned?.[definition.id]
    if (!receipt || receipt.id !== definition.id || receipt.version !== definition.version || !validStamp(receipt.earnedAt, state)) continue
    const origins = originsOf(receipt.origins)
    achievements.push({ id: definition.id, title: definition.title, path: definition.path, icon: definition.icon, earnedAt: receipt.earnedAt, origins, pinned: state.achievements.pinned.includes(definition.id) })
    history.push({ kind: 'achievement', id: definition.id, title: definition.title, earnedAt: receipt.earnedAt, origins })
  }
  return { achievements, history }
}

function storyRows(state: LifeState): { history: PublicHistoryEntry[]; mementos: LifeState['episodes']['mementos'] } {
  const history: PublicHistoryEntry[] = [], mementos: LifeState['episodes']['mementos'] = {}
  for (const [key, receipt] of Object.entries(state.episodes?.mementos ?? {})) {
    if (!receipt || !validStamp(receipt.grantedAt, state)) continue
    const definition = episodeByMemento(key)
    if (!definition || key !== receipt.id || key !== definition.memento.id || receipt.version !== 1 || receipt.episodeId !== definition.id
      || receipt.episodeVersion !== definition.version || receipt.rewardId !== definition.memento.rewardId) continue
    mementos[definition.memento.id] = receipt
    history.push({
      kind: 'story', id: definition.id, title: definition.title, earnedAt: receipt.grantedAt, origins: originsOf(receipt.origins),
      memento: { title: definition.memento.title, description: definition.memento.description, icon: definition.memento.icon },
    })
  }
  return { history, mementos }
}

function projectRows(state: LifeState): { history: PublicHistoryEntry[]; mementos: LifeState['projects']['mementos'] } {
  const history: PublicHistoryEntry[] = [], mementos: LifeState['projects']['mementos'] = {}
  for (const definition of PROJECTS) {
    const receipt = state.projects?.mementos?.[definition.id]
    if (!receipt || receipt.id !== definition.id || receipt.occurrence !== definition.occurrence || receipt.cityId !== definition.city || !validStamp(receipt.earnedAt, state)) continue
    mementos[definition.id] = receipt
    history.push({ kind: 'project', id: definition.id, title: definition.title, earnedAt: receipt.earnedAt, origins: originsOf(receipt.origins) })
  }
  return { history, mementos }
}

function collectionRows(state: LifeState, stories: LifeState['episodes']['mementos'], projects: LifeState['projects']['mementos']): PublicHistoryEntry[] {
  const accepted: LifeState = {
    ...state,
    episodes: { ...state.episodes, mementos: stories },
    projects: { ...state.projects, mementos: projects },
  }
  return journeyCollections(accepted).flatMap((collection): PublicHistoryEntry[] => {
    if (!collection.complete || !validStamp(collection.completionAt, state)) return []
    return [{ kind: 'collection', id: collection.id, title: collection.title, earnedAt: collection.completionAt, origins: [] }]
  })
}

export function projectPublicProfile(session: SessionRecord, state: LifeState, cursor: CursorTuple | null): PublicProfileRead {
  const earned = achievementRows(state)
  const stories = storyRows(state), projects = projectRows(state), collections = collectionRows(state, stories.mementos, projects.mementos)
  const all = [...earned.history, ...stories.history, ...projects.history, ...collections].sort(historyOrder)
  const start = cursor === null ? 0 : all.findIndex(entry => sameTuple(entry, cursor)) + 1
  if (cursor !== null && start === 0) return { ok: false, code: 'invalid_profile_cursor' }
  const history = all.slice(start, start + PAGE_SIZE)
  const last = history.at(-1)
  const next = start + history.length < all.length && last ? encodeCursor(last) : null
  return {
    ok: true,
    profile: {
      version: 1,
      id: session.publicId,
      name: session.name,
      kind: session.agent?.char === true ? 'agent' : 'human',
      path: `/p/${session.publicId}`,
      achievements: earned.achievements,
      counts: { achievements: earned.achievements.length, stories: stories.history.length, projects: projects.history.length, collections: collections.length },
      history,
      next,
    },
  }
}

const blockedEither = (db: Db, viewer: string, target: string): boolean =>
  Boolean(db.social?.players?.[viewer]?.blocked?.[target] || db.social?.players?.[target]?.blocked?.[viewer])

export async function readPublicProfile(ctx: RouteContext, options: { id: string; after?: string | null; viewer?: string | null }): Promise<PublicProfileRead> {
  const cursor = parseCursor(options.after ?? null)
  if (cursor === false) return { ok: false, code: 'invalid_profile_cursor' }
  const id = options.id
  if (id !== id.toLowerCase() || !UUID_PATTERN.test(id)) return { ok: false, code: 'profile_unavailable' }
  return ctx.store.read((db) => {
    if (db.civic?.prefs?.[id]?.directory === true) return { ok: false, code: 'profile_unavailable' }
    if (options.viewer && blockedEither(db, options.viewer, id)) return { ok: false, code: 'profile_unavailable' }
    const session = ctx.core.sessionByPublicId(db, id)
    if (!session || session.publicId !== id || session.expiresAt <= ctx.now()) return { ok: false, code: 'profile_unavailable' }
    const city = characterCity(session), entry = city ? session.cities[city] : undefined
    if (!city || !entry?.state || entry.state.estate?.city !== city) return { ok: false, code: 'profile_unavailable' }
    return projectPublicProfile(session, entry.state, cursor)
  })
}
