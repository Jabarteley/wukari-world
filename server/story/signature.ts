import { characterCity } from '../character.ts'
import { cachedCityContent } from '../../src/game/cities/registry.ts'
import { chapterOf } from '../../src/story/ladder.ts'
import { signatureFor } from '../../src/story/signatures.ts'
import { HAGGLE, decide, freshTalk, priceList } from '../house/haggle.ts'
import { openBook, peekStoryHelp } from './coop.ts'
import type { PricedItem, Talk, Verdict } from '../house/haggle.ts'
import type { CityId } from '../../src/types/protocol.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

const MAX_OFFER = 1_000_000_000

export interface StorySignatureView {
  ok: true
  enabled: boolean
  available: boolean
  reason: string | null
  city: CityId
  venue: string | null
  label: string
  item: { label: string; list: number; ask: number; rounds: number; deal: number | null } | null
  code?: 'offer_checked' | 'bargain_restarted'
  verdict?: { kind: Verdict['kind']; price: number }
  duplicate?: true
}

type Access = {
  city: CityId
  venue: string | null
  label: string
  item: PricedItem | null
  available: boolean
  reason: string | null
}

const refusal = (code: string, reason: string) => ({ ok: false as const, code, reason })

function practiceItem(city: CityId, venue: string, venueLabel: string): PricedItem {
  let hash = 2166136261
  for (const char of `${city}:${venue}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0
  const base = 1_500 + hash % 101 * 10
  const label = city === 'kano' && venue === 'kurmi-market' ? 'Kurmi leather-and-craft practice basket' : `${venueLabel} practice basket`
  return priceList([{ id: `story-signature:${city}:${venue}`, label, base, floorShare: 0.85 }], 15)[0]!
}

function validTalk(value: unknown, item: PricedItem): value is Talk & { city: CityId; at: number } {
  if (!value || typeof value !== 'object') return false
  const row = value as Record<string, unknown>
  return typeof row.city === 'string' && Number.isSafeInteger(row.at) && typeof row.ask === 'number' && Number.isSafeInteger(row.ask)
    && row.ask >= item.floor && row.ask <= item.list && typeof row.rounds === 'number' && Number.isSafeInteger(row.rounds)
    && row.rounds >= 0 && row.rounds <= HAGGLE.rounds && (row.deal === null || typeof row.deal === 'number' && Number.isSafeInteger(row.deal) && row.deal >= item.floor && row.deal <= item.list)
}

export function storySignature(ctx: RouteContext) {
  const enabled = () => ctx.checks.setting?.('storyMode') === true

  function access(session: SessionRecord): Access {
    const city = characterCity(session)
    if (!city) throw ctx.fail(409, 'character_required')
    const state = ctx.settle(session, city), content = cachedCityContent(city), signature = signatureFor(city, content)
    const venue = signature.venue, venueLabel = venue ? content?.venues.find(row => row.id === venue)?.name ?? venue : ''
    const item = signature.kind === 'haggle' && venue ? practiceItem(city, venue, venueLabel) : null
    let reason: string | null = null
    if (!enabled()) reason = 'City signature games are unavailable right now.'
    else if (signature.kind !== 'haggle' || !venue || !item) reason = 'This city signature opens in its existing game.'
    else if (state.story.helper) reason = 'Finish or leave the help session before bargaining.'
    else if (state.activeAction) reason = 'Finish or cancel the current action before bargaining.'
    else if (state.location !== venue) reason = `Go to ${venueLabel || venue} to bargain.`
    else if (state.story.mode === 'story' && chapterOf(state, city) < 2) reason = 'Reach Chapter 2 in this city to open its signature challenge.'
    return { city, venue, label: signature.label, item, available: reason === null, reason }
  }

  function projection(db: Db, session: SessionRecord, current = access(session), extra: Pick<StorySignatureView, 'code' | 'verdict'> = {}): StorySignatureView {
    const saved = current.item ? peekStoryHelp(db)?.bargains?.[session.publicId] : undefined
    const talk = current.item && saved?.city === current.city && validTalk(saved, current.item) ? saved : current.item ? freshTalk(current.item) : null
    return {
      ok: true,
      enabled: enabled(),
      available: current.available,
      reason: current.reason,
      city: current.city,
      venue: current.venue,
      label: current.label,
      item: current.item && talk ? { label: current.item.label, list: current.item.list, ask: talk.ask, rounds: talk.rounds, deal: talk.deal } : null,
      ...extra,
    }
  }

  function view(db: Db, session: SessionRecord): StorySignatureView {
    return projection(db, session)
  }

  function perform(db: Db, session: SessionRecord, body: Record<string, unknown>) {
    ctx.onceId(body.clientId)
    return ctx.once(db, session, { id: body.clientId, kind: 'story-signature', fingerprint: [body.offer ?? null, body.reset === true] }, () => {
      const current = access(session)
      if (!current.available || !current.item) return refusal(enabled() ? 'signature_unavailable' : 'story_disabled', current.reason ?? 'That signature challenge is unavailable.')
      if (!ctx.allow(`story-signature:${session.publicId}`, 30, 60_000)) return refusal('rate_limited', 'Wait a moment before making another offer.')
      const book = openBook(db, ctx.now()), bargains = book.bargains ??= {}
      if (body.reset === true) {
        const fresh = freshTalk(current.item)
        bargains[session.publicId] = { city: current.city, at: ctx.now(), ...fresh }
        return projection(db, session, current, { code: 'bargain_restarted' })
      }
      if (!Number.isSafeInteger(body.offer) || typeof body.offer !== 'number' || body.offer < 0 || body.offer > MAX_OFFER) throw ctx.fail(400, 'invalid_offer')
      const saved = bargains[session.publicId]
      const talk = saved?.city === current.city && validTalk(saved, current.item) ? saved : { city: current.city, at: ctx.now(), ...freshTalk(current.item) }
      const verdict = decide(current.item, talk, body.offer)
      bargains[session.publicId] = { city: current.city, at: ctx.now(), ask: talk.ask, rounds: talk.rounds, deal: talk.deal }
      return projection(db, session, current, { code: 'offer_checked', verdict })
    })
  }

  return { view, perform }
}
