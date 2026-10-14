// The online pill, cache first (docs/PERFORMANCE.md): the last numbers are kept on the device and shown the moment the page is connected,
// while the first poll or socket frame is still on its way, and the real numbers replace them. They carry the time they were kept, so
// the pill's dot is amber ("not up to date") for as long as they are older than a poll. Public numbers, kept for everyone alike.
// Loaded by a dynamic import from OnlinePill.vue, so the first download does not carry the cache code.
import { watch } from 'vue'
import { readCache, writeCache } from '../../state/cacheFirst.ts'
import type { CacheSpec } from '../../state/cacheFirst.ts'
import { readPulse } from './usePulse.ts'
import type { Pulse } from './usePulse.ts'

type ReadStore = Parameters<typeof readCache>[3]
export const PULSE_SPEC: CacheSpec = { name: 'pulse', version: 1, maxAgeMs: 30 * 60000 }
let watching = false

/** Shows the kept numbers when there are none yet, and keeps every answer from now on. */
export function seedPulse(pulse: Pulse, now: number = Date.now(), store?: ReadStore): void {
  const state = pulse.state
  if (state.numbers === null) {
    const kept = readCache(PULSE_SPEC, readPulse, now, store)
    if (kept && state.numbers === null) { state.numbers = kept.value; state.at = kept.at }
  }
  if (watching) return
  watching = true
  watch(() => state.at, (at) => { if (at !== null && state.numbers) writeCache(PULSE_SPEC, state.numbers, at) })
}
