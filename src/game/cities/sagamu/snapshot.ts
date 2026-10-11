import type { LegacyCitySnapshot } from '../formula/legacy.ts'

/** Rebuilds the original runtime from the generated modules, to check it against the pinned baseline. Build scripts and tests only: it pulls in the map, which the server must not carry. */
export async function loadLegacySnapshot(): Promise<LegacyCitySnapshot> {
  const [{ SAGAMU_RULES }, { SAGAMU_CONTENT }, { SAGAMU_MAP }] = await Promise.all([
    import('./rules.ts'),
    import('./content.ts'),
    import('./map.ts'),
  ])
  return { rules: SAGAMU_RULES, content: SAGAMU_CONTENT, geometry: await SAGAMU_MAP.loadGeometry() }
}
