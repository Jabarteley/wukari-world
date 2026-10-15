import type { EpisodeChoice, EpisodeDefinition, EpisodeOutcomeTag, EpisodeRun } from '../../types/episodes.ts'
import {
  progressionEpisodeById, progressionEpisodeByMemento, progressionEpisodes,
  progressionEpisodesForCity, progressionEpisodeView,
} from '../progression/provider.ts'
import { installBundledProgression } from '#progression-provider'

installBundledProgression()

export { validateEpisodeCatalogue } from './episode-validation.ts'

export const HOSTEL_HUSTLE_ID = 'hostel-hustle' as const
export const HOSTEL_HUSTLE_VERSION = 1 as const
export const HOSTEL_HUSTLE_REWARD_ID = 'episode:v1:hostel-hustle:memento' as const
export const THE_QUIET_HOURS_ID = 'the-quiet-hours' as const
export const THE_QUIET_HOURS_VERSION = 1 as const
export const THE_QUIET_HOURS_REWARD_ID = 'episode:v1:the-quiet-hours:memento' as const
export const HOSTEL_HUSTLE = progressionEpisodeView(HOSTEL_HUSTLE_ID)
export const THE_QUIET_HOURS = progressionEpisodeView(THE_QUIET_HOURS_ID)
export const EPISODES: readonly EpisodeDefinition[] = progressionEpisodes()

export const episodesForCity = progressionEpisodesForCity
export const episodeById = progressionEpisodeById
export const episodeByMemento = progressionEpisodeByMemento
export const choiceFor = (episode: EpisodeDefinition, choice: unknown) =>
  typeof choice === 'string' ? episode.choices.find(row => row.id === choice) ?? null : null
export function outcomeFor(episode: EpisodeDefinition, choice: EpisodeChoice): EpisodeOutcomeTag {
  const definition = choiceFor(episode, choice)
  if (!definition) throw new TypeError(`${episode.id} has no ${choice} choice`)
  return definition.outcomeTag
}

// Keep this import visible to declaration emit: callers retain the exact optional-runs contract.
export type EpisodeRuns = Readonly<Partial<Record<EpisodeDefinition['id'], EpisodeRun>>>
