import type { MissionDefinition, MissionKind } from '../../types/content.ts'
import type { LocalMissionTask, LocalTaleMission } from '../../types/local-tales.ts'
import type { WorldStorySeed } from '../../types/world-progression.ts'
import { missionCatalogues } from '../systems/missions.ts'
import { ACCEPTED_LOCAL_CITIES, ACCEPTED_LOCAL_CITY_IDS } from './local-tales.ts'

type Scope = 'daily' | 'weekly'
const kinds: readonly MissionKind[] = ['life', 'discovery', 'social']

function instruction(task: LocalMissionTask, count: number, seed: WorldStorySeed): string {
  const times = count > 1 ? ` ${count} times` : ''
  switch (task) {
    case 'practical': return `Complete ${seed.practical.label}${times} at ${seed.practical.venueName}.`
    case 'discovery': return `Complete ${seed.discovery.label}${times} at ${seed.discovery.venueName}.`
    case 'host-visit': return `Visit ${seed.host.venueName}.`
    case 'practical-visit': return `Visit ${seed.practical.venueName}.`
    case 'discovery-visit': return `Visit ${seed.discovery.venueName}.`
    case 'places': return `Visit ${count} different places in ${seed.cityName}.`
    case 'people': return `Greet ${count} different regulars in ${seed.cityName}.`
  }
}

function definition(scope: Scope, slot: number, authored: LocalTaleMission, seed: WorldStorySeed): MissionDefinition {
  const prefix = scope === 'daily' ? 'd' : 'w'
  const id = `${prefix}-local-${seed.cityId}-tale-${kinds[slot]}`
  const base = {
    id, cityId: seed.cityId, cityLabel: seed.cityName, kind: kinds[slot]!, label: authored.label,
    hint: `${instruction(authored.task, authored.count, seed)} ${authored.purpose}`, count: authored.count,
  }
  switch (authored.task) {
    case 'practical': return { ...base, on: 'activity', activityId: seed.practical.id, venueId: seed.practical.venue, spotId: seed.practical.spot, go: [seed.practical.venue, seed.practical.spot] }
    case 'discovery': return { ...base, on: 'activity', activityId: seed.discovery.id, venueId: seed.discovery.venue, spotId: seed.discovery.spot, go: [seed.discovery.venue, seed.discovery.spot] }
    case 'host-visit': return { ...base, on: 'venue', venueId: seed.host.venue, go: [seed.host.venue] }
    case 'practical-visit': return { ...base, on: 'venue', venueId: seed.practical.venue, go: [seed.practical.venue] }
    case 'discovery-visit': return { ...base, on: 'venue', venueId: seed.discovery.venue, go: [seed.discovery.venue] }
    case 'places': return { ...base, on: 'venue', fresh: true, open: 'map' }
    case 'people': return { ...base, on: 'event', event: 'npc.greeted', distinct: 'npc', open: 'people' }
  }
}

const definitions = (scope: Scope): readonly MissionDefinition[] => Object.freeze([...ACCEPTED_LOCAL_CITIES.values()].flatMap(({ tales, seed }) =>
  tales.missions[scope].map((mission, slot) => definition(scope, slot, mission, seed))))

export const LOCAL_DAILY_MISSIONS = definitions('daily')
export const LOCAL_WEEKLY_MISSIONS = definitions('weekly')

/** Add accepted authored rows while retaining every legacy row for saved sets and pending claims. */
export function installLocalMissions(): void {
  for (const [scope, rows] of [['daily', LOCAL_DAILY_MISSIONS], ['weekly', LOCAL_WEEKLY_MISSIONS]] as const) {
    const pool = missionCatalogues.pools[scope]
    for (let index = pool.length - 1; index >= 0; index -= 1) {
      const def = pool[index]
      if (def?.cityId && ACCEPTED_LOCAL_CITY_IDS.has(def.cityId) && !missionCatalogues.authoredIds.has(def.id)) pool.splice(index, 1)
    }
    for (const def of rows) {
      if (!missionCatalogues.byId.has(def.id)) {
        missionCatalogues.byId.set(def.id, def)
        pool.push(def)
      }
      missionCatalogues.scopeIds[scope].add(def.id)
      missionCatalogues.authoredIds.add(def.id)
      if (def.cityId) missionCatalogues.authoredCities.add(def.cityId)
    }
  }
}

