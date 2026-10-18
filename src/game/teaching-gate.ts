/** Conditional, retryable load for saved teaching-session validation in read-only builds. */
import { PLAYS } from './profile.ts'
import type { TeachingPractice } from './living-world/teaching-state.ts'
import { plainRecord, ownValue, dataField } from './snapshot-fields.ts'

type TeachingReader = (value: unknown) => TeachingPractice | null

let installedReader: TeachingReader | null = null
let loading: Promise<void> | null = null

function teachingMarker(snapshot: unknown): boolean {
  try {
    if (!plainRecord(snapshot)) return false
    const action = ownValue(snapshot, 'activeAction')
    return plainRecord(action) && ownValue(action, 'kind') === 'activity'
      && Boolean(dataField(action, 'teaching') || dataField(action, 'teachingGeneration'))
  } catch { return false }
}

/** Read a raw practice value with the installed private parser; no static state import. */
export function readTeachingSnapshot(value: unknown): TeachingPractice | null {
  return installedReader ? installedReader(value) : null
}

/** Null means no rules are needed for this snapshot; a promise means wait before accepting it. */
export function teachingFor(snapshot: unknown): Promise<void> | null {
  if (PLAYS || installedReader || !teachingMarker(snapshot)) return null
  return loading ??= import('./living-world/teaching-state.ts').then(module => {
    if (typeof module.readTeachingPractice !== 'function') throw new TypeError('Invalid teaching reader.')
    installedReader = module.readTeachingPractice
  }).catch(error => {
    loading = null
    throw error
  })
}
