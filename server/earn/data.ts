/**
 * OWNER: social
 * The `earn` collection (server/earn/service.ts has the rules), and the small reads the feed needs: a ticket price, who holds a ticket,
 * what a gig's worker was paid. Portable: no Node imports.
 */
import type { EarnAccountStatus, SaleKind, SaleStatus } from '../../src/types/earn.ts'
import type { Db, RouteContext } from '../types.ts'

export interface EarnAccount { acct: string; email: string; status: EarnAccountStatus; at: number; checked?: number }
export interface SaleRecord { id: string; ref: string; kind: SaleKind; item: string; title: string; seller: string; buyer: string; account: string; amount: number; fee: number; at: number; status: SaleStatus; checkout?: string; email?: string; paidAt?: number }
export interface PoolMonth { points: Record<string, number>; closed?: { revenue: number; pot: number; at: number }; due?: Record<string, number>; paid?: Record<string, { amount: number; status: string; at: number }> }
export interface EarnCollection {
  seq: number; refs: Record<string, string>; prices: Record<string, number>; tickets: Record<string, string[]>
  accounts: Record<string, EarnAccount>; sales: Record<string, SaleRecord>; owners: Record<string, { sales: string[] }>
  pool: { day: string; seen: Record<string, 1>; given: Record<string, number>; months: Record<string, PoolMonth>; carried: Record<string, { amount: number; since: string }> }
}
const MAPS = ['accounts', 'sales', 'owners', 'refs', 'prices', 'tickets'] as const
export const earnOf = (ctx: Pick<RouteContext, 'collection'>, db: Db): EarnCollection => {
  const c = ctx.collection(db, 'earn', { seq: 0, refs: {}, prices: {}, tickets: {}, accounts: {}, sales: {}, owners: {}, pool: { day: '', seen: {}, given: {}, months: {}, carried: {} } }) as unknown as EarnCollection
  for (const k of MAPS) if (!c[k] || typeof c[k] !== 'object') (c as unknown as Record<string, unknown>)[k] = {}
  if (typeof c.seq !== 'number') c.seq = 0
  c.pool ??= { day: '', seen: {}, given: {}, months: {}, carried: {} }; c.pool.months ??= {}; c.pool.carried ??= {}; c.pool.seen ??= {}; c.pool.given ??= {}
  return c
}
export const peekEarn = (db: Db): EarnCollection | undefined => (db as Record<string, unknown>)['earn'] as EarnCollection | undefined

/** For the feed's event view: the ticket price and whether the viewer holds a ticket. */
export const ticketOf = (db: Db, event: string, viewer: string | null): { price?: number; ticket?: true } => {
  const c = peekEarn(db), price = c?.prices[event]
  return price ? { price, ...(viewer && c!.tickets[event]?.includes(viewer) ? { ticket: true as const } : {}) } : {}
}
/** For the feed's RSVP: going to a priced event needs a ticket. */
export const needsTicket = (db: Db, event: string, viewer: string): boolean => { const c = peekEarn(db); return Boolean(c?.prices[event]) && !c!.tickets[event]?.includes(viewer) }
/** For the feed's gig view: what the poster paid the worker in real money. */
export const gigPaid = (db: Db, gig: string): number | undefined => { const c = peekEarn(db); return c ? Object.values(c.sales).find((s) => s.kind === 'gig' && s.item === gig && s.status === 'paid')?.amount : undefined }
