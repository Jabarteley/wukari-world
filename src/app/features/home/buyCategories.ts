// The tabs of Buy mode. Only that screen draws them (the rules engine reads an item's `category` id alone), so they are not part of
// the engine's chunk with the catalogue in src/game/content/furniture.ts.
import type { FurnitureCategory } from '../../../types/content.ts'

export const CATEGORIES: FurnitureCategory[] = [
  { id: 'sleep', label: 'Sleep', icon: '🛏️' },
  { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
  { id: 'bath', label: 'Bath', icon: '🪣' },
  { id: 'comfort', label: 'Comfort', icon: '🛋️' },
  { id: 'fun', label: 'Fun', icon: '📻' },
  { id: 'skills', label: 'Skills', icon: '📚' },
  { id: 'light', label: 'Light', icon: '💡' },
  { id: 'decor', label: 'Decor', icon: '🪴' },
  { id: 'pets', label: 'Pets', icon: '🐕', beta: true },
]
