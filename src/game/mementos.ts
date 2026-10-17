import type { LifeState } from '../types/life.ts'
import { cityName } from './cities/registry.ts'
import type { HomeMemento } from '../types/mementos.ts'
import { episodeById } from './content/episodes.ts'
import { PROJECTS } from './content/projects.ts'

/** Finite authored catalogue keeps completed stories and projects visible at home. */
export function homeMementos(state: LifeState | null): HomeMemento[] {
  const rows: HomeMemento[] = []
  for (const receipt of Object.values(state?.episodes?.mementos ?? {})) {
    if (!receipt) continue
    const def = episodeById(receipt.episodeId)
    if (def && def.memento.id === receipt.id) rows.push({ id: receipt.id, title: def.memento.title })
  }
  for (const def of PROJECTS) if (state?.projects?.mementos[def.id]?.occurrence === def.occurrence) rows.push({ id: def.occurrence, title: def.memento })
  for (const receipt of state?.story?.helped ?? []) rows.unshift({ id: `help:${receipt.id}`, title: `Helped in ${cityName(receipt.city) ?? receipt.city}` })
  return rows.slice(0, 8)
}
