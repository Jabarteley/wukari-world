// The market haggle's small rules on the page (docs/MINI-GAMES.md): the offers a person can tap, the words for how well a trader knows them and
// how sharp a deal was, and the timeline of the best haggle's replay. Pure: no page, no clock, no network. The server decides every price.
import type { HaggleBest, HaggleGrade, HaggleLine, HaggleMemory, HaggleTalkView } from '../../../types/minigames.ts'

/** Prices are whole multiples of this many naira (the same step as the house sellers, server/house/haggle.ts). */
export const STEP = 10
const down = (value: number): number => Math.floor(value / STEP) * STEP

/** Offers worth a tap: shares of the list price below what is asked now, never at or above the ask, no repeats, lowest first. */
export function offerChoices(list: number, ask: number): number[] {
  const out = new Set<number>()
  for (const share of [0.8, 0.85, 0.9, 0.95]) { const offer = down(list * share); if (offer >= STEP && offer < ask) out.add(offer) }
  const nudge = down(ask - Math.max(STEP, ask * 0.04))
  if (nudge >= STEP && nudge < ask) out.add(nudge)
  return [...out].sort((a, b) => a - b)
}

/** What a typed offer means: whole naira, or null when it is not an offer. Commas and a leading ₦ are allowed. */
export function readTyped(text: string): number | null {
  const digits = text.replace(/[₦,\s]/g, '')
  if (!/^\d{1,7}$/.test(digits)) return null
  const value = Number(digits)
  return value >= STEP ? value : null
}

export const MEMORY_WORDS: Readonly<Record<HaggleMemory, string>> = Object.freeze({
  new: 'A new face',
  again: 'You again today: last prices',
  returning: 'Remembers you',
  regular: 'Your regular trader',
})
export const GRADE_WORDS: Readonly<Record<HaggleGrade, string>> = Object.freeze({
  fair: 'A fair price',
  good: 'A good haggle',
  sharp: 'A sharp haggle',
  floor: 'The trader\'s lowest',
})

/** The seconds left on a held price, or 0. */
export const secondsLeft = (until: number | null, now: number): number => (until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000)))
export const clock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

/** What a talk offers the person to do next. */
export function nextStep(talk: HaggleTalkView | undefined): 'open' | 'offer' | 'buy' | 'final' | 'done' {
  if (!talk) return 'open'
  if (talk.state === 'bought') return 'done'
  if (talk.state === 'deal') return 'buy'
  return talk.state === 'final' ? 'final' : 'offer'
}

/** Money as the page writes it. */
export const naira = (value: number): string => `₦${Math.round(value).toLocaleString('en-NG')}`

/** A line to say what was saved: "You saved ₦360 on the Ankara wax print". */
export const savedLine = (best: Pick<HaggleBest, 'saved' | 'item'>): string => (best.saved > 0 ? `Saved ${naira(best.saved)} on the ${best.item.toLowerCase()}` : `Paid the list price for the ${best.item.toLowerCase()}`)

/** The replay of a talk: each line appears after the one before it, then the card holds. Times in ms from the start. */
export const LINE_MS = 1300, HOLD_MS = 2800
export function timeline(lines: readonly HaggleLine[]): { at: number; line: HaggleLine }[] {
  return lines.map((line, at) => ({ at: 400 + at * LINE_MS, line }))
}
export const replayMs = (lines: readonly HaggleLine[]): number => 400 + lines.length * LINE_MS + HOLD_MS
/** How many lines are showing at a time in the replay. */
export const shownAt = (lines: readonly HaggleLine[], ms: number): number => timeline(lines).filter((entry) => entry.at <= ms).length
