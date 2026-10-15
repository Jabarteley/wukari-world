import type { JourneyDefinition } from '../../types/journeys.ts'
import { progressionJourneys } from '../progression/provider.ts'
import { installBundledProgression } from '#progression-provider'

installBundledProgression()

export const JOURNEYS: readonly JourneyDefinition[] = progressionJourneys()
