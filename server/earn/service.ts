/**
 * OWNER: social
 * EARN (docs/EARN.md; rules in src/earn/model.ts). Real money for players through Bachs, never held by Allworld, never game money.
 *
 *   ACCOUNT  an adult with an Allworld account opens a Bachs connected account (Bachs checks who they are and takes their bank details on
 *            its own page). Status: setup (Bachs still needs something) → review (Bachs is checking) → ready (can collect and receive).
 *   SALES    a ticket to a priced event, or paying the worker of a gig, is a direct charge on the earner's account with Allworld's fee
 *            (5% tickets, 10% gigs; admin settings). Confirmed by the server asking Bachs, on return and on the heartbeat. A paid ticket
 *            puts the buyer on the event's going list. Refunds are the earner's, from their Bachs balance.
 *   POOL     a point when an adult with an account reacts to or replies to a creator's public post (one per giver and creator a day, at
 *            most 20 a day per giver). When a month ends, the pool share (30%) of that month's business-boost revenue is split by points
 *            (minimum 20, at most 10% each); shares under ₦10,000 carry over (up to 12 months). Payable 30 days after the month, sent by
 *            an admin as Bachs transfers to ready accounts.
 * Stored (collection `earn`, keyed): accounts[publicId] · sales[id] · owners[publicId] { sales[] } · root { seq, refs, prices, tickets,
 * pool { day, seen, given, months[YYYY-MM] { points, closed?, due?, paid? }, carried } }. Portable: no Node imports.
 */
import { EARN, dayOf, feeOf, monthEnd, monthOf, poolSplit } from '../../src/earn/model.ts'
import type { EarnAccountStatus, EarnAdmin, EarnMe, PoolMonthView, SaleKind, SaleView } from '../../src/types/earn.ts'
import { bachsClient } from '../payments/bachs.ts'
import type { AccountState } from '../payments/bachs.ts'
import { accountOfSession } from '../admin/gate.ts'
import { peekFeed } from '../feed/data.ts'
import { peekPromote } from '../promote/service.ts'
import { earnOf, peekEarn } from './data.ts'
import { gigPaid, ticketOf, needsTicket } from './data.ts'
import type { EarnAccount, SaleRecord } from './data.ts'
import type { Db, RouteContext, SessionRecord } from '../types.ts'

export { earnOf, peekEarn } from './data.ts'
export type { EarnAccount, EarnCollection, PoolMonth, SaleRecord } from './data.ts'
type No = { ok: false; code: string; reason: string }
const no = (code: string, reason: string): No => ({ ok: false, code, reason })
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i
const DAY = 86400000

/** What a Bachs account's state means here: ready when it can collect naira and receive transfers. */
export function statusOf(s: AccountState): EarnAccountStatus {
  const active = (c: keyof AccountState['caps']): boolean => s.caps[c] === 'active'
  if (s.active && (active('ngn_card_collection') || active('bank_transfer')) && active('transfers') && active('payouts')) return 'ready'
  return s.due > 0 ? 'setup' : 'review'
}

export function earnService(ctx: RouteContext) {
  const now = (): number => ctx.now()
  const pay = bachsClient(ctx)
  const setting = (key: string): unknown => ctx.checks?.setting?.(key)
  const num = (key: string, d: number): number => { const v = Number(setting(key)); return Number.isFinite(v) && v >= 0 ? v : d }
  const fees = () => ({ ticket: num('earnTicketFee', EARN.ticket.fee), gig: num('earnGigFee', EARN.gig.fee) })
  const share = (): number => Math.min(90, num('poolShare', EARN.pool.share))
  const threshold = (): number => num('poolThreshold', EARN.pool.threshold)
  const open = (): boolean => pay.on() && setting('earnOpen') !== false
  const adult = (db: Db, id: string): boolean => ctx.checks?.adult?.(db, id) === true
  const blocked = (a: string, b: string): boolean => a !== b && ctx.checks?.blocked?.(a, b) === true
  const nameOf = (db: Db, id: string): string => (db as unknown as { social?: { players?: Record<string, { name?: string }> } }).social?.players?.[id]?.name ?? 'Player'
  const ready = (db: Db, id: string): EarnAccount | undefined => { const a = peekEarn(db)?.accounts[id]; return a?.status === 'ready' ? a : undefined }

  // ---- account ------------------------------------------------------------------------------------------------------------------
  /** Who may open an account, and with what e-mail. */
  function canOpen(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; email: string; name: string; existing?: EarnAccount } | No {
    if (!open()) return no('earn_closed', 'Earning opens soon.')
    if (!accountOfSession(db, session)) return no('account_required', 'Sign in to an Allworld account first, so your earnings stay yours on every device.')
    if (!adult(db, session.publicId)) return no('adults_only', 'Earning real money is for players confirmed as 18 or older.')
    const existing = peekEarn(db)?.accounts[session.publicId]
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : ''
    if (!existing && !EMAIL.test(email)) return no('invalid_email', 'Give the e-mail address Bachs should use for your payout account.')
    return { ok: true, email: existing?.email ?? email, name: nameOf(db, session.publicId), ...(existing ? { existing } : {}) }
  }
  function keepAccount(db: Db, id: string, acct: string, email: string, state: AccountState): EarnAccount {
    const c = earnOf(ctx, db), a = (c.accounts[id] ??= { acct, email, status: 'setup', at: now() })
    a.acct = acct; a.email = email; a.status = statusOf(state); a.checked = now()
    return a
  }
  function setStatus(db: Db, id: string, state: AccountState): EarnAccountStatus | null {
    const a = peekEarn(db)?.accounts[id]
    if (!a || a.acct !== state.id) return null
    a.status = statusOf(state); a.checked = now()
    return a.status
  }

  // ---- event prices -------------------------------------------------------------------------------------------------------------
  function setPrice(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; price: number } | No {
    const id = session.publicId, f = peekFeed(db), e = f && typeof body.event === 'string' ? f.events[body.event] : undefined
    if (!e || e.gone || e.by !== id) return no('unknown_event', 'Choose one of your events.')
    if (e.end < now()) return no('event_over', 'That event is over.')
    const price = Math.round(Number(body.price))
    if (price === 0) { const c = peekEarn(db); if (c) delete c.prices[e.id]; return { ok: true, price: 0 } }
    if (!Number.isFinite(price) || price < EARN.ticket.min || price > EARN.ticket.max) return no('invalid_price', `A ticket is ₦${EARN.ticket.min.toLocaleString('en-NG')} to ₦${EARN.ticket.max.toLocaleString('en-NG')}, or free.`)
    if (!ready(db, id)) return no('payout_account', 'Set up your payout account in Earn first, so ticket money reaches you.')
    earnOf(ctx, db).prices[e.id] = price
    return { ok: true, price }
  }

  // ---- sales --------------------------------------------------------------------------------------------------------------------
  const saleView = (db: Db, s: SaleRecord, viewer: string): SaleView => ({ id: s.id, ref: s.ref, kind: s.kind, title: s.title, amount: s.amount, fee: s.fee, status: s.status, at: s.at, side: viewer === s.seller ? 'seller' : 'buyer', other: nameOf(db, viewer === s.seller ? s.buyer : s.seller) })
  /** A sale waiting for payment: what is bought, from whom, for how much. The checkout is opened afterwards, outside the transaction. */
  function startSale(db: Db, session: SessionRecord, body: Record<string, unknown>): { ok: true; sale: SaleRecord } | No {
    if (!open()) return no('earn_closed', 'Paying in real money opens soon.')
    const id = session.publicId, f = peekFeed(db)
    if (!accountOfSession(db, session)) return no('account_required', 'Sign in to an Allworld account to pay.')
    const email = typeof body.email === 'string' ? body.email.trim().slice(0, 254) : ''
    if (!EMAIL.test(email)) return no('invalid_email', 'Give an e-mail address for the receipt.')
    const c = earnOf(ctx, db), mine = (c.owners[id] ??= { sales: [] })
    if (mine.sales.map((s) => c.sales[s]).filter((s) => s?.status === 'pending' && s.buyer === id).length >= EARN.pendingMax) return no('too_many_pending', 'You have payments waiting. Finish or wait for one first.')
    let kind: SaleKind, item: string, title: string, seller: string, amount: number, fee: number
    if (body.kind === 'ticket') {
      const e = f && typeof body.id === 'string' ? f.events[body.id] : undefined, price = e ? c.prices[e.id] : undefined
      if (!e || e.gone || !price || blocked(id, e.by)) return no('unknown_event', 'That event has no tickets.')
      if (e.by === id) return no('own_event', 'This is your own event.')
      if (e.end < now()) return no('event_over', 'That event is over.')
      if (c.tickets[e.id]?.includes(id)) return no('has_ticket', 'You have a ticket already.')
      if (e.going.length >= e.cap) return no('event_full', 'This event is full.')
      kind = 'ticket'; item = e.id; title = `Ticket: ${e.title}`; seller = e.by; amount = price; fee = feeOf(price, fees().ticket)
    } else if (body.kind === 'gig') {
      const g = f && typeof body.id === 'string' ? f.gigs[body.id] : undefined
      if (!g || g.by !== id || !g.worker) return no('unknown_gig', 'Choose one of your gigs that someone has taken.')
      if (g.state !== 'taken' && g.state !== 'done') return no('not_taken', 'You can pay once someone is doing the gig.')
      if (gigPaid(db, g.id) !== undefined) return no('paid', 'You have paid for this gig.')
      amount = Math.round(Number(body.amount))
      if (!Number.isFinite(amount) || amount < EARN.gig.min || amount > EARN.gig.max) return no('invalid_amount', `Pay ₦${EARN.gig.min.toLocaleString('en-NG')} to ₦${EARN.gig.max.toLocaleString('en-NG')}.`)
      kind = 'gig'; item = g.id; title = `Gig: ${g.title}`; seller = g.worker; fee = feeOf(amount, fees().gig)
    } else return no('invalid_kind', 'Choose a ticket or a gig.')
    const acct = ready(db, seller)
    if (!acct) return no('earner_not_ready', kind === 'ticket' ? 'The host cannot take payments yet.' : 'They have not set up a payout account yet. Ask them to open Earn.')
    const ref = `AE-${(++c.seq).toString(36).toUpperCase()}-${ctx.randomId().replace(/-/g, '').slice(0, 8).toUpperCase()}`
    const s: SaleRecord = { id: `S${c.seq.toString(36)}`, ref, kind, item, title: title.slice(0, 120), seller, buyer: id, account: acct.acct, amount, fee, at: now(), status: 'pending', email }
    c.sales[s.id] = s; c.refs[ref] = s.id; mine.sales.push(s.id); (c.owners[seller] ??= { sales: [] }).sales.push(s.id)
    return { ok: true, sale: s }
  }
  const keepCheckout = (db: Db, saleId: string, checkout: string): void => { const s = peekEarn(db)?.sales[saleId]; if (s?.status === 'pending') s.checkout = checkout }
  const cancelSale = (db: Db, saleId: string): void => { const c = peekEarn(db), s = c?.sales[saleId]; if (c && s?.status === 'pending') { s.status = 'cancelled'; delete c.refs[s.ref]; delete s.email } }
  /** Bachs said it is paid: the ticket holder goes on the list; the gig is marked paid. Idempotent. */
  function markPaid(db: Db, saleId: string, amount: number): { ok: true; sale: SaleRecord } | No {
    const c = peekEarn(db), s = c?.sales[saleId]
    if (!c || !s) return no('unknown_sale', 'That payment was not found.')
    if (s.status === 'paid') return { ok: true, sale: s }
    if (s.status !== 'pending' && s.status !== 'cancelled') return no('closed', 'That payment was closed.')
    if (amount < s.amount) return no('amount_mismatch', 'The payment does not match.')
    s.status = 'paid'; s.paidAt = now(); delete c.refs[s.ref]; delete s.email
    if (s.kind === 'ticket') {
      const list = (c.tickets[s.item] ??= []); if (!list.includes(s.buyer)) list.push(s.buyer)
      const e = peekFeed(db)?.events[s.item]
      if (e && !e.gone) { e.maybe = e.maybe.filter((x) => x !== s.buyer); if (!e.going.includes(s.buyer)) e.going.push(s.buyer) }
    }
    return { ok: true, sale: s }
  }
  const ownSale = (db: Db, viewer: string, ref: unknown): SaleRecord | undefined => { const c = peekEarn(db); return typeof ref === 'string' && c ? (c.owners[viewer]?.sales ?? []).map((s) => c.sales[s]).find((s) => s?.ref === ref && s.buyer === viewer) : undefined }
  /** Heartbeat: sales opened in the last two days still waiting, newest first; older ones are cancelled. */
  function awaiting(db: Db): SaleRecord[] {
    const c = peekEarn(db)
    if (!c) return []
    const out: SaleRecord[] = []
    for (const id of Object.values(c.refs)) { const s = c.sales[id]; if (!s || s.status !== 'pending') continue; if (now() - s.at > 2 * DAY) { if (!s.checkout) cancelSale(db, s.id); else out.push(s) } else if (s.checkout) out.push(s) }
    return out.sort((a, b) => b.at - a.at).slice(0, 8)
  }

  // ---- pool ---------------------------------------------------------------------------------------------------------------------
  /** Someone reacted to or replied to a post: a point for its author when it is a public post of a person and the giver is a real, adult account. */
  function notePoint(db: Db, session: SessionRecord, postId: unknown): void {
    const f = peekFeed(db), post = f && typeof postId === 'string' ? f.posts[postId] : undefined, giver = session.publicId
    if (!post || post.vis !== 'public' || post.by === giver || !adult(db, giver) || !adult(db, post.by) || !accountOfSession(db, session)) return
    const c = earnOf(ctx, db), p = c.pool, day = dayOf(now())
    if (p.day !== day) { p.day = day; p.seen = {}; p.given = {} }
    const key = `${giver}>${post.by}`
    if (p.seen[key] || (p.given[giver] ?? 0) >= EARN.pool.giverPerDay) return
    p.seen[key] = 1; p.given[giver] = (p.given[giver] ?? 0) + 1
    const m = (p.months[monthOf(now())] ??= { points: {} }); m.points[post.by] = (m.points[post.by] ?? 0) + 1
  }
  const payableAt = (month: string): number => monthEnd(month) + EARN.pool.holdDays * DAY
  /** Heartbeat: close every month that has ended: split its pot, carry small shares, drop shares carried too long. */
  function closeMonths(db: Db): number {
    const c = peekEarn(db)
    if (!c) return 0
    const revenue = peekPromote(db)?.revenue.months ?? {}, current = monthOf(now())
    let n = 0
    for (const month of Object.keys(c.pool.months).sort()) {
      const m = c.pool.months[month]!
      if (m.closed || month >= current) continue
      const pot = Math.floor(((revenue[month] ?? 0) * share()) / 100)
      const split = poolSplit(pot, Object.fromEntries(Object.entries(m.points).filter(([id]) => adult(db, id))), { minPoints: EARN.pool.minPoints, capShare: EARN.pool.capShare })
      const due: Record<string, number> = {}
      for (const [id, carried] of Object.entries(c.pool.carried)) {
        const [y, mo] = carried.since.split('-').map(Number), [cy, cm] = month.split('-').map(Number)
        if ((cy! - y!) * 12 + (cm! - mo!) >= EARN.pool.carryMonths) delete c.pool.carried[id]
      }
      for (const id of new Set([...Object.keys(split), ...Object.keys(c.pool.carried)])) {
        const total = (split[id] ?? 0) + (c.pool.carried[id]?.amount ?? 0)
        if (total >= threshold()) { due[id] = total; delete c.pool.carried[id] } else if (split[id]) c.pool.carried[id] = { amount: total, since: c.pool.carried[id]?.since ?? month }
      }
      m.closed = { revenue: revenue[month] ?? 0, pot, at: now() }; m.due = due
      n++
    }
    // Months older than 18 months keep only what was paid.
    for (const month of Object.keys(c.pool.months)) if (monthEnd(month) < now() - 548 * DAY) { const m = c.pool.months[month]!; m.points = {}; if (!m.paid) delete c.pool.months[month] }
    return n
  }
  /** Admin: the creators of a payable month who can be paid now (ready accounts, not yet sent). */
  function payList(db: Db, month: string): { id: string; acct: string; amount: number }[] | No {
    const m = peekEarn(db)?.pool.months[month]
    if (!m?.closed || !m.due) return no('not_closed', 'That month is not closed yet.')
    if (now() < payableAt(month)) return no('held', `That month is payable from ${new Date(payableAt(month)).toISOString().slice(0, 10)}.`)
    return Object.entries(m.due).filter(([id]) => !m.paid?.[id] && ready(db, id)).map(([id, amount]) => ({ id, acct: ready(db, id)!.acct, amount }))
  }
  function notePaid(db: Db, month: string, id: string, amount: number, status: string): void { const m = peekEarn(db)?.pool.months[month]; if (m) (m.paid ??= {})[id] = { amount, status, at: now() } }

  // ---- views --------------------------------------------------------------------------------------------------------------------
  function poolView(db: Db, id: string): EarnMe['pool'] {
    const c = peekEarn(db), month = monthOf(now()), points = c?.pool.months[month]?.points ?? {}
    const revenue = peekPromote(db)?.revenue.months[month] ?? 0, pot = Math.floor((revenue * share()) / 100)
    const estimate = poolSplit(pot, points, { minPoints: EARN.pool.minPoints, capShare: EARN.pool.capShare })[id] ?? 0
    const months: PoolMonthView[] = Object.keys(c?.pool.months ?? {}).sort().reverse().slice(0, 12).map((k) => {
      const m = c!.pool.months[k]!, p = m.points[id] ?? 0, paid = m.paid?.[id], due = m.due?.[id]
      const status: PoolMonthView['status'] = !m.closed ? 'counting' : paid ? 'paid' : due ? (now() < payableAt(k) ? 'held' : 'payable') : p ? 'carried' : 'none'
      return { month: k, points: p, amount: paid?.amount ?? due ?? 0, status, ...(due && !paid ? { payableAt: payableAt(k) } : {}) }
    }).filter((m) => m.points || m.amount)
    return { share: share(), threshold: threshold(), minPoints: EARN.pool.minPoints, month, points: points[id] ?? 0, revenue, estimate, carried: c?.pool.carried[id]?.amount ?? 0, months }
  }
  function me(db: Db, session: SessionRecord): EarnMe {
    const id = session.publicId, c = peekEarn(db), a = c?.accounts[id]
    const sales = (c?.owners[id]?.sales ?? []).map((s) => c!.sales[s]).filter((s): s is SaleRecord => Boolean(s) && (s!.status !== 'cancelled' || s!.buyer === id)).sort((x, y) => y.at - x.at).slice(0, 50).map((s) => saleView(db, s, id))
    return { ok: true, open: open(), sandbox: pay.sandbox(), adult: adult(db, id), account: Boolean(accountOfSession(db, session)), status: a?.status ?? 'none', ...(a ? { email: a.email } : {}), fees: fees(), sales, pool: poolView(db, id) }
  }
  function admin(db: Db): EarnAdmin {
    const c = peekEarn(db), month = monthOf(now()), revenue = peekPromote(db)?.revenue.months ?? {}
    const sales = Object.values(c?.sales ?? {}).filter((s) => s.status === 'paid' && monthOf(s.paidAt ?? s.at) === month)
    return { ok: true, open: open(), sandbox: pay.sandbox(), sales: { month: sales.reduce((n, s) => n + s.amount, 0), fees: sales.reduce((n, s) => n + s.fee, 0), count: sales.length },
      months: Object.keys(c?.pool.months ?? {}).sort().reverse().slice(0, 12).map((k) => {
        const m = c!.pool.months[k]!, closed = m.closed
        const rows = closed ? Object.entries(m.due ?? {}) : Object.entries(poolSplit(Math.floor(((revenue[k] ?? 0) * share()) / 100), m.points, { minPoints: EARN.pool.minPoints, capShare: EARN.pool.capShare }))
        return { month: k, revenue: closed?.revenue ?? revenue[k] ?? 0, pot: closed?.pot ?? Math.floor(((revenue[k] ?? 0) * share()) / 100), ...(closed ? { closedAt: closed.at } : {}), payableAt: payableAt(k), payable: Boolean(closed) && now() >= payableAt(k),
          creators: rows.sort((a, b) => b[1] - a[1]).slice(0, 200).map(([id, amount]) => ({ id, name: nameOf(db, id), amount, ready: Boolean(ready(db, id)), ...(m.paid?.[id] ? { paid: { status: m.paid[id]!.status, at: m.paid[id]!.at } } : {}) })) }
      }) }
  }
  return { open, pay, canOpen, keepAccount, setStatus, setPrice, ticketOf, needsTicket, gigPaid, startSale, keepCheckout, cancelSale, markPaid, ownSale, awaiting, saleView, notePoint, closeMonths, payList, notePaid, me, admin, nameOf, peek: peekEarn }
}

/** ERASURE: a person's account link, points, shares and pending payments go; a paid sale stays as the record of a sale, without them. */
export function forgetEarnPlayers(db: Db, ids: ReadonlySet<string>): void {
  const c = peekEarn(db)
  if (!c) return
  for (const id of ids) {
    delete c.accounts[id]; delete c.pool.carried[id]; delete c.pool.given[id]
    for (const m of Object.values(c.pool.months)) { delete m.points[id]; if (m.due) delete m.due[id]; if (m.paid?.[id]) m.paid['erased'] = { ...m.paid[id]!, amount: (m.paid['erased']?.amount ?? 0) + m.paid[id]!.amount }; if (m.paid) delete m.paid[id] }
    for (const k of Object.keys(c.pool.seen)) if (k.startsWith(`${id}>`) || k.endsWith(`>${id}`)) delete c.pool.seen[k]
    for (const list of Object.values(c.tickets)) { const i = list.indexOf(id); if (i >= 0) list.splice(i, 1) }
    for (const s of c.owners[id]?.sales ?? []) {
      const r = c.sales[s]
      if (!r) continue
      if (r.status !== 'paid') { delete c.refs[r.ref]; delete c.sales[s]; continue }
      if (r.buyer === id) r.buyer = 'erased'
      if (r.seller === id) r.seller = 'erased'
      delete r.email
    }
    delete c.owners[id]
  }
}
