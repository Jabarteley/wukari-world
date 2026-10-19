/**
 * OWNER: spaces
 * BUILT-IN SHAPES (docs/WORLDS.md, phase 3): pieces anyone may place in a space without uploading a model: coins and gems to collect,
 * crates and blocks to climb, a flag to race to, a ball to kick, trees and lamps to dress a world. Drawn on the device from a few
 * primitives (src/spaces/world/space.ts propMesh), so nothing is fetched. A placement of one has `m: 'p-<id>'`, `by: 'allworld'`, no hash.
 */

export interface PropDef { label: string; size: [number, number, number]; color: string; triangles: number; loose?: true }

export const PROPS = Object.freeze({
  coin: { label: 'Coin', size: [0.5, 0.5, 0.08], color: '#f2c230', triangles: 96 },
  gem: { label: 'Gem', size: [0.45, 0.6, 0.45], color: '#3fc1d9', triangles: 16 },
  crate: { label: 'Crate', size: [1, 1, 1], color: '#a8763e', triangles: 12 },
  block: { label: 'Block', size: [2, 1, 2], color: '#8a94a6', triangles: 12 },
  ramp: { label: 'Ramp', size: [2, 1, 3], color: '#8a94a6', triangles: 8 },
  pillar: { label: 'Pillar', size: [0.6, 3, 0.6], color: '#d8d2c4', triangles: 64 },
  ball: { label: 'Ball', size: [0.6, 0.6, 0.6], color: '#e4572e', triangles: 480, loose: true },
  cone: { label: 'Cone', size: [0.5, 0.8, 0.5], color: '#ff7f11', triangles: 32 },
  flag: { label: 'Flag', size: [1, 3, 0.1], color: '#d7263d', triangles: 40 },
  ring: { label: 'Ring', size: [2, 2, 0.3], color: '#f2c230', triangles: 384 },
  tree: { label: 'Tree', size: [2.4, 4.5, 2.4], color: '#3c7a3a', triangles: 120 },
  lamp: { label: 'Lamp', size: [0.4, 3, 0.4], color: '#2b2f36', triangles: 96 },
  bench: { label: 'Bench', size: [2, 0.9, 0.6], color: '#7a5532', triangles: 36 },
  arch: { label: 'Arch', size: [3, 3, 0.6], color: '#d8d2c4', triangles: 36 },
} satisfies Record<string, PropDef>)
export type PropId = keyof typeof PROPS
export const PROP_IDS = Object.keys(PROPS) as PropId[]

/** The placement model id of a shape, and the shape of a placement model id (or null). */
export const propModel = (id: PropId): string => `p-${id}`
export function propOf(m: unknown): PropId | null {
  const id = typeof m === 'string' && m.startsWith('p-') ? m.slice(2) : ''
  return Object.hasOwn(PROPS, id) ? id as PropId : null
}
export const PROP_OWNER = 'allworld'

/** What a placed shape shows in a layout: the same fields a player's model has. */
export function propView(id: PropId): { name: string; size: [number, number, number]; triangles: number; hash: string } {
  const def: PropDef = PROPS[id]
  return { name: def.label, size: [...def.size], triangles: def.triangles, hash: '' }
}
