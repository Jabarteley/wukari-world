/**
 * OWNER: social
 * BACHS (bachs.io), the one payment provider Allworld talks to (docs/EARN.md). Same API as the owner's other product (Goalmatic):
 * Bearer secret key, decimal strings in major units, Idempotency-Key on every money-moving POST, `X-Account-Id` to act for an earner's
 * connected account (Bachs Connect). The key is the Worker secret BACHS_API_KEY (sk_live_… or sk_sandbox_…; a sandbox key talks to the
 * sandbox). It never leaves the server; nothing here trusts what a browser says about a payment.
 *
 *   checkout(…)        a hosted checkout page (checkout.bachs.io) for a reference; with `account` it is a direct charge on the earner's
 *                      account (the earner is the merchant of record, the money lands in their Bachs balance, `fee` is Allworld's cut)
 *   verify(…)          the checkout's payment, asked of Bachs: succeeded, in naira, for this reference and checkout
 *   createAccount / accountLink / account   an earner's connected account, Bachs's hosted onboarding (identity, bank) and its state
 *   transfer(…)        Allworld's own balance to an earner's account (the creator pool); Bachs then pays it out to their bank
 * Portable: no Node imports.
 */
import type { RouteContext } from '../types.ts'

export const BACHS_KEY = /^sk_(live|sandbox)_[A-Za-z0-9_-]{8,}$/
const CHECKOUT = /^chk_[A-Za-z0-9_-]+$/, ACCOUNT = /^acct_[A-Za-z0-9_-]+$/
type Reply = { ok: boolean; status?: number; json(): Promise<unknown> }
type Obj = Record<string, unknown>
const obj = (v: unknown): Obj | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Obj : null)
/** Whole naira as Bachs's decimal string. */
export const naira = (n: number): string => `${Math.max(0, Math.floor(n))}.00`
/** Bachs's decimal string as whole naira (kobo dropped), or null. */
export const wholeNaira = (v: unknown): number | null => (typeof v === 'string' && /^\d+(?:\.\d+)?$/.test(v) ? Math.floor(Number(v)) : typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null)
export const isAccountId = (v: unknown): v is string => typeof v === 'string' && ACCOUNT.test(v) && v.length < 100

export type Capability = 'ngn_card_collection' | 'bank_transfer' | 'transfers' | 'payouts'
export interface AccountState { id: string; caps: Partial<Record<Capability, string>>; due: number; active: boolean }

export function bachsClient(ctx: Pick<RouteContext, 'env' | 'fetch'>) {
  const key = (): string => ((typeof ctx.env === 'function' ? ctx.env('BACHS_API_KEY') : '') ?? '').trim()
  const on = (): boolean => BACHS_KEY.test(key())
  const sandbox = (): boolean => key().startsWith('sk_sandbox_')
  async function call(path: string, opts: { body?: Obj; idempotency?: string; account?: string } = {}): Promise<Obj | null> {
    if (!on()) return null
    const base = sandbox() ? 'https://sandbox-api.bachs.io' : 'https://api.bachs.io'
    const headers: Record<string, string> = { Authorization: `Bearer ${key()}`, Accept: 'application/json' }
    if (opts.body) headers['Content-Type'] = 'application/json'
    if (opts.idempotency) headers['Idempotency-Key'] = opts.idempotency
    if (opts.account) { if (!isAccountId(opts.account)) return null; headers['X-Account-Id'] = opts.account }
    const res = await (ctx.fetch as (u: string, i?: object) => Promise<Reply>)(`${base}${path}`, { method: opts.body ? 'POST' : 'GET', headers, ...(opts.body ? { body: JSON.stringify(opts.body) } : {}) }).catch(() => null)
    return res && res.ok ? obj(await res.json().catch(() => null)) : null
  }
  /** A hosted checkout in naira. Only a checkout.bachs.io page for this very reference is accepted. */
  async function checkout(o: { ref: string; amount: number; email: string; name: string; back: string; account?: string; fee?: number; source: string }): Promise<{ url: string; id: string } | null> {
    const body: Obj = { pricing: { currency: 'NGN', amount: naira(o.amount), price_type: 'fixed' }, billing_currency: 'NGN', customer: { email: o.email, name: o.name.slice(0, 100) || 'Allworld player' },
      success_url: o.back, cancel_url: o.back, reference: o.ref, metadata: { order_reference: o.ref, source: o.source }, expires_in_minutes: 60, ...(o.account && o.fee ? { platform_fee: naira(o.fee) } : {}) }
    const r = await call('/v1/checkout-sessions', { body, idempotency: o.ref, ...(o.account ? { account: o.account } : {}) })
    if (!r || typeof r.checkout_id !== 'string' || !CHECKOUT.test(r.checkout_id) || typeof r.checkout_url !== 'string' || (r.reference !== undefined && r.reference !== o.ref)) return null
    let url: URL
    try { url = new URL(r.checkout_url) } catch { return null }
    return url.protocol === 'https:' && url.hostname === 'checkout.bachs.io' && !url.username && !url.password && !url.port ? { url: url.toString(), id: r.checkout_id } : null
  }
  /** What Bachs says about a checkout's payment. Null when Bachs could not be asked; paid only when it succeeded in naira for this reference. */
  async function verify(o: { ref: string; checkout?: string; account?: string }): Promise<{ paid: boolean; amount: number; payment?: string } | null> {
    if (!o.checkout || !CHECKOUT.test(o.checkout)) return null
    const scope = o.account ? { account: o.account } : {}
    const session = await call(`/v1/checkout-sessions/${encodeURIComponent(o.checkout)}`, scope)
    if (!session || session.checkout_id !== o.checkout || session.reference !== o.ref) return null
    const paymentId = typeof obj(session.charge)?.payment_id === 'string' ? obj(session.charge)!.payment_id as string : ''
    if (!paymentId) return { paid: false, amount: 0 }
    const pay = await call(`/v1/payments/${encodeURIComponent(paymentId)}`, scope)
    if (!pay) return null
    const paid = pay.payment_id === paymentId && pay.status === 'succeeded' && pay.currency === 'NGN' && pay.reference === o.ref && (pay.checkout_id === undefined || pay.checkout_id === o.checkout)
    return { paid, amount: wholeNaira(pay.amount) ?? 0, payment: paymentId }
  }
  const stateOf = (r: Obj | null): AccountState | null => {
    if (!r || !isAccountId(r.id)) return null
    const caps: AccountState['caps'] = {}, raw = obj(r.capabilities) ?? {}
    for (const c of ['ngn_card_collection', 'bank_transfer', 'transfers', 'payouts'] as const) { const s = obj(raw[c])?.status; if (typeof s === 'string') caps[c] = s }
    const req = obj(r.requirements), due = (['currently_due', 'past_due'] as const).reduce((n, k) => n + (Array.isArray(req?.[k]) ? (req![k] as unknown[]).length : 0), 0)
    return { id: r.id, caps, due, active: r.is_active !== false }
  }
  /** An earner's connected account: they collect naira (card and bank transfer) and receive transfers and payouts. Bachs checks who they are. */
  async function createAccount(o: { email: string; name: string; idempotency: string }): Promise<AccountState | null> {
    return stateOf(await call('/v1/accounts', { idempotency: o.idempotency, body: { contact_email: o.email, display_name: o.name.slice(0, 100), country: 'NG', entity_type: 'individual',
      configuration: { merchant: { capabilities: { ngn_card_collection: { requested: true }, bank_transfer: { requested: true } } }, recipient: { capabilities: { transfers: { requested: true }, payouts: { requested: true } } } } } }))
  }
  const account = async (id: string): Promise<AccountState | null> => (isAccountId(id) ? stateOf(await call(`/v1/accounts/${encodeURIComponent(id)}`)) : null)
  /** Bachs's own onboarding page (identity, bank account) for an earner; single use, so made when they tap it. */
  async function accountLink(id: string, back: string, type: 'onboarding' | 'update' = 'onboarding'): Promise<string | null> {
    if (!isAccountId(id)) return null
    const r = await call(`/v1/accounts/${encodeURIComponent(id)}/account-links`, { body: { type, refresh_url: back, return_url: back } })
    if (!r || typeof r.url !== 'string') return null
    try { const u = new URL(r.url); return u.protocol === 'https:' && (u.hostname === 'connect.bachs.io' || u.hostname.endsWith('.bachs.io')) && !u.username && !u.port ? u.toString() : null } catch { return null }
  }
  /** Allworld's balance to an earner's account. Bachs cannot undo a transfer, so the reference is the idempotency key. */
  async function transfer(o: { account: string; amount: number; ref: string; group: string }): Promise<{ status: string } | null> {
    if (!isAccountId(o.account) || o.amount <= 0) return null
    const r = await call('/v1/transfers', { idempotency: o.ref, body: { destination: o.account, amount: naira(o.amount), currency: 'NGN', transfer_group: o.group } })
    return r && typeof r.status === 'string' ? { status: r.status } : null
  }
  return { on, sandbox, checkout, verify, createAccount, account, accountLink, transfer }
}
