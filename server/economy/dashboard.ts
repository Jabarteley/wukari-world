/**
 * OWNER: social
 * THE ECONOMY DASHBOARD (docs/NEIGHBOURHOOD.md): what a city's game economy looks like, from records that already exist and nothing new:
 *   the rich list     the civic residents registry, the same rows and the same opt-out as the game's Rich List (a person who left it is not here)
 *   median prices     the Market: the median of the day's trades per commodity, or its reference price while fewer than three traded
 *   the governor      the sitting Governor, the city treasury, the levies and fees that came in this week, what went out
 *   circulation       game naira in wallets (residents' last check-ins), in Market accounts, and in the city treasury
 * Game naira only: nothing here is real money (docs/REAL-VALUE.md). Read-only; nothing is created. Portable: no Node imports.
 */
import { COMMODITIES } from '../../src/game/content/market.ts'
import { quoteOf } from '../../src/game/market-model.ts'
import { lagosTime } from '../../src/game/clock.ts'
import { cityCatalogueEntry, cityName } from '../../src/game/cities/registry.ts'
import { civicTitle } from '../../src/game/cities/terminology.ts'
import { QUORUM } from '../../src/game/content/politics.ts'
import type { EconomyPrice, EconomyView } from '../../src/types/neighbourhood.ts'
import { richListView } from '../civic/residents.ts'
import { BOARD_MIN } from '../civic/boards.ts'
import { governorAt } from '../civic/elections.ts'
import { govOfId, peekPolitics, peekScope } from '../politics/data.ts'
import type { Db } from '../types.ts'

const DAY = 86400000, WEEK = 7 * DAY, TOP = 10, MIN_TRADES = 3
const whole = (v: unknown): number => (typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0)
export const median = (values: readonly number[]): number => {
  if (!values.length) return 0
  const s = [...values].sort((a, b) => a - b), mid = s.length >> 1
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2)
}

export function economyView(db: Db, city: string, now: number, ttlMs: number): EconomyView {
  const record = db.civic?.cities?.[city]
  // The rich list: the game's own function, so the opt-out (`prefs.richList`) is respected the same way.
  const rich = record ? richListView(record, now, ttlMs, db.civic?.prefs, null) : null
  const rows = (list: readonly { rank: number; name: string; amount: number }[] | undefined) => (list ?? []).slice(0, TOP).map((r) => ({ rank: r.rank, name: r.name, amount: r.amount }))
  const live = record ? Object.values(record.residents).filter((r) => now - r.lastSeen <= ttlMs) : []
  // Everyone's wallet counts once there are enough players that a total says nothing about one person; with fewer, a person who left the rich
  // list is left out of it too (the opt-out holds for the total as for the list).
  const prefs = db.civic?.prefs ?? {}
  const counted = Object.entries(record?.residents ?? {}).filter(([id, r]) => now - r.lastSeen <= ttlMs && (live.length >= BOARD_MIN || prefs[id]?.richList !== true))
  const wallets = counted.reduce((n, [, r]) => n + whole(r.cash), 0)

  const market = db.market
  const marketCash = Object.values(market?.accounts?.[city] ?? {}).reduce((n, a) => n + whole(a?.cash), 0)
  const tape = (market?.tape?.[city] ?? []).filter((f) => now - f.at <= DAY)
  const prices: EconomyPrice[] = market?.salt ? COMMODITIES.map((c) => {
    const trades = tape.filter((f) => f.commodity === c.id).map((f) => f.price), ref = quoteOf(city, c.id, now, [], [], market.salt).ref
    return { commodity: c.id, label: c.label, unit: c.unit, median: trades.length >= MIN_TRADES ? median(trades) : ref, reference: ref, trades: trades.length, source: trades.length >= MIN_TRADES ? 'trades' as const : 'reference' as const }
  }) : []

  const scopeId = `city:${city}`, scope = peekScope(peekPolitics(db), scopeId), gov = govOfId(db, scopeId)
  const governor = governorAt(gov.gov ? gov : { gov: { elections: {}, announcements: [] } }, now, QUORUM.city)
  const recent = scope.treasury.ledger.filter((l) => now - l.at <= WEEK)
  const taxWeek = recent.filter((l) => l.kind === 'levy' && l.amount > 0).reduce((n, l) => n + l.amount, 0)
  const feesWeek = recent.filter((l) => (l.kind === 'fee' || l.kind === 'bail') && l.amount > 0).reduce((n, l) => n + l.amount, 0)
  const spentWeek = recent.filter((l) => l.amount < 0).reduce((n, l) => n - l.amount, 0)
  const treasury = whole(scope.treasury.balance)
  const t = scope.term
  return {
    city, cityName: cityCatalogueEntry(city)?.name ?? cityName(city) ?? city, at: now, week: lagosTime(now).week,
    rich: { balances: rows(rich?.balances), earners: rows(rich?.earners), listed: live.length },
    prices,
    government: { title: civicTitle(city), governor: governor?.name ?? null, treasury, taxWeek, feesWeek, spentWeek, term: t ? { income: whole(t.income), salary: whole(t.salary), granted: whole(t.granted) } : null },
    circulation: { wallets, market: marketCash, treasury, total: wallets + marketCash + treasury, players: live.length },
  }
}
