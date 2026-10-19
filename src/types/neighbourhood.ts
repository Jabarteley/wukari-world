// OWNER: social. Wire shapes of /api/neighbourhood/*, /api/economy and the billboards and business street of /api/promote/* (docs/NEIGHBOURHOOD.md, docs/PROMOTE.md).
import type { HostErrorCode, JsonBodyErrorCode, Ok } from './protocol.ts'
import type { EventView } from './feed.ts'
import type { NoticeKind } from '../neighbourhood/model.ts'
import type { Category } from '../promote/model.ts'
import type { ListingView } from './promote.ts'

/** The area a person's location badge names: a local government, or a city. */
export interface AreaView { key: string; city: string; cityName: string; lga?: string; lgaName?: string; name: string }
export interface NoticeView {
  id: string; kind: NoticeKind; kindLabel: string; body: string; at: number; until: number; left: string
  up: number; down: number; mine: boolean; vote: 'up' | 'down' | null; by: string
  /** Only for the author: 'review' while the reviewer has not answered, 'refused' with the reason. */
  status?: 'review' | 'refused'; reason?: string
}
export interface BoardView { area: AreaView; notices: NoticeView[]; mine: NoticeView[]; kinds: { id: NoticeKind; label: string; hint: string }[]; canPost: boolean }
export interface MeetupView { event: EventView; area: AreaView; month: string; canGo: boolean }
export interface MeetupsView { area: AreaView | null; meetups: MeetupView[]; next: number; plannable: { crew: string; name: string; area: AreaView }[] }

/** A business on a billboard of its city (docs/PROMOTE.md "Billboards"): what the board shows, and what a tap opens. */
export interface BoardListing { id: string; name: string; category: Category; categoryLabel: string; area: string; photo?: string; tier: 'boost' | 'spotlight'; owner: { id: string; name: string }; shop?: string }
/** The business street of a city: live listings grouped by kind, boosted first. */
export interface StreetView { city: string; cityName: string; groups: { category: Category; label: string; listings: ListingView[] }[]; total: number }

export interface EconomyRow { rank: number; name: string; amount: number }
export interface EconomyPrice { commodity: string; label: string; unit: string; median: number; reference: number; trades: number; source: 'trades' | 'reference' }
export interface EconomyView {
  city: string; cityName: string; at: number; week: number
  /** The city's rich list as the game already shows it, without the people who left it. */
  rich: { balances: EconomyRow[]; earners: EconomyRow[]; listed: number }
  prices: EconomyPrice[]
  government: { title: string; governor: string | null; treasury: number; taxWeek: number; feesWeek: number; spentWeek: number; term: { income: number; salary: number; granted: number } | null }
  circulation: { wallets: number; market: number; treasury: number; total: number; players: number }
}

type E = HostErrorCode | JsonBodyErrorCode | 'rate_limited' | 'device_session_required' | 'storage_unavailable'
type Refused = { ok: false; code: string; reason: string }
type Done<T extends object = object> = Ok<({ ok: true } & T) | Refused>
export interface NeighbourhoodHttpRoutes {
  'GET /api/neighbourhood/board': { response: Done<BoardView>; errors: E }
  'POST /api/neighbourhood/notices': { body: { kind: string; body: string }; response: Done<{ notice: NoticeView }>; errors: E }
  'POST /api/neighbourhood/notices/vote': { body: { id: string; vote: 'up' | 'down' | null }; response: Done<{ notice: NoticeView }>; errors: E }
  'POST /api/neighbourhood/notices/report': { body: { id: string }; response: Done; errors: E }
  'POST /api/neighbourhood/notices/remove': { body: { id: string }; response: Done; errors: E }
  'GET /api/neighbourhood/meetups': { response: Done<MeetupsView>; errors: E }
  'POST /api/neighbourhood/meetups/plan': { body: { crew: string; title?: string; about?: string; place?: string; price?: number }; response: Done<{ meetup: MeetupView; priceNote?: string }>; errors: E }
  'GET /api/admin/neighbourhood': { response: Done<{ notices: object[]; meetups: object[] }>; errors: E | 'not_found' }
  'POST /api/admin/neighbourhood/act': { body: { notice: string; action: 'remove' | 'restore'; note?: string }; response: Done; errors: E | 'not_found' | 'invalid_action' | 'origin_required' }
  'POST /api/admin/neighbourhood/meetup': { body: { city: string; lga: string; title?: string; about?: string; place?: string; price?: number }; response: Done<{ meetup: MeetupView; priceNote?: string }>; errors: E | 'not_found' | 'origin_required' }
}
export interface EconomyHttpRoutes {
  'GET /api/economy': { query: { city?: string }; response: Done<EconomyView>; errors: E }
}
export interface BillboardHttpRoutes {
  'GET /api/promote/boards': { query: { city?: string }; response: Done<{ city: string; boards: BoardListing[] }>; errors: E }
  'GET /api/promote/street': { query: { city?: string }; response: Done<StreetView>; errors: E }
}
