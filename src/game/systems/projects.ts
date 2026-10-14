import type { LifeContext, LifeState, SystemDefinition } from '../../types/index.ts'
import type { ProjectDefinition, ProjectProof, ProjectProofMatcher, ProjectRole, ProjectsState } from '../../types/projects.ts'
import type { ExecutionOrigin } from '../../types/progression.ts'
import { PROJECT_ROLES } from '../../types/projects.ts'
import { PROJECTS } from '../content/projects.ts'
import { PLAYS, LEFT_OUT } from '../profile.ts'
import { isRecord, ok, fail } from '../util.ts'

const origins: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown']

function atProofLocation(state: LifeState, matcher: ProjectProofMatcher, ctx: LifeContext): boolean {
  return ctx.cityId === matcher.city && state.location === matcher.venue && (matcher.spot === undefined || state.spot === matcher.spot)
}

function rememberProof(state: LifeState, project: ProjectDefinition, role: ProjectRole, source: string, ctx: LifeContext): void {
  const proofs = state.projects.proofs[project.id] ??= {}
  proofs[role] = { at: ctx.now, cityId: project.city, source: source.slice(0, 120), origin: ctx.executionOrigin ?? 'unknown' }
}

function observes(project: ProjectDefinition, role: ProjectRole, event: ProjectProofMatcher['event']): ProjectProofMatcher[] {
  return project.proofs[role].filter(matcher => matcher.event === event)
}

function prerequisiteMet(state: LifeState, project: ProjectDefinition): boolean {
  if (!project.prerequisite) return true
  const receipt = state.projects.mementos[project.prerequisite.projectId]
  return receipt?.occurrence === project.prerequisite.occurrence
}

const play = PLAYS ? {
  actions: {
    'projects.server': { serverOnly: true, run(state, payload, ctx) {
      const def = PROJECTS.find(row => row.id === payload.id)
      if (!def) return fail(state, 'invalid_project', 'That project is unavailable.')
      if (payload.op === 'grant') {
        if (state.projects.mementos[def.id]) return ok(state, 'already_granted')
        const receipt = payload.receipt
        if (!isRecord(receipt) || receipt.id !== def.id || receipt.occurrence !== def.occurrence || receipt.cityId !== def.city || receipt.earnedAt !== ctx.now || !Array.isArray(receipt.origins) || !receipt.origins.every(value => origins.some(origin => origin === value))) return fail(state, 'invalid_receipt', 'The project receipt is invalid.')
        state.projects.mementos[def.id] = { id: def.id, occurrence: def.occurrence, title: def.memento, cityId: def.city, earnedAt: ctx.now, origins: origins.filter(origin => receipt.origins instanceof Array && receipt.origins.includes(origin)) }
        return ok(state, 'granted')
      }
      if (payload.op === 'claim') return ok(state, 'ready')
      if (!prerequisiteMet(state, def)) return fail(state, 'missing_prerequisite', def.prerequisite?.refusal ?? 'Complete the earlier project first.')
      if (ctx.cityId !== def.city || state.location !== def.venue || state.spot !== def.spot || state.activeAction) return fail(state, 'wrong_place', `Finish your activity and meet at ${def.placeLabel}.`)
      if (payload.op === 'quiet') return ok(state, 'ready')
      const role = def.roles.find(row => row.id === payload.role)?.id
      if (payload.op !== 'contribute' || !role) return fail(state, 'invalid_role', 'Choose one of the three project roles.')
      const found = state.projects.proofs[def.id]?.[role]
      if (!found || found.cityId !== def.city || found.at < state.projects.trackingSince) return fail(state, 'missing_proof', 'Complete the activity described for this role first.')
      return ok(state, 'ready')
    } },
  },
  on: {
    'travel.arrived'(state, data, ctx) {
      for (const project of PROJECTS) for (const role of PROJECT_ROLES) for (const matcher of observes(project, role, 'travel.arrived')) {
        if (matcher.event === 'travel.arrived' && data.venue === matcher.venue && atProofLocation(state, matcher, ctx)) rememberProof(state, project, role, data.venue, ctx)
      }
    },
    'activity.completed'(state, data, ctx) {
      for (const project of PROJECTS) for (const role of PROJECT_ROLES) for (const matcher of observes(project, role, 'activity.completed')) {
        if (matcher.event === 'activity.completed' && (matcher.activityIds.some(id => id === data.id) || matcher.tagsAny.some(tag => data.tags.includes(tag))) && atProofLocation(state, matcher, ctx)) rememberProof(state, project, role, data.id, ctx)
      }
    },
    'skill.levelup'(state, data, ctx) {
      for (const project of PROJECTS) for (const role of PROJECT_ROLES) for (const matcher of observes(project, role, 'skill.levelup')) {
        if (matcher.event === 'skill.levelup' && atProofLocation(state, matcher, ctx)) rememberProof(state, project, role, String(data.skill), ctx)
      }
    },
    'npc.interacted'(state, data, ctx) {
      for (const project of PROJECTS) for (const role of PROJECT_ROLES) for (const matcher of observes(project, role, 'npc.interacted')) {
        if (matcher.event === 'npc.interacted' && data.success && (matcher.npcIds === null || matcher.npcIds.some(id => id === data.npc)) && atProofLocation(state, matcher, ctx)) rememberProof(state, project, role, data.npc, ctx)
      }
    },
    'table.played'(state, data, ctx) {
      for (const project of PROJECTS) for (const role of PROJECT_ROLES) for (const matcher of observes(project, role, 'table.played')) {
        if (matcher.event === 'table.played' && (matcher.gameIds === null || matcher.gameIds.some(id => id === data.game)) && atProofLocation(state, matcher, ctx)) rememberProof(state, project, role, data.game, ctx)
      }
    },
  },
} satisfies Pick<SystemDefinition<'projects'>, 'actions' | 'on'> : LEFT_OUT

function sanitizeProof(value: unknown, project: ProjectDefinition, trackingSince: number, now: number): ProjectProof | null {
  if (!isRecord(value) || typeof value.at !== 'number' || !Number.isSafeInteger(value.at) || value.at < trackingSince || value.at > now || value.cityId !== project.city || typeof value.source !== 'string' || !value.source.trim() || value.source.length > 120 || !origins.includes(value.origin as ExecutionOrigin)) return null
  return { at: value.at, cityId: project.city, source: value.source, origin: value.origin as ExecutionOrigin }
}

function sanitizeProjectProofs(rawProofs: Record<string, unknown>, project: ProjectDefinition, trackingSince: number, now: number): Partial<Record<ProjectRole, ProjectProof>> {
  const candidate = rawProofs[project.id]
  const saved = isRecord(candidate) ? candidate : {}
  const proofs: Partial<Record<ProjectRole, ProjectProof>> = {}
  for (const role of PROJECT_ROLES) {
    const row = sanitizeProof(saved[role], project, trackingSince, now)
    if (row) proofs[role] = row
  }
  return proofs
}

export default {
  id: 'projects', stateKeys: ['projects'],
  sanitize(input, state, ctx) {
    const now = ctx.now || state.t
    const raw = isRecord(input.projects) ? input.projects : {}
    const trackingSince = typeof raw.trackingSince === 'number' && Number.isSafeInteger(raw.trackingSince) && raw.trackingSince > 0 && raw.trackingSince <= now ? raw.trackingSince : now
    const book: ProjectsState = { version: 2, trackingSince, proofs: {}, mementos: {} }
    const rawProofs = isRecord(raw.proofs) ? raw.proofs : {}
    for (const project of PROJECTS) {
      const saved = sanitizeProjectProofs(rawProofs, project, trackingSince, now)
      if (Object.keys(saved).length) book.proofs[project.id] = saved
    }
    const legacyProject = PROJECTS[0]
    if (legacyProject) {
      const saved = book.proofs[legacyProject.id] ??= {}
      for (const role of PROJECT_ROLES) {
        if (saved[role]) continue
        const row = sanitizeProof(rawProofs[role], legacyProject, trackingSince, now)
        if (row) saved[role] = row
      }
      if (!Object.keys(saved).length) delete book.proofs[legacyProject.id]
    }
    const rawMementos = isRecord(raw.mementos) ? raw.mementos : {}
    for (const def of PROJECTS) {
      const row = rawMementos[def.id]
      if (isRecord(row) && row.id === def.id && row.occurrence === def.occurrence && row.cityId === def.city && typeof row.earnedAt === 'number' && Number.isSafeInteger(row.earnedAt) && row.earnedAt > 0 && row.earnedAt <= now) book.mementos[def.id] = { id: def.id, occurrence: def.occurrence, title: def.memento, cityId: def.city, earnedAt: row.earnedAt, origins: origins.filter(origin => Array.isArray(row.origins) && row.origins.includes(origin)) }
    }
    state.projects = book
  },
  ...play,
  view(state) { return { trackingSince: state.projects.trackingSince, mementos: Object.values(state.projects.mementos).filter(row => row !== undefined) } },
} satisfies SystemDefinition<'projects'>
