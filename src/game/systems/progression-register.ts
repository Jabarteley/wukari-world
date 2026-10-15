import { installBundledProgression } from '#progression-provider'
/** Replace the browser's three fresh progression stand-ins with their complete systems, in place. */
import { completeSystem, isStandIn } from '../registry.ts'
import achievements from './achievements.ts'
import episodes from './episodes.ts'
import projects from './projects.ts'
import { installProgressionMissions } from './missions.ts'

for (const system of [achievements, episodes, projects]) if (isStandIn(system.id)) completeSystem(system)

installBundledProgression()
installProgressionMissions()
