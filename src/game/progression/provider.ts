import type { MissionDefinition } from '../../types/content.ts'
import type { EpisodeDefinition, EpisodeId, EpisodeRun } from '../../types/episodes.ts'
import type { JourneyDefinition } from '../../types/journeys.ts'

export const PROGRESSION_SNAPSHOT_VERSION = 1 as const
export const MAX_PROGRESSION_ASSET_BYTES = 5_000_000

export interface ProgressionMissionSnapshot {
  readonly definitions: readonly MissionDefinition[]
  readonly pools: Readonly<{ daily: readonly string[]; weekly: readonly string[] }>
  readonly scopeIds: Readonly<{ daily: readonly string[]; weekly: readonly string[] }>
  readonly authoredIds: readonly string[]
  readonly authoredCities: readonly string[]
}

export interface ProgressionSnapshot {
  readonly version: typeof PROGRESSION_SNAPSHOT_VERSION
  readonly episodes: readonly EpisodeDefinition[]
  readonly journeys: readonly JourneyDefinition[]
  readonly acceptedCityIds: readonly string[]
  readonly acceptedCountryIds: readonly string[]
  readonly missions: ProgressionMissionSnapshot
}

export interface ProgressionSourceLookups<City = unknown, Country = unknown> {
  readonly cities: ReadonlyMap<string, City>
  readonly countries: ReadonlyMap<string, Country>
}

interface InstalledProgression {
  readonly snapshot: ProgressionSnapshot
  readonly episodesById: ReadonlyMap<string, EpisodeDefinition>
  readonly episodesByMemento: ReadonlyMap<string, EpisodeDefinition>
  readonly acceptedCityIds: ReadonlySet<string>
  readonly acceptedCountryIds: ReadonlySet<string>
}
let installed: InstalledProgression | null = null
let sourceLookups: ProgressionSourceLookups | null = null

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)
const stableId = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9_.:+-]{0,159}$/i.test(value)
const uniqueIds = (values: unknown, label: string): string[] => {
  if (!Array.isArray(values) || values.some(value => !stableId(value))) throw new TypeError(`Invalid progression ${label}`)
  const ids = values as string[]
  if (new Set(ids).size !== ids.length) throw new TypeError(`Duplicate progression ${label}`)
  return ids
}

/** Validate a complete payload without mutating the live catalogue. */
export function validateProgressionSnapshot(value: unknown): ProgressionSnapshot {
  if (!object(value) || value.version !== PROGRESSION_SNAPSHOT_VERSION || !Array.isArray(value.episodes)
    || !Array.isArray(value.journeys) || !object(value.missions)) throw new TypeError('Invalid progression snapshot envelope')
  const episodes = value.episodes as unknown[]
  const episodeIds = new Set<string>(), mementos = new Set<string>(), rewards = new Set<string>()
  for (const [index, row] of episodes.entries()) {
    if (!object(row) || !stableId(row.id) || !Number.isSafeInteger(row.version) || Number(row.version) < 1 || !object(row.location)
      || !stableId(row.location.city) || !stableId(row.location.venue) || !Array.isArray(row.chapters) || row.chapters.length !== 4
      || !Array.isArray(row.choices) || !Array.isArray(row.observations) || !object(row.memento)
      || !stableId(row.memento.id) || !stableId(row.memento.rewardId)) throw new TypeError(`Invalid progression episode ${index}`)
    if (episodeIds.has(row.id) || mementos.has(row.memento.id) || rewards.has(row.memento.rewardId)) throw new TypeError(`Duplicate progression episode ${row.id}`)
    if (object(row.prerequisite) && (!stableId(row.prerequisite.episodeId) || !episodeIds.has(row.prerequisite.episodeId))) throw new TypeError(`Invalid episode prerequisite ${row.id}`)
    episodeIds.add(row.id); mementos.add(row.memento.id); rewards.add(row.memento.rewardId)
  }
  const journeys = value.journeys as unknown[]
  const journeyIds = new Set<string>()
  for (const [index, row] of journeys.entries()) {
    if (!object(row) || !stableId(row.id) || row.version !== 1 || !object(row.geography) || !stableId(row.geography.countryId)
      || !stableId(row.geography.cityId) || !stableId(row.geography.venueId) || !Array.isArray(row.members) || !row.members.length) throw new TypeError(`Invalid progression journey ${index}`)
    if (journeyIds.has(row.id)) throw new TypeError(`Duplicate progression journey ${row.id}`)
    journeyIds.add(row.id)
    const members = new Set<string>()
    for (const member of row.members) {
      if (!object(member) || !stableId(member.id) || members.has(member.id) || !object(member.source) || !stableId(member.source.id)
        || (member.source.kind !== 'episode' && member.source.kind !== 'project')
        || member.source.kind === 'episode' && (!Number.isSafeInteger(member.source.version) || !episodeIds.has(member.source.id))) throw new TypeError(`Invalid progression journey member ${row.id}`)
      members.add(member.id)
    }
  }
  const missions = value.missions
  if (!Array.isArray(missions.definitions) || !object(missions.pools) || !object(missions.scopeIds)) throw new TypeError('Invalid progression missions')
  const definitions = missions.definitions as unknown[]
  const missionIds = new Set<string>()
  for (const [index, row] of definitions.entries()) {
    if (!object(row) || !stableId(row.id) || !stableId(row.kind) || !stableId(row.on) || typeof row.label !== 'string' || typeof row.hint !== 'string') throw new TypeError(`Invalid progression mission ${index}`)
    if (missionIds.has(row.id)) throw new TypeError(`Duplicate progression mission ${row.id}`)
    missionIds.add(row.id)
  }
  const list = (container: Record<string, unknown>, key: string, label: string): string[] => uniqueIds(container[key], label)
  const daily = list(missions.pools, 'daily', 'daily mission pool'), weekly = list(missions.pools, 'weekly', 'weekly mission pool')
  const dailyScope = list(missions.scopeIds, 'daily', 'daily mission scope'), weeklyScope = list(missions.scopeIds, 'weekly', 'weekly mission scope')
  const authoredIds = uniqueIds(missions.authoredIds, 'authored mission ids')
  const authoredCities = uniqueIds(missions.authoredCities, 'authored mission cities')
  for (const id of [...daily, ...weekly, ...dailyScope, ...weeklyScope, ...authoredIds]) if (!missionIds.has(id)) throw new TypeError(`Unknown progression mission ${id}`)
  const acceptedCityIds = uniqueIds(value.acceptedCityIds, 'accepted city ids')
  const acceptedCountryIds = uniqueIds(value.acceptedCountryIds, 'accepted country ids')
  const accepted = new Set(acceptedCityIds)
  if (authoredCities.some(id => !accepted.has(id))) throw new TypeError('Authored mission city is not accepted')
  return value as unknown as ProgressionSnapshot
}

/** One pointer changes only after the complete snapshot has passed validation. */
export function installProgressionSnapshot(value: unknown, lookups?: ProgressionSourceLookups): ProgressionSnapshot {
  const next = validateProgressionSnapshot(value)
  if (installed && installed.snapshot !== next) throw new TypeError('Progression content is already installed')
  if (lookups) sourceLookups = lookups
  installed ??= {
    snapshot: next,
    episodesById: new Map(next.episodes.map(row => [row.id, row])),
    episodesByMemento: new Map(next.episodes.map(row => [row.memento.id, row])),
    acceptedCityIds: new Set(next.acceptedCityIds), acceptedCountryIds: new Set(next.acceptedCountryIds),
  }
  return next
}

export const progressionReady = (): boolean => installed !== null
export function progressionSnapshot(): ProgressionSnapshot {
  if (!installed) throw Object.assign(new Error('progression_content_unavailable'), { status: 503, code: 'progression_content_unavailable', retryable: true })
  return installed.snapshot
}
export function progressionSourceLookups<City, Country>(): ProgressionSourceLookups<City, Country> {
  if (!sourceLookups) throw Object.assign(new Error('progression_source_unavailable'), { status: 503, code: 'progression_source_unavailable', retryable: true })
  return sourceLookups as ProgressionSourceLookups<City, Country>
}

const arrayView = <T>(read: () => readonly T[]): readonly T[] => new Proxy([] as T[], {
  get(_target, key) { const value = Reflect.get(read(), key); return typeof value === 'function' ? value.bind(read()) : value },
  has(_target, key) { return key in read() },
  ownKeys() { return Reflect.ownKeys(read()) },
  getOwnPropertyDescriptor(_target, key) {
    if (key === 'length') return { value: read().length, writable: true, enumerable: false, configurable: false }
    const descriptor = Object.getOwnPropertyDescriptor(read(), key)
    return descriptor ? { ...descriptor, configurable: true } : undefined
  },
})
const setView = (read: () => ReadonlySet<string>): ReadonlySet<string> => new Proxy(new Set<string>(), {
  get(_target, key) { const set = read(); const value = Reflect.get(set, key, set); return typeof value === 'function' ? value.bind(set) : value },
})
const mapView = <T>(read: () => ReadonlyMap<string, T>): ReadonlyMap<string, T> => new Proxy(new Map<string, T>(), {
  get(_target, key) { const map = read(); const value = Reflect.get(map, key, map); return typeof value === 'function' ? value.bind(map) : value },
})

export const progressionEpisodes = (): readonly EpisodeDefinition[] => installed?.snapshot.episodes ?? arrayView(() => progressionSnapshot().episodes)
export const progressionJourneys = (): readonly JourneyDefinition[] => installed?.snapshot.journeys ?? arrayView(() => progressionSnapshot().journeys)
export const progressionAcceptedCityIds = (): ReadonlySet<string> => installed?.acceptedCityIds ?? setView(() => {
  if (!installed) progressionSnapshot()
  return installed!.acceptedCityIds
})
export const progressionAcceptedCountryIds = (): ReadonlySet<string> => installed?.acceptedCountryIds ?? setView(() => {
  if (!installed) progressionSnapshot()
  return installed!.acceptedCountryIds
})
export const progressionSourceCities = <T>(): ReadonlyMap<string, T> => mapView(() => progressionSourceLookups<T, unknown>().cities)
export const progressionSourceCountries = <T>(): ReadonlyMap<string, T> => mapView(() => progressionSourceLookups<unknown, T>().countries)
export const progressionEpisodeView = <Id extends EpisodeId>(id: Id): EpisodeDefinition<Id> => {
  const ready = installed?.episodesById.get(id)
  if (ready) return ready as EpisodeDefinition<Id>
  return new Proxy({} as EpisodeDefinition<Id>, {
    get(_target, key) { return Reflect.get(progressionEpisodeById(id) ?? {}, key) },
    has(_target, key) { return key in (progressionEpisodeById(id) ?? {}) },
    ownKeys() { return Reflect.ownKeys(progressionEpisodeById(id) ?? {}) },
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = Object.getOwnPropertyDescriptor(progressionEpisodeById(id) ?? {}, key)
      return descriptor ? { ...descriptor, configurable: true } : undefined
    },
  })
}

export function progressionEpisodeById(id: unknown): EpisodeDefinition | null {
  if (!installed) progressionSnapshot()
  return typeof id === 'string' ? installed!.episodesById.get(id) ?? null : null
}
export function progressionEpisodeByMemento(id: string): EpisodeDefinition | null {
  if (!installed) progressionSnapshot()
  return installed!.episodesByMemento.get(id) ?? null
}
export function progressionEpisodesForCity(cityId: string, runs?: Readonly<Partial<Record<EpisodeId, EpisodeRun>>>): readonly EpisodeDefinition[] {
  const accepted = progressionSnapshot().acceptedCityIds.includes(cityId)
  return progressionSnapshot().episodes.filter(row => row.location.city === cityId && (!accepted
    || row.id !== `city-${cityId}-first-steps` && row.id !== `city-${cityId}-second-chapter` || runs?.[row.id] !== undefined))
}
