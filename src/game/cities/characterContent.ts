import { DREAMS, LOTTERY } from '../content/traits.ts'
import { contentFor } from './runtime.ts'
import type { DreamId, LotteryId } from '../../types/life.ts'
import type { DreamDefinition } from '../../types/content.ts'
import { restateNaira } from '../price-levels.ts'

/** `level`: the price level the life's own money is in (docs/PRICE-LEVELS.md "Starting money"); amounts written in the words are restated at it. 1 = as written. */
export const dreamFor = (cityId: string, id: DreamId, level = 1): DreamDefinition => {
  const dream = { ...DREAMS[id], ...contentFor(cityId).dreamWording?.[id] }
  return level === 1 ? dream : { ...dream, goal: restateNaira(dream.goal, level), measure: restateNaira(dream.measure, level) }
}
export const dreamsFor = (cityId: string, level = 1): DreamDefinition[] => Object.values(DREAMS).map(dream => dreamFor(cityId, dream.id, level))
export const lotteryBulletsFor = (cityId: string, id: LotteryId, level = 1): string[] =>
  (contentFor(cityId).lotteryWording?.[id]?.bullets ?? LOTTERY[id].bullets).map(line => restateNaira(line, level))
