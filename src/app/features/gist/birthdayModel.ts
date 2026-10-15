// Opt-in birthdays on the phone (docs/SMALLER-FEATURES.md): reading GET /api/world/birthday and the words for the card. Pure.
export interface BirthdayAnswer { mine: { m: number; d: number; share: boolean } | null; today: boolean; friends: string[] }
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const
const DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
/** The days a month offers (29 February included). */
export const daysIn = (month: number): number[] => Array.from({ length: DAYS[month - 1] ?? 0 }, (_, i) => i + 1)
export const dateWords = (m: number, d: number): string => `${d} ${MONTHS[m - 1] ?? ''}`.trim()

export function readBirthday(answer: unknown): BirthdayAnswer | null {
  if (typeof answer !== 'object' || answer === null) return null
  const { mine, today, friends } = answer as Record<string, unknown>
  const own = typeof mine === 'object' && mine !== null ? mine as Record<string, unknown> : null
  const valid = own && Number.isInteger(own.m) && Number.isInteger(own.d) && (own.m as number) >= 1 && (own.m as number) <= 12 && daysIn(own.m as number).includes(own.d as number)
  return {
    mine: valid ? { m: own.m as number, d: own.d as number, share: own.share === true } : null,
    today: today === true && Boolean(valid),
    friends: Array.isArray(friends) ? friends.filter((name): name is string => typeof name === 'string' && name.length > 0).map((name) => name.slice(0, 24)).slice(0, 10) : [],
  }
}
export const greeting = (view: BirthdayAnswer): string => (view.today ? 'Happy birthday! 🎂 The whole city is glad you are here.' : '')
/** "It is Ada's birthday today.", "It is the birthday of Ada, Bola and Chi today." '' for nobody. */
export function friendsLine(names: readonly string[]): string {
  if (!names.length) return ''
  const list = names.length === 1 ? names[0]! : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return `${names.length === 1 ? `It is ${list}'s birthday` : `It is the birthday of ${list}`} today. Say happy birthday in Messages.`
}
