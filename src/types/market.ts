/**
 * The Allworld Market: a play-money commodity exchange, one per city. The content tables, the stored record and
 * what the routes under /api/market/ answer. Design: docs/MARKET.md. Rules: src/game/market-model.ts (pure).
 *
 * RED LINES (docs/REAL-VALUE.md): market naira is game naira. It can never be bought with real money, cashed out or
 * sold off-platform; ranks carry no prize with cash value; no copy says "earn", "invest" or "profit". Market gains
 * never count as earned from work (D5), so they cannot be gifted or spent at players' shops beyond the gift rule.
 *
 * DECISIONS (docs/crypto-token-research-2026-10-13/PHASES.md)
 *   D1 what is traded: city commodities (rice, garri, beans, palm oil, cement, petrol), never a coin.
 *   D2 one market per city. Cash and holdings are per city; carrying goods between cities is travel, not a transfer.
 *   D3 everyone may trade: there is no real money.
 *   D4 the public tape shows the trader's public character name, or "Anonymous trader" if they chose that. Never an id.
 *   D5 market gains are not earned from work.
 */
import type { LifeState } from './life.ts'
import type { CityId, HostErrorCode, JsonBodyErrorCode, OnceErrorCode, SessionErrorCode, StorageErrorCode, TimedId } from './protocol.ts'

export type CommodityId = 'rice' | 'garri' | 'beans' | 'palm-oil' | 'cement' | 'petrol'
export type MarketSide = 'buy' | 'sell'

export interface Commodity {
  id: CommodityId
  label: string
  /** "50 kg bag", "25 L keg"… */
  unit: string
  icon: string
  /** Reference price in game naira before city and time factors. */
  base: number
  /** How far the reference wanders: the bound on the random walk, as a fraction of base (e.g. 0.25). */
  swing: number
}

/** A scripted shock tied to the game calendar (fuel scarcity, festive demand, a harvest glut). Pure and deterministic. */
export interface MarketEvent {
  id: string
  commodity: CommodityId
  headline: string
  /** Multiplies the reference while it lasts (1.3 = 30% up). */
  shock: number
  from: number
  to: number
}

/** One commodity as a city's market shows it now. All prices are whole naira. */
export interface MarketQuote {
  commodity: CommodityId
  /** The reference price (market-model refPrice). */
  ref: number
  /** What the market maker pays (ref less the spread) and asks (ref plus the spread). */
  bid: number
  ask: number
  /** Change of the reference over the last 24 hours, in basis points (1250 = +12.5%). */
  change: number
  /** A limit order's price must lie inside this band when placed (MARKET_LIMITS.band around ref). */
  band: { min: number; max: number }
  /** Best resting player orders, if any. */
  bestBid?: number
  bestAsk?: number
  /** Last fill price in this city. */
  last?: number
  event?: { headline: string; to: number }
}

/** A resting or finished order as its owner sees it. */
export interface MarketOrder {
  id: string
  commodity: CommodityId
  side: MarketSide
  price: number
  units: number
  filled: number
  at: number
  expiresAt: number
}

/** One fill on the public tape. `buyer`/`seller` are display labels only (D4): a public name, "Anonymous trader" or "Market maker". */
export interface MarketFill {
  id: string
  commodity: CommodityId
  price: number
  units: number
  at: number
  buyer: string
  seller: string
  /** True on the caller's own fills, so the app can highlight them. Never stored; added per reader. */
  mine?: true
}

export interface MarketAccountView {
  /** Naira in the market account, free to use (not reserved by open buy orders). */
  cash: number
  /** Naira held by open buy orders. */
  reservedCash: number
  holdings: Partial<Record<CommodityId, number>>
  /** Units held by open sell orders. */
  reservedUnits: Partial<Record<CommodityId, number>>
  orders: MarketOrder[]
  anon: boolean
  /** Today (Lagos day) so far, against MARKET_LIMITS. */
  today: { deposited: number; traded: number; makerUnits: Partial<Record<CommodityId, number>> }
  frozen?: true
}

export interface MarketLimits {
  /** Fee on every fill, in basis points of its value, paid by both sides; at least 1 naira. A sink. */
  feeBps: number
  /** Market-maker spread either side of the reference, in basis points. */
  spreadBps: number
  /** Band for limit prices, in basis points either side of the reference. */
  bandBps: number
  maxUnitsPerOrder: number
  maxOpenOrders: number
  /** Naira a player may move into one city's market account per Lagos day. */
  depositPerDay: number
  /** The most naira one city's account may hold, free plus reserved. */
  accountMax: number
  /** Naira of fills per player per Lagos day, all commodities. */
  tradedPerDay: number
  /** Units per commodity per player per Lagos day the market maker will take or give. Bounds the faucet. */
  makerUnitsPerDay: number
  /** Most units of one commodity a player may hold in one city. */
  maxPosition: number
  /** Naira of fills between the same two players per Lagos day. */
  pairPerDay: number
  /** Hours a resting order lives. */
  orderHours: number
}

// ---- stored (db.market) -------------------------------------------------------------------------

export interface MarketAccountRecord {
  cash: number
  holdings: Partial<Record<CommodityId, number>>
  anon: boolean
  day: number
  deposited: number
  traded: number
  makerUnits: Partial<Record<CommodityId, number>>
  /** Naira filled today with each counterparty public id (pair cap). Reset with `day`. */
  pairs: Record<string, number>
  /** Public character name at the last write, for the tape. */
  name: string
}

export interface MarketOrderRecord extends MarketOrder {
  /** Owner's public id. Never sent to another player. */
  by: string
}

export interface MarketFillRecord {
  id: string
  commodity: CommodityId
  price: number
  units: number
  at: number
  /** Public ids, or '' for the market maker. Never sent to players. */
  buyerId: string
  sellerId: string
  buyer: string
  seller: string
}

export interface MarketCollection {
  v: 1
  /** [cityId][publicId] */
  accounts: Record<string, Record<string, MarketAccountRecord>>
  /** [cityId][commodity] resting orders, price-time order is computed, not stored. */
  books: Record<string, Partial<Record<CommodityId, MarketOrderRecord[]>>>
  /** [cityId] most recent fills, newest last, at most MARKET_TAPE. */
  tape: Record<string, MarketFillRecord[]>
  /** Public ids an operator froze: they can cancel and withdraw, not trade. */
  frozen: string[]
  seq: number
}

// ---- the routes (server/routes/market.ts) ------------------------------------------------------
//   GET  /api/market/view?city=                        MarketViewResponse
//   GET  /api/market/history?city=&commodity=          MarketHistoryResponse (computed from the pure reference; nothing stored)
//   POST /api/market/deposit  { cityId, amount, requestId }                              → MarketWriteResponse
//   POST /api/market/withdraw { cityId, amount, requestId }                              → MarketWriteResponse
//   POST /api/market/order    { cityId, commodity, side, price, units, now?, requestId } → MarketWriteResponse (+ fills)
//        now: true = fill what can be filled at once (players first, then the market maker) and drop the rest; never rests.
//   POST /api/market/cancel   { cityId, order, requestId }                               → MarketWriteResponse
//   POST /api/market/anon     { cityId, anon }                                           → MarketWriteResponse
//   POST /api/mod/market/freeze { publicId, frozen }  (operator bearer token)            → { ok, code }
// A well-formed request the rules refuse answers 200 { ok: false, code, reason } and changes nothing.

export interface MarketViewResponse {
  city: string
  quotes: MarketQuote[]
  /** Newest first, at most MARKET_TAPE_VIEW. */
  tape: MarketFill[]
  /** null for a caller without a session. */
  account: MarketAccountView | null
  limits: MarketLimits
}

export interface MarketHistoryResponse {
  city: string
  commodity: CommodityId
  /** [time ms, reference price], oldest first, hourly over the last 7 days. */
  points: [number, number][]
}

export type MarketWriteResponse = { ok: boolean; code: string; reason?: string; duplicate?: true; fills?: MarketFill[]; state?: LifeState } & MarketViewResponse

type MarketRead = HostErrorCode | 'invalid_city' | 'invalid_commodity' | 'market_rate_limited'
export type MarketErrorCode = MarketRead | JsonBodyErrorCode | SessionErrorCode | StorageErrorCode | OnceErrorCode
export type MarketPaid<B = object> = B & { cityId: CityId; requestId: TimedId }
