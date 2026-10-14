import { PROJECT_ROLES, type ProjectDefinition, type ProjectProofMatcher } from '../../types/projects.ts'

/** Fixed pilot occurrences retain their ledger and outcome; they never reset on Monday. */
export const PROJECTS: readonly ProjectDefinition[] = [
  {
    id: 'akoka-games-night', occurrence: 'akoka-games-night:v1:pilot', title: 'Make room at Akoka',
    description: 'Prepare an open games evening at Student Union. Three kinds of help make it possible.',
    city: 'lagos', venue: 'unilag', spot: 'student-union', placeLabel: 'Student Union', prerequisite: null,
    outcome: 'The welcome board is up: a quiet seat, a clear game guide, and an open invitation at Student Union.',
    memento: 'Akoka Welcome Pennant',
    roles: [
      { id: 'prepare', label: 'Find the place', criterion: 'Arrive at UNILAG through a completed journey.', next: { venue: 'unilag', spot: 'student-union' } },
      { id: 'learn', label: 'Learn something to share', criterion: 'Finish a learning activity at UNILAG or level up a skill there.', next: { venue: 'unilag', spot: 'library' } },
      { id: 'welcome', label: 'Make someone welcome', criterion: 'Finish a successful resident interaction or a counted table game at UNILAG.', next: { venue: 'unilag', spot: 'student-union' } },
    ],
    proofs: {
      prepare: [{ event: 'travel.arrived', city: 'lagos', venue: 'unilag' }],
      learn: [
        { event: 'activity.completed', city: 'lagos', venue: 'unilag', activityIds: ['campus-library-study'], tagsAny: ['study', 'learning'] },
        { event: 'skill.levelup', city: 'lagos', venue: 'unilag' },
      ],
      welcome: [
        { event: 'npc.interacted', city: 'lagos', venue: 'unilag', npcIds: null, requireSuccess: true },
        { event: 'table.played', city: 'lagos', venue: 'unilag', gameIds: null },
      ],
    },
  },
  {
    id: 'unilag-reading-corner', occurrence: 'unilag-reading-corner:v1:pilot', title: 'Open the reading corner',
    description: 'Prepare a calm shared reading corner in the UNILAG Library. Three kinds of help make it welcoming.',
    city: 'lagos', venue: 'unilag', spot: 'library', placeLabel: 'UNILAG Library',
    prerequisite: {
      projectId: 'akoka-games-night', occurrence: 'akoka-games-night:v1:pilot',
      refusal: 'Complete Make room at Akoka and keep its welcome pennant before contributing to the reading corner.',
    },
    outcome: 'The Library reading corner is open: the route is marked, a shared reading guide waits, and Bisi has saved a quiet chair for anyone who needs calm.',
    memento: 'Reading Corner Bookmark',
    roles: [
      { id: 'prepare', label: 'Find the corner', criterion: 'Arrive at UNILAG through a completed journey.', next: { venue: 'unilag', spot: 'library' } },
      { id: 'learn', label: 'Read for the shelf', criterion: 'Finish Read at the Library in the Library.', next: { venue: 'unilag', spot: 'library' } },
      { id: 'welcome', label: 'Ask Bisi for a quiet welcome', criterion: 'Finish a successful interaction with Bisi at UNILAG.', next: { venue: 'unilag', spot: 'people', open: 'people' } },
    ],
    proofs: {
      prepare: [{ event: 'travel.arrived', city: 'lagos', venue: 'unilag' }],
      learn: [{ event: 'activity.completed', city: 'lagos', venue: 'unilag', spot: 'library', activityIds: ['read-library'], tagsAny: [] }],
      welcome: [{ event: 'npc.interacted', city: 'lagos', venue: 'unilag', spot: 'people', npcIds: ['bisi-reader'], requireSuccess: true }],
    },
  },
]

const STABLE_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const stableList = (values: readonly string[]): boolean => values.every(value => STABLE_ID.test(value))

function validateMatcher(matcher: ProjectProofMatcher, prefix: string, errors: string[]): void {
  if (!STABLE_ID.test(matcher.city) || !STABLE_ID.test(matcher.venue) || (matcher.spot !== undefined && !STABLE_ID.test(matcher.spot))) {
    errors.push(`${prefix}: proof location must use stable ids`)
  }
  if (matcher.event === 'activity.completed' && (!matcher.activityIds.length && !matcher.tagsAny.length)) errors.push(`${prefix}: activity proof needs an activity id or tag`)
  if (matcher.event === 'activity.completed' && (!stableList(matcher.activityIds) || !stableList(matcher.tagsAny))) errors.push(`${prefix}: activity proof has an unstable id or tag`)
  if (matcher.event === 'npc.interacted' && matcher.npcIds !== null && !stableList(matcher.npcIds)) errors.push(`${prefix}: NPC proof has an unstable id`)
  if (matcher.event === 'table.played' && matcher.gameIds !== null && !stableList(matcher.gameIds)) errors.push(`${prefix}: table proof has an unstable game id`)
}

export function validateProjectCatalogue(catalogue: readonly ProjectDefinition[]): string[] {
  const errors: string[] = []
  const ids = new Set<string>(), occurrences = new Set<string>(), mementos = new Set<string>()
  const earlier = new Map<string, string>()
  for (const [index, project] of catalogue.entries()) {
    const prefix = `project[${index}]`
    if (!STABLE_ID.test(project.id) || ids.has(project.id)) errors.push(`${prefix}: invalid or duplicate project id ${project.id}`)
    if (!project.occurrence.startsWith(`${project.id}:`) || occurrences.has(project.occurrence)) errors.push(`${prefix}: invalid or duplicate occurrence ${project.occurrence}`)
    if (!STABLE_ID.test(project.city) || !STABLE_ID.test(project.venue) || !STABLE_ID.test(project.spot)) errors.push(`${prefix}: city, venue and spot must be stable ids`)
    if (!project.title.trim() || !project.description.trim() || !project.placeLabel.trim() || !project.outcome.trim() || !project.memento.trim()) errors.push(`${prefix}: authored text must be non-empty`)
    if (mementos.has(project.memento)) errors.push(`${prefix}: duplicate memento title ${project.memento}`)
    if (project.prerequisite && earlier.get(project.prerequisite.projectId) !== project.prerequisite.occurrence) errors.push(`${prefix}: prerequisite must reference an earlier fixed occurrence`)
    if (project.prerequisite && !project.prerequisite.refusal.trim()) errors.push(`${prefix}: prerequisite refusal must be non-empty`)
    if (project.roles.length !== PROJECT_ROLES.length || PROJECT_ROLES.some((role, roleIndex) => project.roles[roleIndex]?.id !== role)) errors.push(`${prefix}: roles must be prepare, learn and welcome in order`)
    for (const role of PROJECT_ROLES) {
      const matchers = project.proofs[role]
      if (!matchers.length) errors.push(`${prefix}.${role}: at least one proof matcher is required`)
      const seen = new Set<string>()
      for (const [matcherIndex, matcher] of matchers.entries()) {
        const signature = JSON.stringify(matcher)
        if (seen.has(signature)) errors.push(`${prefix}.${role}[${matcherIndex}]: duplicate proof matcher`)
        seen.add(signature)
        if (matcher.city !== project.city || matcher.venue !== project.venue) errors.push(`${prefix}.${role}[${matcherIndex}]: proof must belong to the project city and venue`)
        validateMatcher(matcher, `${prefix}.${role}[${matcherIndex}]`, errors)
      }
    }
    ids.add(project.id); occurrences.add(project.occurrence); mementos.add(project.memento); earlier.set(project.id, project.occurrence)
  }
  return errors
}

export const PROJECT_CATALOGUE_ERRORS = validateProjectCatalogue(PROJECTS)
if (PROJECT_CATALOGUE_ERRORS.length) throw new Error(`Invalid project catalogue: ${PROJECT_CATALOGUE_ERRORS.join('; ')}`)
