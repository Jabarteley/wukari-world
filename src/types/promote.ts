// Allworld for Business: wire shapes of /api/promote/* (docs/PROMOTE.md).
import type { Category, ListingStatus, OrderStatus, Tier } from '../promote/model.ts'
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { FeedPerson } from './feed.ts'

export interface ListingView {
  id: string; owner: FeedPerson; name: string; category: Category; categoryLabel: string; city: string; cityName: string; area: string; about: string
  photo?: string; at: number; status: ListingStatus; reason?: string; boosted: boolean; shop?: string; mine: boolean
}
export interface OrderView { id: string; listing: string; listingName: string; tier: Tier; weeks: number; amount: number; city: string; status: OrderStatus; at: number; startsAt?: number; endsAt?: number; ref: string; by?: 'paystack' | 'bank' | 'admin' }
export interface PromoteMe { listings: ListingView[]; orders: OrderView[]; prices: Record<Tier, number>; payment: 'paystack' | 'bank' | 'closed'; bank: string; adult: boolean; account: boolean }
type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
export interface PromoteHttpRoutes {
  'GET /api/promote/me': { response: Done<PromoteMe>; errors: E }
  'GET /api/promote/directory': { query: { city?: string; category?: string }; response: Done<{ listings: ListingView[]; city: string }>; errors: E }
  'POST /api/promote/listings': { body: { id?: string; name: string; category: string; area?: string; about?: string; photo?: string }; response: Done<{ listing: ListingView }>; errors: E }
  'POST /api/promote/listings/remove': { body: { id: string }; response: Done; errors: E }
  'POST /api/promote/order': { body: { listing: string; tier: Tier; weeks: number; email?: string; arcon?: string }; response: Done<{ order: OrderView; pay?: string; bank?: string }>; errors: E }
  'POST /api/promote/order/verify': { body: { ref: string }; response: Done<{ order: OrderView }>; errors: E }
  'POST /api/promote/contact': { body: { listing: string }; response: Done; errors: E }
  'GET /api/admin/promote': { response: Ok<{ ok: true; orders: object[]; listings: object[]; revenue: { month: number; all: number } }>; errors: E | 'not_found' }
  'POST /api/admin/promote/act': { body: { order?: string; listing?: string; action: 'paid' | 'cancel' | 'remove' | 'restore' | 'approve'; note?: string }; response: Done; errors: E | 'not_found' | 'invalid_action' | 'origin_required' }
}
