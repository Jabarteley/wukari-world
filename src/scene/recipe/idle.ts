import { watch } from 'vue'
import { useApp } from '../../app/state/app.ts'
import { startNeighborRecipePrefetch } from './prefetch.ts'
import type { RecipePrefetchOptions } from './prefetch.ts'

type Idle = RecipePrefetchOptions['idle']
type Hold = RecipePrefetchOptions['hold']

/** Bind neighboring recipe warming only after the existing idle UI sequence reaches it. */
export function startRecipeIdlePrefetch(idle: Idle, hold: Hold): void {
  const game = useApp().game
  startNeighborRecipePrefetch({
    currentCity: () => game.state.value.estate.city,
    onCityChange: refresh => watch(() => game.state.value.estate.city, refresh, { flush: 'sync' }),
    idle,
    hold,
  })
}
