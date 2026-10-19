// What the dashboard works out from the server's answers, without a screen: the series of the tiles and charts, the new accounts of each day,
// the colour a size or a fill deserves, and who is "returning". Pure, so it is tested without a browser.
import { change } from './charts/chartModel.ts'

export interface DayRow { day: number; date: string; new: number; seen: number; sessions: number; funnel: Record<string, number>; daily: Record<string, number | null> | null }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "6 Oct" from "2026-10-06". */
export const shortDate = (date: string): string => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ''}`
/** One number of every day (a gap is null), for a chart. */
export const series = (days: readonly DayRow[], pick: (row: DayRow) => number | null): (number | null)[] => days.map(pick)
export const field = (name: string) => (row: DayRow): number | null => row.daily?.[name] ?? null
/** New accounts a day: the growth of the account count between two measured days (null when either day was not measured, or an account was deleted). */
export function accountsPerDay(days: readonly DayRow[]): (number | null)[] {
  return days.map((row, index) => {
    const now = row.daily?.['accounts'], before = days[index - 1]?.daily?.['accounts']
    return typeof now === 'number' && typeof before === 'number' && now >= before ? now - before : null
  })
}
/** The last `n` entries. */
export const lastDays = <T>(list: readonly T[], n: number): T[] => list.slice(Math.max(0, list.length - n))
export function tileChange(values: readonly (number | null)[]): string | null {
  const now = values[values.length - 1], before = values[values.length - 2]
  return typeof now === 'number' ? change(now, typeof before === 'number' ? before : null)?.word ?? null : null
}
export type Tone = 'ok' | 'warn' | 'bad'
/** The colour of a fill: amber from 70 percent of the cap, red from 90. */
export const fillTone = (used: number, most: number): Tone => (most > 0 && used / most >= 0.9 ? 'bad' : most > 0 && used / most >= 0.7 ? 'warn' : 'ok')
/** The colour of a stored collection: docs/CAPACITY.md puts the practical limit of a whole-collection store near 10 MB, so amber from 2 MB and red from 8 MB. */
export const sizeTone = (chars: number): Tone => (chars >= 8_000_000 ? 'bad' : chars >= 2_000_000 ? 'warn' : 'ok')
/** Players seen in the last 7 days that did not begin in them: the lives followed minus the new ones. An approximation (the new count is by the day a life was first seen). */
export const returning = (seen7: number, new7: number): number => Math.max(0, seen7 - new7)
export const percent = (part: number, whole: number): number => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/** The return split the history answer carries (server/growth/metrics.ts returnSplit), as the dashboard reads it. */
export interface ReturnCellRow { lives: number; returned: number; rate: number | null }
export interface ReturnRowRead { d1: ReturnCellRow; d7: ReturnCellRow; d30: ReturnCellRow }
export interface ReturnsRead { bySource: (ReturnRowRead & { source: string; medium: string; campaign: string })[]; byFriend: { yes: ReturnRowRead; no: ReturnRowRead }; byClan?: { yes: ReturnRowRead; no: ReturnRowRead }; byAgent?: { yes: ReturnRowRead; no: ReturnRowRead }; note: string }
/** One cell: "42% (12 of 29)", or "too early" when no life is old enough yet. */
export const returnCell = (cell: ReturnCellRow): string => (cell.rate === null ? 'too early' : `${cell.rate}% (${cell.returned} of ${cell.lives})`)
/** "tiktok / paid / test1": a campaign as the owner wrote it. */
export const sourceLabel = (row: { source: string; medium: string; campaign: string }): string => `${row.source} / ${row.medium} / ${row.campaign}`

/** Activated / landed for one campaign, as the history answer carries it (server/growth/metrics.ts activationReport). */
export interface ActivationRead { source: string; medium: string; campaign: string; landed: number; activated: number; rate: number | null }
/** One campaign's two advert measures, as words for a table row. */
export interface CampaignRow { label: string; landed: number; activated: number; activation: string; observed: number; day7: string }
/** Fewer lives than this and a rate is a hint, not a result. */
export const SMALL_SAMPLE = 20
/** "3.5% (12 of 340 landed)", or why there is no rate. */
export const activationCell = (row: Pick<ActivationRead, 'landed' | 'activated' | 'rate'> | undefined): string => {
  if (!row || row.rate === null) return row && row.activated > 0 ? `${row.activated} activated, no landings counted` : 'no landings yet'
  return `${row.rate}% (${row.activated} of ${row.landed} landed)${row.landed < SMALL_SAMPLE ? ', small sample' : ''}`
}
/** "42% (12 of 29)", or "not yet observed" while no life of the campaign has reached its day 7 (a cohort needs eight days). */
export const day7Cell = (cell: ReturnCellRow | undefined): string => {
  if (!cell || cell.rate === null) return 'not yet observed'
  return `${cell.rate}% (${cell.returned} of ${cell.lives})${cell.lives < SMALL_SAMPLE ? ', small sample' : ''}`
}
/** The campaigns that landed or were followed to day 7, most landings first, with activation and day-7 return side by side. */
export function campaignRows(activation: readonly ActivationRead[] | undefined, returns: Pick<ReturnsRead, 'bySource'> | undefined): CampaignRow[] {
  const rows = new Map<string, { label: string; act?: ActivationRead; d7?: ReturnCellRow }>()
  const at = (row: { source: string; medium: string; campaign: string }) => {
    const key = sourceLabel(row)
    let found = rows.get(key)
    if (!found) rows.set(key, found = { label: key })
    return found
  }
  for (const row of activation ?? []) at(row).act = row
  for (const row of returns?.bySource ?? []) at(row).d7 = row.d7
  return [...rows.values()].map((row): CampaignRow => ({ label: row.label, landed: row.act?.landed ?? 0, activated: row.act?.activated ?? 0, activation: activationCell(row.act), observed: row.d7?.lives ?? 0, day7: day7Cell(row.d7) }))
    .sort((a, b) => b.landed - a.landed || b.observed - a.observed || a.label.localeCompare(b.label))
}

/** Today against yesterday as a chip: the direction, the change in words, and whether up is good for this number. */
export interface Trend { dir: 'up' | 'down' | 'flat' | 'none'; text: string }
export function trendOf(now: number, before: number | null | undefined): Trend {
  if (typeof before !== 'number' || !Number.isFinite(before)) return { dir: 'none', text: 'no day before to compare' }
  const diff = now - before
  if (diff === 0) return { dir: 'flat', text: 'same as yesterday' }
  const share = before > 0 ? ` (${diff > 0 ? '+' : '−'}${Math.round((Math.abs(diff) / before) * 100)}%)` : ''
  return { dir: diff > 0 ? 'up' : 'down', text: `${diff > 0 ? '+' : '−'}${Math.abs(diff).toLocaleString('en-GB')}${share} vs yesterday` }
}
/** Something on the dashboard that wants an admin's attention, with where to go about it. */
export interface Attention { id: string; tone: 'warn' | 'bad' | 'info'; text: string; action: string; view: 'moderation' | 'players' | 'world'; filter?: string }
export function attentionOf(input: { reports: number; problems: number; sessions: { held: number; most: number }; sockets: { open: number; most: number }; tests: number; emailOff: boolean; pushOff: boolean }): Attention[] {
  const out: Attention[] = []
  if (input.reports > 0) out.push({ id: 'reports', tone: 'warn', text: `${input.reports} player report${input.reports === 1 ? '' : 's'} waiting for a decision`, action: 'Open moderation', view: 'moderation' })
  if (input.problems > 0) out.push({ id: 'problems', tone: 'info', text: `${input.problems} problem report${input.problems === 1 ? '' : 's'} from players still open`, action: 'Open moderation', view: 'moderation' })
  for (const [id, label, used, most] of [['sessions', 'Device sessions', input.sessions.held, input.sessions.most], ['sockets', 'Live connections', input.sockets.open, input.sockets.most]] as const) {
    const tone = fillTone(used, most)
    if (tone !== 'ok') out.push({ id, tone: tone === 'bad' ? 'bad' : 'warn', text: `${label} are ${percent(used, most)}% full (${used.toLocaleString('en-GB')} of ${most.toLocaleString('en-GB')})`, action: 'See World tools', view: 'world' })
  }
  if (input.tests > 0) out.push({ id: 'tests', tone: 'info', text: `${input.tests.toLocaleString('en-GB')} test session${input.tests === 1 ? '' : 's'} from release checks can be removed`, action: 'Review test sessions', view: 'players', filter: 'test' })
  if (input.emailOff) out.push({ id: 'email', tone: 'info', text: 'E-mail sending is switched off', action: 'Open World tools', view: 'world' })
  if (input.pushOff) out.push({ id: 'push', tone: 'info', text: 'Push notifications are switched off', action: 'Open World tools', view: 'world' })
  return out
}
