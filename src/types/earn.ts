// OWNER: social. Earn (docs/EARN.md): the earner's Bachs account, sales paid by buyers, and the creator pool.
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
export type EarnAccountStatus = 'none' | 'setup' | 'review' | 'ready'
export type SaleKind = 'ticket' | 'gig'
export type SaleStatus = 'pending' | 'paid' | 'cancelled'
export interface SaleView { id: string; ref: string; kind: SaleKind; title: string; amount: number; fee: number; status: SaleStatus; at: number; side: 'buyer' | 'seller'; other: string }
export type PoolMonthStatus = 'counting' | 'held' | 'payable' | 'paid' | 'carried' | 'none'
export interface PoolMonthView { month: string; points: number; amount: number; status: PoolMonthStatus; payableAt?: number }
export interface EarnMe {
  ok: true; open: boolean; sandbox: boolean; adult: boolean; account: boolean
  status: EarnAccountStatus; email?: string
  fees: { ticket: number; gig: number }
  sales: SaleView[]
  pool: { share: number; threshold: number; minPoints: number; month: string; points: number; revenue: number; estimate: number; carried: number; months: PoolMonthView[] }
}
export interface EarnAdminRow { id: string; name: string; amount: number; ready: boolean; paid?: { status: string; at: number } }
export interface EarnAdminMonth { month: string; revenue: number; pot: number; closedAt?: number; payableAt: number; payable: boolean; creators: EarnAdminRow[] }
export interface EarnAdmin { ok: true; open: boolean; sandbox: boolean; months: EarnAdminMonth[]; sales: { month: number; fees: number; count: number } }
type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
export interface EarnHttpRoutes {
  'GET /api/earn/me': { response: Done<Omit<EarnMe, 'ok'>>; errors: E }
  'POST /api/earn/account': { body: { email?: string }; response: Done<{ url: string }>; errors: E }
  'POST /api/earn/account/refresh': { response: Done<{ status: EarnAccountStatus }>; errors: E }
  'GET /api/earn/ready': { query: { id: string }; response: Done<{ ready: boolean }>; errors: E }
  'POST /api/earn/price': { body: { event: string; price: number }; response: Done<{ price: number }>; errors: E }
  'POST /api/earn/pay': { body: { kind: SaleKind; id: string; amount?: number; email: string }; response: Done<{ pay: string; sale: SaleView }>; errors: E }
  'POST /api/earn/pay/verify': { body: { ref: string }; response: Done<{ sale: SaleView }>; errors: E }
  'GET /api/admin/earn': { response: Done<Omit<EarnAdmin, 'ok'>>; errors: E | 'not_found' }
  'POST /api/admin/earn/pay': { body: { month: string }; response: Done<{ paid: number; waiting: number }>; errors: E | 'not_found' | 'invalid_month' | 'origin_required' }
}
