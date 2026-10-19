/**
 * "What did you get": the card at the end of character creation (docs/SHARE-LOOPS.md). The starting job, the home, the start cash and
 * a light title from the birth lottery, sized for WhatsApp Status. Pure: the words only; ./loopPaint.ts draws them.
 *
 * FUN, NEVER MOCKING. A small start is told as a hustle with a future (the game's own LAPO Baby and Street Smart taglines say the same),
 * never as poverty. No title talks down to anyone; a test holds every title to that (startCard.test.ts).
 */
import { gameNaira, loopText, plain, seedOf } from './loopsModel.ts'
import type { LotteryId } from '../../../types/life.ts'

/** Titles by birth lottery. The same name always gets the same one. */
export const START_TITLES: Readonly<Record<LotteryId | 'none', readonly string[]>> = Object.freeze({
  'lapo-baby': ['Self-made, loading…', 'Hustle on full charge', 'Future landlord, starting today', 'CEO of my own come-up'],
  'street-smart': ['Raised by the road', 'Traffic cannot shake me', 'Sharp like a Lagos conductor', 'Street-tested, city-approved'],
  'civil-servant': ['Steady like Friday jollof', 'Calm, sorted and on time', 'Pension energy, big dreams', 'Quietly going places'],
  ajebutter: ['Born with the generator already running', 'Soft life, certified', 'Ajebutter, but humble (small)', 'Air-conditioned from day one'],
  none: ['Fresh in the city, big plans', 'New in town, watch this space'],
})

export interface StartFacts {
  name: string
  /** City name ("Lagos"). */
  city: string
  /** The local government or district of the home ("Yaba"), or ''. */
  area: string
  lottery: LotteryId | null
  /** The lottery's own label ("LAPO Baby"), or ''. */
  lotteryLabel: string
  /** Game naira in hand at the start, or null when not known yet. */
  cash: number | null
  /** The job held, or null (most lives start without one). */
  job: string | null
  /** The dream's label, or ''. */
  dream: string
}

export interface StartCard {
  kicker: string
  name: string
  title: string
  rows: { label: string; value: string }[]
  foot: string
}

export function startTitle(lottery: LotteryId | null, name: string): string {
  const list = START_TITLES[lottery ?? 'none'] ?? START_TITLES.none
  return list[seedOf(plain(name, 40).toLowerCase()) % list.length] ?? list[0]!
}

export function startCard(facts: StartFacts): StartCard {
  const name = plain(facts.name, 28) || 'A new resident'
  const place = [plain(facts.area, 28), plain(facts.city, 28)].filter(Boolean).join(', ')
  const rows = [
    { label: 'Job', value: facts.job ? plain(facts.job, 32) : 'Open to offers' },
    { label: 'Home', value: place ? `Starter house in ${place}` : 'A starter house of my own' },
    { label: 'Money', value: facts.cash === null ? 'Rolling…' : `${gameNaira(facts.cash)} game naira` },
    ...(facts.lotteryLabel ? [{ label: 'Born', value: plain(facts.lotteryLabel, 32) }] : []),
    ...(facts.dream ? [{ label: 'Dream', value: plain(facts.dream, 32) }] : []),
  ]
  return { kicker: 'WHAT I GOT IN ALLWORLD', name, title: startTitle(facts.lottery, name), rows, foot: 'Your turn: what do you get?' }
}

export function startText(card: StartCard, link: string): string {
  return loopText([`I just started a life in Allworld: “${card.title}”.`, ...card.rows.slice(0, 3).map((row) => `${row.label}: ${row.value}`), 'What do you get?'], link)
}
