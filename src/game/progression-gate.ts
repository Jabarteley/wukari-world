/** Retryable browser loader for achievements, episodes and project records. */
import { isStandIn } from './registry.ts'
import { needsProgressionRules, PROGRESSION_SYSTEM_IDS } from './progression-slices.ts'

let loading: Promise<void> | null = null

/** Fetch and register the full progression pack once. A failed fetch may be retried. */
export function loadProgression(): Promise<void> {
  if (!PROGRESSION_SYSTEM_IDS.some(isStandIn)) return Promise.resolve()
  loading ??= import('./systems/progression-register.ts').then(() => undefined, (error: unknown) => {
    loading = null
    throw error
  })
  return loading
}

/** Null when a raw life is safe for the fresh stand-ins; otherwise wait for the full pack. */
export function progressionFor(raw: unknown): Promise<void> | null {
  return PROGRESSION_SYSTEM_IDS.some(isStandIn) && needsProgressionRules(raw) ? loadProgression() : null
}
