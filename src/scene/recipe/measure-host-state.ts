/** Offline audit injection state; kept separate from the executable module to avoid an import cycle. */
import type { ScenePart } from '../city-scenes.ts';
export const measuredParts = new Map<string, ScenePart>();
export async function loadProbePart(city: string): Promise<ScenePart> {
  const part = measuredParts.get(city);
  if (!part) throw new Error(`audit did not prepare ${city}`);
  return part;
}
