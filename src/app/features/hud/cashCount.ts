// The top bar's cash pill, the parts it needs only after the first paint (fetched the first time the balance changes, or when it is long): the count-up and the short form.
// Kept out of the startup download; the bank's ledger imports the short form from here too (it is a lazy panel).

/** A short amount for tight spaces: ₦850, ₦1.2k, ₦34k, ₦3.4m, ₦1.1b. Under ₦1,000 it is the exact amount. Rounded down, never up, so a short figure never claims more than the exact one. */
import { compactMoney as cityCompact } from '../../../game/money-feed.ts'
export function compactMoney(value: unknown): string {
  const own = cityCompact(value)
  if (own !== null) return own
  const n = Math.round(Number(value) || 0), abs = Math.abs(n), sign = n < 0 ? '−' : ''
  const tier = abs >= 1e9 ? 3 : abs >= 1e6 ? 2 : abs >= 1e3 ? 1 : 0, scaled = abs / 1000 ** tier
  return `${sign}₦${tier ? (scaled < 10 ? Math.floor(scaled * 10) / 10 : Math.floor(scaled)) : abs}${'kmb'.charAt(tier - 1)}`
}
/** The balance a count-up shows `progress` (0–1) of the way from `from` to `to`: eased out, whole naira, exact at the end. */
export function tweenCash(from: number, to: number, progress: number): number {
  if (!(progress < 1)) return to
  const eased = 1 - (1 - Math.max(0, progress)) ** 3
  return Math.round(from + (to - from) * eased)
}
/** How long the balance takes to count to its new value. */
export const COUNT_MS = 650
/** The pill's text: the exact balance, or the short form once it is too long for the bar (₦12.3m). */
export const cashText = (cash: number, exact: (value: number) => string): string => (Math.abs(cash) >= 10_000_000 ? compactMoney(cash) : exact(cash))
/** Counts the balance from `from` to `to`, calling `set` each frame; returns the function that stops it. */
export function countCash(from: number, to: number, set: (value: number) => void): () => void {
  let frame = 0
  const began = performance.now()
  const step = (now: number): void => { const value = tweenCash(from, to, (now - began) / COUNT_MS); set(value); frame = value === to ? 0 : requestAnimationFrame(step) }
  frame = requestAnimationFrame(step)
  return () => { if (frame) cancelAnimationFrame(frame); frame = 0 }
}
