// What a tapped piece of furniture offers (the item sheet, ItemSheet.vue), as pure data: the things you can do WITH it (its home activities, run by the
// activity engine as `home-<id>` at the spot its kind belongs to), going to its corner when its actions live there (the kitchen's cooking, a bath), and
// what you can do TO it (move, put away, sell for half the list price). Nothing here touches the page.
import { HOME_ACTIVITIES, HOME_SPOTS, KINDS } from '../../../game/content/furniture.ts'
import type { FurnitureDefinition } from '../../../types/content.ts'
import { refund } from './buyModel.ts'

export interface UseAction { activity: string; label: string; icon: string; seconds: number }
export interface ItemActions {
  /** The home spot the piece's actions appear at, and how it is called; null for a piece with no actions (a lamp, a plant). */
  spot: string | null; spotLabel: string | null
  uses: UseAction[]
  /** What selling it gives back. */
  refund: number
}

const SPOT_LABELS: Record<string, string> = { bedroom: 'Bedroom', kitchen: 'Kitchen', bathroom: 'Bathroom', living: HOME_SPOTS.living.label, study: HOME_SPOTS.study.label }

export function itemActions(def: Pick<FurnitureDefinition, 'kind' | 'price'>): ItemActions {
  const spot = KINDS[def.kind]?.spot ?? null
  const uses = HOME_ACTIVITIES.filter((activity) => activity.needs === def.kind).map((activity) => ({ activity: `home-${activity.id}`, label: activity.label, icon: activity.icon ?? '', seconds: activity.duration }))
  return { spot, spotLabel: spot ? SPOT_LABELS[spot] ?? spot : null, uses, refund: refund(def) }
}
