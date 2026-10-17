import { characterCity } from '../character.ts'
import { socialService } from '../social/service.ts'
import type { PushList } from '../social/service.ts'
import { prepareStoredCityContent } from '../request-city-content.ts'
import { growthOf } from '../growth/data.ts'
import { outreachService } from '../growth/outreach.ts'
import type { PingJob } from '../growth/ping-mail.ts'
import { gistService } from '../gist/ledger.ts'
import { UUID_PATTERN } from '../protocol.ts'
import { chapterOf } from '../../src/story/ladder.ts'
import { STORY_HELP_MS } from '../../src/story/coop.ts'
import { episodeById } from '../../src/game/content/episodes.ts'
import { cityName } from '../../src/game/cities/registry.ts'
import { missionCatalogues } from '../../src/game/systems/missions.ts'
import { helpProof, playHelpTable } from './games.ts'
import type { StoryHelpProof } from './games.ts'
import type { StoryHelpKind } from '../../src/types/story.ts'
import type { EpisodeChallengeDefinition } from '../../src/types/episodes.ts'
import type { LifeState } from '../../src/types/life.ts'
import type { CityId } from '../../src/types/protocol.ts'
import type { Db, RouteContext, RouteRequest, SessionRecord } from '../types.ts'

const DAY = 86_400_000
export const STORY_CALLS_PER_DAY = 3
const MAX_SESSIONS = 3000

export interface StoryHelpSession {
  id: string
  host: string
  to: string
  city: CityId
  venue: string
  episodeId: string
  at: number
  expires: number
  joinedAt: number | null
  phase: 'offered' | 'active' | 'completed' | 'ended'
  proof: StoryHelpProof
}
export interface StoryHelpBook {
  version: 1
  calls: Record<string, { day: number; count: number }>
  sessions: Record<string, StoryHelpSession>
  bargains?: Record<string, { city: CityId; at: number; ask: number; rounds: number; deal: number | null }>
}

const no = (code: string, reason: string) => ({ ok: false as const, code, reason })
const yes = (code: string, extra: { id?: string } = {}) => ({ ok: true as const, code, ...extra })
export type StoryReply = ReturnType<typeof no> | ReturnType<typeof yes>
const kindOf = (value: unknown): value is StoryHelpKind => value === 'second-answer' || value === 'two-seat' || value === 'errand'
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

export function peekStoryHelp(db: Db): StoryHelpBook | null {
  const book = db.storyHelp
  if (book === undefined) return null
  if (!record(book) || book.version !== 1 || !record(book.calls) || !record(book.sessions) || book.bargains !== undefined && !record(book.bargains)) throw new TypeError('Story help data is unavailable; preserve it for recovery.')
  return book
}

export function openBook(db: Db, now: number): StoryHelpBook {
  const book = peekStoryHelp(db) ?? (db.storyHelp = { version: 1, calls: {}, sessions: {} })
  for (const [id, call] of Object.entries(book.calls)) if (call.day < Math.floor(now / DAY)) delete book.calls[id]
  for (const [id, session] of Object.entries(book.sessions)) if (session.expires + DAY < now) delete book.sessions[id]
  if (book.bargains) for (const [id, bargain] of Object.entries(book.bargains)) if (!Number.isSafeInteger(bargain.at) || bargain.at + DAY < now) delete book.bargains[id]
  return book
}

export function forgetStoryHelp(db: Db, ids: ReadonlySet<string>): void {
  const book = peekStoryHelp(db)
  if (book) {
    for (const id of ids) delete book.calls[id]
    for (const id of ids) if (book.bargains) delete book.bargains[id]
    for (const [id, session] of Object.entries(book.sessions)) if (ids.has(session.host) || ids.has(session.to)) delete book.sessions[id]
  }
  const clear = (session: Pick<SessionRecord, 'cities' | 'legacyLives'>) => {
    for (const entry of [...Object.values(session.cities), ...Object.values(session.legacyLives ?? {})]) {
      const helper = entry?.state.story?.helper
      if (helper && ids.has(helper.host)) { helper.host = 'former-player'; helper.until = 1 }
    }
  }
  for (const session of Object.values(db.sessions)) if (!ids.has(session.publicId)) clear(session)
  for (const session of Object.values(db.archivedLives ?? {})) if (!ids.has(session.publicId)) clear(session)
}

export function storyCoop(ctx: RouteContext) {
  const social = socialService(ctx), kit = social.kit, mailer = outreachService(ctx).pingMail
  const enabled = () => ctx.checks.setting?.('storyMode') === true
  const uuid = (value: unknown): string => {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) throw ctx.fail(400, 'invalid_help_session')
    return value.toLowerCase()
  }
  function life(session: SessionRecord): LifeState {
    const city = characterCity(session)
    if (!city) throw ctx.fail(409, 'character_required')
    return ctx.settle(session, city)
  }
  function byId(db: Db, id: string): SessionRecord | null {
    const session = ctx.core.sessionByPublicId(db, id)
    return session && session.expiresAt > ctx.now() ? session : null
  }
  function questions(session: StoryHelpSession, host: LifeState): { host: EpisodeChallengeDefinition; helper: EpisodeChallengeDefinition } | null {
    const episode = episodeById(session.episodeId)
    if (!episode || episode.location.city !== session.city || episode.location.venue !== session.venue) return null
    const choice = host.episodes.runs[episode.id]?.choice ?? 'work'
    const other = choice === 'work' ? 'study' : choice === 'study' ? 'help' : 'work'
    const question = episode.challenges[choice]
    const cityTale = episodeById(`place-${session.city}-city-story`)
    const candidates = [cityTale?.challenges[other], ...Object.values(episode.challenges), ...Object.values(cityTale?.challenges ?? {})]
    const helper = candidates.find(candidate => candidate && candidate.prompt !== question.prompt)
    return helper ? { host: question, helper } : null
  }
  function validPair(db: Db, session: StoryHelpSession) {
    const s = db.social
    return Boolean(s && s.players[session.host] && s.players[session.to] && kit.areFriends(s, session.host, session.to)
      && !ctx.checks.blocked?.(session.host, session.to))
  }
  function liveSession(db: Db, caller: string, id: unknown): StoryHelpSession | null {
    const session = peekStoryHelp(db)?.sessions[uuid(id)]
    return session && (caller === session.host || caller === session.to) && session.expires > ctx.now()
      && (session.phase === 'offered' || session.phase === 'active') && validPair(db, session) ? session : null
  }
  function pairedLives(db: Db, session: StoryHelpSession) {
    const host = byId(db, session.host), helper = byId(db, session.to)
    if (!host || !helper) return null
    const a = life(host), b = life(helper)
    if (a.story.mode !== 'story' || a.estate.city !== session.city || a.location !== session.venue || a.activeAction
      || b.story.helper?.session !== session.id || b.story.helper.until <= ctx.now() || b.estate.city !== session.city || b.location !== session.venue) return null
    return { host, helper, a, b }
  }
  function complete(db: Db, session: StoryHelpSession): StoryReply {
    const pair = pairedLives(db, session)
    if (!pair) return no('help_session_changed', 'Both friends must still be at the challenge on the active help pass.')
    const completedAt = Math.min(pair.a.t, pair.b.t)
    const reward = session.proof.kind === 'errand' ? session.proof.rewardId : null
    const host = ctx.act(pair.a, { type: 'story.roots.reward', cityId: session.city, payload: { id: session.id, city: session.city, kind: session.proof.kind, completedAt, ...(reward ? { missionRewardId: reward } : {}) }, stateGuard: 'story help session is completed once in this same transaction' })
    const helper = ctx.act(pair.b, { type: 'story.help.reward', cityId: session.city, payload: { id: session.id, city: session.city, completedAt }, stateGuard: 'story help session is completed once in this same transaction' })
    if (!host.ok || !helper.ok) throw ctx.fail(409, 'help_reward_unavailable')
    for (const [state, other] of [[pair.a, session.to], [pair.b, session.host]] as const) ctx.act(state, { type: 'social.server', cityId: session.city,
      payload: { op: 'interact', id: other, action: 'gist' }, stateGuard: 'story help completed once and social daily limits still apply' })
    session.phase = 'completed'
    ctx.act(pair.b, { type: 'story.help.leave', cityId: session.city, payload: { session: session.id }, stateGuard: 'completed story help pass is revoked in the same transaction' })
    gistService(ctx).add(db, { city: session.city, kind: 'other', text: '{0} helped {1} finish a Roots challenge', people: [{ id: session.to, name: pair.helper.name }, { id: session.host, name: pair.host.name }], minors: 'anon', refs: { key: session.id } })
    return yes('help_completed', { id: session.id })
  }

  async function prepare(request: RouteRequest, body: Record<string, unknown> = {}): Promise<void> {
    const targets = await ctx.store.read(db => {
      const own = request.requireSession(db), session = typeof body.id === 'string' ? peekStoryHelp(db)?.sessions[body.id] : undefined
      const ids = [session?.host, session?.to, body.to].filter((id): id is string => typeof id === 'string' && UUID_PATTERN.test(id))
      return { own, other: ids.flatMap(id => byId(db, id) ?? []), city: session?.city }
    })
    await Promise.all([targets.own, ...targets.other].map(session => prepareStoredCityContent(ctx, session, [targets.city])))
  }

  function list(db: Db, caller: SessionRecord) {
    const { s, p, id } = kit.enter(db, caller), state = life(caller), book = peekStoryHelp(db)
    if (!enabled()) return { ok: true as const, enabled: false, remainingCalls: 0, challenge: null, friends: [], sessions: [] }
    const episode = episodeById(`place-${state.estate.city}-country-story`), chapter = chapterOf(state, state.estate.city)
    const canCall = Boolean(episode && state.story.mode === 'story' && chapter >= 3 && !state.story.helper && !state.activeAction && state.location === episode.location.venue)
    const challenge = episode ? { episodeId: episode.id, venue: episode.location.venue, canCall,
      reason: canCall ? null : chapter < 3 ? 'Reach Roots to call a friend. The solo path needs two extra local missions.' : `Go to ${episode.location.venue} in Story mode to start this challenge.` } : null
    const calls = book?.calls[id]
    const sessions = Object.values(book?.sessions ?? {}).filter(row => (row.host === id || row.to === id) && row.expires + 60_000 > ctx.now() && validPair(db, row)).map(row => {
      const host = byId(db, row.host), hostLife = host ? life(host) : null
      const role = row.host === id ? 'host' as const : 'helper' as const
      const qs = hostLife ? questions(row, hostLife) : null, q = qs?.[role]
      const table = row.proof.kind === 'two-seat' ? row.proof : null
      const helper = byId(db, row.to), helperLife = helper ? life(helper) : null
      const errand = row.proof.kind === 'errand' ? row.proof : null
      const grant = errand && helperLife ? helperLife.missions.grants.find(g => g.cityId === row.city && g.earnedAt >= (row.joinedAt ?? Infinity) && !errand.before.includes(g.rewardId) && missionCatalogues.authoredIds.has(g.id)) : null
      return { id: row.id, host: kit.pub(s, row.host), helper: kit.pub(s, row.to), city: row.city, cityName: cityName(row.city) ?? row.city, venue: row.venue,
        label: 'Roots challenge', kind: row.proof.kind, status: row.expires <= ctx.now() ? 'expired' as const : row.phase, expiresAt: row.expires, role, joined: row.phase !== 'offered',
        question: row.proof.kind === 'second-answer' && q ? { prompt: q.prompt, options: q.options.map(({ id, label }) => ({ id, label })), answered: row.proof[role] } : null,
        table: table ? { cards: table.board.map((n, i) => table.found.includes(i) || table.last.includes(i) ? n : null), turn: table.turn, team: table.team, house: table.house, played: { ...table.played }, last: [...table.last], result: table.result } : null,
        errand: row.proof.kind === 'errand' ? { mission: (grant ? missionCatalogues.byId.get(grant.id)?.label : null) ?? 'Finish and claim one authored local mission in this city.', rewardId: grant?.rewardId ?? null } : null }
    })
    return { ok: true as const, enabled: true, remainingCalls: Math.max(0, STORY_CALLS_PER_DAY - (calls?.day === Math.floor(ctx.now() / DAY) ? calls.count : 0)), challenge,
      friends: Object.keys(p.friends).filter(other => kit.areFriends(s, id, other) && !ctx.checks.blocked?.(id, other)).map(other => kit.pub(s, other)), sessions }
  }

  function perform(db: Db, caller: SessionRecord, op: 'call' | 'join' | 'answer' | 'seat' | 'errand' | 'end', body: Record<string, unknown>) {
    ctx.onceId(body.clientId)
    const push: PushList = []
    let job: PingJob | null = null
    const { s, p, id } = kit.enter(db, caller)
    const reply = ctx.once(db, caller, { id: body.clientId, kind: `story-help-${op}`, fingerprint: [op, body.id ?? null, body.to ?? null, body.kind ?? null, body.episodeId ?? null, body.answer ?? null, body.cards ?? null, body.rewardId ?? null, body.restart ?? null] }, () => {
      if (!enabled() && op !== 'end') return no('story_disabled', 'Story help is not available right now.')
      if (!ctx.allow(`story-help:${id}`, 60)) return no('rate_limited', 'Wait a moment before trying again.')
      if (op === 'call') {
        const to = uuid(body.to), state = life(caller), now = ctx.now(), day = Math.floor(now / DAY)
        if (body.chapter !== 3 || !kindOf(body.kind) || typeof body.episodeId !== 'string') throw ctx.fail(400, 'invalid_help_challenge')
        const episode = episodeById(body.episodeId)
        if (!episode || episode.id !== `place-${state.estate.city}-country-story` || state.story.mode !== 'story' || chapterOf(state, state.estate.city) < 3 || state.story.helper || state.activeAction || state.location !== episode.location.venue) return no('challenge_unavailable', 'Reach Roots and stand at the country tale venue in Story mode.')
        if (to === id || !s.players[to] || !kit.areFriends(s, id, to) || ctx.checks.blocked?.(id, to)) return no('friends_only', 'Call one of your current friends.')
        const muted = ctx.checks.muted?.(id)
        if (muted) return no(muted.code, muted.reason)
        const book = openBook(db, now), calls = book.calls[id]
        if (calls?.day === day && calls.count >= STORY_CALLS_PER_DAY) return no('help_call_limit', 'You have called friends three times today. Try the solo path or call tomorrow.')
        if (Object.values(book.sessions).some(row => row.host === id && row.expires > now && (row.phase === 'offered' || row.phase === 'active'))) return no('help_already_open', 'End your current help call before starting another.')
        if (Object.keys(book.sessions).length >= MAX_SESSIONS) return no('help_busy', 'Story help is busy. Try again shortly.')
        const helpId = ctx.randomId()
        book.calls[id] = { day, count: calls?.day === day ? calls.count + 1 : 1 }
        book.sessions[helpId] = { id: helpId, host: id, to, city: state.estate.city as CityId, venue: episode.location.venue, episodeId: episode.id,
          at: now, expires: now + STORY_HELP_MS, joinedAt: null, phase: 'offered', proof: helpProof(body.kind, helpId) }
        kit.notify(s, to, 'visit', `${p.name} is calling for help with a Roots challenge in ${cityName(state.estate.city) ?? state.estate.city}.`, { from: id, storyHelp: helpId }, push)
        job = mailer.claim(db, growthOf(ctx, db), { from: id, fromName: p.name, to, place: `at a Roots challenge in ${cityName(state.estate.city) ?? state.estate.city}`, link: `/?storyHelp=${helpId}`, online: ctx.online(to) })
        return yes('help_called', { id: helpId })
      }
      if (op === 'end') {
        const session = peekStoryHelp(db)?.sessions[uuid(body.id)]
        if (!session || (session.host !== id && session.to !== id)) return no('help_session_expired', 'That help session is not shared with you.')
        const helper = byId(db, session.to)
        if (helper) { const state = life(helper); if (state.story.helper?.session === session.id) ctx.act(state, { type: 'story.help.leave', cityId: state.estate.city as CityId, payload: { session: session.id }, stateGuard: 'story help pass is revoked and session ends atomically' }) }
        session.phase = 'ended'
        return yes('help_ended', { id: session.id })
      }
      const session = liveSession(db, id, body.id)
      if (!session) return no('help_session_expired', 'That help session has ended, expired or is no longer shared with you.')
      if (op === 'join') {
        if (id !== session.to) return no('invited_friend_only', 'Only the invited friend can take this help pass.')
        const host = byId(db, session.host), hostLife = host ? life(host) : null
        if (!hostLife || hostLife.estate.city !== session.city || hostLife.location !== session.venue || hostLife.activeAction || hostLife.story.mode !== 'story') return no('host_left', 'Your friend has left the challenge. Ask them to call again.')
        const state = life(caller)
        if (state.story.helper?.session === session.id) return yes('help_joined', { id: session.id })
        const before = state.missions.grants.map(g => g.rewardId)
        const done = ctx.act(state, { type: 'story.help.enter', cityId: state.estate.city as CityId, payload: { session: session.id, host: session.host, kind: session.proof.kind, city: session.city, venue: session.venue, until: session.expires }, stateGuard: 'one invited friend claims this story help pass in this transaction' })
        if (!done.ok) return no(done.code, done.reason ?? 'You cannot join right now.')
        session.phase = 'active'; session.joinedAt = ctx.now()
        if (session.proof.kind === 'errand') session.proof.before = before
        return yes('help_joined', { id: session.id })
      }
      const pair = session.phase === 'active' ? pairedLives(db, session) : null
      if (!pair) return no('help_session_changed', 'Both friends must join the active challenge before answering.')
      const role = id === session.host ? 'host' as const : 'helper' as const
      if (op === 'answer') {
        if (session.proof.kind !== 'second-answer') return no('wrong_help_kind', 'This challenge uses another kind of help.')
        const q = questions(session, pair.a)?.[role]
        if (!q || typeof body.answer !== 'string' || !q.options.some(option => option.id === body.answer)) throw ctx.fail(400, 'invalid_answer')
        if (body.answer !== q.correct) return yes('try_again', { id: session.id })
        session.proof[role] = true
        return session.proof.host && session.proof.helper ? complete(db, session) : yes('answer_recorded', { id: session.id })
      }
      if (op === 'seat') {
        if (session.proof.kind !== 'two-seat') return no('wrong_help_kind', 'This challenge uses another kind of help.')
        if (body.restart === true) {
          if (session.proof.result !== 'lost') return no('table_running', 'Finish the current table round first.')
          session.proof = helpProof('two-seat', ctx.randomId())
          return yes('table_restarted', { id: session.id })
        }
        const result = playHelpTable(session.proof, role, body.cards)
        if (!result.ok) return no(result.code, 'Choose two unmatched cards on your own turn.')
        return result.won ? complete(db, session) : yes(result.code, { id: session.id })
      }
      if (session.proof.kind !== 'errand' || role !== 'helper') return no('wrong_help_kind', 'The invited helper completes this errand.')
      const proof = session.proof
      const grant = pair.b.missions.grants.find(g => g.rewardId === body.rewardId && g.cityId === session.city && g.earnedAt >= (session.joinedAt ?? Infinity)
        && !proof.before.includes(g.rewardId) && missionCatalogues.authoredIds.has(g.id))
      if (!grant) return no('errand_not_verified', 'Finish and claim a new authored local mission in this city first.')
      proof.rewardId = grant.rewardId
      return complete(db, session)
    })
    return { reply, push, job: reply.ok && !Reflect.get(reply, 'duplicate') ? job : null }
  }
  return { prepare, list, perform, send: (job: PingJob) => mailer.send(job) }
}
