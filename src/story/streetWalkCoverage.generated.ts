import type { StoryStreetCoverage } from './streetWalk.ts'

/** Chapter 3 venue doors in the retained current street manifests at source revision 1851d545. */
export const STORY_STREET_COVERAGE = [
  {
    cityId: 'lagos',
    streetVersion: 'street-v1-c0dd6f6101f6f562',
    venueIds: ['library', 'shrine', 'police', 'polling-unit', 'state-house', 'quilox', 'rooftop'],
  },
  {
    cityId: 'ibadan',
    streetVersion: 'street-v1-25a019ef30689d00',
    venueIds: ['mapo-hall', 'mapo-polling', 'dugbe-amala'],
  },
] satisfies readonly StoryStreetCoverage[]
