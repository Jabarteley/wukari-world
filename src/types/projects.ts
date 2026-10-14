import type { LifeState } from './life.ts'
import type { ExecutionOrigin } from './progression.ts'
import type { CityId, TimedId, HostErrorCode, SessionErrorCode, StorageErrorCode } from './protocol.ts'

export const PROJECT_ROLES = ['prepare', 'learn', 'welcome'] as const
export type ProjectRole = typeof PROJECT_ROLES[number]
export const PROJECT_IDS = ['akoka-games-night', 'unilag-reading-corner'] as const
export type ProjectId = typeof PROJECT_IDS[number]
export interface ProjectProof { at: number; cityId: string; source: string; origin: ExecutionOrigin }
export interface ProjectMemento { id: ProjectId; occurrence: string; title: string; earnedAt: number; cityId: string; origins: ExecutionOrigin[] }
export interface ProjectsState {
  version: 2
  trackingSince: number
  proofs: Partial<Record<ProjectId, Partial<Record<ProjectRole, ProjectProof>>>>
  mementos: Partial<Record<ProjectId, ProjectMemento>>
}
export interface ProjectProofLocation { city: CityId; venue: string; spot?: string }
export type ProjectProofMatcher = ProjectProofLocation & (
  | { event: 'travel.arrived' }
  | { event: 'activity.completed'; activityIds: readonly string[]; tagsAny: readonly string[] }
  | { event: 'skill.levelup' }
  | { event: 'npc.interacted'; npcIds: readonly string[] | null; requireSuccess: true }
  | { event: 'table.played'; gameIds: readonly string[] | null }
)
export interface ProjectDefinition {
  id: ProjectId
  occurrence: string
  title: string
  description: string
  city: CityId
  venue: string
  spot: string
  placeLabel: string
  prerequisite: { projectId: ProjectId; occurrence: string; refusal: string } | null
  outcome: string
  memento: string
  roles: readonly { id: ProjectRole; label: string; criterion: string; next: { venue: string; spot?: string; open?: string } }[]
  proofs: Readonly<Record<ProjectRole, readonly ProjectProofMatcher[]>>
}
export interface ProjectView {
  definition: ProjectDefinition
  status: 'preparing' | 'completed'
  lockedReason: string | null
  completedAt: number | null
  completion: 'community' | 'quiet' | null
  distinctHumanAccounts: number
  roles: { id: ProjectRole; total: number; human: number; delegated: number; agents: number; yours: boolean; ready: boolean }[]
  ledger: { role: ProjectRole; origin: ExecutionOrigin; at: number; yours: boolean }[]
  authoredSupport: boolean
  memento: ProjectMemento | null
  canClaim: boolean
  quietReady: boolean
}
export interface ProjectsView { trackingSince: number; mementos: ProjectMemento[] }
export interface ProjectActionMap {
  /** Server-only proof check and permanent project memento grant, inside the shared ledger transaction. */
  'projects.server': { payload: { op: 'contribute' | 'quiet' | 'claim' | 'grant'; id: ProjectId; role?: ProjectRole; receipt?: ProjectMemento }; ok: 'ready' | 'granted' | 'already_granted'; fail: 'invalid_project' | 'invalid_role' | 'wrong_place' | 'missing_prerequisite' | 'missing_proof' | 'invalid_receipt'; serverOnly: true }
}
export interface ProjectHttpRoutes {
  'GET /api/projects': { query: { city: CityId }; response: { projects: ProjectView[] }; errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'invalid_city' }
  'POST /api/projects/contribute': { body: { cityId: CityId; actionId: TimedId; id: ProjectId; role: ProjectRole }; response: { ok: boolean; code: string; state: LifeState; reason?: string; duplicate?: true }; errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'project_full' | 'already_contributed' | 'invalid_city' }
  'POST /api/projects/quiet': { body: { cityId: CityId; actionId: TimedId; id: ProjectId }; response: { ok: boolean; code: string; state: LifeState; reason?: string; duplicate?: true }; errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'missing_contributions' | 'human_required' | 'invalid_city' }
  'POST /api/projects/claim': { body: { cityId: CityId; actionId: TimedId; id: ProjectId }; response: { ok: boolean; code: string; state: LifeState; reason?: string; duplicate?: true }; errors: HostErrorCode | SessionErrorCode | StorageErrorCode | 'not_complete' | 'no_contribution' | 'invalid_city' }
}
