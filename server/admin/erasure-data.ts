import { forgetStoryHelp } from '../story/coop.ts'
/**
 * OWNER: admin
 *
 * The synchronous, main-store half of permanent player erasure. `planErasure` is a read-only
 * preflight and produces a deterministic closure. `eraseData` runs inside the caller's store
 * transaction, rebuilds that closure, then removes it. World shards and external byte stores are
 * deliberately returned to the route/job layer: they are separate durable stores.
 *
 * This module names every shared structure it changes. It never recursively deletes arbitrary
 * values: an unknown collection that still contains one of the actors fails preflight instead.
 */
import { forgetClanPlayers } from '../clans/forget.ts'
import { forgetFeedPlayers } from '../feed/service.ts'
import { forgetContactsPlayers } from '../feed/contacts.ts'
import { forgetPromotePlayers } from '../promote/service.ts'
import { forgetEarnPlayers } from '../earn/service.ts'
import { forgetWorldEventPlayers } from '../world-events/data.ts'
import { forgetDanfoPlayers } from '../danfo/service.ts'
import { forgetWatchPlayers } from '../watch/data.ts'
import { forgetMinigamesPlayers } from '../minigames/store.ts'
import { forgetLoopsPlayers } from '../shareloops/store.ts'
import { forgetNeighbourhoodPlayers } from '../neighbourhood/service.ts'
import { forgetGluePlayers } from '../glue/forget.ts'
import { clearPlayerFamily } from '../social/family.ts'
import { eraseLivingWorldProgress } from '../living-world/privacy.ts'
import { eraseRealValue } from '../real-value/privacy.ts'
import { eraseMarket } from '../market/privacy.ts'
import { eraseLegacy } from '../legacy/privacy.ts'
import { eraseShowcase } from '../showcase/privacy.ts'
import { erasePerson } from '../house/memory.ts'
import { eraseAiLife } from '../house/erase.ts'
import { eraseWalletActors } from '../economy/privacy.ts'
import { peekRecords } from '../records/store.ts'
import { forgetReplayPlayers } from '../growth/arena-replays.ts'
import { forgetDailyPlayers } from '../growth/arena-daily.ts'
import { idsWithMoney } from '../growth/arena-stakes.ts'
import { standing } from './gate.ts'
import { sha256Hex } from '../../src/game/util.ts'
import type { Admin } from './gate.ts'
import type { AccountRecord, ArchivedLife, Db, RouteContext, SessionRecord, SocialCollection } from '../types.ts'
import { forgetArena, peekBook as peekArena } from '../tournaments/book.ts'
import { forgetOAuth } from '../agents/privacy.ts'
import { eraseSpaces } from '../spaces/store.ts'
import { forgetDettyPlayers } from '../detty/store.ts'
import { ownerKeyOf } from '../tournaments/life.ts'

export type ErasureScope = 'guest' | 'agent' | 'account'
export type ErasureCharacterKind = 'guest' | 'player' | 'agent'

export interface ErasureCharacter {
  id: string
  name: string
  kind: ErasureCharacterKind
}

export interface ErasurePlan {
  version: 1
  targetId: string
  targetName: string
  scope: ErasureScope
  /** The small, human-readable preview. Sorted by public id. */
  characters: ErasureCharacter[]
  /** Public character ids in the deletion closure. */
  actorIds: string[]
  /** Accounts actually removed. An agent-only erasure does not include its owner's account. */
  accountIds: string[]
  /** World registry shards which may hold one of the actors. */
  shardNames: string[]
  /** Main-store session keys removed after storage-side receipts are erased. */
  sessionKeys: string[]
  /** Account-device cookie keys removed and closed by the route. */
  deviceKeys: string[]
  /** Showcase photo ids. The job removes these from `showcaseImages`. */
  photos: string[]
  /** Social conversations removed whole. The job calls removeConv on image and voice stores. */
  conversations: string[]
  /** Media authored by an erased actor in a retained shared group. */
  chatPhotos: string[]
  voices: string[]
  /** Maximum character revision in this closure; a cheap stale-preview projection. */
  securityRevision?: number
  /** Accounting retained without an actor identity by the store helper. */
  retained: {
    walletEffects: number
    accountAudit: number
    aggregateMetrics: boolean
  }
}

export interface ErasureCommerceRevocation {
  accountId: string
  secret: string
}

export interface ErasureDataResult {
  photos: string[]
  conversations: string[]
  chatPhotos: string[]
  voices: string[]
  commerceRevocations: ErasureCommerceRevocation[]
  retained: ErasurePlan['retained']
}

type Mutable = Record<string, unknown>
type SessionRow = { key: string; session: SessionRecord }

const record = (value: unknown): value is Mutable => value !== null && typeof value === 'object' && !Array.isArray(value)
const map = (value: unknown): Mutable | null => record(value) ? value : null
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
const sorted = (items: Iterable<string>): string[] => [...new Set(items)].sort((a, b) => a.localeCompare(b))
const sortedCharacters = (items: Iterable<ErasureCharacter>): ErasureCharacter[] => {
  const byId = new Map<string, ErasureCharacter>()
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id))
}
function fail(ctx: Pick<RouteContext, 'fail'>, status: number, code: string, reason: string): never {
  throw Object.assign(ctx.fail(status, code), { reason })
}
const own = <T>(value: Record<string, T> | undefined, key: string): T | undefined => {
  if (!value || key === '__proto__' || !Object.hasOwn(value, key)) return undefined
  const found = value[key]
  return found !== null && typeof found === 'object' ? found : undefined
}

function sessionRows(db: Db): SessionRow[] {
  const rows: SessionRow[] = []
  if (db.$store) db.$store.scanSessions((session, key) => { rows.push({ key, session }); return false })
  else for (const [key, session] of Object.entries(db.sessions)) if (record(session)) rows.push({ key, session })
  return rows
}

function archivedOf(db: Db, id: string): ArchivedLife | undefined {
  return own(db.archivedLives, id)
}

function actorName(db: Db, rows: readonly SessionRow[], id: string, agents: Mutable | null): string {
  const live = rows.find((row) => row.session.publicId === id)?.session
  if (live?.name) return live.name
  const archived = archivedOf(db, id)
  if (archived?.name) return archived.name
  const char = map(map(agents?.chars)?.[id])
  return typeof char?.name === 'string' && char.name ? char.name : 'Former player'
}

function characterKind(rows: readonly SessionRow[], id: string, scope: ErasureScope, agents: Mutable | null): ErasureCharacterKind {
  const found = rows.find((row) => row.session.publicId === id)?.session
  if (found?.agent?.char === true || map(map(agents?.chars)?.[id])) return 'agent'
  return scope === 'account' ? 'player' : 'guest'
}

function addResidenceShard(out: Set<string>, city: unknown, residence: unknown): void {
  if (typeof city !== 'string' || !/^[a-z][a-z0-9-]{0,39}$/.test(city) || !record(residence)) return
  const addLga = (value: unknown): void => {
    if (typeof value === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(value)) out.add(`${city}.${value}`)
  }
  addLga(residence.lga)
  const plot = map(residence.plot), old = map(residence.old)
  addLga(plot?.lga); addLga(old?.lga)
}

function addLifeShards(out: Set<string>, cities: unknown): void {
  if (!record(cities)) return
  for (const [storedCity, entry] of Object.entries(cities)) {
    const state = map(map(entry)?.state), estate = map(state?.estate)
    if (!estate) continue
    const currentCity = typeof estate.city === 'string' ? estate.city : storedCity
    addResidenceShard(out, currentCity, estate)
    const away = map(estate.away)
    if (away) for (const [city, residence] of Object.entries(away)) addResidenceShard(out, city, residence)
  }
}

function removeConversation(ctx: RouteContext, conv: SocialCollection['convs'][string], actorIds: ReadonlySet<string>): boolean {
  if (conv.kind === 'group') return !conv.members.some((member) => !actorIds.has(member))
  if (conv.kind === 'house') {
    if (typeof conv.owner !== 'string' || !conv.owner) fail(ctx, 409, 'erasure_ownership_unsupported', 'A shared house conversation has no proven host owner.')
    return actorIds.has(conv.owner)
  }
  return true
}

function mediaScope(ctx: RouteContext, db: Db, actorIds: ReadonlySet<string>): Pick<ErasurePlan, 'photos' | 'conversations' | 'chatPhotos' | 'voices'> {
  const photos = new Set<string>(), conversations = new Set<string>(), chatPhotos = new Set<string>(), voices = new Set<string>()
  const showcase = map(db.showcase), shops = map(showcase?.shops)
  if (shops) for (const shop of Object.values(shops)) {
    const row = map(shop)
    if (!row || typeof row.owner !== 'string' || !actorIds.has(row.owner) || !Array.isArray(row.photos)) continue
    for (const item of row.photos) { const photo = map(item); if (typeof photo?.id === 'string') photos.add(photo.id) }
  }
  const social = db.social
  if (social) for (const [id, conv] of Object.entries(social.convs)) {
    if (!record(conv)) continue
    const touches = conv.members.some((member) => actorIds.has(member)) || (typeof conv.owner === 'string' && actorIds.has(conv.owner))
      || (typeof conv.creator === 'string' && actorIds.has(conv.creator)) || conv.messages.some((message) => message.from !== null && actorIds.has(message.from))
    if (!touches) continue
    if (removeConversation(ctx, conv, actorIds)) { conversations.add(id); continue }
    for (const message of conv.messages) if (message.from && actorIds.has(message.from)) {
      if (message.img?.id) chatPhotos.add(message.img.id)
      if (message.voice?.id) voices.add(message.voice.id)
    }
  }
  return { photos: sorted(photos), conversations: sorted(conversations), chatPhotos: sorted(chatPhotos), voices: sorted(voices) }
}

function containsIdentity(value: unknown, ids: ReadonlySet<string>, seen = new Set<object>()): boolean {
  if (typeof value === 'string') return [...ids].some((id) => value.includes(id))
  if (!value || typeof value !== 'object' || seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some((item) => containsIdentity(item, ids, seen))
  return Object.entries(value as Mutable).some(([key, item]) => containsIdentity(key, ids, seen) || containsIdentity(item, ids, seen))
}

function preflightSharedIntegrity(ctx: RouteContext, db: Db, actors: ReadonlySet<string>): void {
  const jobs = map(map(db.playerErasure)?.jobs)
  if (jobs) for (const job of Object.values(jobs)) {
    const row = map(job)
    if (row?.state === 'pending' && strings(row.actors).some((id) => actors.has(id))) {
      fail(ctx, 409, 'erasure_in_progress', 'A permanent erasure for this player is already pending. Retry that job instead.')
    }
  }
  const records = peekRecords(db)
  for (const entry of Object.values(records.entries)) if (containsIdentity(entry, actors)) {
    fail(ctx, 409, 'erasure_public_record_unsupported', 'This player appears in the hash-chained public governance record. Erasure needs an explicit public-record retention policy before it can continue.')
  }

  for (const pot of Object.values(db.growth?.tables?.pots ?? {})) if (pot?.seats?.some((seat) => actors.has(seat.id))) {
    fail(ctx, 409, 'erasure_financial_state_active', 'This player has money in an unsettled table game. Settle or refund the game before erasing the player.')
  }
  const staked = idsWithMoney(db)
  if ([...actors].some((id) => staked.has(id))) {
    fail(ctx, 409, 'erasure_financial_state_active', 'This player has money in an unsettled arena match. Let it finish, or wait for the stakes to come back, before erasing the player.')
  }
  if (db.social) for (const [recipient, effects] of Object.entries(db.social.pending)) {
    if (!Array.isArray(effects)) continue
    for (const effect of effects) if (effect?.keep === true && (actors.has(recipient) || containsIdentity(effect, actors))) {
      fail(ctx, 409, 'erasure_financial_state_active', 'This player has an unsettled money transfer. Settle or refund it before erasing the player.')
    }
  }

  // Custom collections are extension points. Known collections below are either explicitly erased,
  // explicitly anonymised/aggregated, or contain no raw player id by contract. A new owner must add
  // its erasure rule instead of relying on a recursive delete.
  const known = new Set([
    'version', 'sessions', 'archivedLives', 'social', 'civic', 'support', 'moderation', 'growth', 'visits', 'commerce', 'business', 'market', 'legacy',
    'trust', 'trustChecks', 'street', 'realValue', 'showcase', 'politics', 'campus', 'accounts', 'accountDevices', 'accountLog', 'walletEffects', 'livingWorld', 'clans',
    'storyHelp', 'agentMemory', 'agents', 'records', 'adminAudit', 'adminSanctions', 'adminNotes', 'prayers', 'ownerActs', 'stages', 'agentCalls', 'playerErasure', 'arenareplays', 'arenapots', 'agentarena', 'oauth', 'arenadaily', 'spaces', '$store',, 'loops', '$store',, 'detty', '$store',
    'spotAi', 'aiRoles', 'aiContinuity', // erased by server/house/erase.ts eraseAiLife
  ])
  known.add('danfo') // runs, crews, days and boards: forgetDanfoPlayers (server/danfo/service.ts)
  known.add('watch') // picks, boards, badges, votes, artists, premieres: forgetWatchPlayers (server/watch/data.ts)
  known.add('glue') // close friends, talks, gist posts, trips, marriages: forgetGluePlayers (server/glue/forget.ts)
  known.add('minigames') // haggle memory, season rows and day counters: forgetMinigamesPlayers (server/minigames/store.ts)
  const collectionNames = (db.$store as (typeof db.$store & { collectionNames?: () => readonly string[] }) | undefined)?.collectionNames?.() ?? []
  const names = new Set([...Object.keys(db), ...collectionNames])
  for (const name of names) {
    const value = db[name]
    if (known.has(name) || !containsIdentity(value, actors)) continue
    fail(ctx, 409, 'erasure_ownership_unsupported', `The ${name} collection still owns data for this player and has no erasure contract.`)
  }
}

function validateClosureOwnership(ctx: RouteContext, db: Db, rows: readonly SessionRow[], actorIds: ReadonlySet<string>, scope: ErasureScope,
  account: AccountRecord | undefined, agents: Mutable | null): void {
  const chars = map(agents?.chars), owners = map(agents?.owners)
  for (const id of actorIds) {
    const live = rows.filter((row) => row.session.publicId === id), archived = archivedOf(db, id), char = map(chars?.[id])
    if (live.length && archived) fail(ctx, 409, 'erasure_ownership_unsupported', 'A character id is simultaneously live and archived.')
    const accountRefs = Object.values(db.accounts ?? {}).filter((candidate) => candidate?.publicId === id || candidate?.parked.some((item) => item.id === id))

    if (scope === 'guest') {
      if (char || accountRefs.length || archived?.account !== undefined || live.some((row) => row.session.account !== undefined || row.session.agent?.char === true)) {
        fail(ctx, 409, 'erasure_ownership_unsupported', 'The guest id is also claimed by an account or agent registry.')
      }
      continue
    }

    if (scope === 'agent') {
      if (!char || typeof char.account !== 'string' || accountRefs.length
        || live.some((row) => row.session.account !== undefined || row.session.agent?.char !== true || (row.session.agent.owner ?? '') !== char.account)
        || (archived?.account !== undefined && archived.account !== char.account)) {
        fail(ctx, 409, 'erasure_ownership_unsupported', 'The agent id has conflicting account, session, archive or registry ownership.')
      }
      if (char.account) {
        const owner = map(owners?.[char.account])
        if (!owner || !strings(owner.chars).includes(id)) fail(ctx, 409, 'erasure_ownership_unsupported', 'The agent owner index does not contain this character.')
      }
      continue
    }

    if (!account) fail(ctx, 409, 'erasure_ownership_unsupported', 'The account closure has no proven owner.')
    const active = account.publicId === id, parked = account.parked.some((item) => item.id === id)
    const indexedAgent = strings(map(owners?.[account.id])?.chars).includes(id)
    const registeredAgent = char?.account === account.id
    const liveAgent = live.some((row) => row.session.agent?.char === true)
    if (active || parked) {
      if (indexedAgent || char || liveAgent || accountRefs.length !== 1 || accountRefs[0]?.id !== account.id) {
        fail(ctx, 409, 'erasure_ownership_unsupported', 'A human account character is also claimed as an agent or by another account.')
      }
      if (active && (live.length !== 1 || live[0]?.key !== account.sessionKey || live[0]?.session.account !== account.id)) {
        fail(ctx, 409, 'erasure_ownership_unsupported', 'The active character does not have exactly one matching account session.')
      }
      if (parked && (live.length !== 0 || archived?.account !== account.id)) {
        fail(ctx, 409, 'erasure_ownership_unsupported', 'The parked character does not have exactly one matching account archive.')
      }
      continue
    }
    if (!indexedAgent || !registeredAgent || accountRefs.length
      || live.some((row) => row.session.account !== undefined || row.session.agent?.char !== true || row.session.agent.owner !== account.id)
      || (archived?.account !== undefined && archived.account !== account.id)) {
      fail(ctx, 409, 'erasure_ownership_unsupported', 'An owned agent character has conflicting session, archive or registry ownership.')
    }
  }
}

function buildPlan(ctx: RouteContext, db: Db, targetId: string): ErasurePlan {
  const rows = sessionRows(db), targetRows = rows.filter((row) => row.session.publicId === targetId)
  const target = targetRows[0]?.session
  const archivedTarget = archivedOf(db, targetId)
  const agents = map(db.agents)
  const targetAgent = map(map(agents?.chars)?.[targetId])
  if (!target && !archivedTarget && !targetAgent) fail(ctx, 404, 'unknown_player', 'No stored player has that id.')
  const targetName = target?.name ?? archivedTarget?.name ?? (typeof targetAgent?.name === 'string' ? targetAgent.name : 'Former player')
  if (targetRows.some((row) => row.session.name !== targetName) || (archivedTarget && archivedTarget.name !== targetName)) {
    fail(ctx, 409, 'erasure_ownership_unsupported', 'The player id is attached to conflicting stored characters.')
  }
  if (target?.agent?.char === true && target.account !== undefined) fail(ctx, 409, 'erasure_ownership_unsupported', 'This character is marked as both an account character and an agent character.')

  const actorIds = new Set<string>([targetId]), accountIds = new Set<string>()
  const targetAccount = target?.account ?? archivedTarget?.account
  let scope: ErasureScope = target?.agent?.char === true || targetAgent ? 'agent' : targetAccount ? 'account' : 'guest'
  let account: AccountRecord | undefined
  if (scope === 'account') {
    account = own(db.accounts, targetAccount!)
    const activeTarget = account?.publicId === targetId
    const parkedTarget = account?.parked.some((item) => item.id === targetId) === true
    if (!account || account.id !== targetAccount || (!activeTarget && !parkedTarget)
      || (activeTarget && !targetRows.some((row) => row.key === account!.sessionKey))
      || (parkedTarget && archivedTarget?.account !== account.id)) {
      fail(ctx, 409, 'erasure_ownership_unsupported', 'The account and target character do not agree about ownership.')
    }
    accountIds.add(account.id)
    if (account.publicId) actorIds.add(account.publicId)
    for (const parked of account.parked) {
      const archived = archivedOf(db, parked.id)
      if (!archived || archived.account !== account.id) fail(ctx, 409, 'erasure_ownership_unsupported', 'A set-aside character does not agree with its account owner.')
      actorIds.add(parked.id)
    }
    for (const row of rows) {
      if (row.session.account === account.id && row.session.publicId !== account.publicId) fail(ctx, 409, 'erasure_ownership_unsupported', 'More than one live player character claims this account.')
      if (row.session.agent?.owner === account.id) actorIds.add(row.session.publicId)
    }
    const owner = map(map(agents?.owners)?.[account.id])
    for (const id of strings(owner?.chars)) actorIds.add(id)
    const chars = map(agents?.chars)
    if (chars) for (const [id, value] of Object.entries(chars)) if (map(value)?.account === account.id) actorIds.add(id)
  }

  if (scope === 'agent') {
    if (!agents || !map(agents.chars) || !map(agents.keys) || !map(agents.owners)) fail(ctx, 409, 'erasure_ownership_unsupported', 'The agent ownership registry is unavailable.')
    const char = map(map(agents.chars)?.[targetId])
    if (!char || typeof char.account !== 'string' || (target?.agent?.owner !== undefined && target.agent.owner !== char.account)) fail(ctx, 409, 'erasure_ownership_unsupported', 'The agent character and its ownership registry do not agree.')
  }

  for (const id of actorIds) for (const row of rows.filter((item) => item.session.publicId === id)) {
    if (scope === 'account') {
      const valid = row.session.account === account!.id || (row.session.agent?.char === true && row.session.agent.owner === account!.id)
      if (!valid) fail(ctx, 409, 'erasure_ownership_unsupported', 'A character in the account closure has a different owner.')
    } else if (id !== targetId) fail(ctx, 409, 'erasure_ownership_unsupported', 'The erasure closure unexpectedly expanded beyond its target.')
  }

  const ids = sorted(actorIds), idSet = new Set(ids), accounts = sorted(accountIds)
  validateClosureOwnership(ctx, db, rows, idSet, scope, account, agents)
  preflightSharedIntegrity(ctx, db, idSet)
  const sessionKeys = sorted(rows.filter((row) => idSet.has(row.session.publicId)).map((row) => row.key))
  const deviceKeys = new Set<string>()
  for (const id of accounts) {
    const found = own(db.accounts, id)
    for (const key of found?.devices ?? []) {
      const device = own(db.accountDevices, key)
      if (!device || device.account !== id) fail(ctx, 409, 'erasure_ownership_unsupported', 'An account device binding does not agree with its owner.')
      deviceKeys.add(key)
    }
    for (const [key, device] of Object.entries(db.accountDevices ?? {})) if (device?.account === id) deviceKeys.add(key)
  }

  const shards = new Set<string>()
  for (const id of ids) {
    for (const row of rows.filter((item) => item.session.publicId === id)) {
      addLifeShards(shards, row.session.cities); addLifeShards(shards, row.session.legacyLives)
    }
    const archived = archivedOf(db, id)
    if (archived) { addLifeShards(shards, archived.cities); addLifeShards(shards, archived.legacyLives) }
  }
  for (const purchase of Object.values(db.civic?.landPurchases ?? {})) if (purchase && idSet.has(purchase.owner)) addResidenceShard(shards, purchase.city, { lga: purchase.anchor.lga, plot: purchase.anchor })

  const characters = sortedCharacters(ids.map((id) => ({ id, name: actorName(db, rows, id, agents), kind: characterKind(rows, id, scope, agents) })))
  const revisions = rows.filter((row) => idSet.has(row.session.publicId)).map((row) => row.session.rev ?? 0)
  const media = mediaScope(ctx, db, idSet)
  return {
    version: 1, targetId, targetName, scope, characters, actorIds: ids, accountIds: accounts, shardNames: sorted(shards), sessionKeys,
    deviceKeys: sorted(deviceKeys), ...media, ...(revisions.length ? { securityRevision: Math.max(...revisions) } : {}),
    retained: {
      walletEffects: (db.walletEffects ?? []).filter((effect) => idSet.has(effect.publicId)).length,
      accountAudit: (db.accountLog?.audit ?? []).filter((line) => typeof line.life === 'string' && idSet.has(line.life)).length,
      aggregateMetrics: Boolean(db.growth?.metrics || record(db.works) || record(db.launchBonusSeen)),
    },
  }
}

/** Read-only deterministic preflight. Only the root admin may prepare permanent erasure. */
export function planErasure(ctx: RouteContext, db: Db, admin: Admin, targetId: string): ErasurePlan {
  if (!admin.root) fail(ctx, 403, 'root_required', 'Only the root admin can permanently erase a player.')
  const plan = buildPlan(ctx, db, targetId)
  if (plan.actorIds.includes(admin.publicId) || plan.accountIds.includes(admin.accountId)) fail(ctx, 403, 'protected_target', 'The root admin cannot erase their own player or account.')
  for (const accountId of plan.accountIds) if (standing(ctx, own(db.accounts, accountId)) !== null) fail(ctx, 403, 'protected_target', 'Admin and root-admin accounts cannot be erased.')
  if (plan.scope === 'agent') {
    const owner = map(map(map(db.agents)?.chars)?.[targetId])?.account
    if (typeof owner === 'string' && owner && (owner === admin.accountId || standing(ctx, own(db.accounts, owner)) !== null)) {
      fail(ctx, 403, 'protected_target', 'Characters owned by an admin or root-admin account cannot be erased.')
    }
  }
  return plan
}

function samePlan(a: ErasurePlan, b: ErasurePlan): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

function scrubRef(value: unknown, ids: ReadonlySet<string>): void {
  if (!record(value) || typeof value.id !== 'string' || !ids.has(value.id)) return
  value.id = ''
  value.name = 'Former player'
}

function scrubSocial(ctx: RouteContext, social: SocialCollection, ids: ReadonlySet<string>): void {
  for (const id of ids) clearPlayerFamily(social.players, id)
  const removedConvs = new Set<string>()
  const removedReports = new Set(social.reports.filter((report) => ids.has(report.by) || ids.has(report.about)).map((report) => report.id))
  for (const [convId, conv] of Object.entries(social.convs)) {
    const touches = conv.members.some((member) => ids.has(member)) || (conv.owner ? ids.has(conv.owner) : false) || (conv.creator ? ids.has(conv.creator) : false)
      || conv.messages.some((message) => message.from !== null && ids.has(message.from))
    if (!touches) {
      for (const message of conv.messages) {
        if (message.re && ids.has(message.re.from)) delete message.re
        if (message.men) message.men = message.men.filter(([id]) => id === 'everyone' || !ids.has(id))
        if (message.rx) for (const id of ids) delete message.rx[id]
      }
      if (conv.messagePins) conv.messagePins.entries = conv.messagePins.entries.filter((pin) => !ids.has(pin.by))
      if (conv.room) {
        for (const id of ids) { if (conv.room.passes) delete conv.room.passes[id]; if (conv.room.barred) delete conv.room.barred[id] }
        if (conv.room.link && ids.has(conv.room.link.by)) delete conv.room.link
      }
      continue
    }
    const remaining = conv.members.filter((member) => !ids.has(member))
    if (removeConversation(ctx, conv, ids)) {
      delete social.convs[convId]; removedConvs.add(convId)
      continue
    }
    conv.members = remaining
    conv.messages = conv.messages.filter((message) => !message.from || !ids.has(message.from))
    for (const message of conv.messages) {
      if (message.re && ids.has(message.re.from)) delete message.re
      if (message.men) message.men = message.men.filter(([id]) => id === 'everyone' || !ids.has(id))
      if (message.rx) for (const id of ids) delete message.rx[id]
    }
    if (conv.owner && ids.has(conv.owner)) conv.owner = remaining[0]
    if (conv.creator && ids.has(conv.creator)) delete conv.creator
    if (conv.messagePins) conv.messagePins.entries = conv.messagePins.entries.filter((pin) => !ids.has(pin.by))
    if (conv.room) {
      for (const id of ids) { if (conv.room.passes) delete conv.room.passes[id]; if (conv.room.barred) delete conv.room.barred[id] }
      if (conv.room.link && ids.has(conv.room.link.by)) delete conv.room.link
    }
  }
  for (const id of ids) {
    delete social.players[id]; delete social.houses[id]; delete social.pending[id]
    if (social.pingJoins) delete social.pingJoins[id]
  }
  for (const player of Object.values(social.players)) {
    for (const id of ids) {
      delete player.friends[id]; delete player.in[id]; delete player.out[id]; delete player.blocked[id]; delete player.baeIn[id]
      if (player.publicRomance) delete player.publicRomance[id]
      if (player.romanceAsked) delete player.romanceAsked[id]
      if (player.introTold) delete player.introTold[id]
      if (player.bae === id) player.bae = null
      if (player.visiting === id) player.visiting = null
      if (player.founder?.id === id) delete player.founder
      if (player.invite?.by === id) delete player.invite
    }
    for (const conv of removedConvs) delete player.convs[conv]
    player.updates = player.updates.filter((update) => !ids.has(update.data?.from ?? '') && !ids.has(update.data?.host ?? '')
      && !removedConvs.has(update.data?.conv ?? '') && !removedReports.has(update.data?.report ?? ''))
    player.reports = player.reports.filter((report) => !ids.has(report.about))
    if (player.thanks) player.thanks.recent = player.thanks.recent.filter((line) => !ids.has(line.who))
  }
  for (const house of Object.values(social.houses)) for (const id of ids) {
    delete house.knocks[id]; delete house.guests[id]; if (house.barred) delete house.barred[id]
    if (house.party?.mc === id) delete house.party.mc
    if (house.party?.dj === id) delete house.party.dj
    if (house.party?.sprayed) delete house.party.sprayed[id]
  }
  social.reports = social.reports.filter((report) => !ids.has(report.by) && !ids.has(report.about))
  if (social.pings) for (const [key, ping] of Object.entries(social.pings)) if (ids.has(ping.from) || ids.has(ping.to)) delete social.pings[key]
  if (social.moneyRequests) for (const [key, request] of Object.entries(social.moneyRequests)) if (ids.has(request.from) || ids.has(request.to)) delete social.moneyRequests[key]
  if (social.founder && ids.has(social.founder.id)) delete social.founder
}

function scrubVisits(db: Db, ids: ReadonlySet<string>): void {
  if (!db.visits) return
  for (const [key, invite] of Object.entries(db.visits.invites)) if (ids.has(invite.host) || ids.has(invite.guest)) delete db.visits.invites[key]
  for (const [key, link] of Object.entries(db.visits.links)) {
    if (ids.has(link.host)) { delete db.visits.links[key]; continue }
    for (const id of ids) { delete link.members[id]; if (link.removed) delete link.removed[id] }
  }
}

function scrubGrowth(db: Db, ids: ReadonlySet<string>): void {
  const growth = db.growth
  if (!growth) return
  for (const id of ids) {
    delete growth.players[id]; delete growth.contacts?.[id]; delete growth.push?.[id]; delete growth.comeback?.[id]
    delete growth.metrics.lives?.[id]; delete growth.tables.ratings?.[id]
    if (growth.tables.stakes) delete growth.tables.stakes.players[id]
  }
  for (const metrics of Object.values(growth.metrics.cities ?? {})) if (metrics?.lives) for (const id of ids) delete metrics.lives[id]
  for (const tables of Object.values(growth.tables.cities ?? {})) if (tables?.ratings) for (const id of ids) delete tables.ratings[id]
  for (const player of Object.values(growth.players)) {
    if (player.ref && ids.has(player.ref.by)) player.ref = null
    for (const id of ids) { delete player.invited[id]; delete player.nudged?.[id] }
    player.owed = player.owed.filter((id) => !ids.has(id))
  }
  for (const comeback of Object.values(growth.comeback ?? {})) {
    comeback.nudges = comeback.nudges.filter((nudge) => !ids.has(nudge.from))
    if (comeback.pings) comeback.pings = comeback.pings.filter((ping) => !ids.has(ping.from))
  }
  for (const [key, share] of Object.entries(growth.shares)) if (ids.has(share.by)) delete growth.shares[key]
  if (growth.tables.pairs) for (const key of Object.keys(growth.tables.pairs.counts)) if (key.split('|').some((id) => ids.has(id))) delete growth.tables.pairs.counts[key]
  if (growth.tables.stakes) for (const key of Object.keys(growth.tables.stakes.pairs)) if (key.split('|').some((id) => ids.has(id))) delete growth.tables.stakes.pairs[key]
}

function scrubCivic(db: Db, ids: ReadonlySet<string>): void {
  const civic = db.civic
  if (!civic) return
  for (const id of ids) delete civic.prefs[id]
  if (civic.landPurchases) for (const [key, purchase] of Object.entries(civic.landPurchases)) if (ids.has(purchase.owner)) delete civic.landPurchases[key]
  for (const city of Object.values(civic.cities)) {
    if (!city) continue
    for (const id of ids) { delete city.residents[id]; delete city.radio.daily[id] }
    for (const election of Object.values(city.gov.elections)) {
      for (const id of ids) { delete election.candidates[id]; delete election.votes[id] }
      for (const [voter, candidate] of Object.entries(election.votes)) if (ids.has(candidate)) delete election.votes[voter]
    }
    city.gov.announcements = city.gov.announcements.filter((item) => !ids.has(item.by.id))
    for (const board of [city.ads.billboard, city.ads.sea]) for (const [key, item] of Object.entries(board)) if (ids.has(item.by.id)) delete board[key]
    for (const [key, queue] of Object.entries(city.radio.queues)) city.radio.queues[key] = queue.filter((item) => !ids.has(item.by.id))
  }
}

function scrubPolitics(db: Db, ids: ReadonlySet<string>): void {
  const politics = db.politics
  if (!politics) return
  for (const id of ids) delete politics.members[id]
  for (const party of Object.values(politics.parties)) scrubRef(party.founder, ids)
  for (const scope of Object.values(politics.scopes)) {
    if (scope.gov) {
      for (const election of Object.values(scope.gov.elections)) {
        for (const id of ids) { delete election.candidates[id]; delete election.votes[id] }
        for (const [voter, candidate] of Object.entries(election.votes)) if (ids.has(candidate)) delete election.votes[voter]
      }
      scope.gov.announcements = scope.gov.announcements.filter((item) => !ids.has(item.by.id))
    }
    scrubRef(scope.decree?.by, ids); scrubRef(scope.audit?.by, ids)
    for (const grant of scope.grants?.items ?? []) scrubRef(grant.to, ids)
    if (scope.petition) for (const id of ids) delete scope.petition.signers[id]
    for (const bill of scope.bills?.items ?? []) {
      scrubRef(bill.by, ids)
      for (const id of ids) delete bill.votes[id]
    }
  }
  const justice = politics.justice
  if (!justice) return
  for (const offence of Object.values(justice.offences)) { scrubRef(offence.by, ids); scrubRef(offence.against, ids) }
  for (const id of ids) {
    delete justice.jail[id]; delete justice.police[id]; delete justice.judges[id]; delete justice.lawyers[id]; delete justice.fights[id]
  }
  for (const jail of Object.values(justice.jail)) { scrubRef(jail.by, ids); for (const id of ids) delete jail.visits?.[id] }
  for (const officer of [...Object.values(justice.police), ...Object.values(justice.judges)]) scrubRef(officer.by, ids)
  for (const courtCase of Object.values(justice.cases)) {
    scrubRef(courtCase.defendant, ids); scrubRef(courtCase.officer, ids); scrubRef(courtCase.ruling?.by, ids); scrubRef(courtCase.lower?.by, ids)
    if (courtCase.counsel && ids.has(courtCase.counsel.id)) delete courtCase.counsel
  }
  for (const key of Object.keys(justice.pairs)) if (key.split('|').some((id) => ids.has(id))) delete justice.pairs[key]
}

function scrubBusiness(db: Db, ids: ReadonlySet<string>): void {
  if (!db.business) return
  const removed = new Set<string>()
  for (const [key, shop] of Object.entries(db.business.shops)) {
    if (ids.has(key) || ids.has(shop.by.id)) { removed.add(key); delete db.business.shops[key]; continue }
    for (const id of ids) delete shop.buyers[id]
    shop.raters = shop.raters.filter((id) => !ids.has(id))
  }
  db.business.reports = db.business.reports.filter((report) => !ids.has(report.by) && !removed.has(report.shop))
}

function scrubTrustAndSupport(db: Db, ids: ReadonlySet<string>, accounts: ReadonlySet<string>): void {
  if (db.trust) {
    for (const id of ids) { delete db.trust.players[id]; delete db.trust.reviewed[id] }
    db.trust.reports = db.trust.reports.filter((report) => !ids.has(report.by) && !ids.has(report.about))
  }
  if (db.trustChecks?.checks) for (const [key, check] of Object.entries(db.trustChecks.checks)) if (ids.has(check.player) || accounts.has(check.account)) delete db.trustChecks.checks[key]
  if (db.support) db.support.reports = db.support.reports.filter((report) => !ids.has(report.by))
  if (db.moderation) {
    for (const id of ids) delete db.moderation.mutes[id]
    for (const line of db.moderation.audit) if (ids.has(line.target)) { line.target = ''; line.detail = 'Retained moderation accounting for an erased player.' }
  }
}

function scrubAdminCollections(db: Db, ids: ReadonlySet<string>, accounts: ReadonlySet<string>): void {
  const sanctions = map(db.adminSanctions), sanctionPlayers = map(sanctions?.players), sanctionAccounts = map(sanctions?.accounts)
  if (sanctionPlayers) for (const id of ids) delete sanctionPlayers[id]
  if (sanctionAccounts) for (const id of accounts) delete sanctionAccounts[id]
  const notes = map(map(db.adminNotes)?.players)
  if (notes) for (const id of ids) delete notes[id]
  const audit = map(db.adminAudit)
  if (Array.isArray(audit?.lines)) for (const line of audit.lines) {
    if (!record(line) || !containsIdentity(line, ids)) continue
    line.target = ''; line.targetName = 'Former player'; line.params = {}; line.summary = 'Retained accounting entry for an erased player.'; line.reason = 'Player erased.'
  }
}

function scrubMisc(db: Db, ids: ReadonlySet<string>, accounts: ReadonlySet<string> = new Set()): void {
  forgetReplayPlayers(db, ids)
  forgetDailyPlayers(db, ids)
  const arena = peekArena(db)
  if (arena) forgetArena(arena, ids, new Set([...accounts].map(ownerKeyOf)))
  if (db.street) for (const id of ids) delete db.street.journeys[id]
  forgetDettyPlayers(db, ids)
  if (db.campus?.election) {
    const election = db.campus.election
    election.candidates = election.candidates.filter((candidate) => !ids.has(candidate.id))
    election.ballots = election.ballots.filter((ballot) => !ids.has(ballot.candidateId))
    if (election.winner && ids.has(election.winner.id)) election.winner = null
  }
  const stages = map(map(db.stages)?.birthdays)
  if (stages) for (const id of ids) delete stages[id]
  const prayers = map(db.prayers)
  if (Array.isArray(prayers?.items)) prayers.items = prayers.items.filter((item) => !record(item) || typeof item.who !== 'string' || !ids.has(item.who))
  const acts = map(db.ownerActs)
  if (acts) {
    if (Array.isArray(acts.lines)) acts.lines = acts.lines.filter((line) => !record(line) || typeof line.target !== 'string' || !ids.has(line.target))
    for (const key of ['sickened', 'blessed', 'dreamt', 'fates']) { const rows = map(acts[key]); if (rows) for (const id of ids) delete rows[id] }
  }
  const calls = map(map(db.agentCalls)?.days)
  if (calls) for (const day of Object.values(calls)) {
    const players = map(map(day)?.players)
    if (players) for (const id of ids) { delete players[id]; delete players[`p_${sha256Hex(`allworld-house-v1|${id}`).slice(0, 32)}`] }
  }
}

function scrubAgents(db: Db, ids: ReadonlySet<string>, accounts: ReadonlySet<string>): void {
  forgetOAuth(db, accounts)
  const agents = map(db.agents), keys = map(agents?.keys), owners = map(agents?.owners), chars = map(agents?.chars), claims = map(agents?.claims), names = map(agents?.names)
  if (!agents || !keys || !owners || !chars) return
  for (const [hash, value] of Object.entries(keys)) {
    const key = map(value)
    if (key && ((typeof key.publicId === 'string' && ids.has(key.publicId)) || (typeof key.account === 'string' && accounts.has(key.account)))) delete keys[hash]
  }
  for (const [id, value] of Object.entries(chars)) {
    const char = map(value)
    if (!ids.has(id) && !(typeof char?.account === 'string' && accounts.has(char.account))) continue
    if (typeof char?.slug === 'string' && names?.[char.slug] === id) delete names[char.slug]
    delete chars[id]
  }
  for (const [accountId, value] of Object.entries(owners)) {
    if (accounts.has(accountId)) { delete owners[accountId]; continue }
    const owner = map(value)
    if (!owner) continue
    owner.keys = strings(owner.keys).filter((hash) => Object.hasOwn(keys, hash))
    owner.chars = strings(owner.chars).filter((id) => !ids.has(id) && Object.hasOwn(chars, id))
  }
  if (claims) for (const [hash, value] of Object.entries(claims)) { const claim = map(value); if (typeof claim?.publicId === 'string' && ids.has(claim.publicId)) delete claims[hash] }
}

function scrubAccounts(db: Db, ids: ReadonlySet<string>, accounts: ReadonlySet<string>, sessionKeys: readonly string[], deviceKeys: readonly string[]): void {
  for (const key of sessionKeys) delete db.sessions[key]
  if (db.archivedLives) for (const id of ids) delete db.archivedLives[id]
  if (db.accountDevices) for (const key of deviceKeys) delete db.accountDevices[key]
  for (const accountId of accounts) {
    if (db.accountLog?.welcome) db.accountLog.welcome = db.accountLog.welcome.filter((item) => item.id !== accountId)
    if (db.accounts) delete db.accounts[accountId]
  }
  if (db.accountLog) {
    for (const line of db.accountLog.audit) if (line.life && ids.has(line.life)) delete line.life
    db.accountLog.accounts = Math.max(0, (db.accountLog.accounts ?? Object.keys(db.accounts ?? {}).length + accounts.size) - accounts.size)
  }
}

function eraseActorStorage(db: Db, actors: readonly string[]): void {
  const helper = (db.$store as (typeof db.$store & { eraseActorStorage?: (ids: readonly string[]) => void }) | undefined)?.eraseActorStorage
  if (helper) { helper(actors); return }
  const ids = new Set(actors)
  eraseWalletActors(db.walletEffects ?? [], ids)
  for (const session of Object.values(db.sessions)) if (ids.has(session.publicId)) { session.actions = {}; delete session.once }
  for (const archived of Object.values(db.archivedLives ?? {})) if (ids.has(archived.publicId)) { delete archived.actions; delete archived.once }
}

/**
 * Apply the main-store deletion. The caller must run this in the same transaction that creates the
 * pending cross-store cleanup job. Throws before the first mutation when the preview is stale or a
 * shared integrity obligation cannot be handled safely.
 */
export function eraseData(ctx: RouteContext, db: Db, plan: ErasurePlan): ErasureDataResult {
  if (plan.version !== 1) fail(ctx, 409, 'erasure_plan_changed', 'The erasure plan version is no longer supported.')
  const current = buildPlan(ctx, db, plan.targetId)
  if (!samePlan(current, plan)) fail(ctx, 409, 'erasure_plan_changed', 'The player changed after the erasure preview. Review the current scope and confirm again.')
  const ids = new Set(plan.actorIds), accounts = new Set(plan.accountIds)

  // Privacy hooks own their domain-specific validation and must run before any destructive write.
  const agentRecord = map(map(map(db.agents)?.chars)?.[plan.targetId])
  const owner = plan.scope === 'account' ? plan.accountIds[0]! : plan.scope === 'agent'
    ? sessionRows(db).find((row) => row.session.publicId === plan.targetId)?.session.agent?.owner
      ?? (typeof agentRecord?.account === 'string' ? agentRecord.account || null : null)
    : null
  // The privacy hook deliberately bounds one proof set to six characters. An account can also own
  // two agent characters, so apply the same already-proven account owner in bounded batches.
  for (let at = 0; at < plan.actorIds.length; at += 6) eraseLivingWorldProgress(db, plan.actorIds.slice(at, at + 6), owner)

  const commerceRevocations: ErasureCommerceRevocation[] = []
  for (const accountId of plan.accountIds) {
    const commerce = db.commerce?.stores[accountId]
    if (commerce?.grant) commerceRevocations.push({ accountId, secret: commerce.grant.secret })
  }
  eraseRealValue(db, plan.actorIds)
  eraseMarket(db, plan.actorIds)
  eraseLegacy(db, plan.actorIds)
  const photos = sorted(eraseShowcase(db, plan.actorIds))
  if (JSON.stringify(photos) !== JSON.stringify(plan.photos)) fail(ctx, 409, 'erasure_plan_changed', 'Showcase ownership changed after the erasure preview.')
  for (const id of plan.actorIds) erasePerson(db, id)
  for (const id of plan.actorIds) eraseAiLife(db, id)

  if (db.social) scrubSocial(ctx, db.social, ids)
  scrubVisits(db, ids)
  forgetStoryHelp(db, ids)
  scrubGrowth(db, ids)
  scrubCivic(db, ids)
  scrubPolitics(db, ids)
  scrubBusiness(db, ids)
  forgetClanPlayers(db, ids)
  forgetFeedPlayers(db, ids)
  forgetContactsPlayers(db, ids)
  forgetPromotePlayers(db, ids)
  forgetEarnPlayers(db, ids)
  forgetWorldEventPlayers(db, [...ids])
  forgetDanfoPlayers(db, ids)
  forgetWatchPlayers(db, [...ids])
  forgetMinigamesPlayers(db, ids)
  forgetLoopsPlayers(db, ids)
  forgetNeighbourhoodPlayers(db, ids)
  forgetGluePlayers(db, ids)
  eraseSpaces(db, ids)
  scrubTrustAndSupport(db, ids, accounts)
  scrubAdminCollections(db, ids, accounts)
  scrubMisc(db, ids, accounts)
  scrubAgents(db, ids, accounts)
  if (db.commerce) for (const accountId of accounts) delete db.commerce.stores[accountId]
  eraseActorStorage(db, plan.actorIds)
  scrubAccounts(db, ids, accounts, plan.sessionKeys, plan.deviceKeys)

  return {
    photos, conversations: [...plan.conversations], chatPhotos: [...plan.chatPhotos], voices: [...plan.voices],
    commerceRevocations, retained: { ...plan.retained },
  }
}
