// The wallet's transaction list, worked out from view.wallet.ledger (newest first). Pure, so it is
// tested without a browser. Nothing here changes anything.
import { lagosTime } from '../../../game/clock.ts'
import { dayLabel } from '../money/statementModel.ts'
import { compactMoney } from '../../ui/format.ts'

export interface Line { at: number; amount: number; reason: string; balance: number }

/** The mark beside a line: what the money was for when the reason says so, else a plain in or out. */
export function lineIcon(reason: string, amount: number): string {
  const text = reason.toLowerCase()
  if (/\brent\b/.test(text)) return 'home'
  if (/\bloan\b|repaid|repayment/.test(text)) return 'handshake'
  if (/deposit|saving|interest/.test(text)) return 'lock'
  if (/danfo|bus|ride|fare|keke|okada|ticket|fuel|trip/.test(text)) return 'bus'
  if (/gift|reward|prize|win|bonus/.test(text)) return 'gift'
  if (/food|meal|snack|drink|grocer|restaurant|suya|rice/.test(text)) return 'groceries'
  if (/\bbill\b|fee|fine|tax/.test(text)) return 'note'
  if (/wage|salary|shift|mission|job|pay\b/.test(text) && amount > 0) return 'jobs'
  return amount < 0 ? 'spend' : 'earn'
}

export interface DayGroup { day: number; label: string; in: number; out: number; net: number; lines: (Line & { icon: string })[] }

/** "Today", "Yesterday", else "Mon 5 Oct". */
export function dayHeading(day: number, today: number): string {
  return day === today ? 'Today' : day === today - 1 ? 'Yesterday' : dayLabel(day)
}

/** Lines grouped under their Lagos day, in the order given (newest first), each day with its own in and out. */
export function groupLedger(ledger: readonly Line[], now: number): DayGroup[] {
  const today = lagosTime(now).day, groups: DayGroup[] = []
  for (const line of ledger) {
    const day = lagosTime(line.at).day
    let group = groups[groups.length - 1]
    if (!group || group.day !== day) { group = { day, label: dayHeading(day, today), in: 0, out: 0, net: 0, lines: [] }; groups.push(group) }
    if (line.amount > 0) group.in += line.amount; else group.out += -line.amount
    group.net += line.amount
    group.lines.push({ ...line, icon: lineIcon(line.reason, line.amount) })
  }
  return groups
}

/** Money in and out over the last seven Lagos days (today and the six before it), from the kept lines. */
export function weekFlow(ledger: readonly Line[], now: number): { in: number; out: number; net: number } {
  const first = lagosTime(now).day - 6, flow = { in: 0, out: 0, net: 0 }
  for (const line of ledger) {
    if (lagosTime(line.at).day < first) continue
    if (line.amount > 0) flow.in += line.amount; else flow.out += -line.amount
    flow.net += line.amount
  }
  return flow
}

/** The loan bar: whole percent repaid, kept inside 0–100. */
export const percentOf = (part: number, whole: number): number => (whole > 0 ? Math.max(0, Math.min(100, Math.round((part / whole) * 100))) : 0)

/** The line under the day heading: "+₦1.2k · −₦300". */
export const dayTotals = (group: Pick<DayGroup, 'in' | 'out'>): string =>
  [group.in > 0 ? `+${compactMoney(group.in)}` : '', group.out > 0 ? `−${compactMoney(group.out)}` : ''].filter(Boolean).join(' · ')

