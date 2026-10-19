/**
 * OWNER: social
 * ALLWORLD FOR BUSINESS (docs/PROMOTE.md). Listings are free; boosts are paid weeks of a Sponsored card in the feed.
 *
 *   LISTING  an adult with an account lists a business or service in the city their character lives in: a name, a category, an area
 *            label, a description and a photo (from the feed's media store). The AI reviewer (server/feed/review.ts judge, with the
 *            advertising rules) reads it first; it goes live on "keep", is refused with the reason otherwise, and stays "review" when no
 *            model could answer (tried again on the heartbeat, then left for an admin).
 *   ORDER    a boost or a spotlight for 1 to 8 weeks at the admin's prices (defaults ₦2,500 and ₦7,500 a week). Paid to ALLWORLD, never to
 *            a player: with the owner's Bachs key, a Bachs checkout page and a server-side verification of the amount; without it, a bank
 *            transfer to the details the admin set, confirmed by an admin. A refused or removed listing ends its boosts. Allworld never
 *            holds a player's money and nothing here pays a player.
 *   BOARDS    a live listing with a running boost or spotlight also fills a free billboard of its own city's map (GET /boards, name, kind
 *            and photo only, rotating, nightlife and alcohol words kept off; a tap counts as an open from "board"), and every live
 *            listing stands in the city's business street (GET /street, shop fronts grouped by kind). No new price, no outside link.
 *   SPONSORED a live boosted listing of the viewer's city is put into the City tab (one card every few posts), a spotlight into every
 *            World tab; each is marked Sponsored and opens the business, never an outside link.
 * Stored (collection `promote`, keyed): listings[id] · orders[id] · owners[publicId] { listings[], orders[] } · cities[city] { listings[] }
 * · root { seq, refs: { [ref]: orderId } (open orders only), revenue }. Portable: no Node imports.
 */
import { BILLBOARD, CATEGORIES, PROMOTE, TIERS, boardSafe, categoryLabel, isCategory, priceOf } from '../../src/promote/model.ts'
import type { Category, ListingStatus, OrderStatus, Tier } from '../../src/promote/model.ts'
import type { ListingView, OrderView, PromoteMe } from '../../src/types/promote.ts'
import type { BoardListing, StreetView } from '../../src/types/neighbourhood.ts'
import { screenText } from '../moderation/text.ts'
import { cityName } from '../../src/game/cities/registry.ts'
import { accountOfSession } from '../admin/gate.ts'
import { characterCity } from '../character.ts'
import { peekShowcase } from '../showcase/data.ts'
import { peekFeed } from '../feed/data.ts'
import { bachsClient } from '../payments/bachs.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

export interface ListingRecord { id: string; owner: string; name: string; category: Category; city: string; area: string; about: string; photo?: string; at: number; status: ListingStatus; reason?: string; tries?: number; contacts?: number; /** Opens by where they started: a billboard, or the business street. */ via?: { board?: number; street?: number } }
export interface OrderRecord { id: string; listing: string; owner: string; tier: Tier; weeks: number; amount: number; city: string; at: number; status: OrderStatus; ref: string; email?: string; arcon?: string; by?: 'bachs' | 'bank' | 'admin'; checkout?: string; paidAt?: number; startsAt?: number; endsAt?: number; shown?: number; note?: string }
export interface PromoteCollection {
  seq: number; refs: Record<string, string>; revenue: { all: number; months: Record<string, number> }
  listings: Record<string, ListingRecord>; orders: Record<string, OrderRecord>
  owners: Record<string, { listings: string[]; orders: string[] }>; cities: Record<string, { listings: string[] }>
}
const MAPS = ['listings', 'orders', 'owners', 'cities'] as const
export const promoteOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): PromoteCollection => {
  const c = ctx.collection(db, 'promote', { seq: 0, refs: {}, revenue: { all: 0, months: {} }, listings: {}, orders: {}, owners: {}, cities: {} }) as unknown as PromoteCollection
  for (const k of MAPS) if (!c[k] || typeof c[k] !== 'object') (c as unknown as Record<string, unknown>)[k] = {}
  c.refs ??= {}; c.revenue ??= { all: 0, months: {} }; if (typeof c.seq !== 'number') c.seq = 0
  return c
}
export const peekPromote = (db: Db): PromoteCollection | undefined => (db as Record<string, unknown>)['promote'] as PromoteCollection | undefined
type No = { ok: false; code: string; reason: string }
const no = (code: string, reason: string): No => ({ ok: false, code, reason })
const clean = (v: unknown, max: number): string => (typeof v === 'string' ? v.normalize('NFC').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '')
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i
const WEEK = 7 * 86400000

export function promoteService(ctx: RouteContext) {
  const now = (): number => ctx.now()
  const setting = (key: string) => ctx.checks?.setting?.(key)
  const text = (key: string): string => ctx.checks?.text?.(key) ?? ''
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  const blocked = (a: string, b: string): boolean => a !== b && ctx.checks?.blocked?.(a, b) === true
  const prices = (): Record<Tier, number> => ({ boost: Number(setting('promoteBoostPrice')) || TIERS.boost.price, spotlight: Number(setting('promoteSpotlightPrice')) || TIERS.spotlight.price })
  const pay = bachsClient(ctx)
  const payment = (): 'bachs' | 'bank' | 'closed' => (pay.on() ? 'bachs' : text('promoteBankDetails').trim() ? 'bank' : 'closed')
  const nameOf = (db: Db, id: string): string => (db as unknown as { social?: { players?: Record<string, { name?: string }> } }).social?.players?.[id]?.name ?? 'Business owner'
  const person = (db: Db, id: string) => { const a = peekFeed(db)?.authors[id]; return { id, name: nameOf(db, id), ...(a?.handle ? { handle: a.handle } : {}), ...(a?.portrait ? { portrait: a.portrait.hash } : {}) } }
  const boostOf = (c: PromoteCollection, listing: string, t: number): OrderRecord | undefined => (c.owners[c.listings[listing]?.owner ?? '']?.orders ?? []).map((o) => c.orders[o]).find((o): o is OrderRecord => Boolean(o) && o!.listing === listing && o!.status === 'paid' && (o!.startsAt ?? 0) <= t && (o!.endsAt ?? 0) > t)
  const shopOf = (db: Db, owner: string): string | undefined => { const s = peekShowcase(db), id = (s.owners as Record<string, unknown>)[owner]; return typeof id === 'string' && (s.shops as Record<string, { status?: string }>)[id]?.status === 'live' ? id : undefined }
  function listingView(db: Db, c: PromoteCollection, l: ListingRecord, viewer: string | null): ListingView {
    const mine = viewer === l.owner
    return { id: l.id, owner: person(db, l.owner), name: l.name, category: l.category, categoryLabel: categoryLabel(l.category), city: l.city, cityName: cityName(l.city) ?? l.city, area: l.area, about: l.about,
      ...(l.photo ? { photo: l.photo } : {}), at: l.at, status: l.status, ...(mine && l.reason ? { reason: l.reason } : {}), boosted: Boolean(boostOf(c, l.id, now())), ...(shopOf(db, l.owner) ? { shop: shopOf(db, l.owner)! } : {}), mine }
  }
  const orderView = (c: PromoteCollection, o: OrderRecord): OrderView => ({ id: o.id, listing: o.listing, listingName: c.listings[o.listing]?.name ?? '(removed)', tier: o.tier, weeks: o.weeks, amount: o.amount, city: o.city, status: o.status, at: o.at, ...(o.startsAt ? { startsAt: o.startsAt } : {}), ...(o.endsAt ? { endsAt: o.endsAt } : {}), ref: o.ref, ...(o.by ? { by: o.by } : {}) })

  function me(db: Db, session: SessionRecord): { ok: true } & PromoteMe {
    const c = peekPromote(db), id = session.publicId, mine = c?.owners[id]
    return { ok: true, listings: (mine?.listings ?? []).map((l) => c!.listings[l]).filter((l): l is ListingRecord => Boolean(l) && l!.status !== 'removed').map((l) => listingView(db, c!, l, id)),
      orders: (mine?.orders ?? []).map((o) => c!.orders[o]).filter((o): o is OrderRecord => Boolean(o)).reverse().slice(0, 20).map((o) => orderView(c!, o)),
      prices: prices(), payment: payment(), bank: payment() === 'bank' ? text('promoteBankDetails').slice(0, 300) : '', adult: adult(db, id), account: Boolean(accountOfSession(db, session)) }
  }
  function directory(db: Db, viewer: string | null, city: string, category: string | null): { ok: true; listings: ListingView[]; city: string } {
    const c = peekPromote(db)
    if (!c) return { ok: true, listings: [], city }
    const t = now()
    const live = (c.cities[city]?.listings ?? []).map((l) => c.listings[l]).filter((l): l is ListingRecord => Boolean(l) && l!.status === 'live' && (!category || l!.category === category) && !blocked(viewer ?? '', l!.owner))
    const ranked = live.map((l) => ({ l, boost: boostOf(c, l.id, t) ? 1 : 0 })).sort((a, b) => b.boost - a.boost || b.l.at - a.l.at).slice(0, PROMOTE.perPage)
    return { ok: true, listings: ranked.map(({ l }) => listingView(db, c, l, viewer)), city }
  }
  /** Create or edit a listing. A changed listing is reviewed again before it is live. Returns the listing and whether to review it. */
  function save(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; listing: ListingView; review: string | null } | No {
    const id = session.publicId
    if (!accountOfSession(db, session)) return no('account_required', 'Sign in to list a business, so it stays yours.')
    if (!adult(db, id)) return no('adults_only', 'Listing a business is for people confirmed as 18 or older.')
    const name = clean(body.name, PROMOTE.name), about = clean(body.about, PROMOTE.about), area = clean(body.area, PROMOTE.area)
    if (name.length < 2) return no('invalid_name', 'Give your business its name.')
    if (!isCategory(body.category)) return no('invalid_category', 'Choose what kind of business it is.')
    for (const [value, what] of [[name, 'The name'], [about, 'The description'], [area, 'The area']] as const) if (value) { const v = screenText(value, { what, contact: true }); if (v) return no(v.code, v.reason) }
    const city = characterCity(session) ?? ctx.cityIds[0] ?? 'lagos'
    const c = promoteOf(ctx, db), owner = (c.owners[id] ??= { listings: [], orders: [] })
    let photo: string | undefined
    if (typeof body.photo === 'string' && body.photo) {
      const a = peekFeed(db)?.authors[id], found = a?.media?.find((m) => m.hash === body.photo && m.use === 'post' && (m.type === 'jpeg' || m.type === 'png' || m.type === 'webp'))
      if (!found) return no('photo_gone', 'That photo was not found. Add it again.')
      photo = found.hash
    }
    let l = typeof body.id === 'string' ? c.listings[body.id] : undefined
    if (l && l.owner !== id) return no('unknown_listing', 'That listing is not yours.')
    if (!l) {
      if (owner.listings.filter((x) => c.listings[x] && c.listings[x]!.status !== 'removed').length >= PROMOTE.listingsPerOwner) return no('too_many', `You can list ${PROMOTE.listingsPerOwner} businesses.`)
      l = { id: `B${(++c.seq).toString(36)}${ctx.randomId().slice(0, 4)}`, owner: id, name, category: body.category, city, area, about, at: now(), status: 'review' }
      c.listings[l.id] = l; owner.listings.push(l.id)
      const list = (c.cities[city] ??= { listings: [] }).listings; list.push(l.id); if (list.length > 2000) list.splice(0, list.length - 2000)
    } else Object.assign(l, { name, category: body.category, area, about, status: 'review' as const, tries: 0 })
    if (photo) l.photo = photo; else if (body.photo === null) delete l.photo
    delete l.reason
    return { ok: true, listing: listingView(db, c, l, id), review: l.id }
  }
  function remove(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true } | No {
    const c = peekPromote(db), l = c && typeof body.id === 'string' ? c.listings[body.id] : undefined
    if (!c || !l || l.owner !== session.publicId) return no('unknown_listing', 'That listing is not there.')
    l.status = 'removed'
    return { ok: true }
  }
  /** The reviewer's answer for a listing in review. */
  function reviewed(db: Db, listing: string, verdict: { action: 'keep' | 'hide' | 'remove'; reason: string; category: string } | null): void {
    const c = peekPromote(db), l = c?.listings[listing]
    if (!c || !l || l.status !== 'review') return
    if (!verdict) { l.tries = (l.tries ?? 0) + 1; return }
    if (verdict.action === 'keep') { l.status = 'live'; delete l.reason }
    else { l.status = 'refused'; l.reason = verdict.reason || 'This business cannot be listed under our rules.'; endBoosts(c, l.id, 'refused') }
  }
  const endBoosts = (c: PromoteCollection, listing: string, note: string): void => { for (const o of c.owners[c.listings[listing]?.owner ?? '']?.orders ?? []) { const r = c.orders[o]; if (r?.listing === listing && (r.status === 'paid' || r.status === 'pending')) { if (r.status === 'paid' && (r.endsAt ?? 0) > now()) r.note = `stopped: ${note}`; r.status = r.status === 'paid' ? 'ended' : 'cancelled'; delete c.refs[r.ref] } } }
  /** A boost order, pending until it is paid. */
  function order(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; order: OrderView; email?: string } | No {
    const id = session.publicId, c = peekPromote(db), l = c && typeof body.listing === 'string' ? c.listings[body.listing] : undefined
    if (!c || !l || l.owner !== id) return no('unknown_listing', 'Choose one of your businesses.')
    if (l.status !== 'live') return no('not_live', 'Your business must be live in the directory before it can be boosted.')
    const tier = body.tier === 'boost' || body.tier === 'spotlight' ? body.tier : null
    if (!tier) return no('invalid_tier', 'Choose Boost or Spotlight.')
    const mode = payment()
    if (mode === 'closed') return no('payments_closed', 'Boosts open soon. Your listing is free and live meanwhile.')
    const email = clean(body.email, 254)
    if (mode === 'bachs' && !EMAIL.test(email)) return no('invalid_email', 'Give an e-mail address for the receipt.')
    const weeks = Math.max(1, Math.min(PROMOTE.weeksMax, Math.round(Number(body.weeks) || 1)))
    const owner = (c.owners[id] ??= { listings: [], orders: [] })
    if (owner.orders.map((o) => c.orders[o]).filter((o) => o?.status === 'pending').length >= 3) return no('too_many_pending', 'You have three orders waiting for payment. Pay or cancel one first.')
    const ref = `AW-${(++c.seq).toString(36).toUpperCase()}-${ctx.randomId().replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const o: OrderRecord = { id: `O${c.seq.toString(36)}`, listing: l.id, owner: id, tier, weeks, amount: priceOf(tier, weeks, prices()), city: l.city, at: now(), status: 'pending', ref, by: mode, ...(email && mode === 'bachs' ? { email } : {}), ...(clean(body.arcon, 60) ? { arcon: clean(body.arcon, 60) } : {}) }
    c.orders[o.id] = o; owner.orders.push(o.id); c.refs[ref] = o.id
    return { ok: true, order: orderView(c, o), ...(o.email ? { email: o.email } : {}) }
  }
  /** Mark an order paid (a verified checkout, or an admin who saw the transfer): it runs from now, or after the listing's running boost. */
  function markPaid(db: Db, orderId: string, by: 'bachs' | 'bank' | 'admin', amount?: number): { ok: true; order: OrderView } | No {
    const c = peekPromote(db), o = c?.orders[orderId]
    if (!c || !o) return no('unknown_order', 'That order was not found.')
    if (o.status === 'paid' || o.status === 'ended') return { ok: true, order: orderView(c, o) }
    if (o.status !== 'pending') return no('order_closed', 'That order was cancelled.')
    if (amount !== undefined && amount < o.amount) return no('amount_mismatch', 'The payment does not match the order.')
    const t = now(), running = boostOf(c, o.listing, t)
    o.status = 'paid'; o.by = by; o.paidAt = t; o.startsAt = Math.max(t, running?.endsAt ?? 0); o.endsAt = o.startsAt + o.weeks * WEEK
    delete c.refs[o.ref]
    c.revenue.all += o.amount
    const month = new Date(t).toISOString().slice(0, 7); c.revenue.months[month] = (c.revenue.months[month] ?? 0) + o.amount
    return { ok: true, order: orderView(c, o) }
  }
  const orderByRef = (db: Db, ref: unknown): OrderRecord | undefined => { const c = peekPromote(db); const id = typeof ref === 'string' ? c?.refs[ref] : undefined; return id ? c?.orders[id] : undefined }
  /** One of a person's own orders by its reference, open or not (the buyer may come back after the heartbeat started the boost). */
  const ownOrder = (db: Db, owner: string, ref: unknown): OrderRecord | undefined => { const c = peekPromote(db); return typeof ref === 'string' && c ? (c.owners[owner]?.orders ?? []).map((o) => c.orders[o]).find((o) => o?.ref === ref) : undefined }
  const viewOf = (db: Db, o: OrderRecord): { ok: true; order: OrderView } => ({ ok: true, order: orderView(peekPromote(db)!, o) })
  /** Bachs: a hosted checkout for a pending order, keyed by its reference so a retry opens the same one. */
  const checkout = (o: { ref: string; amount: number; email: string; name: string }, origin: string) => pay.checkout({ ...o, back: `${origin}/?promote=${encodeURIComponent(o.ref)}`, source: 'allworld_promote' })
  const keepCheckout = (db: Db, orderId: string, id: string): void => { const o = peekPromote(db)?.orders[orderId]; if (o && o.status === 'pending') o.checkout = id }
  /** Bachs: what it says about an order's checkout and its payment, asked by the server and never taken from the browser. */
  const verify = (o: { ref: string; checkout?: string }) => pay.verify(o)
  /** Heartbeat: card orders opened in the last two days and still waiting, so a boost starts even when the buyer never came back. */
  const awaiting = (db: Db): OrderRecord[] => Object.values(peekPromote(db)?.orders ?? {}).filter((o) => o.status === 'pending' && o.by === 'bachs' && o.checkout && now() - o.at < 2 * 86400000).sort((a, b) => b.at - a.at).slice(0, 5)
  /** Sponsored cards for a feed page: up to two live boosts of the city (or spotlights everywhere), rotating, counted as shown. */
  function sponsored(db: Db, viewer: string | null, city: string, world: boolean): (ListingView & { order: string })[] {
    const c = peekPromote(db)
    if (!c) return []
    const t = now(), out: (ListingView & { order: string })[] = []
    const candidates = world ? Object.keys(c.cities).flatMap((k) => c.cities[k]!.listings) : (c.cities[city]?.listings ?? [])
    const seen = new Set<string>()
    for (const id of candidates) {
      const l = c.listings[id]
      if (!l || l.status !== 'live' || seen.has(id) || blocked(viewer ?? '', l.owner)) continue
      const o = boostOf(c, id, t)
      if (!o || (world && o.tier !== 'spotlight')) continue
      seen.add(id); out.push({ ...listingView(db, c, l, viewer), order: o.id })
    }
    // Rotate by the minute so different businesses take turns at the top.
    const shift = out.length ? Math.floor(t / 60000) % out.length : 0
    return [...out.slice(shift), ...out.slice(0, shift)].slice(0, 2)
  }
  function noteShown(db: Db, orders: readonly string[]): void { const c = peekPromote(db); for (const id of orders) { const o = c?.orders[id]; if (o) o.shown = (o.shown ?? 0) + 1 } }
  function contact(db: Db, listing: unknown, via?: unknown): { ok: true } {
    const l = typeof listing === 'string' ? peekPromote(db)?.listings[listing] : undefined
    if (!l) return { ok: true }
    // A tap on a billboard is counted as a tap; opening the business (a message, its shop) is a contact, and says if it began in the street.
    if (via === 'board') { l.via ??= {}; l.via.board = (l.via.board ?? 0) + 1; return { ok: true } }
    l.contacts = (l.contacts ?? 0) + 1
    if (via === 'street') { l.via ??= {}; l.via.street = (l.via.street ?? 0) + 1 }
    return { ok: true }
  }
  /**
   * Billboards of a city: its live listings with a running Boost or Spotlight (a Spotlight shows on its own city's boards too, no new
   * price), that pass the board screen, rotating every ten minutes so each takes a turn when there are more than the map has boards.
   */
  function boards(db: Db, viewer: string | null, city: string): BoardListing[] {
    const c = peekPromote(db)
    if (!c) return []
    const t = now(), out: BoardListing[] = [], seen = new Set<string>()
    for (const id of c.cities[city]?.listings ?? []) {
      const l = c.listings[id]
      if (!l || l.status !== 'live' || seen.has(id) || blocked(viewer ?? '', l.owner) || !boardSafe(l)) continue
      const o = boostOf(c, id, t)
      if (!o) continue
      seen.add(id)
      out.push({ id: l.id, name: l.name, category: l.category, categoryLabel: categoryLabel(l.category), area: l.area, ...(l.photo ? { photo: l.photo } : {}), tier: o.tier, owner: { id: l.owner, name: nameOf(db, l.owner) }, ...(shopOf(db, l.owner) ? { shop: shopOf(db, l.owner)! } : {}) })
    }
    const shift = out.length ? Math.floor(t / BILLBOARD.rotateMs) % out.length : 0
    return [...out.slice(shift), ...out.slice(0, shift)].slice(0, BILLBOARD.max)
  }
  /** The business street of a city: every live listing in a shop front, grouped by kind, boosted first and then newest. */
  function street(db: Db, viewer: string | null, city: string): StreetView {
    const c = peekPromote(db), t = now()
    const live = (c?.cities[city]?.listings ?? []).map((l) => c!.listings[l]).filter((l): l is ListingRecord => Boolean(l) && l!.status === 'live' && !blocked(viewer ?? '', l!.owner))
    const groups = CATEGORIES.map(([category, label]) => ({ category, label, listings: live.filter((l) => l.category === category).map((l) => ({ l, boost: boostOf(c!, l.id, t) ? 1 : 0 })).sort((a, b) => b.boost - a.boost || b.l.at - a.l.at).slice(0, BILLBOARD.street).map(({ l }) => listingView(db, c!, l, viewer)) })).filter((g) => g.listings.length)
    return { city, cityName: cityName(city) ?? city, groups, total: groups.reduce((n, g) => n + g.listings.length, 0) }
  }
  /** Heartbeat: listings still waiting for a review (the model had no answer), oldest first, at most a few. */
  const pending = (db: Db): string[] => Object.values(peekPromote(db)?.listings ?? {}).filter((l) => l.status === 'review' && (l.tries ?? 0) < PROMOTE.reviewTries).slice(0, 3).map((l) => l.id)
  function admin(db: Db) {
    const c = peekPromote(db)
    if (!c) return { ok: true as const, orders: [], listings: [], revenue: { month: 0, all: 0 } }
    const month = new Date(now()).toISOString().slice(0, 7)
    return { ok: true as const, revenue: { month: c.revenue.months[month] ?? 0, all: c.revenue.all },
      orders: Object.values(c.orders).sort((a, b) => b.at - a.at).slice(0, 200).map((o) => ({ ...orderView(c, o), owner: o.owner, ownerName: nameOf(db, o.owner), arcon: o.arcon ?? '', shown: o.shown ?? 0, note: o.note ?? '' })),
      listings: Object.values(c.listings).filter((l) => l.status !== 'removed' || l.reason).sort((a, b) => b.at - a.at).slice(0, 200).map((l) => ({ ...listingView(db, c, l, null), reason: l.reason ?? '', contacts: l.contacts ?? 0, boardTaps: l.via?.board ?? 0, streetTaps: l.via?.street ?? 0, tries: l.tries ?? 0 })) }
  }
  function act(db: Db, body: Record<string, unknown>): { ok: true } | No {
    const c = peekPromote(db)
    if (!c) return no('unknown', 'Nothing to act on.')
    if (typeof body.order === 'string') {
      const o = c.orders[body.order]; if (!o) return no('unknown_order', 'That order was not found.')
      if (body.action === 'paid') { const r = markPaid(db, o.id, 'admin'); return r.ok ? { ok: true } : r }
      if (body.action === 'cancel') { if (o.status === 'pending') { o.status = 'cancelled'; delete c.refs[o.ref] } else if (o.status === 'paid') { o.status = 'ended'; o.note = clean(body.note, 200) || 'stopped by an admin'; } return { ok: true } }
      return no('invalid_action', 'paid or cancel')
    }
    const l = typeof body.listing === 'string' ? c.listings[body.listing] : undefined
    if (!l) return no('unknown_listing', 'That listing was not found.')
    if (body.action === 'remove') { l.status = 'refused'; l.reason = clean(body.note, 200) || 'Removed by Allworld.'; endBoosts(c, l.id, 'removed'); return { ok: true } }
    if (body.action === 'approve' || body.action === 'restore') { l.status = 'live'; delete l.reason; return { ok: true } }
    return no('invalid_action', 'remove, approve or restore')
  }
  return { me, directory, save, remove, reviewed, order, markPaid, orderByRef, ownOrder, viewOf, checkout, keepCheckout, verify, awaiting, payment, nameOf, sponsored, noteShown, contact, boards, street, pending, admin, act, prices, listingView, peek: peekPromote, categories: CATEGORIES }
}

/** ERASURE: a person's listings and pending orders go; paid orders stay as the business record of a sale, without the person. */
export function forgetPromotePlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekPromote(db)
  if (!c) return
  for (const id of ids) {
    for (const l of c.owners[id]?.listings ?? []) { const r = c.listings[l]; if (r) { delete c.listings[l]; for (const k of Object.keys(c.cities)) c.cities[k]!.listings = c.cities[k]!.listings.filter((x) => x !== l) } }
    for (const o of c.owners[id]?.orders ?? []) { const r = c.orders[o]; if (r) { delete c.refs[r.ref]; if (r.status === 'pending' || r.status === 'cancelled') delete c.orders[o]; else { r.owner = 'erased'; delete r.email } } }
    delete c.owners[id]
  }
}
