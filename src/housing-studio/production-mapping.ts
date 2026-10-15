import type { LifeState } from '../types/life.ts'
import { HOUSE_TIERS } from '../game/content/world.ts'
import type { HousingRecipe } from './fixtures.ts'

const SUPPORTED_CITIES = new Set(['lagos', 'abuja'])
const TIERS = {
  bq: { grid: 8, id: 'two-room-apartment', label: 'Two-room apartment' },
  bungalow: { grid: 10, id: 'two-bedroom-apartment', label: 'Two-bedroom apartment' },
  duplex: { grid: 12, id: 'family-duplex', label: 'Family duplex' },
  villa: { grid: 14, id: 'courtyard-mansion', label: 'Courtyard mansion' },
} as const

export type ProductionHousingTier = keyof typeof TIERS

/**
 * A render-only view of the authoritative saved home. Fixture furniture never
 * enters this path and no returned value is written back to the Life state.
 */
export function productionHousingOf(state: LifeState): HousingRecipe | null {
  if (state.estate.living !== 'own' || !SUPPORTED_CITIES.has(state.estate.city)) return null
  if (Array.isArray(state.stories?.running?.content?.items)) return null
  const tier = TIERS[state.estate.tier as ProductionHousingTier]
  const grid = HOUSE_TIERS[state.estate.tier]?.grid
  if (!tier || grid !== tier.grid) return null
  return {
    id: `${state.estate.city}-${tier.id}`,
    label: tier.label,
    city: state.estate.city,
    grid,
    style: state.estate.style,
    items: [...state.home.items],
    description: '',
  }
}
