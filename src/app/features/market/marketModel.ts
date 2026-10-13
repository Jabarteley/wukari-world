// What the Allworld Market app says, worked out from what /api/market/ answers. Pure, so it is tested without a
// browser. The rules and every number are the server's (docs/MARKET.md): this file imports no rule and no catalogue,
// only the wire types. The server decides; the figures here (fee, total, "why not") only preview what it will check.
//
// RED LINES (docs/REAL-VALUE.md): this is a simulation with game naira. No copy in this feature says "earn",
// "invest", "investment" or "profit" (market.test.ts reads every string below and the templates for them).
import type { CommodityId, MarketAccountView, MarketFill, MarketLimits, MarketOrder, MarketQuote, MarketSide } from '../../../types/market.ts'
import { money } from '../../ui/format.ts'

export const viewKey = (city: string): string => `market:view:${city}`
export const viewPath = (city: string): string => `/api/market/view?city=${encodeURIComponent(city)}`
export const historyKey = (city: string, commodity: string): string => `market:history:${city}:${commodity}`
export const historyPath = (city: string, commodity: string): string => `/api/market/history?city=${encodeURIComponent(city)}&commodity=${encodeURIComponent(commodity)}`

/** Always on screen, at the top of every tab. */
export const SIMULATION_LINE = 'A simulation with game naira. Nothing here can be bought with real money or turned into real money.'
/** Anonymous label the server puts on the tape (D4). */
export const ANON_LABEL = 'Anonymous trader'

/** 50 → "0.5%", 100 → "1%". */
export const bpsWords = (bps: number): string => `${Math.round(Number(bps) || 0) / 100}%`

/** The "How it works" lines. The fee is the server's (limits.feeBps) once the view is here; until then the launch value. */
export const marketRules = (feeBps = 50): readonly string[] => [
  'Every city has its own market. Prices there follow what is happening in that city, like a fuel scarcity or a festive rush.',
  'A market maker always quotes: it buys a little below the reference price and sells a little above it, so you can always trade a small amount. Other players’ orders are matched first.',
  `Each fill costs a fee of ${bpsWords(feeBps)} of its value on both sides, at least ₦1. The fee is gone from the game.`,
  'Cash and goods stay in the city’s market. Move naira in and out of the market account only in the city you are standing in; to carry goods to another city, travel there and trade there.',
  'There are daily limits on what you can move in and how much you can trade, and a limit on open orders. They reset each Lagos day.',
  'A resting order waits at the price you set until it fills, you cancel it, or it expires. “Buy now” and “Sell now” fill what they can at once and drop the rest.',
  'Everything is game naira in a simulation. Nothing here can be bought with real money, turned into real money or sold outside the game.',
]
export const MARKET_RULES: readonly string[] = marketRules()

/** How a commodity looks when the server sends only its id. The server's own label, unit and icon win when they are sent. */
const LOOKS: Record<CommodityId, { label: string; unit: string; icon: string }> = {
  rice: { label: 'Rice', unit: '10 kg bag', icon: '🍚' },
  garri: { label: 'Garri', unit: 'paint bucket', icon: '🥣' },
  beans: { label: 'Beans', unit: '5 kg bag', icon: '🫘' },
  'palm-oil': { label: 'Palm oil', unit: '5 L keg', icon: '🧴' },
  cement: { label: 'Cement', unit: '50 kg bag', icon: '🧱' },
  petrol: { label: 'Petrol', unit: '10 litres', icon: '⛽' },
}
export interface CommodityLook { label: string; unit: string; icon: string }
export function lookOf(commodity: string, sent?: Partial<CommodityLook>): CommodityLook {
  const known = (LOOKS as Record<string, CommodityLook | undefined>)[commodity]
  const fallback = commodity ? `${commodity.charAt(0).toUpperCase()}${commodity.slice(1).replace(/-/g, ' ')}` : 'Goods'
  return { label: sent?.label || known?.label || fallback, unit: sent?.unit || known?.unit || '', icon: sent?.icon || known?.icon || '📦' }
}

/** A quote's look: the commodity's own label, unit and icon if the server sends them with the quote, else the table above. */
export const quoteLook = (quote: MarketQuote): CommodityLook => lookOf(quote.commodity, quote as unknown as Partial<CommodityLook>)

// ---- prices ------------------------------------------------------------------------------------

/** A change in basis points as a signed percentage: 1250 → "+12.5%", -80 → "−0.8%", 0 → "0.0%". */
export function percent(bps: number): string {
  const value = Math.round(Number(bps) || 0) / 100
  if (value === 0) return '0.0%'
  return `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`
}
export type Tone = 'up' | 'down' | 'flat'
/** Which colour a change takes (a rise is green, a fall is red). A move under 0.05% reads as flat. */
export const toneOf = (bps: number): Tone => (Math.round(Number(bps) || 0) >= 5 ? 'up' : Math.round(Number(bps) || 0) <= -5 ? 'down' : 'flat')

/** Pull a typed price into the allowed band as a whole number. */
export function clampPrice(price: number, band: { min: number; max: number }): number {
  const whole = Math.round(Number(price) || 0)
  return Math.min(band.max, Math.max(band.min, whole))
}
/** The price a "now" order is sent with: the worst the caller accepts. A buyer accepts up to the top of the band, a seller down to the bottom. */
export const nowPrice = (side: MarketSide, band: { min: number; max: number }): number => (side === 'buy' ? band.max : band.min)

// ---- the order ticket ---------------------------------------------------------------------------

/** The fee on a value, as the server charges it: basis points of the value, rounded up, at least ₦1 (none on nothing). */
export function feeOf(value: number, feeBps: number): number {
  if (!(value > 0)) return 0
  const scaled = Math.round(value) * Math.max(0, Math.round(feeBps))
  return Math.max(1, Math.floor((scaled + 9999) / 10000))
}
export interface Ticket { value: number; fee: number; /** What a buyer pays: value + fee. */ buyerTotal: number; /** What a seller gets: value − fee. */ sellerReceives: number; /** The one that applies to the side. */ total: number }
export function ticketOf(side: MarketSide, price: number, units: number, feeBps: number): Ticket {
  const value = Math.max(0, Math.round(price)) * Math.max(0, Math.round(units))
  const fee = feeOf(value, feeBps)
  const buyerTotal = value + fee, sellerReceives = Math.max(0, value - fee)
  return { value, fee, buyerTotal, sellerReceives, total: side === 'buy' ? buyerTotal : sellerReceives }
}

/** What the server holds back for a buy order (src/game/market-model.ts holdFor): the limit price plus its fee, for every unit. A "now" buy is checked against the same sum. */
export const holdNeed = (price: number, units: number, feeBps: number): number => Math.max(0, Math.round(units)) * (Math.round(price) + feeOf(price, feeBps))

export interface TicketInput { side: MarketSide; commodity: CommodityId; units: number; price: number; band: { min: number; max: number } }
/**
 * Why an order cannot be sent, as one sentence ('' when it can). `rests` is false for "now" orders, which never take an
 * order slot. `account.holdings` are the units free to sell (units in open sell orders are `reservedUnits`).
 */
export function ticketWhy(ticket: TicketInput, account: MarketAccountView | null, limits: MarketLimits, offline: string | null, rests = true): string {
  if (offline) return offline
  if (!account) return 'Sign in to trade.'
  if (account.frozen) return 'Your market account is frozen. You can cancel orders and withdraw, not trade.'
  if (!Number.isInteger(ticket.units) || ticket.units < 1 || ticket.units > limits.maxUnitsPerOrder) return `Trade 1 to ${limits.maxUnitsPerOrder} units at a time.`
  if (!Number.isInteger(ticket.price) || ticket.price < ticket.band.min || ticket.price > ticket.band.max) return `The price must be between ${money(ticket.band.min)} and ${money(ticket.band.max)}.`
  if (rests && account.orders.length >= limits.maxOpenOrders) return `You can have ${limits.maxOpenOrders} open orders at most. Cancel one first.`
  const value = ticket.price * ticket.units
  const left = limits.tradedPerDay - account.today.traded
  if (value > left) return `You can trade ${money(limits.tradedPerDay)} a day in one city. ${money(Math.max(0, left))} is left today.`
  const held = account.holdings[ticket.commodity] ?? 0
  if (ticket.side === 'buy') {
    const need = holdNeed(ticket.price, ticket.units, limits.feeBps)
    if (account.cash < need) return `You need ${money(need)} in your market account, fee included; you have ${money(account.cash)}.`
    const wanted = account.orders.reduce((sum, order) => sum + (order.commodity === ticket.commodity && order.side === 'buy' ? remaining(order) : 0), 0)
    if (held + wanted + ticket.units > limits.maxPosition) return `You can hold at most ${limits.maxPosition} of one commodity in a city. You hold or have ordered ${held + wanted}.`
  } else if (held < ticket.units) return held > 0 ? `You have ${held} to sell in this city.` : 'You have none to sell in this city.'
  return ''
}

// ---- cash in and out ------------------------------------------------------------------------------

/** The most naira that may be moved into this city's market account now: the wallet, the day's allowance and the room in the account. */
export function depositMax(walletCash: number, account: Pick<MarketAccountView, 'cash' | 'reservedCash' | 'today'> | null, limits: MarketLimits): number {
  if (!account) return 0
  return Math.max(0, Math.floor(Math.min(walletCash, limits.depositPerDay - account.today.deposited, limits.accountMax - (account.cash + account.reservedCash))))
}
/** The most that may be taken out: the cash that is free (not held by open buy orders). */
export const withdrawMax = (account: Pick<MarketAccountView, 'cash'> | null): number => Math.max(0, Math.floor(account?.cash ?? 0))

export function depositWhy(amount: number, walletCash: number, account: MarketAccountView | null, limits: MarketLimits, offline: string | null): string {
  if (offline) return offline
  if (!account) return 'Sign in to use the market.'
  if (!Number.isInteger(amount) || amount < 1) return 'Enter a whole number of naira.'
  if (amount > walletCash) return `You have ${money(walletCash)} in your wallet.`
  const day = limits.depositPerDay - account.today.deposited
  if (amount > day) return day > 0 ? `You can move ${money(day)} more into this market today.` : 'You have moved in the most you can today. Try again tomorrow.'
  const room = limits.accountMax - (account.cash + account.reservedCash)
  if (amount > room) return room > 0 ? `This market account has room for ${money(room)} more.` : 'This market account is full.'
  return ''
}
export function withdrawWhy(amount: number, account: MarketAccountView | null, offline: string | null): string {
  if (offline) return offline
  if (!account) return 'Sign in to use the market.'
  if (!Number.isInteger(amount) || amount < 1) return 'Enter a whole number of naira.'
  if (amount > account.cash) return account.reservedCash > 0 ? `${money(account.cash)} is free; ${money(account.reservedCash)} is held by open buy orders.` : `You have ${money(account.cash)} here.`
  return ''
}

// ---- the chart -----------------------------------------------------------------------------------

export interface Spark { path: string; min: number; max: number; minLabel: string; maxLabel: string; first: number; last: number; tone: Tone }
/** An SVG path through hourly [time, price] points, scaled to width × height with a small inset. Empty path when there is nothing to draw. */
export function sparkline(points: readonly (readonly [number, number])[], width: number, height: number, inset = 3): Spark {
  const clean = points.filter(([at, price]) => Number.isFinite(at) && Number.isFinite(price))
  if (clean.length === 0) return { path: '', min: 0, max: 0, minLabel: '', maxLabel: '', first: 0, last: 0, tone: 'flat' }
  const prices = clean.map((point) => point[1]), min = Math.min(...prices), max = Math.max(...prices)
  const t0 = clean[0]?.[0] ?? 0, t1 = clean[clean.length - 1]?.[0] ?? 0
  const innerW = Math.max(0, width - 2 * inset), innerH = Math.max(0, height - 2 * inset)
  const x = (at: number): number => (t1 === t0 ? width / 2 : inset + ((at - t0) / (t1 - t0)) * innerW)
  const y = (price: number): number => (max === min ? height / 2 : inset + (1 - (price - min) / (max - min)) * innerH)
  const fix = (n: number): string => String(Math.round(n * 10) / 10)
  const path = clean.map(([at, price], index) => `${index === 0 ? 'M' : 'L'}${fix(x(at))} ${fix(y(price))}`).join('')
  const first = clean[0]?.[1] ?? 0, last = clean[clean.length - 1]?.[1] ?? 0
  return { path, min, max, minLabel: money(min), maxLabel: money(max), first, last, tone: last > first ? 'up' : last < first ? 'down' : 'flat' }
}

// ---- the tape ------------------------------------------------------------------------------------

/** "Ada bought 5 × Rice at ₦1,820 from Market maker". Names are display labels the server sent: shown as text, never as markup. */
export function tapeLine(fill: Pick<MarketFill, 'buyer' | 'seller' | 'units' | 'price' | 'commodity'>, label?: string): string {
  return `${fill.buyer || ANON_LABEL} bought ${fill.units} × ${label ?? lookOf(fill.commodity).label} at ${money(fill.price)} from ${fill.seller || ANON_LABEL}`
}
/** "just now", "5 min ago", "3 h ago", "2 days ago". */
export function agoWords(at: number, now: number): string {
  const gone = Math.max(0, now - at)
  if (gone < 60000) return 'just now'
  if (gone < 3600000) return `${Math.floor(gone / 60000)} min ago`
  if (gone < 86400000) return `${Math.floor(gone / 3600000)} h ago`
  const days = Math.floor(gone / 86400000)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
/** "6 h left", "under an hour left", "expired". */
export function leftWords(at: number, now: number): string {
  const left = at - now
  if (left <= 0) return 'expired'
  if (left >= 3600000) return `${Math.floor(left / 3600000)} h left`
  return 'under an hour left'
}

// ---- the account ---------------------------------------------------------------------------------

/** Units still to fill on a resting order. */
export const remaining = (order: Pick<MarketOrder, 'units' | 'filled'>): number => Math.max(0, order.units - order.filled)
/** "Buy 5 × Rice at ₦1,820 · 2 filled". */
export function orderLine(order: MarketOrder, label?: string): string {
  return `${order.side === 'buy' ? 'Buy' : 'Sell'} ${order.units} × ${label ?? lookOf(order.commodity).label} at ${money(order.price)}${order.filled > 0 ? ` · ${order.filled} filled` : ''}`
}
/** The toast after an order: what the fills came to. */
export function fillsLine(side: MarketSide, fills: readonly Pick<MarketFill, 'units' | 'price'>[] | undefined, label: string, rested: boolean): string {
  const units = (fills ?? []).reduce((sum, fill) => sum + fill.units, 0)
  const value = (fills ?? []).reduce((sum, fill) => sum + fill.units * fill.price, 0)
  if (units > 0) return `${side === 'buy' ? 'Bought' : 'Sold'} ${units} × ${label} for ${money(value)}.`
  return rested ? 'Your order is resting in the market.' : 'Nothing was filled at that price.'
}
/** The quote of a commodity in a view, if the view has it. */
export const quoteOf = (quotes: readonly MarketQuote[] | undefined, commodity: CommodityId | null): MarketQuote | undefined => quotes?.find((quote) => quote.commodity === commodity)
/** The holdings worth a row: units held now or held by open sell orders. */
export function holdingRows(account: MarketAccountView): { commodity: CommodityId; free: number; reserved: number }[] {
  const ids = new Set<string>([...Object.keys(account.holdings), ...Object.keys(account.reservedUnits)])
  return [...ids].map((id) => ({ commodity: id as CommodityId, free: account.holdings[id as CommodityId] ?? 0, reserved: account.reservedUnits[id as CommodityId] ?? 0 })).filter((row) => row.free > 0 || row.reserved > 0)
}

/** Every sentence this model can say that is not built from a server field, for the banned-words check. */
export const MARKET_COPY: readonly string[] = [SIMULATION_LINE, ...MARKET_RULES]
