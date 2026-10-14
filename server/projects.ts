import { PROJECTS } from '../src/game/content/projects.ts'
import { PROJECT_ROLES } from '../src/types/projects.ts'
import type { ProjectDefinition, ProjectRole, ProjectView } from '../src/types/projects.ts'
import type { ExecutionOrigin } from '../src/types/progression.ts'
import type { LifeState } from '../src/types/life.ts'
import type { Db, RouteContext, SessionRecord } from './types.ts'
import { hash53 } from './protocol.ts'

interface Contribution { group: string; character: string; role: ProjectRole; origin: ExecutionOrigin; at: number; humanAccount: boolean }
interface Ledger { version: 1; contributions: Contribution[]; completedAt: number | null; completion: 'community' | 'quiet' | null; authoredSupport: boolean }
const MAX_CONTRIBUTIONS = 600
const origins: readonly ExecutionOrigin[] = ['human', 'delegated-agent', 'agent-character', 'system', 'unknown']
const empty = (): Ledger => ({ version: 1, contributions: [], completedAt: null, completion: null, authoredSupport: false })
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** One owner has one role slot per occurrence, across their people and agent characters. */
function identity(session: SessionRecord, state: LifeState): { group: string; character: string; account: boolean } {
  const owner = session.agent?.owner ?? session.account
  const group = owner ? `account:${owner}` : session.agent?.char ? 'unclaimed-agents' : `guest:${session.publicId}`
  const salt = session.cities[state.estate.city]?.salt ?? ''
  return { group: hash53(group), character: hash53(`${session.publicId}|${salt}`), account: Boolean(owner) && !session.agent?.char }
}

function readLedger(value: unknown): Ledger {
  if (!record(value) || value.version !== 1) return empty()
  const rows = Array.isArray(value.contributions) ? value.contributions : []
  const seen = new Set<string>(), contributions: Contribution[] = []
  for (const raw of rows.slice(0, MAX_CONTRIBUTIONS)) {
    if (!record(raw) || typeof raw.group !== 'string' || raw.group.length > 64 || typeof raw.character !== 'string' || raw.character.length > 64 || !PROJECT_ROLES.includes(raw.role as ProjectRole) || !origins.includes(raw.origin as ExecutionOrigin) || typeof raw.at !== 'number' || !Number.isSafeInteger(raw.at) || raw.at <= 0) continue
    const key = `${raw.character}:${raw.role}`
    if (seen.has(key)) continue
    seen.add(key)
    contributions.push({ group: raw.group, character: raw.character, role: raw.role as ProjectRole, origin: raw.origin as ExecutionOrigin, at: raw.at, humanAccount: raw.humanAccount === true && raw.origin === 'human' })
  }
  const completedAt = typeof value.completedAt === 'number' && Number.isSafeInteger(value.completedAt) && value.completedAt > 0 ? value.completedAt : null
  return { version: 1, contributions, completedAt, completion: completedAt && (value.completion === 'community' || value.completion === 'quiet') ? value.completion : null, authoredSupport: value.authoredSupport === true }
}

export function projectService(ctx: RouteContext) {
  const book = (db: Db) => ctx.collection(db, 'cityProjects', {})
  const get = (db: Db, def: ProjectDefinition) => readLedger(record(db.cityProjects) ? db.cityProjects[def.occurrence] : undefined)
  // Linking a guest or claiming an agent changes its owner, not its past contribution.
  // Preserve each character's receipt while folding participation into the current owner.
  function alignOwner(ledger: Ledger, who: ReturnType<typeof identity>): void {
    for (const row of ledger.contributions) if (row.character === who.character) row.group = who.group
  }
  function view(db: Db, session: SessionRecord, state: LifeState, def: ProjectDefinition): ProjectView {
    const ledger = get(db, def), who = identity(session, state)
    alignOwner(ledger, who)
    const lockedReason = def.prerequisite && state.projects.mementos[def.prerequisite.projectId]?.occurrence !== def.prerequisite.occurrence ? def.prerequisite.refusal : null
    const own = ledger.contributions.filter(row => row.character === who.character)
    const myRoles = new Set(ledger.contributions.filter(row => row.group === who.group).map(row => row.role))
    return {
      definition: def, lockedReason, status: ledger.completedAt ? 'completed' : 'preparing', completedAt: ledger.completedAt,
      completion: ledger.completion, authoredSupport: ledger.authoredSupport,
      distinctHumanAccounts: new Set(ledger.contributions.filter(row => row.humanAccount).map(row => row.group)).size,
      roles: PROJECT_ROLES.map(role => {
        const rows = [...new Map(ledger.contributions.filter(row => row.role === role).map(row => [row.group, row])).values()], proof = state.projects?.proofs[def.id]?.[role]
        return { id: role, total: rows.length, human: rows.filter(row => row.origin === 'human').length, delegated: rows.filter(row => row.origin === 'delegated-agent').length, agents: rows.filter(row => row.origin === 'agent-character').length, yours: myRoles.has(role), ready: Boolean(!lockedReason && proof && proof.cityId === def.city && proof.at >= state.projects.trackingSince) }
      }),
      ledger: ledger.contributions.map(row => ({ role: row.role, origin: row.origin, at: row.at, yours: row.character === who.character })),
      memento: state.projects?.mementos[def.id] ?? null,
      canClaim: Boolean(ledger.completedAt && own.length && !state.projects?.mementos[def.id]),
      quietReady: !lockedReason && !ledger.completedAt && PROJECT_ROLES.every(role => myRoles.has(role)) && own.some(row => row.origin === 'human'),
    }
  }
  function mutate(db: Db, session: SessionRecord, state: LifeState, def: ProjectDefinition, op: 'contribute' | 'quiet' | 'claim', role?: ProjectRole): void {
    const ledger = get(db, def), who = identity(session, state)
    alignOwner(ledger, who)
    if (op === 'contribute') {
      const proof = role ? state.projects.proofs[def.id]?.[role] : undefined
      if (!role || !proof || proof.cityId !== def.city || proof.at < state.projects.trackingSince) throw ctx.fail(409, 'missing_proof')
      if (!ledger.contributions.some(row => row.group === who.group && row.role === role)) {
        if (ledger.contributions.length >= MAX_CONTRIBUTIONS) throw ctx.fail(409, 'project_full')
        ledger.contributions.push({ group: who.group, character: who.character, role, origin: proof.origin, at: ctx.now(), humanAccount: who.account && proof.origin === 'human' })
      }
      const roles = new Set(ledger.contributions.map(row => row.role)), humans = new Set(ledger.contributions.filter(row => row.humanAccount).map(row => row.group))
      if (!ledger.completedAt && roles.size === PROJECT_ROLES.length && humans.size >= 2) { ledger.completedAt = ctx.now(); ledger.completion = 'community' }
    } else if (op === 'quiet' && !ledger.completedAt) {
      const mine = ledger.contributions.filter(row => row.group === who.group)
      if (!PROJECT_ROLES.every(role => mine.some(row => row.role === role)) || !mine.some(row => row.character === who.character && row.origin === 'human')) throw ctx.fail(409, 'missing_contributions')
      ledger.authoredSupport = true
      ledger.completedAt = ctx.now(); ledger.completion = 'quiet'
    }
    if (op === 'claim') {
      if (!ledger.completedAt) throw ctx.fail(409, 'not_complete')
      if (!ledger.contributions.some(row => row.character === who.character)) throw ctx.fail(409, 'no_contribution')
    }
    book(db)[def.occurrence] = ledger
    const mine = ledger.contributions.filter(row => row.character === who.character)
    if (ledger.completedAt && mine.length && !state.projects.mementos[def.id]) {
      const grant = ctx.act(state, { type: 'projects.server', cityId: state.estate.city, payload: { op: 'grant', id: def.id, receipt: { id: def.id, occurrence: def.occurrence, title: def.memento, cityId: def.city, earnedAt: state.t, origins: [...new Set(mine.map(row => row.origin))] } } , stateGuard: `project-memento:${def.occurrence}` })
      if (!grant.ok) throw ctx.fail(409, 'project_grant_failed')
    }
  }
  return { view, mutate }
}
