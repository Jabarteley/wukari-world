import type { SceneDef, SceneVenue } from '../scene/types.ts'

export interface SceneEvidence { source: string; group: string; detail: string }
export function sceneEvidence(venue: SceneVenue, definition: SceneDef | null, selection: 'standard' | 'registered-recipe' = 'standard'): SceneEvidence {
  const options = venue.scene ?? {}, kind = options.kind ?? 'generic', variant = options.variant
  if (selection === 'registered-recipe' && definition) return { source: 'Recipe-derived scene', group: `recipe:${kind}`, detail: 'The loaded city registry resolves a compiled recipe for this exact venue. This proves recipe selection, not visual approval, realism or unique geometry.' }
  if (options.design) return { source: 'Parametric design', group: `parametric:${kind}`, detail: 'Configured palette, props and layout use shared scene builders. Distinct geometry has not been verified.' }
  if (definition?.runtime) return { source: 'Dedicated runtime asset', group: `runtime:${kind}:${variant ?? 'default'}`, detail: 'The registered scene requests a dedicated runtime asset. Asset arrival and visual distinctness require inspection.' }
  if (definition) return { source: 'Registered scene definition', group: `registered:${kind}:${variant ?? 'default'}`, detail: 'The city registry resolves this scene definition. That alone does not establish a unique layout.' }
  return { source: 'Shared scene builder', group: `shared:${kind}:${variant ?? 'default'}`, detail: 'This venue uses the shared kind builder. Different names or signs do not establish unique geometry.' }
}
