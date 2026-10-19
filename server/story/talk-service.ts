import { cachedCityContent, cityName, cityRules } from '../../src/game/cities/registry.ts'
import { openingInfo } from '../../src/game/clock.ts'
import { sha256Hex } from '../../src/game/util.ts'
import { venueOpen } from '../../src/story/ladder.ts'
import { characterCity } from '../character.ts'
import { gatewayUser } from '../companion/service.ts'
import { routerOf } from '../models/service.ts'
import { transactWithCityContent } from '../prepared-city-transaction.ts'
import type { Db, RouteContext, RouteRequest } from '../types.ts'
import { createTalkBankReader } from './talk-banks.ts'
import type { TalkAssetReader } from './talk-banks.ts'
import { createTalkCore, talkAttemptKey } from './talk-core.ts'
import { talkFitsBudget } from './talk-budget.ts'
import type { TalkAuthority, TalkRequest } from './talk-core.ts'
import type { TalkHistoryLine, StoryTalkRegular, StoryTalkTurn, StoryTalkView } from '../../src/types/story-talk.ts'

export type { StoryTalkRegular, StoryTalkTurn, StoryTalkView } from '../../src/types/story-talk.ts'

const ZERO = { kind: 'zero', routerCalls: 0, costMicro: 0 } as const
const readers = new WeakMap<RouteContext, ReturnType<typeof createTalkBankReader>>()
const services = new WeakMap<RouteContext, ReturnType<typeof build>>()

type Place = Extract<StoryTalkView, { enabled: true }>
interface Capture {
  view: Place
  actorId: string
  characterKey: string
  playerKey: string
  country: string | null
  availability: TalkAuthority['venue']['availability']
}

/** The host supplies bundled static assets; requests never choose the reader or its paths. */
export function installStoryTalkAssets(ctx: RouteContext, read: TalkAssetReader): void {
  readers.set(ctx, createTalkBankReader(read))
  services.get(ctx)?.invalidateGeneration()
}

export function forgetStoryTalk(ctx: RouteContext, actorIds: Iterable<string>): void {
  services.get(ctx)?.forgetActors([...actorIds])
}

export function storyTalk(ctx: RouteContext) {
  const found = services.get(ctx)
  if (found) return found
  const service = build(ctx)
  services.set(ctx, service)
  return service
}

function requestOf(ctx: RouteContext, body: Record<string, unknown>): TalkRequest & { npc: string } {
  if (Object.keys(body).some(key => !['npc', 'clientId', 'question', 'history'].includes(key))
    || typeof body.npc !== 'string' || !body.npc || body.npc.length > 200
    || typeof body.clientId !== 'string' || typeof body.question !== 'string' || !body.question.trim()
    || body.question.length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(body.question)) throw ctx.fail(400, 'invalid_talk_request')
  ctx.onceId(body.clientId)
  const history: TalkHistoryLine[] = []
  if (body.history !== undefined) {
    if (!Array.isArray(body.history) || body.history.length > 4) throw ctx.fail(400, 'invalid_talk_history')
    for (const line of body.history) {
      if (!line || typeof line !== 'object' || Array.isArray(line) || Object.keys(line).length !== 2
        || !('from' in line) || !('text' in line) || line.from !== 'player' && line.from !== 'npc'
        || typeof line.text !== 'string' || line.text.length > 240) throw ctx.fail(400, 'invalid_talk_history')
      history.push({ from: line.from, text: line.text })
    }
  }
  return { npc: body.npc, clientId: body.clientId, question: body.question.trim(), history }
}

function samePlace(left: Capture, right: Capture, npc: string): boolean {
  const a = left.view.regulars.find(row => row.id === npc), b = right.view.regulars.find(row => row.id === npc)
  return left.actorId === right.actorId && left.characterKey === right.characterKey && left.view.city.id === right.view.city.id
    && left.view.venue.id === right.view.venue.id && left.view.venue.name === right.view.venue.name
    && right.view.available && Boolean(a && b && a.name === b.name && a.role === b.role)
}

function build(ctx: RouteContext) {
  const core = createTalkCore({
    ready: async () => { await Promise.all(ctx.startup); await routerOf(ctx).ready() },
    canAsk: input => talkFitsBudget(input, routerOf(ctx), name => typeof ctx.env === 'function' ? ctx.env(name) : ''),
    now: () => ctx.now(), ask: input => routerOf(ctx).ask(input), validateClientId: id => { ctx.onceId(id); return true },
  })

  function capture(db: Db, request: RouteRequest): Capture | Extract<StoryTalkView, { enabled: false }> {
    const session = request.requireSession(db, { renew: true })
    if (ctx.checks.setting?.('storyMode') !== true) return { ok: true, enabled: false, reason: 'City conversations are unavailable right now.' }
    const city = characterCity(session)
    if (!city) throw ctx.fail(409, 'character_required')
    const state = ctx.settle(session, city), content = cachedCityContent(city), character = session.cities[city]
    if (!content || !character) throw ctx.fail(503, 'city_content_unavailable')
    const venue = content.venues.find(row => row.id === state.location)
    if (!venue) throw ctx.fail(409, 'talk_venue_unavailable')
    const hours = openingInfo(venue.hours, ctx.now())
    const regulars: StoryTalkRegular[] = content.regulars.filter(row => row.venueId === venue.id).map(row => ({ id: row.id, name: row.definition.name, role: row.definition.role, ai: true }))
    const reason = state.activeAction ? 'Finish or cancel your current action before talking here.'
      : venueOpen(state, city, venue.id) ? 'This venue is locked on your Story Path.'
      : !hours.open ? 'This venue is closed in the game right now.'
      : regulars.length === 0 ? 'There is no city regular to talk with here.' : null
    return {
      actorId: session.publicId, characterKey: sha256Hex(character.salt), playerKey: gatewayUser(session.publicId), country: cityRules(city)?.country.id ?? null,
      availability: { kind: 'opening-info', value: hours },
      view: { ok: true, enabled: true, city: { id: city, name: cityName(city) ?? city }, venue: { id: venue.id, name: venue.name, status: `In the game: ${hours.status}` }, regulars, available: reason === null, reason },
    }
  }

  const current = (request: RouteRequest) => transactWithCityContent(ctx, request, [], db => capture(db, request), { waitForObserved: true })

  async function view(request: RouteRequest): Promise<StoryTalkView> {
    const value = await current(request)
    if (!('view' in value)) return value
    const banks = readers.get(ctx)
    if (!value.view.available || !banks) return value.view
    let regulars = value.view.regulars
    try {
      const reference = await banks.reference(value.view.city.id)
      regulars = await Promise.all(regulars.map(async regular => {
        const { bank } = await banks.load(reference, regular.id, value.view.venue.id)
        return { ...regular, ambient: bank.ambient.slice(0, 8) }
      }))
    } catch { /* The metadata remains usable while a bank is being recovered. */ }
    const after = await current(request)
    if (!('view' in after)) return after
    if (readers.get(ctx) !== banks || value.view.regulars.some(regular => !samePlace(value, after, regular.id))) return after.view
    return { ...after.view, regulars }
  }

  async function turn(request: RouteRequest): Promise<StoryTalkTurn> {
    const initial = await current(request)
    if (!('view' in initial)) return { ok: false, code: 'unavailable', reason: initial.reason, accounting: ZERO }
    const body = requestOf(ctx, await request.json(8_192))
    if (!initial.view.available || !initial.view.regulars.some(row => row.id === body.npc)) return { ok: false, code: 'unavailable', reason: initial.view.reason ?? 'That regular is not at your current venue.', accounting: ZERO }
    if (!ctx.allow(`story:talk:${initial.actorId}`, 24)) throw ctx.fail(429, 'rate_limited')
    const banks = readers.get(ctx)
    if (!banks) return { ok: false, code: 'bank-unavailable', reason: 'City conversations are loading. Please retry.', accounting: ZERO }
    let reference: Awaited<ReturnType<typeof banks.reference>>
    try { reference = await banks.reference(initial.view.city.id) }
    catch { return { ok: false, code: 'bank-unavailable', reason: 'City conversations are loading. Please retry.', accounting: ZERO } }
    const before = await current(request)
    if (!('view' in before) || readers.get(ctx) !== banks || !samePlace(initial, before, body.npc)) return { ok: false, code: 'place-changed', reason: 'Your location changed. Choose someone at your current venue.', accounting: ZERO }
    const regular = before.view.regulars.find(row => row.id === body.npc)
    if (!regular) throw ctx.fail(409, 'talk_regular_unavailable')
    const authority: TalkAuthority = {
      actorId: before.actorId, characterKey: before.characterKey, playerKey: before.playerKey,
      city: { ...before.view.city, country: before.country },
      venue: { id: before.view.venue.id, name: before.view.venue.name, availability: before.availability }, regular,
      bank: { revision: reference.sha256, load: () => banks.load(reference, regular.id, before.view.venue.id) },
      stillAuthorized: async () => {
        const latest = await current(request)
        return 'view' in latest && readers.get(ctx) === banks && samePlace(before, latest, regular.id)
      },
      admitAttempt: async attempt => {
        const fingerprint = sha256Hex(talkAttemptKey(authority, attempt))
        const admission = await transactWithCityContent(ctx, request, [], db => {
          const latest = capture(db, request)
          if (!('view' in latest) || readers.get(ctx) !== banks || !samePlace(before, latest, regular.id)) return { ok: false as const }
          const session = request.requireSession(db, { renew: false })
          return ctx.once(db, session, { id: attempt.clientId, kind: 'story.talk.attempt', fingerprint }, () => ({ ok: true as const }))
        }, { durable: true, waitForObserved: true })
        return !admission.ok ? 'unauthorized' : 'duplicate' in admission ? 'duplicate' : 'fresh'
      },
    }
    const result = await core.talk(authority, body)
    const after = await current(request)
    if (!('view' in after) || readers.get(ctx) !== banks || !samePlace(before, after, body.npc)) return { ok: false, code: 'place-changed', reason: 'Your location changed. This reply was not delivered.', accounting: result.accounting }
    return { ok: true, city: before.view.city.id, venue: before.view.venue.id, npc: regular.id, result }
  }

  return { view, turn, forgetActors: core.forgetActors, invalidateGeneration: core.invalidateGeneration }
}
