// The words of the world event on the page (pure): the chip's line, the countdown, the goal's how-to. Tested in eventWords.test.ts.
import { lagosTime } from '../../../game/clock.ts'
import type { WorldEventPublic } from '../../../types/world-events.ts'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const pad = (n: number): string => String(n).padStart(2, '0')
/** "Sat 20:00" in Lagos time. */
export const whenWords = (at: number): string => { const t = lagosTime(at); return `${DAYS[t.weekday]} ${pad(t.hour)}:${pad(t.minute)}` }
/** "in 1h 05m", "in 4 min", "now". */
export function untilWords(ms: number): string {
  if (ms <= 0) return 'now'
  const minutes = Math.ceil(ms / 60000)
  if (minutes < 60) return `in ${minutes} min`
  const hours = Math.floor(minutes / 60)
  return hours >= 24 ? `in ${Math.floor(hours / 24)}d ${hours % 24}h` : `in ${hours}h ${pad(minutes % 60)}m`
}
export function chipWords(event: Pick<WorldEventPublic, 'phase' | 'startsAt' | 'cityName' | 'percent' | 'done' | 'drop'>, now: number): string {
  if (event.phase === 'announced') return `World event ${whenWords(event.startsAt)} · ${event.cityName}`
  if (event.phase === 'warmup') return event.drop ? `Drop in the Square! · starts ${untilWords(event.startsAt - now)}` : `Warm-up · starts ${untilWords(event.startsAt - now)}`
  if (event.phase === 'live') return `${event.cityName} · ${event.percent}%`
  return event.done ? `${event.cityName} did it!` : `${event.cityName} · ${event.percent}%`
}
/** How a person helps, by the goal. Venue ids are shown as names by the caller. */
export function howWords(event: Pick<WorldEventPublic, 'goal' | 'cityName'>, venues: string[]): string {
  if (event.goal === 'deliver') return `Pick up a load at ${venues[0] ?? 'the first place'} in ${event.cityName}, carry it to ${venues[1] ?? 'the second'} and put it down.`
  if (event.goal === 'answer') return 'Answer the questions below. One try each; every right answer moves the bar.'
  return venues.length ? `Walk to ${venues.join(', ')} in ${event.cityName}. Each place counts once for you.` : `Walk to places all over ${event.cityName}. Each place counts once for you.`
}
