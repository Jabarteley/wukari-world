// The seasons' small rules on the page (docs/MINI-GAMES.md): which season to show, the countdown of the mock, and the words around a score. Pure.
import type { JambMockView, JambQuestionView, NyscView, SeasonsView } from '../../../types/minigames.ts'

export type Tab = 'nysc' | 'jamb'

/** What the Seasons app can offer: nothing outside Nigeria; a season that is open or already joined. */
export function tabsFor(seasons: SeasonsView | null): Tab[] {
  if (!seasons?.nigeria) return []
  return [...(seasons.nysc.on || seasons.nysc.joined ? ['nysc' as const] : []), ...(seasons.jamb.on || seasons.jamb.joined ? ['jamb' as const] : [])]
}

export const dayWord = (day: number): string => `Day ${day + 1}`
/** The camp arc as words: "Day 9 of 21" while it runs, "Passing out" after. */
export function campProgress(view: NyscView): string {
  if (!view.joined) return ''
  if (view.passingOut === 'done') return 'You have passed out'
  return view.day >= 21 ? 'Passing out parade' : `Day ${view.day + 1} of 21`
}
/** The duty the person can do today, or null (waiting for tomorrow, or none left in the open stages). */
export function dutyToday(view: NyscView): { stage: string; duty: string } | null {
  if (!view.joined || view.dutyToday) return null
  for (const stage of view.stages) if (stage.open) for (const duty of stage.duties) if (!duty.done) return { stage: stage.id, duty: duty.id }
  return null
}

/** Seconds left on the mock for a server end time, or 0. */
export const mockSeconds = (mock: Pick<JambMockView, 'endsAt'>, now: number): number => (mock.endsAt === null ? 0 : Math.max(0, Math.ceil((mock.endsAt - now) / 1000)))
export const mockClock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
/** The answers to send: one slot per question, in order, null for none. */
export function answersFor(questions: readonly Pick<JambQuestionView, 'id'>[], picked: Readonly<Record<number, number>>): (number | null)[] {
  return questions.map((question) => (Object.hasOwn(picked, question.id) ? picked[question.id]! : null))
}
export const SUBJECT_WORDS = { english: 'English', maths: 'Maths', general: 'General knowledge' } as const
