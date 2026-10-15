import type { MissionDefinition } from '../../types/content.ts'
import { WORLD_STORY_SEEDS } from './world-progression.generated.ts'
import { missionCatalogues } from '../systems/missions.ts'
import { installLocalMissions } from './local-missions.ts'

const LOCAL_SEEDS = WORLD_STORY_SEEDS.filter(seed => seed.cityId !== 'lagos')

function dailyForCity(seed: (typeof WORLD_STORY_SEEDS)[number]): MissionDefinition[] {
  const activity = seed.practical
  const discovery = seed.discovery
  return [
    {
      id: `d-local-${seed.cityId}-activity`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'life',
      label: `Complete ${activity.label} in ${seed.cityName}`,
      hint: `Go to ${activity.venueName}, ${activity.spot}, and complete ${activity.label}.`,
      on: 'activity', activityId: activity.id, venueId: activity.venue, spotId: activity.spot,
      go: [activity.venue, activity.spot],
    },
    {
      id: `d-local-${seed.cityId}-visit`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'discovery',
      label: `Visit ${discovery.venueName}`,
      hint: `Open the Map and visit ${discovery.venueName} in ${seed.cityName}.`,
      on: 'venue', venueId: discovery.venue, go: [discovery.venue],
    },
    {
      id: `d-local-${seed.cityId}-people`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'social',
      label: `Say hello to two people in ${seed.cityName}`,
      hint: `Talk with regulars around ${seed.cityName}; ${seed.host.name} is at ${seed.host.venueName}.`,
      on: 'event', event: 'npc.greeted', distinct: 'npc', count: 2, open: 'people',
    },
  ]
}

function weeklyForCity(seed: (typeof WORLD_STORY_SEEDS)[number]): MissionDefinition[] {
  const activity = seed.practical
  return [
    {
      id: `w-local-${seed.cityId}-activity`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'life',
      label: `Complete ${activity.label} three times in ${seed.cityName}`,
      hint: `Return to ${activity.venueName}, ${activity.spot}, and complete ${activity.label} three times.`,
      on: 'activity', activityId: activity.id, venueId: activity.venue, spotId: activity.spot,
      count: 3, go: [activity.venue, activity.spot],
    },
    {
      id: `w-local-${seed.cityId}-places`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'discovery',
      label: `Visit three different places in ${seed.cityName}`,
      hint: `Use the Map to visit three different places in ${seed.cityName}; each place counts once this week.`,
      on: 'venue', fresh: true, count: 3, open: 'map',
    },
    {
      id: `w-local-${seed.cityId}-people`, cityId: seed.cityId, cityLabel: seed.cityName, kind: 'social',
      label: `Say hello to four people in ${seed.cityName}`,
      hint: `Talk with four different regulars around ${seed.cityName}; ${seed.host.name} is at ${seed.host.venueName}.`,
      on: 'event', event: 'npc.greeted', distinct: 'npc', count: 4, open: 'people',
    },
  ]
}

export const WORLD_DAILY_MISSIONS: readonly MissionDefinition[] = Object.freeze(LOCAL_SEEDS.flatMap(dailyForCity))
export const WORLD_WEEKLY_MISSIONS: readonly MissionDefinition[] = Object.freeze(LOCAL_SEEDS.flatMap(weeklyForCity))

/** Register these city-specific rows only when the world-mission catalogue is explicitly installed. */
export function installWorldMissions(): void {
  for (const [scope, rows] of [['daily', WORLD_DAILY_MISSIONS], ['weekly', WORLD_WEEKLY_MISSIONS]] as const) {
    for (const def of rows) {
      if (!missionCatalogues.byId.has(def.id)) {
        missionCatalogues.byId.set(def.id, def)
        missionCatalogues.pools[scope].push(def)
      }
      missionCatalogues.scopeIds[scope].add(def.id)
    }
  }
  installLocalMissions()
}
