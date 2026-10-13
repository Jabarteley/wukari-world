// What the first page (src/app/bootstrap.ts) and the idle preloader (src/app/state/idlePreload.ts) ask of the city registry. They reach
// it with import(), so it is a module of its own: the bundle then keeps this small namespace instead of every export of registry.ts
// and lifeCities.ts (test hooks included), which stay tree-shaken.
import { cityIndexWaitFor } from './registry.ts'
import { lifeCityCandidates } from './lifeCities.ts'

export { isCityId, loadCityContent, loadCityNetwork } from './registry.ts'
export { loadLifeCities } from './lifeCities.ts'

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * What a saved copy (the browser's stored JSON) must wait for before its cities are read: null when the startup index names every
 * city it mentions, else the whole city index (registry.ts loadCityIndex). The first download names Nigeria's cities only, so a life
 * anywhere else waits for the index and is never taken for a life in an unknown city (and put back in Lagos).
 */
export function savedCityIndex(cached: string): Promise<void> | null {
  let saved: unknown = null
  try { saved = JSON.parse(cached) } catch { return null }
  if (!record(saved)) return null
  const pending = record(saved.pendingAction) ? saved.pendingAction.cityId : undefined
  return cityIndexWaitFor(lifeCityCandidates(saved.state, [saved.cityId, pending]))
}
