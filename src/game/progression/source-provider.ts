import { DAILY_MISSIONS, WEEKLY_MISSIONS } from '../content/missions.ts'
import { EPISODES } from '../content/episodes-source.ts'
import { JOURNEYS } from '../content/journeys-source.ts'
import { ACCEPTED_LOCAL_CITIES, ACCEPTED_LOCAL_COUNTRIES } from '../content/local-tales-source.ts'
import { LOCAL_DAILY_MISSIONS, LOCAL_WEEKLY_MISSIONS } from '../content/local-missions.ts'
import { WORLD_DAILY_MISSIONS, WORLD_WEEKLY_MISSIONS } from '../content/world-missions.ts'
import {
  installProgressionSnapshot, progressionReady, type ProgressionSnapshot,
} from './provider.ts'

/** Exact final catalogue that the former eager installers produced, without mutating the runtime while it is built. */
export function createSourceProgressionSnapshot(): ProgressionSnapshot {
  const accepted = new Set(ACCEPTED_LOCAL_CITIES.keys())
  const worldDailyPool = WORLD_DAILY_MISSIONS.filter(row => !row.cityId || !accepted.has(row.cityId))
  const worldWeeklyPool = WORLD_WEEKLY_MISSIONS.filter(row => !row.cityId || !accepted.has(row.cityId))
  return {
    version: 1,
    episodes: EPISODES,
    journeys: JOURNEYS,
    acceptedCityIds: [...ACCEPTED_LOCAL_CITIES.keys()],
    acceptedCountryIds: [...ACCEPTED_LOCAL_COUNTRIES.keys()],
    missions: {
      definitions: [...DAILY_MISSIONS, ...WEEKLY_MISSIONS, ...WORLD_DAILY_MISSIONS, ...WORLD_WEEKLY_MISSIONS, ...LOCAL_DAILY_MISSIONS, ...LOCAL_WEEKLY_MISSIONS],
      pools: {
        daily: [...DAILY_MISSIONS, ...worldDailyPool, ...LOCAL_DAILY_MISSIONS].map(row => row.id),
        weekly: [...WEEKLY_MISSIONS, ...worldWeeklyPool, ...LOCAL_WEEKLY_MISSIONS].map(row => row.id),
      },
      scopeIds: {
        daily: [...DAILY_MISSIONS, ...WORLD_DAILY_MISSIONS, ...LOCAL_DAILY_MISSIONS].map(row => row.id),
        weekly: [...WEEKLY_MISSIONS, ...WORLD_WEEKLY_MISSIONS, ...LOCAL_WEEKLY_MISSIONS].map(row => row.id),
      },
      authoredIds: [...LOCAL_DAILY_MISSIONS, ...LOCAL_WEEKLY_MISSIONS].map(row => row.id),
      authoredCities: [...ACCEPTED_LOCAL_CITIES.keys()],
    },
  }
}

export function installBundledProgression(): void {
  if (!progressionReady()) installProgressionSnapshot(createSourceProgressionSnapshot(), {
    cities: ACCEPTED_LOCAL_CITIES, countries: ACCEPTED_LOCAL_COUNTRIES,
  })
}
