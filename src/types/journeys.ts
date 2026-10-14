import type { LifeState } from './life.ts'

export type JourneyReceiptSource = 'episode' | 'project'

export interface JourneyGeography {
  countryId: string
  cityId: string
  venueId: string
}

export interface JourneyMemberDefinition {
  id: string
  title: string
  criterion: string
  source:
    | { kind: 'episode'; id: string; version: number }
    | { kind: 'project'; id: string; occurrence: string }
}

export interface JourneyCollectionDefinition {
  id: string
  version: 1
  name: string
  title: string
  geography: JourneyGeography
  members: readonly JourneyMemberDefinition[]
}

export interface JourneyDefinition extends JourneyCollectionDefinition {}

export interface JourneyMemberView {
  id: string
  title: string
  criterion: string
  earnedAt: number | null
}

export interface JourneyCollectionView {
  id: string
  version: 1
  name: string
  title: string
  geography: JourneyGeography
  members: JourneyMemberView[]
  complete: boolean
  completionAt: number | null
}

export interface JourneyValidationContext {
  episodeIds?: ReadonlySet<string>
  projectIds?: ReadonlySet<string>
  geographyRefs?: ReadonlySet<string>
}

export function journeyGeographyRef(geography: JourneyGeography): string {
  return `${geography.countryId}:${geography.cityId}:${geography.venueId}`
}

/** Pure contract validation; it does not load city content or mutate a life. */
export function validateJourneyCatalogue(catalogue: readonly JourneyDefinition[], context: JourneyValidationContext = {}): string[] {
  const errors: string[] = []
  const collections = new Set<string>()
  const versions = new Set<string>()
  const members = new Set<string>()
  for (const [index, journey] of catalogue.entries()) {
    const prefix = `journey[${index}]`
    if (!journey.id || collections.has(journey.id)) errors.push(`${prefix}: duplicate or empty id`)
    collections.add(journey.id)
    if (journey.version !== 1) errors.push(`${prefix}: unsupported version ${journey.version}`)
    const versionKey = `${journey.id}:v${journey.version}`
    if (versions.has(versionKey)) errors.push(`${prefix}: duplicate version ${versionKey}`)
    versions.add(versionKey)
    for (const [key, value] of Object.entries(journey.geography)) if (!value.trim()) errors.push(`${prefix}: empty geography ${key}`)
    const geographyRef = journeyGeographyRef(journey.geography)
    if (context.geographyRefs && !context.geographyRefs.has(geographyRef)) errors.push(`${prefix}: unknown geography ${geographyRef}`)
    if (!journey.members.length) errors.push(`${prefix}: no collection members`)
    for (const member of journey.members) {
      if (!member.id || members.has(member.id)) errors.push(`${prefix}: duplicate or empty member id ${member.id}`)
      members.add(member.id)
      if (!member.title.trim() || !member.criterion.trim()) errors.push(`${prefix}/${member.id}: title and criterion are required`)
      const source = member.source
      if (!source.id || (source.kind === 'episode' && (!Number.isInteger(source.version) || source.version < 1)) || (source.kind === 'project' && !source.occurrence.trim())) errors.push(`${prefix}/${member.id}: incomplete receipt reference`)
      if (source.kind === 'episode' && context.episodeIds && !context.episodeIds.has(source.id)) errors.push(`${prefix}/${member.id}: unknown episode ${source.id}`)
      if (source.kind === 'project' && context.projectIds && !context.projectIds.has(source.id)) errors.push(`${prefix}/${member.id}: unknown project ${source.id}`)
    }
  }
  return errors
}

/** Kept as a type-only import boundary so collection projections remain read-only. */
export type JourneyState = Pick<LifeState, 'episodes' | 'projects'>
