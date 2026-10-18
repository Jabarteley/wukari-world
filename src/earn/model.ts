// OWNER: social
// EARN (docs/EARN.md): real money for players, with Allworld never holding it. Two ways, both through Bachs:
//   PAID BY THE BUYER  an event ticket or a finished gig is a direct charge on the earner's own Bachs account; the money lands in their
//                      balance and Bachs pays it to their bank; Allworld's fee is taken by Bachs at the moment of payment.
//   CREATOR POOL       a share of what Allworld really earned in a month (business boosts) is split by real engagement with public posts,
//                      held 30 days, and sent by an admin as a Bachs transfer to each creator's account.
// Game money is never part of either. Shared by the server and the Earn app.

export const EARN = Object.freeze({
  ticket: { min: 200, max: 200_000, fee: 5 },
  gig: { min: 500, max: 500_000, fee: 10 },
  /** Orders a buyer may leave waiting for payment at once. */
  pendingMax: 5,
  pool: {
    /** Percent of the month's revenue shared. */
    share: 30,
    /** Below this a creator's share is carried to the next month. */
    threshold: 10_000,
    holdDays: 30,
    /** No creator takes more than this percent of a month's pool. */
    capShare: 10,
    /** Points a creator needs in a month to share in it. */
    minPoints: 20,
    /** A person gives one creator at most one point a day, and at most this many points a day. */
    giverPerDay: 20,
    /** A carried share expires after this many months. */
    carryMonths: 12,
  },
})

export const feeOf = (amount: number, percent: number): number => Math.max(0, Math.min(amount - 1, Math.round((amount * percent) / 100)))
export const monthOf = (t: number): string => new Date(t).toISOString().slice(0, 7)
export const dayOf = (t: number): string => new Date(t).toISOString().slice(0, 10)
/** The first millisecond after a 'YYYY-MM' month (UTC). */
export function monthEnd(month: string): number { const [y, m] = month.split('-').map(Number); return Date.UTC(y!, m!, 1) }
export const naira = (n: number): string => `₦${Math.round(n).toLocaleString('en-NG')}`

/**
 * A month's pool by points: creators under the minimum get nothing; the rest share in proportion, each capped. What the cap or rounding
 * leaves stays with Allworld (it is never someone else's money).
 */
export function poolSplit(pot: number, points: Readonly<Record<string, number>>, opts: { minPoints: number; capShare: number }): Record<string, number> {
  const eligible = Object.entries(points).filter(([, p]) => p >= opts.minPoints)
  const total = eligible.reduce((n, [, p]) => n + p, 0)
  if (!total || pot <= 0) return {}
  const cap = Math.floor((pot * opts.capShare) / 100), out: Record<string, number> = {}
  for (const [id, p] of eligible) { const share = Math.min(cap, Math.floor((pot * p) / total)); if (share > 0) out[id] = share }
  return out
}
