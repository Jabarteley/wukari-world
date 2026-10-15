// The published power plan: when the light is due off in a district today and tomorrow, as words for the Groceries panel (docs/CITY-TEXTURE.md).
// It is the same list the grid uses (./grid.ts powerCutsOn: seeded by the city, the Lagos day and the district), so the plan told to the player IS what happens, on
// every host, a day ahead. Lives in the lazy conditions pack (vite.config.ts): the first page does not carry it. Kind about NEPA, as Lagos is.
import { formatHour, lagosDayStart, lagosTime } from '../clock.ts'
import { powerCutsOn } from './grid.ts'
import type { Span } from './grid.ts'

export interface ScheduleDay { label: 'Today' | 'Tomorrow'; cuts: Span[] }

/** The planned cuts of this Lagos day and the next that have not yet ended at `now`, in order. */
export function powerSchedule(cityId: string, district: string, now: number): ScheduleDay[] {
  const today = lagosTime(now).day
  return ([['Today', today], ['Tomorrow', today + 1]] as const).map(([label, day]) => ({ label, cuts: powerCutsOn(cityId, district, day).filter((cut) => cut.to > now) }))
}

const hourOf = (ms: number): string => formatHour(lagosTime(ms).minuteOfDay / 60)

/** "Light plan for Yaba. Today: 5PM to 7:30PM. Tomorrow: no cut planned." A cut that runs past midnight says so. */
export function scheduleWords(district: string, plan: readonly ScheduleDay[]): string {
  const part = (day: ScheduleDay): string => `${day.label}: ${day.cuts.length ? day.cuts.map((cut) => `${hourOf(cut.from)} to ${hourOf(cut.to)}${cut.to >= lagosDayStart(lagosTime(cut.from).day + 1) ? ' (past midnight)' : ''}`).join(' and ') : 'no cut planned'}.`
  return `Light plan for ${district}. ${plan.map(part).join(' ')}`
}
