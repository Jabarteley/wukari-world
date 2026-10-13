// Display formatting shared by the Vue components. Pure, so it is tested without a browser.

/** Whole naira with the sign and thousands separators: ₦5,000. */
export const money = (value: unknown): string => `₦${Math.round(Number(value) || 0).toLocaleString('en-NG')}`
/** A short amount for tight spaces: ₦850, ₦1.2k, ₦34k, ₦3.4m, ₦1.1b. Under ₦1,000 it is the exact amount. */
export function compactMoney(value: unknown): string {
  const n = Math.round(Number(value) || 0), abs = Math.abs(n), sign = n < 0 ? '−' : ''
  if (abs < 1000) return `${sign}₦${abs}`
  const [div, unit] = abs >= 1e9 ? [1e9, 'b'] : abs >= 1e6 ? [1e6, 'm'] : [1e3, 'k']
  const scaled = abs / div
  // Rounded down, never up, so a short figure never claims more than the exact one.
  const text = scaled < 10 ? (Math.floor(scaled * 10) / 10).toFixed(1).replace(/\.0$/, '') : String(Math.floor(scaled))
  return `${sign}₦${text}${unit}`
}
/** A signed amount for a ledger line: +₦1,200 or −₦300 (a real minus sign). */
export const signedMoney = (amount: number): string => `${amount < 0 ? '−' : '+'}${money(Math.abs(amount))}`
export const cap = (id: string): string => (id ? `${id.charAt(0).toUpperCase()}${id.slice(1)}` : '')
/** "1 item", "3 items". */
export const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`
/** A stable hue (0–359) from an id, so one person keeps one avatar colour. */
export function hueOf(seed: unknown): number {
  let hash = 0
  for (const char of String(seed ?? '')) hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360
  return hash
}
/** The first letter of a name for an avatar, or '?'. */
export const initialOf = (name: unknown): string => ([...String(name ?? '').trim()][0] ?? '?').toUpperCase()
