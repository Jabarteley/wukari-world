/**
 * OWNER: market
 * Account privacy hooks for db.market (server/accounts/service.ts calls them inside the deletion and export transactions, for every
 * public id the account owns). Tolerant of damaged records, and never replaces the collection.
 *
 * DELETION removes: the player's market account in every city (its naira and goods go with it), their resting orders in every book,
 * their public id from every other account's pair counters and from the frozen list. The tape keeps what it shows to everyone —
 * commodity, price, units, time — but a fill of theirs is relabelled "Former trader" and its public id is cleared, so nothing on
 * the tape can be tied to the person any more.
 * EXPORT gives back what is stored about them: accounts, open orders and their own fills (with the label of the other side).
 */
import { COMMODITY_IDS } from '../../src/game/content/market.ts'
import type { Db } from '../types.ts'

export const FORMER_TRADER = 'Former trader'
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

export function eraseMarket(db: Db, publicIds: readonly string[]): void {
  const ids = new Set(publicIds.filter((id) => id !== '')), market: unknown = db.market
  if (!ids.size || !record(market)) return
  if (record(market.accounts)) {
    for (const city of Object.keys(market.accounts)) {
      const accounts = market.accounts[city]
      if (!record(accounts)) continue
      for (const id of ids) delete accounts[id]
      // Today's counters of the others name who they traded with.
      for (const other of Object.values(accounts)) if (record(other) && record(other.pairs)) for (const id of ids) delete other.pairs[id]
    }
  }
  if (record(market.books)) {
    for (const city of Object.keys(market.books)) {
      const books = market.books[city]
      if (!record(books)) continue
      for (const commodity of Object.keys(books)) {
        const book = books[commodity]
        if (!Array.isArray(book)) continue
        for (let index = book.length - 1; index >= 0; index--) { const order: unknown = book[index]; if (record(order) && typeof order.by === 'string' && ids.has(order.by)) book.splice(index, 1) }
      }
    }
  }
  if (record(market.tape)) {
    for (const city of Object.keys(market.tape)) {
      const tape = market.tape[city]
      if (!Array.isArray(tape)) continue
      for (const fill of tape as unknown[]) {
        if (!record(fill)) continue
        if (typeof fill.buyerId === 'string' && ids.has(fill.buyerId)) { fill.buyerId = ''; fill.buyer = FORMER_TRADER }
        if (typeof fill.sellerId === 'string' && ids.has(fill.sellerId)) { fill.sellerId = ''; fill.seller = FORMER_TRADER }
      }
    }
  }
  if (Array.isArray(market.frozen)) market.frozen = market.frozen.filter((id) => typeof id !== 'string' || !ids.has(id))
}

/** Everything db.market holds about these public ids. */
export function exportMarket(db: Db, publicIds: readonly string[]) {
  const ids = new Set(publicIds.filter((id) => id !== '')), market: unknown = db.market
  const result: { accounts: object[]; orders: object[]; fills: object[]; frozen: boolean } = { accounts: [], orders: [], fills: [], frozen: false }
  if (!ids.size || !record(market)) return result
  if (record(market.accounts)) {
    for (const [city, accounts] of Object.entries(market.accounts)) {
      if (!record(accounts)) continue
      for (const id of ids) {
        const account = accounts[id]
        if (!record(account)) continue
        result.accounts.push({ city, character: id, cash: account.cash, holdings: structuredClone(account.holdings), anonymousOnTape: account.anon === true, name: account.name, day: account.day, depositedToday: account.deposited, tradedToday: account.traded, makerUnitsToday: structuredClone(account.makerUnits) })
      }
    }
  }
  if (record(market.books)) {
    for (const [city, books] of Object.entries(market.books)) {
      if (!record(books)) continue
      for (const commodity of COMMODITY_IDS) {
        const book = books[commodity]
        if (!Array.isArray(book)) continue
        for (const order of book as unknown[]) if (record(order) && typeof order.by === 'string' && ids.has(order.by)) result.orders.push({ city, character: order.by, id: order.id, commodity: order.commodity, side: order.side, price: order.price, units: order.units, filled: order.filled, at: order.at, expiresAt: order.expiresAt, heldNaira: order.held })
      }
    }
  }
  if (record(market.tape)) {
    for (const [city, tape] of Object.entries(market.tape)) {
      if (!Array.isArray(tape)) continue
      for (const fill of tape as unknown[]) {
        if (!record(fill)) continue
        const bought = typeof fill.buyerId === 'string' && ids.has(fill.buyerId), sold = typeof fill.sellerId === 'string' && ids.has(fill.sellerId)
        if (bought || sold) result.fills.push({ city, character: bought ? fill.buyerId : fill.sellerId, side: bought ? 'buy' : 'sell', commodity: fill.commodity, price: fill.price, units: fill.units, at: fill.at, otherSide: bought ? fill.seller : fill.buyer })
      }
    }
  }
  result.frozen = Array.isArray(market.frozen) && market.frozen.some((id) => typeof id === 'string' && ids.has(id))
  return result
}
